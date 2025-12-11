# Import all route modules here for easy access
from . import auth, whatsapp
from .facebook import facebook_router, set_database as set_facebook_db
from .finance import finance_router, set_database as set_finance_db

__all__ = [
    "auth", 
    "whatsapp",
    "facebook_router",
    "set_facebook_db",
    "finance_router",
    "set_finance_db"
]
