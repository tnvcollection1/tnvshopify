import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from tcs_payment import TCSPaymentAPI

load_dotenv()

async def test():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    config = await db.tcs_config.find_one({'service': 'tcs_pakistan'}, {'_id': 0})
    token = config.get('bearer_token')
    customer_no = config.get('customer_no')
    
    payment_api = TCSPaymentAPI(bearer_token=token, customer_no=customer_no)
    
    tracking = '173007564875'
    result = payment_api.get_payment_status(tracking, shopify_total=6499.0, shopify_payment_status='pending')
    
    print(f'Tracking: {tracking}')
    print(f'Success: {result.get("success")}')
    print(f'Message: {result.get("message", "N/A")}')
    if result.get('success'):
        print(f'COD Amount: Rs. {result.get("cod_amount", 0)}')
        print(f'Delivery Charges: Rs. {result.get("delivery_charges", 0)}')
        print(f'Weight: {result.get("parcel_weight", "N/A")} kg')
        print(f'Booking Date: {result.get("booking_date", "N/A")}')
    
    client.close()

asyncio.run(test())
