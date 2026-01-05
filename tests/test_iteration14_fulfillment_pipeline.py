"""
Test Suite for Iteration 14 - Fulfillment Pipeline Feature
Tests the new Fulfillment Pipeline page with:
1. Pipeline page loads correctly
2. Store dropdown functionality
3. Sync Shopify button
4. Export CSV functionality
5. Analytics endpoint
6. Pipeline stage filtering
7. Order search functionality
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFulfillmentPipelineAPIs:
    """Test Fulfillment Pipeline backend APIs"""
    
    def test_stores_endpoint(self):
        """Test GET /api/stores returns list of stores"""
        response = requests.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200
        
        data = response.json()
        # API returns array directly
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check store structure
        store = data[0]
        assert "store_name" in store
        print(f"SUCCESS: Found {len(data)} stores")
    
    def test_pipeline_get_orders(self):
        """Test GET /api/fulfillment/pipeline returns orders for a store"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"store_name": "tnvcollectionpk"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "orders" in data
        # API returns status_counts (from routes/fulfillment.py) or stats (from services/fulfillment_pipeline_service.py)
        assert "status_counts" in data or "stats" in data
        
        print(f"SUCCESS: Pipeline returned {len(data['orders'])} orders")
    
    def test_pipeline_stats(self):
        """Test GET /api/fulfillment/pipeline/stats returns stage statistics"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/stats",
            params={"store_name": "tnvcollectionpk"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "stats" in data
        assert "total" in data
        
        # Check stats structure has all stages
        stats = data["stats"]
        expected_stages = [
            "shopify_order", "1688_ordered", "dwz56_shipped",
            "in_transit", "warehouse_arrived", "warehouse_received", "local_shipped"
        ]
        for stage in expected_stages:
            assert stage in stats, f"Missing stage: {stage}"
        
        print(f"SUCCESS: Pipeline stats returned with total={data['total']}")
    
    def test_pipeline_analytics(self):
        """Test GET /api/fulfillment/pipeline/analytics returns analytics data"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/analytics",
            params={"store_name": "tnvcollectionpk", "days": 30}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "total_orders" in data
        assert "completed_orders" in data
        assert "stuck_orders" in data
        assert "completion_rate" in data
        assert "stage_distribution" in data
        
        print(f"SUCCESS: Analytics returned - Total: {data['total_orders']}, Completed: {data['completed_orders']}")
    
    def test_pipeline_export_csv(self):
        """Test GET /api/fulfillment/pipeline/export?format=csv returns CSV data"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/export",
            params={"store_name": "tnvcollectionpk", "format": "csv"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("format") == "csv"
        assert "data" in data
        assert "count" in data
        
        # Check CSV has headers
        csv_data = data["data"]
        assert "order_number" in csv_data
        assert "shopify_order_id" in csv_data
        assert "current_stage" in csv_data
        
        print(f"SUCCESS: CSV export returned {data['count']} orders")
    
    def test_pipeline_export_json(self):
        """Test GET /api/fulfillment/pipeline/export?format=json returns JSON data"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/export",
            params={"store_name": "tnvcollectionpk", "format": "json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("format") == "json"
        assert "orders" in data
        assert "count" in data
        
        print(f"SUCCESS: JSON export returned {data['count']} orders")
    
    def test_sync_from_shopify(self):
        """Test POST /api/fulfillment/pipeline/sync-from-shopify syncs orders"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/sync-from-shopify",
            json={"store_name": "tnvcollectionpk"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "synced_count" in data
        assert "message" in data
        
        print(f"SUCCESS: Sync returned - synced_count={data['synced_count']}")
    
    def test_carriers_endpoint(self):
        """Test GET /api/fulfillment/carriers returns carrier configuration"""
        response = requests.get(f"{BASE_URL}/api/fulfillment/carriers")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "carriers" in data
        assert "stages" in data
        
        # Check carrier config
        carriers = data["carriers"]
        assert "tnvcollectionpk" in carriers
        assert carriers["tnvcollectionpk"]["carrier"] == "TCS"
        
        print(f"SUCCESS: Carriers endpoint returned {len(carriers)} store configs")
    
    def test_pipeline_filter_by_stage(self):
        """Test GET /api/fulfillment/pipeline with stage filter"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"store_name": "tnvcollectionpk", "stage": "shopify_order"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        
        # All orders should be in shopify_order stage
        for order in data.get("orders", []):
            assert order.get("current_stage") == "shopify_order"
        
        print(f"SUCCESS: Stage filter returned {len(data.get('orders', []))} orders")


class TestFulfillmentPipelineOrderOperations:
    """Test order-specific operations in the pipeline"""
    
    def test_get_order_details(self):
        """Test GET /api/fulfillment/pipeline/{order_id} returns order details"""
        # Use a known order that exists (string order_number)
        order_id = "29489"  # Known order from tnvcollection store
        
        # Get order details
        detail_response = requests.get(f"{BASE_URL}/api/fulfillment/pipeline/{order_id}")
        assert detail_response.status_code == 200
        
        detail_data = detail_response.json()
        assert detail_data.get("success") == True
        assert "order" in detail_data
        assert "stages" in detail_data
        
        print(f"SUCCESS: Order details returned for order {order_id}")
    
    def test_update_order_stage(self):
        """Test POST /api/fulfillment/pipeline/{order_id}/update-stage updates stage"""
        # Use a known order
        order_id = "29489"
        
        # Update to same stage for non-destructive test
        update_response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/{order_id}/update-stage",
            json={
                "stage": "shopify_order",  # Keep same stage for non-destructive test
                "store_name": "tnvcollection",
                "send_notification": False
            }
        )
        assert update_response.status_code == 200
        
        update_data = update_response.json()
        assert update_data.get("success") == True
        assert "stage" in update_data
        
        print(f"SUCCESS: Order stage update returned for order {order_id}")


class TestImageSearchService:
    """Test image search service for 1688 product linking"""
    
    def test_image_search_endpoint_exists(self):
        """Test that image search endpoint exists (may fail without valid image)"""
        # Use a known order
        order_id = "29489"
        
        # Test image search endpoint (will likely fail without valid TMAPI token)
        search_response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/{order_id}/link-product-by-image",
            json={"image_url": "https://example.com/test.jpg"}
        )
        
        # Should return 200 even if search fails (with error message)
        assert search_response.status_code == 200
        
        search_data = search_response.json()
        # Either success with products or error message
        assert "success" in search_data or "error" in search_data
        
        print(f"SUCCESS: Image search endpoint responded for order {order_id}")


class TestWhatsAppNotifications:
    """Test WhatsApp notification endpoints"""
    
    def test_notify_whatsapp_endpoint(self):
        """Test POST /api/fulfillment/pipeline/{order_id}/notify-whatsapp"""
        # Use a known order
        order_id = "29489"
        
        # Test notification endpoint
        notify_response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/{order_id}/notify-whatsapp",
            json={"stage": "shopify_order"}
        )
        
        # Should return 200 (may fail to send if no phone number)
        assert notify_response.status_code == 200
        
        notify_data = notify_response.json()
        assert "success" in notify_data or "message" in notify_data
        
        print(f"SUCCESS: WhatsApp notification endpoint responded for order {order_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
