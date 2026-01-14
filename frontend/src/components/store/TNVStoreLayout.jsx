import React, { useState, useEffect, createContext, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, User, Heart, ShoppingBag, Menu, X, ChevronDown, MapPin } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Store Context
const StoreContext = createContext();

export const useStore = () => useContext(StoreContext);

// Countries/Regions
const REGIONS = [
  { code: 'AE', name: 'UAE', currency: 'AED', symbol: 'AED', rate: 3.67, flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', symbol: 'SAR', rate: 3.75, flag: '🇸🇦' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD', symbol: 'KWD', rate: 0.31, flag: '🇰🇼' },
  { code: 'QA', name: 'Qatar', currency: 'QAR', symbol: 'QAR', rate: 3.64, flag: '🇶🇦' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD', symbol: 'BHD', rate: 0.38, flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', currency: 'OMR', symbol: 'OMR', rate: 0.38, flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', symbol: 'Rs', rate: 278.50, flag: '🇵🇰' },
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', rate: 83.12, flag: '🇮🇳' },
];

// Cart Context
const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const TNVStoreProvider = ({ children, storeName = 'tnvcollection' }) => {
  const [region, setRegion] = useState(REGIONS[0]);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load from localStorage
  useEffect(() => {
    const savedRegion = localStorage.getItem('tnv_region');
    const savedCart = localStorage.getItem('tnv_cart');
    const savedWishlist = localStorage.getItem('tnv_wishlist');
    
    if (savedRegion) setRegion(JSON.parse(savedRegion));
    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedWishlist) setWishlist(JSON.parse(savedWishlist));

    // Auto-detect region
    if (!savedRegion) {
      detectRegion();
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('tnv_region', JSON.stringify(region));
  }, [region]);

  useEffect(() => {
    localStorage.setItem('tnv_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('tnv_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const detectRegion = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      const detected = REGIONS.find(r => r.code === data.country_code);
      if (detected) setRegion(detected);
    } catch (e) {
      console.log('Could not detect region');
    }
  };

  const addToCart = (product, variant, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => 
        item.productId === product.shopify_product_id && 
        item.variantId === variant?.id
      );
      if (existing) {
        return prev.map(item => 
          item.productId === product.shopify_product_id && item.variantId === variant?.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, {
        productId: product.shopify_product_id,
        variantId: variant?.id,
        title: product.title,
        image: product.images?.[0]?.src,
        price: variant?.price || product.price,
        size: variant?.option1,
        color: variant?.option2,
        quantity
      }];
    });
  };

  const removeFromCart = (productId, variantId) => {
    setCart(prev => prev.filter(item => 
      !(item.productId === productId && item.variantId === variantId)
    ));
  };

  const updateCartQuantity = (productId, variantId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }
    setCart(prev => prev.map(item =>
      item.productId === productId && item.variantId === variantId
        ? { ...item, quantity }
        : item
    ));
  };

  const toggleWishlist = (product) => {
    setWishlist(prev => {
      const exists = prev.find(p => p.shopify_product_id === product.shopify_product_id);
      if (exists) {
        return prev.filter(p => p.shopify_product_id !== product.shopify_product_id);
      }
      return [...prev, product];
    });
  };

  const isInWishlist = (productId) => {
    return wishlist.some(p => p.shopify_product_id === productId);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const formatPrice = (price) => {
    const baseRate = 83.12; // INR base
    const converted = (parseFloat(price) / baseRate) * region.rate;
    if (region.rate < 1) {
      return `${region.symbol} ${converted.toFixed(3)}`;
    }
    return `${region.symbol} ${Math.round(converted).toLocaleString()}`;
  };

  return (
    <StoreContext.Provider value={{
      storeName,
      region,
      setRegion,
      regions: REGIONS,
      cart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      cartTotal,
      cartCount,
      wishlist,
      toggleWishlist,
      isInWishlist,
      user,
      setUser,
      searchQuery,
      setSearchQuery,
      formatPrice,
      API_URL
    }}>
      {children}
    </StoreContext.Provider>
  );
};

