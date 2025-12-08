# 🔗 WhatsApp Webhook - Local Testing Setup Guide

## Overview
Since asmia.in is not yet deployed, we'll use **ngrok** to create a temporary public URL that forwards to your localhost. This allows Meta to send webhooks to your local development environment.

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Start ngrok

**Open a new terminal and run:**

```bash
ngrok http 8001
```

**You'll see output like:**
```
ngrok

Session Status                online
Account                       your-account (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:8001

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**IMPORTANT:** Copy the HTTPS URL!
Example: `https://abc123.ngrok.io`

---

### Step 2: Configure Webhook in Meta

**Go to Meta Business Manager:**

1. Visit: https://business.facebook.com
2. Navigate to: **WhatsApp** → **API Setup** (or Configuration)
3. Find: **Step 3: Configure webhooks to receive messages**
4. Click: **Edit** or **Configure Webhooks**

**Enter Your Webhook Details:**

```
Callback URL: https://YOUR-NGROK-URL.ngrok.io/api/whatsapp/webhook
Verify token: tnv_whatsapp_webhook_2024
```

**Example:**
```
Callback URL: https://abc123.ngrok.io/api/whatsapp/webhook
Verify token: tnv_whatsapp_webhook_2024
```

**Click:** "Verify and Save"

**What Happens:**
- Meta sends GET request to your webhook
- Your backend responds with challenge code
- If successful: "Webhook verified successfully" ✅

---

### Step 3: Subscribe to Webhook Events

**After verification, check these boxes:**

- ☑️ **messages** - Receive customer messages
- ☑️ **message_status** - Get delivery/read status
- ☑️ **message_template_status_update** - Template approval updates

**Click:** "Save" or "Done"

---

### Step 4: Test Your Webhook

#### Method 1: Send Test Message

**From your phone:**
1. Open WhatsApp
2. Send message to: **+1 555 602 8470**
3. Send: "Hello, testing webhook!"

**What Should Happen:**
```
Your phone → WhatsApp → Meta API → ngrok → Your Backend → Database → Inbox
```

**Check Results:**
1. ngrok terminal shows incoming POST request
2. Backend logs show message received
3. Message appears in: http://localhost:3000/whatsapp-inbox

#### Method 2: Test Webhook Manually

**Test if webhook is accessible:**
```bash
curl "https://YOUR-NGROK-URL.ngrok.io/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=tnv_whatsapp_webhook_2024&hub.challenge=12345"
```

**Should return:** `12345`

**Test webhook POST:**
```bash
curl -X POST https://YOUR-NGROK-URL.ngrok.io/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "message"}'
```

**Should return:** `{"status": "ok"}`

---

## 🎯 Complete Testing Flow

### Full End-to-End Test:

**Step 1: Customer Sends Message**
```
Your Phone → Send WhatsApp to +1 555 602 8470
Message: "Where is my order?"
```

**Step 2: Check ngrok Terminal**
```
POST /api/whatsapp/webhook    200 OK
```

**Step 3: Check Backend Logs**
```bash
tail -f /var/log/supervisor/backend.out.log | grep webhook
```

**Should see:**
```
📩 Webhook received: {...}
✅ Incoming message saved from +919582639469
```

**Step 4: Check Database**
```bash
mongo shopify_customers_db --eval "db.whatsapp_messages.find().limit(1).pretty()"
```

**Step 5: Check Inbox**
```
Open: http://localhost:3000/whatsapp-inbox
Should see: New conversation from your number
Click conversation → See message
```

**Step 6: Reply from Inbox**
```
Type: "Your order TNV1234 is dispatched!"
Click Send
```

**Step 7: Check Your Phone**
```
You should receive WhatsApp reply instantly ✅
```

---

## 🔧 Troubleshooting

### Issue 1: "Webhook Verification Failed"

**Possible Causes:**
- ngrok URL incorrect
- Verify token doesn't match
- Backend not running
- ngrok not forwarding

**Solutions:**
1. Check ngrok is running: Look for "Session Status: online"
2. Verify URL is correct: Must be HTTPS ngrok URL + `/api/whatsapp/webhook`
3. Check backend: `sudo supervisorctl status backend` (should be RUNNING)
4. Check verify token: Must be exactly `tnv_whatsapp_webhook_2024`

**Test webhook directly:**
```bash
curl -v "https://YOUR-NGROK-URL.ngrok.io/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=tnv_whatsapp_webhook_2024&hub.challenge=TEST123"
```

Should return: `TEST123`

---

### Issue 2: "Messages Not Appearing in Inbox"

**Possible Causes:**
- Webhook not subscribed to events
- Backend error processing message
- Database connection issue

**Solutions:**

1. **Check webhook subscriptions:**
   - Go to Meta dashboard
   - Verify "messages" is checked
   - Re-subscribe if needed

2. **Check backend logs:**
   ```bash
   tail -50 /var/log/supervisor/backend.out.log | grep -i error
   ```

3. **Check database:**
   ```bash
   mongo shopify_customers_db --eval "db.whatsapp_messages.count()"
   ```
   Should increase after each message

4. **Test webhook manually:**
   ```bash
   curl -X POST https://YOUR-NGROK-URL.ngrok.io/api/whatsapp/webhook \
     -H "Content-Type: application/json" \
     -d '{
       "entry": [{
         "changes": [{
           "value": {
             "messages": [{
               "from": "919582639469",
               "id": "test123",
               "timestamp": "1234567890",
               "type": "text",
               "text": {"body": "Test message"}
             }],
             "contacts": [{"profile": {"name": "Test User"}}]
           }
         }]
       }]
     }'
   ```

