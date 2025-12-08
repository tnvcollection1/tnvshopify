"""
Sample WhatsApp Templates for Ashmiaa Store
These templates can be created via the API and submitted to Meta for approval

Template Categories:
- UTILITY: Transactional messages (order confirmations, shipping updates)
- MARKETING: Promotional messages (sales, offers, abandoned cart)
"""

# ============= UTILITY TEMPLATES =============

ORDER_CONFIRMATION_TEMPLATE = {
    "name": "order_confirmation_ashmiaa",
    "category": "UTILITY",
    "language": "en_US",
    "components": [
        {
            "type": "header",
            "format": "text",
            "text": "Order Confirmed! 🎉"
        },
        {
            "type": "body",
            "text": "Hi {{customer_name}},\n\nYour order #{{order_number}} has been confirmed!\n\n📦 Items: {{item_count}} items\n💰 Total: Rs {{total_amount}}\n\nWe'll notify you once your order is dispatched.\n\nThank you for shopping with Ashmiaa!",
            "example": {
                "body_text": [
                    ["Ali", "1234", "3", "4500"]
                ]
            }
        },
        {
            "type": "footer",
            "text": "Ashmiaa - Your Style, Our Passion"
        },
        {
            "type": "buttons",
            "buttons": [
                {
                    "type": "url",
                    "text": "Track Order",
                    "url": "https://ashmiaa.myshopify.com/orders"
                },
                {
                    "type": "phone_number",
                    "text": "Call Support",
                    "phone_number": "+923001234567"
                }
            ]
        }
    ]
}

SHIPPING_UPDATE_TEMPLATE = {
    "name": "shipping_update_ashmiaa",
    "category": "UTILITY",
    "language": "en_US",
    "components": [
        {
            "type": "header",
            "format": "text",
            "text": "Your Order is On The Way! 🚚"
        },
        {
            "type": "body",
            "text": "Hi {{customer_name}},\n\nGreat news! Your order #{{order_number}} has been dispatched.\n\n📍 Tracking Number: {{tracking_number}}\n🚚 Courier: TCS Pakistan\n📅 Expected Delivery: {{delivery_date}}\n\nYou can track your shipment using the tracking number above.",
            "example": {
                "body_text": [
                    ["Ali", "1234", "TCS12345678", "Dec 28, 2025"]
                ]
            }
        },
        {
            "type": "footer",
            "text": "Ashmiaa - Fast & Reliable Delivery"
        },
        {
            "type": "buttons",
            "buttons": [
                {
                    "type": "url",
                    "text": "Track Shipment",
                    "url": "https://www.tcsexpress.com/track"
                }
            ]
        }
    ]
}

DELIVERY_CONFIRMATION_TEMPLATE = {
    "name": "delivery_confirmation_ashmiaa",
    "category": "UTILITY",
    "language": "en_US",
    "components": [
        {
            "type": "header",
            "format": "text",
            "text": "Order Delivered! ✅"
        },
        {
            "type": "body",
            "text": "Hi {{customer_name}},\n\nYour order #{{order_number}} has been successfully delivered!\n\nWe hope you love your purchase. If you have any issues, please don't hesitate to contact us.\n\nThank you for choosing Ashmiaa! 💚",
            "example": {
                "body_text": [
                    ["Ali", "1234"]
                ]
            }
        },
        {
            "type": "footer",
            "text": "Rate your experience"
        },
        {
            "type": "buttons",
            "buttons": [
                {
                    "type": "quick_reply",
                    "text": "😊 Great"
                },
                {
                    "type": "quick_reply",
                    "text": "🆗 Good"
                },
                {
                    "type": "quick_reply",
                    "text": "Need Help"
                }
            ]
        }
    ]
}

# ============= MARKETING TEMPLATES =============

FLASH_SALE_TEMPLATE = {
    "name": "flash_sale_alert_ashmiaa",
    "category": "MARKETING",
    "language": "en_US",
    "components": [
        {
            "type": "header",
            "format": "text",
            "text": "🔥 FLASH SALE ALERT!"
        },
        {
            "type": "body",
            "text": "Hi {{customer_name}}!\n\n{{discount}}% OFF on {{category}}! 🎉\n\n⏰ Limited Time: {{duration}}\n💰 Save Big on Your Favorite Styles!\n\nDon't miss out on this exclusive deal!",
            "example": {
                "body_text": [
                    ["Ali", "30", "Shoes", "24 Hours"]
                ]
            }
        },
        {
            "type": "footer",
            "text": "Shop now before it's gone!"
        },
        {
            "type": "buttons",
            "buttons": [
                {
                    "type": "url",
                    "text": "Shop Now",
                    "url": "https://ashmiaa.myshopify.com"
                }
            ]
        }
    ]
}

