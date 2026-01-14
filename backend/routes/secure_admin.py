"""
Secure Admin Endpoints
Wraps admin-only and merchant-secured endpoints with proper access control

This module provides secured versions of data access endpoints that:
1. Require authentication
2. Filter data by user's assigned stores (for merchants)
3. Allow full access for admins
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Query
from typing import Optional, List
from security.store_access import (
    verify_store_access, 
    require_admin, 
    require_merchant_or_admin,
    filter_by_user_stores,
    get_user_accessible_stores
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/secure", tags=["Secure Endpoints"])

# Database reference
_db = None

def set_database(db):
    global _db
    _db = db


# ==================== SECURE PRODUCT ENDPOINTS ====================

@router.get("/products")
async def get_secure_products(
    store_name: Optional[str] = None,
    limit: int = 50,
    page: int = 1,
    user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """
    Get products with store-level access control
    - Admins see all products
    - Merchants only see products from their assigned stores
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Get user's accessible stores
    user = await _db.users.find_one({"id": user_id}, {"_id": 0, "role": 1, "stores": 1, "username": 1})
    if not user:
        user = await _db.agents.find_one({"id": user_id}, {"_id": 0, "role": 1, "assigned_stores": 1, "username": 1})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    role = user.get("role", "viewer")
    user_stores = user.get("stores", []) or user.get("assigned_stores", [])
    
    # Build query
    query = {}
    
    # If specific store requested, verify access
    if store_name:
        if role != "admin" and store_name not in user_stores:
            raise HTTPException(status_code=403, detail=f"Access denied to store '{store_name}'")
        query["store_name"] = store_name
    else:
        # No specific store - filter by user's stores (unless admin)
        if role != "admin" and user_stores:
            query["store_name"] = {"$in": user_stores}
    
    skip = (page - 1) * limit
    
    products = await _db.shopify_products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await _db.shopify_products.count_documents(query)
    
    return {
        "success": True,
        "products": products,
        "total": total,
        "page": page,
        "user_stores": user_stores if role != "admin" else "all"
    }


# ==================== SECURE ORDER ENDPOINTS ====================

