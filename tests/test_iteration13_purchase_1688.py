"""
Test Suite for Iteration 13 - Purchase 1688 Orders Page & Webhook Security
Tests:
1. GET /api/1688/purchase-orders - List purchase orders
2. GET /api/1688/purchase-orders with status filter
3. GET /api/1688/purchase-orders with shopify_order_id filter
4. GET /api/webhooks/fulfillment/security/config - Webhook security config
5. GET /api/webhooks/fulfillment/security/stats - Webhook security stats
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://multi-shop-hub-5.preview.emergentagent.com').rstrip('/')


class TestPurchase1688Orders:
    """Tests for /api/1688/purchase-orders endpoint"""
    
    def test_list_purchase_orders(self):
        """Test listing all purchase orders"""
        response = requests.get(f"{BASE_URL}/api/1688/purchase-orders")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "orders" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        
        # Verify we have 2 orders as expected
        assert data["total"] == 2
        assert len(data["orders"]) == 2
        print(f"✓ Found {data['total']} purchase orders")
    
    def test_purchase_order_structure(self):
        """Test that purchase orders have correct structure"""
        response = requests.get(f"{BASE_URL}/api/1688/purchase-orders")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["orders"]) > 0
        
        order = data["orders"][0]
        
        # Verify required fields
        required_fields = [
            "alibaba_order_id",
            "product_id",
            "quantity",
            "status",
            "created_at"
        ]
        
        for field in required_fields:
            assert field in order, f"Missing field: {field}"
            print(f"✓ Field '{field}' present: {order[field]}")
        
        # Verify optional fields that should be present
        optional_fields = ["size", "color", "shopify_order_id", "notes", "api_response"]
        for field in optional_fields:
            if field in order:
                print(f"✓ Optional field '{field}' present")
    
    def test_filter_by_status(self):
        """Test filtering orders by status"""
        response = requests.get(f"{BASE_URL}/api/1688/purchase-orders?status=created")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # All orders should have 'created' status
        for order in data["orders"]:
            assert order["status"] == "created", f"Expected status 'created', got '{order['status']}'"
        
        print(f"✓ Status filter working - found {len(data['orders'])} orders with status 'created'")
    
    def test_filter_by_shopify_order_id(self):
        """Test filtering orders by Shopify order ID"""
        response = requests.get(f"{BASE_URL}/api/1688/purchase-orders?shopify_order_id=29156")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["total"] == 1
        assert len(data["orders"]) == 1
        assert data["orders"][0]["shopify_order_id"] == "29156"
        
        print(f"✓ Shopify Order ID filter working - found order for #29156")
    
    def test_pagination(self):
        """Test pagination parameters"""
        response = requests.get(f"{BASE_URL}/api/1688/purchase-orders?page=1&page_size=1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["page"] == 1
        assert data["page_size"] == 1
        assert len(data["orders"]) == 1
        
        print(f"✓ Pagination working - page 1 with 1 item")
    
    def test_order_details_content(self):
        """Test that order details contain expected data"""
        response = requests.get(f"{BASE_URL}/api/1688/purchase-orders")
        assert response.status_code == 200
        
        data = response.json()
        order = data["orders"][0]
        
        # Verify alibaba_order_id format (should be numeric string)
        assert order["alibaba_order_id"].isdigit(), "alibaba_order_id should be numeric"
        
        # Verify product_id format
        assert order["product_id"].isdigit(), "product_id should be numeric"
        
        # Verify quantity is positive
        assert order["quantity"] >= 1, "quantity should be at least 1"
        
        # Verify api_response contains order confirmation
        if "api_response" in order:
            api_resp = order["api_response"]
            assert "result" in api_resp or "success" in api_resp
            print(f"✓ API response contains order confirmation")
        
        print(f"✓ Order details validated for order {order['alibaba_order_id']}")


class TestWebhookSecurity:
    """Tests for webhook security endpoints"""
    
    def test_security_config_endpoint(self):
        """Test GET /api/webhooks/fulfillment/security/config"""
        response = requests.get(f"{BASE_URL}/api/webhooks/fulfillment/security/config")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "config" in data
        
        config = data["config"]
        
        # Verify config structure
        expected_fields = [
            "require_signature",
            "rate_limit_requests",
            "rate_limit_window_seconds",
            "ip_whitelist_enabled",
            "ip_whitelist_count"
        ]
        
        for field in expected_fields:
            assert field in config, f"Missing config field: {field}"
            print(f"✓ Config field '{field}': {config[field]}")
        
        # Verify types
        assert isinstance(config["require_signature"], bool)
        assert isinstance(config["rate_limit_requests"], int)
        assert isinstance(config["rate_limit_window_seconds"], int)
        assert isinstance(config["ip_whitelist_enabled"], bool)
        assert isinstance(config["ip_whitelist_count"], int)
        
        print(f"✓ Security config endpoint working correctly")
    
    def test_security_stats_endpoint(self):
        """Test GET /api/webhooks/fulfillment/security/stats"""
        response = requests.get(f"{BASE_URL}/api/webhooks/fulfillment/security/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "stats" in data
        
        stats = data["stats"]
        
        # Verify stats structure
        expected_stats = [
            "blocked_by_ip",
            "rate_limited",
            "invalid_signatures",
            "missing_signatures"
        ]
        
        for stat in expected_stats:
            assert stat in stats, f"Missing stat: {stat}"
            assert isinstance(stats[stat], int), f"Stat '{stat}' should be integer"
            print(f"✓ Stat '{stat}': {stats[stat]}")
        
        # Verify rate limit info
        assert "rate_limit_threshold" in data
        assert "current_rate_usage" in data
        
        print(f"✓ Security stats endpoint working correctly")
    
    def test_security_logs_endpoint(self):
        """Test GET /api/webhooks/fulfillment/security/logs"""
        response = requests.get(f"{BASE_URL}/api/webhooks/fulfillment/security/logs?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "logs" in data
        assert "count" in data
        
        print(f"✓ Security logs endpoint working - {data['count']} logs found")


class TestWebhookEndpoints:
    """Tests for webhook endpoints"""
    
    def test_webhook_logs_endpoint(self):
        """Test GET /api/webhooks/fulfillment/logs"""
        response = requests.get(f"{BASE_URL}/api/webhooks/fulfillment/logs?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "logs" in data
        assert "count" in data
        
        print(f"✓ Webhook logs endpoint working - {data['count']} logs found")
    
    def test_webhook_test_endpoint(self):
        """Test POST /api/webhooks/fulfillment/test"""
        response = requests.post(
            f"{BASE_URL}/api/webhooks/fulfillment/test",
            json={"test_type": "fulfillment"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "payload" in data
        
        print(f"✓ Webhook test endpoint working")


class Test1688APIHealth:
    """Tests for 1688 API health"""
    
    def test_1688_health_endpoint(self):
        """Test GET /api/1688/health"""
        response = requests.get(f"{BASE_URL}/api/1688/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "ok"
        assert "app_key" in data
        assert "has_app_secret" in data
        
        print(f"✓ 1688 API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
