#!/usr/bin/env python3
"""
TCS Payment Reconciliation Script
Processes actual TCS payment file data and updates customer records
"""
import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

# Real TCS payment data from uploaded file
TCS_PAYMENT_DATA = [
    {
        'consignment_number': '173007545918',
        'customer_reference': '#29247', 
        'delivery_status': 'InProcess',
        'cod_amount': 0,
        'delivery_charges': 6,
        'balance_payable': -647.5,
        'status': 'PENDING'
    },
    {
        'consignment_number': '173007546170',
        'customer_reference': '#29245',
        'delivery_status': 'Delivered',
        'cod_amount': None,
        'delivery_charges': None,
        'balance_payable': None,
        'status': 'COLLECTED'  # Delivered = payment reconciled
    },
    {
        'consignment_number': '173007553782',
        'customer_reference': '#29244',
        'delivery_status': 'InProcess', 
        'cod_amount': None,
        'delivery_charges': None,
        'balance_payable': None,
        'status': 'PENDING'
    },
    {
        'consignment_number': '173007553800',
        'customer_reference': '#29239',
        'delivery_status': 'InProcess',
        'cod_amount': None,
        'delivery_charges': None, 
        'balance_payable': None,
        'status': 'PENDING'
    },
    {
        'consignment_number': '173007564875',
        'customer_reference': '#29248',
        'delivery_status': 'Delivered',
        'cod_amount': None,
        'delivery_charges': None,
        'balance_payable': None,
        'status': 'COLLECTED'  # Delivered = payment reconciled
    },
    {
        'consignment_number': '173007565531',
        'customer_reference': '#29232',
        'delivery_status': 'InProcess',
        'cod_amount': 0,
        'delivery_charges': 6,
        'balance_payable': -647.5,
        'status': 'PENDING'
    }
]

async def reconcile_tcs_payments():
    """Reconcile actual TCS payment data with database records"""
    
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"🔄 Reconciling TCS Payment Data from uploaded file...")
    print(f"📊 Processing {len(TCS_PAYMENT_DATA)} TCS payment records")
    
    updated_count = 0
    not_found_count = 0
    
    for payment_record in TCS_PAYMENT_DATA:
        try:
            consignment_no = payment_record['consignment_number']
            order_ref = payment_record['customer_reference']
            tcs_status = payment_record['delivery_status']
            payment_status = payment_record['status']
            
            print(f"\n🔍 Processing {consignment_no} ({order_ref})")
            
            # Find customer by tracking number
            customer = await db.customers.find_one(
                {'tracking_number': consignment_no},
                {'_id': 0, 'customer_id': 1, 'store_name': 1, 'order_number': 1, 'total_spent': 1}
            )
            
            if customer:
                order_total = float(customer.get('total_spent', 0))
                delivery_charges = float(payment_record.get('delivery_charges') or 0)
                balance_payable = float(payment_record.get('balance_payable') or 0)
                
                # Calculate payment amounts based on TCS status
                if tcs_status == 'Delivered':
                    # Payment has been collected and reconciled
                    cod_payment_status = 'COLLECTED'
                    amount_paid = order_total
                    payment_balance = max(0, order_total - delivery_charges)  # Net after charges
                    remittance_amount = payment_balance
                elif tcs_status == 'InProcess':
                    # Payment still pending
                    cod_payment_status = 'PENDING'  
                    amount_paid = 0.0
                    payment_balance = order_total
                    remittance_amount = 0.0
                
                # Update database with TCS payment reconciliation
                result = await db.customers.update_one(
                    {'customer_id': customer['customer_id'], 'store_name': customer['store_name']},
                    {'$set': {
                        'cod_payment_status': cod_payment_status,
                        'cod_amount': order_total,
                        'amount_paid': amount_paid,
                        'payment_balance': payment_balance,
                        'delivery_charges': delivery_charges,
                        'remittance_amount': remittance_amount,
                        'tcs_delivery_status': tcs_status,
                        'tcs_balance_payable': balance_payable,
                        'reconciled_from_tcs_file': True
                    }}
                )
                
                print(f"   ✅ Order #{customer.get('order_number')}: {cod_payment_status}")
                print(f"      COD Amount: Rs. {order_total}")
                print(f"      Amount Paid: Rs. {amount_paid}")
                print(f"      Delivery Charges: Rs. {delivery_charges}")  
                print(f"      Net to Merchant: Rs. {remittance_amount}")
                
                updated_count += 1
            else:
                print(f"   ❌ Customer not found for tracking {consignment_no}")
                not_found_count += 1
                
        except Exception as e:
            print(f"   ❌ Error processing {consignment_no}: {str(e)}")
    
    print(f"\n🎯 TCS Payment Reconciliation Complete!")
    print(f"   ✅ Updated: {updated_count} records")
    print(f"   ❌ Not Found: {not_found_count} records")
    print(f"   📊 Success Rate: {(updated_count/(updated_count+not_found_count)*100):.1f}%")
    
    # Verify some updates
    print(f"\n📋 Sample Reconciled Records:")
    reconciled_samples = await db.customers.find(
        {'reconciled_from_tcs_file': True},
        {'_id': 0, 'tracking_number': 1, 'order_number': 1, 'cod_payment_status': 1, 'cod_amount': 1, 'remittance_amount': 1}
    ).limit(3).to_list(10)
    
    for sample in reconciled_samples:
        print(f"   📦 Order #{sample.get('order_number')} (CN: {sample.get('tracking_number')})")
        print(f"       Status: {sample.get('cod_payment_status')}, COD: Rs.{sample.get('cod_amount')}, Net: Rs.{sample.get('remittance_amount')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(reconcile_tcs_payments())