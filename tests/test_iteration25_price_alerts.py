"""
Test Suite for Iteration 25 - Price Alert Notifications
Tests for:
- GET /api/competitor/notifications - Get price alert notifications
- POST /api/competitor/notifications/{id}/read - Mark notification as read
- POST /api/competitor/notifications/mark-all-read - Mark all notifications as read
- POST /api/competitor/check-alerts/{analysis_id} - Check price alerts for an analysis
- GET /api/competitor/alerts/settings/{product_id} - Get alert settings
- POST /api/competitor/alerts/settings - Update alert settings
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPriceAlertNotifications:
    """Test price alert notification endpoints"""
    
    def test_get_notifications(self):
        """Test GET /api/competitor/notifications - should return notifications list"""
        response = requests.get(f"{BASE_URL}/api/competitor/notifications")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "notifications" in data
        assert "unread_count" in data
        assert "total" in data
        assert isinstance(data["notifications"], list)
        assert isinstance(data["unread_count"], int)
        
    def test_get_notifications_with_limit(self):
        """Test GET /api/competitor/notifications with limit parameter"""
        response = requests.get(f"{BASE_URL}/api/competitor/notifications?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert len(data["notifications"]) <= 5
        
    def test_get_notifications_unread_only(self):
        """Test GET /api/competitor/notifications with unread_only filter"""
        response = requests.get(f"{BASE_URL}/api/competitor/notifications?unread_only=true")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        # All returned notifications should be unread
        for notification in data["notifications"]:
            assert notification.get("read") is False
            
    def test_notification_structure(self):
        """Test notification object structure"""
        response = requests.get(f"{BASE_URL}/api/competitor/notifications?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        if data["notifications"]:
            notification = data["notifications"][0]
            # Check required fields
            assert "notification_id" in notification
            assert "type" in notification
            assert "title" in notification
            assert "message" in notification
            assert "read" in notification
            assert "created_at" in notification


class TestMarkNotificationRead:
    """Test mark notification as read endpoints"""
    
    def test_mark_notification_read_success(self):
        """Test POST /api/competitor/notifications/{id}/read - mark single notification as read"""
        # First get a notification
        get_response = requests.get(f"{BASE_URL}/api/competitor/notifications?limit=1")
        assert get_response.status_code == 200
        
        notifications = get_response.json().get("notifications", [])
        if notifications:
            notification_id = notifications[0]["notification_id"]
            
            # Mark as read
            response = requests.post(f"{BASE_URL}/api/competitor/notifications/{notification_id}/read")
            assert response.status_code == 200
            
            data = response.json()
            assert data.get("success") is True
            assert "message" in data
            
    def test_mark_notification_read_not_found(self):
        """Test POST /api/competitor/notifications/{id}/read - non-existent notification"""
        fake_id = f"fake_notification_{uuid.uuid4()}"
        response = requests.post(f"{BASE_URL}/api/competitor/notifications/{fake_id}/read")
        assert response.status_code == 404
        
    def test_mark_all_notifications_read(self):
        """Test POST /api/competitor/notifications/mark-all-read"""
        response = requests.post(f"{BASE_URL}/api/competitor/notifications/mark-all-read")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "count" in data
        assert isinstance(data["count"], int)


class TestAlertSettings:
    """Test alert settings endpoints"""
    
    def test_get_alert_settings_default(self):
        """Test GET /api/competitor/alerts/settings/{product_id} - returns default settings"""
        product_id = f"test_product_{uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/api/competitor/alerts/settings/{product_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "settings" in data
        
        settings = data["settings"]
        # Check default values
        assert settings.get("enabled") is True
        assert settings.get("threshold_percent") == 0
        assert settings.get("notify_email") is True
        assert settings.get("notify_in_app") is True
        
    def test_update_alert_settings(self):
        """Test POST /api/competitor/alerts/settings - update settings"""
        product_id = f"TEST_alert_settings_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "product_id": product_id,
            "enabled": True,
            "threshold_percent": 10.0,
            "notify_email": False,
            "notify_in_app": True,
            "email_recipients": ["test@example.com"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/competitor/alerts/settings",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "settings" in data
        
        settings = data["settings"]
        assert settings["product_id"] == product_id
        assert settings["enabled"] is True
        assert settings["threshold_percent"] == 10.0
        assert settings["notify_email"] is False
        assert settings["notify_in_app"] is True
        assert "test@example.com" in settings["email_recipients"]
        
    def test_update_alert_settings_verify_persistence(self):
        """Test that alert settings are persisted correctly"""
        product_id = f"TEST_persist_{uuid.uuid4().hex[:8]}"
        
        # Create settings
        payload = {
            "product_id": product_id,
            "enabled": False,
            "threshold_percent": 15.0,
            "notify_email": True,
            "notify_in_app": False
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/competitor/alerts/settings",
            json=payload
        )
        assert create_response.status_code == 200
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/competitor/alerts/settings/{product_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        settings = data["settings"]
        assert settings["enabled"] is False
        assert settings["threshold_percent"] == 15.0
        assert settings["notify_email"] is True
        assert settings["notify_in_app"] is False


class TestCheckPriceAlerts:
    """Test check price alerts endpoint"""
    
    def test_check_alerts_existing_analysis(self):
        """Test POST /api/competitor/check-alerts/{analysis_id} - existing analysis"""
        # First get an existing analysis
        analyses_response = requests.get(f"{BASE_URL}/api/competitor/analyses?limit=1")
        assert analyses_response.status_code == 200
        
        analyses = analyses_response.json().get("analyses", [])
        if analyses:
            analysis_id = analyses[0]["analysis_id"]
            
            response = requests.post(f"{BASE_URL}/api/competitor/check-alerts/{analysis_id}")
            assert response.status_code == 200
            
            data = response.json()
            assert data.get("success") is True
            assert "alerts_triggered" in data
            assert isinstance(data["alerts_triggered"], int)
            
    def test_check_alerts_not_found(self):
        """Test POST /api/competitor/check-alerts/{analysis_id} - non-existent analysis"""
        fake_id = f"fake_analysis_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/competitor/check-alerts/{fake_id}")
        assert response.status_code == 404


class TestCompetitorDashboardStats:
    """Test competitor dashboard stats endpoint"""
    
    def test_dashboard_stats(self):
        """Test GET /api/competitor/dashboard-stats"""
        response = requests.get(f"{BASE_URL}/api/competitor/dashboard-stats")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "stats" in data
        
        stats = data["stats"]
        assert "total_analyses" in stats
        assert "analyses_with_prices" in stats
        assert "avg_competitors_found" in stats
        assert "recent_analyses" in stats


class TestMarketingEndpoints:
    """Test marketing router endpoints (moved from server.py)"""
    
    def test_marketing_stats(self):
        """Test GET /api/marketing/stats"""
        response = requests.get(f"{BASE_URL}/api/marketing/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "today_revenue" in data or "success" in data
        
    def test_marketing_campaigns(self):
        """Test GET /api/marketing/campaigns"""
        response = requests.get(f"{BASE_URL}/api/marketing/campaigns")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "campaigns" in data


class TestWhatsAppEndpoints:
    """Test WhatsApp endpoints via router"""
    
    def test_whatsapp_conversations(self):
        """Test GET /api/whatsapp/conversations"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/conversations")
        assert response.status_code == 200
        
        data = response.json()
        assert "conversations" in data or "success" in data


