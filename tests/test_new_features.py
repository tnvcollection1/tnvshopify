"""
Backend API Tests for New WaMerce Features
Tests for:
- Fulfillment Dashboard APIs
- 1688 Auth endpoints (auth/url, auth/test, auth/token)
- Fulfillment pipeline and pending purchase
- Process new order endpoint
"""

import pytest
import requests
import os

# Get backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://multi-tenant-shop-6.preview.emergentagent.com')


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class Test1688AuthEndpoints:
    """1688 Authorization endpoint tests"""
    
    def test_1688_auth_url(self, api_client):
        """Test GET /api/1688/auth/url - should return authorization URL"""
        response = api_client.get(f"{BASE_URL}/api/1688/auth/url")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "auth_url" in data, "Should have auth_url"
        assert "instructions" in data, "Should have instructions"
        assert "app_key" in data, "Should have app_key"
        
        # Verify auth URL format
        auth_url = data["auth_url"]
        assert "auth.1688.com" in auth_url, "Auth URL should point to 1688"
        assert "client_id" in auth_url, "Auth URL should have client_id"
        
        # Verify instructions are provided
        instructions = data["instructions"]
        assert len(instructions) >= 3, "Should have at least 3 instructions"
        
        print(f"✅ 1688 auth URL endpoint working")
        print(f"   - Auth URL: {auth_url[:80]}...")
        print(f"   - App Key: {data['app_key']}")
    
    def test_1688_auth_test(self, api_client):
        """Test GET /api/1688/auth/test - should return API status"""
        response = api_client.get(f"{BASE_URL}/api/1688/auth/test")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "access_token_configured" in data, "Should have access_token_configured"
        assert "results" in data, "Should have results"
        
        results = data["results"]
        assert "trade_api" in results, "Should have trade_api status"
        assert "product_api" in results, "Should have product_api status"
        
        # Verify trade_api status structure
        trade_api = results["trade_api"]
        assert "status" in trade_api, "Trade API should have status"
        
        # Trade API should be working based on previous tests
        print(f"✅ 1688 auth test endpoint working")
        print(f"   - Access token configured: {data['access_token_configured']}")
        print(f"   - Trade API status: {trade_api['status']}")
        print(f"   - Product API status: {results['product_api']['status']}")


