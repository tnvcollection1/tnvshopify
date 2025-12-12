from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, BackgroundTasks, Request, Response
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
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
import asyncio
from whatsapp_service import whatsapp_service
from whatsapp_webhook import router as whatsapp_webhook_router
from whatsapp_marketing import whatsapp_marketing, MARKETING_TEMPLATES
from dynamic_pricing import DynamicPricingEngine
from meta_whatsapp_service import MetaWhatsAppService
from whatsapp_crm_routes import whatsapp_router
from tracking_routes import tracking_router
from finance_reconciliation import get_finance_reconciliation
from routes.facebook import facebook_router, set_database as set_facebook_db
from routes.finance import finance_router, set_database as set_finance_db
from routes.pricing import pricing_router, set_dependencies as set_pricing_deps
from routes.tcs import tcs_router, set_database as set_tcs_db
from routes.customers import customers_router, set_dependencies as set_customers_deps
from routes.clearance import clearance_router, set_dependencies as set_clearance_deps
from inventory_clearance_engine import InventoryClearanceEngine


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize pricing engine with db
pricing_engine = DynamicPricingEngine(db)

# Initialize clearance engine
clearance_engine = InventoryClearanceEngine(db)

# Initialize modular routers with database and dependencies
set_facebook_db(db)
set_finance_db(db)
set_tcs_db(db)
set_customers_deps(db)
set_pricing_deps(db, pricing_engine)
set_clearance_deps(db, clearance_engine)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ==================== PERFORMANCE: In-Memory Caches ====================
# These caches store frequently accessed data to avoid repeated DB queries

# Inventory cache - refreshed every 5 minutes
_inventory_cache = {
    "data": {},  # SKU -> {cost, profit}
    "stock_skus": set(),  # Set of SKUs in stock
    "last_updated": None,
    "ttl_seconds": 300  # 5 minutes
}

async def get_inventory_cache():
    """Get cached inventory data, refresh if stale"""
    global _inventory_cache
    now = datetime.now(timezone.utc)
    
    # Check if cache is valid
    if (_inventory_cache["last_updated"] and 
        (now - _inventory_cache["last_updated"]).total_seconds() < _inventory_cache["ttl_seconds"]):
        return _inventory_cache
    
    # Refresh cache
    try:
        # Fetch inventory for cost/profit calculations
        inventory_items = await db.inventory_v2.find(
            {}, 
            {"_id": 0, "sku": 1, "cost": 1, "profit": 1, "quantity": 1}
        ).to_list(10000)
        
        inventory_map = {}
        stock_skus = set()
        
        for item in inventory_items:
            sku = item.get("sku", "").upper()
            if sku:
                inventory_map[sku] = {
                    "cost": item.get("cost", 0) or 0,
                    "profit": item.get("profit", 0) or 0
                }
                if (item.get("quantity", 0) or 0) > 0:
                    stock_skus.add(sku)
        
        # Also check old stock collection
        stock_items = await db.stock.find({}, {"_id": 0, "sku": 1}).to_list(10000)
        for item in stock_items:
            sku = item.get("sku", "").upper()
            if sku:
                stock_skus.add(sku)
        
        _inventory_cache = {
            "data": inventory_map,
            "stock_skus": stock_skus,
            "last_updated": now,
            "ttl_seconds": 300
        }
        
        logger.info(f"✅ Inventory cache refreshed: {len(inventory_map)} items, {len(stock_skus)} in stock")
    except Exception as e:
        logger.error(f"❌ Error refreshing inventory cache: {str(e)}")
    
    return _inventory_cache

async def invalidate_inventory_cache():
    """Force refresh of inventory cache"""
    global _inventory_cache
    _inventory_cache["last_updated"] = None
    return await get_inventory_cache()

# ==================== END PERFORMANCE CACHES ====================

# Startup and shutdown events for scheduler
@app.on_event("startup")
async def startup_event():
    """Start background scheduler on server startup"""
    logger.info("🚀 Starting server...")
    scheduler = get_scheduler()
    scheduler.start()
    logger.info("✅ Background scheduler initialized")
    
    # Create database indexes for performance
    async def create_indexes():
        try:
            logger.info("📊 Creating database indexes for performance...")
            
            # Customers collection indexes
            await db.customers.create_index("customer_id", unique=True, background=True)
            await db.customers.create_index("order_number", background=True)
            await db.customers.create_index("order_number_int", background=True)
            await db.customers.create_index("store_name", background=True)
            await db.customers.create_index("fulfillment_status", background=True)
            await db.customers.create_index("delivery_status", background=True)
            await db.customers.create_index("payment_status", background=True)
            await db.customers.create_index("last_order_date", background=True)
            await db.customers.create_index("created_at", background=True)
            await db.customers.create_index("tracking_number", background=True)
            
            # Compound indexes for common queries
            await db.customers.create_index([
                ("fulfillment_status", 1),
                ("created_at", -1)
            ], background=True)
            await db.customers.create_index([
                ("store_name", 1),
                ("order_number_int", -1)
            ], background=True)
            
            # Inventory indexes
            await db.inventory_v2.create_index("sku", unique=True, background=True)
            await db.inventory_v2.create_index("store_name", background=True)
            await db.inventory_v2.create_index("quantity", background=True)
            
            # Stock collection index
            await db.stock.create_index("sku", background=True)
            
            logger.info("✅ Database indexes created successfully")
        except Exception as e:
            logger.warning(f"⚠️ Index creation warning (may already exist): {str(e)}")
    
    # Warm up inventory cache
    async def warmup_inventory_cache():
        try:
            logger.info("🔥 Warming up inventory cache...")
            await get_inventory_cache()
            logger.info("✅ Inventory cache warmed up")
        except Exception as e:
            logger.error(f"❌ Error warming up inventory cache: {str(e)}")
    
    # Start dynamic pricing cache warmup in background
    async def warmup_pricing_cache():
        try:
            from dynamic_pricing_engine import dynamic_pricing_engine
            logger.info("🔥 Warming up dynamic pricing cache...")
            
            # Check if cache exists
            cached = await db.dynamic_pricing_cache.find_one({"type": "analysis_report"})
            if not cached:
                logger.info("📊 Running initial pricing analysis (60-day lookback)...")
                result = await dynamic_pricing_engine.analyze_product_velocity(db, days_lookback=60)
                if result.get('success'):
                    await db.dynamic_pricing_cache.update_one(
                        {"type": "analysis_report"},
                        {"$set": {
                            "type": "analysis_report",
                            "data": result,
                            "last_updated": datetime.now(timezone.utc).isoformat()
                        }},
                        upsert=True
                    )
                    logger.info("✅ Pricing cache initialized")
            else:
                logger.info("✅ Pricing cache already exists")
        except Exception as e:
            logger.error(f"❌ Error warming up pricing cache: {str(e)}")
    
    # Run startup tasks in background
    asyncio.create_task(create_indexes())
    asyncio.create_task(warmup_inventory_cache())
    asyncio.create_task(warmup_pricing_cache())


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
    first_name: Optional[str] = None
    last_name: Optional[str] = None
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
    amount_paid: Optional[float] = None  # Amount paid by customer (from TCS Payment API)
    payment_balance: Optional[float] = None  # Remaining balance after deducting delivery charges
    delivery_charges: Optional[float] = None  # TCS delivery charges
    parcel_weight: Optional[float] = None  # Parcel weight in kg
    booking_date: Optional[str] = None  # TCS booking date
    delivery_date: Optional[str] = None  # TCS delivery date
    payment_date: Optional[str] = None  # COD payment date/time (when payment was collected)
    collection_date: Optional[str] = None  # COD collection date
    remittance_date: Optional[str] = None  # COD remittance date
    remittance_amount: Optional[float] = None  # Amount remitted to merchant
    cod_collection_date: Optional[str] = None  # Date when COD was collected by TCS
    cod_remittance_date: Optional[str] = None  # Date when COD was remitted to merchant
    cod_remittance_amount: Optional[float] = None  # Amount remitted to merchant
    abandoned_checkout: Optional[bool] = None  # Whether customer has abandoned checkouts
    abandoned_checkout_value: Optional[float] = None  # Value of abandoned items
    cost: Optional[float] = None  # Total cost from inventory (sum of all SKU costs)
    profit: Optional[float] = None  # Total profit (sum of all SKU profits)


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


class InventoryItemCreate(BaseModel):
    sku: str
    title: str
    quantity: int = 0
    store_name: str = "tnvcollectionpk"
    price: Optional[float] = None
    compare_at_price: Optional[float] = None
    status: str = "active"


class InventoryItemUpdate(BaseModel):
    title: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[float] = None
    compare_at_price: Optional[float] = None
    status: Optional[str] = None


class DeliveryStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    tracking_number: Optional[str] = None


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


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


@api_router.post("/setup/create-demo-user")
async def create_demo_user_endpoint():
    """
    ONE-TIME SETUP: Create demo user for Meta app review
    This endpoint can only be called once - it will fail if demo user already exists
    """
    try:
        import hashlib
        
        # Demo user credentials
        username = "demo_reviewer"
        password = "MetaReview2024!"
        
        # Check if demo user already exists
        existing_user = await db.agents.find_one({"username": username})
        
        if existing_user:
            return {
                "success": True,
                "message": "Demo user already exists",
                "username": username,
                "note": "Demo user was already created"
            }
        
        # Hash password
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        # Create demo user
        demo_user = {
            "id": str(uuid.uuid4()),
            "username": username,
            "password": hashed_password,
            "full_name": "Meta Reviewer",
            "role": "demo",
            "email": "reviewer@meta.com",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None,
            "active": True,
            "permissions": [
                "whatsapp_inbox",
                "whatsapp_templates",
                "whatsapp_campaigns",
                "whatsapp_analytics"
            ]
        }
        
        # Insert into database
        result = await db.agents.insert_one(demo_user)
        
        logger.info("✅ Demo user created successfully for Meta app review")
        
        return {
            "success": True,
            "message": "Demo user created successfully!",
            "username": username,
            "password": password,
            "role": "demo",
            "note": "Demo user can only access WhatsApp CRM features"
        }
        
    except Exception as e:
        logger.error(f"Error creating demo user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create demo user: {str(e)}")


    username: str
    current_password: str
    new_password: str


