# Import all route modules here for easy access
from . import auth, whatsapp
from .facebook import facebook_router, set_database as set_facebook_db
from .finance import finance_router, set_database as set_finance_db
from .pricing import pricing_router, set_dependencies as set_pricing_deps
from .tcs import tcs_router, set_database as set_tcs_db
from .customers import customers_router, set_dependencies as set_customers_deps

__all__ = [
    "auth", 
    "whatsapp",
    "facebook_router",
    "set_facebook_db",
    "finance_router",
    "set_finance_db",
    "pricing_router",
    "set_pricing_deps",
    "tcs_router",
    "set_tcs_db",
    "customers_router",
    "set_customers_deps"
]
