"""
Database Optimization Script - Add Indexes
Adds indexes to frequently queried fields for better performance
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'ecom_tracker')


async def add_indexes():
    """Add indexes to improve query performance"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🔧 Starting database optimization...")
    print(f"📊 Database: {DB_NAME}")
    
    try:
        # Customers collection indexes
        print("\n📦 Adding indexes to 'customers' collection...")
        
        # Index for order_number (frequently searched)
        await db.customers.create_index("order_number")
        print("  ✅ Index on 'order_number' created")
        
        # Index for tracking_number (frequently searched)
        await db.customers.create_index("tracking_number")
        print("  ✅ Index on 'tracking_number' created")
        
        # Index for fulfillment_status (frequently filtered)
        await db.customers.create_index("fulfillment_status")
        print("  ✅ Index on 'fulfillment_status' created")
        
        # Index for delivery_status (frequently filtered)
        await db.customers.create_index("delivery_status")
        print("  ✅ Index on 'delivery_status' created")
        
        # Index for payment_status (frequently filtered)
        await db.customers.create_index("payment_status")
        print("  ✅ Index on 'payment_status' created")
        
        # Index for store_name (frequently filtered)
        await db.customers.create_index("store_name")
        print("  ✅ Index on 'store_name' created")
        
        # Index for last_order_date (sorting)
        await db.customers.create_index([("last_order_date", -1)])
        print("  ✅ Index on 'last_order_date' (descending) created")
        
        # Index for messaged status (filtering)
        await db.customers.create_index("messaged")
        print("  ✅ Index on 'messaged' created")
        
        # Index for confirmation_status (Confirmation Tracker)
        await db.customers.create_index("confirmation_status")
        print("  ✅ Index on 'confirmation_status' created")
        
        # Index for purchase_status (Purchase Tracker)
        await db.customers.create_index("purchase_status")
        print("  ✅ Index on 'purchase_status' created")
        
        # Compound index for common queries
        await db.customers.create_index([
            ("store_name", 1),
            ("fulfillment_status", 1),
            ("last_order_date", -1)
        ])
        print("  ✅ Compound index on 'store_name + fulfillment_status + last_order_date' created")
        
        # Stores collection indexes
        print("\n📦 Adding indexes to 'stores' collection...")
        
        await db.stores.create_index("store_name", unique=True)
        print("  ✅ Unique index on 'store_name' created")
        
        # Inventory collection indexes
        print("\n📦 Adding indexes to 'stock' collection...")
        
        await db.stock.create_index("sku")
        print("  ✅ Index on 'sku' created")
        
        await db.stock.create_index("store_name")
        print("  ✅ Index on 'store_name' created")
        
        # Compound index for inventory queries
        await db.stock.create_index([("store_name", 1), ("sku", 1)])
        print("  ✅ Compound index on 'store_name + sku' created")
        
        # Agents collection indexes
        print("\n📦 Adding indexes to 'agents' collection...")
        
        await db.agents.create_index("username", unique=True)
        print("  ✅ Unique index on 'username' created")
        
        # List all indexes
        print("\n📋 Listing all indexes...")
        
        collections = await db.list_collection_names()
        for collection_name in ['customers', 'stores', 'stock', 'agents']:
            if collection_name in collections:
                indexes = await db[collection_name].index_information()
                print(f"\n  {collection_name}:")
                for idx_name, idx_info in indexes.items():
                    print(f"    - {idx_name}: {idx_info.get('key', [])}")
        
        print("\n✅ Database optimization completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error during optimization: {str(e)}")
        raise
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(add_indexes())
