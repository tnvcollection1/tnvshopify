from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, List
import uuid


class Agent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password: str
    full_name: str
    role: str = "agent"  # admin, merchant, manager, viewer
    assigned_stores: List[str] = Field(default_factory=list)  # Store names merchant can access
    email: Optional[str] = None
    phone: Optional[str] = None
    status: str = "active"  # active, inactive, suspended
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login: Optional[str] = None


class AgentLogin(BaseModel):
    username: str
    password: str


class AgentCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "merchant"
    assigned_stores: List[str] = Field(default_factory=list)
    email: Optional[str] = None
    phone: Optional[str] = None

