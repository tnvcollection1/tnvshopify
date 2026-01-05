"""
Test Suite for Iteration 12 Features
Tests: image_search_service.py, fulfillment_webhooks.py, whatsapp_notifications.py
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestImageSearchService:
    """Tests for /app/backend/services/image_search_service.py module"""
    
    def test_image_search_service_file_exists(self):
        """Verify image_search_service.py exists"""
        import os
        service_path = "/app/backend/services/image_search_service.py"
        assert os.path.exists(service_path), f"Service file not found: {service_path}"
        
        # Verify it has the expected functions
        with open(service_path, 'r') as f:
            content = f.read()
            assert "search_products_by_image" in content, "Missing search_products_by_image function"
            assert "link_product_by_image" in content, "Missing link_product_by_image function"
            assert "auto_link_products_by_image" in content, "Missing auto_link_products_by_image function"
            assert "get_product_link" in content, "Missing get_product_link function"
            assert "get_all_product_links" in content, "Missing get_all_product_links function"


class TestFulfillmentWebhooks:
    """Tests for webhook endpoints at /api/webhooks/fulfillment/*"""
    
    def test_webhook_status_update_endpoint(self):
        """Test POST /api/webhooks/fulfillment/status-update"""
        response = requests.post(
            f"{BASE_URL}/api/webhooks/fulfillment/status-update",
            json={
                "order_id": "TEST_WEBHOOK_001",
                "order_type": "1688",
                "status": "shipped",
                "tracking_number": "TEST-TRACK-001"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("order_id") == "TEST_WEBHOOK_001"
        assert data.get("new_status") == "shipped"
        assert "actions" in data
    
    def test_webhook_dwz56_endpoint(self):
        """Test POST /api/webhooks/fulfillment/dwz56"""
        response = requests.post(
            f"{BASE_URL}/api/webhooks/fulfillment/dwz56",
            json={
                "cNo": "DWZ-TEST-003",
                "orderNo": "TEST789",
                "status": "IN_TRANSIT",
                "statusDesc": "Package in transit"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("tracking_number") == "DWZ-TEST-003"
        assert data.get("status") == "in_transit"
    
    def test_webhook_1688_endpoint(self):
        """Test POST /api/webhooks/fulfillment/1688"""
        response = requests.post(
            f"{BASE_URL}/api/webhooks/fulfillment/1688",
            json={
                "orderId": "TEST1688ORDER002",
                "orderStatus": "waitsellersend",
                "trackingNumber": None
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("order_id") == "TEST1688ORDER002"
        assert data.get("status") == "paid_waiting_ship"
    
    def test_webhook_test_endpoint(self):
        """Test POST /api/webhooks/fulfillment/test"""
        response = requests.post(
            f"{BASE_URL}/api/webhooks/fulfillment/test",
            json={"test_type": "fulfillment"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("message") == "Test fulfillment webhook logged"
        assert "payload" in data
    
    def test_webhook_test_dwz56_type(self):
        """Test POST /api/webhooks/fulfillment/test with dwz56 type"""
        response = requests.post(
            f"{BASE_URL}/api/webhooks/fulfillment/test",
            json={"test_type": "dwz56"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "DWZ" in str(data.get("payload", {}))
    
    def test_webhook_test_1688_type(self):
        """Test POST /api/webhooks/fulfillment/test with 1688 type"""
        response = requests.post(
            f"{BASE_URL}/api/webhooks/fulfillment/test",
            json={"test_type": "1688"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "1688" in str(data.get("payload", {})) or "orderId" in str(data.get("payload", {}))
    
    def test_webhook_logs_endpoint(self):
        """Test GET /api/webhooks/fulfillment/logs"""
        response = requests.get(f"{BASE_URL}/api/webhooks/fulfillment/logs?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "logs" in data
        assert "count" in data


class TestWhatsAppNotifications:
    """Tests for WhatsApp notification endpoints at /api/notifications/whatsapp/*"""
    
    def test_whatsapp_templates_endpoint(self):
        """Test GET /api/notifications/whatsapp/templates"""
        response = requests.get(f"{BASE_URL}/api/notifications/whatsapp/templates")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "templates" in data
        assert "available_types" in data
        assert "languages" in data
        
        # Verify template types
        available_types = data.get("available_types", [])
        assert "order_confirmed" in available_types
        assert "order_shipped" in available_types
        assert "order_delivered" in available_types
        assert "order_1688_placed" in available_types
        assert "order_in_transit" in available_types
        
        # Verify languages
        languages = data.get("languages", [])
        assert "en" in languages
        assert "ur" in languages
    
    def test_whatsapp_send_notification_with_order_29533(self):
        """Test POST /api/notifications/whatsapp/send with order_id 29533"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/whatsapp/send",
            json={
                "order_id": "29533",
                "notification_type": "order_confirmed",
                "language": "en"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("order_id") == "29533"
        assert data.get("notification_type") == "order_confirmed"
        assert "wa_url" in data  # Should return wa.me link (fallback)
        assert "phone" in data
        assert "method" in data
    
    def test_whatsapp_send_notification_urdu(self):
        """Test POST /api/notifications/whatsapp/send with Urdu language"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/whatsapp/send",
            json={
                "order_id": "29533",
                "notification_type": "order_confirmed",
                "language": "ur"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "wa_url" in data
    
    def test_whatsapp_send_notification_invalid_order(self):
        """Test POST /api/notifications/whatsapp/send with invalid order"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/whatsapp/send",
            json={
                "order_id": "INVALID_ORDER_999999",
                "notification_type": "order_confirmed",
                "language": "en"
            }
        )
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data.get("detail", "").lower()
    
    def test_whatsapp_send_notification_invalid_type(self):
        """Test POST /api/notifications/whatsapp/send with invalid notification type"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/whatsapp/send",
            json={
                "order_id": "29533",
                "notification_type": "invalid_type",
                "language": "en"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "unknown notification type" in data.get("detail", "").lower()
    
    def test_whatsapp_logs_endpoint(self):
        """Test GET /api/notifications/whatsapp/logs"""
        response = requests.get(f"{BASE_URL}/api/notifications/whatsapp/logs?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "logs" in data
        assert "count" in data
    
    def test_whatsapp_logs_filter_by_order(self):
        """Test GET /api/notifications/whatsapp/logs with order_id filter"""
        response = requests.get(f"{BASE_URL}/api/notifications/whatsapp/logs?order_id=29533&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        # All logs should be for order 29533
        for log in data.get("logs", []):
            assert log.get("order_id") == "29533"


class TestWidget1688StatusComponent:
    """Tests for Widget1688Status.jsx component file"""
    
    def test_widget_component_file_exists(self):
        """Verify Widget1688Status.jsx exists"""
        import os
        component_path = "/app/frontend/src/components/Widget1688Status.jsx"
        assert os.path.exists(component_path), f"Component file not found: {component_path}"
        
        # Verify it has the expected data-testid
        with open(component_path, 'r') as f:
            content = f.read()
            assert 'data-testid="widget-1688-status"' in content, "Missing data-testid attribute"
            assert "Widget1688Status" in content, "Missing component name"
            assert "fetchStats" in content, "Missing fetchStats function"


class TestFulfillmentWebhookService:
    """Tests for fulfillment_webhooks.py service file"""
    
    def test_fulfillment_webhooks_service_file_exists(self):
        """Verify fulfillment_webhooks.py exists"""
        import os
        service_path = "/app/backend/services/fulfillment_webhooks.py"
        assert os.path.exists(service_path), f"Service file not found: {service_path}"
        
        # Verify it has the expected functions and classes
        with open(service_path, 'r') as f:
            content = f.read()
            assert "FulfillmentStatusUpdate" in content, "Missing FulfillmentStatusUpdate model"
            assert "DWZ56WebhookPayload" in content, "Missing DWZ56WebhookPayload model"
            assert "Alibaba1688WebhookPayload" in content, "Missing Alibaba1688WebhookPayload model"
            assert "receive_fulfillment_status_update" in content, "Missing status-update endpoint"
            assert "receive_dwz56_webhook" in content, "Missing dwz56 endpoint"
            assert "receive_1688_webhook" in content, "Missing 1688 endpoint"


class TestWhatsAppNotificationService:
    """Tests for whatsapp_notifications.py service file"""
    
    def test_whatsapp_notifications_service_file_exists(self):
        """Verify whatsapp_notifications.py exists"""
        import os
        service_path = "/app/backend/services/whatsapp_notifications.py"
        assert os.path.exists(service_path), f"Service file not found: {service_path}"
        
        # Verify it has the expected functions
        with open(service_path, 'r') as f:
            content = f.read()
            assert "ORDER_TEMPLATES" in content, "Missing ORDER_TEMPLATES"
            assert "send_whatsapp_message" in content, "Missing send_whatsapp_message function"
            assert "send_order_notification" in content, "Missing send_order_notification endpoint"
            assert "get_notification_templates" in content, "Missing templates endpoint"
            assert "clean_phone_number" in content, "Missing clean_phone_number function"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
