from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional
import uuid


class Store(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    store_name: str
    shop_url: str
    shopify_domain: Optional[str] = None
    shopify_token: Optional[str] = None
    last_synced_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class StoreCreate(BaseModel):
    store_name: str
    shop_url: str
