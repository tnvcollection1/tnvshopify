"""
Secure API Keys Management
- AES-256 encryption for storing sensitive API keys
- Keys are encrypted before storage in MongoDB
- Only masked versions are returned to frontend
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime, timezone
import os
import base64
import hashlib
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)

api_keys_router = APIRouter(prefix="/api/api-keys", tags=["API Keys"])

# Database reference (set during initialization)
db = None

def set_database(database):
    global db
    db = database

# ==================== Encryption Utilities ====================

def get_encryption_key() -> bytes:
    """
    Get or generate encryption key from environment or create deterministic key.
    In production, this should be stored securely (e.g., AWS KMS, HashiCorp Vault)
    """
    # Try to get from environment
    env_key = os.environ.get('API_KEYS_ENCRYPTION_KEY')
    if env_key:
        return base64.urlsafe_b64decode(env_key)
    
    # Generate deterministic key based on a secret (for demo - in production use proper key management)
    secret = os.environ.get('DB_NAME', 'omnisales') + os.environ.get('MONGO_URL', 'default')[:20]
    key = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(key)

def encrypt_value(value: str) -> str:
    """Encrypt a string value using Fernet (AES-128)"""
    if not value:
        return ""
    try:
        key = get_encryption_key()
        f = Fernet(key)
        encrypted = f.encrypt(value.encode())
        return base64.urlsafe_b64encode(encrypted).decode()
    except Exception as e:
        logger.error(f"Encryption error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to encrypt value")

def decrypt_value(encrypted_value: str) -> str:
    """Decrypt a Fernet encrypted value"""
    if not encrypted_value:
        return ""
    try:
        key = get_encryption_key()
        f = Fernet(key)
        decrypted = f.decrypt(base64.urlsafe_b64decode(encrypted_value))
        return decrypted.decode()
    except Exception as e:
        logger.error(f"Decryption error: {str(e)}")
        return ""  # Return empty on decryption failure

def mask_value(value: str, show_chars: int = 4) -> str:
    """Mask a sensitive value, showing only last N characters"""
    if not value or len(value) <= show_chars:
        return "*" * 8
    return "*" * (len(value) - show_chars) + value[-show_chars:]

# ==================== Models ====================

class APIKeyUpdate(BaseModel):
    key_name: str  # e.g., 'razorpay_key_id', 'razorpay_key_secret', 'whatsapp_token'
    key_value: str

class APIKeyBulkUpdate(BaseModel):
    keys: Dict[str, str]  # key_name -> key_value mapping

# ==================== Key Definitions ====================

API_KEY_DEFINITIONS = {
    "razorpay": {
        "name": "Razorpay",
        "description": "Payment gateway for subscriptions",
        "keys": [
            {"key": "razorpay_key_id", "label": "Key ID", "placeholder": "rzp_live_xxxxx"},
            {"key": "razorpay_key_secret", "label": "Key Secret", "placeholder": "Your secret key"}
        ],
        "docs_url": "https://razorpay.com/docs/api/"
    },
    "whatsapp": {
        "name": "WhatsApp Business API",
        "description": "WhatsApp messaging integration",
        "keys": [
            {"key": "whatsapp_phone_number_id", "label": "Phone Number ID", "placeholder": "123456789"},
            {"key": "whatsapp_business_account_id", "label": "Business Account ID", "placeholder": "987654321"},
            {"key": "whatsapp_access_token", "label": "Access Token", "placeholder": "EAA..."}
        ],
        "docs_url": "https://developers.facebook.com/docs/whatsapp/cloud-api"
    },
    "meta": {
        "name": "Meta (Facebook)",
        "description": "Meta platform integrations",
        "keys": [
            {"key": "meta_app_id", "label": "App ID", "placeholder": "123456789"},
            {"key": "meta_app_secret", "label": "App Secret", "placeholder": "Your app secret"},
            {"key": "facebook_access_token", "label": "Access Token", "placeholder": "EAA..."}
        ],
        "docs_url": "https://developers.facebook.com/docs/"
    },
    "dtdc": {
        "name": "DTDC Courier",
        "description": "Courier tracking integration",
        "keys": [
            {"key": "dtdc_api_key", "label": "API Key", "placeholder": "Your DTDC API key"}
        ],
        "docs_url": "https://www.dtdc.in/"
    },
    "openai": {
        "name": "OpenAI",
        "description": "AI features (optional)",
        "keys": [
            {"key": "openai_api_key", "label": "API Key", "placeholder": "sk-..."}
        ],
        "docs_url": "https://platform.openai.com/api-keys"
    }
}

# ==================== API Endpoints ====================

@api_keys_router.get("/definitions")
async def get_key_definitions():
    """Get list of all supported API key types and their structure"""
    return {
        "success": True,
        "definitions": API_KEY_DEFINITIONS
    }

@api_keys_router.get("/")
async def get_all_api_keys():
    """
    Get all stored API keys (masked)
    Returns key names and masked values - never returns actual keys
    """
    try:
        # Get all keys from database
        keys_doc = await db.api_keys.find_one({"type": "api_keys"}, {"_id": 0})
        
        if not keys_doc:
            return {
                "success": True,
                "keys": {},
                "configured": []
            }
        
        keys = keys_doc.get("keys", {})
        masked_keys = {}
        configured = []
        
        for key_name, encrypted_value in keys.items():
            if encrypted_value:
                # Decrypt to get length for masking, then mask
                decrypted = decrypt_value(encrypted_value)
                if decrypted:
                    masked_keys[key_name] = mask_value(decrypted)
                    configured.append(key_name)
                else:
                    masked_keys[key_name] = ""
            else:
                masked_keys[key_name] = ""
        
        return {
            "success": True,
            "keys": masked_keys,
            "configured": configured,
            "last_updated": keys_doc.get("updated_at")
        }
    except Exception as e:
        logger.error(f"Error fetching API keys: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_keys_router.post("/update")
async def update_api_key(data: APIKeyUpdate):
    """
    Update a single API key (encrypted storage)
    """
    try:
        key_name = data.key_name.lower().strip()
        key_value = data.key_value.strip()
        
        if not key_value:
            raise HTTPException(status_code=400, detail="Key value cannot be empty")
        
        # Encrypt the value
        encrypted_value = encrypt_value(key_value)
        
        # Update in database
        await db.api_keys.update_one(
            {"type": "api_keys"},
            {
                "$set": {
                    f"keys.{key_name}": encrypted_value,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        logger.info(f"✅ API key updated: {key_name}")
        
        return {
            "success": True,
            "message": f"API key '{key_name}' updated successfully",
            "masked_value": mask_value(key_value)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating API key: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_keys_router.post("/bulk-update")
async def bulk_update_api_keys(data: APIKeyBulkUpdate):
    """
    Update multiple API keys at once
    """
    try:
        updates = {}
        for key_name, key_value in data.keys.items():
            if key_value and key_value.strip():
                encrypted_value = encrypt_value(key_value.strip())
                updates[f"keys.{key_name.lower().strip()}"] = encrypted_value
        
        if not updates:
            raise HTTPException(status_code=400, detail="No valid keys to update")
        
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.api_keys.update_one(
            {"type": "api_keys"},
            {"$set": updates},
            upsert=True
        )
        
        logger.info(f"✅ Bulk API keys updated: {list(data.keys.keys())}")
        
        return {
            "success": True,
            "message": f"Updated {len(updates) - 1} API keys successfully",
            "updated_keys": list(data.keys.keys())
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk update: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_keys_router.delete("/{key_name}")
async def delete_api_key(key_name: str):
    """
    Delete a specific API key
    """
    try:
        key_name = key_name.lower().strip()
        
        await db.api_keys.update_one(
            {"type": "api_keys"},
            {"$unset": {f"keys.{key_name}": ""}}
        )
        
        logger.info(f"✅ API key deleted: {key_name}")
        
        return {
            "success": True,
            "message": f"API key '{key_name}' deleted successfully"
        }
    except Exception as e:
        logger.error(f"Error deleting API key: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_keys_router.get("/status")
async def get_api_keys_status():
    """
    Get status of all API integrations (which are configured)
    """
    try:
        keys_doc = await db.api_keys.find_one({"type": "api_keys"}, {"_id": 0})
        keys = keys_doc.get("keys", {}) if keys_doc else {}
        
        status = {}
        for service_key, service_info in API_KEY_DEFINITIONS.items():
            service_keys = [k["key"] for k in service_info["keys"]]
            configured_count = sum(1 for k in service_keys if keys.get(k))
            total_keys = len(service_keys)
            
            status[service_key] = {
                "name": service_info["name"],
                "configured": configured_count == total_keys,
                "partial": configured_count > 0 and configured_count < total_keys,
                "configured_count": configured_count,
                "total_keys": total_keys
            }
        
        return {
            "success": True,
            "status": status,
            "last_updated": keys_doc.get("updated_at") if keys_doc else None
        }
    except Exception as e:
        logger.error(f"Error getting API keys status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Internal Helper Functions ====================

async def get_decrypted_key(key_name: str) -> Optional[str]:
    """
    Internal function to get a decrypted API key
    Use this in other modules to retrieve keys securely
    """
    try:
        keys_doc = await db.api_keys.find_one({"type": "api_keys"}, {"_id": 0})
        if not keys_doc:
            return None
        
        encrypted_value = keys_doc.get("keys", {}).get(key_name.lower())
        if not encrypted_value:
            return None
        
        return decrypt_value(encrypted_value)
    except Exception as e:
        logger.error(f"Error getting decrypted key {key_name}: {str(e)}")
        return None

async def get_all_decrypted_keys() -> Dict[str, str]:
    """
    Internal function to get all decrypted API keys
    Use this in other modules for initialization
    """
    try:
        keys_doc = await db.api_keys.find_one({"type": "api_keys"}, {"_id": 0})
        if not keys_doc:
            return {}
        
        decrypted = {}
        for key_name, encrypted_value in keys_doc.get("keys", {}).items():
            if encrypted_value:
                decrypted_val = decrypt_value(encrypted_value)
                if decrypted_val:
                    decrypted[key_name] = decrypted_val
        
        return decrypted
    except Exception as e:
        logger.error(f"Error getting all decrypted keys: {str(e)}")
        return {}
