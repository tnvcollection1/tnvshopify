# Shopify API Setup Instructions

## Current Issue
Your Shopify API token lacks the required **read_orders** permission scope. This prevents the system from fetching customer order data.

## How to Fix (Step-by-Step)

### 1. Access Shopify Admin
- Go to your Shopify admin panel: https://ashmiaa.myshopify.com/admin

### 2. Navigate to Apps
- Click on **Settings** (bottom left)
- Click on **Apps and sales channels**
- Click on **Develop apps** (or **Create custom app**)

### 3. Edit Your Custom App
- Find the custom app you created for this integration
- Click on **Configure**

### 4. Update API Scopes
Under **Admin API access scopes**, make sure these are checked:
- ✅ **read_orders** - Required to fetch order data
- ✅ **read_customers** - Required to access customer information
- ✅ **read_products** - Required to read product variants (shoe sizes)

### 5. Save and Reinstall
- Click **Save**
- You may need to click **Install app** again
- Generate a new **Admin API access token**

### 6. Update Your Token (If Changed)
If a new token was generated, you'll need to update it in the system. The current token in the system is:
```
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
```

### 7. Test the Sync
Once permissions are updated:
1. Open your dashboard: https://b2b-saas.preview.emergentagent.com
2. Click the **"Sync Shopify Data"** button
3. Wait for the sync to complete
4. You should see your 20,000+ customers loaded!

## What the System Does

Once syncing works, the system will:
1. Fetch all orders from Shopify
2. Extract customer information (name, email, phone, country)
3. Extract shoe sizes from product variants
4. Group customers by their purchased shoe sizes
5. Store everything in MongoDB for fast filtering

## Features Available

- **Filter by Shoe Size** - View customers who bought specific sizes
- **Search Customers** - Search by name, email, or phone
- **WhatsApp Integration** - Click WhatsApp button to message any customer
- **Bulk Messaging** - Message all filtered customers at once
- **Real-time Stats** - See total customers, unique sizes, and filtered results

## Need Help?

If you're still having issues after updating the permissions, the error might be:
1. Token not updated correctly
2. App not reinstalled after permission change
3. Shopify admin access level insufficient

Contact Shopify support if you can't access the app permissions in your admin panel.
