"""
E-Commerce Core Features API
- Order Management & Tracking
- Wishlist System
- Product Reviews & Ratings
- Stock Management & Notifications
- Customer Account Management
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
import re

router = APIRouter(prefix="/api/ecommerce", tags=["E-Commerce"])

_db: AsyncIOMotorDatabase = None

def set_database(db: AsyncIOMotorDatabase):
    global _db
    _db = db

# ======================
# PYDANTIC MODELS
# ======================

# Order Tracking Models
class OrderStatusUpdate(BaseModel):
    status: str  # pending, confirmed, processing, shipped, out_for_delivery, delivered, cancelled, returned
    message: Optional[str] = None
    location: Optional[str] = None
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None

class TrackingEvent(BaseModel):
    status: str
    message: str
    location: Optional[str] = None
    timestamp: str
    is_current: bool = False

# Wishlist Models
class WishlistItem(BaseModel):
    product_id: str
    title: str
    image: Optional[str] = None
    price: float
    compare_price: Optional[float] = None
    variant_id: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None

# Review Models
class ReviewCreate(BaseModel):
    product_id: str
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = None
    content: str
    images: List[str] = []
    pros: List[str] = []
    cons: List[str] = []

class ReviewResponse(BaseModel):
    helpful: bool

# Address Models
class Address(BaseModel):
    id: Optional[str] = None
    label: str = "Home"  # Home, Office, Other
    full_name: str
    phone: str
    email: Optional[str] = None
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str
    is_default: bool = False

# Stock Notification Models
class StockNotificationRequest(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    email: str
    phone: Optional[str] = None

# Customer Account Models
class CustomerProfile(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    avatar: Optional[str] = None

# ======================
# ORDER TRACKING ENDPOINTS
# ======================

ORDER_STATUSES = {
    "pending": {"label": "Order Placed", "icon": "📦", "color": "#6b7280"},
    "confirmed": {"label": "Confirmed", "icon": "✓", "color": "#10b981"},
    "processing": {"label": "Processing", "icon": "⚙️", "color": "#3b82f6"},
    "shipped": {"label": "Shipped", "icon": "🚚", "color": "#8b5cf6"},
    "out_for_delivery": {"label": "Out for Delivery", "icon": "🏃", "color": "#f59e0b"},
    "delivered": {"label": "Delivered", "icon": "✅", "color": "#22c55e"},
    "cancelled": {"label": "Cancelled", "icon": "❌", "color": "#ef4444"},
    "returned": {"label": "Returned", "icon": "↩️", "color": "#6b7280"}
}

@router.get("/orders/track/{order_id}")
async def track_order(order_id: str):
    """Get detailed order tracking information"""
    order = await _db.orders.find_one({"order_id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get tracking history
    tracking_history = order.get("tracking_history", [])
    
    # If no tracking history, create from order status
    if not tracking_history:
        tracking_history = [{
            "status": "pending",
            "message": "Order placed successfully",
            "timestamp": order.get("created_at"),
            "is_current": order.get("order_status") == "pending"
        }]
        
        if order.get("order_status") in ["confirmed", "processing", "shipped", "out_for_delivery", "delivered"]:
            tracking_history.append({
                "status": "confirmed",
                "message": "Order confirmed and payment received",
                "timestamp": order.get("paid_at") or order.get("created_at"),
                "is_current": order.get("order_status") == "confirmed"
            })
    
    # Build timeline with status info
    timeline = []
    for event in tracking_history:
        status_info = ORDER_STATUSES.get(event["status"], {})
        timeline.append({
            **event,
            "label": status_info.get("label", event["status"].title()),
            "icon": status_info.get("icon", "📦"),
            "color": status_info.get("color", "#6b7280")
        })
    
    current_status = ORDER_STATUSES.get(order.get("order_status", "pending"), {})
    
    # Calculate estimated delivery
    created_at = datetime.fromisoformat(order.get("created_at").replace("Z", "+00:00")) if order.get("created_at") else datetime.now(timezone.utc)
    estimated_delivery = created_at + timedelta(days=5)
    
    return {
        "order_id": order_id,
        "current_status": order.get("order_status", "pending"),
        "current_status_label": current_status.get("label", "Pending"),
        "current_status_icon": current_status.get("icon", "📦"),
        "current_status_color": current_status.get("color", "#6b7280"),
        "tracking_number": order.get("tracking_number"),
        "carrier": order.get("carrier"),
        "carrier_tracking_url": order.get("carrier_tracking_url"),
        "estimated_delivery": estimated_delivery.strftime("%B %d, %Y"),
        "shipping_address": order.get("shipping_address"),
        "items": order.get("items", []),
        "subtotal": order.get("subtotal"),
        "shipping": order.get("shipping"),
        "discount": order.get("discount", 0),
        "total": order.get("total"),
        "currency": order.get("currency", "INR"),
        "payment_method": order.get("payment_method"),
        "payment_status": order.get("payment_status"),
        "timeline": timeline,
        "created_at": order.get("created_at"),
        "updated_at": order.get("updated_at")
    }


@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, update: OrderStatusUpdate):
    """Update order status (Admin)"""
    order = await _db.orders.find_one({"order_id": order_id})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Create tracking event
    tracking_event = {
        "status": update.status,
        "message": update.message or ORDER_STATUSES.get(update.status, {}).get("label", update.status),
        "location": update.location,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Update order
    update_data = {
        "order_status": update.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if update.tracking_number:
        update_data["tracking_number"] = update.tracking_number
    if update.carrier:
        update_data["carrier"] = update.carrier
    
    # Add to tracking history
    await _db.orders.update_one(
        {"order_id": order_id},
        {
            "$set": update_data,
            "$push": {"tracking_history": tracking_event}
        }
    )
    
    # TODO: Send email/SMS notification
    
    return {"success": True, "message": f"Order status updated to {update.status}"}


@router.get("/orders/history")
async def get_order_history(
    customer_id: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    session_id: Optional[str] = None,
    store: str = Query("tnvcollection"),
    page: int = 1,
    limit: int = 10
):
    """Get customer's order history"""
    query = {"store": store}
    
    if customer_id:
        query["customer_id"] = customer_id
    elif email:
        query["shipping_address.email"] = email
    elif phone:
        query["shipping_address.phone"] = phone
    elif session_id:
        query["session_id"] = session_id
    else:
        raise HTTPException(status_code=400, detail="Provide customer_id, email, phone, or session_id")
    
    skip = (page - 1) * limit
    
    orders = await _db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await _db.orders.count_documents(query)
    
    # Add status info to each order
    for order in orders:
        status_info = ORDER_STATUSES.get(order.get("order_status", "pending"), {})
        order["status_label"] = status_info.get("label", "Pending")
        order["status_icon"] = status_info.get("icon", "📦")
        order["status_color"] = status_info.get("color", "#6b7280")
    
    return {
        "orders": orders,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


# ======================
# WISHLIST ENDPOINTS
# ======================

@router.get("/wishlist/{customer_id}")
async def get_wishlist(customer_id: str, store: str = Query("tnvcollection")):
    """Get customer's wishlist"""
    wishlist = await _db.wishlists.find_one(
        {"customer_id": customer_id, "store": store},
        {"_id": 0}
    )
    
    if not wishlist:
        return {"items": [], "count": 0}
    
    return {
        "items": wishlist.get("items", []),
        "count": len(wishlist.get("items", [])),
        "updated_at": wishlist.get("updated_at")
    }


@router.post("/wishlist/{customer_id}/add")
async def add_to_wishlist(customer_id: str, item: WishlistItem, store: str = Query("tnvcollection")):
    """Add item to wishlist"""
    item_dict = item.dict()
    item_dict["added_at"] = datetime.now(timezone.utc).isoformat()
    
    # Check if already exists
    existing = await _db.wishlists.find_one({
        "customer_id": customer_id,
        "store": store,
        "items.product_id": item.product_id
    })
    
    if existing:
        return {"success": True, "message": "Item already in wishlist"}
    
    await _db.wishlists.update_one(
        {"customer_id": customer_id, "store": store},
        {
            "$push": {"items": item_dict},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
            "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    return {"success": True, "message": "Added to wishlist"}


@router.delete("/wishlist/{customer_id}/remove/{product_id}")
async def remove_from_wishlist(customer_id: str, product_id: str, store: str = Query("tnvcollection")):
    """Remove item from wishlist"""
    await _db.wishlists.update_one(
        {"customer_id": customer_id, "store": store},
        {
            "$pull": {"items": {"product_id": product_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"success": True, "message": "Removed from wishlist"}


@router.post("/wishlist/{customer_id}/move-to-cart")
async def move_to_cart(customer_id: str, product_id: str, session_id: str, store: str = Query("tnvcollection")):
    """Move item from wishlist to cart"""
    # Get wishlist item
    wishlist = await _db.wishlists.find_one(
        {"customer_id": customer_id, "store": store},
        {"_id": 0}
    )
    
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    
    item = next((i for i in wishlist.get("items", []) if i["product_id"] == product_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found in wishlist")
    
    # Add to cart
    cart_item = {
        "product_id": item["product_id"],
        "name": item["title"],
        "price": item["price"],
        "quantity": 1,
        "image": item.get("image"),
        "size": item.get("size"),
        "color": item.get("color")
    }
    
    cart = await _db.carts.find_one({"session_id": session_id})
    if cart:
        # Check if already in cart
        existing = next((i for i in cart.get("items", []) if i["product_id"] == product_id), None)
        if existing:
            await _db.carts.update_one(
                {"session_id": session_id, "items.product_id": product_id},
                {"$inc": {"items.$.quantity": 1}}
            )
        else:
            await _db.carts.update_one(
                {"session_id": session_id},
                {"$push": {"items": cart_item}}
            )
    else:
        await _db.carts.insert_one({
            "session_id": session_id,
            "items": [cart_item],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Remove from wishlist
    await _db.wishlists.update_one(
        {"customer_id": customer_id, "store": store},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    
    return {"success": True, "message": "Moved to cart"}


@router.get("/wishlist/{customer_id}/share")
async def get_shareable_wishlist(customer_id: str, store: str = Query("tnvcollection")):
    """Generate shareable wishlist link"""
    wishlist = await _db.wishlists.find_one(
        {"customer_id": customer_id, "store": store}
    )
    
    if not wishlist or not wishlist.get("items"):
        raise HTTPException(status_code=404, detail="Wishlist is empty")
    
    # Generate or get share token
    share_token = wishlist.get("share_token")
    if not share_token:
        share_token = f"wl_{uuid.uuid4().hex[:12]}"
        await _db.wishlists.update_one(
            {"customer_id": customer_id, "store": store},
            {"$set": {"share_token": share_token}}
        )
    
    base_url = "/tnv-pk" if store == "tnvcollectionpk" else "/tnv"
    
    return {
        "share_token": share_token,
        "share_url": f"{base_url}/wishlist/shared/{share_token}",
        "items_count": len(wishlist.get("items", []))
    }


@router.get("/wishlist/shared/{share_token}")
async def get_shared_wishlist(share_token: str):
    """View shared wishlist"""
    wishlist = await _db.wishlists.find_one(
        {"share_token": share_token},
        {"_id": 0, "customer_id": 0}
    )
    
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    
    return {
        "items": wishlist.get("items", []),
        "count": len(wishlist.get("items", []))
    }


# ======================
# PRODUCT REVIEWS ENDPOINTS
# ======================

@router.post("/reviews")
async def create_review(review: ReviewCreate, customer_id: str, store: str = Query("tnvcollection")):
    """Create a product review"""
    
    # Check if customer already reviewed this product
    existing = await _db.reviews.find_one({
        "product_id": review.product_id,
        "customer_id": customer_id,
        "store": store
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this product")
    
    # Check if customer purchased this product
    purchase = await _db.orders.find_one({
        "customer_id": customer_id,
        "items.product_id": review.product_id,
        "order_status": {"$in": ["delivered", "completed"]}
    })
    
    review_doc = {
        "id": f"rev_{uuid.uuid4().hex[:8]}",
        "product_id": review.product_id,
        "customer_id": customer_id,
        "store": store,
        "rating": review.rating,
        "title": review.title,
        "content": review.content,
        "images": review.images,
        "pros": review.pros,
        "cons": review.cons,
        "verified_purchase": purchase is not None,
        "helpful_count": 0,
        "unhelpful_count": 0,
        "status": "pending",  # pending, approved, rejected
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await _db.reviews.insert_one(review_doc)
    
    # Update product rating stats
    await update_product_rating_stats(review.product_id, store)
    
    return {"success": True, "review_id": review_doc["id"], "message": "Review submitted for approval"}


@router.get("/reviews/product/{product_id}")
async def get_product_reviews(
    product_id: str,
    store: str = Query("tnvcollection"),
    sort: str = "recent",  # recent, helpful, rating_high, rating_low
    rating_filter: Optional[int] = None,
    verified_only: bool = False,
    page: int = 1,
    limit: int = 10
):
    """Get reviews for a product"""
    query = {
        "product_id": product_id,
        "store": store,
        "status": "approved"
    }
    
    if rating_filter:
        query["rating"] = rating_filter
    if verified_only:
        query["verified_purchase"] = True
    
    # Sort options
    sort_field = "created_at"
    sort_order = -1
    if sort == "helpful":
        sort_field = "helpful_count"
    elif sort == "rating_high":
        sort_field = "rating"
    elif sort == "rating_low":
        sort_field = "rating"
        sort_order = 1
    
    skip = (page - 1) * limit
    
    reviews = await _db.reviews.find(query, {"_id": 0}).sort(sort_field, sort_order).skip(skip).limit(limit).to_list(limit)
    total = await _db.reviews.count_documents(query)
    
    # Get rating stats
    stats = await get_product_rating_stats(product_id, store)
    
    return {
        "reviews": reviews,
        "stats": stats,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.post("/reviews/{review_id}/helpful")
async def mark_review_helpful(review_id: str, response: ReviewResponse, customer_id: str):
    """Mark a review as helpful or unhelpful"""
    
    # Check if already voted
    existing_vote = await _db.review_votes.find_one({
        "review_id": review_id,
        "customer_id": customer_id
    })
    
    if existing_vote:
        raise HTTPException(status_code=400, detail="You have already voted on this review")
    
    # Record vote
    await _db.review_votes.insert_one({
        "review_id": review_id,
        "customer_id": customer_id,
        "helpful": response.helpful,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Update review counts
    field = "helpful_count" if response.helpful else "unhelpful_count"
    await _db.reviews.update_one(
        {"id": review_id},
        {"$inc": {field: 1}}
    )
    
    return {"success": True}


@router.put("/reviews/{review_id}/moderate")
async def moderate_review(review_id: str, status: str, reason: Optional[str] = None):
    """Moderate a review (Admin)"""
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
    
    review = await _db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    await _db.reviews.update_one(
        {"id": review_id},
        {
            "$set": {
                "status": status,
                "moderation_reason": reason,
                "moderated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Update product stats if approved
    if status == "approved":
        await update_product_rating_stats(review["product_id"], review["store"])
    
    return {"success": True, "message": f"Review {status}"}


@router.get("/reviews/pending")
async def get_pending_reviews(store: str = Query("tnvcollection"), limit: int = 50):
    """Get pending reviews for moderation (Admin)"""
    reviews = await _db.reviews.find(
        {"store": store, "status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"reviews": reviews, "count": len(reviews)}


async def update_product_rating_stats(product_id: str, store: str):
    """Update product rating statistics"""
    pipeline = [
        {"$match": {"product_id": product_id, "store": store, "status": "approved"}},
        {"$group": {
            "_id": None,
            "avg_rating": {"$avg": "$rating"},
            "total_reviews": {"$sum": 1},
            "rating_1": {"$sum": {"$cond": [{"$eq": ["$rating", 1]}, 1, 0]}},
            "rating_2": {"$sum": {"$cond": [{"$eq": ["$rating", 2]}, 1, 0]}},
            "rating_3": {"$sum": {"$cond": [{"$eq": ["$rating", 3]}, 1, 0]}},
            "rating_4": {"$sum": {"$cond": [{"$eq": ["$rating", 4]}, 1, 0]}},
            "rating_5": {"$sum": {"$cond": [{"$eq": ["$rating", 5]}, 1, 0]}}
        }}
    ]
    
    result = await _db.reviews.aggregate(pipeline).to_list(1)
    
    if result:
        stats = result[0]
        await _db.product_ratings.update_one(
            {"product_id": product_id, "store": store},
            {"$set": {
                "avg_rating": round(stats["avg_rating"], 1),
                "total_reviews": stats["total_reviews"],
                "rating_distribution": {
                    "1": stats["rating_1"],
                    "2": stats["rating_2"],
                    "3": stats["rating_3"],
                    "4": stats["rating_4"],
                    "5": stats["rating_5"]
                },
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )


async def get_product_rating_stats(product_id: str, store: str):
    """Get product rating statistics"""
    stats = await _db.product_ratings.find_one(
        {"product_id": product_id, "store": store},
        {"_id": 0}
    )
    
    if not stats:
        return {
            "avg_rating": 0,
            "total_reviews": 0,
            "rating_distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
        }
    
    return stats


@router.get("/products/{product_id}/rating")
async def get_product_rating(product_id: str, store: str = Query("tnvcollection")):
    """Get product rating stats"""
    return await get_product_rating_stats(product_id, store)


# ======================
# STOCK & NOTIFICATIONS
# ======================

@router.post("/stock/notify")
async def request_stock_notification(request: StockNotificationRequest, store: str = Query("tnvcollection")):
    """Request notification when product is back in stock"""
    
    # Check if already subscribed
    existing = await _db.stock_notifications.find_one({
        "product_id": request.product_id,
        "email": request.email,
        "store": store,
        "notified": False
    })
    
    if existing:
        return {"success": True, "message": "You're already subscribed for this product"}
    
    await _db.stock_notifications.insert_one({
        "product_id": request.product_id,
        "variant_id": request.variant_id,
        "email": request.email,
        "phone": request.phone,
        "store": store,
        "notified": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "You'll be notified when this item is back in stock"}


@router.get("/products/{product_id}/stock")
async def get_stock_status(product_id: str, variant_id: Optional[str] = None, store: str = Query("tnvcollection")):
    """Get product stock status"""
    # This would integrate with your inventory system
    # For now, returning mock data
    return {
        "product_id": product_id,
        "in_stock": True,
        "quantity": 50,
        "low_stock_threshold": 10,
        "is_low_stock": False,
        "backorder_allowed": True
    }


# ======================
# RECENTLY VIEWED
# ======================

@router.post("/recently-viewed/{customer_id}")
async def add_recently_viewed(customer_id: str, product_id: str, store: str = Query("tnvcollection")):
    """Add product to recently viewed"""
    
    # Remove if already exists (to move to top)
    await _db.recently_viewed.update_one(
        {"customer_id": customer_id, "store": store},
        {"$pull": {"products": {"product_id": product_id}}}
    )
    
    # Add to front of list
    await _db.recently_viewed.update_one(
        {"customer_id": customer_id, "store": store},
        {
            "$push": {
                "products": {
                    "$each": [{"product_id": product_id, "viewed_at": datetime.now(timezone.utc).isoformat()}],
                    "$position": 0,
                    "$slice": 20  # Keep only last 20
                }
            },
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
            "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    return {"success": True}


@router.get("/recently-viewed/{customer_id}")
async def get_recently_viewed(customer_id: str, store: str = Query("tnvcollection"), limit: int = 10):
    """Get recently viewed products"""
    doc = await _db.recently_viewed.find_one(
        {"customer_id": customer_id, "store": store},
        {"_id": 0}
    )
    
    if not doc:
        return {"products": []}
    
    product_ids = [p["product_id"] for p in doc.get("products", [])[:limit]]
    
    # Fetch product details
    # This would fetch from your products collection
    return {"product_ids": product_ids, "count": len(product_ids)}


# ======================
# CUSTOMER ACCOUNT
# ======================

@router.get("/customer/{customer_id}/profile")
async def get_customer_profile(customer_id: str):
    """Get customer profile"""
    profile = await _db.customers.find_one(
        {"customer_id": customer_id},
        {"_id": 0, "password": 0}
    )
    
    if not profile:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return profile


@router.put("/customer/{customer_id}/profile")
async def update_customer_profile(customer_id: str, profile: CustomerProfile):
    """Update customer profile"""
    await _db.customers.update_one(
        {"customer_id": customer_id},
        {
            "$set": {
                **profile.dict(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": "Profile updated"}


@router.get("/customer/{customer_id}/addresses")
async def get_customer_addresses(customer_id: str):
    """Get customer's saved addresses"""
    doc = await _db.customer_addresses.find_one(
        {"customer_id": customer_id},
        {"_id": 0}
    )
    
    return {"addresses": doc.get("addresses", []) if doc else []}


@router.post("/customer/{customer_id}/addresses")
async def add_customer_address(customer_id: str, address: Address):
    """Add a new address"""
    address_dict = address.dict()
    address_dict["id"] = f"addr_{uuid.uuid4().hex[:8]}"
    
    # If this is the first address or marked as default, update other addresses
    if address.is_default:
        await _db.customer_addresses.update_one(
            {"customer_id": customer_id},
            {"$set": {"addresses.$[].is_default": False}}
        )
    
    await _db.customer_addresses.update_one(
        {"customer_id": customer_id},
        {
            "$push": {"addresses": address_dict},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
            "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    return {"success": True, "address_id": address_dict["id"]}


@router.put("/customer/{customer_id}/addresses/{address_id}")
async def update_customer_address(customer_id: str, address_id: str, address: Address):
    """Update an address"""
    address_dict = address.dict()
    address_dict["id"] = address_id
    
    # If setting as default, unset others
    if address.is_default:
        await _db.customer_addresses.update_one(
            {"customer_id": customer_id},
            {"$set": {"addresses.$[].is_default": False}}
        )
    
    await _db.customer_addresses.update_one(
        {"customer_id": customer_id, "addresses.id": address_id},
        {"$set": {"addresses.$": address_dict, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True}


@router.delete("/customer/{customer_id}/addresses/{address_id}")
async def delete_customer_address(customer_id: str, address_id: str):
    """Delete an address"""
    await _db.customer_addresses.update_one(
        {"customer_id": customer_id},
        {
            "$pull": {"addresses": {"id": address_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"success": True}


@router.get("/customer/{customer_id}/dashboard")
async def get_customer_dashboard(customer_id: str, store: str = Query("tnvcollection")):
    """Get customer dashboard summary"""
    
    # Get order counts
    orders_count = await _db.orders.count_documents({"customer_id": customer_id, "store": store})
    pending_orders = await _db.orders.count_documents({
        "customer_id": customer_id,
        "store": store,
        "order_status": {"$in": ["pending", "confirmed", "processing", "shipped"]}
    })
    
    # Get wishlist count
    wishlist = await _db.wishlists.find_one({"customer_id": customer_id, "store": store})
    wishlist_count = len(wishlist.get("items", [])) if wishlist else 0
    
    # Get reviews count
    reviews_count = await _db.reviews.count_documents({"customer_id": customer_id, "store": store})
    
    # Get recent orders
    recent_orders = await _db.orders.find(
        {"customer_id": customer_id, "store": store},
        {"_id": 0}
    ).sort("created_at", -1).limit(3).to_list(3)
    
    return {
        "orders_count": orders_count,
        "pending_orders": pending_orders,
        "wishlist_count": wishlist_count,
        "reviews_count": reviews_count,
        "recent_orders": recent_orders
    }
