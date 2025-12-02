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


@api_router.post("/migrate-preview-data")
async def migrate_preview_data():
    """
    One-time migration endpoint to copy data from preview to production
    This should only be called once after initial deployment
    """
    try:
        # Check if data already exists (to prevent accidental re-migration)
        existing_customers = await db.customers.count_documents({})
        if existing_customers > 100:
            return {
                "success": False,
                "message": f"Database already has {existing_customers} customers. Migration already completed or not needed."
            }
        
        logger.info("🔄 Starting database migration from preview to production...")
        
        # Connect to preview database (localhost MongoDB)
        preview_client = AsyncIOMotorClient("mongodb://localhost:27017")
        preview_db = preview_client.shopify_customers_db
        
        # Collections to migrate
        collections_to_migrate = ["agents", "customers", "stores", "stock", "tcs_config", "status_checks"]
        
        migration_results = {}
        
        for collection_name in collections_to_migrate:
            try:
                # Get all documents from preview
                preview_docs = await preview_db[collection_name].find({}, {"_id": 0}).to_list(None)
                
                if preview_docs:
                    # Insert into production database
                    await db[collection_name].insert_many(preview_docs)
                    migration_results[collection_name] = len(preview_docs)
                    logger.info(f"✅ Migrated {len(preview_docs)} documents to {collection_name}")
                else:
                    migration_results[collection_name] = 0
                    logger.info(f"⚠️  No documents to migrate for {collection_name}")
                    
            except Exception as e:
                logger.error(f"❌ Error migrating {collection_name}: {str(e)}")
                migration_results[collection_name] = f"Error: {str(e)}"
        
        preview_client.close()
        
        logger.info("✅ Database migration completed!")
        
        return {
            "success": True,
            "message": "Database migration completed successfully",
            "migrated": migration_results
        }
        
    except Exception as e:
        logger.error(f"Error during migration: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")


