"""
Complete Database Cleanup Script
WARNING: This will delete ALL orders, customers, and inventory data!
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'shopify_customers_db')


async def complete_cleanup():
    """Delete all orders, customers, and inventory"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🚨 WARNING: COMPLETE DATABASE CLEANUP")
    print("="*60)
    print("This will DELETE:")
    print("  ❌ ALL customers/orders")
    print("  ❌ ALL inventory/stock")
    print("  ✅ KEEP: Stores configuration")
    print("  ✅ KEEP: Agents/users")
    print("  ✅ KEEP: TCS configuration")
    print("="*60)
    
    # Count current data
    customers_count = await db.customers.count_documents({})
    stock_count = await db.stock.count_documents({})
    
    print(f"\n📊 Current Data:")
    print(f"   - Customers/Orders: {customers_count}")
    print(f"   - Stock Items: {stock_count}")
    
    print("\n⏳ Starting cleanup...")
    
    # Delete all customers/orders
    result1 = await db.customers.delete_many({})
    print(f"✅ Deleted {result1.deleted_count} customers/orders")
    
    # Delete all stock/inventory
    result2 = await db.stock.delete_many({})
    print(f"✅ Deleted {result2.deleted_count} stock items")
    
    # Verify cleanup
    remaining_customers = await db.customers.count_documents({})
    remaining_stock = await db.stock.count_documents({})
    
    print(f"\n📊 After Cleanup:")
    print(f"   - Customers/Orders: {remaining_customers}")
    print(f"   - Stock Items: {remaining_stock}")
    
    if remaining_customers == 0 and remaining_stock == 0:
        print("\n✅ Cleanup completed successfully!")
        print("\nNext steps:")
        print("  1. Sync Shopify orders from Dec 1st onwards")
        print("  2. Upload inventory file")
    else:
        print("\n⚠️ Warning: Some data remains")
    
    client.close()


if __name__ == "__main__":
    print("\n" + "="*60)
    print("COMPLETE DATABASE CLEANUP")
    print("="*60)
    
    response = input("\n⚠️  Type 'DELETE ALL' to confirm: ")
    
    if response == "DELETE ALL":
        asyncio.run(complete_cleanup())
    else:
        print("\n❌ Cleanup cancelled. No data was deleted.")
