"""
Google Cloud Vision API Service
Competitor discovery through Web Detection feature
"""
import os
import logging
import base64
import httpx
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Google Cloud Vision API configuration
GOOGLE_VISION_API_KEY = os.environ.get('GOOGLE_VISION_API_KEY')
VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate"


class VisionAPIService:
    """Service for Google Cloud Vision API Web Detection"""
    
    def __init__(self):
        self.api_key = GOOGLE_VISION_API_KEY
        self.enabled = bool(self.api_key)
        
        if not self.enabled:
            logger.warning("GOOGLE_VISION_API_KEY not configured. Vision API disabled.")
    
    async def detect_web_entities(self, image_url: str = None, image_base64: str = None) -> Dict[str, Any]:
        """
        Detect web entities and pages containing similar images.
        
        Args:
            image_url: URL of the image to analyze
            image_base64: Base64 encoded image content
        
        Returns:
            Dictionary with competitor URLs, matching images, and web entities
        """
        if not self.enabled:
            return {"error": "Vision API not configured", "enabled": False}
        
        try:
            # Build request payload
            if image_url:
                image_source = {"source": {"imageUri": image_url}}
            elif image_base64:
                image_source = {"content": image_base64}
            else:
                return {"error": "No image provided"}
            
            request_body = {
                "requests": [
                    {
                        "image": image_source,
                        "features": [
                            {"type": "WEB_DETECTION", "maxResults": 50}
                        ]
                    }
                ]
            }
            
            # Make API request
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{VISION_API_URL}?key={self.api_key}",
                    json=request_body
                )
                
                if response.status_code != 200:
                    logger.error(f"Vision API error: {response.status_code} - {response.text}")
                    return {"error": f"API error: {response.status_code}"}
                
                data = response.json()
            
            # Parse response
            web_detection = data.get("responses", [{}])[0].get("webDetection", {})
            
            result = {
                "success": True,
                "full_matching_images": [
                    {"url": img.get("url")}
                    for img in web_detection.get("fullMatchingImages", [])
                ],
                "partial_matching_images": [
                    {"url": img.get("url")}
                    for img in web_detection.get("partialMatchingImages", [])
                ],
                "pages_with_matching_images": [
                    {
                        "url": page.get("url"),
                        "title": page.get("pageTitle", ""),
                        "full_matches": [
                            {"url": m.get("url")} 
                            for m in page.get("fullMatchingImages", [])
                        ],
                        "partial_matches": [
                            {"url": m.get("url")} 
                            for m in page.get("partialMatchingImages", [])
                        ]
                    }
                    for page in web_detection.get("pagesWithMatchingImages", [])
                ],
                "web_entities": [
                    {
                        "entity_id": entity.get("entityId", ""),
                        "score": entity.get("score", 0),
                        "description": entity.get("description", "")
                    }
                    for entity in web_detection.get("webEntities", [])
                ],
                "best_guess_labels": [
                    label.get("label", "")
                    for label in web_detection.get("bestGuessLabels", [])
                ],
                "visually_similar_images": [
                    {"url": img.get("url")}
                    for img in web_detection.get("visuallySimilarImages", [])
                ],
                "analyzed_at": datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Vision API analysis complete: {len(result['pages_with_matching_images'])} competitor pages found")
            return result
            
        except Exception as e:
            logger.error(f"Vision API error: {str(e)}")
            return {"error": str(e), "success": False}
    
    async def analyze_product_image(self, image_path: str) -> Dict[str, Any]:
        """
        Analyze a local image file for web presence.
        
        Args:
            image_path: Path to local image file
        
        Returns:
            Web detection results
        """
        try:
            with open(image_path, "rb") as f:
                image_content = base64.b64encode(f.read()).decode("utf-8")
            
            return await self.detect_web_entities(image_base64=image_content)
        except Exception as e:
            logger.error(f"Error analyzing image file: {str(e)}")
            return {"error": str(e), "success": False}


# Singleton instance
vision_api_service = VisionAPIService()
