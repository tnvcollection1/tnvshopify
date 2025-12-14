"""
Facebook Lead Ads Integration
- Real-time lead capture via webhooks
- Lead retrieval from Facebook Marketing API
- Lead management and status tracking
"""

from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import os
import httpx
import hmac
import hashlib
import json
import logging

logger = logging.getLogger(__name__)

lead_ads_router = APIRouter(prefix="/api/lead-ads", tags=["Lead Ads"])

# Database reference
db = None

def set_database(database):
    global db
    db = database

# Facebook Configuration
FACEBOOK_APP_SECRET = os.environ.get('META_APP_SECRET', '')
FACEBOOK_ACCESS_TOKEN = os.environ.get('FACEBOOK_ACCESS_TOKEN', '')
WEBHOOK_VERIFY_TOKEN = os.environ.get('LEAD_ADS_WEBHOOK_TOKEN', 'omnisales_leads_123')

# ==================== Models ====================

class LeadStatus:
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    CONVERTED = "converted"
    REJECTED = "rejected"

class LeadUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

# ==================== Webhook Verification ====================

def verify_webhook_signature(payload_body: bytes, signature_header: str) -> bool:
    """Verify that the webhook payload was signed by Facebook"""
    if not signature_header or not FACEBOOK_APP_SECRET:
        return False
    
    if not signature_header.startswith("sha256="):
        return False
    
    signature_from_header = signature_header[7:]
    
    expected_signature = hmac.new(
        FACEBOOK_APP_SECRET.encode('utf-8'),
        payload_body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature_from_header)

# ==================== Lead Retrieval ====================

