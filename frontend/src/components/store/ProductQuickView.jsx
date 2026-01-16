/**
 * Product Quick View Modal
 * Shows on long press/click - preview product without leaving page
 */
import React, { useState } from 'react';
import { X, Heart, ShoppingBag, ChevronLeft, ChevronRight, Star, Minus, Plus } from 'lucide-react';
import { useStore } from './TNVStoreLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getImageUrl = (src) => {
  if (!src) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop';
  if (src.startsWith('/api/')) return `${API_URL}${src}`;
  return src;
};

const ProductQuickView = ({ product, isOpen, onClose, onAddToCart }) => {
  const { formatPrice, toggleWishlist, isInWishlist, addToCart } = useStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);

  if (!isOpen || !product) return null;

  const images = product.images?.length > 0 
    ? product.images.map(img => getImageUrl(img.src))
    : ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop'];
  
  const price = product.variants?.[0]?.price || product.price || 0;
  const comparePrice = product.variants?.[0]?.compare_at_price;
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : 0;
  
  // Mock sizes
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedSize);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="quick-view-modal">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Image Section */}
          <div className="relative w-full md:w-1/2 bg-gray-100">
            <div className="aspect-square relative overflow-hidden">
              <img 
                src={images[currentImageIndex]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
              
              {/* Discount Badge */}
              {discount > 0 && (
                <span className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  -{discount}%
                </span>
              )}

              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <button 
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Image Dots */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition ${idx === currentImageIndex ? 'bg-black w-6' : 'bg-black/30'}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${idx === currentImageIndex ? 'border-black' : 'border-transparent'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="w-full md:w-1/2 p-6 flex flex-col">
            {/* Brand & Title */}
            <p className="text-sm text-gray-500 mb-1">{product.vendor || 'TNV Collection'}</p>
            <h2 className="text-xl font-bold mb-2 line-clamp-2">{product.title}</h2>
            
            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className={`w-4 h-4 ${star <= 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                ))}
              </div>
              <span className="text-sm text-gray-500">(128 reviews)</span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl font-bold">{formatPrice(price)}</span>
              {comparePrice && (
                <>
                  <span className="text-lg text-gray-400 line-through">{formatPrice(comparePrice)}</span>
                  <span className="text-sm font-bold text-green-600">Save {formatPrice(comparePrice - price)}</span>
                </>
              )}
            </div>

            {/* Size Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Select Size</span>
                <button className="text-sm text-blue-600 hover:underline">Size Guide</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-12 h-12 rounded-lg border-2 font-medium transition ${
                      selectedSize === size 
                        ? 'border-black bg-black text-white' 
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <span className="font-medium mb-3 block">Quantity</span>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-gray-400 transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-xl font-bold w-8 text-center">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-gray-400 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-auto">
              <button
                onClick={() => toggleWishlist(product)}
                className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center transition ${
                  isInWishlist(product.shopify_product_id) 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <Heart className={`w-6 h-6 ${isInWishlist(product.shopify_product_id) ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
              <button
                onClick={handleAddToCart}
                className="flex-1 h-14 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition"
              >
                <ShoppingBag className="w-5 h-5" />
                Add to Bag
              </button>
            </div>

            {/* Delivery Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-green-600">🚚</span>
                <span><strong>Free Delivery</strong> on orders over ₹999</span>
              </div>
              <div className="flex items-center gap-3 text-sm mt-2">
                <span>↩️</span>
                <span><strong>Easy Returns</strong> within 14 days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductQuickView;
