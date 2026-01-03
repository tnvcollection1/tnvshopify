"""
1688 Product Scraper Service
Scrapes products from 1688 store/collection pages and creates them in Shopify
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


class ScrapeRequest(BaseModel):
    url: str = Field(..., description="1688 store or collection URL")
    store_name: Optional[str] = Field(None, description="Shopify store to import to")
    create_in_shopify: bool = Field(False, description="Auto-create products in Shopify")
    max_products: int = Field(50, description="Maximum products to scrape")


class BatchImportRequest(BaseModel):
    """Request for batch importing products by their IDs"""
    product_ids: List[str] = Field(..., description="List of 1688 product IDs to import")
    store_name: Optional[str] = Field(None, description="Shopify store to import to")
    create_in_shopify: bool = Field(False, description="Auto-create products in Shopify")


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


async def scrape_collection_page(url: str, max_products: int = 50) -> List[Dict]:
    """Scrape all products from a 1688 collection/store page"""
    products = []
    
    try:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            # Fetch the main page
            response = await client.get(url, headers=HEADERS)
            html = response.text
            
            # Extract product IDs
            product_ids = await extract_product_ids_from_page(html)
            print(f"Found {len(product_ids)} product IDs on page")
            
            # Limit products
            product_ids = product_ids[:max_products]
            
            # Scrape each product (with some concurrency)
            semaphore = asyncio.Semaphore(5)  # Limit concurrent requests
            
            async def scrape_with_semaphore(pid):
                async with semaphore:
                    await asyncio.sleep(0.5)  # Rate limiting
                    return await scrape_product_details(pid)
            
            tasks = [scrape_with_semaphore(pid) for pid in product_ids]
            results = await asyncio.gather(*tasks)
            
            products = [p for p in results if p is not None]
            
    except Exception as e:
        print(f"Error scraping collection: {e}")
    
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
    """
    import uuid
    job_id = str(uuid.uuid4())[:8]
    
    scrape_jobs[job_id] = {
        "status": "started",
        "url": request.url,
        "progress": 0,
        "total": 0,
        "products_scraped": 0,
        "products_created": 0,
        "errors": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Start background task
    background_tasks.add_task(
        run_scrape_job,
        job_id,
        request.url,
        request.store_name,
        request.create_in_shopify,
        request.max_products
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "message": "Scraping started",
    }


async def run_scrape_job(
    job_id: str,
    url: str,
    store_name: Optional[str],
    create_in_shopify: bool,
    max_products: int
):
    """Background task to run the scraping job"""
    db = get_db()
    
    try:
        scrape_jobs[job_id]["status"] = "scraping"
        
        # Scrape products
        products = await scrape_collection_page(url, max_products)
        
        scrape_jobs[job_id]["total"] = len(products)
        scrape_jobs[job_id]["products_scraped"] = len(products)
        
        # Save to database
        for i, product in enumerate(products):
            try:
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
        scrape_jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
        
    except Exception as e:
        scrape_jobs[job_id]["status"] = "failed"
        scrape_jobs[job_id]["error"] = str(e)


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
        request.create_in_shopify
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "message": f"Importing {len(product_ids)} products",
        "product_ids": product_ids,
    }


async def run_batch_import(
    job_id: str,
    product_ids: List[str],
    store_name: Optional[str],
    create_in_shopify: bool
):
    """Background task to import products by ID using 1688 API"""
    db = get_db()
    
    scrape_jobs[job_id]["status"] = "processing"
    
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

