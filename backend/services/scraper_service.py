"""
Scraper Service
Handles web scraping of 1688 product pages and collection pages
Uses Playwright for JavaScript-rendered pages
"""

import re
import os
import httpx
from typing import List, Dict, Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# HTTP Headers for requests
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Referer': 'https://www.1688.com/',
}


async def scrape_product_details(product_id: str) -> Optional[Dict]:
    """
    Scrape details for a single product using HTTP request.
    This is a fallback method when TMAPI is not available.
    
    Args:
        product_id: 1688 product ID
    
    Returns:
        Product dict or None
    """
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
                "source": "scrape",
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
                    except ValueError:
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
                    sku_str = sku_match.group(1)[:2000]
                    color_match = re.findall(r'"value"[:\s]*"([^"]+)"', sku_str)
                    if color_match:
                        product["variants"] = [{"name": v} for v in color_match[:20]]
                except Exception:
                    pass
            
            return product
            
    except Exception as e:
        logger.error(f"Error scraping product {product_id}: {e}")
        return None


async def scrape_collection_with_playwright(url: str, max_products: int = 50) -> List[str]:
    """
    Use Playwright headless browser to scrape product IDs from a 1688 collection/store page.
    This bypasses anti-bot protection by rendering JavaScript.
    
    Args:
        url: 1688 collection or store URL
        max_products: Maximum number of product IDs to extract
    
    Returns:
        List of product IDs
    """
    from playwright.async_api import async_playwright
    
    # Ensure Playwright can find browsers
    os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/pw-browsers'
    
    product_ids = []
    
    try:
        async with async_playwright() as p:
            # Launch headless browser
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
            
            logger.info(f"[Playwright] Navigating to: {url}")
            
            # Navigate to the page
            try:
                await page.goto(url, wait_until='networkidle', timeout=60000)
            except Exception as nav_err:
                logger.warning(f"[Playwright] Navigation error (continuing anyway): {nav_err}")
                await page.goto(url, wait_until='load', timeout=60000)
            
            # Log the page title
            title = await page.title()
            logger.info(f"[Playwright] Page title: {title}")
            
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
                    logger.info(f"[Playwright] Found elements with selector: {selector}")
                    break
                except Exception:
                    continue
            
            # Wait for dynamic content
            await page.wait_for_timeout(3000)
            
            # Scroll to load more products (lazy loading)
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
                r'offer/(\d{10,})',
                r'data-offer-id=["\'](\d{10,})["\']',
                r'"offerId"[:\s]*["\']?(\d{10,})["\']?',
            ]
            
            seen = set()
            for pattern in patterns:
                matches = re.findall(pattern, html)
                for match in matches:
                    if match not in seen:
                        seen.add(match)
                        product_ids.append(match)
            
            logger.info(f"[Playwright] Extracted {len(product_ids)} product IDs")
            
            # Also try to get from page elements
            try:
                elements = await page.query_selector_all('a[href*="offer/"]')
                for el in elements[:100]:
                    href = await el.get_attribute('href')
                    if href:
                        match = re.search(r'offer/(\d{10,})', href)
                        if match and match.group(1) not in seen:
                            seen.add(match.group(1))
                            product_ids.append(match.group(1))
            except Exception as e:
                logger.warning(f"[Playwright] Error extracting from elements: {e}")
            
            await browser.close()
            
    except Exception as e:
        logger.error(f"[Playwright] Error: {e}")
        import traceback
        traceback.print_exc()
    
    # Limit and deduplicate
    unique_ids = list(dict.fromkeys(product_ids))[:max_products]
    logger.info(f"[Playwright] Final product IDs: {len(unique_ids)}")
    
    return unique_ids


async def scrape_collection_page(url: str, max_products: int = 50) -> List[Dict]:
    """
    Scrape all products from a 1688 collection/store page.
    Uses Playwright headless browser for reliable JavaScript rendering.
    
    Args:
        url: 1688 collection or store URL
        max_products: Maximum number of products to scrape
    
    Returns:
        List of product dicts with basic info
    """
    products = []
    
    try:
        # Step 1: Use Playwright to get product IDs
        logger.info(f"[Scraper] Starting Playwright scrape for: {url}")
        product_ids = await scrape_collection_with_playwright(url, max_products)
        
        if not product_ids:
            logger.warning("[Scraper] No product IDs found via Playwright, trying fallback")
            # Fallback: Try simple HTTP request
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(url, headers=HEADERS)
                html = response.text
                
                # Extract product IDs from HTML
                patterns = [
                    r'offer/(\d{10,})',
                    r'"offerId"[:\s]*["\']?(\d{10,})["\']?',
                ]
                
                seen = set()
                for pattern in patterns:
                    matches = re.findall(pattern, html)
                    for match in matches:
                        if match not in seen:
                            seen.add(match)
                            product_ids.append(match)
                
                product_ids = list(dict.fromkeys(product_ids))[:max_products]
        
        logger.info(f"[Scraper] Found {len(product_ids)} products to scrape")
        
        # Step 2: Return basic product info (full details fetched later via TMAPI)
        for pid in product_ids:
            products.append({
                "product_id": pid,
                "url": f"https://detail.1688.com/offer/{pid}.html",
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            })
        
    except Exception as e:
        logger.error(f"[Scraper] Error scraping collection: {e}")
    
    return products


async def extract_product_ids_from_html(html: str) -> List[str]:
    """
    Extract product IDs from HTML content.
    
    Args:
        html: HTML content string
    
    Returns:
        List of unique product IDs
    """
    patterns = [
        r'offer/(\d{10,})',
        r'data-offer-id=["\'](\d{10,})["\']',
        r'"offerId"[:\s]*["\']?(\d{10,})["\']?',
        r'"item_id"[:\s]*["\']?(\d{10,})["\']?',
    ]
    
    seen = set()
    product_ids = []
    
    for pattern in patterns:
        matches = re.findall(pattern, html)
        for match in matches:
            if match not in seen:
                seen.add(match)
                product_ids.append(match)
    
    return product_ids


async def extract_product_ids_from_url(url: str) -> Optional[str]:
    """
    Extract a product ID from a 1688 URL.
    
    Args:
        url: 1688 product URL
    
    Returns:
        Product ID or None
    """
    match = re.search(r'offer/(\d{10,})', url)
    if match:
        return match.group(1)
    
    match = re.search(r'id=(\d{10,})', url)
    if match:
        return match.group(1)
    
    return None
