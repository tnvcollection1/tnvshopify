import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Search, User, ShoppingBag, Heart, ChevronLeft, ChevronRight, ChevronDown, Gift, Menu, X, Globe, Minus, Plus, Check, Truck, RotateCcw, Shield } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Country & Currency Data (same as StorefrontPreview)
const COUNTRIES = [
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', symbol: 'د.إ', rate: 3.67 },
  { code: 'AU', name: 'Australia', currency: 'AUD', symbol: 'A$', rate: 1.53 },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', symbol: '৳', rate: 109.50 },
  { code: 'CA', name: 'Canada', currency: 'CAD', symbol: 'C$', rate: 1.36 },
  { code: 'CN', name: 'China', currency: 'CNY', symbol: '¥', rate: 7.24 },
  { code: 'DE', name: 'Germany', currency: 'EUR', symbol: '€', rate: 0.92 },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£', rate: 0.79 },
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', rate: 83.12 },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', symbol: 'Rs', rate: 278.50 },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', symbol: 'ر.س', rate: 3.75 },
  { code: 'SG', name: 'Singapore', currency: 'SGD', symbol: 'S$', rate: 1.34 },
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$', rate: 1 },
];

const STORE_CONFIGS = {
  tnvcollection: { baseCurrency: 'INR', baseSymbol: '₹', defaultCountry: 'IN' },
  tnvcollectionpk: { baseCurrency: 'PKR', baseSymbol: 'Rs', defaultCountry: 'PK' }
};

