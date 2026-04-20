import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Search, ShoppingBag, User, Menu, X, Truck, Leaf, Globe, Heart, ArrowRight } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// Image assets
const IMAGES = {
  hero: "https://static.prod-images.emergentagent.com/jobs/db2613c0-e879-45ac-b80e-9fab2113640c/images/e5c39cf59319164fd23c83bd0698600406a57d2946d5166b24015f77cffa9d1b.png",
  mens: "https://static.prod-images.emergentagent.com/jobs/db2613c0-e879-45ac-b80e-9fab2113640c/images/ce7502f9c0bed8b2853eda873e16c1dcb4e1177e7de7d5f8948aa4cdf9dbb9e9.png",
  womens: "https://static.prod-images.emergentagent.com/jobs/db2613c0-e879-45ac-b80e-9fab2113640c/images/767992f7f79017de0c0d1d42d0639ddd24d66adfe04e02ad56b18dfb4f3569a5.png",
  lifestyle: "https://static.prod-images.emergentagent.com/jobs/db2613c0-e879-45ac-b80e-9fab2113640c/images/00b830b5695408b8759f471f4b0af10c1849fd9e9865bd552533b306ab26c7f6.png",
  shoe1: "https://images.unsplash.com/photo-1625860191460-10a66c7384fb?w=600&q=80",
  shoe2: "https://images.pexels.com/photos/21424371/pexels-photo-21424371.jpeg?auto=compress&cs=tinysrgb&w=600",
  shoe3: "https://images.unsplash.com/photo-1771502244768-a9671a764b2e?w=600&q=80",
  shoe4: "https://images.pexels.com/photos/1478441/pexels-photo-1478441.jpeg?auto=compress&cs=tinysrgb&w=600",
  shoe5: "https://images.unsplash.com/photo-1774376455241-c5a1be6fa1d0?w=600&q=80",
  shoe6: "https://images.unsplash.com/photo-1759527588071-e143b4a451b0?w=600&q=80",
};

const PRODUCTS = [
  { id: 1, name: "TNV Prime Kicks", color: "Natural White", price: 6999, originalPrice: 8999, image: IMAGES.shoe1, badge: "New" },
  { id: 2, name: "TNV Cloud Walker", color: "Soft Grey", price: 7499, originalPrice: null, image: IMAGES.shoe2, badge: "Best Seller" },
  { id: 3, name: "TNV Street Runner", color: "Classic White", price: 5999, originalPrice: 7999, image: IMAGES.shoe3, badge: "New" },
  { id: 4, name: "TNV Urban Glide", color: "Blush Pink", price: 6499, originalPrice: null, image: IMAGES.shoe4, badge: null },
  { id: 5, name: "TNV Earth Stride", color: "Forest Green", price: 7999, originalPrice: 9999, image: IMAGES.shoe5, badge: "Sale" },
  { id: 6, name: "TNV Trail Flex", color: "Sunset Brown", price: 8499, originalPrice: null, image: IMAGES.shoe6, badge: "New" },
];

/* ─── Announcement Bar ─── */
function AnnouncementBar() {
  const messages = [
    "Free Shipping on Orders Over Rs.5,000",
    "New Collection Dropped - Shop Now",
    "Easy 30-Day Returns on All Orders",
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), 4000);
    return () => clearInterval(t);
  }, [messages.length]);

  return (
    <div data-testid="announcement-bar" className="bg-[#212121] text-white py-2.5 px-4 text-center relative">
      <p className="text-[11px] tracking-[0.12em] uppercase font-light transition-opacity duration-500">
        {messages[idx]}
      </p>
    </div>
  );
}

