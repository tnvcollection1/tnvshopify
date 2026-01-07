"""
Email Notification Service for Storefront
Sends order confirmation and shipment notification emails via SendGrid
"""
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content, HtmlContent
import os
import logging
from datetime import datetime
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)

# SendGrid API Key from environment
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@store.com')
SENDER_NAME = os.environ.get('SENDER_NAME', 'Store')


class EmailService:
    """Email service using SendGrid"""
    
    def __init__(self):
        self.api_key = SENDGRID_API_KEY
        self.sender_email = SENDER_EMAIL
        self.sender_name = SENDER_NAME
        self.enabled = bool(self.api_key)
        
        if not self.enabled:
            logger.warning("SendGrid API key not configured. Email notifications will be disabled.")
    
    def _send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send an email via SendGrid"""
        if not self.enabled:
            logger.info(f"Email disabled - would send to {to_email}: {subject}")
            return False
        
        try:
            message = Mail(
                from_email=Email(self.sender_email, self.sender_name),
                to_emails=To(to_email),
                subject=subject,
                html_content=HtmlContent(html_content)
            )
            
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"Failed to send email: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {str(e)}")
            return False
    
    def send_order_confirmation(self, order: Dict) -> bool:
        """
        Send order confirmation email
        
        Args:
            order: Order dict with customer info, items, totals
        """
        customer = order.get('customer', {})
        to_email = customer.get('email')
        
        if not to_email:
            logger.warning(f"No email for order {order.get('order_id')}")
            return False
        
        order_id = order.get('order_id', 'N/A')
        customer_name = customer.get('name', 'Customer')
        items = order.get('items', [])
        
        # Build items HTML
        items_html = ""
        for item in items:
            items_html += f"""
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">
                    <div style="display: flex; align-items: center;">
                        <img src="{item.get('image', '')}" alt="" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; margin-right: 12px;">
                        <div>
                            <p style="margin: 0; font-weight: 500;">{item.get('title', 'Product')}</p>
                            {f"<p style='margin: 4px 0 0; color: #666; font-size: 13px;'>Size: {item.get('size', '-')} | Color: {item.get('color', '-')}</p>" if item.get('size') or item.get('color') else ""}
                            <p style="margin: 4px 0 0; color: #666; font-size: 13px;">Qty: {item.get('quantity', 1)}</p>
                        </div>
                    </div>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 500;">
                    ₹{item.get('price', 0):,.2f}
                </td>
            </tr>
            """
        
        # Build shipping address HTML
        shipping = order.get('shipping_address', {})
        address_html = f"""
            <p style="margin: 0;">{shipping.get('name', customer_name)}</p>
            <p style="margin: 4px 0;">{shipping.get('address1', '')}</p>
            {f"<p style='margin: 4px 0;'>{shipping.get('address2', '')}</p>" if shipping.get('address2') else ""}
            <p style="margin: 4px 0;">{shipping.get('city', '')}, {shipping.get('state', '')} {shipping.get('zip', '')}</p>
            <p style="margin: 4px 0;">{shipping.get('country', 'India')}</p>
            {f"<p style='margin: 4px 0;'>Phone: {shipping.get('phone', '')}</p>" if shipping.get('phone') else ""}
        """
        
        subject = f"Order Confirmed - #{order_id}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Header -->
                <div style="background-color: #000000; color: #ffffff; padding: 24px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600;">{self.sender_name}</h1>
                </div>
                
                <!-- Success Banner -->
                <div style="background-color: #22c55e; color: #ffffff; padding: 20px; text-align: center;">
                    <h2 style="margin: 0; font-size: 20px;">✓ Order Confirmed!</h2>
                    <p style="margin: 8px 0 0; opacity: 0.9;">Thank you for your order, {customer_name}</p>
                </div>
                
                <!-- Order Info -->
                <div style="padding: 24px;">
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <p style="margin: 0; color: #666;">Order Number</p>
                        <p style="margin: 4px 0 0; font-size: 18px; font-weight: 600;">#{order_id}</p>
                        <p style="margin: 12px 0 0; color: #666; font-size: 13px;">
                            Placed on {datetime.now().strftime('%B %d, %Y')}
                        </p>
                    </div>
                    
                    <!-- Items -->
                    <h3 style="margin: 0 0 12px; font-size: 16px;">Order Items</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        {items_html}
                    </table>
                    
                    <!-- Totals -->
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #eee;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #666;">Subtotal</span>
                            <span>₹{order.get('subtotal', 0):,.2f}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #666;">Shipping</span>
                            <span>{f"₹{order.get('shipping', 0):,.2f}" if order.get('shipping', 0) > 0 else "FREE"}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 600; margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
                            <span>Total</span>
                            <span>₹{order.get('total', 0):,.2f}</span>
                        </div>
                    </div>
                    
                    <!-- Shipping Address -->
                    <div style="margin-top: 24px;">
                        <h3 style="margin: 0 0 12px; font-size: 16px;">Shipping Address</h3>
                        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px;">
                            {address_html}
                        </div>
                    </div>
                    
                    <!-- Payment Method -->
                    <div style="margin-top: 24px;">
                        <h3 style="margin: 0 0 12px; font-size: 16px;">Payment Method</h3>
                        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px;">
                            <p style="margin: 0; font-weight: 500;">
                                {order.get('payment_method', 'Online Payment').replace('_', ' ').title()}
                            </p>
                            {f"<p style='margin: 4px 0 0; color: #22c55e; font-size: 13px;'>✓ Payment received</p>" if order.get('payment_status') == 'paid' else "<p style='margin: 4px 0 0; color: #f59e0b; font-size: 13px;'>Payment pending</p>"}
                        </div>
                    </div>
                    
                    <!-- What's Next -->
                    <div style="margin-top: 24px; background-color: #eff6ff; border-radius: 8px; padding: 16px;">
                        <h3 style="margin: 0 0 12px; font-size: 16px; color: #1e40af;">What's Next?</h3>
                        <ol style="margin: 0; padding-left: 20px; color: #1e40af;">
                            <li style="margin-bottom: 8px;">We'll process your order within 24-48 hours</li>
                            <li style="margin-bottom: 8px;">You'll receive a shipping confirmation email with tracking</li>
                            <li>Expected delivery: 5-7 business days</li>
                        </ol>
                    </div>
                    
                    <!-- Track Order Button -->
                    <div style="margin-top: 24px; text-align: center;">
                        <a href="{order.get('tracking_url', '#')}" 
                           style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                            Track Your Order
                        </a>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #eee;">
                    <p style="margin: 0; color: #666; font-size: 13px;">
                        Questions? Reply to this email or contact our support team.
                    </p>
                    <p style="margin: 12px 0 0; color: #999; font-size: 12px;">
                        © {datetime.now().year} {self.sender_name}. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(to_email, subject, html_content)
    
    def send_shipment_notification(self, order: Dict, tracking_number: str, courier: str = "DWZ56") -> bool:
        """
        Send shipment notification email with tracking info
        
        Args:
            order: Order dict with customer info
            tracking_number: Shipping tracking number
            courier: Courier/carrier name
        """
        customer = order.get('customer', {})
        to_email = customer.get('email')
        
        if not to_email:
            logger.warning(f"No email for order {order.get('order_id')}")
            return False
        
        order_id = order.get('order_id', 'N/A')
        customer_name = customer.get('name', 'Customer')
        
        # Build tracking URL based on courier
        tracking_urls = {
            'DWZ56': f"https://dwz56.com/track/{tracking_number}",
            'DTDC': f"https://www.dtdc.in/trace.asp?strCnno={tracking_number}",
            'Delhivery': f"https://www.delhivery.com/track/package/{tracking_number}",
            'BlueDart': f"https://www.bluedart.com/tracking?awb={tracking_number}",
            'FedEx': f"https://www.fedex.com/fedextrack/?tracknumbers={tracking_number}"
        }
        tracking_url = tracking_urls.get(courier, f"https://track.aftership.com/{tracking_number}")
        
        # Build items HTML (simplified for shipment email)
        items = order.get('items', [])
        items_html = ""
        for item in items:
            items_html += f"""
            <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee;">
                <img src="{item.get('image', '')}" alt="" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-right: 12px;">
                <div>
                    <p style="margin: 0; font-weight: 500;">{item.get('title', 'Product')}</p>
                    <p style="margin: 4px 0 0; color: #666; font-size: 13px;">Qty: {item.get('quantity', 1)}</p>
                </div>
            </div>
            """
        
        subject = f"Your Order #{order_id} Has Been Shipped!"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Header -->
                <div style="background-color: #000000; color: #ffffff; padding: 24px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600;">{self.sender_name}</h1>
                </div>
                
                <!-- Shipped Banner -->
                <div style="background-color: #3b82f6; color: #ffffff; padding: 20px; text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 8px;">📦</div>
                    <h2 style="margin: 0; font-size: 20px;">Your Order is On Its Way!</h2>
                    <p style="margin: 8px 0 0; opacity: 0.9;">Get ready, {customer_name}!</p>
                </div>
                
                <!-- Tracking Info -->
                <div style="padding: 24px;">
                    <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                        <p style="margin: 0; color: #0369a1; font-size: 14px;">Tracking Number</p>
                        <p style="margin: 8px 0; font-size: 24px; font-weight: 600; font-family: monospace; letter-spacing: 1px;">
                            {tracking_number}
                        </p>
                        <p style="margin: 0; color: #666; font-size: 13px;">Carrier: {courier}</p>
                    </div>
                    
                    <!-- Track Button -->
                    <div style="text-align: center; margin-bottom: 24px;">
                        <a href="{tracking_url}" 
                           style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                            Track Your Package
                        </a>
                    </div>
                    
                    <!-- Order Summary -->
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #666;">Order Number</span>
                            <span style="font-weight: 500;">#{order_id}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #666;">Expected Delivery</span>
                            <span style="font-weight: 500;">3-5 Business Days</span>
                        </div>
                    </div>
                    
                    <!-- Items Being Shipped -->
                    <h3 style="margin: 0 0 12px; font-size: 16px;">Items in This Shipment</h3>
                    <div style="border: 1px solid #eee; border-radius: 8px; padding: 0 16px;">
                        {items_html}
                    </div>
                    
                    <!-- Delivery Tips -->
                    <div style="margin-top: 24px; background-color: #fef3c7; border-radius: 8px; padding: 16px;">
                        <h3 style="margin: 0 0 8px; font-size: 14px; color: #92400e;">💡 Delivery Tips</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 13px;">
                            <li style="margin-bottom: 4px;">Ensure someone is available to receive the package</li>
                            <li style="margin-bottom: 4px;">Keep your phone nearby - courier may call</li>
                            <li>Check tracking regularly for delivery updates</li>
                        </ul>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #eee;">
                    <p style="margin: 0; color: #666; font-size: 13px;">
                        Questions about your delivery? Reply to this email.
                    </p>
                    <p style="margin: 12px 0 0; color: #999; font-size: 12px;">
                        © {datetime.now().year} {self.sender_name}. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(to_email, subject, html_content)
    
    def send_delivery_confirmation(self, order: Dict) -> bool:
        """
        Send delivery confirmation email
        
        Args:
            order: Order dict with customer info
        """
        customer = order.get('customer', {})
        to_email = customer.get('email')
        
        if not to_email:
            logger.warning(f"No email for order {order.get('order_id')}")
            return False
        
        order_id = order.get('order_id', 'N/A')
        customer_name = customer.get('name', 'Customer')
        
        subject = f"Your Order #{order_id} Has Been Delivered!"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Header -->
                <div style="background-color: #000000; color: #ffffff; padding: 24px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600;">{self.sender_name}</h1>
                </div>
                
                <!-- Delivered Banner -->
                <div style="background-color: #22c55e; color: #ffffff; padding: 30px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
                    <h2 style="margin: 0; font-size: 24px;">Your Order Has Been Delivered!</h2>
                    <p style="margin: 12px 0 0; opacity: 0.9; font-size: 16px;">
                        We hope you love your purchase, {customer_name}!
                    </p>
                </div>
                
                <!-- Content -->
                <div style="padding: 24px;">
                    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <p style="margin: 0; color: #166534; text-align: center;">
                            ✓ Order #{order_id} was successfully delivered
                        </p>
                    </div>
                    
                    <!-- Review Request -->
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 8px; font-size: 18px;">How was your experience?</h3>
                        <p style="margin: 0 0 16px; color: #666;">
                            Your feedback helps us improve and helps other customers too!
                        </p>
                        <a href="#" 
                           style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                            Leave a Review
                        </a>
                    </div>
                    
                    <!-- Help Section -->
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px;">
                        <h4 style="margin: 0 0 12px; font-size: 14px;">Need Help?</h4>
                        <p style="margin: 0; color: #666; font-size: 13px;">
                            If you have any issues with your order, please don't hesitate to contact us.
                            We're here to help!
                        </p>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #eee;">
                    <p style="margin: 0; color: #666; font-size: 13px;">
                        Thank you for shopping with us!
                    </p>
                    <p style="margin: 12px 0 0; color: #999; font-size: 12px;">
                        © {datetime.now().year} {self.sender_name}. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(to_email, subject, html_content)


# Create singleton instance
email_service = EmailService()
