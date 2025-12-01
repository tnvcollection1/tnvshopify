from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from csv_upload import parse_shopify_orders_csv
import pandas as pd
import io
from shopify_sync import ShopifyOrderSync
from shopify_sync_async import ShopifyAsyncSync
from datetime import timedelta
from tcs_tracking import TCSTracker
from scheduler import get_scheduler


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Startup and shutdown events for scheduler
@app.on_event("startup")
async def startup_event():
    """Start background scheduler on server startup"""
    logger.info("🚀 Starting server...")
    scheduler = get_scheduler()
    scheduler.start()
    logger.info("✅ Background scheduler initialized")


@app.on_event("shutdown")
async def shutdown_event():
    """Stop background scheduler on server shutdown"""
    logger.info("🛑 Shutting down server...")
    scheduler = get_scheduler()
    scheduler.stop()
    logger.info("✅ Background scheduler stopped")


# Define Models
class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    customer_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    country_code: Optional[str] = None
    shoe_sizes: List[str] = []
    order_skus: List[str] = []  # SKUs from customer orders
    order_count: int = 0
    order_number: Optional[str] = None  # Shopify order number
    last_order_date: Optional[str] = None
    total_spent: float = 0.0
    store_name: Optional[str] = None
    messaged: bool = False
    last_messaged_at: Optional[str] = None
    message_count: int = 0
    messaged_by: Optional[str] = None
    converted: Optional[bool] = None
    conversion_notes: Optional[str] = None
    sale_amount: Optional[float] = None
    stock_status: Optional[str] = None  # "in_stock", "out_of_stock", "partial"
    fulfillment_status: Optional[str] = None  # "unfulfilled", "fulfilled", "partially_fulfilled"
    tracking_number: Optional[str] = None
    tracking_company: Optional[str] = None
    tracking_url: Optional[str] = None
    delivery_status: Optional[str] = None  # TCS delivery status: DELIVERED, OUT_FOR_DELIVERY, IN_TRANSIT, etc.
    delivery_location: Optional[str] = None  # Current TCS facility location
    delivery_updated_at: Optional[str] = None  # Last TCS status update time
    payment_status: Optional[str] = None  # Shopify payment status: paid, pending, refunded, partially_refunded, voided
    payment_method: Optional[str] = None  # Payment method used
    cod_payment_status: Optional[str] = None  # TCS COD payment status: PENDING, COLLECTED, REMITTED, HELD, REVERSED
    cod_amount: Optional[float] = None  # COD amount to be collected
    cod_collection_date: Optional[str] = None  # Date when COD was collected by TCS
    cod_remittance_date: Optional[str] = None  # Date when COD was remitted to merchant
    cod_remittance_amount: Optional[float] = None  # Amount remitted to merchant
    abandoned_checkout: Optional[bool] = None  # Whether customer has abandoned checkouts
    abandoned_checkout_value: Optional[float] = None  # Value of abandoned items


class Agent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password: str
    full_name: str
    role: str = "agent"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AgentLogin(BaseModel):
    username: str
    password: str


class AgentCreate(BaseModel):
    username: str
    password: str
    full_name: str


