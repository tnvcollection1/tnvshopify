# 📱 Meta WhatsApp Business API - Complete Setup Guide

## Overview
This guide walks you through all 6 steps to set up WhatsApp Business API from Meta's dashboard.

---

## ✅ Step 1 & 2: Already Completed!

**What You Have:**
- ✅ WhatsApp Business Account: 1376020484247139
- ✅ Phone Number ID: 944861988701391
- ✅ Test Number: +1 555 602 8470
- ✅ Access Token: Configured (needs refresh)
- ✅ Successfully sent test messages

**Status:** ✅ COMPLETE

---

## 🔗 Step 3: Configure Webhooks (DO THIS NOW!)

### What is a Webhook?
A webhook allows Meta to send incoming messages to your server. Without it, you can only SEND messages, not RECEIVE them.

### Your Webhook Details:
```
Webhook URL: https://asmia.in/api/whatsapp/webhook
Verify Token: tnv_whatsapp_webhook_2024
```

### How to Configure:

#### Option 1: If asmia.in is Already Deployed

**Step 3.1:** Go to Meta Business Manager
1. Visit: https://business.facebook.com
2. Navigate to: **WhatsApp** → **API Setup** or **Configuration**
3. Find **Step 3: Configure webhooks** section
4. Click **Edit** or **Configure Webhooks**

**Step 3.2:** Enter Webhook Details
```
Callback URL: https://asmia.in/api/whatsapp/webhook
Verify token: tnv_whatsapp_webhook_2024
```

**Step 3.3:** Click "Verify and Save"
- Meta will send a GET request to verify your webhook
- Your backend will automatically respond
- If verification succeeds, webhook is configured!

**Step 3.4:** Subscribe to Webhook Fields
Check these boxes:
- ☑️ messages
- ☑️ message_status
- ☑️ message_template_status_update

**Step 3.5:** Save Configuration

**What Happens After:**
- Customer sends WhatsApp → Your webhook receives it
- Message appears in your Inbox (/whatsapp-inbox)
- You can reply from the app
- Full 2-way conversations enabled!

#### Option 2: If NOT Yet Deployed (Use ngrok for Testing)

If asmia.in is not yet deployed, you can test locally using ngrok:

**Install ngrok:**
```bash
# Download ngrok
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar xvzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/

# Start ngrok
ngrok http 8001
```

**Use ngrok URL as webhook:**
```
Callback URL: https://abc123.ngrok.io/api/whatsapp/webhook
Verify token: tnv_whatsapp_webhook_2024
```

**Note:** ngrok URL changes each time. For production, use your real domain.

---

## 📚 Step 4: Learn About the API and Build Your App

### Status: ✅ ALREADY BUILT!

**What You Have Built:**

#### Backend APIs (15+ endpoints):
✅ WhatsApp Messaging APIs
- POST /api/whatsapp/send-template
- POST /api/whatsapp/send-text
- POST /api/whatsapp/webhook (receives messages)

✅ WhatsApp CRM APIs
- GET /api/whatsapp/conversations
- POST /api/whatsapp/conversations/reply
- GET /api/whatsapp/templates
- POST /api/whatsapp/templates/create

✅ Campaign APIs
- POST /api/whatsapp/campaigns/create
- GET /api/whatsapp/campaigns
- GET /api/whatsapp/campaigns/{id}

✅ Analytics APIs
- GET /api/whatsapp/analytics/overview

✅ Tracking APIs
- GET /api/tracking/:identifier
- GET /api/tracking/order/:order
- GET /api/tracking/dtdc/:tracking

#### Frontend Pages:
✅ WhatsApp Inbox (/whatsapp-inbox)
✅ Template Manager (/whatsapp-templates)
✅ Campaign Manager (/whatsapp-campaigns)
✅ Analytics Dashboard (/whatsapp-analytics)
✅ Tracking Page (/tracking/:id)

#### Integrations:
✅ Meta WhatsApp Business API
✅ DTDC Tracking Integration
✅ Customer Segmentation
✅ Order Management System

**You don't need to learn or build - everything is already built and tested!**

---

## 📞 Step 5: Add a Phone Number

### What This Means:
Currently, you're using Meta's **test number** (+1 555 602 8470). To send messages at scale, you need to verify your own business phone number.

### Current Situation:
- ✅ Test Number: +1 555 602 8470 (works for 90 days)
- ⏳ Your Business Number: Need to add and verify

### How to Add Your Phone Number:

**Step 5.1:** Go to WhatsApp Manager
1. Visit: https://business.facebook.com
2. Navigate to: **WhatsApp Manager** → **Phone Numbers**
3. Click **Add Phone Number**

