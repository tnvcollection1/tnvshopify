import json, requests, time

SHOP_URL = "tnvcollection.myshopify.com"
ACCESS_TOKEN = "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"
headers = {"X-Shopify-Access-Token": ACCESS_TOKEN, "Content-Type": "application/json"}

with open('/app/backend/scripts/c_ok_publish.json', 'r') as f:
    to_publish = json.load(f)

total = len(to_publish)
print(f"Publishing {total} products...", flush=True)

success = 0
fail = 0
for i, item in enumerate(to_publish, 1):
    pid = item["id"]
    while True:
        url = f"https://{SHOP_URL}/admin/api/2024-01/products/{pid}.json"
        payload = {"product": {"id": pid, "status": "active"}}
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
    if i % 20 == 0:
        print(f"Progress: {i}/{total} ({success} ok, {fail} fail)", flush=True)
    time.sleep(0.55)

print(f"\nDONE: Published {success}/{total}, Failed: {fail}", flush=True)