// Header Component
export const TNVHeader = () => {
  const { region, setRegion, regions, cartCount, wishlist, searchQuery, setSearchQuery, formatPrice } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [regionDropdown, setRegionDropdown] = useState(false);
  const location = useLocation();

  const categories = [
    { name: 'WOMEN', path: '/women', color: '#ff6b6b' },
    { name: 'MEN', path: '/men', color: '#4dabf7' },
    { name: 'KIDS', path: '/kids', color: '#69db7c' },
    { name: 'BEAUTY', path: '/beauty', color: '#f06595' },
    { name: 'BRANDS', path: '/brands', color: '#000' },
    { name: 'SALE', path: '/sale', color: '#fa5252', highlight: true },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Top Bar */}
      <div className="bg-black text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-8">
          <div className="flex items-center space-x-4">
            <span className="hidden sm:inline">🚚 FREE Delivery on orders over {formatPrice(500)}</span>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setRegionDropdown(!regionDropdown)}
              className="flex items-center space-x-1 hover:text-gray-300 relative"
            >
              <span>{region.flag}</span>
              <span>{region.name}</span>
              <ChevronDown className="w-3 h-3" />
              
              {regionDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-white text-black shadow-lg rounded-lg overflow-hidden min-w-[200px] z-50">
                  {regions.map(r => (
                    <button
                      key={r.code}
                      onClick={() => { setRegion(r); setRegionDropdown(false); }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 ${region.code === r.code ? 'bg-gray-100' : ''}`}
                    >
                      <span>{r.flag}</span>
                      <span>{r.name}</span>
                      <span className="text-gray-500 ml-auto">{r.currency}</span>
                    </button>
                  ))}
                </div>
              )}
            </button>
            <a href="#" className="hover:text-gray-300 hidden sm:inline">Help</a>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden p-2 -ml-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo */}
          <Link to="/store" className="flex-shrink-0">
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-black">TNV</span>
              <span className="text-gray-400 font-light ml-1">COLLECTION</span>
            </h1>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden lg:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for brands, products..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {/* Right Icons */}
          <div className="flex items-center space-x-4">
            <button 
              className="lg:hidden p-2"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search className="w-5 h-5" />
            </button>
            
            <Link to="/tnv/account" className="hidden sm:flex items-center space-x-1 text-sm hover:text-gray-600">
              <User className="w-5 h-5" />
              <span className="hidden md:inline">Account</span>
            </Link>
            
            <Link to="/tnv/wishlist" className="relative flex items-center space-x-1 text-sm hover:text-gray-600">
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </Link>
            
            <Link to="/tnv/cart" className="relative flex items-center space-x-1 text-sm hover:text-gray-600">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-black text-white text-[10px] rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Categories Nav - Desktop */}
        <nav className="hidden lg:flex items-center justify-center space-x-8 h-12 border-t">
          {categories.map(cat => (
            <Link
              key={cat.name}
              to={`/tnv${cat.path}`}
              className={`text-sm font-medium hover:text-gray-600 transition ${cat.highlight ? 'text-red-500' : ''}`}
            >
              {cat.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile Search */}
      {searchOpen && (
        <div className="lg:hidden px-4 pb-4 bg-white border-t">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for brands, products..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none"
              autoFocus
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t">
          <nav className="py-4">
            {categories.map(cat => (
              <Link
                key={cat.name}
                to={`/store${cat.path}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 text-sm font-medium hover:bg-gray-50 ${cat.highlight ? 'text-red-500' : ''}`}
              >
                {cat.name}
              </Link>
            ))}
            <div className="border-t mt-2 pt-2">
              <Link to="/store/account" className="block px-4 py-3 text-sm hover:bg-gray-50">My Account</Link>
              <Link to="/store/orders" className="block px-4 py-3 text-sm hover:bg-gray-50">Track Order</Link>
              <a href="#" className="block px-4 py-3 text-sm hover:bg-gray-50">Help & Support</a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

// Footer Component
export const TNVFooter = () => {
  const { regions, region } = useStore();

  return (
    <footer className="bg-gray-100 mt-16">
      {/* App Download Banner */}
      <div className="bg-black text-white py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Shop on the go!</h3>
            <p className="text-gray-400 text-sm">Download the TNV app for exclusive deals</p>
          </div>
          <div className="flex space-x-3 mt-4 md:mt-0">
            <a href="#" className="bg-white text-black px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <div className="text-left">
                <div className="text-[10px]">Download on the</div>
                <div className="text-sm font-semibold">App Store</div>
              </div>
            </a>
            <a href="#" className="bg-white text-black px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 20.5v-17c0-.83.67-1.5 1.5-1.5.31 0 .61.1.86.28l15.14 8.5c.52.29.52 1.02 0 1.32l-15.14 8.5c-.25.18-.55.28-.86.28-.83 0-1.5-.67-1.5-1.5v-.08z"/>
              </svg>
              <div className="text-left">
                <div className="text-[10px]">GET IT ON</div>
                <div className="text-sm font-semibold">Google Play</div>
              </div>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* About */}
          <div>
            <h4 className="font-semibold mb-4">About TNV</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-black">About Us</a></li>
              <li><a href="#" className="hover:text-black">Careers</a></li>
              <li><a href="#" className="hover:text-black">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-black">Terms & Conditions</a></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-semibold mb-4">Help</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-black">Contact Us</a></li>
              <li><a href="#" className="hover:text-black">FAQs</a></li>
              <li><a href="#" className="hover:text-black">Shipping Info</a></li>
              <li><a href="#" className="hover:text-black">Returns & Exchange</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/store/women" className="hover:text-black">Women</Link></li>
              <li><Link to="/store/men" className="hover:text-black">Men</Link></li>
              <li><Link to="/store/kids" className="hover:text-black">Kids</Link></li>
              <li><Link to="/store/sale" className="hover:text-black">Sale</Link></li>
            </ul>
          </div>

          {/* Regions */}
          <div>
            <h4 className="font-semibold mb-4">Ship To</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              {regions.slice(0, 6).map(r => (
                <li key={r.code}>
                  <span className="mr-1">{r.flag}</span>
                  {r.name}
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-3">
              <a href="#" className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="#" className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="#" className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              </a>
            </div>

            {/* Payment Methods */}
            <h4 className="font-semibold mt-6 mb-4">We Accept</h4>
            <div className="flex flex-wrap gap-2">
              <div className="bg-white px-2 py-1 rounded text-xs font-medium">VISA</div>
              <div className="bg-white px-2 py-1 rounded text-xs font-medium">Mastercard</div>
              <div className="bg-white px-2 py-1 rounded text-xs font-medium">COD</div>
              <div className="bg-white px-2 py-1 rounded text-xs font-medium">Apple Pay</div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t mt-8 pt-8 text-center text-sm text-gray-500">
          <p>© 2025 TNV Collection. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default TNVStoreProvider;
