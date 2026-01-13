"""
Test Suite for Iteration 22 - Storefront Orders Admin View
Tests the admin interface for managing storefront orders
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ecomm-hub-18.preview.emergentagent.com')

class TestStorefrontOrdersAPI:
    """Test Storefront Orders API endpoints"""
    
    # ============ GET /api/storefront/orders - List Orders ============
    
    def test_list_orders_returns_success(self):
        """Test that listing orders returns success"""
        response = requests.get(f"{BASE_URL}/api/storefront/orders")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "orders" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        print(f"✓ List orders returned {data['total']} orders")
    
    def test_list_orders_returns_order_structure(self):
        """Test that orders have correct structure"""
        response = requests.get(f"{BASE_URL}/api/storefront/orders")
        assert response.status_code == 200
        data = response.json()
        
        if data["orders"]:
            order = data["orders"][0]
            # Check required fields
            assert "order_id" in order
            assert "customer" in order
            assert "status" in order
            assert "total" in order
            assert "created_at" in order
            assert "payment_status" in order
            print(f"✓ Order structure verified: {order['order_id']}")
    
    def test_list_orders_with_status_filter(self):
        """Test filtering orders by status"""
        response = requests.get(f"{BASE_URL}/api/storefront/orders?status=pending")
        assert response.status_code == 200
        data = response.json()
        
        # All returned orders should have pending status
        for order in data["orders"]:
            assert order["status"] == "pending"
        print(f"✓ Status filter returned {len(data['orders'])} pending orders")
    
    def test_list_orders_with_pagination(self):
        """Test pagination parameters"""
        response = requests.get(f"{BASE_URL}/api/storefront/orders?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert data["page"] == 1
        assert len(data["orders"]) <= 5
        print(f"✓ Pagination working: page {data['page']}, {len(data['orders'])} orders")
    
    # ============ GET /api/storefront/orders/{id} - Get Single Order ============
    
    def test_get_order_by_id(self):
        """Test getting a specific order by ID"""
        # First get list to find an order ID
        list_response = requests.get(f"{BASE_URL}/api/storefront/orders?limit=1")
        orders = list_response.json()["orders"]
        
        if orders:
            order_id = orders[0]["order_id"]
            response = requests.get(f"{BASE_URL}/api/storefront/orders/{order_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert data["order"]["order_id"] == order_id
            print(f"✓ Retrieved order: {order_id}")
        else:
            pytest.skip("No orders available for testing")
    
    def test_get_order_not_found(self):
        """Test getting non-existent order returns 404"""
        response = requests.get(f"{BASE_URL}/api/storefront/orders/NONEXISTENT123")
        assert response.status_code == 404
        print("✓ Non-existent order returns 404")
    
    # ============ PUT /api/storefront/orders/{id}/status - Update Status ============
    
    def test_update_order_status_success(self):
        """Test updating order status"""
        # Get a pending order
        list_response = requests.get(f"{BASE_URL}/api/storefront/orders?status=pending&limit=1")
        orders = list_response.json()["orders"]
        
        if orders:
            order_id = orders[0]["order_id"]
            
            # Update to confirmed
            response = requests.put(
                f"{BASE_URL}/api/storefront/orders/{order_id}/status",
                json={
                    "status": "confirmed",
                    "note": "Test status update"
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert data["new_status"] == "confirmed"
            print(f"✓ Updated order {order_id} to confirmed")
            
            # Revert back to pending
            requests.put(
                f"{BASE_URL}/api/storefront/orders/{order_id}/status",
                json={"status": "pending", "note": "Reverted for testing"}
            )
        else:
            pytest.skip("No pending orders available for testing")
    
    def test_update_order_status_with_tracking(self):
        """Test updating status with tracking number"""
        # Get a confirmed order
        list_response = requests.get(f"{BASE_URL}/api/storefront/orders?status=confirmed&limit=1")
        orders = list_response.json()["orders"]
        
        if orders:
            order_id = orders[0]["order_id"]
            
            response = requests.put(
                f"{BASE_URL}/api/storefront/orders/{order_id}/status",
                json={
                    "status": "shipped",
                    "tracking_number": "TEST123456789",
                    "courier": "DHL Express",
                    "note": "Test shipment"
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert data["new_status"] == "shipped"
            print(f"✓ Updated order {order_id} to shipped with tracking")
            
            # Verify tracking was saved
            verify_response = requests.get(f"{BASE_URL}/api/storefront/orders/{order_id}")
            verify_data = verify_response.json()
            assert verify_data["order"]["tracking_number"] == "TEST123456789"
            assert verify_data["order"]["courier"] == "DHL Express"
            print(f"✓ Tracking number and courier saved correctly")
        else:
            pytest.skip("No confirmed orders available for testing")
    
    def test_update_order_status_invalid_status(self):
        """Test updating with invalid status returns error"""
        list_response = requests.get(f"{BASE_URL}/api/storefront/orders?limit=1")
        orders = list_response.json()["orders"]
        
        if orders:
            order_id = orders[0]["order_id"]
            
            response = requests.put(
                f"{BASE_URL}/api/storefront/orders/{order_id}/status",
                json={"status": "invalid_status"}
            )
            assert response.status_code == 400
            print("✓ Invalid status returns 400 error")
        else:
            pytest.skip("No orders available for testing")
    
    def test_update_order_status_not_found(self):
        """Test updating non-existent order returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/storefront/orders/NONEXISTENT123/status",
            json={"status": "confirmed"}
        )
        assert response.status_code == 404
        print("✓ Non-existent order status update returns 404")
    
    # ============ Status History Tests ============
    
    def test_status_history_is_tracked(self):
        """Test that status changes are tracked in history"""
        # Get an order with status history
        list_response = requests.get(f"{BASE_URL}/api/storefront/orders?limit=10")
        orders = list_response.json()["orders"]
        
        # Find an order with status history
        order_with_history = None
        for order in orders:
            if order.get("status_history") and len(order["status_history"]) > 1:
                order_with_history = order
                break
        
        if order_with_history:
            assert "status_history" in order_with_history
            assert len(order_with_history["status_history"]) > 0
            
            # Check history entry structure
            history_entry = order_with_history["status_history"][0]
            assert "status" in history_entry
            assert "timestamp" in history_entry
            print(f"✓ Status history tracked for order {order_with_history['order_id']}")
        else:
            pytest.skip("No orders with status history available")
    
    # ============ Stats Calculation Tests ============
    
    def test_orders_have_correct_status_values(self):
        """Test that orders have valid status values"""
        valid_statuses = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']
        
        response = requests.get(f"{BASE_URL}/api/storefront/orders?limit=50")
        data = response.json()
        
        for order in data["orders"]:
            assert order["status"] in valid_statuses, f"Invalid status: {order['status']}"
        
        print(f"✓ All {len(data['orders'])} orders have valid status values")
    
    def test_orders_have_payment_status(self):
        """Test that orders have payment status"""
        valid_payment_statuses = ['pending', 'paid']
        
        response = requests.get(f"{BASE_URL}/api/storefront/orders?limit=50")
        data = response.json()
        
        for order in data["orders"]:
            assert order["payment_status"] in valid_payment_statuses
        
        print(f"✓ All orders have valid payment status")
    
    # ============ Customer Info Tests ============
    
    def test_orders_have_customer_info(self):
        """Test that orders contain customer information"""
        response = requests.get(f"{BASE_URL}/api/storefront/orders?limit=10")
        data = response.json()
        
        for order in data["orders"]:
            assert "customer" in order
            customer = order["customer"]
            assert "first_name" in customer
            assert "last_name" in customer
            assert "email" in customer
        
        print(f"✓ All orders have customer information")
    
    # ============ Search Functionality Tests ============
    
    def test_search_by_order_id(self):
        """Test that orders can be found by order ID (client-side search)"""
        # Get orders and verify order_id field exists for search
        response = requests.get(f"{BASE_URL}/api/storefront/orders?limit=10")
        data = response.json()
        
        if data["orders"]:
            order = data["orders"][0]
            assert "order_id" in order
            assert order["order_id"].startswith("SF")  # Storefront orders start with SF
            print(f"✓ Order ID format correct: {order['order_id']}")
        else:
            pytest.skip("No orders available")
    
    # ============ All Status Filter Tests ============
    
    def test_filter_by_confirmed_status(self):
        """Test filtering by confirmed status"""
        response = requests.get(f"{BASE_URL}/api/storefront/orders?status=confirmed")
        assert response.status_code == 200
        data = response.json()
        
        for order in data["orders"]:
            assert order["status"] == "confirmed"
        print(f"✓ Confirmed filter: {len(data['orders'])} orders")
    
    def test_filter_by_shipped_status(self):
        """Test filtering by shipped status"""
        response = requests.get(f"{BASE_URL}/api/storefront/orders?status=shipped")
        assert response.status_code == 200
        data = response.json()
        
        for order in data["orders"]:
            assert order["status"] == "shipped"
        print(f"✓ Shipped filter: {len(data['orders'])} orders")
    
    def test_filter_by_delivered_status(self):
        """Test filtering by delivered status"""
        response = requests.get(f"{BASE_URL}/api/storefront/orders?status=delivered")
        assert response.status_code == 200
        data = response.json()
        
        for order in data["orders"]:
            assert order["status"] == "delivered"
        print(f"✓ Delivered filter: {len(data['orders'])} orders")
    
    def test_filter_by_cancelled_status(self):
        """Test filtering by cancelled status"""
        response = requests.get(f"{BASE_URL}/api/storefront/orders?status=cancelled")
        assert response.status_code == 200
        data = response.json()
        
        for order in data["orders"]:
            assert order["status"] == "cancelled"
        print(f"✓ Cancelled filter: {len(data['orders'])} orders")


class TestStorefrontHealthCheck:
    """Test storefront health endpoint"""
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/storefront/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✓ Storefront health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
