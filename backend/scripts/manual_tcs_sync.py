"""
Manual TCS Sync - One by one with delay
Tracks each order individually with 2 second delay between requests
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
sys.path.append('/app/backend')
from tcs_tracking import TCSTracker
import os
from datetime import datetime, timezone
import time
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

async def manual_tcs_sync(limit=20):
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("="*60)
    print("MANUAL TCS SYNC - ONE BY ONE")
    print("="*60)
    
    # Get TCS config
    config = await db.tcs_config.find_one({'service': 'tcs_pakistan'}, {'_id': 0})
    if not config:
        print('❌ TCS not configured')
        return
    
    print(f"✅ TCS Config found (auth_type: {config.get('auth_type')})\n")
    
    # Initialize tracker
    tracker = TCSTracker(bearer_token=config.get('bearer_token'), token_expiry=config.get('token_expiry'))
    
    # Get TCS tracking numbers
    customers = await db.customers.find(
        {'tracking_company': 'TCS', 'tracking_number': {'$ne': None, '$ne': ''}},
        {'_id': 0, 'order_number': 1, 'tracking_number': 1, 'customer_id': 1, 'store_name': 1, 'delivery_status': 1}
    ).limit(limit).to_list(limit)
    
    print(f'📦 Found {len(customers)} TCS orders to sync')
    print(f'⏱️  Processing ONE BY ONE with 2 second delay...\n')
    print("="*60)
    
    synced_count = 0
    error_count = 0
    
    for idx, customer in enumerate(customers, 1):
        tracking_number = customer['tracking_number']
        old_status = customer.get('delivery_status', 'NOT SET')
        
        print(f'\n[{idx}/{len(customers)}] Order #{customer["order_number"]}')
        print(f'  📍 Tracking: {tracking_number}')
        print(f'  📊 Current DB Status: {old_status}')
        
        try:
            # Track individual with TCS API
            print(f'  🔄 Calling TCS API...')
            tracking_data = tracker.track_consignment(tracking_number)
            
            if tracking_data and tracking_data.get('normalized_status'):
                new_status = tracking_data.get('normalized_status')
                location = tracking_data.get('current_location', 'N/A')
                raw_status = tracking_data.get('status', 'N/A')
                
                print(f'  ✅ TCS Response: {raw_status}')
                print(f'  📍 Location: {location}')
                print(f'  🔄 Normalized: {new_status}')
                
                # Update database
                result = await db.customers.update_one(
                    {'customer_id': customer['customer_id'], 'store_name': customer['store_name']},
                    {'$set': {
                        'delivery_status': new_status,
                        'delivery_location': location,
                        'delivery_updated_at': datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                if result.modified_count > 0:
                    print(f'  ✅ DATABASE UPDATED: {old_status} → {new_status}')
                    synced_count += 1
                else:
                    print(f'  ℹ️  No change needed (already {new_status})')
                    synced_count += 1
            else:
                print(f'  ❌ TCS API returned no data or status')
                error_count += 1
        
        except Exception as e:
            print(f'  ❌ ERROR: {str(e)}')
            error_count += 1
        
        # Delay between requests (except for last one)
        if idx < len(customers):
            print(f'  ⏳ Waiting 2 seconds...')
            time.sleep(2)
    
    print("\n" + "="*60)
    print("SYNC COMPLETE")
    print("="*60)
    print(f'✅ Successfully synced: {synced_count}')
    print(f'❌ Errors: {error_count}')
    print(f'📊 Total processed: {len(customers)}')
    print("="*60)
    
    client.close()

if __name__ == "__main__":
    # Get limit from command line or use default
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    asyncio.run(manual_tcs_sync(limit))
