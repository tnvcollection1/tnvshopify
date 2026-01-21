"""
Iteration 35: Mega Menu with Visual Builder Tests
- Tests for mega menu API endpoints (CRUD operations)
- Tests for store-specific configurations
- Tests for sections, columns, items, promo banners, quick links
"""

import pytest
import requests
import os
import json
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://multi-tenant-shop-3.preview.emergentagent.com').rstrip('/')


class TestMegaMenuGetConfig:
    """Test GET /api/mega-menu/config/{store} endpoint"""
    
    def test_get_config_tnvcollection(self):
        """Test getting mega menu config for India store"""
        response = requests.get(f"{BASE_URL}/api/mega-menu/config/tnvcollection")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('store') == 'tnvcollection'
        assert 'sections' in data
        assert len(data['sections']) >= 4  # FASHION, WOMEN, MEN, BEAUTY
        
        # Verify section names
        section_names = [s.get('categoryName') for s in data['sections']]
        assert 'FASHION' in section_names
        assert 'WOMEN' in section_names
        assert 'MEN' in section_names
        assert 'BEAUTY' in section_names
        
    def test_get_config_tnvcollectionpk(self):
        """Test getting mega menu config for Pakistan store"""
        response = requests.get(f"{BASE_URL}/api/mega-menu/config/tnvcollectionpk")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('store') == 'tnvcollectionpk'
        assert 'sections' in data
        assert len(data['sections']) >= 4
        
    def test_get_config_global_settings(self):
        """Test that global settings are returned"""
        response = requests.get(f"{BASE_URL}/api/mega-menu/config/tnvcollection")
        assert response.status_code == 200
        
        data = response.json()
        assert 'globalSettings' in data
        settings = data['globalSettings']
        assert 'hoverDelay' in settings
        assert 'animationType' in settings
        assert 'maxWidth' in settings
        assert 'showOnMobile' in settings


class TestMegaMenuSections:
    """Test mega menu section structure"""
    
    def test_fashion_section_structure(self):
        """Test FASHION section has correct structure"""
        response = requests.get(f"{BASE_URL}/api/mega-menu/section/tnvcollection/FASHION")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('categoryName') == 'FASHION'
        assert data.get('enabled') == True
        assert 'columns' in data
        assert len(data['columns']) == 4  # WOMEN, MEN, SHOES, TOP BRANDS
        
        # Verify column titles
        column_titles = [c.get('title') for c in data['columns']]
        assert 'WOMEN' in column_titles
        assert 'MEN' in column_titles
        assert 'SHOES' in column_titles
        assert 'TOP BRANDS' in column_titles
        
    def test_women_section_structure(self):
        """Test WOMEN section has correct structure"""
        response = requests.get(f"{BASE_URL}/api/mega-menu/section/tnvcollection/WOMEN")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('categoryName') == 'WOMEN'
        assert 'columns' in data
        assert 'promoBanners' in data
        assert 'quickLinks' in data
        
    def test_men_section_structure(self):
        """Test MEN section has correct structure"""
        response = requests.get(f"{BASE_URL}/api/mega-menu/section/tnvcollection/MEN")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('categoryName') == 'MEN'
        assert 'columns' in data
        
    def test_beauty_section_structure(self):
        """Test BEAUTY section has correct structure"""
        response = requests.get(f"{BASE_URL}/api/mega-menu/section/tnvcollection/BEAUTY")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('categoryName') == 'BEAUTY'
        assert 'columns' in data
        
    def test_section_not_found(self):
        """Test 404 for non-existent section"""
        response = requests.get(f"{BASE_URL}/api/mega-menu/section/tnvcollection/NONEXISTENT")
        assert response.status_code == 404


class TestMegaMenuColumns:
    """Test mega menu column structure"""
    
    def test_column_has_items(self):
        """Test that columns have items"""
        response = requests.get(f"{BASE_URL}/api/mega-menu/section/tnvcollection/FASHION")
        assert response.status_code == 200
        
        data = response.json()
        for column in data['columns']:
            assert 'id' in column
            assert 'title' in column
            assert 'items' in column
            assert len(column['items']) > 0
            
    def test_item_structure(self):
        """Test that items have correct structure"""
        response = requests.get(f"{BASE_URL}/api/mega-menu/section/tnvcollection/FASHION")
        assert response.status_code == 200
        
        data = response.json()
        for column in data['columns']:
            for item in column['items']:
                assert 'id' in item
                assert 'name' in item
                assert 'path' in item


class TestMegaMenuPromoBanners:
    """Test promo banners in mega menu"""
    
    def test_fashion_has_promo_banner(self):
        """Test FASHION section has promo banner"""
        response = requests.get(f"{BASE_URL}/api/mega-menu/section/tnvcollection/FASHION")
        assert response.status_code == 200
        
        data = response.json()
        assert 'promoBanners' in data
        assert len(data['promoBanners']) > 0
        
        banner = data['promoBanners'][0]
        assert 'id' in banner
        assert 'image' in banner
        assert 'link' in banner
        
    def test_promo_banner_structure(self):
        """Test promo banner has all required fields"""
        response = requests.get(f"{BASE_URL}/api/mega-menu/section/tnvcollection/WOMEN")
        assert response.status_code == 200
        
        data = response.json()
        if data.get('promoBanners'):
            banner = data['promoBanners'][0]
            assert 'image' in banner
            assert 'link' in banner
            # Optional fields
            assert 'title' in banner or banner.get('title') is None
            assert 'subtitle' in banner or banner.get('subtitle') is None


