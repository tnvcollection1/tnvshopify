"""
Background Scheduler for Automatic Syncing
P1: Automatic Background Syncing Implementation

Schedules:
- Shopify orders sync: Every 1 hour (incremental - last 7 days)
- TCS delivery status: Every 2 hours (update tracking numbers)
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from shopify_sync_async import ShopifyAsyncSync
from tcs_tracking import TCSTracker

logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'shopify_customers_db')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


class AutoSyncScheduler:
    """Manages automatic background syncing for Shopify and TCS"""
    
    def __init__(self):
        self.scheduler = BackgroundScheduler(timezone="UTC")
        self.is_running = False
        
    def start(self):
        """Start the background scheduler"""
        if self.is_running:
            logger.warning("Scheduler already running")
            return
        
        # Schedule Shopify sync every 1 hour for all stores
        self.scheduler.add_job(
            func=self.sync_all_shopify_stores,
            trigger=IntervalTrigger(hours=1),
            id='shopify_sync',
            name='Shopify Orders Sync (Hourly - All Stores)',
            replace_existing=True,
            max_instances=1,  # Prevent overlapping jobs
            coalesce=True  # Combine missed jobs into one
        )
        
        # Schedule TCS delivery sync every 2 hours
        self.scheduler.add_job(
            func=self.sync_tcs_deliveries,
            trigger=IntervalTrigger(hours=2),
            id='tcs_sync',
            name='TCS Delivery Status Sync (Every 2 Hours)',
            replace_existing=True,
            max_instances=1,
            coalesce=True
        )
        
        # Dynamic Pricing sync - DISABLED for manual trigger only
        # Automatic sync disabled to prevent resource blocking
        # Use the API endpoint to trigger sync manually
        # self.scheduler.add_job(
        #     func=self.sync_dynamic_pricing,
        #     trigger=IntervalTrigger(minutes=30),
        #     id='pricing_sync',
        #     name='Dynamic Pricing Sync to Shopify (Every 30 Minutes)',
        #     replace_existing=True,
        #     max_instances=1,
        #     coalesce=True
        # )
        
        # Schedule TCS COD payment sync every 4 hours
        # TEMPORARILY DISABLED: COD Payment API returning 404 - needs different credentials
        # Uncomment when proper API access is obtained from TCS
        # self.scheduler.add_job(
        #     func=self.sync_cod_payments,
        #     trigger=IntervalTrigger(hours=4),
        #     id='cod_payment_sync',
        #     name='TCS COD Payment Sync (Every 4 Hours)',
        #     replace_existing=True,
        #     max_instances=1,
        #     coalesce=True
        # )
        
        # Schedule DWZ56 tracking sync every 4 hours
        self.scheduler.add_job(
            func=self.sync_dwz_tracking,
            trigger=IntervalTrigger(hours=4),
            id='dwz_sync',
            name='DWZ56 Tracking Sync (Every 4 Hours)',
            replace_existing=True,
            max_instances=1,
            coalesce=True
        )
        
        # Start scheduler
        self.scheduler.start()
        self.is_running = True
        
        logger.info("✅ Background scheduler started")
        logger.info("📅 Shopify sync: Every 1 hour (incremental)")
        logger.info("📅 TCS delivery sync: Every 2 hours")
        logger.info("📅 Dynamic pricing sync: Every 30 minutes")
        logger.info("⏸️  TCS COD payment sync: DISABLED (waiting for API credentials)")
        
        # DISABLED: Initial sync on startup - causing blocking issues
        # User can manually trigger sync from API when needed
        # self.scheduler.add_job(
        #     func=self.sync_shopify_orders,
        #     trigger='date',
        #     run_date=datetime.now(timezone.utc) + timedelta(minutes=2),
        #     id='initial_shopify_sync',
        #     name='Initial Shopify Sync'
        # )
        
    def stop(self):
        """Stop the background scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("🛑 Background scheduler stopped")
    
    def sync_all_shopify_stores(self):
        """
        Sync Shopify orders for ALL configured stores
        Runs in separate thread, calls API endpoint for each store
        """
        try:
            logger.info("🔄 [AUTO] Starting Shopify orders sync for ALL stores...")
            
            import requests
            
            # Get all configured stores from database
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            stores = loop.run_until_complete(self._get_configured_stores())
            loop.close()
            
            if not stores:
                logger.info("ℹ️ [AUTO] No Shopify stores configured")
                return
            
            total_orders = 0
            stores_synced = 0
            
            for store in stores:
                store_name = store.get('store_name')
                if not store_name:
                    continue
                    
                try:
                    logger.info(f"🔄 [AUTO] Syncing store: {store_name}...")
                    response = requests.post(
                        f"http://localhost:8001/api/shopify/sync/{store_name}?days_back=7",
                        timeout=180  # 3 minutes timeout per store
                    )
                    if response.status_code == 200:
                        data = response.json()
                        if data.get('success'):
                            orders = data.get('orders_synced', 0)
                            total_orders += orders
                            stores_synced += 1
                            logger.info(f"✅ [AUTO] {store_name}: {orders} orders synced")
                        else:
                            logger.error(f"❌ [AUTO] {store_name} sync failed: {data.get('detail', 'Unknown error')}")
                    else:
                        logger.error(f"❌ [AUTO] {store_name} HTTP error: {response.status_code}")
                except requests.exceptions.Timeout:
                    logger.warning(f"⚠️ [AUTO] {store_name} sync timeout")
                except Exception as req_error:
                    logger.error(f"❌ [AUTO] {store_name} error: {str(req_error)}")
            
            logger.info(f"✅ [AUTO] Shopify sync completed: {stores_synced} stores, {total_orders} total orders")
                
        except Exception as e:
            logger.error(f"❌ [AUTO] Shopify sync error: {str(e)}")
    
    async def _get_configured_stores(self):
        """Get all stores with Shopify credentials configured"""
        try:
            stores = await db.stores.find({
                "shopify_domain": {"$ne": None, "$exists": True},
                "shopify_token": {"$ne": None, "$exists": True}
            }, {"_id": 0, "store_name": 1, "shopify_domain": 1}).to_list(20)
            return stores
        except Exception as e:
            logger.error(f"Error getting stores: {str(e)}")
            return []
    
    def sync_shopify_orders(self):
        """
        Sync Shopify orders for all configured stores
        Runs in separate thread, calls API endpoint to avoid event loop conflicts
        """
        try:
            logger.info("🔄 [AUTO] Starting Shopify orders sync...")
            
            import requests
            
            # Call the fast sync endpoint via HTTP
            try:
                response = requests.post(
                    "http://localhost:8001/api/shopify/sync-fast/tnvcollectionpk?days_back=3650",
                    timeout=300  # 5 minutes timeout for historical data
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        logger.info(f"✅ [AUTO] Shopify sync completed: {data.get('orders_synced', 0)} orders, "
                                  f"{data.get('customers_updated', 0)} customers updated")
                    else:
                        logger.error(f"❌ [AUTO] Shopify sync failed: {data.get('message', 'Unknown error')}")
                else:
                    logger.error(f"❌ [AUTO] Shopify sync HTTP error: {response.status_code}")
            except requests.exceptions.Timeout:
                logger.warning("⚠️ [AUTO] Shopify sync timeout (still running in background)")
            except Exception as req_error:
                logger.error(f"❌ [AUTO] Shopify sync request error: {str(req_error)}")
                
        except Exception as e:
            logger.error(f"❌ [AUTO] Shopify sync error: {str(e)}")
    
    async def _async_shopify_sync(self):
        """Async implementation of Shopify sync"""
        try:
            # Get all configured stores
            stores = await db.stores.find({
                "shopify_domain": {"$ne": None, "$exists": True},
                "shopify_token": {"$ne": None, "$exists": True}
            }, {"_id": 0}).to_list(10)
            
            if not stores:
                return {"success": True, "total_orders": 0, "stores_synced": 0, "message": "No stores configured"}
            
            total_orders = 0
            stores_synced = 0
            
            for store in stores:
                store_name = store['store_name']
                
                try:
                    # Use fast concurrent sync for incremental updates
                    sync = ShopifyAsyncSync(store['shopify_domain'], store['shopify_token'], max_workers=10)
                    
                    # Sync last 7 days (incremental)
                    created_after = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
                    orders = await sync.fetch_orders_concurrent(created_after=created_after, status="any", max_batches=20)
                    
                    sync.close()
                    
                    if orders:
                        # Process and save orders
                        customers_updated = await self._process_orders(orders, store_name)
                        total_orders += len(orders)
                        stores_synced += 1
                        
                        logger.info(f"✅ [AUTO] {store_name}: {len(orders)} orders, {customers_updated} customers updated")
                    else:
                        logger.info(f"ℹ️ [AUTO] {store_name}: No new orders")
                        
                    # Update last sync time
                    await db.stores.update_one(
                        {"store_name": store_name},
                        {"$set": {"last_synced_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    
                except Exception as e:
                    logger.error(f"❌ [AUTO] Error syncing {store_name}: {str(e)}")
                    continue
            
            return {
                "success": True,
                "total_orders": total_orders,
                "stores_synced": stores_synced
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _process_orders(self, orders, store_name):
        """Process and save orders to database"""
        from uuid import uuid4
        
        customers_updated = 0
        
        for order_data in orders:
            try:
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
                        "id": str(uuid4()),
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
                    customers_updated += 1
                    
            except Exception as e:
                logger.error(f"Error processing order {order_data.get('order_number')}: {str(e)}")
                continue
        
        return customers_updated
    
    def sync_dynamic_pricing(self):
        """
        Sync dynamic prices to Shopify for all enabled pricing rules
        Runs in separate thread, calls API endpoint
        """
        try:
            logger.info("🔄 [AUTO] Starting dynamic pricing sync to Shopify...")
            
            import requests
            
            # Sync prices for ashmiaa store
            try:
                response = requests.post(
                    "http://localhost:8001/api/pricing/sync-all-to-shopify?store_name=ashmiaa&limit=50",
                    timeout=300  # 5 minutes timeout
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        logger.info(f"✅ [AUTO] Pricing sync completed: {data.get('success_count', 0)} prices synced, "
                                  f"{data.get('failed_count', 0)} failed")
                    else:
                        logger.error(f"❌ [AUTO] Pricing sync failed: {data.get('error', 'Unknown error')}")
                else:
                    logger.error(f"❌ [AUTO] Pricing sync HTTP error: {response.status_code}")
            except requests.exceptions.Timeout:
                logger.warning("⚠️ [AUTO] Pricing sync timeout (still running in background)")
            except Exception as req_error:
                logger.error(f"❌ [AUTO] Pricing sync request error: {str(req_error)}")
                
        except Exception as e:
            logger.error(f"❌ [AUTO] Pricing sync error: {str(e)}")
    
    def sync_cod_payments(self):
        """
        Sync TCS COD payment status for all orders
        Runs in separate thread, calls API endpoint
        """
        try:
            logger.info("🔄 [AUTO] Starting TCS COD payment sync...")
            
            import requests
            
            # Call the COD payment sync endpoint via HTTP
            try:
                response = requests.post(
                    "http://localhost:8001/api/tcs/sync-cod-payments",
                    timeout=300  # 5 minutes timeout
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        logger.info(f"✅ [AUTO] COD payment sync completed: {data.get('updated', 0)} payments updated")
                    else:
                        logger.error(f"❌ [AUTO] COD payment sync failed: {data.get('message', 'Unknown error')}")
                else:
                    logger.error(f"❌ [AUTO] COD payment sync HTTP error: {response.status_code}")
            except requests.exceptions.Timeout:
                logger.warning("⚠️ [AUTO] COD payment sync timeout (still running in background)")
            except Exception as req_error:
                logger.error(f"❌ [AUTO] COD payment sync request error: {str(req_error)}")
                
        except Exception as e:
            logger.error(f"❌ [AUTO] COD payment sync error: {str(e)}")
    
    def sync_tcs_deliveries(self):
        """
        Sync TCS delivery status for all orders with tracking numbers
        Runs in separate thread, uses asyncio for async operations
        """
        try:
            logger.info("🔄 [AUTO] Starting TCS delivery status sync...")
            
            # Use ThreadPoolExecutor to avoid event loop conflicts
            import concurrent.futures
            import requests
            
            # Call the sync endpoint via HTTP (simpler than managing event loops)
            try:
                response = requests.post(
                    "http://localhost:8001/api/tcs/sync-all",
                    timeout=300  # 5 minutes timeout
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        logger.info(f"✅ [AUTO] TCS sync completed: {data.get('updated', 0)} deliveries updated")
                    else:
                        logger.error(f"❌ [AUTO] TCS sync failed: {data.get('message', 'Unknown error')}")
                else:
                    logger.error(f"❌ [AUTO] TCS sync HTTP error: {response.status_code}")
            except requests.exceptions.Timeout:
                logger.warning("⚠️ [AUTO] TCS sync timeout (still running in background)")
            except Exception as req_error:
                logger.error(f"❌ [AUTO] TCS sync request error: {str(req_error)}")
                
        except Exception as e:
            logger.error(f"❌ [AUTO] TCS sync error: {str(e)}")
    
    async def _async_tcs_sync(self):
        """Async implementation of TCS delivery sync"""
        try:
            # Get TCS credentials
            config = await db.tcs_config.find_one({"service": "tcs_pakistan"}, {"_id": 0})
            if not config:
                return {"success": True, "updated": 0, "message": "TCS not configured"}
            
            # Get customers with tracking numbers (not delivered yet)
            customers = await db.customers.find({
                "tracking_number": {"$ne": None, "$exists": True},
                "$or": [
                    {"delivery_status": {"$ne": "DELIVERED"}},
                    {"delivery_status": {"$exists": False}}
                ]
            }, {"_id": 0, "tracking_number": 1, "customer_id": 1, "store_name": 1, "delivery_status": 1, "order_skus": 1, "order_number": 1, "stock_deducted": 1}).to_list(500)
            
            if not customers:
                return {"success": True, "updated": 0, "message": "No tracking numbers to update"}
            
            # Initialize TCS tracker
            if config.get('auth_type') == 'bearer':
                tracker = TCSTracker(bearer_token=config.get('bearer_token'))
            else:
                tracker = TCSTracker(
                    username=config.get('username'),
                    password=config.get('password')
                )
            
            updated_count = 0
            
            # Update delivery status for each tracking number
            for customer in customers:
                try:
                    tracking_number = customer['tracking_number']
                    tracking_data = tracker.track_consignment(tracking_number)
                    
                    if tracking_data and tracking_data.get('normalized_status') != 'NOT_FOUND':
                        new_status = tracking_data.get('normalized_status')
                        old_status = customer.get('delivery_status')
                        
                        await db.customers.update_one(
                            {"customer_id": customer['customer_id'], "store_name": customer['store_name']},
                            {"$set": {
                                "delivery_status": new_status,
                                "delivery_location": tracking_data.get('current_location'),
                                "delivery_updated_at": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                        updated_count += 1
                        
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
                        
                        # RESTORE STOCK WHEN ORDER IS RETURNED
                        if new_status == 'RETURNED' and old_status != 'RETURNED':
                            # Check if stock was previously deducted
                            if customer.get('stock_deducted'):
                                from inventory_manager import InventoryManager
                                inv_manager = InventoryManager(db)
                                
                                # Restore stock by adding back the quantities
                                order_skus = customer.get('order_skus', [])
                                store_name = customer.get('store_name')
                                
                                if order_skus and store_name:
                                    for sku_data in order_skus:
                                        sku = sku_data.get('sku')
                                        quantity = sku_data.get('quantity', 1)
                                        
                                        if sku:
                                            # Add back to inventory
                                            await db.inventory_items.update_one(
                                                {"sku": sku.upper(), "store_name": store_name},
                                                {"$inc": {"quantity": quantity}},
                                                upsert=False
                                            )
                                    
                                    # Mark stock as restored
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
                        
                except Exception as e:
                    logger.error(f"Error tracking {customer.get('tracking_number')}: {str(e)}")
                    continue
            
            return {"success": True, "updated": updated_count}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_status(self):
        """Get scheduler status and job info"""
        if not self.is_running:
            return {"running": False}
        
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": str(job.next_run_time) if job.next_run_time else None,
                "trigger": str(job.trigger)
            })
        
        return {
            "running": True,
            "jobs": jobs
        }


# Global scheduler instance
scheduler_instance = None


def get_scheduler():
    """Get or create scheduler instance"""
    global scheduler_instance
    if scheduler_instance is None:
        scheduler_instance = AutoSyncScheduler()
    return scheduler_instance
