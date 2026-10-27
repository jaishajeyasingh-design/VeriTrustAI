import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings


@pytest.fixture
def auth_client():
    """Client authenticated as administrator."""
    return TestClient(app, headers={"X-API-Key": settings.API_KEY, "X-User-Role": "administrator"})


@pytest.fixture
def reviewer_client():
    """Client authenticated as compliance reviewer."""
    return TestClient(app, headers={"X-API-Key": settings.API_KEY, "X-User-Role": "reviewer"})


@pytest.fixture
def applicant_client():
    """Client authenticated as applicant (restricted permissions)."""
    return TestClient(app, headers={"X-API-Key": settings.API_KEY, "X-User-Role": "applicant"})


@pytest.fixture
def unauthenticated_client():
    """Unauthenticated client with no API key or token."""
    return TestClient(app)
