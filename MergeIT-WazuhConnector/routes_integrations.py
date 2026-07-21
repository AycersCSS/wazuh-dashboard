from flask import Blueprint, jsonify

from mock_wazuh import is_mock
from mock_data import mock_integrations

from wazuh_auth import _get_request_context

KNOWN_INTEGRATIONS = [
    "microsoft-365",
    "ninjaone",
    "bitdefender",
    "cyber-essentials",
    "customer-portal",
]

bp = Blueprint("integrations", __name__)


@bp.route("/integrations/<integration_id>", methods=["GET"])
def get_integration(integration_id):
    if is_mock():
        if integration_id not in KNOWN_INTEGRATIONS:
            return jsonify({"error": "unsupported_integration"}), 400
        return jsonify(mock_integrations(integration_id)), 200

    _, _, err = _get_request_context()
    if err:
        return jsonify(err[0]), err[1]

    if integration_id not in KNOWN_INTEGRATIONS:
        return jsonify({"error": "unsupported_integration"}), 400

    return (
        jsonify({"ok": False, "error": "not_connected", "id": integration_id}),
        503,
    )
