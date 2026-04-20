import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Search, ShoppingBag, User, Menu, X, HelpCircle } from "lucide-react";

/* ═══════════════════════════════════════════════
   IMAGE ASSETS
   ═══════════════════════════════════════════════ */
const IMG = {
  heroProduct: "https://images.unsplash.com/photo-1743100619209-0f3695fa4c92?w=800&q=80",
  heroLifestyle: "https://images.unsplash.com/photo-1669589590350-9abf12bdd4e7?w=1200&q=80",
  catNew: "https://images.unsplash.com/photo-1743100619786-ed873fb1eaf5?w=600&q=80",
  catMen: "https://images.unsplash.com/photo-1718598949922-15b020e7cae8?w=600&q=80",
  catWomen: "https://images.pexels.com/photos/29822949/pexels-photo-29822949.jpeg?auto=compress&cs=tinysrgb&w=600",
  catBest: "https://images.pexels.com/photos/19960565/pexels-photo-19960565.jpeg?auto=compress&cs=tinysrgb&w=600",
  promo1: "https://images.unsplash.com/photo-1641245226728-d954c9731423?w=600&q=80",
  promo2: "https://images.pexels.com/photos/29865632/pexels-photo-29865632.jpeg?auto=compress&cs=tinysrgb&w=600",
  promo3: "https://images.unsplash.com/photo-1747324491642-2bd7010b2389?w=600&q=80",
  colorMain: "https://images.pexels.com/photos/35618111/pexels-photo-35618111.jpeg?auto=compress&cs=tinysrgb&w=800",
  colorDetail: "https://images.unsplash.com/photo-1717211192362-a7455a1b9a0e?w=600&q=80",
  colorLife: "https://images.unsplash.com/photo-1673169128267-3c945d2c8d35?w=600&q=80",
  // Product images
  p1: "https://images.unsplash.com/photo-1743100619209-0f3695fa4c92?w=500&q=80",
  p2: "https://images.unsplash.com/photo-1743100619786-ed873fb1eaf5?w=500&q=80",
  p3: "https://images.unsplash.com/photo-1743100619742-f64e39f209db?w=500&q=80",
  p4: "https://images.pexels.com/photos/19960565/pexels-photo-19960565.jpeg?auto=compress&cs=tinysrgb&w=500",
  p5: "https://images.unsplash.com/photo-1625860191460-10a66c7384fb?w=500&q=80",
  p6: "https://images.pexels.com/photos/21424371/pexels-photo-21424371.jpeg?auto=compress&cs=tinysrgb&w=500",
  p7: "https://images.unsplash.com/photo-1771502244768-a9671a764b2e?w=500&q=80",
  p8: "https://images.unsplash.com/photo-1774376455241-c5a1be6fa1d0?w=500&q=80",
  p9: "https://images.unsplash.com/photo-1759527588071-e143b4a451b0?w=500&q=80",
  p10: "https://images.pexels.com/photos/1478441/pexels-photo-1478441.jpeg?auto=compress&cs=tinysrgb&w=500",
};

const LARGE_PRODUCTS = [
  { name: "Canvas Cruiser", color: "Adventurous Auburn (Warm White Sole)", price: 5999, img: IMG.p1 },
  { name: "TNV Runner NZ", color: "Seagrass (Parchment Sole)", price: 7499, img: IMG.p2 },
  { name: "Canvas Slip On", color: "Deep Navy Stripes (Blizzard Sole)", price: 6499, img: IMG.p3 },
  { name: "TNV Flip Flop", color: "Mid Yellow", price: 2499, img: IMG.p4 },
  { name: "Dasher NZ Relay", color: "Seagrass (Parchment Sole)", price: 8999, img: IMG.p5 },
  { name: "Varsity Jersey", color: "Light Grey/Syrah (Blizzard Sole)", price: 7999, img: IMG.p6 },
  { name: "Canvas Cruiser", color: "Cultured Blue (Natural White Sole)", price: 5999, img: IMG.p7 },
  { name: "Breezer Mary Jane", color: "Dusty Pink (Dusty Pink Sole)", price: 6999, img: IMG.p8 },
  { name: "Canvas Runner NZ", color: "Chestnut (Natural White Sole)", price: 5999, img: IMG.p9 },
  { name: "Cruiser Jersey", color: "Light Grey/Anthracite", price: 7499, img: IMG.p10 },
];

