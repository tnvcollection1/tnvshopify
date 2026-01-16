"""
Stories API Routes
CRUD operations for Instagram/Namshi style stories
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os

router = APIRouter(prefix="/api/stories", tags=["Stories"])

# Get database connection
def get_db():
    from server import db
    return db

# Models
class StorySlide(BaseModel):
    type: str = "image"  # image or video
    url: str
    caption: Optional[str] = None
    link: Optional[str] = None
    duration: int = 5000  # milliseconds

class StoryCreate(BaseModel):
    username: str
    avatar: Optional[str] = None
    slides: List[StorySlide]
    isOfficial: bool = False
    store: str = "tnvcollection"

class StoryUpdate(BaseModel):
    username: Optional[str] = None
    avatar: Optional[str] = None
    slides: Optional[List[StorySlide]] = None
    isOfficial: Optional[bool] = None
    isActive: Optional[bool] = None

# Helper to serialize MongoDB documents
def serialize_story(story):
    if not story:
        return None
    return {
        "id": str(story["_id"]),
        "username": story.get("username", ""),
        "avatar": story.get("avatar", ""),
        "slides": story.get("slides", []),
        "isOfficial": story.get("isOfficial", False),
        "isNew": story.get("isNew", True),
        "isActive": story.get("isActive", True),
        "store": story.get("store", "tnvcollection"),
        "views": story.get("views", 0),
        "createdAt": story.get("createdAt", datetime.now(timezone.utc)).isoformat(),
        "expiresAt": story.get("expiresAt", (datetime.now(timezone.utc) + timedelta(hours=24))).isoformat(),
    }

# Get all active stories for a store
@router.get("/")
async def get_stories(store: str = "tnvcollection"):
    """Get all active stories for a store"""
    try:
        db = get_db()
        now = datetime.now(timezone.utc)
        
        stories = list(db.stories.find({
            "store": store,
            "isActive": True,
            "expiresAt": {"$gt": now}
        }).sort("createdAt", -1))
        
        return {
            "success": True,
            "stories": [serialize_story(s) for s in stories],
            "count": len(stories)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get a single story
@router.get("/{story_id}")
async def get_story(story_id: str):
    """Get a single story by ID"""
    try:
        db = get_db()
        story = db.stories.find_one({"_id": ObjectId(story_id)})
        
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")
        
        return {
            "success": True,
            "story": serialize_story(story)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Create a new story
@router.post("/")
async def create_story(story: StoryCreate):
    """Create a new story"""
    try:
        db = get_db()
        now = datetime.now(timezone.utc)
        
        story_doc = {
            "username": story.username,
            "avatar": story.avatar or "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
            "slides": [slide.dict() for slide in story.slides],
            "isOfficial": story.isOfficial,
            "isNew": True,
            "isActive": True,
            "store": story.store,
            "views": 0,
            "createdAt": now,
            "expiresAt": now + timedelta(hours=24),  # Stories expire after 24 hours
        }
        
        result = db.stories.insert_one(story_doc)
        story_doc["_id"] = result.inserted_id
        
        return {
            "success": True,
            "message": "Story created successfully",
            "story": serialize_story(story_doc)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Update a story
@router.put("/{story_id}")
async def update_story(story_id: str, story: StoryUpdate):
    """Update an existing story"""
    try:
        db = get_db()
        
        update_data = {k: v for k, v in story.dict().items() if v is not None}
        if "slides" in update_data:
            update_data["slides"] = [slide.dict() if hasattr(slide, 'dict') else slide for slide in update_data["slides"]]
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        result = db.stories.update_one(
            {"_id": ObjectId(story_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Story not found")
        
        updated_story = db.stories.find_one({"_id": ObjectId(story_id)})
        
        return {
            "success": True,
            "message": "Story updated successfully",
            "story": serialize_story(updated_story)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Delete a story
@router.delete("/{story_id}")
async def delete_story(story_id: str):
    """Delete a story"""
    try:
        db = get_db()
        
        result = db.stories.delete_one({"_id": ObjectId(story_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Story not found")
        
        return {
            "success": True,
            "message": "Story deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Record story view
@router.post("/{story_id}/view")
async def record_view(story_id: str):
    """Record a view for a story"""
    try:
        db = get_db()
        
        result = db.stories.update_one(
            {"_id": ObjectId(story_id)},
            {
                "$inc": {"views": 1},
                "$set": {"isNew": False}
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Story not found")
        
        return {"success": True, "message": "View recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get story analytics
@router.get("/{story_id}/analytics")
async def get_story_analytics(story_id: str):
    """Get analytics for a story"""
    try:
        db = get_db()
        story = db.stories.find_one({"_id": ObjectId(story_id)})
        
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")
        
        return {
            "success": True,
            "analytics": {
                "views": story.get("views", 0),
                "slidesCount": len(story.get("slides", [])),
                "createdAt": story.get("createdAt", datetime.now(timezone.utc)).isoformat(),
                "expiresAt": story.get("expiresAt", datetime.now(timezone.utc)).isoformat(),
                "isActive": story.get("isActive", True),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Bulk operations for admin
@router.post("/bulk/deactivate-expired")
async def deactivate_expired_stories():
    """Deactivate all expired stories"""
    try:
        db = get_db()
        now = datetime.now(timezone.utc)
        
        result = db.stories.update_many(
            {"expiresAt": {"$lt": now}, "isActive": True},
            {"$set": {"isActive": False}}
        )
        
        return {
            "success": True,
            "message": f"Deactivated {result.modified_count} expired stories"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
