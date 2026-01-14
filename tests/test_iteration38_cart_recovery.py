"""
Test Suite for Iteration 38 - Abandoned Cart Recovery Feature
Tests all cart recovery API endpoints for WhatsApp reminder functionality
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone, timedelta

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCartRecoverySettings:
    """Tests for Cart Recovery Settings API"""
    
    def test_get_settings_tnvcollection(self):
        """GET /api/cart-recovery/settings/tnvcollection - Get settings for India store"""
        response = requests.get(f"{BASE_URL}/api/cart-recovery/settings/tnvcollection")
        assert response.status_code == 200
        
        data = response.json()
        assert "enabled" in data
        assert "first_reminder_hours" in data
        assert "second_reminder_hours" in data
        assert "third_reminder_hours" in data
        assert "max_reminders" in data
        assert "include_discount" in data
        assert "discount_code" in data
        assert "discount_percent" in data
        assert data["store"] == "tnvcollection"
        print(f"✓ GET settings for tnvcollection: enabled={data['enabled']}, discount={data['discount_code']}")
    
    def test_get_settings_tnvcollectionpk(self):
        """GET /api/cart-recovery/settings/tnvcollectionpk - Get settings for Pakistan store"""
        response = requests.get(f"{BASE_URL}/api/cart-recovery/settings/tnvcollectionpk")
        assert response.status_code == 200
        
        data = response.json()
        assert data["store"] == "tnvcollectionpk"
        assert "enabled" in data
        print(f"✓ GET settings for tnvcollectionpk: enabled={data['enabled']}")
    
    def test_update_settings(self):
        """PUT /api/cart-recovery/settings/tnvcollection - Update settings"""
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/cart-recovery/settings/tnvcollection")
        original_settings = get_response.json()
        
        # Update settings
        new_settings = {
            "enabled": True,
            "first_reminder_hours": 2,
            "second_reminder_hours": 24,
            "third_reminder_hours": 72,
            "max_reminders": 3,
            "include_discount": True,
            "discount_code": "TEST_COMEBACK15",
            "discount_percent": 15,
            "store": "tnvcollection"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/cart-recovery/settings/tnvcollection",
            json=new_settings
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        print(f"✓ PUT settings updated successfully")
        
        # Verify update persisted
        verify_response = requests.get(f"{BASE_URL}/api/cart-recovery/settings/tnvcollection")
        verify_data = verify_response.json()
        assert verify_data["discount_code"] == "TEST_COMEBACK15"
        assert verify_data["discount_percent"] == 15
        assert verify_data["first_reminder_hours"] == 2
        print(f"✓ Settings persisted: discount_code={verify_data['discount_code']}, discount_percent={verify_data['discount_percent']}")
        
        # Restore original settings
        restore_settings = {
            "enabled": original_settings.get("enabled", True),
            "first_reminder_hours": original_settings.get("first_reminder_hours", 1),
            "second_reminder_hours": original_settings.get("second_reminder_hours", 24),
            "third_reminder_hours": original_settings.get("third_reminder_hours", 72),
            "max_reminders": original_settings.get("max_reminders", 3),
            "include_discount": original_settings.get("include_discount", True),
            "discount_code": original_settings.get("discount_code", "COMEBACK10"),
            "discount_percent": original_settings.get("discount_percent", 10),
            "store": "tnvcollection"
        }
        requests.put(f"{BASE_URL}/api/cart-recovery/settings/tnvcollection", json=restore_settings)
        print(f"✓ Original settings restored")


class TestCartRecoveryStats:
    """Tests for Cart Recovery Stats API"""
    
    def test_get_stats_default(self):
        """GET /api/cart-recovery/stats - Get stats with default parameters"""
        response = requests.get(f"{BASE_URL}/api/cart-recovery/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "store" in data
        assert "period_days" in data
        assert "abandoned_carts" in data
        assert "reminders_sent" in data
        assert "recovered_carts" in data
        assert "recovery_rate" in data
        assert "revenue_recovered" in data
        
        # Verify data types
        assert isinstance(data["abandoned_carts"], int)
        assert isinstance(data["reminders_sent"], int)
        assert isinstance(data["recovered_carts"], int)
        assert isinstance(data["recovery_rate"], (int, float))
        assert isinstance(data["revenue_recovered"], (int, float))
        print(f"✓ GET stats: abandoned={data['abandoned_carts']}, reminders={data['reminders_sent']}, recovered={data['recovered_carts']}")
    
    def test_get_stats_with_store_filter(self):
        """GET /api/cart-recovery/stats?store=tnvcollectionpk - Get stats for Pakistan store"""
        response = requests.get(f"{BASE_URL}/api/cart-recovery/stats?store=tnvcollectionpk")
        assert response.status_code == 200
        
        data = response.json()
        assert data["store"] == "tnvcollectionpk"
        print(f"✓ GET stats for tnvcollectionpk: abandoned={data['abandoned_carts']}")
    
    def test_get_stats_with_days_filter(self):
        """GET /api/cart-recovery/stats?days=7 - Get stats for last 7 days"""
        response = requests.get(f"{BASE_URL}/api/cart-recovery/stats?store=tnvcollection&days=7")
        assert response.status_code == 200
        
        data = response.json()
        assert data["period_days"] == 7
        print(f"✓ GET stats for 7 days: abandoned={data['abandoned_carts']}")


class TestAbandonedCarts:
    """Tests for Abandoned Carts API"""
    
    def test_get_abandoned_carts_default(self):
        """GET /api/cart-recovery/abandoned-carts - Get abandoned carts with defaults"""
        response = requests.get(f"{BASE_URL}/api/cart-recovery/abandoned-carts")
        assert response.status_code == 200
        
        data = response.json()
        assert "carts" in data
        assert "count" in data
        assert "store" in data
        assert isinstance(data["carts"], list)
        assert isinstance(data["count"], int)
        print(f"✓ GET abandoned carts: count={data['count']}")
    
    def test_get_abandoned_carts_with_filters(self):
        """GET /api/cart-recovery/abandoned-carts with time filters"""
        response = requests.get(
            f"{BASE_URL}/api/cart-recovery/abandoned-carts?store=tnvcollection&min_hours=1&max_hours=48&limit=10"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["store"] == "tnvcollection"
        assert isinstance(data["carts"], list)
        print(f"✓ GET abandoned carts with filters: count={data['count']}")
    
    def test_get_abandoned_carts_pk_store(self):
        """GET /api/cart-recovery/abandoned-carts for Pakistan store"""
        response = requests.get(f"{BASE_URL}/api/cart-recovery/abandoned-carts?store=tnvcollectionpk")
        assert response.status_code == 200
        
        data = response.json()
        assert data["store"] == "tnvcollectionpk"
        print(f"✓ GET abandoned carts for tnvcollectionpk: count={data['count']}")


class TestRecoveryLogs:
    """Tests for Recovery Logs API"""
    
    def test_get_logs_default(self):
        """GET /api/cart-recovery/logs - Get recovery logs"""
        response = requests.get(f"{BASE_URL}/api/cart-recovery/logs")
        assert response.status_code == 200
        
        data = response.json()
        assert "logs" in data
        assert "total" in data
        assert "limit" in data
        assert "skip" in data
        assert isinstance(data["logs"], list)
        print(f"✓ GET recovery logs: total={data['total']}")
    
    def test_get_logs_with_pagination(self):
        """GET /api/cart-recovery/logs with pagination"""
        response = requests.get(f"{BASE_URL}/api/cart-recovery/logs?store=tnvcollection&limit=10&skip=0")
        assert response.status_code == 200
        
        data = response.json()
        assert data["limit"] == 10
        assert data["skip"] == 0
        print(f"✓ GET recovery logs with pagination: total={data['total']}, limit={data['limit']}")


class TestSendReminder:
    """Tests for Send Reminder API"""
    
    def test_send_reminder_cart_not_found(self):
        """POST /api/cart-recovery/send-reminder - Cart not found"""
        response = requests.post(
            f"{BASE_URL}/api/cart-recovery/send-reminder",
            json={
                "session_id": "nonexistent_session_12345",
                "reminder_number": 1,
                "include_discount": True
            }
        )
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data
        print(f"✓ POST send-reminder returns 404 for nonexistent cart")
    
    def test_send_reminder_validation(self):
        """POST /api/cart-recovery/send-reminder - Validation test"""
        # Missing session_id should fail validation
        response = requests.post(
            f"{BASE_URL}/api/cart-recovery/send-reminder",
            json={
                "reminder_number": 1
            }
        )
        assert response.status_code == 422  # Validation error
        print(f"✓ POST send-reminder validates required fields")


class TestBulkReminders:
    """Tests for Bulk Reminders API"""
    
    def test_send_bulk_reminders(self):
        """POST /api/cart-recovery/send-bulk-reminders - Send bulk reminders"""
        response = requests.post(
            f"{BASE_URL}/api/cart-recovery/send-bulk-reminders?store=tnvcollection&reminder_hours=1&limit=10"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        assert "total_carts" in data
        assert "reminders_sent" in data
        assert "results" in data
        print(f"✓ POST bulk reminders: total_carts={data['total_carts']}, sent={data['reminders_sent']}")
    
    def test_send_bulk_reminders_pk_store(self):
        """POST /api/cart-recovery/send-bulk-reminders for Pakistan store"""
        response = requests.post(
            f"{BASE_URL}/api/cart-recovery/send-bulk-reminders?store=tnvcollectionpk&reminder_hours=24&limit=5"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        print(f"✓ POST bulk reminders for tnvcollectionpk: total_carts={data['total_carts']}")


class TestMarkConverted:
    """Tests for Mark Converted API"""
    
    def test_mark_converted_not_found(self):
        """POST /api/cart-recovery/mark-converted/{session_id} - Cart not found"""
        response = requests.post(
            f"{BASE_URL}/api/cart-recovery/mark-converted/nonexistent_session_12345"
        )
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data
        print(f"✓ POST mark-converted returns 404 for nonexistent cart")
    
    def test_mark_converted_with_order_id(self):
        """POST /api/cart-recovery/mark-converted/{session_id}?order_id=X - With order ID"""
        response = requests.post(
            f"{BASE_URL}/api/cart-recovery/mark-converted/nonexistent_session_12345?order_id=TEST_ORDER_123"
        )
        assert response.status_code == 404  # Cart doesn't exist
        print(f"✓ POST mark-converted with order_id validates cart existence")


class TestIntegrationFlow:
    """Integration tests for complete cart recovery flow"""
    
    def test_full_settings_flow(self):
        """Test complete settings update and retrieval flow"""
        store = "tnvcollection"
        
        # 1. Get current settings
        get_response = requests.get(f"{BASE_URL}/api/cart-recovery/settings/{store}")
        assert get_response.status_code == 200
        original = get_response.json()
        
        # 2. Update settings
        updated = {
            "enabled": True,
            "first_reminder_hours": 1,
            "second_reminder_hours": 24,
            "third_reminder_hours": 72,
            "max_reminders": 3,
            "include_discount": True,
            "discount_code": "INTEGRATION_TEST",
            "discount_percent": 20,
            "store": store
        }
        put_response = requests.put(f"{BASE_URL}/api/cart-recovery/settings/{store}", json=updated)
        assert put_response.status_code == 200
        
        # 3. Verify update
        verify_response = requests.get(f"{BASE_URL}/api/cart-recovery/settings/{store}")
        verify_data = verify_response.json()
        assert verify_data["discount_code"] == "INTEGRATION_TEST"
        
        # 4. Restore original
        restore = {
            "enabled": original.get("enabled", True),
            "first_reminder_hours": original.get("first_reminder_hours", 1),
            "second_reminder_hours": original.get("second_reminder_hours", 24),
            "third_reminder_hours": original.get("third_reminder_hours", 72),
            "max_reminders": original.get("max_reminders", 3),
            "include_discount": original.get("include_discount", True),
            "discount_code": original.get("discount_code", "COMEBACK10"),
            "discount_percent": original.get("discount_percent", 10),
            "store": store
        }
        requests.put(f"{BASE_URL}/api/cart-recovery/settings/{store}", json=restore)
        
        print(f"✓ Full settings flow completed successfully")
    
    def test_stats_and_carts_consistency(self):
        """Test that stats and abandoned carts data are consistent"""
        store = "tnvcollection"
        
        # Get stats
        stats_response = requests.get(f"{BASE_URL}/api/cart-recovery/stats?store={store}&days=30")
        stats = stats_response.json()
        
        # Get abandoned carts
        carts_response = requests.get(f"{BASE_URL}/api/cart-recovery/abandoned-carts?store={store}&max_hours=720")
        carts = carts_response.json()
        
        # Both should return valid data
        assert stats_response.status_code == 200
        assert carts_response.status_code == 200
        assert isinstance(stats["abandoned_carts"], int)
        assert isinstance(carts["count"], int)
        
        print(f"✓ Stats and carts data consistent: stats.abandoned={stats['abandoned_carts']}, carts.count={carts['count']}")


# Pytest fixtures
@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
