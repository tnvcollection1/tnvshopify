# 📱 WhatsApp CRM - Complete User Guide

## Table of Contents
1. [Templates System](#a-templates-system)
2. [Campaign System](#b-campaign-system)
3. [Conversation Inbox](#c-conversation-inbox)
4. [Analytics Dashboard](#d-analytics-dashboard)
5. [Automation Setup](#e-automation-setup)
6. [Webhook Configuration](#f-webhook-configuration)

---

## A. 📋 Templates System

### What are WhatsApp Templates?

WhatsApp templates are **pre-approved message formats** that you can send to customers. Meta (Facebook) requires all business-initiated messages to use approved templates.

### Your Current Templates (8 Total):

#### ✅ APPROVED Templates (1):
1. **hello_world** - Meta's default test template
   - Status: APPROVED ✅
   - Use: Testing only
   - You can use this RIGHT NOW

#### 📝 DRAFT Templates (7) - Need Meta Approval:

**UTILITY Templates (Transactional):**
1. **order_confirmation_ashmiaa**
   - Sent when: Customer places an order
   - Contains: Order number, items, total amount
   - Example: "Hi Ali, Your order #1234 has been confirmed!"

2. **shipping_update_ashmiaa**
   - Sent when: Order is dispatched
   - Contains: Tracking number, courier, delivery date
   - Example: "Your order is on the way! Tracking: TCS12345678"

3. **delivery_confirmation_ashmiaa**
   - Sent when: Order is delivered
   - Contains: Order number, delivery confirmation
   - Example: "Your order #1234 has been delivered!"

**MARKETING Templates (Promotional):**
4. **flash_sale_alert_ashmiaa**
   - Use: Announce flash sales
   - Contains: Discount percentage, category, duration
   - Example: "30% OFF on Shoes! Limited Time: 24 Hours"

5. **abandoned_cart_reminder_ashmiaa**
   - Use: Recover abandoned carts
   - Contains: Cart items, value, free shipping offer
   - Example: "You left items in your cart! Complete your purchase"

6. **new_arrival_announcement_ashmiaa**
   - Use: Announce new products
   - Contains: Product category, discount
   - Example: "Check out our latest collection of Sneakers!"

7. **vip_exclusive_offer_ashmiaa**
   - Use: VIP customer exclusive deals
   - Contains: Special discount, early access
   - Example: "As our VIP customer, get 35% OFF + Early Access!"

---

### How to Get Templates Approved by Meta:

**Step 1: Go to Meta Business Manager**
- Visit: https://business.facebook.com
- Navigate to: WhatsApp Manager → Message Templates

**Step 2: Create Template**
Click "Create Template" and fill in:

**Example for Order Confirmation:**
```
Template Name: order_confirmation_ashmiaa
Category: UTILITY
Language: English (US)

Header (Text): Order Confirmed! 🎉

Body:
Hi {{1}},

Your order #{{2}} has been confirmed!

📦 Items: {{3}} items
💰 Total: Rs {{4}}

We'll notify you once your order is dispatched.

Thank you for shopping with Ashmiaa!

Footer: Ashmiaa - Your Style, Our Passion

Buttons:
- URL Button: "Track Order" → https://ashmiaa.myshopify.com/orders
- Phone Button: "Call Support" → +923001234567
```

**Step 3: Submit for Approval**
- Review your template
- Click "Submit"
- Approval takes 24-48 hours

**Step 4: Sync in Your App**
- Once approved, go to `/whatsapp-templates` in your app
- Click "Sync from Meta" button
- Template status will change from DRAFT → APPROVED

---

### Template Best Practices:

✅ **DO:**
- Use clear, concise language
- Include order/tracking numbers as variables
- Add helpful buttons (Track Order, Call Support)
- Test templates thoroughly

❌ **DON'T:**
- Use promotional language in UTILITY templates
- Include pricing in UTILITY templates (unless transactional)
- Use ALL CAPS or excessive emojis
- Include external links in body text

---

## B. 📢 Campaign System

### What is a Campaign?

A campaign lets you send bulk WhatsApp messages to multiple customers at once based on customer segments.

### Customer Segments Available:

1. **VIP** - Customers with 5+ orders AND Rs 10,000+ spent
2. **HIGH_VALUE** - Customers with Rs 5,000+ spent
3. **MEDIUM_VALUE** - Customers with Rs 1,000-5,000 spent
4. **NEW** - Customers with 0-1 orders
5. **DORMANT** - Customers with no order in last 90 days
6. **ALL** - All customers with phone numbers

### How to Create Your First Campaign:

**Step 1: Get Template Approved**
- You need at least 1 APPROVED template
- Currently only "hello_world" is approved
- Get your marketing templates approved first

**Step 2: Navigate to Campaigns**
- Go to: `/whatsapp-campaigns`
- Click "Create Campaign" button

**Step 3: Fill Campaign Details**
```
Campaign Name: Flash Sale - Winter Collection
Template: flash_sale_alert_ashmiaa (must be APPROVED)
Target Segment: VIP
Store: ashmiaa
```

**Step 4: Click "Create & Send"**
- Campaign starts sending immediately
- Messages sent in background
- Track progress in real-time

### Campaign Metrics:

Once sent, you'll see:
- **Total Recipients**: How many customers in segment
- **Sent**: Successfully sent messages
- **Delivered**: Messages delivered to phones
- **Read**: Messages opened by customers
- **Failed**: Failed deliveries
- **Success Rate**: Percentage of successful deliveries

### Campaign Example:

**Scenario**: You want to offer VIP customers early access to a sale

1. **Create VIP Exclusive Template** (get it approved first)
2. **Go to Campaigns** → Create New
3. **Select**:
   - Segment: VIP
   - Template: vip_exclusive_offer_ashmiaa
4. **Send**: Campaign sends to all VIP customers
5. **Track**: See real-time delivery and read rates

---

## C. 📱 Conversation Inbox

### What is the Inbox?

The Inbox is your WhatsApp CRM interface where you can:
- View all customer conversations
- Reply to customer messages
- See customer order history
- Manage conversation status

### How to Use the Inbox:

**Step 1: Access Inbox**
- Navigate to: `/whatsapp-inbox`
- You'll see 3 panels:
  1. **Left**: List of conversations
  2. **Middle**: Chat messages
  3. **Right**: Customer information

**Step 2: View Conversations**
- Conversations appear when customers message you
- Shows: Customer name, phone, last message, timestamp
- Filters: All, Open, Resolved

**Step 3: Reply to Customer**
- Click on a conversation
- View full message history
- Type reply in text box
- Click Send (or press Enter)

**Step 4: View Customer Info**
- Right panel shows:
  - Customer name and contact
  - Order count
  - Total spent
  - Last order date
  - Latest order number

### Important Notes:

⚠️ **24-Hour Window Rule:**
- You can only send FREE TEXT messages within 24 hours of customer's last message
- After 24 hours, you must use a template message
- This is Meta's policy

✅ **Template Messages:**
- Can be sent anytime
- No 24-hour restriction
- But must be pre-approved

---

## D. 📊 Analytics Dashboard

### What Does Analytics Show?

Track your WhatsApp messaging performance and campaign success.

### Navigate to Analytics:
- Go to: `/whatsapp-analytics`
- Select time period: 7, 30, or 90 days

### Metrics You'll See:

**1. Message Statistics:**
- **Total Messages**: All messages sent/received
- **Sent**: Outbound messages
- **Received**: Inbound messages from customers
- **Failed**: Messages that failed to deliver
- **Success Rate**: Percentage of successful deliveries

**2. Campaign Performance:**
- **Total Campaigns**: All campaigns created
- **Active**: Currently sending campaigns
- **Completed**: Finished campaigns

**3. Conversations:**
- **Total Conversations**: All customer conversations
- **Open**: Conversations needing response

**4. Key Insights:**
- Automated recommendations
- Performance highlights
- Action items

### Current Stats (as of now):
- Total Messages: 2
- Sent: 2
- Failed: 0
- Success Rate: 100% ✅

---

## E. 🤖 Automation Setup

### What Gets Automated?

Your system will automatically send WhatsApp messages when certain events happen.

### Available Automations:

#### 1. Order Confirmation (Auto-triggered)
**When**: Customer places an order
**Template**: order_confirmation_ashmiaa
**Contains**:
- Customer name
- Order number
- Item count
- Total amount

**How it works**:
- Order created in system
- System detects new order
- Automatically sends WhatsApp confirmation
- Customer receives instant notification

#### 2. Shipping Update (Auto-triggered)
**When**: Order is dispatched / Tracking number added
**Template**: shipping_update_ashmiaa
**Contains**:
- Customer name
- Order number
- Tracking number
- Expected delivery date

#### 3. Delivery Confirmation (Auto-triggered)
**When**: Delivery status changes to "DELIVERED"
**Template**: delivery_confirmation_ashmiaa
**Contains**:
- Customer name
- Order number
- Delivery confirmation
- Feedback request

#### 4. Abandoned Cart Recovery (Auto-triggered after 24 hours)
**When**: Customer abandons checkout
**Template**: abandoned_cart_reminder_ashmiaa
**Contains**:
- Customer name
- Item count in cart
- Cart value
- Free shipping offer

### How to Enable Automation:

**Step 1: Get Templates Approved**
All automation templates must be APPROVED by Meta first.

**Step 2: Test Automation**
Once templates are approved:
1. Place a test order
2. System automatically sends order confirmation
3. Add tracking number
4. System automatically sends shipping update
5. Mark as delivered
6. System automatically sends delivery confirmation

**Step 3: Monitor Automation**
- Check Analytics to see automated messages
- View logs in whatsapp_messages collection
- Track success rates

### Automation Flow Example:

```
Customer Orders → Order Confirmation WhatsApp ✅
      ↓
Order Dispatched → Shipping Update WhatsApp ✅
      ↓
Order Delivered → Delivery Confirmation WhatsApp ✅
```

---

## F. 🔗 Webhook Configuration

### What is a Webhook?

A webhook allows your system to RECEIVE messages from customers. Without webhook, you can only SEND messages.

### Why You Need It:

- Customer replies to your messages
- Two-way conversations
- Real-time message syncing
- Conversation inbox functionality

### How to Set Up Webhook:

**Step 1: Get Your Production URL**
- Example: `https://your-domain.com`
- Must be HTTPS (secure)
- Must be publicly accessible

**Step 2: Configure in Meta Business Manager**

1. Go to: WhatsApp Manager → Configuration
2. Click "Edit" on Webhook section
3. Enter details:

```
Callback URL: https://your-domain.com/api/whatsapp/webhook
Verify Token: tnv_whatsapp_webhook_2024
```

4. Click "Verify and Save"

**Step 3: Subscribe to Events**
Check these boxes:
- ✅ messages
- ✅ message_status
- ✅ message_template_status_update

**Step 4: Test Webhook**
1. Send a WhatsApp message to your business number
2. Meta sends webhook to your server
3. Message appears in your Inbox
4. You can reply from the app

### Webhook Endpoint Details:

**Your webhook endpoints:**
- **POST** `/api/whatsapp/webhook` - Receives messages
- **GET** `/api/whatsapp/webhook` - Verification endpoint

**What happens when customer messages you:**
```
Customer sends WhatsApp → Meta receives → 
Sends to your webhook → Saved in database → 
Appears in Inbox → You can reply
```

### Testing Webhook Locally (Development):

For local testing, you can use ngrok:
```bash
ngrok http 8001
# Use the ngrok URL as webhook URL
```

---

## 🎯 Quick Start Checklist

### Immediate Actions (Can do NOW):

- [x] Send test messages using "hello_world" template
- [x] View all 7 sample templates
- [x] Check analytics dashboard
- [x] Explore campaigns interface
- [x] View inbox interface

### Next 24-48 Hours:

- [ ] Submit 7 templates to Meta for approval
- [ ] Wait for approval (24-48 hours)
- [ ] Sync approved templates in app
- [ ] Configure webhook for incoming messages

### After Templates Approved:

- [ ] Create first marketing campaign
- [ ] Test automation with a real order
- [ ] Enable abandoned cart recovery
- [ ] Monitor analytics and performance

### Production Launch:

- [ ] Get permanent access token (current is temporary)
- [ ] Add payment method in Meta
- [ ] Verify business phone number
- [ ] Train team on using CRM
- [ ] Set up monitoring alerts

---

## 🆘 Common Questions & Troubleshooting

### Q: Why can't I send to all my customers?
**A:** Templates must be APPROVED by Meta first. Only "hello_world" is approved now.

### Q: How long does template approval take?
**A:** Usually 24-48 hours. Utility templates are approved faster than marketing templates.

### Q: Can I send free-form text messages?
**A:** Only within 24 hours of customer's last message. Otherwise, use templates.

### Q: Why isn't webhook working?
**A:** Make sure:
1. URL is HTTPS and publicly accessible
2. Verify token matches exactly
3. Endpoint is responding with 200 status
4. Events are subscribed

### Q: How do I know if message was delivered?
**A:** Check:
1. Analytics dashboard (success rate)
2. Message status in whatsapp_messages collection
3. Meta's delivery receipts

### Q: Can I schedule campaigns?
**A:** Currently campaigns send immediately. Scheduling feature can be added.

### Q: What's the cost of sending messages?
**A:** 
- Template messages: Charged by Meta (varies by country)
- Text replies (within 24hr): FREE
- First 1000 conversations/month: Usually free tier

---

## 📞 Support & Resources

**Meta WhatsApp Business API Docs:**
https://developers.facebook.com/docs/whatsapp/

**WhatsApp Business Manager:**
https://business.facebook.com/

**Template Guidelines:**
https://developers.facebook.com/docs/whatsapp/message-templates/guidelines

**Your Webhook URL:**
`https://your-domain.com/api/whatsapp/webhook`

**Verify Token:**
`tnv_whatsapp_webhook_2024`

---

## 🎉 You're All Set!

Your WhatsApp CRM is fully configured and ready to use. Start by getting your templates approved, then you can:
- Send automated order confirmations
- Create marketing campaigns
- Reply to customer messages
- Track all performance metrics

**Next Step:** Go to Meta Business Manager and submit your templates for approval!
