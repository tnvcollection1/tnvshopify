"""
Test suite for WhatsApp Notification System
Tests notification preferences, subscription flow, and OTP verification
"""

import pytest
import httpx
import os

# Get API URL from environment or use default
API_URL = os.environ.get('API_URL', 'https://dwzconnect.preview.emergentagent.com')

# Test data
TEST_PHONE = "+919876543210"
TEST_STORE = "tnvcollection"
TEST_CUSTOMER_ID = "test_customer_123"


class TestNotificationTypes:
    """Test notification types endpoint"""
    
    def test_get_notification_types(self):
        """Test getting all notification types"""
        response = httpx.get(f"{API_URL}/api/notifications/types")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "notification_types" in data
        assert len(data["notification_types"]) >= 5  # At least 5 notification types


class TestNotificationSubscription:
    """Test subscription flow"""
    
    def test_subscribe_to_notifications(self):
        """Test subscribing to notifications"""
        response = httpx.post(
            f"{API_URL}/api/notifications/subscribe",
            json={
                "phone_number": TEST_PHONE,
                "store_name": TEST_STORE,
                "customer_name": "Test User"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "subscribed" in data["message"].lower() or "resubscribed" in data["message"].lower()
    
    def test_get_preferences(self):
        """Test getting notification preferences"""
        response = httpx.get(
            f"{API_URL}/api/notifications/preferences",
            params={
                "phone_number": TEST_PHONE,
                "store_name": TEST_STORE
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "subscribed" in data


class TestStoreSettings:
    """Test store notification settings"""
    
    def test_get_store_settings(self):
        """Test getting store notification settings"""
        response = httpx.get(f"{API_URL}/api/notifications/store-settings/{TEST_STORE}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "settings" in data
        assert "auto_send_order_shipped" in data["settings"]
    
    def test_get_store_stats(self):
        """Test getting store subscription stats"""
        response = httpx.get(f"{API_URL}/api/notifications/stats/{TEST_STORE}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "stats" in data
        assert "total_subscriptions" in data["stats"]


class TestOrderNotifications:
    """Test order notification stats"""
    
    def test_get_order_notification_stats(self):
        """Test getting order notification statistics"""
        response = httpx.get(
            f"{API_URL}/api/order-notifications/stats",
            params={
                "store_name": TEST_STORE,
                "days": 30
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "totals" in data
        assert "sent" in data["totals"]


class TestOTPFlow:
    """Test OTP verification flow (requires DEBUG_MODE=true)"""
    
    def test_send_notification_otp(self):
        """Test sending OTP for notification verification"""
        response = httpx.post(
            f"{API_URL}/api/whatsapp-otp/notifications/send",
            json={
                "phone_number": TEST_PHONE,
                "customer_id": TEST_CUSTOMER_ID,
                "store_name": TEST_STORE
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # In debug mode, OTP is returned in response
        if "debug_otp" in data:
            assert len(data["debug_otp"]) == 6  # 6-digit OTP


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
