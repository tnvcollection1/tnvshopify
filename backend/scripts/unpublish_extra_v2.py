import csv, json, requests, time

SHOP_URL = "tnvcollection.myshopify.com"
ACCESS_TOKEN = "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"
headers = {"X-Shopify-Access-Token": ACCESS_TOKEN, "Content-Type": "application/json"}

# First, fetch FRESH product list to know current status
print("Fetching fresh product list from Shopify...", flush=True)
all_products = []
url = f"https://{SHOP_URL}/admin/api/2024-01/products.json?limit=250&fields=id,title,status&status=active"
page = 0
while url:
    page += 1
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        print(f"Fetch error: {resp.status_code}", flush=True)
        time.sleep(2)
        continue
    data = resp.json()
    products = data.get("products", [])
    all_products.extend(products)
    link_header = resp.headers.get("Link", "")
    url = None
    if 'rel="next"' in link_header:
        for part in link_header.split(","):
            if 'rel="next"' in part:
                url = part.split("<")[1].split(">")[0]
                break
    time.sleep(0.5)

print(f"Total active products on Shopify: {len(all_products)}", flush=True)

# Get ok SKUs from sheet
with open('/app/backend/scripts/shopify_skus.json', 'r') as f:
    shopify_skus = json.load(f)

with open('/app/backend/scripts/sheet_skus.csv', 'r') as f:
    reader = csv.reader(f)
    header = next(reader)
    ok_skus = set()
    for row in reader:
        sku = row[4].strip() if len(row) > 4 else ""
        col_o = row[14].strip() if len(row) > 14 else ""
        if sku and col_o.lower() == "ok":
            ok_skus.add(sku.lower())

# Find product IDs that should stay active
keep_active = set()
for sku, info in shopify_skus.items():
    if sku.lower() in ok_skus:
        keep_active.add(info["product_id"])

# Filter active products that need to be unpublished
to_unpublish = [(p["id"], p["title"]) for p in all_products if p["id"] not in keep_active]
print(f"Products to unpublish: {len(to_unpublish)}", flush=True)
print(f"Products to keep active: {len(all_products) - len(to_unpublish)}", flush=True)

# Unpublish with proper rate limiting
success = 0
fail = 0
total = len(to_unpublish)

for i, (pid, title) in enumerate(to_unpublish, 1):
    while True:
        url = f"https://{SHOP_URL}/admin/api/2024-01/products/{pid}.json"
        payload = {"product": {"id": pid, "status": "draft"}}
        resp = requests.put(url, headers=headers, json=payload)
        
        if resp.status_code == 200:
            success += 1
            break
        elif resp.status_code == 429:
            retry_after = float(resp.headers.get("Retry-After", 2))
            time.sleep(retry_after)
            continue
        else:
            fail += 1
            print(f"FAILED: {pid} - {title} - {resp.status_code}", flush=True)
            break
    
    if i % 50 == 0:
        print(f"Progress: {i}/{total} ({success} ok, {fail} fail)", flush=True)
    
    time.sleep(0.55)

print(f"\nDONE: Unpublished {success}/{total}, Failed: {fail}", flush=True)