**Step 5.2:** Choose Phone Number Type
- **Option A:** Use existing business number
- **Option B:** Get new number from Meta
- **Option C:** Use WhatsApp-verified number

**Step 5.3:** Verification Process
1. Enter your business phone number
2. Choose verification method (SMS or Call)
3. Enter verification code
4. Confirm phone number

**Step 5.4:** Display Name
- Set your business display name
- This is what customers see
- Example: "Ashmiaa Fashion Store"

**Step 5.5:** Complete Verification
- Submit business documents (if required)
- Wait for Meta approval (usually instant)
- Phone number becomes active

### Benefits of Verified Number:
✅ Unlimited messaging (no 90-day limit)
✅ Customer sees your real business number
✅ Better trust and credibility
✅ Access to business features
✅ WhatsApp Business Profile

### Test Number vs. Verified Number:

**Test Number (+1 555 602 8470):**
- ✅ Free for 90 days
- ✅ Good for development/testing
- ❌ Limited to test conversations
- ❌ Can't use for production
- ❌ Expires after 90 days

**Your Business Number:**
- ✅ Permanent access
- ✅ Production-ready
- ✅ Unlimited conversations
- ✅ Customer trust
- 💰 Requires payment method (see Step 6)

**Recommendation:** Keep using test number for now while you complete setup and testing. Add your business number when ready to go live.

---

## 💳 Step 6: Add Payment Method

### What This Means:
WhatsApp Business API charges for certain types of messages. You need a payment method to send business-initiated messages at scale.

### Pricing Overview:

#### Free Messages:
✅ **Customer-Initiated Conversations:**
- Customer messages you first
- You can reply FREE within 24 hours
- Unlimited free replies in 24hr window

#### Paid Messages:
💰 **Business-Initiated Messages:**
- You message customer first
- Uses templates (must be approved)
- Charged per message (varies by country)

💰 **Messages After 24 Hours:**
- Customer messaged you >24 hours ago
- Must use template messages
- Charged per message

### Pricing for India (Approximate):
- Utility Messages: ~₹0.40 per message
- Marketing Messages: ~₹1.00 per message
- Authentication Messages: ~₹0.20 per message

**First 1000 conversations/month:** Usually FREE

### How to Add Payment Method:

**Step 6.1:** Go to Business Settings
1. Visit: https://business.facebook.com
2. Navigate to: **Business Settings** → **Payments**
3. Click **Payment Methods**

**Step 6.2:** Add Payment Method
Choose one:
- **Credit/Debit Card:** Visa, Mastercard, Amex
- **PayPal:** Link PayPal account
- **Bank Account:** Direct bank transfer (select regions)

**Step 6.3:** Enter Details
- Card number
- Expiry date
- CVV
- Billing address

**Step 6.4:** Set Spending Limit (Optional)
- Set daily/monthly spending limits
- Prevents unexpected charges
- Recommended: Start with ₹1000-5000/month

**Step 6.5:** Verify and Save
- Meta may charge ₹1-2 for verification
- Amount refunded after verification

### When You'll Be Charged:

**Scenario 1: You Send First Message**
```
You: "Flash Sale! 30% OFF" (uses template)
→ CHARGED (marketing message)

Customer: "Show me products"
→ FREE (customer initiated)

You: "Here are the products..."
→ FREE (replying within 24hr)
```

**Scenario 2: Customer Messages First**
```
Customer: "Where is my order?"
→ FREE (customer initiated)

You: "Order is dispatched"
→ FREE (replying within 24hr)

(25 hours later)
You: "Your order was delivered"
→ CHARGED (after 24hr window, needs template)
```

**Scenario 3: Automated Messages**
```
Order placed → Auto WhatsApp confirmation
→ CHARGED (business-initiated, utility message ~₹0.40)

Order dispatched → Auto tracking update
→ CHARGED (business-initiated, utility message ~₹0.40)

Abandoned cart (24hr) → Recovery message
→ CHARGED (business-initiated, marketing message ~₹1.00)
```

### Cost Management Tips:

**1. Maximize Free Messages:**
- Encourage customers to message you first
- Reply within 24 hours = FREE
- Use customer service number actively

**2. Use Utility Templates:**
- Cheaper than marketing templates
- Order confirmations, shipping updates
- ~₹0.40 vs ₹1.00

**3. Batch Marketing Messages:**
- Send campaigns to engaged customers only
- Use customer segments wisely
- Avoid spam = better ROI

**4. Monitor Spending:**
- Check Business Manager → Payments
- Set up spending alerts
- Review monthly reports

**5. Free Tier First:**
- First 1000 conversations usually FREE
- Test thoroughly before scaling
- Optimize message templates

