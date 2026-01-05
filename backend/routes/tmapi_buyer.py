"""
TMAPI Buyer Features Integration
Complete integration for 1688.com buyer features:
- Image Search (search products by image)
- Keyword Search (search products by keyword)
- Shop Items (get all products from a shop)
- Shop Info (get shop/seller information)
- Image URL Conversion (convert external images for search)

API Documentation: https://tmapi.top/docs/ali/
"""

from fastapi import APIRouter, HTTPException, Query, Body, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import httpx
import os
import json
import base64

router = APIRouter(prefix="/api/tmapi", tags=["TMAPI Buyer Features"])

# TMAPI Configuration
TMAPI_BASE_URL = "http://api.tmapi.top"
TMAPI_TOKEN = os.environ.get("TMAPI_TOKEN", "")


async def tmapi_get(endpoint: str, params: dict) -> dict:
    """Make GET request to TMAPI"""
    url = f"{TMAPI_BASE_URL}{endpoint}"
    params['apiToken'] = TMAPI_TOKEN
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params)
            data = response.json()
            
            # Check for common errors
            if data.get("message") == "Insufficient API balance":
                raise HTTPException(
                    status_code=402,
                    detail="TMAPI balance insufficient. Please top up at https://console.tmapi.io/"
                )
            
            return data
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="TMAPI request timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"TMAPI connection error: {str(e)}")


async def tmapi_post(endpoint: str, params: dict, body: dict) -> dict:
    """Make POST request to TMAPI"""
    url = f"{TMAPI_BASE_URL}{endpoint}"
    params['apiToken'] = TMAPI_TOKEN
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, params=params, json=body)
            data = response.json()
            
            if data.get("message") == "Insufficient API balance":
                raise HTTPException(
                    status_code=402,
                    detail="TMAPI balance insufficient. Please top up at https://console.tmapi.io/"
                )
            
            return data
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="TMAPI request timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"TMAPI connection error: {str(e)}")


# ==================== Image Search ====================

class ImageSearchRequest(BaseModel):
    img_url: str = Field(..., description="Image URL (must be from Alibaba platform or converted first)")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=20, description="Items per page (max 20)")
    sort: str = Field("default", description="Sort: default, sales, price_up, price_down")
    price_start: Optional[str] = Field(None, description="Minimum price filter")
    price_end: Optional[str] = Field(None, description="Maximum price filter")
    support_dropshipping: Optional[bool] = Field(None, description="Filter: supports dropshipping")
    is_factory: Optional[bool] = Field(None, description="Filter: is factory")
    verified_supplier: Optional[bool] = Field(None, description="Filter: verified supplier")
    free_shipping: Optional[bool] = Field(None, description="Filter: free shipping")
    new_arrival: Optional[bool] = Field(None, description="Filter: new arrivals")


@router.post("/image-search")
async def search_by_image(request: ImageSearchRequest):
    """
    Search 1688 products by image URL.
    
    IMPORTANT: Only images from Alibaba-affiliated platforms can be identified directly.
    For external images, use /api/tmapi/convert-image first to get a compatible URL.
    """
    params = {
        "img_url": request.img_url,
        "page": request.page,
        "page_size": request.page_size,
        "sort": request.sort,
    }
    
    # Add optional filters
    if request.price_start:
        params["price_start"] = request.price_start
    if request.price_end:
        params["price_end"] = request.price_end
    if request.support_dropshipping is not None:
        params["support_dropshipping"] = request.support_dropshipping
    if request.is_factory is not None:
        params["is_factory"] = request.is_factory
    if request.verified_supplier is not None:
        params["verified_supplier"] = request.verified_supplier
    if request.free_shipping is not None:
        params["free_shipping"] = request.free_shipping
    if request.new_arrival is not None:
        params["new_arrival"] = request.new_arrival
    
    result = await tmapi_get("/1688/search/img", params)
    
    if result.get("code") == 200:
        return {
            "success": True,
            "total": result.get("data", {}).get("total", 0),
            "page": request.page,
            "page_size": request.page_size,
            "items": result.get("data", {}).get("items", []),
        }
    else:
        return {
            "success": False,
            "error": result.get("message", "Image search failed"),
            "code": result.get("code"),
        }


@router.get("/image-search")
async def search_by_image_get(
    img_url: str = Query(..., description="Image URL"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=20),
    sort: str = Query("default"),
):
    """GET version of image search for simpler testing"""
    request = ImageSearchRequest(
        img_url=img_url,
        page=page,
        page_size=page_size,
        sort=sort,
    )
    return await search_by_image(request)


# ==================== Image URL Conversion ====================

class ConvertImageRequest(BaseModel):
    url: str = Field(..., description="External image URL to convert")


