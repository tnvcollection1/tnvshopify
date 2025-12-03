"""
Automatic TCS Sync Service
Runs continuously in background to sync TCS tracking numbers
"""
import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
import time

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AutoTCSSync:
    def __init__(self, db, tcs_config):
        self.db = db
        self.tcs_config = tcs_config
        self.is_running = False
        self.synced_today = 0
        
    async def sync_one_order(self, customer, tracker):
        """Sync a single order"""
        try:
            tracking_number = customer['tracking_number']
            old_status = customer.get('delivery_status', 'NOT SET')
            
            # Track with TCS API
            tracking_data = tracker.track_consignment(tracking_number)
            
            if tracking_data:
                new_status = tracking_data.get('normalized_status')
                location = tracking_data.get('current_location')
                
                # SKIP if status is UNKNOWN or NOT_FOUND (old/invalid tracking)
                if new_status in ['UNKNOWN', 'NOT_FOUND', None]:
                    logger.debug(f"⏭️  Skipping {tracking_number}: Status is {new_status}")
                    # Mark as synced so we don't keep trying
                    await self.db.customers.update_one(
                        {'customer_id': customer['customer_id'], 'store_name': customer['store_name']},
                        {'$set': {'last_auto_sync': datetime.now(timezone.utc).isoformat()}}
                    )
                    return False
                
                # Prepare update data
                update_data = {
                    'delivery_status': new_status,
                    'delivery_location': location,
                    'delivery_updated_at': datetime.now(timezone.utc).isoformat(),
                    'last_auto_sync': datetime.now(timezone.utc).isoformat()
                }
                
                # Add payment information if available
                if tracking_data.get('payment_info'):
                    payment = tracking_data['payment_info']
                    update_data['payment_status'] = payment.get('payment_status', 'N/A')
                    update_data['cod_amount'] = payment.get('cod_amount', 0)
                    update_data['amount_paid'] = payment.get('paid_amount', 0)
                    update_data['payment_balance'] = payment.get('balance', 0)
                    update_data['payment_date'] = payment.get('payment_date')
                    update_data['delivery_charges'] = payment.get('delivery_charges', 0)
                    update_data['parcel_weight'] = payment.get('parcel_weight', 0)
                    update_data['booking_date'] = payment.get('booking_date')
                    update_data['cn_status'] = payment.get('cn_status', 'OK')
                
                # Update database with VALID status and payment data
                await self.db.customers.update_one(
                    {'customer_id': customer['customer_id'], 'store_name': customer['store_name']},
                    {'$set': update_data}
                )
                
                if old_status != new_status:
                    logger.info(f"✅ Order {customer['order_number']} ({tracking_number}): {old_status} → {new_status} at {location}")
                    self.synced_today += 1
                    
                    # Auto-deduct stock if delivered
                    if new_status == 'DELIVERED' and old_status != 'DELIVERED':
                        if not customer.get('stock_deducted'):
                            logger.info(f"🎯 Auto-deducting stock for order {customer['order_number']}")
                            # Stock deduction logic would go here
                    
                    # Auto-add to return inventory if return in process
                    if new_status == 'RETURN_IN_PROCESS' and old_status != 'RETURN_IN_PROCESS':
                        logger.info(f"📦 Adding returned items to inventory for order {customer['order_number']}")
                        # Mark as return in process
                        await self.db.customers.update_one(
                            {'customer_id': customer['customer_id'], 'store_name': customer['store_name']},
                            {'$set': {
                                'return_status': 'in_transit',
                                'return_received': False,
                                'return_updated_at': datetime.now(timezone.utc).isoformat()
                            }}
                        )
                
                return True
            else:
                # Status is UNKNOWN - skip
                return False
                
        except Exception as e:
            logger.error(f"❌ Error syncing {tracking_number}: {str(e)}")
            return False
    
    async def run_continuous_sync(self, batch_size=20, delay_between_orders=3, delay_between_batches=60):
        """
        Run continuous automatic sync
        
        Args:
            batch_size: How many orders to sync in each batch
            delay_between_orders: Seconds to wait between each order (default 3s)
            delay_between_batches: Seconds to wait between batches (default 60s)
        """
        from tcs_tracking import TCSTracker
        
        logger.info("=" * 60)
        logger.info("🚀 AUTO TCS SYNC SERVICE STARTED")
        logger.info(f"   Batch size: {batch_size} orders")
        logger.info(f"   Delay between orders: {delay_between_orders}s")
        logger.info(f"   Delay between batches: {delay_between_batches}s")
        logger.info("=" * 60)
        
        self.is_running = True
        
        # Initialize TCS tracker
        if self.tcs_config.get('auth_type') == 'bearer':
            tracker = TCSTracker(
                bearer_token=self.tcs_config.get('bearer_token'),
                token_expiry=self.tcs_config.get('token_expiry'),
                customer_no=self.tcs_config.get('customer_no')
            )
        else:
            tracker = TCSTracker(
                username=self.tcs_config.get('username'),
                password=self.tcs_config.get('password'),
                customer_no=self.tcs_config.get('customer_no')
            )
        
        while self.is_running:
            try:
                # Get TCS orders that need syncing
                # SKIP: DELIVERED, RETURNED, RETURN_IN_PROCESS, UNKNOWN (final statuses)
                # SYNC: IN_TRANSIT, OUT_FOR_DELIVERY, PENDING (active statuses)
                customers = await self.db.customers.find({
                    'tracking_company': 'TCS',
                    'tracking_number': {'$nin': [None, '']},
                    'delivery_status': {'$nin': ['DELIVERED', 'RETURNED', 'RETURN_IN_PROCESS', 'UNKNOWN']}
                }, {
                    '_id': 0,
                    'order_number': 1,
                    'tracking_number': 1,
                    'customer_id': 1,
                    'store_name': 1,
                    'delivery_status': 1,
                    'stock_deducted': 1,
                    'last_auto_sync': 1
                }).limit(batch_size).to_list(batch_size)
                
                if not customers:
                    logger.info(f"✅ All TCS orders synced. Synced today: {self.synced_today}")
                    logger.info(f"⏳ Waiting {delay_between_batches}s before next check...")
                    await asyncio.sleep(delay_between_batches)
                    continue
                
                logger.info(f"📦 Processing batch of {len(customers)} orders...")
                
                synced_in_batch = 0
                for idx, customer in enumerate(customers, 1):
                    success = await self.sync_one_order(customer, tracker)
                    if success:
                        synced_in_batch += 1
                    
                    # Delay between orders
                    if idx < len(customers):
                        await asyncio.sleep(delay_between_orders)
                
                logger.info(f"✅ Batch complete: {synced_in_batch}/{len(customers)} synced")
                logger.info(f"⏳ Waiting {delay_between_batches}s before next batch...")
                await asyncio.sleep(delay_between_batches)
                
            except Exception as e:
                logger.error(f"❌ Error in auto sync loop: {str(e)}")
                await asyncio.sleep(30)  # Wait 30s on error
    
    def stop(self):
        """Stop the auto sync service"""
        self.is_running = False
        logger.info("🛑 AUTO TCS SYNC SERVICE STOPPED")


async def start_auto_sync_service():
    """Initialize and start the auto sync service"""
    from dotenv import load_dotenv
    load_dotenv('/app/backend/.env')
    
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Get TCS config
    config = await db.tcs_config.find_one({'service': 'tcs_pakistan'}, {'_id': 0})
    
    if not config:
        logger.error("❌ TCS not configured. Auto sync disabled.")
        return
    
    # Create and run auto sync service
    auto_sync = AutoTCSSync(db, config)
    
    try:
        await auto_sync.run_continuous_sync(
            batch_size=20,           # Process 20 orders at a time
            delay_between_orders=3,   # 3 seconds between each order
            delay_between_batches=60  # 1 minute between batches
        )
    except KeyboardInterrupt:
        auto_sync.stop()
        logger.info("👋 Auto sync stopped by user")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(start_auto_sync_service())
