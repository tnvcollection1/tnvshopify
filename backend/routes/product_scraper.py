"""
1688 Product Scraper Service
Scrapes products from 1688 store/collection pages and creates them in Shopify
Includes Chinese to English translation for product data
"""

import httpx
import re
import json
import asyncio
import os
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Body
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client[os.environ.get('DB_NAME', 'shopify_customers_db')]
    return _db

router = APIRouter(prefix="/api/1688-scraper", tags=["1688 Scraper"])

# Translation setup
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")


async def translate_to_english(text: str, context: str = "product") -> str:
    """Translate Chinese text to English using GPT"""
    if not text or not EMERGENT_LLM_KEY:
        return text
    
    # Check if text is mostly Chinese
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    if chinese_chars < 3:  # Less than 3 Chinese characters, skip translation
        return text
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"translate_{hash(text) % 10000}",
            system_message="You are a professional e-commerce translator. Translate Chinese product text to English. Keep translations concise, natural, and suitable for online stores. Only return the translation, no explanations."
        ).with_model("openai", "gpt-4o-mini")  # Use faster model for translations
        
        prompt = f"Translate this {context} to English:\n\n{text}"
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return response.strip() if response else text
        
    except Exception as e:
        print(f"Translation error: {e}")
        return text


async def translate_product(product: Dict) -> Dict:
    """Translate all text fields in a product"""
    translated = dict(product)
    
    # Translate title
    if product.get("title"):
        translated["title_original"] = product["title"]
        translated["title"] = await translate_to_english(product["title"], "product title")
    
    # Translate description (if not too long)
    if product.get("description"):
        desc = product["description"]
        # Clean HTML and limit length for translation
        clean_desc = re.sub(r'<[^>]+>', ' ', desc)
        clean_desc = re.sub(r'\s+', ' ', clean_desc).strip()[:500]
        if clean_desc:
            translated["description_original"] = product["description"]
            translated["description"] = await translate_to_english(clean_desc, "product description")
    
    # Translate variant attributes
    if product.get("variants"):
        for variant in translated["variants"]:
            for attr in variant.get("attributes", []):
                if attr.get("attributeName"):
                    attr["attributeName_original"] = attr["attributeName"]
                    attr["attributeName"] = await translate_to_english(attr["attributeName"], "attribute name")
                if attr.get("attributeValue"):
                    attr["attributeValue_original"] = attr["attributeValue"]
                    attr["attributeValue"] = await translate_to_english(attr["attributeValue"], "attribute value")
    
    translated["translated"] = True
    translated["translation_date"] = datetime.now(timezone.utc).isoformat()
    
    return translated


class ScrapeRequest(BaseModel):
    url: str = Field(..., description="1688 store or collection URL")
    store_name: Optional[str] = Field(None, description="Shopify store to import to")
    create_in_shopify: bool = Field(False, description="Auto-create products in Shopify")
    max_products: int = Field(50, description="Maximum products to scrape")
    translate: bool = Field(True, description="Translate Chinese to English")


class BatchImportRequest(BaseModel):
    """Request for batch importing products by their IDs"""
    product_ids: List[str] = Field(..., description="List of 1688 product IDs to import")
    store_name: Optional[str] = Field(None, description="Shopify store to import to")
    create_in_shopify: bool = Field(False, description="Auto-create products in Shopify")
    translate: bool = Field(True, description="Translate Chinese to English")


class ExtensionProduct(BaseModel):
    """Product data from browser extension - Full scrape v3"""
    id: str
    title: str = ""
    price: str = ""
    image: str = ""
    url: str = ""
    isCurrentPage: bool = False
    # Full data from v3 extension (no API needed!)
    fullData: Optional[dict] = None


class FullProductData(BaseModel):
    """Complete product data scraped by extension v3"""
    product_id: str
    title: Optional[str] = None
    title_cn: Optional[str] = None
    price: Optional[float] = None
    price_range: Optional[str] = None
    images: List[str] = []
    description: Optional[str] = None
    description_images: List[str] = []
    skus: List[dict] = []
    variants: List[dict] = []
    seller: Optional[dict] = None
    min_order: int = 1
    sold_count: Optional[int] = None
    source: str = "extension_v3"


class ExtensionImportRequest(BaseModel):
    """Request for importing products directly from browser extension with full data"""
    products: List[ExtensionProduct] = Field(..., description="Products scraped by extension")
    translate: bool = Field(True, description="Translate Chinese to English")


class ScrapedProduct(BaseModel):
    product_id: str
    title: str
    price: float
    price_range: Optional[str] = None
    images: List[str] = []
    url: str
    seller_name: Optional[str] = None
    min_order: Optional[int] = None
    variants: List[dict] = []


# Headers for requests
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Referer': 'https://www.1688.com/',
}

# TMAPI Configuration (Third-party 1688 API - like Dianxiaomi uses)
TMAPI_BASE_URL = "http://api.tmapi.top"
TMAPI_TOKEN = os.environ.get("TMAPI_TOKEN", "")

# 1688 API Configuration (Official - limited to products you've ordered from)
import hmac
import hashlib
import time as _time

ALIBABA_APP_KEY = os.environ.get("ALIBABA_1688_APP_KEY", "8585237")
ALIBABA_APP_SECRET = os.environ.get("ALIBABA_1688_APP_SECRET", "Gin6sv4MkP")
ALIBABA_ACCESS_TOKEN = os.environ.get("ALIBABA_1688_ACCESS_TOKEN", "")
ALIBABA_API_URL = "https://gw.open.1688.com/openapi"


def generate_sign(api_path: str, params: dict, secret: str) -> str:
    """Generate HMAC-SHA1 signature for 1688 API"""
    enc_arr = []
    for key, value in params.items():
        if value is not None and str(value) != '':
            enc_arr.append(f"{key}{value}")
    enc_arr.sort()
    params_str = ''.join(enc_arr)
    sign_str = api_path + params_str
    hmac_obj = hmac.new(
        secret.encode('utf-8'),
        sign_str.encode('utf-8'),
        hashlib.sha1
    )
    return hmac_obj.hexdigest().upper()


async def fetch_product_via_api(product_id: str) -> Optional[Dict]:
    """Fetch product details using 1688 API (works for products from suppliers you've ordered from)"""
    api_path = f"param2/1/com.alibaba.product/alibaba.product.simple.get/{ALIBABA_APP_KEY}"
    
    params = {
        "productID": int(product_id),
        "webSite": "1688",
        "access_token": ALIBABA_ACCESS_TOKEN,
        "_aop_timestamp": str(int(_time.time() * 1000)),
    }
    
    params = {k: str(v) for k, v in params.items() if v is not None and str(v) != ''}
    signature = generate_sign(api_path, params, ALIBABA_APP_SECRET)
    params['_aop_signature'] = signature
    
    url = f"{ALIBABA_API_URL}/{api_path}"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                data=params,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            response.raise_for_status()
            result = response.json()
            
            product_info = result.get("productInfo") or result.get("result") or result
            
            if isinstance(product_info, dict) and product_info.get("subject"):
                # Extract images - handle various formats from 1688 API
                images = []
                image_data = product_info.get("image", {})
                image_list = image_data.get("images", [])
                
                for img in image_list[:10]:
                    img_url = img if isinstance(img, str) else img.get("url", "")
                    if img_url:
                        # Fix protocol-relative and partial URLs
                        if img_url.startswith("//"):
                            img_url = "https:" + img_url
                        elif img_url.startswith("img/") or img_url.startswith("ibank/"):
                            img_url = "https://cbu01.alicdn.com/" + img_url
                        elif not img_url.startswith("http"):
                            img_url = "https://cbu01.alicdn.com/" + img_url
                        images.append(img_url)
                
                # Extract price
                price = 0
                sale_info = product_info.get("saleInfo", {})
                price_ranges = sale_info.get("priceRange", [])
                if price_ranges:
                    price = float(price_ranges[0].get("price", 0))
                
                # Extract SKU variants
                variants = []
                sku_infos = product_info.get("skuInfos", [])
                for sku in sku_infos:
                    sku_attrs = []
                    for attr in (sku.get("attributes") or []):
                        sku_attrs.append({
                            "attributeName": attr.get("attributeDisplayName") or attr.get("attributeName", ""),
                            "attributeValue": attr.get("attributeValue") or attr.get("customValueName", ""),
                        })
                    variants.append({
                        "specId": sku.get("specId"),
                        "price": sku.get("price") or sku.get("consignPrice"),
                        "stock": sku.get("amountOnSale"),
                        "attributes": sku_attrs,
                    })
                
                return {
                    "product_id": product_id,
                    "url": f"https://detail.1688.com/offer/{product_id}.html",
                    "title": product_info.get("subject"),
                    "price": price,
                    "price_range": None,
                    "images": images,
                    "description": product_info.get("description"),
                    "seller_name": product_info.get("supplierLoginId"),
                    "min_order": sale_info.get("minOrderQuantity", 1),
                    "variants": variants,
                    "source": "api",
                }
                
    except Exception as e:
        print(f"API fetch failed for {product_id}: {e}")
        return None
    
    return None


