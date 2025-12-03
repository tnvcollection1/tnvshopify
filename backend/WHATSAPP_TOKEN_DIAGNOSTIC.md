# WhatsApp API Token Diagnostic Report

## Current Status: ❌ BLOCKED

### Error Details
- **Error Code**: 100 (GraphMethodException)
- **Error Subcode**: 33
- **Message**: "Unsupported post request. Object with ID '2543107309404459' does not exist, cannot be loaded due to missing permissions"

### Configuration Verified ✅
- Phone Number ID: `942695112250619`
- WABA ID: `2543107309404459`
- Access Token: Updated and loaded correctly
- Backend: Restarted successfully

---

## Root Cause Analysis

### Issue #1: Missing Payment Method (CRITICAL) ⚠️
From your Meta developer page screenshot:
```
"Missing valid payment method - Free tier conversations can only be initiated by 
your customers. You won't be able to message customers until you've added a 
payment method or updated your existing payment method."
```

**Impact**: 
- You **CANNOT** create templates without a payment method
- You **CANNOT** initiate business-to-customer conversations
- Only customer-initiated conversations work on free tier

### Issue #2: Access Token Permissions
The current token might be:
1. A **temporary token** (expires in 1-24 hours)
2. Missing required **App permissions** 
3. Not properly linked to the WABA ID

---

## Solution Steps

### Step 1: Add Payment Method to Meta Business Account (MANDATORY)

1. Go to **WhatsApp Manager**: https://business.facebook.com/wa/manage/home/
2. Navigate to **Settings** → **Payment Methods**
3. Click **Add Payment Method**
4. Add a valid credit/debit card
5. Wait 5-10 minutes for the system to update

**Note**: Until you add a payment method, template creation and business-initiated messages will fail.

---

### Step 2: Generate a System User Access Token (Recommended for Production)

Your current token is a **temporary developer token** that expires quickly. For production use, you need a **System User token**:

#### A. Create System User
1. Go to **Meta Business Settings**: https://business.facebook.com/settings/
2. Click **Users** → **System Users**
3. Click **Add** → Create a new system user (e.g., "WhatsApp API")
4. Save the System User

#### B. Grant Permissions
1. Click on the newly created system user
2. Click **Add Assets**
3. Select **Apps** → Choose your WhatsApp app
4. Enable **Full Control** or at minimum:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
   - `business_management`

#### C. Generate Long-Lived Token
1. In the System User page, click **Generate New Token**
2. Select your **WhatsApp Business App**
3. Select permissions:
   - ✅ `whatsapp_business_management`
   - ✅ `whatsapp_business_messaging`
   - ✅ `business_management`
4. Click **Generate Token**
5. **COPY THE TOKEN** (it will only be shown once!)
6. Token expiration: Set to **Never** for production

#### D. Update Your .env File
```bash
WHATSAPP_ACCESS_TOKEN="YOUR_NEW_SYSTEM_USER_TOKEN_HERE"
```

---

### Step 3: Verify Token Permissions

After generating a new token, verify it has the correct permissions:

```bash
curl -X GET "https://graph.facebook.com/v22.0/debug_token?input_token=YOUR_ACCESS_TOKEN&access_token=YOUR_ACCESS_TOKEN"
```

Expected response should include:
```json
{
  "data": {
    "app_id": "...",
    "is_valid": true,
    "scopes": [
      "whatsapp_business_management",
      "whatsapp_business_messaging",
      "business_management"
    ],
    "expires_at": 0  // 0 means never expires
  }
}
```

---

### Step 4: Alternative - Use App-Level Token

If System User doesn't work, try an **App Access Token**:

1. Go to your **App Dashboard**: https://developers.facebook.com/apps/
2. Select your WhatsApp app
3. Go to **Settings** → **Basic**
4. Find your **App ID** and **App Secret**
5. Generate App Token:

```bash
curl -X GET "https://graph.facebook.com/oauth/access_token?client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&grant_type=client_credentials"
```

6. Use the returned token in your `.env` file

---

## Testing After Fixes

### Test 1: Verify Basic API Access
```bash
curl -X GET \
  "https://graph.facebook.com/v22.0/942695112250619?access_token=YOUR_NEW_TOKEN"
```

**Expected**: Should return phone number details (not a permission error)

### Test 2: Test Template Creation
```bash
curl -X POST http://localhost:8001/api/whatsapp/templates/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "order_confirmation",
    "category": "UTILITY",
    "language": "en",
    "body": "Hello {{1}}, your order #{{2}} has been confirmed!"
  }'
```

**Expected**: `{"success": true, "template_id": "..."}`

### Test 3: Test Message Sending
```bash
curl -X POST http://localhost:8001/api/whatsapp/send-template \
  -H "Content-Type: application/json" \
  -d '{
    "to": "923212486739",
    "template_name": "hello_world",
    "language_code": "en_US"
  }'
```

---

## Quick Reference

### Required Steps Priority:
1. ⚠️ **P0**: Add payment method to Meta Business Account
2. 🔑 **P0**: Generate proper System User or App-level access token
3. ✅ **P1**: Update `.env` with new token
4. 🔄 **P1**: Restart backend: `sudo supervisorctl restart backend`
5. 🧪 **P2**: Run all three tests above

---

## Common Issues & Solutions

### Issue: "Invalid OAuth Token"
- **Solution**: Generate a new System User token with proper permissions

### Issue: "Payment method required"
- **Solution**: Add a payment method in WhatsApp Manager

### Issue: "Template creation failed"
- **Solution**: Ensure payment method is added AND token has `whatsapp_business_management` permission

### Issue: Token expires too quickly
- **Solution**: Use System User token with "Never expires" setting instead of temporary developer tokens

---

## Next Steps for User

Please complete the following and let me know when done:

1. ✅ Add payment method to your Meta Business Account
2. ✅ Generate a **System User access token** with the required permissions
3. ✅ Share the new token with me so I can update the `.env` file
4. ✅ I'll restart the backend and test template creation

Once these are done, the WhatsApp integration will be fully functional! 🎉
