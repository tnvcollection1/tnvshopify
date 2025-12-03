"""
Initialize delivery_status and cod_payment_status fields for all customers
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def initialize_fields():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("Initializing delivery and payment status fields...")
    
    # Update all customers to add missing fields
    result = await db.customers.update_many(
        {},
        {
            "$set": {
                "delivery_status": "PENDING",
                "cod_payment_status": "PENDING"
            }
        }
    )
    
    print(f"✅ Updated {result.modified_count} customer records")
    
    # For fulfilled orders, set delivery_status based on fulfillment
    result2 = await db.customers.update_many(
        {"fulfillment_status": "fulfilled"},
        {
            "$set": {
                "delivery_status": "IN_TRANSIT"
            }
        }
    )
    
    print(f"✅ Set {result2.modified_count} fulfilled orders to IN_TRANSIT")
    
    # Verify
    with_delivery_status = await db.customers.count_documents({"delivery_status": {"$exists": True}})
    print(f"✅ Total customers with delivery_status: {with_delivery_status}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(initialize_fields())