class TestFulfillmentPipelineAPIs:
    """Fulfillment pipeline API tests"""
    
    def test_fulfillment_pipeline_returns_orders(self, api_client):
        """Test GET /api/fulfillment/pipeline - should return orders list"""
        response = api_client.get(f"{BASE_URL}/api/fulfillment/pipeline")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "orders" in data
        assert "total" in data
        assert "status_counts" in data
        assert "page" in data
        assert "page_size" in data
        
        # Verify status_counts has all expected statuses
        status_counts = data["status_counts"]
        expected_statuses = ["pending", "purchased", "shipped_from_supplier", "sent_to_dwz56", "fulfilled", "error"]
        for status in expected_statuses:
            assert status in status_counts, f"Should have {status} in status_counts"
        
        print(f"✅ Fulfillment pipeline endpoint working")
        print(f"   - Total orders: {data['total']}")
        print(f"   - Status counts: {status_counts}")
    
    def test_fulfillment_pending_purchase_returns_orders(self, api_client):
        """Test GET /api/fulfillment/pending-purchase - should return pending orders"""
        response = api_client.get(f"{BASE_URL}/api/fulfillment/pending-purchase")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "orders" in data
        assert "total" in data
        
        # Verify orders structure if any exist
        orders = data.get("orders", [])
        if orders:
            order = orders[0]
            assert "customer_id" in order, "Order should have customer_id"
            # May also have order_number, first_name, last_name, etc.
        
        print(f"✅ Pending purchase endpoint working")
        print(f"   - Total pending orders: {data['total']}")
    
    def test_fulfillment_stats_returns_statistics(self, api_client):
        """Test GET /api/fulfillment/stats - should return pipeline statistics"""
        response = api_client.get(f"{BASE_URL}/api/fulfillment/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "stats" in data
        
        stats = data["stats"]
        assert "total_orders" in stats
        assert "by_status" in stats
        assert "by_store" in stats
        
        # Verify by_status has all expected statuses
        by_status = stats["by_status"]
        expected_statuses = ["pending", "processing", "purchased", "shipped_from_supplier", "sent_to_dwz56", "fulfilled", "error"]
        for status in expected_statuses:
            assert status in by_status, f"Should have {status} in by_status"
        
        print(f"✅ Fulfillment stats endpoint working")
        print(f"   - Total orders in pipeline: {stats['total_orders']}")
        print(f"   - By status: {by_status}")
    
    def test_fulfillment_process_new_order_requires_customer_id(self, api_client):
        """Test POST /api/fulfillment/process-new-order - should require customer_id"""
        # Test with empty body - should fail validation
        response = api_client.post(
            f"{BASE_URL}/api/fulfillment/process-new-order",
            json={}
        )
        # Should return 422 (validation error) for missing customer_id
        assert response.status_code == 422, f"Should return 422 for missing customer_id, got {response.status_code}"
        
        print("✅ Process new order endpoint validates input correctly")
    
    def test_fulfillment_process_new_order_with_invalid_customer(self, api_client):
        """Test POST /api/fulfillment/process-new-order - should return 404 for invalid customer"""
        response = api_client.post(
            f"{BASE_URL}/api/fulfillment/process-new-order",
            json={"customer_id": "nonexistent_customer_xyz_123", "auto_purchase": False}
        )
        # Should return 404 for non-existent customer
        assert response.status_code == 404, f"Should return 404 for non-existent customer, got {response.status_code}"
        
        print("✅ Process new order endpoint returns 404 for invalid customer")
    
    def test_fulfillment_process_new_order_with_valid_customer(self, api_client):
        """Test POST /api/fulfillment/process-new-order - should process valid customer"""
        # First get a valid customer_id from pending orders
        pending_response = api_client.get(f"{BASE_URL}/api/fulfillment/pending-purchase?page_size=1")
        assert pending_response.status_code == 200
        pending_data = pending_response.json()
        
        if pending_data.get("total", 0) == 0:
            pytest.skip("No pending orders available to test")
        
        # Get the first pending order's customer_id
        customer_id = pending_data["orders"][0]["customer_id"]
        
        # Process the order
        response = api_client.post(
            f"{BASE_URL}/api/fulfillment/process-new-order",
            json={"customer_id": customer_id, "auto_purchase": False}
        )
        
        # Should succeed (200) or indicate already in pipeline
        assert response.status_code == 200, f"Should return 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True
        
        # Verify response has expected fields
        assert "message" in data
        
        print(f"✅ Process new order endpoint working")
        print(f"   - Customer ID: {customer_id}")
        print(f"   - Message: {data.get('message')}")


class TestFulfillmentPipelineFiltering:
    """Test fulfillment pipeline filtering and pagination"""
    
    def test_pipeline_status_filter(self, api_client):
        """Test filtering pipeline by status"""
        response = api_client.get(f"{BASE_URL}/api/fulfillment/pipeline?status=pending")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        # All returned orders should have pending status (if any)
        for order in data.get("orders", []):
            assert order.get("status") == "pending", "Filtered orders should have pending status"
        
        print("✅ Pipeline status filtering working")
    
    def test_pipeline_pagination(self, api_client):
        """Test pipeline pagination"""
        response = api_client.get(f"{BASE_URL}/api/fulfillment/pipeline?page=1&page_size=5")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("page") == 1
        assert data.get("page_size") == 5
        assert len(data.get("orders", [])) <= 5
        
        print("✅ Pipeline pagination working")


class Test1688HealthAndCatalog:
    """Additional 1688 API tests"""
    
    def test_1688_health(self, api_client):
        """Test 1688 health endpoint"""
        response = api_client.get(f"{BASE_URL}/api/1688/health")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("status") == "ok"
        assert data.get("app_key") is not None
        assert data.get("has_app_secret") == True
        assert data.get("has_access_token") == True
        
        print(f"✅ 1688 health check passed")
    
    def test_1688_catalog_exists(self, api_client):
        """Test 1688 catalog has products"""
        response = api_client.get(f"{BASE_URL}/api/1688/catalog?page_size=5")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "products" in data
        assert "total" in data
        
        # Should have products from previous sync
        assert data.get("total", 0) >= 30, f"Should have at least 30 products, got {data.get('total')}"
        
        print(f"✅ 1688 catalog has {data.get('total')} products")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
