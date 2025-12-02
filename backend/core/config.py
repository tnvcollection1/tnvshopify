from pathlib import Path
from dotenv import load_dotenv
import os

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')


class Settings:
    """Application settings"""
    
    # MongoDB
    MONGO_URL: str = os.environ.get('MONGO_URL', '')
    DB_NAME: str = os.environ.get('DB_NAME', 'ecom_tracker')
    
    # CORS
    CORS_ORIGINS: list = ["*"]
    
    # App
    APP_NAME: str = "E-commerce Order Tracker"
    VERSION: str = "2.0.0"
    
    # Shopify
    SHOPIFY_API_VERSION: str = "2024-01"
    
    # TCS
    TCS_BASE_URL: str = "https://apis.tcscourier.com"


settings = Settings()
