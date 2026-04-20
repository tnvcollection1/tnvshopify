"""E2E tests for Razorpay + Shopify checkout flow.

Covers:
- Storefront endpoints (products, product detail, collections)
- Checkout create-order (prepaid → Razorpay) persistence
- Verify-payment HMAC signature (valid & invalid)
- COD create-order path (creates live Shopify order → cancelled after)
- Cleanup: any Shopify order created in tests is cancelled/deleted.
"""
import os
import hmac
import hashlib
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://shopify-ecommerce-1.preview.emergentagent.com").rstrip("/")

# Read Razorpay & Shopify creds directly from backend/.env (fallback to env)
def _load_env():
    env = {}
    try:
        with open("/app/backend/.env") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"')
    except Exception:
        pass
    return env

_ENV = _load_env()
RAZORPAY_KEY_SECRET = _ENV.get("RAZORPAY_KEY_SECRET", os.environ.get("RAZORPAY_KEY_SECRET", ""))
SHOPIFY_TOKEN = _ENV.get("SHOPIFY_ACCESS_TOKEN", "")
SHOPIFY_STORE = _ENV.get("SHOPIFY_SHOP_URL", "")
SHOPIFY_BASE = f"https://{SHOPIFY_STORE}/admin/api/2024-01"

# Track any Shopify orders created so we can clean them up
_CREATED_SHOPIFY_ORDERS = []


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def sample_variant(api):
    """Fetch a real variant_id+price from Shopify storefront products."""
    r = api.get(f"{BASE_URL}/api/storefront/products?limit=10", timeout=30)
    assert r.status_code == 200, f"products list failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    products = data.get("products", [])
    assert products, "No products returned from storefront"
    # fetch detail for first product to get a concrete variant id + price
    pid = products[0]["id"]
    d = api.get(f"{BASE_URL}/api/storefront/products/{pid}", timeout=30)
    assert d.status_code == 200
    pd = d.json()
    assert pd.get("variants"), f"Product {pid} has no variants"
    v = pd["variants"][0]
    return {
        "product_id": pid,
        "product_title": pd["title"],
        "variant_id": v["id"],
        "variant_title": v.get("title", ""),
        "price": float(v["price"]),
        "image": pd.get("image") or "",
    }


