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
    order_count: int = 0
    last_order_date: Optional[str] = None
    total_spent: float = 0.0
    store_name: Optional[str] = None


class Store(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    store_name: str
    shop_url: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class StoreCreate(BaseModel):
    store_name: str
    shop_url: str


class WhatsAppRequest(BaseModel):
    phone: str
    country_code: Optional[str] = None


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Customer Manager API"}


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
        
        # Remove existing customers from this store, then insert new data
        deleted = await db.customers.delete_many({"store_name": store_name})
        logger.info(f"Deleted {deleted.deleted_count} existing customers from {store_name}")
        
        if customers_list:
            result = await db.customers.insert_many(customers_list)
            logger.info(f"Inserted {len(result.inserted_ids)} customers into database")
        
        return {
            "success": True,
            "message": f"Successfully imported {len(customers_list)} customers from {store_name}",
            "customers_imported": len(customers_list),
            "store_name": store_name
        }
        
    except Exception as e:
        logger.error(f"Error uploading CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")


@api_router.get("/customers", response_model=List[Customer])
async def get_customers(shoe_size: Optional[str] = None, store_name: Optional[str] = None):
    """
    Get all customers, optionally filtered by shoe size and store
    """
    query = {}
    if shoe_size and shoe_size != "all":
        query['shoe_sizes'] = shoe_size
    if store_name and store_name != "all":
        query['store_name'] = store_name
    
    customers = await db.customers.find(query, {"_id": 0}).to_list(10000)
    return customers


@api_router.get("/shoe-sizes")
async def get_shoe_sizes():
    """
    Get all unique shoe sizes
    """
    customers = await db.customers.find({}, {"_id": 0, "shoe_sizes": 1}).to_list(10000)
    
    all_sizes = set()
    for customer in customers:
        for size in customer.get('shoe_sizes', []):
            all_sizes.add(size)
    
    return {"shoe_sizes": sorted(list(all_sizes))}


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
