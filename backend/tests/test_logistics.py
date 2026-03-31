"""
Logistics API Tests - Shri Maruti / Innofulfill Integration
Tests for rate calculator, bookings, tracking, and Shopify push endpoints.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLogisticsAuthStatus:
    """Test Innofulfill authentication status endpoint"""
    
    def test_auth_status_returns_success(self):
        """Verify API authentication is working"""
        response = requests.get(f"{BASE_URL}/api/logistics/auth-status")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "token_preview" in data
        assert data["message"] == "Innofulfill authentication active"
        print(f"✓ Auth status: {data['message']}")


class TestLogisticsRateCalculator:
    """Test rate calculation endpoints"""
    
    def test_calculate_rate_surface(self):
        """Test single rate calculation for SURFACE delivery"""
        payload = {
            "from_pincode": "110001",
            "to_pincode": "400001",
            "weight": 500,
            "length": 30,
            "width": 20,
            "height": 10,
            "delivery_type": "SURFACE"
        }
        response = requests.post(f"{BASE_URL}/api/logistics/calculate-rate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "rate" in data
        assert "shippingCharge" in data["rate"]
        print(f"✓ Surface rate: ₹{data['rate']['shippingCharge']}")
    
    def test_compare_rates_surface_and_air(self):
        """Test rate comparison between SURFACE and AIR"""
        payload = {
            "from_pincode": "110001",
            "to_pincode": "400001",
            "weight": 500,
            "length": 30,
            "width": 20,
            "height": 10
        }
        response = requests.post(f"{BASE_URL}/api/logistics/calculate-rate/compare", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "rates" in data
        
        # Verify both surface and air rates are returned
        rates = data["rates"]
        assert "surface" in rates, "Surface rate should be present"
        assert "air" in rates, "Air rate should be present"
        
        # Verify rate structure
        assert "shippingCharge" in rates["surface"]
        assert "shippingCharge" in rates["air"]
        assert "chargeableWeight" in rates["surface"]
        assert "chargeableWeight" in rates["air"]
        
        print(f"✓ Surface: ₹{rates['surface']['shippingCharge']}, Air: ₹{rates['air']['shippingCharge']}")
    
    def test_rate_calculation_missing_pincode(self):
        """Test rate calculation with missing destination pincode"""
        payload = {
            "from_pincode": "110001",
            "to_pincode": "",
            "weight": 500
        }
        response = requests.post(f"{BASE_URL}/api/logistics/calculate-rate", json=payload)
        # Should return 400 or validation error
        assert response.status_code in [400, 422]


class TestLogisticsBookings:
    """Test bookings list endpoint"""
    
    def test_list_bookings(self):
        """Test fetching bookings list"""
        response = requests.get(f"{BASE_URL}/api/logistics/bookings")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "bookings" in data
        assert "total" in data
        assert isinstance(data["bookings"], list)
        
        print(f"✓ Found {data['total']} bookings")
        
        # If there are bookings, verify structure
        if data["bookings"]:
            booking = data["bookings"][0]
            assert "order_id" in booking
            assert "status" in booking
            print(f"  First booking: {booking['order_id']} - {booking['status']}")
    
    def test_list_bookings_with_pagination(self):
        """Test bookings list with pagination parameters"""
        response = requests.get(f"{BASE_URL}/api/logistics/bookings?page=1&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["page"] == 1
        assert len(data["bookings"]) <= 5


class TestLogisticsTracking:
    """Test tracking endpoints"""
    
    def test_track_existing_awb(self):
        """Test tracking for known AWB number"""
        tracking_id = "TNVC0000000004"
        response = requests.get(f"{BASE_URL}/api/logistics/track/{tracking_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "tracking" in data
        
        tracking = data["tracking"]
        assert tracking["trackingId"] == tracking_id
        assert "status" in tracking
        assert "location" in tracking
        
        print(f"✓ Tracking {tracking_id}: {tracking['status']} at {tracking['location']}")
    
    def test_track_history(self):
        """Test tracking history for known AWB"""
        tracking_id = "TNVC0000000004"
        response = requests.get(f"{BASE_URL}/api/logistics/track/{tracking_id}/history")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "history" in data
        
        # History should be a list
        assert isinstance(data["history"], list)
        
        if data["history"]:
            event = data["history"][0]
            assert "category" in event or "status" in event
            print(f"✓ Found {len(data['history'])} tracking events")


class TestLogisticsBookOrder:
    """Test order booking endpoint (structure validation only)"""
    
    def test_book_order_validation(self):
        """Test booking endpoint validates required fields"""
        # Incomplete payload - should fail validation
        payload = {
            "orderId": "TEST-VALIDATION-001"
            # Missing required fields
        }
        response = requests.post(f"{BASE_URL}/api/logistics/book-order", json=payload)
        # Should return 422 (validation error)
        assert response.status_code == 422
        print("✓ Booking validation working - rejects incomplete payload")


class TestShippableOrders:
    """Test shippable orders endpoint for bulk shipping feature"""
    
    def test_get_shippable_orders(self):
        """Test fetching shippable orders (paid + unfulfilled)"""
        response = requests.get(f"{BASE_URL}/api/logistics/shippable-orders?page=1&limit=25")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "orders" in data
        assert "total" in data
        assert isinstance(data["orders"], list)
        
        # Should have 423+ orders as per requirement
        assert data["total"] >= 400, f"Expected 400+ shippable orders, got {data['total']}"
        print(f"✓ Found {data['total']} shippable orders")
        
        # Verify order structure
        if data["orders"]:
            order = data["orders"][0]
            assert "order_number" in order
            assert "customer_name" in order
            assert "phone" in order
            assert "items_summary" in order
            assert "already_booked" in order
            print(f"  First order: #{order['order_number']} - {order['customer_name']}")
    
    def test_shippable_orders_search_filter(self):
        """Test search filter on shippable orders"""
        # Search by order number
        response = requests.get(f"{BASE_URL}/api/logistics/shippable-orders?search=9891")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["total"] >= 1, "Search for '9891' should return at least 1 order"
        
        # Verify search results contain the search term
        found_match = False
        for order in data["orders"]:
            if "9891" in str(order.get("order_number", "")) or "9891" in str(order.get("phone", "")):
                found_match = True
                break
        assert found_match, "Search results should contain orders matching '9891'"
        print(f"✓ Search filter working - found {data['total']} orders matching '9891'")
    
    def test_shippable_orders_pagination(self):
        """Test pagination on shippable orders"""
        # Get page 1
        response1 = requests.get(f"{BASE_URL}/api/logistics/shippable-orders?page=1&limit=10")
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Get page 2
        response2 = requests.get(f"{BASE_URL}/api/logistics/shippable-orders?page=2&limit=10")
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Verify different orders on different pages
        if data1["orders"] and data2["orders"]:
            page1_orders = {o["order_number"] for o in data1["orders"]}
            page2_orders = {o["order_number"] for o in data2["orders"]}
            assert page1_orders != page2_orders, "Page 1 and Page 2 should have different orders"
        
        print(f"✓ Pagination working - Page 1: {len(data1['orders'])} orders, Page 2: {len(data2['orders'])} orders")


class TestBulkPush:
    """Test bulk push endpoint for bulk shipping feature"""
    
    def test_bulk_push_invalid_order(self):
        """Test bulk push with invalid order number returns proper error"""
        payload = {
            "order_numbers": [999999999],
            "delivery_type": "SURFACE"
        }
        response = requests.post(f"{BASE_URL}/api/logistics/bulk-push", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["total"] == 1
        assert data["failed"] == 1
        assert data["success"] == 0
        
        # Verify error message
        assert len(data["results"]) == 1
        result = data["results"][0]
        assert result["status"] == "error"
        assert "not found" in result["message"].lower()
        print("✓ Bulk push handles invalid orders correctly")
    
    def test_bulk_push_empty_list(self):
        """Test bulk push with empty order list"""
        payload = {
            "order_numbers": [],
            "delivery_type": "SURFACE"
        }
        response = requests.post(f"{BASE_URL}/api/logistics/bulk-push", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] == 0
        assert data["success"] == 0
        assert data["failed"] == 0
        print("✓ Bulk push handles empty list correctly")
    
    def test_bulk_push_validation(self):
        """Test bulk push validates delivery type"""
        payload = {
            "order_numbers": [9891],
            "delivery_type": "SURFACE"  # Valid delivery type
        }
        response = requests.post(f"{BASE_URL}/api/logistics/bulk-push", json=payload)
        # Should not fail validation
        assert response.status_code == 200
        print("✓ Bulk push accepts valid delivery type")


class TestAutoPushSettings:
    """Test auto-push settings endpoints for webhook-based auto-shipping"""
    
    def test_get_auto_push_settings(self):
        """Test fetching auto-push settings"""
        response = requests.get(f"{BASE_URL}/api/logistics/auto-push/settings")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "settings" in data
        
        settings = data["settings"]
        assert "enabled" in settings
        assert "delivery_type" in settings
        assert "pickup" in settings
        
        # Verify pickup address structure
        pickup = settings["pickup"]
        assert "name" in pickup
        assert "phone" in pickup
        assert "address" in pickup
        assert "city" in pickup
        assert "state" in pickup
        assert "zip" in pickup
        
        print(f"✓ Auto-push settings: enabled={settings['enabled']}, delivery_type={settings['delivery_type']}")
    
    def test_save_auto_push_settings(self):
        """Test saving auto-push settings"""
        payload = {
            "enabled": True,
            "delivery_type": "SURFACE",
            "pickup_name": "TNVC Collection",
            "pickup_phone": "9582639469",
            "pickup_address": "TNVC Warehouse",
            "pickup_city": "Delhi",
            "pickup_state": "Delhi",
            "pickup_zip": "110001"
        }
        response = requests.post(f"{BASE_URL}/api/logistics/auto-push/settings", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "settings" in data
        
        # Verify settings were saved
        saved = data["settings"]
        assert saved["enabled"] == True
        assert saved["delivery_type"] == "SURFACE"
        assert saved["pickup"]["name"] == "TNVC Collection"
        
        print("✓ Auto-push settings saved successfully")
    
    def test_toggle_auto_push_off(self):
        """Test disabling auto-push"""
        payload = {
            "enabled": False,
            "delivery_type": "SURFACE",
            "pickup_name": "TNVC Collection",
            "pickup_phone": "9582639469",
            "pickup_address": "TNVC Warehouse",
            "pickup_city": "Delhi",
            "pickup_state": "Delhi",
            "pickup_zip": "110001"
        }
        response = requests.post(f"{BASE_URL}/api/logistics/auto-push/settings", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["settings"]["enabled"] == False
        
        print("✓ Auto-push disabled successfully")
    
    def test_toggle_auto_push_on(self):
        """Test enabling auto-push"""
        payload = {
            "enabled": True,
            "delivery_type": "SURFACE",
            "pickup_name": "TNVC Collection",
            "pickup_phone": "9582639469",
            "pickup_address": "TNVC Warehouse",
            "pickup_city": "Delhi",
            "pickup_state": "Delhi",
            "pickup_zip": "110001"
        }
        response = requests.post(f"{BASE_URL}/api/logistics/auto-push/settings", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["settings"]["enabled"] == True
        
        print("✓ Auto-push enabled successfully")


class TestWebhookManagement:
    """Test webhook registration and listing endpoints"""
    
    def test_list_webhooks(self):
        """Test listing registered Shopify webhooks"""
        response = requests.get(f"{BASE_URL}/api/logistics/webhooks")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "webhooks" in data
        assert isinstance(data["webhooks"], list)
        
        # Check if orders/paid webhook is registered
        paid_webhook = None
        for wh in data["webhooks"]:
            if wh.get("topic") == "orders/paid":
                paid_webhook = wh
                break
        
        if paid_webhook:
            print(f"✓ orders/paid webhook registered: {paid_webhook['address']}")
        else:
            print("✓ Webhooks endpoint working (no orders/paid webhook found)")
        
        print(f"  Total webhooks: {len(data['webhooks'])}")
    
    # NOTE: Not testing register-webhook endpoint to avoid creating duplicates
    # as per agent_to_agent_context_note


class TestPushFailures:
    """Test push failures logging endpoint"""
    
    def test_list_push_failures(self):
        """Test fetching push failures list"""
        response = requests.get(f"{BASE_URL}/api/logistics/push-failures?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "failures" in data
        assert isinstance(data["failures"], list)
        
        if data["failures"]:
            failure = data["failures"][0]
            assert "order_id" in failure
            assert "error" in failure
            assert "created_at" in failure
            print(f"✓ Found {len(data['failures'])} push failures")
            print(f"  Latest failure: Order #{failure['order_id']} - {failure['error'][:50]}...")
        else:
            print("✓ No push failures recorded (good!)")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