async def retrieve_lead_from_facebook(leadgen_id: str, access_token: str) -> Optional[Dict[str, Any]]:
    """Retrieve complete lead data from Facebook using the leadgen_id"""
    url = f"https://graph.facebook.com/v20.0/{leadgen_id}"
    
    params = {
        "access_token": access_token,
        "fields": "created_time,id,ad_id,form_id,field_data,campaign_id,adset_id"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error retrieving lead {leadgen_id}: {str(e)}")
            return None

def transform_lead_data(lead_data: Dict[str, Any], page_id: str = None) -> Dict[str, Any]:
    """Transform Facebook lead data into application format"""
    field_data = lead_data.get("field_data", [])
    
    # Convert field_data array into dictionary
    fields_dict = {}
    for field in field_data:
        field_name = field.get("name", "").lower().replace(" ", "_")
        field_values = field.get("values", [])
        fields_dict[field_name] = field_values[0] if field_values else None
    
    # Parse created_time
    created_time = lead_data.get("created_time")
    if isinstance(created_time, int):
        created_time = datetime.fromtimestamp(created_time, tz=timezone.utc).isoformat()
    
    return {
        "leadgen_id": lead_data.get("id"),
        "facebook_id": lead_data.get("id"),
        "ad_id": lead_data.get("ad_id"),
        "form_id": lead_data.get("form_id"),
        "campaign_id": lead_data.get("campaign_id"),
        "adset_id": lead_data.get("adset_id"),
        "page_id": page_id,
        "created_time": created_time,
        "full_name": fields_dict.get("full_name") or fields_dict.get("name"),
        "email": fields_dict.get("email"),
        "phone": fields_dict.get("phone_number") or fields_dict.get("phone"),
        "city": fields_dict.get("city"),
        "state": fields_dict.get("state"),
        "country": fields_dict.get("country"),
        "zip_code": fields_dict.get("zip_code") or fields_dict.get("zip"),
        "company": fields_dict.get("company_name") or fields_dict.get("company"),
        "job_title": fields_dict.get("job_title"),
        "all_fields": fields_dict,
        "stored_at": datetime.now(timezone.utc).isoformat(),
        "status": LeadStatus.NEW,
        "notes": "",
        "assigned_to": None,
        "source": "facebook_lead_ads"
    }

async def process_lead_data(leadgen_id: str, page_id: str, access_token: str):
    """Process a lead by retrieving its data and storing it"""
    lead_data = await retrieve_lead_from_facebook(leadgen_id, access_token)
    
    if not lead_data:
        logger.warning(f"Failed to retrieve lead data for {leadgen_id}")
        return None
    
    transformed_lead = transform_lead_data(lead_data, page_id)
    
    try:
        # Check if lead already exists
        existing = await db.facebook_leads.find_one({"leadgen_id": leadgen_id})
        if existing:
            logger.info(f"Lead {leadgen_id} already exists, skipping")
            return existing
        
        result = await db.facebook_leads.insert_one(transformed_lead)
        logger.info(f"✅ Lead {leadgen_id} stored with MongoDB ID: {result.inserted_id}")
        return transformed_lead
    except Exception as e:
        logger.error(f"Error storing lead {leadgen_id}: {str(e)}")
        return None

# ==================== Webhook Endpoints ====================

@lead_ads_router.get("/webhook")
async def verify_webhook(
    request: Request
):
    """
    Handle webhook verification request from Facebook.
    Facebook sends this GET request during initial setup.
    """
    params = dict(request.query_params)
    hub_mode = params.get("hub.mode")
    hub_challenge = params.get("hub.challenge")
    hub_verify_token = params.get("hub.verify_token")
    
    logger.info(f"Webhook verification request: mode={hub_mode}, token={hub_verify_token}")
    
    if hub_mode != "subscribe":
        raise HTTPException(status_code=403, detail="Invalid mode")
    
    if hub_verify_token != WEBHOOK_VERIFY_TOKEN:
        logger.warning(f"Invalid verify token: {hub_verify_token}")
        raise HTTPException(status_code=403, detail="Invalid verify token")
    
    logger.info("✅ Webhook verified successfully")
    return int(hub_challenge) if hub_challenge else ""

@lead_ads_router.post("/webhook")
async def handle_webhook(request: Request):
    """
    Handle incoming webhook events from Facebook.
    This receives lead form submissions in real-time.
    """
    raw_body = await request.body()
    signature_header = request.headers.get("X-Hub-Signature-256", "")
    
    # Log incoming webhook
    logger.info(f"📥 Received webhook, size: {len(raw_body)} bytes")
    
    # Verify signature if app secret is configured
    if FACEBOOK_APP_SECRET and not verify_webhook_signature(raw_body, signature_header):
        logger.warning("❌ Invalid webhook signature")
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    logger.info(f"Webhook payload: {json.dumps(payload, indent=2)[:500]}...")
    
    # Process the webhook payload
    if payload.get("object") != "page":
        logger.info(f"Ignoring non-page webhook: {payload.get('object')}")
        return {"status": "received"}
    
    # Get access token from database or environment
    access_token = FACEBOOK_ACCESS_TOKEN
    
    # Try to get token from stored WhatsApp accounts (which use same Meta token)
    try:
        wa_account = await db.whatsapp_accounts.find_one({}, {"access_token": 1})
        if wa_account and wa_account.get("access_token"):
            access_token = wa_account["access_token"]
    except:
        pass
    
    # Extract lead data from the webhook
    leads_processed = 0
    for entry in payload.get("entry", []):
        page_id = entry.get("id")
        
        for change in entry.get("changes", []):
            if change.get("field") == "leadgen":
                lead_value = change.get("value", {})
                leadgen_id = lead_value.get("leadgen_id")
                
                if leadgen_id:
                    logger.info(f"📋 Processing lead: {leadgen_id}")
                    await process_lead_data(leadgen_id, page_id, access_token)
                    leads_processed += 1
    
    logger.info(f"✅ Processed {leads_processed} leads from webhook")
    return {"status": "received", "leads_processed": leads_processed}

# ==================== Lead Management Endpoints ====================

@lead_ads_router.get("/leads")
async def get_leads(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    days: Optional[int] = Query(None, description="Filter leads from last N days"),
    search: Optional[str] = None
):
    """Retrieve leads with pagination and filtering"""
    query = {}
    
    if status:
        query["status"] = status
    
    if days:
        date_threshold = datetime.now(timezone.utc) - timedelta(days=days)
        query["stored_at"] = {"$gte": date_threshold.isoformat()}
    
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = db.facebook_leads.find(query, {"_id": 0}).sort("stored_at", -1).skip(skip).limit(limit)
    leads = await cursor.to_list(length=limit)
    
    # Get total count for pagination
    total = await db.facebook_leads.count_documents(query)
    
    return {
        "success": True,
        "leads": leads,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@lead_ads_router.get("/leads/stats")
async def get_lead_stats(days: int = Query(30, ge=1, le=365)):
    """Get lead statistics for the dashboard"""
    date_threshold = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Total leads in period
    total = await db.facebook_leads.count_documents({
        "stored_at": {"$gte": date_threshold.isoformat()}
    })
    
    # Leads by status
    pipeline = [
        {"$match": {"stored_at": {"$gte": date_threshold.isoformat()}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = {}
    async for doc in db.facebook_leads.aggregate(pipeline):
        status_counts[doc["_id"]] = doc["count"]
    
    # Leads by day (last 7 days)
    daily_pipeline = [
        {"$match": {"stored_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()}}},
        {
            "$group": {
                "_id": {"$substr": ["$stored_at", 0, 10]},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    daily_counts = []
    async for doc in db.facebook_leads.aggregate(daily_pipeline):
        daily_counts.append({"date": doc["_id"], "count": doc["count"]})
    
    # Top forms
    form_pipeline = [
        {"$match": {"stored_at": {"$gte": date_threshold.isoformat()}}},
        {"$group": {"_id": "$form_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_forms = []
    async for doc in db.facebook_leads.aggregate(form_pipeline):
        top_forms.append({"form_id": doc["_id"], "count": doc["count"]})
    
    return {
        "success": True,
        "total": total,
        "by_status": status_counts,
        "daily_trend": daily_counts,
        "top_forms": top_forms,
        "new_count": status_counts.get("new", 0),
        "contacted_count": status_counts.get("contacted", 0),
        "qualified_count": status_counts.get("qualified", 0),
        "converted_count": status_counts.get("converted", 0)
    }

@lead_ads_router.get("/leads/{leadgen_id}")
async def get_lead_detail(leadgen_id: str):
    """Get detailed information for a specific lead"""
    lead = await db.facebook_leads.find_one({"leadgen_id": leadgen_id}, {"_id": 0})
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {"success": True, "lead": lead}

@lead_ads_router.patch("/leads/{leadgen_id}")
async def update_lead(leadgen_id: str, data: LeadUpdate):
    """Update lead status, notes, or assignment"""
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.status:
        update_data["status"] = data.status
    if data.notes is not None:
        update_data["notes"] = data.notes
    if data.assigned_to is not None:
        update_data["assigned_to"] = data.assigned_to
    
    result = await db.facebook_leads.update_one(
        {"leadgen_id": leadgen_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {"success": True, "message": "Lead updated"}

@lead_ads_router.delete("/leads/{leadgen_id}")
async def delete_lead(leadgen_id: str):
    """Delete a lead"""
    result = await db.facebook_leads.delete_one({"leadgen_id": leadgen_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {"success": True, "message": "Lead deleted"}

# ==================== Form Management ====================

@lead_ads_router.get("/forms")
async def get_lead_forms(page_id: Optional[str] = None):
    """Get list of lead forms from Facebook"""
    if not FACEBOOK_ACCESS_TOKEN:
        raise HTTPException(status_code=400, detail="Facebook access token not configured")
    
    # Get page ID from stored accounts if not provided
    if not page_id:
        wa_account = await db.whatsapp_accounts.find_one({}, {"page_id": 1})
        if wa_account:
            page_id = wa_account.get("page_id")
    
    if not page_id:
        return {"success": True, "forms": [], "message": "No page ID configured"}
    
    url = f"https://graph.facebook.com/v20.0/{page_id}/leadgen_forms"
    params = {
        "access_token": FACEBOOK_ACCESS_TOKEN,
        "fields": "id,name,status,leads_count,created_time"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=10.0)
            data = response.json()
            
            if "error" in data:
                logger.error(f"Facebook API error: {data['error']}")
                return {"success": False, "error": data["error"].get("message")}
            
            return {
                "success": True,
                "forms": data.get("data", [])
            }
        except Exception as e:
            logger.error(f"Error fetching forms: {str(e)}")
            return {"success": False, "error": str(e)}

# ==================== Setup Info ====================

@lead_ads_router.get("/setup-info")
async def get_setup_info(request: Request):
    """Get webhook setup information"""
    host = request.headers.get('host', '')
    scheme = request.headers.get('x-forwarded-proto', 'https')
    
    # Determine the webhook URL
    if 'importbaba.com' in host:
        webhook_url = "https://importbaba.com/api/lead-ads/webhook"
    elif 'localhost' in host:
        webhook_url = f"http://{host}/api/lead-ads/webhook"
    else:
        webhook_url = f"{scheme}://{host}/api/lead-ads/webhook"
    
    return {
        "success": True,
        "webhook_url": webhook_url,
        "verify_token": WEBHOOK_VERIFY_TOKEN,
        "is_configured": bool(FACEBOOK_APP_SECRET and FACEBOOK_ACCESS_TOKEN),
        "instructions": [
            "1. Go to your Facebook App Dashboard",
            "2. Navigate to Products > Webhooks",
            "3. Add a new webhook subscription for 'Page'",
            f"4. Enter Callback URL: {webhook_url}",
            f"5. Enter Verify Token: {WEBHOOK_VERIFY_TOKEN}",
            "6. Subscribe to 'leadgen' field",
            "7. Make sure your Page is subscribed to receive leadgen events"
        ]
    }
