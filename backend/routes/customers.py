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
    calling_status: Optional[str] = None
    return_reason: Optional[str] = None
    remarks: Optional[str] = None
    retail_amount: Optional[float] = None
    cost: Optional[float] = None
    tcs_charges: Optional[float] = None


@customers_router.get("")
async def get_customers(
    page: int = 1,
    limit: int = 50,
    store_name: str = None,
    delivery_status: str = None,
    payment_status: str = None,
    fulfillment_status: str = None,
    search: str = None,
    year: str = None,
    start_date: str = None,
    end_date: str = None,
    tcs_only: str = None,
    sort_by: str = None
):
    """Get paginated customers with filters - supports Dispatch Tracker requirements"""
    try:
        query = {}
        
        # Basic filters
        if store_name and store_name != "all":
            query["store_name"] = store_name
        if delivery_status and delivery_status != "all":
            query["delivery_status"] = delivery_status
        if payment_status and payment_status != "all":
            query["payment_status"] = payment_status
        if fulfillment_status and fulfillment_status != "all":
            query["fulfillment_status"] = fulfillment_status
            
        # TCS only filter - orders with valid tracking numbers
        if tcs_only == "true":
            query['$and'] = [
                {"tracking_number": {"$exists": True}},
                {"tracking_number": {"$ne": None}},
                {"tracking_number": {"$ne": ""}},
                {"tracking_number": {"$not": {"$regex": "^X", "$options": "i"}}}
            ]
        
        # Year filter
        if year and year != "all":
            try:
                year_int = int(year)
                start_date_val = datetime(year_int, 1, 1)
                end_date_val = datetime(year_int, 12, 31, 23, 59, 59)
                query['last_order_date'] = {
                    "$gte": start_date_val.isoformat(),
                    "$lte": end_date_val.isoformat()
                }
            except ValueError:
                pass
        
        # Date range filter
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                try:
                    end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                    end_dt = end_dt.replace(hour=23, minute=59, second=59)
                    date_filter["$lte"] = end_dt.isoformat()
                except:
                    date_filter["$lte"] = end_date
            if date_filter:
                query['last_order_date'] = date_filter
        
        # Search across multiple fields
        if search:
            search_regex = {"$regex": search, "$options": "i"}
            query["$or"] = [
                {"first_name": search_regex},
                {"last_name": search_regex},
                {"email": search_regex},
                {"phone": search_regex},
                {"order_number": search_regex},
                {"tracking_number": search_regex}
            ]
        
        skip = (page - 1) * limit
        total = await db.customers.count_documents(query)
        
        # Sorting
        sort_field = "last_order_date"
        sort_order = -1  # Default descending (newest first)
        
        if sort_by:
            if sort_by == "order_asc":
                sort_field = "order_number"
                sort_order = 1
            elif sort_by == "order_desc":
                sort_field = "order_number"
                sort_order = -1
            elif sort_by == "date_asc":
                sort_field = "last_order_date"
                sort_order = 1
            elif sort_by == "date_desc":
                sort_field = "last_order_date"
                sort_order = -1
            elif sort_by == "amount_desc":
                sort_field = "total_spent"
                sort_order = -1
        
        customers = await db.customers.find(query, {"_id": 0}).sort(sort_field, sort_order).skip(skip).limit(limit).to_list(limit)
        
        return {"customers": customers, "total": total, "page": page, "pages": (total + limit - 1) // limit}
    except Exception as e:
        logger.error(f"Error getting customers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@customers_router.get("/stats")
async def get_customer_stats(
    store_name: str = None,
    delivery_status: str = None,
    payment_status: str = None,
    fulfillment_status: str = None,
    search: str = None,
    year: str = None,
    start_date: str = None,
    end_date: str = None,
    tcs_only: str = None
):
    """Get customer statistics with filters - supports Dispatch Tracker stats cards"""
    try:
        query = {}
        
        # Basic filters
        if store_name and store_name != "all":
            query["store_name"] = store_name
        if delivery_status and delivery_status != "all":
            query["delivery_status"] = delivery_status
        if payment_status and payment_status != "all":
            query["payment_status"] = payment_status
        if fulfillment_status and fulfillment_status != "all":
            query["fulfillment_status"] = fulfillment_status
            
        # TCS only filter
        if tcs_only == "true":
            query['$and'] = [
                {"tracking_number": {"$exists": True}},
                {"tracking_number": {"$ne": None}},
                {"tracking_number": {"$ne": ""}},
                {"tracking_number": {"$not": {"$regex": "^X", "$options": "i"}}}
            ]
        
        # Year filter
        if year and year != "all":
            try:
                year_int = int(year)
                start_date_val = datetime(year_int, 1, 1)
                end_date_val = datetime(year_int, 12, 31, 23, 59, 59)
                query['last_order_date'] = {
                    "$gte": start_date_val.isoformat(),
                    "$lte": end_date_val.isoformat()
                }
            except ValueError:
                pass
        
        # Date range filter
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                try:
                    end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                    end_dt = end_dt.replace(hour=23, minute=59, second=59)
                    date_filter["$lte"] = end_dt.isoformat()
                except:
                    date_filter["$lte"] = end_date
            if date_filter:
                query['last_order_date'] = date_filter
        
        # Search filter
        if search:
            search_regex = {"$regex": search, "$options": "i"}
            query["$or"] = [
                {"first_name": search_regex},
                {"last_name": search_regex},
                {"email": search_regex},
                {"phone": search_regex},
                {"order_number": search_regex},
                {"tracking_number": search_regex}
            ]
        
        # Use aggregation pipeline for efficient stats calculation
        pipeline = [
            {"$match": query},
            {"$facet": {
                "total": [{"$count": "count"}],
                "delivered": [
                    {"$match": {"delivery_status": "DELIVERED"}},
                    {"$count": "count"}
                ],
                "inTransit": [
                    {"$match": {"delivery_status": {"$in": ["IN_TRANSIT", "IN TRANSIT", "OUT_FOR_DELIVERY"]}}},
                    {"$count": "count"}
                ],
                "pending": [
                    {"$match": {
                        "$or": [
                            {"delivery_status": {"$exists": False}},
                            {"delivery_status": None},
                            {"delivery_status": {"$in": ["PENDING", "UNKNOWN", "NOT_DISPATCHED", ""]}}
                        ]
                    }},
                    {"$count": "count"}
                ],
                "returned": [
                    {"$match": {"delivery_status": {"$in": ["RETURNED", "RETURN_IN_PROCESS"]}}},
                    {"$count": "count"}
                ],
                "paymentReceived": [
                    {"$match": {
                        "$or": [
                            {"cod_payment_status": "RECEIVED"},
                            {"payment_status": "paid"}
                        ]
                    }},
                    {"$count": "count"}
                ],
                "paymentPending": [
                    {"$match": {
                        "$or": [
                            {"cod_payment_status": "PENDING"},
                            {"payment_status": "pending"},
                            {"cod_payment_status": {"$exists": False}},
                            {"cod_payment_status": None}
                        ]
                    }},
                    {"$count": "count"}
                ]
            }}
        ]
        
        result = await db.customers.aggregate(pipeline).to_list(1)
        
        if not result:
            return {
                "total": 0,
                "delivered": 0,
                "inTransit": 0,
                "pending": 0,
                "returned": 0,
                "paymentReceived": 0,
                "paymentPending": 0
            }
        
        stats = result[0]
        
        return {
            "total": stats["total"][0]["count"] if stats["total"] else 0,
            "delivered": stats["delivered"][0]["count"] if stats["delivered"] else 0,
            "inTransit": stats["inTransit"][0]["count"] if stats["inTransit"] else 0,
            "pending": stats["pending"][0]["count"] if stats["pending"] else 0,
            "returned": stats["returned"][0]["count"] if stats["returned"] else 0,
            "paymentReceived": stats["paymentReceived"][0]["count"] if stats["paymentReceived"] else 0,
            "paymentPending": stats["paymentPending"][0]["count"] if stats["paymentPending"] else 0
        }
    except Exception as e:
        logger.error(f"Error getting customer stats: {str(e)}")
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
async def get_customer_segments(store_name: str = None):
    """Get customer segments with counts and total values - supports frontend dashboard"""
    try:
        # Base query filter for store
        base_query = {"store_name": store_name} if store_name and store_name != "all" else {}
        
        # Define segment thresholds
        segments = {
            "vip": {"query": {"total_spent": {"$gte": 10000}}, "description": "Rs. 10K+ spent"},
            "high_value": {"query": {"total_spent": {"$gte": 5000, "$lt": 10000}}, "description": "Rs. 5-10K spent"},
            "medium_value": {"query": {"total_spent": {"$gte": 2000, "$lt": 5000}}, "description": "Rs. 2-5K spent"},
            "low_value": {"query": {"total_spent": {"$lt": 2000}}, "description": "Under Rs. 2K spent"},
            "dormant": {"description": "90+ days inactive"}
        }
        
        result = {}
        
        # Calculate counts and values for each segment
        for seg_id, seg_config in segments.items():
            query = {**base_query}
            
            if seg_id == "dormant":
                # 90 days ago
                from datetime import datetime, timezone, timedelta
                cutoff_date = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
                query["last_order_date"] = {"$lt": cutoff_date}
            else:
                query.update(seg_config.get("query", {}))
            
            # Get count
            count = await db.customers.count_documents(query)
            
            # Get total value
            pipeline = [
                {"$match": query},
                {"$group": {"_id": None, "total": {"$sum": "$total_spent"}}}
            ]
            total_result = await db.customers.aggregate(pipeline).to_list(1)
            total_value = total_result[0]["total"] if total_result else 0
            
            # Get top customers for this segment
            top_customers = await db.customers.find(
                query, 
                {"_id": 0, "customer_id": 1, "first_name": 1, "last_name": 1, "email": 1, "phone": 1, "total_spent": 1, "country_code": 1}
            ).sort("total_spent", -1).limit(10).to_list(10)
            
            result[seg_id] = {
                "count": count,
                "total_value": total_value,
                "description": seg_config.get("description", ""),
                "top_customers": top_customers
            }
        
        return result
    except Exception as e:
        logger.error(f"Error getting segments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@customers_router.get("/segment/{segment_type}")
async def get_customers_by_segment(segment_type: str, page: int = 1, limit: int = 50):
    """Get customers in a specific segment"""
    try:
        query = {}
        if segment_type == "high_value":
            query = {"total_spent": {"$gte": 5000}}
        elif segment_type == "repeat":
            query = {"total_orders": {"$gte": 2}}
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
