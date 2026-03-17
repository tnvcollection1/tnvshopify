import json, requests, time

SHOP_URL = "tnvcollection.myshopify.com"
ACCESS_TOKEN = "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"
headers = {"X-Shopify-Access-Token": ACCESS_TOKEN, "Content-Type": "application/json"}

with open('/app/backend/scripts/unpublish_non_matching.json', 'r') as f:
    to_unpublish = json.load(f)

total = len(to_unpublish)
print(f"Starting unpublish of {total} products...", flush=True)

success = 0
fail = 0
for i, item in enumerate(to_unpublish, 1):
    pid = item["id"]
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
            print(f"FAILED: {pid} - {item['title']} - {resp.status_code}", flush=True)
            break
    if i % 50 == 0:
        print(f"Progress: {i}/{total} ({success} ok, {fail} fail)", flush=True)
    time.sleep(0.55)

print(f"\nDONE: Unpublished {success}/{total}, Failed: {fail}", flush=True)
