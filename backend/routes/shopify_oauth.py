"""
Shopify OAuth 2.0 Integration
- One-click store connection
- Automatic token exchange
- Secure credential storage with AES-256 encryption
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
import httpx
import hmac
import hashlib
import logging
from urllib.parse import urlencode, parse_qs

logger = logging.getLogger(__name__)

shopify_oauth_router = APIRouter(prefix="/api/shopify/oauth", tags=["Shopify OAuth"])

# Database reference
db = None

def set_database(database):
    global db
    db = database

# Shopify OAuth Configuration
SHOPIFY_API_KEY = os.environ.get('SHOPIFY_API_KEY', '5afa031e158d3c0e4d4734fd86ea0f59')
SHOPIFY_API_SECRET = os.environ.get('SHOPIFY_API_SECRET', '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')

# Scopes required for OmniSales CRM
SHOPIFY_SCOPES = ','.join([
    'read_orders',
    'write_orders', 
    'read_all_orders',
    'read_customers',
    'read_products',
    'read_inventory',
    'write_inventory',
    'read_fulfillments',
    'write_fulfillments',
    'read_draft_orders',
    'write_draft_orders',
    'read_locations'
])

# ==================== Encryption Utilities ====================
# Reusing encryption from api_keys module
import base64
from cryptography.fernet import Fernet

def get_encryption_key() -> bytes:
    """Get or generate encryption key"""
    env_key = os.environ.get('API_KEYS_ENCRYPTION_KEY')
    if env_key:
        return base64.urlsafe_b64decode(env_key)
    secret = os.environ.get('DB_NAME', 'omnisales') + os.environ.get('MONGO_URL', 'default')[:20]
    key = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(key)

def encrypt_value(value: str) -> str:
    """Encrypt a string value"""
    if not value:
        return ""
    try:
        key = get_encryption_key()
        f = Fernet(key)
        encrypted = f.encrypt(value.encode())
        return base64.urlsafe_b64encode(encrypted).decode()
    except Exception as e:
        logger.error(f"Encryption error: {str(e)}")
        return ""

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
        return ""

# ==================== Helper Functions ====================

def get_redirect_uri(request: Request) -> str:
    """Get the OAuth redirect URI based on environment"""
    # Use wamerce.com for production OAuth
    
    return 'https://wamerce.com/api/shopify/oauth/callback'

def verify_hmac(query_params: dict, secret: str) -> bool:
    """Verify Shopify HMAC signature"""
    hmac_value = query_params.pop('hmac', None)
    if not hmac_value:
        return False
    
    # Sort and encode parameters
    sorted_params = sorted(query_params.items())
    message = '&'.join([f"{k}={v}" for k, v in sorted_params])
    
    # Calculate HMAC
    calculated_hmac = hmac.new(
        secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(calculated_hmac, hmac_value)

def generate_nonce() -> str:
    """Generate a random nonce for OAuth state"""
    import secrets
    return secrets.token_urlsafe(32)

# ==================== Models ====================

class ShopifyInstallRequest(BaseModel):
    shop: str  # e.g., "mystore.myshopify.com"
    store_id: Optional[str] = None  # Optional: link to existing store

class ShopifyStoreStatus(BaseModel):
    connected: bool
    shop_domain: Optional[str] = None
    scopes: Optional[str] = None
    connected_at: Optional[str] = None

# ==================== OAuth Endpoints ====================

@shopify_oauth_router.get("/install")
async def initiate_oauth(shop: str, request: Request, store_id: Optional[str] = None):
    """
    Step 1: Initiate OAuth flow
    Redirects user to Shopify authorization page
    
    Usage: GET /api/shopify/oauth/install?shop=mystore.myshopify.com
    """
    try:
        # Validate shop domain
        if not shop or not shop.endswith('.myshopify.com'):
            # Try to append .myshopify.com if not present
            if '.' not in shop:
                shop = f"{shop}.myshopify.com"
            elif not shop.endswith('.myshopify.com'):
                raise HTTPException(status_code=400, detail="Invalid shop domain. Use format: mystore.myshopify.com")
        
        # Clean the shop domain
        shop = shop.lower().strip()
        if shop.startswith('https://'):
            shop = shop.replace('https://', '')
        if shop.startswith('http://'):
            shop = shop.replace('http://', '')
        if shop.endswith('/'):
            shop = shop[:-1]
        
        # Generate nonce for state verification
        nonce = generate_nonce()
        
        # Store nonce and store_id in database for verification
        await db.shopify_oauth_states.update_one(
            {"nonce": nonce},
            {"$set": {
                "nonce": nonce,
                "shop": shop,
                "store_id": store_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "used": False
            }},
            upsert=True
        )
        
        # Build redirect URI
        redirect_uri = get_redirect_uri(request)
        
        # Build OAuth URL
        oauth_params = {
            'client_id': SHOPIFY_API_KEY,
            'scope': SHOPIFY_SCOPES,
            'redirect_uri': redirect_uri,
            'state': nonce,
            'grant_options[]': 'offline'  # Get offline access token
        }
        
        oauth_url = f"https://{shop}/admin/oauth/authorize?{urlencode(oauth_params)}"
        
        logger.info(f"🔗 Initiating Shopify OAuth for shop: {shop}")
        logger.info(f"🔗 Redirect URI: {redirect_uri}")
        
        return RedirectResponse(url=oauth_url, status_code=302)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating OAuth: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@shopify_oauth_router.get("/callback")
async def oauth_callback(
    request: Request,
    code: Optional[str] = None,
    shop: Optional[str] = None,
    state: Optional[str] = None,
    hmac: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None
):
    """
    Step 2: Handle OAuth callback from Shopify
    Exchanges authorization code for access token
    """
    try:
        # Handle errors from Shopify
        if error:
            logger.error(f"Shopify OAuth error: {error} - {error_description}")
            # Redirect to frontend with error
            frontend_url = os.environ.get('REACT_APP_FRONTEND_URL', 'https://importbaba.com')
            return RedirectResponse(
                url=f"{frontend_url}/settings?shopify_error={error}&message={error_description}",
                status_code=302
            )
        
        if not code or not shop or not state:
            raise HTTPException(status_code=400, detail="Missing required parameters")
        
        # Verify state/nonce
        oauth_state = await db.shopify_oauth_states.find_one({"nonce": state, "used": False})
        if not oauth_state:
            raise HTTPException(status_code=400, detail="Invalid or expired state parameter")
        
        # Mark state as used
        await db.shopify_oauth_states.update_one(
            {"nonce": state},
            {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        store_id = oauth_state.get('store_id')
        
        # Exchange code for access token
        token_url = f"https://{shop}/admin/oauth/access_token"
        token_payload = {
            'client_id': SHOPIFY_API_KEY,
            'client_secret': SHOPIFY_API_SECRET,
            'code': code
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, json=token_payload)
            
            if response.status_code != 200:
                logger.error(f"Token exchange failed: {response.text}")
                raise HTTPException(status_code=400, detail="Failed to exchange authorization code")
            
            token_data = response.json()
        
        access_token = token_data.get('access_token')
        scope = token_data.get('scope', '')
        
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")
        
        # Encrypt the access token
        encrypted_token = encrypt_value(access_token)
        
        # Get shop info to verify connection
        shop_info = await get_shop_info(shop, access_token)
        
        # Check if store already exists
        existing_store = await db.stores.find_one({"shopify_domain": shop})
        
        if existing_store:
            # Update existing store
            await db.stores.update_one(
                {"shopify_domain": shop},
                {"$set": {
                    "shopify_token": encrypted_token,
                    "shopify_token_encrypted": True,
                    "shopify_scopes": scope,
                    "shopify_connected_at": datetime.now(timezone.utc).isoformat(),
                    "shop_info": shop_info,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"✅ Updated existing store: {shop}")
        else:
            # Create new store entry
            import uuid
            store_name = shop.replace('.myshopify.com', '')
            new_store = {
                "id": str(uuid.uuid4()),
                "store_name": store_name,
                "shop_url": f"https://{shop}",
                "shopify_domain": shop,
                "shopify_token": encrypted_token,
                "shopify_token_encrypted": True,
                "shopify_scopes": scope,
                "shopify_connected_at": datetime.now(timezone.utc).isoformat(),
                "shop_info": shop_info,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.stores.insert_one(new_store)
            logger.info(f"✅ Created new store: {shop}")
        
        # Also save to shopify_oauth_connections for reference
        await db.shopify_oauth_connections.update_one(
            {"shop": shop},
            {"$set": {
                "shop": shop,
                "access_token_encrypted": encrypted_token,
                "scopes": scope,
                "shop_info": shop_info,
                "connected_at": datetime.now(timezone.utc).isoformat(),
                "store_id": store_id
            }},
            upsert=True
        )
        
        logger.info(f"✅ Shopify OAuth complete for: {shop}")
        
        # Redirect to frontend with success
        frontend_url = os.environ.get('REACT_APP_FRONTEND_URL', 'https://importbaba.com')
        return RedirectResponse(
            url=f"{frontend_url}/settings?shopify_connected=true&shop={shop}",
            status_code=302
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth callback error: {str(e)}")
        frontend_url = os.environ.get('REACT_APP_FRONTEND_URL', 'https://importbaba.com')
        return RedirectResponse(
            url=f"{frontend_url}/settings?shopify_error=callback_failed&message={str(e)}",
            status_code=302
        )

async def get_shop_info(shop: str, access_token: str) -> dict:
    """Get shop information from Shopify API"""
    try:
        headers = {
            'X-Shopify-Access-Token': access_token,
            'Content-Type': 'application/json'
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://{shop}/admin/api/2024-01/shop.json",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                shop_data = data.get('shop', {})
                return {
                    "name": shop_data.get('name'),
                    "email": shop_data.get('email'),
                    "domain": shop_data.get('domain'),
                    "myshopify_domain": shop_data.get('myshopify_domain'),
                    "plan_name": shop_data.get('plan_name'),
                    "currency": shop_data.get('currency'),
                    "timezone": shop_data.get('timezone'),
                    "country": shop_data.get('country_name')
                }
    except Exception as e:
        logger.error(f"Error fetching shop info: {str(e)}")
    
    return {}

@shopify_oauth_router.get("/status/{shop_domain}")
async def get_connection_status(shop_domain: str):
    """Check if a shop is connected via OAuth"""
    try:
        # Clean shop domain
        if not shop_domain.endswith('.myshopify.com'):
            shop_domain = f"{shop_domain}.myshopify.com"
        
        connection = await db.shopify_oauth_connections.find_one(
            {"shop": shop_domain},
            {"_id": 0, "access_token_encrypted": 0}
        )
        
        if connection:
            return {
                "connected": True,
                "shop": connection.get('shop'),
                "scopes": connection.get('scopes'),
                "connected_at": connection.get('connected_at'),
                "shop_info": connection.get('shop_info', {})
            }
        
        return {"connected": False}
        
    except Exception as e:
        logger.error(f"Error checking connection status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@shopify_oauth_router.get("/connections")
async def list_all_connections():
    """List all connected Shopify stores"""
    try:
        connections = await db.shopify_oauth_connections.find(
            {},
            {"_id": 0, "access_token_encrypted": 0}
        ).to_list(100)
        
        return {
            "success": True,
            "connections": connections,
            "total": len(connections)
        }
        
    except Exception as e:
        logger.error(f"Error listing connections: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@shopify_oauth_router.delete("/disconnect/{shop_domain}")
async def disconnect_store(shop_domain: str):
    """Disconnect a Shopify store (revoke OAuth)"""
    try:
        # Clean shop domain
        if not shop_domain.endswith('.myshopify.com'):
            shop_domain = f"{shop_domain}.myshopify.com"
        
        # Get the connection
        connection = await db.shopify_oauth_connections.find_one({"shop": shop_domain})
        
        if not connection:
            raise HTTPException(status_code=404, detail="Store not connected")
        
        # Get decrypted token to revoke
        encrypted_token = connection.get('access_token_encrypted')
        if encrypted_token:
            access_token = decrypt_value(encrypted_token)
            
            # Try to revoke the token with Shopify (optional, may fail)
            try:
                async with httpx.AsyncClient() as client:
                    await client.delete(
                        f"https://{shop_domain}/admin/api_permissions/current.json",
                        headers={'X-Shopify-Access-Token': access_token}
                    )
            except Exception as e:
                logger.warning(f"Could not revoke token with Shopify: {e}")
        
        # Remove from our database
        await db.shopify_oauth_connections.delete_one({"shop": shop_domain})
        
        # Update store record
        await db.stores.update_one(
            {"shopify_domain": shop_domain},
            {"$set": {
                "shopify_token": None,
                "shopify_token_encrypted": False,
                "shopify_scopes": None,
                "shopify_disconnected_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"✅ Disconnected store: {shop_domain}")
        
        return {
            "success": True,
            "message": f"Store {shop_domain} disconnected successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disconnecting store: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@shopify_oauth_router.get("/auth-url")
async def get_auth_url(shop: str, request: Request):
    """
    Get OAuth URL without redirecting (for frontend to handle)
    """
    try:
        # Validate and clean shop domain
        if not shop.endswith('.myshopify.com'):
            if '.' not in shop:
                shop = f"{shop}.myshopify.com"
        
        shop = shop.lower().strip()
        
        # Generate nonce
        nonce = generate_nonce()
        
        # Store nonce
        await db.shopify_oauth_states.update_one(
            {"nonce": nonce},
            {"$set": {
                "nonce": nonce,
                "shop": shop,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "used": False
            }},
            upsert=True
        )
        
        # Build redirect URI
        redirect_uri = get_redirect_uri(request)
        
        # Build OAuth URL
        oauth_params = {
            'client_id': SHOPIFY_API_KEY,
            'scope': SHOPIFY_SCOPES,
            'redirect_uri': redirect_uri,
            'state': nonce,
            'grant_options[]': 'offline'
        }
        
        oauth_url = f"https://{shop}/admin/oauth/authorize?{urlencode(oauth_params)}"
        
        return {
            "success": True,
            "auth_url": oauth_url,
            "shop": shop,
            "redirect_uri": redirect_uri
        }
        
    except Exception as e:
        logger.error(f"Error generating auth URL: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
