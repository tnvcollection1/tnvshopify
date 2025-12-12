"""Tenant Management Routes for Multi-Tenant SaaS"""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
import hashlib
import uuid
import logging

logger = logging.getLogger(__name__)

# Will be injected from server.py
db = None

def set_dependencies(database):
    """Set dependencies from server.py"""
    global db
    db = database

tenants_router = APIRouter(prefix="/tenants", tags=["Tenant Management"])


def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()


@tenants_router.post("/register")
async def register_tenant(
    business_name: str,
    business_email: str,
    owner_name: str,
    password: str,
    business_category: str = "retail"
):
    """Register a new tenant (signup flow)"""
    try:
        # Check if email already exists
        existing = await db.tenants.find_one({"business_email": business_email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        existing_user = await db.users.find_one({"email": business_email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        tenant_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # Create tenant
        tenant = {
            "id": tenant_id,
            "business_name": business_name,
            "business_category": business_category,
            "business_email": business_email,
            "owner_id": user_id,
            "owner_name": owner_name,
            "owner_email": business_email,
            "subscription_plan": "free",
            "subscription_status": "trial",
            "trial_ends_at": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
            "api_keys": {},
            "onboarding_completed": False,
            "onboarding_step": 1,
            "status": "active",
            "created_at": now,
            "orders_this_month": 0,
            "messages_this_month": 0
        }
        
        # Create owner user
        user = {
            "id": user_id,
            "tenant_id": tenant_id,
            "username": business_email,
            "email": business_email,
            "password": hash_password(password),
            "full_name": owner_name,
            "role": "admin",
            "status": "active",
            "stores": [],
            "created_at": now
        }
        
        await db.tenants.insert_one(tenant)
        await db.users.insert_one(user)
        
        logger.info(f"✅ New tenant registered: {business_name} ({tenant_id})")
        
        # Return without sensitive data
        tenant.pop("_id", None)
        user.pop("_id", None)
        user.pop("password", None)
        
        return {
            "success": True,
            "tenant": tenant,
            "user": user,
            "message": "Registration successful! Please complete onboarding."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering tenant: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@tenants_router.get("/{tenant_id}")
async def get_tenant(tenant_id: str):
    """Get tenant details"""
    try:
        tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Mask API keys
        if tenant.get("api_keys"):
            masked_keys = {}
            for key, value in tenant["api_keys"].items():
                if value:
                    masked_keys[key] = "***" + str(value)[-4:] if len(str(value)) > 4 else "****"
                else:
                    masked_keys[key] = None
            tenant["api_keys"] = masked_keys
        
        return {"success": True, "tenant": tenant}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching tenant: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@tenants_router.put("/{tenant_id}/onboarding")
async def update_onboarding(
    tenant_id: str,
    step: int = None,
    business_name: str = None,
    business_category: str = None,
    business_phone: str = None,
    business_address: str = None,
    completed: bool = None
):
    """Update tenant onboarding progress"""
    try:
        tenant = await db.tenants.find_one({"id": tenant_id})
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        update = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if step is not None:
            update["onboarding_step"] = step
        if business_name:
            update["business_name"] = business_name
        if business_category:
            update["business_category"] = business_category
        if business_phone:
            update["business_phone"] = business_phone
        if business_address:
            update["business_address"] = business_address
        if completed is not None:
            update["onboarding_completed"] = completed
        
        await db.tenants.update_one({"id": tenant_id}, {"$set": update})
        
        updated = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
        return {"success": True, "tenant": updated}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating onboarding: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@tenants_router.put("/{tenant_id}/api-keys")
async def update_api_keys(
    tenant_id: str,
    shopify_domain: str = None,
    shopify_token: str = None,
    whatsapp_phone_id: str = None,
    whatsapp_token: str = None,
    whatsapp_business_id: str = None,
    facebook_access_token: str = None,
    facebook_ad_account_id: str = None,
    facebook_page_id: str = None
):
    """Update API keys for a tenant"""
    try:
        tenant = await db.tenants.find_one({"id": tenant_id})
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        api_keys = tenant.get("api_keys", {})
        
        if shopify_domain is not None:
            api_keys["shopify_domain"] = shopify_domain
        if shopify_token is not None:
            api_keys["shopify_token"] = shopify_token
        if whatsapp_phone_id is not None:
            api_keys["whatsapp_phone_id"] = whatsapp_phone_id
        if whatsapp_token is not None:
            api_keys["whatsapp_token"] = whatsapp_token
        if whatsapp_business_id is not None:
            api_keys["whatsapp_business_id"] = whatsapp_business_id
        if facebook_access_token is not None:
            api_keys["facebook_access_token"] = facebook_access_token
        if facebook_ad_account_id is not None:
            api_keys["facebook_ad_account_id"] = facebook_ad_account_id
        if facebook_page_id is not None:
            api_keys["facebook_page_id"] = facebook_page_id
        
        await db.tenants.update_one(
            {"id": tenant_id},
            {"$set": {
                "api_keys": api_keys,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"✅ API keys updated for tenant: {tenant_id}")
        return {"success": True, "message": "API keys updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating API keys: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@tenants_router.put("/{tenant_id}/subscription")
async def update_subscription(
    tenant_id: str,
    plan: str,
    status: str = "active"
):
    """Update tenant subscription (mock for now)"""
    try:
        valid_plans = ["free", "starter", "growth", "enterprise"]
        if plan not in valid_plans:
            raise HTTPException(status_code=400, detail=f"Invalid plan. Must be one of: {valid_plans}")
        
        tenant = await db.tenants.find_one({"id": tenant_id})
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        update = {
            "subscription_plan": plan,
            "subscription_status": status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Set subscription end date (mock: 30 days from now)
        if plan != "free":
            update["subscription_ends_at"] = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        
        await db.tenants.update_one({"id": tenant_id}, {"$set": update})
        
        logger.info(f"✅ Subscription updated for tenant: {tenant_id} -> {plan}")
        return {"success": True, "message": f"Subscription updated to {plan}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating subscription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@tenants_router.get("/{tenant_id}/usage")
async def get_usage(tenant_id: str):
    """Get tenant usage statistics"""
    try:
        tenant = await db.tenants.find_one({"id": tenant_id})
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Get plan limits
        from models.tenant import SubscriptionPlan
        limits = SubscriptionPlan.get_limits(tenant.get("subscription_plan", "free"))
        
        # Count stores
        stores_count = await db.stores.count_documents({"tenant_id": tenant_id})
        
        # Count users
        users_count = await db.users.count_documents({"tenant_id": tenant_id})
        
        return {
            "success": True,
            "usage": {
                "orders_this_month": tenant.get("orders_this_month", 0),
                "messages_this_month": tenant.get("messages_this_month", 0),
                "stores": stores_count,
                "users": users_count
            },
            "limits": limits,
            "plan": tenant.get("subscription_plan", "free")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching usage: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@tenants_router.get("/plans/all")
async def get_plans():
    """Get all available subscription plans"""
    from models.tenant import SubscriptionPlan
    
    plans = [
        {
            "id": "free",
            "name": "Free",
            "description": "Try Importaba with limited features",
            "price": 0,
            "currency": "INR",
            "billing_period": "month",
            "limits": SubscriptionPlan.get_limits("free"),
            "features": [
                "1 Store Connection",
                "100 Orders/month",
                "Basic Dashboard",
                "Email Support"
            ]
        },
        {
            "id": "starter",
            "name": "Starter",
            "description": "Perfect for small businesses",
            "price": 999,
            "currency": "INR",
            "billing_period": "month",
            "limits": SubscriptionPlan.get_limits("starter"),
            "features": [
                "1 Store Connection",
                "500 Orders/month",
                "WhatsApp Notifications",
                "Basic Analytics",
                "Email Support"
            ]
        },
        {
            "id": "growth",
            "name": "Growth",
            "description": "For growing businesses ready to scale",
            "price": 2999,
            "currency": "INR",
            "billing_period": "month",
            "limits": SubscriptionPlan.get_limits("growth"),
            "popular": True,
            "features": [
                "3 Store Connections",
                "5,000 Orders/month",
                "WhatsApp Marketing Campaigns",
                "AI Analytics & Insights",
                "Dynamic Pricing Engine",
                "Facebook Ads Integration",
                "Priority Support"
            ]
        },
        {
            "id": "enterprise",
            "name": "Enterprise",
            "description": "For large operations with custom needs",
            "price": 9999,
            "currency": "INR",
            "billing_period": "month",
            "limits": SubscriptionPlan.get_limits("enterprise"),
            "features": [
                "Unlimited Stores",
                "Unlimited Orders",
                "All AI Features",
                "Custom Integrations",
                "Dedicated Account Manager",
                "24/7 Phone Support",
                "Custom Reports & Analytics"
            ]
        }
    ]
    
    return {"success": True, "plans": plans}
