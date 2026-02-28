"""
Batch product title optimizer for tnvcollectionpk Shopify store.
Rewrites machine-translated Chinese titles to natural, SEO-friendly English.
Also translates Chinese variant options (colors, styles) to English.
"""
import asyncio
import json
import re
import os
import time
import requests
from datetime import datetime, timezone

SHOP = "tnvcollectionpk.myshopify.com"
TOKEN = "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"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "sk-emergent-11c245614762d5b4a6")
HEADERS = {"X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json"}
PROGRESS_FILE = "/tmp/title_optimization_progress.json"
ANALYSIS_FILE = "/tmp/product_analysis.json"
BATCH_SIZE = 8  # Products per LLM call

# Common Chinese color/style translations
CHINESE_TRANSLATIONS = {
    "黑色": "Black", "白色": "White", "红色": "Red", "蓝色": "Blue",
    "绿色": "Green", "黄色": "Yellow", "灰色": "Gray", "粉色": "Pink",
    "紫色": "Purple", "橙色": "Orange", "棕色": "Brown", "米色": "Beige",
    "卡其色": "Khaki", "酒红色": "Wine Red", "深蓝色": "Navy Blue",
    "浅蓝色": "Light Blue", "天蓝色": "Sky Blue", "湖蓝色": "Lake Blue",
    "藏青色": "Navy", "墨绿色": "Dark Green", "军绿色": "Army Green",
    "草绿色": "Grass Green", "深灰色": "Dark Gray", "浅灰色": "Light Gray",
    "灰黑色": "Dark Gray", "咖啡色": "Coffee Brown", "褐色": "Brown",
    "驼色": "Camel", "杏色": "Apricot", "银色": "Silver", "金色": "Gold",
    "套脚款": "Slip-On", "系带款": "Lace-Up", "加绒款": "Fleece-Lined",
    "单鞋": "Single Shoe", "加绒": "Fleece-Lined", "标准码": "Standard Size",
    "偏大": "Runs Large", "偏小": "Runs Small", "均码": "One Size",
}


def has_chinese(text):
    return bool(re.search(r'[\u4e00-\u9fff]', str(text)))


def translate_variant_option(text):
    """Translate Chinese variant option to English using dictionary."""
    if not has_chinese(text):
        return text
    # Try exact match first
    if text in CHINESE_TRANSLATIONS:
        return CHINESE_TRANSLATIONS[text]
    # Try splitting by / and translating parts
    parts = text.split(" / ")
    translated_parts = []
    for part in parts:
        part = part.strip()
        if part in CHINESE_TRANSLATIONS:
            translated_parts.append(CHINESE_TRANSLATIONS[part])
        elif has_chinese(part):
            # Try partial match - find Chinese substring
            result = part
            for cn, en in sorted(CHINESE_TRANSLATIONS.items(), key=lambda x: -len(x[0])):
                result = result.replace(cn, en)
            translated_parts.append(result)
        else:
            translated_parts.append(part)
    return " / ".join(translated_parts)


def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {"processed_ids": [], "failed_ids": [], "started_at": datetime.now(timezone.utc).isoformat()}


def save_progress(progress):
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f, indent=2)


async def improve_titles_batch(products_batch):
    """Use LLM to improve a batch of product titles."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    titles_text = ""
    for i, p in enumerate(products_batch):
        titles_text += f"{i+1}. ID:{p['id']} | Current: {p['title']}\n"

    system_msg = """You are a professional e-commerce copywriter specializing in men's fashion and footwear for the Pakistani market. 
Your task is to rewrite awkwardly machine-translated product titles into natural, SEO-friendly English titles.

Rules:
- Keep titles concise (under 80 characters ideally)
- Remove year prefixes (2023, 2024, etc.)
- Remove redundant words and marketing fluff
- Use proper product naming conventions
- Keep key product features (material, style type)
- Make titles suitable for an online shoe/clothing store
- DO NOT include brand names unless they were in the original
- Respond ONLY with the JSON array, no other text"""

    user_msg = f"""Rewrite these product titles. Return ONLY a JSON array of objects with "id" and "new_title" fields:

{titles_text}

