from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
import uuid


class Agent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password: str
    full_name: str
    role: str = "agent"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AgentLogin(BaseModel):
    username: str
    password: str


class AgentCreate(BaseModel):
    username: str
    password: str
    full_name: str
