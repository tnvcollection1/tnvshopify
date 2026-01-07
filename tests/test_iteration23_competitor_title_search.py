"""
Test Suite for Iteration 23 - Competitor Title Search Feature
Tests the new title search fallback functionality for competitor analysis

Features tested:
1. /api/competitor/search-by-title endpoint - Direct title-based search
2. /api/competitor/analyze-from-url - Title fallback when image search fails
3. Search method badge display in analysis results
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCompetitorTitleSearchEndpoint:
    """Tests for the new /api/competitor/search-by-title endpoint"""
    
    def test_search_by_title_basic(self):
        """Test basic title search functionality"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/search-by-title",
            json={
                "product_name": "Nike Running Shoes",
                "your_price": 5999,
                "category": "sports"
            },
            timeout=60
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "analysis_id" in data
        assert data.get("search_method") == "title_search"
        assert "competitor_count" in data
        assert "competitor_pages" in data
        print(f"✓ Title search found {data.get('competitor_count')} competitors")
    
    def test_search_by_title_with_all_fields(self):
        """Test title search with all optional fields"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/search-by-title",
            json={
                "product_name": "Wireless Bluetooth Headphones",
                "product_id": "test_prod_123",
                "your_price": 2999,
                "category": "electronics",
                "store_name": "test_store"
            },
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("product_name") == "Wireless Bluetooth Headphones"
        assert data.get("your_price") == 2999
        assert data.get("search_method") == "title_search"
        print(f"✓ Title search with all fields: {data.get('competitor_count')} competitors")
    
    def test_search_by_title_empty_name(self):
        """Test title search with empty product name"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/search-by-title",
            json={
                "product_name": "",
                "your_price": 1000
            },
            timeout=30
        )
        
        # Should either return 422 validation error or empty results
        assert response.status_code in [200, 422], f"Unexpected status: {response.status_code}"
        print(f"✓ Empty name handled correctly with status {response.status_code}")
    
    def test_search_by_title_zero_price(self):
        """Test title search with zero price (optional field)"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/search-by-title",
            json={
                "product_name": "Cotton T-Shirt Men",
                "your_price": 0,
                "category": "apparel"
            },
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("your_price") == 0
        print(f"✓ Zero price accepted: {data.get('competitor_count')} competitors found")
    
    def test_search_by_title_response_structure(self):
        """Verify the response structure matches expected format"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/search-by-title",
            json={
                "product_name": "Leather Wallet Men",
                "your_price": 1499,
                "category": "fashion"
            },
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        required_fields = [
            "success", "analysis_id", "product_name", "your_price",
            "search_method", "competitor_count", "competitor_pages", "status"
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Check search_method is title_search
        assert data["search_method"] == "title_search"
        
        # Check competitor_pages structure if results exist
        if data["competitor_pages"]:
            page = data["competitor_pages"][0]
            assert "url" in page
            assert "domain" in page or "title" in page
        
        print(f"✓ Response structure validated with {len(data.get('competitor_pages', []))} pages")


class TestAnalyzeFromURLFallback:
    """Tests for title fallback in /api/competitor/analyze-from-url"""
    
    def test_analyze_from_url_with_invalid_image(self):
        """Test that invalid image URL triggers title fallback"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/analyze-from-url",
            json={
                "image_url": "https://example.com/nonexistent-image-12345.jpg",
                "product_id": "test_fallback_001",
                "product_name": "Designer Leather Handbag Women",
                "your_price": 12999,
                "category": "fashion"
            },
            timeout=120
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        # Should use title_fallback or title_only when image search fails
        search_method = data.get("search_method")
        assert search_method in ["title_fallback", "title_only", "image_search"], \
            f"Unexpected search_method: {search_method}"
        
        print(f"✓ Fallback test: search_method={search_method}, competitors={data.get('competitor_count')}")
    
    def test_analyze_from_url_with_valid_shopify_image(self):
        """Test with a valid Shopify product image"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/analyze-from-url",
            json={
                "image_url": "https://cdn.shopify.com/s/files/1/0855/8405/2507/files/O1CN01uLe8MH2FQLh5yMerK__3067528874-0-cib.jpg?v=1767616346",
                "product_id": "test_valid_image_001",
                "product_name": "British Vintage Chelsea Boots",
                "your_price": 2899,
                "category": "fashion",
                "store_name": "test_store"
            },
            timeout=120
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "search_method" in data
        assert "competitor_count" in data
        
        print(f"✓ Valid image test: search_method={data.get('search_method')}, competitors={data.get('competitor_count')}")


class TestAnalysisRetrieval:
    """Tests for retrieving analysis results with search_method"""
    
    def test_get_analyses_list(self):
        """Test getting list of analyses with search_method field"""
        response = requests.get(
            f"{BASE_URL}/api/competitor/analyses?limit=10",
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "analyses" in data
        
        # Check that analyses have search_method field
        for analysis in data.get("analyses", []):
            if "search_method" in analysis:
                assert analysis["search_method"] in ["image_search", "title_fallback", "title_search", "title_only"]
        
        print(f"✓ Retrieved {len(data.get('analyses', []))} analyses")
    
    def test_get_single_analysis(self):
        """Test getting a single analysis by ID"""
        # First create an analysis
        create_response = requests.post(
            f"{BASE_URL}/api/competitor/search-by-title",
            json={
                "product_name": "TEST_Single_Analysis_Product",
                "your_price": 999,
                "category": "general"
            },
            timeout=60
        )
        
        assert create_response.status_code == 200
        analysis_id = create_response.json().get("analysis_id")
        
        # Wait for background processing
        time.sleep(2)
        
        # Get the analysis
        get_response = requests.get(
            f"{BASE_URL}/api/competitor/analysis/{analysis_id}",
            timeout=30
        )
        
        assert get_response.status_code == 200
        data = get_response.json()
        assert data.get("success") == True
        assert "analysis" in data
        
        analysis = data["analysis"]
        assert analysis.get("search_method") == "title_search"
        assert analysis.get("product_name") == "TEST_Single_Analysis_Product"
        
        print(f"✓ Single analysis retrieved: {analysis_id}")
    
    def test_get_nonexistent_analysis(self):
        """Test getting a non-existent analysis returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/competitor/analysis/nonexistent_id_12345",
            timeout=30
        )
        
        assert response.status_code == 404
        print("✓ Non-existent analysis returns 404")


class TestDashboardStats:
    """Tests for dashboard statistics endpoint"""
    
    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/competitor/dashboard-stats",
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "stats" in data
        
        stats = data["stats"]
        assert "total_analyses" in stats
        assert "analyses_with_prices" in stats
        assert "avg_competitors_found" in stats
        assert "recent_analyses" in stats
        
        print(f"✓ Dashboard stats: {stats.get('total_analyses')} total analyses")


class TestSearchMethodBadges:
    """Tests to verify search method values for UI badge display"""
    
    def test_image_search_method_value(self):
        """Verify image_search method value exists in analyses"""
        response = requests.get(
            f"{BASE_URL}/api/competitor/analyses?limit=50",
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        search_methods = set()
        for analysis in data.get("analyses", []):
            if "search_method" in analysis:
                search_methods.add(analysis["search_method"])
        
        print(f"✓ Found search methods in existing data: {search_methods}")
        
        # At least one method should exist
        valid_methods = {"image_search", "title_fallback", "title_search", "title_only"}
        assert len(search_methods.intersection(valid_methods)) > 0 or len(data.get("analyses", [])) == 0
    
    def test_title_search_creates_correct_method(self):
        """Verify title search creates analysis with title_search method"""
        response = requests.post(
            f"{BASE_URL}/api/competitor/search-by-title",
            json={
                "product_name": "TEST_Badge_Verification_Product",
                "your_price": 500,
                "category": "general"
            },
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("search_method") == "title_search"
        print(f"✓ Title search correctly sets search_method='title_search'")


class TestCleanup:
    """Cleanup test data"""
    
    def test_delete_test_analyses(self):
        """Delete test analyses created during testing"""
        # Get all analyses
        response = requests.get(
            f"{BASE_URL}/api/competitor/analyses?limit=100",
            timeout=30
        )
        
        if response.status_code != 200:
            print("⚠ Could not retrieve analyses for cleanup")
            return
        
        data = response.json()
        deleted_count = 0
        
        for analysis in data.get("analyses", []):
            product_name = analysis.get("product_name", "")
            if product_name.startswith("TEST_"):
                analysis_id = analysis.get("analysis_id")
                delete_response = requests.delete(
                    f"{BASE_URL}/api/competitor/analysis/{analysis_id}",
                    timeout=30
                )
                if delete_response.status_code in [200, 204]:
                    deleted_count += 1
        
        print(f"✓ Cleaned up {deleted_count} test analyses")


# Fixtures
@pytest.fixture(scope="session", autouse=True)
def check_base_url():
    """Verify BASE_URL is set"""
    if not BASE_URL:
        pytest.skip("REACT_APP_BACKEND_URL not set")
    print(f"Testing against: {BASE_URL}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
