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
from typing import List, Dict, Optional
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
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

# 1688 API Configuration
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
    
    product_ids = []
    
    try:
        async with async_playwright() as p:
            # Launch headless browser
            browser = await p.chromium.launch(
                headless=True,
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
            await page.goto(url, wait_until='networkidle', timeout=60000)
            
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


@router.post("/batch-import")
async def batch_import_products(request: BatchImportRequest, background_tasks: BackgroundTasks):
    """
    Import multiple products by their 1688 product IDs.
    This uses direct product scraping (works better than page scraping).
    
    Accepts product IDs or full product URLs (will extract ID).
    """
    import uuid
    db = get_db()
    
    # Extract product IDs from URLs if needed
    product_ids = []
    for item in request.product_ids:
        item = item.strip()
        if not item:
            continue
        # Extract ID from URL if it's a URL
        id_match = re.search(r'offer/(\d{10,})', item)
        if id_match:
            product_ids.append(id_match.group(1))
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
    """Background task to import products by ID using 1688 API"""
    db = get_db()
    
    scrape_jobs[job_id]["status"] = "processing"
    scrape_jobs[job_id]["translate"] = translate
    
    for i, product_id in enumerate(product_ids):
        try:
            product = None
            
            # Method 1: Try to use 1688 API first (works for products from suppliers you've ordered from)
            try:
                api_product = await fetch_product_via_api(product_id)
                if api_product and api_product.get("title"):
                    product = api_product
            except Exception as api_error:
                print(f"API fetch failed for {product_id}: {api_error}")
            
            # Method 2: Fall back to HTML scraping if API fails
            if not product:
                product = await scrape_product_details(product_id)
            
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

