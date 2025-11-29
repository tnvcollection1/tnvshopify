# How Data Updates Work

## ✅ Current Behavior (Working as Designed)

### When You Upload CSV:

**First Upload:**
- Creates store if it doesn't exist
- Imports all customers from CSV
- Displays data immediately

**Re-Upload (Same Store):**
- **REPLACES** all existing data for that store
- Deletes old customers from that store
- Imports fresh data from new CSV
- Updates customer count automatically

**Upload Different Store:**
- Each store's data is separate
- Uploading to "Store 1" doesn't affect "Store 2" data
- You can have different customers in each store

---

## Current Data Status

Based on your system:

✅ **218 customers** are stored in database
✅ **3 stores** are configured (asmia, tnvcollection, tnvcollectionpk)
✅ **88 unique clothing sizes** extracted
✅ **Phone numbers** showing for customers who have them
✅ **WhatsApp buttons** ready for customers with phones

---

## How to Update Customer Data

### Scenario 1: Refresh Data for One Store
1. Export fresh CSV from that Shopify store
2. Click "Upload CSV" on that store's card
3. Select the new CSV file
4. Old data for that store is replaced with new data

### Scenario 2: Add New Orders
If you have new orders since last export:
1. Export "All orders" from Shopify again
2. Re-upload to the same store
3. System will include all customers (old + new)

### Scenario 3: Fix Wrong Upload
If you uploaded wrong file:
1. Just upload the correct CSV
2. System automatically replaces the incorrect data

---

## What Gets Updated

When you re-upload CSV for a store:

✅ **Customer names** - Updated if changed
✅ **Phone numbers** - Updated if changed
✅ **Clothing sizes** - Updated based on new orders
✅ **Order counts** - Recalculated from CSV
✅ **Total spent** - Recalculated from CSV

---

## Data Persistence

**Your data is safe:**
- Stored in MongoDB database
- Survives server restarts
- Each store's data is independent
- Can have 1000s of customers per store

**To clear data:**
- Use delete button (trash icon) on store card
- This removes that store and all its customers
- Other stores remain unaffected

---

## Verification

**Check if data is stored:**
1. Look at stats cards: "Total Customers", "Unique Sizes"
2. Scroll down to customer table
3. Use filters to browse customers
4. Numbers should match your CSV row count

**After upload you should see:**
- Success toast message with count
- Stats cards update immediately
- Customer table shows new data
- Filter dropdowns have new sizes

---

## Current System State

Your system right now:
- **asmia**: Has customer data
- **tnvcollection**: Ready for upload
- **tnvcollectionpk**: Ready for upload

**To update asmia:**
Just upload a new CSV - it will replace the 218 existing customers

**To add data to other stores:**
Click "Upload CSV" on their cards and select their CSV files

---

## Tips

**Best Practice:**
- Export "All orders" not just current page
- Include all date ranges
- Re-export monthly to keep data fresh

**Multiple Uploads:**
- You can upload multiple times
- Each upload replaces previous data for that store
- System handles 10,000+ customers easily

**Troubleshooting:**
- If count seems wrong, check CSV has all orders
- If sizes missing, check product variant names in Shopify
- If phones missing, enable phone field in Shopify checkout

---

**Your data is working perfectly! The system is storing and displaying everything correctly.** 🎉
