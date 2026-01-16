import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Heart, Camera, Home, Grid3X3, Sparkles, ShoppingBag, User } from 'lucide-react';
import { useStore } from './TNVStoreLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper to get full image URL
const getImageUrl = (src) => {
  if (!src) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop';
  if (src.startsWith('/api/')) return `${API_URL}${src}`;
  return src;
};

// Search placeholder options (rotating)
const SEARCH_PLACEHOLDERS = [
  'Search for Baggy Jeans',
  'Search for Hoodies',
  'Search for Sneakers',
  'Search for Dresses',
  'Search for Watches',
];

const TNVHomePage = () => {
  const { storeName, formatPrice, toggleWishlist, isInWishlist, storeConfig, cartCount, wishlist } = useStore();
  const baseUrl = storeConfig?.baseUrl || '/tnv';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genderOpen, setGenderOpen] = useState(false);
  const [selectedGender, setSelectedGender] = useState('MEN');
  const [searchPlaceholder, setSearchPlaceholder] = useState(SEARCH_PLACEHOLDERS[0]);
  const [activeTab, setActiveTab] = useState('home');

  // Rotate search placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setSearchPlaceholder(prev => {
        const idx = SEARCH_PLACEHOLDERS.indexOf(prev);
        return SEARCH_PLACEHOLDERS[(idx + 1) % SEARCH_PLACEHOLDERS.length];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchData();
  }, [storeName]);

  const fetchData = async () => {
    try {
      const productsRes = await fetch(`${API_URL}/api/storefront/products?store=${storeName}&limit=24`);
      const productsData = await productsRes.json();
      setProducts(productsData.products || []);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Category tabs - Namshi style with colorful backgrounds
  const categoryTabs = [
    { name: 'FASHION', bgColor: '#c4f a0', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=100&h=100&fit=crop', hasGreenBg: true },
    { name: 'Beauty', bgColor: '#f0a0d0', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=100&h=100&fit=crop' },
    { name: 'BABY & KIDS', bgColor: '#a0f0d0', image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=100&h=100&fit=crop' },
    { name: 'HOME & LIFESTYLE', bgColor: '#f0d0a0', image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=100&h=100&fit=crop' },
    { name: 'PREMIUM', bgColor: '#f5f5f5', image: null, isText: true },
  ];

  // Quick category links
  const quickCategories = [
    { name: 'New Arrivals', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=200&h=200&fit=crop' },
    { name: 'Pants', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=200&h=200&fit=crop' },
    { name: 'Sports', image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200&h=200&fit=crop' },
    { name: 'Watches', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&h=200&fit=crop' },
    { name: 'Shoes', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* === NAMSHI-STYLE HEADER === */}
      
      {/* Category Tabs - Horizontal scroll */}
      <div className="sticky top-0 z-40 bg-white border-b">
        <div className="flex overflow-x-auto scrollbar-hide py-3 px-2 gap-2">
          {categoryTabs.map((tab, idx) => (
            <Link
              key={idx}
              to={`${baseUrl}/${tab.name.toLowerCase().replace(/\s+/g, '-')}`}
              className="flex-shrink-0"
            >
              <div 
                className="w-20 h-20 rounded-lg overflow-hidden flex flex-col items-center justify-center relative"
                style={{ backgroundColor: tab.hasGreenBg ? '#c4fa70' : tab.bgColor }}
              >
                {tab.image ? (
                  <img src={tab.image} alt={tab.name} className="w-full h-full object-cover" />
                ) : tab.isText ? (
                  <span className="text-xs font-bold text-center px-1">{tab.name}</span>
                ) : null}
                {tab.image && (
                  <div className="absolute bottom-0 left-0 right-0 bg-white/90 py-1">
                    <span className="text-[10px] font-bold text-center block">{tab.name}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Search Row */}
        <div className="flex items-center gap-2 px-3 pb-3">
          {/* Gender Dropdown */}
          <button 
            onClick={() => setGenderOpen(!genderOpen)}
            className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg font-bold text-sm"
          >
            {selectedGender}
            {genderOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Search Input */}
          <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder={searchPlaceholder}
              className="flex-1 text-sm outline-none bg-transparent"
            />
            <Camera className="w-5 h-5 text-gray-400" />
          </div>

          {/* Wishlist */}
          <Link to={`${baseUrl}/wishlist`} className="p-2 relative">
            <Heart className="w-6 h-6" />
            {wishlist?.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </Link>
        </div>

        {/* Gender Dropdown Panel */}
        {genderOpen && (
          <div className="absolute left-0 right-0 top-full bg-white border-b shadow-lg z-50">
            <button 
              onClick={() => { setSelectedGender('Women'); setGenderOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <img 
                  src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=60&h=60&fit=crop" 
                  alt="Women"
                  className="w-12 h-12 rounded object-cover"
                />
                <span className="font-medium">Women</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button 
              onClick={() => { setSelectedGender('Men'); setGenderOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-t"
            >
              <div className="flex items-center gap-3">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop" 
                  alt="Men"
                  className="w-12 h-12 rounded object-cover"
                />
                <span className="font-medium">Men</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        )}
      </div>

      {/* === HERO BANNER - Product Collage Style === */}
      <section className="relative">
        <div className="relative h-[450px] overflow-hidden">
          {/* Background - Desert/warm tones */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: 'url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=800&fit=crop)',
              filter: 'brightness(1.1) saturate(0.9)'
            }}
          />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#d4b896]/80 via-transparent to-[#c9a882]/60" />
          
          {/* Model/Main Image */}
          <div className="absolute left-0 bottom-0 w-1/2 h-full">
            <img 
              src="https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&h=900&fit=crop"
              alt="Model"
              className="w-full h-full object-cover object-top"
            />
          </div>

          {/* Title + Shop Now */}
          <div className="absolute top-8 right-4 text-right">
            <h1 className="text-4xl font-serif text-white drop-shadow-lg">
              WHITE
            </h1>
            <p className="text-lg text-white/90 font-light tracking-widest">IN FOCUS</p>
            <button className="mt-4 bg-white/90 backdrop-blur-sm text-black px-6 py-2 rounded-full text-sm font-medium hover:bg-white transition">
              Shop Now
            </button>
          </div>

          {/* Product Collage - Right side */}
          <div className="absolute right-4 top-1/3 flex flex-col gap-3 items-end">
            {/* Sunglasses */}
            <img 
              src="https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=100&h=60&fit=crop"
              alt="Sunglasses"
              className="w-24 h-14 object-contain bg-white/80 backdrop-blur-sm rounded-lg p-2"
            />
            {/* Watch */}
            <img 
              src="https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=80&h=80&fit=crop"
              alt="Watch"
              className="w-20 h-20 object-contain bg-white/80 backdrop-blur-sm rounded-lg p-2"
            />
            {/* Hoodie */}
            <img 
              src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=100&h=100&fit=crop"
              alt="Hoodie"
              className="w-24 h-24 object-cover bg-white/80 backdrop-blur-sm rounded-lg"
            />
            {/* Sneakers */}
            <img 
              src="https://images.unsplash.com/photo-1549298916-b41d501d3772?w=120&h=80&fit=crop"
              alt="Sneakers"
              className="w-28 h-16 object-cover bg-white/80 backdrop-blur-sm rounded-lg"
            />
          </div>
        </div>
      </section>

      {/* === QUICK CATEGORIES === */}
      <section className="py-4">
        <div className="flex overflow-x-auto scrollbar-hide gap-4 px-4">
          {quickCategories.map((cat, idx) => (
            <Link 
              key={idx}
              to={`${baseUrl}/category/${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
              className="flex-shrink-0 text-center"
            >
              <div className="w-24 h-24 rounded-lg overflow-hidden mb-2">
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-medium">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* === PROMO BANNER - 30% CASHBACK === */}
      <section className="px-4 py-2">
        <div className="relative rounded-2xl overflow-hidden h-28 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400">
          <div className="absolute inset-0 flex items-center justify-between px-6">
            <div>
              <h3 className="text-white text-xl font-black">30% CASHBACK</h3>
              <p className="text-white/90 text-sm">On Sports Apparel & Footwear</p>
            </div>
            <div className="bg-black text-white px-4 py-2 rounded-lg">
              <p className="text-[10px] text-gray-300">USE CODE:</p>
              <p className="font-black">SPORTS30</p>
            </div>
          </div>
          {/* Decorative elements */}
          <img 
            src="https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=150&h=100&fit=crop"
            alt=""
            className="absolute right-20 bottom-0 w-24 h-20 object-contain opacity-60"
          />
        </div>
      </section>

      {/* === SPORTS EDIT SECTION === */}
      <section className="py-4">
        <div className="relative mx-4 rounded-2xl overflow-hidden h-64 bg-gradient-to-br from-emerald-800 to-emerald-600">
          <img 
            src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop"
            alt="Sports"
            className="absolute right-0 bottom-0 w-1/2 h-full object-cover object-left"
          />
          <div className="absolute left-6 top-1/2 -translate-y-1/2">
            <h3 className="text-white text-2xl font-black mb-1">Sports Edit</h3>
            <p className="text-white/80 text-sm mb-4">
              Your Go-To<br/>Active Essentials
            </p>
            <button className="bg-white/90 text-black px-6 py-2 rounded-full text-sm font-medium hover:bg-white transition">
              Shop Now
            </button>
          </div>
        </div>
      </section>

      {/* === PRODUCTS GRID === */}
      <section className="py-4 px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Today's Picks</h2>
          <Link to={`${baseUrl}/products`} className="text-sm text-gray-500">View All →</Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {products.slice(0, 8).map((product, idx) => (
            <ProductCard key={product.shopify_product_id || idx} product={product} />
          ))}
        </div>
      </section>

      {/* === MORE PROMOS === */}
      <section className="px-4 py-2">
        <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 rounded-2xl p-6 text-center">
          <h3 className="text-white text-2xl font-black mb-2">MEGA SALE</h3>
          <p className="text-white/90 mb-4">Up to 70% OFF on selected items</p>
          <Link 
            to={`${baseUrl}/sale`}
            className="inline-block bg-white text-pink-600 px-8 py-2 rounded-full font-bold text-sm hover:bg-gray-100 transition"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* === MORE PRODUCTS === */}
      <section className="py-4 px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Trending Now</h2>
          <Link to={`${baseUrl}/products`} className="text-sm text-gray-500">View All →</Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {products.slice(8, 16).map((product, idx) => (
            <ProductCard key={product.shopify_product_id || idx} product={product} />
          ))}
        </div>
      </section>

      {/* === BOTTOM NAVIGATION BAR === */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50">
        <div className="flex items-center justify-around py-2">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center py-1 px-4 ${activeTab === 'home' ? 'text-black' : 'text-gray-400'}`}
          >
            <Home className={`w-6 h-6 ${activeTab === 'home' ? 'fill-lime-400 stroke-black' : ''}`} />
            <span className="text-[10px] font-medium mt-1">Home</span>
          </button>
          
          <Link to={`${baseUrl}/categories`} className="flex flex-col items-center py-1 px-4 text-gray-400">
            <Grid3X3 className="w-6 h-6" />
            <span className="text-[10px] font-medium mt-1">Categories</span>
          </Link>
          
          <Link to={`${baseUrl}/new-arrivals`} className="flex flex-col items-center py-1 px-4 text-gray-400">
            <Sparkles className="w-6 h-6" />
            <span className="text-[10px] font-medium mt-1">2026 Reset</span>
          </Link>
          
          <Link to={`${baseUrl}/cart`} className="flex flex-col items-center py-1 px-4 text-gray-400 relative">
            <ShoppingBag className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute top-0 right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
            <span className="text-[10px] font-medium mt-1">Bag</span>
          </Link>
          
          <Link to={`${baseUrl}/account`} className="flex flex-col items-center py-1 px-4 text-gray-400">
            <User className="w-6 h-6" />
            <span className="text-[10px] font-medium mt-1">Account</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

// Product Card Component
const ProductCard = ({ product }) => {
  const { formatPrice, toggleWishlist, isInWishlist } = useStore();
  const [imageError, setImageError] = useState(false);
  
  const image = getImageUrl(product.images?.[0]?.src);
  const price = product.variants?.[0]?.price || product.price || 0;
  const comparePrice = product.variants?.[0]?.compare_at_price;
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : 0;

  return (
    <div className="group relative bg-white rounded-lg overflow-hidden">
      <Link to={`/tnv/product/${product.shopify_product_id}`}>
        <div className="aspect-[3/4] overflow-hidden bg-gray-100">
          <img
            src={imageError ? 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop' : image}
            alt={product.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </Link>
      
      <button
        onClick={() => toggleWishlist(product)}
        className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition"
      >
        <Heart className={`w-4 h-4 ${isInWishlist(product.shopify_product_id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
      </button>
      
      {discount > 0 && (
        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
          -{discount}%
        </span>
      )}
      
      <div className="p-2">
        <p className="text-xs text-gray-500 mb-1 truncate">{product.vendor || 'TNV Collection'}</p>
        <h3 className="text-sm font-medium line-clamp-2 mb-1 min-h-[2.5rem]">{product.title}</h3>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{formatPrice(price)}</span>
          {comparePrice && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(comparePrice)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export { ProductCard };
export default TNVHomePage;
