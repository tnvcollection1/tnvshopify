import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from tcs_payment import TCSPaymentAPI
from datetime import datetime, timezone

load_dotenv()

async def update_order():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Get TCS config
    config = await db.tcs_config.find_one({'service': 'tcs_pakistan'}, {'_id': 0})
    token = config.get('bearer_token')
    customer_no = config.get('customer_no')
    
    payment_api = TCSPaymentAPI(bearer_token=token, customer_no=customer_no)
    
    # Get order details
    tracking = '173007564875'
    customer = await db.customers.find_one(
        {'tracking_number': tracking},
        {'_id': 0, 'customer_id': 1, 'store_name': 1, 'total_spent': 1, 'payment_status': 1}
    )
    
    if not customer:
        print(f'Order not found')
        return
    
    # Fetch payment data
    shopify_total = float(customer.get('total_spent', 0))
    shopify_payment_status = customer.get('payment_status', 'pending')
    
    payment_data = payment_api.get_payment_status(
        tracking,
        shopify_total=shopify_total,
        shopify_payment_status=shopify_payment_status
    )
    
    if payment_data.get('success'):
        # Update database
        update_fields = {
            'cod_payment_status': payment_data.get('normalized_status'),
            'cod_amount': payment_data.get('cod_amount', 0.0),
            'amount_paid': payment_data.get('paid_amount', 0.0),
            'payment_balance': payment_data.get('balance', 0.0),
            'delivery_charges': payment_data.get('delivery_charges', 0.0),
            'parcel_weight': payment_data.get('parcel_weight', 0),
            'booking_date': payment_data.get('booking_date'),
            'delivery_date': payment_data.get('delivery_date'),
            'collection_date': payment_data.get('collection_date'),
            'remittance_date': payment_data.get('remittance_date'),
            'remittance_amount': payment_data.get('remittance_amount', 0.0),
            'last_payment_sync': datetime.now(timezone.utc).isoformat()
        }
        
        result = await db.customers.update_one(
            {'customer_id': customer['customer_id'], 'store_name': customer['store_name']},
            {'$set': update_fields}
        )
        
        print(f'✅ Updated order with tracking {tracking}')
        print(f'   Modified count: {result.modified_count}')
        print(f'   COD Amount: Rs. {update_fields["cod_amount"]}')
        print(f'   Delivery Charges: Rs. {update_fields["delivery_charges"]}')
        print(f'   Weight: {update_fields["parcel_weight"]} kg')
        print(f'   Booking Date: {update_fields["booking_date"]}')
    else:
        print(f'❌ Failed to get payment data: {payment_data.get("message")}')
    
    client.close()

asyncio.run(update_order())
