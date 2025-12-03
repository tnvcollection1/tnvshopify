# WhatsApp API Testing Guide

## Quick Test in Meta Developer Console

### Step 1: Go to WhatsApp API Settings
https://developers.facebook.com/apps/2158985078179211/whatsapp-business/wa-dev-console/

### Step 2: Send Test Message

In the "Send and receive messages" section, you should see:
- Your test number
- A "Send message" button
- Sample code

**Test it by:**
1. Enter your phone number (with country code)
2. Click "Send message"
3. Check if you receive a WhatsApp message

**If this works** ✅ Your API is configured correctly!

---

## What the Test Tells You

### ✅ If Message Received:
- WhatsApp API is working
- Phone Number ID is correct
- Credentials are valid
- Ready to integrate with your app

### ❌ If No Message:
- Phone number not verified
- Number not added to test list
- API credentials issue

---

## Get Correct Credentials

### Find Your Phone Number ID

**Method 1: From API Settings**
1. Go to: https://developers.facebook.com/apps/2158985078179211/whatsapp-business/wa-settings/
2. Look for "Phone number ID"
3. Copy the number (should be like: 123456789012345)

**Method 2: Using Graph API**
```bash
curl "https://graph.facebook.com/v21.0/YOUR_BUSINESS_ID/phone_numbers?access_token=YOUR_TOKEN"
```

### Find Your WABA ID

**From API Settings:**
1. Go to: https://developers.facebook.com/apps/2158985078179211/whatsapp-business/wa-settings/
2. Look for "WhatsApp Business Account ID"
3. Copy the number

---

## Test API Endpoints

### 1. Test Token Permissions
```bash
curl "https://graph.facebook.com/v21.0/me/permissions?access_token=YOUR_TOKEN"
```

**Should show:**
- whatsapp_business_management: granted
- whatsapp_business_messaging: granted
- business_management: granted (needed for template management)

### 2. Test Send Message (Direct API)
```bash
curl -X POST \
"https://graph.facebook.com/v21.0/PHONE_NUMBER_ID/messages" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "messaging_product": "whatsapp",
  "to": "923001234567",
  "type": "text",
  "text": {
    "body": "Test message from API!"
  }
}'
```

### 3. Test Get Templates (Direct API)
```bash
curl "https://graph.facebook.com/v21.0/WABA_ID/message_templates?access_token=YOUR_TOKEN"
```

---

## Common Issues & Solutions

### Issue 1: "Object does not exist"
**Cause:** Incorrect Phone Number ID or WABA ID
**Solution:** 
1. Go to WhatsApp API Settings
2. Copy the exact IDs shown there
3. Update your .env file

### Issue 2: "Missing permissions"
**Cause:** Token doesn't have required permissions
**Solution:**
1. Go to: https://developers.facebook.com/tools/explorer/
2. Select your app
3. Generate token with these permissions:
   - whatsapp_business_management
   - whatsapp_business_messaging
   - business_management

### Issue 3: "Session expired"
**Cause:** Token expired (24-hour tokens)
**Solution:**
1. Generate new token from Graph API Explorer
2. Or create System User token (never expires)

---

## Getting Production-Ready Token

### Create System User (Permanent Token)

1. **Go to Business Settings**
   https://business.facebook.com/settings/system-users/

2. **Add System User**
   - Click "Add"
   - Name: "WhatsApp API"
   - Role: Admin

3. **Generate Token**
   - Click on system user
   - Click "Generate New Token"
   - Select app: TNV Collection
   - Select permissions:
     ✅ whatsapp_business_management
     ✅ whatsapp_business_messaging
     ✅ business_management
   - Click "Generate Token"
   - **SAVE TOKEN SECURELY** (shown only once!)

4. **Assign Assets**
   - Click "Assign Assets"
   - Select "WhatsApp Accounts"
   - Add your WhatsApp Business Account
   - Toggle "Full Control"
   - Save

---

## Quick Verification Checklist

Run these checks in order:

### 1. Check Token Validity ✅
```bash
curl "https://graph.facebook.com/v21.0/me?access_token=YOUR_TOKEN"
```
Should return user info (not error)

### 2. Check Token Permissions ✅
```bash
curl "https://graph.facebook.com/v21.0/me/permissions?access_token=YOUR_TOKEN"
```
Should show all 3 permissions as "granted"

### 3. Check Phone Number ID ✅
```bash
curl "https://graph.facebook.com/v21.0/PHONE_NUMBER_ID?access_token=YOUR_TOKEN"
```
Should return phone number details (not error)

### 4. Send Test Message ✅
```bash
curl -X POST \
"https://graph.facebook.com/v21.0/PHONE_NUMBER_ID/messages" \
-H "Authorization: Bearer YOUR_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "messaging_product": "whatsapp",
  "to": "YOUR_PHONE",
  "type": "text",
  "text": {"body": "Test!"}
}'
```
Should return message_id (not error)

---

## What to Send Me

Once you verify the API works, send me:

```
Phone Number ID: _______________
WABA ID: _______________
Business ID: _______________
Access Token: _______________
```

I'll update your app and test everything!

---

## Testing in Your Dashboard

Once credentials are confirmed working, you can test:

1. **Dispatch Tracker**
   - Click WhatsApp button on any order
   - Send message
   - Check if customer receives it

2. **Template Creation**
   - Go to Message Templates page
   - Click "Create Template"
   - Submit template
   - Check if it appears in Meta Business Manager

3. **WhatsApp Inbox**
   - View sent messages
   - Check delivery status

---

## Support Links

- Meta Developer Console: https://developers.facebook.com/apps/2158985078179211/
- WhatsApp Settings: https://developers.facebook.com/apps/2158985078179211/whatsapp-business/wa-settings/
- Graph API Explorer: https://developers.facebook.com/tools/explorer/
- Business Manager: https://business.facebook.com/
- WhatsApp Business API Docs: https://developers.facebook.com/docs/whatsapp/
