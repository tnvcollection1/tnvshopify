"""TCS Courier Integration Routes
Handles TCS tracking, payment sync, and configuration
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import logging
import httpx
import io

logger = logging.getLogger(__name__)

# Will be injected from server.py
db = None

def set_database(database):
    """Set database connection from server.py"""
    global db
    db = database

tcs_router = APIRouter(prefix="/tcs", tags=["TCS Courier"])


class TCSConfigRequest(BaseModel):
    bearer_token: Optional[str] = None
    token_expiry: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None


@tcs_router.get("/credentials")
async def get_tcs_credentials():
    """Get TCS API configuration status"""
    try:
        config = await db.tcs_config.find_one({"service": "tcs_pakistan"}, {"_id": 0})
        if config:
            return {
                "configured": True,
                "auth_type": config.get("auth_type", "bearer"),
                "bearer_token": config.get("bearer_token", "")[:20] + "..." if config.get("bearer_token") else None,
                "token_expiry": config.get("token_expiry"),
                "username": config.get("username", "")[:5] + "..." if config.get("username") else None,
                "customer_no": config.get("customer_no", "NOT SET")
            }
        else:
            return {"configured": False}
    except Exception as e:
        logger.error(f"Error fetching TCS credentials: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@tcs_router.post("/configure")
async def configure_tcs_api(config_data: dict):
    """Configure TCS API credentials"""
    try:
        auth_type = config_data.get("auth_type", "bearer")
        tcs_config = {
            "service": "tcs_pakistan",
            "auth_type": auth_type,
            "configured_at": datetime.now(timezone.utc).isoformat()
        }
        
        if auth_type == "bearer":
            bearer_token = config_data.get("bearer_token", "").strip()
            token_expiry = config_data.get("token_expiry", "")
            if not bearer_token:
                raise HTTPException(status_code=400, detail="Bearer token is required")
            tcs_config["bearer_token"] = bearer_token
            tcs_config["token_expiry"] = token_expiry if token_expiry else None
        else:
            username = config_data.get("username", "").strip()
            password = config_data.get("password", "").strip()
            if not username or not password:
                raise HTTPException(status_code=400, detail="Username and password are required")
            tcs_config["username"] = username
            tcs_config["password"] = password
        
        customer_no = config_data.get("customer_no", "").strip()
        if customer_no:
            tcs_config["customer_no"] = customer_no
        
        await db.tcs_config.update_one({"service": "tcs_pakistan"}, {"$set": tcs_config}, upsert=True)
        logger.info(f"✅ TCS API configured with {auth_type} authentication")
        return {"success": True, "message": f"TCS API configured successfully with {auth_type} authentication", "auth_type": auth_type}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error configuring TCS API: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@tcs_router.post("/sync-payment-status")
async def sync_tcs_payment_status():
    """Sync COD payment status from TCS API for all delivered orders"""
    try:
        config = await db.tcs_config.find_one({"service": "tcs_pakistan"}, {"_id": 0})
        if not config:
            raise HTTPException(status_code=400, detail="TCS not configured")
        
        customer_no = config.get("customer_no")
        if not customer_no:
            raise HTTPException(status_code=400, detail="TCS customer number not configured")
        
        customers = await db.customers.find({
            "tracking_number": {"$ne": None, "$exists": True},
            "delivery_status": "DELIVERED",
            "$or": [{"cod_payment_status": {"$ne": "RECEIVED"}}, {"cod_payment_status": {"$exists": False}}]
        }, {"_id": 0, "tracking_number": 1, "customer_id": 1, "store_name": 1, "order_number": 1}).to_list(500)
        
        if not customers:
            return {"success": True, "message": "No delivered orders pending payment verification", "checked": 0}
        
        from tcs_tracking import TCSTracker
        if config.get('auth_type') == 'bearer':
            tracker = TCSTracker(bearer_token=config.get('bearer_token'), token_expiry=config.get('token_expiry'), customer_no=config.get('customer_no'))
        else:
            tracker = TCSTracker(username=config.get('username'), password=config.get('password'), customer_no=config.get('customer_no'))
        
        checked_count = 0
        paid_count = 0
        errors = []
        
        for customer in customers[:100]:
            try:
                tracking_number = customer['tracking_number']
                payment_data = tracker.get_payment_status(customer_no, tracking_number)
                if payment_data:
                    update_fields = {
                        "cod_payment_status": payment_data['payment_status'],
                        "cod_amount": payment_data['cod_amount'],
                        "cod_paid_amount": payment_data['paid_amount'],
                        "cod_balance": payment_data['balance'],
                        "cod_payment_date": payment_data['payment_date'],
                        "cod_payment_updated_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.customers.update_one({"customer_id": customer['customer_id'], "store_name": customer['store_name']}, {"$set": update_fields})
                    checked_count += 1
                    if payment_data['payment_status'] in ['PAID', 'PARTIAL']:
                        paid_count += 1
            except Exception as e:
                errors.append(f"{tracking_number}: {str(e)}")
                continue
        
        return {"success": True, "message": f"Payment status checked: {checked_count} orders, {paid_count} paid/partial", "checked": checked_count, "paid": paid_count, "errors": errors if errors else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in TCS payment sync: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@tcs_router.post("/track/{tracking_number}")
async def track_tcs_consignment(tracking_number: str):
    """Track a single TCS consignment"""
    try:
        config = await db.tcs_config.find_one({"service": "tcs_pakistan"}, {"_id": 0})
        if not config:
            raise HTTPException(status_code=400, detail="TCS not configured")
        
        from tcs_tracking import TCSTracker
        if config.get('auth_type') == 'bearer':
            tracker = TCSTracker(bearer_token=config.get('bearer_token'), token_expiry=config.get('token_expiry'), customer_no=config.get('customer_no'))
        else:
            tracker = TCSTracker(username=config.get('username'), password=config.get('password'), customer_no=config.get('customer_no'))
        
        result = tracker.track_consignment(tracking_number)
        if result:
            return {"success": True, "tracking": result}
        else:
            return {"success": False, "error": "Could not retrieve tracking info"}
    except Exception as e:
        logger.error(f"Error tracking {tracking_number}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@tcs_router.get("/auto-sync-status")
async def get_tcs_auto_sync_status():
    """Get TCS auto-sync status"""
    try:
        # Auto-sync is a separate background service - return status based on config
        config = await db.tcs_config.find_one({'service': 'tcs_pakistan'}, {'_id': 0})
        
        # Check if there's a recent sync record
        last_sync = await db.customers.find_one(
            {'last_auto_sync': {'$exists': True}},
            {'_id': 0, 'last_auto_sync': 1},
            sort=[('last_auto_sync', -1)]
        )
        
        return {
            "success": True,
            "configured": config is not None,
            "running": False,  # Background service status
            "last_sync": last_sync.get('last_auto_sync') if last_sync else None,
            "message": "TCS sync available via manual trigger"
        }
    except Exception as e:
        logger.error(f"Error getting auto-sync status: {str(e)}")
        return {
            "success": True,
            "configured": False,
            "running": False,
            "last_sync": None,
            "message": "TCS auto-sync not configured"
        }


@tcs_router.post("/sync-one-by-one")
async def sync_tcs_one_by_one(limit: int = 50, delay: int = 2):
    """Sync TCS tracking one order at a time with delay"""
    try:
        from auto_tcs_sync import auto_tcs_sync
        result = await auto_tcs_sync.sync_orders_one_by_one(db, limit=limit, delay_seconds=delay)
        return result
    except Exception as e:
        logger.error(f"Error in one-by-one sync: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@tcs_router.post("/sync-all")
async def sync_all_tcs_deliveries():
    """Sync all TCS deliveries"""
    try:
        from auto_tcs_sync import auto_tcs_sync
        result = await auto_tcs_sync.sync_all_pending_orders(db)
        return result
    except Exception as e:
        logger.error(f"Error syncing all TCS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@tcs_router.post("/cleanup-invalid-orders")
async def cleanup_invalid_tcs_orders():
    """Clean up invalid TCS orders"""
    try:
        result = await db.customers.update_many(
            {"tracking_number": {"$regex": "^[^0-9]"}},
            {"$set": {"tracking_number": None, "delivery_status": "PENDING"}}
        )
        return {"success": True, "cleaned": result.modified_count}
    except Exception as e:
        logger.error(f"Error cleaning up: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@tcs_router.post("/sync-cod-payments")
async def sync_cod_payments():
    """Sync COD payments from TCS"""
    try:
        from auto_tcs_sync import auto_tcs_sync
        result = await auto_tcs_sync.sync_cod_payments(db)
        return result
    except Exception as e:
        logger.error(f"Error syncing COD payments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@tcs_router.get("/payment-status/{tracking_number}")
async def get_tcs_payment_status(tracking_number: str):
    """Get payment status for a tracking number"""
    try:
        config = await db.tcs_config.find_one({"service": "tcs_pakistan"}, {"_id": 0})
        if not config:
            raise HTTPException(status_code=400, detail="TCS not configured")
        
        customer_no = config.get("customer_no")
        if not customer_no:
            raise HTTPException(status_code=400, detail="TCS customer number not configured")
        
        from tcs_tracking import TCSTracker
        if config.get('auth_type') == 'bearer':
            tracker = TCSTracker(bearer_token=config.get('bearer_token'), token_expiry=config.get('token_expiry'), customer_no=customer_no)
        else:
            tracker = TCSTracker(username=config.get('username'), password=config.get('password'), customer_no=customer_no)
        
        result = tracker.get_payment_status(customer_no, tracking_number)
        return {"success": True, "payment": result}
    except Exception as e:
        logger.error(f"Error getting payment status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@tcs_router.post("/upload-payment")
async def upload_tcs_payment_data(file: UploadFile = File(...)):
    """Upload TCS payment data from Excel"""
    try:
        import pandas as pd
        content = await file.read()
        df = pd.read_excel(io.BytesIO(content))
        
        updated = 0
        for _, row in df.iterrows():
            tracking = str(row.get('Tracking', row.get('CN', ''))).strip()
            status = str(row.get('Status', row.get('Payment Status', ''))).strip().upper()
            if tracking and status:
                result = await db.customers.update_one(
                    {"tracking_number": tracking},
                    {"$set": {"cod_payment_status": status, "cod_payment_updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                if result.modified_count > 0:
                    updated += 1
        
        return {"success": True, "updated": updated, "total_rows": len(df)}
    except Exception as e:
        logger.error(f"Error uploading payment data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
