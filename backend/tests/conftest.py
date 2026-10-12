"""
Pytest configuration and shared test fixtures.
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend and repo root are in python path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app.main import app
from backend.app.core.cache import cache


@pytest.fixture(autouse=True)
def clean_cache():
    """Clear memory cache between tests."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    return TestClient(app)
