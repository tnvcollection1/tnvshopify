"""Tenant Model for Multi-Tenant Architecture"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, List, Dict
import uuid


class SubscriptionPlan:
    """Subscription plan constants"""
    FREE = "free"
    STARTER = "starter"
    GROWTH = "growth"
    ENTERPRISE = "enterprise"
    
    @classmethod
    def get_limits(cls, plan: str) -> dict:
        """Get limits for each plan"""
        limits = {
            cls.FREE: {
                "stores": 1,
                "orders_per_month": 100,
                "users": 1,
                "whatsapp_messages": 50,
                "ai_features": False,
                "price": 0
            },
            cls.STARTER: {
                "stores": 1,
                "orders_per_month": 500,
                "users": 2,
                "whatsapp_messages": 500,
                "ai_features": False,
                "price": 999
            },
            cls.GROWTH: {
                "stores": 3,
                "orders_per_month": 5000,
                "users": 5,
                "whatsapp_messages": 5000,
                "ai_features": True,
                "price": 2999
            },
            cls.ENTERPRISE: {
                "stores": -1,  # Unlimited
                "orders_per_month": -1,
                "users": -1,
                "whatsapp_messages": -1,
                "ai_features": True,
                "price": 9999
            }
        }
        return limits.get(plan, limits[cls.FREE])


class TenantAPIKeys(BaseModel):
    """API Keys storage for a tenant"""
    shopify_domain: Optional[str] = None
    shopify_token: Optional[str] = None
    whatsapp_phone_id: Optional[str] = None
    whatsapp_token: Optional[str] = None
    whatsapp_business_id: Optional[str] = None
    facebook_access_token: Optional[str] = None
    facebook_ad_account_id: Optional[str] = None
    facebook_page_id: Optional[str] = None
    tcs_token: Optional[str] = None
    tcs_customer_no: Optional[str] = None
    dtdc_username: Optional[str] = None
    dtdc_password: Optional[str] = None


class Tenant(BaseModel):
    """Tenant model for multi-tenant architecture"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Business Info
    business_name: str
    business_category: str = "retail"
    business_logo: Optional[str] = None
    business_email: str
    business_phone: Optional[str] = None
    business_address: Optional[str] = None
    business_website: Optional[str] = None
    
    # Owner Info
    owner_id: str  # Links to users collection
    owner_name: str
    owner_email: str
    
    # Subscription
    subscription_plan: str = SubscriptionPlan.FREE
    subscription_status: str = "active"  # active, cancelled, expired, trial
    trial_ends_at: Optional[str] = None
    subscription_ends_at: Optional[str] = None
    
    # API Keys (encrypted in production)
    api_keys: TenantAPIKeys = Field(default_factory=TenantAPIKeys)
    
    # Onboarding
    onboarding_completed: bool = False
    onboarding_step: int = 1  # Current step in onboarding
    
    # Metadata
    status: str = "active"  # active, suspended, deleted
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None
    
    # Usage tracking
    orders_this_month: int = 0
    messages_this_month: int = 0
    last_activity: Optional[str] = None


class TenantCreate(BaseModel):
    """Create tenant request"""
    business_name: str
    business_category: str = "retail"
    business_email: str
    owner_name: str
    owner_email: str
    password: str


class TenantOnboardingUpdate(BaseModel):
    """Update tenant during onboarding"""
    business_name: Optional[str] = None
    business_category: Optional[str] = None
    business_logo: Optional[str] = None
    business_phone: Optional[str] = None
    business_address: Optional[str] = None
    onboarding_step: Optional[int] = None
    onboarding_completed: Optional[bool] = None


class TenantAPIKeysUpdate(BaseModel):
    """Update API keys for a tenant"""
    shopify_domain: Optional[str] = None
    shopify_token: Optional[str] = None
    whatsapp_phone_id: Optional[str] = None
    whatsapp_token: Optional[str] = None
    whatsapp_business_id: Optional[str] = None
    facebook_access_token: Optional[str] = None
    facebook_ad_account_id: Optional[str] = None
    facebook_page_id: Optional[str] = None
