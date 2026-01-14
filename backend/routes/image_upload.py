"""
Image Upload API for Storefront
- Upload images for banners, category tabs, logos
- Stores images locally with unique filenames
- Returns accessible URLs
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from typing import Optional
import os
import uuid
import shutil
from datetime import datetime

router = APIRouter(prefix="/api/uploads", tags=["Image Uploads"])

# Upload directory
UPLOAD_DIR = "/app/backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed image types
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    category: Optional[str] = "general"
):
    """
    Upload an image file
    - category: 'banners', 'categories', 'logos', 'products', 'general'
    Returns the URL to access the uploaded image
    """
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_TYPES)}"
        )
    
    # Read file to check size
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_SIZE // (1024*1024)}MB"
        )
    
    # Create category subdirectory
    category_dir = os.path.join(UPLOAD_DIR, category)
    os.makedirs(category_dir, exist_ok=True)
    
    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    unique_name = f"{uuid.uuid4().hex}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
    file_path = os.path.join(category_dir, unique_name)
    
    # Save file
    with open(file_path, 'wb') as f:
        f.write(content)
    
    # Return URL
    return {
        "success": True,
        "filename": unique_name,
        "url": f"/api/uploads/images/{category}/{unique_name}",
        "full_path": file_path,
        "size": len(content),
        "content_type": file.content_type
    }


@router.post("/images/multiple")
async def upload_multiple_images(
    files: list[UploadFile] = File(...),
    category: Optional[str] = "general"
):
    """Upload multiple images at once"""
    results = []
    
    for file in files:
        if file.content_type not in ALLOWED_TYPES:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": "Invalid file type"
            })
            continue
        
        content = await file.read()
        if len(content) > MAX_SIZE:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": "File too large"
            })
            continue
        
        category_dir = os.path.join(UPLOAD_DIR, category)
        os.makedirs(category_dir, exist_ok=True)
        
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        unique_name = f"{uuid.uuid4().hex}.{ext}"
        file_path = os.path.join(category_dir, unique_name)
        
        with open(file_path, 'wb') as f:
            f.write(content)
        
        results.append({
            "filename": file.filename,
            "success": True,
            "url": f"/api/uploads/images/{category}/{unique_name}",
            "size": len(content)
        })
    
    return {"results": results}


@router.get("/images/{category}/{filename}")
async def get_uploaded_image(category: str, filename: str):
    """Serve an uploaded image"""
    file_path = os.path.join(UPLOAD_DIR, category, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Determine content type
    ext = filename.split('.')[-1].lower()
    content_types = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
    }
    content_type = content_types.get(ext, 'image/jpeg')
    
    return FileResponse(file_path, media_type=content_type)


@router.delete("/images/{category}/{filename}")
async def delete_uploaded_image(category: str, filename: str):
    """Delete an uploaded image"""
    file_path = os.path.join(UPLOAD_DIR, category, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    os.remove(file_path)
    
    return {"success": True, "message": "Image deleted"}


@router.get("/list/{category}")
async def list_uploaded_images(category: str):
    """List all uploaded images in a category"""
    category_dir = os.path.join(UPLOAD_DIR, category)
    
    if not os.path.exists(category_dir):
        return {"images": []}
    
    images = []
    for filename in os.listdir(category_dir):
        file_path = os.path.join(category_dir, filename)
        if os.path.isfile(file_path):
            images.append({
                "filename": filename,
                "url": f"/api/uploads/images/{category}/{filename}",
                "size": os.path.getsize(file_path)
            })
    
    return {"images": images, "count": len(images)}
