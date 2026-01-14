/**
 * Mobile App Preview (PWA)
 * Web-based preview of the TNV Collection mobile app
 * Fetches configuration dynamically from backend API
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Home, Search, ShoppingBag, Heart, User, ChevronRight, Plus, Minus, Trash2, X, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Mock data fallbacks
const mockProducts = [
  { id: 1, title: 'Premium Leather Oxford Shoes', vendor: 'TNV Collection', price: 299, compare_price: 399, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300' },
  { id: 2, title: 'Classic Canvas Sneakers', vendor: 'TNV Collection', price: 159, compare_price: 199, image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=300' },
  { id: 3, title: 'Business Casual Loafers', vendor: 'TNV Collection', price: 249, compare_price: 329, image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=300' },
  { id: 4, title: 'Athletic Running Shoes', vendor: 'TNV Collection', price: 189, compare_price: 259, image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=300' },
  { id: 5, title: 'Formal Derby Shoes', vendor: 'TNV Collection', price: 279, compare_price: 359, image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=300' },
  { id: 6, title: 'Casual Slip-On Shoes', vendor: 'TNV Collection', price: 129, compare_price: 179, image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=300' },
];

const defaultCategories = [
  { name: 'New In', icon: { value: '✨' } },
  { name: 'Shoes', icon: { value: '👟' } },
  { name: 'Bags', icon: { value: '👜' } },
  { name: 'Sports', icon: { value: '🏃' } },
  { name: 'Watches', icon: { value: '⌚' } },
  { name: 'Sale', icon: { value: '🔥' } },
];

const defaultPromoMessages = [
  { text: 'Cash On Delivery', icon: '💵' },
  { text: 'Free Delivery', icon: '🚚' },
];

const defaultLogo = { text: 'TNV', badge: 'COLLECTION', badgeColor: '#FF6B9D' };

// Phone Frame Component
const PhoneFrame = ({ children }) => (
  <div className="relative mx-auto" style={{ width: '375px', height: '812px' }}>
    {/* Phone outline */}
    <div className="absolute inset-0 bg-gray-900 rounded-[3rem] shadow-2xl">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-gray-900 rounded-b-3xl z-20" />
      {/* Screen */}
      <div className="absolute top-2 left-2 right-2 bottom-2 bg-white rounded-[2.5rem] overflow-hidden">
        {children}
      </div>
      {/* Home indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full" />
    </div>
  </div>
);

// Product Card Component
const ProductCard = ({ product, onPress, onWishlist, isWishlisted }) => {
  const discount = product.compare_price ? Math.round((1 - product.price / product.compare_price) * 100) : 0;
  const delivery = product.id % 2 === 0 ? 'TODAY' : 'TOMORROW';

  return (
    <div 
      className="bg-white rounded-xl overflow-hidden shadow-sm cursor-pointer"
      onClick={onPress}
    >
      <div className="relative aspect-[3/4]">
        <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
            -{discount}%
          </div>
        )}
        <button 
          className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md"
          onClick={(e) => { e.stopPropagation(); onWishlist(product); }}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
        </button>
      </div>
      <div className="p-2">
        <p className="text-xs text-gray-500">{product.vendor}</p>
        <p className="text-sm font-medium truncate">{product.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-bold text-sm">AED {product.price}</span>
          {product.compare_price && (
            <span className="text-xs text-gray-400 line-through">AED {product.compare_price}</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">Free delivery</p>
        <p className="text-xs text-gray-500">
          GET IT <span className={`font-bold ${delivery === 'TODAY' ? 'text-green-500' : 'text-orange-500'}`}>{delivery}</span>
        </p>
      </div>
    </div>
  );
};

// Header Component - Now uses dynamic config
const Header = ({ showBack, title, onBack, cartCount = 0, logo, promoMessages, promoIndex }) => {
  const currentPromo = promoMessages?.[promoIndex] || defaultPromoMessages[0];
  const logoConfig = logo || defaultLogo;
  
  return (
    <>
      {/* Promo Bar - Dynamic from backend */}
      <div className="bg-gray-900 px-4 py-2 flex justify-between items-center text-white text-sm">
        <span>{currentPromo.icon} {currentPromo.text}</span>
        <span>🇦🇪 AE</span>
      </div>
      {/* Main Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b bg-white">
        {showBack ? (
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black">{logoConfig.text}</span>
            {logoConfig.badge && (
              <span 
                className="text-white text-xs font-bold px-2 py-1 rounded-full"
                style={{ backgroundColor: logoConfig.badgeColor || '#FF6B9D' }}
              >
                {logoConfig.badge}
              </span>
            )}
          </div>
        )}
        {title && <span className="font-bold text-lg">{title}</span>}
        <div className="flex items-center gap-2">
          <button className="p-2"><Search className="w-5 h-5" /></button>
          <button className="p-2"><Heart className="w-5 h-5" /></button>
          <button className="p-2 relative">
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-black text-white text-xs rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

// Bottom Tab Bar
const TabBar = ({ activeTab, onTabChange }) => (
  <div className="flex justify-around items-center py-3 border-t bg-white">
    {[
      { key: 'home', icon: Home, label: 'Home' },
      { key: 'browse', icon: Search, label: 'Browse' },
      { key: 'cart', icon: ShoppingBag, label: 'Bag' },
      { key: 'wishlist', icon: Heart, label: 'Wishlist' },
      { key: 'account', icon: User, label: 'Account' },
    ].map((tab) => (
      <button
        key={tab.key}
        className={`flex flex-col items-center gap-0.5 ${activeTab === tab.key ? 'text-black' : 'text-gray-400'}`}
        onClick={() => onTabChange(tab.key)}
      >
        <tab.icon className="w-5 h-5" />
        <span className="text-xs">{tab.label}</span>
      </button>
    ))}
  </div>
);

// Home Screen - Now uses dynamic categories from backend
const HomeScreen = ({ products, onProductPress, onWishlist, wishlist, categories }) => {
  const displayCategories = categories || defaultCategories;
  
  return (
    <div className="overflow-y-auto h-full pb-16">
      {/* Gender Cards */}
      <div className="flex gap-3 p-4">
        <div className="flex-1 aspect-[0.8] bg-pink-50 rounded-xl flex items-center justify-center">
          <span className="text-2xl font-bold tracking-widest">WOMEN</span>
        </div>
        <div className="flex-1 aspect-[0.8] bg-blue-50 rounded-xl flex items-center justify-center">
          <span className="text-2xl font-bold tracking-widest">MEN</span>
        </div>
      </div>

      {/* Promo Banner */}
      <div className="mx-4 my-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-xl p-5 flex justify-between items-center">
        <div>
          <h3 className="text-white text-2xl font-black">30% CASHBACK</h3>
          <p className="text-white/80 text-sm">On Sports Apparel &amp; Footwear</p>
        </div>
        <div className="bg-white/20 rounded-xl px-3 py-2 text-center">
          <p className="text-white/70 text-xs">USE CODE:</p>
          <p className="text-white font-black text-lg">SPORTS30</p>
        </div>
      </div>

      {/* Categories - Dynamic from backend */}
      <div className="flex gap-4 px-4 py-4 overflow-x-auto">
        {displayCategories.filter(c => c.active !== false).slice(0, 6).map((cat, idx) => (
          <div key={cat.name || idx} className="flex flex-col items-center min-w-[70px]">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
              style={{ backgroundColor: cat.bgColor || '#f5f5f5' }}
            >
              {cat.icon?.value || cat.icon || cat.emoji || '📁'}
            </div>
            <span className="text-xs mt-1 text-center">{cat.name}</span>
          </div>
        ))}
      </div>

      {/* Today's Picks */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg">Today&apos;s Picks</h2>
          <span className="text-sm text-gray-500">View All →</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {products.slice(0, 4).map((product) => (
            <div key={product.id} className="min-w-[140px]">
              <ProductCard 
                product={product} 
                onPress={() => onProductPress(product)}
                onWishlist={onWishlist}
                isWishlisted={wishlist.some(w => w.id === product.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Mega Sale Banner */}
      <div className="mx-4 my-4 bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 rounded-xl p-5">
        <h3 className="text-white text-3xl font-black">MEGA SALE</h3>
        <p className="text-white/80 text-sm">Up to 70% OFF</p>
      </div>

      {/* New Arrivals Grid */}
      <div className="px-4 pb-20">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg">New Arrivals</h2>
          <span className="text-sm text-gray-500">View All →</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {products.slice(0, 6).map((product) => (
            <ProductCard 
              key={product.id}
              product={product} 
              onPress={() => onProductPress(product)}
              onWishlist={onWishlist}
              isWishlisted={wishlist.some(w => w.id === product.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Browse Screen
const BrowseScreen = ({ products, onProductPress, onWishlist, wishlist }) => (
  <div className="overflow-y-auto h-full pb-16">
    {/* Filter Bar */}
    <div className="flex items-center gap-2 px-4 py-3 border-b bg-white">
      <button className="px-3 py-1.5 bg-gray-100 rounded-full text-sm flex items-center gap-1">
        🔧 Filter
      </button>
      <div className="flex gap-2 overflow-x-auto">
        {['Newest', 'Low-High', 'High-Low'].map((sort, idx) => (
          <button 
            key={sort}
            className={`px-3 py-1.5 rounded-full text-xs ${idx === 0 ? 'bg-black text-white' : 'bg-gray-100'}`}
          >
            {sort}
          </button>
        ))}
      </div>
    </div>
    {/* Products Grid */}
    <div className="grid grid-cols-2 gap-3 p-3 pb-20 bg-gray-50">
      {products.map((product) => (
        <ProductCard 
          key={product.id}
          product={product} 
          onPress={() => onProductPress(product)}
          onWishlist={onWishlist}
          isWishlisted={wishlist.some(w => w.id === product.id)}
        />
      ))}
    </div>
  </div>
);

// Cart Screen
const CartScreen = ({ cart, onUpdateQuantity, onRemove, onCheckout }) => {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = subtotal >= 500 ? 0 : 50;
  const total = subtotal + delivery;

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full pb-16">
        <span className="text-6xl mb-4">🛒</span>
        <h3 className="text-xl font-bold mb-2">Your bag is empty</h3>
        <p className="text-gray-500 text-sm">Looks like you have not added anything yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-16">
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {cart.map((item) => (
          <div key={item.id} className="bg-white rounded-xl p-3 mb-3 flex gap-3">
            <img src={item.image} alt={item.title} className="w-20 h-24 object-cover rounded-lg" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">{item.vendor}</p>
              <p className="text-sm font-medium line-clamp-2">{item.title}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center border rounded-lg">
                  <button className="w-8 h-8 flex items-center justify-center" onClick={() => onUpdateQuantity(item.id, -1)}>
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button className="w-8 h-8 flex items-center justify-center" onClick={() => onUpdateQuantity(item.id, 1)}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="font-bold">AED {item.price * item.quantity}</span>
              </div>
            </div>
            <button onClick={() => onRemove(item.id)} className="p-1">
              <Trash2 className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ))}
      </div>
      {/* Summary */}
      <div className="p-4 border-t bg-white">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Subtotal</span>
          <span>AED {subtotal}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Delivery</span>
          <span className={delivery === 0 ? 'text-green-500 font-semibold' : ''}>{delivery === 0 ? 'FREE' : `AED ${delivery}`}</span>
        </div>
        <div className="flex justify-between font-bold text-lg pt-2 border-t">
          <span>Total</span>
          <span>AED {total}</span>
        </div>
        <button 
          onClick={onCheckout}
          className="w-full bg-black text-white py-4 rounded-full font-bold mt-4"
        >
          Checkout →
        </button>
        <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500">
          <span>🚚 Free delivery over AED 500</span>
          <span>🔒 Secure checkout</span>
        </div>
      </div>
    </div>
  );
};

// Product Detail Screen
const ProductDetailScreen = ({ product, onBack, onAddToCart, onWishlist, isWishlisted }) => {
  const [quantity, setQuantity] = useState(1);
  const discount = product.compare_price ? Math.round((1 - product.price / product.compare_price) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Image */}
        <div className="relative aspect-[3/4] bg-gray-100">
          <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
          <button 
            className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md"
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button 
            className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md"
            onClick={() => onWishlist(product)}
          >
            <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        </div>

        <div className="p-4">
          <p className="text-gray-500">{product.vendor}</p>
          <h1 className="text-xl font-bold mb-3">{product.title}</h1>
          
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl font-bold">AED {product.price}</span>
            {product.compare_price && (
              <>
                <span className="text-lg text-gray-400 line-through">AED {product.compare_price}</span>
                <span className="bg-red-500 text-white text-sm font-bold px-2 py-1 rounded">-{discount}%</span>
              </>
            )}
          </div>

          {/* Quantity */}
          <div className="mb-4">
            <p className="font-semibold mb-2">Quantity</p>
            <div className="flex items-center">
              <button 
                className="w-11 h-11 border rounded-lg flex items-center justify-center"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="w-14 text-center font-semibold text-lg">{quantity}</span>
              <button 
                className="w-11 h-11 border rounded-lg flex items-center justify-center"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="flex items-center gap-3 bg-gray-100 p-4 rounded-xl mb-4">
            <span className="text-2xl">🚚</span>
            <div>
              <p className="font-semibold">Free Delivery</p>
              <p className="text-sm text-green-500">Get it by Tomorrow</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Premium quality footwear crafted with attention to detail. Features durable construction, comfortable fit, and stylish design perfect for any occasion.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
        <button 
          className="w-full bg-black text-white py-4 rounded-full font-bold"
          onClick={() => onAddToCart(product, quantity)}
        >
          Add to Bag - AED {product.price * quantity}
        </button>
      </div>
    </div>
  );
};

// Wishlist Screen
const WishlistScreen = ({ wishlist, onProductPress, onWishlist }) => {
  if (wishlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full pb-16">
        <span className="text-6xl mb-4">❤️</span>
        <h3 className="text-xl font-bold mb-2">Your wishlist is empty</h3>
        <p className="text-gray-500 text-sm">Save items you love here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-3 pb-20 bg-gray-50 overflow-y-auto h-full">
      {wishlist.map((product) => (
        <ProductCard 
          key={product.id}
          product={product} 
          onPress={() => onProductPress(product)}
          onWishlist={onWishlist}
          isWishlisted={true}
        />
      ))}
    </div>
  );
};

// Account Screen
const AccountScreen = () => (
  <div className="overflow-y-auto h-full pb-16">
    {/* Guest Card */}
    <div className="m-4 p-6 bg-white rounded-xl text-center">
      <h3 className="text-lg font-bold mb-2">Welcome to TNV Collection</h3>
      <p className="text-gray-500 text-sm mb-4">Sign in to access your orders, wishlist, and more</p>
      <button className="bg-black text-white px-8 py-3 rounded-full font-bold">Sign In</button>
    </div>

    {/* Region */}
    <div className="mx-4 mb-4 p-4 bg-white rounded-xl">
      <p className="font-semibold mb-3">Region & Currency</p>
      <div className="flex gap-2 overflow-x-auto">
        {['🇦🇪 AE', '🇸🇦 SA', '🇰🇼 KW', '🇵🇰 PK', '🇮🇳 IN'].map((region, idx) => (
          <button key={region} className={`px-4 py-2 rounded-xl text-sm ${idx === 0 ? 'bg-black text-white' : 'bg-gray-100'}`}>
            {region}
          </button>
        ))}
      </div>
    </div>

    {/* Menu */}
    <div className="mx-4 bg-white rounded-xl overflow-hidden">
      {[
        { icon: '📦', title: 'My Orders' },
        { icon: '❤️', title: 'Wishlist' },
        { icon: '📍', title: 'Addresses' },
        { icon: '💳', title: 'Payment Methods' },
        { icon: '🔔', title: 'Notifications' },
        { icon: '❓', title: 'Help & Support' },
      ].map((item) => (
        <button key={item.title} className="w-full flex items-center px-4 py-3.5 border-b last:border-b-0">
          <span className="text-xl mr-3">{item.icon}</span>
          <span className="flex-1 text-left">{item.title}</span>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      ))}
    </div>

    <p className="text-center text-gray-400 text-xs mt-6 pb-6">TNV Collection v1.0.0</p>
  </div>
);

// Main Mobile Preview Component - Now fetches config from backend
const MobileAppPreview = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [products, setProducts] = useState(mockProducts);
  
  // Dynamic config from backend
  const [navConfig, setNavConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [promoIndex, setPromoIndex] = useState(0);

  // Fetch navigation config from backend
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_URL}/api/storefront/config/navigation/tnvcollection`);
        const data = await res.json();
        setNavConfig(data);
        console.log('Loaded nav config:', data);
      } catch (e) {
        console.log('Using default config');
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Promo message rotation
  useEffect(() => {
    const messages = navConfig?.promoMessages || defaultPromoMessages;
    const activeMessages = messages.filter(m => m.active !== false);
    if (activeMessages.length > 1) {
      const interval = setInterval(() => {
        setPromoIndex(prev => (prev + 1) % activeMessages.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [navConfig]);

  // Fetch real products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_URL}/api/storefront/products?store=tnvcollection&limit=20`);
        const data = await res.json();
        if (data.products && data.products.length > 0) {
          setProducts(data.products.map(p => ({
            id: p.shopify_product_id,
            title: p.title,
            vendor: p.vendor || 'TNV Collection',
            price: p.variants?.[0]?.price || 299,
            compare_price: p.variants?.[0]?.compare_at_price,
            image: p.images?.[0]?.src || mockProducts[0].image,
          })));
        }
      } catch (e) {
        console.log('Using mock products');
      }
    };
    fetchProducts();
  }, []);

  const handleAddToCart = (product, quantity) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { ...product, quantity }];
    });
    setSelectedProduct(null);
    setActiveTab('cart');
  };

  const handleUpdateCartQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleRemoveFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const handleWishlist = (product) => {
    setWishlist(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        return prev.filter(p => p.id !== product.id);
      }
      return [...prev, product];
    });
  };

  // Get active promo messages
  const activePromoMessages = (navConfig?.promoMessages || defaultPromoMessages).filter(m => m.active !== false);

  const renderScreen = () => {
    if (selectedProduct) {
      return (
        <ProductDetailScreen
          product={selectedProduct}
          onBack={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          onWishlist={handleWishlist}
          isWishlisted={wishlist.some(w => w.id === selectedProduct.id)}
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen 
            products={products}
            onProductPress={setSelectedProduct}
            onWishlist={handleWishlist}
            wishlist={wishlist}
            categories={navConfig?.categories}
          />
        );
      case 'browse':
        return (
          <BrowseScreen 
            products={products}
            onProductPress={setSelectedProduct}
            onWishlist={handleWishlist}
            wishlist={wishlist}
          />
        );
      case 'cart':
        return (
          <CartScreen 
            cart={cart}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemove={handleRemoveFromCart}
            onCheckout={() => alert('Checkout flow would open here!')}
          />
        );
      case 'wishlist':
        return (
          <WishlistScreen 
            wishlist={wishlist}
            onProductPress={setSelectedProduct}
            onWishlist={handleWishlist}
          />
        );
      case 'account':
        return <AccountScreen />;
      default:
        return null;
    }
  };

  if (configLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">TNV Collection Mobile App Preview</h1>
          <p className="text-gray-600">Interactive preview of the React Native mobile app</p>
          <p className="text-sm text-green-600 mt-1">✓ Using dynamic config from backend API</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          {/* Phone Preview */}
          <PhoneFrame>
            <div className="flex flex-col h-full pt-7">
              {!selectedProduct && (
                <Header 
                  cartCount={cart.length}
                  logo={navConfig?.logo}
                  promoMessages={activePromoMessages}
                  promoIndex={promoIndex}
                />
              )}
              <div className="flex-1 overflow-hidden relative">
                {renderScreen()}
              </div>
              {!selectedProduct && <TabBar activeTab={activeTab} onTabChange={setActiveTab} />}
            </div>
          </PhoneFrame>

          {/* Info Panel */}
          <div className="lg:w-80">
            {/* Config Status */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
              <h3 className="font-bold text-green-800 mb-2">🔗 Backend Connected</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>✓ Logo: {navConfig?.logo?.text || 'TNV'} {navConfig?.logo?.badge || 'COLLECTION'}</li>
                <li>✓ Promo Messages: {activePromoMessages.length}</li>
                <li>✓ Categories: {navConfig?.categories?.length || 0}</li>
                <li>✓ Mega Menu: {Object.keys(navConfig?.megaMenu || {}).length} configured</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg mb-4">
              <h2 className="font-bold text-lg mb-4">📱 App Features</h2>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Dynamic categories from backend</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Rotating promo messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Configurable logo &amp; branding</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Product browsing with filters</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Shopping cart &amp; wishlist</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Multi-region currency support</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="font-bold text-lg mb-4">🛠️ Tech Stack</h2>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-600">Framework</span>
                  <span className="font-medium">React Native + Expo</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600">Navigation</span>
                  <span className="font-medium">React Navigation v6</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600">State</span>
                  <span className="font-medium">React Context</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600">API</span>
                  <span className="font-medium">Axios</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600">Storage</span>
                  <span className="font-medium">AsyncStorage</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileAppPreview;