async def fetch_product_via_tmapi(product_id: str) -> Optional[Dict]:
    """
    Fetch product details using TMAPI (third-party API like Dianxiaomi uses).
    This works for ANY 1688 product, not just ones you've ordered from.
    
    API: http://api.tmapi.top/1688/item_detail?apiToken=xxx&item_id=xxx
    """
    if not TMAPI_TOKEN:
        print(f"[TMAPI] No API token configured")
        return None
    
    url = f"{TMAPI_BASE_URL}/1688/item_detail"
    params = {
        "apiToken": TMAPI_TOKEN,
        "item_id": product_id,
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            result = response.json()
            
            # Check for success
            if result.get("code") != 200:
                print(f"[TMAPI] API error for {product_id}: {result.get('msg', 'Unknown error')}")
                return None
            
            data = result.get("data", {})
            
            if not data:
                print(f"[TMAPI] No data for {product_id}")
                return None
            
            # Extract images
            images = []
            main_imgs = data.get("main_imgs", [])
            for img in main_imgs[:10]:
                if img:
                    if img.startswith("//"):
                        img = "https:" + img
                    images.append(img)
            
            # Extract price info
            price_info = data.get("price_info", {})
            price = float(price_info.get("price", 0) or price_info.get("price_min", 0) or 0)
            
            # Build price range string
            price_range_str = None
            price_min = price_info.get("price_min")
            price_max = price_info.get("price_max")
            if price_min and price_max and price_min != price_max:
                price_range_str = f"¥{price_min} - ¥{price_max}"
            
            # Extract SKU/variants with CORRECT field names
            variants = []
            sku_list = data.get("skus", [])
            for sku in sku_list[:50]:  # Limit to 50 variants
                # Parse props_names like "颜色:黑色;尺码:46"
                props_names = sku.get("props_names", "")
                attributes = []
                if props_names:
                    for prop in props_names.split(";"):
                        if ":" in prop:
                            name, value = prop.split(":", 1)
                            attributes.append({
                                "name": name.strip(),
                                "value": value.strip(),
                            })
                
                variants.append({
                    "sku_id": sku.get("skuid"),
                    "spec_id": sku.get("specid"),  # IMPORTANT for ordering!
                    "price": float(sku.get("sale_price", 0) or 0),
                    "stock": sku.get("stock", 0),
                    "attributes": attributes,
                    "props_names": props_names,  # Keep original for display
                })
            
            # Extract shop/seller info
            shop_info = data.get("shop_info", {})
            
            product = {
                "product_id": product_id,
                "url": data.get("product_url") or f"https://detail.1688.com/offer/{product_id}.html",
                "title": data.get("title", ""),
                "price": price,
                "price_range": price_range_str,
                "images": images,
                "description": None,
                "seller_name": shop_info.get("shop_name"),
                "seller_id": shop_info.get("shop_id"),
                "min_order": data.get("mixed_batch", {}).get("mix_num", 1) or 1,
                "variants": variants,
                "sales": data.get("sale_count"),
                "source": "tmapi",
            }
            
            print(f"[TMAPI] Successfully fetched {product_id}: {product['title'][:40]}... ({len(variants)} variants)")
            return product
            
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 439:
            print(f"[TMAPI] Quota exceeded for {product_id}")
        else:
            print(f"[TMAPI] HTTP error for {product_id}: {e}")
        return None
    except Exception as e:
        print(f"[TMAPI] Error fetching {product_id}: {e}")
        import traceback
        traceback.print_exc()
        return None


async def fetch_taobao_product_via_tmapi(product_id: str) -> Optional[Dict]:
    """
    Fetch product details from Taobao/Tmall using TMAPI.
    Works for Taobao and Tmall products.
    
    API: http://api.tmapi.top/taobao/item_detail?apiToken=xxx&item_id=xxx
    """
    if not TMAPI_TOKEN:
        print(f"[TMAPI-Taobao] No API token configured")
        return None
    
    url = f"{TMAPI_BASE_URL}/taobao/item_detail"
    params = {
        "apiToken": TMAPI_TOKEN,
        "item_id": product_id,
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            result = response.json()
            
            # Check for success
            if result.get("code") != 200:
                print(f"[TMAPI-Taobao] API error for {product_id}: {result.get('msg', 'Unknown error')}")
                return None
            
            data = result.get("data", {})
            
            if not data:
                print(f"[TMAPI-Taobao] No data for {product_id}")
                return None
            
            # Extract images
            images = []
            main_imgs = data.get("main_imgs", []) or data.get("images", [])
            for img in main_imgs[:10]:
                if img:
                    if img.startswith("//"):
                        img = "https:" + img
                    images.append(img)
            
            # Extract price info
            price_info = data.get("price_info", {})
            price = float(price_info.get("price", 0) or price_info.get("price_min", 0) or data.get("price", 0) or 0)
            
            # Build price range string
            price_range_str = None
            price_min = price_info.get("price_min") or data.get("price_min")
            price_max = price_info.get("price_max") or data.get("price_max")
            if price_min and price_max and str(price_min) != str(price_max):
                price_range_str = f"¥{price_min} - ¥{price_max}"
            
            # Extract SKU/variants
            variants = []
            sku_list = data.get("skus", []) or data.get("sku", [])
            for sku in sku_list[:50]:
                # Parse props_names like "颜色:黑色;尺码:46"
                props_names = sku.get("props_names", "") or sku.get("props", "")
                attributes = []
                if props_names:
                    for prop in props_names.split(";"):
                        if ":" in prop:
                            name, value = prop.split(":", 1)
                            attributes.append({
                                "name": name.strip(),
                                "value": value.strip(),
                            })
                
                variants.append({
                    "sku_id": sku.get("skuid") or sku.get("sku_id"),
                    "spec_id": sku.get("specid") or sku.get("spec_id"),
                    "price": float(sku.get("sale_price", 0) or sku.get("price", 0) or 0),
                    "stock": sku.get("stock", 0) or sku.get("quantity", 0),
                    "attributes": attributes,
                    "props_names": props_names,
                })
            
            # Extract shop/seller info
            shop_info = data.get("shop_info", {}) or data.get("seller_info", {})
            
            # Determine platform
            platform = "taobao"
            product_url = data.get("product_url", "")
            if "tmall" in product_url.lower():
                platform = "tmall"
            
            product = {
                "product_id": product_id,
                "url": product_url or f"https://item.taobao.com/item.htm?id={product_id}",
                "title": data.get("title", ""),
                "price": price,
                "price_range": price_range_str,
                "images": images,
                "description": data.get("desc") or data.get("description"),
                "seller_name": shop_info.get("shop_name") or shop_info.get("seller_nick"),
                "seller_id": shop_info.get("shop_id") or shop_info.get("seller_id"),
                "min_order": 1,
                "variants": variants,
                "sales": data.get("sale_count") or data.get("sold_count"),
                "source": f"tmapi_{platform}",
                "platform": platform,
            }
            
            print(f"[TMAPI-{platform.upper()}] Successfully fetched {product_id}: {product['title'][:40]}... ({len(variants)} variants)")
            return product
            
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 439:
            print(f"[TMAPI-Taobao] Quota exceeded for {product_id}")
        else:
            print(f"[TMAPI-Taobao] HTTP error for {product_id}: {e}")
        return None
    except Exception as e:
        print(f"[TMAPI-Taobao] Error fetching {product_id}: {e}")
        import traceback
        traceback.print_exc()
        return None


def detect_product_platform(product_id_or_url: str) -> str:
    """Detect which platform a product is from based on ID or URL"""
    url_lower = product_id_or_url.lower()
    
    if "taobao.com" in url_lower or "tmall.com" in url_lower:
        return "taobao"
    elif "1688.com" in url_lower:
        return "1688"
    elif "detail.1688.com" in url_lower or "/offer/" in url_lower:
        return "1688"
    elif "item.taobao.com" in url_lower or "detail.tmall.com" in url_lower:
        return "taobao"
    
    # If just an ID, assume 1688 for now (most common use case)
    return "1688"


async def extract_product_ids_from_page(html: str) -> List[str]:
    """Extract product IDs from a 1688 page HTML"""
    product_ids = []
    
    # Pattern 1: offer/ID.html links
    offer_pattern = r'offer/(\d{10,})'
    matches = re.findall(offer_pattern, html)
    product_ids.extend(matches)
    
    # Pattern 2: data-offer-id attributes
    offer_id_pattern = r'data-offer-id=["\'](\d{10,})["\']'
    matches = re.findall(offer_id_pattern, html)
    product_ids.extend(matches)
    
    # Pattern 3: offerId in JSON
    offer_json_pattern = r'"offerId"[:\s]*["\']?(\d{10,})["\']?'
    matches = re.findall(offer_json_pattern, html)
    product_ids.extend(matches)
    
    # Deduplicate while preserving order
    seen = set()
    unique_ids = []
    for pid in product_ids:
        if pid not in seen:
            seen.add(pid)
            unique_ids.append(pid)
    
    return unique_ids


async def scrape_product_details(product_id: str) -> Optional[Dict]:
    """Scrape details for a single product"""
    url = f"https://detail.1688.com/offer/{product_id}.html"
    
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url, headers=HEADERS)
            html = response.text
            
            product = {
                "product_id": product_id,
                "url": url,
                "title": None,
                "price": 0,
                "price_range": None,
                "images": [],
                "description": None,
                "seller_name": None,
                "min_order": 1,
                "variants": [],
            }
            
            # Extract title
            title_match = re.search(r'<title>([^<]+)</title>', html)
            if title_match:
                title = title_match.group(1)
                title = title.replace('- 阿里巴巴', '').replace('-1688.com', '').strip()
                product["title"] = title
            
            # Extract price from various patterns
            price_patterns = [
                r'"price"[:\s]*["\']?(\d+\.?\d*)["\']?',
                r'price["\']?\s*:\s*["\']?(\d+\.?\d*)',
                r'¥\s*(\d+\.?\d*)',
                r'(\d+\.?\d*)\s*元',
            ]
            for pattern in price_patterns:
                match = re.search(pattern, html)
                if match:
                    try:
                        product["price"] = float(match.group(1))
                        break
                    except:
                        pass
            
            # Extract price range
            range_match = re.search(r'¥\s*(\d+\.?\d*)\s*-\s*¥?\s*(\d+\.?\d*)', html)
            if range_match:
                product["price_range"] = f"¥{range_match.group(1)} - ¥{range_match.group(2)}"
            
            # Extract images
            img_patterns = [
                r'"originalImageURI"[:\s]*["\']([^"\']+)["\']',
                r'"imageUrl"[:\s]*["\']([^"\']+)["\']',
                r'//cbu\d+\.alicdn\.com/[^"\'>\s]+\.(?:jpg|png|jpeg)',
            ]
            for pattern in img_patterns:
                matches = re.findall(pattern, html)
                for img in matches:
                    if img.startswith('//'):
                        img = 'https:' + img
                    if img not in product["images"] and 'alicdn.com' in img:
                        product["images"].append(img)
                        if len(product["images"]) >= 10:
                            break
                if product["images"]:
                    break
            
            # Extract seller name
            seller_match = re.search(r'"companyName"[:\s]*["\']([^"\']+)["\']', html)
            if seller_match:
                product["seller_name"] = seller_match.group(1)
            
            # Extract min order
            min_order_match = re.search(r'"minOrderQuantity"[:\s]*(\d+)', html)
            if min_order_match:
                product["min_order"] = int(min_order_match.group(1))
            
            # Extract variants/SKUs
            sku_pattern = r'"skuProps"[:\s]*(\[.*?\])'
            sku_match = re.search(sku_pattern, html, re.DOTALL)
            if sku_match:
                try:
                    # Try to parse SKU props
                    sku_str = sku_match.group(1)[:2000]  # Limit size
                    # This is complex JSON, simplified extraction
                    color_match = re.findall(r'"value"[:\s]*"([^"]+)"', sku_str)
                    if color_match:
                        product["variants"] = [{"name": v} for v in color_match[:20]]
                except:
                    pass
            
            return product
            
    except Exception as e:
        print(f"Error scraping product {product_id}: {e}")
        return None


async def scrape_collection_with_playwright(url: str, max_products: int = 50) -> List[str]:
    """
    Use Playwright headless browser to scrape product IDs from a 1688 collection/store page.
    This bypasses anti-bot protection by rendering JavaScript.
    """
    from playwright.async_api import async_playwright
    import os
    
    # Ensure Playwright can find browsers - set before importing
    os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/pw-browsers'
    
    product_ids = []
    
    try:
        async with async_playwright() as p:
            # Launch headless browser with explicit executable path
            browser = await p.chromium.launch(
                headless=True,
                executable_path='/pw-browsers/chromium-1200/chrome-linux/chrome',
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920,1080',
                ]
            )
            
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                locale='zh-CN',
            )
            
            page = await context.new_page()
            
            print(f"[Playwright] Navigating to: {url}")
            
            # Navigate to the page with extended timeout
            try:
                await page.goto(url, wait_until='networkidle', timeout=60000)
            except Exception as nav_err:
                print(f"[Playwright] Navigation error (continuing anyway): {nav_err}")
                # Try with just load event
                await page.goto(url, wait_until='load', timeout=60000)
            
            # Take a debug screenshot
            try:
                debug_path = "/tmp/1688_debug_screenshot.png"
                await page.screenshot(path=debug_path, full_page=False)
                print(f"[Playwright] Debug screenshot saved to {debug_path}")
            except Exception as ss_err:
                print(f"[Playwright] Screenshot error: {ss_err}")
            
            # Log the page title
            title = await page.title()
            print(f"[Playwright] Page title: {title}")
            
            # Wait for products to load (try multiple selectors)
            selectors_to_try = [
                '.sm-offer-item',
                '.offer-item',
                '.space-offer-card-box',
                '[data-offer-id]',
                'a[href*="offer/"]',
                '.product-item',
            ]
            
            for selector in selectors_to_try:
                try:
                    await page.wait_for_selector(selector, timeout=5000)
                    print(f"[Playwright] Found elements with selector: {selector}")
                    break
                except:
                    continue
            
            # Additional wait for dynamic content
            await page.wait_for_timeout(3000)
            
            # Scroll down to load more products (lazy loading)
            for _ in range(3):
                await page.evaluate('window.scrollBy(0, window.innerHeight)')
                await page.wait_for_timeout(1500)
            
            # Scroll back to top
            await page.evaluate('window.scrollTo(0, 0)')
            await page.wait_for_timeout(500)
            
            # Get page HTML and extract product IDs
            html = await page.content()
            
            # Extract product IDs using multiple patterns
            patterns = [
                r'offer/(\d{10,})',  # Standard offer links
                r'data-offer-id=["\'](\d{10,})["\']',  # Data attributes
                r'"offerId"[:\s]*["\']?(\d{10,})["\']?',  # JSON data
            ]
            
            seen = set()
            for pattern in patterns:
                matches = re.findall(pattern, html)
                for match in matches:
                    if match not in seen:
                        seen.add(match)
                        product_ids.append(match)
            
            print(f"[Playwright] Extracted {len(product_ids)} product IDs")
            
            # Also try to get product info directly from page elements
            try:
                elements = await page.query_selector_all('a[href*="offer/"]')
                for el in elements[:100]:  # Limit to first 100 elements
                    href = await el.get_attribute('href')
                    if href:
                        match = re.search(r'offer/(\d{10,})', href)
                        if match and match.group(1) not in seen:
                            seen.add(match.group(1))
                            product_ids.append(match.group(1))
            except Exception as e:
                print(f"[Playwright] Error extracting from elements: {e}")
            
            await browser.close()
            
    except Exception as e:
        print(f"[Playwright] Error: {e}")
        import traceback
        traceback.print_exc()
    
    # Limit to max_products and deduplicate
    unique_ids = list(dict.fromkeys(product_ids))[:max_products]
    print(f"[Playwright] Final product IDs: {len(unique_ids)}")
    
    return unique_ids


