from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    customer_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    country_code: Optional[str] = None
    shoe_sizes: List[str] = []
    order_skus: List[str] = []  # SKUs from customer orders
    order_count: int = 0
    order_number: Optional[str] = None  # Shopify order number
    last_order_date: Optional[str] = None
    total_spent: float = 0.0
    store_name: Optional[str] = None
    messaged: bool = False
    last_messaged_at: Optional[str] = None
    message_count: int = 0
    messaged_by: Optional[str] = None
    converted: Optional[bool] = None
    conversion_notes: Optional[str] = None
    sale_amount: Optional[float] = None
    stock_status: Optional[str] = None  # "in_stock", "out_of_stock", "partial"
    fulfillment_status: Optional[str] = None  # "unfulfilled", "fulfilled", "partially_fulfilled"
    tracking_number: Optional[str] = None
    tracking_company: Optional[str] = None
    tracking_url: Optional[str] = None
    delivery_status: Optional[str] = None  # TCS delivery status: DELIVERED, OUT_FOR_DELIVERY, IN_TRANSIT, etc.
    delivery_location: Optional[str] = None  # Current TCS facility location
    delivery_updated_at: Optional[str] = None  # Last TCS status update time
    payment_status: Optional[str] = None  # Shopify payment status: paid, pending, refunded, partially_refunded, voided
    payment_method: Optional[str] = None  # Payment method used
    cod_payment_status: Optional[str] = None  # TCS COD payment status: PENDING, COLLECTED, REMITTED, HELD, REVERSED
    cod_amount: Optional[float] = None  # COD amount to be collected
    cod_collection_date: Optional[str] = None  # Date when COD was collected by TCS
    cod_remittance_date: Optional[str] = None  # Date when COD was remitted to merchant
    cod_remittance_amount: Optional[float] = None  # Amount remitted to merchant
    abandoned_checkout: Optional[bool] = None  # Whether customer has abandoned checkouts
    abandoned_checkout_value: Optional[float] = None  # Value of abandoned items