/* ─── Nav ─── */
function NavBar({ onMenuToggle, menuOpen }) {
  const navLinks = ["New Arrivals", "Men", "Women", "Best Sellers", "Sale"];

  return (
    <header data-testid="navbar" className="sticky top-0 z-50 bg-[#FAF9F6] border-b border-[#E8E6E1]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Mobile menu */}
          <button data-testid="mobile-menu-btn" className="lg:hidden p-1" onClick={onMenuToggle}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo */}
          <a href="/store" data-testid="store-logo" className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#212121]" style={{ fontFamily: "'DM Serif Display', serif" }}>
              TNV COLLECTION
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map(link => (
              <a key={link} href="#" className="text-[13px] font-medium tracking-wide text-[#212121] hover:text-[#6B8F71] transition-colors uppercase">
                {link}
              </a>
            ))}
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-4">
            <button data-testid="search-btn" className="p-1 hover:opacity-60 transition-opacity"><Search size={20} strokeWidth={1.5} /></button>
            <button data-testid="account-btn" className="hidden sm:block p-1 hover:opacity-60 transition-opacity"><User size={20} strokeWidth={1.5} /></button>
            <button data-testid="cart-btn" className="p-1 hover:opacity-60 transition-opacity relative">
              <ShoppingBag size={20} strokeWidth={1.5} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#212121] text-white rounded-full text-[9px] flex items-center justify-center">0</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {menuOpen && (
        <div className="lg:hidden bg-[#FAF9F6] border-t border-[#E8E6E1] py-6 px-6">
          {navLinks.map(link => (
            <a key={link} href="#" className="block py-3 text-sm font-medium tracking-wide text-[#212121] uppercase border-b border-[#E8E6E1]">
              {link}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

/* ─── Hero Banner ─── */
function HeroBanner() {
  return (
    <section data-testid="hero-banner" className="relative w-full overflow-hidden" style={{ height: "clamp(400px, 70vh, 720px)" }}>
      <img
        src={IMAGES.hero}
        alt="TNV Collection Hero"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 sm:pb-20 px-4 text-center">
        <h1
          className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          The New TNV Collection
        </h1>
        <p className="text-white/85 text-sm sm:text-base mb-8 max-w-md font-light tracking-wide">
          Premium comfort. Timeless design. Made for your everyday.
        </p>
        <div className="flex gap-3">
          <a href="#" data-testid="hero-shop-men" className="bg-white text-[#212121] px-7 py-3 text-xs sm:text-sm font-semibold tracking-widest uppercase hover:bg-[#212121] hover:text-white transition-all duration-300 rounded-full">
            Shop Men
          </a>
          <a href="#" data-testid="hero-shop-women" className="bg-transparent border-2 border-white text-white px-7 py-3 text-xs sm:text-sm font-semibold tracking-widest uppercase hover:bg-white hover:text-[#212121] transition-all duration-300 rounded-full">
            Shop Women
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── Category Row ─── */
function CategoryRow() {
  const cats = [
    { title: "New Arrivals", img: IMAGES.shoe1, links: ["Shop Men", "Shop Women"] },
    { title: "Men's Collection", img: IMAGES.mens, links: ["Shop Men"] },
    { title: "Women's Collection", img: IMAGES.womens, links: ["Shop Women"] },
    { title: "Best Sellers", img: IMAGES.shoe2, links: ["Shop Men", "Shop Women"] },
  ];

  return (
    <section data-testid="category-row" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {cats.map((cat, i) => (
          <a key={i} href="#" data-testid={`category-${i}`} className="group relative overflow-hidden rounded-lg aspect-[3/4]">
            <img src={cat.img} alt={cat.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
              <h3 className="text-white text-base sm:text-xl font-semibold mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {cat.title}
              </h3>
              <div className="flex gap-3">
                {cat.links.map(l => (
                  <span key={l} className="text-white/80 text-[11px] sm:text-xs underline underline-offset-2 hover:text-white transition-colors">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ─── Product Carousel ─── */
function ProductCarousel({ title }) {
  const scrollRef = useRef(null);
  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 300, behavior: "smooth" });
    }
  };

  return (
    <section data-testid="product-carousel" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-2xl font-semibold tracking-tight text-[#212121] uppercase" style={{ letterSpacing: "0.08em" }}>
          {title}
        </h2>
        <div className="flex gap-2">
          <button data-testid="carousel-prev" onClick={() => scroll(-1)} className="w-9 h-9 rounded-full border border-[#D4D0C8] flex items-center justify-center hover:bg-[#212121] hover:text-white hover:border-[#212121] transition-all">
            <ChevronLeft size={16} />
          </button>
          <button data-testid="carousel-next" onClick={() => scroll(1)} className="w-9 h-9 rounded-full border border-[#D4D0C8] flex items-center justify-center hover:bg-[#212121] hover:text-white hover:border-[#212121] transition-all">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4" style={{ scrollbarWidth: "none" }}>
        {PRODUCTS.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href="#"
      data-testid={`product-card-${product.id}`}
      className="flex-shrink-0 w-[260px] sm:w-[300px] snap-start group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative aspect-square rounded-lg overflow-hidden bg-[#F0EDE8] mb-3">
        <img
          src={product.image}
          alt={product.name}
          className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ${hovered ? "scale-105" : ""}`}
        />
        {product.badge && (
          <span className={`absolute top-3 left-3 px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase rounded-full ${
            product.badge === "Sale" ? "bg-[#C75146] text-white" : "bg-[#212121] text-white"
          }`}>
            {product.badge}
          </span>
        )}
        <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Heart size={14} strokeWidth={1.5} />
        </button>
      </div>
      <h3 className="text-sm font-semibold text-[#212121] mb-0.5">{product.name}</h3>
      <p className="text-xs text-[#757575] mb-1">{product.color}</p>
      <div className="flex items-center gap-2">
        {product.originalPrice && (
          <span className="text-xs text-[#999] line-through">Rs.{product.originalPrice.toLocaleString()}</span>
        )}
        <span className={`text-sm font-semibold ${product.originalPrice ? "text-[#C75146]" : "text-[#212121]"}`}>
          Rs.{product.price.toLocaleString()}
        </span>
      </div>
    </a>
  );
}

/* ─── Lifestyle Banner ─── */
function LifestyleBanner() {
  return (
    <section data-testid="lifestyle-banner" className="relative w-full overflow-hidden" style={{ height: "clamp(300px, 50vh, 520px)" }}>
      <img src={IMAGES.lifestyle} alt="Lifestyle" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <p className="text-white/80 text-xs sm:text-sm tracking-[0.2em] uppercase mb-3 font-light">Explore the outdoors</p>
        <h2
          className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Comfort That Moves With You
        </h2>
        <a href="#" className="bg-white text-[#212121] px-8 py-3 text-xs sm:text-sm font-semibold tracking-widest uppercase hover:bg-[#212121] hover:text-white transition-all duration-300 rounded-full">
          Shop Now
        </a>
      </div>
    </section>
  );
}

/* ─── Product Grid (Standard) ─── */
function ProductGrid() {
  return (
    <section data-testid="product-grid" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
      <h2 className="text-lg sm:text-2xl font-semibold tracking-tight text-[#212121] uppercase mb-8" style={{ letterSpacing: "0.08em" }}>
        Trending Now
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {PRODUCTS.map(p => (
          <a key={p.id} href="#" data-testid={`grid-product-${p.id}`} className="group">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-[#F0EDE8] mb-3">
              <img src={p.image} alt={p.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              {p.badge && (
                <span className={`absolute top-3 left-3 px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase rounded-full ${
                  p.badge === "Sale" ? "bg-[#C75146] text-white" : "bg-[#212121] text-white"
                }`}>
                  {p.badge}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-[#212121] mb-0.5">{p.name}</h3>
            <p className="text-xs text-[#757575] mb-1">{p.color}</p>
            <div className="flex items-center gap-2">
              {p.originalPrice && <span className="text-xs text-[#999] line-through">Rs.{p.originalPrice.toLocaleString()}</span>}
              <span className={`text-sm font-semibold ${p.originalPrice ? "text-[#C75146]" : "text-[#212121]"}`}>Rs.{p.price.toLocaleString()}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ─── 3x Promo Tiles ─── */
function PromoTiles() {
  const tiles = [
    { title: "Summer Essentials", subtitle: "Light, breathable, ready for sun.", img: IMAGES.shoe3, links: ["Shop Men", "Shop Women"] },
    { title: "New Arrivals", subtitle: "Fresh drops every week.", img: IMAGES.shoe5, links: ["Shop Men", "Shop Women"] },
    { title: "Sale - Up to 40% Off", subtitle: "Premium style at great prices.", img: IMAGES.shoe6, links: ["Shop Sale"] },
  ];

  return (
    <section data-testid="promo-tiles" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {tiles.map((tile, i) => (
          <a key={i} href="#" data-testid={`promo-tile-${i}`} className="group relative overflow-hidden rounded-lg aspect-[3/4]">
            <img src={tile.img} alt={tile.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
              <h3 className="text-white text-lg sm:text-xl font-semibold mb-1" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {tile.title}
              </h3>
              <p className="text-white/70 text-xs sm:text-sm mb-3 font-light">{tile.subtitle}</p>
              <div className="flex gap-3">
                {tile.links.map(l => (
                  <span key={l} className="text-white text-[11px] sm:text-xs underline underline-offset-2 hover:text-white/80 transition-colors font-medium">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ─── Value Props ─── */
function ValueProps() {
  const props = [
    { icon: Truck, title: "Wear All Day Comfort", desc: "Lightweight, bouncy, and wildly comfortable. Our shoes make any outing feel effortless." },
    { icon: Leaf, title: "Sustainably Crafted", desc: "From materials to transport, we strive to reduce our footprint. Premium quality that respects the planet." },
    { icon: Globe, title: "Materials From Nature", desc: "We replace synthetics with natural alternatives wherever we can. Soft, breathable, and better for everyone." },
  ];

  return (
    <section data-testid="value-props" className="bg-[#F5F3EE] py-16 sm:py-20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          {props.map((p, i) => (
            <div key={i} data-testid={`value-prop-${i}`} className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#6B8F71]/10 flex items-center justify-center mx-auto mb-5">
                <p.icon size={22} className="text-[#6B8F71]" strokeWidth={1.5} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-[#212121] mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {p.title}
              </h3>
              <p className="text-sm text-[#757575] leading-relaxed max-w-xs mx-auto font-light">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Newsletter ─── */
function Newsletter() {
  return (
    <section data-testid="newsletter" className="bg-[#212121] py-14 sm:py-16">
      <div className="max-w-xl mx-auto text-center px-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Stay In The Loop
        </h2>
        <p className="text-white/60 text-sm mb-6 font-light">Get exclusive offers, new drops, and style inspiration delivered to your inbox.</p>
        <div className="flex gap-2 max-w-md mx-auto">
          <input
            data-testid="newsletter-email"
            type="email"
            placeholder="Enter your email"
            className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-white/40 px-4 py-3 text-sm rounded-full focus:outline-none focus:border-white/50 transition-colors"
          />
          <button data-testid="newsletter-submit" className="bg-white text-[#212121] px-6 py-3 text-xs font-semibold tracking-wider uppercase rounded-full hover:bg-[#6B8F71] hover:text-white transition-all duration-300">
            Sign Up
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  const columns = [
    { title: "Shop", links: ["Men's Shoes", "Women's Shoes", "New Arrivals", "Best Sellers", "Sale"] },
    { title: "Help", links: ["FAQ", "Shipping & Returns", "Order Status", "Size Guide", "Contact Us"] },
    { title: "Company", links: ["Our Story", "Sustainability", "Careers", "Press", "Stores"] },
  ];

  return (
    <footer data-testid="footer" className="bg-[#FAF9F6] border-t border-[#E8E6E1]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-lg font-bold text-[#212121] mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>TNV COLLECTION</h3>
            <p className="text-sm text-[#757575] font-light leading-relaxed mb-4">
              Premium footwear crafted with care. Comfort meets style for your everyday journey.
            </p>
            <div className="flex gap-3">
              {["Instagram", "Twitter", "Facebook"].map(s => (
                <span key={s} className="text-xs text-[#999] hover:text-[#212121] cursor-pointer transition-colors">{s}</span>
              ))}
            </div>
          </div>

          {columns.map((col, i) => (
            <div key={i}>
              <h4 className="text-xs font-semibold text-[#212121] uppercase tracking-wider mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(link => (
                  <li key={link}>
                    <a href="#" className="text-sm text-[#757575] hover:text-[#212121] transition-colors font-light">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-[#E8E6E1] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#999] font-light">&copy; 2026 TNV Collection. All rights reserved.</p>
          <div className="flex gap-5">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(l => (
              <a key={l} href="#" className="text-xs text-[#999] hover:text-[#212121] transition-colors font-light">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Main Storefront Page ─── */
export default function TNVCStorefront() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF9F6]" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=DM+Serif+Display&display=swap" rel="stylesheet" />

      <AnnouncementBar />
      <NavBar menuOpen={menuOpen} onMenuToggle={() => setMenuOpen(!menuOpen)} />
      <HeroBanner />
      <CategoryRow />
      <ProductCarousel title="New Arrivals" />
      <LifestyleBanner />
      <ProductGrid />
      <PromoTiles />
      <ValueProps />
      <Newsletter />
      <Footer />
    </div>
  );
}
