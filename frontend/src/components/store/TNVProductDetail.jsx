import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Truck, RotateCcw, Shield, ChevronLeft, ChevronRight, Minus, Plus, Check, Share2 } from 'lucide-react';
import { useStore } from './TNVStoreLayout';
import { ProductCard } from './TNVHomePage';
import ProductReviews from './ProductReviews';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TNVProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { storeName, formatPrice, addToCart, toggleWishlist, isInWishlist, region } = useStore();
  
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    if (productId) {
      fetchProduct();
      window.scrollTo(0, 0);
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/storefront/products/${productId}?store=${storeName}`);
      const data = await res.json();
      setProduct(data.product || data);

      // Set initial variant
      if (data.product?.variants?.length > 0 || data.variants?.length > 0) {
        const variants = data.product?.variants || data.variants;
        setSelectedVariant(variants[0]);
        setSelectedSize(variants[0]?.option1);
        setSelectedColor(variants[0]?.option2);
      }

      // Fetch related
      const relRes = await fetch(`${API_URL}/api/storefront/products?store=${storeName}&limit=8`);
      const relData = await relRes.json();
      setRelatedProducts((relData.products || []).filter(p => p.shopify_product_id !== productId));
    } catch (e) {
      console.error('Error fetching product:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    const variant = product.variants?.find(v => v.option1 === size && (!selectedColor || v.option2 === selectedColor));
    if (variant) setSelectedVariant(variant);
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    const variant = product.variants?.find(v => v.option2 === color && (!selectedSize || v.option1 === selectedSize));
    if (variant) setSelectedVariant(variant);
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, selectedVariant, quantity);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/tnv/cart');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Product not found</p>
          <Link to="/tnv" className="text-blue-500 hover:underline">Back to store</Link>
        </div>
      </div>
    );
  }

  const images = product.images || [];
  const variants = product.variants || [];
  const sizes = [...new Set(variants.map(v => v.option1).filter(Boolean))];
  const colors = [...new Set(variants.map(v => v.option2).filter(Boolean))];
  const price = selectedVariant?.price || product.variants?.[0]?.price || product.price || 0;
  const comparePrice = selectedVariant?.compare_at_price || product.variants?.[0]?.compare_at_price;
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="text-sm flex items-center space-x-2">
            <Link to="/tnv" className="text-gray-500 hover:text-black">Home</Link>
            <span className="text-gray-300">/</span>
            <Link to="/tnv/collection/all" className="text-gray-500 hover:text-black">Products</Link>
            <span className="text-gray-300">/</span>
            <span className="text-black truncate max-w-[200px]">{product.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]?.src}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No image
                </div>
              )}
              
              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage(prev => (prev - 1 + images.length) % images.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedImage(prev => (prev + 1) % images.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Discount Badge */}
              {discount > 0 && (
                <span className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  -{discount}%
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 ${
                      selectedImage === idx ? 'border-black' : 'border-transparent'
                    }`}
                  >
                    <img src={img.src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-gray-500">TNV Collection</p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleWishlist(product)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Heart className={`w-5 h-5 ${isInWishlist(product.shopify_product_id) ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold mb-4">{product.title}</h1>

            {/* Price */}
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-2xl sm:text-3xl font-bold">{formatPrice(price)}</span>
              {comparePrice && (
                <>
                  <span className="text-lg text-gray-400 line-through">{formatPrice(comparePrice)}</span>
                  <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-sm font-medium">
                    Save {discount}%
                  </span>
                </>
              )}
            </div>

            {/* Size Selection */}
            {sizes.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">Size</span>
                  <button className="text-sm text-gray-500 hover:text-black underline">Size Guide</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => handleSizeSelect(size)}
                      className={`min-w-[48px] h-12 px-4 border-2 rounded-lg font-medium transition ${
                        selectedSize === size
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 hover:border-black'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {colors.length > 0 && (
              <div className="mb-6">
                <span className="font-medium block mb-3">Color: {selectedColor}</span>
                <div className="flex flex-wrap gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => handleColorSelect(color)}
                      className={`px-4 py-2 border-2 rounded-lg text-sm transition ${
                        selectedColor === color
                          ? 'border-black bg-gray-100'
                          : 'border-gray-200 hover:border-black'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <span className="font-medium block mb-3">Quantity</span>
              <div className="flex items-center space-x-4">
                <div className="flex items-center border-2 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-gray-100"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-gray-100"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-8">
              <button
                onClick={handleAddToCart}
                disabled={addedToCart}
                className={`w-full py-4 rounded-full font-bold text-lg transition flex items-center justify-center space-x-2 ${
                  addedToCart
                    ? 'bg-green-500 text-white'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {addedToCart ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Added to Bag!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" />
                    <span>Add to Bag</span>
                  </>
                )}
              </button>
              <button
                onClick={handleBuyNow}
                className="w-full py-4 rounded-full font-bold text-lg border-2 border-black hover:bg-gray-100 transition"
              >
                Buy Now
              </button>
            </div>

            {/* Delivery Info */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-start space-x-3">
                <Truck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Free Delivery</p>
                  <p className="text-sm text-gray-500">On orders over {formatPrice(500)}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <RotateCcw className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Easy Returns</p>
                  <p className="text-sm text-gray-500">14 days return policy</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">100% Authentic</p>
                  <p className="text-sm text-gray-500">Genuine products guaranteed</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-12 border-t pt-8">
          <div className="flex space-x-8 border-b">
            {['description', 'details', 'reviews'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 font-medium capitalize ${
                  activeTab === tab ? 'border-b-2 border-black' : 'text-gray-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="py-6">
            {activeTab === 'description' && (
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: product.body_html || '<p>No description available.</p>' }}
              />
            )}
            {activeTab === 'details' && (
              <div className="space-y-2">
                <p><strong>Brand:</strong> TNV Collection</p>
                <p><strong>SKU:</strong> {product.shopify_product_id}</p>
                {product.vendor && <p><strong>Vendor:</strong> {product.vendor}</p>}
                {product.product_type && <p><strong>Type:</strong> {product.product_type}</p>}
              </div>
            )}
            {activeTab === 'reviews' && (
              <ProductReviews 
                productId={product.shopify_product_id} 
                storeName={storeName}
              />
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-6">You May Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedProducts.slice(0, 4).map((p, idx) => (
                <ProductCard key={p.shopify_product_id || idx} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default TNVProductDetail;
