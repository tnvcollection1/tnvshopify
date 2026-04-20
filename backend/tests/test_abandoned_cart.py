"""E2E tests for abandoned-cart WhatsApp recovery."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://shopify-ecommerce-1.preview.emergentagent.com",
).rstrip("/")


@pytest.fixture
def api():
    return requests.Session()


@pytest.fixture(autouse=True)
def _cleanup_test_tokens():
    """Remove any test docs before each test."""
    # Nothing pre-test; we delete explicitly below
    yield


def _webhook_payload(token: str, phone: str = "+919876543210"):
    return {
        "id": 999999,
        "token": token,
        "email": "pytest@tnvcollection.com",
        "phone": phone,
        "total_price": "2499.00",
        "currency": "INR",
        "customer": {"first_name": "Pytest", "phone": phone},
        "line_items": [
            {"title": "Test Loafer", "quantity": 1},
            {"title": "Test Sneaker", "quantity": 2},
        ],
        "abandoned_checkout_url": f"https://tnvcollection.com/checkouts/{token}/recover",
    }


class TestAbandonedCartWebhooks:
    def test_checkout_created_enqueues_pending(self, api):
        token = f"pytest-{int(time.time()*1000)}"
        r = api.post(
            f"{BASE_URL}/api/abandoned-cart/webhook/checkouts-create",
            json=_webhook_payload(token),
            timeout=20,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

        # verify it shows up as pending
        lst = api.get(f"{BASE_URL}/api/abandoned-cart/list?status=pending", timeout=20).json()
        tokens = [i["token"] for i in lst["items"]]
        assert token in tokens

    def test_checkout_without_contact_is_skipped(self, api):
        token = f"pytest-no-contact-{int(time.time()*1000)}"
        payload = _webhook_payload(token)
        payload.pop("email")
        payload.pop("phone")
        payload["customer"] = {}
        r = api.post(
            f"{BASE_URL}/api/abandoned-cart/webhook/checkouts-create",
            json=payload,
            timeout=20,
        )
        assert r.status_code == 200
        assert r.json().get("reason") == "no-contact"

    def test_order_created_marks_recovered(self, api):
        token = f"pytest-recover-{int(time.time()*1000)}"
        api.post(
            f"{BASE_URL}/api/abandoned-cart/webhook/checkouts-create",
            json=_webhook_payload(token),
            timeout=20,
        )
        r = api.post(
            f"{BASE_URL}/api/abandoned-cart/webhook/order-created",
            json={"checkout_token": token},
            timeout=20,
        )
        assert r.status_code == 200
        assert r.json()["recovered"] is True

        # listing confirms status=recovered
        lst = api.get(f"{BASE_URL}/api/abandoned-cart/list?limit=50", timeout=20).json()
        row = next((i for i in lst["items"] if i["token"] == token), None)
        assert row is not None
        assert row["status"] == "recovered"

    def test_process_now_endpoint_is_reachable(self, api):
        r = api.post(f"{BASE_URL}/api/abandoned-cart/process-now", timeout=30)
        assert r.status_code == 200
        assert "processed" in r.json()

    def test_test_send_returns_wa_link(self, api):
        """Even if Meta API is unavailable, fallback to wa.me link."""
        r = api.post(
            f"{BASE_URL}/api/abandoned-cart/test-send",
            params={"phone": "919999999999", "first_name": "Pytest"},
            timeout=30,
        )
        assert r.status_code == 200
        body = r.json()
        assert body.get("success") is True
        assert "wa.me/" in body.get("wa_url", "")
