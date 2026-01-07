"""
Iteration 24 Backend Tests - Currency Conversion & Server Refactoring
Tests for:
1. Currency conversion service - GET /api/competitor/currency-rates
2. Marketing stats endpoint via new router - GET /api/marketing/stats
3. Settings auto-sync endpoint via new router - GET /api/settings/auto-sync
4. Shopify sync endpoint via new router - GET /api/shopify/products/sync-status
5. WhatsApp endpoint via new router - GET /api/whatsapp/conversations
"""
import pytest
import requests
import os
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable not set")


class TestCurrencyConversionService:
    """Tests for the new currency conversion service"""
    
    def test_currency_rates_endpoint_exists(self):
        """Test that currency rates endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/competitor/currency-rates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_currency_rates_response_structure(self):
        """Test currency rates response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/competitor/currency-rates")
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        assert "base_currency" in data, "Response should have 'base_currency' field"
        assert "rates" in data, "Response should have 'rates' field"
    
    def test_currency_rates_base_currency_is_inr(self):
        """Test that base currency is INR"""
        response = requests.get(f"{BASE_URL}/api/competitor/currency-rates")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("base_currency") == "INR", f"Expected base_currency 'INR', got {data.get('base_currency')}"
    
    def test_currency_rates_contains_supported_currencies(self):
        """Test that rates contain USD, EUR, GBP, CNY, AED"""
        response = requests.get(f"{BASE_URL}/api/competitor/currency-rates")
        assert response.status_code == 200
        
        data = response.json()
        rates = data.get("rates", {})
        
        expected_currencies = ['USD', 'EUR', 'GBP', 'CNY', 'AED']
        for currency in expected_currencies:
            assert currency in rates, f"Missing currency: {currency}"
            assert isinstance(rates[currency], (int, float)), f"Rate for {currency} should be numeric"
            assert rates[currency] > 0, f"Rate for {currency} should be positive"
    
    def test_currency_rates_values_reasonable(self):
        """Test that exchange rates are within reasonable ranges"""
        response = requests.get(f"{BASE_URL}/api/competitor/currency-rates")
        assert response.status_code == 200
        
        data = response.json()
        rates = data.get("rates", {})
        
        # USD to INR should be roughly 80-90
        if 'USD' in rates:
            assert 70 < rates['USD'] < 100, f"USD rate {rates['USD']} seems unreasonable"
        
        # EUR to INR should be roughly 85-100
        if 'EUR' in rates:
            assert 75 < rates['EUR'] < 110, f"EUR rate {rates['EUR']} seems unreasonable"
        
        # GBP to INR should be roughly 100-115
        if 'GBP' in rates:
            assert 90 < rates['GBP'] < 130, f"GBP rate {rates['GBP']} seems unreasonable"


class TestMarketingStatsEndpoint:
    """Tests for marketing stats endpoint via new router"""
    
    def test_marketing_stats_endpoint_exists(self):
        """Test that marketing stats endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/marketing/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_marketing_stats_response_structure(self):
        """Test marketing stats response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/marketing/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        assert "stats" in data, "Response should have 'stats' field"
    
    def test_marketing_stats_contains_revenue_fields(self):
        """Test that stats contain revenue fields"""
        response = requests.get(f"{BASE_URL}/api/marketing/stats")
        assert response.status_code == 200
        
        data = response.json()
        stats = data.get("stats", {})
        
        expected_fields = ['todayRevenue', 'weekRevenue', 'monthRevenue', 'totalRevenue']
        for field in expected_fields:
            assert field in stats, f"Missing field: {field}"
            assert isinstance(stats[field], (int, float)), f"{field} should be numeric"
    
    def test_marketing_stats_contains_order_fields(self):
        """Test that stats contain order fields"""
        response = requests.get(f"{BASE_URL}/api/marketing/stats")
        assert response.status_code == 200
        
        data = response.json()
        stats = data.get("stats", {})
        
        expected_fields = ['totalOrders', 'pendingOrders']
        for field in expected_fields:
            assert field in stats, f"Missing field: {field}"
            assert isinstance(stats[field], int), f"{field} should be integer"
    
    def test_marketing_stats_no_datetime_error(self):
        """Test that marketing stats doesn't throw datetime comparison error"""
        # This was the bug that was fixed - datetime comparison with timezone-naive dates
        response = requests.get(f"{BASE_URL}/api/marketing/stats")
        assert response.status_code == 200, f"Datetime error may have occurred: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Stats should return success=True"


class TestMarketingCampaignsEndpoint:
    """Tests for marketing campaigns endpoint"""
    
    def test_marketing_campaigns_endpoint_exists(self):
        """Test that marketing campaigns endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/marketing/campaigns")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_marketing_campaigns_response_structure(self):
        """Test marketing campaigns response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/marketing/campaigns")
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        assert "campaigns" in data, "Response should have 'campaigns' field"
        assert isinstance(data["campaigns"], list), "campaigns should be a list"


