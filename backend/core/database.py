from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

# MongoDB connection
client = AsyncIOMotorClient(settings.MONGO_URL)
db = client[settings.DB_NAME]
