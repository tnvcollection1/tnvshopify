# 🔧 Create Demo User in Production

## ✅ STEP-BY-STEP INSTRUCTIONS

---

### **METHOD 1: Using Browser (Easiest)**

1. **Open your browser**
2. **Login to your app** as admin at: `https://asmia.in`
3. **Open browser console** (Press F12 or right-click → Inspect → Console tab)
4. **Copy and paste this code:**

```javascript
fetch('https://asmia.in/api/setup/create-demo-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('✅ DEMO USER CREATED!');
  console.log('Username:', data.username);
  console.log('Password:', data.password);
  console.log('Role:', data.role);
  alert('Demo user created successfully!\nUsername: ' + data.username + '\nPassword: ' + data.password);
})
.catch(error => {
  console.error('Error:', error);
  alert('Error creating demo user. Check console for details.');
});
```

5. **Press Enter**
6. **You'll see a success message** with the credentials
7. **Done!** Demo user is created

---

### **METHOD 2: Using curl (Command Line)**

If you prefer command line:

```bash
curl -X POST https://asmia.in/api/setup/create-demo-user \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Demo user created successfully!",
  "username": "demo_reviewer",
  "password": "MetaReview2024!",
  "role": "demo",
  "note": "Demo user can only access WhatsApp CRM features"
}
```

---

### **METHOD 3: Visit URL Directly**

1. Go to: `https://asmia.in/api/setup/create-demo-user` (use POST request)
2. Or use a tool like Postman/Insomnia
3. Send POST request to the URL above

---

## ✅ **VERIFY IT WORKED:**

### **Test the Demo Login:**

1. **Logout** from your admin account
2. Go to: `https://asmia.in`
3. **Login with:**
   - Username: `demo_reviewer`
   - Password: `MetaReview2024!`
4. **You should see:**
   - Only WhatsApp CRM menu items
   - Sidebar says "WhatsApp CRM Demo"
   - Profile shows "Meta Reviewer" / "Demo Reviewer"

---

## 🔒 **SECURITY NOTES:**

✅ **Safe to call multiple times:** If demo user already exists, it will just return success
✅ **No security risk:** This endpoint only creates a restricted demo account
✅ **One-time use:** Typically only called once during setup

---

## 📋 **AFTER CREATING DEMO USER:**

**Update your Meta app review form with:**

**Reviewer Credentials:**
- Username: `demo_reviewer`
- Password: `MetaReview2024!`

**Instructions:**
```
The demo account is restricted to WhatsApp CRM features only. 
Reviewers will see: Inbox, Templates, Campaigns, and Analytics.
Other business data is not accessible for security purposes.
```

---

## 🎯 **WHICH METHOD TO USE?**

**Easiest:** Method 1 (Browser Console) - Just copy-paste the code
**Fastest:** Method 2 (curl) - If you're comfortable with terminal
**Flexible:** Method 3 (API tool) - If you use Postman/Insomnia

---

## ❓ **TROUBLESHOOTING:**

**If you get an error:**
1. Make sure you're logged in as admin first
2. Check that your production backend is running
3. Try the curl method instead
4. Check backend logs for details

**If demo user already exists:**
- The endpoint will return success message
- Just verify the credentials work by testing login

---

**Once created, test the login and then update your Meta app review submission!** 🚀
