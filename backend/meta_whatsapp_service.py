"""
Meta WhatsApp Business API Service
Handles sending and receiving WhatsApp messages using Meta's official API
"""
import logging
import requests
from typing import Dict, Optional, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class MetaWhatsAppService:
    """Service for interacting with Meta WhatsApp Business API"""
    
    def __init__(self, access_token: str, phone_number_id: str, api_version: str = "v22.0"):
        self.access_token = access_token
        self.phone_number_id = phone_number_id
        self.api_version = api_version
        self.base_url = f"https://graph.facebook.com/{api_version}/{phone_number_id}"
        
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
    
    def send_template_message(self, to_phone: str, template_name: str, language_code: str = "en") -> Dict:
        """
        Send a template message (required for business-initiated conversations)
        
        Args:
            to_phone: Recipient phone number
            template_name: Name of approved template
            language_code: Language code (e.g., "en", "ur")
            
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
    
    def get_message_templates(self) -> List[Dict]:
        """
        Get list of approved message templates
        Note: Requires business_account_id
        """
        try:
            # This would require the business account ID
            # For now, return empty list
            return []
        except Exception as e:
            logger.error(f"Error getting templates: {str(e)}")
            return []
