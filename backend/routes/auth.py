from fastapi import APIRouter, HTTPException
from models import Agent, AgentCreate, AgentLogin
from core import db, logger
from datetime import datetime, timezone
import bcrypt
import uuid

router = APIRouter(prefix="/agents", tags=["Authentication"])


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against bcrypt hash"""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        # Fallback for old SHA256 hashes during migration
        import hashlib
        sha256_hash = hashlib.sha256(password.encode()).hexdigest()
        return sha256_hash == hashed


@router.post("/register")
async def register_agent(agent: AgentCreate):
    """
    Register a new agent with bcrypt encrypted password
    """
    try:
        # Check if username exists
        existing = await db.agents.find_one({"username": agent.username})
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Create agent with bcrypt hashed password
        hashed_password = hash_password(agent.password)
        
        agent_obj = Agent(
            username=agent.username,
            password=hashed_password,
            full_name=agent.full_name
        )
        
        doc = agent_obj.model_dump()
        await db.agents.insert_one(doc)
        
        # Return without password
        return {
            "id": agent_obj.id,
            "username": agent_obj.username,
            "full_name": agent_obj.full_name,
            "role": agent_obj.role
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to register agent: {str(e)}")


@router.post("/login")
async def login_agent(credentials: AgentLogin):
    """
    Agent login with bcrypt password verification
    """
    try:
        agent = await db.agents.find_one({"username": credentials.username})
        
        if not agent:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Verify password (supports both bcrypt and legacy SHA256)
        if not verify_password(credentials.password, agent["password"]):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Update last login
        await db.agents.update_one(
            {"username": credentials.username},
            {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {
            "success": True,
            "agent": {
                "id": agent["id"],
                "username": agent["username"],
                "full_name": agent["full_name"],
                "role": agent["role"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging in: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")


@router.post("/signup")
async def signup_agent(agent_data: AgentCreate):
    """
    Agent registration/signup with bcrypt encrypted password
    Your password is securely encrypted using industry-standard bcrypt hashing.
    """
    try:
        # Check if username already exists
        existing_agent = await db.agents.find_one({"username": agent_data.username})
        if existing_agent:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Hash password with bcrypt (secure encryption)
        hashed_password = hash_password(agent_data.password)
        
        # Create new agent
        new_agent = {
            "id": str(uuid.uuid4()),
            "username": agent_data.username,
            "password": hashed_password,
            "full_name": agent_data.full_name,
            "role": "agent",  # Default role - only WhatsApp CRM + Shopify access
            "created_at": datetime.now(timezone.utc).isoformat(),
            "password_encrypted": True  # Flag to indicate bcrypt encryption
        }
        
        await db.agents.insert_one(new_agent)
        
        logger.info(f"✅ New agent registered with encrypted password: {agent_data.username}")
        
        return {
            "success": True,
            "message": "Account created successfully. Your password is securely encrypted.",
            "agent": {
                "id": new_agent["id"],
                "username": new_agent["username"],
                "full_name": new_agent["full_name"],
                "role": new_agent["role"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering agent: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed")


@router.get("")
async def get_agents():
    """
    Get all agents (passwords are never exposed)
    """
    agents = await db.agents.find({}, {"_id": 0, "password": 0}).to_list(100)
    return agents


@router.post("/init-admin")
async def initialize_admin():
    """
    One-time initialization endpoint to create default admin user
    Only works if no admin exists yet
    """
    try:
        # Check if any admin already exists
        existing_admin = await db.agents.find_one({"username": "admin"})
        if existing_admin:
            return {
                "success": False,
                "message": "Admin user already exists"
            }
        
        # Create default admin with bcrypt
        admin_password = "admin123"
        hashed_password = hash_password(admin_password)
        
        admin_user = {
            "id": "admin-default-user",
            "username": "admin",
            "password": hashed_password,
            "full_name": "Administrator",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "password_encrypted": True
        }
        
        await db.agents.insert_one(admin_user)
        
        # Also create in users collection for new user management system
        admin_user_v2 = {
            "id": "admin-default-user",
            "username": "admin",
            "password": hashed_password,
            "full_name": "Administrator",
            "email": None,
            "role": "admin",
            "status": "active",
            "stores": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system",
            "last_login": None,
            "password_encrypted": True
        }
        await db.users.update_one(
            {"username": "admin"},
            {"$set": admin_user_v2},
            upsert=True
        )
        
        logger.info("✅ Default admin user initialized with encrypted password")
        
        return {
            "success": True,
            "message": "Admin user created successfully",
            "credentials": {
                "username": "admin",
                "password": "admin123"
            }
        }
    except Exception as e:
        logger.error(f"Error initializing admin: {str(e)}")
        raise HTTPException(status_code=500, detail="Admin initialization failed")
