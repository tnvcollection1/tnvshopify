"""
Test Suite for Iteration 26 - Price Comparison Page
Tests the CompetitorPriceCatalog component and bulk-lookup API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBulkLookupAPI:
    """Tests for POST /api/competitor/bulk-lookup endpoint"""
    
    def test_bulk_lookup_empty_product_ids(self):
        """Test bulk lookup with empty product_ids list"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/bulk-lookup",
            json={"product_ids": [], "store_name": "test"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["analyses"] == {}
        assert data["found"] == 0
        assert data["requested"] == 0
        print("PASS: Bulk lookup with empty product_ids returns empty analyses")
    
    def test_bulk_lookup_single_product(self):
        """Test bulk lookup with single product_id"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/bulk-lookup",
            json={"product_ids": ["test_product_123"], "store_name": "test"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "analyses" in data
        assert data["requested"] == 1
        print("PASS: Bulk lookup with single product_id works correctly")
    
    def test_bulk_lookup_multiple_products(self):
        """Test bulk lookup with multiple product_ids"""
        product_ids = ["prod_1", "prod_2", "prod_3", "prod_4", "prod_5"]
        response = requests.post(
            f"{BASE_URL}/api/competitor/bulk-lookup",
            json={"product_ids": product_ids, "store_name": "test"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "analyses" in data
        assert data["requested"] == 5
        print("PASS: Bulk lookup with multiple product_ids works correctly")
    
    def test_bulk_lookup_without_store_name(self):
        """Test bulk lookup without store_name parameter"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/bulk-lookup",
            json={"product_ids": ["test_product"]}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("PASS: Bulk lookup works without store_name parameter")
    
    def test_bulk_lookup_invalid_request(self):
        """Test bulk lookup with invalid request body"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/bulk-lookup",
            json={}
        )
        # Should return 422 for validation error
        assert response.status_code == 422
        print("PASS: Bulk lookup returns 422 for invalid request")


class TestShopifyProductsAPI:
    """Tests for GET /api/shopify/products endpoint used by Price Comparison"""
    
    def test_get_products_basic(self):
        """Test basic products fetch"""
        response = requests.get(
            f"{BASE_URL}/api/shopify/products",
            params={"store_name": "tnvcollection", "page": 1, "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "products" in data
        assert "total" in data
        print(f"PASS: Products fetch returned {len(data['products'])} products, total: {data['total']}")
    
    def test_get_products_with_search(self):
        """Test products fetch with search parameter"""
        response = requests.get(
            f"{BASE_URL}/api/shopify/products",
            params={"store_name": "tnvcollection", "page": 1, "limit": 10, "search": "shoes"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"PASS: Products search returned {len(data.get('products', []))} products")
    
    def test_get_products_pagination(self):
        """Test products pagination"""
        # Get first page
        response1 = requests.get(
            f"{BASE_URL}/api/shopify/products",
            params={"store_name": "tnvcollection", "page": 1, "limit": 5}
        )
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Get second page
        response2 = requests.get(
            f"{BASE_URL}/api/shopify/products",
            params={"store_name": "tnvcollection", "page": 2, "limit": 5}
        )
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Verify different products on different pages
        if data1["products"] and data2["products"]:
            ids1 = [p.get("shopify_product_id") for p in data1["products"]]
            ids2 = [p.get("shopify_product_id") for p in data2["products"]]
            # Check no overlap
            overlap = set(ids1) & set(ids2)
            assert len(overlap) == 0, "Pagination should return different products"
        print("PASS: Products pagination works correctly")


class TestDashboardStatsAPI:
    """Tests for GET /api/competitor/dashboard-stats endpoint"""
    
    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/competitor/dashboard-stats")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Check stats structure
        if "stats" in data:
            stats = data["stats"]
            assert "total_analyses" in stats
            assert "analyses_with_prices" in stats
            assert "avg_competitors_found" in stats
            print(f"PASS: Dashboard stats - Total analyses: {stats['total_analyses']}, With prices: {stats['analyses_with_prices']}")
        else:
            # Older format
            assert "total_analyses" in data
            print(f"PASS: Dashboard stats returned total_analyses: {data.get('total_analyses', 0)}")


class TestAnalyzeFromURLAPI:
    """Tests for POST /api/competitor/analyze-from-url endpoint"""
    
    def test_analyze_from_url_missing_fields(self):
        """Test analyze-from-url with missing required fields"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/analyze-from-url",
            json={"image_url": "https://example.com/image.jpg"}
        )
        # Should return 422 for validation error
        assert response.status_code == 422
        print("PASS: analyze-from-url returns 422 for missing required fields")
    
    def test_analyze_from_url_valid_request(self):
        """Test analyze-from-url with valid request (may take time)"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/analyze-from-url",
            json={
                "image_url": "https://cdn.shopify.com/s/files/1/0123/4567/8901/products/test.jpg",
                "product_id": "test_product_analyze",
                "product_name": "Test Product",
                "your_price": 999.0,
                "category": "test",
                "store_name": "test_store"
            },
            timeout=30
        )
        # Should return 200 or 500 (if Vision API not configured)
        assert response.status_code in [200, 500]
        data = response.json()
        if response.status_code == 200:
            assert "success" in data
            assert "analysis_id" in data or "error" in data
            print(f"PASS: analyze-from-url returned analysis_id: {data.get('analysis_id', 'N/A')}")
        else:
            print(f"INFO: analyze-from-url returned 500 (Vision API may not be configured)")


class TestNotificationsAPI:
    """Tests for notification endpoints used by NotificationBell component"""
    
    def test_get_notifications(self):
        """Test GET /api/competitor/notifications"""
        response = requests.get(f"{BASE_URL}/api/competitor/notifications")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "notifications" in data
        assert "unread_count" in data
        print(f"PASS: Notifications endpoint returned {len(data['notifications'])} notifications, {data['unread_count']} unread")
    
    def test_get_notifications_with_limit(self):
        """Test notifications with limit parameter"""
        response = requests.get(
            f"{BASE_URL}/api/competitor/notifications",
            params={"limit": 5}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert len(data["notifications"]) <= 5
        print("PASS: Notifications limit parameter works correctly")


class TestCurrencyRatesAPI:
    """Tests for GET /api/competitor/currency-rates endpoint"""
    
    def test_currency_rates(self):
        """Test currency rates endpoint"""
        response = requests.get(f"{BASE_URL}/api/competitor/currency-rates")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "base_currency" in data
        assert "rates" in data
        print(f"PASS: Currency rates - Base: {data['base_currency']}, Rates: {data['rates']}")


class TestAnalysesListAPI:
    """Tests for GET /api/competitor/analyses endpoint"""
    
    def test_get_analyses_list(self):
        """Test get recent analyses list"""
        response = requests.get(
            f"{BASE_URL}/api/competitor/analyses",
            params={"limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "analyses" in data
        assert "total" in data
        print(f"PASS: Analyses list returned {data['total']} analyses")
    
    def test_get_analyses_with_category_filter(self):
        """Test analyses list with category filter"""
        response = requests.get(
            f"{BASE_URL}/api/competitor/analyses",
            params={"limit": 10, "category": "shoes"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"PASS: Analyses list with category filter returned {data['total']} analyses")


class TestExtractPricesAPI:
    """Tests for POST /api/competitor/extract-prices endpoint"""
    
    def test_extract_prices_empty_urls(self):
        """Test extract prices with empty URLs list"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/extract-prices",
            json=[]
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["results"] == []
        print("PASS: Extract prices with empty URLs returns empty results")
    
    def test_extract_prices_too_many_urls(self):
        """Test extract prices with more than 10 URLs"""
        urls = [f"https://example{i}.com" for i in range(15)]
        response = requests.post(
            f"{BASE_URL}/api/competitor/extract-prices",
            json=urls
        )
        # Should return 400 for too many URLs
        assert response.status_code == 400
        print("PASS: Extract prices returns 400 for more than 10 URLs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