@api_router.post("/agents/change-password")
async def change_agent_password(password_data: PasswordChange):
    """
    Change agent password
    """
    try:
        import hashlib
        
        # Verify current password
        current_hashed = hashlib.sha256(password_data.current_password.encode()).hexdigest()
        agent = await db.agents.find_one({
            "username": password_data.username,
            "password": current_hashed
        })
        
        if not agent:
            raise HTTPException(status_code=401, detail="Current password is incorrect")
        
        # Validate new password
        if len(password_data.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
        
        # Update password
        new_hashed = hashlib.sha256(password_data.new_password.encode()).hexdigest()
        result = await db.agents.update_one(
            {"username": password_data.username},
            {"$set": {
                "password": new_hashed,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        logger.info(f"Password changed for agent: {password_data.username}")
        
        return {
            "success": True,
            "message": "Password changed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to change password")


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
                "message": "Admin user already exists. Use /api/reset-admin to reset password."
            }
        
        # Create default admin
        admin_password = "admin"
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
                "password": "admin"
            }
        }
    except Exception as e:
        logger.error(f"Error initializing admin: {str(e)}")
        raise HTTPException(status_code=500, detail="Admin initialization failed")


@api_router.post("/reset-admin")
async def reset_admin_password():
    """
    Reset admin password to default (admin/admin)
    Creates admin if doesn't exist, resets password if exists
    """
    try:
        import hashlib
        
        admin_password = "admin"
        hashed_password = hashlib.sha256(admin_password.encode()).hexdigest()
        
        # Check if admin exists
        existing_admin = await db.agents.find_one({"username": "admin"})
        
        if existing_admin:
            # Reset password
            await db.agents.update_one(
                {"username": "admin"},
                {"$set": {"password": hashed_password}}
            )
            logger.info("✅ Admin password reset to default")
            return {
                "success": True,
                "message": "Admin password reset successfully",
                "credentials": {
                    "username": "admin",
                    "password": "admin"
                }
            }
        else:
            # Create new admin
            admin_user = {
                "id": "admin-default-user",
                "username": "admin",
                "password": hashed_password,
                "full_name": "Administrator",
                "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.agents.insert_one(admin_user)
            logger.info("✅ Admin user created with default password")
            return {
                "success": True,
                "message": "Admin user created successfully",
                "credentials": {
                    "username": "admin",
                    "password": "admin"
                }
            }
    except Exception as e:
        logger.error(f"Error resetting admin: {str(e)}")
        raise HTTPException(status_code=500, detail="Admin reset failed")


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
                        "line_items": order_data.get('line_items', []),
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
                    "line_items": order_data.get('line_items', []),
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
            
            # Track order for dynamic pricing
            try:
                await pricing_engine.track_new_order(order_data)
            except Exception as pricing_error:
                logger.warning(f"Failed to track order for pricing: {pricing_error}")
        
        # Update last sync time
        await db.stores.update_one(
            {"store_name": store_name},
            {"$set": {"last_synced_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        logger.info(f"✅ Pricing: Tracked {len(orders)} orders for dynamic pricing")
        
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
                        "line_items": order_data.get('line_items', []),
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
                    "line_items": order_data.get('line_items', []),
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



# ========================================
# DTDC CONFIGURATION ENDPOINTS
# ========================================

class DTDCConfigRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    api_url: Optional[str] = "https://customer.dtdc.in/api"

@api_router.get("/dtdc/credentials")
async def get_dtdc_credentials():
    """Get DTDC API configuration status"""
    try:
        config = await db.dtdc_config.find_one({"service": "dtdc_india"}, {"_id": 0})
        
        if config:
            return {
                "configured": True,
                "username": config.get("username", "")[:5] + "..." if config.get("username") else None,
                "api_url": config.get("api_url", "https://customer.dtdc.in/api")
            }
        else:
            return {"configured": False}
    except Exception as e:
        logger.error(f"Error fetching DTDC credentials: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/dtdc/configure")
async def configure_dtdc_api(config_data: dict):
    """Configure DTDC API credentials for tnvcollection and ashmiaa stores"""
    try:
        username = config_data.get("username", "").strip()
        password = config_data.get("password", "").strip()
        api_url = config_data.get("api_url", "https://customer.dtdc.in/api").strip()
        
        if not username or not password:
            raise HTTPException(status_code=400, detail="Username and password are required")
        
        dtdc_config = {
            "service": "dtdc_india",
            "username": username,
            "password": password,
            "api_url": api_url,
            "configured_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Save to database (upsert)
        await db.dtdc_config.update_one(
            {"service": "dtdc_india"},
            {"$set": dtdc_config},
            upsert=True
        )
        
        logger.info(f"✅ DTDC API configured successfully")
        
        return {
            "success": True,
            "message": "DTDC API configured successfully",
            "api_url": api_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error configuring DTDC API: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@api_router.post("/dtdc/sync-all-tracking")
async def sync_all_dtdc_tracking():
    """
    Sync DTDC tracking data from Shopify fulfillments to local database
    """
    try:
        from shopify_tracking_sync import shopify_tracking_sync
        
        logger.info("Starting DTDC tracking sync from Shopify...")
        
        # Sync tracking data from Shopify fulfillments
        result = await shopify_tracking_sync.sync_tracking_for_orders(db)
        
        if result.get('success'):
            logger.info(f"✅ Successfully synced tracking for {result.get('updated', 0)}/{result.get('total', 0)} orders")
            return {
                "success": True,
                "message": f"Successfully synced tracking data for {result.get('updated', 0)} orders",
                "updated": result.get('updated', 0),
                "total": result.get('total', 0),
                "errors": result.get('errors')
            }
        else:
            raise HTTPException(status_code=500, detail=result.get('error', 'Unknown error'))
            
    except Exception as e:
        logger.error(f"❌ Error syncing DTDC tracking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/dynamic-pricing/analyze")
async def analyze_product_velocity(days_lookback: int = 60):
    """
    Analyze product sales velocity and categorize as A/B/C
    - Category A: Fast-moving (top 20% - 10+ orders in last 60 days)
    - Category B: Medium-moving (next 30% - 3-9 orders in last 60 days)
    - Category C: Slow-moving (bottom 50% - 0-2 orders in last 60 days)
    
    Price multipliers are calculated based on 7-day rolling orders.
    This will update the cached report used by the dashboard.
    """
    try:
        from dynamic_pricing_engine import dynamic_pricing_engine
        
        logger.info(f"🔍 Starting product velocity analysis (last {days_lookback} days)...")
        
        result = await dynamic_pricing_engine.analyze_product_velocity(db, days_lookback)
        
        if result.get('success'):
            categories = result.get('categories', {})
            logger.info(f"✅ Analysis complete:")
            logger.info(f"   Category A (Fast): {len(categories.get('A', []))} products")
            logger.info(f"   Category B (Medium): {len(categories.get('B', []))} products")
            logger.info(f"   Category C (Slow): {len(categories.get('C', []))} products")
            
            # Update cached report
            await db.dynamic_pricing_cache.update_one(
                {"type": "analysis_report"},
                {"$set": {
                    "type": "analysis_report",
                    "data": result,
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
            logger.info("✅ Cached report updated")
            
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get('error', 'Analysis failed'))
            
    except Exception as e:
        logger.error(f"❌ Error analyzing product velocity: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/dynamic-pricing/apply")
async def apply_dynamic_pricing(auto_apply: bool = False, days_lookback: int = 60):
    """
    Apply dynamic pricing based on product velocity analysis (last 60 days)
    - Category A: No discount (fast-moving, 10+ orders)
    - Category B: 10% discount (medium-moving, 3-9 orders)
    - Category C: 20% discount (slow-moving, 0-2 orders)
    
    Price changes are calculated based on 7-day rolling orders.
    Set auto_apply=true to automatically update inventory prices.
    """
    try:
        from dynamic_pricing_engine import dynamic_pricing_engine
        
        # First analyze
        logger.info("🔍 Analyzing product velocity...")
        analysis = await dynamic_pricing_engine.analyze_product_velocity(db, days_lookback)
        
        if not analysis.get('success'):
            raise HTTPException(status_code=500, detail=analysis.get('error', 'Analysis failed'))
        
        recommendations = analysis.get('pricing_recommendations', [])
        
        if not recommendations:
            return {
                'success': True,
                'message': 'No pricing recommendations generated',
                'total_products': 0
            }
        
        # Apply pricing
        logger.info(f"💰 Applying pricing recommendations (auto_apply={auto_apply})...")
        result = await dynamic_pricing_engine.apply_pricing(db, recommendations, auto_apply)
        
        # Include analysis summary
        result['analysis_summary'] = {
            'total_products': analysis.get('total_products', 0),
            'category_a_count': len(analysis.get('categories', {}).get('A', [])),
            'category_b_count': len(analysis.get('categories', {}).get('B', [])),
            'category_c_count': len(analysis.get('categories', {}).get('C', [])),
            'analysis_period_days': days_lookback
        }
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error applying dynamic pricing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/dynamic-pricing/report")
async def get_pricing_report():
    """
    Get current dynamic pricing report with all categorized products
    Returns cached analysis from last run
    """
    try:
        # Get cached analysis from database
        cached_report = await db.dynamic_pricing_cache.find_one(
            {"type": "analysis_report"},
            {"_id": 0}
        )
        
        if not cached_report:
            # Return loading state - cache is being populated in background
            return {
                "success": True,
                "loading": True,
                "message": "Analysis is running in background. Please refresh in a moment.",
                "total_products": 0,
                "categories": {"A": [], "B": [], "C": []}
            }
        
        # Return cached data
        data = cached_report.get('data')
        data['loading'] = False
        data['last_updated'] = cached_report.get('last_updated')
        return data
        
    except Exception as e:
        logger.error(f"❌ Error getting pricing report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class ShopifySyncRequest(BaseModel):
    discounts: Dict[str, float] = {"A": 0, "B": 10, "C": 20}


@api_router.get("/dynamic-pricing/sync-status")
async def get_sync_status():
    """
    Get the status of the last Shopify sync
    """
    try:
        sync_result = await db.dynamic_pricing_cache.find_one(
            {"type": "last_sync_result"},
            {"_id": 0}
        )
        
        if not sync_result:
            return {
                "success": True,
                "has_sync": False,
                "message": "No sync has been run yet"
            }
        
        return {
            "success": True,
            "has_sync": True,
            "updated_count": sync_result.get('updated_count', 0),
            "total_products": sync_result.get('total_products', 0),
            "discounts_applied": sync_result.get('discounts_applied', {}),
            "completed_at": sync_result.get('completed_at'),
            "errors_count": len(sync_result.get('errors', []))
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting sync status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/dynamic-pricing/sync-to-shopify")
async def sync_pricing_to_shopify(request: ShopifySyncRequest, background_tasks: BackgroundTasks):
    """
    Sync dynamic pricing to Shopify with custom discount percentages
    Runs in background and returns immediately
    """
    try:
        from dynamic_pricing_engine import dynamic_pricing_engine
        import shopify
        
        # Store sync request in database for processing by scheduler
        logger.info("📝 Storing sync request for background processing...")
        await db.dynamic_pricing_cache.update_one(
            {"type": "sync_request"},
            {"$set": {
                "type": "sync_request",
                "discounts": request.discounts,
                "status": "pending",
                "requested_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        logger.info("✅ Sync request queued. Will be processed by scheduler.")
        
        # Get total count for response
        cached_report = await db.dynamic_pricing_cache.find_one(
            {"type": "analysis_report"},
            {"_id": 0}
        )
        
        total_products = 0
        if cached_report:
            analysis = cached_report.get('data', {})
            categories = analysis.get('categories', {})
            total_products = sum(len(products) for products in categories.values())
        
        return {
            'success': True,
            'message': 'Sync started in background. This may take several minutes.',
            'total_products': total_products,
            'discounts_applied': request.discounts
        }
        
    except Exception as e:
        logger.error(f"❌ Error starting sync: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
    except Exception as e:
        logger.error(f"❌ Error getting pricing report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/orders/{order_id}/manual-delivery-status")
async def update_manual_delivery_status(order_id: str, status: str, location: str = None, updated_by: str = None):
    """
    Manually update delivery status by employee
    """
    try:
        valid_statuses = ['PENDING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_IN_PROCESS', 'RETURNED', 'UNKNOWN']
        
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        # Find customer
        customer = await db.customers.find_one({'order_number': order_id}, {'_id': 0})
        
        if not customer:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Update delivery status
        update_data = {
            'delivery_status': status,
            'delivery_updated_at': datetime.now(timezone.utc).isoformat(),
            'manually_updated': True,
            'manually_updated_by': updated_by or 'admin',
            'manually_updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        if location:
            update_data['delivery_location'] = location
        
        # If status is RETURN_IN_PROCESS, add return fields
        if status == 'RETURN_IN_PROCESS':
            update_data['return_status'] = 'in_transit'
            update_data['return_received'] = False
            update_data['return_updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # If status is RETURNED, mark as received
        if status == 'RETURNED':
            update_data['return_status'] = 'received'
            update_data['return_received'] = True
            update_data['return_updated_at'] = datetime.now(timezone.utc).isoformat()
        
        result = await db.customers.update_one(
            {'customer_id': customer['customer_id'], 'store_name': customer['store_name']},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update order")
        
        logger.info(f"Manual status update by {updated_by}: Order {order_id} → {status}")
        
        return {
            "success": True,
            "message": f"Delivery status updated to {status}",
            "order_number": order_id,
            "new_status": status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating manual delivery status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/orders/{order_id}/mark-return-received")
async def mark_return_received(order_id: str, received: bool = True, received_by: str = None):
    """
    Mark return as received or not received
    """
    try:
        customer = await db.customers.find_one({'order_number': order_id}, {'_id': 0})
        
        if not customer:
            raise HTTPException(status_code=404, detail="Order not found")
        
        result = await db.customers.update_one(
            {'customer_id': customer['customer_id'], 'store_name': customer['store_name']},
            {'$set': {
                'return_received': received,
                'return_received_by': received_by or 'admin',
                'return_received_at': datetime.now(timezone.utc).isoformat() if received else None,
                'return_status': 'received' if received else 'in_transit',
                'delivery_status': 'RETURNED' if received else 'RETURN_IN_PROCESS'
            }}
        )
        
        logger.info(f"Return marked as {'received' if received else 'not received'} for order {order_id}")
        
        return {
            "success": True,
            "message": f"Return marked as {'received' if received else 'not received'}",
            "order_number": order_id
        }
        
    except Exception as e:
        logger.error(f"Error marking return: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/inventory/v2/overview-stats")
async def get_inventory_overview_stats(
    start_date: str = None,
    end_date: str = None
):
    """Get comprehensive inventory stats with breakdowns by TCS tracking and fulfillment status"""
    try:
        from datetime import datetime, timezone, timedelta
        
        # Aggregate by collection
        collection_pipeline = [
            {"$match": {"collection": {"$exists": True, "$ne": None}}},
            {"$group": {
                "_id": "$collection",
                "count": {"$sum": 1},
                "total_cost": {"$sum": "$cost"}
            }},
            {"$sort": {"count": -1}}
        ]
        
        # Extract size from SKU (get last numeric part, typically shoe size)
        # We'll do this in Python for better control
        all_items_for_agg = await db.inventory_v2.find({}, {"_id": 0, "sku": 1}).to_list(10000)
        
        size_counts = {}
        for item in all_items_for_agg:
            sku = item.get('sku', '')
            parts = sku.split('-')
            # Look for numeric sizes (typically 20-50 for shoes)
            size_found = None
            for part in reversed(parts):  # Start from end
                # Check if it's a number or starts with a number
                import re
                size_match = re.match(r'^(\d+(?:\.\d+)?)', part.strip())
                if size_match:
                    size_num = float(size_match.group(1))
                    if 20 <= size_num <= 50:  # Typical shoe size range
                        size_found = str(int(size_num))
                        break
            
            if size_found:
                size_counts[size_found] = size_counts.get(size_found, 0) + 1
        
        by_size = [{"_id": size, "count": count} for size, count in sorted(size_counts.items(), key=lambda x: float(x[0]) if x[0].replace('.','').isdigit() else 0)]
        
        # Extract color from SKU
        color_pipeline = [
            {"$project": {
                "color": {
                    "$let": {
                        "vars": {
                            "parts": {"$split": ["$sku", "-"]}
                        },
                        "in": {
                            "$cond": {
                                "if": {"$gte": [{"$size": "$$parts"}, 2]},
                                "then": {"$arrayElemAt": ["$$parts", 1]},
                                "else": "Unknown"
                            }
                        }
                    }
                }
            }},
            {"$group": {
                "_id": "$color",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}}
        ]
        
        # Run aggregations
        by_collection = await db.inventory_v2.aggregate(collection_pipeline).to_list(100)
        by_color = await db.inventory_v2.aggregate(color_pipeline).to_list(100)
        
        # Build date filter query
        date_query = {}
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                # Add one day to include the end date
                from datetime import datetime, timedelta
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                end_dt = end_dt + timedelta(days=1)
                date_filter["$lt"] = end_dt.isoformat()
            date_query["created_at"] = date_filter
        
        # Get inventory items with date filter
        all_items = await db.inventory_v2.find(date_query, {
            "_id": 0, 
            "sku": 1,
            "cost": 1, 
            "order_number": 1,
            "created_at": 1
        }).to_list(10000)
        
        # Get today's date for matching unfulfilled orders
        today = datetime.now(timezone.utc).date()
        
        # Get unfulfilled orders from today
        unfulfilled_today = await db.customers.find({
            "fulfillment_status": {"$in": ["unfulfilled", "Unfulfilled", "UNFULFILLED", None]},
            "order_skus": {"$exists": True, "$ne": []},
            "created_at": {"$exists": True}
        }, {
            "_id": 0,
            "order_number": 1,
            "order_skus": 1,
            "total_spent": 1,
            "created_at": 1
        }).to_list(10000)
        
        # Get orders with TCS tracking (using tracking_number field)
        orders_with_tracking = await db.customers.find({
            "tracking_number": {"$exists": True, "$ne": None, "$ne": ""},
            "order_skus": {"$exists": True, "$ne": []}
        }, {
            "_id": 0,
            "order_number": 1,
            "order_skus": 1,
            "delivery_status": 1,
            "tracking_number": 1,
            "total_spent": 1,
            "payment_date": 1,
            "cod_payment_status": 1,
            "created_at": 1
        }).to_list(50000)
        
        # Create mappings
        sku_to_unfulfilled_orders = {}  # SKU -> list of unfulfilled orders from today
        sku_to_tracked_orders = {}  # SKU -> order info with TCS tracking
        
        # Map unfulfilled orders (today only)
        for order in unfulfilled_today:
            try:
                order_date = datetime.fromisoformat(order.get("created_at", "")).date()
                # Only include if from today or yesterday (to account for timezone)
                if (today - order_date).days <= 1:
                    for sku in order.get("order_skus", []):
                        sku_upper = sku.upper().strip()
                        if sku_upper not in sku_to_unfulfilled_orders:
                            sku_to_unfulfilled_orders[sku_upper] = []
                        sku_to_unfulfilled_orders[sku_upper].append({
                            "order_number": order.get("order_number"),
                            "total_spent": order.get("total_spent", 0)
                        })
            except:
                continue
        
        # Map tracked orders (with TCS tracking)
        for order in orders_with_tracking:
            delivery_status = order.get("delivery_status", "")
            payment_status = order.get("cod_payment_status", "")
            payment_date = order.get("payment_date")
            
            # Only include if has actual TCS status
            if delivery_status and delivery_status != "UNKNOWN":
                for sku in order.get("order_skus", []):
                    sku_upper = sku.upper().strip()
                    if sku_upper not in sku_to_tracked_orders:
                        sku_to_tracked_orders[sku_upper] = []
                    sku_to_tracked_orders[sku_upper].append({
                        "order_number": order.get("order_number"),
                        "delivery_status": delivery_status,
                        "total_spent": order.get("total_spent", 0),
                        "payment_status": payment_status or "PENDING",
                        "payment_date": payment_date
                    })
        
        # Categorize inventory
        can_fulfill_today = []  # Matches unfulfilled orders from today
        in_transit_tracked = []  # Has TCS tracking, in transit
        delivered_recent = []  # Delivered (November onwards)
        unknown_old = []  # Old orders without tracking or no orders
        
        # Track unique orders
        fulfill_orders = {}
        transit_orders = {}
        delivered_orders = {}
        
        for item in all_items:
            sku_upper = item.get('sku', '').upper().strip()
            cost = item.get('cost', 0)
            
            # Priority 1: Check if can fulfill today's unfulfilled orders
            if sku_upper in sku_to_unfulfilled_orders:
                can_fulfill_today.append(item)
                for order in sku_to_unfulfilled_orders[sku_upper]:
                    order_num = order["order_number"]
                    if order_num not in fulfill_orders:
                        fulfill_orders[order_num] = order["total_spent"]
            
            # Priority 2: Check if in tracked orders
            elif sku_upper in sku_to_tracked_orders:
                matched = False
                for order in sku_to_tracked_orders[sku_upper]:
                    delivery_status = order["delivery_status"]
                    
                    if delivery_status == "DELIVERED":
                        delivered_recent.append(item)
                        order_num = order["order_number"]
                        if order_num not in delivered_orders:
                            delivered_orders[order_num] = order["total_spent"]
                        matched = True
                        break
                    elif delivery_status in ["BOOKED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "ARRIVAL_AT_DESTINATION"]:
                        in_transit_tracked.append(item)
                        order_num = order["order_number"]
                        if order_num not in transit_orders:
                            transit_orders[order_num] = order["total_spent"]
                        matched = True
                        break
                
                if not matched:
                    unknown_old.append(item)
            else:
                # No matching orders or old orders without tracking
                unknown_old.append(item)
        
        # Calculate stats
        def calc_stats(items, orders_map):
            cost = sum(i.get('cost', 0) for i in items)
            sale_value = sum(orders_map.values()) if orders_map else 0
            profit = sale_value - cost if sale_value > 0 else 0
            return {
                "count": len(items),
                "cost": round(cost, 2),
                "sale_value": round(sale_value, 2),
                "profit": round(profit, 2)
            }
        
        # Get all orders that have been matched with inventory (for totals and unknown calc)
        all_matched_orders_for_calc = await db.customers.find({
            "order_skus": {"$exists": True, "$ne": []},
            "order_number": {"$exists": True}
        }, {
            "_id": 0,
            "order_number": 1,
            "total_spent": 1,
            "order_skus": 1
        }).to_list(50000)
        
        # Create SKU set from inventory
        inventory_skus = {item.get('sku', '').upper().strip() for item in all_items}
        
        # Calculate totals from all orders that match our inventory
        total_matched_orders = {}
        for order in all_matched_orders_for_calc:
            order_skus = [sku.upper().strip() for sku in order.get('order_skus', [])]
            # Check if any SKU from this order is in our inventory
            if any(sku in inventory_skus for sku in order_skus):
                order_num = order.get('order_number')
                if order_num not in total_matched_orders:
                    total_matched_orders[order_num] = order.get('total_spent', 0)
        
        # Calculate stats for categorized items
        fulfill_stats = calc_stats(can_fulfill_today, fulfill_orders)
        transit_stats = calc_stats(in_transit_tracked, transit_orders)
        delivered_stats = calc_stats(delivered_recent, delivered_orders)
        
        # For unknown/old, calculate from all remaining matched orders
        unknown_matched_orders = {}
        unknown_skus = {item.get('sku', '').upper().strip() for item in unknown_old}
        for order in all_matched_orders_for_calc:
            order_skus = [sku.upper().strip() for sku in order.get('order_skus', [])]
            if any(sku in unknown_skus for sku in order_skus):
                order_num = order.get('order_number')
                # Exclude if already counted in other categories
                if (order_num not in fulfill_orders and 
                    order_num not in transit_orders and 
                    order_num not in delivered_orders):
                    unknown_matched_orders[order_num] = order.get('total_spent', 0)
        
        unknown_stats = calc_stats(unknown_old, unknown_matched_orders)
        
        # Calculate overall totals
        total_cost = sum(item.get('cost', 0) for item in all_items)
        total_sale_value = sum(total_matched_orders.values())
        total_profit = total_sale_value - total_cost if total_sale_value > 0 else 0
        
        # NEW: Calculate sale value from inventory SKU sale prices
        # Get all inventory items with sale_price field
        inventory_with_sale_price = await db.inventory_v2.find(
            date_query,
            {"_id": 0, "sku": 1, "cost": 1, "sale_price": 1}
        ).to_list(10000)
        
        total_inventory_sale_value = 0
        total_inventory_cost = 0
        items_with_sale_price = 0
        
        for inv_item in inventory_with_sale_price:
            cost = inv_item.get('cost', 0)
            sale_price = inv_item.get('sale_price', 0)
            
            total_inventory_cost += cost
            
            # Use sale_price if available, otherwise use cost as fallback
            if sale_price and sale_price > 0:
                total_inventory_sale_value += sale_price
                items_with_sale_price += 1
            else:
                total_inventory_sale_value += cost
        
        inventory_profit = total_inventory_sale_value - total_inventory_cost
        
        return {
            "success": True,
            "stats": {
                "total_items": len(all_items),
                "total_cost": round(total_cost, 2),
                "total_sale_value": round(total_sale_value, 2),
                "total_profit": round(total_profit, 2),
                # NEW: Inventory-based sale value (from SKU sale prices)
                "inventory_sale_value": round(total_inventory_sale_value, 2),
                "inventory_profit": round(inventory_profit, 2),
                "items_with_sale_price": items_with_sale_price,
                "can_fulfill_today": fulfill_stats,
                "in_transit_tracked": transit_stats,
                "delivered_recent": delivered_stats,
                "unknown_old": unknown_stats,
                "by_collection": by_collection,
                "by_size": by_size,
                "by_color": by_color
            }
        }
    except Exception as e:
        logger.error(f"Error fetching inventory overview stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/inventory/v2/overview-detail/{category}")
async def get_inventory_category_detail(
    category: str,
    start_date: str = None,
    end_date: str = None
):
    """Get detailed breakdown for a specific inventory category"""
    try:
        from datetime import datetime, timezone, timedelta
        
        # Build date filter query
        date_query = {}
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                from datetime import datetime, timedelta
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                end_dt = end_dt + timedelta(days=1)
                date_filter["$lt"] = end_dt.isoformat()
            date_query["created_at"] = date_filter
        
        # Get inventory items with date filter
        all_items = await db.inventory_v2.find(date_query, {
            "_id": 0, 
            "sku": 1,
            "cost": 1,
            "sale_price": 1,
            "order_number": 1,
            "collection": 1,
            "created_at": 1
        }).to_list(10000)
        
        # Get today's date
        today = datetime.now(timezone.utc).date()
        
        # Get unfulfilled orders from today
        unfulfilled_today = await db.customers.find({
            "fulfillment_status": {"$in": ["unfulfilled", "Unfulfilled", "UNFULFILLED", None]},
            "order_skus": {"$exists": True, "$ne": []},
            "created_at": {"$exists": True}
        }, {
            "_id": 0,
            "order_number": 1,
            "order_skus": 1,
            "total_spent": 1,
            "created_at": 1,
            "first_name": 1,
            "last_name": 1
        }).to_list(10000)
        
        # Get orders with tracking
        orders_with_tracking = await db.customers.find({
            "tracking_number": {"$exists": True, "$ne": None, "$ne": ""},
            "order_skus": {"$exists": True, "$ne": []}
        }, {
            "_id": 0,
            "order_number": 1,
            "order_skus": 1,
            "delivery_status": 1,
            "tracking_number": 1,
            "total_spent": 1,
            "created_at": 1,
            "first_name": 1,
            "last_name": 1
        }).to_list(50000)
        
        # Create mappings
        sku_to_unfulfilled_orders = {}
        sku_to_tracked_orders = {}
        
        # Map unfulfilled orders
        for order in unfulfilled_today:
            try:
                order_date = datetime.fromisoformat(order.get("created_at", "")).date()
                if (today - order_date).days <= 1:
                    for sku in order.get("order_skus", []):
                        sku_upper = sku.upper().strip()
                        if sku_upper not in sku_to_unfulfilled_orders:
                            sku_to_unfulfilled_orders[sku_upper] = []
                        sku_to_unfulfilled_orders[sku_upper].append({
                            "order_number": order.get("order_number"),
                            "total_spent": order.get("total_spent", 0),
                            "customer": f"{order.get('first_name', '')} {order.get('last_name', '')}".strip()
                        })
            except:
                continue
        
        # Map tracked orders
        for order in orders_with_tracking:
            delivery_status = order.get("delivery_status", "")
            if delivery_status and delivery_status != "UNKNOWN":
                for sku in order.get("order_skus", []):
                    sku_upper = sku.upper().strip()
                    if sku_upper not in sku_to_tracked_orders:
                        sku_to_tracked_orders[sku_upper] = []
                    sku_to_tracked_orders[sku_upper].append({
                        "order_number": order.get("order_number"),
                        "delivery_status": delivery_status,
                        "tracking_number": order.get("tracking_number"),
                        "total_spent": order.get("total_spent", 0),
                        "customer": f"{order.get('first_name', '')} {order.get('last_name', '')}".strip()
                    })
        
        # Categorize items based on requested category
        detailed_items = []
        
        for item in all_items:
            sku_upper = item.get('sku', '').upper().strip()
            cost = item.get('cost', 0)
            sale_price = item.get('sale_price', 0)
            
            item_detail = {
                "sku": item.get('sku'),
                "cost": cost,
                "sale_price": sale_price,
                "collection": item.get('collection'),
                "orders": []
            }
            
            # Filter by category
            if category == "can_fulfill_today":
                if sku_upper in sku_to_unfulfilled_orders:
                    item_detail["orders"] = sku_to_unfulfilled_orders[sku_upper]
                    detailed_items.append(item_detail)
            
            elif category == "in_transit":
                if sku_upper in sku_to_tracked_orders:
                    for order in sku_to_tracked_orders[sku_upper]:
                        if order["delivery_status"] in ["BOOKED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "ARRIVAL_AT_DESTINATION"]:
                            item_detail["orders"].append(order)
                    if item_detail["orders"]:
                        detailed_items.append(item_detail)
            
            elif category == "delivered":
                if sku_upper in sku_to_tracked_orders:
                    for order in sku_to_tracked_orders[sku_upper]:
                        if order["delivery_status"] == "DELIVERED":
                            item_detail["orders"].append(order)
                    if item_detail["orders"]:
                        detailed_items.append(item_detail)
            
            elif category == "other":
                # Items not in other categories
                if (sku_upper not in sku_to_unfulfilled_orders and 
                    sku_upper not in sku_to_tracked_orders):
                    detailed_items.append(item_detail)
        
        return {
            "success": True,
            "category": category,
            "total_items": len(detailed_items),
            "items": detailed_items[:500]  # Limit to 500 for performance
        }
    
    except Exception as e:
        logger.error(f"Error fetching category detail: {str(e)}")


@api_router.get("/inventory/v2/collection-detail/{collection_name}")
async def get_collection_detail(collection_name: str):
    """Get detailed breakdown for a specific collection"""
    try:
        # Get all items in this collection
        items = await db.inventory_v2.find(
            {"collection": collection_name},
            {"_id": 0, "sku": 1, "cost": 1, "sale_price": 1, "order_number": 1, "collection": 1}
        ).to_list(1000)
        
        # Get related orders
        skus = [item.get('sku', '').upper().strip() for item in items]
        orders = await db.customers.find(
            {"order_skus": {"$in": skus}},
            {"_id": 0, "order_number": 1, "order_skus": 1, "total_spent": 1, "first_name": 1, "last_name": 1, "tracking_number": 1, "delivery_status": 1}
        ).to_list(1000)
        
        # Map SKUs to orders
        sku_to_orders = {}
        for order in orders:
            for sku in order.get('order_skus', []):
                sku_upper = sku.upper().strip()
                if sku_upper not in sku_to_orders:
                    sku_to_orders[sku_upper] = []
                sku_to_orders[sku_upper].append({
                    "order_number": order.get("order_number"),
                    "customer": f"{order.get('first_name', '')} {order.get('last_name', '')}".strip(),
                    "tracking_number": order.get("tracking_number"),
                    "delivery_status": order.get("delivery_status"),
                    "total_spent": order.get("total_spent", 0)
                })
        
        # Add orders to items
        detailed_items = []
        for item in items:
            sku_upper = item.get('sku', '').upper().strip()
            item['orders'] = sku_to_orders.get(sku_upper, [])
            detailed_items.append(item)
        
        total_cost = sum(item.get('cost', 0) for item in items)
        total_sale = sum(item.get('sale_price', item.get('cost', 0)) for item in items)
        
        return {
            "success": True,
            "collection": collection_name,
            "total_items": len(items),
            "total_cost": round(total_cost, 2),
            "total_sale": round(total_sale, 2),
            "items": detailed_items[:500]
        }
    except Exception as e:
        logger.error(f"Error fetching collection detail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/inventory/v2/size-detail/{size}")
async def get_size_detail(size: str):
    """Get detailed breakdown for a specific size"""
    try:
        # Find items with this size in SKU
        all_items = await db.inventory_v2.find({}, {"_id": 0}).to_list(10000)
        
        # Filter by size
        import re
        filtered_items = []
        for item in all_items:
            sku = item.get('sku', '')
            # Extract size from SKU
            size_match = re.search(r'-(\d+(?:\.\d+)?)\s*$', sku)
            if size_match:
                item_size = size_match.group(1)
                if item_size == size:
                    filtered_items.append(item)
        
        # Get related orders
        skus = [item.get('sku', '').upper().strip() for item in filtered_items]
        orders = await db.customers.find(
            {"order_skus": {"$in": skus}},
            {"_id": 0, "order_number": 1, "order_skus": 1, "total_spent": 1, "first_name": 1, "last_name": 1, "tracking_number": 1, "delivery_status": 1}
        ).to_list(1000)
        
        # Map SKUs to orders
        sku_to_orders = {}
        for order in orders:
            for sku in order.get('order_skus', []):
                sku_upper = sku.upper().strip()
                if sku_upper not in sku_to_orders:
                    sku_to_orders[sku_upper] = []
                sku_to_orders[sku_upper].append({
                    "order_number": order.get("order_number"),
                    "customer": f"{order.get('first_name', '')} {order.get('last_name', '')}".strip(),
                    "tracking_number": order.get("tracking_number"),
                    "delivery_status": order.get("delivery_status")
                })
        
        # Add orders to items
        detailed_items = []
        for item in filtered_items:
            sku_upper = item.get('sku', '').upper().strip()
            item['orders'] = sku_to_orders.get(sku_upper, [])
            detailed_items.append(item)
        
        total_cost = sum(item.get('cost', 0) for item in filtered_items)
        
        return {
            "success": True,
            "size": size,
            "total_items": len(filtered_items),
            "total_cost": round(total_cost, 2),
            "items": detailed_items[:500]
        }
    except Exception as e:
        logger.error(f"Error fetching size detail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/inventory/v2/all-items-detail")
async def get_all_items_detail(
    start_date: str = None,
    end_date: str = None
):
    """Get detailed breakdown of all inventory items"""
    try:
        from datetime import datetime, timedelta
        
        # Build date filter
        date_query = {}
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                end_dt = end_dt + timedelta(days=1)
                date_filter["$lt"] = end_dt.isoformat()
            date_query["created_at"] = date_filter
        
        items = await db.inventory_v2.find(
            date_query,
            {"_id": 0, "sku": 1, "cost": 1, "sale_price": 1, "order_number": 1, "collection": 1, "created_at": 1}
        ).to_list(1000)
        
        # Get related orders
        skus = [item.get('sku', '').upper().strip() for item in items]
        orders = await db.customers.find(
            {"order_skus": {"$in": skus}},
            {"_id": 0, "order_number": 1, "order_skus": 1, "total_spent": 1, "first_name": 1, "last_name": 1, "tracking_number": 1, "delivery_status": 1}
        ).to_list(1000)
        
        # Map SKUs to orders
        sku_to_orders = {}
        for order in orders:
            for sku in order.get('order_skus', []):
                sku_upper = sku.upper().strip()
                if sku_upper not in sku_to_orders:
                    sku_to_orders[sku_upper] = []
                sku_to_orders[sku_upper].append({
                    "order_number": order.get("order_number"),
                    "customer": f"{order.get('first_name', '')} {order.get('last_name', '')}".strip(),
                    "tracking_number": order.get("tracking_number"),
                    "delivery_status": order.get("delivery_status"),
                    "total_spent": order.get("total_spent", 0)
                })
        
        # Add orders to items
        detailed_items = []
        for item in items:
            sku_upper = item.get('sku', '').upper().strip()
            item['orders'] = sku_to_orders.get(sku_upper, [])
            detailed_items.append(item)
        
        total_cost = sum(item.get('cost', 0) for item in items)
        total_sale = sum(item.get('sale_price', item.get('cost', 0)) for item in items)
        
        return {
            "success": True,
            "total_items": len(items),
            "total_cost": round(total_cost, 2),
            "total_sale": round(total_sale, 2),
            "items": detailed_items[:1000]
        }
    except Exception as e:
        logger.error(f"Error fetching all items detail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/inventory/v2/search")
async def search_inventory(q: str):
    """Search inventory by SKU, order number, collection, or customer name"""
    try:
        if not q or len(q) < 2:
            return {
                "success": False,
                "message": "Search query must be at least 2 characters"
            }
        
        search_query = q.strip()
        
        # Search in inventory_v2 collection
        # Create a case-insensitive regex pattern
        regex_pattern = {"$regex": search_query, "$options": "i"}
        
        # Search by SKU or collection
        inventory_items = await db.inventory_v2.find({
            "$or": [
                {"sku": regex_pattern},
                {"collection": regex_pattern},
                {"order_number": regex_pattern}
            ]
        }, {
            "_id": 0,
            "sku": 1,
            "cost": 1,
            "sale_price": 1,
            "order_number": 1,
            "collection": 1
        }).to_list(100)
        
        # Search in customers collection for order numbers or customer names
        customer_orders = await db.customers.find({
            "$or": [
                {"order_number": regex_pattern},
                {"first_name": regex_pattern},
                {"last_name": regex_pattern},
                {"tracking_number": regex_pattern}
            ]
        }, {
            "_id": 0,
            "order_number": 1,
            "order_skus": 1,
            "first_name": 1,
            "last_name": 1,
            "tracking_number": 1,
            "total_spent": 1,
            "delivery_status": 1
        }).to_list(50)
        
        # Create a mapping of SKUs to orders
        sku_to_orders = {}
        for order in customer_orders:
            for sku in order.get('order_skus', []):
                sku_upper = sku.upper().strip()
                if sku_upper not in sku_to_orders:
                    sku_to_orders[sku_upper] = []
                sku_to_orders[sku_upper].append({
                    "order_number": order.get("order_number"),
                    "customer": f"{order.get('first_name', '')} {order.get('last_name', '')}".strip(),
                    "tracking_number": order.get("tracking_number"),
                    "delivery_status": order.get("delivery_status"),
                    "total_spent": order.get("total_spent", 0)
                })
        
        # If searching by order number or customer name, find related SKUs
        if customer_orders:
            order_skus = set()
            for order in customer_orders:
                order_skus.update([sku.upper().strip() for sku in order.get('order_skus', [])])
            
            # Get inventory items for these SKUs
            additional_items = await db.inventory_v2.find({
                "sku": {"$in": list(order_skus)}
            }, {
                "_id": 0,
                "sku": 1,
                "cost": 1,
                "sale_price": 1,
                "order_number": 1,
                "collection": 1
            }).to_list(100)
            
            # Merge with existing inventory items (avoid duplicates)
            existing_skus = {item.get('sku') for item in inventory_items}
            for item in additional_items:
                if item.get('sku') not in existing_skus:
                    inventory_items.append(item)
        
        # Add order information to inventory items
        results = []
        for item in inventory_items:
            sku_upper = item.get('sku', '').upper().strip()
            item['orders'] = sku_to_orders.get(sku_upper, [])
            results.append(item)
        
        # Sort by relevance (exact match first, then partial match)
        def relevance_score(item):
            sku = item.get('sku', '').lower()
            collection = item.get('collection', '').lower()
            query_lower = search_query.lower()
            
            if sku == query_lower:
                return 0  # Exact SKU match
            elif sku.startswith(query_lower):
                return 1  # SKU starts with query
            elif query_lower in sku:
                return 2  # SKU contains query
            elif collection == query_lower:
                return 3  # Exact collection match
            elif query_lower in collection:
                return 4  # Collection contains query
            else:
                return 5  # Other matches
        
        results.sort(key=relevance_score)
        
        return {
            "success": True,
            "query": search_query,
            "total_results": len(results),
            "items": results[:100]  # Limit to 100 results
        }
    
    except Exception as e:
        logger.error(f"Error searching inventory: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


        raise HTTPException(status_code=500, detail=str(e))



@api_router.get("/inventory/v2/stats")
async def get_inventory_stats():
    """Get financial stats for inventory"""
    try:
        # Get all inventory items
        all_items = await db.inventory_v2.find({}, {"_id": 0}).to_list(10000)
        
        # Calculate totals
        total_cost = sum(item.get('cost', 0) for item in all_items)
        total_sale_value = sum(item.get('sale_price', 0) for item in all_items if item.get('sale_price', 0) > 0)
        total_profit = sum(item.get('profit', 0) for item in all_items if item.get('profit', 0) > 0)
        
        # Count by status
        in_stock_count = len([item for item in all_items if item.get('status') == 'in_stock'])
        in_transit_count = len([item for item in all_items if item.get('status') == 'in_transit'])
        delivered_count = len([item for item in all_items if item.get('status') == 'delivered'])
        
        # Get today's orders (items created today)
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).date()
        today_items = [item for item in all_items if datetime.fromisoformat(item.get('created_at', '')).date() == today]
        today_orders_count = len(today_items)
        
        # Get orders from customers
        customers_with_orders = await db.customers.find(
            {"order_skus": {"$exists": True, "$ne": []}},
            {"_id": 0, "delivery_status": 1}
        ).to_list(50000)
        
        # Count transit orders (not delivered)
        transit_orders = len([c for c in customers_with_orders if c.get('delivery_status') and c.get('delivery_status') not in ['DELIVERED', 'RETURN_IN_PROCESS']])
        delivered_orders = len([c for c in customers_with_orders if c.get('delivery_status') == 'DELIVERED'])
        
        return {
            "success": True,
            "stats": {
                "total_inventory_items": len(all_items),
                "total_cost": round(total_cost, 2),
                "total_sale_value": round(total_sale_value, 2),
                "total_profit": round(total_profit, 2),
                "in_stock_count": in_stock_count,
                "in_transit_count": in_transit_count,
                "delivered_count": delivered_count,
                "today_orders": today_orders_count,
                "transit_orders": transit_orders,
                "delivered_orders": delivered_orders
            }
        }
    except Exception as e:
        logger.error(f"Error fetching inventory stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/inventory/v2")
async def get_all_inventory_items(store_name: str = None, status: str = None):
    """Get all inventory items with filtering"""
    try:
        query = {}
        if store_name and store_name != "all":
            query["store_name"] = store_name
        if status and status != "all":
            query["status"] = status
        
        items = await db.inventory_v2.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
        return {"success": True, "items": items, "total": len(items)}
    except Exception as e:
        logger.error(f"Error fetching inventory: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/inventory/v2/add")
async def add_inventory_item(item: InventoryItemCreate, added_by: str = None):
    """Add new inventory item with optional Shopify order linking"""
    try:
        # Create inventory item
        new_item = InventoryItem(
            sku=item.sku,
            product_name=item.product_name,
            collection=item.collection,
            order_number=item.order_number,
            cost=item.cost,
            store_name=item.store_name,
            added_by=added_by
        )
        
        # If order number provided, fetch sale price from Shopify/customer data
        if item.order_number:
            customer = await db.customers.find_one(
                {"order_number": str(item.order_number)},
                {"_id": 0, "total_spent": 1}
            )
            if customer:
                new_item.sale_price = float(customer.get("total_spent", 0))
                new_item.profit = new_item.sale_price - new_item.cost
        
        # Insert into database
        item_dict = new_item.model_dump()
        await db.inventory_v2.insert_one(item_dict)
        
        # Invalidate inventory cache after adding new item
        asyncio.create_task(invalidate_inventory_cache())
        
        # Fetch the inserted item without _id
        inserted_item = await db.inventory_v2.find_one({"id": new_item.id}, {"_id": 0})
        
        return {"success": True, "message": "Inventory item added", "item": inserted_item}
    except Exception as e:
        logger.error(f"Error adding inventory item: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/inventory/v2/{item_id}")
async def update_inventory_item(item_id: str, update: InventoryItemUpdate):
    """Update inventory item"""
    try:
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Recalculate profit if cost or sale_price updated
        item = await db.inventory_v2.find_one({"id": item_id}, {"_id": 0})
        if item:
            cost = update_data.get("cost", item.get("cost", 0))
            sale_price = update_data.get("sale_price", item.get("sale_price", 0))
            
            # If order number is being updated, fetch sale price
            if "order_number" in update_data and update_data["order_number"]:
                customer = await db.customers.find_one(
                    {"order_number": str(update_data["order_number"])},
                    {"_id": 0, "total_spent": 1}
                )
                if customer:
                    sale_price = float(customer.get("total_spent", 0))
                    update_data["sale_price"] = sale_price
            
            update_data["profit"] = sale_price - cost
        
        result = await db.inventory_v2.update_one(
            {"id": item_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        
        # Invalidate inventory cache after updating
        asyncio.create_task(invalidate_inventory_cache())
        
        return {"success": True, "message": "Inventory item updated"}
    except Exception as e:
        logger.error(f"Error updating inventory item: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/inventory/v2/{item_id}/delivery-status")
async def add_delivery_status(item_id: str, status_update: DeliveryStatusUpdate):
    """Add manual delivery status entry to timeline"""
    try:
        # Create status entry
        timestamp = status_update.timestamp or datetime.now(timezone.utc).isoformat()
        entry = DeliveryStatusEntry(
            timestamp=timestamp,
            status=status_update.status
        )
        
        # Add to timeline
        result = await db.inventory_v2.update_one(
            {"id": item_id},
            {
                "$push": {"delivery_timeline": entry.model_dump()},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        
        return {"success": True, "message": "Delivery status added"}
    except Exception as e:
        logger.error(f"Error adding delivery status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/inventory/v2/{item_id}")
async def delete_inventory_item(item_id: str):
    """Delete inventory item"""
    try:
        result = await db.inventory_v2.delete_one({"id": item_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        
        return {"success": True, "message": "Inventory item deleted"}
    except Exception as e:
        logger.error(f"Error deleting inventory item: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/inventory/v2/upload")
async def upload_inventory_excel(file: UploadFile = File(...), store_name: str = "tnvcollectionpk"):
    """Upload Excel file with inventory (Box No, SKU, Size, Color, Collection, Cost)"""
    try:
        import openpyxl
        from io import BytesIO
        
        contents = await file.read()
        wb = openpyxl.load_workbook(BytesIO(contents))
        sheet = wb.active
        
        items_added = 0
        errors = []
        
        # Get all customers with their order_skus and line_items for matching
        customers = await db.customers.find(
            {"order_skus": {"$exists": True, "$ne": []}},
            {"_id": 0, "order_number": 1, "order_skus": 1, "total_spent": 1, "line_items": 1}
        ).to_list(50000)
        
        # Create a mapping: SKU -> list of (order_number, price_per_item)
        sku_to_orders = {}
        for customer in customers:
            order_skus = customer.get("order_skus", [])
            line_items = customer.get("line_items", [])
            order_number = customer.get("order_number")
            
            # Try to match SKU with line items to get individual item price
            for sku in order_skus:
                sku_upper = sku.upper().strip()
                if sku_upper not in sku_to_orders:
                    sku_to_orders[sku_upper] = []
                
                # Find matching line item for this SKU to get the actual product price
                item_price = 0
                for line_item in line_items:
                    line_sku = line_item.get("sku", "").upper().strip()
                    if line_sku == sku_upper:
                        item_price = float(line_item.get("price", 0))
                        break
                
                # Fallback to total_spent / number of items if price not found
                if item_price == 0 and len(order_skus) > 0:
                    item_price = float(customer.get("total_spent", 0)) / len(order_skus)
                
                sku_to_orders[sku_upper].append({
                    "order_number": order_number,
                    "sale_price": item_price
                })
        
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            try:
                # Skip if SKU is empty (column 2, index 1)
                if not row[1]:
                    continue
                
                box_no = str(row[0]).strip() if row[0] else None
                sku = str(row[1]).strip()
                size = str(row[2]).strip() if row[2] else None
                color = str(row[3]).strip() if row[3] else None
                collection = str(row[4]).strip() if row[4] else None
                cost = float(row[5]) if row[5] else 0.0
                
                # Build product name from SKU, size, color
                product_name = f"{sku}"
                if size:
                    product_name += f" - Size {size}"
                if color:
                    product_name += f" - {color}"
                
                # Check if this SKU matches any orders
                sku_upper = sku.upper().strip()
                order_number = None
                sale_price = 0.0
                
                if sku_upper in sku_to_orders:
                    # Get the first matching order with the product price
                    first_order = sku_to_orders[sku_upper][0]
                    order_number = first_order["order_number"]
                    sale_price = float(first_order["sale_price"])
                
                # Create inventory item
                new_item = InventoryItem(
                    sku=sku,
                    product_name=product_name,
                    collection=collection,
                    cost=cost,
                    order_number=order_number,
                    sale_price=sale_price,
                    profit=sale_price - cost if sale_price > 0 else 0.0,
                    store_name=store_name
                )
                
                item_dict = new_item.model_dump()
                await db.inventory_v2.insert_one(item_dict)
                items_added += 1
                
            except Exception as e:
                errors.append(f"Row {row_idx}: {str(e)}")
                continue
        
        # Auto-sync inventory with store orders after upload
        sync_result = await sync_inventory_with_store(store_name)
        
        return {
            "success": True,
            "message": f"Processed {items_added} inventory items and synced with {store_name}",
            "items_added": items_added,
            "errors": errors if errors else None,
            "sync_status": sync_result
        }
        
    except Exception as e:
        logger.error(f"Error uploading inventory: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/inventory/sync/{store_name}")
async def sync_inventory_with_store(store_name: str):
    """
    Sync uploaded inventory with store orders to update:
    - Confirmation Tracker (show stock availability)
    - Dispatch Tracker (show stock availability)  
    - Inventory Overview (update stats)
    - Dynamic Pricing (update pricing based on stock)
    - Inventory Health (update health metrics)
    """
    try:
        # Get all inventory items for this store
        inventory_items = await db.inventory_v2.find(
            {"store_name": store_name},
            {"_id": 0, "sku": 1, "cost": 1, "sale_price": 1, "profit": 1}
        ).to_list(50000)
        
        if not inventory_items:
            return {
                "success": False,
                "message": f"No inventory found for store: {store_name}"
            }
        
        # Create SKU lookup map
        sku_map = {item["sku"].upper().strip(): item for item in inventory_items}
        
        # Update customers collection with inventory data
        updated_count = 0
        customers = await db.customers.find(
            {"store_name": store_name, "order_skus": {"$exists": True, "$ne": []}},
            {"_id": 0, "customer_id": 1, "order_skus": 1, "line_items": 1}
        ).to_list(50000)
        
        for customer in customers:
            order_skus = customer.get("order_skus", [])
            line_items = customer.get("line_items", [])
            
            # Check if any SKU in this order is in inventory
            in_stock_skus = []
            out_of_stock_skus = []
            
            for sku in order_skus:
                sku_upper = sku.upper().strip()
                if sku_upper in sku_map:
                    in_stock_skus.append(sku)
                else:
                    out_of_stock_skus.append(sku)
            
            # Update customer record with inventory status
            await db.customers.update_one(
                {"customer_id": customer["customer_id"]},
                {
                    "$set": {
                        "in_stock_skus": in_stock_skus,
                        "out_of_stock_skus": out_of_stock_skus,
                        "inventory_synced": True,
                        "inventory_sync_date": datetime.now(timezone.utc)
                    }
                }
            )
            updated_count += 1
        
        return {
            "success": True,
            "message": f"Synced inventory for {store_name}",
            "inventory_items": len(inventory_items),
            "orders_updated": updated_count,
            "store_name": store_name
        }
        
    except Exception as e:
        logger.error(f"Error syncing inventory: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================================
# OLD INVENTORY ENDPOINTS (KEPT FOR BACKWARD COMPATIBILITY)
# ========================================

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


@api_router.post("/cache/refresh-inventory")
async def refresh_inventory_cache():
    """Manually refresh the inventory cache"""
    try:
        cache = await invalidate_inventory_cache()
        return {
            "success": True,
            "message": "Inventory cache refreshed",
            "items_cached": len(cache["data"]),
            "stock_skus_cached": len(cache["stock_skus"]),
            "last_updated": cache["last_updated"].isoformat() if cache["last_updated"] else None
        }
    except Exception as e:
        logger.error(f"Error refreshing inventory cache: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/cache/status")
async def get_cache_status():
    """Get current cache status"""
    global _inventory_cache
    return {
        "inventory_cache": {
            "items_count": len(_inventory_cache["data"]),
            "stock_skus_count": len(_inventory_cache["stock_skus"]),
            "last_updated": _inventory_cache["last_updated"].isoformat() if _inventory_cache["last_updated"] else None,
            "ttl_seconds": _inventory_cache["ttl_seconds"],
            "is_valid": _inventory_cache["last_updated"] is not None and 
                       (datetime.now(timezone.utc) - _inventory_cache["last_updated"]).total_seconds() < _inventory_cache["ttl_seconds"]
        }
    }


@api_router.get("/marketing/stats")
async def get_marketing_stats():
    """Get marketing dashboard statistics"""
    try:
        from datetime import datetime, timezone, timedelta
        
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=7)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Get all customers
        all_customers = await db.customers.find({}, {"_id": 0}).to_list(100000)
        
        # Calculate today's revenue
        today_revenue = sum(
            c.get('total_spent', 0) 
            for c in all_customers 
            if c.get('created_at') and c.get('created_at') >= today_start.isoformat()
        )
        
        # Calculate week revenue
        week_revenue = sum(
            c.get('total_spent', 0)
            for c in all_customers
            if c.get('created_at') and c.get('created_at') >= week_start.isoformat()
        )
        
        # Calculate month revenue
        month_revenue = sum(
            c.get('total_spent', 0)
            for c in all_customers
            if c.get('created_at') and c.get('created_at') >= month_start.isoformat()
        )
        
        # Count orders
        total_orders = len(all_customers)
        pending_orders = len([c for c in all_customers if c.get('fulfillment_status', '').lower() in ['unfulfilled', 'pending']])
        
        # WhatsApp sent count
        whatsapp_sent = len([c for c in all_customers if c.get('messaged') == True])
        
        # Get inventory value
        inventory_items = await db.inventory_v2.find({}, {"_id": 0, "sale_price": 1, "cost": 1}).to_list(10000)
        inventory_value = sum(item.get('sale_price', item.get('cost', 0)) for item in inventory_items)
        
        # Calculate conversion rate (orders / unique visitors - simplified)
        conversion_rate = round((total_orders / max(total_orders * 3, 1)) * 100, 1) if total_orders > 0 else 0
        
        return {
            "success": True,
            "stats": {
                "todayRevenue": round(today_revenue, 2),
                "weekRevenue": round(week_revenue, 2),
                "monthRevenue": round(month_revenue, 2),
                "totalRevenue": round(sum(c.get('total_spent', 0) for c in all_customers), 2),
                "totalOrders": total_orders,
                "pendingOrders": pending_orders,
                "inventoryValue": round(inventory_value, 2),
                "whatsappSent": whatsapp_sent,
                "conversionRate": conversion_rate
            }
        }
    
    except Exception as e:
        logger.error(f"Error fetching marketing stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/campaigns")
async def get_campaigns():
    """Get all campaigns"""
    try:
        campaigns = await db.campaigns.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
        return {
            "success": True,
            "campaigns": campaigns
        }
    except Exception as e:
        logger.error(f"Error fetching campaigns: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/campaigns/create")
async def create_campaign(campaign_data: dict):
    """Create a new marketing campaign"""
    try:
        from uuid import uuid4
        
        campaign = {
            "id": str(uuid4()),
            "name": campaign_data.get("name"),
            "type": campaign_data.get("type", "discount"),
            "target": campaign_data.get("target", "all"),
            "discount_percentage": campaign_data.get("discount_percentage", 0),
            "start_date": campaign_data.get("start_date"),
            "end_date": campaign_data.get("end_date"),
            "status": campaign_data.get("status", "draft"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.campaigns.insert_one(campaign)
        
        return {
            "success": True,
            "message": "Campaign created successfully",
            "campaign_id": campaign["id"]
        }
    except Exception as e:
        logger.error(f"Error creating campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/campaigns/{campaign_id}/status")
async def update_campaign_status(campaign_id: str, status_data: dict):
    """Update campaign status"""
    try:
        result = await db.campaigns.update_one(
            {"id": campaign_id},
            {"$set": {
                "status": status_data.get("status"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        return {"success": True, "message": "Campaign status updated"}
    except Exception as e:
        logger.error(f"Error updating campaign status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str):
    """Delete a campaign"""
    try:
        result = await db.campaigns.delete_one({"id": campaign_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        return {"success": True, "message": "Campaign deleted"}
    except Exception as e:
        logger.error(f"Error deleting campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/marketing/campaigns")
async def get_marketing_campaigns():
    """Get active marketing campaigns"""
    try:
        # Placeholder - will be implemented with campaign feature
        campaigns = []
        
        return {
            "success": True,
            "campaigns": campaigns
        }
    
    except Exception as e:
        logger.error(f"Error fetching campaigns: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/inventory/v2/campaign-items")
async def get_campaign_items(tag: str = None):
    """Get inventory items for campaign management"""
    try:
        query = {}
        if tag and tag != 'all':
            query['campaign_tag'] = tag
        
        items = await db.inventory_v2.find(query, {"_id": 0}).to_list(10000)
        
        return {
            "success": True,
            "items": items,
            "total": len(items)
        }
    
    except Exception as e:
        logger.error(f"Error fetching campaign items: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/inventory/v2/bulk-tag")
async def bulk_tag_items(request: dict):
    """Apply tags to multiple inventory items"""
    try:
        skus = request.get('skus', [])
        tag = request.get('tag')
        
        if not skus or not tag:
            raise HTTPException(status_code=400, detail="SKUs and tag are required")
        
        # Update all items with the tag
        result = await db.inventory_v2.update_many(
            {"sku": {"$in": skus}},
            {"$set": {"campaign_tag": tag}}
        )
        
        return {
            "success": True,
            "updated_count": result.modified_count,
            "message": f"Tagged {result.modified_count} items as {tag}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error bulk tagging: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/inventory/v2/bulk-pricing")
async def bulk_pricing_update(request: dict):
    """Update pricing for multiple items"""
    try:
        skus = request.get('skus', [])
        discount_type = request.get('discount_type', 'percentage')
        discount_value = float(request.get('discount_value', 0))
        
        if not skus:
            raise HTTPException(status_code=400, detail="No SKUs provided")
        
        # Get current items
        items = await db.inventory_v2.find({"sku": {"$in": skus}}, {"_id": 0}).to_list(10000)
        
        updated_count = 0
        for item in items:
            current_price = item.get('sale_price', item.get('cost', 0))
            
            if discount_type == 'percentage':
                new_price = current_price * (1 - discount_value / 100)
                discount_pct = discount_value
            else:  # fixed
                new_price = max(0, current_price - discount_value)
                discount_pct = round((discount_value / current_price) * 100, 2) if current_price > 0 else 0
            
            # Update the item
            await db.inventory_v2.update_one(
                {"sku": item['sku']},
                {"$set": {
                    "sale_price": round(new_price, 2),
                    "discount_percentage": discount_pct,
                    "original_price": current_price
                }}
            )
            updated_count += 1
        
        return {
            "success": True,
            "updated_count": updated_count,
            "message": f"Updated pricing for {updated_count} items"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error bulk pricing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Flash Sales Collection Helper
async def init_flash_sales_collection():
    """Initialize flash sales collection if it doesn't exist"""
    collections = await db.list_collection_names()
    if 'flash_sales' not in collections:
        await db.create_collection('flash_sales')

@api_router.get("/flash-sales")
async def get_flash_sales():
    """Get all flash sales"""
    try:
        sales = await db.flash_sales.find({}, {"_id": 0}).to_list(1000)
        
        return {
            "success": True,
            "sales": sales
        }
    
    except Exception as e:
        logger.error(f"Error fetching flash sales: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/flash-sales/create")
async def create_flash_sale(request: dict):
    """Create a new flash sale"""
    try:
        from datetime import datetime, timezone, timedelta
        import uuid
        
        name = request.get('name')
        collection = request.get('collection')
        discount = float(request.get('discount', 0))
        duration_hours = int(request.get('duration_hours', 24))
        start_time_str = request.get('start_time')
        
        # Parse start time
        if start_time_str:
            start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
        else:
            start_time = datetime.now(timezone.utc)
        
        end_time = start_time + timedelta(hours=duration_hours)
        
        flash_sale = {
            "id": str(uuid.uuid4()),
            "name": name,
            "collection": collection,
            "discount": discount,
            "duration_hours": duration_hours,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "active": start_time <= datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "orders_count": 0,
            "revenue": 0,
            "conversion_rate": 0
        }
        
        await db.flash_sales.insert_one(flash_sale)
        
        # Update inventory items with flash sale tag
        if collection and collection != 'all':
            await db.inventory_v2.update_many(
                {"collection": {"$regex": collection, "$options": "i"}},
                {"$set": {"campaign_tag": "flash_sale", "flash_sale_discount": discount}}
            )
        
        return {
            "success": True,
            "message": "Flash sale created successfully",
            "sale_id": flash_sale['id']
        }
    
    except Exception as e:
        logger.error(f"Error creating flash sale: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/flash-sales/{sale_id}/toggle")
async def toggle_flash_sale(sale_id: str, request: dict):
    """Activate or pause a flash sale"""
    try:
        active = request.get('active', False)
        
        result = await db.flash_sales.update_one(
            {"id": sale_id},
            {"$set": {"active": active}}
        )
        
        if result.modified_count > 0:
            return {
                "success": True,
                "message": f"Flash sale {'activated' if active else 'paused'}"
            }
        else:
            raise HTTPException(status_code=404, detail="Flash sale not found")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling flash sale: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/flash-sales/{sale_id}")
async def delete_flash_sale(sale_id: str):
    """Delete a flash sale"""
    try:
        result = await db.flash_sales.delete_one({"id": sale_id})
        
        if result.deleted_count > 0:
            return {
                "success": True,
                "message": "Flash sale deleted"
            }
        else:
            raise HTTPException(status_code=404, detail="Flash sale not found")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting flash sale: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting flash sale: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/bundles")
async def get_bundles():
    """Get all product bundles"""
    try:
        bundles = await db.bundles.find({}, {"_id": 0}).to_list(1000)
        
        return {
            "success": True,
            "bundles": bundles
        }
    
    except Exception as e:
        logger.error(f"Error fetching bundles: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/bundles/create")
async def create_bundle(request: dict):
    """Create a new product bundle"""
    try:
        import uuid
        
        bundle = {
            "id": str(uuid.uuid4()),
            "name": request.get('name'),
            "description": request.get('description'),
            "items": request.get('items', []),
            "discount": float(request.get('discount', 0)),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "orders": 0,
            "revenue": 0
        }
        
        await db.bundles.insert_one(bundle)
        
        # Tag items as bundle
        skus = [item['sku'] for item in bundle['items']]
        await db.inventory_v2.update_many(
            {"sku": {"$in": skus}},
            {"$set": {"campaign_tag": "bundle"}}
        )
        
        return {
            "success": True,
            "message": "Bundle created successfully",
            "bundle_id": bundle['id']
        }
    
    except Exception as e:
        logger.error(f"Error creating bundle: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/bundles/{bundle_id}")
async def delete_bundle(bundle_id: str):
    """Delete a bundle"""
    try:
        result = await db.bundles.delete_one({"id": bundle_id})
        
        if result.deleted_count > 0:
            return {
                "success": True,
                "message": "Bundle deleted"
            }
        else:
            raise HTTPException(status_code=404, detail="Bundle not found")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting bundle: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


        # Create CSV
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=['first_name', 'last_name', 'email', 'phone', 'total_spent', 'order_count'])
        writer.writeheader()
        
        for customer in customers:
            writer.writerow({
                'first_name': customer.get('first_name', ''),
                'last_name': customer.get('last_name', ''),
                'email': customer.get('email', ''),
                'phone': customer.get('phone', ''),
                'total_spent': customer.get('total_spent', 0),
                'order_count': customer.get('order_count', 1)
            })
        
        from fastapi.responses import StreamingResponse
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=segment_{segment_type}.csv"}
        )
    
    except Exception as e:
        logger.error(f"Error exporting segment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


        logger.error(f"Error bulk pricing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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
        "whatsapp_web": f"https://api.whatsapp.com/send?phone={cleaned_phone}"
    }


# Include WhatsApp CRM routes (NEW comprehensive WhatsApp system)
try:
    from whatsapp_crm_routes import whatsapp_router as whatsapp_crm_router
    app.include_router(whatsapp_crm_router)
    print("✅ WhatsApp CRM routes loaded")
except Exception as e:
    print(f"⚠️ Could not load WhatsApp CRM routes: {str(e)}")

# Include legacy WhatsApp routes (OLD system - for backward compatibility)
try:
    from routes.whatsapp import router as whatsapp_legacy_router
    api_router.include_router(whatsapp_legacy_router)
    print("✅ Legacy WhatsApp routes loaded")
except Exception as e:
    print(f"⚠️ Could not load legacy WhatsApp routes: {str(e)}")


@api_router.get("/dashboard/stats")
async def get_dashboard_stats(store_name: str = None):
    """Get dashboard statistics (optimized)"""
    try:
        query = {}
        if store_name and store_name != "all":
            query["store_name"] = store_name
        
        # Get fulfillment status counts
        fulfillment_pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$fulfillment_status",
                "count": {"$sum": 1}
            }}
        ]
        
        fulfillment_results = await db.customers.aggregate(fulfillment_pipeline).to_list(100)
        fulfillment_status = {item["_id"]: item["count"] for item in fulfillment_results if item["_id"]}
        
        # Get payment status counts
        payment_pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$payment_status",
                "count": {"$sum": 1}
            }}
        ]
        
        payment_results = await db.customers.aggregate(payment_pipeline).to_list(100)
        payment_status = {item["_id"]: item["count"] for item in payment_results if item["_id"]}
        
        # Get delivery status counts  
        delivery_pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$delivery_status",
                "count": {"$sum": 1}
            }}
        ]
        
        delivery_results = await db.customers.aggregate(delivery_pipeline).to_list(100)
        delivery_status = {item["_id"]: item["count"] for item in delivery_results if item["_id"]}
        
        return {
            "fulfillmentStatus": fulfillment_status,
            "paymentStatus": payment_status,
            "deliveryStatus": delivery_status
        }
        
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# ============= WhatsApp Business API Endpoints =============

class WhatsAppMessage(BaseModel):
    phone: str
    message: str

class BulkWhatsAppMessage(BaseModel):
    recipients: List[Dict]



@api_router.get("/whatsapp/conversations")
async def get_whatsapp_conversations():
    """
    Get all WhatsApp conversations with customers
    Returns list of conversations with last message and unread count
    """
    try:
        # Get all customers who have WhatsApp messages
        pipeline = [
            {
                '$match': {
                    'whatsapp_messages': {'$exists': True, '$ne': []}
                }
            },
            {
                '$project': {
                    '_id': 0,
                    'phone': '$phone',
                    'customer_name': {'$concat': ['$first_name', ' ', '$last_name']},
                    'first_name': 1,
                    'last_name': 1,
                    'last_message': {'$arrayElemAt': ['$whatsapp_messages.message', -1]},
                    'last_message_time': {'$arrayElemAt': ['$whatsapp_messages.timestamp', -1]},
                    'messages': '$whatsapp_messages'
                }
            },
            {
                '$addFields': {
                    'unread_count': 0  # Can be enhanced with actual unread tracking
                }
            },
            {
                '$sort': {'last_message_time': -1}
            }
        ]
        
        conversations = await db.customers.aggregate(pipeline).to_list(1000)
        
        return {
            'success': True,
            'conversations': conversations,
            'total': len(conversations)
        }
        
    except Exception as e:
        logger.error(f"Error fetching WhatsApp conversations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/whatsapp/send")
async def send_whatsapp_message(data: WhatsAppMessage):
    """Send a WhatsApp message to a customer"""
    try:
        result = await whatsapp_service.send_text_message(data.phone, data.message)
        return result
    except Exception as e:
        logger.error(f"Error sending WhatsApp message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/whatsapp/send-bulk")
async def send_bulk_whatsapp(data: BulkWhatsAppMessage):
    """Send WhatsApp messages to multiple recipients"""
    try:
        result = await whatsapp_service.send_bulk_messages(data.recipients)
        return result
    except Exception as e:
        logger.error(f"Error sending bulk WhatsApp: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/whatsapp/templates")
async def get_whatsapp_templates():
    """Get list of approved message templates"""
    try:
        result = await whatsapp_service.get_message_templates()
        return result
    except Exception as e:
        logger.error(f"Error fetching templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/whatsapp/messages/{customer_id}")
async def get_customer_whatsapp_messages(customer_id: str):
    """Get WhatsApp message history for a customer"""
    try:
        messages = await db.whatsapp_messages.find(
            {"$or": [{"from": customer_id}, {"to": customer_id}]}
        ).sort("timestamp", -1).limit(50).to_list(50)
        
        return {
            "success": True,
            "messages": messages
        }
    except Exception as e:
        logger.error(f"Error fetching all messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/whatsapp/messages-by-phone/{phone}")
async def get_whatsapp_messages_by_phone(phone: str):
    """
    Get WhatsApp message history for a customer by phone number
    """
    try:
        # Clean phone number
        phone_clean = phone.replace('+', '').replace(' ', '').replace('-', '')
        
        # Get customer messages from customer record
        customer = await db.customers.find_one(
            {'phone': {'$regex': phone_clean}},
            {'_id': 0, 'whatsapp_messages': 1, 'first_name': 1, 'last_name': 1}
        )
        
        if not customer:
            return {
                'success': True,
                'messages': [],
                'customer_name': 'Unknown'
            }
        
        messages = customer.get('whatsapp_messages', [])
        
        # Sort by timestamp
        messages.sort(key=lambda x: x.get('timestamp', ''), reverse=False)
        
        return {
            'success': True,
            'messages': messages,
            'customer_name': f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
        }
        
    except Exception as e:
        logger.error(f"Error fetching messages by phone: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@api_router.post("/whatsapp/templates/create")
async def create_template(data: dict):
    """
    Create a new WhatsApp message template and submit for approval
    """
    try:
        name = data.get("name")
        category = data.get("category")
        language = data.get("language", "en")
        body_text = data.get("body")
        header_text = data.get("header")
        footer_text = data.get("footer")
        buttons = data.get("buttons")
        
        # Validate required fields
        if not name or not category or not body_text:
            raise HTTPException(status_code=400, detail="Name, category, and body are required")
        
        # Validate template name format (lowercase, underscores only)
        if not name.replace("_", "").isalnum() or name != name.lower():
            raise HTTPException(
                status_code=400, 
                detail="Template name must be lowercase with underscores only (e.g., order_confirmation)"
            )
        
        # Create template via WhatsApp API
        result = await whatsapp_service.create_message_template(
            name=name,
            category=category,
            language=language,
            body_text=body_text,
            header_text=header_text,
            footer_text=footer_text,
            buttons=buttons
        )
        
        # Store template creation in database for tracking
        if result.get("success"):
            await db.whatsapp_template_submissions.insert_one({
                "template_id": result.get("template_id"),
                "name": name,
                "category": category,
                "language": language,
                "status": result.get("status", "PENDING"),
                "body": body_text,
                "header": header_text,
                "footer": footer_text,
                "submitted_at": datetime.now(timezone.utc).isoformat(),
                "submitted_by": "dashboard"
            })
        
        return result
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/whatsapp/templates/{template_name}")
async def delete_template(template_name: str):
    """Delete a WhatsApp message template"""
    try:
        result = await whatsapp_service.delete_message_template(template_name)
        return result
    except Exception as e:
        logger.error(f"Error deleting template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

        logger.error(f"Error fetching messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/whatsapp/messages/all")
async def get_all_whatsapp_messages(limit: int = 100):
    """Get all WhatsApp message history"""
    try:
        messages = await db.whatsapp_messages.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return {
            "success": True,
            "messages": messages
        }
    except Exception as e:
        logger.error(f"Error fetching all messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/whatsapp/send-template")
async def send_template_whatsapp(data: dict):
    """Send a WhatsApp template message"""
    try:
        phone = data.get("phone")
        template_name = data.get("template_name")
        language = data.get("language", "en")
        variables = data.get("variables", [])
        
        # Build components for template
        components = []
        if variables:
            components.append({
                "type": "body",
                "parameters": [{"type": "text", "text": str(var)} for var in variables]
            })
        
        result = await whatsapp_service.send_template_message(
            to=phone,
            template_name=template_name,
            language_code=language,
            components=components if components else None
        )
        return result
    except Exception as e:
        logger.error(f"Error sending template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/whatsapp/notify-order-status")
async def notify_order_status_change(data: dict):
    """Send automatic WhatsApp notification when order status changes"""
    try:
        customer_id = data.get("customer_id")
        store_name = data.get("store_name")
        new_status = data.get("new_status")
        
        # Get customer details
        customer = await db.customers.find_one(
            {"customer_id": customer_id, "store_name": store_name},
            {"_id": 0}
        )
        
        if not customer or not customer.get("phone"):
            return {"success": False, "error": "Customer not found or no phone number"}
        
        # Create status-specific message
        message = generate_status_message(customer, new_status)
        
        # Send WhatsApp
        result = await whatsapp_service.send_text_message(customer["phone"], message)
        
        # Log notification
        if result.get("success"):
            await db.whatsapp_messages.insert_one({
                "customer_id": customer_id,
                "to": customer["phone"],
                "message": message,
                "message_id": result.get("message_id"),
                "type": "status_notification",
                "status": new_status,
                "direction": "outgoing",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        return result
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= WhatsApp Marketing API Endpoints =============

@api_router.post("/whatsapp/marketing/send")
async def send_marketing_message(data: dict):
    """
    Send marketing template message (promotional content)
    Uses AI-optimized delivery for better engagement
    """
    try:
        phone = data.get("phone")
        template_name = data.get("template_name")
        language = data.get("language", "en")
        variables = data.get("variables", [])
        campaign_id = data.get("campaign_id")
        
        # Build components
        components = []
        if variables:
            components.append({
                "type": "body",
                "parameters": [{"type": "text", "text": str(var)} for var in variables]
            })
        
        result = await whatsapp_marketing.send_marketing_template(
            to=phone,
            template_name=template_name,
            language_code=language,
            components=components if components else None,
            campaign_id=campaign_id
        )
        
        # Log marketing message
        if result.get("success"):
            await db.whatsapp_messages.insert_one({
                "message_id": result.get("message_id"),
                "to": phone,
                "type": "marketing",
                "template_name": template_name,
                "campaign_id": campaign_id,
                "direction": "outgoing",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        return result
    except Exception as e:
        logger.error(f"Error sending marketing message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/whatsapp/marketing/campaign")
async def send_marketing_campaign(data: dict):
    """
    Send marketing campaign to multiple recipients
    Features:
    - AI-optimized delivery
    - Smart targeting
    - Performance tracking
    """
    try:
        recipient_list = data.get("recipients", [])
        template_name = data.get("template_name")
        language = data.get("language", "en")
        variables = data.get("variables", [])
        campaign_name = data.get("campaign_name")
        
        if not recipient_list:
            raise HTTPException(status_code=400, detail="Recipients list is required")
        
        # Build components
        components = []
        if variables:
            components.append({
                "type": "body",
                "parameters": [{"type": "text", "text": str(var)} for var in variables]
            })
        
        result = await whatsapp_marketing.send_marketing_campaign(
            recipient_list=recipient_list,
            template_name=template_name,
            language_code=language,
            components=components if components else None,
            campaign_name=campaign_name
        )
        
        # Store campaign results
        await db.whatsapp_campaigns.insert_one({
            "campaign_id": result.get("campaign_id"),
            "campaign_name": campaign_name,
            "template_name": template_name,
            "total_recipients": result.get("total_recipients"),
            "sent": result.get("sent"),
            "failed": result.get("failed"),
            "success_rate": result.get("success_rate"),
            "started_at": result.get("started_at"),
            "completed_at": result.get("completed_at"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return result
    except Exception as e:
        logger.error(f"Error sending campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/whatsapp/marketing/templates")
async def get_marketing_templates():
    """Get recommended marketing templates"""
    try:
        return {
            "success": True,
            "templates": MARKETING_TEMPLATES
        }
    except Exception as e:
        logger.error(f"Error fetching marketing templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/whatsapp/campaigns")
async def get_campaigns(limit: int = 50):
    """Get marketing campaign history"""
    try:
        campaigns = await db.whatsapp_campaigns.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        return {
            "success": True,
            "campaigns": campaigns
        }
    except Exception as e:
        logger.error(f"Error fetching campaigns: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/whatsapp/campaigns/{campaign_id}/analytics")
async def get_campaign_analytics(campaign_id: str):
    """Get campaign performance analytics"""
    try:
        result = await whatsapp_marketing.get_campaign_analytics(campaign_id)
        return result
    except Exception as e:
        logger.error(f"Error fetching analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

        
        if not customer or not customer.get("phone"):
            return {"success": False, "error": "Customer not found or no phone number"}
        
        # Create status-specific message
        message = generate_status_message(customer, new_status)
        
        # Send WhatsApp
        result = await whatsapp_service.send_text_message(customer["phone"], message)
        
        # Log notification
        if result.get("success"):
            await db.whatsapp_messages.insert_one({
                "customer_id": customer_id,
                "to": customer["phone"],
                "message": message,
                "message_id": result.get("message_id"),
                "type": "status_notification",
                "status": new_status,
                "direction": "outgoing",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        return result
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def generate_status_message(customer: dict, status: str) -> str:
    """Generate appropriate message based on order status"""
    name = customer.get("first_name", "Customer")
    order_num = customer.get("order_number", "N/A")
    tracking = customer.get("tracking_number", "N/A")
    
    messages = {
        "DELIVERED": f"Hi {name}! 🎉\n\nYour order #{order_num} has been delivered successfully!\n\nThank you for shopping with TNV Collection. We hope you love your purchase!\n\nHave questions? Feel free to reply!",
        
        "IN_TRANSIT": f"Hello {name}! 📦\n\nGood news! Your order #{order_num} is now in transit.\n\nTracking: {tracking}\n\nExpected delivery soon. We'll keep you updated!\n\nTNV Collection",
        
        "OUT_FOR_DELIVERY": f"Hi {name}! 🚚\n\nYour order #{order_num} is out for delivery today!\n\nTracking: {tracking}\n\nPlease keep your phone handy. Our delivery person will contact you shortly.\n\nTNV Collection",
        
        "RETURN_IN_PROCESS": f"Hello {name},\n\nYour order #{order_num} is being returned.\n\nTracking: {tracking}\n\nIf you have any concerns, please contact us.\n\nTNV Collection",
        
        "WAITING_TO_BE_PICKED_UP": f"Hi {name}! 📋\n\nYour order #{order_num} is ready and waiting to be picked up by our courier.\n\nTracking: {tracking}\n\nWe'll notify you once it's dispatched!\n\nTNV Collection"
    }
    
    return messages.get(status, f"Hi {name},\n\nOrder #{order_num} status update:\nStatus: {status}\nTracking: {tracking}\n\nTNV Collection")

# ========================================
# AUTO-SYNC SETTINGS ENDPOINTS
# ========================================

class AutoSyncSettings(BaseModel):
    enabled: bool = False
    interval_minutes: int = 60
    sync_shopify: bool = True
    sync_tcs: bool = True
    sync_dtdc: bool = True
    sync_inventory: bool = True
    last_sync: Optional[str] = None

@api_router.get("/settings/auto-sync")
async def get_auto_sync_settings():
    """Get auto-sync configuration"""
    try:
        settings = await db.system_settings.find_one(
            {"setting_type": "auto_sync"},
            {"_id": 0}
        )
        
        if not settings:
            # Return default settings
            return {
                "enabled": False,
                "interval_minutes": 60,
                "sync_shopify": True,
                "sync_tcs": True,
                "sync_dtdc": True,
                "sync_inventory": True,
                "last_sync": None
            }
        
        return settings
        
    except Exception as e:
        logger.error(f"Error fetching auto-sync settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/settings/auto-sync")
async def update_auto_sync_settings(settings: AutoSyncSettings):
    """Update auto-sync configuration"""
    try:
        settings_dict = settings.model_dump()
        settings_dict["setting_type"] = "auto_sync"
        settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.system_settings.update_one(
            {"setting_type": "auto_sync"},
            {"$set": settings_dict},
            upsert=True
        )
        
        # If enabled, trigger an immediate sync
        if settings.enabled:
            # Trigger background sync
            logger.info(f"Auto-sync enabled with {settings.interval_minutes} minute interval")
        
        return {
            "success": True,
            "message": "Auto-sync settings updated",
            "settings": settings_dict
        }
        
    except Exception as e:
        logger.error(f"Error updating auto-sync settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/settings/auto-sync/trigger")
async def trigger_manual_sync():
    """Manually trigger a sync of all stores"""
    try:
        settings = await db.system_settings.find_one({"setting_type": "auto_sync"})
        
        if not settings:
            raise HTTPException(status_code=400, detail="Auto-sync not configured")
        
        # Get all stores
        stores = await db.stores.find({}, {"_id": 0, "store_name": 1}).to_list(100)
        
        sync_results = []
        
        for store in stores:
            store_name = store["store_name"]
            
            try:
                # Sync Shopify orders
                if settings.get("sync_shopify", True):
                    logger.info(f"Syncing Shopify orders for {store_name}...")
                    # Call Shopify sync endpoint internally
                    # This will be done via the existing sync endpoint
                
                # Sync inventory
                if settings.get("sync_inventory", True):
                    logger.info(f"Syncing inventory for {store_name}...")
                    # Call inventory sync function
                    sync_result = await sync_inventory_with_store(store_name)
                    sync_results.append(sync_result)
                
            except Exception as e:
                logger.error(f"Error syncing {store_name}: {str(e)}")
                sync_results.append({
                    "store_name": store_name,
                    "success": False,
                    "error": str(e)
                })
        
        # Update last sync time
        await db.system_settings.update_one(
            {"setting_type": "auto_sync"},
            {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {
            "success": True,
            "message": "Manual sync completed",
            "stores_synced": len(sync_results),
            "results": sync_results
        }
        
    except Exception as e:
        logger.error(f"Error triggering manual sync: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# Include the new modular routers BEFORE adding api_router to app
api_router.include_router(facebook_router)
api_router.include_router(finance_router)
api_router.include_router(pricing_router)
api_router.include_router(tcs_router)
api_router.include_router(customers_router)
api_router.include_router(clearance_router)

# Include the router in the main app
app.include_router(api_router)
app.include_router(whatsapp_webhook_router)
app.include_router(tracking_router)
# Note: whatsapp_crm_router is now included via api_router (line 5667)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add middleware to prevent caching
class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

app.add_middleware(NoCacheMiddleware)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_auto_sync():
    """Start automatic TCS sync on server startup"""
    try:
        from auto_tcs_sync import AutoTCSSync
        
        # Get TCS config
        config = await db.tcs_config.find_one({'service': 'tcs_pakistan'}, {'_id': 0})
        
        if config:
            logger.info("🚀 Starting automatic TCS sync service...")
            auto_sync = AutoTCSSync(db, config)
            
            # Run in background
            asyncio.create_task(auto_sync.run_continuous_sync(
                batch_size=20,           # Process 20 orders at a time
                delay_between_orders=3,   # 3 seconds between each order
                delay_between_batches=60  # 1 minute between batches
            ))
            
            logger.info("✅ Automatic TCS sync service started successfully")
        else:
            logger.warning("⚠️ TCS not configured - automatic sync disabled")
            
    except Exception as e:
        logger.error(f"❌ Failed to start auto sync: {str(e)}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