const getFlagEmoji = (countryCode) => {
  const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

const ProductPage = () => {
  const { productId } = useParams();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  // Get store name from URL
  const getStoreName = () => {
    const path = location.pathname;
    if (path.includes('tnvcollectionpk')) return 'tnvcollectionpk';
    return 'tnvcollection';
  };
  const storeName = getStoreName();
  const storeConfig = STORE_CONFIGS[storeName];

  useEffect(() => {
    // Load saved country or detect
    const saved = localStorage.getItem('selectedCountry');
    if (saved) {
      setSelectedCountry(JSON.parse(saved));
    } else {
      detectCountry();
    }
  }, []);

  const detectCountry = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      const detected = COUNTRIES.find(c => c.code === data.country_code) || COUNTRIES.find(c => c.code === 'US');
      setSelectedCountry(detected);
    } catch {
      setSelectedCountry(COUNTRIES.find(c => c.code === storeConfig?.defaultCountry) || COUNTRIES[11]);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId, storeName]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      // Fetch product by ID
      const res = await fetch(`${API_URL}/api/storefront/products/${productId}?store=${storeName}`);
      const data = await res.json();
      setProduct(data.product || data);

      // Fetch related products
      const relatedRes = await fetch(`${API_URL}/api/storefront/products?store=${storeName}&limit=4`);
      const relatedData = await relatedRes.json();
      setRelatedProducts(relatedData.products || []);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertPrice = (price) => {
    if (!storeConfig || !selectedCountry) return price;
    const basePrice = parseFloat(price);
    const baseCountry = COUNTRIES.find(c => c.currency === storeConfig.baseCurrency);
    if (!baseCountry) return price;
    const priceInUSD = basePrice / baseCountry.rate;
    return priceInUSD * selectedCountry.rate;
  };

  const formatPrice = (price) => {
    if (!selectedCountry) return price;
    const converted = convertPrice(price);
    if (selectedCountry.rate > 100) {
      return `${selectedCountry.symbol}${Math.round(converted).toLocaleString()}`;
    }
    return `${selectedCountry.symbol}${converted.toFixed(2)}`;
  };

  const handleAddToCart = () => {
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Product not found</p>
          <Link to={`/${storeName}preview`} className="text-sm underline">Back to store</Link>
        </div>
      </div>
    );
  }

  const images = product.images || [{ src: 'https://via.placeholder.com/600x800' }];
  const variants = product.variants || [];
  const sizes = [...new Set(variants.map(v => v.option1).filter(Boolean))];
  const colors = [...new Set(variants.map(v => v.option2).filter(Boolean))];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="bg-black text-white">
          <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between h-10">
            <button 
              onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
              className="flex items-center space-x-2 text-[11px] tracking-wide hover:text-gray-300 transition"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{selectedCountry?.code} | {selectedCountry?.currency}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <p className="text-[11px] tracking-wider hidden md:block">FREE SHIPPING ON ORDERS OVER {selectedCountry?.symbol}5,000</p>
            <div className="flex space-x-4 text-[11px]">
              <a href="#" className="hover:text-gray-300">HELP</a>
            </div>
          </div>
        </div>
        
        <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between h-14">
          <Link to={`/${storeName}preview`} className="flex items-center space-x-2 text-sm hover:text-gray-600">
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <Link to={`/${storeName}preview`} className="text-2xl tracking-[0.4em] font-light">TNV</Link>
          <div className="flex items-center space-x-4">
            <Heart className="w-5 h-5 cursor-pointer hover:text-gray-600" strokeWidth={1.5} />
            <div className="relative">
              <ShoppingBag className="w-5 h-5 cursor-pointer hover:text-gray-600" strokeWidth={1.5} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-black text-white text-[9px] rounded-full flex items-center justify-center">0</span>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-[1400px] mx-auto px-4 py-4">
        <nav className="text-xs text-gray-500">
          <Link to={`/${storeName}preview`} className="hover:text-black">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-black">{product.title}</span>
        </nav>
      </div>

      {/* Product Content */}
      <div className="max-w-[1400px] mx-auto px-4 pb-16">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-[3/4] bg-[#f5f5f5] overflow-hidden">
              <img
                src={images[selectedImage]?.src || images[0]?.src}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-20 h-24 bg-[#f5f5f5] overflow-hidden border-2 ${selectedImage === idx ? 'border-black' : 'border-transparent'}`}
                  >
                    <img src={img.src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="lg:pl-8">
            <p className="text-[11px] tracking-[0.2em] text-gray-500 mb-2">TNV COLLECTION</p>
            <h1 className="text-2xl font-light mb-4">{product.title}</h1>
            <p className="text-2xl font-medium mb-6">
              {formatPrice(variants[0]?.price || product.price || 0)}
            </p>

            {/* Size Selection */}
            {sizes.length > 0 && (
              <div className="mb-6">
                <p className="text-xs tracking-wider mb-3">SIZE</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 border text-sm ${selectedSize === size ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {colors.length > 0 && (
              <div className="mb-6">
                <p className="text-xs tracking-wider mb-3">COLOR</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 border text-sm ${selectedColor === color ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <p className="text-xs tracking-wider mb-3">QUANTITY</p>
              <div className="flex items-center border border-gray-300 w-32">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 hover:bg-gray-100">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="flex-1 text-center">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="p-3 hover:bg-gray-100">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              className={`w-full py-4 text-[11px] tracking-[0.2em] font-medium transition-all ${
                addedToCart ? 'bg-green-600 text-white' : 'bg-black text-white hover:bg-gray-900'
              }`}
            >
              {addedToCart ? (
                <span className="flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>ADDED TO BAG</span>
                </span>
              ) : (
                'ADD TO BAG'
              )}
            </button>

            <button className="w-full py-4 border border-black text-[11px] tracking-[0.2em] font-medium mt-3 hover:bg-gray-100 transition flex items-center justify-center space-x-2">
              <Heart className="w-4 h-4" />
              <span>ADD TO WISHLIST</span>
            </button>

            {/* Features */}
            <div className="mt-8 space-y-4 border-t pt-8">
              <div className="flex items-center space-x-3 text-sm">
                <Truck className="w-5 h-5" />
                <span>Free shipping on orders over {selectedCountry?.symbol}5,000</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <RotateCcw className="w-5 h-5" />
                <span>Free returns within 14 days</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <Shield className="w-5 h-5" />
                <span>Authentic products guaranteed</span>
              </div>
            </div>

            {/* Description */}
            {product.body_html && (
              <div className="mt-8 border-t pt-8">
                <h3 className="text-xs tracking-wider mb-4">DESCRIPTION</h3>
                <div 
                  className="text-sm text-gray-600 leading-relaxed prose prose-sm"
                  dangerouslySetInnerHTML={{ __html: product.body_html }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="bg-[#f8f8f8] py-16">
          <div className="max-w-[1400px] mx-auto px-4">
            <h2 className="text-2xl font-light text-center mb-12">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((p, idx) => (
                <Link 
                  key={p.id || idx} 
                  to={`/${storeName}preview/product/${p.id}`}
                  className="group"
                >
                  <div className="aspect-[3/4] bg-white overflow-hidden mb-4">
                    <img
                      src={p.images?.[0]?.src || 'https://via.placeholder.com/400x500'}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <p className="text-[10px] tracking-[0.15em] text-gray-500 mb-1">TNV COLLECTION</p>
                  <h3 className="text-sm font-light line-clamp-2 mb-1">{p.title}</h3>
                  <p className="text-sm font-medium">{formatPrice(p.variants?.[0]?.price || p.price || 0)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-[#1a1a1a] text-white py-12">
        <div className="max-w-[1400px] mx-auto px-4 text-center">
          <p className="text-xl tracking-[0.4em] font-light mb-4">TNV COLLECTION</p>
          <p className="text-xs text-gray-500">© 2025 TNV Collection. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default ProductPage;
