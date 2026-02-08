"""
Test Suite for Iteration 18 Features:
1. Advanced Analytics with Date Range Filtering
2. Email Notification Service (config, templates, send-by-stage)
3. DWZ Sync Cron Job in Scheduler

Tests cover:
- GET /api/fulfillment/pipeline/analytics-advanced (with date range)
- GET /api/email-notifications/config
- GET /api/email-notifications/templates
- POST /api/email-notifications/send-by-stage
- GET /api/scheduler/status (verify DWZ sync job)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://multi-shop-hub-5.preview.emergentagent.com')

# Test store
TEST_STORE = "tnvcollectionpk"


class TestAdvancedAnalytics:
    """Test Advanced Analytics endpoint with date range filtering"""
    
    def test_analytics_advanced_endpoint_exists(self):
        """Test that analytics-advanced endpoint exists and returns success"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/analytics-advanced",
            params={"store_name": TEST_STORE}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "store_name" in data
    
    def test_analytics_with_date_range(self):
        """Test analytics with specific date range"""
        start_date = "2026-01-01"
        end_date = "2026-12-31"
        
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/analytics-advanced",
            params={
                "store_name": TEST_STORE,
                "start_date": start_date,
                "end_date": end_date
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "date_range" in data
        assert data["date_range"]["start"].startswith("2026-01-01")
        assert data["date_range"]["end"].startswith("2026-12-31")
    
    def test_analytics_returns_summary(self):
        """Test that analytics returns summary with key metrics"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/analytics-advanced",
            params={
                "store_name": TEST_STORE,
                "start_date": "2026-01-01",
                "end_date": "2026-12-31"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check summary fields
        if data.get("total_orders", 0) > 0:
            assert "summary" in data
            summary = data["summary"]
            assert "total_orders" in summary
            assert "completed_orders" in summary
            assert "completion_rate" in summary
            assert "stuck_orders" in summary
    
    def test_analytics_returns_stage_distribution(self):
        """Test that analytics returns stage distribution"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/analytics-advanced",
            params={
                "store_name": TEST_STORE,
                "start_date": "2026-01-01",
                "end_date": "2026-12-31"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get("total_orders", 0) > 0:
            assert "stage_distribution" in data
            stage_dist = data["stage_distribution"]
            assert isinstance(stage_dist, list)
            
            # Check each stage has required fields
            for stage in stage_dist:
                assert "stage" in stage
                assert "label" in stage
                assert "count" in stage
                assert "percentage" in stage
    
    def test_analytics_returns_conversion_funnel(self):
        """Test that analytics returns conversion funnel"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/analytics-advanced",
            params={
                "store_name": TEST_STORE,
                "start_date": "2026-01-01",
                "end_date": "2026-12-31"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get("total_orders", 0) > 0:
            assert "conversion_funnel" in data
            funnel = data["conversion_funnel"]
            assert isinstance(funnel, list)
            
            # Check funnel stages
            for stage in funnel:
                assert "stage" in stage
                assert "label" in stage
                assert "reached" in stage
                assert "conversion_from_previous" in stage
    
    def test_analytics_returns_orders_over_time(self):
        """Test that analytics returns orders over time for timeline chart"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/analytics-advanced",
            params={
                "store_name": TEST_STORE,
                "start_date": "2026-01-01",
                "end_date": "2026-12-31"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get("total_orders", 0) > 0:
            assert "orders_over_time" in data
            timeline = data["orders_over_time"]
            assert isinstance(timeline, list)
    
    def test_analytics_with_group_by_parameter(self):
        """Test analytics with different group_by values"""
        for group_by in ["day", "week", "month"]:
            response = requests.get(
                f"{BASE_URL}/api/fulfillment/pipeline/analytics-advanced",
                params={
                    "store_name": TEST_STORE,
                    "group_by": group_by
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True
    
    def test_analytics_invalid_date_format(self):
        """Test analytics with invalid date format returns error"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/analytics-advanced",
            params={
                "store_name": TEST_STORE,
                "start_date": "invalid-date"
            }
        )
        assert response.status_code == 400
    
    def test_analytics_no_orders_in_range(self):
        """Test analytics returns appropriate message when no orders in range"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/analytics-advanced",
            params={
                "store_name": TEST_STORE,
                "start_date": "2020-01-01",
                "end_date": "2020-01-31"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("total_orders") == 0
        assert "message" in data


class TestEmailNotificationService:
    """Test Email Notification Service endpoints"""
    
    def test_email_config_endpoint(self):
        """Test GET /api/email-notifications/config returns configuration status"""
        response = requests.get(f"{BASE_URL}/api/email-notifications/config")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "sendgrid_configured" in data
        assert "smtp_configured" in data
        assert "from_email" in data
        assert "from_name" in data
        
        # Verify types
        assert isinstance(data["sendgrid_configured"], bool)
        assert isinstance(data["smtp_configured"], bool)
    
    def test_email_templates_endpoint(self):
        """Test GET /api/email-notifications/templates returns all templates"""
        response = requests.get(f"{BASE_URL}/api/email-notifications/templates")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "templates" in data
        templates = data["templates"]
        
        # Check all 7 pipeline stages have templates
        expected_stages = [
            "shopify_order",
            "1688_ordered",
            "dwz56_shipped",
            "in_transit",
            "warehouse_arrived",
            "received",
            "local_shipped"
        ]
        
        for stage in expected_stages:
            assert stage in templates, f"Missing template for stage: {stage}"
            assert "subject" in templates[stage]
            assert "body_preview" in templates[stage]
    
    def test_email_templates_have_placeholders(self):
        """Test that email templates contain expected placeholders"""
        response = requests.get(f"{BASE_URL}/api/email-notifications/templates")
        assert response.status_code == 200
        data = response.json()
        templates = data["templates"]
        
        # Check that templates contain order_number placeholder
        for stage, template in templates.items():
            assert "{order_number}" in template["subject"] or "order_number" in template["subject"].lower()
    
    def test_send_by_stage_endpoint(self):
        """Test POST /api/email-notifications/send-by-stage"""
        response = requests.post(
            f"{BASE_URL}/api/email-notifications/send-by-stage",
            json={
                "store_name": TEST_STORE,
                "stage": "shopify_order"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "stage" in data
        assert data["stage"] == "shopify_order"
        assert "total_orders" in data
        assert "emails_sent" in data
        assert "emails_failed" in data
        assert "skipped_no_email" in data
    
    def test_send_by_stage_all_stages(self):
        """Test send-by-stage works for all pipeline stages"""
        stages = [
            "shopify_order",
            "1688_ordered",
            "dwz56_shipped",
            "in_transit",
            "warehouse_arrived",
            "local_shipped"
        ]
        
        for stage in stages:
            response = requests.post(
                f"{BASE_URL}/api/email-notifications/send-by-stage",
                json={
                    "store_name": TEST_STORE,
                    "stage": stage
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True
            assert data["stage"] == stage
    
    def test_send_by_stage_returns_details(self):
        """Test that send-by-stage returns details array"""
        response = requests.post(
            f"{BASE_URL}/api/email-notifications/send-by-stage",
            json={
                "store_name": TEST_STORE,
                "stage": "dwz56_shipped"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "details" in data
        assert isinstance(data["details"], list)


class TestSchedulerDWZSync:
    """Test that DWZ sync is scheduled in the scheduler"""
    
    def test_scheduler_status_endpoint(self):
        """Test GET /api/scheduler/status returns scheduler info"""
        response = requests.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200
        data = response.json()
        
        assert "running" in data
        assert data["running"] == True
        assert "jobs" in data
    
    def test_dwz_sync_job_scheduled(self):
        """Test that DWZ sync job is in the scheduler"""
        response = requests.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200
        data = response.json()
        
        jobs = data.get("jobs", [])
        job_ids = [job["id"] for job in jobs]
        
        assert "dwz_sync" in job_ids, "DWZ sync job not found in scheduler"
    
    def test_dwz_sync_job_interval(self):
        """Test that DWZ sync job runs every 4 hours"""
        response = requests.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200
        data = response.json()
        
        jobs = data.get("jobs", [])
        dwz_job = next((job for job in jobs if job["id"] == "dwz_sync"), None)
        
        assert dwz_job is not None
        assert "4:00:00" in dwz_job["trigger"], "DWZ sync should run every 4 hours"
    
    def test_dwz_sync_job_has_next_run(self):
        """Test that DWZ sync job has a next_run time scheduled"""
        response = requests.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200
        data = response.json()
        
        jobs = data.get("jobs", [])
        dwz_job = next((job for job in jobs if job["id"] == "dwz_sync"), None)
        
        assert dwz_job is not None
        assert dwz_job["next_run"] is not None
    
    def test_all_scheduled_jobs(self):
        """Test that all expected jobs are scheduled"""
        response = requests.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200
        data = response.json()
        
        jobs = data.get("jobs", [])
        job_ids = [job["id"] for job in jobs]
        
        # Expected jobs
        expected_jobs = ["shopify_sync", "tcs_sync", "dwz_sync"]
        
        for expected in expected_jobs:
            assert expected in job_ids, f"Expected job '{expected}' not found in scheduler"


class TestAnalyticsModalIntegration:
    """Test analytics data structure matches frontend AnalyticsModal expectations"""
    
    def test_analytics_data_for_overview_tab(self):
        """Test analytics returns data needed for Overview tab"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/analytics-advanced",
            params={
                "store_name": TEST_STORE,
                "start_date": "2026-01-01",
                "end_date": "2026-12-31"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get("total_orders", 0) > 0:
            # Overview tab needs: summary, stage_distribution, avg_stage_times
            assert "summary" in data
            assert "stage_distribution" in data
    
    def test_analytics_data_for_funnel_tab(self):
        """Test analytics returns data needed for Funnel tab"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/analytics-advanced",
            params={
                "store_name": TEST_STORE,
                "start_date": "2026-01-01",
                "end_date": "2026-12-31"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get("total_orders", 0) > 0:
            # Funnel tab needs: conversion_funnel
            assert "conversion_funnel" in data
    
    def test_analytics_data_for_timeline_tab(self):
        """Test analytics returns data needed for Timeline tab"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/analytics-advanced",
            params={
                "store_name": TEST_STORE,
                "start_date": "2026-01-01",
                "end_date": "2026-12-31"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get("total_orders", 0) > 0:
            # Timeline tab needs: orders_over_time, fastest_completions
            assert "orders_over_time" in data
    
    def test_analytics_data_for_stuck_tab(self):
        """Test analytics returns data needed for Stuck tab"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/analytics-advanced",
            params={
                "store_name": TEST_STORE,
                "start_date": "2026-01-01",
                "end_date": "2026-12-31"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get("total_orders", 0) > 0:
            # Stuck tab needs: stuck_orders
            assert "stuck_orders" in data


class TestEmailNotificationConfig:
    """Test email notification configuration details"""
    
    def test_email_config_shows_not_configured(self):
        """Test that email config correctly shows SendGrid/SMTP not configured"""
        response = requests.get(f"{BASE_URL}/api/email-notifications/config")
        assert response.status_code == 200
        data = response.json()
        
        # Based on the review request, email sending is not configured
        # SendGrid and SMTP keys are not set
        assert data["sendgrid_configured"] == False or data["smtp_configured"] == False
    
    def test_email_config_has_default_from_email(self):
        """Test that email config has default from email"""
        response = requests.get(f"{BASE_URL}/api/email-notifications/config")
        assert response.status_code == 200
        data = response.json()
        
        assert data["from_email"] == "noreply@wamerce.com"
        assert data["from_name"] == "WaMerce"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
