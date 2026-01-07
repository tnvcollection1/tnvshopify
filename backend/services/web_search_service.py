"""
Web Search Service for Competitor Analysis
Fallback search using product titles when image search yields no results
"""
import os
import logging
import httpx
import re
from typing import List, Dict, Any, Optional
from urllib.parse import quote_plus
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class WebSearchService:
    """Service for searching competitors by product title using web scraping"""
    
    def __init__(self):
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    
    async def search_by_title(
        self, 
        product_title: str, 
        category: str = "general",
        max_results: int = 20
    ) -> Dict[str, Any]:
        """
        Search for competitor products using product title.
        Uses DuckDuckGo HTML search as a fallback.
        
        Args:
            product_title: The product title to search for
            category: Product category for filtering
            max_results: Maximum number of results to return
        
        Returns:
            Dictionary with competitor URLs and metadata
        """
        try:
            # Clean up the product title for search
            clean_title = self._clean_search_query(product_title)
            
            # Add shopping-related keywords to improve results
            search_query = f"{clean_title} buy price online shop"
            
            logger.info(f"[Web Search] Searching for: {search_query}")
            
            # Try DuckDuckGo HTML search (no API key needed)
            results = await self._search_duckduckgo(search_query, max_results)
            
            if results:
                logger.info(f"[Web Search] Found {len(results)} results via DuckDuckGo")
                return {
                    "success": True,
                    "search_method": "title_search",
                    "query": clean_title,
                    "pages_with_matching_products": results,
                    "web_entities": self._extract_entities(product_title),
                    "best_guess_labels": [clean_title],
                    "competitor_count": len(results)
                }
            
            # Try Google Shopping scrape as backup
            google_results = await self._search_google_shopping(clean_title, max_results)
            
            if google_results:
                logger.info(f"[Web Search] Found {len(google_results)} results via Google Shopping")
                return {
                    "success": True,
                    "search_method": "google_shopping",
                    "query": clean_title,
                    "pages_with_matching_products": google_results,
                    "web_entities": self._extract_entities(product_title),
                    "best_guess_labels": [clean_title],
                    "competitor_count": len(google_results)
                }
            
            return {
                "success": False,
                "search_method": "title_search",
                "query": clean_title,
                "pages_with_matching_products": [],
                "error": "No results found",
                "competitor_count": 0
            }
            
        except Exception as e:
            logger.error(f"[Web Search] Error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "pages_with_matching_products": [],
                "competitor_count": 0
            }
    
    def _clean_search_query(self, title: str) -> str:
        """Clean and optimize the product title for search"""
        # Remove common prefixes like (NEW), special chars, etc.
        clean = re.sub(r'^\([^)]*\)\s*', '', title)  # Remove leading (...)
        clean = re.sub(r'\([^)]*\)$', '', clean)  # Remove trailing (...)
        clean = re.sub(r'[^\w\s-]', ' ', clean)  # Remove special chars
        clean = re.sub(r'\s+', ' ', clean)  # Normalize whitespace
        clean = clean.strip()
        
        # Truncate if too long
        if len(clean) > 100:
            clean = ' '.join(clean[:100].split()[:-1])  # Cut at word boundary
        
        return clean
    
    def _extract_entities(self, title: str) -> List[Dict[str, Any]]:
        """Extract potential product entities from title"""
        words = title.lower().split()
        entities = []
        
        # Common product-related keywords
        keywords = ['shoes', 'boots', 'sneakers', 'sandals', 'dress', 'shirt', 
                   'pants', 'jeans', 'jacket', 'coat', 'bag', 'watch', 'jewelry',
                   'electronics', 'phone', 'laptop', 'camera', 'headphones']
        
        for word in words:
            for keyword in keywords:
                if keyword in word:
                    entities.append({
                        "description": keyword.title(),
                        "score": 0.8,
                        "entity_id": f"entity_{keyword}"
                    })
                    break
        
        return entities[:5]
    
    async def _search_duckduckgo(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """Search using DuckDuckGo HTML (no API needed)"""
        try:
            encoded_query = quote_plus(query)
            url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    url,
                    headers={
                        "User-Agent": self.user_agent,
                        "Accept": "text/html,application/xhtml+xml",
                        "Accept-Language": "en-US,en;q=0.9"
                    },
                    follow_redirects=True
                )
                
                if response.status_code != 200:
                    logger.warning(f"DuckDuckGo returned {response.status_code}")
                    return []
                
                soup = BeautifulSoup(response.text, 'html.parser')
                results = []
                
                # Find search result links
                for result in soup.select('.result__a, .result__url'):
                    href = result.get('href', '')
                    title = result.get_text(strip=True)
                    
                    # Extract actual URL from DuckDuckGo redirect
                    if 'uddg=' in href:
                        import urllib.parse
                        parsed = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
                        if 'uddg' in parsed:
                            href = parsed['uddg'][0]
                    
                    # Filter to likely shopping sites
                    if href and self._is_shopping_url(href):
                        results.append({
                            "url": href,
                            "title": title[:200] if title else "",
                            "domain": self._extract_domain(href),
                            "source": "duckduckgo"
                        })
                        
                        if len(results) >= max_results:
                            break
                
                return results
                
        except Exception as e:
            logger.error(f"DuckDuckGo search error: {str(e)}")
            return []
    
    async def _search_google_shopping(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """Search Google Shopping by scraping (fallback method)"""
        try:
            encoded_query = quote_plus(query)
            url = f"https://www.google.com/search?q={encoded_query}&tbm=shop"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    url,
                    headers={
                        "User-Agent": self.user_agent,
                        "Accept": "text/html,application/xhtml+xml",
                        "Accept-Language": "en-US,en;q=0.9"
                    },
                    follow_redirects=True
                )
                
                if response.status_code != 200:
                    logger.warning(f"Google Shopping returned {response.status_code}")
                    return []
                
                soup = BeautifulSoup(response.text, 'html.parser')
                results = []
                
                # Google Shopping results have various structures
                # Look for product links
                for link in soup.find_all('a', href=True):
                    href = link.get('href', '')
                    
                    # Google shopping URLs often contain /shopping/product or /url?q=
                    if '/url?q=' in href:
                        # Extract actual URL
                        import urllib.parse
                        parsed = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
                        if 'q' in parsed:
                            actual_url = parsed['q'][0]
                            if self._is_shopping_url(actual_url):
                                title = link.get_text(strip=True)[:200]
                                results.append({
                                    "url": actual_url,
                                    "title": title,
                                    "domain": self._extract_domain(actual_url),
                                    "source": "google_shopping"
                                })
                                
                                if len(results) >= max_results:
                                    break
                
                return results
                
        except Exception as e:
            logger.error(f"Google Shopping search error: {str(e)}")
            return []
    
    def _is_shopping_url(self, url: str) -> bool:
        """Check if URL is likely a shopping/e-commerce site"""
        # Exclude non-shopping domains
        excluded = [
            'google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com',
            'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com',
            'pinterest.com', 'reddit.com', 'wikipedia.org', 'wikimedia.org'
        ]
        
        url_lower = url.lower()
        for domain in excluded:
            if domain in url_lower:
                return False
        
        # Include common shopping patterns
        shopping_indicators = [
            'shop', 'store', 'buy', 'product', 'cart', 'checkout',
            'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'tatacliq',
            'ebay', 'walmart', 'target', 'alibaba', 'aliexpress',
            'zappos', 'nordstrom', 'macys', 'asos', 'zara', 'hm.com'
        ]
        
        for indicator in shopping_indicators:
            if indicator in url_lower:
                return True
        
        # Default: include if it looks like a product page
        return '/product' in url_lower or '/item' in url_lower or '/p/' in url_lower
    
    def _extract_domain(self, url: str) -> str:
        """Extract clean domain from URL"""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            domain = parsed.netloc.replace('www.', '')
            return domain
        except Exception:
            return url


# Singleton instance
web_search_service = WebSearchService()