const STANDARD_PRODUCTS = [
  { name: "Canvas Runner NZ", color: "Deep Navy Stripes", price: 6999, badge: "New Color", img: IMG.p7 },
  { name: "Tree Glider", color: "Burlwood", price: 8999, badge: "New Color", img: IMG.p8 },
  { name: "Canvas Cruiser", color: "Cultured Blue", price: 5999, badge: "Exclusive", img: IMG.p1 },
  { name: "Breezer Mary Jane", color: "Dusty Pink", price: 7499, badge: "New Color", img: IMG.p4 },
  { name: "Dasher NZ", color: "Seagrass", price: 8999, badge: "New Color", img: IMG.p5 },
  { name: "Varsity Strap", color: "Burlwood", price: 7499, badge: "New Color", img: IMG.p6 },
  { name: "Cruiser Slip On Terry", color: "Ochre/Warm White", price: 6999, badge: "New", img: IMG.p9 },
  { name: "Canvas Cruiser", color: "Visionary Lilac", price: 5999, badge: "Exclusive", img: IMG.p10 },
];

/* ═══════════════════════════════════════════════
   1. ANNOUNCEMENT BAR
   ═══════════════════════════════════════════════ */
function AnnouncementBar() {
  return (
    <div data-testid="announcement-bar" className="bg-[#212529] text-white py-2 px-4 text-center">
      <p className="text-[11px] tracking-wide">
        Flat 30% off orders above Rs.5,000. Discount automatically applied at checkout.{" "}
        <a href="#" className="underline underline-offset-2">*Exclusions apply.</a>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   2. NAVIGATION - Allbirds Style
   ═══════════════════════════════════════════════ */
function Navigation({ menuOpen, setMenuOpen }) {
  const [activeDropdown, setActiveDropdown] = useState(null);

  const menItems = [
    { label: "Everyday Sneakers", items: ["Canvas Cruiser", "Tree Runner", "Wool Runner", "Dasher NZ"] },
    { label: "Active", items: ["Dasher NZ Relay", "Trail Runner", "Tree Dasher"] },
    { label: "Sandals & Slip Ons", items: ["Flip Flop", "Cruiser Slip On", "Breezer"] },
  ];
  const womenItems = [
    { label: "Everyday Sneakers", items: ["Canvas Cruiser", "Tree Runner", "Wool Runner"] },
    { label: "Active", items: ["Dasher NZ", "Dasher NZ Relay", "Tree Glider"] },
    { label: "Flats & Sandals", items: ["Breezer Mary Jane", "Flip Flop", "Varsity Strap"] },
  ];

  return (
    <header data-testid="navigation" className="sticky top-0 z-50 bg-white">
      <div className="relative border-b border-[#e5e5e5]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 flex items-center justify-between h-[60px]">
          {/* Mobile menu toggle */}
          <button data-testid="mobile-menu-toggle" className="lg:hidden p-1" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
          </button>

          {/* Logo */}
          <a href="/store" data-testid="store-logo" className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0">
            <span className="text-[22px] text-[#212529]" style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 400 }}>
              tnv collection
            </span>
          </a>

          {/* Desktop Nav Center */}
          <nav className="hidden lg:flex items-center gap-1 ml-16">
            {[
              { label: "MEN", dropdown: menItems },
              { label: "WOMEN", dropdown: womenItems },
              { label: "SALE" },
            ].map((item, i) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.dropdown && setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <a
                  href="#"
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`px-4 py-5 text-[13px] font-medium tracking-[0.08em] transition-colors inline-block ${
                    activeDropdown === item.label ? "text-[#212529]" : "text-[#212529] hover:text-[#767676]"
                  }`}
                >
                  {item.label}
                </a>
                {/* Mega Menu Dropdown */}
                {item.dropdown && activeDropdown === item.label && (
                  <div className="absolute top-full left-0 bg-white border border-[#e5e5e5] shadow-lg py-8 px-8 min-w-[480px] z-50">
                    <div className="grid grid-cols-3 gap-8">
                      {item.dropdown.map((col) => (
                        <div key={col.label}>
                          <h4 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#767676] mb-3">{col.label}</h4>
                          <ul className="space-y-2">
                            {col.items.map((sub) => (
                              <li key={sub}>
                                <a href="#" className="text-[13px] text-[#212529] hover:underline">{sub}</a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-1">
            <a href="#" className="hidden lg:inline-block px-3 py-2 text-[13px] text-[#212529] tracking-wide hover:text-[#767676]">About</a>
            <a href="#" className="hidden lg:inline-block px-3 py-2 text-[13px] text-[#212529] tracking-wide hover:text-[#767676]">ReRun</a>
            <button data-testid="nav-search" className="p-2 hover:opacity-60"><Search size={20} strokeWidth={1.5} /></button>
            <button data-testid="nav-account" className="hidden sm:block p-2 hover:opacity-60"><User size={20} strokeWidth={1.5} /></button>
            <button data-testid="nav-help" className="hidden sm:block p-2 hover:opacity-60"><HelpCircle size={18} strokeWidth={1.5} /></button>
            <button data-testid="nav-cart" className="p-2 hover:opacity-60 relative">
              <ShoppingBag size={20} strokeWidth={1.5} />
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#212529] text-white text-[9px] rounded-full flex items-center justify-center font-medium">0</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-b border-[#e5e5e5] px-5 py-6 max-h-[70vh] overflow-y-auto">
          {["MEN", "WOMEN", "SALE", "About", "ReRun"].map((l) => (
            <a key={l} href="#" className="block py-3 text-[14px] font-medium tracking-wide text-[#212529] border-b border-[#f0f0f0]">{l}</a>
          ))}
        </div>
      )}
    </header>
  );
}

/* ═══════════════════════════════════════════════
   3. PROMO BANNER (Large dark banner with italic serif text)
   ═══════════════════════════════════════════════ */
function PromoBanner() {
  return (
    <section data-testid="promo-banner" className="bg-[#98A7A0] py-12 sm:py-16 text-center px-4">
      <h2
        className="text-3xl sm:text-5xl lg:text-[56px] text-white mb-3 leading-tight"
        style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 400 }}
      >
        The New Summer Collection
      </h2>
      <p className="text-white/90 text-sm sm:text-base tracking-wide">
        Fresh Styles. Premium Comfort. Shop Now.
      </p>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   4. HERO SECTION (Split image: product left, lifestyle right)
   ═══════════════════════════════════════════════ */
function HeroSplit() {
  return (
    <section data-testid="hero-split" className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
        {/* Left: Product shot with white frame */}
        <div className="relative bg-[#B5BFB0] overflow-hidden flex items-center justify-center p-8 sm:p-12">
          <div className="relative bg-white p-3 sm:p-4 shadow-lg max-w-[380px] w-full">
            <img
              src={IMG.heroProduct}
              alt="TNV Canvas Cruiser"
              className="w-full aspect-square object-cover"
            />
          </div>
          {/* Floating leaf/plant decor at edges */}
          <img
            src="https://images.unsplash.com/photo-1717211192362-a7455a1b9a0e?w=400&q=60"
            alt=""
            className="absolute top-0 left-0 w-1/3 h-full object-cover opacity-30 pointer-events-none"
          />
        </div>
        {/* Right: Lifestyle photo */}
        <div className="relative overflow-hidden min-h-[300px]">
          <img
            src={IMG.heroLifestyle}
            alt="Lifestyle"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </div>
      {/* Hero CTA bar */}
      <div className="bg-white py-5 px-4 text-center border-b border-[#e5e5e5]">
        <h3
          className="text-xl sm:text-2xl mb-2 text-[#212529]"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
        >
          The New Canvas Cruiser Collection
        </h3>
        <div className="flex items-center justify-center gap-4">
          <a href="#" data-testid="hero-shop-men" className="text-[13px] font-medium text-[#212529] underline underline-offset-4 hover:text-[#767676] tracking-wide">
            Shop Men
          </a>
          <a href="#" data-testid="hero-shop-women" className="text-[13px] font-medium text-[#212529] underline underline-offset-4 hover:text-[#767676] tracking-wide">
            Shop Women
          </a>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   5. CATEGORY ROW (4 image cards)
   ═══════════════════════════════════════════════ */
function CategoryRow() {
  const cats = [
    { title: "New Arrivals", img: IMG.catNew, links: ["Shop Men", "Shop Women"] },
    { title: "Mens", img: IMG.catMen, links: ["Shop Men"] },
    { title: "Womens", img: IMG.catWomen, links: ["Shop Women"] },
    { title: "Best Sellers", img: IMG.catBest, links: ["Shop Men", "Shop Women"] },
  ];

  return (
    <section data-testid="category-row" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cats.map((cat, i) => (
          <a key={i} href="#" data-testid={`cat-card-${i}`} className="group relative overflow-hidden aspect-[2/3] rounded-sm">
            <img src={cat.img} alt={cat.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
              <h3 className="text-white text-base sm:text-lg font-semibold mb-1.5">{cat.title}</h3>
              <div className="flex gap-3">
                {cat.links.map((l) => (
                  <span key={l} className="text-white/80 text-[11px] sm:text-xs underline underline-offset-2 hover:text-white transition-colors">{l}</span>
                ))}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   6. LARGE PRODUCT CAROUSEL
   ═══════════════════════════════════════════════ */
function LargeProductCarousel() {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 400, behavior: "smooth" });
    setTimeout(checkScroll, 400);
  };

  return (
    <section data-testid="large-carousel" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] sm:text-xs font-semibold tracking-[0.15em] uppercase text-[#212529]">New Arrivals</h2>
        <div className="flex gap-1.5">
          <button
            data-testid="lc-prev"
            onClick={() => scroll(-1)}
            disabled={!canScrollLeft}
            className="w-8 h-8 rounded-full border border-[#d5d5d5] flex items-center justify-center hover:bg-[#212529] hover:text-white hover:border-[#212529] transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-[#212529]"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            data-testid="lc-next"
            onClick={() => scroll(1)}
            disabled={!canScrollRight}
            className="w-8 h-8 rounded-full border border-[#d5d5d5] flex items-center justify-center hover:bg-[#212529] hover:text-white hover:border-[#212529] transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-[#212529]"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {LARGE_PRODUCTS.map((p, i) => (
          <a key={i} href="#" className="flex-shrink-0 w-[70vw] sm:w-[45vw] lg:w-[30vw] max-w-[420px] snap-start group">
            <div className="relative aspect-square bg-[#F5F5F0] rounded-sm overflow-hidden mb-2">
              <img src={p.img} alt={p.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
          </a>
        ))}
      </div>
      {/* Active product info */}
      <div className="mt-4 text-center border-t border-[#e5e5e5] pt-4">
        <h3 className="text-base font-semibold text-[#212529] mb-0.5">{LARGE_PRODUCTS[0].name}</h3>
        <p className="text-[13px] text-[#767676] mb-1">{LARGE_PRODUCTS[0].color}</p>
        <p className="text-[13px] text-[#767676] mb-2">-</p>
        <p className="text-[15px] font-semibold text-[#212529]">Rs.{LARGE_PRODUCTS[0].price.toLocaleString()}</p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <a href="#" className="text-[13px] font-medium text-[#212529] underline underline-offset-4 hover:text-[#767676]">Shop Men</a>
          <a href="#" className="text-[13px] font-medium text-[#212529] underline underline-offset-4 hover:text-[#767676]">Shop Women</a>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   7. COLOR GRID SECTION ("Bold By Design")
   ═══════════════════════════════════════════════ */
function ColorGridSection() {
  const colors = [
    { name: "Cultured Blue", bg: "#6B9BC0" },
    { name: "Positive Pink", bg: "#E8A0B4" },
    { name: "Assured Navy", bg: "#2C3E6B" },
    { name: "Adventurous Auburn", bg: "#A0522D" },
    { name: "Resilient Olive", bg: "#6B7C3E" },
  ];
  const [activeColor, setActiveColor] = useState(0);

  return (
    <section data-testid="color-grid" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[500px]">
        {/* Left: Main Image + Info */}
        <div className="relative rounded-sm overflow-hidden bg-[#F5F5F0] min-h-[400px]">
          <img src={IMG.colorMain} alt="Bold By Design" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            <h3
              className="text-2xl sm:text-3xl text-white mb-2"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600 }}
            >
              Bold By Design
            </h3>
            <p className="text-white/80 text-sm mb-4 max-w-sm">
              Show your true colors in five exclusive curated shades.
            </p>
            <a href="#" className="text-white text-[13px] font-medium underline underline-offset-4 hover:text-white/80">Shop Now</a>
          </div>
        </div>
        {/* Right: Grid of images */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative rounded-sm overflow-hidden">
            <img src={IMG.colorDetail} alt="Color detail" className="w-full h-full object-cover" />
          </div>
          <div className="relative rounded-sm overflow-hidden bg-white flex flex-col items-center justify-center p-5 text-center">
            <p className="text-[13px] text-[#767676] mb-1">Canvas Cruiser</p>
            <p className="text-[15px] font-semibold text-[#212529] mb-2">Rs.5,999</p>
            <p className="text-[12px] text-[#767676] mb-3" style={{ color: colors[activeColor].bg }}>{colors[activeColor].name}</p>
            {/* Color dots */}
            <div className="flex gap-2 mb-3">
              {colors.map((c, i) => (
                <button
                  key={c.name}
                  onClick={() => setActiveColor(i)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${i === activeColor ? "border-[#212529] scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c.bg }}
                />
              ))}
            </div>
            <a href="#" className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#212529] underline underline-offset-4 hover:text-[#767676]">Shop Now</a>
          </div>
          <div className="relative rounded-sm overflow-hidden">
            <img src={IMG.colorLife} alt="Color lifestyle" className="w-full h-full object-cover" />
          </div>
          <div className="relative rounded-sm overflow-hidden" style={{ backgroundColor: colors[activeColor].bg }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   8. STANDARD PRODUCT CAROUSEL
   ═══════════════════════════════════════════════ */
function StandardProductCarousel() {
  const scrollRef = useRef(null);
  const scroll = (dir) => scrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });

  return (
    <section data-testid="standard-carousel" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[11px] sm:text-xs font-semibold tracking-[0.15em] uppercase text-[#212529]">New Arrivals</h2>
        <div className="flex gap-1.5">
          <button onClick={() => scroll(-1)} data-testid="sc-prev" className="w-8 h-8 rounded-full border border-[#d5d5d5] flex items-center justify-center hover:bg-[#212529] hover:text-white hover:border-[#212529] transition-all">
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => scroll(1)} data-testid="sc-next" className="w-8 h-8 rounded-full border border-[#d5d5d5] flex items-center justify-center hover:bg-[#212529] hover:text-white hover:border-[#212529] transition-all">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {STANDARD_PRODUCTS.map((p, i) => (
          <a key={i} href="#" data-testid={`std-product-${i}`} className="flex-shrink-0 w-[200px] sm:w-[240px] snap-start group">
            <div className="relative aspect-square bg-[#F5F5F0] rounded-sm overflow-hidden mb-2">
              <img src={p.img} alt={p.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              {p.badge && (
                <span className="absolute top-2 left-2 bg-[#212529] text-white text-[9px] tracking-wider font-semibold uppercase px-2 py-0.5 rounded-sm">
                  {p.badge}
                </span>
              )}
            </div>
            <h4 className="text-[13px] font-semibold text-[#212529] mb-0.5 group-hover:underline">{p.name}</h4>
            <p className="text-[12px] text-[#767676] mb-0.5">{p.color}</p>
            <p className="text-[13px] font-semibold text-[#212529]">Rs.{p.price.toLocaleString()}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   9. 3x PROMO TILES
   ═══════════════════════════════════════════════ */
function PromoTiles() {
  const tiles = [
    { title: "Summer Travel Essentials", img: IMG.promo1, links: ["Shop Men", "Shop Women"] },
    { title: "New Arrivals", img: IMG.promo2, links: ["Shop Men", "Shop Women"] },
    { title: "Fresh Colors For Summer", img: IMG.promo3, links: ["Shop Men", "Shop Women"] },
  ];

  return (
    <section data-testid="promo-tiles" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {tiles.map((tile, i) => (
          <a key={i} href="#" data-testid={`promo-${i}`} className="group relative overflow-hidden aspect-[9/16] sm:aspect-[3/4] rounded-sm">
            <img src={tile.img} alt={tile.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
              <h3 className="text-white text-lg sm:text-xl font-semibold mb-2">{tile.title}</h3>
              <div className="flex gap-3">
                {tile.links.map((l) => (
                  <span key={l} className="text-white/80 text-xs underline underline-offset-2 hover:text-white transition-colors">{l}</span>
                ))}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   10. VALUE PROPOSITIONS
   ═══════════════════════════════════════════════ */
function ValueProps() {
  const props = [
    {
      title: "Wear All Day Comfort",
      desc: "Lightweight, bouncy, and wildly comfortable, our shoes make any outing feel effortless. Slip in, lace up, or slide them on and enjoy the comfy support.",
    },
    {
      title: "Sustainability In Every Step",
      desc: "From materials to transport, we're working to reduce our carbon footprint. Holding ourselves accountable and striving for climate goals isn't a 30-year goal - it's now.",
    },
    {
      title: "Materials From The Earth",
      desc: "We replace petroleum-based synthetics with natural alternatives wherever we can. Like using wool, tree fiber, and sugarcane. They're soft, breathable, and better for the planet.",
    },
  ];

  return (
    <section data-testid="value-props" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
        {props.map((p, i) => (
          <div key={i} data-testid={`value-${i}`} className="text-center px-2">
            <h3 className="text-base sm:text-lg font-semibold text-[#212529] mb-3">{p.title}</h3>
            <p className="text-[13px] text-[#767676] leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   11. FOOTER
   ═══════════════════════════════════════════════ */
function Footer() {
  const cols = [
    { title: "HELP", links: ["FAQ", "Returns & Exchanges", "Shipping Info", "Order Status", "Contact Us"] },
    { title: "SHOP", links: ["Men's Shoes", "Women's Shoes", "Socks", "Gift Cards", "ReRun"] },
    { title: "COMPANY", links: ["Our Story", "Our Materials", "Sustainability", "Investors", "Careers"] },
  ];

  return (
    <footer data-testid="footer" className="bg-[#212529] text-white">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <span
              className="text-[20px] text-white block mb-4"
              style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 400 }}
            >
              tnv collection
            </span>
            <p className="text-[13px] text-white/50 leading-relaxed mb-4">Premium footwear crafted with natural materials for your everyday comfort.</p>
            {/* Social icons */}
            <div className="flex gap-3">
              {["IG", "TW", "FB", "YT", "PIN"].map((s) => (
                <span key={s} className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-[10px] text-white/50 hover:text-white hover:border-white/50 transition-colors cursor-pointer">
                  {s}
                </span>
              ))}
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold tracking-[0.15em] mb-4 text-white/70">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}><a href="#" className="text-[13px] text-white/50 hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-white/30">&copy; 2026 TNV Collection. All rights reserved.</p>
          <div className="flex gap-4">
            {["Privacy Policy", "Terms of Service", "Cookie Settings"].map((l) => (
              <a key={l} href="#" className="text-[11px] text-white/30 hover:text-white/60 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════
   MAIN STOREFRONT PAGE
   ═══════════════════════════════════════════════ */
export default function TNVCStorefront() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap" rel="stylesheet" />

      <AnnouncementBar />
      <Navigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <PromoBanner />
      <HeroSplit />
      <CategoryRow />
      <LargeProductCarousel />
      <ColorGridSection />
      <StandardProductCarousel />
      <PromoTiles />
      <ValueProps />
      <Footer />
    </div>
  );
}
