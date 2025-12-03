#!/usr/bin/env python3
"""
Update all China Post orders with purchase_status
Sets default status to 'ORDERED' for all orders with China Post tracking (X-prefix)
"""
import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

load_dotenv()

async def update_china_post_orders():
    """Update all China Post orders with purchase_status"""
    
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Find all orders with China Post tracking (tracking numbers starting with 'X')
    # that don't have purchase_status set
    query = {
        'tracking_number': {'$regex': '^X', '$options': 'i'},
        'fulfillment_status': 'fulfilled',
        '$or': [
            {'purchase_status': {'$exists': False}},
            {'purchase_status': None}
        ]
    }
    
    customers = await db.customers.find(query, {'_id': 0, 'customer_id': 1, 'store_name': 1, 'order_number': 1, 'tracking_number': 1}).to_list(1000)
    
    if not customers:
        print("✅ All China Post orders already have purchase_status set")
        client.close()
        return
    
    print(f"🔄 Updating purchase_status for {len(customers)} China Post orders...")
    
    updated_count = 0
    
    for customer in customers:
        try:
            # Update with default status 'ORDERED'
            result = await db.customers.update_one(
                {'customer_id': customer['customer_id'], 'store_name': customer['store_name']},
                {'$set': {
                    'purchase_status': 'ORDERED',
                    'purchase_status_updated_at': datetime.now(timezone.utc).isoformat()
                }}
            )
            
            if result.modified_count > 0:
                updated_count += 1
                print(f"  ✅ Updated Order #{customer['order_number']} - {customer['tracking_number']}")
            
        except Exception as e:
            print(f"  ❌ Error updating Order #{customer.get('order_number')}: {str(e)}")
            continue
    
    print(f"\n🎯 Update Complete!")
    print(f"  📊 Total Processed: {len(customers)}")
    print(f"  ✅ Updated: {updated_count}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(update_china_post_orders())
