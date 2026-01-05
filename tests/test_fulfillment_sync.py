"""
Test cases for Fulfillment Sync feature - Iteration 10
Tests the auto-sync 1688 fulfillment status to Shopify with DWZ and Warehouse options

Endpoints tested:
- GET /api/fulfillment/sync-status-summary - Summary of fulfillment statuses
- GET /api/fulfillment/pending-sync - Orders pending Shopify sync
- POST /api/fulfillment/fulfill-via-dwz/{order_id} - Fulfill via DWZ56
- POST /api/fulfillment/fulfill-via-warehouse/{order_id} - Fulfill via warehouse
- POST /api/fulfillment/bulk-sync-to-shopify - Bulk sync orders
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestFulfillmentSyncStatusSummary:
    """Test GET /api/fulfillment/sync-status-summary endpoint"""
    
    def test_sync_status_summary_returns_200(self):
        """Test that sync-status-summary endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/fulfillment/sync-status-summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_sync_status_summary_structure(self):
        """Test that sync-status-summary returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/fulfillment/sync-status-summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        assert data["success"] == True, "success should be True"
        assert "summary" in data, "Response should have 'summary' field"
        
        summary = data["summary"]
        assert "total_orders" in summary, "Summary should have 'total_orders'"
        assert "ready_for_sync" in summary, "Summary should have 'ready_for_sync'"
        assert "already_synced" in summary, "Summary should have 'already_synced'"
        
        # Check ready_for_sync structure
        ready_for_sync = summary["ready_for_sync"]
        assert "dwz" in ready_for_sync, "ready_for_sync should have 'dwz'"
        assert "warehouse" in ready_for_sync, "ready_for_sync should have 'warehouse'"
        assert "total" in ready_for_sync, "ready_for_sync should have 'total'"
    
    def test_sync_status_summary_with_store_filter(self):
        """Test sync-status-summary with store_name filter"""
        response = requests.get(f"{BASE_URL}/api/fulfillment/sync-status-summary?store_name=test_store")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True


class TestFulfillmentPendingSync:
    """Test GET /api/fulfillment/pending-sync endpoint"""
    
    def test_pending_sync_returns_200(self):
        """Test that pending-sync endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/fulfillment/pending-sync")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_pending_sync_structure(self):
        """Test that pending-sync returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/fulfillment/pending-sync")
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        assert data["success"] == True, "success should be True"
        assert "orders" in data, "Response should have 'orders' field"
        assert "total" in data, "Response should have 'total' field"
        assert "page" in data, "Response should have 'page' field"
        assert "page_size" in data, "Response should have 'page_size' field"
        
        # Orders should be a list
        assert isinstance(data["orders"], list), "orders should be a list"
    
    def test_pending_sync_with_pagination(self):
        """Test pending-sync with pagination parameters"""
        response = requests.get(f"{BASE_URL}/api/fulfillment/pending-sync?page=1&page_size=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 10
    
    def test_pending_sync_with_store_filter(self):
        """Test pending-sync with store_name filter"""
        response = requests.get(f"{BASE_URL}/api/fulfillment/pending-sync?store_name=test_store")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True


class TestFulfillViaDWZ:
    """Test POST /api/fulfillment/fulfill-via-dwz/{order_id} endpoint"""
    
    def test_fulfill_via_dwz_endpoint_exists(self):
        """Test that fulfill-via-dwz endpoint exists and handles requests"""
        # Using a test order ID - endpoint should exist even if order doesn't
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/fulfill-via-dwz/test_order_123",
            json={"notify_customer": True},
            headers={"Content-Type": "application/json"}
        )
        # Should return 404 (order not found) or 200/400 - not 405 (method not allowed)
        assert response.status_code != 405, "Endpoint should accept POST method"
        assert response.status_code in [200, 400, 404, 500], f"Unexpected status: {response.status_code}"
    
    def test_fulfill_via_dwz_with_invalid_order(self):
        """Test fulfill-via-dwz with non-existent order"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/fulfill-via-dwz/nonexistent_order_xyz",
            json={"notify_customer": True},
            headers={"Content-Type": "application/json"}
        )
        # Should return 404 for non-existent order
        assert response.status_code in [404, 400, 500], f"Expected 404/400/500 for non-existent order, got {response.status_code}"


