"""E2E tests for Shopify Storefront Cart hosted checkout.

Covers:
- Storefront endpoints (products, product detail, collections)
- POST /api/checkout/shopify-cart (cart creation → checkoutUrl)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://shopify-ecommerce-1.preview.emergentagent.com",
).rstrip("/")


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def sample_variant(api):
    """Fetch a real variant_id from the live Shopify storefront."""
    r = api.get(f"{BASE_URL}/api/storefront/products?limit=10", timeout=30)
    assert r.status_code == 200, f"products list failed: {r.status_code} {r.text[:200]}"
    products = r.json().get("products", [])
    assert products, "No products returned from storefront"
    pid = products[0]["id"]
    d = api.get(f"{BASE_URL}/api/storefront/products/{pid}", timeout=30)
    assert d.status_code == 200
    pd = d.json()
    assert pd.get("variants"), f"Product {pid} has no variants"
    v = pd["variants"][0]
    return {
        "product_id": pid,
        "variant_id": v["id"],
        "price": float(v["price"]),
    }


# ---------- Storefront ----------
class TestStorefront:
    def test_products_list(self, api):
        r = api.get(f"{BASE_URL}/api/storefront/products?limit=5", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "products" in data
        assert len(data["products"]) > 0

    def test_product_detail(self, api, sample_variant):
        r = api.get(f"{BASE_URL}/api/storefront/products/{sample_variant['product_id']}", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d.get("variants")
        v = d["variants"][0]
        assert "id" in v and "price" in v

    def test_collections(self, api):
        r = api.get(f"{BASE_URL}/api/storefront/collections", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "collections" in data
        assert isinstance(data["collections"], list)


# ---------- Shopify Storefront Cart (hosted checkout) ----------
class TestShopifyCart:
    def test_shopify_cart_success_single_variant(self, api, sample_variant):
        body = {"lines": [{"variant_id": sample_variant["variant_id"], "quantity": 1}]}
        r = api.post(f"{BASE_URL}/api/checkout/shopify-cart", json=body, timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        assert data["success"] is True
        assert data["cart_id"].startswith("gid://shopify/Cart/")
        assert "tnvcollection.com/cart/c/" in data["checkout_url"]
        assert data["total_quantity"] == 1

    def test_shopify_cart_invalid_variant(self, api):
        body = {"lines": [{"variant_id": 9999999999, "quantity": 1}]}
        r = api.post(f"{BASE_URL}/api/checkout/shopify-cart", json=body, timeout=30)
        assert r.status_code in (400, 502), f"expected 400/502 got {r.status_code} {r.text[:300]}"

    def test_shopify_cart_empty_lines(self, api):
        r = api.post(f"{BASE_URL}/api/checkout/shopify-cart", json={"lines": []}, timeout=20)
        assert r.status_code == 400
        assert "no items" in r.text.lower()

    def test_shopify_cart_multiple_lines(self, api, sample_variant):
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
        resp = api.post(f"{BASE_URL}/api/checkout/shopify-cart", json={"lines": lines}, timeout=30)
        assert resp.status_code == 200, f"{resp.status_code} {resp.text[:300]}"
        data = resp.json()
        assert data["total_quantity"] == expected_qty
        assert "tnvcollection.com/cart/c/" in data["checkout_url"]

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
