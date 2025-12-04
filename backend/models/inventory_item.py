from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, List
import uuid


class DeliveryStatusEntry(BaseModel):
    """Single delivery status update entry"""
    timestamp: str
    status: str  # e.g., "Shipment Picked Up", "Arrived at TCS Facility", etc.
    
    
class InventoryItem(BaseModel):
    """New inventory item model with order tracking and manual status updates"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku: str
    product_name: str
    collection: Optional[str] = None  # Product collection/category
    order_number: Optional[str] = None  # Shopify order number this item is linked to
    cost: float = 0.0  # Purchase cost
    sale_price: float = 0.0  # Auto-fetched from Shopify
    profit: float = 0.0  # Calculated: sale_price - cost
    
    # Manual status fields
    status: str = "in_stock"  # Options: "in_stock", "in_transit", "delivered", "returned"
    delivery_timeline: List[DeliveryStatusEntry] = []  # Manual delivery status entries
    
    # Metadata
    store_name: Optional[str] = None
    added_by: Optional[str] = None  # Agent username
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class InventoryItemCreate(BaseModel):
    """Request model for creating inventory item"""
    sku: str
    product_name: str
    order_number: Optional[str] = None
    cost: float
    store_name: Optional[str] = None


class InventoryItemUpdate(BaseModel):
    """Request model for updating inventory item"""
    cost: Optional[float] = None
    sale_price: Optional[float] = None
    status: Optional[str] = None
    order_number: Optional[str] = None


class DeliveryStatusUpdate(BaseModel):
    """Request model for adding delivery status entry"""
    status: str
    timestamp: Optional[str] = None  # If not provided, uses current time