@router.get("/orders")
async def get_secure_orders(
    store_name: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    page: int = 1,
    user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """
    Get orders with store-level access control
    - Admins see all orders
    - Merchants only see orders from their assigned stores
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user = await _db.users.find_one({"id": user_id}, {"_id": 0, "role": 1, "stores": 1})
    if not user:
        user = await _db.agents.find_one({"id": user_id}, {"_id": 0, "role": 1, "assigned_stores": 1})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    role = user.get("role", "viewer")
    user_stores = user.get("stores", []) or user.get("assigned_stores", [])
    
    # Build query
    query = {}
    
    if store_name:
        if role != "admin" and store_name not in user_stores:
            raise HTTPException(status_code=403, detail=f"Access denied to store '{store_name}'")
        query["store_name"] = store_name
    else:
        if role != "admin" and user_stores:
            query["store_name"] = {"$in": user_stores}
    
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    
    # Try both collections
    orders = await _db.storefront_orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await _db.storefront_orders.count_documents(query)
    
    # Also check shopify_orders if no storefront orders
    if not orders:
        orders = await _db.shopify_orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await _db.shopify_orders.count_documents(query)
    
    return {
        "success": True,
        "orders": orders,
        "total": total,
        "page": page
    }


@router.get("/orders/{order_id}")
async def get_secure_order(
    order_id: str,
    user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """
    Get single order with access control
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user = await _db.users.find_one({"id": user_id}, {"_id": 0, "role": 1, "stores": 1})
    if not user:
        user = await _db.agents.find_one({"id": user_id}, {"_id": 0, "role": 1, "assigned_stores": 1})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Find the order
    order = await _db.storefront_orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        order = await _db.shopify_orders.find_one({"id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check access
    role = user.get("role", "viewer")
    user_stores = user.get("stores", []) or user.get("assigned_stores", [])
    order_store = order.get("store_name")
    
    if role != "admin" and order_store and order_store not in user_stores:
        raise HTTPException(status_code=403, detail="Access denied to this order")
    
    return {"success": True, "order": order}


# ==================== SECURE CUSTOMER ENDPOINTS ====================

@router.get("/customers")
async def get_secure_customers(
    store_name: Optional[str] = None,
    limit: int = 50,
    page: int = 1,
    user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """
    Get customers with store-level access control
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user = await _db.users.find_one({"id": user_id}, {"_id": 0, "role": 1, "stores": 1})
    if not user:
        user = await _db.agents.find_one({"id": user_id}, {"_id": 0, "role": 1, "assigned_stores": 1})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    role = user.get("role", "viewer")
    user_stores = user.get("stores", []) or user.get("assigned_stores", [])
    
    query = {}
    
    if store_name:
        if role != "admin" and store_name not in user_stores:
            raise HTTPException(status_code=403, detail=f"Access denied to store '{store_name}'")
        query["store_name"] = store_name
    else:
        if role != "admin" and user_stores:
            query["store_name"] = {"$in": user_stores}
    
    skip = (page - 1) * limit
    
    customers = await _db.customers.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await _db.customers.count_documents(query)
    
    return {
        "success": True,
        "customers": customers,
        "total": total,
        "page": page
    }


# ==================== SECURE ANALYTICS ENDPOINTS ====================

@router.get("/analytics/overview")
async def get_secure_analytics(
    store_name: Optional[str] = None,
    user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """
    Get analytics with store-level access control
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user = await _db.users.find_one({"id": user_id}, {"_id": 0, "role": 1, "stores": 1})
    if not user:
        user = await _db.agents.find_one({"id": user_id}, {"_id": 0, "role": 1, "assigned_stores": 1})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    role = user.get("role", "viewer")
    user_stores = user.get("stores", []) or user.get("assigned_stores", [])
    
    # Build store filter
    if store_name:
        if role != "admin" and store_name not in user_stores:
            raise HTTPException(status_code=403, detail=f"Access denied to store '{store_name}'")
        store_filter = {"store_name": store_name}
    else:
        if role != "admin" and user_stores:
            store_filter = {"store_name": {"$in": user_stores}}
        else:
            store_filter = {}
    
    # Get counts
    total_products = await _db.shopify_products.count_documents(store_filter)
    total_orders = await _db.storefront_orders.count_documents(store_filter)
    total_customers = await _db.customers.count_documents(store_filter)
    
    # Calculate revenue
    pipeline = [
        {"$match": {**store_filter, "payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await _db.storefront_orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "success": True,
        "analytics": {
            "total_products": total_products,
            "total_orders": total_orders,
            "total_customers": total_customers,
            "total_revenue": total_revenue
        },
        "store_filter": "all" if role == "admin" and not store_name else (store_name or user_stores)
    }


# ==================== USER STORES INFO ====================

@router.get("/my-stores")
async def get_my_stores(user_id: Optional[str] = Header(None, alias="X-User-ID")):
    """
    Get current user's accessible stores
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user = await _db.users.find_one({"id": user_id}, {"_id": 0, "role": 1, "stores": 1, "username": 1})
    if not user:
        user = await _db.agents.find_one({"id": user_id}, {"_id": 0, "role": 1, "assigned_stores": 1, "username": 1})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    role = user.get("role", "viewer")
    user_stores = user.get("stores", []) or user.get("assigned_stores", [])
    
    if role == "admin":
        # Get all stores for admin
        all_stores = await _db.stores.find({}, {"_id": 0, "store_name": 1, "domain": 1}).to_list(100)
        return {
            "success": True,
            "role": role,
            "can_access_all": True,
            "stores": [s.get("store_name") for s in all_stores]
        }
    
    return {
        "success": True,
        "role": role,
        "can_access_all": False,
        "stores": user_stores
    }
