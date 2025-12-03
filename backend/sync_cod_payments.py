#!/usr/bin/env python3
"""
COD Payment Sync Script
Updates all TCS customer records with payment information from TCS Payment API
"""
import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from tcs_payment import TCSPaymentAPI

load_dotenv()

async def sync_all_cod_payments():
    """Sync COD payment data for all TCS customers"""
    
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
    
    # Get ALL TCS customers
    customers = await db.customers.find(
        {'tracking_company': 'TCS'},
        {'_id': 0, 'customer_id': 1, 'store_name': 1, 'tracking_number': 1, 'cod_payment_status': 1}
    ).to_list(1000)
    
    print(f"🔄 Syncing COD payment data for {len(customers)} TCS customers...")
    
    updated_count = 0
    cod_orders = 0
    prepaid_orders = 0
    errors = 0
    
    for i, customer in enumerate(customers, 1):
        try:
            tracking_number = customer['tracking_number']
            print(f"  {i}/{len(customers)}: {tracking_number}", end=" ")
            
            # Get payment status
            payment_data = payment_api.get_payment_status(tracking_number)
            
            if payment_data.get('success'):
                # COD order with payment data
                await db.customers.update_one(
                    {'customer_id': customer['customer_id'], 'store_name': customer['store_name']},
                    {'$set': {
                        'cod_payment_status': payment_data.get('normalized_status', 'UNKNOWN'),
                        'cod_amount': payment_data.get('cod_amount', 0.0),
                        'amount_paid': payment_data.get('paid_amount', 0.0),
                        'payment_balance': payment_data.get('balance', 0.0),
                        'delivery_charges': payment_data.get('delivery_charges', 0.0),
                        'parcel_weight': payment_data.get('parcel_weight', 0),
                        'booking_date': payment_data.get('booking_date'),
                        'delivery_date': payment_data.get('delivery_date')
                    }}
                )
                print(f"✅ COD: Rs.{payment_data.get('cod_amount', 0)}")
                cod_orders += 1
                updated_count += 1
                
            elif payment_data.get('message') == 'PREPAID':
                # Prepaid order
                await db.customers.update_one(
                    {'customer_id': customer['customer_id'], 'store_name': customer['store_name']},
                    {'$set': {
                        'cod_payment_status': 'PREPAID',
                        'cod_amount': 0.0,
                        'amount_paid': 0.0,
                        'payment_balance': 0.0,
                        'delivery_charges': 0.0
                    }}
                )
                print("💳 PREPAID")
                prepaid_orders += 1
                updated_count += 1
                
            else:
                print(f"❌ {payment_data.get('message')}")
                errors += 1
                
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            errors += 1
    
    print(f"\n🎯 COD Payment Sync Complete!")
    print(f"  📊 Total Processed: {len(customers)}")
    print(f"  ✅ Updated: {updated_count}")
    print(f"  💰 COD Orders: {cod_orders}")
    print(f"  💳 Prepaid Orders: {prepaid_orders}")
    print(f"  ❌ Errors: {errors}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(sync_all_cod_payments())