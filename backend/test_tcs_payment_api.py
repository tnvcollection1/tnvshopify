#!/usr/bin/env python3
"""
Test TCS Payment API for a specific tracking number
"""
import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from tcs_payment import TCSPaymentAPI

load_dotenv()

async def test_payment_api():
    """Test TCS Payment API"""
    
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Get TCS credentials
    config = await db.tcs_config.find_one({'service': 'tcs_pakistan'}, {'_id': 0})
    if not config:
        print("❌ TCS not configured")
        return
    
    token = config.get('bearer_token')
    customer_no = config.get('customer_no')
    
    # Initialize payment API
    payment_api = TCSPaymentAPI(bearer_token=token, customer_no=customer_no)
    
    # Test with order #29421
    tracking_number = '173008632647'
    shopify_total = 6999.0
    shopify_payment_status = 'pending'
    
    print(f"🔍 Testing TCS Payment API for tracking: {tracking_number}")
    print(f"   Shopify Total: Rs. {shopify_total}")
    print(f"   Shopify Payment Status: {shopify_payment_status}")
    print()
    
    payment_data = payment_api.get_payment_status(
        tracking_number,
        shopify_total=shopify_total,
        shopify_payment_status=shopify_payment_status
    )
    
    print("📊 API Response:")
    print(f"   Success: {payment_data.get('success')}")
    print(f"   Message: {payment_data.get('message', 'N/A')}")
    
    if payment_data.get('success'):
        print(f"   COD Amount: Rs. {payment_data.get('cod_amount', 0)}")
        print(f"   Amount Paid: Rs. {payment_data.get('paid_amount', 0)}")
        print(f"   Balance: Rs. {payment_data.get('balance', 0)}")
        print(f"   Delivery Charges: Rs. {payment_data.get('delivery_charges', 0)}")
        print(f"   Weight: {payment_data.get('parcel_weight', 'N/A')} kg")
        print(f"   Booking Date: {payment_data.get('booking_date', 'N/A')}")
        print(f"   Delivery Date: {payment_data.get('delivery_date', 'N/A')}")
    else:
        print(f"   ❌ Failed to get payment data")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_payment_api())
