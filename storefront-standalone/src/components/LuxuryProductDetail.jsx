import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, Heart, Share2, Truck, 
  RotateCcw, Shield, Minus, Plus, Check, X, MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore, useCart } from './MrPorterLayout';
import { formatPrice } from '../config/storeConfig';

const API = import.meta.env.VITE_API_URL;

// ===================== WHATSAPP QUICK ORDER =====================

const generateQuickOrderMessage = (product, variant, quantity, storeConfig) => {
  const storeName = storeConfig?.name || 'TNC Collection';
  const currency = storeConfig?.currency?.symbol || '₹';
  const price = parseFloat(variant?.price || product.variants?.[0]?.price || 0);
  
  let message = `🛍️ *Quick Order from ${storeName}*\n\n`;
  message += `*Product:* ${product.title}\n`;
  if (variant?.title && variant.title !== 'Default Title') {
    message += `*Variant:* ${variant.title}\n`;
  }
  message += `*Quantity:* ${quantity}\n`;
  message += `*Price:* ${currency}${price.toLocaleString()} each\n`;
  message += `*Total:* ${currency}${(price * quantity).toLocaleString()}\n\n`;
  message += `📦 Please confirm availability and share payment details.\n`;
  message += `📍 I will provide my shipping address.`;
  
  return encodeURIComponent(message);
};

// ===================== IMAGE GALLERY =====================

