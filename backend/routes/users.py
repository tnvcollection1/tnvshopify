"""User Management Routes
Handles user CRUD operations and role-based access control
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
import hashlib
import uuid
import logging

logger = logging.getLogger(__name__)

# Will be injected from server.py
db = None

def set_dependencies(database):
    """Set dependencies from server.py"""
    global db
    db = database

users_router = APIRouter(prefix="/users", tags=["User Management"])


def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()


def get_permissions(role: str) -> dict:
    """Get permissions for a role"""
    permissions = {
        "admin": {
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
        "manager": {
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
        "viewer": {
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
    return permissions.get(role, permissions["viewer"])


@users_router.get("")
async def get_users(include_inactive: bool = False):
    """Get all users (admin only)"""
    try:
        query = {} if include_inactive else {"status": {"$ne": "inactive"}}
        users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(100)
        
        # Add permissions to each user
        for user in users:
            user["permissions"] = get_permissions(user.get("role", "viewer"))
        
        return {"success": True, "users": users, "count": len(users)}
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@users_router.get("/roles")
async def get_roles():
    """Get available roles and their permissions"""
    return {
        "roles": [
            {
                "id": "admin",
                "name": "Administrator",
                "description": "Full access - can manage users, sync to Shopify, and access all features",
                "permissions": get_permissions("admin")
            },
            {
                "id": "manager",
                "name": "Manager",
                "description": "Can view and edit data, send messages, but cannot sync to Shopify or manage users",
                "permissions": get_permissions("manager")
            },
            {
                "id": "viewer",
                "name": "Viewer",
                "description": "Read-only access - can view dashboards but cannot make changes or see sensitive data",
                "permissions": get_permissions("viewer")
            }
        ]
    }


@users_router.get("/me")
async def get_current_user(user_id: str):
    """Validate session and get current user data - used for frontend session verification"""
    try:
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID required")
        
        # Try users collection first
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        
        # Fall back to agents collection for backward compatibility
        if not user:
            user = await db.agents.find_one({"id": user_id}, {"_id": 0, "password": 0})
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found - session invalid")
        
        if user.get("status") == "inactive":
            raise HTTPException(status_code=401, detail="Account is deactivated")
        
        # Add permissions
        permissions = get_permissions(user.get("role", "viewer"))
        
        return {
            "success": True,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "full_name": user.get("full_name", user["username"]),
                "email": user.get("email"),
                "role": user.get("role", "viewer"),
                "stores": user.get("stores", []),
                "permissions": permissions
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating session: {str(e)}")
        raise HTTPException(status_code=500, detail="Session validation failed")


@users_router.get("/{user_id}")
async def get_user(user_id: str):
    """Get a specific user by ID"""
    try:
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user["permissions"] = get_permissions(user.get("role", "viewer"))
        return {"success": True, "user": user}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@users_router.post("")
async def create_user(
    username: str,
    password: str,
    full_name: str,
    role: str = "viewer",
    email: str = None,
    stores: str = None,
    created_by: str = None
):
    """Create a new user (admin only)"""
    try:
        # Validate role
        if role not in ["admin", "manager", "viewer"]:
            raise HTTPException(status_code=400, detail="Invalid role. Must be admin, manager, or viewer")
        
        # Check if username exists
        existing = await db.users.find_one({"username": username})
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Check if email exists
        if email:
            existing_email = await db.users.find_one({"email": email})
            if existing_email:
                raise HTTPException(status_code=400, detail="Email already exists")
        
        # Parse stores list
        stores_list = []
        if stores:
            stores_list = [s.strip() for s in stores.split(",") if s.strip()]
        
        # Create user
        user = {
            "id": str(uuid.uuid4()),
            "username": username,
            "password": hash_password(password),
            "email": email,
            "full_name": full_name,
            "role": role,
            "status": "active",
            "stores": stores_list,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": created_by,
            "last_login": None
        }
        
        await db.users.insert_one(user)
        logger.info(f"✅ New user created: {username} with role {role}")
        
        # Return without password and _id
        user.pop("password", None)
        user.pop("_id", None)
        user["permissions"] = get_permissions(role)
        
        return {"success": True, "user": user, "message": f"User {username} created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@users_router.put("/{user_id}")
async def update_user(
    user_id: str,
    full_name: str = None,
    email: str = None,
    role: str = None,
    status: str = None,
    stores: str = None
):
    """Update a user (admin only)"""
    try:
        # Check if user exists
        existing = await db.users.find_one({"id": user_id})
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent modifying the main admin account's role
        if existing.get("username") == "admin" and role and role != "admin":
            raise HTTPException(status_code=400, detail="Cannot change role of main admin account")
        
        # Build update
        update = {}
        if full_name:
            update["full_name"] = full_name
        if email:
            update["email"] = email
        if role:
            if role not in ["admin", "manager", "viewer"]:
                raise HTTPException(status_code=400, detail="Invalid role")
            update["role"] = role
        if status:
            if status not in ["active", "inactive", "pending"]:
                raise HTTPException(status_code=400, detail="Invalid status")
            update["status"] = status
        if stores is not None:
            update["stores"] = [s.strip() for s in stores.split(",") if s.strip()] if stores else []
        
        if not update:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.users.update_one({"id": user_id}, {"$set": update})
        
        # Get updated user
        updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        updated["permissions"] = get_permissions(updated.get("role", "viewer"))
        
        logger.info(f"✅ User updated: {existing.get('username')}")
        return {"success": True, "user": updated, "message": "User updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@users_router.delete("/{user_id}")
async def delete_user(user_id: str):
    """Delete a user (admin only) - actually sets status to inactive"""
    try:
        existing = await db.users.find_one({"id": user_id})
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent deleting main admin
        if existing.get("username") == "admin":
            raise HTTPException(status_code=400, detail="Cannot delete main admin account")
        
        # Soft delete - set status to inactive
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"status": "inactive", "deleted_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        logger.info(f"✅ User deactivated: {existing.get('username')}")
        return {"success": True, "message": f"User {existing.get('username')} deactivated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@users_router.post("/{user_id}/reset-password")
async def reset_password(user_id: str, new_password: str):
    """Reset user password (admin only)"""
    try:
        existing = await db.users.find_one({"id": user_id})
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        
        if len(new_password) < 4:
            raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "password": hash_password(new_password),
                "password_reset_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"✅ Password reset for user: {existing.get('username')}")
        return {"success": True, "message": "Password reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting password: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@users_router.post("/login")
async def login_user(username: str, password: str):
    """User login - returns user data with permissions"""
    try:
        hashed = hash_password(password)
        
        # Try users collection first
        user = await db.users.find_one({"username": username, "password": hashed})
        
        # Fall back to agents collection for backward compatibility
        if not user:
            user = await db.agents.find_one({"username": username, "password": hashed})
            if user:
                # Migrate agent to users collection if found
                user["status"] = "active"
                user["stores"] = []
                if "role" not in user:
                    user["role"] = "admin" if username == "admin" else "manager"
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        if user.get("status") == "inactive":
            raise HTTPException(status_code=401, detail="Account is deactivated. Contact admin.")
        
        # Update last login
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        
        # Build response
        permissions = get_permissions(user.get("role", "viewer"))
        
        return {
            "success": True,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "full_name": user.get("full_name", user["username"]),
                "email": user.get("email"),
                "role": user.get("role", "viewer"),
                "stores": user.get("stores", []),
                "permissions": permissions
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging in: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")


@users_router.get("/activity/recent")
async def get_recent_activity(limit: int = 50):
    """Get recent user activity log"""
    try:
        activities = await db.user_activity.find(
            {},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return {"success": True, "activities": activities}
    except Exception as e:
        logger.error(f"Error fetching activity: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@users_router.post("/activity/log")
async def log_activity(user_id: str, action: str, details: str = None):
    """Log user activity"""
    try:
        activity = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": action,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await db.user_activity.insert_one(activity)
        return {"success": True}
    except Exception as e:
        logger.error(f"Error logging activity: {str(e)}")
        return {"success": False}
