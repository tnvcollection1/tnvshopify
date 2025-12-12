"""Meta/Facebook Ads API Routes for Real-time Ad Comparison"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import logging
import httpx
import asyncio

logger = logging.getLogger(__name__)

# Will be injected from server.py
db = None

def set_dependencies(database):
    """Set dependencies from server.py"""
    global db
    db = database

meta_ads_router = APIRouter(prefix="/meta-ads", tags=["Meta Ads Integration"])

META_GRAPH_URL = "https://graph.facebook.com/v18.0"


async def get_tenant_meta_credentials(tenant_id: str):
    """Get Meta API credentials for a tenant"""
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        return None, None, None
    
    api_keys = tenant.get("api_keys", {})
    return (
        api_keys.get("facebook_access_token"),
        api_keys.get("facebook_ad_account_id"),
        api_keys.get("facebook_page_id")
    )


@meta_ads_router.get("/validate")
async def validate_meta_connection(tenant_id: str):
    """Validate Meta API connection for a tenant"""
    try:
        access_token, ad_account_id, page_id = await get_tenant_meta_credentials(tenant_id)
        
        if not access_token:
            return {
                "success": False,
                "connected": False,
                "message": "Meta API not configured. Add your access token in Settings."
            }
        
        # Test connection
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{META_GRAPH_URL}/me",
                params={"access_token": access_token}
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "connected": True,
                    "user": {
                        "id": data.get("id"),
                        "name": data.get("name")
                    },
                    "ad_account_configured": bool(ad_account_id),
                    "page_configured": bool(page_id)
                }
            else:
                return {
                    "success": False,
                    "connected": False,
                    "message": "Invalid access token"
                }
    except Exception as e:
        logger.error(f"Error validating Meta connection: {str(e)}")
        return {"success": False, "connected": False, "error": str(e)}


@meta_ads_router.get("/ad-accounts")
async def get_ad_accounts(tenant_id: str):
    """Get all ad accounts accessible by the user"""
    try:
        access_token, _, _ = await get_tenant_meta_credentials(tenant_id)
        
        if not access_token:
            raise HTTPException(status_code=400, detail="Meta API not configured")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{META_GRAPH_URL}/me/adaccounts",
                params={
                    "access_token": access_token,
                    "fields": "id,name,account_status,currency,amount_spent,balance"
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to fetch ad accounts")
            
            data = response.json()
            return {
                "success": True,
                "ad_accounts": data.get("data", [])
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching ad accounts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@meta_ads_router.get("/campaigns")
async def get_campaigns(
    tenant_id: str,
    status: str = None,
    limit: int = 50
):
    """Get all campaigns for the ad account"""
    try:
        access_token, ad_account_id, _ = await get_tenant_meta_credentials(tenant_id)
        
        if not access_token or not ad_account_id:
            raise HTTPException(status_code=400, detail="Meta Ads not fully configured")
        
        # Ensure ad account ID has correct format
        if not ad_account_id.startswith("act_"):
            ad_account_id = f"act_{ad_account_id}"
        
        params = {
            "access_token": access_token,
            "fields": "id,name,status,objective,created_time,updated_time,daily_budget,lifetime_budget,budget_remaining",
            "limit": limit
        }
        
        if status:
            params["effective_status"] = [status.upper()]
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{META_GRAPH_URL}/{ad_account_id}/campaigns",
                params=params
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=400,
                    detail=error_data.get("error", {}).get("message", "Failed to fetch campaigns")
                )
            
            data = response.json()
            return {
                "success": True,
                "campaigns": data.get("data", []),
                "count": len(data.get("data", []))
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching campaigns: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@meta_ads_router.get("/campaigns/{campaign_id}/insights")
async def get_campaign_insights(
    campaign_id: str,
    tenant_id: str,
    date_preset: str = "last_7d"
):
    """Get insights for a specific campaign"""
    try:
        access_token, _, _ = await get_tenant_meta_credentials(tenant_id)
        
        if not access_token:
            raise HTTPException(status_code=400, detail="Meta API not configured")
        
        params = {
            "access_token": access_token,
            "fields": "campaign_name,impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,conversions,cost_per_conversion,actions",
            "date_preset": date_preset
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{META_GRAPH_URL}/{campaign_id}/insights",
                params=params
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=400,
                    detail=error_data.get("error", {}).get("message", "Failed to fetch insights")
                )
            
            data = response.json()
            insights = data.get("data", [])
            
            return {
                "success": True,
                "campaign_id": campaign_id,
                "date_preset": date_preset,
                "insights": insights[0] if insights else {}
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching campaign insights: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@meta_ads_router.get("/compare")
async def compare_campaigns(
    tenant_id: str,
    campaign_ids: str,  # Comma-separated campaign IDs
    date_preset: str = "last_7d"
):
    """Compare multiple campaigns side by side"""
    try:
        access_token, _, _ = await get_tenant_meta_credentials(tenant_id)
        
        if not access_token:
            raise HTTPException(status_code=400, detail="Meta API not configured")
        
        ids = [cid.strip() for cid in campaign_ids.split(",") if cid.strip()]
        
        if len(ids) < 2:
            raise HTTPException(status_code=400, detail="At least 2 campaign IDs required for comparison")
        
        if len(ids) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 campaigns can be compared at once")
        
        # Fetch insights for all campaigns in parallel
        async def fetch_insights(campaign_id: str):
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{META_GRAPH_URL}/{campaign_id}/insights",
                    params={
                        "access_token": access_token,
                        "fields": "campaign_id,campaign_name,impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,conversions,cost_per_conversion",
                        "date_preset": date_preset
                    }
                )
                if response.status_code == 200:
                    data = response.json().get("data", [])
                    return data[0] if data else {"campaign_id": campaign_id, "error": "No data"}
                return {"campaign_id": campaign_id, "error": "Failed to fetch"}
        
        results = await asyncio.gather(*[fetch_insights(cid) for cid in ids])
        
        # Calculate comparison metrics
        comparison = {
            "campaigns": results,
            "best_ctr": max(results, key=lambda x: float(x.get("ctr", 0) or 0)),
            "best_cpc": min([r for r in results if r.get("cpc")], key=lambda x: float(x.get("cpc", float('inf')) or float('inf')), default={}),
            "highest_reach": max(results, key=lambda x: int(x.get("reach", 0) or 0)),
            "most_conversions": max(results, key=lambda x: int(x.get("conversions", 0) or 0))
        }
        
        return {
            "success": True,
            "date_preset": date_preset,
            "comparison": comparison
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing campaigns: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@meta_ads_router.get("/realtime-stats")
async def get_realtime_stats(tenant_id: str):
    """Get real-time ad performance stats (today)"""
    try:
        access_token, ad_account_id, _ = await get_tenant_meta_credentials(tenant_id)
        
        if not access_token or not ad_account_id:
            raise HTTPException(status_code=400, detail="Meta Ads not fully configured")
        
        if not ad_account_id.startswith("act_"):
            ad_account_id = f"act_{ad_account_id}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{META_GRAPH_URL}/{ad_account_id}/insights",
                params={
                    "access_token": access_token,
                    "fields": "impressions,clicks,spend,cpc,cpm,ctr,reach,actions",
                    "date_preset": "today",
                    "level": "account"
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                return {
                    "success": False,
                    "error": error_data.get("error", {}).get("message", "Failed to fetch stats")
                }
            
            data = response.json()
            insights = data.get("data", [])
            
            today_stats = insights[0] if insights else {
                "impressions": "0",
                "clicks": "0",
                "spend": "0",
                "cpc": "0",
                "ctr": "0",
                "reach": "0"
            }
            
            return {
                "success": True,
                "stats": today_stats,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching realtime stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@meta_ads_router.get("/account-summary")
async def get_account_summary(
    tenant_id: str,
    date_preset: str = "last_30d"
):
    """Get overall account summary with trends"""
    try:
        access_token, ad_account_id, _ = await get_tenant_meta_credentials(tenant_id)
        
        if not access_token or not ad_account_id:
            raise HTTPException(status_code=400, detail="Meta Ads not fully configured")
        
        if not ad_account_id.startswith("act_"):
            ad_account_id = f"act_{ad_account_id}"
        
        async with httpx.AsyncClient() as client:
            # Get current period stats
            response = await client.get(
                f"{META_GRAPH_URL}/{ad_account_id}/insights",
                params={
                    "access_token": access_token,
                    "fields": "impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,actions,conversions,cost_per_conversion",
                    "date_preset": date_preset,
                    "level": "account"
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=400,
                    detail=error_data.get("error", {}).get("message", "Failed to fetch summary")
                )
            
            data = response.json()
            summary = data.get("data", [{}])[0]
            
            # Get active campaigns count
            campaigns_response = await client.get(
                f"{META_GRAPH_URL}/{ad_account_id}/campaigns",
                params={
                    "access_token": access_token,
                    "effective_status": ["ACTIVE"],
                    "fields": "id"
                }
            )
            
            active_campaigns = 0
            if campaigns_response.status_code == 200:
                active_campaigns = len(campaigns_response.json().get("data", []))
            
            return {
                "success": True,
                "summary": summary,
                "active_campaigns": active_campaigns,
                "date_preset": date_preset
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching account summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
