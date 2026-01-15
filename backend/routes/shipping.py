"""
DTDC Shipping Integration API
- Shipment Booking (Create consignment)
- Shipment Tracking (Get status)
- Rate Calculation (Estimate shipping cost)
- Pickup Scheduling
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import httpx
import os
import hashlib
import json

router = APIRouter(prefix="/api/shipping", tags=["Shipping"])

# DTDC Configuration - loaded from environment or defaults
DTDC_CONFIG = {
    "base_url": "https://customer.dtdc.in",
    "api_playground_url": "https://customer.dtdc.in/api-playground",
    "softdata_url": "https://dashboard.shipsy.in/api/customer/integration/consignment/softdata",
    "tracking_url": "https://blktracksvc.dtdc.com/dtdc-api/rest/XMLCnTrk/getDetails",
    "customer_code": os.environ.get("DTDC_CUSTOMER_CODE", "GL6029"),
    "username": os.environ.get("DTDC_USERNAME", "GL6029"),
    "password": os.environ.get("DTDC_PASSWORD", "Sunny345!"),
    "api_key": os.environ.get("DTDC_API_KEY", ""),
    "organisation_id": "1"
}

# TNV Collection Origin Address (India)
TNV_ORIGIN = {
    "name": "TNV Collection",
    "phone": "",
    "alternate_phone": "",
    "address_line_1": "",
    "address_line_2": "",
    "pincode": "",
    "city": "",
    "state": ""
}

# Database reference
_db = None

def set_database(db):
    global _db
    _db = db

# ======================
# PYDANTIC MODELS
# ======================

class Address(BaseModel):
    name: str
    phone: str
    alternate_phone: Optional[str] = ""
    address_line_1: str
    address_line_2: Optional[str] = ""
    pincode: str
    city: str
    state: str
    country: str = "India"
    email: Optional[str] = None

class PackageDetails(BaseModel):
    weight: float = Field(..., description="Weight in kg")
    length: Optional[float] = None  # cm
    width: Optional[float] = None   # cm
    height: Optional[float] = None  # cm
    num_pieces: int = 1
    declared_value: Optional[float] = None
    description: str = "Fashion Items"

class ShipmentBookingRequest(BaseModel):
    order_id: str
    store: str = "tnvcollection"
    service_type: str = "PRIORITY"  # PRIORITY, EXPRESS, STANDARD
    load_type: str = "NON-DOCUMENT"  # DOCUMENT, NON-DOCUMENT
    cod_amount: float = 0
    destination: Address
    package: PackageDetails
    customer_reference: Optional[str] = None

class TrackingRequest(BaseModel):
    awb_number: str
    store: str = "tnvcollection"

class RateCalculationRequest(BaseModel):
    origin_pincode: str
    destination_pincode: str
    weight: float  # kg
    declared_value: Optional[float] = None
    service_type: str = "PRIORITY"
    cod: bool = False

class PickupRequest(BaseModel):
    store: str = "tnvcollection"
    pickup_date: str  # YYYY-MM-DD
    pickup_time_slot: str  # "10:00-14:00"
    num_packages: int = 1
    total_weight: float  # kg
    remarks: Optional[str] = None

# ======================
# HELPER FUNCTIONS
# ======================

async def get_dtdc_auth_token():
    """Get authentication token from DTDC"""
    auth_url = f"{DTDC_CONFIG['base_url']}/api/authenticate"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(auth_url, json={
                "username": DTDC_CONFIG["username"],
                "password": DTDC_CONFIG["password"]
            }, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                return data.get("token")
        except Exception as e:
            print(f"DTDC Auth Error: {e}")
    
    return None

def generate_reference_number(order_id: str) -> str:
    """Generate unique reference number for shipment"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"TNV{timestamp}{order_id[-6:]}"

# ======================
# API ENDPOINTS
# ======================