class TestCurrencyRates:
    """Test currency rates endpoint"""
    
    def test_currency_rates(self):
        """Test GET /api/competitor/currency-rates"""
        response = requests.get(f"{BASE_URL}/api/competitor/currency-rates")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "base_currency" in data
        assert "rates" in data
        
        rates = data["rates"]
        assert "USD" in rates
        assert "EUR" in rates
        assert "GBP" in rates


class TestIntegrationFlow:
    """Integration tests for price alert flow"""
    
    def test_full_notification_flow(self):
        """Test complete notification flow: create -> read -> verify"""
        # 1. Get initial unread count
        initial_response = requests.get(f"{BASE_URL}/api/competitor/notifications")
        assert initial_response.status_code == 200
        initial_unread = initial_response.json().get("unread_count", 0)
        
        # 2. Mark all as read
        mark_response = requests.post(f"{BASE_URL}/api/competitor/notifications/mark-all-read")
        assert mark_response.status_code == 200
        
        # 3. Verify unread count is 0
        verify_response = requests.get(f"{BASE_URL}/api/competitor/notifications")
        assert verify_response.status_code == 200
        assert verify_response.json().get("unread_count") == 0
        
    def test_alert_settings_flow(self):
        """Test alert settings flow: create -> get -> update -> verify"""
        product_id = f"TEST_flow_{uuid.uuid4().hex[:8]}"
        
        # 1. Get default settings
        default_response = requests.get(f"{BASE_URL}/api/competitor/alerts/settings/{product_id}")
        assert default_response.status_code == 200
        default_settings = default_response.json()["settings"]
        assert default_settings["enabled"] is True
        
        # 2. Update settings
        update_payload = {
            "product_id": product_id,
            "enabled": False,
            "threshold_percent": 20.0
        }
        update_response = requests.post(
            f"{BASE_URL}/api/competitor/alerts/settings",
            json=update_payload
        )
        assert update_response.status_code == 200
        
        # 3. Verify updated settings
        verify_response = requests.get(f"{BASE_URL}/api/competitor/alerts/settings/{product_id}")
        assert verify_response.status_code == 200
        updated_settings = verify_response.json()["settings"]
        assert updated_settings["enabled"] is False
        assert updated_settings["threshold_percent"] == 20.0


# Fixtures
@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