Example response format:
[{{"id": 123, "new_title": "Men's Casual Leather Loafers - Black"}}]"""

    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"title-opt-{int(time.time())}",
        system_message=system_msg
    ).with_model("openai", "gpt-4o-mini").with_params(temperature=0.3)

    response = await chat.send_message(UserMessage(text=user_msg))

    # Parse JSON from response
    # Try to extract JSON array from the response
    json_match = re.search(r'\[.*\]', response, re.DOTALL)
    if json_match:
        return json.loads(json_match.group())
    return []


def update_product_title(product_id, new_title):
    """Update a product title via Shopify API."""
    url = f"https://{SHOP}/admin/api/2024-01/products/{product_id}.json"
    payload = {"product": {"id": product_id, "title": new_title}}
    r = requests.put(url, headers=HEADERS, json=payload)
    return r.status_code == 200, r.text


def update_variant_options(product_id):
    """Fetch product variants and translate any Chinese options."""
    url = f"https://{SHOP}/admin/api/2024-01/products/{product_id}.json?fields=id,variants,options"
    r = requests.get(url, headers=HEADERS)
    if r.status_code != 200:
        return False, "Failed to fetch product"

    product = r.json().get('product', {})
    variants = product.get('variants', [])
    options = product.get('options', [])
    updated_count = 0

    # First, update option names if they have Chinese
    for opt in options:
        if has_chinese(opt.get('name', '')):
            translated = translate_variant_option(opt['name'])
            if translated != opt['name']:
                opt['name'] = translated

    # Update variant option values
    for variant in variants:
        needs_update = False
        for key in ['option1', 'option2', 'option3']:
            val = variant.get(key)
            if val and has_chinese(val):
                translated = translate_variant_option(val)
                if translated != val:
                    variant[key] = translated
                    needs_update = True

        if needs_update:
            vurl = f"https://{SHOP}/admin/api/2024-01/variants/{variant['id']}.json"
            payload = {"variant": {
                "id": variant['id'],
                "option1": variant.get('option1'),
                "option2": variant.get('option2'),
                "option3": variant.get('option3'),
            }}
            vr = requests.put(vurl, headers=HEADERS, json=payload)
            if vr.status_code == 200:
                updated_count += 1
            time.sleep(0.3)

    return True, f"Updated {updated_count} variants"


async def run():
    # Load analysis data
    with open(ANALYSIS_FILE) as f:
        analysis = json.load(f)

    all_products = analysis['products_needing_fix'] + analysis['products_chinese_variants']
    progress = load_progress()
    processed_ids = set(progress.get('processed_ids', []))
    failed_ids = progress.get('failed_ids', [])

    # Filter out already processed
    remaining = [p for p in all_products if p['id'] not in processed_ids]
    total_to_process = len(remaining)

    print(f"\n{'='*60}")
    print(f"Product Title Optimizer - tnvcollectionpk")
    print(f"{'='*60}")
    print(f"Total products to fix: {len(all_products)}")
    print(f"Already processed: {len(processed_ids)}")
    print(f"Remaining: {total_to_process}")
    print(f"{'='*60}\n")

    batch_num = 0
    for i in range(0, total_to_process, BATCH_SIZE):
        batch = remaining[i:i + BATCH_SIZE]
        batch_num += 1
        print(f"\n--- Batch {batch_num} ({i+1}-{min(i+BATCH_SIZE, total_to_process)} of {total_to_process}) ---")

        # Step 1: Get improved titles from LLM
        try:
            improved = await improve_titles_batch(batch)
        except Exception as e:
            print(f"  LLM Error: {e}")
            for p in batch:
                failed_ids.append({"id": p['id'], "error": str(e)})
            progress['failed_ids'] = failed_ids
            save_progress(progress)
            time.sleep(2)
            continue

        # Create lookup
        title_map = {item['id']: item['new_title'] for item in improved}

        # Step 2: Update each product
        for p in batch:
            pid = p['id']
            new_title = title_map.get(pid)

            if new_title:
                ok, msg = update_product_title(pid, new_title)
                if ok:
                    print(f"  [OK] {pid}: '{p['title'][:50]}...' -> '{new_title}'")
                else:
                    print(f"  [FAIL] {pid}: Title update failed - {msg[:100]}")
                    failed_ids.append({"id": pid, "error": f"Title update: {msg[:100]}"})
                time.sleep(0.5)
            else:
                print(f"  [SKIP] {pid}: No improved title returned by LLM")

            # Step 3: Fix Chinese variants if any
            if p.get('chinese_variants'):
                vok, vmsg = update_variant_options(pid)
                print(f"  [VARIANT] {pid}: {vmsg}")

            processed_ids.add(pid)

        # Save progress after each batch
        progress['processed_ids'] = list(processed_ids)
        progress['failed_ids'] = failed_ids
        progress['last_batch'] = batch_num
        progress['last_updated'] = datetime.now(timezone.utc).isoformat()
        save_progress(progress)

        # Rate limit: ~2 second pause between batches
        time.sleep(2)

    # Final summary
    print(f"\n{'='*60}")
    print(f"COMPLETE!")
    print(f"Processed: {len(processed_ids)}")
    print(f"Failed: {len(failed_ids)}")
    print(f"{'='*60}")

    progress['completed'] = True
    progress['completed_at'] = datetime.now(timezone.utc).isoformat()
    save_progress(progress)


if __name__ == "__main__":
    asyncio.run(run())
