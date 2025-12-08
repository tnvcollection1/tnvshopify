# Meta App Review - Data Handling Responses

## 📋 HOW TO ANSWER DATA HANDLING QUESTIONS

---

## Question 1: Data Processors

**Do you have data processors or service providers that will have access to Platform Data?**

### Answer: **YES**

**Explanation:** You use MongoDB database and hosting infrastructure that processes WhatsApp customer data (phone numbers, messages, names).

---

## Question 2: List of Data Processors

**List all data processors or service providers:**

```
1. MongoDB Database Service - Stores customer conversation data, phone numbers, and message history securely in our database infrastructure.

2. Our Internal Hosting Infrastructure - Processes and stores WhatsApp messages, customer information, and conversation data on secure servers for CRM functionality.

3. FastAPI Backend Application - Our own backend service that processes WhatsApp webhook events, manages conversations, and handles message routing.
```

**Note:** Only list processors that have access to Meta/WhatsApp data. Do NOT include:
- DTDC (they only get order tracking info, not WhatsApp data)
- Shopify (they provide order data TO you, not receive WhatsApp data FROM you)

---

## Question 3: Responsible Entity

**Who is the person or entity responsible for Platform Data?**

### Answer:
```
Ashmiaa
```

**Explanation:** This is your verified business name in Facebook Business Manager. This is the legal entity (data controller) that determines how WhatsApp customer data is used.

**Alternative:** If you have a registered company name (like "Ashmiaa Private Limited" or similar), use the full legal company name.

---

## Question 4: Country Location

**Select the country where this entity is located:**

### Answer: **Pakistan**

(Select from dropdown)

---

## Question 5: National Security Requests

**Have you provided personal data to public authorities in response to national security requests in the past 12 months?**

### Answer: **No**

**Explanation:** As a small e-commerce business, you likely haven't received such requests. This question is typically for large tech companies.

---

## Question 6: Data Request Policies

**Which policies do you have in place regarding requests from public authorities?**

### Recommended Answers (Check all that apply):

✅ **Required review of the legality of these requests.**

✅ **Provisions for challenging these requests if they are considered unlawful.**

✅ **Data minimization policy—the ability to disclose the minimum information necessary.**

✅ **Documentation of these requests, including your responses and legal reasoning.**

**Explanation:** Even if you haven't received such requests, having these policies in place demonstrates good data governance practices. These are standard best practices for any business handling customer data.

---

## 🔒 PRIVACY & SECURITY BEST PRACTICES

To strengthen your submission, ensure you can demonstrate:

### 1. Data Security
- ✅ MongoDB database with authentication
- ✅ Backend API with secure authentication (admin login)
- ✅ HTTPS for production (asmia.in)
- ✅ Environment variables for credentials (not hardcoded)

### 2. Data Minimization
- ✅ Only collect necessary data (phone, name, messages)
- ✅ Don't share WhatsApp data with third parties
- ✅ Use data only for customer support and order notifications

### 3. User Rights
- ✅ Customers can request data deletion (mention in your privacy policy)
- ✅ Opt-out available for marketing messages
- ✅ Clear privacy policy: https://asmia.in/pages/privacy-policy

### 4. Compliance
- ✅ 24-hour messaging window compliance
- ✅ Template approval process
- ✅ No unsolicited messages
- ✅ Respect opt-out requests

---

## 📝 SUMMARY OF ANSWERS

| Question | Answer |
|----------|--------|
| **Data processors?** | Yes |
| **List processors** | MongoDB, Internal Hosting, FastAPI Backend |
| **Responsible entity** | Ashmiaa (or your full legal company name) |
| **Country** | Pakistan |
| **National security requests** | No |
| **Policies in place** | Check all 4 options |

---

## ⚠️ IMPORTANT NOTES

### About Data Processors:

**DO include:**
- Services that process WhatsApp customer data
- Your own internal systems (database, backend)
- Hosting infrastructure

**DON'T include:**
- Services that only receive non-WhatsApp data
- Services where you send data independently (like DTDC tracking)
- Shopify (they provide data TO you, not process WhatsApp data)

### About Responsible Entity:

Use your **legal business name** as registered with:
- Facebook Business Manager
- Business registration documents
- Tax registration (if applicable)

### About Policies:

Even if you're a small business, checking all policy boxes shows:
- Good data governance
- Commitment to user privacy
- Professional approach to data handling
- Compliance with international standards (GDPR, etc.)

---

## ✅ READY TO SUBMIT

After filling out Data Handling:

1. ✅ Verification section (completed)
2. ✅ App settings (icon, URLs - completed)
3. ✅ Allowed usage (descriptions, video - completed)
4. ✅ Data handling (use answers above)
5. ⏳ Reviewer instructions (next step)

---

**Next:** Proceed to "Reviewer instructions" section after completing Data Handling.
