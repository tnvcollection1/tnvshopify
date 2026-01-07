"""
Currency Conversion Service
Handles currency detection and conversion for competitor price analysis
"""
import os
import logging
import httpx
from typing import Dict, Optional, Tuple
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

# Currency symbols and patterns
CURRENCY_SYMBOLS = {
    '₹': 'INR',
    'Rs': 'INR',
    'Rs.': 'INR',
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    'CN¥': 'CNY',
    '元': 'CNY',
    'AED': 'AED',
    'SAR': 'SAR',
}

# Approximate exchange rates to INR (fallback if API unavailable)
# Updated Jan 2025 - These are approximate and used as fallback only
FALLBACK_RATES_TO_INR = {
    'USD': 83.5,
    'EUR': 90.0,
    'GBP': 105.0,
    'JPY': 0.56,
    'CNY': 11.5,
    'AED': 22.7,
    'SAR': 22.3,
    'INR': 1.0,
}


class CurrencyService:
    """Service for currency detection and conversion"""
    
    def __init__(self):
        self.base_currency = os.environ.get('BASE_CURRENCY', 'INR')
        self._rates_cache = {}
        self._cache_expiry = None
        self._cache_duration = timedelta(hours=6)
    
    def detect_currency(self, text: str, url: str = "") -> str:
        """
        Detect currency from text or URL.
        
        Args:
            text: Text containing price (e.g., "$99.99", "₹2,999")
            url: URL to help determine locale
        
        Returns:
            Currency code (e.g., 'USD', 'INR', 'EUR')
        """
        # Check for currency symbols in text
        text_stripped = text.strip()
        
        for symbol, currency in CURRENCY_SYMBOLS.items():
            if symbol in text_stripped:
                return currency
        
        # Check URL domain for locale hints
        url_lower = url.lower()
        if any(d in url_lower for d in ['.in', 'amazon.in', 'flipkart', 'myntra', 'ajio']):
            return 'INR'
        if any(d in url_lower for d in ['.com', 'amazon.com', 'ebay.com', 'walmart', 'target.com']):
            return 'USD'
        if any(d in url_lower for d in ['.co.uk', 'amazon.co.uk', 'asos.com']):
            return 'GBP'
        if any(d in url_lower for d in ['.de', '.fr', '.it', '.es', 'amazon.de', 'amazon.fr', 'zalando']):
            return 'EUR'
        if any(d in url_lower for d in ['.cn', '1688.com', 'taobao', 'tmall', 'alibaba']):
            return 'CNY'
        if any(d in url_lower for d in ['.ae', 'noon.com']):
            return 'AED'
        
        # Default to USD for international sites
        return 'USD'
    
    async def get_exchange_rate(self, from_currency: str, to_currency: str = None) -> float:
        """
        Get exchange rate between currencies.
        
        Args:
            from_currency: Source currency code
            to_currency: Target currency code (defaults to base_currency)
        
        Returns:
            Exchange rate (multiply by this to convert)
        """
        if to_currency is None:
            to_currency = self.base_currency
        
        if from_currency == to_currency:
            return 1.0
        
        # Check cache
        cache_key = f"{from_currency}_{to_currency}"
        if self._cache_expiry and datetime.now(timezone.utc) < self._cache_expiry:
            if cache_key in self._rates_cache:
                return self._rates_cache[cache_key]
        
        # Try to fetch live rates
        try:
            rate = await self._fetch_live_rate(from_currency, to_currency)
            if rate:
                self._rates_cache[cache_key] = rate
                self._cache_expiry = datetime.now(timezone.utc) + self._cache_duration
                return rate
        except Exception as e:
            logger.warning(f"Failed to fetch live rate: {e}")
        
        # Use fallback rates
        return self._get_fallback_rate(from_currency, to_currency)
    
    async def _fetch_live_rate(self, from_currency: str, to_currency: str) -> Optional[float]:
        """Fetch live exchange rate from free API"""
        try:
            # Using exchangerate-api.com free tier (no API key needed for limited use)
            url = f"https://open.er-api.com/v6/latest/{from_currency}"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("result") == "success":
                        rates = data.get("rates", {})
                        if to_currency in rates:
                            return rates[to_currency]
            
            return None
        except Exception as e:
            logger.error(f"Error fetching exchange rate: {e}")
            return None
    
    def _get_fallback_rate(self, from_currency: str, to_currency: str) -> float:
        """Calculate rate using fallback INR-based rates"""
        from_to_inr = FALLBACK_RATES_TO_INR.get(from_currency, 1.0)
        to_to_inr = FALLBACK_RATES_TO_INR.get(to_currency, 1.0)
        
        if to_to_inr == 0:
            return 1.0
        
        # Convert: from_currency -> INR -> to_currency
        return from_to_inr / to_to_inr
    
    async def convert_price(
        self, 
        price: float, 
        from_currency: str, 
        to_currency: str = None
    ) -> Tuple[float, float]:
        """
        Convert price between currencies.
        
        Args:
            price: Price in source currency
            from_currency: Source currency code
            to_currency: Target currency code (defaults to base_currency)
        
        Returns:
            Tuple of (converted_price, exchange_rate)
        """
        if to_currency is None:
            to_currency = self.base_currency
        
        rate = await self.get_exchange_rate(from_currency, to_currency)
        converted = round(price * rate, 2)
        
        return converted, rate
    
    def format_currency(self, amount: float, currency: str = None) -> str:
        """Format amount with currency symbol"""
        if currency is None:
            currency = self.base_currency
        
        symbols = {
            'INR': '₹',
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'CNY': '¥',
            'JPY': '¥',
            'AED': 'AED ',
            'SAR': 'SAR ',
        }
        
        symbol = symbols.get(currency, currency + ' ')
        return f"{symbol}{amount:,.2f}"


# Singleton instance
currency_service = CurrencyService()
