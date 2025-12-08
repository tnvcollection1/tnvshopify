"""
Meta WhatsApp Business API Service
Handles sending and receiving WhatsApp messages using Meta's official API
Supports utility templates, marketing messages, media messages, and webhooks
"""
import logging
import requests
from typing import Dict, Optional, List, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class MetaWhatsAppService:
    """Service for interacting with Meta WhatsApp Business API"""
    
    def __init__(self, access_token: str, phone_number_id: str, business_account_id: str = None, api_version: str = "v22.0"):
        self.access_token = access_token
        self.phone_number_id = phone_number_id
        self.business_account_id = business_account_id
        self.api_version = api_version
        self.base_url = f"https://graph.facebook.com/{api_version}/{phone_number_id}"
        self.business_url = f"https://graph.facebook.com/{api_version}/{business_account_id}" if business_account_id else None
        
    def send_text_message(self, to_phone: str, message: str) -> Dict:
        """
        Send a text message to a WhatsApp number
        
        Args:
            to_phone: Recipient phone number (with country code, e.g., +923001234567)
            message: Text message to send
            
        Returns:
            Dict with success status and message ID
        """
        try:
            # Clean phone number (remove spaces, dashes)
            clean_phone = to_phone.replace(" ", "").replace("-", "").replace("+", "")
            
            url = f"{self.base_url}/messages"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": clean_phone,
                "type": "text",
                "text": {
                    "preview_url": False,
                    "body": message
                }
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ WhatsApp message sent to {to_phone}: {data}")
                return {
                    "success": True,
                    "message_id": data.get("messages", [{}])[0].get("id"),
                    "phone": to_phone
                }
            else:
                error_data = response.json()
                logger.error(f"❌ WhatsApp API error: {error_data}")
                return {
                    "success": False,
                    "error": error_data.get("error", {}).get("message", "Unknown error"),
                    "phone": to_phone
                }
                
        except Exception as e:
            logger.error(f"Error sending WhatsApp message: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "phone": to_phone
            }
    
    def send_template_message(
        self, 
        to_phone: str, 
        template_name: str, 
        language_code: str = "en_US",
        header_params: Optional[List[Dict]] = None,
        body_params: Optional[List[Dict]] = None,
        button_params: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Send a template message with parameters (utility or marketing)
        
        Args:
            to_phone: Recipient phone number
            template_name: Name of approved template
            language_code: Language code (e.g., "en_US", "ur")
            header_params: List of header parameters (for media headers)
            body_params: List of body text parameters
            button_params: List of button parameters
            
        Returns:
            Dict with success status and message ID
        """
        try:
            clean_phone = to_phone.replace(" ", "").replace("-", "").replace("+", "")
            
            url = f"{self.base_url}/messages"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            # Build template components
            components = []
            
            if header_params:
                components.append({
                    "type": "header",
                    "parameters": header_params
                })
            
            if body_params:
                components.append({
                    "type": "body",
                    "parameters": body_params
                })
            
            if button_params:
                components.append({
                    "type": "button",
                    "parameters": button_params
                })
            
            payload = {
                "messaging_product": "whatsapp",
                "to": clean_phone,
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
            
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "message_id": data.get("messages", [{}])[0].get("id"),
                    "phone": to_phone
                }
            else:
                error_data = response.json()
                logger.error(f"WhatsApp API error: {error_data}")
                return {
                    "success": False,
                    "error": error_data.get("error", {}).get("message", "Unknown error"),
                    "error_code": error_data.get("error", {}).get("code"),
                    "phone": to_phone
                }
                
        except Exception as e:
            logger.error(f"Error sending template message: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "phone": to_phone
            }
    
    def send_bulk_messages(self, recipients: List[Dict], message: str) -> Dict:
        """
        Send the same message to multiple recipients
        
        Args:
            recipients: List of dicts with 'phone' and optionally 'name'
            message: Message to send to all
            
        Returns:
            Dict with success count, failed count, and results
        """
        results = []
        success_count = 0
        failed_count = 0
        
        for recipient in recipients:
            phone = recipient.get("phone", "")
            if not phone:
                continue
            
            # Personalize message if name is available
            personalized_message = message
            if recipient.get("name"):
                personalized_message = message.replace("{name}", recipient["name"])
            
            result = self.send_text_message(phone, personalized_message)
            
            if result["success"]:
                success_count += 1
            else:
                failed_count += 1
            
            results.append({
                "phone": phone,
                "name": recipient.get("name", ""),
                "success": result["success"],
                "message_id": result.get("message_id"),
                "error": result.get("error")
            })
        
        return {
            "success": True,
            "total": len(recipients),
            "success_count": success_count,
            "failed_count": failed_count,
            "results": results
        }
    
    def send_media_message(
        self,
        to_phone: str,
        media_type: str,
        media_id: str = None,
        media_link: str = None,
        caption: str = None
    ) -> Dict:
        """
        Send a media message (image, video, document)
        
        Args:
            to_phone: Recipient phone number
            media_type: Type of media (image, video, document, audio)
            media_id: Media ID (uploaded to WhatsApp)
            media_link: Direct URL to media (alternative to media_id)
            caption: Optional caption for the media
            
        Returns:
            Dict with success status
        """
        try:
            clean_phone = to_phone.replace(" ", "").replace("-", "").replace("+", "")
            
            url = f"{self.base_url}/messages"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            media_object = {}
            if media_id:
                media_object["id"] = media_id
            elif media_link:
                media_object["link"] = media_link
            
            if caption and media_type in ["image", "video", "document"]:
                media_object["caption"] = caption
            
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": clean_phone,
                "type": media_type,
                media_type: media_object
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "message_id": data.get("messages", [{}])[0].get("id"),
                    "phone": to_phone
                }
            else:
                error_data = response.json()
                return {
                    "success": False,
                    "error": error_data.get("error", {}).get("message", "Unknown error"),
                    "phone": to_phone
                }
                
        except Exception as e:
            logger.error(f"Error sending media message: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "phone": to_phone
            }
    
    def mark_message_as_read(self, message_id: str) -> Dict:
        """
        Mark an incoming message as read
        
        Args:
            message_id: WhatsApp message ID
            
        Returns:
            Dict with success status
        """
        try:
            url = f"{self.base_url}/messages"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "status": "read",
                "message_id": message_id
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                return {"success": True, "message_id": message_id}
            else:
                error_data = response.json()
                return {
                    "success": False,
                    "error": error_data.get("error", {}).get("message", "Unknown error")
                }
                
        except Exception as e:
            logger.error(f"Error marking message as read: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def create_template(
        self,
        name: str,
        category: str,
        language: str,
        components: List[Dict]
    ) -> Dict:
        """
        Create a new message template
        
        Args:
            name: Template name (lowercase, alphanumeric, underscores)
            category: Template category (UTILITY, MARKETING, AUTHENTICATION)
            language: Language code (e.g., "en_US")
            components: List of template components (header, body, footer, buttons)
            
        Returns:
            Dict with success status and template ID
        """
        try:
            if not self.business_url:
                return {
                    "success": False,
                    "error": "Business account ID not configured"
                }
            
            url = f"{self.business_url}/message_templates"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "name": name,
                "category": category,
                "language": language,
                "components": components
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "template_id": data.get("id"),
                    "status": data.get("status"),
                    "category": data.get("category")
                }
            else:
                error_data = response.json()
                logger.error(f"Template creation error: {error_data}")
                return {
                    "success": False,
                    "error": error_data.get("error", {}).get("message", "Unknown error"),
                    "error_code": error_data.get("error", {}).get("code")
                }
                
        except Exception as e:
            logger.error(f"Error creating template: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_message_templates(self) -> List[Dict]:
        """
        Get list of message templates from WhatsApp Business Account
        
        Returns:
            List of template dicts
        """
        try:
            if not self.business_url:
                logger.warning("Business account ID not configured")
                return []
            
            url = f"{self.business_url}/message_templates"
            headers = {
                "Authorization": f"Bearer {self.access_token}"
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
            else:
                error_data = response.json()
                logger.error(f"Error fetching templates: {error_data}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting templates: {str(e)}")
            return []
    
    def parse_webhook_message(self, webhook_data: Dict) -> Optional[Dict]:
        """
        Parse incoming webhook message from Meta
        
        Args:
            webhook_data: Raw webhook data from Meta
            
        Returns:
            Parsed message dict or None
        """
        try:
            entry = webhook_data.get("entry", [{}])[0]
            changes = entry.get("changes", [{}])[0]
            value = changes.get("value", {})
            
            messages = value.get("messages", [])
            if not messages:
                return None
            
            message = messages[0]
            contacts = value.get("contacts", [{}])
            contact = contacts[0] if contacts else {}
            
            parsed = {
                "message_id": message.get("id"),
                "from_phone": message.get("from"),
                "from_name": contact.get("profile", {}).get("name", "Unknown"),
                "timestamp": message.get("timestamp"),
                "type": message.get("type"),
                "text": None,
                "media_id": None,
                "media_mime_type": None,
                "caption": None
            }
            
            # Parse based on message type
            if message.get("type") == "text":
                parsed["text"] = message.get("text", {}).get("body")
            elif message.get("type") == "image":
                parsed["media_id"] = message.get("image", {}).get("id")
                parsed["media_mime_type"] = message.get("image", {}).get("mime_type")
                parsed["caption"] = message.get("image", {}).get("caption")
            elif message.get("type") == "document":
                parsed["media_id"] = message.get("document", {}).get("id")
                parsed["media_mime_type"] = message.get("document", {}).get("mime_type")
                parsed["caption"] = message.get("document", {}).get("caption")
            elif message.get("type") == "video":
                parsed["media_id"] = message.get("video", {}).get("id")
                parsed["media_mime_type"] = message.get("video", {}).get("mime_type")
                parsed["caption"] = message.get("video", {}).get("caption")
            
            return parsed
            
        except Exception as e:
            logger.error(f"Error parsing webhook message: {str(e)}")
            return None
