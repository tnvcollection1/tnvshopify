# Quick Start Guide - 3 Stores Customer Manager

## ✅ System Ready!
- All previous data cleared
- Fresh start for your 3 stores
- CSV upload working

---

## Step-by-Step Setup

### Step 1: Add Your 3 Stores

1. **Click "Add Store" button** (top right, blue button)
2. **Enter store details:**
   - Store Name: "Ashmiaa Store 1" (or your actual name)
   - Shopify URL: "store1.myshopify.com"
3. **Click "Save Store"**
4. **Repeat for Store 2 and Store 3**

### Step 2: Export CSV from Shopify

For **each store**:

1. Login to Shopify Admin: `https://[your-store].myshopify.com/admin`
2. Click **"Orders"** (left sidebar)
3. Click **"Export"** button
4. Select **"All orders"**
5. Choose **CSV format**
6. Download the file
7. Rename to identify store: `store1_orders.csv`

### Step 3: Upload CSV for Each Store

1. **Find the store card** in the dashboard
2. **Click "Upload CSV"** button on that store's card
3. **Select the CSV file** for that store
4. **Wait for upload** to complete (you'll see success message)
5. **Repeat for other stores**

---

## What You'll See

### After Upload:
- ✅ Customer names extracted
- ✅ Phone numbers imported
- ✅ Clothing sizes listed
- ✅ Order counts displayed
- ✅ Store assignment

### Filter Options:
- **By Store**: View customers from specific store
- **By Size**: Filter by M, L, XL, Unstitched, etc.
- **Search**: Find by name, phone, email

### WhatsApp Features:
- **Individual**: Click WhatsApp icon on customer row
- **Bulk**: Filter customers, click "Message X Customers"
- Opens WhatsApp Web/Desktop automatically

---

## CSV Format Expected

Your Shopify export will have these columns:
```
Name, Email, Shipping Name, Shipping Phone, Shipping Country,
Billing Name, Billing Phone, Lineitem name, Total, Created at
```

**The system automatically extracts:**
- Customer name from Shipping/Billing Name
- Phone from Shipping/Billing Phone
- Size from Lineitem name (e.g., "Dress - M" → Size: M)
- Country code from Shipping Country

---

## Tips

**Store Names:**
- Use clear, memorable names
- Example: "Main Store", "Outlet", "Premium Store"
- You can delete and re-add if needed

**CSV Upload:**
- Upload will replace existing data for that store
- You can re-upload to refresh data
- Each store's data stays separate

**Size Extraction:**
- Works with: "Product - Size", "Product / Size", "Product | Size"
- Examples: "Dress - M", "3PC / XL", "Suit | Large"

---

## Current Status

✅ **Backend**: Running and ready
✅ **Database**: Cleared and reset
✅ **CSV Parser**: Fully functional
✅ **Store Management**: Working
✅ **WhatsApp Integration**: Ready

---

## Need Help?

**If upload fails:**
- Check file is .csv format
- Ensure it's from Shopify orders export
- Try with smaller test file first

**If no phone numbers:**
- Your Shopify might not collect phones
- Check Shopify Settings → Checkout
- Enable phone field as required

**To delete a store:**
- Click trash icon on store card
- Confirms before deleting
- Removes store and all its customers

---

## Ready to Go! 🚀

Your system is configured for:
- 3 stores
- Unlimited customers per store  
- Complete customer data
- WhatsApp messaging
- Size-based filtering

Start by adding your first store! 
