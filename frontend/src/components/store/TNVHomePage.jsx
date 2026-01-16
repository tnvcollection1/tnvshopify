import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Heart, Camera, Home, Sparkles, ShoppingBag, User, Loader2 } from 'lucide-react';
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
  'Search for Cargo Pants',
  'Search for Hoodies',
  'Search for Sneakers',
  'Search for Dresses',
  'Search for Watches',
];

// Hero banner slides for swipe carousel
const HERO_SLIDES = [
  {
    id: 1,
    title: 'WHITE',
    subtitle: 'IN FOCUS',
    bgImage: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&h=800&fit=crop',
    modelImage: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&h=900&fit=crop',
    collage: [
      { image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=120&h=60&fit=crop', width: 90, height: 40 },
      { image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=100&h=100&fit=crop', width: 60, height: 60 },
      { image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=120&h=120&fit=crop', width: 80, height: 80 },
      { image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=140&h=80&fit=crop', width: 100, height: 55 },
    ],
  },
  {
    id: 2,
    title: 'SUMMER',
    subtitle: 'COLLECTION',
    bgImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=800&fit=crop',
    modelImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=900&fit=crop',
    collage: [
      { image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&h=60&fit=crop', width: 90, height: 40 },
      { image: 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=100&h=100&fit=crop', width: 60, height: 60 },
      { image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=120&h=120&fit=crop', width: 80, height: 80 },
    ],
    gradient: 'from-cyan-400/60 to-blue-500/40',
  },
  {
    id: 3,
    title: 'STREET',
    subtitle: 'STYLE',
    bgImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=800&fit=crop',
    modelImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=900&fit=crop',
    collage: [
      { image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=120&h=60&fit=crop', width: 90, height: 40 },
      { image: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=100&h=100&fit=crop', width: 60, height: 60 },
    ],
    gradient: 'from-purple-500/60 to-pink-500/40',
  },
];

// Quick categories horizontal scroll
const QUICK_CATEGORIES = [
  { name: 'Sneakers', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop' },
  { name: 'Loafers', image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=300&h=200&fit=crop' },
  { name: 'T-Shirts', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=200&fit=crop' },
  { name: 'Jackets', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&h=200&fit=crop' },
  { name: 'Watches', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300&h=200&fit=crop' },
];

const TNVHomePage = () => {
  const { storeName, formatPrice, toggleWishlist, isInWishlist, storeConfig, cartCount, wishlist } = useStore();
  const baseUrl = storeConfig?.baseUrl || '/tnv';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [genderOpen, setGenderOpen] = useState(false);
  const [selectedGender, setSelectedGender] = useState('MEN');
  const [searchPlaceholder, setSearchPlaceholder] = useState(SEARCH_PLACEHOLDERS[0]);
  const [activeTab, setActiveTab] = useState('home');
  
  // Hero carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const autoPlayRef = useRef(null);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Minimum swipe distance
  const minSwipeDistance = 50;

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

  // Auto-play carousel
  useEffect(() => {
    autoPlayRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(autoPlayRef.current);
  }, []);

  // Reset autoplay on manual navigation
  const resetAutoPlay = () => {
    clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
  };

  // Touch handlers for swipe
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
      resetAutoPlay();
    }
    if (isRightSwipe) {
      setCurrentSlide(prev => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
      resetAutoPlay();
    }
  };

  // Navigate slides
  const goToSlide = (index) => {
    setCurrentSlide(index);
    resetAutoPlay();
  };

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    resetAutoPlay();
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
    resetAutoPlay();
  };

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, [storeName]);

  const fetchData = async () => {
    try {
      const productsRes = await fetch(`${API_URL}/api/storefront/products?store=${storeName}&limit=12&page=1`);
      const productsData = await productsRes.json();
      setProducts(productsData.products || []);
      setHasMore((productsData.products || []).length >= 12);
      setPage(1);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load more products (infinite scroll)
  const loadMoreProducts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const productsRes = await fetch(`${API_URL}/api/storefront/products?store=${storeName}&limit=12&page=${nextPage}`);
      const productsData = await productsRes.json();
      const newProducts = productsData.products || [];
      
      if (newProducts.length > 0) {
        setProducts(prev => [...prev, ...newProducts]);
        setPage(nextPage);
        setHasMore(newProducts.length >= 12);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Error loading more products:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore, hasMore, storeName]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreProducts();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMoreProducts, hasMore, loadingMore]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentHeroSlide = HERO_SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-white pb-20" data-testid="tnv-home">
      {/* === CATEGORY TABS === */}
      <div className="sticky top-0 z-40 bg-white">
        {/* Category Tabs Row */}
        <div className="flex overflow-x-auto scrollbar-hide px-2 py-3 gap-2">
          {/* FASHION */}
          <Link to={`${baseUrl}/fashion`} className="flex-shrink-0">
            <div className="w-[72px] h-[80px] rounded-xl overflow-hidden relative" style={{ backgroundColor: '#c4ff00' }}>
              <img src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=150&h=150&fit=crop" alt="Fashion" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-white/95 py-1">
                <span className="text-[10px] font-bold text-center block">FASHION</span>
              </div>
            </div>
          </Link>

          {/* Beauty */}
          <Link to={`${baseUrl}/beauty`} className="flex-shrink-0">
            <div className="w-[72px] h-[80px] rounded-xl overflow-hidden relative flex items-center justify-center" style={{ backgroundColor: '#ff69b4' }}>
              <div className="w-14 h-14 rounded-full overflow-hidden border-4 border-white">
                <img src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=150&h=150&fit=crop" alt="Beauty" className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-white/95 py-1">
                <span className="text-[10px] font-bold text-center block italic">Beauty</span>
              </div>
            </div>
          </Link>

          {/* BABY & KIDS */}
          <Link to={`${baseUrl}/kids`} className="flex-shrink-0">
            <div className="w-[72px] h-[80px] rounded-xl overflow-hidden relative" style={{ backgroundColor: '#7FFFD4' }}>
              <img src="https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=150&h=150&fit=crop" alt="Baby & Kids" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-white/95 py-1">
                <span className="text-[9px] font-bold text-center block">BABY & KIDS</span>
              </div>
            </div>
          </Link>

          {/* HOME & LIFESTYLE */}
          <Link to={`${baseUrl}/home`} className="flex-shrink-0">
            <div className="w-[72px] h-[80px] rounded-xl overflow-hidden relative" style={{ backgroundColor: '#FFDAB9' }}>
              <img src="https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=150&h=150&fit=crop" alt="Home & Lifestyle" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-white/95 py-1">
                <span className="text-[8px] font-bold text-center block leading-tight">HOME &<br/>LIFESTYLE</span>
              </div>
            </div>
          </Link>

          {/* PREMIUM */}
          <Link to={`${baseUrl}/premium`} className="flex-shrink-0">
            <div className="w-[72px] h-[80px] rounded-xl overflow-hidden relative flex items-center justify-center" style={{ backgroundColor: '#f5f5f5' }}>
              <span className="text-sm font-bold text-center">PREMIUM</span>
            </div>
          </Link>
        </div>

        {/* Search Row */}
        <div className="flex items-center gap-2 px-3 pb-3">
          <button onClick={() => setGenderOpen(!genderOpen)} className="flex items-center gap-1 px-4 py-2.5 border border-gray-300 rounded-lg font-bold text-sm min-w-[90px] justify-between">
            <span>{selectedGender}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${genderOpen ? 'rotate-180' : ''}`} />
          </button>

          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder={searchPlaceholder} className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400" />
            <Camera className="w-5 h-5 text-gray-500" />
          </div>

          <Link to={`${baseUrl}/wishlist`} className="p-2">
            <Heart className="w-6 h-6 stroke-[1.5]" />
          </Link>
        </div>

        {/* Gender Dropdown Panel */}
        {genderOpen && (
          <div className="absolute left-0 right-0 top-full bg-white border-t border-b shadow-lg z-50">
            <button onClick={() => { setSelectedGender('Women'); setGenderOpen(false); }} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <img src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=60&h=60&fit=crop" alt="Women" className="w-12 h-12 rounded-lg object-cover" />
                <span className="font-medium">Women</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button onClick={() => { setSelectedGender('Men'); setGenderOpen(false); }} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-t">
              <div className="flex items-center gap-3">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop" alt="Men" className="w-12 h-12 rounded-lg object-cover" />
                <span className="font-medium">Men</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        )}
      </div>

      {/* === SWIPEABLE HERO BANNER CAROUSEL === */}
      <section className="relative" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className="relative h-[480px] overflow-hidden">
          {/* Slide Content */}
          <div 
            className="absolute inset-0 transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)`, width: `${HERO_SLIDES.length * 100}%`, display: 'flex' }}
          >
            {HERO_SLIDES.map((slide, idx) => (
              <div key={slide.id} className="relative h-full" style={{ width: `${100 / HERO_SLIDES.length}%` }}>
                {/* Background */}
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${slide.bgImage})` }} />
                <div className={`absolute inset-0 bg-gradient-to-b ${slide.gradient || 'from-transparent to-white/20'}`} />

                {/* Model */}
                <div className="absolute left-0 bottom-0 w-[55%] h-full">
                  <img src={slide.modelImage} alt="Model" className="w-full h-full object-cover object-top" />
                </div>

                {/* Title */}
                <div className="absolute top-8 right-0 left-[45%] text-center z-10">
                  <h1 className="text-white text-4xl font-serif tracking-wide drop-shadow-lg">{slide.title}</h1>
                  <p className="text-white text-base font-light tracking-[0.3em] mt-1">{slide.subtitle}</p>
                  <button className="mt-4 bg-white text-black px-8 py-2.5 rounded-full text-sm font-medium shadow-lg hover:shadow-xl transition">
                    Shop Now
                  </button>
                </div>

                {/* Product Collage */}
                <div className="absolute right-3 top-[35%] flex flex-col gap-2 items-end z-10">
                  {slide.collage.map((item, cidx) => (
                    <div key={cidx} className="bg-white rounded-lg p-2 shadow-lg" style={{ width: item.width, height: item.height }}>
                      <img src={item.image} alt="" className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button 
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition z-20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition z-20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className={`h-2 rounded-full transition-all ${idx === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/50'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* === QUICK CATEGORIES === */}
      <section className="py-3">
        <div className="flex overflow-x-auto scrollbar-hide gap-2 px-2">
          {QUICK_CATEGORIES.map((cat, idx) => (
            <Link key={idx} to={`${baseUrl}/category/${cat.name.toLowerCase()}`} className="flex-shrink-0">
              <div className="w-28 h-20 rounded-lg overflow-hidden">
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* === 30% CASHBACK PROMO === */}
      <section className="px-3 py-2">
        <div className="relative rounded-2xl overflow-hidden h-28 bg-gradient-to-r from-cyan-400 via-teal-500 to-emerald-500">
          <div className="absolute inset-0 flex items-center justify-between px-5">
            <div>
              <h3 className="text-white text-2xl font-black">30% CASHBACK</h3>
              <p className="text-white/90 text-sm">On Sports Apparel & Footwear</p>
            </div>
            <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-center">
              <p className="text-[10px] text-gray-300 uppercase">Use Code:</p>
              <p className="font-black text-lg">SPORTS30</p>
            </div>
          </div>
        </div>
      </section>

      {/* === SPORTS EDIT SECTION === */}
      <section className="py-3 px-3">
        <div className="relative rounded-2xl overflow-hidden h-56 bg-gradient-to-br from-emerald-700 to-emerald-500">
          <img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop" alt="Sports" className="absolute right-0 bottom-0 w-1/2 h-full object-cover object-left" />
          <div className="absolute left-5 top-1/2 -translate-y-1/2">
            <h3 className="text-white text-2xl font-black mb-1">Sports Edit</h3>
            <p className="text-white/80 text-sm mb-4">Your Go-To<br/>Active Essentials</p>
            <button className="bg-white text-black px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-100 transition">Shop Now</button>
          </div>
        </div>
      </section>

      {/* === PRODUCTS WITH INFINITE SCROLL === */}
      <section className="py-3 px-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">All Products</h2>
          <span className="text-sm text-gray-500">{products.length} items</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {products.map((product, idx) => (
            <ProductCard key={`${product.shopify_product_id}-${idx}`} product={product} baseUrl={baseUrl} />
          ))}
        </div>

        {/* Load More Trigger */}
        <div ref={loadMoreRef} className="py-8 flex justify-center">
          {loadingMore && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading more products...</span>
            </div>
          )}
          {!hasMore && products.length > 0 && (
            <p className="text-sm text-gray-400">You've seen all products!</p>
          )}
        </div>
      </section>

      {/* === MEGA SALE BANNER === */}
      <section className="px-3 py-2">
        <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 rounded-2xl p-6 text-center">
          <h3 className="text-white text-2xl font-black mb-1">MEGA SALE</h3>
          <p className="text-white/90 text-sm mb-3">Up to 70% OFF on selected items</p>
          <Link to={`${baseUrl}/sale`} className="inline-block bg-white text-pink-600 px-8 py-2 rounded-full font-bold text-sm">Shop Now</Link>
        </div>
      </section>

      {/* === BOTTOM NAVIGATION BAR === */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 safe-area-pb">
        <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
          <button onClick={() => setActiveTab('home')} className="flex flex-col items-center py-1 px-3">
            <div className={`p-1 rounded ${activeTab === 'home' ? 'text-black' : 'text-gray-400'}`}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill={activeTab === 'home' ? '#c4ff00' : 'none'} stroke="currentColor" strokeWidth={activeTab === 'home' ? 2 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className={`text-[10px] font-medium ${activeTab === 'home' ? 'text-black' : 'text-gray-400'}`}>Home</span>
          </button>
          
          <Link to={`${baseUrl}/categories`} className="flex flex-col items-center py-1 px-3 text-gray-400">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            <span className="text-[10px] font-medium">Categories</span>
          </Link>
          
          <Link to={`${baseUrl}/new-arrivals`} className="flex flex-col items-center py-1 px-3 text-gray-400">
            <Sparkles className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-[10px] font-medium">2026 Reset</span>
          </Link>
          
          <Link to={`${baseUrl}/cart`} className="flex flex-col items-center py-1 px-3 text-gray-400 relative">
            <ShoppingBag className="w-6 h-6" strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute top-0 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>
            )}
            <span className="text-[10px] font-medium">Bag</span>
          </Link>
          
          <Link to={`${baseUrl}/account`} className="flex flex-col items-center py-1 px-3 text-gray-400">
            <User className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Account</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

// Product Card Component
const ProductCard = ({ product, baseUrl }) => {
  const { formatPrice, toggleWishlist, isInWishlist } = useStore();
  const [imageError, setImageError] = useState(false);
  
  const image = getImageUrl(product.images?.[0]?.src);
  const price = product.variants?.[0]?.price || product.price || 0;
  const comparePrice = product.variants?.[0]?.compare_at_price;
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : 0;

  return (
    <div className="group relative bg-white rounded-lg overflow-hidden">
      <Link to={`${baseUrl}/product/${product.shopify_product_id}`}>
        <div className="aspect-[3/4] overflow-hidden bg-gray-100">
          <img
            src={imageError ? 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop' : image}
            alt={product.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </Link>
      
      <button
        onClick={() => toggleWishlist(product)}
        className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow hover:scale-110 transition"
      >
        <Heart className={`w-4 h-4 ${isInWishlist(product.shopify_product_id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
      </button>
      
      {discount > 0 && (
        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-{discount}%</span>
      )}
      
      <div className="p-2">
        <p className="text-[10px] text-gray-500 mb-0.5 truncate">{product.vendor || 'TNV Collection'}</p>
        <h3 className="text-xs font-medium line-clamp-2 mb-1 min-h-[2rem]">{product.title}</h3>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm">{formatPrice(price)}</span>
          {comparePrice && <span className="text-[10px] text-gray-400 line-through">{formatPrice(comparePrice)}</span>}
        </div>
      </div>
    </div>
  );
};

export { ProductCard };
export default TNVHomePage;
