"""
Test Iteration 33 - Storefront Homepage Banners
Tests for multi-tenant e-commerce storefronts (India and Pakistan)
with dynamic banner fetching from backend API
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://multistore-ecom-1.preview.emergentagent.com')


class TestStorefrontBannersAPI:
    """Test storefront home-config API for banner fetching"""
    
    def test_india_store_home_config_returns_success(self):
        """Test that India store home-config endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/storefront/home-config?store=tnvcollection")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        
    def test_india_store_returns_3_banners(self):
        """Test that India store returns exactly 3 banners"""
        response = requests.get(f"{BASE_URL}/api/storefront/home-config?store=tnvcollection")
        assert response.status_code == 200
        data = response.json()
        banners = data.get("banners", [])
        assert len(banners) == 3, f"Expected 3 banners, got {len(banners)}"
        
    def test_india_store_banners_have_shopify_cdn_images(self):
        """Test that India store banners use Shopify CDN images"""
        response = requests.get(f"{BASE_URL}/api/storefront/home-config?store=tnvcollection")
        assert response.status_code == 200
        data = response.json()
        banners = data.get("banners", [])
        
        for banner in banners:
            image_url = banner.get("image", "")
            assert "cdn.shopify.com" in image_url, f"Banner '{banner.get('title')}' does not use Shopify CDN: {image_url}"
            
    def test_india_store_banner_structure(self):
        """Test that India store banners have required fields"""
        response = requests.get(f"{BASE_URL}/api/storefront/home-config?store=tnvcollection")
        assert response.status_code == 200
        data = response.json()
        banners = data.get("banners", [])
        
        required_fields = ["title", "image", "cta", "link", "is_active"]
        for banner in banners:
            for field in required_fields:
                assert field in banner, f"Banner missing required field: {field}"
                
    def test_india_store_banner_titles(self):
        """Test that India store has expected banner titles"""
        response = requests.get(f"{BASE_URL}/api/storefront/home-config?store=tnvcollection")
        assert response.status_code == 200
        data = response.json()
        banners = data.get("banners", [])
        
        titles = [b.get("title") for b in banners]
        assert "DESIGNER COLLECTION" in titles
        assert "FORMAL ELEGANCE" in titles
        assert "GENUINE LEATHER" in titles
        
    def test_pakistan_store_home_config_returns_success(self):
        """Test that Pakistan store home-config endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/storefront/home-config?store=tnvcollectionpk")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        
    def test_pakistan_store_returns_3_banners(self):
        """Test that Pakistan store returns exactly 3 banners"""
        response = requests.get(f"{BASE_URL}/api/storefront/home-config?store=tnvcollectionpk")
        assert response.status_code == 200
        data = response.json()
        banners = data.get("banners", [])
        assert len(banners) == 3, f"Expected 3 banners, got {len(banners)}"
        
    def test_pakistan_store_banners_have_shopify_cdn_images(self):
        """Test that Pakistan store banners use Shopify CDN images"""
        response = requests.get(f"{BASE_URL}/api/storefront/home-config?store=tnvcollectionpk")
        assert response.status_code == 200
        data = response.json()
        banners = data.get("banners", [])
        
        for banner in banners:
            image_url = banner.get("image", "")
            assert "cdn.shopify.com" in image_url, f"Banner '{banner.get('title')}' does not use Shopify CDN: {image_url}"
            
    def test_pakistan_store_banner_titles(self):
        """Test that Pakistan store has expected banner titles"""
        response = requests.get(f"{BASE_URL}/api/storefront/home-config?store=tnvcollectionpk")
        assert response.status_code == 200
        data = response.json()
        banners = data.get("banners", [])
        
        titles = [b.get("title") for b in banners]
        assert "READY TO DISPATCH" in titles
        assert "DESIGNER SHOES" in titles
        assert "GENUINE LEATHER" in titles
        
    def test_banners_have_collection_links(self):
        """Test that banners link to collection pages"""
        # Test India store
        response = requests.get(f"{BASE_URL}/api/storefront/home-config?store=tnvcollection")
        data = response.json()
        for banner in data.get("banners", []):
            link = banner.get("link", "")
            assert "/products?collection=" in link or "/products" in link, f"Banner link not pointing to collection: {link}"
            
        # Test Pakistan store
        response = requests.get(f"{BASE_URL}/api/storefront/home-config?store=tnvcollectionpk")
        data = response.json()
        for banner in data.get("banners", []):
            link = banner.get("link", "")
            assert "/products?collection=" in link or "/products" in link, f"Banner link not pointing to collection: {link}"
            
    def test_banners_are_active(self):
        """Test that all returned banners are active"""
        # Test India store
        response = requests.get(f"{BASE_URL}/api/storefront/home-config?store=tnvcollection")
        data = response.json()
        for banner in data.get("banners", []):
            assert banner.get("is_active") is True
            
        # Test Pakistan store
        response = requests.get(f"{BASE_URL}/api/storefront/home-config?store=tnvcollectionpk")
        data = response.json()
        for banner in data.get("banners", []):
            assert banner.get("is_active") is True
            
    def test_banners_have_cta_buttons(self):
        """Test that banners have CTA button text"""
        # Test India store
        response = requests.get(f"{BASE_URL}/api/storefront/home-config?store=tnvcollection")
        data = response.json()
        for banner in data.get("banners", []):
            cta = banner.get("cta", "")
            assert len(cta) > 0, f"Banner '{banner.get('title')}' missing CTA"
            
        # Test Pakistan store
        response = requests.get(f"{BASE_URL}/api/storefront/home-config?store=tnvcollectionpk")
        data = response.json()
        for banner in data.get("banners", []):
            cta = banner.get("cta", "")
            assert len(cta) > 0, f"Banner '{banner.get('title')}' missing CTA"


class TestStorefrontHealthCheck:
    """Test storefront health endpoint"""
    
    def test_storefront_health_endpoint(self):
        """Test that storefront health endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/storefront/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
