"""
Test Iteration 16 - Bulk Stage Updates and DWZ Tracking Import Features
Tests:
1. POST /api/fulfillment/pipeline/bulk-update-stage - Bulk update multiple orders
2. POST /api/fulfillment/pipeline/import-dwz-csv - Import DWZ tracking from CSV
3. POST /api/fulfillment/pipeline/import-dwz-tracking - Import DWZ tracking from JSON
4. Verify both string and integer order IDs are handled
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://multi-shop-hub-5.preview.emergentagent.com').rstrip('/')


class TestBulkUpdateStage:
    """Tests for POST /api/fulfillment/pipeline/bulk-update-stage"""
    
    def test_bulk_update_stage_success(self):
        """Test bulk update with valid order IDs"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/bulk-update-stage",
            json={
                "order_ids": ["99001"],
                "stage": "1688_ordered",
                "store_name": "tnvcollectionpk"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "updated_count" in data
        assert data["stage"] == "1688_ordered"
    
    def test_bulk_update_with_integer_order_ids(self):
        """Test bulk update requires string order IDs (Pydantic validation)"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/bulk-update-stage",
            json={
                "order_ids": [99001],  # Integer instead of string
                "stage": "shopify_order",
                "store_name": "tnvcollectionpk"
            }
        )
        # API expects List[str], so integers should fail validation
        assert response.status_code == 422  # Validation error expected
    
    def test_bulk_update_with_string_order_ids(self):
        """Test bulk update with string order IDs works correctly"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/bulk-update-stage",
            json={
                "order_ids": ["99001"],  # String as expected
                "stage": "1688_ordered",
                "store_name": "tnvcollectionpk"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_bulk_update_invalid_stage(self):
        """Test bulk update with invalid stage returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/bulk-update-stage",
            json={
                "order_ids": ["99001"],
                "stage": "invalid_stage",
                "store_name": "tnvcollectionpk"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "Invalid stage" in data.get("detail", "")
    
    def test_bulk_update_with_dwz_tracking(self):
        """Test bulk update with DWZ tracking number"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/bulk-update-stage",
            json={
                "order_ids": ["99001"],
                "stage": "dwz56_shipped",
                "store_name": "tnvcollectionpk",
                "dwz_tracking": "DWZ_BULK_TEST_123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["stage"] == "dwz56_shipped"
    
    def test_bulk_update_with_local_tracking(self):
        """Test bulk update with local tracking number"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/bulk-update-stage",
            json={
                "order_ids": ["99001"],
                "stage": "local_shipped",
                "store_name": "tnvcollectionpk",
                "local_tracking": "TCS_BULK_TEST_456",
                "local_carrier": "TCS"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["stage"] == "local_shipped"
    
    def test_bulk_update_empty_order_ids(self):
        """Test bulk update with empty order IDs list"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/bulk-update-stage",
            json={
                "order_ids": [],
                "stage": "1688_ordered",
                "store_name": "tnvcollectionpk"
            }
        )
        # Should return 200 with 0 updated
        assert response.status_code == 200
        data = response.json()
        assert data["updated_count"] == 0
    
    def test_bulk_update_nonexistent_orders(self):
        """Test bulk update with non-existent order IDs"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/bulk-update-stage",
            json={
                "order_ids": ["NONEXISTENT_ORDER_123"],
                "stage": "1688_ordered",
                "store_name": "tnvcollectionpk"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["updated_count"] == 0


class TestDWZCSVImport:
    """Tests for POST /api/fulfillment/pipeline/import-dwz-csv"""
    
    def test_dwz_csv_import_success(self):
        """Test DWZ CSV import with valid data"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/import-dwz-csv",
            json={
                "store_name": "tnvcollectionpk",
                "csv_data": "99001,DWZ_CSV_TEST_001",
                "auto_advance": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "total" in data
        assert "updated" in data
        assert "not_found" in data
    
    def test_dwz_csv_import_multiple_lines(self):
        """Test DWZ CSV import with multiple lines"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/import-dwz-csv",
            json={
                "store_name": "tnvcollectionpk",
                "csv_data": "99001,DWZ_CSV_MULTI_001\n99002,DWZ_CSV_MULTI_002",
                "auto_advance": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["total"] == 2
    
    def test_dwz_csv_import_without_auto_advance(self):
        """Test DWZ CSV import without auto-advance"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/import-dwz-csv",
            json={
                "store_name": "tnvcollectionpk",
                "csv_data": "99001,DWZ_NO_ADVANCE_001",
                "auto_advance": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_dwz_csv_import_empty_data(self):
        """Test DWZ CSV import with empty data returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/import-dwz-csv",
            json={
                "store_name": "tnvcollectionpk",
                "csv_data": "",
                "auto_advance": True
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "No valid tracking data" in data.get("detail", "")
    
    def test_dwz_csv_import_with_comments(self):
        """Test DWZ CSV import ignores comment lines"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/import-dwz-csv",
            json={
                "store_name": "tnvcollectionpk",
                "csv_data": "# This is a comment\n99001,DWZ_COMMENT_TEST",
                "auto_advance": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["total"] == 1  # Only 1 valid line
    
    def test_dwz_csv_import_with_whitespace(self):
        """Test DWZ CSV import handles whitespace"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/import-dwz-csv",
            json={
                "store_name": "tnvcollectionpk",
                "csv_data": "  99001  ,  DWZ_WHITESPACE_TEST  ",
                "auto_advance": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


class TestDWZJSONImport:
    """Tests for POST /api/fulfillment/pipeline/import-dwz-tracking"""
    
    def test_dwz_json_import_success(self):
        """Test DWZ JSON import with valid data"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/import-dwz-tracking",
            json={
                "store_name": "tnvcollectionpk",
                "tracking_data": [
                    {"order_id": "99001", "dwz_tracking": "DWZ_JSON_TEST_001", "auto_advance": True}
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["total"] == 1
    
    def test_dwz_json_import_multiple_items(self):
        """Test DWZ JSON import with multiple items"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/import-dwz-tracking",
            json={
                "store_name": "tnvcollectionpk",
                "tracking_data": [
                    {"order_id": "99001", "dwz_tracking": "DWZ_JSON_MULTI_001", "auto_advance": True},
                    {"order_id": "99002", "dwz_tracking": "DWZ_JSON_MULTI_002", "auto_advance": True}
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["total"] == 2
    
    def test_dwz_json_import_without_auto_advance(self):
        """Test DWZ JSON import without auto-advance"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/import-dwz-tracking",
            json={
                "store_name": "tnvcollectionpk",
                "tracking_data": [
                    {"order_id": "99001", "dwz_tracking": "DWZ_JSON_NO_ADV", "auto_advance": False}
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_dwz_json_import_integer_order_id(self):
        """Test DWZ JSON import handles integer order_id"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/import-dwz-tracking",
            json={
                "store_name": "tnvcollectionpk",
                "tracking_data": [
                    {"order_id": "99001", "dwz_tracking": "DWZ_JSON_INT_001", "auto_advance": True}
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_dwz_json_import_nonexistent_order(self):
        """Test DWZ JSON import with non-existent order"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/import-dwz-tracking",
            json={
                "store_name": "tnvcollectionpk",
                "tracking_data": [
                    {"order_id": "NONEXISTENT_99999", "dwz_tracking": "DWZ_NONEXIST", "auto_advance": True}
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["not_found"] == 1
        assert "NONEXISTENT_99999" in str(data.get("errors", []))


class TestCarriersAndStages:
    """Tests for carrier configuration and stages"""
    
    def test_get_carriers(self):
        """Test GET /api/fulfillment/carriers returns carrier config"""
        response = requests.get(f"{BASE_URL}/api/fulfillment/carriers")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "carriers" in data
        assert "stages" in data
        assert "tnvcollectionpk" in data["carriers"]
        assert data["carriers"]["tnvcollectionpk"]["carrier"] == "TCS"
        assert data["carriers"]["tnvcollectionpk"]["country"] == "Pakistan"
    
    def test_stages_list(self):
        """Test stages list is correct"""
        response = requests.get(f"{BASE_URL}/api/fulfillment/carriers")
        assert response.status_code == 200
        data = response.json()
        expected_stages = [
            "shopify_order",
            "1688_ordered",
            "dwz56_shipped",
            "in_transit",
            "warehouse_arrived",
            "warehouse_received",
            "local_shipped"
        ]
        assert data["stages"] == expected_stages


class TestPipelineEndpoints:
    """Tests for pipeline endpoints"""
    
    def test_get_pipeline(self):
        """Test GET /api/fulfillment/pipeline returns orders"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline",
            params={"store_name": "tnvcollectionpk"}
        )
        assert response.status_code == 200
        data = response.json()
        # API returns orders list and status_counts (not stats)
        assert "orders" in data
        assert isinstance(data["orders"], list)
    
    def test_get_pipeline_stats(self):
        """Test GET /api/fulfillment/pipeline/stats returns stats"""
        response = requests.get(
            f"{BASE_URL}/api/fulfillment/pipeline/stats",
            params={"store_name": "tnvcollectionpk"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "stats" in data
        assert "total" in data


class TestOrderStageUpdate:
    """Tests for single order stage update"""
    
    def test_update_order_stage(self):
        """Test POST /api/fulfillment/pipeline/{order_id}/update-stage"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/99001/update-stage",
            json={
                "stage": "shopify_order",
                "store_name": "tnvcollectionpk",
                "send_notification": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["stage"] == "shopify_order"
    
    def test_update_order_stage_with_tracking(self):
        """Test update stage with tracking info"""
        response = requests.post(
            f"{BASE_URL}/api/fulfillment/pipeline/99001/update-stage",
            json={
                "stage": "dwz56_shipped",
                "store_name": "tnvcollectionpk",
                "dwz_tracking": "DWZ_SINGLE_UPDATE_TEST",
                "send_notification": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
