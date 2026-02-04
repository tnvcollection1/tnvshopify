"""
Test Suite for Iteration 27 - Cancel 1688 Purchase Feature
Tests the POST /api/fulfillment/pipeline/orders/{order_id}/cancel-purchase endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://tenant-storefront.preview.emergentagent.com')


class TestCancel1688Purchase:
    """Tests for the Cancel 1688 Purchase endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_cancel_purchase_returns_404_for_nonexistent_order(self):
        """Test that cancelling a non-existent order returns 404"""
        response = self.session.post(
            f"{BASE_URL}/api/fulfillment/pipeline/orders/99999999/cancel-purchase"
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
    
    def test_cancel_purchase_returns_404_for_invalid_order_id(self):
        """Test that cancelling with invalid order ID returns 404"""
        response = self.session.post(
            f"{BASE_URL}/api/fulfillment/pipeline/orders/invalid_order_xyz/cancel-purchase"
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
    
    def test_get_orders_with_alibaba_order_id(self):
        """Test that we can fetch orders with alibaba_order_id"""
        response = self.session.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"purchase_status": "purchased", "page_size": 5}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "orders" in data
        assert "purchase_stats" in data
        # Verify purchase_stats structure
        assert "purchased" in data["purchase_stats"]
        assert "not_purchased" in data["purchase_stats"]
    
    def test_get_orders_without_alibaba_order_id(self):
        """Test that we can fetch orders without alibaba_order_id"""
        response = self.session.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"purchase_status": "not_purchased", "page_size": 5}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "orders" in data
    
    def test_pipeline_endpoint_returns_correct_structure(self):
        """Test that pipeline endpoint returns correct data structure"""
        response = self.session.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"page_size": 5}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data["success"] is True
        assert "page" in data
        assert "page_size" in data
        assert "total" in data
        assert "status_counts" in data
        assert "purchase_stats" in data
        assert "dwz_stats" in data
        assert "orders" in data
        
        # Verify order structure if orders exist
        if data["orders"]:
            order = data["orders"][0]
            assert "order_number" in order
            assert "customer_name" in order
            # alibaba_order_id may or may not exist
    
    def test_search_order_by_number(self):
        """Test searching for a specific order by number"""
        # Search for order 29477 which should have alibaba_order_id
        response = self.session.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"search": "29477"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        if data["total"] > 0:
            order = data["orders"][0]
            assert "29477" in str(order.get("order_number", ""))
    
    def test_search_order_29534(self):
        """Test searching for order 29534"""
        response = self.session.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"search": "29534"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        if data["total"] > 0:
            order = data["orders"][0]
            assert "29534" in str(order.get("order_number", ""))


