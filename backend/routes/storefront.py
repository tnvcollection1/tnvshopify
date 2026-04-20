"""Storefront API - Serves Shopify products to the frontend storefront."""
import os
import httpx
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter(prefix="/api/storefront", tags=["storefront"])

db = None

def set_database(database):
    global db
    db = database

SHOPIFY_TOKEN = os.environ.get("SHOPIFY_ACCESS_TOKEN", "").strip('"')
SHOPIFY_STORE = os.environ.get("SHOPIFY_SHOP_URL", "").strip('"')
HEADERS = {"X-Shopify-Access-Token": SHOPIFY_TOKEN, "Content-Type": "application/json"}
BASE = f"https://{SHOPIFY_STORE}/admin/api/2024-01"


def _format_product(p: dict) -> dict:
    """Transform Shopify product into storefront-friendly format."""
    images = [img["src"] for img in p.get("images", [])]
    variants = p.get("variants", [])
    prices = [float(v["price"]) for v in variants if v.get("price")]
    min_price = min(prices) if prices else 0
    max_price = max(prices) if prices else 0
    colors = list({v.get("option1", "") for v in variants if v.get("option1")} - {""})
    sizes = sorted(list({v.get("option2", "") for v in variants if v.get("option2")} - {""}),
                   key=lambda x: int(x) if x.isdigit() else 0)
    total_inventory = sum(v.get("inventory_quantity", 0) for v in variants)

    return {
        "id": p["id"],
        "title": p["title"],
        "handle": p.get("handle", ""),
        "tags": p.get("tags", ""),
        "product_type": p.get("product_type", ""),
        "vendor": p.get("vendor", ""),
        "images": images,
        "image": images[0] if images else None,
        "min_price": min_price,
        "max_price": max_price,
        "colors": colors[:8],
        "sizes": sizes,
        "in_stock": total_inventory > 0,
        "variants_count": len(variants),
    }


@router.get("/products")
async def get_products(
    limit: int = Query(20, ge=1, le=50),
    page_info: Optional[str] = Query(None),
    collection_id: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("created_at"),
):
    """Fetch products from Shopify."""
    async with httpx.AsyncClient(timeout=20) as client:
        params = {"limit": limit, "status": "active"}
        if page_info:
            params = {"limit": limit, "page_info": page_info}

        if collection_id:
            url = f"{BASE}/collections/{collection_id}/products.json"
        else:
            url = f"{BASE}/products.json"

        resp = await client.get(url, headers=HEADERS, params=params)
        if resp.status_code != 200:
            return {"products": [], "has_next": False}

        products = resp.json().get("products", [])
        formatted = [_format_product(p) for p in products]

        # Check pagination
        link_header = resp.headers.get("link", "")
        has_next = 'rel="next"' in link_header
        next_page = None
        if has_next:
            for part in link_header.split(","):
                if 'rel="next"' in part:
                    next_page = part.split("page_info=")[1].split(">")[0] if "page_info=" in part else None

        return {"products": formatted, "has_next": has_next, "next_page": next_page}


@router.get("/products/{product_id}")
async def get_product(product_id: int):
    """Fetch single product detail."""
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(f"{BASE}/products/{product_id}.json", headers=HEADERS)
        if resp.status_code != 200:
            return {"error": "Product not found"}
        p = resp.json().get("product", {})
        return _format_product(p)


@router.get("/collections")
async def get_collections():
    """Fetch collections."""
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(f"{BASE}/custom_collections.json", headers=HEADERS, params={"limit": 20})
        collections = []
        if resp.status_code == 200:
            for c in resp.json().get("custom_collections", []):
                collections.append({
                    "id": c["id"],
                    "title": c["title"],
                    "handle": c.get("handle", ""),
                    "image": c.get("image", {}).get("src") if c.get("image") else None,
                })
        return {"collections": collections}
