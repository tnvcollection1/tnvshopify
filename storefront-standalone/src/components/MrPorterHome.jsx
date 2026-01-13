import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from './MrPorterLayout';
import { formatPrice, getApiUrl } from '../config/storeConfig';

const API = import.meta.env.VITE_API_URL || getApiUrl();

// ===================== MR PORTER HERO BANNER =====================
const HeroBanner = ({ storeConfig, banners }) => {
  const storeSlug = storeConfig?.id || 'tnvcollection';
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const defaultBanners = [
    {
      id: 1,
      title: 'NEW SEASON',
      subtitle: 'Spring Summer 2025',
      description: 'Explore the latest arrivals from the world\'s best brands',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=80',
      cta: 'SHOP NOW',
      link: `/products?collection=new`,
      textColor: 'white',
      textPosition: 'left'
    },
    {
      id: 2,
      title: 'THE ESSENTIALS',
      subtitle: 'Timeless Wardrobe Staples',
      description: 'Investment pieces that transcend seasons',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=80',
      cta: 'DISCOVER',
      link: `/products`,
      textColor: 'white',
      textPosition: 'center'
    }
  ];
  
  const slides = banners?.length > 0 ? banners : defaultBanners;

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goToSlide = (index) => setCurrentSlide(index);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);

  return (
    <section className="relative h-[70vh] md:h-[80vh] lg:h-[85vh] bg-black overflow-hidden" data-testid="hero-banner">
      {slides.map((slide, index) => (
        <div
          key={slide.id || index}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
          
          <div className={`absolute inset-0 flex items-center ${
            slide.textPosition === 'center' ? 'justify-center text-center' : 
            slide.textPosition === 'right' ? 'justify-end' : 'justify-start'
          }`}>
            <div className={`px-8 lg:px-16 max-w-2xl ${slide.textPosition === 'right' ? 'pr-16' : ''}`}>
              {slide.subtitle && (
                <p className="text-white/70 text-xs md:text-sm tracking-[0.3em] uppercase mb-3 md:mb-4">
                  {slide.subtitle}
                </p>
              )}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-light text-white tracking-tight mb-4 md:mb-6">
                {slide.title}
              </h1>
              {slide.description && (
                <p className="text-white/80 text-sm md:text-base mb-6 md:mb-8 max-w-md">
                  {slide.description}
                </p>
              )}
              <Link
                to={slide.link}
                className="inline-flex items-center gap-3 bg-white text-black px-6 md:px-8 py-3 md:py-4 text-xs md:text-sm tracking-[0.15em] uppercase hover:bg-black hover:text-white border border-white transition-all duration-300"
              >
                {slide.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
        </>
      )}

      {/* Slide Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-8 md:w-12 h-0.5 transition-all duration-300 ${
                index === currentSlide ? 'bg-white' : 'bg-white/40'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

// ===================== MR PORTER CATEGORY STRIP =====================
const CategoryStrip = ({ storeConfig }) => {
  const storeSlug = storeConfig?.id || 'tnvcollectionpk';
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Fetch main menu to get categories
        const res = await fetch(`${API}/api/shopify/menus?store_name=${storeSlug}`);
        if (res.ok) {
          const data = await res.json();
          const mainMenu = data.menus?.find(m => 
            m.handle === 'main-menu' || m.title?.toLowerCase().includes('main')
          );
          
          if (mainMenu && mainMenu.items?.length > 0) {
            const cats = mainMenu.items.slice(0, 7).map(item => {
              let link = item.url || '/products';
              if (link.includes('/collections/')) {
                const handle = link.split('/collections/')[1]?.split('?')[0]?.split('/')[0];
                link = `/products?collection=${handle}`;
              } else if (link === '/' || link === '#' || link === '') {
                link = '/products';
              }
              
              const cleanName = item.title?.replace(/\{MageNative\}/g, '').trim();
              const isSale = cleanName?.toLowerCase().includes('sale');
              const isTracking = cleanName?.toLowerCase().includes('track');
              
              return {
                name: cleanName,
                link: link,
                highlight: isSale,
                skip: isTracking
              };
            }).filter(c => !c.skip);
            
            setCategories(cats);
          }
        }
      } catch (e) {
        console.error('Failed to fetch categories:', e);
      }
    };
    
    fetchCategories();
  }, [storeSlug]);

  // Default categories if none loaded
  const defaultCategories = [
    { name: 'New Arrivals', link: '/products?collection=new-arrival' },
    { name: 'Men', link: '/products?collection=men' },
    { name: 'Women', link: '/products?collection=women' },
    { name: 'Shoes', link: '/products?collection=formalshoes' },
    { name: 'Bags', link: '/products?collection=shop-bags' },
    { name: 'Accessories', link: '/products?collection=accessories' },
    { name: 'Sale', link: '/products?collection=sale', highlight: true }
  ];

  const displayCategories = categories.length > 0 ? categories : defaultCategories;

  return (
    <section className="bg-white border-b border-gray-200" data-testid="category-strip">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-center justify-center overflow-x-auto scrollbar-hide">
          {displayCategories.map((cat, index) => (
            <Link
              key={index}
              to={cat.link}
              className={`px-4 md:px-6 py-4 text-xs tracking-[0.15em] uppercase whitespace-nowrap transition-colors ${
                cat.highlight 
                  ? 'text-red-600 hover:text-red-700' 
                  : 'text-black hover:text-gray-600'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

// ===================== MR PORTER EDITORIAL GRID =====================
const EditorialGrid = ({ storeConfig, collections }) => {
  const storeSlug = storeConfig?.id || 'tnvcollection';
  
  const defaultCollections = [
    {
      id: 1,
      title: 'THE DESIGNER SALE',
      subtitle: 'Up to 50% off',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
      link: `/products?collection=sale`,
      size: 'large'
    },
    {
      id: 2,
      title: 'NEW IN: SUMMER',
      subtitle: 'Just landed',
      image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80',
      link: `/products?collection=new`,
      size: 'small'
    },
    {
      id: 3,
      title: 'VACATION EDIT',
      subtitle: 'Resort ready',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
      link: `/products?collection=vacation`,
      size: 'small'
    }
  ];

  const items = collections?.length > 0 ? collections : defaultCollections;
  const large = items.find(i => i.size === 'large') || items[0];
  const small = items.filter(i => i.size !== 'large').slice(0, 2);

  return (
    <section className="bg-white py-12 md:py-16" data-testid="editorial-grid">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Large Feature */}
          <Link 
            to={large.link}
            className="relative aspect-[4/5] lg:aspect-auto lg:row-span-2 group overflow-hidden bg-gray-100"
          >
            <img
              src={large.image}
              alt={large.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              {large.subtitle && (
                <p className="text-white/70 text-xs tracking-[0.2em] uppercase mb-2">
                  {large.subtitle}
                </p>
              )}
              <h3 className="text-white text-2xl md:text-3xl font-light tracking-wide mb-4">
                {large.title}
              </h3>
              <span className="inline-flex items-center gap-2 text-white text-xs tracking-[0.15em] uppercase group-hover:gap-3 transition-all">
                SHOP NOW <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>

          {/* Small Features */}
          {small.map((item, index) => (
            <Link
              key={item.id || index}
              to={item.link}
              className="relative aspect-[4/3] group overflow-hidden bg-gray-100"
            >
              <img
                src={item.image}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                {item.subtitle && (
                  <p className="text-white/70 text-xs tracking-[0.2em] uppercase mb-2">
                    {item.subtitle}
                  </p>
                )}
                <h3 className="text-white text-xl md:text-2xl font-light tracking-wide mb-3">
                  {item.title}
                </h3>
                <span className="inline-flex items-center gap-2 text-white text-xs tracking-[0.15em] uppercase group-hover:gap-3 transition-all">
                  SHOP NOW <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

// ===================== MR PORTER PRODUCT CAROUSEL =====================
const ProductCarousel = ({ storeConfig, title, subtitle, products: propProducts, collection }) => {
  const storeSlug = storeConfig?.id || 'tnvcollection';
  const [products, setProducts] = useState(propProducts || []);
  const [loading, setLoading] = useState(!propProducts);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollRef = React.useRef(null);

  useEffect(() => {
    if (propProducts) return;
    
    const fetchProducts = async () => {
      try {
        const url = collection 
          ? `${API}/api/storefront/products?store=${storeSlug}&collection=${collection}&limit=12`
          : `${API}/api/storefront/products?store=${storeSlug}&limit=12`;
        const res = await fetch(url);
        const data = await res.json();
        setProducts(data.products || []);
      } catch (e) {
        console.error('Failed to fetch products:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [storeSlug, collection, propProducts]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollAmount = container.clientWidth * 0.8;
    const newPosition = direction === 'left' 
      ? Math.max(0, scrollPosition - scrollAmount)
      : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount);
    
    container.scrollTo({ left: newPosition, behavior: 'smooth' });
    setScrollPosition(newPosition);
  };

  if (loading) {
    return (
      <section className="bg-white py-12 md:py-16">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <div className="flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-64 md:w-72">
                <div className="aspect-[3/4] bg-gray-100 animate-pulse mb-4" />
                <div className="h-4 bg-gray-100 w-3/4 mb-2" />
                <div className="h-4 bg-gray-100 w-1/4" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="bg-white py-12 md:py-16" data-testid="product-carousel">
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="px-4 lg:px-8 flex items-end justify-between mb-8">
          <div>
            {subtitle && (
              <p className="text-gray-500 text-xs tracking-[0.2em] uppercase mb-2">{subtitle}</p>
            )}
            <h2 className="text-2xl md:text-3xl font-light tracking-wide">{title}</h2>
          </div>
          <div className="hidden md:flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-all"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-all"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Products */}
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 lg:px-8 pb-4"
          onScroll={(e) => setScrollPosition(e.target.scrollLeft)}
        >
          {products.map((product) => (
            <ProductCard 
              key={product.id || product.shopify_product_id} 
              product={product} 
              storeConfig={storeConfig}
            />
          ))}
        </div>

        {/* View All Link */}
        <div className="px-4 lg:px-8 mt-8 text-center">
          <Link 
            to={`/products${collection ? `?collection=${collection}` : ''}`}
            className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase border-b border-black pb-1 hover:gap-3 transition-all"
          >
            VIEW ALL <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

// ===================== MR PORTER PRODUCT CARD =====================
const ProductCard = ({ product, storeConfig }) => {
  const storeSlug = storeConfig?.id || 'tnvcollection';
  const [isHovered, setIsHovered] = useState(false);
  
  const imageUrl = product.images?.[0]?.src || product.image_url || product.image;
  const secondImage = product.images?.[1]?.src;
  const price = product.variants?.[0]?.price || product.price || 0;
  const comparePrice = product.variants?.[0]?.compare_at_price;
  const brand = product.vendor || product.brand || 'TNC Collection';

  return (
    <Link
      to={`/product/${product.shopify_product_id || product.id}`}
      className="flex-shrink-0 w-56 md:w-64 lg:w-72 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid="product-card"
    >
      <div className="relative aspect-[3/4] bg-[#f5f5f5] overflow-hidden mb-4">
        {/* Primary Image */}
        <img
          src={imageUrl}
          alt={product.title}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-500 ${
            isHovered && secondImage ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
          }`}
        />
        {/* Secondary Image on Hover */}
        {secondImage && (
          <img
            src={secondImage}
            alt={product.title}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-500 ${
              isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          />
        )}
        
        {/* Sale Badge */}
        {comparePrice && parseFloat(comparePrice) > parseFloat(price) && (
          <span className="absolute top-3 left-3 bg-black text-white text-[10px] tracking-wider px-2 py-1">
            SALE
          </span>
        )}

        {/* Quick Add */}
        <div className={`absolute bottom-0 left-0 right-0 p-3 transition-all duration-300 ${
          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}>
          <button className="w-full py-2.5 bg-black text-white text-[10px] tracking-[0.15em] uppercase hover:bg-gray-900 transition">
            QUICK VIEW
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] tracking-[0.15em] uppercase text-gray-500">
          {brand}
        </p>
        <h3 className="text-sm text-black line-clamp-2 group-hover:underline">
          {product.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {formatPrice(price, storeConfig)}
          </span>
          {comparePrice && parseFloat(comparePrice) > parseFloat(price) && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(comparePrice, storeConfig)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

// ===================== MR PORTER BRAND BAR =====================
const BrandBar = ({ storeConfig }) => {
  const brands = [
    'GUCCI', 'PRADA', 'BALENCIAGA', 'SAINT LAURENT', 'VALENTINO', 
    'BURBERRY', 'GIVENCHY', 'BOTTEGA VENETA', 'TOM FORD', 'VERSACE'
  ];

  return (
    <section className="bg-[#f5f5f5] py-8 md:py-10 overflow-hidden" data-testid="brand-bar">
      <div className="flex items-center justify-center gap-8 md:gap-16 animate-marquee whitespace-nowrap">
        {[...brands, ...brands].map((brand, index) => (
          <span 
            key={index}
            className="text-xs tracking-[0.2em] text-gray-400 hover:text-black transition-colors cursor-pointer"
          >
            {brand}
          </span>
        ))}
      </div>
    </section>
  );
};

// ===================== MR PORTER THE JOURNAL =====================
const TheJournal = ({ storeConfig }) => {
  const articles = [
    {
      title: 'The Art of Summer Dressing',
      category: 'STYLE',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
      link: '#'
    },
    {
      title: 'Inside the Ateliers of Milan',
      category: 'CRAFT',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
      link: '#'
    },
    {
      title: 'Essential Accessories for Every Man',
      category: 'BUYING GUIDE',
      image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=600&q=80',
      link: '#'
    }
  ];

  return (
    <section className="bg-white py-12 md:py-16 border-t border-gray-100" data-testid="the-journal">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs tracking-[0.3em] text-gray-500 mb-2">THE JOURNAL</p>
          <h2 className="text-2xl md:text-3xl font-light tracking-wide">Stories & Inspiration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {articles.map((article, index) => (
            <a key={index} href={article.link} className="group">
              <div className="aspect-[4/3] overflow-hidden mb-4 bg-gray-100">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <p className="text-[10px] tracking-[0.2em] text-gray-500 mb-2">{article.category}</p>
              <h3 className="text-lg font-light group-hover:underline">{article.title}</h3>
            </a>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a 
            href="#"
            className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase border-b border-black pb-1 hover:gap-3 transition-all"
          >
            READ THE JOURNAL <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

// ===================== MR PORTER SERVICE BAR =====================
const ServiceBar = () => {
  const services = [
    { icon: '🚚', title: 'FREE SHIPPING', description: 'On orders over ₹5,000' },
    { icon: '↩️', title: 'FREE RETURNS', description: 'Within 14 days' },
    { icon: '💳', title: 'SECURE PAYMENT', description: '100% secure checkout' },
    { icon: '📞', title: 'SUPPORT', description: 'Contact us anytime' }
  ];

  return (
    <section className="bg-black text-white py-8" data-testid="service-bar">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {services.map((service, index) => (
            <div key={index} className="text-center">
              <span className="text-2xl mb-2 block">{service.icon}</span>
              <h4 className="text-[10px] tracking-[0.2em] mb-1">{service.title}</h4>
              <p className="text-[10px] text-gray-400">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ===================== FEATURED COLLECTIONS FROM SHOPIFY =====================
const FeaturedCollections = ({ storeConfig }) => {
  const storeSlug = storeConfig?.id || 'tnvcollectionpk';
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await fetch(`${API}/api/storefront/collections?store=${storeSlug}&limit=100`);
        if (res.ok) {
          const data = await res.json();
          const allCollections = data.collections || [];
          
          // Priority collections to show (in order)
          const priorityHandles = [
            'men', 'women', 'new-arrival', 'new-arrivals', 'best-sllers', 'best-sellers',
            'sale', 'sale-2024', 'sale-2025', 'rts', 'sto', 'ready-to-ship',
            'mens-bag', 'shop-bags', 'accessories', 'formalshoes', 'sneakers'
          ];
          
          // Find collections by priority handles
          const featured = [];
          for (const handle of priorityHandles) {
            const found = allCollections.find(c => 
              c.handle?.toLowerCase() === handle.toLowerCase()
            );
            if (found && !featured.some(f => f.handle === found.handle)) {
              featured.push(found);
            }
            if (featured.length >= 8) break;
          }
          
          // If we don't have enough, add some based on title keywords
          if (featured.length < 6) {
            const keywords = ['men', 'women', 'shoe', 'bag', 'new', 'sale', 'best'];
            for (const col of allCollections) {
              if (featured.length >= 8) break;
              const title = col.title?.toLowerCase() || '';
              if (keywords.some(k => title.includes(k)) && !featured.some(f => f.handle === col.handle)) {
                featured.push(col);
              }
            }
          }
          
          setCollections(featured.slice(0, 8));
        }
      } catch (e) {
        console.error('Failed to fetch collections:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCollections();
  }, [storeSlug]);

  if (loading || collections.length === 0) return null;

  return (
    <section className="bg-[#f8f8f8] py-12 md:py-16" data-testid="featured-collections">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs tracking-[0.3em] text-gray-500 mb-2">SHOP BY</p>
          <h2 className="text-2xl md:text-3xl font-light tracking-wide">Featured Collections</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 md:gap-8">
          {collections.slice(0, 8).map((collection) => (
            <Link
              key={collection.shopify_collection_id || collection.handle}
              to={`/products?collection=${collection.handle}`}
              className="group"
            >
              <div className="aspect-[4/5] bg-gray-100 overflow-hidden mb-4 relative">
                <img
                  src={collection.image_url || `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80`}
                  alt={collection.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                  <h3 className="text-white text-sm md:text-base font-medium tracking-wide uppercase">
                    {collection.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link 
            to="/collections"
            className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase border border-black px-6 py-3 hover:bg-black hover:text-white transition-all"
          >
            VIEW ALL COLLECTIONS <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

// ===================== MAIN HOME COMPONENT =====================
const MrPorterHome = () => {
  const storeConfig = useStore();
  const [homeData, setHomeData] = useState({
    banners: [],
    collections: [],
    loading: true
  });

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const res = await fetch(`${API}/api/storefront/home-config?store=${storeConfig?.id || 'tnvcollection'}`);
        if (res.ok) {
          const data = await res.json();
          
          // Transform banners from API format to component format
          const transformedBanners = (data.banners || []).map(b => ({
            id: b.id,
            title: b.title || b.name || '',
            subtitle: b.subtitle || '',
            description: b.description || '',
            image: b.image || b.image_url || '',
            cta: b.cta || b.button_text || 'SHOP NOW',
            link: b.link || b.link_url || '/products',
            textColor: b.text_color || 'white',
            textPosition: b.text_position || 'left'
          }));
          
          // Transform collections from API format to component format
          const transformedCollections = (data.collections || []).map(c => ({
            id: c.id,
            title: c.title || c.name || '',
            subtitle: c.subtitle || c.description || '',
            image: c.image || c.image_url || '',
            link: c.link || c.link_url || '/products',
            size: c.size || (c.position === 0 ? 'large' : 'small')
          }));
          
          setHomeData({
            banners: transformedBanners,
            collections: transformedCollections,
            loading: false
          });
        } else {
          setHomeData(prev => ({ ...prev, loading: false }));
        }
      } catch (e) {
        console.error('Failed to fetch home config:', e);
        setHomeData(prev => ({ ...prev, loading: false }));
      }
    };
    
    if (storeConfig?.id) {
      fetchHomeData();
    }
  }, [storeConfig?.id]);

  return (
    <div data-testid="mrporter-home" className="bg-white">
      <HeroBanner storeConfig={storeConfig} banners={homeData.banners} />
      <CategoryStrip storeConfig={storeConfig} />
      <EditorialGrid storeConfig={storeConfig} collections={homeData.collections} />
      <ProductCarousel 
        storeConfig={storeConfig} 
        title="New Arrivals" 
        subtitle="Just In"
        collection="new-arrivals"
      />
      <FeaturedCollections storeConfig={storeConfig} />
      <BrandBar storeConfig={storeConfig} />
      <ProductCarousel 
        storeConfig={storeConfig} 
        title="Best Sellers" 
        subtitle="Most Popular"
      />
      <TheJournal storeConfig={storeConfig} />
      <ServiceBar />
    </div>
  );
};

export default MrPorterHome;
