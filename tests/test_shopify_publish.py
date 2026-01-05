"""
Test suite for Shopify Publish features
Tests the 1688 Product Scraper API endpoints for:
- GET /api/1688-scraper/shopify/stores - List Shopify stores
- POST /api/1688-scraper/shopify/publish-batch - Publish products to Shopify
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestShopifyStoresAPI:
    """Test Shopify stores endpoint"""
    
    def test_get_shopify_stores_returns_list(self):
        """Test that stores endpoint returns a list with success=true"""
        response = requests.get(f"{BASE_URL}/api/1688-scraper/shopify/stores")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "stores" in data
        assert isinstance(data["stores"], list)
        print(f"✓ Shopify stores endpoint returns {len(data['stores'])} stores")
    
    def test_stores_have_required_fields(self):
        """Test that each store has store_name and shopify_domain"""
        response = requests.get(f"{BASE_URL}/api/1688-scraper/shopify/stores")
        assert response.status_code == 200
        data = response.json()
        
        for store in data["stores"]:
            assert "store_name" in store, "Store should have store_name"
            assert "shopify_domain" in store, "Store should have shopify_domain"
            print(f"✓ Store: {store['store_name']} -> {store['shopify_domain']}")
    
    def test_expected_stores_present(self):
        """Test that expected stores are present: asmia, tnvcollection, tnvcollectionpk, ashmiaa"""
        response = requests.get(f"{BASE_URL}/api/1688-scraper/shopify/stores")
        assert response.status_code == 200
        data = response.json()
        
        store_names = [s["store_name"] for s in data["stores"]]
        expected_stores = ["asmia", "tnvcollection", "tnvcollectionpk", "ashmiaa"]
        
        for expected in expected_stores:
            assert expected in store_names, f"Expected store '{expected}' not found"
            print(f"✓ Store '{expected}' is present")


class TestShopifyPublishAPI:
    """Test Shopify publish-batch endpoint"""
    
    def test_publish_batch_endpoint_exists(self):
        """Test that publish-batch endpoint exists and accepts POST"""
        # Send empty request to check endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/shopify/publish-batch",
            json={"product_ids": [], "store_name": "test"},
            headers={"Content-Type": "application/json"}
        )
        # Should return 200 with success=true (empty batch)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        print(f"✓ Publish-batch endpoint exists and responds")
    
    def test_publish_batch_validates_store(self):
        """Test that publish-batch validates store name"""
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/shopify/publish-batch",
            json={
                "product_ids": ["test123"],
                "store_name": "nonexistent_store",
                "price_multiplier": 2.5,
                "currency_rate": 20.0
            },
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should fail because store doesn't exist
        assert data.get("success") == False
        assert "error" in data or "not configured" in str(data.get("error", ""))
        print(f"✓ Publish-batch validates store name correctly")
    
    def test_publish_batch_response_structure(self):
        """Test that publish-batch returns proper response structure"""
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/shopify/publish-batch",
            json={
                "product_ids": [],
                "store_name": "ashmiaa",
                "price_multiplier": 2.5,
                "currency_rate": 20.0
            },
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "success" in data
        assert "published" in data
        assert "failed" in data
        assert "total" in data
        assert isinstance(data["published"], list)
        assert isinstance(data["failed"], list)
        print(f"✓ Publish-batch response has correct structure")
    
    def test_publish_batch_handles_nonexistent_product(self):
        """Test that publish-batch handles nonexistent product gracefully"""
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/shopify/publish-batch",
            json={
                "product_ids": ["nonexistent_product_12345"],
                "store_name": "ashmiaa",
                "price_multiplier": 2.5,
                "currency_rate": 20.0
            },
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have failed entry
        assert len(data["failed"]) > 0
        failed_entry = data["failed"][0]
        assert "product_id" in failed_entry
        assert "error" in failed_entry
        print(f"✓ Publish-batch handles nonexistent product: {failed_entry['error']}")


class TestPublishedProductVerification:
    """Test verification of published products"""
    
    def test_published_product_has_shopify_id(self):
        """Test that published product has shopify_product_id in database"""
        # Get products and check if any have shopify_product_id
        response = requests.get(f"{BASE_URL}/api/1688-scraper/products?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        
        published_products = [
            p for p in data["products"] 
            if p.get("shopify_product_id")
        ]
        
        if published_products:
            product = published_products[0]
            print(f"✓ Found published product: {product['product_id']} -> Shopify ID: {product['shopify_product_id']}")
            assert product.get("shopify_store"), "Published product should have shopify_store"
            print(f"  Store: {product['shopify_store']}")
        else:
            print("ℹ No published products found (this is OK if no products have been published yet)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
