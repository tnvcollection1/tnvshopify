"""
Super Admin Dashboard - Tenant Usage Monitoring & Subscription Management
- Track tenant usage metrics
- Monitor resource consumption
- Manage subscriptions and limits
- Activity logging
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import os
import logging

logger = logging.getLogger(__name__)

super_admin_router = APIRouter(prefix="/api/super-admin", tags=["Super Admin"])

# Database reference
db = None

def set_database(database):
    global db
    db = database

# ==================== Models ====================

class UsageLimits(BaseModel):
    orders_per_month: int = 100
    whatsapp_messages_per_month: int = 500
    stores_limit: int = 1
    team_members_limit: int = 3
    leads_per_month: int = 100

class SubscriptionPlan(BaseModel):
    name: str
    price_monthly: float
    price_yearly: float
    limits: UsageLimits
    features: List[str]

class TenantUpdate(BaseModel):
    plan: Optional[str] = None
    status: Optional[str] = None  # active, suspended, trial, cancelled
    custom_limits: Optional[Dict[str, int]] = None
    notes: Optional[str] = None

# ==================== Subscription Plans ====================

SUBSCRIPTION_PLANS = {
    "free": {
        "name": "Free",
        "price_monthly": 0,
        "price_yearly": 0,
        "limits": {
            "orders_per_month": 50,
            "whatsapp_messages_per_month": 100,
            "stores_limit": 1,
            "team_members_limit": 2,
            "leads_per_month": 50,
            "api_calls_per_day": 500
        },
        "features": ["Basic Dashboard", "1 Store", "50 Orders/month", "Email Support"]
    },
    "starter": {
        "name": "Starter",
        "price_monthly": 29,
        "price_yearly": 290,
        "limits": {
            "orders_per_month": 500,
            "whatsapp_messages_per_month": 1000,
            "stores_limit": 3,
            "team_members_limit": 5,
            "leads_per_month": 500,
            "api_calls_per_day": 5000
        },
        "features": ["All Free Features", "3 Stores", "500 Orders/month", "WhatsApp Integration", "Lead Ads", "Priority Support"]
    },
    "pro": {
        "name": "Pro",
        "price_monthly": 79,
        "price_yearly": 790,
        "limits": {
            "orders_per_month": 5000,
            "whatsapp_messages_per_month": 10000,
            "stores_limit": 10,
            "team_members_limit": 15,
            "leads_per_month": 5000,
            "api_calls_per_day": 50000
        },
        "features": ["All Starter Features", "10 Stores", "5000 Orders/month", "Advanced Analytics", "API Access", "Phone Support"]
    },
    "enterprise": {
        "name": "Enterprise",
        "price_monthly": 199,
        "price_yearly": 1990,
        "limits": {
            "orders_per_month": -1,  # Unlimited
            "whatsapp_messages_per_month": -1,
            "stores_limit": -1,
            "team_members_limit": -1,
            "leads_per_month": -1,
            "api_calls_per_day": -1
        },
        "features": ["All Pro Features", "Unlimited Everything", "Custom Integrations", "Dedicated Support", "SLA", "White Label Option"]
    }
}

# ==================== Helper Functions ====================

async def get_tenant_usage(tenant_id: str, days: int = 30) -> Dict[str, Any]:
    """Calculate usage metrics for a tenant"""
    date_threshold = datetime.now(timezone.utc) - timedelta(days=days)
    date_str = date_threshold.isoformat()
    
    # Orders count
    orders_count = await db.customers.count_documents({
        "tenant_id": tenant_id,
        "created_at": {"$gte": date_str}
    })
    
    # If no tenant_id field, count all (single tenant mode)
    if orders_count == 0:
        orders_count = await db.customers.count_documents({
            "created_at": {"$gte": date_str}
        })
    
    # WhatsApp messages
    wa_messages = await db.whatsapp_messages.count_documents({
        "tenant_id": tenant_id,
        "sent_at": {"$gte": date_str}
    }) if await db.list_collection_names() and "whatsapp_messages" in await db.list_collection_names() else 0
    
    # Leads captured
    leads_count = await db.facebook_leads.count_documents({
        "stored_at": {"$gte": date_str}
    })
    
    # Stores count
    stores_count = await db.stores.count_documents({})
    
    # Team members
    team_count = await db.users.count_documents({})
    
    # Inventory items
    inventory_count = await db.inventory_v2.count_documents({})
    
    # API calls (from activity log)
    api_calls = await db.activity_logs.count_documents({
        "timestamp": {"$gte": date_str}
    }) if "activity_logs" in await db.list_collection_names() else 0
    
    return {
        "orders_this_month": orders_count,
        "whatsapp_messages": wa_messages,
        "leads_captured": leads_count,
        "stores_connected": stores_count,
        "team_members": team_count,
        "inventory_items": inventory_count,
        "api_calls": api_calls
    }

async def log_activity(action: str, details: Dict[str, Any], user_id: str = None, tenant_id: str = None):
    """Log an activity for audit trail"""
    await db.activity_logs.insert_one({
        "action": action,
        "details": details,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip_address": details.get("ip_address")
    })

# ==================== Dashboard Endpoints ====================

@super_admin_router.get("/dashboard")
async def get_admin_dashboard():
    """Get overview metrics for super admin dashboard"""
    try:
        now = datetime.now(timezone.utc)
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # Total tenants (using users collection as proxy)
        total_tenants = await db.tenants.count_documents({}) if "tenants" in await db.list_collection_names() else 1
        
        # Active tenants (logged in within 7 days)
        active_tenants = await db.users.count_documents({
            "last_login": {"$gte": week_ago.isoformat()}
        })
        
        # New signups this month
        new_signups = await db.tenants.count_documents({
            "created_at": {"$gte": month_ago.isoformat()}
        }) if "tenants" in await db.list_collection_names() else 0
        
        # Revenue metrics (from subscriptions)
        subscriptions = await db.tenant_subscriptions.find({
            "status": "active"
        }).to_list(1000) if "tenant_subscriptions" in await db.list_collection_names() else []
        
        mrr = sum(SUBSCRIPTION_PLANS.get(s.get("plan", "free"), {}).get("price_monthly", 0) for s in subscriptions)
        arr = mrr * 12
        
        # Usage totals
        total_orders = await db.customers.count_documents({})
        total_leads = await db.facebook_leads.count_documents({})
        total_stores = await db.stores.count_documents({})
        total_users = await db.users.count_documents({})
        
        # Orders today
        orders_today = await db.customers.count_documents({
            "created_at": {"$gte": today.isoformat()}
        })
        
        # Plan distribution
        plan_distribution = {}
        for sub in subscriptions:
            plan = sub.get("plan", "free")
            plan_distribution[plan] = plan_distribution.get(plan, 0) + 1
        
        # If no subscriptions, assume all are free
        if not plan_distribution:
            plan_distribution = {"free": total_tenants or 1}
        
        return {
            "success": True,
            "overview": {
                "total_tenants": total_tenants or 1,
                "active_tenants": active_tenants or total_users,
                "new_signups_this_month": new_signups,
                "churn_rate": 0  # TODO: Calculate actual churn
            },
            "revenue": {
                "mrr": mrr,
                "arr": arr,
                "currency": "USD"
            },
            "usage_totals": {
                "total_orders": total_orders,
                "total_leads": total_leads,
                "total_stores": total_stores,
                "total_users": total_users,
                "orders_today": orders_today
            },
            "plan_distribution": plan_distribution,
            "timestamp": now.isoformat()
        }
    except Exception as e:
        logger.error(f"Dashboard error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@super_admin_router.get("/tenants")
async def list_tenants(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    plan: Optional[str] = None,
    search: Optional[str] = None
):
    """List all tenants with their usage metrics"""
    try:
        # Build query
        query = {}
        if status:
            query["status"] = status
        if plan:
            query["plan"] = plan
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        
        # Check if tenants collection exists
        collections = await db.list_collection_names()
        
        if "tenants" in collections:
            cursor = db.tenants.find(query, {"_id": 0}).skip(skip).limit(limit)
            tenants = await cursor.to_list(length=limit)
            total = await db.tenants.count_documents(query)
        else:
            # Fallback: Create tenant info from users
            users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
            tenants = []
            
            for user in users:
                if user.get("role") == "admin":
                    usage = await get_tenant_usage(user.get("id", "default"))
                    tenants.append({
                        "id": user.get("id", "default"),
                        "name": user.get("name", "Default Tenant"),
                        "email": user.get("email", ""),
                        "plan": "free",
                        "status": "active",
                        "created_at": user.get("created_at", datetime.now(timezone.utc).isoformat()),
                        "usage": usage
                    })
            
            total = len(tenants)
            tenants = tenants[skip:skip+limit]
        
        # Enrich with usage data
        for tenant in tenants:
            if "usage" not in tenant:
                tenant["usage"] = await get_tenant_usage(tenant.get("id", ""))
            
            # Get subscription info
            sub = await db.tenant_subscriptions.find_one(
                {"tenant_id": tenant.get("id")},
                {"_id": 0}
            ) if "tenant_subscriptions" in collections else None
            
            tenant["subscription"] = sub or {"plan": "free", "status": "active"}
            
            # Calculate usage percentage
            plan_limits = SUBSCRIPTION_PLANS.get(tenant["subscription"].get("plan", "free"), {}).get("limits", {})
            usage = tenant["usage"]
            
            tenant["usage_percentage"] = {
                "orders": calculate_percentage(usage.get("orders_this_month", 0), plan_limits.get("orders_per_month", 100)),
                "messages": calculate_percentage(usage.get("whatsapp_messages", 0), plan_limits.get("whatsapp_messages_per_month", 500)),
                "stores": calculate_percentage(usage.get("stores_connected", 0), plan_limits.get("stores_limit", 1)),
                "team": calculate_percentage(usage.get("team_members", 0), plan_limits.get("team_members_limit", 3))
            }
        
        return {
            "success": True,
            "tenants": tenants,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"List tenants error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def calculate_percentage(used: int, limit: int) -> float:
    """Calculate usage percentage, handling unlimited (-1)"""
    if limit == -1:
        return 0  # Unlimited
    if limit == 0:
        return 100 if used > 0 else 0
    return min(round((used / limit) * 100, 1), 100)

@super_admin_router.get("/tenants/{tenant_id}")
async def get_tenant_detail(tenant_id: str):
    """Get detailed info for a specific tenant"""
    try:
        collections = await db.list_collection_names()
        
        tenant = None
        if "tenants" in collections:
            tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
        
        if not tenant:
            # Try to get from users
            user = await db.users.find_one({"id": tenant_id}, {"_id": 0, "password": 0})
            if user:
                tenant = {
                    "id": user.get("id"),
                    "name": user.get("name"),
                    "email": user.get("email"),
                    "plan": "free",
                    "status": "active",
                    "created_at": user.get("created_at")
                }
        
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Get usage
        tenant["usage"] = await get_tenant_usage(tenant_id)
        
        # Get subscription
        sub = await db.tenant_subscriptions.find_one(
            {"tenant_id": tenant_id},
            {"_id": 0}
        ) if "tenant_subscriptions" in collections else None
        tenant["subscription"] = sub or {"plan": "free", "status": "active"}
        
        # Get activity logs
        logs = await db.activity_logs.find(
            {"tenant_id": tenant_id},
            {"_id": 0}
        ).sort("timestamp", -1).limit(50).to_list(50) if "activity_logs" in collections else []
        tenant["recent_activity"] = logs
        
        # Get users for this tenant
        users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
        tenant["users"] = users
        
        return {"success": True, "tenant": tenant}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get tenant detail error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@super_admin_router.patch("/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, data: TenantUpdate):
    """Update tenant subscription, status, or limits"""
    try:
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if data.plan:
            update_data["plan"] = data.plan
        if data.status:
            update_data["status"] = data.status
        if data.custom_limits:
            update_data["custom_limits"] = data.custom_limits
        if data.notes is not None:
            update_data["notes"] = data.notes
        
        # Update tenant
        collections = await db.list_collection_names()
        
        if "tenants" in collections:
            result = await db.tenants.update_one(
                {"id": tenant_id},
                {"$set": update_data}
            )
        else:
            # Create tenant record
            await db.tenants.insert_one({
                "id": tenant_id,
                **update_data,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        # Update subscription if plan changed
        if data.plan:
            await db.tenant_subscriptions.update_one(
                {"tenant_id": tenant_id},
                {"$set": {
                    "plan": data.plan,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
        
        # Log activity
        await log_activity(
            "tenant_updated",
            {"tenant_id": tenant_id, "changes": update_data},
            tenant_id=tenant_id
        )
        
        return {"success": True, "message": "Tenant updated"}
    except Exception as e:
        logger.error(f"Update tenant error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@super_admin_router.post("/tenants/{tenant_id}/suspend")
async def suspend_tenant(tenant_id: str, reason: str = ""):
    """Suspend a tenant's access"""
    try:
        await db.tenants.update_one(
            {"id": tenant_id},
            {"$set": {
                "status": "suspended",
                "suspended_at": datetime.now(timezone.utc).isoformat(),
                "suspend_reason": reason
            }},
            upsert=True
        )
        
        await log_activity("tenant_suspended", {"tenant_id": tenant_id, "reason": reason})
        
        return {"success": True, "message": f"Tenant {tenant_id} suspended"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@super_admin_router.post("/tenants/{tenant_id}/activate")
async def activate_tenant(tenant_id: str):
    """Reactivate a suspended tenant"""
    try:
        await db.tenants.update_one(
            {"id": tenant_id},
            {"$set": {
                "status": "active",
                "activated_at": datetime.now(timezone.utc).isoformat()
            },
            "$unset": {"suspended_at": "", "suspend_reason": ""}},
            upsert=True
        )
        
        await log_activity("tenant_activated", {"tenant_id": tenant_id})
        
        return {"success": True, "message": f"Tenant {tenant_id} activated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Usage & Limits ====================

@super_admin_router.get("/usage/check/{tenant_id}")
async def check_usage_limits(tenant_id: str):
    """Check if tenant is within their plan limits"""
    try:
        usage = await get_tenant_usage(tenant_id)
        
        # Get tenant's plan
        sub = await db.tenant_subscriptions.find_one({"tenant_id": tenant_id})
        plan_name = sub.get("plan", "free") if sub else "free"
        plan = SUBSCRIPTION_PLANS.get(plan_name, SUBSCRIPTION_PLANS["free"])
        limits = plan["limits"]
        
        # Check custom limits
        tenant = await db.tenants.find_one({"id": tenant_id})
        if tenant and tenant.get("custom_limits"):
            limits = {**limits, **tenant["custom_limits"]}
        
        warnings = []
        exceeded = []
        
        # Check each limit
        checks = [
            ("orders_per_month", "orders_this_month", "Orders"),
            ("whatsapp_messages_per_month", "whatsapp_messages", "WhatsApp Messages"),
            ("stores_limit", "stores_connected", "Stores"),
            ("team_members_limit", "team_members", "Team Members"),
            ("leads_per_month", "leads_captured", "Leads")
        ]
        
        for limit_key, usage_key, label in checks:
            limit_val = limits.get(limit_key, -1)
            usage_val = usage.get(usage_key, 0)
            
            if limit_val == -1:  # Unlimited
                continue
            
            percentage = (usage_val / limit_val * 100) if limit_val > 0 else 0
            
            if percentage >= 100:
                exceeded.append({
                    "metric": label,
                    "used": usage_val,
                    "limit": limit_val,
                    "percentage": round(percentage, 1)
                })
            elif percentage >= 80:
                warnings.append({
                    "metric": label,
                    "used": usage_val,
                    "limit": limit_val,
                    "percentage": round(percentage, 1)
                })
        
        return {
            "success": True,
            "tenant_id": tenant_id,
            "plan": plan_name,
            "usage": usage,
            "limits": limits,
            "within_limits": len(exceeded) == 0,
            "warnings": warnings,
            "exceeded": exceeded
        }
    except Exception as e:
        logger.error(f"Check usage error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Plans ====================

@super_admin_router.get("/plans")
async def get_plans():
    """Get all subscription plans"""
    return {
        "success": True,
        "plans": SUBSCRIPTION_PLANS
    }

@super_admin_router.post("/plans/{plan_name}")
async def update_plan(plan_name: str, limits: Dict[str, Any]):
    """Update a plan's limits (admin only)"""
    if plan_name not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Store custom plan config in database
    await db.plan_configs.update_one(
        {"plan": plan_name},
        {"$set": {
            "plan": plan_name,
            "custom_limits": limits,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "message": f"Plan {plan_name} updated"}

# ==================== Activity Logs ====================

@super_admin_router.get("/activity-logs")
async def get_activity_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    tenant_id: Optional[str] = None,
    action: Optional[str] = None,
    days: int = Query(7, ge=1, le=90)
):
    """Get activity logs for monitoring"""
    try:
        date_threshold = datetime.now(timezone.utc) - timedelta(days=days)
        
        query = {"timestamp": {"$gte": date_threshold.isoformat()}}
        if tenant_id:
            query["tenant_id"] = tenant_id
        if action:
            query["action"] = action
        
        collections = await db.list_collection_names()
        if "activity_logs" not in collections:
            return {"success": True, "logs": [], "total": 0}
        
        cursor = db.activity_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit)
        logs = await cursor.to_list(length=limit)
        total = await db.activity_logs.count_documents(query)
        
        return {
            "success": True,
            "logs": logs,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Activity logs error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Revenue Analytics ====================

@super_admin_router.get("/revenue")
async def get_revenue_analytics(months: int = Query(6, ge=1, le=24)):
    """Get revenue analytics"""
    try:
        collections = await db.list_collection_names()
        
        if "tenant_subscriptions" not in collections:
            return {
                "success": True,
                "mrr": 0,
                "arr": 0,
                "monthly_trend": [],
                "by_plan": {}
            }
        
        # Get all active subscriptions
        subscriptions = await db.tenant_subscriptions.find({"status": "active"}).to_list(1000)
        
        # Calculate MRR
        mrr = 0
        by_plan = {}
        
        for sub in subscriptions:
            plan_name = sub.get("plan", "free")
            plan = SUBSCRIPTION_PLANS.get(plan_name, SUBSCRIPTION_PLANS["free"])
            price = plan["price_monthly"]
            
            mrr += price
            by_plan[plan_name] = by_plan.get(plan_name, 0) + price
        
        # TODO: Calculate monthly trend from payment history
        monthly_trend = []
        
        return {
            "success": True,
            "mrr": mrr,
            "arr": mrr * 12,
            "currency": "USD",
            "total_subscribers": len(subscriptions),
            "by_plan": by_plan,
            "monthly_trend": monthly_trend
        }
    except Exception as e:
        logger.error(f"Revenue analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== System Health ====================

@super_admin_router.get("/health")
async def get_system_health():
    """Get system health metrics"""
    try:
        collections = await db.list_collection_names()
        
        # Collection sizes
        collection_stats = {}
        for coll in collections[:20]:  # Limit to first 20
            count = await db[coll].count_documents({})
            collection_stats[coll] = count
        
        # Database info
        db_stats = await db.command("dbStats")
        
        return {
            "success": True,
            "database": {
                "name": db.name,
                "collections": len(collections),
                "size_mb": round(db_stats.get("dataSize", 0) / (1024 * 1024), 2),
                "storage_mb": round(db_stats.get("storageSize", 0) / (1024 * 1024), 2)
            },
            "collection_counts": collection_stats,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"System health error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
