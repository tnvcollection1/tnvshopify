"""
Iteration 17 Test Suite - DWZ Sync, Order History Timeline, and Batch Notifications

Features tested:
1. DWZ Sync API - POST /api/dwz56-sync/sync
2. Order History Timeline API - GET /api/dwz56-sync/order-history/{order_id}
3. Batch Notify by Stage API - POST /api/fulfillment/pipeline/notify-by-stage
4. DWZ Sync Logs API - GET /api/dwz56-sync/sync-logs
5. Log Order Event API - POST /api/dwz56-sync/log-event
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://multi-tenant-7.preview.emergentagent.com')

class TestDWZSyncAPI:
    """Test DWZ56 Auto-Sync Service APIs"""
    
    def test_dwz_sync_endpoint_exists(self):
        """Test that DWZ sync endpoint is accessible"""
        response = requests.post(
            f"{BASE_URL}/api/dwz56-sync/sync",
            json={"store_name": "tnvcollectionpk", "days_back": 30}
        )
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        
    def test_dwz_sync_returns_expected_fields(self):
        """Test DWZ sync returns all expected response fields"""
        response = requests.post(
            f"{BASE_URL}/api/dwz56-sync/sync",
            json={"store_name": "tnvcollectionpk", "days_back": 30}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields are present
        expected_fields = ["success", "synced_at", "total_fetched", "matched", "updated", "stage_changes", "errors"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
            
    def test_dwz_sync_with_different_days_back(self):
        """Test DWZ sync with different days_back values"""
        for days in [7, 14, 30, 60]:
            response = requests.post(
                f"{BASE_URL}/api/dwz56-sync/sync",
                json={"store_name": "tnvcollectionpk", "days_back": days}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            
    def test_dwz_sync_without_store_name(self):
        """Test DWZ sync without store_name (should still work)"""
        response = requests.post(
            f"{BASE_URL}/api/dwz56-sync/sync",
            json={"days_back": 30}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


class TestOrderHistoryTimeline:
    """Test Order History Timeline API"""
    
    def test_order_history_for_existing_order(self):
        """Test order history for test order 99001"""
        response = requests.get(f"{BASE_URL}/api/dwz56-sync/order-history/99001")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert data["order_id"] == "99001"
        assert "timeline" in data
        assert "current_state" in data
        assert "event_count" in data
        
    def test_order_history_timeline_structure(self):
        """Test that timeline events have correct structure"""
        response = requests.get(f"{BASE_URL}/api/dwz56-sync/order-history/99001")
        assert response.status_code == 200
        data = response.json()
        
        if data["timeline"]:
            event = data["timeline"][0]
            assert "event" in event
            assert "label" in event
            assert "timestamp" in event
            assert "icon" in event
            
    def test_order_history_current_state(self):
        """Test that current_state contains expected fields"""
        response = requests.get(f"{BASE_URL}/api/dwz56-sync/order-history/99001")
        assert response.status_code == 200
        data = response.json()
        
        if data["current_state"]:
            state = data["current_state"]
            assert "stage" in state
            assert "dwz_tracking" in state
            assert "local_tracking" in state
            assert "customer" in state
            
    def test_order_history_for_nonexistent_order(self):
        """Test order history for non-existent order returns empty timeline"""
        response = requests.get(f"{BASE_URL}/api/dwz56-sync/order-history/NONEXISTENT999")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        # Should return empty timeline for non-existent order
        assert data["timeline"] == [] or data["current_state"] is None
        
    def test_order_history_event_count_matches_timeline(self):
        """Test that event_count matches timeline length"""
        response = requests.get(f"{BASE_URL}/api/dwz56-sync/order-history/99001")
        assert response.status_code == 200
        data = response.json()
        
        assert data["event_count"] == len(data["timeline"])


class TestBatchNotifyByStage:
    """Test Batch WhatsApp Notifications by Stage API"""
    
    def test_batch_notify_endpoint_exists(self):
        """Test that batch notify endpoint is accessible"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/notify-by-stage",
            json={"store_name": "tnvcollectionpk", "stage": "shopify_order"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        
    def test_batch_notify_returns_expected_fields(self):
        """Test batch notify returns all expected response fields"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/notify-by-stage",
            json={"store_name": "tnvcollectionpk", "stage": "dwz56_shipped"}
        )
        assert response.status_code == 200
        data = response.json()
        
        expected_fields = ["success", "stage", "total_orders", "notifications_sent", 
                          "notifications_failed", "skipped_no_phone", "details"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
            
    def test_batch_notify_all_stages(self):
        """Test batch notify for all fulfillment stages"""
        stages = ["shopify_order", "1688_ordered", "dwz56_shipped", "in_transit", 
                  "warehouse_arrived", "warehouse_received", "local_shipped"]
        
        for stage in stages:
            response = requests.post(
                f"{BASE_URL}/api/fulfillment/pipeline/notify-by-stage",
                json={"store_name": "tnvcollectionpk", "stage": stage}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert data["stage"] == stage
            
    def test_batch_notify_with_notification_type(self):
        """Test batch notify with custom notification_type"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/notify-by-stage",
            json={
                "store_name": "tnvcollectionpk", 
                "stage": "in_transit",
                "notification_type": "custom_update"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


class TestDWZSyncLogs:
    """Test DWZ Sync Logs API"""
    
    def test_get_sync_logs(self):
        """Test getting DWZ sync logs"""
        response = requests.get(f"{BASE_URL}/api/dwz56-sync/sync-logs")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "logs" in data
        assert "count" in data
        
    def test_get_sync_logs_with_limit(self):
        """Test getting sync logs with custom limit"""
        response = requests.get(f"{BASE_URL}/api/dwz56-sync/sync-logs?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert len(data["logs"]) <= 5


class TestLogOrderEvent:
    """Test Log Order Event API"""
    
    def test_log_custom_event(self):
        """Test logging a custom event to order history"""
        response = requests.post(
            f"{BASE_URL}/api/dwz56-sync/log-event",
            json={
                "order_id": "99001",
                "event_type": "test_event",
                "details": {"test_key": "test_value"}
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert data["event_logged"] == "test_event"
        assert data["order_id"] == "99001"
        assert "timestamp" in data
        
    def test_log_event_without_details(self):
        """Test logging event without details"""
        response = requests.post(
            f"{BASE_URL}/api/dwz56-sync/log-event",
            json={
                "order_id": "99001",
                "event_type": "simple_event"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


class TestDWZTrackingStatus:
    """Test DWZ Tracking Status API"""
    
    def test_get_tracking_status_nonexistent(self):
        """Test getting tracking status for non-existent tracking number"""
        response = requests.get(f"{BASE_URL}/api/dwz56-sync/tracking/NONEXISTENT123")
        # Should return 404 for non-existent tracking
        assert response.status_code == 404


class TestIntegration:
    """Integration tests for the new features"""
    
    def test_sync_then_check_history(self):
        """Test that sync creates history entries"""
        # First trigger a sync
        sync_response = requests.post(
            f"{BASE_URL}/api/dwz56-sync/sync",
            json={"store_name": "tnvcollectionpk", "days_back": 30}
        )
        assert sync_response.status_code == 200
        
        # Then check sync logs
        logs_response = requests.get(f"{BASE_URL}/api/dwz56-sync/sync-logs?limit=1")
        assert logs_response.status_code == 200
        logs_data = logs_response.json()
        
        # Should have at least one log entry
        assert logs_data["count"] >= 1
        
    def test_full_workflow(self):
        """Test full workflow: sync -> check history -> batch notify"""
        # 1. Trigger DWZ sync
        sync_response = requests.post(
            f"{BASE_URL}/api/dwz56-sync/sync",
            json={"store_name": "tnvcollectionpk", "days_back": 30}
        )
        assert sync_response.status_code == 200
        
        # 2. Check order history
        history_response = requests.get(f"{BASE_URL}/api/dwz56-sync/order-history/99001")
        assert history_response.status_code == 200
        
        # 3. Batch notify
        notify_response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/notify-by-stage",
            json={"store_name": "tnvcollectionpk", "stage": "dwz56_shipped"}
        )
        assert notify_response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