@api_router.post("/init-admin")
async def initialize_admin():
    """
    One-time initialization endpoint to create default admin user
    Only works if no admin exists yet
    """
    try:
        import hashlib
        
        # Check if any admin already exists
        existing_admin = await db.agents.find_one({"username": "admin"})
        if existing_admin:
            return {
                "success": False,
                "message": "Admin user already exists"
            }
        
        # Create default admin
        admin_password = "admin123"
        hashed_password = hashlib.sha256(admin_password.encode()).hexdigest()
        
        admin_user = {
            "id": "admin-default-user",
            "username": "admin",
            "password": hashed_password,
            "full_name": "Administrator",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.agents.insert_one(admin_user)
        
        logger.info("✅ Default admin user initialized")
        
        return {
            "success": True,
            "message": "Admin user created successfully",
            "credentials": {
                "username": "admin",
                "password": "admin123"
            }
        }
    except Exception as e:
        logger.error(f"Error initializing admin: {str(e)}")
        raise HTTPException(status_code=500, detail="Admin initialization failed")


@api_router.post("/agents/signup")
async def signup_agent(agent_data: AgentCreate):
    """
    Agent registration/signup
    """
    try:
        import hashlib
        
        # Check if username already exists
        existing_agent = await db.agents.find_one({"username": agent_data.username})
        if existing_agent:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Hash password
        hashed_password = hashlib.sha256(agent_data.password.encode()).hexdigest()
        
        # Create new agent
        new_agent = {
            "id": str(uuid.uuid4()),
            "username": agent_data.username,
            "password": hashed_password,
            "full_name": agent_data.full_name,
            "role": "agent",  # Default role
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.agents.insert_one(new_agent)
        
        logger.info(f"✅ New agent registered: {agent_data.username}")
        
        return {
            "success": True,
            "message": "Agent registered successfully",
            "agent": {
                "id": new_agent["id"],
                "username": new_agent["username"],
                "full_name": new_agent["full_name"],
                "role": new_agent["role"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering agent: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed")


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
async def sync_shopify_orders(store_name: str, days_back: int = 3650, full_sync: bool = False):
    """
    Manually sync orders from Shopify for a specific store
    
    Args:
        store_name: Store to sync
        days_back: Number of days to look back (default 3650 = ~10 years from 2015)
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
            
            # Also fetch cancelled orders separately
            cancelled_orders = sync.fetch_orders(limit=250, status="cancelled", created_after=created_after, fetch_all=True)
            logger.info(f"Fetched {len(cancelled_orders)} cancelled orders separately")
            orders.extend(cancelled_orders)
        else:
            # Fetch orders from last X days
            created_after = (datetime.now(timezone.utc) - timedelta(days=days_back)).isoformat()
            logger.info(f"Syncing {store_name} orders from last {days_back} days")
            # Use fetch_all=True when syncing more than 30 days to get all historical orders
            fetch_all_orders = days_back > 30
            # Fetch all statuses including cancelled orders
            orders = sync.fetch_orders(limit=250, status="any", created_after=created_after, fetch_all=fetch_all_orders)
            
            # Also fetch cancelled orders separately (Shopify API quirk - "any" doesn't always include cancelled)
            cancelled_orders = sync.fetch_orders(limit=250, status="cancelled", created_after=created_after, fetch_all=fetch_all_orders)
            logger.info(f"Fetched {len(cancelled_orders)} cancelled orders separately")
            orders.extend(cancelled_orders)
        
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
async def sync_shopify_orders_fast(store_name: str, days_back: int = 3650):
    """
    PHASE 1: Fast concurrent sync with incremental updates
    10x faster than regular sync - perfect for daily updates
    
    Args:
        store_name: Store to sync
        days_back: Number of days to look back (default 3650 = ~10 years from 2015)
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
        
        # Fetch orders concurrently (including cancelled)
        orders = await sync.fetch_orders_concurrent(created_after=created_after, status="any", max_batches=20)
        
        # Also fetch cancelled orders separately
        cancelled_orders = await sync.fetch_orders_concurrent(created_after=created_after, status="cancelled", max_batches=20)
        logger.info(f"Fast sync: Fetched {len(cancelled_orders)} cancelled orders separately")
        orders.extend(cancelled_orders)
        
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

# Old TCS configure endpoint removed - replaced with improved version below

@api_router.get("/tcs/credentials")
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


@api_router.post("/tcs/configure")
async def configure_tcs_api(config_data: dict):
    """
    Configure TCS API credentials
    Supports both bearer token and username/password authentication
    """
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
        
        # Optional: TCS customer number for payment APIs
        customer_no = config_data.get("customer_no", "").strip()
        if customer_no:
            tcs_config["customer_no"] = customer_no
        
        # Save to database (upsert)
        await db.tcs_config.update_one(
            {"service": "tcs_pakistan"},
            {"$set": tcs_config},
            upsert=True
        )
        
        logger.info(f"✅ TCS API configured with {auth_type} authentication")
        
        return {
            "success": True,
            "message": f"TCS API configured successfully with {auth_type} authentication",
            "auth_type": auth_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error configuring TCS API: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/tcs/sync-payment-status")
async def sync_tcs_payment_status():
    """
    Sync COD payment status from TCS API for all delivered orders
    Uses the Payment Status API to check if COD has been paid
    """
    try:
        # Get TCS credentials
        config = await db.tcs_config.find_one({"service": "tcs_pakistan"}, {"_id": 0})
        if not config:
            raise HTTPException(status_code=400, detail="TCS not configured")
        
        customer_no = config.get("customer_no")
        if not customer_no:
            raise HTTPException(status_code=400, detail="TCS customer number not configured")
        
        # Get delivered orders with tracking numbers
        customers = await db.customers.find({
            "tracking_number": {"$ne": None, "$exists": True},
            "delivery_status": "DELIVERED",
            "$or": [
                {"cod_payment_status": {"$ne": "RECEIVED"}},
                {"cod_payment_status": {"$exists": False}}
            ]
        }, {"_id": 0, "tracking_number": 1, "customer_id": 1, "store_name": 1, "order_number": 1}).to_list(500)
        
        if not customers:
            return {
                "success": True,
                "message": "No delivered orders pending payment verification",
                "checked": 0
            }
        
        # Initialize TCS tracker
        from tcs_tracking import TCSTracker
        if config.get('auth_type') == 'bearer':
            tracker = TCSTracker(bearer_token=config.get('bearer_token'), token_expiry=config.get('token_expiry'))
        else:
            tracker = TCSTracker(username=config.get('username'), password=config.get('password'))
        
        checked_count = 0
        paid_count = 0
        errors = []
        
        # Check payment status for each order
        for customer in customers[:100]:  # Limit to 100 per request
            try:
                tracking_number = customer['tracking_number']
                payment_data = tracker.get_payment_status(customer_no, tracking_number)
                
                if payment_data:
                    # Update customer with payment status
                    update_fields = {
                        "cod_payment_status": payment_data['payment_status'],
                        "cod_amount": payment_data['cod_amount'],
                        "cod_paid_amount": payment_data['paid_amount'],
                        "cod_balance": payment_data['balance'],
                        "cod_payment_date": payment_data['payment_date'],
                        "cod_payment_updated_at": datetime.now(timezone.utc).isoformat()
                    }
                    
                    await db.customers.update_one(
                        {"customer_id": customer['customer_id'], "store_name": customer['store_name']},
                        {"$set": update_fields}
                    )
                    
                    checked_count += 1
                    if payment_data['payment_status'] in ['PAID', 'PARTIAL']:
                        paid_count += 1
                        logger.info(f"✅ COD payment {payment_data['payment_status']} for order {customer.get('order_number')}")
                        
            except Exception as e:
                errors.append(f"{tracking_number}: {str(e)}")
                logger.error(f"Error checking payment for {tracking_number}: {str(e)}")
                continue
        
        return {
            "success": True,
            "message": f"Payment status checked: {checked_count} orders, {paid_count} paid/partial",
            "checked": checked_count,
            "paid": paid_count,
            "errors": errors if errors else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in TCS payment sync: {str(e)}")
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
            # Get customer data first to check old status
            customer = await db.customers.find_one(
                {"tracking_number": tracking_number},
                {"_id": 0, "customer_id": 1, "store_name": 1, "delivery_status": 1, "order_skus": 1, "order_number": 1, "stock_deducted": 1}
            )
            
            if customer:
                new_status = tracking_data.get('normalized_status')
                old_status = customer.get('delivery_status')
                
                await db.customers.update_one(
                    {"tracking_number": tracking_number},
                    {"$set": {
                        "delivery_status": new_status,
                        "delivery_location": tracking_data.get('current_location'),
                        "delivery_updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # AUTO-DEDUCT STOCK WHEN STATUS CHANGES TO DELIVERED
                if new_status == 'DELIVERED' and old_status != 'DELIVERED':
                    # Check if stock not already deducted
                    if not customer.get('stock_deducted'):
                        from inventory_manager import InventoryManager
                        inv_manager = InventoryManager(db)
                        
                        deduct_result = await inv_manager.deduct_stock_on_delivery(
                            customer.get('order_skus', []),
                            customer['customer_id'],
                            customer.get('order_number', 'N/A')
                        )
                        
                        if deduct_result['success']:
                            await db.customers.update_one(
                                {"customer_id": customer['customer_id'], "store_name": customer['store_name']},
                                {"$set": {
                                    "stock_deducted": True,
                                    "stock_deducted_at": datetime.now(timezone.utc).isoformat(),
                                    "payment_status": "DUE"  # Set payment status to DUE for COD orders
                                }}
                            )
                            logger.info(f"✅ Auto-deducted stock for order {customer.get('order_number')}")
        
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
    Immediately syncs with TCS API and updates delivery status
    """
    try:
        # Get TCS credentials
        config = await db.tcs_config.find_one({"service": "tcs_pakistan"}, {"_id": 0})
        if not config:
            raise HTTPException(status_code=400, detail="TCS not configured")
        
        # Get customers with tracking numbers (including all statuses to update)
        customers = await db.customers.find({
            "tracking_number": {"$ne": None, "$exists": True}
        }, {"_id": 0, "tracking_number": 1, "customer_id": 1, "store_name": 1, "delivery_status": 1, "order_skus": 1, "order_number": 1, "stock_deducted": 1}).to_list(1000)
        
        if not customers:
            return {
                "success": True,
                "message": "No tracking numbers to update",
                "synced_count": 0
            }
        
        # Initialize TCS tracker
        from tcs_tracking import TCSTracker
        if config.get('auth_type') == 'bearer':
            tracker = TCSTracker(bearer_token=config.get('bearer_token'), token_expiry=config.get('token_expiry'))
        else:
            tracker = TCSTracker(username=config.get('username'), password=config.get('password'))
        
        synced_count = 0
        updated_count = 0
        errors = []
        
        # Sync in batches to avoid timeouts
        for customer in customers[:100]:  # Limit to 100 per request
            try:
                tracking_number = customer['tracking_number']
                tracking_data = tracker.track_consignment(tracking_number)
                
                if tracking_data and tracking_data.get('normalized_status') not in ['NOT_FOUND', None]:
                    new_status = tracking_data.get('normalized_status')
                    old_status = customer.get('delivery_status')
                    
                    # Update delivery status
                    await db.customers.update_one(
                        {"customer_id": customer['customer_id'], "store_name": customer['store_name']},
                        {"$set": {
                            "delivery_status": new_status,
                            "delivery_location": tracking_data.get('current_location'),
                            "delivery_updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    synced_count += 1
                    
                    # AUTO-DEDUCT STOCK WHEN STATUS CHANGES TO DELIVERED
                    if new_status == 'DELIVERED' and old_status != 'DELIVERED':
                        if not customer.get('stock_deducted'):
                            from inventory_manager import InventoryManager
                            inv_manager = InventoryManager(db)
                            
                            deduct_result = await inv_manager.deduct_stock_on_delivery(
                                customer.get('order_skus', []),
                                customer['customer_id'],
                                customer.get('order_number', 'N/A')
                            )
                            
                            if deduct_result['success']:
                                await db.customers.update_one(
                                    {"customer_id": customer['customer_id'], "store_name": customer['store_name']},
                                    {"$set": {
                                        "stock_deducted": True,
                                        "stock_deducted_at": datetime.now(timezone.utc).isoformat(),
                                        "payment_status": "DUE"
                                    }}
                                )
                                logger.info(f"✅ Auto-deducted stock for order {customer.get('order_number')}")
                                updated_count += 1
                    
                    # RESTORE STOCK WHEN ORDER IS RETURNED
                    elif new_status == 'RETURNED' and old_status != 'RETURNED':
                        if customer.get('stock_deducted'):
                            order_skus = customer.get('order_skus', [])
                            store_name = customer.get('store_name')
                            
                            if order_skus and store_name:
                                for sku_data in order_skus:
                                    sku = sku_data.get('sku')
                                    quantity = sku_data.get('quantity', 1)
                                    
                                    if sku:
                                        await db.inventory_items.update_one(
                                            {"sku": sku.upper(), "store_name": store_name},
                                            {"$inc": {"quantity": quantity}},
                                            upsert=False
                                        )
                                
                                await db.customers.update_one(
                                    {"customer_id": customer['customer_id'], "store_name": customer['store_name']},
                                    {"$set": {
                                        "stock_deducted": False,
                                        "stock_restored": True,
                                        "stock_restored_at": datetime.now(timezone.utc).isoformat(),
                                        "payment_status": "refunded"
                                    }}
                                )
                                logger.info(f"✅ Auto-restored stock for returned order {customer.get('order_number')}")
                                updated_count += 1
                        
            except Exception as e:
                errors.append(f"{tracking_number}: {str(e)}")
                logger.error(f"Error tracking {tracking_number}: {str(e)}")
                continue
        
        return {
            "success": True,
            "message": f"TCS sync completed: {synced_count} orders synced, {updated_count} stock updates",
            "synced_count": synced_count,
            "stock_updates": updated_count,
            "errors": errors if errors else None
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


# ========================================
# INVENTORY MANAGEMENT ENDPOINTS
# ========================================

from inventory_manager import InventoryManager

inventory_manager = InventoryManager(db)


@api_router.get("/inventory")
async def get_inventory():
    """
    Get all inventory items with stats
    """
    try:
        inventory_items = await db.inventory.find({}, {"_id": 0}).sort("sku", 1).to_list(10000)
        stats = await inventory_manager.get_inventory_stats()
        
        return {
            "success": True,
            "inventory": inventory_items,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Error fetching inventory: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/inventory/upload")
async def upload_inventory_excel(file: UploadFile = File(...)):
    """
    Upload Excel file with inventory (SKU, Product Name, Opening Stock, Reorder Level)
    """
    try:
        import openpyxl
        from io import BytesIO
        
        contents = await file.read()
        wb = openpyxl.load_workbook(BytesIO(contents))
        sheet = wb.active
        
        items_added = 0
        errors = []
        
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            try:
                if not row[0]:  # Skip if SKU is empty
                    continue
                
                sku = str(row[0]).strip()
                product_name = str(row[1]).strip() if row[1] else "Unknown Product"
                opening_stock = int(row[2]) if row[2] else 0
                reorder_level = int(row[3]) if row[3] else 5
                
                result = await inventory_manager.set_opening_stock(sku, product_name, opening_stock, reorder_level)
                
                if result['success']:
                    items_added += 1
                else:
                    errors.append(f"Row {row_idx}: {result.get('error')}")
                    
            except Exception as e:
                errors.append(f"Row {row_idx}: {str(e)}")
                continue
        
        return {
            "success": True,
            "message": f"Processed {items_added} inventory items",
            "items_added": items_added,
            "errors": errors if errors else None
        }
        
    except Exception as e:
        logger.error(f"Error uploading inventory: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/inventory/upload/{store_name}")
async def upload_inventory_for_store(store_name: str, file: UploadFile = File(...)):
    """
    Upload Excel file with inventory for a specific store
    Expected columns: SKU, Size, color, cost, BOX NO
    Each row counts as 1 unit of quantity
    """
    try:
        import openpyxl
        from io import BytesIO
        
        contents = await file.read()
        wb = openpyxl.load_workbook(BytesIO(contents))
        sheet = wb.active
        
        items_added = 0
        items_updated = 0
        errors = []
        
        # Track SKU counts (each row = 1 unit)
        sku_counts = {}
        sku_details = {}
        
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            try:
                # Expected columns: BOX NO, SKU, Size, color, cost
                if not row or len(row) < 2:
                    continue
                
                box_no = str(row[0]).strip() if row[0] else ""
                sku = str(row[1]).strip() if row[1] else ""
                size = str(row[2]).strip() if row[2] and len(row) > 2 else ""
                color = str(row[3]).strip() if row[3] and len(row) > 3 else ""
                cost = str(row[4]).strip() if row[4] and len(row) > 4 else ""
                
                if not sku:
                    continue
                
                sku_upper = sku.upper()
                
                # Count occurrences
                if sku_upper not in sku_counts:
                    sku_counts[sku_upper] = 0
                    sku_details[sku_upper] = {
                        "size": size,
                        "color": color,
                        "cost": cost,
                        "box_no": box_no
                    }
                
                sku_counts[sku_upper] += 1
                    
            except Exception as e:
                errors.append(f"Row {row_idx}: {str(e)}")
                continue
        
        # Now save to database
        for sku_upper, quantity in sku_counts.items():
            try:
                details = sku_details[sku_upper]
                
                existing = await db.inventory_items.find_one(
                    {"sku": sku_upper, "store_name": store_name},
                    {"_id": 0}
                )
                
                if existing:
                    # Update existing
                    await db.inventory_items.update_one(
                        {"sku": sku_upper, "store_name": store_name},
                        {"$inc": {"quantity": quantity},
                         "$set": {
                            "size": details["size"],
                            "color": details["color"],
                            "cost": details["cost"],
                            "box_no": details["box_no"],
                            "updated_at": datetime.now(timezone.utc).isoformat()
                         }}
                    )
                    items_updated += 1
                else:
                    # Create new
                    inventory_item = {
                        "sku": sku_upper,
                        "store_name": store_name,
                        "quantity": quantity,
                        "size": details["size"],
                        "color": details["color"],
                        "cost": details["cost"],
                        "box_no": details["box_no"],
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.inventory_items.insert_one(inventory_item)
                    items_added += 1
                    
            except Exception as e:
                errors.append(f"SKU {sku_upper}: {str(e)}")
                continue
        
        return {
            "success": True,
            "message": f"Processed {items_added + items_updated} items for {store_name}",
            "items_added": items_added,
            "items_updated": items_updated,
            "errors": errors if errors else None
        }
        
    except Exception as e:
        logger.error(f"Error uploading inventory: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/inventory/items")
async def get_inventory_items(store_name: Optional[str] = None):
    """
    Get inventory items, optionally filtered by store
    """
    try:
        query = {}
        if store_name:
            query["store_name"] = store_name
        
        items = await db.inventory_items.find(query, {"_id": 0}).sort("sku", 1).to_list(10000)
        
        return {
            "success": True,
            "items": items
        }
    except Exception as e:
        logger.error(f"Error fetching inventory items: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/customers/{customer_id}")
async def update_customer_order(customer_id: str, update_data: dict):
    """
    Update customer order details (calling status, return reason, remarks, financial data)
    """
    try:
        # Find customer
        customer = await db.customers.find_one({"customer_id": customer_id}, {"_id": 0})
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Prepare update fields
        update_fields = {}
        
        if "calling_status" in update_data:
            update_fields["calling_status"] = update_data["calling_status"]
        
        if "return_reason" in update_data:
            update_fields["return_reason"] = update_data["return_reason"]
        
        if "remarks" in update_data:
            update_fields["remarks"] = update_data["remarks"]
        
        if "retail_amount" in update_data:
            update_fields["retail_amount"] = float(update_data["retail_amount"])
        
        if "cost" in update_data:
            update_fields["cost"] = float(update_data["cost"])
        
        if "tcs_charges" in update_data:
            update_fields["tcs_charges"] = float(update_data["tcs_charges"])
        
        # Confirmation tracker fields
        if "confirmation_status" in update_data:
            update_fields["confirmation_status"] = update_data["confirmation_status"]
        
        if "dubai_tracking_number" in update_data:
            update_fields["dubai_tracking_number"] = update_data["dubai_tracking_number"]
        
        if "confirmation_notes" in update_data:
            update_fields["confirmation_notes"] = update_data["confirmation_notes"]
        
        # Purchase tracker fields (China imports)
        if "purchase_status" in update_data:
            update_fields["purchase_status"] = update_data["purchase_status"]
        
        if "china_tracking_number" in update_data:
            update_fields["china_tracking_number"] = update_data["china_tracking_number"]
        
        if "purchase_cost_pkr" in update_data:
            update_fields["purchase_cost_pkr"] = float(update_data["purchase_cost_pkr"])
        
        if "shipping_cost_pkr" in update_data:
            update_fields["shipping_cost_pkr"] = float(update_data["shipping_cost_pkr"])
        
        if "customs_duty_pkr" in update_data:
            update_fields["customs_duty_pkr"] = float(update_data["customs_duty_pkr"])
        
        if "purchase_notes" in update_data:
            update_fields["purchase_notes"] = update_data["purchase_notes"]
        
        # Calculate profit
        retail = update_fields.get("retail_amount", customer.get("retail_amount", customer.get("total_spent", 0)))
        cost = update_fields.get("cost", customer.get("cost", 0))
        tcs = update_fields.get("tcs_charges", customer.get("tcs_charges", 0))
        update_fields["profit"] = retail - cost - tcs
        
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update customer
        await db.customers.update_one(
            {"customer_id": customer_id},
            {"$set": update_fields}
        )
        
        return {
            "success": True,
            "message": "Customer order updated successfully",
            "updated_fields": update_fields
        }
        
    except Exception as e:
        logger.error(f"Error updating customer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/tcs/upload-payment")
async def upload_tcs_payment_data(file: UploadFile = File(...)):
    """
    Upload TCS COD payment Excel file
    Expected columns: Consignment Number, Customer Reference, Delivery Status, COD Amount, BALANCE_PAYABLE, etc.
    Matches by tracking number and updates payment status
    """
    try:
        import openpyxl
        from io import BytesIO
        
        contents = await file.read()
        wb = openpyxl.load_workbook(BytesIO(contents))
        sheet = wb.active
        
        matched = 0
        not_found = 0
        errors = []
        
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            try:
                if not row or len(row) < 3:
                    continue
                
                # Expected columns based on the file analysis:
                # Sr#, Consignment Number, Customer Reference, Booking Date, Consignee, Origin, Destination, 
                # Weight, Payment Period, Delivery Status, COD Amount, Shipping Chg, WHGST, WHIT, ADDWHIT, 
                # ADVANCE_PAYMENT_DATE, BALANCE_PAYABLE
                
                consignment_number = str(row[0]).strip() if row[0] else ""
                customer_reference = str(row[1]).strip() if row[1] and len(row) > 1 else ""
                delivery_status = str(row[9]).strip() if row[9] and len(row) > 9 else ""
                balance_payable = row[16] if len(row) > 16 else None
                
                if not consignment_number:
                    continue
                
                # Try to match by consignment number (tracking number)
                customer = await db.customers.find_one(
                    {"tracking_number": consignment_number},
                    {"_id": 0}
                )
                
                if customer:
                    # Determine payment status based on BALANCE_PAYABLE
                    payment_received = False
                    if balance_payable is not None:
                        try:
                            balance = float(balance_payable)
                            # If balance is 0 or negative, payment is received
                            payment_received = balance <= 0
                        except (ValueError, TypeError):
                            pass
                    
                    # Update customer with payment status
                    await db.customers.update_one(
                        {"customer_id": customer["customer_id"]},
                        {"$set": {
                            "cod_payment_status": "RECEIVED" if payment_received else "PENDING",
                            "cod_payment_balance": balance_payable,
                            "payment_period": str(row[8]) if len(row) > 8 and row[8] else None,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    matched += 1
                else:
                    not_found += 1
                    
            except Exception as e:
                errors.append(f"Row {row_idx}: {str(e)}")
                continue
        
        return {
            "success": True,
            "message": f"Processed TCS payment data: {matched} matched, {not_found} not found",
            "matched": matched,
            "not_found": not_found,
            "errors": errors if errors else None
        }
        
    except Exception as e:
        logger.error(f"Error uploading TCS payment data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/inventory/add")
async def add_inventory_item(
    sku: str,
    product_name: str,
    opening_stock: int = 0,
    reorder_level: int = 5
):
    """
    Add single inventory item manually
    """
    try:
        result = await inventory_manager.set_opening_stock(sku, product_name, opening_stock, reorder_level)
        
        if result['success']:
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get('error'))
            
    except Exception as e:
        logger.error(f"Error adding inventory item: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/inventory/adjust")
async def adjust_inventory(
    sku: str,
    adjustment: int,
    reason: str = "Manual adjustment",
    user: str = "admin"
):
    """
    Manually adjust stock quantity
    """
    try:
        result = await inventory_manager.adjust_stock(sku, adjustment, reason, user)
        
        if result['success']:
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get('error'))
            
    except Exception as e:
        logger.error(f"Error adjusting inventory: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/inventory/history/{sku}")
async def get_inventory_history(sku: str, limit: int = 50):
    """
    Get stock transaction history for a SKU
    """
    try:
        history = await inventory_manager.get_stock_history(sku, limit)
        
        return {
            "success": True,
            "sku": sku,
            "history": history
        }
    except Exception as e:
        logger.error(f"Error getting inventory history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/inventory/deduct-on-delivery")
async def manual_stock_deduction(
    customer_id: str,
    store_name: str
):
    """
    Manually trigger stock deduction for a delivered order
    Used for testing or corrections
    """
    try:
        # Get customer order
        customer = await db.customers.find_one(
            {"customer_id": customer_id, "store_name": store_name},
            {"_id": 0}
        )
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        if customer.get('delivery_status') != 'DELIVERED':
            raise HTTPException(status_code=400, detail="Order not yet delivered")
        
        # Check if already deducted
        if customer.get('stock_deducted'):
            return {
                "success": False,
                "message": "Stock already deducted for this order"
            }
        
        # Deduct stock
        result = await inventory_manager.deduct_stock_on_delivery(
            customer.get('order_skus', []),
            customer_id,
            customer.get('order_number', 'N/A')
        )
        
        # Mark as deducted
        if result['success']:
            await db.customers.update_one(
                {"customer_id": customer_id, "store_name": store_name},
                {"$set": {"stock_deducted": True, "stock_deducted_at": datetime.now(timezone.utc).isoformat()}}
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error in manual stock deduction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/upload-orders-csv")
async def upload_shopify_orders_csv(file: UploadFile = File(...), store_name: str = "tnvcollectionpk"):
    """
    Upload Shopify orders CSV export - COMPLETE ORDER DATA including cancelled orders
    This properly imports: order_number, fulfillment_status, tracking_number, cancelled_at
    """
    try:
        from csv_orders_import import parse_shopify_orders_csv_full
        
        # Read CSV content
        content = await file.read()
        csv_text = content.decode('utf-8')
        
        logger.info(f"📄 Received orders CSV: {file.filename}, size: {len(csv_text)} bytes")
        
        # Parse CSV with full order details
        orders_list = parse_shopify_orders_csv_full(csv_text, store_name)
        
        logger.info(f"✅ Parsed {len(orders_list)} orders from CSV")
        
        # Upsert orders into database
        updated_count = 0
        inserted_count = 0
        
        for order in orders_list:
            # Find existing order by order_number
            existing = await db.customers.find_one({
                "order_number": order['order_number'],
                "store_name": store_name
            })
            
            if existing:
                # Update existing order
                await db.customers.update_one(
                    {"_id": existing["_id"]},
                    {"$set": order}
                )
                updated_count += 1
            else:
                # Insert new order
                await db.customers.insert_one(order)
                inserted_count += 1
        
        logger.info(f"✅ CSV Import: {inserted_count} new, {updated_count} updated")
        
        return {
            "success": True,
            "message": "Orders imported successfully",
            "inserted": inserted_count,
            "updated": updated_count,
            "total": len(orders_list)
        }
    
    except Exception as e:
        logger.error(f"❌ CSV upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/upload-csv")
async def upload_shopify_csv(file: UploadFile = File(...), store_name: str = "Default Store", shop_url: str = ""):
    """
    Upload Shopify orders CSV export and extract customer data (OLD - customer-level only)
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
    confirmation_status: Optional[str] = None,  # "PENDING", "PURCHASED", "NOT_PURCHASED", "CANCELED"
    purchase_status: Optional[str] = None,  # "ORDERED", "SHIPPED", "IN_TRANSIT", "ARRIVED_PAKISTAN", "DELIVERED_WAREHOUSE"
    china_tracking: Optional[str] = None,  # "true" to filter orders with China tracking numbers (X-prefix)
    tcs_only: Optional[str] = None,  # "true" to exclude China tracking, show only TCS tracking
    year: Optional[str] = None,  # Filter by year (e.g., "2024", "2023")
    sort_by: Optional[str] = None,  # Sort options: "date_desc", "date_asc"
    search: Optional[str] = None,  # Search across multiple fields
    page: int = 1,
    limit: int = 100
):
    """
    Get customers with pagination, filtered by size, store, messaged status, country, agent, stock availability, fulfillment, delivery, payment status, and confirmation status
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
    if confirmation_status and confirmation_status != "all":
        query['confirmation_status'] = confirmation_status
    if purchase_status and purchase_status != "all":
        query['purchase_status'] = purchase_status
    if china_tracking == "true":
        # Purchase tracker - orders with tracking numbers starting with 'X' (China Post)
        query['tracking_number'] = {"$regex": "^X", "$options": "i"}
    if tcs_only == "true":
        # Dispatch tracker - ONLY orders with valid TCS tracking numbers (exclude China Post, null, and empty)
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
            # Filter by year using last_order_date
            from datetime import datetime
            start_date = datetime(year_int, 1, 1)
            end_date = datetime(year_int, 12, 31, 23, 59, 59)
            query['last_order_date'] = {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        except ValueError:
            pass
    
    # Search across multiple fields
    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query['$or'] = [
            {"order_number": search_regex},
            {"first_name": search_regex},
            {"last_name": search_regex},
            {"email": search_regex},
            {"phone": search_regex},
            {"tracking_number": search_regex}
        ]
    
    # Calculate skip value for pagination
    skip = (page - 1) * limit
    
    # If filtering by stock, we need to fetch more to account for filtering
    fetch_limit = limit * 10 if stock_availability else limit
    
    # Determine sort order
    sort_field = "last_order_date"
    sort_direction = -1  # Default: newest first
    if sort_by == "date_asc":
        sort_direction = 1  # Oldest first
    elif sort_by == "date_desc":
        sort_direction = -1  # Newest first
    
    # Get customers with pagination and sorting
    customers = await db.customers.find(query, {"_id": 0}).sort(sort_field, sort_direction).skip(skip).limit(fetch_limit).to_list(fetch_limit)
    
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
    payment_status: Optional[str] = None,
    confirmation_status: Optional[str] = None,
    purchase_status: Optional[str] = None,
    china_tracking: Optional[str] = None,
    tcs_only: Optional[str] = None,
    year: Optional[str] = None,
    search: Optional[str] = None
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
    if confirmation_status and confirmation_status != "all":
        query['confirmation_status'] = confirmation_status
    if purchase_status and purchase_status != "all":
        query['purchase_status'] = purchase_status
    if china_tracking == "true":
        query['tracking_number'] = {"$regex": "^X", "$options": "i"}
    if tcs_only == "true":
        # ONLY orders with valid TCS tracking numbers (exclude China Post, null, and empty)
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
            from datetime import datetime
            start_date = datetime(year_int, 1, 1)
            end_date = datetime(year_int, 12, 31, 23, 59, 59)
            query['last_order_date'] = {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        except ValueError:
            pass
    
    # Search across multiple fields
    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query['$or'] = [
            {'first_name': search_regex},
            {'last_name': search_regex},
            {'email': search_regex},
            {'phone': search_regex},
            {'order_number': search_regex},
            {'tracking_number': search_regex}
        ]
    
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


# Include WhatsApp routes from the new modular structure
try:
    from routes.whatsapp import router as whatsapp_router
    api_router.include_router(whatsapp_router)
    logger.info("✅ WhatsApp routes loaded")
except Exception as e:
    logger.warning(f"⚠️ Could not load WhatsApp routes: {str(e)}")

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
