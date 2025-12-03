"""
Meta WhatsApp Business API Service
Official Facebook/Meta WhatsApp Business Platform integration
"""
import os
import httpx
import logging
from typing import Optional, Dict, List
from datetime import datetime

logger = logging.getLogger(__name__)

class WhatsAppService:
    """WhatsApp Business API Service for sending messages"""
    
    def __init__(self):
        self.phone_number_id = os.getenv('WHATSAPP_PHONE_NUMBER_ID')
        self.access_token = os.getenv('WHATSAPP_ACCESS_TOKEN')
        self.base_url = f"https://graph.facebook.com/v21.0/{self.phone_number_id}"
        
        if not self.phone_number_id or not self.access_token:
            logger.error("WhatsApp credentials not configured")
            raise ValueError("WhatsApp credentials missing in environment")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get API request headers"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    async def send_text_message(self, to: str, message: str) -> Dict:
        """
        Send a text message to a WhatsApp number
        
        Args:
            to: Phone number with country code (e.g., "923001234567")
            message: Text message to send
            
        Returns:
            Response from WhatsApp API
        """
        try:
            # Clean phone number (remove spaces, dashes, plus signs)
            phone = to.replace("+", "").replace("-", "").replace(" ", "")
            
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": phone,
                "type": "text",
                "text": {
                    "preview_url": False,
                    "body": message
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/messages",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"Message sent successfully to {phone}: {result}")
                    return {
                        "success": True,
                        "message_id": result.get("messages", [{}])[0].get("id"),
                        "phone": phone,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                else:
                    error_data = response.json()
                    logger.error(f"WhatsApp API error: {error_data}")
                    return {
                        "success": False,
                        "error": error_data.get("error", {}).get("message", "Unknown error"),
                        "error_code": error_data.get("error", {}).get("code")
                    }
                    
        except Exception as e:
            logger.error(f"Error sending WhatsApp message: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_template_message(
        self, 
        to: str, 
        template_name: str,
        language_code: str = "en",
        components: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Send a pre-approved template message
        
        Args:
            to: Phone number with country code
            template_name: Name of approved template
            language_code: Template language (default: "en")
            components: Template variable values
            
        Returns:
            Response from WhatsApp API
        """
        try:
            phone = to.replace("+", "").replace("-", "").replace(" ", "")
            
            payload = {
                "messaging_product": "whatsapp",
                "to": phone,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {
                        "code": language_code
                    }
                }
            }
            
            if components:
                payload["template"]["components"] = components
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/messages",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"Template message sent to {phone}")
                    return {
                        "success": True,
                        "message_id": result.get("messages", [{}])[0].get("id"),
                        "phone": phone
                    }
                else:
                    error_data = response.json()
                    logger.error(f"WhatsApp template error: {error_data}")
                    return {
                        "success": False,
                        "error": error_data.get("error", {}).get("message", "Unknown error")
                    }
                    
        except Exception as e:
            logger.error(f"Error sending template message: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_bulk_messages(self, recipients: List[Dict[str, str]]) -> Dict:
        """
        Send messages to multiple recipients
        
        Args:
            recipients: List of dicts with 'phone' and 'message' keys
            
        Returns:
            Summary of sent messages
        """
        results = {
            "total": len(recipients),
            "success": 0,
            "failed": 0,
            "results": []
        }
        
        for recipient in recipients:
            phone = recipient.get("phone")
            message = recipient.get("message")
            
            if not phone or not message:
                results["failed"] += 1
                results["results"].append({
                    "phone": phone,
                    "success": False,
                    "error": "Missing phone or message"
                })
                continue
            
            result = await self.send_text_message(phone, message)
            
            if result.get("success"):
                results["success"] += 1
            else:
                results["failed"] += 1
            
            results["results"].append(result)
        
        return results
    
    async def get_message_templates(self) -> Dict:
        """Get list of approved message templates"""
        try:
            waba_id = os.getenv('WHATSAPP_BUSINESS_ACCOUNT_ID')
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://graph.facebook.com/v21.0/{waba_id}/message_templates",
                    headers=self._get_headers(),
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return {
                        "success": True,
                        "templates": response.json().get("data", [])
                    }
                else:
                    return {
                        "success": False,
                        "error": "Failed to fetch templates"
                    }
                    
        except Exception as e:
            logger.error(f"Error fetching templates: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }


# Singleton instance
whatsapp_service = WhatsAppService()