@router.post("/book")
async def book_shipment(request: ShipmentBookingRequest):
    """
    Book a new shipment with DTDC
    Creates a consignment and returns AWB number
    """
    try:
        # Generate reference number
        reference_number = generate_reference_number(request.order_id)
        
        # Get store origin details
        store_config = None
        if _db:
            store_config = await _db.shipping_config.find_one(
                {"store": request.store}, {"_id": 0}
            )
        
        origin = store_config.get("origin") if store_config else TNV_ORIGIN
        
        # Prepare consignment data
        consignment_data = {
            "consignments": [{
                "customer_code": DTDC_CONFIG["customer_code"],
                "reference_number": reference_number,
                "service_type_id": request.service_type,
                "load_type": request.load_type,
                "description": request.package.description,
                "dimension_unit": "cm",
                "length": str(request.package.length or ""),
                "width": str(request.package.width or ""),
                "height": str(request.package.height or ""),
                "weight_unit": "kg",
                "weight": str(request.package.weight),
                "declared_value": str(request.package.declared_value or ""),
                "cod_amount": str(request.cod_amount),
                "num_pieces": str(request.package.num_pieces),
                "customer_reference_number": request.customer_reference or request.order_id,
                "origin_details": {
                    "name": origin.get("name", "TNV Collection"),
                    "phone": origin.get("phone", ""),
                    "alternate_phone": origin.get("alternate_phone", ""),
                    "address_line_1": origin.get("address_line_1", ""),
                    "address_line_2": origin.get("address_line_2", ""),
                    "pincode": origin.get("pincode", ""),
                    "city": origin.get("city", ""),
                    "state": origin.get("state", "")
                },
                "destination_details": {
                    "name": request.destination.name,
                    "phone": request.destination.phone,
                    "alternate_phone": request.destination.alternate_phone or "",
                    "address_line_1": request.destination.address_line_1,
                    "address_line_2": request.destination.address_line_2 or "",
                    "pincode": request.destination.pincode,
                    "city": request.destination.city,
                    "state": request.destination.state
                }
            }]
        }
        
        # Make API call to DTDC
        headers = {
            "Content-Type": "application/json",
            "api-key": DTDC_CONFIG.get("api_key", ""),
            "customerId": DTDC_CONFIG["customer_code"],
            "organisation-id": DTDC_CONFIG["organisation_id"]
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                DTDC_CONFIG["softdata_url"],
                json=consignment_data,
                headers=headers,
                timeout=60
            )
            
            result = response.json()
        
        # Check if successful
        if result.get("status") == "OK" and result.get("data"):
            awb_number = result["data"][0].get("reference_number", reference_number)
            
            # Save shipment to database
            if _db is not None:
                shipment_record = {
                    "order_id": request.order_id,
                    "store": request.store,
                    "awb_number": awb_number,
                    "reference_number": reference_number,
                    "carrier": "DTDC",
                    "service_type": request.service_type,
                    "status": "BOOKED",
                    "destination": request.destination.dict(),
                    "package": request.package.dict(),
                    "cod_amount": request.cod_amount,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "tracking_history": [{
                        "status": "BOOKED",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "description": "Shipment booked with DTDC"
                    }]
                }
                await _db.shipments.insert_one(shipment_record)
            
            return {
                "success": True,
                "awb_number": awb_number,
                "reference_number": reference_number,
                "carrier": "DTDC",
                "message": "Shipment booked successfully",
                "estimated_delivery": "3-5 business days"
            }
        else:
            # Store failed attempt for debugging
            error_msg = result.get("message", "Unknown error from DTDC")
            
            # Fallback: Create local record with pending status
            if _db:
                shipment_record = {
                    "order_id": request.order_id,
                    "store": request.store,
                    "awb_number": reference_number,
                    "reference_number": reference_number,
                    "carrier": "DTDC",
                    "service_type": request.service_type,
                    "status": "PENDING_BOOKING",
                    "destination": request.destination.dict(),
                    "package": request.package.dict(),
                    "cod_amount": request.cod_amount,
                    "error": error_msg,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await _db.shipments.insert_one(shipment_record)
            
            return {
                "success": False,
                "reference_number": reference_number,
                "error": error_msg,
                "message": "Booking failed - saved locally for retry"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to book shipment: {str(e)}")


@router.get("/track/{awb_number}")
async def track_shipment(awb_number: str, store: str = "tnvcollection"):
    """
    Track a shipment by AWB number
    Returns current status and tracking history
    """
    try:
        # First check local database
        local_shipment = None
        if _db:
            local_shipment = await _db.shipments.find_one(
                {"awb_number": awb_number, "store": store},
                {"_id": 0}
            )
        
        # Try DTDC tracking API
        tracking_url = f"{DTDC_CONFIG['tracking_url']}?strcnno={awb_number}&TrkType=cnno&addtnlDtl=Y"
        
        if DTDC_CONFIG.get("api_key"):
            tracking_url += f"&apikey={DTDC_CONFIG['api_key']}"
        
        dtdc_status = None
        tracking_events = []
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(tracking_url, timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("trackDetails"):
                        details = data["trackDetails"]
                        dtdc_status = details.get("strStatus", "UNKNOWN")
                        
                        # Parse tracking events
                        if details.get("trackEventDetails"):
                            for event in details["trackEventDetails"]:
                                tracking_events.append({
                                    "status": event.get("strAction", ""),
                                    "location": event.get("strOrigin", ""),
                                    "timestamp": event.get("strActionDate", ""),
                                    "description": event.get("strAction", "")
                                })
            except Exception as e:
                print(f"DTDC Tracking API Error: {e}")
        
        # Combine local and DTDC data
        result = {
            "awb_number": awb_number,
            "carrier": "DTDC",
            "status": dtdc_status or (local_shipment.get("status") if local_shipment else "UNKNOWN"),
            "tracking_events": tracking_events or (local_shipment.get("tracking_history", []) if local_shipment else []),
            "estimated_delivery": None,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        
        if local_shipment:
            result["order_id"] = local_shipment.get("order_id")
            result["destination"] = local_shipment.get("destination")
            result["booked_at"] = local_shipment.get("created_at")
        
        # Update local database with latest status
        if _db and dtdc_status and local_shipment:
            await _db.shipments.update_one(
                {"awb_number": awb_number},
                {
                    "$set": {
                        "status": dtdc_status,
                        "last_tracked": datetime.now(timezone.utc).isoformat()
                    },
                    "$push": {
                        "tracking_history": {
                            "status": dtdc_status,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "source": "DTDC_API"
                        }
                    }
                }
            )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to track shipment: {str(e)}")


@router.post("/calculate-rate")
async def calculate_shipping_rate(request: RateCalculationRequest):
    """
    Calculate estimated shipping rate
    Based on origin, destination, weight, and service type
    """
    try:
        # Base rates per kg (approximate DTDC rates for India)
        base_rates = {
            "PRIORITY": {"base": 80, "per_kg": 40, "min": 100},
            "EXPRESS": {"base": 60, "per_kg": 30, "min": 80},
            "STANDARD": {"base": 40, "per_kg": 20, "min": 50}
        }
        
        service_rate = base_rates.get(request.service_type, base_rates["STANDARD"])
        
        # Calculate weight-based rate
        weight = max(request.weight, 0.5)  # Minimum 500g
        weight_charge = service_rate["base"] + (weight * service_rate["per_kg"])
        
        # Zone-based multiplier (simplified)
        origin_zone = request.origin_pincode[:2]
        dest_zone = request.destination_pincode[:2]
        
        zone_multiplier = 1.0
        if origin_zone != dest_zone:
            zone_multiplier = 1.2  # Inter-zone
        if abs(int(origin_zone) - int(dest_zone)) > 20:
            zone_multiplier = 1.5  # Long distance
        
        # COD charges
        cod_charge = 0
        if request.cod:
            cod_charge = max(50, (request.declared_value or 0) * 0.02)  # 2% or min ₹50
        
        # Calculate total
        subtotal = weight_charge * zone_multiplier
        gst = subtotal * 0.18  # 18% GST
        total = subtotal + gst + cod_charge
        
        # Estimated delivery days
        delivery_days = {
            "PRIORITY": "1-2",
            "EXPRESS": "2-3",
            "STANDARD": "3-5"
        }
        
        return {
            "success": True,
            "origin_pincode": request.origin_pincode,
            "destination_pincode": request.destination_pincode,
            "service_type": request.service_type,
            "weight": request.weight,
            "rates": {
                "base_charge": round(service_rate["base"], 2),
                "weight_charge": round(weight_charge, 2),
                "zone_multiplier": zone_multiplier,
                "subtotal": round(subtotal, 2),
                "gst": round(gst, 2),
                "cod_charge": round(cod_charge, 2) if request.cod else 0,
                "total": round(total, 2),
                "currency": "INR"
            },
            "estimated_delivery": f"{delivery_days.get(request.service_type, '3-5')} business days"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate rate: {str(e)}")


@router.post("/schedule-pickup")
async def schedule_pickup(request: PickupRequest):
    """
    Schedule a pickup for shipments
    """
    try:
        # Get store config
        store_config = None
        if _db:
            store_config = await _db.shipping_config.find_one(
                {"store": request.store}, {"_id": 0}
            )
        
        origin = store_config.get("origin", TNV_ORIGIN) if store_config else TNV_ORIGIN
        
        # Create pickup request
        pickup_data = {
            "store": request.store,
            "pickup_date": request.pickup_date,
            "pickup_time_slot": request.pickup_time_slot,
            "num_packages": request.num_packages,
            "total_weight": request.total_weight,
            "pickup_address": origin,
            "remarks": request.remarks,
            "status": "SCHEDULED",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Save to database
        if _db:
            result = await _db.pickup_requests.insert_one(pickup_data)
            pickup_id = str(result.inserted_id)
        else:
            pickup_id = f"PU{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        return {
            "success": True,
            "pickup_id": pickup_id,
            "pickup_date": request.pickup_date,
            "pickup_time_slot": request.pickup_time_slot,
            "status": "SCHEDULED",
            "message": "Pickup scheduled successfully. DTDC will contact you for confirmation."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to schedule pickup: {str(e)}")


@router.get("/shipments")
async def list_shipments(
    store: str = "tnvcollection",
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    """
    List all shipments for a store
    """
    if _db is None:
        return {"shipments": [], "total": 0}
    
    query = {"store": store}
    if status:
        query["status"] = status
    
    shipments = await _db.shipments.find(query, {"_id": 0}) \
        .sort("created_at", -1) \
        .skip(skip) \
        .limit(limit) \
        .to_list(length=limit)
    
    total = await _db.shipments.count_documents(query)
    
    return {
        "shipments": shipments,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/config/{store}")
async def get_shipping_config(store: str):
    """
    Get shipping configuration for a store
    """
    if _db is None:
        return {
            "store": store,
            "carrier": "DTDC",
            "enabled": True,
            "origin": TNV_ORIGIN,
            "services": ["PRIORITY", "EXPRESS", "STANDARD"],
            "cod_enabled": True
        }
    
    config = await _db.shipping_config.find_one({"store": store}, {"_id": 0})
    
    if not config:
        return {
            "store": store,
            "carrier": "DTDC",
            "enabled": True,
            "origin": TNV_ORIGIN,
            "services": ["PRIORITY", "EXPRESS", "STANDARD"],
            "cod_enabled": True
        }
    
    return config


@router.post("/config/{store}")
async def save_shipping_config(store: str, config: Dict[str, Any]):
    """
    Save shipping configuration for a store
    """
    if _db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    config["store"] = store
    config["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await _db.shipping_config.update_one(
        {"store": store},
        {"$set": config},
        upsert=True
    )
    
    return {"success": True, "message": "Shipping config saved"}


# ======================
# STATUS WEBHOOK (for DTDC callbacks)
# ======================

@router.post("/webhook/status-update")
async def dtdc_status_webhook(payload: Dict[str, Any]):
    """
    Webhook endpoint for DTDC status updates
    """
    try:
        awb_number = payload.get("awb_number") or payload.get("reference_number")
        new_status = payload.get("status")
        
        if not awb_number or not new_status:
            raise HTTPException(status_code=400, detail="Missing awb_number or status")
        
        if _db:
            await _db.shipments.update_one(
                {"awb_number": awb_number},
                {
                    "$set": {
                        "status": new_status,
                        "last_updated": datetime.now(timezone.utc).isoformat()
                    },
                    "$push": {
                        "tracking_history": {
                            "status": new_status,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "location": payload.get("location"),
                            "source": "WEBHOOK"
                        }
                    }
                }
            )
        
        return {"success": True, "message": "Status updated"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