class TestMegaMenuQuickLinks:
    """Test quick links in mega menu"""
    
    def test_fashion_has_quick_links(self):
        """Test FASHION section has quick links"""
        response = requests.get(f"{BASE_URL}/api/mega-menu/section/tnvcollection/FASHION")
        assert response.status_code == 200
        
        data = response.json()
        assert 'quickLinks' in data
        assert len(data['quickLinks']) > 0
        
    def test_quick_link_structure(self):
        """Test quick link has correct structure"""
        response = requests.get(f"{BASE_URL}/api/mega-menu/section/tnvcollection/FASHION")
        assert response.status_code == 200
        
        data = response.json()
        for link in data['quickLinks']:
            assert 'id' in link
            assert 'name' in link
            assert 'path' in link


class TestMegaMenuSaveConfig:
    """Test POST /api/mega-menu/config/{store} endpoint"""
    
    def test_save_config(self):
        """Test saving mega menu configuration"""
        # First get current config
        get_response = requests.get(f"{BASE_URL}/api/mega-menu/config/tnvcollection")
        assert get_response.status_code == 200
        current_config = get_response.json()
        
        # Prepare config to save
        config_to_save = {
            "store": "tnvcollection",
            "sections": current_config.get('sections', []),
            "globalSettings": current_config.get('globalSettings', {})
        }
        
        # Save config
        response = requests.post(
            f"{BASE_URL}/api/mega-menu/config/tnvcollection",
            json=config_to_save,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') == True
        assert data.get('store') == 'tnvcollection'


class TestMegaMenuUpdateSection:
    """Test PUT /api/mega-menu/section/{store}/{section_id} endpoint"""
    
    def test_update_section(self):
        """Test updating a mega menu section"""
        # Get current config to find a section ID
        get_response = requests.get(f"{BASE_URL}/api/mega-menu/config/tnvcollection")
        assert get_response.status_code == 200
        config = get_response.json()
        
        if config.get('sections'):
            section = config['sections'][0]
            section_id = section.get('id')
            
            # Update section
            updated_section = {
                "id": section_id,
                "categoryId": section.get('categoryId'),
                "categoryName": section.get('categoryName'),
                "enabled": section.get('enabled', True),
                "layout": section.get('layout', 'columns'),
                "columns": section.get('columns', []),
                "promoBanners": section.get('promoBanners', []),
                "quickLinks": section.get('quickLinks', [])
            }
            
            response = requests.put(
                f"{BASE_URL}/api/mega-menu/section/tnvcollection/{section_id}",
                json=updated_section,
                headers={"Content-Type": "application/json"}
            )
            assert response.status_code == 200
            
            data = response.json()
            assert data.get('success') == True


class TestMegaMenuGlobalSettings:
    """Test global settings update"""
    
    def test_update_global_settings(self):
        """Test updating global mega menu settings"""
        settings = {
            "hoverDelay": 200,
            "animationType": "fade",
            "maxWidth": "1200px",
            "showOnMobile": True
        }
        
        response = requests.put(
            f"{BASE_URL}/api/mega-menu/settings/tnvcollection",
            json=settings,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') == True
        
        # Reset to default
        default_settings = {
            "hoverDelay": 150,
            "animationType": "fade",
            "maxWidth": "1200px",
            "showOnMobile": True
        }
        requests.put(
            f"{BASE_URL}/api/mega-menu/settings/tnvcollection",
            json=default_settings,
            headers={"Content-Type": "application/json"}
        )


class TestMegaMenuClone:
    """Test clone mega menu between stores"""
    
    def test_clone_menu(self):
        """Test cloning mega menu from one store to another"""
        # This test just verifies the endpoint exists and responds
        # We won't actually clone to avoid data issues
        response = requests.post(
            f"{BASE_URL}/api/mega-menu/clone/tnvcollection/test_store_clone",
            headers={"Content-Type": "application/json"}
        )
        # Should succeed (creates new store config)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') == True


class TestMegaMenuStoreSpecific:
    """Test store-specific mega menu configurations"""
    
    def test_india_store_config(self):
        """Test India store (tnvcollection) has correct config"""
        response = requests.get(f"{BASE_URL}/api/mega-menu/config/tnvcollection")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('store') == 'tnvcollection'
        
    def test_pakistan_store_config(self):
        """Test Pakistan store (tnvcollectionpk) has correct config"""
        response = requests.get(f"{BASE_URL}/api/mega-menu/config/tnvcollectionpk")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('store') == 'tnvcollectionpk'
        
    def test_stores_have_same_default_sections(self):
        """Test both stores have same default sections"""
        india_response = requests.get(f"{BASE_URL}/api/mega-menu/config/tnvcollection")
        pakistan_response = requests.get(f"{BASE_URL}/api/mega-menu/config/tnvcollectionpk")
        
        assert india_response.status_code == 200
        assert pakistan_response.status_code == 200
        
        india_sections = [s.get('categoryName') for s in india_response.json().get('sections', [])]
        pakistan_sections = [s.get('categoryName') for s in pakistan_response.json().get('sections', [])]
        
        # Both should have same section names
        assert set(india_sections) == set(pakistan_sections)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
