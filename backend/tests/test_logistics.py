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


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
