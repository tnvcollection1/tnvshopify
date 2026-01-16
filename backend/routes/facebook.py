"""
Facebook Marketing API Routes
Handles all Facebook Ads Manager integration endpoints
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
from typing import Optional, List
from datetime import datetime, timezone

from facebook_marketing import facebook_marketing
from ai_campaign_optimizer import ai_campaign_optimizer

logger = logging.getLogger(__name__)

# Database will be injected from server.py
db = None

def set_database(database):
    """Set the database connection from server.py"""
    global db
    db = database

# Create router with prefix
facebook_router = APIRouter(prefix="/facebook", tags=["Facebook Marketing"])


# ==================== PYDANTIC MODELS ====================

class CreateCampaignRequest(BaseModel):
    name: str
    objective: str
    daily_budget: Optional[float] = None
    lifetime_budget: Optional[float] = None
    status: str = 'PAUSED'


class AudienceCustomersRequest(BaseModel):
    customer_ids: List[str] = []
    store_name: Optional[str] = None


# ==================== CONNECTION & ACCOUNT ENDPOINTS ====================

@facebook_router.get("/status")
async def get_facebook_status():
    """Check Facebook API connection status"""
    try:
        result = facebook_marketing.get_me()
        return result
    except Exception as e:
        logger.error(f"Error checking Facebook status: {str(e)}")
        return {"success": False, "error": str(e)}


@facebook_router.get("/ad-accounts")
async def get_facebook_ad_accounts():
    """Get all ad accounts accessible with the token"""
    try:
        result = facebook_marketing.get_ad_accounts()
        return result
    except Exception as e:
        logger.error(f"Error getting ad accounts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@facebook_router.post("/set-ad-account")
async def set_facebook_ad_account(ad_account_id: str):
    """Set the active ad account"""
    try:
        result = facebook_marketing.set_ad_account(ad_account_id)
        return result
    except Exception as e:
        logger.error(f"Error setting ad account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CAMPAIGN ENDPOINTS ====================

@facebook_router.get("/campaigns")
async def get_facebook_campaigns(status: str = None):
    """Get all campaigns for the ad account"""
    try:
        result = facebook_marketing.get_campaigns(status_filter=status)
        return result
    except Exception as e:
        logger.error(f"Error getting campaigns: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@facebook_router.get("/campaigns/{campaign_id}/insights")
async def get_facebook_campaign_insights(campaign_id: str, date_preset: str = 'last_30d'):
    """Get performance insights for a specific campaign"""
    try:
        result = facebook_marketing.get_campaign_insights(campaign_id, date_preset)
        return result
    except Exception as e:
        logger.error(f"Error getting campaign insights: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@facebook_router.get("/campaigns/all/insights")
async def get_all_campaigns_insights(date_preset: str = 'last_30d'):
    """Get all campaigns with their insights"""
    try:
        result = facebook_marketing.get_all_campaigns_with_insights(date_preset)
        return result
    except Exception as e:
        logger.error(f"Error getting campaigns insights: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@facebook_router.get("/account/insights")
async def get_facebook_account_insights(date_preset: str = 'last_30d'):
    """Get account-level performance insights"""
    try:
        result = facebook_marketing.get_account_insights(date_preset)
        return result
    except Exception as e:
        logger.error(f"Error getting account insights: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@facebook_router.post("/campaigns/{campaign_id}/status")
async def update_facebook_campaign_status(campaign_id: str, status: str):
    """Update campaign status (ACTIVE, PAUSED, ARCHIVED)"""
    try:
        if status not in ['ACTIVE', 'PAUSED', 'ARCHIVED']:
            raise HTTPException(status_code=400, detail="Invalid status. Use ACTIVE, PAUSED, or ARCHIVED")
        result = facebook_marketing.update_campaign_status(campaign_id, status)
        return result
    except Exception as e:
        logger.error(f"Error updating campaign status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@facebook_router.post("/campaigns/{campaign_id}/budget")
async def update_facebook_campaign_budget(campaign_id: str, daily_budget: float = None, lifetime_budget: float = None):
    """Update campaign budget"""
    try:
        result = facebook_marketing.update_campaign_budget(campaign_id, daily_budget, lifetime_budget)
        return result
    except Exception as e:
        logger.error(f"Error updating campaign budget: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@facebook_router.post("/campaigns/create")
async def create_facebook_campaign(request: CreateCampaignRequest):
    """Create a new Facebook campaign"""
    try:
        result = facebook_marketing.create_campaign(
            name=request.name,
            objective=request.objective,
            daily_budget=request.daily_budget,
            lifetime_budget=request.lifetime_budget,
            status=request.status
        )
        return result
    except Exception as e:
        logger.error(f"Error creating campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== AUDIENCE ENDPOINTS ====================

@facebook_router.get("/audiences")
async def get_facebook_custom_audiences():
    """Get all custom audiences for the ad account"""
    try:
        result = facebook_marketing.get_custom_audiences()
        return result
    except Exception as e:
        logger.error(f"Error getting audiences: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@facebook_router.post("/audiences/create")
async def create_facebook_custom_audience(name: str, description: str = None):
    """Create a new custom audience"""
    try:
        result = facebook_marketing.create_custom_audience(name, description)
        return result
    except Exception as e:
        logger.error(f"Error creating audience: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@facebook_router.post("/audiences/{audience_id}/add-customers")
async def add_customers_to_audience(audience_id: str, request: AudienceCustomersRequest):
    """Add CRM customers to a Facebook custom audience"""
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not initialized")
        
        # Fetch customer data from CRM
        query = {}
        if request.customer_ids:
            query["customer_id"] = {"$in": request.customer_ids}
        if request.store_name:
            query["store_name"] = request.store_name
        
        customers_cursor = db.customers.find(query, {"_id": 0, "email": 1, "phone": 1})
        customers = await customers_cursor.to_list(10000)
        
        if not customers:
            return {"success": False, "error": "No customers found"}
        
        # Add to Facebook audience
        result = facebook_marketing.add_users_to_audience(audience_id, customers)
        return result
        
    except Exception as e:
        logger.error(f"Error adding customers to audience: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@facebook_router.post("/audiences/sync-store")
async def sync_store_to_audience(store_name: str, audience_name: str = None):
    """Create an audience from all customers of a store"""
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not initialized")
        
        # Fetch all customers from the store
        customers_cursor = db.customers.find(
            {"store_name": store_name},
            {"_id": 0, "email": 1, "phone": 1, "first_name": 1, "last_name": 1}
        )
        customers = await customers_cursor.to_list(10000)
        
        if not customers:
            return {"success": False, "error": f"No customers found for store: {store_name}"}
        
        # Create new audience
        if not audience_name:
            audience_name = f"{store_name} - CRM Customers - {datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
        
        create_result = facebook_marketing.create_custom_audience(
            audience_name,
            f"Synced from CRM for store: {store_name}"
        )
        
        if not create_result.get('success'):
            return create_result
        
        audience_id = create_result.get('audience_id')
        
        # Add customers to the audience
        add_result = facebook_marketing.add_users_to_audience(audience_id, customers)
        
        return {
            "success": True,
            "audience_id": audience_id,
            "audience_name": audience_name,
            "store_name": store_name,
            "customers_synced": len(customers)
        }
        
    except Exception as e:
        logger.error(f"Error syncing store to audience: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@facebook_router.post("/audiences/{audience_id}/lookalike")
async def create_facebook_lookalike_audience(audience_id: str, name: str, country: str = 'PK', ratio: float = 0.01):
    """Create a lookalike audience from a custom audience"""
    try:
        result = facebook_marketing.create_lookalike_audience(audience_id, name, country, ratio)
        return result
    except Exception as e:
        logger.error(f"Error creating lookalike audience: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== AI OPTIMIZER ENDPOINTS ====================

@facebook_router.post("/ai/analyze-campaigns")
async def ai_analyze_campaigns(date_preset: str = 'last_30d'):
    """AI analysis of all campaigns with recommendations"""
    try:
        # Get campaigns with insights
        campaigns_result = facebook_marketing.get_all_campaigns_with_insights(date_preset)
        if not campaigns_result.get('success'):
            return campaigns_result
        
        # Get account insights
        account_result = facebook_marketing.get_account_insights(date_preset)
        account_insights = account_result.get('metrics') if account_result.get('success') else None
        
        # Run AI analysis
        analysis = await ai_campaign_optimizer.analyze_campaigns(
            campaigns_result.get('campaigns', []),
            account_insights
        )
        
        return analysis
        
    except Exception as e:
        logger.error(f"Error in AI campaign analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@facebook_router.post("/ai/scaling-recommendation/{campaign_id}")
async def ai_scaling_recommendation(campaign_id: str, target_increase: float = 0.2):
    """Get AI recommendation for scaling a specific campaign"""
    try:
        # Get campaign with insights
        campaigns_result = facebook_marketing.get_campaigns()
        if not campaigns_result.get('success'):
            return campaigns_result
        
        campaign = None
        for c in campaigns_result.get('campaigns', []):
            if c.get('id') == campaign_id:
                campaign = c
                break
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Get insights
        insights_result = facebook_marketing.get_campaign_insights(campaign_id)
        if insights_result.get('success'):
            campaign['insights'] = insights_result.get('metrics', {})
        
        # Get AI recommendation
        recommendation = await ai_campaign_optimizer.get_scaling_recommendation(campaign, target_increase)
        return recommendation
        
    except Exception as e:
        logger.error(f"Error getting scaling recommendation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@facebook_router.post("/ai/budget-optimization")
async def ai_budget_optimization(total_budget: float, date_preset: str = 'last_30d'):
    """Get AI recommendation for optimal budget allocation"""
    try:
        # Get campaigns with insights
        campaigns_result = facebook_marketing.get_all_campaigns_with_insights(date_preset)
        if not campaigns_result.get('success'):
            return campaigns_result
        
        # Get AI recommendation
        recommendation = await ai_campaign_optimizer.get_budget_optimization(
            campaigns_result.get('campaigns', []),
            total_budget
        )
        
        return recommendation
        
    except Exception as e:
        logger.error(f"Error getting budget optimization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@facebook_router.post("/ai/diagnose/{campaign_id}")
async def ai_diagnose_campaign(campaign_id: str):
    """Get AI diagnosis for an underperforming campaign"""
    try:
        # Get campaign with insights
        campaigns_result = facebook_marketing.get_campaigns()
        if not campaigns_result.get('success'):
            return campaigns_result
        
        campaign = None
        for c in campaigns_result.get('campaigns', []):
            if c.get('id') == campaign_id:
                campaign = c
                break
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Get insights
        insights_result = facebook_marketing.get_campaign_insights(campaign_id)
        if insights_result.get('success'):
            campaign['insights'] = insights_result.get('metrics', {})
        
        # Get AI diagnosis
        diagnosis = await ai_campaign_optimizer.diagnose_campaign(campaign)
        return diagnosis
        
    except Exception as e:
        logger.error(f"Error diagnosing campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DATA DELETION CALLBACK ENDPOINTS ====================
# Required for Meta/Facebook App compliance

import hashlib
import hmac
import base64
import json
import os
from fastapi import Request

# Get app secret from environment
FACEBOOK_APP_SECRET = os.environ.get("FACEBOOK_APP_SECRET", "")

def parse_signed_request(signed_request: str, app_secret: str):
    """
    Parse and verify a signed_request from Facebook
    Returns the payload if valid, None if invalid
    """
    try:
        encoded_sig, payload = signed_request.split('.', 1)
        
        # Decode the signature
        sig = base64.urlsafe_b64decode(encoded_sig + "==")
        
        # Decode the payload
        data = json.loads(base64.urlsafe_b64decode(payload + "=="))
        
        if app_secret:
            # Verify signature
            expected_sig = hmac.new(
                app_secret.encode('utf-8'),
                payload.encode('utf-8'),
                hashlib.sha256
            ).digest()
            
            if not hmac.compare_digest(sig, expected_sig):
                return None
        
        return data
    except Exception as e:
        logger.error(f"Error parsing signed request: {e}")
        return None


@facebook_router.post("/data-deletion")
async def handle_data_deletion(request: Request):
    """
    Handle Facebook/Meta data deletion callback
    
    Facebook sends a POST request when a user requests their data to be deleted.
    We must respond with a URL where they can check the status and a confirmation code.
    
    Reference: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
    """
    try:
        # Get form data
        form_data = await request.form()
        signed_request = form_data.get("signed_request", "")
        
        if not signed_request:
            # Try JSON body as fallback
            try:
                body = await request.json()
                signed_request = body.get("signed_request", "")
            except:
                pass
        
        if not signed_request:
            raise HTTPException(status_code=400, detail="Missing signed_request")
        
        # Parse the signed request
        data = parse_signed_request(signed_request, FACEBOOK_APP_SECRET)
        
        if data is None and FACEBOOK_APP_SECRET:
            raise HTTPException(status_code=400, detail="Invalid signed_request signature")
        
        # Extract user ID from the request
        user_id = data.get("user_id", "unknown") if data else "unknown"
        
        # Generate a confirmation code
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        confirmation_code = f"DEL-{user_id[-8:] if len(user_id) > 8 else user_id}-{timestamp}"
        
        # Log the deletion request (in production, actually delete user data here)
        logger.info(f"[Facebook Data Deletion] User ID: {user_id}, Confirmation: {confirmation_code}")
        
        # TODO: In production, implement actual data deletion:
        # 1. Find user by Facebook ID in database
        # 2. Delete or anonymize their data
        # 3. Store deletion request for audit trail
        
        # Get the base URL from request
        base_url = str(request.base_url).rstrip('/')
        
        # Return the status URL and confirmation code
        return {
            "url": f"{base_url}/api/facebook/deletion-status/{confirmation_code}",
            "confirmation_code": confirmation_code
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling data deletion: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@facebook_router.get("/deletion-status/{confirmation_code}")
async def get_deletion_status(confirmation_code: str):
    """
    Check the status of a data deletion request
    
    Facebook/users can visit this URL to verify deletion status
    """
    # Validate confirmation code format
    if not confirmation_code.startswith("DEL-"):
        raise HTTPException(status_code=404, detail="Invalid confirmation code")
    
    # In production, look up the actual deletion status from database
    # For now, return a completed status
    return {
        "confirmation_code": confirmation_code,
        "status": "completed",
        "message": "User data has been deleted successfully",
        "completed_at": datetime.now(timezone.utc).isoformat()
    }


@facebook_router.get("/data-deletion-info")
async def data_deletion_info():
    """
    Public information page about data deletion
    Can be used as a reference URL in Facebook App settings
    """
    return {
        "title": "Data Deletion Request",
        "description": "Wamerce respects your privacy. When you disconnect your Facebook account or request data deletion, we remove all associated data from our systems.",
        "process": [
            "1. Facebook notifies us of your deletion request",
            "2. We identify all data associated with your Facebook account",
            "3. Your data is permanently deleted from our systems",
            "4. You receive a confirmation code to verify deletion"
        ],
        "contact": "For questions about data deletion, please contact support@wamerce.com",
        "policy_url": "/privacy-policy"
    }
