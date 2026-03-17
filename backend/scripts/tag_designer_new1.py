import requests, time, json

SHOP_URL = "tnvcollection.myshopify.com"
ACCESS_TOKEN = "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"
headers = {"X-Shopify-Access-Token": ACCESS_TOKEN, "Content-Type": "application/json"}

# Fetch all products from Designer Shoes collection (ID: 619970585)
collection_id = 619970585
products = []
url = f"https://{SHOP_URL}/admin/api/2024-01/products.json?collection_id={collection_id}&limit=250&fields=id,title,tags"

while url:
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        print(f"Fetch error: {resp.status_code}", flush=True)
        break
    data = resp.json()
    products.extend(data.get("products", []))
    link_header = resp.headers.get("Link", "")
    url = None
    if 'rel="next"' in link_header:
        for part in link_header.split(","):
            if 'rel="next"' in part:
                url = part.split("<")[1].split(">")[0]
                break
    time.sleep(0.5)

print(f"Total products in Designer Shoes collection: {len(products)}", flush=True)

# Tag each product with "new1"
success = 0
fail = 0
already_tagged = 0
total = len(products)

for i, p in enumerate(products, 1):
    pid = p["id"]
    existing_tags = p.get("tags", "")
    
    # Check if already tagged
    tag_list = [t.strip() for t in existing_tags.split(",") if t.strip()]
    if "new1" in tag_list:
        already_tagged += 1
        continue
    
    # Add new1 tag
    tag_list.append("new1")
    new_tags = ", ".join(tag_list)
    
    while True:
        url = f"https://{SHOP_URL}/admin/api/2024-01/products/{pid}.json"
        payload = {"product": {"id": pid, "tags": new_tags}}
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
            print(f"FAILED: {pid} - {p['title']} - {resp.status_code}", flush=True)
            break
    
    if i % 50 == 0:
        print(f"Progress: {i}/{total} ({success} tagged, {already_tagged} already, {fail} fail)", flush=True)
    
    time.sleep(0.55)

print(f"\nDONE: Tagged {success}/{total}, Already tagged: {already_tagged}, Failed: {fail}", flush=True)
