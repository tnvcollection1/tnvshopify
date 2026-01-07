"""
Chrome Extension Integration Test
Simulates the extension's scraping and import flow to verify backend compatibility
"""
import pytest
import requests
import os
import json
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestExtensionBackendIntegration:
    """Test the backend endpoints that the Chrome Extension relies on"""
    
    def test_get_products_endpoint(self):
        """Test GET /api/1688-scraper/products - extension uses this to check connection"""
        response = requests.get(f"{BASE_URL}/api/1688-scraper/products?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "products" in data
        assert "total" in data
        assert isinstance(data["products"], list)
    
    def test_extension_import_basic(self):
        """Test POST /api/1688-scraper/extension-import - basic import"""
        payload = {
            "products": [
                {
                    "id": f"TEST{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    "title": "Test Extension Import Product",
                    "price": "99.99",
                    "image": "https://cbu01.alicdn.com/img/test.jpg",
                    "url": "https://detail.1688.com/offer/TEST123.html",
                    "isCurrentPage": True
                }
            ],
            "translate": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/extension-import",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "job_id" in data
        assert len(data.get("product_ids", [])) == 1
    
    def test_extension_import_with_full_data(self):
        """Test extension import with complete product data (like the extension sends)"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
        
        # This simulates the fullData that content.js scrapes
        payload = {
            "products": [
                {
                    "id": f"668{timestamp[:12]}",
                    "title": "Extension Full Data Test - 测试产品名称",
                    "price": "¥188.00",
                    "image": "https://cbu01.alicdn.com/img/ibank/O1CN01test.jpg",
                    "url": f"https://detail.1688.com/offer/668{timestamp[:12]}.html",
                    "isCurrentPage": True,
                    "fullData": {
                        "product_id": f"668{timestamp[:12]}",
                        "title": "Extension Full Data Test - 测试产品名称",
                        "title_cn": "测试产品名称 - 优质款式 2024新款",
                        "price": 188.00,
                        "price_range": "¥158.00 - ¥288.00",
                        "images": [
                            "https://cbu01.alicdn.com/img/ibank/O1CN01test1.jpg",
                            "https://cbu01.alicdn.com/img/ibank/O1CN01test2.jpg",
                            "https://cbu01.alicdn.com/img/ibank/O1CN01test3.jpg"
                        ],
                        "main_images": [
                            "https://cbu01.alicdn.com/img/ibank/O1CN01test1.jpg",
                            "https://cbu01.alicdn.com/img/ibank/O1CN01test2.jpg"
                        ],
                        "sku_images": [
                            "https://cbu01.alicdn.com/img/ibank/O1CN01sku1.jpg",
                            "https://cbu01.alicdn.com/img/ibank/O1CN01sku2.jpg"
                        ],
                        "skus": [
                            {
                                "spec_id": "test_color_1_size_M",
                                "color": "红色",
                                "size": "M",
                                "price": 188.00,
                                "stock": 100,
                                "props_names": "颜色:红色;尺码:M"
                            },
                            {
                                "spec_id": "test_color_1_size_L",
                                "color": "红色",
                                "size": "L",
                                "price": 198.00,
                                "stock": 50,
                                "props_names": "颜色:红色;尺码:L"
                            },
                            {
                                "spec_id": "test_color_2_size_M",
                                "color": "蓝色",
                                "size": "M",
                                "price": 188.00,
                                "stock": 80,
                                "props_names": "颜色:蓝色;尺码:M"
                            }
                        ],
                        "variants": [],
                        "seller": {
                            "name": "Test Seller Shop",
                            "member_id": "b2b-test123",
                            "shop_url": "https://testshop.1688.com"
                        },
                        "min_order": 2,
                        "sold_count": 1500,
                        "scraped_at": datetime.now().isoformat(),
                        "source": "extension_v4_full"
                    }
                }
            ],
            "translate": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/extension-import",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "job_id" in data
        assert "with translation" in data.get("message", "").lower()
    
    def test_extension_import_multiple_products(self):
        """Test importing multiple products (like from a listing page)"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        
        products = []
        for i in range(5):
            products.append({
                "id": f"MULTI{timestamp}{i:03d}",
                "title": f"Multi-Import Test Product {i+1}",
                "price": f"¥{99 + i * 10}.00",
                "image": f"https://cbu01.alicdn.com/img/ibank/O1CN01multi{i}.jpg",
                "url": f"https://detail.1688.com/offer/MULTI{timestamp}{i:03d}.html",
                "isCurrentPage": False
            })
        
        payload = {
            "products": products,
            "translate": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/extension-import",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert len(data.get("product_ids", [])) == 5
    
    def test_extension_import_empty_products(self):
        """Test extension import with empty products list"""
        payload = {
            "products": [],
            "translate": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/extension-import",
            json=payload
        )
        assert response.status_code == 400
    
    def test_job_status_endpoint(self):
        """Test GET /api/1688-scraper/job/{job_id} - extension polls this for progress"""
        # First create a job
        payload = {
            "products": [
                {
                    "id": f"JOBTEST{datetime.now().strftime('%H%M%S')}",
                    "title": "Job Status Test",
                    "price": "50.00",
                    "image": "",
                    "url": "https://detail.1688.com/offer/JOBTEST.html"
                }
            ],
            "translate": False
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/1688-scraper/extension-import",
            json=payload
        )
        assert create_response.status_code == 200
        job_id = create_response.json().get("job_id")
        
        # Check job status
        import time
        time.sleep(1)  # Give the job a moment to process
        
        status_response = requests.get(f"{BASE_URL}/api/1688-scraper/job/{job_id}")
        assert status_response.status_code == 200
        
        status_data = status_response.json()
        assert status_data.get("success") is True
        assert "job" in status_data
        assert status_data["job"].get("status") in ["started", "processing", "completed", "failed"]


class TestExtensionScrapedDataFormat:
    """Test that the backend correctly handles the data format sent by the extension"""
    
    def test_chinese_title_handling(self):
        """Test that Chinese titles are properly handled"""
        payload = {
            "products": [
                {
                    "id": f"CHINESE{datetime.now().strftime('%H%M%S')}",
                    "title": "2024新款女装连衣裙 夏季气质收腰显瘦 法式复古碎花裙",
                    "price": "¥158.00",
                    "image": "https://cbu01.alicdn.com/img/test.jpg",
                    "url": "https://detail.1688.com/offer/CHINESE123.html"
                }
            ],
            "translate": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/1688-scraper/extension-import",
            json=payload
        )
        assert response.status_code == 200
        assert response.json().get("success") is True
    
    def test_price_format_variations(self):
        """Test different price formats the extension might send"""
        prices = ["¥99.00", "99.00", "¥99", "99", "¥99.99-199.99"]
        
        for i, price in enumerate(prices):
            payload = {
                "products": [
                    {
                        "id": f"PRICE{i}{datetime.now().strftime('%H%M%S')}",
                        "title": f"Price Test {i}",
                        "price": price,
                        "image": "",
                        "url": "https://detail.1688.com/offer/PRICETEST.html"
                    }
                ],
                "translate": False
            }
            
            response = requests.post(
                f"{BASE_URL}/api/1688-scraper/extension-import",
                json=payload
            )
            assert response.status_code == 200, f"Failed for price format: {price}"
    
    def test_image_url_formats(self):
        """Test different image URL formats from 1688"""
        images = [
            "https://cbu01.alicdn.com/img/ibank/O1CN01test.jpg",
            "//cbu01.alicdn.com/img/ibank/O1CN01test.jpg",
            "https://cbu01.alicdn.com/img/ibank/O1CN01test.jpg_220x220.jpg",
            ""
        ]
        
        for i, img in enumerate(images):
            payload = {
                "products": [
                    {
                        "id": f"IMG{i}{datetime.now().strftime('%H%M%S')}",
                        "title": f"Image Test {i}",
                        "price": "99",
                        "image": img,
                        "url": "https://detail.1688.com/offer/IMGTEST.html"
                    }
                ],
                "translate": False
            }
            
            response = requests.post(
                f"{BASE_URL}/api/1688-scraper/extension-import",
                json=payload
            )
            assert response.status_code == 200, f"Failed for image format: {img}"


class TestProductCollectorPage:
    """Test the Product Collector page that the extension opens"""
    
    def test_product_collector_page_accessible(self):
        """Test that /product-collector page is accessible"""
        response = requests.get(f"{BASE_URL}/product-collector", allow_redirects=True)
        # Should return HTML (200) or redirect to login
        assert response.status_code in [200, 302, 304]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
