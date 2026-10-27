"""Needs the full install (fastapi etc.). NOT run in my build sandbox: run `pytest` on your machine."""
import pytest

pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def test_health():
    r = TestClient(app).get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_protected_routes_require_token():
    c = TestClient(app)
    assert c.get("/api/resumes").status_code == 401
    assert c.get("/api/interviews").status_code == 401
    assert c.get("/api/auth/me").status_code == 401


def test_register_validation_rejects_short_password():
    r = TestClient(app).post("/api/auth/register", json={"name": "A", "email": "a@b.co", "password": "short"})
    assert r.status_code == 422
