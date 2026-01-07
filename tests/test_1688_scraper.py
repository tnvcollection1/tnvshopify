"""
1688 Product Scraper API Tests
Tests for:
- Batch import by product IDs
- Get scraped products list
- Job status tracking
- Delete scraped products
- URL scraping (limited due to anti-bot)
"""

import pytest
import requests
import os
import time

# Get backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://chinaconnect-1.preview.emergentagent.com')


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestScraperProductsEndpoint:
    """Tests for GET /api/1688-scraper/products endpoint"""
    
    def test_get_products_returns_list(self, api_client):
        """Test that products endpoint returns a list of scraped products"""
        response = api_client.get(f"{BASE_URL}/api/1688-scraper/products")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, "Response should indicate success"
        assert "products" in data, "Response should contain products list"
        assert "total" in data, "Response should contain total count"
        assert isinstance(data["products"], list), "Products should be a list"
        
        print(f"✅ Products endpoint returned {data['total']} products")
    
    def test_get_products_pagination(self, api_client):
        """Test products endpoint pagination"""
        response = api_client.get(f"{BASE_URL}/api/1688-scraper/products?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("page") == 1, "Page should be 1"
        assert data.get("limit") == 5, "Limit should be 5"
        assert len(data.get("products", [])) <= 5, "Should return at most 5 products"
        
        print("✅ Products pagination working correctly")
    
    def test_get_products_search(self, api_client):
        """Test products endpoint search functionality"""
        # First get all products to find a search term
        response = api_client.get(f"{BASE_URL}/api/1688-scraper/products?limit=1")
        assert response.status_code == 200
        data = response.json()
        
        if data.get("products"):
            product = data["products"][0]
            product_id = product.get("product_id", "")
            
            # Search by product ID
            search_response = api_client.get(f"{BASE_URL}/api/1688-scraper/products?search={product_id}")
            assert search_response.status_code == 200
            search_data = search_response.json()
            
            assert search_data.get("success") == True
            print(f"✅ Products search returned {search_data.get('total', 0)} results for '{product_id}'")
        else:
            print("⚠️ No products to test search with")
    
    def test_product_structure(self, api_client):
        """Test that products have expected structure"""
        response = api_client.get(f"{BASE_URL}/api/1688-scraper/products?limit=1")
        assert response.status_code == 200
        data = response.json()
        
        if data.get("products"):
            product = data["products"][0]
            
            # Verify required fields
            assert "product_id" in product, "Product should have product_id"
            assert "title" in product, "Product should have title"
            assert "url" in product, "Product should have url"
            assert "images" in product, "Product should have images"
            
            # Verify URL format
            assert "1688.com" in product["url"], "URL should be from 1688.com"
            
            print(f"✅ Product structure valid: {product.get('product_id')}")
        else:
            print("⚠️ No products to verify structure")


class TestBatchImportEndpoint:
    """Tests for POST /api/1688-scraper/batch-import endpoint"""
    
    def test_batch_import_empty_ids(self, api_client):
        """Test batch import with empty product IDs returns error"""
        response = api_client.post(
            f"{BASE_URL}/api/1688-scraper/batch-import",
            json={"product_ids": []}
        )
        assert response.status_code == 400, "Should return 400 for empty product IDs"
        print("✅ Empty product IDs returns 400 as expected")
    
    def test_batch_import_invalid_ids(self, api_client):
        """Test batch import with invalid product IDs returns error"""
        response = api_client.post(
            f"{BASE_URL}/api/1688-scraper/batch-import",
            json={"product_ids": ["abc", "123"]}  # Too short to be valid
        )
        assert response.status_code == 400, "Should return 400 for invalid product IDs"
        print("✅ Invalid product IDs returns 400 as expected")
    
    def test_batch_import_valid_id(self, api_client):
        """Test batch import with valid product ID starts job"""
        # Use a known valid product ID
        test_product_id = "775062422229"
        
        response = api_client.post(
            f"{BASE_URL}/api/1688-scraper/batch-import",
            json={
                "product_ids": [test_product_id],
                "create_in_shopify": False
            }
        )
        assert response.status_code == 200, f"Should return 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Response should indicate success"
        assert "job_id" in data, "Response should contain job_id"
        assert "product_ids" in data, "Response should contain product_ids"
        assert test_product_id in data["product_ids"], "Product ID should be in response"
        
        print(f"✅ Batch import started with job_id: {data['job_id']}")
        return data["job_id"]
    
    def test_batch_import_url_extraction(self, api_client):
        """Test batch import extracts ID from full URL"""
        test_url = "https://detail.1688.com/offer/726625539133.html"
        
        response = api_client.post(
            f"{BASE_URL}/api/1688-scraper/batch-import",
            json={
                "product_ids": [test_url],
                "create_in_shopify": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "726625539133" in data.get("product_ids", []), "Should extract ID from URL"
        
        print(f"✅ URL extraction working, job_id: {data['job_id']}")


class TestJobStatusEndpoint:
    """Tests for GET /api/1688-scraper/job/{job_id} endpoint"""
    
    def test_job_status_nonexistent(self, api_client):
        """Test job status for non-existent job returns 404"""
        response = api_client.get(f"{BASE_URL}/api/1688-scraper/job/nonexistent_job_xyz")
        assert response.status_code == 404, "Should return 404 for non-existent job"
        print("✅ Non-existent job returns 404 as expected")
    
    def test_job_status_after_import(self, api_client):
        """Test job status after starting an import"""
        # Start a batch import
        test_product_id = "775062422229"
        import_response = api_client.post(
            f"{BASE_URL}/api/1688-scraper/batch-import",
            json={
                "product_ids": [test_product_id],
                "create_in_shopify": False
            }
        )
        assert import_response.status_code == 200
        job_id = import_response.json().get("job_id")
        
        # Wait a moment for job to process
        time.sleep(2)
        
        # Check job status
        status_response = api_client.get(f"{BASE_URL}/api/1688-scraper/job/{job_id}")
        assert status_response.status_code == 200
        data = status_response.json()
        
        assert data.get("success") == True
        assert "job" in data
        
        job = data["job"]
        assert "status" in job, "Job should have status"
        assert "progress" in job, "Job should have progress"
        assert job["status"] in ["started", "processing", "completed", "failed"], f"Invalid status: {job['status']}"
        
        print(f"✅ Job status: {job['status']}, progress: {job['progress']}%")


class TestDeleteProductEndpoint:
    """Tests for DELETE /api/1688-scraper/products/{product_id} endpoint"""
    
    def test_delete_nonexistent_product(self, api_client):
        """Test deleting non-existent product returns 404"""
        response = api_client.delete(f"{BASE_URL}/api/1688-scraper/products/nonexistent_product_xyz")
        assert response.status_code == 404, "Should return 404 for non-existent product"
        print("✅ Delete non-existent product returns 404 as expected")


class TestScrapeUrlEndpoint:
    """Tests for POST /api/1688-scraper/scrape endpoint (URL scraping)"""
    
    def test_scrape_empty_url(self, api_client):
        """Test scrape with empty URL returns error"""
        response = api_client.post(
            f"{BASE_URL}/api/1688-scraper/scrape",
            json={"url": ""}
        )
        # Should return validation error
        assert response.status_code in [400, 422], f"Should return 400/422 for empty URL, got {response.status_code}"
        print("✅ Empty URL returns error as expected")
    
    def test_scrape_valid_url_starts_job(self, api_client):
        """Test scrape with valid URL starts a job"""
        response = api_client.post(
            f"{BASE_URL}/api/1688-scraper/scrape",
            json={
                "url": "https://shop1234567.1688.com",
                "max_products": 5,
                "create_in_shopify": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "job_id" in data
        
        print(f"✅ URL scrape started with job_id: {data['job_id']}")


class TestImportToShopifyEndpoint:
    """Tests for POST /api/1688-scraper/import-to-shopify/{product_id} endpoint"""
    
    def test_import_nonexistent_product(self, api_client):
        """Test importing non-existent product to Shopify returns 404"""
        response = api_client.post(
            f"{BASE_URL}/api/1688-scraper/import-to-shopify/nonexistent_xyz?store_name=test_store"
        )
        assert response.status_code == 404, "Should return 404 for non-existent product"
        print("✅ Import non-existent product returns 404 as expected")


class TestEndToEndBatchImport:
    """End-to-end test for batch import flow"""
    
    def test_full_batch_import_flow(self, api_client):
        """Test complete batch import flow: import -> check status -> verify product"""
        test_product_id = "775062422229"
        
        # Step 1: Start batch import
        import_response = api_client.post(
            f"{BASE_URL}/api/1688-scraper/batch-import",
            json={
                "product_ids": [test_product_id],
                "create_in_shopify": False
            }
        )
        assert import_response.status_code == 200
        job_id = import_response.json().get("job_id")
        print(f"Step 1: Import started, job_id: {job_id}")
        
        # Step 2: Poll job status until completed (max 30 seconds)
        max_wait = 30
        start_time = time.time()
        job_completed = False
        
        while time.time() - start_time < max_wait:
            status_response = api_client.get(f"{BASE_URL}/api/1688-scraper/job/{job_id}")
            assert status_response.status_code == 200
            job = status_response.json().get("job", {})
            
            if job.get("status") in ["completed", "failed"]:
                job_completed = True
                print(f"Step 2: Job {job['status']}, products scraped: {job.get('products_scraped', 0)}")
                break
            
            time.sleep(2)
        
        assert job_completed, "Job should complete within 30 seconds"
        
        # Step 3: Verify product exists in products list
        products_response = api_client.get(f"{BASE_URL}/api/1688-scraper/products?search={test_product_id}")
        assert products_response.status_code == 200
        products_data = products_response.json()
        
        # Find the product
        found_product = None
        for product in products_data.get("products", []):
            if product.get("product_id") == test_product_id:
                found_product = product
                break
        
        assert found_product is not None, f"Product {test_product_id} should exist after import"
        assert found_product.get("title"), "Product should have a title"
        
        print(f"Step 3: Product verified - {found_product.get('title')[:50]}...")
        print("✅ Full batch import flow completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
