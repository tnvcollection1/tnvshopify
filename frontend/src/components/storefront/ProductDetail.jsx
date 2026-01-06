import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Heart, Share2, Truck, Shield, RefreshCw, Minus, Plus } from 'lucide-react';
import axios from 'axios';
import { useCart } from './StorefrontLayout';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Image Gallery
const ImageGallery = ({ images = [] }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const defaultImage = 'https://via.placeholder.com/800x1000?text=No+Image';
  
  const displayImages = images.length > 0 ? images : [{ src: defaultImage }];

  return (
    <div className="flex gap-4">
      {/* Thumbnails */}
      <div className="hidden md:flex flex-col gap-3 w-20">
        {displayImages.slice(0, 5).map((img, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedIndex(idx)}
            className={`aspect-square bg-gray-100 overflow-hidden border-2 transition-colors ${
              selectedIndex === idx ? 'border-black' : 'border-transparent'
            }`}
          >
            <img src={img.src} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Main Image */}
      <div className="flex-1 aspect-[3/4] bg-gray-100 overflow-hidden">
        <img
          src={displayImages[selectedIndex]?.src || defaultImage}
          alt="Product"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

// Size Selector
const SizeSelector = ({ variants = [], selected, onSelect }) => {
  const sizes = [...new Set(variants.map(v => {
    const parts = v.title?.split('/') || [];
    return parts[parts.length - 1]?.trim() || v.option1 || 'One Size';
  }))];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">Size</span>
        <button className="text-sm text-gray-500 underline">Size Guide</button>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {sizes.map((size) => {
          const variant = variants.find(v => v.title?.includes(size) || v.option1 === size);
          const isAvailable = variant && variant.inventory_quantity > 0;
          const isSelected = selected?.title?.includes(size) || selected?.option1 === size;

          return (
            <button
              key={size}
              onClick={() => isAvailable && onSelect(variant)}
              disabled={!isAvailable}
              className={`py-3 text-sm font-medium border transition-all ${
                isSelected
                  ? 'border-black bg-black text-white'
                  : isAvailable
                  ? 'border-gray-300 hover:border-black'
                  : 'border-gray-200 text-gray-300 cursor-not-allowed line-through'
              }`}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Color Selector
const ColorSelector = ({ variants = [], selected, onSelect }) => {
  const colors = [...new Set(variants.map(v => {
    const parts = v.title?.split('/') || [];
    return parts.length > 1 ? parts[0].trim() : null;
  }).filter(Boolean))];

  if (colors.length === 0) return null;

  return (
    <div className="space-y-3">
      <span className="font-medium">Color: {selected?.title?.split('/')[0]?.trim()}</span>
      <div className="flex gap-3">
        {colors.map((color) => {
          const variant = variants.find(v => v.title?.startsWith(color));
          const isSelected = selected?.title?.startsWith(color);

          return (
            <button
              key={color}
              onClick={() => onSelect(variant)}
              className={`px-4 py-2 text-sm border transition-all ${
                isSelected
                  ? 'border-black bg-black text-white'
                  : 'border-gray-300 hover:border-black'
              }`}
            >
              {color}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Quantity Selector
const QuantitySelector = ({ value, onChange, max = 10 }) => (
  <div className="flex items-center border border-gray-300">
    <button
      onClick={() => onChange(Math.max(1, value - 1))}
      className="px-4 py-3 hover:bg-gray-100 transition-colors"
    >
      <Minus className="w-4 h-4" />
    </button>
    <span className="px-6 py-3 font-medium">{value}</span>
    <button
      onClick={() => onChange(Math.min(max, value + 1))}
      className="px-4 py-3 hover:bg-gray-100 transition-colors"
    >
      <Plus className="w-4 h-4" />
    </button>
  </div>
);

// Product Detail Page
const ProductDetail = ({ storeName = 'tnvcollection' }) => {
  const { productId } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`${API}/api/shopify/products/${productId}?store_name=${storeName}`);
        const productData = response.data.product || response.data;
        setProduct(productData);
        if (productData.variants?.length > 0) {
          setSelectedVariant(productData.variants[0]);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, storeName]);

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast.error('Please select a size');
      return;
    }
    addToCart(product, selectedVariant, quantity);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-[3/4] bg-gray-100 animate-pulse" />
          <div className="space-y-6">
            <div className="h-8 bg-gray-100 animate-pulse w-3/4" />
            <div className="h-6 bg-gray-100 animate-pulse w-1/4" />
            <div className="h-24 bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
        <Link to="/shop" className="text-blue-600 hover:underline">
          Continue Shopping
        </Link>
      </div>
    );
  }

  const price = selectedVariant?.price || product.variants?.[0]?.price || '0';
  const comparePrice = selectedVariant?.compare_at_price || product.variants?.[0]?.compare_at_price;
  const isOnSale = comparePrice && parseFloat(comparePrice) > parseFloat(price);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link to="/shop" className="hover:text-black">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/shop/products" className="hover:text-black">Products</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-black">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <ImageGallery images={product.images} />

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold">
                ₹{parseFloat(price).toLocaleString()}
              </span>
              {isOnSale && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    ₹{parseFloat(comparePrice).toLocaleString()}
                  </span>
                  <span className="bg-red-600 text-white text-xs px-2 py-1 font-medium">
                    {Math.round((1 - parseFloat(price) / parseFloat(comparePrice)) * 100)}% OFF
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Color Selector */}
          <ColorSelector
            variants={product.variants}
            selected={selectedVariant}
            onSelect={setSelectedVariant}
          />

          {/* Size Selector */}
          <SizeSelector
            variants={product.variants}
            selected={selectedVariant}
            onSelect={setSelectedVariant}
          />

          {/* Quantity & Add to Cart */}
          <div className="flex gap-4">
            <QuantitySelector value={quantity} onChange={setQuantity} />
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-black text-white py-4 font-medium hover:bg-gray-800 transition-colors"
            >
              Add to Bag
            </button>
          </div>

          {/* Wishlist & Share */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-black">
              <Heart className="w-5 h-5" />
              Add to Wishlist
            </button>
            <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-black">
              <Share2 className="w-5 h-5" />
              Share
            </button>
          </div>

          {/* Product Description */}
          {product.body_html && (
            <div className="pt-6 border-t border-gray-200">
              <h3 className="font-semibold mb-3">Description</h3>
              <div 
                className="text-gray-600 prose prose-sm"
                dangerouslySetInnerHTML={{ __html: product.body_html }}
              />
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
            <div className="text-center">
              <Truck className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <p className="text-xs text-gray-600">Free Shipping</p>
            </div>
            <div className="text-center">
              <Shield className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <p className="text-xs text-gray-600">Secure Payment</p>
            </div>
            <div className="text-center">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <p className="text-xs text-gray-600">Easy Returns</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
