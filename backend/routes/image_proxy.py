"""
Image Proxy Service
Proxies and caches product images from Shopify CDN locally.
This enables full independence from Shopify while caching images on-demand.
"""

import os
import hashlib
import aiohttp
import asyncio
from pathlib import Path
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import FileResponse
import re
from urllib.parse import urlparse, unquote

router = APIRouter()

# Configuration
CACHE_DIR = Path(os.environ.get('IMAGE_CACHE_DIR', '/app/backend/static/uploads/cache'))
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Allowed domains for proxying
ALLOWED_DOMAINS = [
    'cdn.shopify.com',
    'images.unsplash.com',
    'source.unsplash.com',
]


def get_cache_filename(url: str) -> str:
    """Generate a unique cache filename from URL"""
    # Get file extension from URL
    parsed = urlparse(url)
    path = unquote(parsed.path)
    ext = Path(path).suffix.split('?')[0] or '.jpg'
    
    # Create hash of full URL for uniqueness
    url_hash = hashlib.md5(url.encode()).hexdigest()[:16]
    
    # Extract product ID if possible for readability
    match = re.search(r'/products?/(\d+)', url) or re.search(r'/files?/([^/]+)', url)
    if match:
        prefix = match.group(1)[:20]
        return f"{prefix}_{url_hash}{ext}"
    
    return f"{url_hash}{ext}"


def is_allowed_domain(url: str) -> bool:
    """Check if URL domain is allowed for proxying"""
    try:
        domain = urlparse(url).netloc
        return any(allowed in domain for allowed in ALLOWED_DOMAINS)
    except:
        return False


async def fetch_and_cache_image(url: str, cache_path: Path) -> bool:
    """Fetch image from remote URL and cache it locally"""
    try:
        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url) as response:
                if response.status == 200:
                    content = await response.read()
                    
                    # Validate it's actually an image
                    content_type = response.headers.get('content-type', '')
                    if not content_type.startswith('image/'):
                        return False
                    
                    # Cache the image
                    cache_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(cache_path, 'wb') as f:
                        f.write(content)
                    
                    return True
        return False
    except Exception as e:
        print(f"Error fetching image {url}: {e}")
        return False


@router.get("/proxy")
async def proxy_image(url: str):
    """
    Proxy and cache an image from Shopify CDN or other allowed domains.
    
    Usage: /api/images/proxy?url=https://cdn.shopify.com/...
    
    Images are cached locally for fast subsequent access.
    """
    if not url:
        raise HTTPException(status_code=400, detail="Missing url parameter")
    
    # Security: only allow specific domains
    if not is_allowed_domain(url):
        raise HTTPException(
            status_code=403, 
            detail=f"Domain not allowed. Allowed: {', '.join(ALLOWED_DOMAINS)}"
        )
    
    # Check cache first
    cache_filename = get_cache_filename(url)
    cache_path = CACHE_DIR / cache_filename
    
    if cache_path.exists():
        # Serve from cache
        return FileResponse(
            cache_path,
            media_type="image/jpeg",
            headers={"X-Cache": "HIT", "Cache-Control": "public, max-age=31536000"}
        )
    
    # Fetch and cache
    success = await fetch_and_cache_image(url, cache_path)
    
    if success and cache_path.exists():
        return FileResponse(
            cache_path,
            media_type="image/jpeg", 
            headers={"X-Cache": "MISS", "Cache-Control": "public, max-age=31536000"}
        )
    
    # If caching failed, redirect to original URL
    raise HTTPException(status_code=404, detail="Failed to fetch image")


@router.get("/cached/{filename}")
async def get_cached_image(filename: str):
    """Serve a cached image by filename"""
    cache_path = CACHE_DIR / filename
    
    if not cache_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(
        cache_path,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=31536000"}
    )


@router.get("/stats")
async def cache_stats():
    """Get cache statistics"""
    if not CACHE_DIR.exists():
        return {"cached_images": 0, "total_size_mb": 0}
    
    files = list(CACHE_DIR.glob("*"))
    total_size = sum(f.stat().st_size for f in files if f.is_file())
    
    return {
        "cached_images": len(files),
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "cache_dir": str(CACHE_DIR)
    }


@router.delete("/clear")
async def clear_cache():
    """Clear all cached images"""
    if CACHE_DIR.exists():
        import shutil
        count = len(list(CACHE_DIR.glob("*")))
        shutil.rmtree(CACHE_DIR)
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        return {"message": f"Cleared {count} cached images"}
    return {"message": "Cache already empty"}


def transform_shopify_url_to_local(url: str, base_url: str = "") -> str:
    """
    Transform a Shopify CDN URL to use our local proxy.
    
    Example:
    Input:  https://cdn.shopify.com/s/files/1/1190/3220/products/image.jpg
    Output: /api/images/proxy?url=https://cdn.shopify.com/s/files/1/1190/3220/products/image.jpg
    """
    if not url or not isinstance(url, str):
        return url
    
    # Skip if already a local URL
    if url.startswith('/') or url.startswith(base_url):
        return url
    
    # Only transform Shopify URLs
    if 'cdn.shopify.com' in url:
        from urllib.parse import quote
        return f"/api/images/proxy?url={quote(url, safe='')}"
    
    return url


def transform_product_images(product: dict, base_url: str = "") -> dict:
    """Transform all image URLs in a product to use local proxy"""
    if not product:
        return product
    
    # Transform images array
    if 'images' in product and product['images']:
        for img in product['images']:
            if isinstance(img, dict) and 'src' in img:
                img['original_src'] = img['src']
                img['src'] = transform_shopify_url_to_local(img['src'], base_url)
            elif isinstance(img, str):
                # Handle case where images is array of strings
                pass
    
    # Transform image field (single image)
    if 'image' in product and isinstance(product['image'], dict):
        if 'src' in product['image']:
            product['image']['original_src'] = product['image']['src']
            product['image']['src'] = transform_shopify_url_to_local(product['image']['src'], base_url)
    
    return product