@router.post("/convert-image")
async def convert_image_url(request: ConvertImageRequest):
    """
    Convert external image URL to Alibaba-compatible URL.
    Required before using image search with non-Alibaba images.
    
    The converted URL is valid for 24 hours.
    """
    result = await tmapi_post("/1688/img/upload", {}, {"url": request.url})
    
    if result.get("code") == 200:
        return {
            "success": True,
            "original_url": request.url,
            "converted_url": result.get("data", {}).get("img_url"),
            "expires_in": "24 hours",
        }
    else:
        return {
            "success": False,
            "error": result.get("message", "Image conversion failed"),
        }


# ==================== Keyword Search ====================

class KeywordSearchRequest(BaseModel):
    keyword: str = Field(..., description="Search keyword")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=50, description="Items per page (max 50)")
    sort: str = Field("default", description="Sort: default, sales, price_up, price_down, credit")
    price_start: Optional[str] = Field(None, description="Minimum price filter")
    price_end: Optional[str] = Field(None, description="Maximum price filter")
    quan_start: Optional[str] = Field(None, description="Minimum order quantity filter")
    support_dropshipping: Optional[bool] = Field(None, description="Filter: supports dropshipping")
    is_factory: Optional[bool] = Field(None, description="Filter: is factory")
    verified_supplier: Optional[bool] = Field(None, description="Filter: verified supplier")
    free_shipping: Optional[bool] = Field(None, description="Filter: free shipping")
    new_arrival: Optional[bool] = Field(None, description="Filter: new arrivals")


@router.post("/keyword-search")
async def search_by_keyword(request: KeywordSearchRequest):
    """
    Search 1688 products by keyword.
    Supports various filters and sorting options.
    """
    params = {
        "keyword": request.keyword,
        "page": request.page,
        "page_size": request.page_size,
        "sort": request.sort,
    }
    
    # Add optional filters
    if request.price_start:
        params["price_start"] = request.price_start
    if request.price_end:
        params["price_end"] = request.price_end
    if request.quan_start:
        params["quan_start"] = request.quan_start
    if request.support_dropshipping is not None:
        params["support_dropshipping"] = request.support_dropshipping
    if request.is_factory is not None:
        params["is_factory"] = request.is_factory
    if request.verified_supplier is not None:
        params["verified_supplier"] = request.verified_supplier
    if request.free_shipping is not None:
        params["free_shipping"] = request.free_shipping
    if request.new_arrival is not None:
        params["new_arrival"] = request.new_arrival
    
    result = await tmapi_get("/1688/search/items", params)
    
    if result.get("code") == 200:
        return {
            "success": True,
            "keyword": request.keyword,
            "total": result.get("data", {}).get("total", 0),
            "page": request.page,
            "page_size": request.page_size,
            "items": result.get("data", {}).get("items", []),
        }
    else:
        return {
            "success": False,
            "error": result.get("message", "Keyword search failed"),
            "code": result.get("code"),
        }


@router.get("/keyword-search")
async def search_by_keyword_get(
    keyword: str = Query(..., description="Search keyword"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    sort: str = Query("default"),
):
    """GET version of keyword search"""
    request = KeywordSearchRequest(
        keyword=keyword,
        page=page,
        page_size=page_size,
        sort=sort,
    )
    return await search_by_keyword(request)


# ==================== Shop Items ====================

class ShopItemsRequest(BaseModel):
    member_id: str = Field(..., description="Seller member ID")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=50, description="Items per page")
    sort: str = Field("default", description="Sort: default, sales, price_up, price_down, time_up, time_down")
    shop_cat_id: Optional[str] = Field(None, description="Shop category ID filter")
    price_start: Optional[str] = Field(None, description="Minimum price filter")
    price_end: Optional[str] = Field(None, description="Maximum price filter")


@router.post("/shop/items")
async def get_shop_items(request: ShopItemsRequest):
    """
    Get all products from a 1688 shop/seller.
    Use the seller's member_id (found in shop URL or product details).
    """
    params = {
        "member_id": request.member_id,
        "page": request.page,
        "page_size": request.page_size,
        "sort": request.sort,
    }
    
    if request.shop_cat_id:
        params["shop_cat_id"] = request.shop_cat_id
    if request.price_start:
        params["price_start"] = request.price_start
    if request.price_end:
        params["price_end"] = request.price_end
    
    result = await tmapi_get("/1688/shop/items", params)
    
    if result.get("code") == 200:
        return {
            "success": True,
            "member_id": request.member_id,
            "total": result.get("data", {}).get("total", 0),
            "page": request.page,
            "page_size": request.page_size,
            "items": result.get("data", {}).get("items", []),
        }
    else:
        return {
            "success": False,
            "error": result.get("message", "Failed to get shop items"),
            "code": result.get("code"),
        }