### Estimated Monthly Costs:

**Small Scale (100 orders/month):**
- Order confirmations: 100 × ₹0.40 = ₹40
- Shipping updates: 100 × ₹0.40 = ₹40
- Delivery confirmations: 100 × ₹0.40 = ₹40
- Marketing campaigns: 50 × ₹1.00 = ₹50
- **Total: ~₹170/month**

**Medium Scale (500 orders/month):**
- Order confirmations: 500 × ₹0.40 = ₹200
- Shipping updates: 500 × ₹0.40 = ₹200
- Delivery confirmations: 500 × ₹0.40 = ₹200
- Marketing campaigns: 200 × ₹1.00 = ₹200
- **Total: ~₹800/month**

**Large Scale (2000 orders/month):**
- Order confirmations: 2000 × ₹0.40 = ₹800
- Shipping updates: 2000 × ₹0.40 = ₹800
- Delivery confirmations: 2000 × ₹0.40 = ₹800
- Marketing campaigns: 1000 × ₹1.00 = ₹1000
- **Total: ~₹3400/month**

**Note:** These are estimates. Actual costs vary by region and message type.

---

## 📋 Complete Setup Checklist

### Immediate (Can Do Now):
- [ ] **Step 3:** Configure webhook (if asmia.in is deployed)
- [ ] **Step 3 (Alt):** Use ngrok for local testing
- [ ] Test webhook by sending message
- [ ] Verify messages appear in /whatsapp-inbox

### Short-term (This Week):
- [ ] **Step 5:** Add and verify business phone number
- [ ] **Step 6:** Add payment method
- [ ] Set spending limits
- [ ] Get remaining templates approved
- [ ] Deploy to production (asmia.in)

### Before Going Live:
- [ ] Test all features thoroughly
- [ ] Train team on using CRM
- [ ] Set up monitoring/alerts
- [ ] Have support processes ready
- [ ] Prepare customer communication

---

## 🎯 Recommended Order:

**Phase 1: Testing (Now - Next 3 Days)**
1. Configure webhook (Step 3)
2. Test 2-way messaging locally
3. Test all CRM features
4. Refine templates
5. Test automation flows

**Phase 2: Production Setup (Days 4-7)**
1. Deploy to asmia.in
2. Add business phone number (Step 5)
3. Add payment method (Step 6)
4. Get templates approved
5. Configure production webhook

**Phase 3: Soft Launch (Week 2)**
1. Test with small customer group
2. Monitor costs and usage
3. Refine automation rules
4. Train team thoroughly
5. Gather feedback

**Phase 4: Full Launch (Week 3+)**
1. Enable for all customers
2. Launch marketing campaigns
3. Monitor analytics daily
4. Optimize based on data
5. Scale gradually

---

## 🆘 Quick Help

**Can't Configure Webhook?**
- Ensure asmia.in is accessible publicly
- Check SSL certificate is valid
- Verify token must match exactly
- Use ngrok for local testing

**Webhook Verification Failing?**
- Check backend logs: `tail -f /var/log/supervisor/backend.out.log`
- Test endpoint: `curl https://asmia.in/api/whatsapp/webhook`
- Verify HTTPS (not HTTP)

**Don't Want to Add Payment Yet?**
- You can still test with test number
- First 1000 conversations usually free
- Add payment when ready to scale

**Need Help with Phone Verification?**
- Use business phone number
- Have phone nearby for verification code
- May need business documents

---

## 📞 Support Resources

**Meta Support:**
- WhatsApp Business: https://business.facebook.com/help
- Developer Docs: https://developers.facebook.com/docs/whatsapp

**Your System:**
- Webhook URL: https://asmia.in/api/whatsapp/webhook
- Verify Token: tnv_whatsapp_webhook_2024
- Inbox: https://asmia.in/whatsapp-inbox
- Tracking: https://asmia.in/tracking/:id

**Documentation:**
- Complete Guide: /app/WHATSAPP_CRM_COMPLETE_GUIDE.md
- Webhook Setup: /app/WEBHOOK_SETUP_GUIDE.md
- This File: /app/META_WHATSAPP_SETUP_COMPLETE_GUIDE.md

---

## ✅ Quick Summary

**You've Completed:**
- ✅ Step 1: Access WhatsApp API
- ✅ Step 2: Send test messages
- ✅ Step 4: Built complete app

**You Need To Do:**
- ⏳ Step 3: Configure webhook (5 minutes)
- ⏳ Step 5: Add phone number (15 minutes)
- ⏳ Step 6: Add payment (5 minutes)

**Total Time to Complete:** ~25 minutes
**Total Cost to Start:** ₹0 (first 1000 messages free)

You're almost there! 🚀