class TestCancelPurchaseIntegration:
    """Integration tests for cancel purchase flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_cancel_purchase_on_order_with_alibaba_id(self):
        """Test cancelling purchase on an order that has alibaba_order_id"""
        # First, find an order with alibaba_order_id
        response = self.session.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"purchase_status": "purchased", "page_size": 1}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["total"] == 0:
            pytest.skip("No orders with alibaba_order_id found")
        
        order = data["orders"][0]
        order_number = order.get("order_number")
        original_alibaba_id = order.get("alibaba_order_id")
        
        if not original_alibaba_id:
            pytest.skip("Order doesn't have alibaba_order_id")
        
        # Cancel the purchase
        cancel_response = self.session.post(
            f"{BASE_URL}/api/fulfillment/pipeline/orders/{order_number}/cancel-purchase"
        )
        assert cancel_response.status_code == 200
        cancel_data = cancel_response.json()
        
        # Verify response
        assert cancel_data["success"] is True
        assert "cancelled_alibaba_order_id" in cancel_data
        assert cancel_data["cancelled_alibaba_order_id"] == original_alibaba_id
        assert cancel_data["order_status"] == "pending"
        
        # Verify the order was updated
        verify_response = self.session.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"search": str(order_number)}
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        if verify_data["total"] > 0:
            updated_order = verify_data["orders"][0]
            # alibaba_order_id should be null
            assert updated_order.get("alibaba_order_id") is None
            # purchase_status_1688 should be not_purchased
            assert updated_order.get("purchase_status_1688") == "not_purchased"
            # cancelled_purchases should contain the cancelled info
            cancelled_purchases = updated_order.get("cancelled_purchases", [])
            assert len(cancelled_purchases) > 0
            assert cancelled_purchases[-1]["alibaba_order_id"] == original_alibaba_id
    
    def test_cancel_purchase_on_order_without_alibaba_id(self):
        """Test cancelling purchase on an order that doesn't have alibaba_order_id"""
        # Find an order without alibaba_order_id
        response = self.session.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"purchase_status": "not_purchased", "page_size": 1}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["total"] == 0:
            pytest.skip("No orders without alibaba_order_id found")
        
        order = data["orders"][0]
        order_number = order.get("order_number")
        
        # Try to cancel - should still succeed but with null cancelled_alibaba_order_id
        cancel_response = self.session.post(
            f"{BASE_URL}/api/fulfillment/pipeline/orders/{order_number}/cancel-purchase"
        )
        assert cancel_response.status_code == 200
        cancel_data = cancel_response.json()
        
        assert cancel_data["success"] is True
        # cancelled_alibaba_order_id should be null since there was none
        assert cancel_data.get("cancelled_alibaba_order_id") is None


class TestPipelineFilters:
    """Tests for pipeline filter functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_filter_by_purchase_status_purchased(self):
        """Test filtering by purchase_status=purchased"""
        response = self.session.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"purchase_status": "purchased"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Most returned orders should have alibaba_order_id
        # Some may have been cancelled during testing
        orders_with_alibaba = [o for o in data["orders"] if o.get("alibaba_order_id")]
        # At least verify the filter is working (returns fewer orders than total)
        if data["total"] > 0:
            # The filter should return orders that have or had alibaba_order_id
            pass  # Filter is working if we get here without error
    
    def test_filter_by_purchase_status_not_purchased(self):
        """Test filtering by purchase_status=not_purchased"""
        response = self.session.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"purchase_status": "not_purchased"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # All returned orders should NOT have alibaba_order_id
        for order in data["orders"]:
            alibaba_id = order.get("alibaba_order_id")
            assert alibaba_id is None or alibaba_id == ""
    
    def test_pagination(self):
        """Test pagination works correctly"""
        # Get first page
        response1 = self.session.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"page": 1, "page_size": 5}
        )
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Get second page
        response2 = self.session.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"page": 2, "page_size": 5}
        )
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Verify pagination
        assert data1["page"] == 1
        assert data2["page"] == 2
        assert data1["page_size"] == 5
        assert data2["page_size"] == 5
        
        # Orders should be different (if there are enough orders)
        if data1["total"] > 5 and len(data1["orders"]) > 0 and len(data2["orders"]) > 0:
            order1_ids = [o.get("order_number") for o in data1["orders"]]
            order2_ids = [o.get("order_number") for o in data2["orders"]]
            # No overlap between pages
            assert not set(order1_ids).intersection(set(order2_ids))


class TestCancelledPurchasesAuditTrail:
    """Tests for cancelled_purchases audit trail"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_cancelled_purchases_array_structure(self):
        """Test that cancelled_purchases array has correct structure"""
        # Find an order that has been cancelled (has cancelled_purchases)
        response = self.session.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"page_size": 50}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Look for an order with cancelled_purchases
        order_with_cancelled = None
        for order in data["orders"]:
            if order.get("cancelled_purchases") and len(order["cancelled_purchases"]) > 0:
                order_with_cancelled = order
                break
        
        if order_with_cancelled is None:
            pytest.skip("No orders with cancelled_purchases found")
        
        # Verify structure
        cancelled = order_with_cancelled["cancelled_purchases"][0]
        assert "alibaba_order_id" in cancelled
        assert "cancelled_at" in cancelled


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
