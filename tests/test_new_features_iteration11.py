"""
Test suite for WaMerce 1688 Integration Platform - Iteration 11
Testing:
1. Quick Fulfill All button in FulfillmentSync
2. Bulk Order 1688 page and endpoints
3. Service module refactoring (tmapi_service.py, shopify_publishing_service.py)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopfront-editor.preview.emergentagent.com').rstrip('/')


class TestBulkOrderEndpoint:
    """Tests for POST /api/1688/bulk-order endpoint"""
    
    def test_bulk_order_empty_items_returns_400(self):
        """Test that empty items array returns 400 error"""
        response = requests.post(
            f"{BASE_URL}/api/1688/bulk-order",
            json={"items": []},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "No items provided" in data.get("detail", "")
    
    def test_bulk_order_with_items_structure(self):
        """Test bulk order with valid items structure"""
        response = requests.post(
            f"{BASE_URL}/api/1688/bulk-order",
            json={
                "items": [
                    {
                        "shopify_order_id": "test_order_123",
                        "product_id_1688": "850596274690",
                        "quantity": 1
                    }
                ]
            },
            headers={"Content-Type": "application/json"}
        )
        # Should return 200 even if 1688 API fails (returns error in response body)
        assert response.status_code == 200
        data = response.json()
        # Check response structure
        assert "success" in data
        assert "total" in data or "error" in data
    
    def test_bulk_order_max_items_limit(self):
        """Test that more than 50 items returns 400 error"""
        items = [
            {"shopify_order_id": f"order_{i}", "product_id_1688": "123456789012", "quantity": 1}
            for i in range(51)
        ]
        response = requests.post(
            f"{BASE_URL}/api/1688/bulk-order",
            json={"items": items},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "Maximum 50 items" in data.get("detail", "")


class TestFindLinkedProductsEndpoint:
    """Tests for POST /api/1688/find-linked-products endpoint"""
    
    def test_find_linked_products_returns_success(self):
        """Test find-linked-products endpoint returns success"""
        response = requests.post(
            f"{BASE_URL}/api/1688/find-linked-products",
            json=["12345", "67890"],
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "total" in data
        assert "linked" in data
        assert "unlinked" in data
        assert "orders" in data
    
    def test_find_linked_products_structure(self):
        """Test find-linked-products response structure"""
        response = requests.post(
            f"{BASE_URL}/api/1688/find-linked-products",
            json=["test_order_1"],
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data["total"] == 1
        assert len(data["orders"]) == 1
        
        order = data["orders"][0]
        assert "shopify_order_id" in order
        assert "found" in order
        assert "linked" in order
    
    def test_find_linked_products_empty_array(self):
        """Test find-linked-products with empty array"""
        response = requests.post(
            f"{BASE_URL}/api/1688/find-linked-products",
            json=[],
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("total") == 0


class Test1688AccountsEndpoint:
    """Tests for 1688 accounts endpoint"""
    
    def test_get_1688_accounts(self):
        """Test GET /api/1688/accounts returns accounts list"""
        response = requests.get(f"{BASE_URL}/api/1688/accounts")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "accounts" in data
        assert "count" in data


class Test1688HealthEndpoint:
    """Tests for 1688 health endpoint"""
    
    def test_1688_health_check(self):
        """Test GET /api/1688/health returns status"""
        response = requests.get(f"{BASE_URL}/api/1688/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        assert "app_key" in data
        assert "has_app_secret" in data
        assert "has_access_token" in data


class TestStoresEndpoint:
    """Tests for stores endpoint"""
    
    def test_get_stores(self):
        """Test GET /api/stores returns stores list"""
        response = requests.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200
        data = response.json()
        # Response is a list of stores
        assert isinstance(data, list)
        if len(data) > 0:
            store = data[0]
            assert "store_name" in store


class TestFulfillmentSyncEndpoints:
    """Tests for fulfillment sync endpoints"""
    
    def test_sync_status_summary(self):
        """Test GET /api/fulfillment/sync-status-summary"""
        response = requests.get(f"{BASE_URL}/api/fulfillment/sync-status-summary")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "summary" in data
        summary = data["summary"]
        assert "total_orders" in summary
        assert "ready_for_sync" in summary
        assert "already_synced" in summary
    
    def test_pending_sync(self):
        """Test GET /api/fulfillment/pending-sync"""
        response = requests.get(f"{BASE_URL}/api/fulfillment/pending-sync")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "orders" in data
        assert "total" in data


class TestServiceModulesExist:
    """Tests to verify service modules exist and are importable"""
    
    def test_tmapi_service_exists(self):
        """Verify tmapi_service.py exists"""
        import os
        service_path = "/app/backend/services/tmapi_service.py"
        assert os.path.exists(service_path), f"tmapi_service.py not found at {service_path}"
    
    def test_shopify_publishing_service_exists(self):
        """Verify shopify_publishing_service.py exists"""
        import os
        service_path = "/app/backend/services/shopify_publishing_service.py"
        assert os.path.exists(service_path), f"shopify_publishing_service.py not found at {service_path}"
    
    def test_services_init_exists(self):
        """Verify __init__.py exists in services directory"""
        import os
        init_path = "/app/backend/services/__init__.py"
        assert os.path.exists(init_path), f"__init__.py not found at {init_path}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