---

### Issue 3: "Can't Reply to Messages"

**Possible Causes:**
- Access token expired
- 24-hour window passed
- Wrong phone number format

**Solutions:**

1. **Check access token:**
   - Go to Meta Business Manager
   - Generate new temporary token
   - Update in `/app/backend/.env`
   - Restart backend: `sudo supervisorctl restart backend`

2. **Check 24-hour rule:**
   - Can only send free text within 24 hours
   - After 24 hours, must use template

3. **Use template if needed:**
   - After 24 hours, use approved template
   - Or wait for customer to message again

---

### Issue 4: "ngrok Session Expired"

**Problem:** Free ngrok sessions timeout after 2-8 hours

**Solution:**

1. **Restart ngrok:**
   ```bash
   pkill ngrok
   ngrok http 8001
   ```

2. **Get new URL:**
   ```
   New URL: https://xyz789.ngrok.io
   ```

3. **Update in Meta:**
   - Go to Meta dashboard
   - Edit webhook
   - Enter new ngrok URL
   - Verify and save

4. **For permanent solution:**
   - Sign up for ngrok account (free)
   - Or deploy to production (asmia.in)

---

## 📊 Monitor Webhook Activity

### View ngrok Requests (Web Interface)

**Open in browser:**
```
http://localhost:4040
```

**You'll see:**
- All incoming requests
- Request/response details
- Timing information
- Replay requests for testing

**Very useful for debugging!**

### View Backend Logs

**Real-time monitoring:**
```bash
tail -f /var/log/supervisor/backend.out.log | grep -E "webhook|whatsapp"
```

**Check recent webhooks:**
```bash
grep "webhook" /var/log/supervisor/backend.out.log | tail -20
```

### Check Database

**Count messages:**
```bash
mongo shopify_customers_db --eval "db.whatsapp_messages.count()"
```

**View recent messages:**
```bash
mongo shopify_customers_db --eval "db.whatsapp_messages.find().sort({sent_at:-1}).limit(5).pretty()"
```

**Count conversations:**
```bash
mongo shopify_customers_db --eval "db.whatsapp_conversations.count()"
```

---

## ✅ Success Checklist

After completing setup, verify:

- [ ] ngrok running and showing HTTPS URL
- [ ] Webhook verified in Meta dashboard
- [ ] Events subscribed (messages, message_status)
- [ ] Sent test message from phone
- [ ] Message appears in ngrok logs
- [ ] Message appears in backend logs
- [ ] Message saved in database
- [ ] Message visible in /whatsapp-inbox
- [ ] Can reply from inbox
- [ ] Reply received on phone

**If all checked: 🎉 Webhook is working perfectly!**

---

## 🚀 What Happens Next

### Immediate Benefits:
✅ **2-Way Messaging Enabled**
- Customers can message you
- You reply from CRM inbox
- Full conversation history
- Real-time synchronization

✅ **Customer Service Ready**
- See all customer messages
- Reply instantly
- View customer order history
- Provide better support

✅ **Analytics Tracking**
- Message counts
- Response times
- Customer engagement
- Conversation metrics

### When Ready for Production:

**Stop using ngrok:**
- Deploy to asmia.in
- Use permanent domain
- Update webhook in Meta
- No more session timeouts!

**Until then:**
- ngrok works great for development
- Just restart when it expires
- Update webhook URL in Meta
- Continue testing locally

---

## 💡 Pro Tips

### Tip 1: Keep ngrok Running
```bash
# Run ngrok in screen session (survives terminal close)
screen -S ngrok
ngrok http 8001
# Press Ctrl+A then D to detach
# Reattach later: screen -r ngrok
```

### Tip 2: Save ngrok URL
```bash
# Save for easy reference
echo "https://YOUR-NGROK-URL.ngrok.io" > /tmp/ngrok_url.txt
```

### Tip 3: Auto-Update Webhook
Create a script to auto-update webhook when ngrok restarts (advanced).

### Tip 4: Test Thoroughly
- Send messages from different numbers
- Test various message types (text, images)
- Test reply timing (within/after 24hrs)
- Test template messages

---

## 📞 Need Help?

**Common Commands:**

**Start ngrok:**
```bash
ngrok http 8001
```

**Check backend status:**
```bash
sudo supervisorctl status backend
```

**View logs:**
```bash
tail -f /var/log/supervisor/backend.out.log
```

**Restart backend:**
```bash
sudo supervisorctl restart backend
```

**Test webhook:**
```bash
curl "https://YOUR-NGROK-URL.ngrok.io/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=tnv_whatsapp_webhook_2024&hub.challenge=123"
```

---

## 🎊 Summary

**You've Learned:**
- ✅ How to use ngrok for local testing
- ✅ How to configure webhook in Meta
- ✅ How to test end-to-end messaging
- ✅ How to troubleshoot issues
- ✅ How to monitor webhook activity

**What's Working:**
- ✅ Local webhook endpoint ready
- ✅ Backend processing messages
- ✅ Inbox displaying conversations
- ✅ Reply functionality working

**Next Step:**
Run ngrok and configure webhook in Meta!

**Total Time:** 5-10 minutes
**Difficulty:** Easy
**Result:** Full 2-way WhatsApp messaging! 🎉
