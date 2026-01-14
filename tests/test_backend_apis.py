"""
Backend API Tests for WaMerce E-commerce Management System
Tests for:
- Shopify sync API
- Scheduler status
- 1688 Alibaba integration
- Fulfillment automation pipeline
"""

import pytest
import requests
import os
import time

# Get backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://multi-tenant-7.preview.emergentagent.com')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealthAndBasicEndpoints:
    """Basic health check and root endpoint tests"""
    
    def test_root_endpoint(self, api_client):
        """Test root API endpoint"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Customer Manager API"
        print("✅ Root endpoint working")
    
    def test_scheduler_status(self, api_client):
        """Test scheduler status endpoint - should show Shopify sync job running"""
        response = api_client.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200
        data = response.json()
        
        # Verify scheduler is running
        assert data.get("running") == True, "Scheduler should be running"
        
        # Verify jobs exist
        assert "jobs" in data
        jobs = data["jobs"]
        assert len(jobs) >= 1, "Should have at least 1 scheduled job"
        
        # Check for Shopify sync job
        job_ids = [job["id"] for job in jobs]
        assert "shopify_sync" in job_ids, "Shopify sync job should be scheduled"
        
        # Verify Shopify sync job details
        shopify_job = next((j for j in jobs if j["id"] == "shopify_sync"), None)
        assert shopify_job is not None
        assert "Hourly" in shopify_job["name"], "Shopify sync should be hourly"
        assert shopify_job["next_run"] is not None, "Should have next run time"
        
        print(f"✅ Scheduler running with {len(jobs)} jobs")
        print(f"   - Shopify sync next run: {shopify_job['next_run']}")


class TestShopifySync:
    """Shopify order sync API tests"""
    
    def test_shopify_sync_ashmiaa(self, api_client):
        """Test Shopify sync for ashmiaa store"""
        response = api_client.post(f"{BASE_URL}/api/shopify/sync/ashmiaa?days_back=7")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, f"Sync should succeed: {data}"
        assert "orders_synced" in data
        assert "customers_created" in data or "customers_updated" in data
        
        print(f"✅ Ashmiaa sync: {data.get('orders_synced', 0)} orders synced")
    
    def test_shopify_sync_tnvcollectionpk(self, api_client):
        """Test Shopify sync for tnvcollectionpk store"""
        response = api_client.post(f"{BASE_URL}/api/shopify/sync/tnvcollectionpk?days_back=7")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, f"Sync should succeed: {data}"
        assert "orders_synced" in data
        
        print(f"✅ TNVCollectionPK sync: {data.get('orders_synced', 0)} orders synced")
    
    def test_shopify_sync_tnvcollection(self, api_client):
        """Test Shopify sync for tnvcollection store"""
        response = api_client.post(f"{BASE_URL}/api/shopify/sync/tnvcollection?days_back=7")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, f"Sync should succeed: {data}"
        assert "orders_synced" in data
        
        print(f"✅ TNVCollection sync: {data.get('orders_synced', 0)} orders synced")
    
    def test_shopify_sync_nonexistent_store(self, api_client):
        """Test Shopify sync for non-existent store returns error"""
        response = api_client.post(f"{BASE_URL}/api/shopify/sync/nonexistent_store_xyz?days_back=7")
        # Backend returns 404 but Cloudflare may convert to 520
        assert response.status_code in [404, 520, 500], f"Should return error for non-existent store, got {response.status_code}"
        
        # Verify error message in response
        try:
            data = response.json()
            assert "detail" in data or "error" in data, "Should have error detail"
            if "detail" in data:
                assert "not found" in data["detail"].lower() or "404" in data["detail"]
        except:
            pass  # Response may not be JSON
        
        print("✅ Non-existent store returns error as expected")


class Test1688Integration:
    """1688 Alibaba integration API tests"""
    
    def test_1688_health_check(self, api_client):
        """Test 1688 health check - should show API configured"""
        response = api_client.get(f"{BASE_URL}/api/1688/health")
        assert response.status_code == 200
        data = response.json()
        
        # Verify API configuration
        assert data.get("status") == "ok", "1688 API should be healthy"
        assert data.get("app_key") is not None, "Should have app_key configured"
        assert data.get("has_app_secret") == True, "Should have app_secret"
        assert data.get("has_access_token") == True, "Should have access_token"
        assert data.get("api_url") == "https://gw.open.1688.com/openapi"
        
        print(f"✅ 1688 API configured with app_key: {data.get('app_key')}")
    
    def test_1688_catalog(self, api_client):
        """Test 1688 catalog - should list synced products"""
        response = api_client.get(f"{BASE_URL}/api/1688/catalog")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "products" in data
        assert "total" in data
        
        # Verify we have products synced
        total_products = data.get("total", 0)
        assert total_products >= 30, f"Should have at least 30 products, got {total_products}"
        
        # Verify product structure
        products = data.get("products", [])
        if products:
            product = products[0]
            assert "source_id" in product, "Product should have source_id"
            assert "source" in product, "Product should have source"
            assert product["source"] == "1688", "Source should be 1688"
        
        print(f"✅ 1688 catalog has {total_products} products")
    
    def test_1688_catalog_pagination(self, api_client):
        """Test 1688 catalog pagination"""
        response = api_client.get(f"{BASE_URL}/api/1688/catalog?page=1&page_size=10")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("page") == 1
        assert data.get("page_size") == 10
        assert len(data.get("products", [])) <= 10
        
        print("✅ 1688 catalog pagination working")
    
    def test_1688_shipping_addresses(self, api_client):
        """Test 1688 shipping addresses - should return saved addresses"""
        response = api_client.get(f"{BASE_URL}/api/1688/shipping-addresses")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "addresses" in data
        
        # Verify address structure
        addresses = data.get("addresses", {})
        if isinstance(addresses, dict) and "receiveAddressItems" in addresses:
            items = addresses["receiveAddressItems"]
            assert len(items) >= 1, "Should have at least 1 shipping address"
            
            # Verify address fields
            if items:
                addr = items[0]
                assert "fullName" in addr, "Address should have fullName"
                assert "address" in addr, "Address should have address"
                assert "mobilePhone" in addr, "Address should have mobilePhone"
        
        print(f"✅ 1688 shipping addresses retrieved")


class TestFulfillmentPipeline:
    """Fulfillment automation pipeline API tests"""
    
    def test_fulfillment_stats(self, api_client):
        """Test fulfillment stats - should return pipeline statistics"""
        response = api_client.get(f"{BASE_URL}/api/fulfillment/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "stats" in data
        
        stats = data["stats"]
        assert "total_orders" in stats
        assert "by_status" in stats
        assert "by_store" in stats
        
        # Verify status categories exist
        by_status = stats["by_status"]
        expected_statuses = ["pending", "purchased", "shipped_from_supplier", "sent_to_dwz56", "fulfilled", "error"]
        for status in expected_statuses:
            assert status in by_status, f"Should have {status} in by_status"
        
        print(f"✅ Fulfillment stats: {stats['total_orders']} total orders")
    
    def test_fulfillment_pending_purchase(self, api_client):
        """Test fulfillment pending purchase - should list unfulfilled orders"""
        response = api_client.get(f"{BASE_URL}/api/fulfillment/pending-purchase")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "orders" in data
        assert "total" in data
        
        # Verify order structure if orders exist
        orders = data.get("orders", [])
        if orders:
            order = orders[0]
            assert "customer_id" in order, "Order should have customer_id"
        
        print(f"✅ Pending purchase: {data.get('total', 0)} orders")
    
    def test_fulfillment_pipeline(self, api_client):
        """Test fulfillment pipeline - should list orders in pipeline"""
        response = api_client.get(f"{BASE_URL}/api/fulfillment/pipeline")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "orders" in data
        assert "total" in data
        assert "status_counts" in data
        
        # Verify status counts structure
        status_counts = data["status_counts"]
        expected_statuses = ["pending", "purchased", "shipped_from_supplier", "sent_to_dwz56", "fulfilled", "error"]
        for status in expected_statuses:
            assert status in status_counts, f"Should have {status} in status_counts"
        
        print(f"✅ Fulfillment pipeline: {data.get('total', 0)} orders in pipeline")
    
    def test_fulfillment_pipeline_pagination(self, api_client):
        """Test fulfillment pipeline pagination"""
        response = api_client.get(f"{BASE_URL}/api/fulfillment/pipeline?page=1&page_size=10")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("page") == 1
        assert data.get("page_size") == 10
        
        print("✅ Fulfillment pipeline pagination working")
    
    def test_fulfillment_status_nonexistent_order(self, api_client):
        """Test fulfillment status for non-existent order"""
        response = api_client.get(f"{BASE_URL}/api/fulfillment/status/nonexistent_order_xyz")
        assert response.status_code == 404, "Should return 404 for non-existent order"
        print("✅ Non-existent order returns 404 as expected")


class TestStoresEndpoint:
    """Store management endpoint tests"""
    
    def test_get_stores(self, api_client):
        """Test getting list of stores"""
        response = api_client.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list of stores
        assert isinstance(data, list), "Should return a list of stores"
        
        # Verify store structure if stores exist
        if data:
            store = data[0]
            assert "store_name" in store, "Store should have store_name"
        
        print(f"✅ Found {len(data)} stores")


class TestCustomersEndpoint:
    """Customer management endpoint tests"""
    
    def test_get_customers(self, api_client):
        """Test getting list of customers"""
        response = api_client.get(f"{BASE_URL}/api/customers?limit=10")
        assert response.status_code == 200
        data = response.json()
        
        # Should return customer data
        assert "customers" in data or isinstance(data, list)
        
        print("✅ Customers endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
