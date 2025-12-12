from fastapi import APIRouter, HTTPException
from models import Agent, AgentCreate, AgentLogin
from core import db, logger
from datetime import datetime, timezone
import hashlib
import uuid

router = APIRouter(prefix="/agents", tags=["Authentication"])


@router.post("/register")
async def register_agent(agent: AgentCreate):
    """
    Register a new agent
    """
    try:
        # Check if username exists
        existing = await db.agents.find_one({"username": agent.username})
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Create agent with hashed password
        hashed_password = hashlib.sha256(agent.password.encode()).hexdigest()
        
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
    Agent login
    """
    try:
        hashed_password = hashlib.sha256(credentials.password.encode()).hexdigest()
        
        agent = await db.agents.find_one({
            "username": credentials.username,
            "password": hashed_password
        })
        
        if not agent:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
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
    Agent registration/signup
    """
    try:
        # Check if username already exists
        existing_agent = await db.agents.find_one({"username": agent_data.username})
        if existing_agent:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Hash password
        hashed_password = hashlib.sha256(agent_data.password.encode()).hexdigest()
        
        # Create new agent
        new_agent = {
            "id": str(uuid.uuid4()),
            "username": agent_data.username,
            "password": hashed_password,
            "full_name": agent_data.full_name,
            "role": "agent",  # Default role
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.agents.insert_one(new_agent)
        
        logger.info(f"✅ New agent registered: {agent_data.username}")
        
        return {
            "success": True,
            "message": "Agent registered successfully",
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
    Get all agents
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
        
        # Create default admin
        admin_password = "admin123"
        hashed_password = hashlib.sha256(admin_password.encode()).hexdigest()
        
        admin_user = {
            "id": "admin-default-user",
            "username": "admin",
            "password": hashed_password,
            "full_name": "Administrator",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
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
            "last_login": None
        }
        await db.users.update_one(
            {"username": "admin"},
            {"$set": admin_user_v2},
            upsert=True
        )
        
        logger.info("✅ Default admin user initialized")
        
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
