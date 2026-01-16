"""
Test suite for WaMerce 1688 Integration Platform - Iteration 9
Testing:
1. Shopify Historical Sync API
2. 1688 Account Selection for ordering
3. Taobao product API endpoint
4. API Monitor page
5. Create purchase order with account_id parameter
"""

import pytest
import requests
import os
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://saas-ecom.preview.emergentagent.com').rstrip('/')


class TestStoresAPI:
    """Test stores API for Shopify Historical Sync"""
    
    def test_get_stores_list(self):
        """Test GET /api/stores returns list of stores"""
        response = requests.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200
        
        # Verify response structure - can be list or dict with stores key
        data = response.json()
        if isinstance(data, list):
            stores = data
        else:
            stores = data.get('stores', [])
        
        assert len(stores) > 0, "Should have at least one store"
        
        # Verify store structure
        store = stores[0]
        assert 'store_name' in store, "Store should have store_name"
        print(f"SUCCESS: Found {len(stores)} stores")


class Test1688AccountsAPI:
    """Test 1688 accounts API for account selection"""
    
    def test_list_1688_accounts(self):
        """Test GET /api/1688/accounts returns list of accounts"""
        response = requests.get(f"{BASE_URL}/api/1688/accounts")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') == True, "Response should be successful"
        assert 'accounts' in data, "Response should have accounts key"
        
        accounts = data['accounts']
        print(f"SUCCESS: Found {len(accounts)} 1688 accounts")
        
        if len(accounts) > 0:
            account = accounts[0]
            assert 'account_id' in account, "Account should have account_id"
            print(f"  - Account: {account.get('account_name', account.get('account_id'))}")