async def scrape_collection_page(url: str, max_products: int = 50) -> List[Dict]:
    """
    Scrape all products from a 1688 collection/store page.
    Uses Playwright headless browser for reliable JavaScript rendering.
    """
    products = []
    
    try:
        # Step 1: Use Playwright to get product IDs from the page
        print(f"[Scraper] Starting Playwright scrape for: {url}")
        product_ids = await scrape_collection_with_playwright(url, max_products)
        
        if not product_ids:
            print("[Scraper] No product IDs found via Playwright, trying fallback methods")
            # Fallback: Try simple HTTP request (might work for some pages)
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                response = await client.get(url, headers=HEADERS)
                html = response.text
                product_ids = await extract_product_ids_from_page(html)
        
        print(f"[Scraper] Found {len(product_ids)} product IDs")
        
        if not product_ids:
            return []
        
        # Step 2: Fetch product details using the working API
        # Use the reliable alibaba.product.simple.get API for products from known suppliers
        for pid in product_ids[:max_products]:
            try:
                product = await fetch_product_via_api(pid)
                if product and product.get("title"):
                    products.append(product)
                    print(f"[Scraper] Fetched product {pid}: {product.get('title', '')[:40]}...")
                else:
                    # Fallback to HTML scraping for individual product
                    product = await scrape_product_details(pid)
                    if product and product.get("title"):
                        products.append(product)
            except Exception as e:
                print(f"[Scraper] Error fetching product {pid}: {e}")
                continue
        
        print(f"[Scraper] Successfully scraped {len(products)} products")
        
    except Exception as e:
        print(f"[Scraper] Error scraping collection: {e}")
        import traceback
        traceback.print_exc()
    
    return products


