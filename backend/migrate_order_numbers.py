"""
Migration script to add integer order_number_int field for proper sorting
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def migrate_order_numbers():
    """Add order_number_int field to all customers for proper numeric sorting"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🔄 Starting order_number migration...")
    
    # Get all customers
    customers = await db.customers.find({}).to_list(100000)
    print(f"📊 Found {len(customers)} customers to migrate")
    
    updated_count = 0
    error_count = 0
    
    for customer in customers:
        try:
            order_number_str = customer.get('order_number', '')
            
            # Convert to integer
            if order_number_str:
                order_number_int = int(order_number_str)
                
                # Update the document
                await db.customers.update_one(
                    {"_id": customer["_id"]},
                    {"$set": {"order_number_int": order_number_int}}
                )
                updated_count += 1
                
                if updated_count % 1000 == 0:
                    print(f"✅ Updated {updated_count} documents...")
            
        except (ValueError, TypeError) as e:
            error_count += 1
            print(f"⚠️  Error converting order_number '{order_number_str}' for customer {customer.get('customer_id')}: {e}")
    
    print(f"\n✅ Migration complete!")
    print(f"   - Successfully updated: {updated_count} documents")
    print(f"   - Errors: {error_count} documents")
    
    # Create index on order_number_int for better query performance
    print("\n🔍 Creating index on order_number_int...")
    await db.customers.create_index([("order_number_int", -1)])
    print("✅ Index created successfully!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_order_numbers())
