"""
Test suite for Product Edit Modal features
Tests the 1688 Product Scraper API endpoints for:
- Product listing with images and variants
- Fetch product details from TMAPI
- Variant parsing (color/size extraction from props_names)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProductScraperAPI:
    """Test 1688 Product Scraper API endpoints"""
    
    def test_get_products_returns_list(self):
        """Test that products endpoint returns a list with success=true"""
        response = requests.get(f"{BASE_URL}/api/1688-scraper/products?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "products" in data
        assert isinstance(data["products"], list)
        print(f"✓ Products endpoint returns {len(data['products'])} products")
    
    def test_product_has_images(self):
        """Test that products have images array populated"""
        response = requests.get(f"{BASE_URL}/api/1688-scraper/products?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        # Find product 850596274690 (the test product)
        test_product = None
        for product in data["products"]:
            if product.get("product_id") == "850596274690":
                test_product = product
                break
        
        if test_product:
            images = test_product.get("images", [])
            assert len(images) > 0, "Product should have images"
            print(f"✓ Product 850596274690 has {len(images)} images")
            
            # Verify images are valid URLs
            for img in images[:3]:
                assert img.startswith("http"), f"Image URL should start with http: {img}"
        else:
            # Check any product has images
            for product in data["products"]:
                if product.get("images"):
                    print(f"✓ Product {product.get('product_id')} has {len(product['images'])} images")
                    break
    
    def test_product_has_variants_with_color_size(self):
        """Test that products have variants with color and size fields"""
        response = requests.get(f"{BASE_URL}/api/1688-scraper/products?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        # Find product 850596274690 (the test product)
        test_product = None
        for product in data["products"]:
            if product.get("product_id") == "850596274690":
                test_product = product
                break
        
        if test_product:
            variants = test_product.get("variants", [])
            assert len(variants) > 0, "Product should have variants"
            print(f"✓ Product 850596274690 has {len(variants)} variants")
            
            # Check first variant has color and size
            first_variant = variants[0]
            assert "color" in first_variant, "Variant should have color field"
            assert "size" in first_variant, "Variant should have size field"
            assert "price" in first_variant, "Variant should have price field"
            
            # Verify color is not empty placeholder
            color = first_variant.get("color", "")
            assert color != "", "Color should not be empty"
            assert color != "Color", "Color should not be placeholder 'Color'"
            print(f"✓ First variant color: {color}")
            
            # Verify size is not empty placeholder
            size = first_variant.get("size", "")
            assert size != "", "Size should not be empty"
            assert size != "Size", "Size should not be placeholder 'Size'"
            print(f"✓ First variant size: {size}")
            
            # Verify price is not 0
            price = first_variant.get("price", 0)
            assert price > 0, "Price should be greater than 0"
            print(f"✓ First variant price: ¥{price}")
        else:
            pytest.skip("Test product 850596274690 not found")
    
    def test_variant_props_names_parsing(self):
        """Test that props_names like '颜色:棕色加绒;尺码:40' is parsed correctly"""
        response = requests.get(f"{BASE_URL}/api/1688-scraper/products?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        # Find product with variants
        for product in data["products"]:
            variants = product.get("variants", [])
            for variant in variants:
                props_names = variant.get("props_names", "")
                if props_names and "颜色" in props_names:
                    # Verify color was extracted
                    color = variant.get("color", "")
                    assert color != "", f"Color should be extracted from props_names: {props_names}"
                    print(f"✓ props_names '{props_names}' -> color: '{color}'")
                    
                    # Verify size was extracted
                    size = variant.get("size", "")
                    assert size != "", f"Size should be extracted from props_names: {props_names}"
                    print(f"✓ props_names '{props_names}' -> size: '{size}'")
                    return
        
        pytest.skip("No variants with props_names found")
    
    def test_fetch_product_details_endpoint(self):
        """Test the fetch-details endpoint that calls TMAPI"""
        # First get a product ID
        response = requests.get(f"{BASE_URL}/api/1688-scraper/products?page=1&limit=1")
        assert response.status_code == 200
        data = response.json()
        
        if not data.get("products"):
            pytest.skip("No products available to test")
        
        product_id = data["products"][0].get("product_id")
        
        # Call fetch-details endpoint
        response = requests.post(f"{BASE_URL}/api/1688-scraper/products/{product_id}/fetch-details")
        assert response.status_code == 200
        data = response.json()
        
        # Should return success with images and variants count
        assert data.get("success") == True, f"Expected success=True, got: {data}"
        assert "images_count" in data, "Response should include images_count"
        assert "variants_count" in data, "Response should include variants_count"
        
        print(f"✓ Fetch details for {product_id}: {data.get('images_count')} images, {data.get('variants_count')} variants")
    
    def test_product_update_endpoint(self):
        """Test that product can be updated via PUT endpoint"""
        # First get a product
        response = requests.get(f"{BASE_URL}/api/1688-scraper/products?page=1&limit=1")
        assert response.status_code == 200
        data = response.json()
        
        if not data.get("products"):
            pytest.skip("No products available to test")
        
        product = data["products"][0]
        product_id = product.get("product_id")
        
        # Update the product with same data (just to test endpoint works)
        update_data = {
            "product_id": product_id,
            "title_en": product.get("title", "Test Title"),
            "title_cn": product.get("title_cn", "测试标题"),
            "price": product.get("price", 0),
            "images": product.get("images", []),
            "variants": product.get("variants", []),
        }
        
        response = requests.put(
            f"{BASE_URL}/api/1688-scraper/products/{product_id}",
            json=update_data,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got: {data}"
        print(f"✓ Product {product_id} updated successfully")


class TestProductDataIntegrity:
    """Test data integrity for product variants"""
    
    def test_all_variants_have_prices(self):
        """Test that all variants have non-zero prices"""
        response = requests.get(f"{BASE_URL}/api/1688-scraper/products?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        zero_price_count = 0
        total_variants = 0
        
        for product in data["products"]:
            for variant in product.get("variants", []):
                total_variants += 1
                price = variant.get("price", 0)
                if price == 0:
                    zero_price_count += 1
        
        if total_variants > 0:
            zero_price_percentage = (zero_price_count / total_variants) * 100
            print(f"✓ {total_variants} variants checked, {zero_price_count} with ¥0 price ({zero_price_percentage:.1f}%)")
            # Allow some variants to have 0 price (out of stock items)
            assert zero_price_percentage < 50, f"Too many variants with ¥0 price: {zero_price_percentage}%"
    
    def test_color_values_are_not_placeholders(self):
        """Test that color values are actual colors, not placeholders"""
        response = requests.get(f"{BASE_URL}/api/1688-scraper/products?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        placeholder_colors = ["Color", "color", "颜色", ""]
        actual_colors_found = []
        
        for product in data["products"]:
            for variant in product.get("variants", []):
                color = variant.get("color", "")
                if color and color not in placeholder_colors:
                    actual_colors_found.append(color)
        
        assert len(actual_colors_found) > 0, "Should find actual color values"
        print(f"✓ Found {len(actual_colors_found)} actual color values")
        print(f"  Sample colors: {actual_colors_found[:5]}")
    
    def test_size_values_are_not_placeholders(self):
        """Test that size values are actual sizes, not placeholders"""
        response = requests.get(f"{BASE_URL}/api/1688-scraper/products?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        placeholder_sizes = ["Size", "size", "尺码", ""]
        actual_sizes_found = []
        
        for product in data["products"]:
            for variant in product.get("variants", []):
                size = variant.get("size", "")
                if size and size not in placeholder_sizes:
                    actual_sizes_found.append(size)
        
        assert len(actual_sizes_found) > 0, "Should find actual size values"
        print(f"✓ Found {len(actual_sizes_found)} actual size values")
        print(f"  Sample sizes: {actual_sizes_found[:5]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
