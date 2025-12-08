"""
WhatsApp Automation Engine
Automatically sends WhatsApp messages based on order events
"""
import logging
import os
from motor.motor_asyncio import AsyncIOMotorClient
from meta_whatsapp_service import MetaWhatsAppService
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME')]


class WhatsAppAutomation:
    """
    Automation engine for WhatsApp messages
    Triggers messages based on order status changes
    """
    
    def __init__(self):
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Initialize WhatsApp service"""
        try:
            access_token = os.environ.get('WHATSAPP_ACCESS_TOKEN')
            phone_number_id = os.environ.get('WHATSAPP_PHONE_NUMBER_ID')
            business_account_id = os.environ.get('WHATSAPP_BUSINESS_ACCOUNT_ID')
            
            if access_token and phone_number_id:
                self.service = MetaWhatsAppService(
                    access_token=access_token,
                    phone_number_id=phone_number_id,
                    business_account_id=business_account_id
                )
                logger.info("✅ WhatsApp automation service initialized")
            else:
                logger.warning("⚠️ WhatsApp credentials not found - automation disabled")
        except Exception as e:
            logger.error(f"Error initializing WhatsApp service: {str(e)}")
    
    async def send_order_confirmation(self, order_data: dict) -> dict:
        """
        Send order confirmation message
        Triggered when: Order is created
        """
        try:
            if not self.service:
                return {"success": False, "error": "WhatsApp service not initialized"}
            
            customer_name = order_data.get('first_name', 'Customer')
            order_number = order_data.get('order_number', 'N/A')
            phone = order_data.get('phone')
            total_amount = order_data.get('total_price', 0)
            item_count = len(order_data.get('line_items', []))
            
            if not phone:
                return {"success": False, "error": "No phone number"}
            
            # Prepare template parameters
            body_params = [
                {"type": "text", "text": customer_name},
                {"type": "text", "text": str(order_number)},
                {"type": "text", "text": str(item_count)},
                {"type": "text", "text": str(total_amount)}
            ]
            
            # Send template message
            result = self.service.send_template_message(
                to_phone=phone,
                template_name="order_confirmation_ashmiaa",
                language_code="en_US",
                body_params=body_params
            )
            
            # Log message
            if result.get("success"):
                await self._log_automated_message(
                    message_type="order_confirmation",
                    phone=phone,
                    order_number=order_number,
                    message_id=result.get("message_id"),
                    status="sent"
                )
                logger.info(f"✅ Order confirmation sent for #{order_number}")
            else:
                await self._log_automated_message(
                    message_type="order_confirmation",
                    phone=phone,
                    order_number=order_number,
                    status="failed",
                    error=result.get("error")
                )
                logger.error(f"❌ Failed to send order confirmation: {result.get('error')}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in send_order_confirmation: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_shipping_update(self, customer_data: dict) -> dict:
        """
        Send shipping update message
        Triggered when: Order status changes to 'Dispatched' or tracking number is added
        """
        try:
            if not self.service:
                return {"success": False, "error": "WhatsApp service not initialized"}
            
            customer_name = customer_data.get('first_name', 'Customer')
            order_number = customer_data.get('order_number', 'N/A')
            phone = customer_data.get('phone')
            tracking_number = customer_data.get('tracking_number', 'N/A')
            
            if not phone or not tracking_number:
                return {"success": False, "error": "Missing phone or tracking number"}
            
            # Estimate delivery date (3-5 business days from now)
            from datetime import timedelta
            delivery_date = (datetime.now(timezone.utc) + timedelta(days=4)).strftime("%b %d, %Y")
            
            # Prepare template parameters
            body_params = [
                {"type": "text", "text": customer_name},
                {"type": "text", "text": str(order_number)},
                {"type": "text", "text": tracking_number},
                {"type": "text", "text": delivery_date}
            ]
            
            # Send template message
            result = self.service.send_template_message(
                to_phone=phone,
                template_name="shipping_update_ashmiaa",
                language_code="en_US",
                body_params=body_params
            )
            
            # Log message
            if result.get("success"):
                await self._log_automated_message(
                    message_type="shipping_update",
                    phone=phone,
                    order_number=order_number,
                    message_id=result.get("message_id"),
                    status="sent"
                )
                logger.info(f"✅ Shipping update sent for #{order_number}")
            else:
                await self._log_automated_message(
                    message_type="shipping_update",
                    phone=phone,
                    order_number=order_number,
                    status="failed",
                    error=result.get("error")
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Error in send_shipping_update: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_delivery_confirmation(self, customer_data: dict) -> dict:
        """
        Send delivery confirmation message
        Triggered when: Delivery status changes to 'DELIVERED'
        """
        try:
            if not self.service:
                return {"success": False, "error": "WhatsApp service not initialized"}
            
            customer_name = customer_data.get('first_name', 'Customer')
            order_number = customer_data.get('order_number', 'N/A')
            phone = customer_data.get('phone')
            
            if not phone:
                return {"success": False, "error": "No phone number"}
            
            # Prepare template parameters
            body_params = [
                {"type": "text", "text": customer_name},
                {"type": "text", "text": str(order_number)}
            ]
            
            # Send template message
            result = self.service.send_template_message(
                to_phone=phone,
                template_name="delivery_confirmation_ashmiaa",
                language_code="en_US",
                body_params=body_params
            )
            
            # Log message
            if result.get("success"):
                await self._log_automated_message(
                    message_type="delivery_confirmation",
                    phone=phone,
                    order_number=order_number,
                    message_id=result.get("message_id"),
                    status="sent"
                )
                logger.info(f"✅ Delivery confirmation sent for #{order_number}")
            else:
                await self._log_automated_message(
                    message_type="delivery_confirmation",
                    phone=phone,
                    order_number=order_number,
                    status="failed",
                    error=result.get("error")
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Error in send_delivery_confirmation: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_abandoned_cart_reminder(self, customer_data: dict) -> dict:
        """
        Send abandoned cart reminder
        Triggered when: Cart is abandoned for 24 hours
        """
        try:
            if not self.service:
                return {"success": False, "error": "WhatsApp service not initialized"}
            
            customer_name = customer_data.get('first_name', 'Customer')
            phone = customer_data.get('phone')
            cart_value = customer_data.get('abandoned_checkout_value', 0)
            item_count = len(customer_data.get('order_skus', []))
            
            if not phone:
                return {"success": False, "error": "No phone number"}
            
            # Prepare template parameters
            body_params = [
                {"type": "text", "text": customer_name},
                {"type": "text", "text": str(item_count)},
                {"type": "text", "text": str(cart_value)}
            ]
            
            # Send template message
            result = self.service.send_template_message(
                to_phone=phone,
                template_name="abandoned_cart_reminder_ashmiaa",
                language_code="en_US",
                body_params=body_params
            )
            
            # Log message
            if result.get("success"):
                await self._log_automated_message(
                    message_type="abandoned_cart",
                    phone=phone,
                    message_id=result.get("message_id"),
                    status="sent"
                )
                logger.info(f"✅ Abandoned cart reminder sent to {phone}")
            else:
                await self._log_automated_message(
                    message_type="abandoned_cart",
                    phone=phone,
                    status="failed",
                    error=result.get("error")
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Error in send_abandoned_cart_reminder: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _log_automated_message(
        self,
        message_type: str,
        phone: str,
        message_id: str = None,
        order_number: str = None,
        status: str = "sent",
        error: str = None
    ):
        """Log automated message to database"""
        try:
            message_doc = {
                "id": str(uuid.uuid4()),
                "message_id": message_id,
                "type": "automated",
                "automation_type": message_type,
                "to_phone": phone,
                "order_number": order_number,
                "status": status,
                "error": error,
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "direction": "outbound"
            }
            
            await db.whatsapp_messages.insert_one(message_doc)
            
        except Exception as e:
            logger.error(f"Error logging automated message: {str(e)}")


# Global instance
whatsapp_automation = WhatsAppAutomation()


# ============= Helper Functions to Trigger Automation =============

async def trigger_order_confirmation(order_data: dict):
    """
    Helper function to trigger order confirmation
    Call this after creating an order
    """
    return await whatsapp_automation.send_order_confirmation(order_data)


async def trigger_shipping_update(customer_data: dict):
    """
    Helper function to trigger shipping update
    Call this when tracking number is added or order is dispatched
    """
    return await whatsapp_automation.send_shipping_update(customer_data)


async def trigger_delivery_confirmation(customer_data: dict):
    """
    Helper function to trigger delivery confirmation
    Call this when delivery status changes to DELIVERED
    """
    return await whatsapp_automation.send_delivery_confirmation(customer_data)


async def trigger_abandoned_cart_reminder(customer_data: dict):
    """
    Helper function to trigger abandoned cart reminder
    Call this 24 hours after cart abandonment
    """
    return await whatsapp_automation.send_abandoned_cart_reminder(customer_data)
