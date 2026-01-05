"""
Translation Service
Handles Chinese to English translation for product data using LLM
"""

import re
import os
from typing import Dict, Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Translation setup
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")


async def translate_to_english(text: str, context: str = "product") -> str:
    """
    Translate Chinese text to English using GPT.
    
    Args:
        text: Text to translate
        context: Context hint for translation (product, title, description, etc.)
    
    Returns:
        Translated text or original if translation fails/not needed
    """
    if not text or not EMERGENT_LLM_KEY:
        return text
    
    # Check if text is mostly Chinese
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    if chinese_chars < 3:  # Less than 3 Chinese characters, skip translation
        return text
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"translate_{hash(text) % 10000}",
            system_message="You are a professional e-commerce translator. Translate Chinese product text to English. Keep translations concise, natural, and suitable for online stores. Only return the translation, no explanations."
        ).with_model("openai", "gpt-4o-mini")  # Use faster model for translations
        
        prompt = f"Translate this {context} to English:\n\n{text}"
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return response.strip() if response else text
        
    except Exception as e:
        logger.error(f"Translation error: {e}")
        return text


async def translate_product(product: Dict) -> Dict:
    """
    Translate all text fields in a product dictionary.
    
    Args:
        product: Product dictionary with Chinese text fields
    
    Returns:
        Product dictionary with translated fields (preserves originals as *_original)
    """
    translated = dict(product)
    
    # Translate title
    if product.get("title"):
        translated["title_original"] = product["title"]
        translated["title"] = await translate_to_english(product["title"], "product title")
    
    # Translate description (if not too long)
    if product.get("description"):
        desc = product["description"]
        # Clean HTML and limit length for translation
        clean_desc = re.sub(r'<[^>]+>', ' ', desc)
        clean_desc = re.sub(r'\s+', ' ', clean_desc).strip()[:500]
        if clean_desc:
            translated["description_original"] = product["description"]
            translated["description"] = await translate_to_english(clean_desc, "product description")
    
    # Translate variant attributes
    if product.get("variants"):
        for variant in translated["variants"]:
            for attr in variant.get("attributes", []):
                if attr.get("attributeName"):
                    attr["attributeName_original"] = attr["attributeName"]
                    attr["attributeName"] = await translate_to_english(attr["attributeName"], "attribute name")
                if attr.get("attributeValue"):
                    attr["attributeValue_original"] = attr["attributeValue"]
                    attr["attributeValue"] = await translate_to_english(attr["attributeValue"], "attribute value")
    
    translated["translated"] = True
    translated["translation_date"] = datetime.now(timezone.utc).isoformat()
    
    return translated


async def translate_text_batch(texts: list, context: str = "product") -> list:
    """
    Translate a batch of texts.
    
    Args:
        texts: List of texts to translate
        context: Context hint for translation
    
    Returns:
        List of translated texts
    """
    results = []
    for text in texts:
        translated = await translate_to_english(text, context)
        results.append(translated)
    return results


def has_chinese_text(text: str) -> bool:
    """Check if text contains Chinese characters"""
    if not text:
        return False
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    return chinese_chars >= 3


def extract_chinese_text(text: str) -> str:
    """Extract only Chinese characters from text"""
    if not text:
        return ""
    return ''.join(re.findall(r'[\u4e00-\u9fff]', text))
