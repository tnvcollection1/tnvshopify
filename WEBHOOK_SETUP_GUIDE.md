# 🔗 WhatsApp Webhook Setup Guide for https://asmia.in

## Overview
This guide will help you configure the WhatsApp webhook to enable real-time 2-way messaging in your inbox.

---

## Prerequisites
✅ Production domain: https://asmia.in
✅ Backend deployed and accessible
✅ Meta Business Manager access
✅ WhatsApp Business API access

---

## Step 1: Configure Webhook in Meta Business Manager

### 1.1 Access Webhook Configuration
1. Go to: https://business.facebook.com
2. Navigate to: **WhatsApp Manager** → **Configuration**
3. Find the **Webhook** section
4. Click **Edit** or **Configure**

### 1.2 Enter Webhook Details

**Callback URL:**
```
https://asmia.in/api/whatsapp/webhook
```

**Verify Token:**
```
tnv_whatsapp_webhook_2024
```

### 1.3 Verify and Save
1. Click **Verify and Save**
2. Meta will send a GET request to verify your webhook
3. Your backend will respond with the challenge
4. If successful, webhook is configured!

---

## Step 2: Subscribe to Webhook Events

After verification, subscribe to these events:

### Required Events:
- ☑️ **messages** - Receive customer messages
- ☑️ **message_status** - Get delivery status (sent, delivered, read)
- ☑️ **message_template_status_update** - Track template approval status

### Optional Events:
- ☑️ **message_echoes** - See messages you sent
- ☑️ **message_reactions** - Customer reactions to messages

---

## Step 3: Test Webhook

### 3.1 Test from Meta Dashboard
1. In WhatsApp Manager, go to **Configuration**
2. Find **Webhook** section
3. Click **Test** button
4. Meta sends a test message
5. Check your backend logs to confirm receipt

### 3.2 Test with Real Message
1. Send a WhatsApp message to your business number: **+1 555 602 8470**
2. Message should appear in your Inbox: `/whatsapp-inbox`
3. Reply from the inbox
4. Customer receives your reply

---

## Step 4: Verify Webhook is Working

### 4.1 Check Backend Logs
```bash
tail -f /var/log/supervisor/backend.out.log | grep webhook
```

You should see:
```
✅ Webhook verified successfully
📩 Webhook received: {message data}
✅ Incoming message saved from +919582639469
```

### 4.2 Check Database
Messages should be saved in:
- Collection: `whatsapp_messages`
- Collection: `whatsapp_conversations`

### 4.3 Check Frontend Inbox
1. Go to: https://asmia.in/whatsapp-inbox
2. You should see incoming messages
3. Click to view conversation
4. Reply functionality should work

---

## Webhook Endpoint Details

### Your Webhook Endpoints:

**GET /api/whatsapp/webhook**
- Purpose: Webhook verification
- Called by: Meta during setup
- Returns: Challenge code

**POST /api/whatsapp/webhook**
- Purpose: Receive messages
- Called by: Meta when customer sends message
- Action: Saves to database & creates conversation

### Webhook Flow:

```
Customer sends WhatsApp message
    ↓
Meta WhatsApp Business API receives it
    ↓
Meta sends POST to: https://asmia.in/api/whatsapp/webhook
    ↓
Your backend receives & processes
    ↓
Saves to whatsapp_messages collection
    ↓
Creates/updates whatsapp_conversations
    ↓
Message appears in /whatsapp-inbox
    ↓
You reply from inbox
    ↓
Backend sends via Meta API
    ↓
Customer receives reply
```

---

## Troubleshooting

### Issue 1: Webhook Verification Fails

**Symptoms:**
- Meta shows "Verification failed" error
- Webhook won't save

**Solutions:**
1. Check your backend is accessible at https://asmia.in
2. Verify SSL certificate is valid
3. Check verify token matches exactly: `tnv_whatsapp_webhook_2024`
4. Test endpoint manually:
   ```bash
   curl "https://asmia.in/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=tnv_whatsapp_webhook_2024&hub.challenge=12345"
   ```
   Should return: `12345`

### Issue 2: Messages Not Appearing in Inbox

**Symptoms:**
- Webhook verified but messages don't show
- Customer messages not saving

**Solutions:**
1. Check backend logs for errors
2. Verify webhook subscriptions are active
3. Check MongoDB connection
4. Test with curl:
   ```bash
   curl -X POST https://asmia.in/api/whatsapp/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": "message"}'
   ```

### Issue 3: Can't Reply to Messages

**Symptoms:**
- Can see messages but can't reply
- Reply button doesn't work

**Solutions:**
1. Check 24-hour window rule (can only text within 24hr)
2. After 24hr, must use template message
3. Verify access token is valid
4. Check API credentials

---

## Security Considerations

### 1. Verify Webhook Signature (Recommended)
Meta signs webhook requests. You should verify:
```python
import hmac
import hashlib

def verify_signature(payload, signature, app_secret):
    expected = hmac.new(
        app_secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

### 2. Use HTTPS Only
- Never use HTTP for webhooks
- Ensure SSL certificate is valid
- Keep certificate up to date

### 3. Validate Webhook Requests
- Check requests come from Meta's IP ranges
- Validate request structure
- Handle errors gracefully

---

## Monitoring

### Key Metrics to Track:

1. **Webhook Reliability**
   - Successful requests: Should be >99%
   - Failed requests: Investigate if >1%
   - Response time: Should be <1 second

2. **Message Processing**
   - Messages received: Track count
   - Messages saved: Should match received
   - Processing errors: Should be near 0

3. **Conversation Metrics**
   - Total conversations: Growing over time
   - Open conversations: Monitor for response
   - Response time: Track agent performance

---

## Production Checklist

Before going live:

- [ ] Webhook verified and working
- [ ] Test message sent and received
- [ ] Reply functionality tested
- [ ] SSL certificate valid
- [ ] Backend logs clean (no errors)
- [ ] Database storing messages correctly
- [ ] Inbox showing conversations
- [ ] Templates approved by Meta
- [ ] Access token not expiring soon
- [ ] Monitoring set up
- [ ] Team trained on using inbox

---

## Support Resources

**Meta WhatsApp Documentation:**
- Webhook Setup: https://developers.facebook.com/docs/whatsapp/webhooks
- Business API: https://developers.facebook.com/docs/whatsapp/cloud-api

**Your Endpoints:**
- Webhook: https://asmia.in/api/whatsapp/webhook
- Inbox: https://asmia.in/whatsapp-inbox
- Tracking: https://asmia.in/tracking/:identifier

**Verify Token:**
```
tnv_whatsapp_webhook_2024
```

---

## Quick Setup Summary

1. **Go to Meta Business Manager** → WhatsApp Manager → Configuration
2. **Add Webhook URL**: `https://asmia.in/api/whatsapp/webhook`
3. **Add Verify Token**: `tnv_whatsapp_webhook_2024`
4. **Click Verify and Save**
5. **Subscribe to events**: messages, message_status
6. **Test**: Send message to +1 555 602 8470
7. **Check Inbox**: Should appear in /whatsapp-inbox

That's it! Your real-time WhatsApp inbox is ready! 🎉
