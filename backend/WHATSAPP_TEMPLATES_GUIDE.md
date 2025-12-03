# WhatsApp Message Templates Guide

## Overview
Message templates must be pre-approved by Meta before they can be sent. This guide explains how to create and use templates.

## How to Create Templates

### Step 1: Go to Meta Business Manager
1. Visit: https://business.facebook.com/wa/manage/message-templates/
2. Or navigate from your WhatsApp Business Account dashboard
3. Click "Create Template"

### Step 2: Fill Template Details

**Template Information:**
- **Name**: Use lowercase, underscores only (e.g., `order_confirmation`)
- **Category**: Choose appropriate category
  - `UTILITY`: Order updates, delivery status
  - `MARKETING`: Promotions, announcements
  - `AUTHENTICATION`: OTP, verification codes
- **Languages**: Select languages (e.g., English, Urdu)

### Step 3: Design Template Message

**Components:**
1. **Header** (Optional)
   - Text, Image, Video, or Document
   - Can include 1 variable: {{1}}

2. **Body** (Required)
   - Main message content
   - Variables: {{1}}, {{2}}, {{3}}, etc.
   - Keep it clear and concise

3. **Footer** (Optional)
   - Small text at bottom
   - No variables allowed

4. **Buttons** (Optional)
   - Call to Action (URL, Phone)
   - Quick Reply buttons

---

## Recommended Templates for Your Business

### 1. Order Confirmation Template

**Name**: `order_confirmation`
**Category**: UTILITY
**Language**: English

**Body**:
```
Hello {{1}},

Thank you for your order! 🎉

Order Number: #{{2}}
Order Date: {{3}}
Total Amount: Rs. {{4}}

We'll notify you once your order is dispatched.

Thank you for shopping with TNV Collection!
```

**Variables**:
1. Customer Name
2. Order Number
3. Order Date
4. Total Amount

**Usage in Code**:
```python
components = [{
    "type": "body",
    "parameters": [
        {"type": "text", "text": "Ahmed"},
        {"type": "text", "text": "29421"},
        {"type": "text", "text": "Nov 10, 2025"},
        {"type": "text", "text": "6,999"}
    ]
}]
```

---

### 2. Order Dispatched Template

**Name**: `order_dispatched`
**Category**: UTILITY
**Language**: English

**Body**:
```
Hi {{1}},

Great news! Your order #{{2}} has been dispatched! 📦

Tracking Number: {{3}}
Courier: TCS Express
Expected Delivery: {{4}}

Track your order: https://tracking.tcs.com.pk/{{3}}

TNV Collection
```

**Variables**:
1. Customer Name
2. Order Number
3. Tracking Number
4. Expected Delivery Date

---

### 3. Delivery Update Template

**Name**: `delivery_update`
**Category**: UTILITY
**Language**: English

**Body**:
```
Hello {{1}},

Your order #{{2}} update:

Status: {{3}}
Location: {{4}}
Updated: {{5}}

Tracking: {{6}}

Questions? Reply to this message!

TNV Collection
```

**Variables**:
1. Customer Name
2. Order Number
3. Delivery Status
4. Current Location
5. Last Update Time
6. Tracking Number

---

### 4. Payment Reminder Template

**Name**: `payment_reminder`
**Category**: UTILITY
**Language**: English

**Body**:
```
Hello {{1}},

Reminder: COD payment for order #{{2}}

Amount to Pay: Rs. {{3}}
Delivery Charges: Rs. {{4}}
Total: Rs. {{5}}

Please keep the exact amount ready for our delivery person.

TNV Collection
```

**Variables**:
1. Customer Name
2. Order Number
3. COD Amount
4. Delivery Charges
5. Total Amount

---

### 5. Delivered Confirmation Template

**Name**: `order_delivered`
**Category**: UTILITY
**Language**: English

**Body**:
```
Hi {{1}},

Your order #{{2}} has been delivered! ✅

Delivered on: {{3}}
Payment: {{4}}

Thank you for choosing TNV Collection!

We'd love to hear your feedback. How was your experience?
```

**Variables**:
1. Customer Name
2. Order Number
3. Delivery Date
4. Payment Status

---

## Template Approval Process

### Timeline
- **Utility Templates**: Usually approved within 15 minutes to 24 hours
- **Marketing Templates**: May take 1-3 business days
- **Rejected**: You'll receive feedback and can resubmit

### Common Rejection Reasons
1. ❌ Unclear message purpose
2. ❌ Marketing content in utility category
3. ❌ Spelling or grammar errors
4. ❌ Misleading information
5. ❌ Policy violations

### Tips for Approval
- ✅ Be clear and concise
- ✅ Use proper grammar
- ✅ Avoid promotional language in utility templates
- ✅ Include business name
- ✅ Provide opt-out information for marketing

---

## Using Templates in Code

### Method 1: Python (Backend)

```python
from whatsapp_service import whatsapp_service

# Send order confirmation
await whatsapp_service.send_template_message(
    to="923001234567",
    template_name="order_confirmation",
    language_code="en",
    components=[{
        "type": "body",
        "parameters": [
            {"type": "text", "text": "Ahmed Ali"},
            {"type": "text", "text": "29421"},
            {"type": "text", "text": "Nov 10, 2025"},
            {"type": "text", "text": "6,999"}
        ]
    }]
)
```

### Method 2: API Call

```bash
curl -X POST http://localhost:8001/api/whatsapp/send-template \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "923001234567",
    "template_name": "order_confirmation",
    "language": "en",
    "variables": ["Ahmed Ali", "29421", "Nov 10, 2025", "6999"]
  }'
```

---

## Testing Templates

### Test Before Approval
- Meta provides a test number to preview templates
- Use Facebook Business Suite to send test messages
- Verify all variables render correctly

### After Approval
1. Send to your own WhatsApp number first
2. Verify formatting and variables
3. Check on both mobile and web
4. Test with different variable lengths

---

## Template Best Practices

### DO:
- ✅ Keep messages under 1024 characters
- ✅ Use clear, professional language
- ✅ Include business name
- ✅ Provide value to customers
- ✅ Test thoroughly before using

### DON'T:
- ❌ Use all caps or excessive punctuation
- ❌ Include promotional content in utility templates
- ❌ Use too many emojis
- ❌ Add unsubscribe links (Meta handles this)
- ❌ Include sensitive information

---

## Template Limits

### Sending Limits
- **Tier 1 (New)**: 1,000 conversations/24 hours
- **Tier 2**: 10,000 conversations/24 hours
- **Tier 3**: 100,000 conversations/24 hours
- **Tier 4**: Unlimited

### Quality Rating
- Maintain high quality to avoid restrictions
- Monitor message delivery rate
- Respond to customer inquiries promptly

---

## Monitoring Template Performance

### Metrics to Track
1. **Delivery Rate**: % of messages delivered
2. **Read Rate**: % of messages opened
3. **Response Rate**: % of customers replying
4. **Block Rate**: % of customers blocking you

### Meta Business Manager Dashboard
- View template analytics
- Track sending volume
- Monitor quality rating
- Check for violations

---

## Support

For issues with templates:
1. Check Meta Business Help Center
2. Review WhatsApp Business Policy
3. Contact Meta support through Business Manager
4. Test with WhatsApp Business API sandbox

---

## Quick Links

- Create Templates: https://business.facebook.com/wa/manage/message-templates/
- WhatsApp Business Policy: https://www.whatsapp.com/legal/business-policy/
- API Documentation: https://developers.facebook.com/docs/whatsapp/
- Business Help Center: https://www.facebook.com/business/help/
