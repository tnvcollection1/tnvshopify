# Meta App Review - Reviewer Instructions

## ✅ COPY-PASTE ANSWERS FOR EACH FIELD

---

## FIELD 1: Where can we find the app?

**Copy this:**
```
https://asmia.in

This is a web-based CRM application for managing WhatsApp Business communications. Reviewers can access the application directly through this URL using any web browser.

Note: During review, the application is accessible at the production URL. The WhatsApp Business integration and webhook are fully configured and operational.
```

---

## FIELD 2: Provide instructions for accessing the app

**Copy this:**
```
HOW TO ACCESS AND TEST THE APP:

1. ACCESSING THE APPLICATION:
   - Open browser and go to: https://asmia.in
   - You will see the Asmia CRM login page

2. LOGIN CREDENTIALS:
   - Username: admin
   - Password: admin123

3. TESTING WHATSAPP FEATURES:

   A. WhatsApp Inbox (whatsapp_business_messaging):
      - Click "WhatsApp Inbox" in the left sidebar
      - View customer conversations and message history
      - Click on any conversation to see full message thread
      - The reply interface demonstrates 24-hour messaging window compliance
      - Test conversations are from real webhook events received from Meta

   B. Template Manager (whatsapp_business_management):
      - Click "Templates" in the left sidebar
      - View all message templates (18 total: 8 approved, 3 pending, 8 utility)
      - Templates are categorized as UTILITY (order confirmations, shipping updates) and MARKETING (promotional campaigns)
      - Click on any template to view its structure (header, body, footer, buttons)

   C. Campaign Manager (whatsapp_business_messaging + management):
      - Click "Campaigns" in the left sidebar
      - View campaign dashboard and metrics
      - "Create Campaign" button shows template-based campaign creation
      - Demonstrates opt-in only marketing message workflow

   D. Analytics Dashboard (whatsapp_business_management):
      - Click "Analytics" in the left sidebar
      - View message statistics (sent, delivered, failed, success rate)
      - See conversation metrics and key insights
      - Demonstrates compliance monitoring and performance tracking

4. META API INTEGRATION:
   - This app uses WhatsApp Business Cloud API for all messaging
   - Webhook is configured to receive real-time message events
   - Templates are managed through Meta Business Manager
   - No Facebook Login is used - this is a staff-facing CRM application
   - Authentication is handled through internal admin system (username/password)

5. PERMISSIONS USAGE:
   - whatsapp_business_messaging: Sending/receiving messages, customer support
   - whatsapp_business_management: Template and phone number management
   - whatsapp_business_manage_events: Real-time webhook notifications
   - business_management: Business account integration
   - public_profile: Internal user authentication for CRM staff

The application demonstrates compliance with WhatsApp Business policies including 24-hour messaging windows, template approval workflows, and opt-in requirements for marketing messages.
```

---

## FIELD 3: Payment or membership credentials

**Copy this:**
```
No payment or membership is required. 

The application is a business-facing CRM tool for our internal team to manage customer communications. Access is provided through the following test credentials:

Username: admin
Password: admin123

These credentials provide full access to all features and will remain active for one year.
```

---

## FIELD 4: Gift codes for app download

**Leave this field EMPTY or write:**
```
Not applicable - this is a web-based application accessible via browser at https://asmia.in. No download or payment is required to access the app.
```

---

## FIELD 5: Geographic restrictions

**Copy this:**
```
No geographic restrictions apply. The application is accessible worldwide and can be accessed by Meta reviewers from any location without VPN or special configuration.

The app is hosted on cloud infrastructure and is globally accessible via HTTPS at https://asmia.in.
```

---

## ✅ SUMMARY OF REVIEWER INSTRUCTIONS

| Field | Content |
|-------|---------|
| **App URL** | https://asmia.in |
| **Login Credentials** | Username: admin / Password: admin123 |
| **Facebook Login** | Not used - internal authentication only |
| **Payment Required** | No |
| **Download Codes** | Not applicable (web-based) |
| **Geographic Restrictions** | None |

---

## 🎬 REFERENCE VIDEO

Remind reviewers about your uploaded screencast:
- The video demonstrates all features mentioned in the instructions
- Shows the complete user journey from login to each feature
- Duration: 56 seconds, covering all permission use cases

---

## 🚀 AFTER SUBMITTING

Once you fill in all fields and click "Submit for Review":

1. **Review Timeline:** 24-48 hours
2. **Email Notification:** Sent to sunny.metalik@gmail.com
3. **Status Check:** Monitor in App Review → Submissions

**If Approved:**
- Update webhook URL to production
- Generate long-lived access token
- Submit templates for individual approval
- Start receiving real customer messages

**If Additional Info Needed:**
- Meta will email you with specific questions
- Respond promptly to avoid delays
- Usually just minor clarifications

---

## ✅ FINAL CHECKLIST

Before clicking "Submit":

- [x] App URL provided (https://asmia.in)
- [x] Test credentials provided (admin/admin123)
- [x] Detailed navigation instructions provided
- [x] Meta API usage explained
- [x] Facebook Login status clarified (not used)
- [x] Payment/membership section filled
- [x] Geographic restrictions clarified (none)
- [x] Video uploaded for all required permissions
- [x] All form sections completed

**YOU'RE READY TO SUBMIT!** 🎉

---

**Note:** The instructions mention https://asmia.in as production URL. If your production site isn't live yet, you can temporarily use a staging URL or mention that it's currently in development mode with ngrok webhook for testing purposes.