@router.get("/shop/items")
async def get_shop_items_get(
    member_id: str = Query(..., description="Seller member ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    sort: str = Query("default"),
):
    """GET version of shop items"""
    request = ShopItemsRequest(
        member_id=member_id,
        page=page,
        page_size=page_size,
        sort=sort,
    )
    return await get_shop_items(request)


# ==================== Shop Information ====================

@router.get("/shop/info")
async def get_shop_info(member_id: str = Query(..., description="Seller member ID")):
    """
    Get detailed information about a 1688 shop/seller.
    Returns shop name, rating, location, years in business, etc.
    """
    result = await tmapi_get("/1688/shop/info", {"member_id": member_id})
    
    if result.get("code") == 200:
        return {
            "success": True,
            "member_id": member_id,
            "shop": result.get("data", {}),
        }
    else:
        return {
            "success": False,
            "error": result.get("message", "Failed to get shop info"),
            "code": result.get("code"),
        }


# ==================== Shop Categories ====================

@router.get("/shop/categories")
async def get_shop_categories(member_id: str = Query(..., description="Seller member ID")):
    """
    Get the product categories available in a 1688 shop.
    Useful for filtering shop items by category.
    """
    result = await tmapi_get("/1688/shop/cats", {"member_id": member_id})
    
    if result.get("code") == 200:
        return {
            "success": True,
            "member_id": member_id,
            "categories": result.get("data", {}).get("categories", []),
        }
    else:
        return {
            "success": False,
            "error": result.get("message", "Failed to get shop categories"),
            "code": result.get("code"),
        }


# ==================== Factory Search ====================

class FactorySearchRequest(BaseModel):
    keyword: str = Field(..., description="Search keyword")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=20, description="Items per page (max 20)")


@router.post("/factory-search")
async def search_factories(request: FactorySearchRequest):
    """
    Search for factories/manufacturers on 1688 by keyword.
    Returns factory information including capabilities and certifications.
    """
    params = {
        "keyword": request.keyword,
        "page": request.page,
        "page_size": request.page_size,
    }
    
    result = await tmapi_get("/1688/search/factory", params)
    
    if result.get("code") == 200:
        return {
            "success": True,
            "keyword": request.keyword,
            "total": result.get("data", {}).get("total", 0),
            "page": request.page,
            "factories": result.get("data", {}).get("items", []),
        }
    else:
        return {
            "success": False,
            "error": result.get("message", "Factory search failed"),
            "code": result.get("code"),
        }


# ==================== Product Detail (Enhanced) ====================

@router.get("/product/{product_id}")
async def get_product_detail(product_id: str):
    """
    Get detailed product information including all variants/SKUs.
    This is an enhanced version with better error handling.
    """
    result = await tmapi_get("/1688/item_detail", {"item_id": product_id})
    
    if result.get("code") == 200:
        data = result.get("data", {})
        return {
            "success": True,
            "product_id": product_id,
            "title": data.get("title"),
            "price": data.get("price"),
            "price_range": data.get("price_range"),
            "images": data.get("images", []),
            "video": data.get("video"),
            "description": data.get("desc"),
            "skus": data.get("skus", []),
            "shop": {
                "name": data.get("shop_name"),
                "member_id": data.get("member_id"),
                "url": data.get("shop_url"),
            },
            "min_order": data.get("min_order"),
            "sold_count": data.get("sold_count"),
            "raw_data": data,
        }
    else:
        return {
            "success": False,
            "error": result.get("message", "Failed to get product details"),
            "code": result.get("code"),
        }


# ==================== Balance Check ====================

@router.get("/balance")
async def check_tmapi_balance():
    """
    Check TMAPI account status and balance.
    Useful for monitoring API usage.
    """
    # Try a simple API call to check status
    try:
        result = await tmapi_get("/1688/item_detail", {"item_id": "739758517850"})
        
        if result.get("message") == "Insufficient API balance":
            return {
                "success": False,
                "status": "insufficient_balance",
                "message": "Your TMAPI balance is depleted. Please top up at https://console.tmapi.io/",
                "action_required": True,
            }
        elif result.get("code") == 200:
            return {
                "success": True,
                "status": "active",
                "message": "TMAPI is working correctly",
                "token_configured": bool(TMAPI_TOKEN),
            }
        else:
            return {
                "success": False,
                "status": "error",
                "message": result.get("message", "Unknown error"),
            }
    except HTTPException as e:
        return {
            "success": False,
            "status": "error",
            "message": str(e.detail),
        }


# ==================== Health Check ====================

@router.get("/health")
async def health_check():
    """Check TMAPI configuration status"""
    return {
        "status": "ok",
        "tmapi_configured": bool(TMAPI_TOKEN),
        "token_prefix": TMAPI_TOKEN[:20] + "..." if TMAPI_TOKEN else None,
        "base_url": TMAPI_BASE_URL,
        "endpoints": {
            "image_search": "/api/tmapi/image-search",
            "keyword_search": "/api/tmapi/keyword-search",
            "shop_items": "/api/tmapi/shop/items",
            "shop_info": "/api/tmapi/shop/info",
            "convert_image": "/api/tmapi/convert-image",
            "product_detail": "/api/tmapi/product/{product_id}",
            "factory_search": "/api/tmapi/factory-search",
            "balance": "/api/tmapi/balance",
        },
    }
