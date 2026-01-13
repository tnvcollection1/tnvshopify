# CSV Upload Guide - Complete Customer Data Import

## ✅ System Updated for Multi-Store Support!

Your system now supports:
- **3 stores** - Upload separate CSV files for each store
- **Complete customer data** - Names, phone numbers, sizes from CSV
- **WhatsApp messaging** - Works with phone numbers from CSV
- **Store filtering** - Filter customers by store

---

## How to Export from Shopify

### For Each of Your 3 Stores:

1. **Login to Shopify Admin** for Store 1
   - Go to: https://[your-store-1].myshopify.com/admin

2. **Navigate to Orders**
   - Click on **"Orders"** in the left sidebar

3. **Export All Orders**
   - Click the **"Export"** button (top right)
   - Select **"All orders"** (not just current page)
   - Choose format: **CSV for Excel, Numbers, or other spreadsheet programs**
   - Click **"Export orders"**

4. **Download the CSV File**
   - File will be named something like: `orders_export_1.csv`
   - Rename it to identify your store: `store1_orders.csv`

5. **Repeat for Store 2 and Store 3**

---

## Expected CSV Format

Shopify exports will include these columns (the system will extract):

### Customer Information:
- **Shipping Name** / **Billing Name** → Customer Name
- **Shipping Phone** / **Billing Phone** → Phone Number
- **Email** → Email Address
- **Shipping Country** / **Billing Country** → Country Code

### Order Information:
- **Lineitem name** → Product name (sizes extracted from here)
- **Total** → Order amount
- **Created at** → Order date

### Size Extraction:
The system automatically extracts sizes from product variant names:
- "Dress - M" → Size: M
- "Suit / Large" → Size: Large
- "3PC UNSTITCHED / BLUE" → Size: UNSTITCHED

---

## How to Upload CSV Files

### Step 1: Open the Dashboard
Go to: https://merchant-platform-12.preview.emergentagent.com

### Step 2: Upload First Store
1. Click the **"Upload CSV"** button (green button, top right)
2. Select your `store1_orders.csv` file
3. When prompted, enter store name: **"Store 1"** (or your actual store name)
4. Wait for upload to complete

### Step 3: Upload Second Store
1. Click **"Upload CSV"** again
2. Select your `store2_orders.csv` file
3. Enter store name: **"Store 2"**
4. Wait for upload

### Step 4: Upload Third Store
1. Click **"Upload CSV"** again
2. Select your `store3_orders.csv` file
3. Enter store name: **"Store 3"**
4. Wait for upload

---

## After Upload - What You'll See

### Automatic Data Extraction:
✅ **Customer Names** - From shipping/billing addresses
✅ **Phone Numbers** - From order addresses
✅ **Clothing Sizes** - From product variants
✅ **Country Codes** - For WhatsApp country dial codes
✅ **Order History** - Count and total spent
✅ **Store Assignment** - Each customer tagged with store name

### Filter by Store:
- Use the **"Store"** dropdown in filter section
- Select specific store or "All Stores"
- View customers from that store only

### Filter by Size:
- Use the **"Clothing Size"** dropdown
- Select size (M, L, XL, Unstitched, etc.)
- See all customers who bought that size

### WhatsApp Messaging:
- **Individual**: Click WhatsApp button on any customer row
- **Bulk**: Filter customers, then click "Message X Customers"
- Opens WhatsApp Web/Desktop for each customer

---

## Sample CSV Structure

Your Shopify export will look like this:

```csv
Name,Email,Shipping Name,Shipping Phone,Shipping Country,Lineitem name,Total,Created at
Order #1001,customer@email.com,John Doe,+923001234567,PK,Dress - M,5000,2025-11-28
Order #1002,jane@email.com,Jane Smith,+923009876543,PK,3PC UNSTITCHED / BLUE,8000,2025-11-27
```

The system will extract:
- Customer: John Doe, Phone: +923001234567, Size: M
- Customer: Jane Smith, Phone: +923009876543, Size: UNSTITCHED

---

## Troubleshooting

### If Upload Fails:
- ✅ Make sure file is `.csv` format
- ✅ File should be from Shopify orders export
- ✅ Check file size (large files may take time)
- ✅ Ensure CSV has proper columns

### If No Phone Numbers:
- Check if your Shopify orders collected phone numbers
- Orders might not have phone if customers didn't provide
- System will show "No phone" for those customers

### If Sizes Show as "Unknown":
- Product variants might not have size in the name
- Check your Shopify product setup
- Update product variant names to include sizes

---

## Benefits of CSV Upload

### vs. API Sync:
- ✅ **No API limits** - Get all 10,000+ orders
- ✅ **Complete data** - Names and phones included
- ✅ **Historical orders** - No date restrictions
- ✅ **Faster** - One-time upload vs. continuous API calls
- ✅ **Reliable** - No dependency on API access level

---

## Next Steps

1. **Export CSV** from all 3 Shopify stores
2. **Upload** each CSV with unique store name
3. **Verify** data in the dashboard
4. **Filter** by store and size
5. **Start messaging** customers via WhatsApp!

---

## Need Help?

If you encounter any issues:
- Check CSV file format matches Shopify export
- Ensure phone numbers are present in orders
- Verify product names include size information
- Try uploading a small test file first (50-100 orders)

**The system is ready to handle all your customer data from all 3 stores!** 🎉
