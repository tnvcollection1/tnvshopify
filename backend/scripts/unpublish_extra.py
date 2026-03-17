import csv, json, requests, time

SHOP_URL = "tnvcollection.myshopify.com"
ACCESS_TOKEN = "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"
headers = {"X-Shopify-Access-Token": ACCESS_TOKEN, "Content-Type": "application/json"}

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

matched_products = set()
for sku, info in shopify_skus.items():
    if sku.lower() in ok_skus:
        matched_products.add(info["product_id"])

extra_active = {}
for sku, info in shopify_skus.items():
    pid = info["product_id"]
    if pid not in matched_products and info["status"] == "active":
        if pid not in extra_active:
            extra_active[pid] = info["title"]

total = len(extra_active)
print(f"Starting unpublish of {total} products...", flush=True)

success = 0
fail = 0
for i, (pid, title) in enumerate(extra_active.items(), 1):
    url = f"https://{SHOP_URL}/admin/api/2024-01/products/{pid}.json"
    payload = {"product": {"id": pid, "status": "draft"}}
    resp = requests.put(url, headers=headers, json=payload)
    if resp.status_code == 200:
        success += 1
    else:
        fail += 1
        print(f"FAILED: {pid} - {title} - {resp.status_code}", flush=True)
    
    if i % 50 == 0:
        print(f"Progress: {i}/{total} ({success} ok, {fail} fail)", flush=True)
    
    time.sleep(0.5)

print(f"\nDONE: Unpublished {success}/{total}, Failed: {fail}", flush=True)
