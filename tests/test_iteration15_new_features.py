"""
Test Suite for Iteration 15 - New Features:
1. Chrome Extension Import Endpoint (POST /api/1688-scraper/extension-import)
2. Shopify Fulfillment Sync Service (POST /api/fulfillment-sync/sync-stage/local_shipped)
3. Pending Sync Endpoint (GET /api/fulfillment-sync/pending-sync)
4. Sync Logs Endpoint (GET /api/fulfillment-sync/sync-logs)
5. Auto-sync integration in update-stage endpoint when stage=local_shipped
"""

import pytest
import requests
import os
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopify1688sync.preview.emergentagent.com').rstrip('/')


class TestExtensionImportEndpoint:
    """Test the Chrome Extension import endpoint POST /api/1688-scraper/extension-import"""
    
    def test_extension_import_basic(self):
        """Test basic extension import with minimal product data"""
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/extension-import",
            json={
                "products": [
                    {
                        "id": "TEST_123456789012",
                        "title": "Test Product from Extension",
                        "price": "99.99",
                        "image": "https://example.com/test-image.jpg",
                        "url": "https://detail.1688.com/offer/TEST_123456789012.html",
                        "isCurrentPage": False
                    }
                ],
                "translate": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "job_id" in data
        assert data.get("message") == "Importing 1 products from extension"
        assert "TEST_123456789012" in data.get("product_ids", [])
    
    def test_extension_import_multiple_products(self):
        """Test extension import with multiple products"""
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/extension-import",
            json={
                "products": [
                    {
                        "id": "TEST_111111111111",
                        "title": "Product 1",
                        "price": "50.00",
                        "image": "https://example.com/img1.jpg",
                        "url": "https://detail.1688.com/offer/TEST_111111111111.html",
                        "isCurrentPage": False
                    },
                    {
                        "id": "TEST_222222222222",
                        "title": "Product 2",
                        "price": "75.00",
                        "image": "https://example.com/img2.jpg",
                        "url": "https://detail.1688.com/offer/TEST_222222222222.html",
                        "isCurrentPage": True
                    }
                ],
                "translate": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "job_id" in data
        assert "with translation" in data.get("message", "")
        assert len(data.get("product_ids", [])) == 2
    
    def test_extension_import_with_full_data(self):
        """Test extension import with fullData (v3 extension format)"""
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/extension-import",
            json={
                "products": [
                    {
                        "id": "TEST_333333333333",
                        "title": "Full Data Product",
                        "price": "120.00",
                        "image": "https://example.com/full.jpg",
                        "url": "https://detail.1688.com/offer/TEST_333333333333.html",
                        "isCurrentPage": True,
                        "fullData": {
                            "product_id": "TEST_333333333333",
                            "title": "Full Data Product",
                            "title_cn": "完整数据产品",
                            "price": 120.00,
                            "images": ["https://example.com/full1.jpg", "https://example.com/full2.jpg"],
                            "description": "Test description",
                            "skus": [{"sku_id": "sku1", "price": 120.00}],
                            "variants": [{"color": "Red", "size": "M"}],
                            "seller": {"name": "Test Seller"},
                            "min_order": 2,
                            "sold_count": 100
                        }
                    }
                ],
                "translate": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "job_id" in data
    
    def test_extension_import_empty_products(self):
        """Test extension import with empty products list - should fail"""
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/extension-import",
            json={
                "products": [],
                "translate": False
            }
        )
        
        # Should return 400 Bad Request
        assert response.status_code == 400
        data = response.json()
        assert "No products provided" in data.get("detail", "")


class TestShopifyFulfillmentSyncEndpoints:
    """Test the Shopify Fulfillment Sync Service endpoints"""
    
    def test_sync_stage_local_shipped(self):
        """Test POST /api/fulfillment-sync/sync-stage/local_shipped"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment-sync/sync-stage/local_shipped",
            json={"store_name": "tnvcollectionpk"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("stage") == "local_shipped"
        assert data.get("store_name") == "tnvcollectionpk"
        assert "results" in data
        
        results = data.get("results", {})
        assert "total" in results
        assert "synced" in results
        assert "failed" in results
        assert "already_synced" in results
        assert "errors" in results
    
    def test_sync_stage_invalid_stage(self):
        """Test sync-stage with invalid stage - should fail"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment-sync/sync-stage/invalid_stage",
            json={"store_name": "tnvcollectionpk"}
        )
        
        # Should return 400 Bad Request
        assert response.status_code == 400
        data = response.json()
        assert "not configured for auto-sync" in data.get("detail", "")
    
    def test_pending_sync_no_filter(self):
        """Test GET /api/fulfillment-sync/pending-sync without store filter"""
        response = requests.get(f"{BASE_URL}/api/fulfillment-sync/pending-sync")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "pending_orders" in data
        assert "count" in data
        assert isinstance(data.get("pending_orders"), list)
    
    def test_pending_sync_with_store_filter(self):
        """Test GET /api/fulfillment-sync/pending-sync with store_name filter"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment-sync/pending-sync",
            params={"store_name": "tnvcollectionpk"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "pending_orders" in data
        assert "count" in data
    
    def test_sync_logs_no_filter(self):
        """Test GET /api/fulfillment-sync/sync-logs without filters"""
        response = requests.get(f"{BASE_URL}/api/fulfillment-sync/sync-logs")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "logs" in data
        assert "count" in data
        assert isinstance(data.get("logs"), list)
    
    def test_sync_logs_with_store_filter(self):
        """Test GET /api/fulfillment-sync/sync-logs with store_name filter"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment-sync/sync-logs",
            params={"store_name": "tnvcollectionpk", "limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "logs" in data
        assert "count" in data
    
    def test_sync_single_order(self):
        """Test POST /api/fulfillment-sync/sync-order/{order_id}"""
        # Use a test order ID that doesn't exist - should return 404
        response = requests.post(
            f"{BASE_URL}/api/fulfillment-sync/sync-order/TEST_NONEXISTENT_ORDER"
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "Order not found" in data.get("detail", "")
    
    def test_auto_sync_on_stage_change_non_trigger_stage(self):
        """Test auto-sync-on-stage-change with non-trigger stage"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment-sync/auto-sync-on-stage-change",
            json={
                "order_id": "TEST_ORDER_123",
                "new_stage": "in_transit",  # Not a sync trigger stage
                "store_name": "tnvcollectionpk"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("auto_synced") == False
        assert "does not trigger auto-sync" in data.get("message", "")


class TestFulfillmentPipelineAutoSync:
    """Test the auto-sync integration in fulfillment pipeline update-stage endpoint"""
    
    def test_update_stage_to_local_shipped_triggers_sync(self):
        """Test that updating stage to local_shipped triggers Shopify sync"""
        # First, get an existing order
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"store_name": "tnvcollectionpk"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("orders") and len(data.get("orders", [])) > 0:
            order = data["orders"][0]
            order_id = order.get("order_number") or order.get("shopify_order_id")
            
            # Update stage to local_shipped
            update_response = requests.post(
                f"{BASE_URL}/api/fulfillment/pipeline/{order_id}/update-stage",
                json={
                    "stage": "local_shipped",
                    "store_name": "tnvcollectionpk",
                    "local_tracking": "TEST_TRACKING_123",
                    "local_carrier": "TCS",
                    "send_notification": False
                }
            )
            
            assert update_response.status_code == 200
            update_data = update_response.json()
            assert update_data.get("success") == True
            assert update_data.get("stage") == "local_shipped"
            # Check if shopify_synced field is present in response
            assert "shopify_synced" in update_data
        else:
            pytest.skip("No orders available for testing auto-sync")
    
    def test_update_stage_to_non_sync_stage(self):
        """Test that updating to non-sync stage doesn't trigger Shopify sync"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"store_name": "tnvcollectionpk"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("orders") and len(data.get("orders", [])) > 0:
            order = data["orders"][0]
            order_id = order.get("order_number") or order.get("shopify_order_id")
            
            # Update stage to in_transit (not a sync trigger)
            update_response = requests.post(
                f"{BASE_URL}/api/fulfillment/pipeline/{order_id}/update-stage",
                json={
                    "stage": "in_transit",
                    "store_name": "tnvcollectionpk",
                    "send_notification": False
                }
            )
            
            assert update_response.status_code == 200
            update_data = update_response.json()
            assert update_data.get("success") == True
            assert update_data.get("stage") == "in_transit"
            # shopify_synced should be False for non-sync stages
            assert update_data.get("shopify_synced", False) == False
        else:
            pytest.skip("No orders available for testing")


class TestSyncToShopifyButton:
    """Test the Sync to Shopify button functionality (calls sync-stage/local_shipped)"""
    
    def test_sync_to_shopify_for_tnvcollectionpk(self):
        """Test Sync to Shopify for tnvcollectionpk store"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment-sync/sync-stage/local_shipped",
            json={"store_name": "tnvcollectionpk"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("store_name") == "tnvcollectionpk"
    
    def test_sync_to_shopify_for_tnvcollection(self):
        """Test Sync to Shopify for tnvcollection store"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment-sync/sync-stage/local_shipped",
            json={"store_name": "tnvcollection"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("store_name") == "tnvcollection"


class TestShopifyFulfillmentSyncService:
    """Test the shopify_fulfillment_sync.py service functions via API"""
    
    def test_store_carriers_config(self):
        """Verify store carrier configuration is correct"""
        # Get carriers config
        response = requests.get(f"{BASE_URL}/api/fulfillment/carriers")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        carriers = data.get("carriers", {})
        # Verify tnvcollectionpk uses TCS (Pakistan)
        assert carriers.get("tnvcollectionpk", {}).get("carrier") == "TCS"
        assert carriers.get("tnvcollectionpk", {}).get("country") == "Pakistan"
        
        # Verify tnvcollection uses DTDC (India)
        assert carriers.get("tnvcollection", {}).get("carrier") == "DTDC"
        assert carriers.get("tnvcollection", {}).get("country") == "India"
    
    def test_fulfillment_stages_config(self):
        """Verify fulfillment stages are correctly configured"""
        response = requests.get(f"{BASE_URL}/api/fulfillment/carriers")
        
        assert response.status_code == 200
        data = response.json()
        
        stages = data.get("stages", [])
        expected_stages = [
            'shopify_order',
            '1688_ordered',
            'dwz56_shipped',
            'in_transit',
            'warehouse_arrived',
            'warehouse_received',
            'local_shipped',
        ]
        
        assert stages == expected_stages


class TestJobStatusEndpoint:
    """Test the job status endpoint for extension import"""
    
    def test_get_job_status_not_found(self):
        """Test getting status of non-existent job"""
        response = requests.get(f"{BASE_URL}/api/1688-scraper/job/nonexistent123")
        
        assert response.status_code == 404
        data = response.json()
        assert "Job not found" in data.get("detail", "")
    
    def test_get_job_status_after_import(self):
        """Test getting job status after starting an import"""
        # Start an import
        import_response = requests.post(
            f"{BASE_URL}/api/1688-scraper/extension-import",
            json={
                "products": [
                    {
                        "id": "TEST_JOB_STATUS_TEST",
                        "title": "Job Status Test Product",
                        "price": "50.00",
                        "image": "https://example.com/job-test.jpg",
                        "url": "https://detail.1688.com/offer/TEST_JOB_STATUS_TEST.html",
                        "isCurrentPage": False
                    }
                ],
                "translate": False
            }
        )
        
        assert import_response.status_code == 200
        import_data = import_response.json()
        job_id = import_data.get("job_id")
        
        # Get job status
        import time
        time.sleep(1)  # Wait a bit for job to process
        
        status_response = requests.get(f"{BASE_URL}/api/1688-scraper/job/{job_id}")
        
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data.get("success") == True
        assert "job" in status_data
        
        job = status_data.get("job", {})
        assert "status" in job
        assert "progress" in job
        assert "total" in job


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