const ImageGallery = ({ images = [] }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e) => {
    if (!isZoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  const currentImage = images[selectedIndex]?.src || images[selectedIndex] || '';

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4">
      {/* Thumbnails */}
      <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[600px]">
        {images.map((img, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className={`flex-shrink-0 w-16 h-20 lg:w-20 lg:h-24 border-2 transition ${
              selectedIndex === index ? 'border-black' : 'border-transparent hover:border-gray-300'
            }`}
          >
            <img
              src={img.src || img}
              alt={`Thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Main Image */}
      <div className="flex-1 relative">
        <div 
          className="relative aspect-[3/4] bg-[#f5f5f5] overflow-hidden cursor-zoom-in"
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
          onMouseMove={handleMouseMove}
        >
          <img
            src={currentImage}
            alt="Product"
            className={`w-full h-full object-cover transition-transform duration-200 ${
              isZoomed ? 'scale-150' : ''
            }`}
            style={isZoomed ? {
              transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
            } : {}}
          />
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setSelectedIndex((prev) => (prev - 1 + images.length) % images.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedIndex((prev) => (prev + 1) % images.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ===================== SIZE SELECTOR =====================

const SizeSelector = ({ sizes = [], selected, onSelect, unavailable = [] }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Size</span>
        <button className="text-sm text-gray-500 underline hover:text-black">
          Size Guide
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const isUnavailable = unavailable.includes(size);
          return (
            <button
              key={size}
              onClick={() => !isUnavailable && onSelect(size)}
              disabled={isUnavailable}
              className={`min-w-[48px] px-4 py-3 text-sm border transition ${
                selected === size
                  ? 'bg-black text-white border-black'
                  : isUnavailable
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed line-through'
                  : 'border-gray-300 hover:border-black'
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

// ===================== COLOR SELECTOR =====================

const ColorSelector = ({ colors = [], selected, onSelect }) => {
  return (
    <div className="space-y-3">
      <span className="text-sm font-medium">
        Color: <span className="font-normal text-gray-600">{selected?.name || 'Select'}</span>
      </span>
      <div className="flex flex-wrap gap-3">
        {colors.map((color) => (
          <button
            key={color.value}
            onClick={() => onSelect(color)}
            className={`relative w-10 h-10 rounded-full border-2 transition ${
              selected?.value === color.value ? 'border-black' : 'border-transparent hover:border-gray-300'
            }`}
            title={color.name}
          >
            <span
              className="absolute inset-1 rounded-full"
              style={{ backgroundColor: color.hex || color.value }}
            />
            {selected?.value === color.value && (
              <Check className={`absolute inset-0 m-auto w-4 h-4 ${
                color.hex === '#ffffff' || color.hex === '#fff' ? 'text-black' : 'text-white'
              }`} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// ===================== QUANTITY SELECTOR =====================

const QuantitySelector = ({ value, onChange, max = 10 }) => {
  return (
    <div className="flex items-center border border-gray-300">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 transition"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-12 text-center text-sm font-medium">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 transition"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

// ===================== PRODUCT INFO =====================

const ProductInfo = ({ product, storeConfig }) => {
  const { addToCart } = useCart();
  const storeSlug = storeConfig?.id || 'tnvcollection';
  const navigate = useNavigate();
  
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Extract unique sizes and colors from variants
  const variants = product.variants || [];
  const sizes = [...new Set(variants.map(v => v.option1).filter(Boolean))];
  const colors = [...new Set(variants.map(v => v.option2).filter(Boolean))].map(c => ({
    name: c,
    value: c,
    hex: getColorHex(c)
  }));

  // Find matching variant
  useEffect(() => {
    if (variants.length === 1) {
      setSelectedVariant(variants[0]);
      return;
    }
    
    const variant = variants.find(v => {
      const sizeMatch = !sizes.length || v.option1 === selectedSize;
      const colorMatch = !colors.length || v.option2 === selectedColor?.value;
      return sizeMatch && colorMatch;
    });
    setSelectedVariant(variant || null);
  }, [selectedSize, selectedColor, variants, sizes.length, colors.length]);

  // Set defaults
  useEffect(() => {
    if (variants.length > 0) {
      const firstVariant = variants[0];
      if (firstVariant.option1 && sizes.length) setSelectedSize(firstVariant.option1);
      if (firstVariant.option2 && colors.length) {
        setSelectedColor({ name: firstVariant.option2, value: firstVariant.option2, hex: getColorHex(firstVariant.option2) });
      }
    }
  }, [product]);

  const price = selectedVariant?.price || product.variants?.[0]?.price || 0;
  const comparePrice = selectedVariant?.compare_at_price || product.variants?.[0]?.compare_at_price;
  const isOnSale = comparePrice && parseFloat(comparePrice) > parseFloat(price);
  const discount = isOnSale ? Math.round((1 - parseFloat(price) / parseFloat(comparePrice)) * 100) : 0;

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast.error('Please select options');
      return;
    }
    addToCart(product, selectedVariant, quantity);
  };

  const handleBuyNow = () => {
    if (!selectedVariant) {
      toast.error('Please select options');
      return;
    }
    addToCart(product, selectedVariant, quantity);
    navigate(`/store/${storeSlug}/checkout`);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 hidden lg:block">
        <Link to={`/store/${storeSlug}`} className="hover:text-black transition">Home</Link>
        <span className="mx-2">/</span>
        <Link to={`/store/${storeSlug}/products`} className="hover:text-black transition">Products</Link>
        <span className="mx-2">/</span>
        <span className="text-black line-clamp-1">{product.title}</span>
      </nav>

      {/* Title & Price */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-light tracking-wide mb-4">
          {product.title}
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-medium">
            {formatPrice(price, storeConfig)}
          </span>
          {isOnSale && (
            <>
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(comparePrice, storeConfig)}
              </span>
              <span className="px-2 py-1 bg-red-600 text-white text-xs tracking-wider">
                -{discount}%
              </span>
            </>
          )}
        </div>
      </div>

      {/* Color Selector */}
      {colors.length > 0 && (
        <ColorSelector
          colors={colors}
          selected={selectedColor}
          onSelect={setSelectedColor}
        />
      )}

      {/* Size Selector */}
      {sizes.length > 0 && (
        <SizeSelector
          sizes={sizes}
          selected={selectedSize}
          onSelect={setSelectedSize}
          unavailable={variants.filter(v => v.inventory_quantity === 0).map(v => v.option1)}
        />
      )}

      {/* Quantity */}
      <div className="space-y-3">
        <span className="text-sm font-medium">Quantity</span>
        <QuantitySelector value={quantity} onChange={setQuantity} />
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-4">
        <button
          onClick={handleAddToCart}
          disabled={!selectedVariant}
          className="w-full py-4 bg-black text-white text-sm tracking-wider uppercase hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          Add to Bag
        </button>
        <button
          onClick={handleBuyNow}
          disabled={!selectedVariant}
          className="w-full py-4 border border-black text-black text-sm tracking-wider uppercase hover:bg-black hover:text-white disabled:border-gray-300 disabled:text-gray-300 disabled:cursor-not-allowed transition"
        >
          Buy Now
        </button>
        
        {/* WhatsApp Quick Order */}
        <button
          onClick={() => {
            const whatsappNumber = storeConfig?.contact?.whatsapp?.replace(/[^0-9]/g, '') || '';
            if (!whatsappNumber || whatsappNumber.includes('XXXX')) {
              toast.info('WhatsApp ordering will be available soon!');
              return;
            }
            const message = generateQuickOrderMessage(product, selectedVariant, quantity, storeConfig);
            window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
          }}
          className="w-full py-4 bg-[#25D366] text-white text-sm tracking-wider uppercase hover:bg-[#128C7E] transition flex items-center justify-center gap-2"
          data-testid="whatsapp-quick-order-btn"
        >
          <MessageCircle className="w-5 h-5" />
          Order via WhatsApp
        </button>
      </div>

      {/* Wishlist & Share */}
      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={() => setIsWishlisted(!isWishlisted)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition"
        >
          <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
          {isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
        </button>
        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition">
          <Share2 className="w-5 h-5" />
          Share
        </button>
      </div>

      {/* Features */}
      <div className="border-t border-gray-200 pt-6 space-y-4">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Truck className="w-5 h-5" />
          <span>Free shipping on orders over {storeConfig?.currency?.symbol}5,000</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <RotateCcw className="w-5 h-5" />
          <span>Easy 14-day returns</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Shield className="w-5 h-5" />
          <span>Secure checkout</span>
        </div>
      </div>

      {/* Description */}
      {product.body_html && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium tracking-wider uppercase mb-4">Description</h3>
          <div 
            className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: product.body_html }}
          />
        </div>
      )}
    </div>
  );
};

// Helper function to get color hex
const getColorHex = (colorName) => {
  const colors = {
    'black': '#000000',
    'white': '#ffffff',
    'red': '#dc2626',
    'blue': '#2563eb',
    'green': '#16a34a',
    'yellow': '#eab308',
    'orange': '#ea580c',
    'purple': '#9333ea',
    'pink': '#ec4899',
    'gray': '#6b7280',
    'grey': '#6b7280',
    'brown': '#92400e',
    'beige': '#d4c4a8',
    'navy': '#1e3a5f',
    'cream': '#fffdd0',
    'gold': '#d4af37',
    'silver': '#c0c0c0',
  };
  return colors[colorName?.toLowerCase()] || '#cccccc';
};

// ===================== MAIN COMPONENT =====================

const LuxuryProductDetail = () => {
  const storeConfig = useStore();
  const { storeSlug, productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentStoreSlug = storeSlug || storeConfig?.id || 'tnvcollection';

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/api/storefront/products/${productId}?store=${currentStoreSlug}`);
        if (!res.ok) throw new Error('Product not found');
        const data = await res.json();
        setProduct(data.product || data);
      } catch (e) {
        console.error('Failed to fetch product:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (productId) fetchProduct();
  }, [productId, currentStoreSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 animate-pulse">
            <div className="aspect-[3/4] bg-gray-200" />
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 w-3/4" />
              <div className="h-6 bg-gray-200 w-1/4" />
              <div className="h-32 bg-gray-200 w-full mt-8" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-light mb-4">Product Not Found</h2>
          <p className="text-gray-500 mb-8">{error || 'The product you are looking for does not exist.'}</p>
          <Link
            to={`/store/${currentStoreSlug}/products`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white text-sm tracking-wider uppercase hover:bg-gray-800 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const images = product.images || [];

  return (
    <div className="min-h-screen bg-white py-8" data-testid="luxury-product-detail">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Image Gallery */}
          <ImageGallery images={images} />
          
          {/* Product Info */}
          <ProductInfo product={product} storeConfig={storeConfig} />
        </div>
      </div>
    </div>
  );
};

export default LuxuryProductDetail;
