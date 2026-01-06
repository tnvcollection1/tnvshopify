import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowRight } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Hero Section
const HeroSection = ({ storeName }) => (
  <section className="relative h-[80vh] min-h-[600px] bg-gray-100 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/20" />
    <img
      src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&q=80"
      alt="Hero"
      className="absolute inset-0 w-full h-full object-cover"
    />
    <div className="relative z-10 h-full flex items-center">
      <div className="max-w-7xl mx-auto px-4 w-full">
        <div className="max-w-xl">
          <p className="text-white/80 text-sm tracking-widest uppercase mb-4">New Collection</p>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Elevate Your Style
          </h1>
          <p className="text-white/80 text-lg mb-8">
            Discover our latest collection of premium footwear and accessories.
          </p>
          <Link
            to="/shop/products"
            className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 font-medium hover:bg-gray-100 transition-colors"
          >
            Shop Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  </section>
);

// Category Card
const CategoryCard = ({ title, image, link, count }) => (
  <Link 
    to={link}
    className="group relative aspect-[3/4] overflow-hidden bg-gray-100"
  >
    <img
      src={image}
      alt={title}
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
    <div className="absolute bottom-0 left-0 right-0 p-6">
      <h3 className="text-white text-2xl font-semibold mb-2">{title}</h3>
      <p className="text-white/70 text-sm">{count} Products</p>
    </div>
  </Link>
);

// Featured Categories
const FeaturedCategories = () => {
  const categories = [
    {
      title: 'Shoes',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
      link: '/shop/shoes',
      count: 124
    },
    {
      title: 'Bags',
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
      link: '/shop/bags',
      count: 86
    },
    {
      title: 'Accessories',
      image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&q=80',
      link: '/shop/accessories',
      count: 52
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">Shop by Category</h2>
            <p className="text-gray-500 mt-2">Explore our curated collections</p>
          </div>
          <Link 
            to="/shop/products"
            className="hidden md:flex items-center gap-2 text-sm font-medium hover:underline"
          >
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <CategoryCard key={cat.title} {...cat} />
          ))}
        </div>
      </div>
    </section>
  );
};

// Product Card
const ProductCard = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);
  const price = product.variants?.[0]?.price || product.price || '0';
  const comparePrice = product.variants?.[0]?.compare_at_price;
  const image = product.images?.[0]?.src || product.image || 'https://via.placeholder.com/400';
  const hoverImage = product.images?.[1]?.src;

  return (
    <Link 
      to={`/shop/product/${product.id}`}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-[3/4] bg-gray-100 overflow-hidden mb-4 relative">
        <img
          src={isHovered && hoverImage ? hoverImage : image}
          alt={product.title}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
        />
        {comparePrice && parseFloat(comparePrice) > parseFloat(price) && (
          <span className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 font-medium">
            SALE
          </span>
        )}
        <button className="absolute bottom-3 left-3 right-3 bg-white text-black py-3 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Quick View
        </button>
      </div>
      <h3 className="font-medium text-gray-900 mb-1 group-hover:underline">{product.title}</h3>
      <div className="flex items-center gap-2">
        <span className="font-semibold">₹{parseFloat(price).toLocaleString()}</span>
        {comparePrice && parseFloat(comparePrice) > parseFloat(price) && (
          <span className="text-gray-400 line-through text-sm">
            ₹{parseFloat(comparePrice).toLocaleString()}
          </span>
        )}
      </div>
    </Link>
  );
};

// Featured Products
const FeaturedProducts = ({ title = "New Arrivals", products = [] }) => (
  <section className="py-20 bg-gray-50">
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex items-end justify-between mb-12">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
          <p className="text-gray-500 mt-2">Fresh styles just dropped</p>
        </div>
        <Link 
          to="/shop/products"
          className="hidden md:flex items-center gap-2 text-sm font-medium hover:underline"
        >
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {products.slice(0, 8).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  </section>
);

// Newsletter
const Newsletter = () => (
  <section className="py-20 bg-black text-white">
    <div className="max-w-7xl mx-auto px-4 text-center">
      <h2 className="text-3xl md:text-4xl font-bold mb-4">Join Our Newsletter</h2>
      <p className="text-gray-400 mb-8 max-w-md mx-auto">
        Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.
      </p>
      <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
        <input
          type="email"
          placeholder="Enter your email"
          className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-none focus:outline-none focus:border-white text-white placeholder-gray-400"
        />
        <button
          type="submit"
          className="px-8 py-3 bg-white text-black font-medium hover:bg-gray-100 transition-colors"
        >
          Subscribe
        </button>
      </form>
    </div>
  </section>
);

// Main Homepage Component
const StorefrontHome = ({ storeName = 'TNC Collection' }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Get store name from URL or default
        const storeParam = storeName.toLowerCase().replace(/\s+/g, '');
        const response = await axios.get(`${API}/api/shopify/products?store_name=${storeParam}&limit=8`);
        setProducts(response.data.products || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [storeName]);

  return (
    <div>
      <HeroSection storeName={storeName} />
      <FeaturedCategories />
      <FeaturedProducts title="New Arrivals" products={products} />
      <Newsletter />
    </div>
  );
};

export default StorefrontHome;
