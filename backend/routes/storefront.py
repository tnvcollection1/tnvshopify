"""Storefront API - Serves Shopify products and collections to the frontend."""
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
    images = [img["src"] for img in p.get("images", [])]
    variants = p.get("variants", [])
    prices = [float(v["price"]) for v in variants if v.get("price")]
    min_price = min(prices) if prices else 0
    max_price = max(prices) if prices else 0
    colors = list(dict.fromkeys(v.get("option1", "") for v in variants if v.get("option1")))
    sizes = list(dict.fromkeys(v.get("option2", "") for v in variants if v.get("option2")))
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
        "colors": colors[:10],
        "sizes": sizes,
        "in_stock": total_inventory > 0,
        "variants_count": len(variants),
    }


def _format_product_detail(p: dict) -> dict:
    """Full product detail with variants and options."""
    base = _format_product(p)
    base["body_html"] = p.get("body_html", "")
    base["options"] = [
        {"name": o["name"], "values": o["values"]}
        for o in p.get("options", [])
    ]
    base["variants"] = [
        {
            "id": v["id"],
            "title": v["title"],
            "price": float(v["price"]),
            "compare_at_price": float(v["compare_at_price"]) if v.get("compare_at_price") else None,
            "option1": v.get("option1"),
            "option2": v.get("option2"),
            "option3": v.get("option3"),
            "sku": v.get("sku", ""),
            "inventory_quantity": v.get("inventory_quantity", 0),
            "available": (v.get("inventory_quantity", 0) > 0),
        }
        for v in p.get("variants", [])
    ]
    return base


@router.get("/products")
async def get_products(
    limit: int = Query(20, ge=1, le=50),
    page_info: Optional[str] = Query(None),
    collection_id: Optional[str] = Query(None),
):
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

        link_header = resp.headers.get("link", "")
        has_next = 'rel="next"' in link_header
        next_page = None
        if has_next:
            for part in link_header.split(","):
                if 'rel="next"' in part and "page_info=" in part:
                    next_page = part.split("page_info=")[1].split(">")[0]

        return {"products": formatted, "has_next": has_next, "next_page": next_page}


@router.get("/products/{product_id}")
async def get_product(product_id: int):
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(f"{BASE}/products/{product_id}.json", headers=HEADERS)
        if resp.status_code != 200:
            return {"error": "Product not found"}
        p = resp.json().get("product", {})
        return _format_product_detail(p)


@router.get("/collections")
async def get_collections():
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(f"{BASE}/custom_collections.json", headers=HEADERS, params={"limit": 50})
        collections = []
        if resp.status_code == 200:
            for c in resp.json().get("custom_collections", []):
                collections.append({
                    "id": c["id"],
                    "title": c["title"],
                    "handle": c.get("handle", ""),
                    "image": c.get("image", {}).get("src") if c.get("image") else None,
                    "body_html": c.get("body_html", ""),
                })
        return {"collections": collections}


@router.get("/collections/{collection_id}")
async def get_collection_detail(collection_id: str):
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(f"{BASE}/custom_collections/{collection_id}.json", headers=HEADERS)
        if resp.status_code != 200:
            return {"error": "Collection not found"}
        c = resp.json().get("custom_collection", {})
        return {
            "id": c["id"],
            "title": c["title"],
            "handle": c.get("handle", ""),
            "image": c.get("image", {}).get("src") if c.get("image") else None,
            "body_html": c.get("body_html", ""),
        }
