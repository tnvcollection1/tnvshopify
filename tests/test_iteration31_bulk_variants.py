"""
Test Suite for Iteration 31 - Bulk Variant Creation Feature
Tests the bulk variant preview, creation, and status APIs.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestBulkVariantPreviewAPI:
    """Tests for POST /api/shopify/products/bulk-variants/preview"""
    
    def test_preview_with_store_filter(self):
        """Test preview scan with store_name filter"""
        response = requests.post(
            f"{BASE_URL}/api/shopify/products/bulk-variants/preview",
            json={"store_name": "tnvcollectionpk", "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("success") is True
        assert "summary" in data
        assert "products" in data
        assert "note" in data
        
        # Verify summary structure
        summary = data["summary"]
        assert "products_scanned" in summary
        assert "products_with_missing" in summary
        assert "total_missing_variants" in summary
        assert "errors_count" in summary
        
        # Verify it's a dry-run
        assert "DRY-RUN" in data.get("note", "")
    
    def test_preview_without_store_filter(self):
        """Test preview scan without store filter (all stores)"""
        response = requests.post(
            f"{BASE_URL}/api/shopify/products/bulk-variants/preview",
            json={"limit": 5}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") is True
        assert "summary" in data
    
    def test_preview_with_limit(self):
        """Test preview respects limit parameter"""
        response = requests.post(
            f"{BASE_URL}/api/shopify/products/bulk-variants/preview",
            json={"limit": 3}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") is True
        # Products scanned should be <= limit
        assert data["summary"]["products_scanned"] <= 3
    
    def test_preview_product_structure(self):
        """Test that products in preview have correct structure"""
        response = requests.post(
            f"{BASE_URL}/api/shopify/products/bulk-variants/preview",
            json={"store_name": "tnvcollectionpk", "limit": 5}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["products"]:
            product = data["products"][0]
            # Verify product structure
            assert "shopify_product_id" in product
            assert "title" in product
            assert "store_name" in product
            assert "linked_1688_id" in product
            assert "shopify_variant_count" in product
            assert "variants_1688_count" in product
            assert "missing_count" in product
            assert "missing_variants" in product
            
            # Verify missing variants structure
            if product["missing_variants"]:
                variant = product["missing_variants"][0]
                assert "color" in variant
                assert "size" in variant


class TestBulkVariantCreationAPI:
    """Tests for POST /api/shopify/products/bulk-variants/create"""
    
    def test_create_returns_job_id(self):
        """Test that bulk creation returns a job_id"""
        response = requests.post(
            f"{BASE_URL}/api/shopify/products/bulk-variants/create",
            json={"store_name": "tnvcollectionpk", "limit": 1}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") is True
        assert "job_id" in data
        assert "status_url" in data
        assert len(data["job_id"]) == 8  # UUID first 8 chars
    
    def test_create_with_product_ids(self):
        """Test bulk creation with specific product IDs"""
        response = requests.post(
            f"{BASE_URL}/api/shopify/products/bulk-variants/create",
            json={
                "store_name": "tnvcollectionpk",
                "product_ids": ["7506808635415"],
                "limit": 1
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") is True
        assert "job_id" in data


class TestBulkVariantStatusAPI:
    """Tests for GET /api/shopify/products/bulk-variants/status/{job_id}"""
    
    def test_status_for_existing_job(self):
        """Test status endpoint for an existing job"""
        # First create a job
        create_response = requests.post(
            f"{BASE_URL}/api/shopify/products/bulk-variants/create",
            json={"store_name": "tnvcollectionpk", "limit": 1}
        )
        job_id = create_response.json().get("job_id")
        
        # Wait a bit for job to process
        time.sleep(2)
        
        # Check status
        response = requests.get(
            f"{BASE_URL}/api/shopify/products/bulk-variants/status/{job_id}"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") is True
        assert data.get("job_id") == job_id
        assert "status" in data
        assert data["status"] in ["running", "completed", "failed"]
        assert "progress" in data
        assert "logs" in data
        
        # Verify progress structure
        progress = data["progress"]
        assert "products_processed" in progress
        assert "products_total" in progress
        assert "variants_created" in progress
        assert "variants_failed" in progress
    
    def test_status_for_nonexistent_job(self):
        """Test status endpoint returns 404 for non-existent job"""
        response = requests.get(
            f"{BASE_URL}/api/shopify/products/bulk-variants/status/nonexistent123"
        )
        assert response.status_code == 404
        data = response.json()
        assert "Job not found" in data.get("detail", "")


class TestBulkVariantJobsListAPI:
    """Tests for GET /api/shopify/products/bulk-variants/jobs"""
    
    def test_list_jobs(self):
        """Test listing all bulk creation jobs"""
        response = requests.get(
            f"{BASE_URL}/api/shopify/products/bulk-variants/jobs"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") is True
        assert "jobs" in data
        assert isinstance(data["jobs"], list)
        
        # If there are jobs, verify structure
        if data["jobs"]:
            job = data["jobs"][0]
            assert "job_id" in job
            assert "status" in job
            assert "started_at" in job
            assert "progress" in job


class TestBulkVariantIntegration:
    """Integration tests for the full bulk variant workflow"""
    
    def test_full_workflow_preview_to_status(self):
        """Test the full workflow: preview -> create -> check status"""
        # Step 1: Run preview
        preview_response = requests.post(
            f"{BASE_URL}/api/shopify/products/bulk-variants/preview",
            json={"store_name": "tnvcollectionpk", "limit": 5}
        )
        assert preview_response.status_code == 200
        preview_data = preview_response.json()
        assert preview_data.get("success") is True
        
        # Step 2: Start creation (with limit 1 to avoid long running)
        create_response = requests.post(
            f"{BASE_URL}/api/shopify/products/bulk-variants/create",
            json={"store_name": "tnvcollectionpk", "limit": 1}
        )
        assert create_response.status_code == 200
        create_data = create_response.json()
        assert create_data.get("success") is True
        job_id = create_data.get("job_id")
        
        # Step 3: Poll status until completed (max 30 seconds)
        max_attempts = 15
        for _ in range(max_attempts):
            status_response = requests.get(
                f"{BASE_URL}/api/shopify/products/bulk-variants/status/{job_id}"
            )
            assert status_response.status_code == 200
            status_data = status_response.json()
            
            if status_data.get("status") in ["completed", "failed"]:
                break
            time.sleep(2)
        
        # Verify final status
        assert status_data.get("status") in ["completed", "failed"]
        assert "logs" in status_data
        assert len(status_data["logs"]) > 0  # Should have at least some logs


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
