"""
Test Suite for Iteration 28 - Restore 1688 Purchase Feature
Tests the new restore-purchase endpoint and related functionality
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://multi-tenant-shop-3.preview.emergentagent.com')

class TestRestorePurchaseEndpoint:
    """Tests for POST /api/fulfillment/pipeline/orders/{order_id}/restore-purchase"""
    
    def test_restore_purchase_404_for_nonexistent_order(self):
        """Test that restore returns 404 for non-existent order"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/orders/NONEXISTENT999/restore-purchase",
            json={"index": 0}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        data = response.json()
        assert "not found" in data.get("detail", "").lower()
    
    def test_restore_purchase_400_if_already_has_active_purchase(self):
        """Test that restore returns 400 if order already has active alibaba_order_id"""
        # First, find an order that has an active alibaba_order_id
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"purchase_status": "purchased", "page_size": 1}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get("orders") and len(data["orders"]) > 0:
            order = data["orders"][0]
            order_id = order.get("order_number") or order.get("shopify_order_id")
            
            # Try to restore - should fail with 400
            restore_response = requests.post(
                f"{BASE_URL}/api/fulfillment/pipeline/orders/{order_id}/restore-purchase",
                json={"index": 0}
            )
            assert restore_response.status_code == 400, f"Expected 400, got {restore_response.status_code}: {restore_response.text}"
            data = restore_response.json()
            assert "already has an active" in data.get("detail", "").lower()
        else:
            pytest.skip("No orders with active alibaba_order_id found for testing")
    
    def test_restore_purchase_400_if_no_cancelled_purchases(self):
        """Test that restore returns 400 if order has no cancelled purchases"""
        # Find an order without cancelled purchases
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"purchase_status": "not_purchased", "page_size": 10}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find an order without cancelled_purchases
        for order in data.get("orders", []):
            if not order.get("cancelled_purchases") or len(order.get("cancelled_purchases", [])) == 0:
                order_id = order.get("order_number") or order.get("shopify_order_id")
                
                restore_response = requests.post(
                    f"{BASE_URL}/api/fulfillment/pipeline/orders/{order_id}/restore-purchase",
                    json={"index": 0}
                )
                assert restore_response.status_code == 400, f"Expected 400, got {restore_response.status_code}: {restore_response.text}"
                data = restore_response.json()
                assert "no cancelled purchases" in data.get("detail", "").lower()
                return
        
        pytest.skip("No orders without cancelled purchases found for testing")