ABANDONED_CART_TEMPLATE = {
    "name": "abandoned_cart_reminder_ashmiaa",
    "category": "MARKETING",
    "language": "en_US",
    "components": [
        {
            "type": "header",
            "format": "text",
            "text": "You Left Something Behind! 🛒"
        },
        {
            "type": "body",
            "text": "Hi {{customer_name}},\n\nYou have items waiting in your cart!\n\n🛍️ Items: {{item_count}}\n💰 Total: Rs {{cart_value}}\n\n⏰ Complete your purchase now and get FREE SHIPPING!\n\nYour items are selling fast. Don't miss out!",
            "example": {
                "body_text": [
                    ["Ali", "3", "3500"]
                ]
            }
        },
        {
            "type": "footer",
            "text": "Offer valid for 24 hours"
        },
        {
            "type": "buttons",
            "buttons": [
                {
                    "type": "url",
                    "text": "Complete Purchase",
                    "url": "https://ashmiaa.myshopify.com/cart"
                }
            ]
        }
    ]
}

NEW_ARRIVAL_TEMPLATE = {
    "name": "new_arrival_announcement_ashmiaa",
    "category": "MARKETING",
    "language": "en_US",
    "components": [
        {
            "type": "header",
            "format": "text",
            "text": "✨ NEW ARRIVALS!"
        },
        {
            "type": "body",
            "text": "Hi {{customer_name}}!\n\nCheck out our latest collection of {{category}}!\n\n🆕 Fresh Styles Just Arrived\n💫 Trending Designs\n🎁 Special Launch Offer: {{discount}}% OFF\n\nBe the first to grab these exclusive pieces!",
            "example": {
                "body_text": [
                    ["Ali", "Sneakers", "20"]
                ]
            }
        },
        {
            "type": "footer",
            "text": "Limited stock available"
        },
        {
            "type": "buttons",
            "buttons": [
                {
                    "type": "url",
                    "text": "View Collection",
                    "url": "https://ashmiaa.myshopify.com/collections/new"
                }
            ]
        }
    ]
}

VIP_EXCLUSIVE_TEMPLATE = {
    "name": "vip_exclusive_offer_ashmiaa",
    "category": "MARKETING",
    "language": "en_US",
    "components": [
        {
            "type": "header",
            "format": "text",
            "text": "👑 VIP EXCLUSIVE OFFER"
        },
        {
            "type": "body",
            "text": "Hi {{customer_name}}!\n\nAs our valued VIP customer, you get EXCLUSIVE early access to our sale!\n\n💎 {{discount}}% OFF Sitewide\n🎁 FREE Shipping\n⭐ Early Access: {{hours}} Hours Before Public\n\nThis is just for you. Shop before everyone else!",
            "example": {
                "body_text": [
                    ["Ali", "35", "48"]
                ]
            }
        },
        {
            "type": "footer",
            "text": "VIP Perks - Because You're Special"
        },
        {
            "type": "buttons",
            "buttons": [
                {
                    "type": "url",
                    "text": "Shop VIP Sale",
                    "url": "https://ashmiaa.myshopify.com/vip"
                }
            ]
        }
    ]
}

# ============= ALL TEMPLATES LIST =============

ALL_SAMPLE_TEMPLATES = [
    ORDER_CONFIRMATION_TEMPLATE,
    SHIPPING_UPDATE_TEMPLATE,
    DELIVERY_CONFIRMATION_TEMPLATE,
    FLASH_SALE_TEMPLATE,
    ABANDONED_CART_TEMPLATE,
    NEW_ARRIVAL_TEMPLATE,
    VIP_EXCLUSIVE_TEMPLATE
]

# ============= Helper Function =============

def get_template_by_name(name: str):
    """Get a specific template by name"""
    for template in ALL_SAMPLE_TEMPLATES:
        if template["name"] == name:
            return template
    return None


def get_utility_templates():
    """Get all utility templates"""
    return [t for t in ALL_SAMPLE_TEMPLATES if t["category"] == "UTILITY"]


def get_marketing_templates():
    """Get all marketing templates"""
    return [t for t in ALL_SAMPLE_TEMPLATES if t["category"] == "MARKETING"]
