import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Heart, Truck, RotateCcw, Shield, Minus, Plus, Search, ShoppingBag, User, Menu, X, HelpCircle } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

/* ─── Shared Nav (compact) ─── */
function NavBar() {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#e5e5e5]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 flex items-center justify-between h-[60px]">
        <button onClick={() => navigate(-1)} className="p-1 hover:opacity-60" data-testid="back-btn">
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
        <a href="/store" data-testid="pdp-logo" className="absolute left-1/2 -translate-x-1/2">
          <span className="text-[22px] text-[#212529]" style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 400 }}>
            tnv collection
          </span>
        </a>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:opacity-60"><Search size={20} strokeWidth={1.5} /></button>
          <button className="p-2 hover:opacity-60 relative" data-testid="pdp-cart">
            <ShoppingBag size={20} strokeWidth={1.5} />
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#212529] text-white text-[9px] rounded-full flex items-center justify-center font-medium">0</span>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ─── Image Gallery ─── */
function ImageGallery({ images }) {
  const [activeIdx, setActiveIdx] = useState(0);
  if (!images?.length) return <div className="aspect-square bg-[#F5F5F0]" />;

  return (
    <div data-testid="image-gallery">
      {/* Main image */}
      <div className="relative aspect-square bg-[#F5F5F0] overflow-hidden mb-3">
        <img
          src={images[activeIdx]}
          alt="Product"
          className="w-full h-full object-cover"
          data-testid="main-product-image"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActiveIdx(i => (i - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors"
              data-testid="img-prev"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setActiveIdx(i => (i + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors"
              data-testid="img-next"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>
      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-sm overflow-hidden border-2 transition-colors ${
              i === activeIdx ? "border-[#212529]" : "border-transparent hover:border-[#d5d5d5]"
            }`}
            data-testid={`thumb-${i}`}
          >
            <img src={img} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Product Detail Page ─── */
export default function ProductDetailPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/storefront/products/${productId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setProduct(d);
          if (d.colors?.length) setSelectedColor(d.colors[0]);
          if (d.sizes?.length) setSelectedSize(d.sizes[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap" rel="stylesheet" />
        <NavBar />
        <div className="max-w-[1200px] mx-auto px-4 py-16 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-[#212529] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#767676]">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <NavBar />
        <div className="max-w-[1200px] mx-auto px-4 py-16 text-center">
          <p className="text-lg text-[#767676]">Product not found</p>
          <a href="/store" className="text-[13px] mt-4 inline-block underline text-[#212529]">Back to Store</a>
        </div>
      </div>
    );
  }

  // Find selected variant
  const selectedVariant = product.variants?.find(
    v => v.option1 === selectedColor && v.option2 === selectedSize
  ) || product.variants?.[0];

  // Check which sizes are available for selected color
  const availableSizes = product.variants
    ?.filter(v => v.option1 === selectedColor && v.available)
    .map(v => v.option2) || [];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap" rel="stylesheet" />
      <NavBar />

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
          {/* Left: Images */}
          <div>
            <ImageGallery images={product.images} />
          </div>

          {/* Right: Product Info */}
          <div className="lg:sticky lg:top-[80px] lg:self-start" data-testid="product-info">
            {/* Title & Price */}
            <h1 className="text-xl sm:text-2xl font-semibold text-[#212529] mb-2 leading-snug" data-testid="product-title">
              {product.title}
            </h1>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-lg font-semibold text-[#212529]" data-testid="product-price">
                Rs.{selectedVariant?.price?.toLocaleString() || product.min_price?.toLocaleString()}
              </span>
              {selectedVariant?.compare_at_price && (
                <span className="text-sm text-[#999] line-through">
                  Rs.{selectedVariant.compare_at_price.toLocaleString()}
                </span>
              )}
              {product.tags && (
                <span className="text-[10px] bg-[#212529] text-white px-2 py-0.5 rounded-sm font-semibold tracking-wider uppercase">
                  {product.tags.split(",")[0]?.trim()}
                </span>
              )}
            </div>

            {/* Color Selector */}
            {product.colors?.length > 0 && (
              <div className="mb-6" data-testid="color-selector">
                <p className="text-[13px] font-medium text-[#212529] mb-2">
                  Color: <span className="font-normal text-[#767676]">{selectedColor}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 text-[13px] rounded-sm border transition-all ${
                        selectedColor === color
                          ? "border-[#212529] bg-[#212529] text-white"
                          : "border-[#d5d5d5] text-[#212529] hover:border-[#212529]"
                      }`}
                      data-testid={`color-${color}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selector */}
            {product.sizes?.length > 0 && (
              <div className="mb-6" data-testid="size-selector">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-medium text-[#212529]">
                    Size: <span className="font-normal text-[#767676]">{selectedSize}</span>
                  </p>
                  <a href="#" className="text-[11px] text-[#767676] underline underline-offset-2">Size Guide</a>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {product.sizes.map((size) => {
                    const isAvail = availableSizes.includes(size);
                    return (
                      <button
                        key={size}
                        onClick={() => isAvail && setSelectedSize(size)}
                        disabled={!isAvail}
                        className={`py-2.5 text-[13px] rounded-sm border transition-all ${
                          selectedSize === size
                            ? "border-[#212529] bg-[#212529] text-white"
                            : isAvail
                              ? "border-[#d5d5d5] text-[#212529] hover:border-[#212529]"
                              : "border-[#e5e5e5] text-[#ccc] cursor-not-allowed line-through"
                        }`}
                        data-testid={`size-${size}`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6" data-testid="quantity-selector">
              <p className="text-[13px] font-medium text-[#212529] mb-2">Quantity</p>
              <div className="inline-flex items-center border border-[#d5d5d5] rounded-sm">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-3 py-2 hover:bg-[#f5f5f0] transition-colors">
                  <Minus size={14} />
                </button>
                <span className="px-4 py-2 text-[13px] font-medium min-w-[40px] text-center">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="px-3 py-2 hover:bg-[#f5f5f0] transition-colors">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="flex gap-3 mb-6">
              <button
                data-testid="add-to-cart-btn"
                disabled={!selectedVariant?.available}
                className="flex-1 bg-[#212529] text-white py-3.5 text-[13px] font-semibold tracking-wider uppercase rounded-sm hover:bg-[#333] transition-colors disabled:bg-[#ccc] disabled:cursor-not-allowed"
              >
                {selectedVariant?.available ? "Add To Cart" : "Out of Stock"}
              </button>
              <button className="w-12 border border-[#d5d5d5] rounded-sm flex items-center justify-center hover:border-[#212529] transition-colors" data-testid="wishlist-btn">
                <Heart size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-4 py-5 border-t border-[#e5e5e5] mb-6">
              {[
                { icon: Truck, text: "Free Shipping" },
                { icon: RotateCcw, text: "30-Day Returns" },
                { icon: Shield, text: "Secure Payment" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="text-center">
                  <Icon size={18} className="mx-auto mb-1.5 text-[#767676]" strokeWidth={1.5} />
                  <p className="text-[11px] text-[#767676]">{text}</p>
                </div>
              ))}
            </div>

            {/* Product Description */}
            {product.body_html && (
              <div className="border-t border-[#e5e5e5] pt-5" data-testid="product-description">
                <h3 className="text-[13px] font-semibold text-[#212529] mb-3 uppercase tracking-wide">Description</h3>
                <div
                  className="text-[13px] text-[#767676] leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.body_html }}
                />
              </div>
            )}

            {/* SKU & Tags */}
            {selectedVariant?.sku && (
              <p className="text-[11px] text-[#999] mt-4">SKU: {selectedVariant.sku}</p>
            )}
          </div>
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="bg-[#212529] text-white mt-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[13px]" style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}>tnv collection</span>
          <p className="text-[11px] text-white/40">&copy; 2026 TNV Collection. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