# ---------- Storefront ----------
class TestStorefront:
    def test_products_list(self, api):
        r = api.get(f"{BASE_URL}/api/storefront/products?limit=5", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "products" in data
        assert len(data["products"]) > 0
        p = data["products"][0]
        for k in ("id", "title", "min_price", "images", "variants_count"):
            assert k in p, f"missing key {k} in product"

    def test_product_detail(self, api, sample_variant):
        pid = sample_variant["product_id"]
        r = api.get(f"{BASE_URL}/api/storefront/products/{pid}", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == pid
        assert isinstance(d.get("variants"), list) and len(d["variants"]) > 0
        v = d["variants"][0]
        assert "id" in v and "price" in v

    def test_collections(self, api):
        r = api.get(f"{BASE_URL}/api/storefront/collections", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "collections" in data
        assert isinstance(data["collections"], list)


# ---------- Checkout: Prepaid (Razorpay) ----------
class TestCheckoutPrepaid:
    checkout_id = None
    razorpay_order_id = None

    def _payload(self, variant, payment_method="prepaid"):
        return {
            "items": [{
                "variant_id": variant["variant_id"],
                "product_id": variant["product_id"],
                "title": variant["product_title"],
                "variant_title": variant["variant_title"],
                "price": variant["price"],
                "quantity": 1,
                "image": variant["image"],
            }],
            "customer": {
                "email": "test@tnvcollection.com",
                "first_name": "Test",
                "last_name": "Buyer",
                "phone": "9999999999",
                "address1": "123 Test Street",
                "address2": "",
                "city": "New Delhi",
                "province": "Delhi",
                "zip": "110001",
                "country": "IN",
            },
            "payment_method": payment_method,
        }

    def test_create_prepaid_order(self, api, sample_variant):
        r = api.post(f"{BASE_URL}/api/checkout/create-order",
                     json=self._payload(sample_variant, "prepaid"), timeout=45)
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        assert data["success"] is True
        assert data["razorpay_order_id"].startswith("order_")
        assert data["razorpay_key_id"].startswith("rzp_")
        assert data["amount"] == int(round(sample_variant["price"] * 100))
        assert data["currency"] == "INR"
        assert data["checkout_id"].startswith("TNV-")
        TestCheckoutPrepaid.checkout_id = data["checkout_id"]
        TestCheckoutPrepaid.razorpay_order_id = data["razorpay_order_id"]

    def test_checkout_persisted_in_db(self, api):
        assert TestCheckoutPrepaid.checkout_id, "previous test did not run"
        r = api.get(f"{BASE_URL}/api/checkout/order/{TestCheckoutPrepaid.checkout_id}", timeout=20)
        assert r.status_code == 200
        doc = r.json()
        assert doc["checkout_id"] == TestCheckoutPrepaid.checkout_id
        assert doc["razorpay_order_id"] == TestCheckoutPrepaid.razorpay_order_id
        assert doc["status"] == "pending"
        assert doc["payment_method"] == "prepaid"

    def test_verify_payment_invalid_signature(self, api):
        assert TestCheckoutPrepaid.razorpay_order_id
        body = {
            "razorpay_order_id": TestCheckoutPrepaid.razorpay_order_id,
            "razorpay_payment_id": "pay_TESTINVALID",
            "razorpay_signature": "deadbeef" * 8,
            "checkout_id": TestCheckoutPrepaid.checkout_id,
        }
        r = api.post(f"{BASE_URL}/api/checkout/verify-payment", json=body, timeout=20)
        assert r.status_code == 400
        assert "verification failed" in r.text.lower()

    def test_verify_payment_valid_signature(self, api):
        """Compute a VALID HMAC signature and verify backend accepts it
        and attempts Shopify order creation."""
        assert RAZORPAY_KEY_SECRET, "RAZORPAY_KEY_SECRET not loaded"
        assert TestCheckoutPrepaid.razorpay_order_id
        rz_order = TestCheckoutPrepaid.razorpay_order_id
        rz_payment = "pay_TEST1234567890"
        msg = f"{rz_order}|{rz_payment}"
        sig = hmac.new(RAZORPAY_KEY_SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()

        body = {
            "razorpay_order_id": rz_order,
            "razorpay_payment_id": rz_payment,
            "razorpay_signature": sig,
            "checkout_id": TestCheckoutPrepaid.checkout_id,
        }
        r = api.post(f"{BASE_URL}/api/checkout/verify-payment", json=body, timeout=60)
        # Signature must pass (i.e. not 400 "verification failed")
        assert r.status_code == 200, f"expected 200, got {r.status_code} body={r.text[:300]}"
        data = r.json()
        assert data.get("success") is True
        assert data.get("checkout_id") == TestCheckoutPrepaid.checkout_id
        # Shopify call may succeed or fail; both prove signature passed.
        shopify_id = data.get("shopify_order_id")
        if shopify_id:
            _CREATED_SHOPIFY_ORDERS.append(shopify_id)
            print(f"[CREATED] Shopify order from verify-payment: id={shopify_id} number={data.get('shopify_order_number')}")


# ---------- Checkout: COD ----------
class TestCheckoutCOD:
    def test_create_cod_order(self, api, sample_variant):
        payload = TestCheckoutPrepaid._payload(TestCheckoutPrepaid(), sample_variant, "cod")
        r = api.post(f"{BASE_URL}/api/checkout/create-order", json=payload, timeout=60)
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        assert data["success"] is True
        assert data["payment_method"] == "cod"
        assert data["checkout_id"].startswith("TNV-")
        # verify persistence & shopify order number
        g = api.get(f"{BASE_URL}/api/checkout/order/{data['checkout_id']}", timeout=20)
        assert g.status_code == 200
        doc = g.json()
        assert doc["status"] == "confirmed"
        if doc.get("shopify_order_id"):
            _CREATED_SHOPIFY_ORDERS.append(doc["shopify_order_id"])
            print(f"[CREATED] Shopify COD order id={doc['shopify_order_id']} number={doc.get('shopify_order_number')}")
        else:
            print(f"[WARN] COD order did not return a shopify_order_id. doc={doc}")


# ---------- Cleanup ----------
def _cancel_and_delete_shopify(order_id):
    if not SHOPIFY_TOKEN or not SHOPIFY_STORE or not order_id:
        return False, "no-token-or-id"
    headers = {"X-Shopify-Access-Token": SHOPIFY_TOKEN, "Content-Type": "application/json"}
    try:
        c = requests.post(f"{SHOPIFY_BASE}/orders/{order_id}/cancel.json", headers=headers, timeout=30)
        d = requests.delete(f"{SHOPIFY_BASE}/orders/{order_id}.json", headers=headers, timeout=30)
        return (c.status_code, d.status_code), ""
    except Exception as e:
        return False, str(e)


@pytest.fixture(scope="session", autouse=True)
def _cleanup_orders():
    yield
    for oid in list(_CREATED_SHOPIFY_ORDERS):
        res, err = _cancel_and_delete_shopify(oid)
        print(f"[CLEANUP] order={oid} result={res} err={err}")


# ---------- Shopify Storefront Cart (new hosted checkout) ----------
class TestShopifyCart:
    """Tests for POST /api/checkout/shopify-cart - new Storefront API hosted checkout."""

    def test_shopify_cart_success_single_variant(self, api, sample_variant):
        body = {"lines": [{"variant_id": sample_variant["variant_id"], "quantity": 1}]}
        r = api.post(f"{BASE_URL}/api/checkout/shopify-cart", json=body, timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        assert data["success"] is True
        assert "cart_id" in data and data["cart_id"].startswith("gid://shopify/Cart/")
        assert "checkout_url" in data
        assert "tnvcollection.com/cart/c/" in data["checkout_url"], f"unexpected host: {data['checkout_url']}"
        assert data["total_quantity"] == 1

    def test_shopify_cart_invalid_variant(self, api):
        body = {"lines": [{"variant_id": 9999999999, "quantity": 1}]}
        r = api.post(f"{BASE_URL}/api/checkout/shopify-cart", json=body, timeout=30)
        # Expect 400 (userErrors) or 502 (GraphQL error) - both clearly reject invalid variant
        assert r.status_code in (400, 502), f"expected 400/502 got {r.status_code} {r.text[:300]}"
        body_text = r.text.lower()
        assert "cart" in body_text or "merchandise" in body_text or "invalid" in body_text or "error" in body_text

    def test_shopify_cart_empty_lines(self, api):
        r = api.post(f"{BASE_URL}/api/checkout/shopify-cart", json={"lines": []}, timeout=20)
        assert r.status_code == 400
        assert "no items" in r.text.lower()

    def test_shopify_cart_multiple_lines(self, api, sample_variant):
        # Try to get a second variant; fallback to same variant with qty 2
        r = api.get(f"{BASE_URL}/api/storefront/products/{sample_variant['product_id']}", timeout=30)
        variants = r.json().get("variants", [])
        available = [v for v in variants if v.get("available")]
        if len(available) >= 2:
            lines = [
                {"variant_id": available[0]["id"], "quantity": 1},
                {"variant_id": available[1]["id"], "quantity": 2},
            ]
            expected_qty = 3
        else:
            lines = [{"variant_id": sample_variant["variant_id"], "quantity": 3}]
            expected_qty = 3
        body = {"lines": lines}
        resp = api.post(f"{BASE_URL}/api/checkout/shopify-cart", json=body, timeout=30)
        assert resp.status_code == 200, f"{resp.status_code} {resp.text[:300]}"
        data = resp.json()
        assert data["success"] is True
        assert "tnvcollection.com/cart/c/" in data["checkout_url"]
        assert data["total_quantity"] == expected_qty

    def test_shopify_cart_with_buyer_email(self, api, sample_variant):
        body = {
            "lines": [{"variant_id": sample_variant["variant_id"], "quantity": 1}],
            "email": "test_buyer@tnvcollection.com",
        }
        r = api.post(f"{BASE_URL}/api/checkout/shopify-cart", json=body, timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        assert data["success"] is True
        assert "tnvcollection.com/cart/c/" in data["checkout_url"]
