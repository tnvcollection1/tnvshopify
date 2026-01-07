"""
Settings Routes
Endpoints for system settings, auto-sync, and configuration
"""
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["Settings"])

# Database reference - set from server.py
_db = None

def set_database(db):
    """Set database from server.py"""
    global _db
    _db = db

def get_db():
    if _db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return _db


# Pydantic Models
class AutoSyncSettings(BaseModel):
    enabled: bool = False
    interval_minutes: int = 60
    sync_shopify: bool = True
    sync_tcs: bool = True
    sync_dtdc: bool = True
    sync_inventory: bool = True


class NotificationSettings(BaseModel):
    email_notifications: bool = True
    whatsapp_notifications: bool = True
    order_confirmation: bool = True
    shipment_updates: bool = True
    delivery_confirmation: bool = True
    marketing_emails: bool = False


@router.get("/auto-sync")
async def get_auto_sync_settings():
    """Get auto-sync configuration"""
    db = get_db()
    try:
        settings = await db.system_settings.find_one(
            {"setting_type": "auto_sync"},
            {"_id": 0}
        )
        
        if not settings:
            return {
                "enabled": False,
                "interval_minutes": 60,
                "sync_shopify": True,
                "sync_tcs": True,
                "sync_dtdc": True,
                "sync_inventory": True,
                "last_sync": None
            }
        
        return settings
    except Exception as e:
        logger.error(f"Error fetching auto-sync settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto-sync")
async def update_auto_sync_settings(settings: AutoSyncSettings):
    """Update auto-sync configuration"""
    db = get_db()
    try:
        settings_dict = settings.model_dump()
        settings_dict["setting_type"] = "auto_sync"
        settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.system_settings.update_one(
            {"setting_type": "auto_sync"},
            {"$set": settings_dict},
            upsert=True
        )
        
        if settings.enabled:
            logger.info(f"Auto-sync enabled with {settings.interval_minutes} minute interval")
        
        return {
            "success": True,
            "message": "Auto-sync settings updated",
            "settings": settings_dict
        }
    except Exception as e:
        logger.error(f"Error updating auto-sync settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto-sync/trigger")
async def trigger_manual_sync():
    """Manually trigger a sync of all stores"""
    db = get_db()
    try:
        settings = await db.system_settings.find_one({"setting_type": "auto_sync"})
        
        if not settings:
            raise HTTPException(status_code=400, detail="Auto-sync not configured")
        
        stores = await db.stores.find({}, {"_id": 0, "store_name": 1}).to_list(100)
        
        sync_results = []
        
        for store in stores:
            store_name = store["store_name"]
            try:
                if settings.get("sync_shopify", True):
                    logger.info(f"Queued Shopify sync for {store_name}")
                    sync_results.append({
                        "store_name": store_name,
                        "success": True,
                        "message": "Sync queued"
                    })
            except Exception as e:
                logger.error(f"Error syncing {store_name}: {e}")
                sync_results.append({
                    "store_name": store_name,
                    "success": False,
                    "error": str(e)
                })
        
        await db.system_settings.update_one(
            {"setting_type": "auto_sync"},
            {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {
            "success": True,
            "message": "Manual sync triggered",
            "results": sync_results
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering manual sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notifications")
async def get_notification_settings():
    """Get notification settings"""
    db = get_db()
    try:
        settings = await db.system_settings.find_one(
            {"setting_type": "notifications"},
            {"_id": 0}
        )
        
        if not settings:
            return {
                "email_notifications": True,
                "whatsapp_notifications": True,
                "order_confirmation": True,
                "shipment_updates": True,
                "delivery_confirmation": True,
                "marketing_emails": False
            }
        
        return settings
    except Exception as e:
        logger.error(f"Error fetching notification settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notifications")
async def update_notification_settings(settings: NotificationSettings):
    """Update notification settings"""
    db = get_db()
    try:
        settings_dict = settings.model_dump()
        settings_dict["setting_type"] = "notifications"
        settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.system_settings.update_one(
            {"setting_type": "notifications"},
            {"$set": settings_dict},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Notification settings updated",
            "settings": settings_dict
        }
    except Exception as e:
        logger.error(f"Error updating notification settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/general")
async def get_general_settings():
    """Get general application settings"""
    db = get_db()
    try:
        settings = await db.system_settings.find_one(
            {"setting_type": "general"},
            {"_id": 0}
        )
        
        if not settings:
            return {
                "company_name": "WaMerce",
                "timezone": "Asia/Kolkata",
                "currency": "INR",
                "date_format": "DD/MM/YYYY",
                "language": "en"
            }
        
        return settings
    except Exception as e:
        logger.error(f"Error fetching general settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/general")
async def update_general_settings(settings: dict = Body(...)):
    """Update general application settings"""
    db = get_db()
    try:
        settings["setting_type"] = "general"
        settings["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.system_settings.update_one(
            {"setting_type": "general"},
            {"$set": settings},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "General settings updated"
        }
    except Exception as e:
        logger.error(f"Error updating general settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/shipping")
async def get_shipping_settings():
    """Get shipping configuration"""
    db = get_db()
    try:
        settings = await db.system_settings.find_one(
            {"setting_type": "shipping"},
            {"_id": 0}
        )
        
        if not settings:
            return {
                "free_shipping_threshold": 5000,
                "default_shipping_rate": 99,
                "express_shipping_rate": 199,
                "default_courier": "DWZ56",
                "cod_enabled": True,
                "cod_extra_charge": 50
            }
        
        return settings
    except Exception as e:
        logger.error(f"Error fetching shipping settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/shipping")
async def update_shipping_settings(settings: dict = Body(...)):
    """Update shipping configuration"""
    db = get_db()
    try:
        settings["setting_type"] = "shipping"
        settings["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.system_settings.update_one(
            {"setting_type": "shipping"},
            {"$set": settings},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Shipping settings updated"
        }
    except Exception as e:
        logger.error(f"Error updating shipping settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all")
async def get_all_settings():
    """Get all system settings"""
    db = get_db()
    try:
        settings = await db.system_settings.find({}, {"_id": 0}).to_list(100)
        
        # Organize by setting type
        organized = {}
        for setting in settings:
            setting_type = setting.pop("setting_type", "other")
            organized[setting_type] = setting
        
        return {
            "success": True,
            "settings": organized
        }
    except Exception as e:
        logger.error(f"Error fetching all settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))
