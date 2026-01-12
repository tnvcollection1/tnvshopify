import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore, useCart } from './LuxuryStorefrontLayout';
import { formatPrice } from './config/storeConfig';

const API = process.env.REACT_APP_BACKEND_URL;

// ===================== HERO SECTION =====================

const HeroSection = ({ storeConfig }) => {
  const storeSlug = storeConfig?.id || 'tnvcollection';
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    {
      title: 'Spring Summer',
      subtitle: '2025 Collection',
      description: 'Discover the new season essentials',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&q=80',
      cta: 'Shop Now',
      link: `/store/${storeSlug}/products?collection=new`
    },
    {
      title: 'Timeless',
      subtitle: 'Elegance',
      description: 'Curated pieces for the modern wardrobe',
      image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&q=80',
      cta: 'Explore',
      link: `/store/${storeSlug}/products`
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="relative h-[85vh] min-h-[600px] max-h-[900px] overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>
      ))}
      
      <div className="relative h-full flex items-center">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 w-full">
          <div className="max-w-xl">
            <p className="text-white/80 text-sm tracking-[0.3em] uppercase mb-4 animate-fade-in">
              {slides[currentSlide].subtitle}
            </p>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-light text-white mb-6 tracking-tight">
              {slides[currentSlide].title}
            </h1>
            <p className="text-white/80 text-lg mb-8">
              {slides[currentSlide].description}
            </p>
            <Link
              to={slides[currentSlide].link}
              className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 text-sm tracking-wider uppercase hover:bg-gray-100 transition-colors group"
            >
              {slides[currentSlide].cta}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-12 h-1 transition-colors ${
              index === currentSlide ? 'bg-white' : 'bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
        className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
        className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>
    </section>
  );
};

// ===================== CATEGORY GRID =====================

