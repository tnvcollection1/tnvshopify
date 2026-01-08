"""
Order Notifications API Routes
Endpoints to manually trigger and manage order notifications
"""

from fastapi import APIRouter, HTTPException, Body, Query
from pydantic import BaseModel, Field
from typing import Optional, List
import logging

from services.auto_order_notifications import (
    send_order_confirmed_notification,
    send_order_shipped_notification,
    send_out_for_delivery_notification,
    send_order_delivered_notification,
    send_payment_reminder_notification,
    process_order_event,
    handle_shopify_order_webhook,
    set_database,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/order-notifications", tags=["Order Notifications"])

# Database reference
_db = None

def set_db(database):
    global _db
    _db = database
    set_database(database)


# ==================== Request Models ====================

class OrderConfirmedRequest(BaseModel):
    phone: str
    store_name: str
    order_id: str
    order_number: str
    total_amount: str
    currency: str = "INR"
    customer_name: Optional[str] = None
    items_count: Optional[int] = None


class OrderShippedRequest(BaseModel):
    phone: str
    store_name: str
    order_id: str
    order_number: str
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    courier_name: Optional[str] = None
    estimated_delivery: Optional[str] = None
    customer_name: Optional[str] = None


class OutForDeliveryRequest(BaseModel):
    phone: str
    store_name: str
    order_id: str
    order_number: str
    customer_name: Optional[str] = None
    delivery_agent: Optional[str] = None
    delivery_agent_phone: Optional[str] = None


class OrderDeliveredRequest(BaseModel):
    phone: str
    store_name: str
    order_id: str
    order_number: str
    customer_name: Optional[str] = None
    review_url: Optional[str] = None


class PaymentReminderRequest(BaseModel):
    phone: str
    store_name: str
    order_id: str
    order_number: str
    amount_due: str
    currency: str = "INR"
    customer_name: Optional[str] = None
    due_date: Optional[str] = None


class BulkNotifyRequest(BaseModel):
    store_name: str
    order_ids: List[str]
    notification_type: str  # 'confirmed', 'shipped', 'delivered'


# ==================== API Endpoints ====================

@router.post("/order-confirmed")
async def notify_order_confirmed(request: OrderConfirmedRequest):
    """
    Send order confirmation notification to customer.
    """
    try:
        result = await send_order_confirmed_notification(
            phone=request.phone,
            store_name=request.store_name,
            order_id=request.order_id,
            order_number=request.order_number,
            total_amount=request.total_amount,
            currency=request.currency,
            customer_name=request.customer_name,
            items_count=request.items_count,
        )
        
        if result.get("reason") == "notification_not_allowed":
            return {
                "success": False,
                "message": "Customer has not opted in for order confirmations",
            }
        
        return result
        
    except Exception as e:
        logger.error(f"Order confirmed notification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/order-shipped")
async def notify_order_shipped(request: OrderShippedRequest):
    """
    Send shipping notification with tracking details.
    """
    try:
        result = await send_order_shipped_notification(
            phone=request.phone,
            store_name=request.store_name,
            order_id=request.order_id,
            order_number=request.order_number,
            tracking_number=request.tracking_number,
            tracking_url=request.tracking_url,
            courier_name=request.courier_name,
            estimated_delivery=request.estimated_delivery,
            customer_name=request.customer_name,
        )
        
        if result.get("reason") == "notification_not_allowed":
            return {
                "success": False,
                "message": "Customer has not opted in for shipping notifications",
            }
        
        return result
        
    except Exception as e:
        logger.error(f"Order shipped notification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/out-for-delivery")
async def notify_out_for_delivery(request: OutForDeliveryRequest):
    """
    Send out for delivery notification.
    """
    try:
        result = await send_out_for_delivery_notification(
            phone=request.phone,
            store_name=request.store_name,
            order_id=request.order_id,
            order_number=request.order_number,
            customer_name=request.customer_name,
            delivery_agent=request.delivery_agent,
            delivery_agent_phone=request.delivery_agent_phone,
        )
        
        if result.get("reason") == "notification_not_allowed":
            return {
                "success": False,
                "message": "Customer has not opted in for delivery notifications",
            }
        
        return result
        
    except Exception as e:
        logger.error(f"Out for delivery notification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/order-delivered")
async def notify_order_delivered(request: OrderDeliveredRequest):
    """
    Send delivery confirmation notification.
    """
    try:
        result = await send_order_delivered_notification(
            phone=request.phone,
            store_name=request.store_name,
            order_id=request.order_id,
            order_number=request.order_number,
            customer_name=request.customer_name,
            review_url=request.review_url,
        )
        
        if result.get("reason") == "notification_not_allowed":
            return {
                "success": False,
                "message": "Customer has not opted in for delivery notifications",
            }
        
        return result
        
    except Exception as e:
        logger.error(f"Order delivered notification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payment-reminder")
async def notify_payment_reminder(request: PaymentReminderRequest):
    """
    Send payment reminder for COD orders.
    """
    try:
        result = await send_payment_reminder_notification(
            phone=request.phone,
            store_name=request.store_name,
            order_id=request.order_id,
            order_number=request.order_number,
            amount_due=request.amount_due,
            currency=request.currency,
            customer_name=request.customer_name,
            due_date=request.due_date,
        )
        
        if result.get("reason") == "notification_not_allowed":
            return {
                "success": False,
                "message": "Customer has not opted in for payment reminders",
            }
        
        return result
        
    except Exception as e:
        logger.error(f"Payment reminder notification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-by-order")
async def send_notification_for_order(
    order_id: str = Body(..., description="Order ID"),
    store_name: str = Body(..., description="Store name"),
    notification_type: str = Body(..., description="Type: confirmed, shipped, out_for_delivery, delivered"),
):
    """
    Send notification for an order by fetching order details from database.
    """
    try:
        # Fetch order from database
        order = await _db.orders.find_one({
            "$or": [
                {"order_id": order_id},
                {"shopify_order_id": order_id},
                {"name": f"#{order_id}"},
                {"order_number": int(order_id) if order_id.isdigit() else order_id},
            ],
            "store_name": store_name
        })
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        result = await process_order_event(notification_type, order, store_name)
        
        return {
            "success": result.get("success", False),
            "order_id": order_id,
            "notification_type": notification_type,
            "message_id": result.get("message_id"),
            "error": result.get("error") or result.get("reason"),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send notification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk-send")
async def bulk_send_notifications(request: BulkNotifyRequest):
    """
    Send notifications for multiple orders.
    """
    try:
        results = {
            "success": 0,
            "failed": 0,
            "skipped": 0,
            "details": []
        }
        
        for order_id in request.order_ids[:50]:  # Limit to 50
            order = await _db.orders.find_one({
                "$or": [
                    {"order_id": order_id},
                    {"shopify_order_id": order_id},
                ],
                "store_name": request.store_name
            })
            
            if not order:
                results["failed"] += 1
                results["details"].append({"order_id": order_id, "status": "not_found"})
                continue
            
            result = await process_order_event(
                request.notification_type,
                order,
                request.store_name
            )
            
            if result.get("success"):
                results["success"] += 1
                results["details"].append({"order_id": order_id, "status": "sent"})
            elif result.get("reason") == "notification_not_allowed":
                results["skipped"] += 1
                results["details"].append({"order_id": order_id, "status": "not_opted_in"})
            else:
                results["failed"] += 1
                results["details"].append({
                    "order_id": order_id,
                    "status": "failed",
                    "error": result.get("error")
                })
        
        return results
        
    except Exception as e:
        logger.error(f"Bulk send error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs")
async def get_notification_logs(
    store_name: str = Query(...),
    phone: Optional[str] = Query(None),
    notification_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
):
    """
    Get notification logs for a store.
    """
    try:
        query = {"store_name": store_name}
        
        if phone:
            from services.auto_order_notifications import normalize_phone
            query["phone"] = normalize_phone(phone)
        
        if notification_type:
            query["notification_type"] = notification_type
        
        cursor = _db.notification_logs.find(
            query,
            {"_id": 0}
        ).sort("sent_at", -1).limit(limit)
        
        logs = await cursor.to_list(length=limit)
        
        return {
            "success": True,
            "count": len(logs),
            "logs": logs,
        }
        
    except Exception as e:
        logger.error(f"Get logs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_notification_stats(
    store_name: str = Query(...),
    days: int = Query(7, le=90),
):
    """
    Get notification statistics for a store.
    """
    try:
        from datetime import datetime, timezone, timedelta
        
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        pipeline = [
            {
                "$match": {
                    "store_name": store_name,
                    "sent_at": {"$gte": start_date.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": {
                        "type": "$notification_type",
                        "success": "$success"
                    },
                    "count": {"$sum": 1}
                }
            }
        ]
        
        cursor = _db.notification_logs.aggregate(pipeline)
        results = await cursor.to_list(length=100)
        
        # Format results
        stats = {}
        for r in results:
            ntype = r["_id"]["type"]
            success = r["_id"]["success"]
            
            if ntype not in stats:
                stats[ntype] = {"sent": 0, "failed": 0}
            
            if success:
                stats[ntype]["sent"] = r["count"]
            else:
                stats[ntype]["failed"] = r["count"]
        
        # Calculate totals
        total_sent = sum(s["sent"] for s in stats.values())
        total_failed = sum(s["failed"] for s in stats.values())
        
        return {
            "success": True,
            "store_name": store_name,
            "period_days": days,
            "totals": {
                "sent": total_sent,
                "failed": total_failed,
                "total": total_sent + total_failed,
                "success_rate": round(total_sent / (total_sent + total_failed) * 100, 1) if (total_sent + total_failed) > 0 else 0,
            },
            "by_type": stats,
        }
        
    except Exception as e:
        logger.error(f"Get stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
