from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, List
import uuid


class UserRole:
    """User role constants"""
    ADMIN = "admin"
    MANAGER = "manager"
    VIEWER = "viewer"
    
    @classmethod
    def all_roles(cls):
        return [cls.ADMIN, cls.MANAGER, cls.VIEWER]
    
    @classmethod
    def get_permissions(cls, role: str) -> dict:
        """Get permissions for a role"""
        permissions = {
            cls.ADMIN: {
                "can_view": True,
                "can_edit": True,
                "can_delete": True,
                "can_sync_shopify": True,
                "can_manage_users": True,
                "can_view_revenue": True,
                "can_view_phone": True,
                "can_export": True,
                "can_send_messages": True,
            },
            cls.MANAGER: {
                "can_view": True,
                "can_edit": True,
                "can_delete": False,
                "can_sync_shopify": False,
                "can_manage_users": False,
                "can_view_revenue": True,
                "can_view_phone": True,
                "can_export": True,
                "can_send_messages": True,
            },
            cls.VIEWER: {
                "can_view": True,
                "can_edit": False,
                "can_delete": False,
                "can_sync_shopify": False,
                "can_manage_users": False,
                "can_view_revenue": False,
                "can_view_phone": False,
                "can_export": False,
                "can_send_messages": False,
            }
        }
        return permissions.get(role, permissions[cls.VIEWER])


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password: str
    email: Optional[str] = None
    full_name: str
    role: str = UserRole.VIEWER
    status: str = "active"  # active, inactive, pending
    stores: List[str] = []  # List of store names user can access (empty = all)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
    last_login: Optional[str] = None
    
    def get_permissions(self) -> dict:
        return UserRole.get_permissions(self.role)


class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    full_name: str
    role: str = UserRole.VIEWER
    stores: List[str] = []


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    stores: Optional[List[str]] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    full_name: str
    role: str
    status: str
    stores: List[str]
    permissions: dict
    created_at: str
    last_login: Optional[str] = None
