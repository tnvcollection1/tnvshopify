# How to Upload Your Customer Data

## Quick Start (3 Simple Steps)

### Step 1: Export from Shopify
For each of your 3 stores:

1. Login to Shopify Admin: `https://[your-store].myshopify.com/admin`
2. Click **"Orders"** in left sidebar
3. Click **"Export"** button (top right)
4. Select **"All orders"**
5. Choose CSV format
6. Click **"Export orders"**
7. Save as: `store1_orders.csv`, `store2_orders.csv`, `store3_orders.csv`

### Step 2: Upload to System
1. Open: https://dropship-hub-154.preview.emergentagent.com
2. Click **"Upload Customer Data (CSV)"** button (green, top right)
3. Select your CSV file
4. When prompted, enter store name (e.g., "Store 1")
5. Wait for upload to complete
6. Repeat for other stores

### Step 3: Start Using
- **Filter by Store**: Use store dropdown to view specific store customers
- **Filter by Size**: Use clothing size dropdown (M, L, XL, etc.)
- **Search**: Type name, email, or phone number
- **WhatsApp**: Click WhatsApp button on any customer row
- **Bulk Message**: Filter customers, then click "Message X Customers"

---

## What Gets Extracted from CSV

The system automatically extracts:

✅ **Customer Name** - From shipping/billing name
✅ **Phone Number** - From shipping/billing/phone columns
✅ **Email** - From email column
✅ **Country Code** - From shipping/billing country
✅ **Clothing Sizes** - From product variant names (lineitem name)
✅ **Order Count** - Number of orders per customer
✅ **Order Date** - Last order date
✅ **Total Spent** - Total order value

---

## Size Extraction Examples

Your CSV will have product names like:
- "Dress - M" → Extracts size: **M**
- "3PC UNSTITCHED / BLUE" → Extracts size: **UNSTITCHED**
- "Suit | Large" → Extracts size: **Large**
- "Red Dress" → Shows as: **Unknown** (no size found)

---

## CSV Format (From Shopify)

Your Shopify export will have columns like:
```
Name, Email, Shipping Name, Shipping Phone, Shipping Country, 
Lineitem name, Total, Created at, Billing Name, Billing Phone, etc.
```

The system reads all these columns automatically - you don't need to modify the CSV!

---

## Tips

**For Multiple Stores:**
- Upload each store's CSV separately
- Use clear names: "Main Store", "Store 2", "Outlet Store"
- You can re-upload to update data (replaces old data for that store)

**For Best Results:**
- Export "All orders" not just current page
- Include all date ranges
- Make sure phone numbers are in your Shopify orders

**If No Phone Numbers:**
- Check if your Shopify collects phone during checkout
- Enable phone field in: Shopify Settings → Checkout
- For existing orders without phones, you may need to add manually

---

## Troubleshooting

**Upload fails:**
- Make sure file is `.csv` format
- Check file size (very large files may need splitting)
- Ensure it's from Shopify orders export

**No customers showing:**
- CSV might be empty or wrong format
- Check browser console for errors
- Try uploading a small test file first

**Sizes show as "Unknown":**
- Product names don't include size information
- Update Shopify product variant names to include sizes

---

## Need Help?

The system is ready to handle:
- ✅ Unlimited orders (no 499 limit like API)
- ✅ All 3 stores separately
- ✅ 10,000+ customers total
- ✅ Complete customer data with phone numbers

Just upload your CSV files and start managing your customers! 🚀