const CategoryGrid = ({ storeConfig }) => {
  const storeSlug = storeConfig?.id || 'tnvcollection';
  
  const categories = [
    {
      title: 'New Arrivals',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
      link: `/store/${storeSlug}/products?collection=new`,
      size: 'large'
    },
    {
      title: 'Women',
      image: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=800&q=80',
      link: `/store/${storeSlug}/products?category=women`,
      size: 'small'
    },
    {
      title: 'Men',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
      link: `/store/${storeSlug}/products?category=men`,
      size: 'small'
    },
    {
      title: 'Accessories',
      image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=800&q=80',
      link: `/store/${storeSlug}/products?category=accessories`,
      size: 'medium'
    }
  ];

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-light tracking-wide">Shop by Category</h2>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {categories.map((cat, index) => (
            <Link
              key={index}
              to={cat.link}
              className={`group relative overflow-hidden bg-gray-100 ${
                cat.size === 'large' ? 'col-span-2 row-span-2 aspect-[4/5]' : 
                cat.size === 'medium' ? 'col-span-2 aspect-[2/1]' : 'aspect-[3/4]'
              }`}
            >
              <img
                src={cat.image}
                alt={cat.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
              <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                <h3 className="text-white text-xl lg:text-2xl font-light tracking-wide">
                  {cat.title}
                </h3>
                <span className="inline-flex items-center gap-2 text-white/80 text-sm mt-2 group-hover:gap-3 transition-all">
                  Shop Now <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

// ===================== FEATURED PRODUCTS =====================

const FeaturedProducts = ({ storeConfig }) => {
  const storeSlug = storeConfig?.id || 'tnvcollection';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API}/api/storefront/products?store=${storeSlug}&limit=8`);
        const data = await res.json();
        setProducts(data.products || []);
      } catch (e) {
        console.error('Failed to fetch products:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [storeSlug]);

  if (loading) {
    return (
      <section className="py-16 lg:py-24 bg-[#f8f8f8]">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <div className="animate-pulse grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i}>
                <div className="aspect-[3/4] bg-gray-200 mb-4" />
                <div className="h-4 bg-gray-200 w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 w-1/4" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 lg:py-24 bg-[#f8f8f8]">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl lg:text-4xl font-light tracking-wide">Featured Products</h2>
            <p className="text-gray-500 mt-2">Discover our latest additions</p>
          </div>
          <Link 
            to={`/store/${storeSlug}/products`}
            className="hidden sm:flex items-center gap-2 text-sm tracking-wider uppercase hover:gap-3 transition-all"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {products.slice(0, 8).map((product) => (
            <ProductCard 
              key={product.id || product.shopify_product_id} 
              product={product} 
              storeConfig={storeConfig}
            />
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link 
            to={`/store/${storeSlug}/products`}
            className="inline-flex items-center gap-2 text-sm tracking-wider uppercase"
          >
            View All Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

// ===================== PRODUCT CARD =====================

const ProductCard = ({ product, storeConfig }) => {
  const storeSlug = storeConfig?.id || 'tnvcollection';
  const [isHovered, setIsHovered] = useState(false);
  
  const imageUrl = product.images?.[0]?.src || product.image_url || product.image;
  const secondImage = product.images?.[1]?.src;
  const price = product.variants?.[0]?.price || product.price || 0;
  const comparePrice = product.variants?.[0]?.compare_at_price;

  return (
    <Link
      to={`/store/${storeSlug}/product/${product.shopify_product_id || product.id}`}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[3/4] bg-[#f5f5f5] overflow-hidden mb-4">
        {/* Primary Image */}
        <img
          src={imageUrl}
          alt={product.title}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ${
            isHovered && secondImage ? 'opacity-0' : 'opacity-100'
          }`}
        />
        {/* Secondary Image on Hover */}
        {secondImage && (
          <img
            src={secondImage}
            alt={product.title}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
        
        {/* Sale Badge */}
        {comparePrice && parseFloat(comparePrice) > parseFloat(price) && (
          <span className="absolute top-3 left-3 bg-red-600 text-white text-xs tracking-wider px-2 py-1">
            SALE
          </span>
        )}

        {/* Quick Add */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <button className="w-full py-3 bg-white text-black text-xs tracking-wider uppercase hover:bg-gray-100 transition">
            Quick View
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:underline">
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

// ===================== EDITORIAL SECTION =====================

const EditorialSection = ({ storeConfig }) => {
  const storeSlug = storeConfig?.id || 'tnvcollection';
  
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div className="relative aspect-[4/5] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200&q=80"
              alt="Editorial"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:pl-8">
            <p className="text-sm tracking-[0.3em] uppercase text-gray-500 mb-4">The Edit</p>
            <h2 className="text-4xl lg:text-5xl font-light tracking-wide mb-6">
              Effortless Elegance
            </h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              Discover our curated selection of timeless pieces designed for the modern individual. 
              Each item is carefully crafted with premium materials and attention to detail, 
              ensuring lasting quality and sophisticated style.
            </p>
            <Link
              to={`/store/${storeSlug}/products`}
              className="inline-flex items-center gap-3 border-b-2 border-black pb-2 text-sm tracking-wider uppercase hover:gap-4 transition-all"
            >
              Discover More <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

// ===================== INSTAGRAM FEED =====================

const InstagramFeed = ({ storeConfig }) => {
  const images = [
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80',
    'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&q=80',
  ];

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm tracking-[0.3em] uppercase text-gray-500 mb-2">Follow Us</p>
          <h2 className="text-3xl lg:text-4xl font-light tracking-wide">@tnvcollection</h2>
        </div>
        
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-4">
          {images.map((img, index) => (
            <a
              key={index}
              href={storeConfig?.social?.instagram || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square overflow-hidden group"
            >
              <img
                src={img}
                alt={`Instagram ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

// ===================== MAIN COMPONENT =====================

const LuxuryStorefrontHome = () => {
  const storeConfig = useStore();
  
  return (
    <div data-testid="luxury-storefront-home">
      <HeroSection storeConfig={storeConfig} />
      <CategoryGrid storeConfig={storeConfig} />
      <FeaturedProducts storeConfig={storeConfig} />
      <EditorialSection storeConfig={storeConfig} />
      <InstagramFeed storeConfig={storeConfig} />
    </div>
  );
};

export default LuxuryStorefrontHome;
