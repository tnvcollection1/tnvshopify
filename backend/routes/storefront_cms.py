"""Storefront CMS Routes
Backend for managing storefront content - banners, collections, homepage sections
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import logging
import uuid
import os
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)

# Will be injected from server.py
db = None

# Upload directory for CMS images
UPLOAD_DIR = Path(__file__).parent.parent / "static" / "uploads" / "cms"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def set_database(database):
    """Set database from server.py"""
    global db
    db = database

router = APIRouter(prefix="/api/storefront-cms", tags=["Storefront CMS"])


# ============ Models ============

class BannerCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    image_url: str
    link_url: Optional[str] = "/shop/products"
    button_text: Optional[str] = "Shop Now"
    position: int = 0
    is_active: bool = True
    store_name: str

class BannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    button_text: Optional[str] = None
    position: Optional[int] = None
    is_active: Optional[bool] = None

class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    product_count: int = 0
    position: int = 0
    is_active: bool = True
    store_name: str

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    product_count: Optional[int] = None
    position: Optional[int] = None
    is_active: Optional[bool] = None

class FeaturedSectionCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    section_type: str = "products"  # products, categories, custom
    product_ids: Optional[List[str]] = []
    max_items: int = 8
    position: int = 0
    is_active: bool = True
    store_name: str

class StorefrontSettingsUpdate(BaseModel):
    store_name: str
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    hero_image: Optional[str] = None
    newsletter_enabled: Optional[bool] = True
    footer_text: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = "#000000"
    accent_color: Optional[str] = "#ffffff"


# ============ Banner Endpoints ============

@router.get("/banners")
async def get_banners(store_name: str, active_only: bool = False):
    """Get all banners for a store"""
    try:
        query = {"store_name": store_name}
        if active_only:
            query["is_active"] = True
        
        banners = await db.storefront_banners.find(query, {"_id": 0}).sort("position", 1).to_list(100)
        return {"banners": banners, "total": len(banners)}
    except Exception as e:
        logger.error(f"Error fetching banners: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/banners")
async def create_banner(banner: BannerCreate):
    """Create a new banner"""
    try:
        banner_doc = {
            "id": str(uuid.uuid4()),
            "title": banner.title,
            "subtitle": banner.subtitle,
            "image_url": banner.image_url,
            "link_url": banner.link_url,
            "button_text": banner.button_text,
            "position": banner.position,
            "is_active": banner.is_active,
            "store_name": banner.store_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.storefront_banners.insert_one(banner_doc)
        del banner_doc["_id"]
        return banner_doc
    except Exception as e:
        logger.error(f"Error creating banner: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/banners/{banner_id}")
async def update_banner(banner_id: str, banner: BannerUpdate):
    """Update a banner"""
    try:
        update_data = {k: v for k, v in banner.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.storefront_banners.update_one(
            {"id": banner_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Banner not found")
        
        updated = await db.storefront_banners.find_one({"id": banner_id}, {"_id": 0})
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating banner: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/banners/{banner_id}")
async def delete_banner(banner_id: str):
    """Delete a banner"""
    try:
        result = await db.storefront_banners.delete_one({"id": banner_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Banner not found")
        return {"success": True, "message": "Banner deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting banner: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Collection Endpoints ============

@router.get("/collections")
async def get_collections(store_name: str, active_only: bool = False):
    """Get all collections for a store"""
    try:
        query = {"store_name": store_name}
        if active_only:
            query["is_active"] = True
        
        collections = await db.storefront_collections.find(query, {"_id": 0}).sort("position", 1).to_list(100)
        return {"collections": collections, "total": len(collections)}
    except Exception as e:
        logger.error(f"Error fetching collections: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/collections")
async def create_collection(collection: CollectionCreate):
    """Create a new collection"""
    try:
        collection_doc = {
            "id": str(uuid.uuid4()),
            "name": collection.name,
            "description": collection.description,
            "image_url": collection.image_url,
            "link_url": collection.link_url or f"/shop/{collection.name.lower().replace(' ', '-')}",
            "product_count": collection.product_count,
            "position": collection.position,
            "is_active": collection.is_active,
            "store_name": collection.store_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.storefront_collections.insert_one(collection_doc)
        del collection_doc["_id"]
        return collection_doc
    except Exception as e:
        logger.error(f"Error creating collection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/collections/{collection_id}")
async def update_collection(collection_id: str, collection: CollectionUpdate):
    """Update a collection"""
    try:
        update_data = {k: v for k, v in collection.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.storefront_collections.update_one(
            {"id": collection_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Collection not found")
        
        updated = await db.storefront_collections.find_one({"id": collection_id}, {"_id": 0})
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating collection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str):
    """Delete a collection"""
    try:
        result = await db.storefront_collections.delete_one({"id": collection_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Collection not found")
        return {"success": True, "message": "Collection deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting collection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Storefront Settings ============

@router.get("/settings/{store_name}")
async def get_storefront_settings(store_name: str):
    """Get storefront settings for a store"""
    try:
        settings = await db.storefront_settings.find_one({"store_name": store_name}, {"_id": 0})
        if not settings:
            # Return default settings
            return {
                "store_name": store_name,
                "hero_title": "Elevate Your Style",
                "hero_subtitle": "Discover our latest collection of premium products",
                "hero_image": "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&q=80",
                "newsletter_enabled": True,
                "footer_text": "© 2024 All rights reserved.",
                "logo_url": None,
                "primary_color": "#000000",
                "accent_color": "#ffffff"
            }
        return settings
    except Exception as e:
        logger.error(f"Error fetching settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/settings")
async def update_storefront_settings(settings: StorefrontSettingsUpdate):
    """Update storefront settings"""
    try:
        update_data = {k: v for k, v in settings.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.storefront_settings.update_one(
            {"store_name": settings.store_name},
            {"$set": update_data},
            upsert=True
        )
        
        updated = await db.storefront_settings.find_one({"store_name": settings.store_name}, {"_id": 0})
        return updated
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Public Endpoints for Storefront ============

@router.get("/public/{store_name}/homepage")
async def get_homepage_content(store_name: str):
    """Get all homepage content for public storefront"""
    try:
        # Get settings
        settings = await db.storefront_settings.find_one({"store_name": store_name}, {"_id": 0})
        if not settings:
            settings = {
                "hero_title": "Elevate Your Style",
                "hero_subtitle": "Discover our latest collection",
                "hero_image": "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&q=80",
                "newsletter_enabled": True
            }
        
        # Get active banners
        banners = await db.storefront_banners.find(
            {"store_name": store_name, "is_active": True}, 
            {"_id": 0}
        ).sort("position", 1).to_list(10)
        
        # Get active collections
        collections = await db.storefront_collections.find(
            {"store_name": store_name, "is_active": True},
            {"_id": 0}
        ).sort("position", 1).to_list(10)
        
        return {
            "settings": settings,
            "banners": banners,
            "collections": collections
        }
    except Exception as e:
        logger.error(f"Error fetching homepage content: {e}")
        raise HTTPException(status_code=500, detail=str(e))
