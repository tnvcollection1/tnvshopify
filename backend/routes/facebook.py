"""
Facebook Marketing API Routes
Handles all Facebook Ads Manager integration endpoints
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
from typing import Optional

from facebook_marketing import facebook_marketing
from ai_campaign_optimizer import ai_campaign_optimizer

logger = logging.getLogger(__name__)

# Create router with prefix
facebook_router = APIRouter(prefix="/facebook", tags=["Facebook Marketing"])


# ==================== PYDANTIC MODELS ====================

class CreateCampaignRequest(BaseModel):
    name: str
    objective: str
    daily_budget: Optional[float] = None
    lifetime_budget: Optional[float] = None
    status: str = 'PAUSED'


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
