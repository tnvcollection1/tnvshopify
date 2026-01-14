"""
Store Access Security Module
Implements merchant data isolation - ensures merchants can only access their assigned stores

CRITICAL SECURITY FIX (P0)
- Merchants should only access data from stores listed in their `stores` field
- Admins have access to all stores
- All store-specific endpoints should use these security checks
"""

from fastapi import HTTPException, Depends, Header, Query
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

# Database reference - will be set by server.py
_db = None

def set_database(db):
    global _db
    _db = db


async def get_current_user(user_id: Optional[str] = Header(None, alias="X-User-ID")):
    """
    Get current user from header
    Frontend should pass user ID in X-User-ID header after login
    """
    if not user_id:
        return None
    
    if _db is None:
        logger.warning("Database not initialized for security check")
        return None
    
    # Try users collection first, then agents
    user = await _db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        user = await _db.agents.find_one({"id": user_id}, {"_id": 0, "password": 0})
    
    return user


async def verify_store_access(
    store: str = Query(None, description="Store name to access"),
    store_name: str = Query(None, description="Alternative store name parameter"),
    user_id: Optional[str] = Header(None, alias="X-User-ID")
) -> dict:
    """
    Verify that the current user has access to the requested store
    
    Returns:
        dict: User info with their accessible stores
    
    Raises:
        HTTPException: 403 if user doesn't have access to the store
    """
    # Get the store name from either parameter
    target_store = store or store_name
    
    # If no user ID provided, this is a public endpoint - allow access
    # Public storefront endpoints don't require authentication
    if not user_id:
        return {"is_public": True, "store": target_store}
    
    if _db is None:
        logger.error("Database not initialized")
        raise HTTPException(status_code=500, detail="Server configuration error")
    
    # Get user from database
    user = await _db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        user = await _db.agents.find_one({"id": user_id}, {"_id": 0, "password": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if user.get("status") == "inactive":
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    role = user.get("role", "viewer")
    user_stores = user.get("stores", []) or user.get("assigned_stores", [])
    
    # Admins can access all stores
    if role == "admin":
        return {
            "user": user,
            "role": role,
            "can_access_all": True,
            "stores": [],
            "target_store": target_store
        }
    
    # For merchants/managers, check if they have access to the requested store
    if target_store and target_store not in user_stores:
        logger.warning(f"Access denied: User {user.get('username')} tried to access store '{target_store}' but only has access to {user_stores}")
        raise HTTPException(
            status_code=403, 
            detail=f"Access denied. You don't have permission to access store '{target_store}'"
        )
    
    return {
        "user": user,
        "role": role,
        "can_access_all": False,
        "stores": user_stores,
        "target_store": target_store
    }


def require_store_access(required_stores: Optional[List[str]] = None):
    """
    Dependency factory to require access to specific stores
    
    Usage:
        @router.get("/products")
        async def get_products(access = Depends(require_store_access())):
            store = access["target_store"]
            ...
    """
    async def dependency(
        store: str = Query(None),
        store_name: str = Query(None),
        user_id: Optional[str] = Header(None, alias="X-User-ID")
    ):
        return await verify_store_access(store, store_name, user_id)
    
    return dependency


async def get_user_accessible_stores(user_id: str) -> List[str]:
    """
    Get list of stores a user can access
    Returns empty list for admins (meaning all stores)
    """
    if _db is None:
        return []
    
    user = await _db.users.find_one({"id": user_id}, {"_id": 0, "role": 1, "stores": 1, "assigned_stores": 1})
    if not user:
        user = await _db.agents.find_one({"id": user_id}, {"_id": 0, "role": 1, "stores": 1, "assigned_stores": 1})
    
    if not user:
        return []
    
    if user.get("role") == "admin":
        return []  # Empty means all stores
    
    return user.get("stores", []) or user.get("assigned_stores", [])


def filter_by_user_stores(query: dict, user_stores: List[str], store_field: str = "store_name") -> dict:
    """
    Add store filter to a MongoDB query based on user's accessible stores
    
    Args:
        query: Existing MongoDB query dict
        user_stores: List of stores user can access (empty = all stores for admin)
        store_field: Name of the store field in the collection
    
    Returns:
        Modified query with store filter
    """
    if user_stores:  # If not empty, filter by user's stores
        if "$and" in query:
            query["$and"].append({store_field: {"$in": user_stores}})
        else:
            query[store_field] = {"$in": user_stores}
    
    return query


# ==================== Admin-Only Endpoints Protection ====================

async def require_admin(user_id: Optional[str] = Header(None, alias="X-User-ID")):
    """
    Require admin role for endpoint access
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if _db is None:
        raise HTTPException(status_code=500, detail="Server configuration error")
    
    user = await _db.users.find_one({"id": user_id}, {"_id": 0, "role": 1, "username": 1})
    if not user:
        user = await _db.agents.find_one({"id": user_id}, {"_id": 0, "role": 1, "username": 1})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if user.get("role") != "admin":
        logger.warning(f"Admin access denied for user {user.get('username')} with role {user.get('role')}")
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return user


async def require_merchant_or_admin(user_id: Optional[str] = Header(None, alias="X-User-ID")):
    """
    Require merchant or admin role for endpoint access
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if _db is None:
        raise HTTPException(status_code=500, detail="Server configuration error")
    
    user = await _db.users.find_one({"id": user_id}, {"_id": 0, "role": 1, "username": 1, "stores": 1})
    if not user:
        user = await _db.agents.find_one({"id": user_id}, {"_id": 0, "role": 1, "username": 1, "assigned_stores": 1})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    role = user.get("role")
    if role not in ["admin", "merchant", "manager"]:
        logger.warning(f"Access denied for user {user.get('username')} with role {role}")
        raise HTTPException(status_code=403, detail="Merchant or admin access required")
    
    return user