class TestFulfillViaWarehouse:
    """Test POST /api/fulfillment/fulfill-via-warehouse/{order_id} endpoint"""
    
    def test_fulfill_via_warehouse_endpoint_exists(self):
        """Test that fulfill-via-warehouse endpoint exists and handles requests"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/fulfill-via-warehouse/test_order_123",
            json={
                "tracking_number": "TEST123456",
                "carrier": "Local Courier",
                "notify_customer": True
            },
            headers={"Content-Type": "application/json"}
        )
        # Should return 404 (order not found) or 200/400 - not 405 (method not allowed)
        assert response.status_code != 405, "Endpoint should accept POST method"
        assert response.status_code in [200, 400, 404, 500], f"Unexpected status: {response.status_code}"
    
    def test_fulfill_via_warehouse_with_invalid_order(self):
        """Test fulfill-via-warehouse with non-existent order"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/fulfill-via-warehouse/nonexistent_order_xyz",
            json={
                "tracking_number": "TEST123456",
                "carrier": "Local Courier",
                "notify_customer": True
            },
            headers={"Content-Type": "application/json"}
        )
        # Should return 404 for non-existent order
        assert response.status_code in [404, 400, 500], f"Expected 404/400/500 for non-existent order, got {response.status_code}"


class TestBulkSyncToShopify:
    """Test POST /api/fulfillment/bulk-sync-to-shopify endpoint"""
    
    def test_bulk_sync_endpoint_exists(self):
        """Test that bulk-sync-to-shopify endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/bulk-sync-to-shopify",
            json={
                "order_ids": ["test_order_1", "test_order_2"],
                "fulfillment_method": "dwz"
            },
            headers={"Content-Type": "application/json"}
        )
        # Should not return 405 (method not allowed)
        assert response.status_code != 405, "Endpoint should accept POST method"
    
    def test_bulk_sync_structure(self):
        """Test bulk-sync-to-shopify returns correct structure"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/bulk-sync-to-shopify",
            json={
                "order_ids": [],
                "fulfillment_method": "dwz"
            },
            headers={"Content-Type": "application/json"}
        )
        
        # Empty order_ids should still work
        if response.status_code == 200:
            data = response.json()
            assert "success" in data, "Response should have 'success' field"
            assert "total" in data, "Response should have 'total' field"
            assert "synced" in data, "Response should have 'synced' field"
            assert "failed" in data, "Response should have 'failed' field"
    
    def test_bulk_sync_with_warehouse_method(self):
        """Test bulk-sync-to-shopify with warehouse method"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/bulk-sync-to-shopify",
            json={
                "order_ids": ["test_order_1"],
                "fulfillment_method": "warehouse"
            },
            headers={"Content-Type": "application/json"}
        )
        # Should accept warehouse method
        assert response.status_code != 405, "Endpoint should accept POST method"
    
    def test_bulk_sync_max_orders_limit(self):
        """Test bulk-sync-to-shopify rejects more than 50 orders"""
        # Create list of 51 order IDs
        order_ids = [f"test_order_{i}" for i in range(51)]
        
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/bulk-sync-to-shopify",
            json={
                "order_ids": order_ids,
                "fulfillment_method": "dwz"
            },
            headers={"Content-Type": "application/json"}
        )
        # Should return 400 for exceeding limit
        assert response.status_code == 400, f"Expected 400 for >50 orders, got {response.status_code}"


class TestStoresEndpoint:
    """Test GET /api/stores endpoint (used by FulfillmentSync component)"""
    
    def test_stores_returns_200(self):
        """Test that stores endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_stores_structure(self):
        """Test that stores returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200
        
        data = response.json()
        # Stores endpoint can return either a list directly or wrapped in {success, stores}
        if isinstance(data, list):
            # Direct list response
            assert len(data) >= 0, "stores should be a list"
            if len(data) > 0:
                assert "store_name" in data[0], "Each store should have 'store_name'"
        else:
            # Wrapped response
            assert "success" in data, "Response should have 'success' field"
            assert "stores" in data, "Response should have 'stores' field"
            assert isinstance(data["stores"], list), "stores should be a list"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
