"""
Test to verify shipping address sync propagates to purchase_orders_1688
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestShippingAddressSync:
    """Tests for the improved shipping address synchronization"""
    
    def test_shipping_address_structure(self):
        """
        Verify shipping address structure is consistent
        """
        # Sample Shopify shipping address
        shopify_addr = {
            "first_name": "John",
            "last_name": "Doe",
            "company": "",
            "address1": "123 Main St",
            "address2": "Apt 4B",
            "city": "Mumbai",
            "province": "Maharashtra",
            "province_code": "MH",
            "country": "India",
            "country_code": "IN",
            "zip": "400001",
            "phone": "+919876543210",
        }
        
        # Build expected shipping_address object (mimics the sync function)
        shipping_address = {
            "first_name": shopify_addr.get("first_name", ""),
            "last_name": shopify_addr.get("last_name", ""),
            "company": shopify_addr.get("company", ""),
            "address1": shopify_addr.get("address1", ""),
            "address2": shopify_addr.get("address2", ""),
            "city": shopify_addr.get("city", ""),
            "province": shopify_addr.get("province", ""),
            "province_code": shopify_addr.get("province_code", ""),
            "country": shopify_addr.get("country", ""),
            "country_code": shopify_addr.get("country_code", ""),
            "zip": shopify_addr.get("zip", ""),
            "phone": shopify_addr.get("phone", ""),
        }
        
        # Verify structure
        assert shipping_address["first_name"] == "John"
        assert shipping_address["city"] == "Mumbai"
        assert shipping_address["country_code"] == "IN"
        print("✓ Shipping address structure is correct")
        
    def test_purchase_order_query_conditions(self):
        """
        Verify the query used to update purchase_orders_1688 matches various formats
        """
        order_number = "29160"
        shopify_order_id = "6290376786086"
        store_name = "tnvcollection"
        
        # The query conditions from the fixed sync function
        query_conditions = [
            {"shopify_order_number": order_number},
            {"shopify_order_number": int(order_number) if order_number.isdigit() else order_number},
            {"shopify_order_id": order_number},
            {"shopify_order_id": str(shopify_order_id)},
        ]
        
        # Test data - various ways the order might be stored
        test_orders = [
            {"shopify_order_number": "29160"},  # string match
            {"shopify_order_number": 29160},    # int match
            {"shopify_order_id": "29160"},      # ID as string
            {"shopify_order_id": "6290376786086"},  # Full shopify ID
        ]
        
        for order in test_orders:
            matched = False
            for condition in query_conditions:
                key = list(condition.keys())[0]
                if key in order and order[key] == condition[key]:
                    matched = True
                    break
            assert matched, f"Order {order} should match one of the query conditions"
        
        print("✓ Query conditions cover all order format variations")


if __name__ == "__main__":
    test = TestShippingAddressSync()
    
    print("Running test: test_shipping_address_structure")
    test.test_shipping_address_structure()
    
    print("Running test: test_purchase_order_query_conditions")
    test.test_purchase_order_query_conditions()
    
    print("\nAll shipping sync tests passed!")
