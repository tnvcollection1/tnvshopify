"""
Test suite for 1688 Image Search API
Tests the image search feature that allows users to search for products by image URL
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test image URL from alicdn.com
TEST_IMAGE_URL = "https://cbu01.alicdn.com/img/ibank/O1CN01uLe8MH2FQLh5yMerK_!!3067528874-0-cib.jpg"


class TestImageSearchAPI:
    """Tests for POST /api/1688-scraper/image-search endpoint"""
    
    def test_image_search_returns_success(self):
        """Test that image search returns success with valid alicdn image"""
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/image-search",
            json={
                "image_url": TEST_IMAGE_URL,
                "page": 1,
                "page_size": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "products" in data
        assert "total" in data
        
    def test_image_search_returns_products_with_required_fields(self):
        """Test that products have all required fields: product_id, title, price, image, shop_name"""
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/image-search",
            json={
                "image_url": TEST_IMAGE_URL,
                "page": 1,
                "page_size": 5
            }
        )
        data = response.json()
        assert data["success"] == True
        assert len(data["products"]) > 0
        
        # Check first product has all required fields
        product = data["products"][0]
        assert "product_id" in product and product["product_id"]
        assert "title" in product and product["title"]
        assert "price" in product
        assert "image" in product
        assert "shop_name" in product
        
    def test_image_search_returns_factory_badge(self):
        """Test that products include is_factory field for Factory badge display"""
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/image-search",
            json={
                "image_url": TEST_IMAGE_URL,
                "page": 1,
                "page_size": 10
            }
        )
        data = response.json()
        assert data["success"] == True
        
        # Check that is_factory field exists
        for product in data["products"]:
            assert "is_factory" in product
            assert isinstance(product["is_factory"], bool)
            
    def test_image_search_pagination_page_1(self):
        """Test pagination - page 1"""
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/image-search",
            json={
                "image_url": TEST_IMAGE_URL,
                "page": 1,
                "page_size": 5
            }
        )
        data = response.json()
        assert data["success"] == True
        assert data["page"] == 1
        assert len(data["products"]) == 5
        
    def test_image_search_pagination_page_2(self):
        """Test pagination - page 2 returns different products"""
        # Get page 1
        response1 = requests.post(
            f"{BASE_URL}/api/1688-scraper/image-search",
            json={
                "image_url": TEST_IMAGE_URL,
                "page": 1,
                "page_size": 5
            }
        )
        data1 = response1.json()
        
        # Get page 2
        response2 = requests.post(
            f"{BASE_URL}/api/1688-scraper/image-search",
            json={
                "image_url": TEST_IMAGE_URL,
                "page": 2,
                "page_size": 5
            }
        )
        data2 = response2.json()
        
        assert data1["success"] == True
        assert data2["success"] == True
        assert data2["page"] == 2
        
        # Products should be different
        page1_ids = [p["product_id"] for p in data1["products"]]
        page2_ids = [p["product_id"] for p in data2["products"]]
        assert page1_ids != page2_ids, "Page 2 should have different products than page 1"
        
    def test_image_search_total_count(self):
        """Test that total count is returned correctly"""
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/image-search",
            json={
                "image_url": TEST_IMAGE_URL,
                "page": 1,
                "page_size": 5
            }
        )
        data = response.json()
        assert data["success"] == True
        assert data["total"] > 0
        assert isinstance(data["total"], int)
        
    def test_image_search_product_url_format(self):
        """Test that product URLs are valid 1688 URLs"""
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/image-search",
            json={
                "image_url": TEST_IMAGE_URL,
                "page": 1,
                "page_size": 5
            }
        )
        data = response.json()
        assert data["success"] == True
        
        for product in data["products"]:
            assert "url" in product
            assert "1688.com" in product["url"]
            
    def test_image_search_with_sort_sales(self):
        """Test sorting by sales"""
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/image-search",
            json={
                "image_url": TEST_IMAGE_URL,
                "page": 1,
                "page_size": 5,
                "sort": "sales"
            }
        )
        data = response.json()
        assert data["success"] == True
        assert len(data["products"]) > 0


class TestBatchImportFromImageSearch:
    """Tests for importing products found via image search"""
    
    def test_batch_import_endpoint_exists(self):
        """Test that batch import endpoint accepts requests"""
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/batch-import",
            json={
                "product_ids": ["845374511040"],
                "translate": True
            }
        )
        assert response.status_code == 200
        
    def test_batch_import_returns_job_id(self):
        """Test that batch import returns a job_id for tracking"""
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/batch-import",
            json={
                "product_ids": ["845374511040"],
                "translate": True
            }
        )
        data = response.json()
        assert data["success"] == True
        assert "job_id" in data
        assert len(data["job_id"]) > 0
        
    def test_batch_import_with_image_search_product(self):
        """Test importing a product found via image search"""
        # First, get a product from image search
        search_response = requests.post(
            f"{BASE_URL}/api/1688-scraper/image-search",
            json={
                "image_url": TEST_IMAGE_URL,
                "page": 1,
                "page_size": 1
            }
        )
        search_data = search_response.json()
        assert search_data["success"] == True
        
        product_id = search_data["products"][0]["product_id"]
        
        # Now import that product
        import_response = requests.post(
            f"{BASE_URL}/api/1688-scraper/batch-import",
            json={
                "product_ids": [product_id],
                "translate": True
            }
        )
        import_data = import_response.json()
        assert import_data["success"] == True
        assert "job_id" in import_data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
