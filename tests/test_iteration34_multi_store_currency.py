"""
Test Iteration 34: Multi-Store Currency Feature
Tests for multi-tenant e-commerce platform with two stores:
- tnvcollection (India, INR currency ₹)
- tnvcollectionpk (Pakistan, PKR currency Rs.)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAnalyticsAPICurrency:
    """Test analytics API returns correct currency for each store"""
    
    def test_analytics_overview_india_store_returns_inr(self):
        """GET /api/analytics/overview?store=tnvcollection should return INR currency"""
        response = requests.get(f"{BASE_URL}/api/analytics/overview?store=tnvcollection")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("currency") == "INR", f"Expected INR, got {data.get('currency')}"
        assert data.get("currency_symbol") == "₹", f"Expected ₹, got {data.get('currency_symbol')}"
        assert data.get("store") == "tnvcollection", f"Expected tnvcollection, got {data.get('store')}"
        print(f"✅ India store analytics returns INR with ₹ symbol")
    
    def test_analytics_overview_pakistan_store_returns_pkr(self):
        """GET /api/analytics/overview?store=tnvcollectionpk should return PKR currency"""
        response = requests.get(f"{BASE_URL}/api/analytics/overview?store=tnvcollectionpk")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("currency") == "PKR", f"Expected PKR, got {data.get('currency')}"
        assert data.get("currency_symbol") == "Rs.", f"Expected Rs., got {data.get('currency_symbol')}"
        assert data.get("store") == "tnvcollectionpk", f"Expected tnvcollectionpk, got {data.get('store')}"
        print(f"✅ Pakistan store analytics returns PKR with Rs. symbol")
    
    def test_analytics_overview_default_store_returns_inr(self):
        """GET /api/analytics/overview without store param should default to INR"""
        response = requests.get(f"{BASE_URL}/api/analytics/overview")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("currency") == "INR", f"Expected INR, got {data.get('currency')}"
        print(f"✅ Default store analytics returns INR")
    
    def test_analytics_overview_has_required_fields(self):
        """Analytics overview should have all required fields"""
        response = requests.get(f"{BASE_URL}/api/analytics/overview?store=tnvcollection")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["total_revenue", "total_orders", "avg_order_value", "currency", "currency_symbol"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        print(f"✅ Analytics overview has all required fields")


class TestCheckoutAPICurrency:
    """Test checkout cart API returns correct currency for each store"""
    
    def test_checkout_cart_india_store_returns_inr(self):
        """GET /api/checkout/cart/{session_id}?store=tnvcollection should return INR"""
        session_id = "test_session_india_123"
        response = requests.get(f"{BASE_URL}/api/checkout/cart/{session_id}?store=tnvcollection")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("currency") == "INR", f"Expected INR, got {data.get('currency')}"
        assert data.get("currency_symbol") == "₹", f"Expected ₹, got {data.get('currency_symbol')}"
        assert data.get("free_shipping_threshold") == 2000, f"Expected 2000, got {data.get('free_shipping_threshold')}"
        print(f"✅ India store cart returns INR with ₹ symbol and 2000 free shipping threshold")
    
    def test_checkout_cart_pakistan_store_returns_pkr(self):
        """GET /api/checkout/cart/{session_id}?store=tnvcollectionpk should return PKR"""
        session_id = "test_session_pakistan_123"
        response = requests.get(f"{BASE_URL}/api/checkout/cart/{session_id}?store=tnvcollectionpk")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("currency") == "PKR", f"Expected PKR, got {data.get('currency')}"
        assert data.get("currency_symbol") == "Rs.", f"Expected Rs., got {data.get('currency_symbol')}"
        assert data.get("free_shipping_threshold") == 5000, f"Expected 5000, got {data.get('free_shipping_threshold')}"
        print(f"✅ Pakistan store cart returns PKR with Rs. symbol and 5000 free shipping threshold")
    
    def test_checkout_cart_default_store_returns_inr(self):
        """GET /api/checkout/cart/{session_id} without store param should default to INR"""
        session_id = "test_session_default_123"
        response = requests.get(f"{BASE_URL}/api/checkout/cart/{session_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("currency") == "INR", f"Expected INR, got {data.get('currency')}"
        print(f"✅ Default store cart returns INR")
    
    def test_checkout_cart_has_required_fields(self):
        """Checkout cart should have all required fields"""
        session_id = "test_session_fields_123"
        response = requests.get(f"{BASE_URL}/api/checkout/cart/{session_id}?store=tnvcollection")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["items", "subtotal", "shipping", "total", "currency", "currency_symbol", "free_shipping_threshold"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        print(f"✅ Checkout cart has all required fields")


class TestStoreConfigEndpoints:
    """Test store configuration endpoints"""
    
    def test_revenue_chart_endpoint(self):
        """Test revenue chart endpoint works"""
        response = requests.get(f"{BASE_URL}/api/analytics/revenue-chart?store=tnvcollection")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "data" in data, "Missing data field in revenue chart response"
        print(f"✅ Revenue chart endpoint works")
    
    def test_top_products_endpoint(self):
        """Test top products endpoint works"""
        response = requests.get(f"{BASE_URL}/api/analytics/top-products?store=tnvcollection")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "products" in data, "Missing products field in top products response"
        print(f"✅ Top products endpoint works")
    
    def test_orders_by_status_endpoint(self):
        """Test orders by status endpoint works"""
        response = requests.get(f"{BASE_URL}/api/analytics/orders-by-status?store=tnvcollection")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "statuses" in data, "Missing statuses field in orders by status response"
        print(f"✅ Orders by status endpoint works")
    
    def test_customer_stats_endpoint(self):
        """Test customer stats endpoint works"""
        response = requests.get(f"{BASE_URL}/api/analytics/customer-stats?store=tnvcollection")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total_customers" in data, "Missing total_customers field"
        print(f"✅ Customer stats endpoint works")
    
    def test_sales_by_category_endpoint(self):
        """Test sales by category endpoint works"""
        response = requests.get(f"{BASE_URL}/api/analytics/sales-by-category?store=tnvcollection")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "categories" in data, "Missing categories field"
        print(f"✅ Sales by category endpoint works")


class TestStoreConfigurations:
    """Test store-specific configurations"""
    
    def test_india_store_config(self):
        """Verify India store configuration values"""
        response = requests.get(f"{BASE_URL}/api/checkout/cart/test_config_india?store=tnvcollection")
        assert response.status_code == 200
        
        data = response.json()
        # India store: INR, ₹, free shipping at 2000
        assert data.get("currency") == "INR"
        assert data.get("currency_symbol") == "₹"
        assert data.get("free_shipping_threshold") == 2000
        print(f"✅ India store config: INR ₹, free shipping at ₹2000")
    
    def test_pakistan_store_config(self):
        """Verify Pakistan store configuration values"""
        response = requests.get(f"{BASE_URL}/api/checkout/cart/test_config_pakistan?store=tnvcollectionpk")
        assert response.status_code == 200
        
        data = response.json()
        # Pakistan store: PKR, Rs., free shipping at 5000
        assert data.get("currency") == "PKR"
        assert data.get("currency_symbol") == "Rs."
        assert data.get("free_shipping_threshold") == 5000
        print(f"✅ Pakistan store config: PKR Rs., free shipping at Rs.5000")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