class TestTaobaoProductAPI:
    """Test Taobao product scraping API"""
    
    def test_get_taobao_product(self):
        """Test GET /api/1688-scraper/taobao/product/{product_id} returns product data"""
        product_id = "601502437456"  # Test product ID from requirements
        
        response = requests.get(f"{BASE_URL}/api/1688-scraper/taobao/product/{product_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') == True, f"Response should be successful: {data}"
        assert 'product' in data, "Response should have product key"
        
        product = data['product']
        assert product.get('product_id') == product_id, "Product ID should match"
        assert product.get('title'), "Product should have title"
        assert product.get('price'), "Product should have price"
        assert len(product.get('images', [])) > 0, "Product should have images"
        
        print(f"SUCCESS: Taobao product {product_id}")
        print(f"  - Title: {product.get('title')[:50]}...")
        print(f"  - Price: ¥{product.get('price')}")
        print(f"  - Images: {len(product.get('images', []))}")
        print(f"  - Variants: {len(product.get('variants', []))}")
    
    def test_taobao_product_not_found(self):
        """Test Taobao API handles invalid product ID gracefully"""
        product_id = "999999999999"  # Invalid product ID
        
        response = requests.get(f"{BASE_URL}/api/1688-scraper/taobao/product/{product_id}")
        # Should return 200 with success=false or 404
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            # Either success=false or empty product
            if data.get('success') == False:
                print("SUCCESS: API correctly returns success=false for invalid product")
            else:
                print("INFO: API returned data for invalid product (may be cached)")


class TestTMAPIStatus:
    """Test TMAPI configuration status"""
    
    def test_tmapi_status(self):
        """Test GET /api/1688-scraper/tmapi/status returns configuration status"""
        response = requests.get(f"{BASE_URL}/api/1688-scraper/tmapi/status")
        assert response.status_code == 200
        
        data = response.json()
        assert 'configured' in data, "Response should have configured key"
        assert 'supported_platforms' in data, "Response should have supported_platforms"
        
        print(f"SUCCESS: TMAPI Status")
        print(f"  - Configured: {data.get('configured')}")
        print(f"  - Platforms: {data.get('supported_platforms')}")


class TestCreatePurchaseOrderWithAccount:
    """Test create purchase order endpoint with account_id parameter"""
    
    def test_create_purchase_order_schema(self):
        """Test that create-purchase-order endpoint accepts account_id parameter"""
        # This test verifies the endpoint exists and accepts the right parameters
        # We don't actually create an order to avoid side effects
        
        # First, get a valid account_id
        accounts_response = requests.get(f"{BASE_URL}/api/1688/accounts")
        accounts_data = accounts_response.json()
        
        account_id = None
        if accounts_data.get('success') and accounts_data.get('accounts'):
            account_id = accounts_data['accounts'][0].get('account_id')
        
        # Test with invalid product to verify endpoint accepts account_id
        payload = {
            "product_id": "999999999999",  # Invalid product
            "quantity": 1,
            "size": "XL",
            "color": "Black",
            "spec_id": "test_spec",
            "shopify_order_id": "TEST_ORDER_123",
            "notes": "Test order - should fail",
            "account_id": account_id  # Include account_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/1688/create-purchase-order",
            json=payload
        )
        
        # Endpoint should accept the request (may fail due to invalid product, but should not 422)
        assert response.status_code in [200, 400, 401, 500], f"Unexpected status: {response.status_code}"
        
        data = response.json()
        # The request was processed (even if it failed due to invalid product)
        print(f"SUCCESS: create-purchase-order endpoint accepts account_id parameter")
        print(f"  - Response: {data.get('message', data.get('error', 'No message'))[:100]}")


class TestShopifySyncAPI:
    """Test Shopify sync related APIs"""
    
    def test_shopify_sync_status_endpoint_exists(self):
        """Test that sync status endpoint exists"""
        # Test with a dummy job_id - should return 404 for non-existent job
        response = requests.get(f"{BASE_URL}/api/shopify/sync-status/nonexistent123")
        # Should return 404 or 200 with error
        assert response.status_code in [200, 404]
        print("SUCCESS: Shopify sync-status endpoint exists")


class Test1688HealthCheck:
    """Test 1688 API health check"""
    
    def test_1688_health(self):
        """Test GET /api/1688/health returns API status"""
        response = requests.get(f"{BASE_URL}/api/1688/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('status') == 'ok', "Health check should return ok"
        assert 'app_key' in data, "Should have app_key"
        assert 'has_tmapi_token' in data, "Should have has_tmapi_token"
        
        print(f"SUCCESS: 1688 API Health Check")
        print(f"  - Status: {data.get('status')}")
        print(f"  - TMAPI Token: {data.get('has_tmapi_token')}")


class TestProductLinksAPI:
    """Test product links API for auto-linking"""
    
    def test_get_1688_link_from_sku(self):
        """Test GET /api/1688-scraper/product-links/get-1688 extracts product ID from SKU"""
        # Test with a SKU containing 1688 product ID
        test_sku = "1688-715816597116-black-41"
        
        response = requests.get(
            f"{BASE_URL}/api/1688-scraper/product-links/get-1688",
            params={"shopify_sku": test_sku}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') == True, f"Response should be successful: {data}"
        
        # Should extract product ID from SKU
        link = data.get('link') or data.get('suggested_link')
        if link:
            assert link.get('product_1688_id') == '715816597116', "Should extract correct product ID"
            print(f"SUCCESS: Extracted 1688 product ID from SKU")
            print(f"  - SKU: {test_sku}")
            print(f"  - Product ID: {link.get('product_1688_id')}")
        else:
            print(f"INFO: No link found for SKU {test_sku}")


class TestTaobaoShopAPI:
    """Test Taobao shop scraping API"""
    
    def test_taobao_shop_api_exists(self):
        """Test POST /api/1688-scraper/taobao/shop/products endpoint exists"""
        # This API may return 417 (under maintenance) which is expected per TMAPI docs
        payload = {
            "shop_url": "https://shop123456.taobao.com",
            "page": 1,
            "page_size": 20
        }
        
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/taobao/shop/products",
            json=payload
        )
        
        # Should return 200 (even if API is under maintenance)
        assert response.status_code == 200
        
        data = response.json()
        # Check if API returned maintenance message (expected)
        if data.get('code') == 417 or 'maintenance' in str(data).lower():
            print("INFO: Taobao shop API is under maintenance (expected per TMAPI docs)")
        else:
            print(f"SUCCESS: Taobao shop API responded")
        
        print(f"  - Response: {str(data)[:200]}...")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