class TestSettingsAutoSyncEndpoint:
    """Tests for settings auto-sync endpoint via new router"""
    
    def test_settings_auto_sync_endpoint_exists(self):
        """Test that settings auto-sync endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/settings/auto-sync")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_settings_auto_sync_response_structure(self):
        """Test settings auto-sync response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/settings/auto-sync")
        assert response.status_code == 200
        
        data = response.json()
        # Should have enabled field
        assert "enabled" in data, "Response should have 'enabled' field"
        assert isinstance(data["enabled"], bool), "enabled should be boolean"
    
    def test_settings_auto_sync_has_interval(self):
        """Test that auto-sync settings have interval_minutes"""
        response = requests.get(f"{BASE_URL}/api/settings/auto-sync")
        assert response.status_code == 200
        
        data = response.json()
        assert "interval_minutes" in data, "Response should have 'interval_minutes' field"
        assert isinstance(data["interval_minutes"], int), "interval_minutes should be integer"
    
    def test_settings_auto_sync_has_sync_options(self):
        """Test that auto-sync settings have sync options"""
        response = requests.get(f"{BASE_URL}/api/settings/auto-sync")
        assert response.status_code == 200
        
        data = response.json()
        expected_fields = ['sync_shopify', 'sync_tcs', 'sync_dtdc', 'sync_inventory']
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], bool), f"{field} should be boolean"


class TestSettingsNotificationsEndpoint:
    """Tests for settings notifications endpoint"""
    
    def test_settings_notifications_endpoint_exists(self):
        """Test that settings notifications endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/settings/notifications")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_settings_notifications_response_structure(self):
        """Test settings notifications response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/settings/notifications")
        assert response.status_code == 200
        
        data = response.json()
        expected_fields = ['email_notifications', 'whatsapp_notifications', 'order_confirmation']
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"


class TestSettingsGeneralEndpoint:
    """Tests for settings general endpoint"""
    
    def test_settings_general_endpoint_exists(self):
        """Test that settings general endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/settings/general")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_settings_general_response_structure(self):
        """Test settings general response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/settings/general")
        assert response.status_code == 200
        
        data = response.json()
        expected_fields = ['currency', 'timezone']
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"


class TestShopifySyncStatusEndpoint:
    """Tests for Shopify sync status endpoint"""
    
    def test_shopify_sync_status_endpoint_returns_404_for_nonexistent_job(self):
        """Test that Shopify sync status endpoint returns 404 for non-existent job"""
        # Using a dummy job_id - should return 404
        response = requests.get(f"{BASE_URL}/api/shopify/sync-status/test-job-123")
        assert response.status_code == 404, f"Expected 404 for non-existent job, got {response.status_code}: {response.text}"
    
    def test_shopify_sync_status_response_structure_for_nonexistent(self):
        """Test Shopify sync status response has correct structure for non-existent job"""
        response = requests.get(f"{BASE_URL}/api/shopify/sync-status/nonexistent-job")
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data, "Response should have 'detail' field for 404"
        assert "not found" in data["detail"].lower(), f"Expected 'not found' in detail"


class TestWhatsAppConversationsEndpoint:
    """Tests for WhatsApp conversations endpoint"""
    
    def test_whatsapp_conversations_endpoint_exists(self):
        """Test that WhatsApp conversations endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/conversations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_whatsapp_conversations_response_structure(self):
        """Test WhatsApp conversations response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/conversations")
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        assert "conversations" in data, "Response should have 'conversations' field"
        assert isinstance(data["conversations"], list), "conversations should be a list"
    
    def test_whatsapp_conversations_has_count(self):
        """Test WhatsApp conversations response has count field"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/conversations")
        assert response.status_code == 200
        
        data = response.json()
        # The whatsapp_crm_routes endpoint returns 'count' instead of 'total'
        assert "count" in data, "Response should have 'count' field"
        assert isinstance(data["count"], int), "count should be integer"


class TestCompetitorDashboardStats:
    """Tests for competitor dashboard stats endpoint"""
    
    def test_competitor_dashboard_stats_endpoint_exists(self):
        """Test that competitor dashboard stats endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/competitor/dashboard-stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_competitor_dashboard_stats_response_structure(self):
        """Test competitor dashboard stats response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/competitor/dashboard-stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        assert "stats" in data, "Response should have 'stats' field"
    
    def test_competitor_dashboard_stats_fields(self):
        """Test competitor dashboard stats has expected fields"""
        response = requests.get(f"{BASE_URL}/api/competitor/dashboard-stats")
        assert response.status_code == 200
        
        data = response.json()
        stats = data.get("stats", {})
        
        expected_fields = ['total_analyses', 'analyses_with_prices', 'avg_competitors_found']
        for field in expected_fields:
            assert field in stats, f"Missing field: {field}"


class TestCompetitorAnalysesEndpoint:
    """Tests for competitor analyses list endpoint"""
    
    def test_competitor_analyses_endpoint_exists(self):
        """Test that competitor analyses endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/competitor/analyses")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_competitor_analyses_response_structure(self):
        """Test competitor analyses response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/competitor/analyses")
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        assert "analyses" in data, "Response should have 'analyses' field"
        assert isinstance(data["analyses"], list), "analyses should be a list"


class TestHealthAndBasicEndpoints:
    """Tests for basic health and root endpoints"""
    
    def test_root_endpoint(self):
        """Test that root API endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_scheduler_status_endpoint(self):
        """Test that scheduler status endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
