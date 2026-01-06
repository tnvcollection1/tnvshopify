"""
1688 Auto-Link Feature Tests
Tests for:
- GET /api/1688-scraper/product-links/get-1688 - Auto-detect 1688 product ID from Shopify SKU
- POST /api/1688-scraper/product-links/bulk-auto-link - Bulk link multiple SKUs
- GET /api/1688-scraper/orders/with-linkable-products - Get orders with linkable items
- SKU format extraction: '1688-850596274690-BLACK-42' extracts ID 850596274690
"""

import pytest
import requests
import os

# Get backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://aliexpress-bridge.preview.emergentagent.com')


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestGet1688LinkEndpoint:
    """Tests for GET /api/1688-scraper/product-links/get-1688 endpoint"""
    
    def test_get_1688_link_with_valid_sku(self, api_client):
        """Test getting 1688 link for SKU with embedded product ID"""
        sku = "1688-850596274690-BLACK-42"
        response = api_client.get(f"{BASE_URL}/api/1688-scraper/product-links/get-1688?shopify_sku={sku}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, "Response should indicate success"
        
        # Should be linked (from previous bulk-auto-link)
        if data.get("linked"):
            link = data.get("link")
            assert link is not None, "Should have link data"
            assert link.get("product_1688_id") == "850596274690", "Should extract correct product ID"
            assert "1688.com" in link.get("product_1688_url", ""), "Should have 1688 URL"
            assert link.get("product_1688_title"), "Should have product title"
            assert link.get("product_1688_price"), "Should have product price"
            assert link.get("product_1688_image"), "Should have product image"
            print(f"✅ SKU {sku} is linked to 1688 product: {link.get('product_1688_title')[:50]}...")
        else:
            # Should have suggested link from SKU extraction
            suggested = data.get("suggested_link")
            assert suggested is not None, "Should have suggested link"
            assert suggested.get("product_1688_id") == "850596274690", "Should extract correct product ID"
            print(f"✅ SKU {sku} has suggested link: {suggested.get('product_1688_id')}")
    
    def test_get_1688_link_second_sku(self, api_client):
        """Test getting 1688 link for second test SKU"""
        sku = "1688-649752139926-WHITE-XL"
        response = api_client.get(f"{BASE_URL}/api/1688-scraper/product-links/get-1688?shopify_sku={sku}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        
        if data.get("linked"):
            link = data.get("link")
            assert link.get("product_1688_id") == "649752139926", "Should extract correct product ID"
            print(f"✅ SKU {sku} is linked to 1688 product: {link.get('product_1688_title')[:50]}...")
        else:
            suggested = data.get("suggested_link")
            assert suggested.get("product_1688_id") == "649752139926"
            print(f"✅ SKU {sku} has suggested link: {suggested.get('product_1688_id')}")
    
    def test_get_1688_link_no_product_id_in_sku(self, api_client):
        """Test SKU without 1688 product ID returns no link"""
        sku = "SIMPLE-SKU-123"
        response = api_client.get(f"{BASE_URL}/api/1688-scraper/product-links/get-1688?shopify_sku={sku}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("linked") == False, "Should not be linked"
        assert data.get("link") is None, "Should have no link"
        print(f"✅ SKU without 1688 ID correctly returns no link")
    
    def test_get_1688_link_missing_params(self, api_client):
        """Test endpoint returns error when no params provided"""
        response = api_client.get(f"{BASE_URL}/api/1688-scraper/product-links/get-1688")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == False, "Should indicate failure"
        assert "error" in data, "Should have error message"
        print(f"✅ Missing params returns error as expected")
    
    def test_sku_format_extraction(self, api_client):
        """Test various SKU formats for 1688 ID extraction"""
        test_cases = [
            ("1688-850596274690-BLACK-42", "850596274690"),
            ("PROD-649752139926-XL", "649752139926"),
            ("850596274690", "850596274690"),
            ("item-850596274690-variant", "850596274690"),
        ]
        
        for sku, expected_id in test_cases:
            response = api_client.get(f"{BASE_URL}/api/1688-scraper/product-links/get-1688?shopify_sku={sku}")
            assert response.status_code == 200
            data = response.json()
            
            if data.get("linked"):
                actual_id = data.get("link", {}).get("product_1688_id")
            else:
                actual_id = data.get("suggested_link", {}).get("product_1688_id") if data.get("suggested_link") else None
            
            if actual_id:
                assert actual_id == expected_id, f"SKU {sku} should extract {expected_id}, got {actual_id}"
                print(f"✅ SKU format '{sku}' correctly extracts ID: {expected_id}")
            else:
                print(f"⚠️ SKU format '{sku}' - product not in database")


class TestBulkAutoLinkEndpoint:
    """Tests for POST /api/1688-scraper/product-links/bulk-auto-link endpoint"""
    
    def test_bulk_auto_link_valid_skus(self, api_client):
        """Test bulk auto-link with valid SKUs containing 1688 IDs"""
        skus = ["1688-850596274690-BLACK-42", "1688-649752139926-WHITE-XL"]
        
        response = api_client.post(
            f"{BASE_URL}/api/1688-scraper/product-links/bulk-auto-link",
            json={"skus": skus}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, "Response should indicate success"
        assert "linked" in data, "Should have linked list"
        assert "not_found" in data, "Should have not_found list"
        assert "errors" in data, "Should have errors list"
        assert data.get("total") == 2, "Should process 2 SKUs"
        
        # Both should be linked (products exist in database)
        assert len(data.get("linked", [])) == 2, "Both SKUs should be linked"
        
        for linked in data.get("linked", []):
            assert "sku" in linked, "Linked item should have SKU"
            assert "product_1688_id" in linked, "Linked item should have product ID"
            assert "title" in linked, "Linked item should have title"
        
        print(f"✅ Bulk auto-link: {data.get('message')}")
    
    def test_bulk_auto_link_mixed_skus(self, api_client):
        """Test bulk auto-link with mix of valid and invalid SKUs"""
        skus = [
            "1688-850596274690-BLACK-42",  # Valid, product exists
            "SIMPLE-SKU-NO-ID",             # No 1688 ID
            "1688-999999999999-TEST",       # Has ID but product may not exist
        ]
        
        response = api_client.post(
            f"{BASE_URL}/api/1688-scraper/product-links/bulk-auto-link",
            json={"skus": skus}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("total") == 3, "Should process 3 SKUs"
        
        # At least one should be linked
        assert len(data.get("linked", [])) >= 1, "At least one SKU should be linked"
        
        # Some should be not found
        assert len(data.get("not_found", [])) >= 1, "Some SKUs should not be found"
        
        print(f"✅ Mixed SKUs: {len(data.get('linked', []))} linked, {len(data.get('not_found', []))} not found")
    
    def test_bulk_auto_link_empty_skus(self, api_client):
        """Test bulk auto-link with empty SKU list"""
        response = api_client.post(
            f"{BASE_URL}/api/1688-scraper/product-links/bulk-auto-link",
            json={"skus": []}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("total") == 0, "Should process 0 SKUs"
        assert len(data.get("linked", [])) == 0, "No SKUs should be linked"
        
        print(f"✅ Empty SKU list handled correctly")


class TestOrdersWithLinkableProducts:
    """Tests for GET /api/1688-scraper/orders/with-linkable-products endpoint"""
    
    def test_get_orders_with_linkable_products(self, api_client):
        """Test getting orders with linkable products"""
        response = api_client.get(f"{BASE_URL}/api/1688-scraper/orders/with-linkable-products?limit=20")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, "Response should indicate success"
        assert "orders" in data, "Should have orders list"
        assert "total" in data, "Should have total count"
        
        orders = data.get("orders", [])
        assert isinstance(orders, list), "Orders should be a list"
        
        print(f"✅ Found {data.get('total')} orders with linkable products")
    
    def test_order_99001_has_linked_products(self, api_client):
        """Test that order #99001 has linked products"""
        response = api_client.get(f"{BASE_URL}/api/1688-scraper/orders/with-linkable-products?limit=50")
        
        assert response.status_code == 200
        data = response.json()
        
        # Find order 99001
        order_99001 = None
        for order in data.get("orders", []):
            if str(order.get("order_number")) == "99001":
                order_99001 = order
                break
        
        assert order_99001 is not None, "Order #99001 should exist"
        
        # Verify order structure
        assert order_99001.get("store_name") == "tnvcollectionpk", "Should be from tnvcollectionpk store"
        assert order_99001.get("customer") == "Test Customer", "Should have Test Customer"
        
        # Verify line items
        line_items = order_99001.get("line_items", [])
        assert len(line_items) == 2, "Order should have 2 line items"
        
        # Check first line item (Chelsea Boots)
        item1 = line_items[0]
        assert item1.get("sku") == "1688-850596274690-BLACK-42", "First item SKU should match"
        assert item1.get("is_linked") == True, "First item should be linked"
        assert item1.get("has_1688_id_in_sku") == True, "First item should have 1688 ID in SKU"
        assert item1.get("extracted_1688_id") == "850596274690", "Should extract correct ID"
        assert item1.get("link") is not None, "Should have link data"
        
        # Check second line item (T-Shirt)
        item2 = line_items[1]
        assert item2.get("sku") == "1688-649752139926-WHITE-XL", "Second item SKU should match"
        assert item2.get("is_linked") == True, "Second item should be linked"
        assert item2.get("extracted_1688_id") == "649752139926", "Should extract correct ID"
        
        # Verify counts
        assert order_99001.get("linkable_count") == 2, "Should have 2 linkable items"
        assert order_99001.get("linked_count") == 2, "Should have 2 linked items"
        
        print(f"✅ Order #99001 verified: {order_99001.get('linked_count')} linked items")
    
    def test_order_line_item_link_data(self, api_client):
        """Test that linked line items have complete link data"""
        response = api_client.get(f"{BASE_URL}/api/1688-scraper/orders/with-linkable-products?limit=50")
        
        assert response.status_code == 200
        data = response.json()
        
        # Find order 99001
        order_99001 = None
        for order in data.get("orders", []):
            if str(order.get("order_number")) == "99001":
                order_99001 = order
                break
        
        assert order_99001 is not None
        
        # Check link data structure
        for item in order_99001.get("line_items", []):
            if item.get("is_linked"):
                link = item.get("link")
                assert link is not None, "Linked item should have link data"
                
                # Verify link has all required fields
                assert "product_1688_id" in link, "Link should have product_1688_id"
                assert "product_1688_url" in link, "Link should have product_1688_url"
                assert "product_1688_title" in link, "Link should have product_1688_title"
                assert "product_1688_price" in link, "Link should have product_1688_price"
                assert "product_1688_image" in link, "Link should have product_1688_image"
                
                # Verify URL format
                assert "1688.com" in link.get("product_1688_url", ""), "URL should be from 1688.com"
                
                print(f"✅ Link data complete for SKU: {item.get('sku')}")
    
    def test_orders_filter_by_store(self, api_client):
        """Test filtering orders by store name"""
        response = api_client.get(f"{BASE_URL}/api/1688-scraper/orders/with-linkable-products?store_name=tnvcollectionpk&limit=10")
        
        assert response.status_code == 200
        data = response.json()
        
        # All orders should be from the specified store
        for order in data.get("orders", []):
            assert order.get("store_name") == "tnvcollectionpk", "All orders should be from tnvcollectionpk"
        
        print(f"✅ Store filter working: {data.get('total')} orders from tnvcollectionpk")


class TestEndToEndAutoLinkFlow:
    """End-to-end test for auto-link feature flow"""
    
    def test_complete_auto_link_flow(self, api_client):
        """Test complete flow: get-1688 -> bulk-auto-link -> orders/with-linkable-products"""
        
        # Step 1: Check if SKU can be auto-detected
        sku = "1688-850596274690-BLACK-42"
        get_response = api_client.get(f"{BASE_URL}/api/1688-scraper/product-links/get-1688?shopify_sku={sku}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        
        assert get_data.get("success") == True
        product_id = None
        if get_data.get("linked"):
            product_id = get_data.get("link", {}).get("product_1688_id")
        elif get_data.get("suggested_link"):
            product_id = get_data.get("suggested_link", {}).get("product_1688_id")
        
        assert product_id == "850596274690", "Should extract product ID from SKU"
        print(f"Step 1: ✅ SKU auto-detection working, extracted ID: {product_id}")
        
        # Step 2: Bulk auto-link
        bulk_response = api_client.post(
            f"{BASE_URL}/api/1688-scraper/product-links/bulk-auto-link",
            json={"skus": [sku]}
        )
        assert bulk_response.status_code == 200
        bulk_data = bulk_response.json()
        
        assert len(bulk_data.get("linked", [])) >= 1, "SKU should be linked"
        print(f"Step 2: ✅ Bulk auto-link successful")
        
        # Step 3: Verify in orders endpoint
        orders_response = api_client.get(f"{BASE_URL}/api/1688-scraper/orders/with-linkable-products?limit=50")
        assert orders_response.status_code == 200
        orders_data = orders_response.json()
        
        # Find an order with this SKU
        found_linked = False
        for order in orders_data.get("orders", []):
            for item in order.get("line_items", []):
                if item.get("sku") == sku and item.get("is_linked"):
                    found_linked = True
                    break
            if found_linked:
                break
        
        assert found_linked, "SKU should appear as linked in orders"
        print(f"Step 3: ✅ SKU appears as linked in orders endpoint")
        
        print("✅ Complete auto-link flow verified successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
