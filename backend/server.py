from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
from fastapi import File, UploadFile
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
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

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
    access_token: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StoreCreate(BaseModel):
    store_name: str
    shop_url: str
    access_token: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Shopify Customer Manager API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


@api_router.post("/shopify/sync-all")
async def sync_all_customers(config: ShopifyConfig):
    """
    Sync ALL customers directly from Shopify (faster for large datasets)
    """
    try:
        # Setup Shopify session
        shop_url = config.shop_url.replace('http://', '').replace('https://', '')
        shopify.ShopifyResource.set_site(f"https://{shop_url}/admin/api/2024-10")
        shopify.ShopifyResource.headers = {"X-Shopify-Access-Token": config.access_token}
        
        # Fetch all customers with pagination
        all_customers = []
        since_id = 0
        batch_count = 0
        
        while True:
            batch_count += 1
            logger.info(f"Fetching customers batch {batch_count} (since_id: {since_id})...")
            
            if since_id == 0:
                customers = shopify.Customer.find(limit=250)
            else:
                customers = shopify.Customer.find(limit=250, since_id=since_id)
            
            if not customers:
                logger.info("No more customers to fetch")
                break
                
            all_customers.extend(customers)
            logger.info(f"Fetched {len(customers)} customers in batch {batch_count}. Total so far: {len(all_customers)}")
            
            if len(customers) < 250:
                logger.info("Reached last batch")
                break
            
            since_id = int(customers[-1].id)
        
        logger.info(f"Total customers fetched: {len(all_customers)}")
        
        # Now fetch orders for each customer to get sizes
        customer_data = {}
        logger.info("Fetching order data for customers...")
        
        for idx, customer in enumerate(all_customers):
            if (idx + 1) % 50 == 0:
                logger.info(f"Processing customer {idx + 1}/{len(all_customers)}")
            
            customer_id = str(customer.id)
            
            # Get customer basic info
            first_name = getattr(customer, 'first_name', '') or ''
            last_name = getattr(customer, 'last_name', '') or ''
            email = getattr(customer, 'email', None)
            phone = getattr(customer, 'phone', None)
            
            # Get country from default address
            country_code = None
            if hasattr(customer, 'default_address') and customer.default_address:
                country_code = getattr(customer.default_address, 'country_code', None)
                if not phone:
                    phone = getattr(customer.default_address, 'phone', None)
            
            customer_data[customer_id] = {
                'customer_id': customer_id,
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'phone': phone,
                'country_code': country_code,
                'shoe_sizes': set(),
                'order_count': getattr(customer, 'orders_count', 0),
                'last_order_date': None,
                'total_spent': float(getattr(customer, 'total_spent', 0) or 0)
            }
        
        # Fetch orders to get product variants/sizes
        logger.info("Fetching orders to extract sizes and phone numbers...")
        all_orders = []
        since_id = 0
        batch_count = 0
        
        while True:
            batch_count += 1
            logger.info(f"Fetching orders batch {batch_count} (since_id: {since_id})...")
            
            if since_id == 0:
                orders = shopify.Order.find(limit=250, status="any")
            else:
                orders = shopify.Order.find(limit=250, status="any", since_id=since_id)
            
            if not orders or len(orders) == 0:
                logger.info("No more orders to fetch")
                break
                
            all_orders.extend(orders)
            logger.info(f"Fetched {len(orders)} orders in batch {batch_count}. Total so far: {len(all_orders)}")
            
            # Update since_id to last order's ID for next batch
            since_id = int(orders[-1].id)
            
            # Continue fetching even if less than 250, only stop if we get 0 orders
        
        logger.info(f"Processing {len(all_orders)} orders for size extraction...")
        
        # Extract sizes and phone numbers from orders
        for order in all_orders:
            if not hasattr(order, 'customer') or not order.customer:
                continue
            
            customer_id = str(order.customer.id)
            
            if customer_id not in customer_data:
                continue
            
            # Update phone number from shipping or billing address
            if not customer_data[customer_id]['phone']:
                if hasattr(order, 'shipping_address') and order.shipping_address:
                    phone = getattr(order.shipping_address, 'phone', None)
                    if phone:
                        customer_data[customer_id]['phone'] = phone
                        if not customer_data[customer_id]['country_code']:
                            customer_data[customer_id]['country_code'] = getattr(order.shipping_address, 'country_code', None)
                
                if not customer_data[customer_id]['phone'] and hasattr(order, 'billing_address') and order.billing_address:
                    phone = getattr(order.billing_address, 'phone', None)
                    if phone:
                        customer_data[customer_id]['phone'] = phone
                        if not customer_data[customer_id]['country_code']:
                            customer_data[customer_id]['country_code'] = getattr(order.billing_address, 'country_code', None)
            
            # Update last order date
            if hasattr(order, 'created_at') and order.created_at:
                order_date = str(order.created_at)
                if not customer_data[customer_id]['last_order_date'] or order_date > customer_data[customer_id]['last_order_date']:
                    customer_data[customer_id]['last_order_date'] = order_date
            
            # Extract clothing sizes from line items
            if hasattr(order, 'line_items') and order.line_items:
                for item in order.line_items:
                    if hasattr(item, 'variant_title') and item.variant_title:
                        variant_title = str(item.variant_title).strip()
                        if variant_title and variant_title.lower() != 'default title':
                            customer_data[customer_id]['shoe_sizes'].add(variant_title)
        
        # Convert sets to lists and save to database
        customers_list = []
        for cust_id, cust_data in customer_data.items():
            cust_data['shoe_sizes'] = list(cust_data['shoe_sizes'])
            if not cust_data['shoe_sizes']:
                cust_data['shoe_sizes'] = ['Unknown']
            customers_list.append(cust_data)
        
        logger.info(f"Prepared {len(customers_list)} customers for database insertion")
        
        # Clear existing customers and insert new data
        await db.customers.delete_many({})
        if customers_list:
            result = await db.customers.insert_many(customers_list)
            logger.info(f"Inserted {len(result.inserted_ids)} customers into database")
        
        return SyncResponse(
            success=True,
            message=f"Successfully synced {len(customers_list)} customers from {len(all_orders)} orders",
            customers_synced=len(customers_list),
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error syncing all customers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to sync customers: {str(e)}")


@api_router.post("/shopify/sync", response_model=SyncResponse)
async def sync_shopify_data(config: ShopifyConfig):
    """
    Sync customer data from Shopify (orders-based method)
    """
    try:
        # Setup Shopify session
        shop_url = config.shop_url.replace('http://', '').replace('https://', '')
        shopify.ShopifyResource.set_site(f"https://{shop_url}/admin/api/2024-10")
        shopify.ShopifyResource.headers = {"X-Shopify-Access-Token": config.access_token}
        
        # Fetch ALL orders with cursor-based pagination
        all_orders = []
        since_id = 0
        batch_count = 0
        
        while True:
            batch_count += 1
            logger.info(f"Fetching orders batch {batch_count} (since_id: {since_id})...")
            
            # Fetch orders after the last ID
            if since_id == 0:
                orders = shopify.Order.find(limit=250, status="any")
            else:
                orders = shopify.Order.find(limit=250, status="any", since_id=since_id)
            
            if not orders or len(orders) == 0:
                logger.info("No more orders to fetch")
                break
                
            all_orders.extend(orders)
            logger.info(f"Fetched {len(orders)} orders in batch {batch_count}. Total so far: {len(all_orders)}")
            
            # Update since_id to the ID of the last order for next iteration
            since_id = int(orders[-1].id)
            
            # Log progress every 10 batches
            if batch_count % 10 == 0:
                logger.info(f"Progress: {len(all_orders)} orders fetched so far...")
        
        logger.info(f"Total orders fetched: {len(all_orders)}")
        
        # Dictionary to store customer data
        customer_data = {}
        
        # Process orders
        for order in all_orders:
            if not hasattr(order, 'customer') or not order.customer:
                continue
                
            customer_id = str(order.customer.id)
            
            # Initialize customer if not exists
            if customer_id not in customer_data:
                # Extract country code from shipping or billing address
                country_code = None
                if hasattr(order, 'shipping_address') and order.shipping_address and hasattr(order.shipping_address, 'country_code'):
                    country_code = order.shipping_address.country_code
                elif hasattr(order, 'billing_address') and order.billing_address and hasattr(order.billing_address, 'country_code'):
                    country_code = order.billing_address.country_code
                
                # Safely extract customer attributes
                first_name = getattr(order.customer, 'first_name', '') or ''
                last_name = getattr(order.customer, 'last_name', '') or ''
                email = getattr(order.customer, 'email', None)
                phone = getattr(order.customer, 'phone', None)
                
                # Try to get phone from default address if not available
                if not phone and hasattr(order.customer, 'default_address') and order.customer.default_address:
                    phone = getattr(order.customer.default_address, 'phone', None)
                
                customer_data[customer_id] = {
                    'customer_id': customer_id,
                    'first_name': first_name,
                    'last_name': last_name,
                    'email': email,
                    'phone': phone,
                    'country_code': country_code,
                    'shoe_sizes': set(),
                    'order_count': 0,
                    'last_order_date': None,
                    'total_spent': 0.0
                }
            
            # Update customer data
            customer_data[customer_id]['order_count'] += 1
            
            # Safely get total price
            total_price = getattr(order, 'total_price', 0) or 0
            customer_data[customer_id]['total_spent'] += float(total_price)
            
            # Update phone from order addresses if not available
            if not customer_data[customer_id]['phone']:
                if hasattr(order, 'shipping_address') and order.shipping_address:
                    phone = getattr(order.shipping_address, 'phone', None)
                    if phone:
                        customer_data[customer_id]['phone'] = phone
                        if not customer_data[customer_id]['country_code']:
                            customer_data[customer_id]['country_code'] = getattr(order.shipping_address, 'country_code', None)
                
                if not customer_data[customer_id]['phone'] and hasattr(order, 'billing_address') and order.billing_address:
                    phone = getattr(order.billing_address, 'phone', None)
                    if phone:
                        customer_data[customer_id]['phone'] = phone
                        if not customer_data[customer_id]['country_code']:
                            customer_data[customer_id]['country_code'] = getattr(order.billing_address, 'country_code', None)
            
            # Update last order date
            if hasattr(order, 'created_at') and order.created_at:
                order_date = str(order.created_at)
                if not customer_data[customer_id]['last_order_date'] or order_date > customer_data[customer_id]['last_order_date']:
                    customer_data[customer_id]['last_order_date'] = order_date
            
            # Extract clothing sizes from line items
            if hasattr(order, 'line_items') and order.line_items:
                for item in order.line_items:
                    if hasattr(item, 'variant_title') and item.variant_title:
                        # Extract size from variant title
                        variant_title = str(item.variant_title).strip()
                        if variant_title and variant_title.lower() != 'default title':
                            customer_data[customer_id]['shoe_sizes'].add(variant_title)
        
        # Convert sets to lists and save to database
        customers_list = []
        for cust_id, cust_data in customer_data.items():
            cust_data['shoe_sizes'] = list(cust_data['shoe_sizes'])
            if not cust_data['shoe_sizes']:
                cust_data['shoe_sizes'] = ['Unknown']
            customers_list.append(cust_data)
        
        logger.info(f"Prepared {len(customers_list)} customers for database insertion")
        
        # Clear existing customers and insert new data
        await db.customers.delete_many({})
        if customers_list:
            result = await db.customers.insert_many(customers_list)
            logger.info(f"Inserted {len(result.inserted_ids)} customers into database")
        
        return SyncResponse(
            success=True,
            message=f"Successfully synced {len(customers_list)} customers",
            customers_synced=len(customers_list),
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error syncing Shopify data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to sync Shopify data: {str(e)}")


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


class WhatsAppRequest(BaseModel):
    phone: str
    country_code: Optional[str] = None

@api_router.post("/stores", response_model=Store)
async def create_store(store: StoreCreate):
    """
    Add a new Shopify store
    """
    try:
        store_obj = Store(**store.model_dump())
        doc = store_obj.model_dump()
        await db.stores.insert_one(doc)
        return store_obj
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
    Delete a store
    """
    result = await db.stores.delete_one({"id": store_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Store not found")
    return {"success": True, "message": "Store deleted"}


class CSVUploadRequest(BaseModel):
    store_name: Optional[str] = None


@api_router.post("/upload-csv")
async def upload_shopify_csv(file: UploadFile = File(...), store_name: str = "Default Store"):
    """
    Upload Shopify orders CSV export and extract customer data
    """
    try:
        # Read CSV content
        content = await file.read()
        csv_text = content.decode('utf-8')
        
        # Parse CSV
        customers_list = parse_shopify_orders_csv(csv_text)
        
        # Add store name to each customer
        for customer in customers_list:
            customer['store_name'] = store_name
        
        logger.info(f"Parsed {len(customers_list)} customers from CSV for store: {store_name}")
        
        # Remove existing customers from this store, then insert new data
        await db.customers.delete_many({"store_name": store_name})
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