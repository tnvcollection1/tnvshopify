# WhatsApp Orders Integration Guide

## ✅ Features Added

### 1. **Send Individual WhatsApp Notifications**
- Green WhatsApp icon in Actions column for each order
- Click to send order confirmation message
- Only enabled for orders with phone numbers

### 2. **Bulk Send (10 Orders at Once)**
- Green "Send to First 10 Orders" button in header
- Sends WhatsApp notifications to first 10 orders with phone numbers
- 1-second delay between messages to avoid rate limiting
- Shows success/fail count after completion

### 3. **Open WhatsApp Web**
- "Open WhatsApp Web" button in header
- Opens WhatsApp Web in new tab for manual messaging

---

## 📋 How to Use

### **Send to Single Order:**
1. Go to Orders page
2. Find order with phone number (shown in green)
3. Click green WhatsApp icon in Actions column
4. Toast notification will show success/failure

### **Send to Multiple Orders (Bulk):**
1. Go to Orders page
2. Click "Send to First 10 Orders" button
3. System will send to first 10 orders that have phone numbers
4. Wait for completion (shows progress toasts)
5. Final toast shows how many sent successfully

### **Manual Messaging:**
1. Click "Open WhatsApp Web" button
2. Scan QR code (if not logged in)
3. Use for manual follow-ups

---

## 🔧 Technical Details

### **API Endpoint Used:**
```
POST /api/whatsapp/send-template
```

### **Request Format:**
```json
{
  "phone": "923001234567",
  "template_name": "order_confirmation_ashmiaa",
  "language_code": "en_US",
  "body_params": [
    { "type": "text", "text": "Customer Name" },
    { "type": "text", "text": "Order Number" },
    { "type": "text", "text": "Tracking Number" }
  ]
}
```

### **Phone Number Handling:**
- Automatically adds Pakistan country code (+92) if missing
- Removes spaces, dashes, parentheses
- Format: `92XXXXXXXXXX` (no + sign)

---

## ⚠️ Important Notes

### **Before Using:**

1. **Template Must Be Approved:**
   - Template: `order_confirmation_ashmiaa`
   - Status: Must be APPROVED by Meta
   - Check in Templates page

2. **Phone Numbers Required:**
   - Orders must have phone numbers
   - Phone shown in green = WhatsApp available
   - No phone = Button disabled

3. **WhatsApp Business API:**
   - Uses your WhatsApp Business account
   - Messages sent via official API
   - Counts toward your message quota

4. **Rate Limiting:**
   - Bulk send has 1-second delay between messages
   - Prevents hitting API rate limits
   - May take 10+ seconds to send to 10 orders

---

## 🐛 Troubleshooting

### **"No phone number found"**
- Order doesn't have phone number in database
- Check customer data or update manually

### **"Template not found" or "Template not approved"**
- Go to Templates page
- Check if `order_confirmation_ashmiaa` is approved
- Submit for approval if needed

### **"Failed to send WhatsApp"**
- Check Meta WhatsApp credentials
- Verify phone number format
- Check backend logs for details

### **Button not appearing:**
- Order must have phone number
- Button only shows for orders with valid phone

### **Error sending messages:**
```bash
# Check backend logs:
tail -50 /var/log/supervisor/backend.err.log
```

---

## 📊 Message Template Content

**Template Name:** `order_confirmation_ashmiaa`

**Message:**
```
Hello {{customer_name}}!

Your order #{{order_number}} has been confirmed.

Tracking: {{tracking_number}}

Thank you for shopping with Ashmiaa!
```

---

## 🚀 Future Enhancements

**Planned Features:**
1. Custom template selection per order
2. Bulk send with filters (status, date range)
3. Schedule sends for later
4. Message history per order
5. Delivery confirmation tracking
6. Multiple template types (shipping, delivery, etc.)

---

## 📝 For Production Deployment

**Before going live:**

1. ✅ Get templates approved by Meta
2. ✅ Test with real phone numbers
3. ✅ Update webhook to production URL
4. ✅ Generate long-lived access token
5. ✅ Monitor message quota usage

---

**Need help?** Check the logs or contact support!