async def create_shopify_product(product: Dict, store_name: str) -> Optional[str]:
    """Create a product in Shopify from scraped data"""
    db = get_db()
    
    # Get store credentials
    store = await db.stores.find_one({"store_name": store_name}, {"_id": 0})
    if not store or not store.get("shopify_domain") or not store.get("shopify_token"):
        print(f"Shopify not configured for store: {store_name}")
        return None
    
    try:
        import shopify
        
        # Initialize Shopify session
        shop_url = f"https://{store['shopify_domain']}"
        api_version = '2024-01'
        session = shopify.Session(shop_url, api_version, store['shopify_token'])
        shopify.ShopifyResource.activate_session(session)
        
        # Create product
        new_product = shopify.Product()
        new_product.title = product.get("title", f"Product {product['product_id']}")
        new_product.body_html = f"""
            <p>Imported from 1688</p>
            <p>1688 Product ID: {product['product_id']}</p>
            <p>Original Price: ¥{product.get('price', 0)}</p>
            <p><a href="{product['url']}" target="_blank">View on 1688</a></p>
        """
        new_product.vendor = product.get("seller_name", "1688 Supplier")
        new_product.product_type = "Imported"
        new_product.tags = f"1688-import,1688-{product['product_id']}"
        
        # Add images
        images = []
        for img_url in product.get("images", [])[:5]:
            images.append({"src": img_url})
        new_product.images = images
        
        # Add default variant with price
        # Convert CNY to target currency (rough conversion)
        cny_price = product.get("price", 0)
        # Markup and convert (example: 1 CNY ≈ 20 PKR with 2x markup)
        target_price = cny_price * 20 * 2
        
        new_product.variants = [{
            "price": str(target_price),
            "sku": f"1688-{product['product_id']}",
            "inventory_management": "shopify",
            "inventory_quantity": 100,
        }]
        
        success = new_product.save()
        
        shopify.ShopifyResource.clear_session()
        
        if success:
            return str(new_product.id)
        return None
        
    except Exception as e:
        print(f"Error creating Shopify product: {e}")
        return None


# Store scraping job status
scrape_jobs = {}


@router.post("/scrape")
async def start_scrape(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """
    Start scraping products from a 1688 URL
    Returns a job ID to track progress
    
    This uses Playwright headless browser to reliably scrape 1688 collection pages.
    """
    # Validate URL
    if not request.url or not request.url.strip():
        raise HTTPException(status_code=400, detail="URL is required")
    
    if "1688.com" not in request.url.lower():
        raise HTTPException(status_code=400, detail="URL must be a valid 1688.com URL")
    
    import uuid
    job_id = str(uuid.uuid4())[:8]
    
    scrape_jobs[job_id] = {
        "status": "started",
        "url": request.url,
        "progress": 0,
        "total": 0,
        "products_scraped": 0,
        "products_created": 0,
        "products_translated": 0,
        "errors": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "method": "playwright",
    }
    
    # Start background task
    background_tasks.add_task(
        run_scrape_job,
        job_id,
        request.url,
        request.store_name,
        request.create_in_shopify,
        request.max_products,
        request.translate
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "message": "Scraping started with Playwright browser" + (" + translation" if request.translate else ""),
    }


async def run_scrape_job(
    job_id: str,
    url: str,
    store_name: Optional[str],
    create_in_shopify: bool,
    max_products: int,
    translate: bool = True
):
    """Background task to run the scraping job using Playwright"""
    db = get_db()
    
    try:
        scrape_jobs[job_id]["status"] = "scraping"
        scrape_jobs[job_id]["phase"] = "extracting_products"
        
        # Scrape products using Playwright
        products = await scrape_collection_page(url, max_products)
        
        scrape_jobs[job_id]["total"] = len(products)
        scrape_jobs[job_id]["products_scraped"] = len(products)
        scrape_jobs[job_id]["phase"] = "processing"
        
        if not products:
            scrape_jobs[job_id]["status"] = "completed"
            scrape_jobs[job_id]["error"] = "No products found on page. The page may require login or have anti-bot protection."
            return
        
        # Save to database with optional translation
        for i, product in enumerate(products):
            try:
                # Translate if requested
                if translate:
                    scrape_jobs[job_id]["phase"] = f"translating_{i+1}_of_{len(products)}"
                    try:
                        product = await translate_product(product)
                        scrape_jobs[job_id]["products_translated"] = scrape_jobs[job_id].get("products_translated", 0) + 1
                    except Exception as trans_error:
                        print(f"Translation failed for {product.get('product_id')}: {trans_error}")
                
                # Save to scraped_products collection
                product["scraped_at"] = datetime.now(timezone.utc).isoformat()
                product["source_url"] = url
                
                await db.scraped_products.update_one(
                    {"product_id": product["product_id"]},
                    {"$set": product},
                    upsert=True
                )
                
                # Create in Shopify if requested
                if create_in_shopify and store_name:
                    scrape_jobs[job_id]["phase"] = f"creating_shopify_{i+1}_of_{len(products)}"
                    shopify_id = await create_shopify_product(product, store_name)
                    if shopify_id:
                        scrape_jobs[job_id]["products_created"] += 1
                        product["shopify_product_id"] = shopify_id
                        await db.scraped_products.update_one(
                            {"product_id": product["product_id"]},
                            {"$set": {"shopify_product_id": shopify_id}}
                        )
                
                scrape_jobs[job_id]["progress"] = int((i + 1) / len(products) * 100)
                
            except Exception as e:
                scrape_jobs[job_id]["errors"].append(f"Product {product.get('product_id')}: {str(e)}")
        
        scrape_jobs[job_id]["status"] = "completed"
        scrape_jobs[job_id]["phase"] = "done"
        scrape_jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
        
    except Exception as e:
        scrape_jobs[job_id]["status"] = "failed"
        scrape_jobs[job_id]["error"] = str(e)
        import traceback
        scrape_jobs[job_id]["traceback"] = traceback.format_exc()


@router.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """Get status of a scraping job"""
    if job_id not in scrape_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "success": True,
        "job": scrape_jobs[job_id],
    }


