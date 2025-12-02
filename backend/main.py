from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from core import settings, logger
from scheduler import get_scheduler

# Import route modules
from routes import auth

# Create the main app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Include all route modules
api_router.include_router(auth.router)

# Include the api_router in the app
app.include_router(api_router)


# Startup and shutdown events for scheduler
@app.on_event("startup")
async def startup_event():
    """Start background scheduler on server startup"""
    logger.info("🚀 Starting server...")
    scheduler = get_scheduler()
    scheduler.start()
    logger.info("✅ Background scheduler initialized")


@app.on_event("shutdown")
async def shutdown_event():
    """Stop background scheduler on server shutdown"""
    logger.info("🛑 Shutting down server...")
    scheduler = get_scheduler()
    scheduler.stop()
    logger.info("✅ Background scheduler stopped")


@api_router.get("/")
async def root():
    return {"message": "E-commerce Order Tracker API v2.0"}
