# Updated: Data Now Merges Instead of Replacing!

## ✅ New Behavior (Merge/Append)

### When You Upload CSV:

**First Upload (218 customers):**
- All 218 customers added to database
- Total: 218 customers

**Second Upload (2485 customers):**
- System checks each customer:
  - If phone/customer_id exists → **UPDATE** existing customer
  - If new customer → **ADD** to database
- Result: 218 + new customers = More total customers!

**Third Upload (another file):**
- Again checks and merges
- Keeps growing your customer base

---

## How Matching Works

The system identifies existing customers by:

1. **Phone Number** (Primary)
   - If phone exists in new CSV and matches existing customer
   - Updates that customer's data

2. **Customer ID** (Fallback)
   - If no phone, uses customer_id
   - Updates if customer_id matches

**Example:**
```
Existing: John Doe, +923001234567, Size: M
New CSV:  John Doe, +923001234567, Size: L

Result:   John Doe, +923001234567, Sizes: M, L (merged)
```

---

## What Gets Merged/Updated

**For Existing Customers:**
- ✅ **Sizes**: Merged (keeps all unique sizes)
- ✅ **Order Count**: Added together (5 + 3 = 8 orders)
- ✅ **Total Spent**: Added together ($100 + $50 = $150)
- ✅ **Last Order Date**: Keeps most recent
- ✅ **Name/Email/Phone**: Updates if blank, keeps if exists

**For New Customers:**
- ✅ Simply added to database

**Example Scenario:**

**Current Database:**
- Customer A: 5 orders, Size M, $100 spent
- Customer B: 3 orders, Size L, $50 spent
- Total: 2 customers

**Upload New CSV with:**
- Customer A: 2 new orders, Size XL, $40 spent
- Customer C: 1 order, Size S, $30 spent

**After Merge:**
- Customer A: 7 orders (5+2), Sizes: M, XL, $140 spent ($100+$40) ✅ Updated
- Customer B: 3 orders, Size L, $50 spent ✅ Unchanged
- Customer C: 1 order, Size S, $30 spent ✅ New
- **Total: 3 customers** (2 + 1 new)

---

## Your Use Case

**Current State:**
- asmia: 218 customers
- tnvcollection: 0 customers
- tnvcollectionpk: 0 customers

**When you upload 2485 customers to asmia:**
- System checks all 2485 customers
- If any match existing 218 (by phone) → Updates them
- If new customers → Adds them
- **Result: 218 + (2485 - matches) = Much more customers!**

**Example:**
- If 50 customers match existing → Updates 50, Adds 2435 new
- **New total: 218 + 2435 = 2653 customers in asmia**

---

## Success Message

After upload, you'll see:
```
✅ Added 2435 new, updated 50 existing. Total: 2653 customers in asmia
```

This tells you:
- **2435 new customers** added
- **50 existing customers** updated
- **2653 total customers** now in that store

---

## Benefits

**No Data Loss:**
- Old customers stay in database
- New customers added
- Existing customers updated with latest info

**Growing Database:**
- First export: 218 customers
- Second export: +2485 = 2703 total (minus duplicates)
- Third export: Keeps growing

**Accurate Order Counts:**
- If same customer appears in multiple CSVs
- Order counts accumulate correctly
- Total spent accumulates correctly

---

## To Reset/Clear Data

**If you want to start fresh:**
1. Click trash icon on store card
2. Deletes that store and ALL its customers
3. Re-add the store
4. Upload CSV again

**To replace all data:**
1. Delete the store
2. Re-add the store with same name
3. Upload fresh CSV
4. Starts from 0 again

---

## Testing It

**Upload your 2485 customer CSV to asmia:**
1. Click "Upload CSV" on asmia card
2. Select your larger CSV file
3. Wait for upload
4. Check success message:
   - Shows how many added vs updated
   - Shows new total count
5. Verify total customers increased!

---

**Your system now accumulates data instead of replacing it!** 📈