@router.get("/products")
async def get_scraped_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
):
    """Get list of scraped products"""
    db = get_db()
    
    query = {}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"product_id": {"$regex": search, "$options": "i"}},
        ]
    
    skip = (page - 1) * limit
    
    products = await db.scraped_products.find(
        query,
        {"_id": 0}
    ).sort("scraped_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.scraped_products.count_documents(query)
    
    return {
        "success": True,
        "products": products,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }


@router.post("/import-to-shopify/{product_id}")
async def import_product_to_shopify(product_id: str, store_name: str):
    """Import a single scraped product to Shopify"""
    db = get_db()
    
    # Get the scraped product
    product = await db.scraped_products.find_one(
        {"product_id": product_id},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Create in Shopify
    shopify_id = await create_shopify_product(product, store_name)
    
    if shopify_id:
        # Update database
        await db.scraped_products.update_one(
            {"product_id": product_id},
            {"$set": {"shopify_product_id": shopify_id, "imported_to": store_name}}
        )
        
        return {
            "success": True,
            "shopify_product_id": shopify_id,
            "message": f"Product imported to Shopify store {store_name}",
        }
    
    raise HTTPException(status_code=500, detail="Failed to create product in Shopify")


@router.delete("/products/{product_id}")
async def delete_scraped_product(product_id: str):
    """Delete a scraped product"""
    db = get_db()
    
    result = await db.scraped_products.delete_one({"product_id": product_id})
    
    if result.deleted_count > 0:
        return {"success": True, "message": "Product deleted"}
    
    raise HTTPException(status_code=404, detail="Product not found")


# ==================== TMAPI Configuration ====================

class TmapiConfigRequest(BaseModel):
    api_token: str = Field(..., description="TMAPI API token from console.tmapi.io")


@router.post("/tmapi/configure")
async def configure_tmapi(request: TmapiConfigRequest):
    """Configure TMAPI token for accessing 1688 product data"""
    global TMAPI_TOKEN
    
    # Test the token
    test_url = f"{TMAPI_BASE_URL}/1688/item_detail"
    test_params = {
        "apiToken": request.api_token,
        "item_id": "652702302959",  # Test product ID
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(test_url, params=test_params)
            result = response.json()
            
            if result.get("code") == 200 or result.get("data"):
                # Token works! Save it
                TMAPI_TOKEN = request.api_token
                
                # Also save to .env for persistence
                env_path = Path(__file__).parent.parent / '.env'
                with open(env_path, 'a') as f:
                    f.write(f"\nTMAPI_TOKEN={request.api_token}")
                
                return {
                    "success": True,
                    "message": "TMAPI token configured successfully",
                    "test_product": result.get("data", {}).get("item", {}).get("title", "Test successful")
                }
            else:
                return {
                    "success": False,
                    "message": f"Token validation failed: {result.get('message', 'Unknown error')}",
                    "code": result.get("code")
                }
                
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to validate token: {str(e)}"
        }


@router.get("/tmapi/status")
async def get_tmapi_status():
    """Check TMAPI configuration status"""
    return {
        "configured": bool(TMAPI_TOKEN),
        "token_preview": TMAPI_TOKEN[:8] + "..." if TMAPI_TOKEN else None,
        "api_url": TMAPI_BASE_URL,
        "supported_platforms": ["1688", "taobao", "tmall"],
    }


# ==================== IMAGE SEARCH API ====================

class ImageSearchRequest(BaseModel):
    """Request for image search"""
    image_url: str = Field(..., description="URL of the image to search with")
    page: int = Field(1, description="Page number")
    page_size: int = Field(20, description="Items per page (max 20)")
    sort: str = Field("default", description="Sort: default, sales, price_up, price_down")
    price_start: Optional[str] = Field(None, description="Minimum price filter")
    price_end: Optional[str] = Field(None, description="Maximum price filter")


@router.post("/image-search")
async def search_by_image(request: ImageSearchRequest):
    """
    Search for 1688 products using an image URL.
    
    Steps:
    1. If image is not from Alibaba, convert it first using /image-convert endpoint
    2. Search for matching products
    3. Returns list of similar products with prices, sales, etc.
    """
    if not TMAPI_TOKEN:
        raise HTTPException(status_code=400, detail="TMAPI token not configured")
    
    try:
        # Step 1: Convert image URL if not from Alibaba
        img_url = request.image_url
        if not any(domain in img_url.lower() for domain in ['alicdn.com', '1688.com', 'taobao.com', 'tmall.com']):
            # Convert the image URL first
            convert_url = f"{TMAPI_BASE_URL}/1688/img_url_transfer"
            convert_params = {
                "apiToken": TMAPI_TOKEN,
                "url": img_url,
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                convert_response = await client.get(convert_url, params=convert_params)
                convert_result = convert_response.json()
                
                if convert_result.get("code") == 200 and convert_result.get("data", {}).get("img_url"):
                    img_url = convert_result["data"]["img_url"]
                    print(f"[Image Search] Converted image URL: {img_url[:50]}...")
                else:
                    # Try using original URL anyway
                    print(f"[Image Search] Could not convert image, trying original URL")
        
        # Step 2: Search by image - using correct TMAPI endpoint
        search_url = f"{TMAPI_BASE_URL}/1688/search/image"
        search_params = {
            "apiToken": TMAPI_TOKEN,
            "img_url": img_url,
            "page": request.page,
            "page_size": min(request.page_size, 20),
            "sort": request.sort,
        }
        
        if request.price_start:
            search_params["price_start"] = request.price_start
        if request.price_end:
            search_params["price_end"] = request.price_end
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(search_url, params=search_params)
            result = response.json()
            
            if result.get("code") != 200:
                return {
                    "success": False,
                    "error": result.get("msg", "Image search failed"),
                    "code": result.get("code"),
                }
            
            data = result.get("data", {})
            items = data.get("items", [])
            
            # Parse results with full product info
            products = []
            for item in items:
                product_id = str(item.get("item_id") or item.get("num_iid") or "")
                shop_info = item.get("shop_info", {})
                price_info = item.get("price_info", {})
                sale_info = item.get("sale_info", {})
                
                products.append({
                    "product_id": product_id,
                    "title": item.get("title"),
                    "price": item.get("price") or price_info.get("origin_price"),
                    "wholesale_price": price_info.get("wholesale_price"),
                    "dropship_price": price_info.get("drop_ship_price"),
                    "sales": sale_info.get("sale_quantity") or item.get("sales") or 0,
                    "orders": sale_info.get("orders_count") or 0,
                    "image": item.get("img") or item.get("pic_url"),
                    "shop_name": shop_info.get("company_name") or shop_info.get("login_id") or item.get("shop_name"),
                    "shop_url": shop_info.get("shop_url"),
                    "is_factory": shop_info.get("is_factory", False),
                    "location": shop_info.get("location", []),
                    "url": item.get("product_url") or f"https://detail.1688.com/offer/{product_id}.html",
                    "min_order": item.get("quantity_begin") or 1,
                })
            
            return {
                "success": True,
                "total": data.get("total_count") or len(products),
                "page": data.get("page") or request.page,
                "page_size": data.get("page_size") or request.page_size,
                "products": products,
                "converted_image": img_url if img_url != request.image_url else None,
            }
            
    except Exception as e:
        print(f"[Image Search] Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
        }


@router.post("/image-convert")
async def convert_image_url(image_url: str = Query(..., description="Image URL to convert")):
    """
    Convert a non-Alibaba image URL to an Alibaba-compatible URL.
    Required before using image search with external images.
    The converted URL is valid for 24 hours.
    """
    if not TMAPI_TOKEN:
        raise HTTPException(status_code=400, detail="TMAPI token not configured")
    
    try:
        url = f"{TMAPI_BASE_URL}/1688/img_url_transfer"
        params = {
            "apiToken": TMAPI_TOKEN,
            "url": image_url,
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            result = response.json()
            
            if result.get("code") == 200 and result.get("data", {}).get("img_url"):
                return {
                    "success": True,
                    "original_url": image_url,
                    "converted_url": result["data"]["img_url"],
                    "valid_for": "24 hours",
                }
            else:
                return {
                    "success": False,
                    "error": result.get("msg", "Failed to convert image URL"),
                    "code": result.get("code"),
                }
                
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


@router.post("/link-product-by-image")
async def link_product_by_image(
    order_item_index: int = Query(..., description="Index of the order item to link"),
    customer_id: str = Query(..., description="Customer/Order ID"),
    image_url: str = Query(..., description="Image URL to search with"),
    store_name: str = Query("tnvcollection", description="Store name"),
):
    """
    Search for a product by image and link the best match to an order item.
    
    This combines:
    1. Image search to find matching 1688 products
    2. Auto-linking the best match to the order
    """
    if not TMAPI_TOKEN:
        raise HTTPException(status_code=400, detail="TMAPI token not configured")
    
    db = get_db()
    
    try:
        # Step 1: Search by image
        search_request = ImageSearchRequest(image_url=image_url, page_size=5)
        search_result = await search_by_image(search_request)
        
        if not search_result.get("success") or not search_result.get("products"):
            return {
                "success": False,
                "error": "No matching products found",
                "search_result": search_result,
            }
        
        # Step 2: Get the best match (first result)
        best_match = search_result["products"][0]
        product_id = best_match["product_id"]
        
        # Step 3: Get full product details with SKUs
        product = await fetch_product_via_tmapi(str(product_id))
        
        # Step 4: Update the order with the linked product
        update_result = await db.customers.update_one(
            {"customer_id": customer_id, "store_name": store_name},
            {
                "$set": {
                    f"line_items.{order_item_index}.linked_1688_product_id": str(product_id),
                    f"line_items.{order_item_index}.linked_1688_url": best_match["url"],
                    f"line_items.{order_item_index}.linked_1688_title": best_match["title"],
                    f"line_items.{order_item_index}.linked_1688_price": best_match.get("price"),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            }
        )
        
        return {
            "success": True,
            "linked_product": {
                "product_id": product_id,
                "title": best_match["title"],
                "price": best_match.get("price"),
                "image": best_match.get("image"),
                "url": best_match["url"],
            },
            "product_details": product,
            "all_matches": search_result["products"][:5],
            "message": f"Linked product {product_id} to order item",
        }
        
    except Exception as e:
        print(f"[Link by Image] Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
        }


@router.post("/batch-import")
async def batch_import_products(request: BatchImportRequest, background_tasks: BackgroundTasks):
    """
    Import multiple products by their product IDs.
    Supports: 1688, Taobao, and Tmall products.
    
    Accepts product IDs or full product URLs (will extract ID).
    
    Examples:
    - 1688: "739758517850" or "https://detail.1688.com/offer/739758517850.html"
    - Taobao: "649752139926" or "https://item.taobao.com/item.htm?id=649752139926"
    - Tmall: "https://detail.tmall.com/item.htm?id=649752139926"
    """
    import uuid
    db = get_db()
    
    # Extract product IDs from URLs if needed
    product_ids = []
    for item in request.product_ids:
        item = item.strip()
        if not item:
            continue
        
        # Keep the full URL/ID for platform detection later
        # Extract ID from 1688 URL
        id_match = re.search(r'offer/(\d{10,})', item)
        if id_match:
            product_ids.append(item)  # Keep original to detect platform
        # Extract ID from Taobao/Tmall URL
        elif 'id=' in item:
            product_ids.append(item)  # Keep original to detect platform
        elif item.isdigit() and len(item) >= 10:
            product_ids.append(item)
    
    if not product_ids:
        raise HTTPException(status_code=400, detail="No valid product IDs found")
    
    job_id = str(uuid.uuid4())[:8]
    
    scrape_jobs[job_id] = {
        "status": "started",
        "url": "batch_import",
        "progress": 0,
        "total": len(product_ids),
        "products_scraped": 0,
        "products_created": 0,
        "errors": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Run import in background
    background_tasks.add_task(
        run_batch_import,
        job_id,
        product_ids,
        request.store_name,
        request.create_in_shopify,
        request.translate
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "message": f"Importing {len(product_ids)} products" + (" with translation" if request.translate else ""),
        "product_ids": product_ids,
    }


async def run_batch_import(
    job_id: str,
    product_ids: List[str],
    store_name: Optional[str],
    create_in_shopify: bool,
    translate: bool = True
):
    """Background task to import products by ID using TMAPI (best) or fallback APIs"""
    db = get_db()
    
    scrape_jobs[job_id]["status"] = "processing"
    scrape_jobs[job_id]["translate"] = translate
    
    for i, product_id_or_url in enumerate(product_ids):
        try:
            product = None
            product_id = product_id_or_url
            
            # Extract product ID from URL if needed
            id_match = re.search(r'offer/(\d{10,})', product_id_or_url)
            if id_match:
                product_id = id_match.group(1)
            else:
                # Check for Taobao/Tmall URL pattern
                taobao_match = re.search(r'[?&]id=(\d+)', product_id_or_url)
                if taobao_match:
                    product_id = taobao_match.group(1)
            
            # Detect platform
            platform = detect_product_platform(product_id_or_url)
            
            # Method 1: TMAPI (third-party API - works for ANY product, like Dianxiaomi)
            if TMAPI_TOKEN:
                try:
                    if platform == "taobao":
                        product = await fetch_taobao_product_via_tmapi(product_id)
                    else:
                        product = await fetch_product_via_tmapi(product_id)
                    
                    if product:
                        scrape_jobs[job_id]["method_used"] = f"tmapi_{platform}"
                except Exception as tmapi_error:
                    print(f"[TMAPI] Error for {product_id}: {tmapi_error}")
            
            # Method 2: Official 1688 API (only works for products from your suppliers)
            if not product and platform == "1688":
                try:
                    api_product = await fetch_product_via_api(product_id)
                    if api_product and api_product.get("title"):
                        product = api_product
                        scrape_jobs[job_id]["method_used"] = "official_api"
                except Exception as api_error:
                    print(f"[Official API] Error for {product_id}: {api_error}")
            
            # Method 3: Fall back to HTML scraping if all APIs fail (1688 only)
            if not product and platform == "1688":
                product = await scrape_product_details(product_id)
                if product:
                    scrape_jobs[job_id]["method_used"] = "scrape"
            
            if product and product.get("title"):
                # Translate if requested
                if translate:
                    try:
                        product = await translate_product(product)
                        scrape_jobs[job_id]["translated"] = scrape_jobs[job_id].get("translated", 0) + 1
                    except Exception as trans_error:
                        print(f"Translation failed for {product_id}: {trans_error}")
                
                # Save to database
                product["scraped_at"] = datetime.now(timezone.utc).isoformat()
                product["source_url"] = "batch_import"
                
                await db.scraped_products.update_one(
                    {"product_id": product["product_id"]},
                    {"$set": product},
                    upsert=True
                )
                
                scrape_jobs[job_id]["products_scraped"] += 1
                
                # Create in Shopify if requested
                if create_in_shopify and store_name:
                    shopify_id = await create_shopify_product(product, store_name)
                    if shopify_id:
                        scrape_jobs[job_id]["products_created"] += 1
                        await db.scraped_products.update_one(
                            {"product_id": product["product_id"]},
                            {"$set": {"shopify_product_id": shopify_id}}
                        )
            else:
                scrape_jobs[job_id]["errors"].append(f"Product {product_id}: No data found (may not be from your suppliers)")
                
        except Exception as e:
            scrape_jobs[job_id]["errors"].append(f"Product {product_id}: {str(e)}")
        
        scrape_jobs[job_id]["progress"] = int((i + 1) / len(product_ids) * 100)
    
    scrape_jobs[job_id]["status"] = "completed"
    scrape_jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()



@router.post("/extension-import")
async def extension_import_products(request: ExtensionImportRequest, background_tasks: BackgroundTasks):
    """
    Import products directly from browser extension with full scraped data.
    This bypasses the server-side scraping limitation since the extension 
    already extracted the data from the user's browser session.
    """
    import uuid
    db = get_db()
    
    if not request.products:
        raise HTTPException(status_code=400, detail="No products provided")
    
    job_id = str(uuid.uuid4())[:8]
    
    scrape_jobs[job_id] = {
        "status": "started",
        "url": "extension_import",
        "progress": 0,
        "total": len(request.products),
        "products_scraped": 0,
        "products_created": 0,
        "errors": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Run import in background
    background_tasks.add_task(
        run_extension_import,
        job_id,
        request.products,
        request.translate
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "message": f"Importing {len(request.products)} products from extension" + (" with translation" if request.translate else ""),
        "product_ids": [p.id for p in request.products],
    }


def parse_variant_props(variant: dict) -> dict:
    """Parse props_names like '颜色:棕色加绒;尺码:40' into color/size fields"""
    result = dict(variant)
    color = variant.get('color', '')
    size = variant.get('size', '')
    
    # Parse props_names
    props_names = variant.get('props_names', '')
    if props_names:
        for part in props_names.split(';'):
            if ':' in part:
                key, value = part.split(':', 1)
                key_lower = key.strip().lower()
                if '颜色' in key_lower or 'color' in key_lower or '款式' in key_lower:
                    color = color or value.strip()
                if '尺码' in key_lower or '尺寸' in key_lower or 'size' in key_lower or '规格' in key_lower:
                    size = size or value.strip()
    
    # Parse attributes array (TMAPI format)
    for attr in (variant.get('attributes') or []):
        name = (attr.get('name') or attr.get('attributeName') or '').lower()
        value = attr.get('value') or attr.get('attributeValue') or ''
        if '颜色' in name or 'color' in name or '款式' in name:
            color = color or value
        if '尺码' in name or '尺寸' in name or 'size' in name or '规格' in name:
            size = size or value
    
    # Parse price from string
    price = variant.get('price') or variant.get('sale_price') or 0
    if isinstance(price, str):
        try:
            price = float(re.sub(r'[^\d.]', '', price))
        except:
            price = 0
    
    result['color'] = color
    result['size'] = size
    result['price'] = price
    result['spec_id'] = variant.get('spec_id') or variant.get('specid') or variant.get('sku_id') or variant.get('skuid') or ''
    result['stock'] = variant.get('stock') or variant.get('canBookCount') or 0
    
    return result


async def run_extension_import(
    job_id: str,
    products: List[ExtensionProduct],
    translate: bool = True
):
    """Background task to import products directly from extension data - v3/v4 supports full scrape"""
    db = get_db()
    
    scrape_jobs[job_id]["status"] = "processing"
    
    for i, ext_product in enumerate(products):
        try:
            # Check if we have full data from v3/v4 extension (NO API NEEDED!)
            if ext_product.fullData:
                full = ext_product.fullData
                
                # Parse all variants to ensure color/size are extracted
                raw_variants = full.get("skus", []) or full.get("variants", [])
                parsed_variants = [parse_variant_props(v) for v in raw_variants]
                
                # Collect images from multiple sources
                images = list(full.get("images", []))
                images.extend(full.get("main_images", []))
                images.extend(full.get("sku_images", []))
                # Deduplicate while preserving order
                seen = set()
                unique_images = []
                for img in images:
                    if img and img not in seen:
                        seen.add(img)
                        unique_images.append(img)
                
                product = {
                    "product_id": full.get("product_id") or ext_product.id,
                    "url": ext_product.url or f"https://detail.1688.com/offer/{ext_product.id}.html",
                    "title": full.get("title") or full.get("title_cn") or ext_product.title,
                    "title_cn": full.get("title_cn"),
                    "price": full.get("price") or 0,
                    "price_range": full.get("price_range"),
                    "images": unique_images,
                    "description": full.get("description"),
                    "description_images": full.get("description_images", []),
                    "seller_name": full.get("seller", {}).get("name") if full.get("seller") else None,
                    "seller_member_id": full.get("seller", {}).get("member_id") if full.get("seller") else None,
                    "min_order": full.get("min_order", 1),
                    "variants": parsed_variants,
                    "sold_count": full.get("sold_count"),
                    "source": "extension_v4_full",
                }
                print(f"[Extension Import v4] Full data: {len(product['images'])} images, {len(product['variants'])} SKUs")
            else:
                # Fallback: Basic data from v2 extension
                price_str = ext_product.price.replace('¥', '').replace(',', '').strip()
                try:
                    price = float(price_str) if price_str else 0
                except:
                    price = 0
                
                product = {
                    "product_id": ext_product.id,
                    "url": ext_product.url or f"https://detail.1688.com/offer/{ext_product.id}.html",
                    "title": ext_product.title or f"Product {ext_product.id}",
                    "price": price,
                    "price_range": None,
                    "images": [ext_product.image] if ext_product.image else [],
                    "description": None,
                    "seller_name": None,
                    "min_order": 1,
                    "variants": [],
                    "source": "extension_v2_basic",
                }
            
            # Translate if requested
            if translate and product.get("title"):
                try:
                    product = await translate_product(product)
                    scrape_jobs[job_id]["translated"] = scrape_jobs[job_id].get("translated", 0) + 1
                except Exception as trans_error:
                    print(f"Translation failed for {ext_product.id}: {trans_error}")
            
            # Save to database
            product["scraped_at"] = datetime.now(timezone.utc).isoformat()
            product["source_url"] = "extension_import"
            
            await db.scraped_products.update_one(
                {"product_id": product["product_id"]},
                {"$set": product},
                upsert=True
            )
            
            scrape_jobs[job_id]["products_scraped"] += 1
            print(f"[Extension Import] Saved product {ext_product.id}: {product.get('title', '')[:40]}")
                
        except Exception as e:
            print(f"[Extension Import] Error with {ext_product.id}: {e}")
            scrape_jobs[job_id]["errors"].append(f"Product {ext_product.id}: {str(e)}")
        
        scrape_jobs[job_id]["progress"] = int((i + 1) / len(products) * 100)
    
    scrape_jobs[job_id]["status"] = "completed"
    scrape_jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
    print(f"[Extension Import] Job {job_id} completed: {scrape_jobs[job_id]['products_scraped']}/{len(products)} products")




@router.put("/products/{product_id}")
async def update_product(product_id: str, product_data: dict = Body(...)):
    """Update a scraped product (for editing before Shopify publish)"""
    db = get_db()
    
    try:
        # Remove _id if present to avoid MongoDB errors
        product_data.pop('_id', None)
        product_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        result = await db.scraped_products.update_one(
            {"product_id": product_id},
            {"$set": product_data}
        )
        
        if result.matched_count > 0:
            return {"success": True, "message": "Product updated"}
        else:
            return {"success": False, "error": "Product not found"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/products/{product_id}")
async def get_product(product_id: str):
    """Get a single product by ID"""
    db = get_db()
    
    try:
        product = await db.scraped_products.find_one(
            {"product_id": product_id},
            {"_id": 0}
        )
        
        if product:
            return {"success": True, "product": product}
        else:
            return {"success": False, "error": "Product not found"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    """Delete a scraped product"""
    db = get_db()
    
    try:
        result = await db.scraped_products.delete_one({"product_id": product_id})
        
        if result.deleted_count > 0:
            return {"success": True, "message": "Product deleted"}
        else:
            return {"success": False, "error": "Product not found"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/products/{product_id}/fetch-details")
async def fetch_product_details(product_id: str):
    """
    Fetch full product details including variants/SKUs using TMAPI.
    Updates the product in database with fresh data.
    """
    db = get_db()
    TMAPI_TOKEN = os.environ.get("TMAPI_TOKEN", "")
    
    if not TMAPI_TOKEN:
        return {"success": False, "error": "TMAPI token not configured"}
    
    try:
        # Fetch from TMAPI
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"http://api.tmapi.top/1688/item_detail",
                params={
                    "apiToken": TMAPI_TOKEN,
                    "item_id": product_id,
                }
            )
            data = response.json()
        
        if data.get("code") != 200:
            return {
                "success": False,
                "error": data.get("msg", data.get("message", "TMAPI request failed")),
            }
        
        item = data.get("data", {})
        
        # Extract images
        images = []
        main_imgs = item.get("main_imgs", []) or item.get("images", [])
        for img in main_imgs[:15]:
            if img:
                if img.startswith("//"):
                    img = "https:" + img
                images.append(img)
        
        # Extract variants with proper parsing
        variants = []
        sku_list = item.get("skus", [])
        for sku in sku_list[:50]:
            props_names = sku.get("props_names", "")
            color = ""
            size = ""
            
            if props_names:
                for part in props_names.split(";"):
                    if ":" in part:
                        key, value = part.split(":", 1)
                        key_lower = key.strip().lower()
                        if '颜色' in key_lower or 'color' in key_lower or '款式' in key_lower:
                            color = value.strip()
                        if '尺码' in key_lower or '尺寸' in key_lower or 'size' in key_lower or '规格' in key_lower:
                            size = value.strip()
            
            price_val = sku.get("sale_price") or sku.get("price") or 0
            if isinstance(price_val, str):
                try:
                    price_val = float(price_val)
                except:
                    price_val = 0
            
            variants.append({
                "sku_id": sku.get("skuid"),
                "spec_id": sku.get("specid"),
                "price": price_val,
                "stock": sku.get("stock", 0),
                "props_names": props_names,
                "color": color,
                "size": size,
            })
        
        # Extract price
        price_info = item.get("price_info", {})
        price = float(price_info.get("price", 0) or price_info.get("price_min", 0) or item.get("price", 0) or 0)
        
        # Build update data
        update_data = {
            "title_cn": item.get("title"),
            "price": price,
            "images": images,
            "variants": variants,
            "description": item.get("desc"),
            "min_order": item.get("mixed_batch", {}).get("mix_num", 1) or 1,
            "sold_count": item.get("sale_count"),
            "seller_name": item.get("shop_info", {}).get("shop_name"),
            "seller_member_id": item.get("shop_info", {}).get("shop_id"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "details_fetched": True,
            "source": "tmapi_enriched",
        }
        
        # Translate title if needed
        if item.get("title") and EMERGENT_LLM_KEY:
            try:
                translated_title = await translate_to_english(item.get("title"), "product title")
                if translated_title:
                    update_data["title"] = translated_title
            except Exception as e:
                print(f"Translation failed: {e}")
        
        # Update database
        result = await db.scraped_products.update_one(
            {"product_id": product_id},
            {"$set": update_data}
        )
        
        # Return updated product
        updated_product = await db.scraped_products.find_one(
            {"product_id": product_id},
            {"_id": 0}
        )
        
        return {
            "success": True,
            "message": f"Fetched {len(images)} images and {len(variants)} variants",
            "product": updated_product,
            "images_count": len(images),
            "variants_count": len(variants),
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}



class PublishToShopifyRequest(BaseModel):
    product_ids: List[str]
    store_name: str
    price_multiplier: float = 2.5  # Default markup
    currency_rate: float = 20.0  # CNY to target currency (e.g., PKR)


@router.post("/shopify/publish-batch")
async def publish_products_to_shopify(request: PublishToShopifyRequest):
    """
    Publish scraped products to Shopify with all variants and images.
    This creates full Shopify products with proper variant structure.
    """
    db = get_db()
    
    # Get store credentials
    store = await db.stores.find_one({"store_name": request.store_name}, {"_id": 0})
    if not store or not store.get("shopify_domain") or not store.get("shopify_token"):
        return {"success": False, "error": f"Shopify not configured for store: {request.store_name}"}
    
    results = {
        "success": True,
        "published": [],
        "failed": [],
        "total": len(request.product_ids),
    }
    
    try:
        import shopify
        
        # Initialize Shopify session
        shop_url = f"https://{store['shopify_domain']}"
        api_version = '2024-01'
        session = shopify.Session(shop_url, api_version, store['shopify_token'])
        shopify.ShopifyResource.activate_session(session)
        
        for product_id in request.product_ids:
            try:
                # Get product from database
                product = await db.scraped_products.find_one(
                    {"product_id": product_id},
                    {"_id": 0}
                )
                
                if not product:
                    results["failed"].append({
                        "product_id": product_id,
                        "error": "Product not found in database"
                    })
                    continue
                
                # Check if already published
                if product.get("shopify_product_id"):
                    results["failed"].append({
                        "product_id": product_id,
                        "error": "Already published to Shopify",
                        "shopify_id": product.get("shopify_product_id")
                    })
                    continue
                
                # Create Shopify product
                new_product = shopify.Product()
                
                # Use English title if available, otherwise Chinese
                title = product.get("title") or product.get("title_en") or product.get("title_cn") or f"Product {product_id}"
                new_product.title = title
                
                # Build description
                description = product.get("description") or ""
                new_product.body_html = f"""
                    <p>{description}</p>
                    <hr>
                    <p><strong>Imported from 1688</strong></p>
                    <p>Original Product ID: {product_id}</p>
                    <p>Original Price: ¥{product.get('price', 0):.2f}</p>
                """
                
                new_product.vendor = product.get("seller_name") or "1688 Supplier"
                new_product.product_type = "Imported from 1688"
                new_product.tags = f"1688-import,1688-{product_id}"
                
                # Add images (max 250 for Shopify)
                images = []
                for img_url in (product.get("images") or [])[:20]:
                    if img_url:
                        # Ensure URL is absolute
                        if img_url.startswith("//"):
                            img_url = "https:" + img_url
                        images.append({"src": img_url})
                new_product.images = images
                
                # Build variants
                variants = product.get("variants") or []
                shopify_variants = []
                
                if variants:
                    # Collect unique option values
                    colors = list(set([v.get("color") for v in variants if v.get("color")]))
                    sizes = list(set([v.get("size") for v in variants if v.get("size")]))
                    
                    # Set product options with position (required by Shopify API)
                    options = []
                    position = 1
                    if colors:
                        options.append({"name": "Color", "position": position})
                        position += 1
                    if sizes:
                        options.append({"name": "Size", "position": position})
                    
                    if options:
                        new_product.options = options
                    
                    # Create variant entries using shopify.Variant objects (required by ShopifyAPI library)
                    for v in variants[:100]:  # Shopify limit is 100 variants
                        cny_price = v.get("price") or product.get("price") or 0
                        target_price = round(cny_price * request.currency_rate * request.price_multiplier, 2)
                        
                        variant_obj = shopify.Variant()
                        variant_obj.price = str(target_price)
                        variant_obj.sku = v.get("spec_id") or v.get("sku_id") or f"1688-{product_id}-{len(shopify_variants)}"
                        variant_obj.inventory_management = "shopify"
                        
                        # Add option values
                        if v.get("color"):
                            variant_obj.option1 = v.get("color")
                        if v.get("size"):
                            variant_obj.option2 = v.get("size")
                        
                        shopify_variants.append(variant_obj)
                    
                    new_product.variants = shopify_variants
                else:
                    # Single variant (no options) - use Variant object
                    cny_price = product.get("price") or 0
                    target_price = round(cny_price * request.currency_rate * request.price_multiplier, 2)
                    
                    single_variant = shopify.Variant()
                    single_variant.price = str(target_price)
                    single_variant.sku = f"1688-{product_id}"
                    single_variant.inventory_management = "shopify"
                    
                    new_product.variants = [single_variant]
                
                # Save to Shopify
                success = new_product.save()
                
                if success:
                    shopify_id = str(new_product.id)
                    
                    # Update database with Shopify ID
                    await db.scraped_products.update_one(
                        {"product_id": product_id},
                        {"$set": {
                            "shopify_product_id": shopify_id,
                            "shopify_store": request.store_name,
                            "published_at": datetime.now(timezone.utc).isoformat(),
                        }}
                    )
                    
                    results["published"].append({
                        "product_id": product_id,
                        "shopify_id": shopify_id,
                        "title": title,
                        "variants_count": len(shopify_variants) if shopify_variants else 1,
                        "images_count": len(images),
                    })
                else:
                    error_msg = "Shopify save failed"
                    if hasattr(new_product, 'errors') and new_product.errors:
                        error_msg = str(new_product.errors.full_messages())
                    results["failed"].append({
                        "product_id": product_id,
                        "error": error_msg
                    })
                
            except Exception as e:
                results["failed"].append({
                    "product_id": product_id,
                    "error": str(e)
                })
        
        shopify.ShopifyResource.clear_session()
        
        results["success"] = len(results["failed"]) == 0
        results["message"] = f"Published {len(results['published'])} products, {len(results['failed'])} failed"
        
        return results
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "published": results["published"],
            "failed": results["failed"],
        }


@router.get("/shopify/stores")
async def get_shopify_stores():
    """Get list of stores with Shopify configured"""
    db = get_db()
    
    stores = await db.stores.find(
        {"shopify_domain": {"$exists": True, "$ne": None}},
        {"_id": 0, "store_name": 1, "shopify_domain": 1}
    ).to_list(100)
    
    return {
        "success": True,
        "stores": stores,
    }



class ProductLinkRequest(BaseModel):
    shopify_product_id: Optional[str] = None
    shopify_sku: Optional[str] = None
    product_1688_id: str


@router.post("/products/link-1688")
async def link_product_to_1688(request: ProductLinkRequest):
    """
    Link a Shopify product/SKU to a 1688 product.
    This creates a mapping so orders can be automatically fulfilled.
    """
    db = get_db()
    
    try:
        # Get the 1688 product details
        product_1688 = await db.scraped_products.find_one(
            {"product_id": request.product_1688_id},
            {"_id": 0}
        )
        
        if not product_1688:
            # Try to fetch from TMAPI
            return {
                "success": False,
                "error": f"1688 product {request.product_1688_id} not found. Please import it first."
            }
        
        # Create/update the link in product_links collection
        link_data = {
            "shopify_product_id": request.shopify_product_id,
            "shopify_sku": request.shopify_sku,
            "product_1688_id": request.product_1688_id,
            "product_1688_url": f"https://detail.1688.com/offer/{request.product_1688_id}.html",
            "product_1688_title": product_1688.get("title") or product_1688.get("title_cn"),
            "product_1688_price": product_1688.get("price"),
            "product_1688_image": (product_1688.get("images") or [None])[0],
            "variants_count": len(product_1688.get("variants") or []),
            "linked_at": datetime.now(timezone.utc).isoformat(),
        }
        
        # Use shopify_sku as primary key if available, otherwise use shopify_product_id
        filter_key = {"shopify_sku": request.shopify_sku} if request.shopify_sku else {"shopify_product_id": request.shopify_product_id}
        
        await db.product_links.update_one(
            filter_key,
            {"$set": link_data},
            upsert=True
        )
        
        return {
            "success": True,
            "message": f"Linked to 1688 product {request.product_1688_id}",
            "link": link_data,
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/products/get-1688-link")
async def get_1688_link(
    shopify_sku: Optional[str] = Query(None),
    shopify_product_id: Optional[str] = Query(None)
):
    """
    Get the linked 1688 product for a Shopify SKU or product ID.
    Returns the 1688 product details and URL.
    """
    db = get_db()
    
    if not shopify_sku and not shopify_product_id:
        return {"success": False, "error": "Provide shopify_sku or shopify_product_id"}
    
    # Try to find existing link
    query = {}
    if shopify_sku:
        query["shopify_sku"] = shopify_sku
    else:
        query["shopify_product_id"] = shopify_product_id
    
    link = await db.product_links.find_one(query, {"_id": 0})
    
    if link:
        return {
            "success": True,
            "linked": True,
            "link": link,
        }
    
    # Try to extract 1688 ID from SKU (if SKU contains product ID)
    if shopify_sku:
        import re
        match = re.search(r'(\d{12,})', shopify_sku)
        if match:
            product_1688_id = match.group(1)
            # Check if this product exists in our database
            product = await db.scraped_products.find_one(
                {"product_id": product_1688_id},
                {"_id": 0, "product_id": 1, "title": 1, "title_cn": 1, "price": 1, "images": 1, "variants": 1}
            )
            if product:
                return {
                    "success": True,
                    "linked": False,
                    "suggested_link": {
                        "product_1688_id": product_1688_id,
                        "product_1688_url": f"https://detail.1688.com/offer/{product_1688_id}.html",
                        "product_1688_title": product.get("title") or product.get("title_cn"),
                        "product_1688_price": product.get("price"),
                        "product_1688_image": (product.get("images") or [None])[0],
                        "variants_count": len(product.get("variants") or []),
                        "source": "extracted_from_sku",
                    }
                }
            else:
                return {
                    "success": True,
                    "linked": False,
                    "suggested_link": {
                        "product_1688_id": product_1688_id,
                        "product_1688_url": f"https://detail.1688.com/offer/{product_1688_id}.html",
                        "source": "extracted_from_sku",
                        "needs_import": True,
                    }
                }
    
    return {
        "success": True,
        "linked": False,
        "link": None,
    }


@router.post("/products/auto-link-from-image")
async def auto_link_from_image(
    shopify_sku: str = Query(...),
    image_url: str = Query(...)
):
    """
    Auto-link a Shopify product to 1688 by searching for similar products using image.
    Returns top matches that user can choose from.
    """
    db = get_db()
    TMAPI_TOKEN = os.environ.get("TMAPI_TOKEN", "")
    
    if not TMAPI_TOKEN:
        return {"success": False, "error": "TMAPI token not configured"}
    
    try:
        # Search by image
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{TMAPI_BASE_URL}/1688/search/image",
                params={
                    "apiToken": TMAPI_TOKEN,
                    "img_url": image_url,
                    "page": 1,
                    "page_size": 10,
                }
            )
            result = response.json()
        
        if result.get("code") != 200:
            return {"success": False, "error": result.get("msg", "Image search failed")}
        
        items = result.get("data", {}).get("items", [])
        
        # Format results
        suggestions = []
        for item in items[:5]:
            product_id = str(item.get("item_id", ""))
            shop_info = item.get("shop_info", {})
            
            suggestions.append({
                "product_1688_id": product_id,
                "product_1688_url": f"https://detail.1688.com/offer/{product_id}.html",
                "title": item.get("title"),
                "price": item.get("price"),
                "image": item.get("img"),
                "shop_name": shop_info.get("company_name") or shop_info.get("login_id"),
                "is_factory": shop_info.get("is_factory", False),
            })
        
        return {
            "success": True,
            "shopify_sku": shopify_sku,
            "suggestions": suggestions,
            "total_found": result.get("data", {}).get("total_count", 0),
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/products/links")
async def get_all_product_links(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100)
):
    """Get all product links (Shopify -> 1688 mappings)"""
    db = get_db()
    
    skip = (page - 1) * limit
    
    links = await db.product_links.find(
        {},
        {"_id": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    total = await db.product_links.count_documents({})
    
    return {
        "success": True,
        "links": links,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }
