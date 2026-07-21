import os
import datetime
import jwt
from flask import jsonify


MOCK_SECRET = os.environ.get("JWT_SECRET", "mock-dev-secret-for-demo")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


def is_mock() -> bool:
    v = os.environ.get("WAZUH_MOCK", "0").lower()
    return v in ("1", "true", "yes")


def mock_request_context():
    """Returns (groups, token, err) that bypasses real Wazuh auth in mock mode."""
    return (None, "mock-wazuh-token", None)


def mock_authenticate(username: str, password: str) -> dict:
    return {"token": "mock-wazuh-jwt"}


def mock_customer_login(username: str, password: str) -> dict:
    payload = {
        "sub": username or "admin",
        "tenant_id": "acme-corp",
        "iat": datetime.datetime.now(datetime.timezone.utc),
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=JWT_EXPIRATION_HOURS),
    }
    token = jwt.encode(payload, MOCK_SECRET, algorithm=JWT_ALGORITHM)
    return {"token": token}


def mock_response(data, status=200):
    return jsonify(data), status
