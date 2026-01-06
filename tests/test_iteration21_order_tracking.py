"""
Test Suite for Iteration 21 - Order Tracking Feature
Tests:
- Order tracking search page at /shop/track
- Order tracking with order ID at /shop/track/{orderId}
- Order tracking API - GET /api/storefront/orders/{order_id}/track
- Order status update API - PUT /api/storefront/orders/{order_id}/status
- List storefront orders API - GET /api/storefront/orders
- Status timeline displays correctly with timestamps
- Tracking number and courier display when shipped
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOrderTrackingAPIs:
    """Test Order Tracking Backend APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.test_order_id = None
    
    def test_storefront_health(self):
        """Test storefront health endpoint"""
        response = self.session.get(f"{BASE_URL}/api/storefront/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print(f"✓ Storefront health check passed: {data}")
    
    def test_create_test_order_for_tracking(self):
        """Create a test order to use for tracking tests"""
        order_payload = {
            "store_name": "tnvcollection",
            "customer": {
                "first_name": "Test",
                "last_name": "Tracking",
                "email": "test.tracking@example.com",
                "phone": "+919876543210"
            },
            "shipping_address": {
                "first_name": "Test",
                "last_name": "Tracking",
                "address1": "123 Test Street",
                "address2": "Apt 4B",
                "city": "Mumbai",
                "province": "Maharashtra",
                "zip": "400001",
                "country": "IN",
                "phone": "+919876543210"
            },
            "line_items": [
                {
                    "variant_id": "test_variant_001",
                    "quantity": 2,
                    "price": 1500.00,
                    "title": "Test Product for Tracking",
                    "variant_title": "Size M"
                }
            ],
            "payment_method": "cod",
            "subtotal": 3000.00,
            "shipping": 0,
            "total": 3000.00
        }
        
        response = self.session.post(f"{BASE_URL}/api/storefront/orders", json=order_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "order_id" in data
        self.test_order_id = data["order_id"]
        print(f"✓ Created test order: {self.test_order_id}")
        return self.test_order_id
    
    def test_track_order_api(self):
        """Test GET /api/storefront/orders/{order_id}/track"""
        # First create an order
        order_id = self.test_create_test_order_for_tracking()
        
        # Track the order
        response = self.session.get(f"{BASE_URL}/api/storefront/orders/{order_id}/track")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "order" in data
        
        order = data["order"]
        assert order["order_id"] == order_id
        assert order["status"] == "pending"
        assert "status_history" in order
        assert len(order["status_history"]) >= 1
        assert order["status_history"][0]["status"] == "pending"
        print(f"✓ Track order API working: {order_id}, status: {order['status']}")
    
    def test_track_order_with_email_verification(self):
        """Test tracking with email verification"""
        # Create order
        order_id = self.test_create_test_order_for_tracking()
        
        # Track with correct email
        response = self.session.get(
            f"{BASE_URL}/api/storefront/orders/{order_id}/track",
            params={"email": "test.tracking@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Track order with email verification passed")
    
    def test_track_order_with_wrong_email(self):
        """Test tracking with wrong email returns 404"""
        # Create order
        order_id = self.test_create_test_order_for_tracking()
        
        # Track with wrong email
        response = self.session.get(
            f"{BASE_URL}/api/storefront/orders/{order_id}/track",
            params={"email": "wrong@example.com"}
        )
        assert response.status_code == 404
        print(f"✓ Track order with wrong email correctly returns 404")
    
    def test_track_nonexistent_order(self):
        """Test tracking non-existent order returns 404"""
        response = self.session.get(f"{BASE_URL}/api/storefront/orders/NONEXISTENT123/track")
        assert response.status_code == 404
        print(f"✓ Track non-existent order correctly returns 404")
    
    def test_update_order_status_to_confirmed(self):
        """Test PUT /api/storefront/orders/{order_id}/status - confirmed"""
        order_id = self.test_create_test_order_for_tracking()
        
        update_payload = {
            "status": "confirmed",
            "note": "Order confirmed by admin"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/storefront/orders/{order_id}/status",
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["new_status"] == "confirmed"
        print(f"✓ Order status updated to confirmed: {order_id}")
        
        # Verify status change via track API
        track_response = self.session.get(f"{BASE_URL}/api/storefront/orders/{order_id}/track")
        track_data = track_response.json()
        assert track_data["order"]["status"] == "confirmed"
        assert len(track_data["order"]["status_history"]) >= 2
        print(f"✓ Status history updated correctly")
    
    def test_update_order_status_to_shipped_with_tracking(self):
        """Test updating status to shipped with tracking number"""
        order_id = self.test_create_test_order_for_tracking()
        
        # First confirm the order
        self.session.put(
            f"{BASE_URL}/api/storefront/orders/{order_id}/status",
            json={"status": "confirmed"}
        )
        
        # Then mark as processing
        self.session.put(
            f"{BASE_URL}/api/storefront/orders/{order_id}/status",
            json={"status": "processing"}
        )
        
        # Then ship with tracking number
        update_payload = {
            "status": "shipped",
            "note": "Order shipped via DTDC",
            "tracking_number": "DTDC123456789",
            "courier": "DTDC Express"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/storefront/orders/{order_id}/status",
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["new_status"] == "shipped"
        print(f"✓ Order status updated to shipped with tracking: {order_id}")
        
        # Verify tracking number via track API
        track_response = self.session.get(f"{BASE_URL}/api/storefront/orders/{order_id}/track")
        track_data = track_response.json()
        order = track_data["order"]
        assert order["status"] == "shipped"
        assert order["tracking_number"] == "DTDC123456789"
        assert order["courier"] == "DTDC Express"
        print(f"✓ Tracking number and courier saved correctly")
    
    def test_update_order_status_all_valid_statuses(self):
        """Test all valid status transitions"""
        valid_statuses = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered']
        
        order_id = self.test_create_test_order_for_tracking()
        
        for status in valid_statuses[1:]:  # Skip pending as it's the initial status
            response = self.session.put(
                f"{BASE_URL}/api/storefront/orders/{order_id}/status",
                json={"status": status}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["new_status"] == status
            print(f"✓ Status update to '{status}' successful")
        
        # Verify final status history
        track_response = self.session.get(f"{BASE_URL}/api/storefront/orders/{order_id}/track")
        track_data = track_response.json()
        assert len(track_data["order"]["status_history"]) == len(valid_statuses)
        print(f"✓ All status transitions recorded in history")
    
    def test_update_order_status_cancelled(self):
        """Test cancelling an order"""
        order_id = self.test_create_test_order_for_tracking()
        
        update_payload = {
            "status": "cancelled",
            "note": "Customer requested cancellation"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/storefront/orders/{order_id}/status",
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["new_status"] == "cancelled"
        print(f"✓ Order cancelled successfully: {order_id}")
    
    def test_update_order_status_invalid_status(self):
        """Test updating with invalid status returns 400"""
        order_id = self.test_create_test_order_for_tracking()
        
        response = self.session.put(
            f"{BASE_URL}/api/storefront/orders/{order_id}/status",
            json={"status": "invalid_status"}
        )
        assert response.status_code == 400
        print(f"✓ Invalid status correctly rejected with 400")
    
    def test_update_nonexistent_order_status(self):
        """Test updating non-existent order returns 404"""
        response = self.session.put(
            f"{BASE_URL}/api/storefront/orders/NONEXISTENT123/status",
            json={"status": "confirmed"}
        )
        assert response.status_code == 404
        print(f"✓ Non-existent order status update correctly returns 404")
    
    def test_list_storefront_orders(self):
        """Test GET /api/storefront/orders"""
        # Create a test order first
        self.test_create_test_order_for_tracking()
        
        response = self.session.get(f"{BASE_URL}/api/storefront/orders")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "orders" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert "pages" in data
        print(f"✓ List storefront orders: {data['total']} total orders")
    
    def test_list_storefront_orders_with_store_filter(self):
        """Test listing orders filtered by store"""
        response = self.session.get(
            f"{BASE_URL}/api/storefront/orders",
            params={"store_name": "tnvcollection"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ List orders by store: {data['total']} orders for tnvcollection")
    
    def test_list_storefront_orders_with_status_filter(self):
        """Test listing orders filtered by status"""
        response = self.session.get(
            f"{BASE_URL}/api/storefront/orders",
            params={"status": "pending"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ List orders by status: {data['total']} pending orders")
    
    def test_list_storefront_orders_pagination(self):
        """Test orders list pagination"""
        response = self.session.get(
            f"{BASE_URL}/api/storefront/orders",
            params={"page": 1, "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["limit"] == 10
        assert len(data["orders"]) <= 10
        print(f"✓ Pagination working: page {data['page']}, limit {data['limit']}")
    
    def test_track_existing_order_sf26010618069467(self):
        """Test tracking the sample order ID provided"""
        response = self.session.get(f"{BASE_URL}/api/storefront/orders/SF26010618069467/track")
        
        if response.status_code == 200:
            data = response.json()
            assert data["success"] == True
            order = data["order"]
            print(f"✓ Sample order SF26010618069467 found: status={order['status']}")
            if "tracking_number" in order:
                print(f"  Tracking number: {order['tracking_number']}")
            if "courier" in order:
                print(f"  Courier: {order['courier']}")
        elif response.status_code == 404:
            print(f"⚠ Sample order SF26010618069467 not found (may have been cleaned up)")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_order_has_estimated_delivery(self):
        """Test that new orders have estimated delivery date"""
        order_id = self.test_create_test_order_for_tracking()
        
        response = self.session.get(f"{BASE_URL}/api/storefront/orders/{order_id}/track")
        data = response.json()
        order = data["order"]
        
        assert "estimated_delivery" in order
        assert order["estimated_delivery"] is not None
        print(f"✓ Order has estimated delivery: {order['estimated_delivery']}")
    
    def test_status_history_has_timestamps(self):
        """Test that status history entries have timestamps"""
        order_id = self.test_create_test_order_for_tracking()
        
        # Update status
        self.session.put(
            f"{BASE_URL}/api/storefront/orders/{order_id}/status",
            json={"status": "confirmed", "note": "Test confirmation"}
        )
        
        response = self.session.get(f"{BASE_URL}/api/storefront/orders/{order_id}/track")
        data = response.json()
        order = data["order"]
        
        for entry in order["status_history"]:
            assert "status" in entry
            assert "timestamp" in entry
            assert entry["timestamp"] is not None
            print(f"✓ Status '{entry['status']}' has timestamp: {entry['timestamp']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
