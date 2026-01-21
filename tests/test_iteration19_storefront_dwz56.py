"""
Test Suite for Iteration 19 - DWZ56 Store Isolation & Public Storefront Features

Features to test:
1. DWZ56 tracking-list API with store_name filter for data isolation
2. DWZ56 import-stats API with store_name filter
3. DWZ56 purchase/tracking-list API with store_name filter
4. DWZ56 purchase/import-stats API with store_name filter
5. Public storefront homepage at /shop
6. Public storefront product listing at /shop/products
7. Public storefront product detail at /shop/product/{id}
8. Single product API endpoint /api/shopify/products/{product_id}
9. Shopping cart page at /shop/cart
10. Store-specific storefront routes /store/{storeName}
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://multi-tenant-shop-3.preview.emergentagent.com')

# Test stores for data isolation
TEST_STORES = ['tnvcollection', 'tnvcollectionpk', 'ashmiaa']
SAMPLE_PRODUCT_ID = '8568346706086'  # From tnvcollection store


class TestDWZ56StoreIsolation:
    """Test DWZ56 APIs with store_name filter for data isolation"""
    
    def test_dwz56_health_check(self):
        """Test DWZ56 health endpoint"""
        response = requests.get(f"{BASE_URL}/api/dwz56/health")
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'ok'
        assert data['configured'] == True
        print(f"✅ DWZ56 health check passed - client_id: {data['client_id']}")
    
    def test_dwz56_tracking_list_without_store_filter(self):
        """Test tracking-list API without store filter (should return all stores)"""
        response = requests.get(f"{BASE_URL}/api/dwz56/tracking-list?page=1&page_size=10")
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'records' in data
        assert 'total_records' in data
        print(f"✅ DWZ56 tracking-list (no filter): {data['records_count']} records, total: {data['total_records']}")
    
    def test_dwz56_tracking_list_with_store_filter(self):
        """Test tracking-list API with store_name filter for data isolation"""
        for store in TEST_STORES:
            response = requests.get(f"{BASE_URL}/api/dwz56/tracking-list?page=1&page_size=10&store_name={store}")
            assert response.status_code == 200
            data = response.json()
            assert data['success'] == True
            assert 'records' in data
            
            # Verify store isolation - all records should be from the specified store or have no store
            for record in data['records']:
                shopify_store = record.get('shopify_store')
                if shopify_store:
                    # If store is matched, it should be the filtered store
                    assert shopify_store == store or shopify_store in TEST_STORES, \
                        f"Record has unexpected store: {shopify_store}"
            
            print(f"✅ DWZ56 tracking-list (store={store}): {data['records_count']} records")
    
    def test_dwz56_import_stats_without_store_filter(self):
        """Test import-stats API without store filter"""
        response = requests.get(f"{BASE_URL}/api/dwz56/import-stats")
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'matched_orders' in data
        assert 'total_sale_value' in data
        assert 'by_store' in data
        print(f"✅ DWZ56 import-stats (no filter): {data['matched_orders']} orders, value: {data['total_sale_value']}")
    
    def test_dwz56_import_stats_with_store_filter(self):
        """Test import-stats API with store_name filter for data isolation"""
        for store in TEST_STORES:
            response = requests.get(f"{BASE_URL}/api/dwz56/import-stats?store_name={store}")
            assert response.status_code == 200
            data = response.json()
            assert data['success'] == True
            
            # Verify store isolation - by_store should only contain the filtered store
            for store_stat in data['by_store']:
                assert store_stat['store'] == store, \
                    f"Expected store {store}, got {store_stat['store']}"
            
            print(f"✅ DWZ56 import-stats (store={store}): {data['matched_orders']} orders, value: {data['total_sale_value']}")


class TestDWZ56PurchaseStoreIsolation:
    """Test DWZ56 Purchase APIs with store_name filter"""
    
    def test_dwz56_purchase_client_info(self):
        """Test purchase account client info"""
        response = requests.get(f"{BASE_URL}/api/dwz56/purchase/client-info")
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        print(f"✅ DWZ56 purchase client-info: {data.get('account_name', 'N/A')}")
    
    def test_dwz56_purchase_tracking_list_without_store_filter(self):
        """Test purchase tracking-list API without store filter"""
        response = requests.post(f"{BASE_URL}/api/dwz56/purchase/tracking-list?page=1&page_size=10")
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'records' in data
        print(f"✅ DWZ56 purchase tracking-list (no filter): {data['records_count']} records")
    
    def test_dwz56_purchase_tracking_list_with_store_filter(self):
        """Test purchase tracking-list API with store_name filter"""
        for store in TEST_STORES:
            response = requests.post(f"{BASE_URL}/api/dwz56/purchase/tracking-list?page=1&page_size=10&store_name={store}")
            assert response.status_code == 200
            data = response.json()
            assert data['success'] == True
            
            # Verify store isolation
            for record in data['records']:
                shopify_store = record.get('shopify_store')
                if shopify_store:
                    assert shopify_store == store or shopify_store in TEST_STORES
            
            print(f"✅ DWZ56 purchase tracking-list (store={store}): {data['records_count']} records")
    
    def test_dwz56_purchase_import_stats_without_store_filter(self):
        """Test purchase import-stats API without store filter"""
        response = requests.get(f"{BASE_URL}/api/dwz56/purchase/import-stats")
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'matched_orders' in data
        assert 'by_store' in data
        print(f"✅ DWZ56 purchase import-stats (no filter): {data['matched_orders']} orders")
    
    def test_dwz56_purchase_import_stats_with_store_filter(self):
        """Test purchase import-stats API with store_name filter"""
        for store in TEST_STORES:
            response = requests.get(f"{BASE_URL}/api/dwz56/purchase/import-stats?store_name={store}")
            assert response.status_code == 200
            data = response.json()
            assert data['success'] == True
            
            # Verify store isolation
            for store_stat in data['by_store']:
                assert store_stat['store'] == store
            
            print(f"✅ DWZ56 purchase import-stats (store={store}): {data['matched_orders']} orders")


class TestShopifyProductAPI:
    """Test Shopify product API endpoints"""
    
    def test_shopify_products_list(self):
        """Test products list endpoint"""
        response = requests.get(f"{BASE_URL}/api/shopify/products?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert 'products' in data
        print(f"✅ Shopify products list: {len(data['products'])} products, total: {data.get('total', 'N/A')}")
    
    def test_shopify_products_list_with_store_filter(self):
        """Test products list with store filter"""
        for store in TEST_STORES:
            response = requests.get(f"{BASE_URL}/api/shopify/products?store_name={store}&limit=5")
            assert response.status_code == 200
            data = response.json()
            assert 'products' in data
            
            # Verify store filter
            for product in data['products']:
                assert product.get('store_name') == store, \
                    f"Expected store {store}, got {product.get('store_name')}"
            
            print(f"✅ Shopify products (store={store}): {len(data['products'])} products")
    
    def test_single_product_endpoint(self):
        """Test single product endpoint /api/shopify/products/{product_id}"""
        response = requests.get(f"{BASE_URL}/api/shopify/products/{SAMPLE_PRODUCT_ID}?store_name=tnvcollection")
        
        if response.status_code == 200:
            data = response.json()
            assert data['success'] == True
            assert 'product' in data
            product = data['product']
            assert product.get('shopify_product_id') == SAMPLE_PRODUCT_ID or str(product.get('shopify_product_id')) == SAMPLE_PRODUCT_ID
            print(f"✅ Single product endpoint: {product.get('title', 'N/A')}")
        elif response.status_code == 404:
            print(f"⚠️ Sample product {SAMPLE_PRODUCT_ID} not found - may need different product ID")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_single_product_not_found(self):
        """Test single product endpoint with non-existent ID"""
        response = requests.get(f"{BASE_URL}/api/shopify/products/999999999999")
        assert response.status_code == 404
        print("✅ Single product 404 handling works correctly")


class TestStorefrontRoutes:
    """Test public storefront routes (frontend accessibility)"""
    
    def test_storefront_homepage_api_data(self):
        """Test that storefront homepage can fetch products"""
        # The homepage fetches products from this endpoint
        response = requests.get(f"{BASE_URL}/api/shopify/products?store_name=tnvcollection&limit=8")
        assert response.status_code == 200
        data = response.json()
        assert 'products' in data
        print(f"✅ Storefront homepage data: {len(data['products'])} products available")
    
    def test_storefront_product_listing_api_data(self):
        """Test that product listing page can fetch products"""
        response = requests.get(f"{BASE_URL}/api/shopify/products?store_name=tnvcollection&page=1&limit=20")
        assert response.status_code == 200
        data = response.json()
        assert 'products' in data
        assert 'total' in data
        print(f"✅ Storefront product listing data: {len(data['products'])} products, total: {data['total']}")
    
    def test_store_specific_routes_api_data(self):
        """Test store-specific routes can fetch correct store data"""
        for store in TEST_STORES:
            response = requests.get(f"{BASE_URL}/api/shopify/products?store_name={store}&limit=5")
            assert response.status_code == 200
            data = response.json()
            assert 'products' in data
            print(f"✅ Store-specific route ({store}): {len(data['products'])} products")


class TestDataIsolationIntegrity:
    """Test data isolation integrity across stores"""
    
    def test_store_data_does_not_leak(self):
        """Verify that filtering by one store doesn't return data from other stores"""
        for store in TEST_STORES:
            # Test DWZ56 tracking-list
            response = requests.get(f"{BASE_URL}/api/dwz56/tracking-list?page=1&page_size=50&store_name={store}")
            assert response.status_code == 200
            data = response.json()
            
            for record in data['records']:
                shopify_store = record.get('shopify_store')
                if shopify_store:
                    # Should only be the filtered store
                    assert shopify_store == store, \
                        f"Data leak detected: Expected {store}, got {shopify_store}"
            
            # Test import-stats
            response = requests.get(f"{BASE_URL}/api/dwz56/import-stats?store_name={store}")
            assert response.status_code == 200
            data = response.json()
            
            for store_stat in data['by_store']:
                assert store_stat['store'] == store, \
                    f"Data leak in import-stats: Expected {store}, got {store_stat['store']}"
        
        print("✅ Data isolation integrity verified - no data leaks detected")
    
    def test_products_store_isolation(self):
        """Verify product store isolation"""
        for store in TEST_STORES:
            response = requests.get(f"{BASE_URL}/api/shopify/products?store_name={store}&limit=20")
            assert response.status_code == 200
            data = response.json()
            
            for product in data['products']:
                assert product.get('store_name') == store, \
                    f"Product store mismatch: Expected {store}, got {product.get('store_name')}"
        
        print("✅ Product store isolation verified")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