class TestGetCancelledPurchasesEndpoint:
    """Tests for GET /api/fulfillment/pipeline/orders/{order_id}/cancelled-purchases"""
    
    def test_get_cancelled_purchases_404_for_nonexistent_order(self):
        """Test that endpoint returns 404 for non-existent order"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/orders/NONEXISTENT999/cancelled-purchases"
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
    
    def test_get_cancelled_purchases_returns_correct_structure(self):
        """Test that endpoint returns correct response structure"""
        # Get any order from pipeline
        pipeline_response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"page_size": 1}
        )
        assert pipeline_response.status_code == 200
        data = pipeline_response.json()
        
        if data.get("orders") and len(data["orders"]) > 0:
            order = data["orders"][0]
            order_id = order.get("order_number") or order.get("shopify_order_id")
            
            response = requests.get(
                f"{BASE_URL}/api/fulfillment/pipeline/orders/{order_id}/cancelled-purchases"
            )
            assert response.status_code == 200
            data = response.json()
            
            # Verify response structure
            assert data.get("success") == True
            assert "order_number" in data
            assert "has_active_purchase" in data
            assert "active_alibaba_order_id" in data
            assert "cancelled_purchases" in data
            assert "total_cancelled" in data
            assert "can_restore" in data
            assert isinstance(data["cancelled_purchases"], list)
        else:
            pytest.skip("No orders in pipeline for testing")


class TestRestorePurchaseIntegration:
    """Integration tests for restore purchase flow"""
    
    def test_order_29477_has_cancelled_purchases(self):
        """Test that order 29477 has cancelled purchases (as per context)"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/orders/29477/cancelled-purchases"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        # According to context, order 29477 has 1 cancelled purchase
        assert data.get("total_cancelled", 0) >= 1, f"Expected at least 1 cancelled purchase, got {data.get('total_cancelled')}"
    
    def test_order_29477_can_restore_status(self):
        """Test can_restore flag for order 29477"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/orders/29477/cancelled-purchases"
        )
        assert response.status_code == 200
        data = response.json()
        
        # can_restore should be True if no active purchase and has cancelled purchases
        has_active = data.get("has_active_purchase", False)
        total_cancelled = data.get("total_cancelled", 0)
        can_restore = data.get("can_restore", False)
        
        expected_can_restore = (not has_active) and (total_cancelled > 0)
        assert can_restore == expected_can_restore, f"can_restore mismatch: expected {expected_can_restore}, got {can_restore}"
    
    def test_restore_purchase_success_flow(self):
        """Test successful restore of a cancelled purchase"""
        # First check if order 29477 can be restored
        check_response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/orders/29477/cancelled-purchases"
        )
        assert check_response.status_code == 200
        check_data = check_response.json()
        
        if not check_data.get("can_restore"):
            pytest.skip("Order 29477 cannot be restored (either has active purchase or no cancelled purchases)")
        
        # Get the alibaba_order_id that will be restored
        cancelled_purchases = check_data.get("cancelled_purchases", [])
        if not cancelled_purchases:
            pytest.skip("No cancelled purchases to restore")
        
        expected_alibaba_id = cancelled_purchases[0].get("alibaba_order_id")
        
        # Perform restore
        restore_response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/orders/29477/restore-purchase",
            json={"index": 0}
        )
        assert restore_response.status_code == 200, f"Expected 200, got {restore_response.status_code}: {restore_response.text}"
        restore_data = restore_response.json()
        
        # Verify response
        assert restore_data.get("success") == True
        assert restore_data.get("restored_alibaba_order_id") == expected_alibaba_id
        assert restore_data.get("order_status") == "purchased"
        
        # Verify the order now has the alibaba_order_id
        verify_response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/orders/29477/cancelled-purchases"
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        assert verify_data.get("has_active_purchase") == True
        assert verify_data.get("active_alibaba_order_id") == expected_alibaba_id
        assert verify_data.get("can_restore") == False


class TestRestorePurchaseIndexParameter:
    """Tests for the index parameter in restore endpoint"""
    
    def test_restore_invalid_index_returns_400(self):
        """Test that invalid index returns 400"""
        # First find an order with cancelled purchases
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/orders/29477/cancelled-purchases"
        )
        if response.status_code != 200:
            pytest.skip("Order 29477 not found")
        
        data = response.json()
        total_cancelled = data.get("total_cancelled", 0)
        
        if total_cancelled == 0:
            pytest.skip("No cancelled purchases to test index")
        
        if data.get("has_active_purchase"):
            pytest.skip("Order has active purchase, cannot test restore")
        
        # Try with invalid index (greater than available)
        restore_response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/orders/29477/restore-purchase",
            json={"index": total_cancelled + 10}  # Invalid index
        )
        assert restore_response.status_code == 400, f"Expected 400, got {restore_response.status_code}: {restore_response.text}"
        data = restore_response.json()
        assert "invalid index" in data.get("detail", "").lower()


class TestPipelineFiltersWithCancelledPurchases:
    """Tests for pipeline filters related to cancelled purchases"""
    
    def test_pipeline_returns_cancelled_purchases_in_orders(self):
        """Test that pipeline endpoint returns cancelled_purchases field"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"page_size": 20}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check if any orders have cancelled_purchases field
        orders_with_cancelled = [o for o in data.get("orders", []) if o.get("cancelled_purchases")]
        
        # At least order 29477 should have cancelled purchases
        print(f"Found {len(orders_with_cancelled)} orders with cancelled_purchases")
        
        # Verify structure of cancelled_purchases
        for order in orders_with_cancelled:
            for cp in order.get("cancelled_purchases", []):
                assert "alibaba_order_id" in cp or "cancelled_at" in cp, "cancelled_purchases should have alibaba_order_id or cancelled_at"


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_docs_accessible(self):
        """Test that API docs are responding"""
        response = requests.get(f"{BASE_URL}/docs")
        assert response.status_code == 200
    
    def test_pipeline_endpoint_accessible(self):
        """Test that pipeline endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/fulfillment/pipeline")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
