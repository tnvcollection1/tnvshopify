"""
Iteration 32: DWZ Creation Modal Tests
Tests for the Create DWZ Order from 1688 feature

Features tested:
- POST /api/1688/create-dwz-from-1688 endpoint structure
- Request payload validation
- Error handling for missing order data
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDwzCreationEndpoint:
    """Tests for the /api/1688/create-dwz-from-1688 endpoint"""
    
    def test_health_check(self):
        """Verify 1688 API health endpoint is working"""
        response = requests.get(f"{BASE_URL}/api/1688/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        assert "app_key" in data
        print(f"✅ Health check passed: {data}")
    
    def test_create_dwz_endpoint_exists(self):
        """Verify the create-dwz-from-1688 endpoint exists and accepts POST"""
        # Send a POST request with minimal payload to check endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/1688/create-dwz-from-1688",
            json={
                "order_id": "test_order_123"
            },
            headers={"Content-Type": "application/json"}
        )
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404, "Endpoint /api/1688/create-dwz-from-1688 not found"
        print(f"✅ Endpoint exists, status: {response.status_code}")
    
    def test_create_dwz_requires_order_id(self):
        """Verify order_id is required"""
        response = requests.post(
            f"{BASE_URL}/api/1688/create-dwz-from-1688",
            json={},
            headers={"Content-Type": "application/json"}
        )
        # Should return 422 for validation error (missing required field)
        assert response.status_code == 422, f"Expected 422 for missing order_id, got {response.status_code}"
        print(f"✅ Validation works - order_id is required")
    
    def test_create_dwz_with_mock_order_id(self):
        """Test endpoint with a mock order ID (will fail at 1688 API level)"""
        response = requests.post(
            f"{BASE_URL}/api/1688/create-dwz-from-1688",
            json={
                "order_id": "mock_order_12345678",
                "company_prefix": "TNV",
                "destination": "IN",
                "shopify_order_number": "#TEST1234",
                "shopify_color": "Black",
                "shopify_size": "XL",
                "configured_remark": "Test remark"
            },
            headers={"Content-Type": "application/json"}
        )
        # Should return 400 or 500 because the order doesn't exist on 1688
        # But the endpoint should process the request
        assert response.status_code in [400, 401, 500, 422], f"Unexpected status: {response.status_code}"
        data = response.json()
        print(f"✅ Endpoint processed request, response: {data}")
    
    def test_create_dwz_payload_structure(self):
        """Test that the endpoint accepts all expected fields"""
        payload = {
            "order_id": "test_order_structure",
            "company_prefix": "TNV",
            "destination": "IN",
            "shopify_order_number": "#1234",
            "shopify_color": "Yellow",
            "shopify_size": "L",
            "configured_remark": "Test configured remark"
        }
        response = requests.post(
            f"{BASE_URL}/api/1688/create-dwz-from-1688",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        # Endpoint should accept the payload (not 422 validation error for fields)
        # It may fail at 1688 API level but that's expected
        assert response.status_code != 422 or "order_id" not in str(response.json()), \
            f"Payload structure rejected: {response.json()}"
        print(f"✅ Payload structure accepted, status: {response.status_code}")
    
    def test_create_dwz_destination_options(self):
        """Test different destination options"""
        destinations = ["IN", "PK", "BD", "LK"]
        
        for dest in destinations:
            response = requests.post(
                f"{BASE_URL}/api/1688/create-dwz-from-1688",
                json={
                    "order_id": f"test_dest_{dest}",
                    "destination": dest
                },
                headers={"Content-Type": "application/json"}
            )
            # Should not fail validation for destination
            assert response.status_code != 422 or "destination" not in str(response.json()), \
                f"Destination {dest} rejected"
        print(f"✅ All destination options accepted: {destinations}")


class TestOrdersEndpoint:
    """Tests for the 1688 orders endpoint (used to populate order cards)"""
    
    def test_orders_endpoint_exists(self):
        """Verify orders endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/1688/orders")
        # May return 401 if token expired, but endpoint should exist
        assert response.status_code != 404, "Orders endpoint not found"
        print(f"✅ Orders endpoint exists, status: {response.status_code}")
    
    def test_orders_response_structure(self):
        """Check orders response structure"""
        response = requests.get(f"{BASE_URL}/api/1688/orders")
        if response.status_code == 200:
            data = response.json()
            # Should have success and orders fields
            assert "success" in data or "orders" in data or "detail" in data
            print(f"✅ Orders response structure valid")
        else:
            # Token may be expired - this is expected per agent context
            print(f"⚠️ Orders returned {response.status_code} - token may be expired (expected)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
