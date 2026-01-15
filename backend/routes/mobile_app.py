"""
Mobile App Settings API
Endpoints for managing mobile app configuration
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/mobile-app", tags=["mobile-app"])

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "wamerce")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
mobile_settings_collection = db["mobile_app_settings"]


class MobileAppSettings(BaseModel):
    """Mobile app settings schema"""
    # General
    appName: Optional[str] = "TNV Collection"
    appTagline: Optional[str] = "Fashion at your fingertips"
    appVersion: Optional[str] = "1.0.0"
    bundleId: Optional[str] = "com.tnvcollection.app"
    
    # Theme
    primaryColor: Optional[str] = "#000000"
    accentColor: Optional[str] = "#FF3366"
    backgroundColor: Optional[str] = "#FAFAFA"
    darkModeEnabled: Optional[bool] = True
    defaultTheme: Optional[str] = "system"
    
    # Features
    enablePushNotifications: Optional[bool] = True
    enableHapticFeedback: Optional[bool] = True
    enableOfflineMode: Optional[bool] = True
    enableBiometricAuth: Optional[bool] = False
    enableSocialLogin: Optional[bool] = True
    
    # Store Info
    supportPhone: Optional[str] = ""
    supportEmail: Optional[str] = ""
    supportWhatsApp: Optional[str] = ""
    
    # App Store
    appStoreUrl: Optional[str] = ""
    playStoreUrl: Optional[str] = ""
    
    # Splash Screen
    splashBackgroundColor: Optional[str] = "#000000"
    splashDuration: Optional[int] = 2000


class SettingsUpdateRequest(BaseModel):
    """Request body for updating settings"""
    store: str
    settings: Dict[str, Any]


@router.get("/settings")
async def get_mobile_settings(store: str = Query(..., description="Store identifier")):
    """Get mobile app settings for a store"""
    try:
        settings = await mobile_settings_collection.find_one(
            {"store": store},
            {"_id": 0}
        )
        
        if settings:
            return {"success": True, "settings": settings.get("settings", {})}
        
        # Return default settings if none exist
        default_settings = MobileAppSettings()
        return {"success": True, "settings": default_settings.dict()}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/settings")
async def save_mobile_settings(request: SettingsUpdateRequest):
    """Save mobile app settings for a store"""
    try:
        await mobile_settings_collection.update_one(
            {"store": request.store},
            {
                "$set": {
                    "store": request.store,
                    "settings": request.settings,
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        return {"success": True, "message": "Settings saved successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config")
async def get_mobile_config(store: str = Query(..., description="Store identifier")):
    """
    Get mobile app configuration for the app to fetch at runtime.
    This endpoint is called by the mobile app to get latest settings.
    """
    try:
        settings = await mobile_settings_collection.find_one(
            {"store": store},
            {"_id": 0}
        )
        
        if settings:
            config = settings.get("settings", {})
        else:
            config = MobileAppSettings().dict()
        
        # Return a cleaned config for the mobile app
        return {
            "success": True,
            "config": {
                "app": {
                    "name": config.get("appName", "TNV Collection"),
                    "tagline": config.get("appTagline", ""),
                    "version": config.get("appVersion", "1.0.0"),
                },
                "theme": {
                    "primaryColor": config.get("primaryColor", "#000000"),
                    "accentColor": config.get("accentColor", "#FF3366"),
                    "backgroundColor": config.get("backgroundColor", "#FAFAFA"),
                    "darkModeEnabled": config.get("darkModeEnabled", True),
                    "defaultTheme": config.get("defaultTheme", "system"),
                },
                "features": {
                    "pushNotifications": config.get("enablePushNotifications", True),
                    "hapticFeedback": config.get("enableHapticFeedback", True),
                    "offlineMode": config.get("enableOfflineMode", True),
                    "biometricAuth": config.get("enableBiometricAuth", False),
                    "socialLogin": config.get("enableSocialLogin", True),
                },
                "support": {
                    "phone": config.get("supportPhone", ""),
                    "email": config.get("supportEmail", ""),
                    "whatsapp": config.get("supportWhatsApp", ""),
                },
                "stores": {
                    "appStore": config.get("appStoreUrl", ""),
                    "playStore": config.get("playStoreUrl", ""),
                },
                "splash": {
                    "backgroundColor": config.get("splashBackgroundColor", "#000000"),
                    "duration": config.get("splashDuration", 2000),
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