class Store(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    store_name: str
    shop_url: str
    shopify_domain: Optional[str] = None
    shopify_token: Optional[str] = None
    last_synced_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class StoreCreate(BaseModel):
    store_name: str
    shop_url: str


class WhatsAppRequest(BaseModel):
    phone: str
    country_code: Optional[str] = None


class BulkMessageRequest(BaseModel):
    customer_ids: List[str]
    message_template: Optional[str] = None
    delay_seconds: int = 5  # Delay between messages to avoid ban


@api_router.get("/scheduler/status")
async def get_scheduler_status():
    """
    Get background scheduler status and next run times
    """
    scheduler = get_scheduler()
    status = scheduler.get_status()
    return status


@api_router.post("/scheduler/trigger-shopify-sync")
async def trigger_manual_shopify_sync():
    """
    Manually trigger Shopify sync (in addition to automatic hourly sync)
    """
    try:
        scheduler = get_scheduler()
        scheduler.sync_shopify_orders()
        return {
            "success": True,
            "message": "Shopify sync triggered manually (running in background)"
        }
    except Exception as e:
        logger.error(f"Error triggering manual sync: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/scheduler/trigger-tcs-sync")
async def trigger_manual_tcs_sync():
    """
    Manually trigger TCS delivery status sync
    """
    try:
        scheduler = get_scheduler()
        scheduler.sync_tcs_deliveries()
        return {
            "success": True,
            "message": "TCS delivery sync triggered manually (running in background)"
        }
    except Exception as e:
        logger.error(f"Error triggering manual TCS sync: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

    customer_ids: List[str]
    message_template: Optional[str] = None
    delay_seconds: int = 5  # Delay between messages to avoid ban


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Customer Manager API"}


@api_router.post("/agents/register")
async def register_agent(agent: AgentCreate):
    """
    Register a new agent
    """
    try:
        # Check if username exists
        existing = await db.agents.find_one({"username": agent.username})
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Create agent with hashed password (simple hash for demo)
        import hashlib
        hashed_password = hashlib.sha256(agent.password.encode()).hexdigest()
        
        agent_obj = Agent(
            username=agent.username,
            password=hashed_password,
            full_name=agent.full_name
        )
        
        doc = agent_obj.model_dump()
        await db.agents.insert_one(doc)
        
        # Return without password
        return {
            "id": agent_obj.id,
            "username": agent_obj.username,
            "full_name": agent_obj.full_name,
            "role": agent_obj.role
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to register agent: {str(e)}")


@api_router.post("/agents/login")
async def login_agent(credentials: AgentLogin):
    """
    Agent login
    """
    try:
        import hashlib
        hashed_password = hashlib.sha256(credentials.password.encode()).hexdigest()
        
        agent = await db.agents.find_one({
            "username": credentials.username,
            "password": hashed_password
        })
        
        if not agent:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        return {
            "success": True,
            "agent": {
                "id": agent["id"],
                "username": agent["username"],
                "full_name": agent["full_name"],
                "role": agent["role"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging in: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")


@api_router.get("/agents")
async def get_agents():
    """
    Get all agents
    """
    agents = await db.agents.find({}, {"_id": 0, "password": 0}).to_list(100)
    return agents


@api_router.post("/upload-stock")
async def upload_stock_file(file: UploadFile = File(...), store_name: str = "tnvcollectionpk"):
    """
    Upload stock Excel file and store SKUs for a specific store
    """
    try:
        # Read Excel file
        content = await file.read()
        
        logger.info(f"Received stock file: {file.filename}, size: {len(content)} bytes for store: {store_name}")
        
        # Parse Excel using pandas
        df = pd.read_excel(io.BytesIO(content))
        
        logger.info(f"Excel columns: {df.columns.tolist()}")
        
        # Extract SKUs (assuming column is named 'SKU')
        if 'SKU' not in df.columns:
            raise HTTPException(status_code=400, detail="Excel file must have a 'SKU' column")
        
        # Get all SKUs and filter out empty values
        skus = df['SKU'].dropna().astype(str).tolist()
        skus = [sku.strip() for sku in skus if sku.strip()]
        
        logger.info(f"Extracted {len(skus)} SKUs from Excel")
        
        # Clear existing stock for this store
        await db.stock.delete_many({"store_name": store_name})
        
        # Insert new stock items
        stock_items = []
        for sku in skus:
            stock_items.append({
                "id": str(uuid.uuid4()),
                "sku": sku.upper(),  # Normalize to uppercase for matching
                "store_name": store_name,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        if stock_items:
            await db.stock.insert_many(stock_items)
        
        # Get unique SKU count
        unique_skus = len(set(sku.upper() for sku in skus))
        
        return {
            "success": True,
            "message": f"Stock updated for {store_name}",
            "total_items": len(skus),
            "unique_skus": unique_skus,
            "store_name": store_name
        }
        
    except Exception as e:
        logger.error(f"Error uploading stock file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process stock file: {str(e)}")


@api_router.get("/stock/{store_name}")
async def get_store_stock(store_name: str):
    """
    Get all stock SKUs for a specific store
    """
    stock_items = await db.stock.find({"store_name": store_name}, {"_id": 0}).to_list(10000)
    skus = [item["sku"] for item in stock_items]
    return {
        "store_name": store_name,
        "total_skus": len(skus),
        "unique_skus": len(set(skus)),
        "skus": list(set(skus))  # Return unique SKUs
    }


@api_router.post("/shopify/configure")
async def configure_shopify_store(
    store_name: str,
    shopify_domain: str,
    shopify_token: str
):
    """
    Configure Shopify credentials for a store
    """
    try:
        # Update store with Shopify credentials
        result = await db.stores.update_one(
            {"store_name": store_name},
            {"$set": {
                "shopify_domain": shopify_domain,
                "shopify_token": shopify_token,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Store not found")
        
        # Test connection
        sync = ShopifyOrderSync(shopify_domain, shopify_token)
        shop_info = sync.get_shop_info()
        
        if not shop_info:
            raise HTTPException(status_code=400, detail="Failed to connect to Shopify. Please check credentials.")
        
        return {
            "success": True,
            "message": f"Shopify configured for {store_name}",
            "shop_info": shop_info
        }
    except Exception as e:
        logger.error(f"Error configuring Shopify: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/shopify/sync/{store_name}")
async def sync_shopify_orders(store_name: str, days_back: int = 30, full_sync: bool = False):
    """
    Manually sync orders from Shopify for a specific store
    
    Args:
        store_name: Store to sync
        days_back: Number of days to look back (default 30)
        full_sync: If True, syncs ALL orders with pagination (default False)
    """
    try:
        # Get store credentials
        store = await db.stores.find_one({"store_name": store_name}, {"_id": 0})
        
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        
        if not store.get('shopify_domain') or not store.get('shopify_token'):
            raise HTTPException(status_code=400, detail="Shopify not configured for this store")
        
        # Fetch orders from Shopify
        sync = ShopifyOrderSync(store['shopify_domain'], store['shopify_token'])
        
        if full_sync:
            # Sync all orders (no date filter, with pagination)
            created_after = None
            logger.info(f"Starting FULL sync for {store_name} - fetching ALL orders with pagination")
            orders = sync.fetch_orders(limit=250, status="any", created_after=created_after, fetch_all=True)
        else:
            # Fetch orders from last X days
            created_after = (datetime.now(timezone.utc) - timedelta(days=days_back)).isoformat()
            logger.info(f"Syncing {store_name} orders from last {days_back} days")
            orders = sync.fetch_orders(limit=250, status="any", created_after=created_after, fetch_all=False)
        
        if not orders:
            return {
                "success": True,
                "message": "No new orders to sync",
                "orders_synced": 0
            }
        
        # Process and merge orders into customers
        customers_updated = 0
        customers_created = 0
        
        for order_data in orders:
            customer_id = order_data['customer_id']
            
            # Check if customer exists
            existing = await db.customers.find_one({"customer_id": customer_id, "store_name": store_name}, {"_id": 0})
            
            # Extract SKUs from line items
            order_skus = [item['sku'].upper() for item in order_data['line_items'] if item['sku']]
            
            # Extract sizes from line item names
            sizes = []
            for item in order_data['line_items']:
                # Try to extract size from product name
                name = item['name']
                if '/' in name:
                    parts = name.split('/')
                    size = parts[-1].strip() if len(parts) > 1 else 'Unknown'
                    sizes.append(size)
            
            if existing:
                # Merge with existing customer
                existing_skus = set(existing.get('order_skus', []))
                merged_skus = list(existing_skus.union(set(order_skus)))
                
                existing_sizes = set(existing.get('shoe_sizes', []))
                merged_sizes = list(existing_sizes.union(set(sizes)))
                
                await db.customers.update_one(
                    {"customer_id": customer_id, "store_name": store_name},
                    {"$set": {
                        "first_name": order_data['first_name'] or existing.get('first_name'),
                        "last_name": order_data['last_name'] or existing.get('last_name'),
                        "email": order_data['email'] or existing.get('email'),
                        "phone": order_data['phone'] or existing.get('phone'),
                        "country_code": order_data['country_code'] or existing.get('country_code'),
                        "order_skus": merged_skus,
                        "shoe_sizes": merged_sizes,
                        "order_number": str(order_data['order_number']),
                        "last_order_date": order_data['order_date'],
                        "fulfillment_status": order_data['fulfillment_status'],
                        "payment_status": order_data.get('payment_status'),
                        "payment_method": order_data.get('payment_method'),
                        "tracking_number": order_data['tracking_info']['tracking_number'] if order_data['tracking_info'] else None,
                        "tracking_company": order_data['tracking_info']['tracking_company'] if order_data['tracking_info'] else 'TCS Pakistan',
                        "tracking_url": order_data['tracking_info']['tracking_url'] if order_data['tracking_info'] else None,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                customers_updated += 1
            else:
                # Create new customer
                new_customer = {
                    "id": str(uuid.uuid4()),
                    "customer_id": customer_id,
                    "first_name": order_data['first_name'],
                    "last_name": order_data['last_name'],
                    "email": order_data['email'],
                    "phone": order_data['phone'],
                    "country_code": order_data['country_code'],
                    "store_name": store_name,
                    "order_skus": order_skus,
                    "shoe_sizes": sizes if sizes else ['Unknown'],
                    "order_count": 1,
                    "order_number": str(order_data['order_number']),
                    "last_order_date": order_data['order_date'],
                    "total_spent": order_data['total_price'],
                    "fulfillment_status": order_data['fulfillment_status'],
                    "payment_status": order_data.get('payment_status'),
                    "payment_method": order_data.get('payment_method'),
                    "tracking_number": order_data['tracking_info']['tracking_number'] if order_data['tracking_info'] else None,
                    "tracking_company": order_data['tracking_info']['tracking_company'] if order_data['tracking_info'] else 'TCS Pakistan',
                    "tracking_url": order_data['tracking_info']['tracking_url'] if order_data['tracking_info'] else None,
                    "messaged": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.customers.insert_one(new_customer)
                customers_created += 1
        
        # Update last sync time
        await db.stores.update_one(
            {"store_name": store_name},
            {"$set": {"last_synced_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {
            "success": True,
            "message": f"Synced {len(orders)} orders from Shopify",
            "orders_synced": len(orders),
            "customers_created": customers_created,
            "customers_updated": customers_updated
        }
        
    except Exception as e:
        logger.error(f"Error syncing Shopify orders: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@api_router.post("/shopify/sync-fast/{store_name}")
async def sync_shopify_orders_fast(store_name: str, days_back: int = 7):
    """
    PHASE 1: Fast concurrent sync with incremental updates
    10x faster than regular sync - perfect for daily updates
    
    Args:
        store_name: Store to sync
        days_back: Number of days to look back (default 7 for incremental)
    """
    try:
        # Get store credentials
        store = await db.stores.find_one({"store_name": store_name}, {"_id": 0})
        
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        
        if not store.get('shopify_domain') or not store.get('shopify_token'):
            raise HTTPException(status_code=400, detail="Shopify not configured for this store")
        
        # Use async concurrent sync
        sync = ShopifyAsyncSync(store['shopify_domain'], store['shopify_token'], max_workers=10)
        
        # Incremental sync - only fetch recent orders
        created_after = (datetime.now(timezone.utc) - timedelta(days=days_back)).isoformat()
        logger.info(f"🚀 Starting FAST sync for {store_name} (last {days_back} days, concurrent)")
        
        # Fetch orders concurrently
        orders = await sync.fetch_orders_concurrent(created_after=created_after, status="any", max_batches=20)
        
        sync.close()
        
        if not orders:
            return {
                "success": True,
                "message": "No new orders to sync",
                "orders_synced": 0,
                "mode": "fast_concurrent"
            }
        
        # Process orders (same logic as regular sync)
        customers_updated = 0
        customers_created = 0
        
        for order_data in orders:
            customer_id = order_data['customer_id']
            
            existing = await db.customers.find_one({"customer_id": customer_id, "store_name": store_name}, {"_id": 0})
            
            order_skus = [item['sku'].upper() for item in order_data['line_items'] if item['sku']]
            
            sizes = []
            for item in order_data['line_items']:
                name = item['name']
                if '/' in name:
                    parts = name.split('/')
                    size = parts[-1].strip() if len(parts) > 1 else 'Unknown'
                    sizes.append(size)
            
            if existing:
                # Update existing customer
                existing_skus = set(existing.get('order_skus', []))
                merged_skus = list(existing_skus.union(set(order_skus)))
                
                existing_sizes = set(existing.get('shoe_sizes', []))
                merged_sizes = list(existing_sizes.union(set(sizes)))
                
                await db.customers.update_one(
                    {"customer_id": customer_id, "store_name": store_name},
                    {"$set": {
                        "first_name": order_data['first_name'] or existing.get('first_name'),
                        "last_name": order_data['last_name'] or existing.get('last_name'),
                        "email": order_data['email'] or existing.get('email'),
                        "phone": order_data['phone'] or existing.get('phone'),
                        "country_code": order_data['country_code'] or existing.get('country_code'),
                        "order_skus": merged_skus,
                        "shoe_sizes": merged_sizes,
                        "order_number": str(order_data['order_number']),
                        "last_order_date": order_data['order_date'],
                        "fulfillment_status": order_data['fulfillment_status'],
                        "payment_status": order_data.get('payment_status'),
                        "payment_method": order_data.get('payment_method'),
                        "tracking_number": order_data['tracking_info']['tracking_number'] if order_data['tracking_info'] else None,
                        "tracking_company": order_data['tracking_info']['tracking_company'] if order_data['tracking_info'] else 'TCS Pakistan',
                        "tracking_url": order_data['tracking_info']['tracking_url'] if order_data['tracking_info'] else None,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                customers_updated += 1
            else:
                # Create new customer
                new_customer = {
                    "id": str(uuid.uuid4()),
                    "customer_id": customer_id,
                    "first_name": order_data['first_name'],
                    "last_name": order_data['last_name'],
                    "email": order_data['email'],
                    "phone": order_data['phone'],
                    "country_code": order_data['country_code'],
                    "store_name": store_name,
                    "order_skus": order_skus,
                    "shoe_sizes": sizes if sizes else ['Unknown'],
                    "order_count": 1,
                    "order_number": str(order_data['order_number']),
                    "last_order_date": order_data['order_date'],
                    "total_spent": order_data['total_price'],
                    "fulfillment_status": order_data['fulfillment_status'],
                    "payment_status": order_data.get('payment_status'),
                    "payment_method": order_data.get('payment_method'),
                    "tracking_number": order_data['tracking_info']['tracking_number'] if order_data['tracking_info'] else None,
                    "tracking_company": order_data['tracking_info']['tracking_company'] if order_data['tracking_info'] else 'TCS Pakistan',
                    "tracking_url": order_data['tracking_info']['tracking_url'] if order_data['tracking_info'] else None,
                    "messaged": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.customers.insert_one(new_customer)
                customers_created += 1
        
        # Update last sync time
        await db.stores.update_one(
            {"store_name": store_name},
            {"$set": {"last_synced_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {
            "success": True,
            "message": f"Fast sync completed: {len(orders)} orders",
            "orders_synced": len(orders),
            "customers_created": customers_created,
            "customers_updated": customers_updated,
            "mode": "fast_concurrent",
            "days_synced": days_back
        }
        
    except Exception as e:
        logger.error(f"Error in fast sync: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/shopify/sync-abandoned-checkouts/{store_name}")
async def sync_abandoned_checkouts(store_name: str, days_back: int = 30):
    """
    P0: Sync abandoned checkouts from Shopify
    
    Args:
        store_name: Store to sync
        days_back: Number of days to look back (default 30)
    """
    try:
        # Get store credentials
        store = await db.stores.find_one({"store_name": store_name}, {"_id": 0})
        
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        
        if not store.get('shopify_domain') or not store.get('shopify_token'):
            raise HTTPException(status_code=400, detail="Shopify not configured for this store")
        
        # Fetch abandoned checkouts
        sync = ShopifyAsyncSync(store['shopify_domain'], store['shopify_token'])
        created_after = (datetime.now(timezone.utc) - timedelta(days=days_back)).isoformat()
        
        logger.info(f"🛒 Syncing abandoned checkouts for {store_name} (last {days_back} days)")
        
        checkouts = await sync.fetch_abandoned_checkouts(created_after=created_after)
        sync.close()
        
        if not checkouts:
            return {
                "success": True,
                "message": "No abandoned checkouts found",
                "checkouts_synced": 0
            }
        
        # Process checkouts
        checkouts_saved = 0
        checkouts_updated = 0
        
        for checkout_data in checkouts:
            customer_id = checkout_data['customer_id']
            
            # Check if customer exists
            existing = await db.customers.find_one({"customer_id": customer_id, "store_name": store_name})
            
            if existing:
                # Update existing customer with abandoned checkout info
                await db.customers.update_one(
                    {"customer_id": customer_id, "store_name": store_name},
                    {"$set": {
                        "abandoned_checkout": True,
                        "abandoned_checkout_value": checkout_data.get('total_price', 0.0),
                        "abandoned_checkout_url": checkout_data.get('abandoned_checkout_url'),
                        "abandoned_at": checkout_data.get('abandoned_at'),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                checkouts_updated += 1
            else:
                # Create new customer from abandoned checkout
                new_customer = {
                    "id": str(uuid.uuid4()),
                    "customer_id": customer_id,
                    "first_name": checkout_data.get('first_name', ''),
                    "last_name": checkout_data.get('last_name', ''),
                    "email": checkout_data.get('email', ''),
                    "phone": checkout_data.get('phone', ''),
                    "store_name": store_name,
                    "order_count": 0,
                    "shoe_sizes": [],
                    "order_skus": [item['sku'] for item in checkout_data.get('line_items', []) if item.get('sku')],
                    "abandoned_checkout": True,
                    "abandoned_checkout_value": checkout_data.get('total_price', 0.0),
                    "abandoned_checkout_url": checkout_data.get('abandoned_checkout_url'),
                    "abandoned_at": checkout_data.get('abandoned_at'),
                    "messaged": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.customers.insert_one(new_customer)
                checkouts_saved += 1
        
        return {
            "success": True,
            "message": f"Synced {len(checkouts)} abandoned checkouts",
            "checkouts_synced": len(checkouts),
            "new_customers": checkouts_saved,
            "existing_updated": checkouts_updated
        }
        
    except Exception as e:
        logger.error(f"Error syncing abandoned checkouts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class TCSConfigRequest(BaseModel):
    bearer_token: Optional[str] = None
    token_expiry: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None

@api_router.post("/tcs/configure")
async def configure_tcs_credentials(config: TCSConfigRequest):
    """
    Configure TCS Pakistan API credentials
    Supports both Bearer Token (preferred) and Username/Password
    """
    try:
        if config.bearer_token:
            # Bearer token authentication (preferred)
            tracker = TCSTracker(bearer_token=config.bearer_token, token_expiry=config.token_expiry)
            
            # Store token in database
            await db.tcs_config.update_one(
                {"service": "tcs_pakistan"},
                {"$set": {
                    "bearer_token": config.bearer_token,
                    "token_expiry": config.token_expiry,
                    "auth_type": "bearer",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
            
            return {
                "success": True,
                "message": "TCS bearer token configured successfully",
                "token_expiry": config.token_expiry
            }
        elif config.username and config.password:
            # Username/Password authentication
            tracker = TCSTracker(username=config.username, password=config.password)
            if not tracker.authenticate():
                raise HTTPException(status_code=400, detail="Invalid TCS credentials")
            
            # Store credentials
            await db.tcs_config.update_one(
                {"service": "tcs_pakistan"},
                {"$set": {
                    "username": config.username,
                    "password": config.password,
                    "auth_type": "credentials",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
            
            return {
                "success": True,
                "message": "TCS credentials configured successfully"
            }
        else:
            raise HTTPException(status_code=400, detail="Please provide either bearer_token or username+password")
            
    except Exception as e:
        logger.error(f"Error configuring TCS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/tcs/track/{tracking_number}")
async def track_tcs_consignment(tracking_number: str):
    """
    Track a single TCS consignment and update customer delivery status
    """
    try:
        # Get TCS credentials
        config = await db.tcs_config.find_one({"service": "tcs_pakistan"}, {"_id": 0})
        if not config:
            raise HTTPException(status_code=400, detail="TCS not configured. Please configure credentials first.")
        
        # Track with TCS
        if config.get('auth_type') == 'bearer':
            tracker = TCSTracker(
                bearer_token=config.get('bearer_token'),
                token_expiry=config.get('token_expiry')
            )
        else:
            tracker = TCSTracker(
                username=config.get('username'),
                password=config.get('password')
            )
        tracking_data = tracker.track_consignment(tracking_number)
        
        if not tracking_data:
            raise HTTPException(status_code=500, detail="Failed to fetch tracking data from TCS")
        
        # Update customer with delivery status
        if tracking_data.get('normalized_status') != 'NOT_FOUND':
            await db.customers.update_one(
                {"tracking_number": tracking_number},
                {"$set": {
                    "delivery_status": tracking_data.get('normalized_status'),
                    "delivery_location": tracking_data.get('current_location'),
                    "delivery_updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {
            "success": True,
            "tracking_data": tracking_data
        }
    except Exception as e:
        logger.error(f"Error tracking TCS consignment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/tcs/sync-all")
async def sync_all_tcs_deliveries():
    """
    Update delivery status for all customers with TCS tracking numbers
    Only updates unfulfilled and in-transit orders (skips delivered)
    """
    try:
        # Get TCS credentials
        config = await db.tcs_config.find_one({"service": "tcs_pakistan"}, {"_id": 0})
        if not config:
            raise HTTPException(status_code=400, detail="TCS not configured")
        
        # Get customers with tracking numbers (not yet delivered)
        customers = await db.customers.find({
            "tracking_number": {"$ne": None, "$exists": True},
            "$or": [
                {"delivery_status": {"$ne": "DELIVERED"}},
                {"delivery_status": {"$exists": False}}
            ]
        }, {"_id": 0, "tracking_number": 1, "customer_id": 1}).to_list(1000)
        
        if not customers:
            return {
                "success": True,
                "message": "No tracking numbers to update",
                "updated": 0
            }
        
        # Note: This endpoint just returns info, actual sync happens via scheduler
        return {
            "success": True,
            "message": f"Found {len(customers)} tracking numbers to sync (sync running in background)",
            "pending_sync": len(customers)
        }
        
    except Exception as e:
        logger.error(f"Error in TCS sync: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/tcs/sync-cod-payments")
async def sync_cod_payments():
    """
    Sync COD payment status for all orders with tracking numbers
    Updates: cod_payment_status, cod_amount, cod_collection_date, cod_remittance_date
    """
    try:
        # Get TCS credentials
        config = await db.tcs_config.find_one({"service": "tcs_pakistan"}, {"_id": 0})
        
        if not config:
            raise HTTPException(status_code=400, detail="TCS not configured")
        
        # Initialize TCS Payment API
        from tcs_payment import TCSPaymentAPI
        
        if config.get('auth_type') == 'bearer':
            payment_api = TCSPaymentAPI(bearer_token=config.get('bearer_token'))
        else:
            raise HTTPException(status_code=400, detail="Bearer token required for payment API")
        
        # Get customers with tracking numbers and COD orders (limit 500 per sync)
        customers = await db.customers.find({
            "tracking_number": {"$ne": None, "$exists": True, "$ne": ""},
            "$or": [
                {"cod_payment_status": {"$exists": False}},
                {"cod_payment_status": "PENDING"},
                {"cod_payment_status": "COLLECTED"}
            ]
        }, {"_id": 0, "customer_id": 1, "store_name": 1, "tracking_number": 1}).limit(500).to_list(500)
        
        if not customers:
            return {
                "success": True,
                "message": "No COD payments to sync",
                "updated": 0
            }
        
        logger.info(f"Syncing COD payment status for {len(customers)} orders...")
        
        updated_count = 0
        
        for customer in customers:
            try:
                tracking_number = customer['tracking_number']
                payment_data = payment_api.get_payment_status(tracking_number)
                
                if payment_data.get('success'):
                    # Update customer with COD payment info
                    await db.customers.update_one(
                        {"customer_id": customer['customer_id'], "store_name": customer['store_name']},
                        {"$set": {
                            "cod_payment_status": payment_data.get('normalized_status', 'UNKNOWN'),
                            "cod_amount": payment_data.get('cod_amount', 0.0),
                            "cod_collection_date": payment_data.get('collection_date'),
                            "cod_remittance_date": payment_data.get('remittance_date'),
                            "cod_remittance_amount": payment_data.get('remittance_amount', 0.0),
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    updated_count += 1
                    
            except Exception as e:
                logger.error(f"Error syncing payment for {customer.get('tracking_number')}: {str(e)}")
                continue
        
        logger.info(f"COD payment sync completed: {updated_count} payments updated")
        
        return {
            "success": True,
            "message": f"Synced {updated_count} COD payments",
            "updated": updated_count,
            "processed": len(customers)
        }
        
    except Exception as e:
        logger.error(f"Error syncing COD payments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/tcs/payment-status/{tracking_number}")
async def get_cod_payment_status(tracking_number: str):
    """
    Get COD payment status for a specific tracking number
    """
    try:
        # Get TCS credentials
        config = await db.tcs_config.find_one({"service": "tcs_pakistan"}, {"_id": 0})
        
        if not config:
            raise HTTPException(status_code=400, detail="TCS not configured")
        
        # Initialize TCS Payment API
        from tcs_payment import TCSPaymentAPI
        
        if config.get('auth_type') == 'bearer':
            payment_api = TCSPaymentAPI(bearer_token=config.get('bearer_token'))
        else:
            raise HTTPException(status_code=400, detail="Bearer token required for payment API")
        
        # Get payment status
        payment_data = payment_api.get_payment_status(tracking_number)
        
        if payment_data.get('success'):
            return {
                "success": True,
                "tracking_number": tracking_number,
                "payment_data": payment_data
            }
        else:
            return {
                "success": False,
                "tracking_number": tracking_number,
                "error": payment_data.get('error', 'Unknown error')
            }
        
    except Exception as e:
        logger.error(f"Error getting COD payment status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

        
        # Track all consignments
        if config.get('auth_type') == 'bearer':
            tracker = TCSTracker(
                bearer_token=config.get('bearer_token'),
                token_expiry=config.get('token_expiry')
            )
        else:
            tracker = TCSTracker(
                username=config.get('username'),
                password=config.get('password')
            )
        tracking_numbers = [c['tracking_number'] for c in customers]
        
        logger.info(f"Tracking {len(tracking_numbers)} TCS consignments...")
        
        updated_count = 0
        delivered_count = 0
        
        for tracking_number in tracking_numbers:
            tracking_data = tracker.track_consignment(tracking_number)
            
            if tracking_data and tracking_data.get('normalized_status') != 'NOT_FOUND':
                result = await db.customers.update_many(
                    {"tracking_number": tracking_number},
                    {"$set": {
                        "delivery_status": tracking_data.get('normalized_status'),
                        "delivery_location": tracking_data.get('current_location'),
                        "delivery_updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                updated_count += result.modified_count
                
                if tracking_data.get('is_delivered'):
                    delivered_count += 1
        
        return {
            "success": True,
            "message": f"Updated {updated_count} customers",
            "tracked_count": len(tracking_numbers),
            "updated_count": updated_count,
            "delivered_count": delivered_count
        }
        
    except Exception as e:
        logger.error(f"Error syncing TCS deliveries: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/upload-csv")
async def upload_shopify_csv(file: UploadFile = File(...), store_name: str = "Default Store", shop_url: str = ""):
    """
    Upload Shopify orders CSV export and extract customer data
    """
    try:
        # Read CSV content
        content = await file.read()
        csv_text = content.decode('utf-8')
        
        logger.info(f"Received CSV file: {file.filename}, size: {len(csv_text)} bytes")
        
        # Parse CSV
        customers_list = parse_shopify_orders_csv(csv_text)
        
        logger.info(f"Parsed {len(customers_list)} customers from CSV")
        
        # Add store name to each customer
        for customer in customers_list:
            customer['store_name'] = store_name
        
        # Create or update store record
        existing_store = await db.stores.find_one({"store_name": store_name})
        if not existing_store:
            store_obj = Store(
                store_name=store_name,
                shop_url=shop_url or f"{store_name.lower().replace(' ', '-')}.myshopify.com"
            )
            await db.stores.insert_one(store_obj.model_dump())
            logger.info(f"Created store record: {store_name}")
        
        # Merge strategy: Update existing customers or insert new ones
        updated_count = 0
        inserted_count = 0
        
        for customer in customers_list:
            # Try to find existing customer by customer_id or phone (if phone exists)
            query = {"store_name": store_name}
            if customer.get('phone'):
                # Use phone as unique identifier if available
                query["phone"] = customer['phone']
            else:
                # Use customer_id as fallback
                query["customer_id"] = customer['customer_id']
            
            existing = await db.customers.find_one(query)
            
            if existing:
                # Update existing customer - merge sizes and SKUs
                existing_sizes = set(existing.get('shoe_sizes', []))
                new_sizes = set(customer.get('shoe_sizes', []))
                merged_sizes = list(existing_sizes.union(new_sizes))
                
                # Remove "Unknown" if we have real sizes
                if len(merged_sizes) > 1 and "Unknown" in merged_sizes:
                    merged_sizes.remove("Unknown")
                
                # Merge SKUs
                existing_skus = set(existing.get('order_skus', []))
                new_skus = set(customer.get('order_skus', []))
                merged_skus = list(existing_skus.union(new_skus))
                
                update_data = {
                    "first_name": customer.get('first_name') or existing.get('first_name'),
                    "last_name": customer.get('last_name') or existing.get('last_name'),
                    "email": customer.get('email') or existing.get('email'),
                    "phone": customer.get('phone') or existing.get('phone'),
                    "country_code": customer.get('country_code') or existing.get('country_code'),
                    "shoe_sizes": merged_sizes,
                    "order_skus": merged_skus,
                    "order_count": existing.get('order_count', 0) + customer.get('order_count', 0),
                    "total_spent": existing.get('total_spent', 0) + customer.get('total_spent', 0),
                    "last_order_date": max(
                        customer.get('last_order_date') or '',
                        existing.get('last_order_date') or ''
                    ) or None
                }
                
                await db.customers.update_one(
                    {"_id": existing["_id"]},
                    {"$set": update_data}
                )
                updated_count += 1
            else:
                # Insert new customer
                await db.customers.insert_one(customer)
                inserted_count += 1
        
        logger.info(f"Updated {updated_count} existing customers, inserted {inserted_count} new customers")
        
        # Get total count for this store
        total_customers = await db.customers.count_documents({"store_name": store_name})
        
        return {
            "success": True,
            "message": f"Added {inserted_count} new, updated {updated_count} existing. Total: {total_customers} customers in {store_name}",
            "customers_imported": len(customers_list),
            "inserted": inserted_count,
            "updated": updated_count,
            "total": total_customers,
            "store_name": store_name
        }
        
    except Exception as e:
        logger.error(f"Error uploading CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")


@api_router.get("/customers", response_model=List[Customer])
async def get_customers(
    shoe_size: Optional[str] = None, 
    store_name: Optional[str] = None,
    messaged: Optional[str] = None,
    country_code: Optional[str] = None,
    agent_username: Optional[str] = None,
    stock_availability: Optional[str] = None,  # "in_stock", "out_of_stock", "partial"
    fulfillment_status: Optional[str] = None,  # "fulfilled", "unfulfilled", "partially_fulfilled"
    delivery_status: Optional[str] = None,  # "DELIVERED", "IN_TRANSIT", "OUT_FOR_DELIVERY", etc.
    payment_status: Optional[str] = None,  # "paid", "pending", "refunded", "partially_refunded", "voided"
    page: int = 1,
    limit: int = 100
):
    """
    Get customers with pagination, filtered by size, store, messaged status, country, agent, stock availability, fulfillment, delivery, and payment status
    """
    query = {}
    if shoe_size and shoe_size != "all":
        query['shoe_sizes'] = shoe_size
    if store_name and store_name != "all":
        query['store_name'] = store_name
    if messaged == "yes":
        query['messaged'] = True
    elif messaged == "no":
        query['messaged'] = {"$ne": True}
    if country_code and country_code != "all":
        query['country_code'] = country_code
    if agent_username and agent_username != "all":
        query['messaged_by'] = agent_username
    if fulfillment_status and fulfillment_status != "all":
        query['fulfillment_status'] = fulfillment_status
    if delivery_status and delivery_status != "all":
        query['delivery_status'] = delivery_status
    if payment_status and payment_status != "all":
        query['payment_status'] = payment_status
    
    # Calculate skip value for pagination
    skip = (page - 1) * limit
    
    # If filtering by stock, we need to fetch more to account for filtering
    fetch_limit = limit * 10 if stock_availability else limit
    
    # Get customers with pagination - SORT BY MOST RECENT ORDERS FIRST
    # This ensures Shopify synced customers with order_number appear first
    customers = await db.customers.find(query, {"_id": 0}).sort("last_order_date", -1).skip(skip).limit(fetch_limit).to_list(fetch_limit)
    
    # If filtering by stock availability or if we want to show stock status, calculate it
    if stock_availability or store_name:
        # Get stock for the store
        stock_store = store_name if store_name and store_name != "all" else None
        if stock_store:
            stock_items = await db.stock.find({"store_name": stock_store}, {"_id": 0, "sku": 1}).to_list(10000)
            stock_skus = set(item["sku"].upper() for item in stock_items)
            
            # Calculate stock status for each customer
            filtered_customers = []
            for customer in customers:
                order_skus = [sku.upper() for sku in customer.get('order_skus', [])]
                
                if not order_skus:
                    customer['stock_status'] = "unknown"
                else:
                    in_stock = sum(1 for sku in order_skus if sku in stock_skus)
                    
                    if in_stock == len(order_skus):
                        customer['stock_status'] = "in_stock"
                    elif in_stock == 0:
                        customer['stock_status'] = "out_of_stock"
                    else:
                        customer['stock_status'] = "partial"
                
                # Filter by stock availability if specified
                if stock_availability:
                    if customer['stock_status'] == stock_availability:
                        filtered_customers.append(customer)
                        # Stop once we have enough for this page
                        if len(filtered_customers) >= limit:
                            break
                else:
                    filtered_customers.append(customer)
            
            return filtered_customers[:limit]
    
    return customers


@api_router.get("/customers/count")
async def get_customers_count(
    shoe_size: Optional[str] = None,
    store_name: Optional[str] = None,
    messaged: Optional[str] = None,
    country_code: Optional[str] = None,
    agent_username: Optional[str] = None,
    stock_availability: Optional[str] = None,
    fulfillment_status: Optional[str] = None,
    delivery_status: Optional[str] = None,
    payment_status: Optional[str] = None
):
    """
    Get total count of customers matching filters including stock availability, fulfillment, delivery, and payment status
    """
    query = {}
    if shoe_size and shoe_size != "all":
        query['shoe_sizes'] = shoe_size
    if store_name and store_name != "all":
        query['store_name'] = store_name
    if messaged == "yes":
        query['messaged'] = True
    elif messaged == "no":
        query['messaged'] = {"$ne": True}
    if country_code and country_code != "all":
        query['country_code'] = country_code
    if agent_username and agent_username != "all":
        query['messaged_by'] = agent_username
    if fulfillment_status and fulfillment_status != "all":
        query['fulfillment_status'] = fulfillment_status
    if delivery_status and delivery_status != "all":
        query['delivery_status'] = delivery_status
    if payment_status and payment_status != "all":
        query['payment_status'] = payment_status
    
    # If stock_availability filter is specified, we need to fetch and filter
    if stock_availability and store_name and store_name != "all":
        customers = await db.customers.find(query, {"_id": 0, "order_skus": 1}).to_list(50000)
        
        # Get stock for the store
        stock_items = await db.stock.find({"store_name": store_name}, {"_id": 0, "sku": 1}).to_list(10000)
        stock_skus = set(item["sku"].upper() for item in stock_items)
        
        # Count customers matching stock status
        matching_count = 0
        for customer in customers:
            order_skus = [sku.upper() for sku in customer.get('order_skus', [])]
            
            if not order_skus:
                stock_status = "unknown"
            else:
                in_stock = sum(1 for sku in order_skus if sku in stock_skus)
                
                if in_stock == len(order_skus):
                    stock_status = "in_stock"
                elif in_stock == 0:
                    stock_status = "out_of_stock"
                else:
                    stock_status = "partial"
            
            if stock_status == stock_availability:
                matching_count += 1
        
        return {"total": matching_count}
    
    count = await db.customers.count_documents(query)
    return {"total": count}


@api_router.get("/shoe-sizes")
async def get_shoe_sizes(store_name: Optional[str] = None):
    """
    Get all unique shoe sizes, optionally filtered by store
    """
    query = {}
    if store_name and store_name != "all":
        query['store_name'] = store_name
    
    customers = await db.customers.find(query, {"_id": 0, "shoe_sizes": 1}).to_list(20000)
    
    all_sizes = set()
    for customer in customers:
        for size in customer.get('shoe_sizes', []):
            all_sizes.add(size)
    
    return {"shoe_sizes": sorted(list(all_sizes))}


@api_router.get("/reports/agents")
async def get_agent_reports():
    """
    Get agent performance report with total sales
    """
    try:
        # Get all agents
        agents = await db.agents.find({}, {"_id": 0, "password": 0}).to_list(100)
        
        reports = []
        for agent in agents:
            username = agent["username"]
            
            # Count customers messaged by this agent
            messaged_count = await db.customers.count_documents({"messaged_by": username})
            
            # Count conversions
            converted_count = await db.customers.count_documents({
                "messaged_by": username,
                "converted": True
            })
            
            # Calculate total sales
            converted_customers = await db.customers.find({
                "messaged_by": username,
                "converted": True
            }, {"_id": 0, "sale_amount": 1}).to_list(10000)
            
            total_sales = sum(c.get('sale_amount', 0) or 0 for c in converted_customers)
            
            # Conversion rate
            conversion_rate = (converted_count / messaged_count * 100) if messaged_count > 0 else 0
            
            reports.append({
                "agent_username": username,
                "agent_name": agent["full_name"],
                "messages_sent": messaged_count,
                "conversions": converted_count,
                "conversion_rate": round(conversion_rate, 2),
                "total_sales": round(total_sales, 2)
            })
        
        return {"reports": reports}
    except Exception as e:
        logger.error(f"Error generating reports: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate reports")


@api_router.get("/reports/daily")
async def get_daily_reports(agent_username: Optional[str] = None):
    """
    Get day-wise reporting with messages, conversions, and sales
    """
    try:
        from datetime import datetime, timedelta
        from collections import defaultdict
        
        # Build query
        query = {"messaged": True}
        if agent_username and agent_username != "all":
            query["messaged_by"] = agent_username
        
        # Get all messaged customers
        customers = await db.customers.find(query, {
            "_id": 0,
            "last_messaged_at": 1,
            "converted": 1,
            "sale_amount": 1,
            "messaged_by": 1
        }).to_list(50000)
        
        # Group by date
        daily_stats = defaultdict(lambda: {
            "messages": 0,
            "conversions": 0,
            "sales": 0.0
        })
        
        for customer in customers:
            if customer.get('last_messaged_at'):
                # Parse date (YYYY-MM-DD)
                msg_date = customer['last_messaged_at'][:10]
                
                daily_stats[msg_date]["messages"] += 1
                
                if customer.get('converted'):
                    daily_stats[msg_date]["conversions"] += 1
                    daily_stats[msg_date]["sales"] += customer.get('sale_amount', 0) or 0
        
        # Convert to list and sort by date
        reports = []
        for date, stats in sorted(daily_stats.items(), reverse=True):
            conversion_rate = (stats["conversions"] / stats["messages"] * 100) if stats["messages"] > 0 else 0
            reports.append({
                "date": date,
                "messages_sent": stats["messages"],
                "conversions": stats["conversions"],
                "conversion_rate": round(conversion_rate, 2),
                "total_sales": round(stats["sales"], 2)
            })
        
        return {"daily_reports": reports}
    except Exception as e:
        logger.error(f"Error generating daily reports: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate daily reports")


@api_router.get("/countries")
async def get_countries(store_name: Optional[str] = None):
    """
    Get all unique countries, optionally filtered by store
    """
    query = {}
    if store_name and store_name != "all":
        query['store_name'] = store_name
    
    customers = await db.customers.find(query, {"_id": 0, "country_code": 1}).to_list(20000)
    
    countries = set()
    for customer in customers:
        country = customer.get('country_code')
        if country:
            countries.add(country)
    
    return {"countries": sorted(list(countries))}


@api_router.post("/stores", response_model=Store)
async def create_store(store: StoreCreate):
    """
    Add a new store
    """
    try:
        # Check if store already exists
        existing = await db.stores.find_one({"store_name": store.store_name})
        if existing:
            raise HTTPException(status_code=400, detail="Store with this name already exists")
        
        store_obj = Store(**store.model_dump())
        doc = store_obj.model_dump()
        await db.stores.insert_one(doc)
        logger.info(f"Created store: {store.store_name}")
        return store_obj
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating store: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create store: {str(e)}")


@api_router.get("/stores", response_model=List[Store])
async def get_stores():
    """
    Get all stores
    """
    stores = await db.stores.find({}, {"_id": 0}).to_list(100)
    return stores


@api_router.delete("/stores/{store_id}")
async def delete_store(store_id: str):
    """
    Delete a store and all its customers
    """
    try:
        # Get store first
        store = await db.stores.find_one({"id": store_id})
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        
        store_name = store["store_name"]
        
        # Delete all customers from this store
        customers_result = await db.customers.delete_many({"store_name": store_name})
        
        # Delete the store
        await db.stores.delete_one({"id": store_id})
        
        logger.info(f"Deleted store '{store_name}' and {customers_result.deleted_count} customers")
        
        return {
            "success": True,
            "message": f"Deleted store '{store_name}' and {customers_result.deleted_count} customers"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting store: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete store: {str(e)}")


@api_router.post("/customers/{customer_id}/mark-messaged")
async def mark_customer_messaged(customer_id: str, agent_username: Optional[str] = None):
    """
    Mark a customer as messaged by an agent
    """
    result = await db.customers.update_one(
        {"customer_id": customer_id},
        {
            "$set": {
                "messaged": True,
                "last_messaged_at": datetime.now(timezone.utc).isoformat(),
                "messaged_by": agent_username or "Unknown"
            },
            "$inc": {"message_count": 1}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {"success": True, "message": "Customer marked as messaged"}


@api_router.post("/customers/{customer_id}/update-conversion")
async def update_customer_conversion(
    customer_id: str, 
    converted: bool, 
    notes: Optional[str] = None,
    sale_amount: Optional[float] = None
):
    """
    Update customer conversion status with sale amount
    """
    update_data = {
        "converted": converted,
        "conversion_notes": notes
    }
    
    if converted and sale_amount:
        update_data["sale_amount"] = sale_amount
    
    result = await db.customers.update_one(
        {"customer_id": customer_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {"success": True, "message": "Conversion updated"}


@api_router.get("/message-greetings")
async def get_random_greeting():
    """
    Get a random greeting message to avoid repetition
    """
    greetings = [
        "Hello",
        "Hi",
        "Hey",
        "Hello there",
        "Hi there",
        "Hey there",
        "Greetings",
        "Good day",
        "Hello!",
        "Hi!",
        "Hey!",
        "Salaam",
        "Assalam o Alaikum",
        "Hope you're doing well",
        "How are you",
        "Dear Customer"
    ]
    
    import random
    return {"greeting": random.choice(greetings)}


@api_router.post("/whatsapp-link")
async def generate_whatsapp_link(request: WhatsAppRequest):
    """
    Generate WhatsApp link for a phone number
    """
    # Clean phone number
    cleaned_phone = ''.join(filter(str.isdigit, request.phone))
    
    # If no country code and phone doesn't start with +, you might need to add it
    if request.country_code and not cleaned_phone.startswith(request.country_code.replace('+', '')):
        # Get country dial code mapping
        country_dial_codes = {
            'US': '1', 'IN': '91', 'GB': '44', 'AE': '971', 'SA': '966',
            'CA': '1', 'AU': '61', 'PK': '92', 'BD': '880'
        }
        dial_code = country_dial_codes.get(request.country_code, '')
        if dial_code:
            cleaned_phone = dial_code + cleaned_phone
    
    return {
        "whatsapp_link": f"https://wa.me/{cleaned_phone}",
        "whatsapp_web": f"https://web.whatsapp.com/send?phone={cleaned_phone}"
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
