"""Customer Management Routes
Handles customer CRUD, segments, bulk messaging, and stock sync
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Will be injected from server.py
db = None
whatsapp_service = None

def set_dependencies(database, wa_service=None):
    """Set dependencies from server.py"""
    global db, whatsapp_service
    db = database
    whatsapp_service = wa_service

customers_router = APIRouter(prefix="/customers", tags=["Customer Management"])


class CustomerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    delivery_status: Optional[str] = None
    tracking_number: Optional[str] = None
    notes: Optional[str] = None


@customers_router.get("")
async def get_customers(
    page: int = 1,
    limit: int = 50,
    store_name: str = None,
    delivery_status: str = None,
    search: str = None
):
    """Get paginated customers with filters"""
    try:
        query = {}
        if store_name:
            query["store_name"] = store_name
        if delivery_status:
            query["delivery_status"] = delivery_status
        if search:
            query["$or"] = [
                {"first_name": {"$regex": search, "$options": "i"}},
                {"last_name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}},
                {"order_number": {"$regex": search, "$options": "i"}}
            ]
        
        skip = (page - 1) * limit
        total = await db.customers.count_documents(query)
        customers = await db.customers.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        return {"customers": customers, "total": total, "page": page, "pages": (total + limit - 1) // limit}
    except Exception as e:
        logger.error(f"Error getting customers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@customers_router.put("/{customer_id}")
async def update_customer(customer_id: str, update: CustomerUpdate):
    """Update customer information"""
    try:
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.customers.update_one({"customer_id": customer_id}, {"$set": update_data})
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return {"success": True, "modified": result.modified_count}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating customer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@customers_router.get("/count")
async def get_customer_count(store_name: str = None):
    """Get total customer count"""
    try:
        query = {"store_name": store_name} if store_name else {}
        count = await db.customers.count_documents(query)
        return {"count": count, "store_name": store_name}
    except Exception as e:
        logger.error(f"Error counting customers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@customers_router.get("/stats")
async def get_customer_stats():
    """Get customer statistics by store and status"""
    try:
        pipeline = [
            {"$group": {"_id": {"store": "$store_name", "status": "$delivery_status"}, "count": {"$sum": 1}}},
            {"$sort": {"_id.store": 1, "count": -1}}
        ]
        results = await db.customers.aggregate(pipeline).to_list(100)
        
        stats = {}
        for r in results:
            store = r["_id"]["store"] or "unknown"
            status = r["_id"]["status"] or "unknown"
            if store not in stats:
                stats[store] = {}
            stats[store][status] = r["count"]
        
        return {"success": True, "stats": stats}
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@customers_router.post("/sync-stock-status")
async def sync_stock_status(store_name: str = None):
    """Sync stock status for customers based on inventory"""
    try:
        query = {"store_name": store_name} if store_name else {}
        customers = await db.customers.find(query, {"_id": 0, "customer_id": 1, "line_items": 1}).to_list(10000)
        
        updated = 0
        for customer in customers:
            # Check stock for line items
            in_stock = True
            for item in customer.get("line_items", []):
                sku = item.get("sku")
                if sku:
                    inv = await db.inventory.find_one({"sku": sku}, {"quantity": 1})
                    if not inv or inv.get("quantity", 0) < item.get("quantity", 1):
                        in_stock = False
                        break
            
            result = await db.customers.update_one(
                {"customer_id": customer["customer_id"]},
                {"$set": {"stock_status": "IN_STOCK" if in_stock else "OUT_OF_STOCK"}}
            )
            if result.modified_count > 0:
                updated += 1
        
        return {"success": True, "updated": updated, "total": len(customers)}
    except Exception as e:
        logger.error(f"Error syncing stock status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@customers_router.post("/{customer_id}/send-whatsapp")
async def send_whatsapp_to_customer(customer_id: str, message: str):
    """Send WhatsApp message to a customer"""
    try:
        customer = await db.customers.find_one({"customer_id": customer_id}, {"_id": 0})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        phone = customer.get("phone")
        if not phone:
            raise HTTPException(status_code=400, detail="Customer has no phone number")
        
        # Return WhatsApp URL for now (actual sending requires Meta Business API)
        clean_phone = ''.join(filter(str.isdigit, phone))
        wa_url = f"https://wa.me/{clean_phone}?text={message}"
        
        await db.customers.update_one(
            {"customer_id": customer_id},
            {"$set": {"last_contacted": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"success": True, "whatsapp_url": wa_url, "phone": clean_phone}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending WhatsApp: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@customers_router.post("/bulk-whatsapp")
async def bulk_whatsapp(customer_ids: List[str], message: str):
    """Generate bulk WhatsApp URLs"""
    try:
        results = []
        for cid in customer_ids[:50]:  # Limit to 50
            customer = await db.customers.find_one({"customer_id": cid}, {"_id": 0, "phone": 1, "first_name": 1})
            if customer and customer.get("phone"):
                clean_phone = ''.join(filter(str.isdigit, customer["phone"]))
                results.append({"customer_id": cid, "phone": clean_phone, "url": f"https://wa.me/{clean_phone}?text={message}"})
        
        return {"success": True, "results": results, "count": len(results)}
    except Exception as e:
        logger.error(f"Error in bulk WhatsApp: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@customers_router.get("/segments")
async def get_customer_segments():
    """Get available customer segments"""
    try:
        segments = [
            {"id": "high_value", "name": "High Value", "description": "Orders > 5000"},
            {"id": "repeat", "name": "Repeat Customers", "description": "Multiple orders"},
            {"id": "delivered", "name": "Delivered", "description": "Completed deliveries"},
            {"id": "pending", "name": "Pending", "description": "Awaiting delivery"},
            {"id": "cod_pending", "name": "COD Pending", "description": "COD not received"}
        ]
        
        # Get counts for each segment
        for seg in segments:
            if seg["id"] == "high_value":
                seg["count"] = await db.customers.count_documents({"total_price": {"$gte": 5000}})
            elif seg["id"] == "delivered":
                seg["count"] = await db.customers.count_documents({"delivery_status": "DELIVERED"})
            elif seg["id"] == "pending":
                seg["count"] = await db.customers.count_documents({"delivery_status": {"$in": ["PENDING", "IN_TRANSIT"]}})
            elif seg["id"] == "cod_pending":
                seg["count"] = await db.customers.count_documents({"delivery_status": "DELIVERED", "cod_payment_status": {"$ne": "RECEIVED"}})
            else:
                seg["count"] = 0
        
        return {"success": True, "segments": segments}
    except Exception as e:
        logger.error(f"Error getting segments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@customers_router.get("/segment/{segment_type}")
async def get_customers_by_segment(segment_type: str, page: int = 1, limit: int = 50):
    """Get customers in a specific segment"""
    try:
        query = {}
        if segment_type == "high_value":
            query = {"total_price": {"$gte": 5000}}
        elif segment_type == "delivered":
            query = {"delivery_status": "DELIVERED"}
        elif segment_type == "pending":
            query = {"delivery_status": {"$in": ["PENDING", "IN_TRANSIT"]}}
        elif segment_type == "cod_pending":
            query = {"delivery_status": "DELIVERED", "cod_payment_status": {"$ne": "RECEIVED"}}
        
        skip = (page - 1) * limit
        total = await db.customers.count_documents(query)
        customers = await db.customers.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
        
        return {"success": True, "customers": customers, "total": total, "segment": segment_type}
    except Exception as e:
        logger.error(f"Error getting segment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@customers_router.get("/stock-stats")
async def get_stock_stats():
    """Get stock status statistics"""
    try:
        pipeline = [
            {"$group": {"_id": "$stock_status", "count": {"$sum": 1}}}
        ]
        results = await db.customers.aggregate(pipeline).to_list(10)
        stats = {r["_id"] or "UNKNOWN": r["count"] for r in results}
        return {"success": True, "stats": stats}
    except Exception as e:
        logger.error(f"Error getting stock stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@customers_router.post("/{customer_id}/mark-messaged")
async def mark_customer_messaged(customer_id: str, channel: str = "whatsapp"):
    """Mark customer as messaged"""
    try:
        result = await db.customers.update_one(
            {"customer_id": customer_id},
            {"$set": {f"last_{channel}_at": datetime.now(timezone.utc).isoformat(), "messaged": True}}
        )
        return {"success": True, "modified": result.modified_count}
    except Exception as e:
        logger.error(f"Error marking messaged: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@customers_router.post("/{customer_id}/update-conversion")
async def update_conversion_status(customer_id: str, converted: bool, notes: str = None):
    """Update customer conversion status"""
    try:
        update = {"converted": converted, "conversion_updated_at": datetime.now(timezone.utc).isoformat()}
        if notes:
            update["conversion_notes"] = notes
        
        result = await db.customers.update_one({"customer_id": customer_id}, {"$set": update})
        return {"success": True, "modified": result.modified_count}
    except Exception as e:
        logger.error(f"Error updating conversion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
