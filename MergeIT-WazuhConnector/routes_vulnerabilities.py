import time
from collections import OrderedDict

import requests
from flask import Blueprint, jsonify, request

from mock_wazuh import is_mock
from mock_data import mock_vulnerabilities

from wazuh_auth import (
    WAZUH_API_URL,
    WAZUH_SSL_VERIFY,
    _get_request_context,
    clear_wazuh_token,
)

bp = Blueprint("vulnerabilities", __name__)


@bp.route("/vulnerabilities", methods=["GET"])
def list_vulnerabilities():
    if is_mock():
        return jsonify(mock_vulnerabilities(dict(request.args))), 200

    groups, wazuh_token, err = _get_request_context()
    if err:
        return jsonify(err[0]), err[1]

    params = {}
    for key in ("limit", "offset", "severity"):
        val = request.args.get(key)
        if val is not None:
            params[key] = val

    if groups:
        params["q"] = "agent.groups=" + ",".join(groups)

    _vuln_cache.expire()
    cache_key = _vuln_cache_key(groups, params)
    now = time.time()
    cached = _vuln_cache.get(cache_key)
    if cached and (now - cached[0]) < VULN_CACHE_TTL:
        return jsonify(cached[1]), 200

    try:
        resp = requests.get(
            f"{WAZUH_API_URL}/vulnerability",
            params=params,
            headers={"Authorization": f"Bearer {wazuh_token}"},
            verify=WAZUH_SSL_VERIFY,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        raw_items = data.get("data", {}).get("affected_items", [])
        stripped = [_strip_vulnerability(item) for item in raw_items]
        result = {"data": {"affected_items": stripped, "total_affected_items": data.get("data", {}).get("total_affected_items", len(stripped))}}
        _vuln_cache.put(cache_key, (now, result))
        return jsonify(result), 200
    except requests.HTTPError as e:
        if resp.status_code == 401:
            clear_wazuh_token()
        return jsonify({"error": str(e)}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 502
