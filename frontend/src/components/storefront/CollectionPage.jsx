import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Search, ShoppingBag, ChevronDown, Grid3X3, LayoutGrid, ChevronLeft, Menu, X, HelpCircle, User } from "lucide-react";
import { useCart } from "./CartContext";

const API = process.env.REACT_APP_BACKEND_URL;

/* ─── Full Nav (same as storefront) ─── */
function NavBar({ menuOpen, setMenuOpen }) {
  const { totalItems, setCartOpen } = useCart();
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#e5e5e5]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 flex items-center justify-between h-[60px]">
        <button className="lg:hidden p-1" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
        </button>
        <a href="/store" data-testid="coll-logo" className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0">
          <span className="text-[22px] text-[#212529]" style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 400 }}>
            tnv collection
          </span>
        </a>
        <nav className="hidden lg:flex items-center gap-1 ml-16">
          {["MEN", "WOMEN", "SALE"].map(l => (
            <a key={l} href="#" className="px-4 py-5 text-[13px] font-medium tracking-[0.08em] text-[#212529] hover:text-[#767676]">{l}</a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <a href="#" className="hidden lg:inline-block px-3 py-2 text-[13px] text-[#212529] hover:text-[#767676]">About</a>
          <button className="p-2 hover:opacity-60"><Search size={20} strokeWidth={1.5} /></button>
          <button className="hidden sm:block p-2 hover:opacity-60"><User size={20} strokeWidth={1.5} /></button>
          <button onClick={() => setCartOpen(true)} className="p-2 hover:opacity-60 relative" data-testid="coll-cart">
            <ShoppingBag size={20} strokeWidth={1.5} />
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#212529] text-white text-[9px] rounded-full flex items-center justify-center font-medium">{totalItems}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ─── Collection Listing Page ─── */
export function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/api/storefront/collections`)
      .then(r => r.json())
      .then(d => setCollections(d.collections || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fallback images for collections without images
  const fallbacks = [
    "https://images.unsplash.com/photo-1743100619209-0f3695fa4c92?w=500&q=80",
    "https://images.unsplash.com/photo-1718598949922-15b020e7cae8?w=500&q=80",
    "https://images.pexels.com/photos/29822949/pexels-photo-29822949.jpeg?auto=compress&cs=tinysrgb&w=500",
    "https://images.pexels.com/photos/19960565/pexels-photo-19960565.jpeg?auto=compress&cs=tinysrgb&w=500",
    "https://images.unsplash.com/photo-1641245226728-d954c9731423?w=500&q=80",
    "https://images.unsplash.com/photo-1743100619786-ed873fb1eaf5?w=500&q=80",
  ];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap" rel="stylesheet" />
      <NavBar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      {/* Header */}
      <div className="bg-[#F5F5F0] py-10 sm:py-14 text-center px-4">
        <h1 className="text-2xl sm:text-4xl text-[#212529] mb-2"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>
          All Collections
        </h1>
        <p className="text-sm text-[#767676]">{collections.length} collections</p>
      </div>

      {/* Grid */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-[#F0F0EC] rounded-sm mb-2" />
                <div className="h-4 bg-[#F0F0EC] rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {collections.map((c, i) => (
              <a
                key={c.id}
                href={`/store/collection/${c.id}`}
                data-testid={`collection-card-${c.id}`}
                className="group"
                onClick={(e) => { e.preventDefault(); navigate(`/store/collection/${c.id}`); }}
              >
                <div className="relative aspect-square bg-[#F5F5F0] rounded-sm overflow-hidden mb-3">
                  <img
                    src={c.image || fallbacks[i % fallbacks.length]}
                    alt={c.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white text-sm sm:text-base font-semibold">{c.title}</h3>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-[#212529] text-white mt-8">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[13px]" style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}>tnv collection</span>
          <p className="text-[11px] text-white/40">&copy; 2026 TNV Collection. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

/* ─── Single Collection Page (product grid) ─── */
export default function CollectionPage() {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collection, setCollection] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasNext, setHasNext] = useState(false);
  const [nextPage, setNextPage] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/storefront/collections/${collectionId}`).then(r => r.json()),
      fetch(`${API}/api/storefront/products?collection_id=${collectionId}&limit=20`).then(r => r.json()),
    ]).then(([coll, prods]) => {
      if (!coll.error) setCollection(coll);
      setProducts(prods.products || []);
      setHasNext(prods.has_next || false);
      setNextPage(prods.next_page || null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [collectionId]);

  const loadMore = useCallback(() => {
    if (!nextPage || loadingMore) return;
    setLoadingMore(true);
    fetch(`${API}/api/storefront/products?collection_id=${collectionId}&limit=20&page_info=${nextPage}`)
      .then(r => r.json())
      .then(d => {
        setProducts(prev => [...prev, ...(d.products || [])]);
        setHasNext(d.has_next || false);
        setNextPage(d.next_page || null);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [collectionId, nextPage, loadingMore]);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap" rel="stylesheet" />
      <NavBar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      {/* Collection Header */}
      <div className="bg-[#F5F5F0] py-10 sm:py-14 text-center px-4">
        <a href="/store/collections" className="text-[11px] text-[#767676] underline underline-offset-2 mb-3 inline-block hover:text-[#212529]">
          All Collections
        </a>
        <h1 className="text-2xl sm:text-4xl text-[#212529] mb-2"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>
          {collection?.title || "Collection"}
        </h1>
        <p className="text-sm text-[#767676]">{products.length} products</p>
      </div>

      {/* Filter/Sort Bar */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-4 border-b border-[#e5e5e5]">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-[#767676]">{products.length} products</p>
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 text-[13px] text-[#212529] hover:text-[#767676]"
              data-testid="sort-btn"
            >
              Sort by <ChevronDown size={14} />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#e5e5e5] shadow-lg py-1 min-w-[160px] z-20">
                {["Price: Low to High", "Price: High to Low", "Newest", "Best Selling"].map(opt => (
                  <button key={opt} onClick={() => setSortOpen(false)} className="block w-full text-left px-4 py-2 text-[13px] text-[#212529] hover:bg-[#f5f5f0]">
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-[#F0F0EC] rounded-sm mb-2" />
                <div className="h-3 bg-[#F0F0EC] rounded w-3/4 mb-1" />
                <div className="h-3 bg-[#F0F0EC] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg text-[#767676] mb-2">No products in this collection</p>
            <a href="/store/collections" className="text-[13px] underline text-[#212529]">Browse all collections</a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map((p) => (
                <a
                  key={p.id}
                  href={`/store/product/${p.id}`}
                  data-testid={`product-${p.id}`}
                  className="group"
                  onClick={(e) => { e.preventDefault(); navigate(`/store/product/${p.id}`); }}
                >
                  <div className="relative aspect-square bg-[#F5F5F0] rounded-sm overflow-hidden mb-2">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    {p.colors?.length > 2 && (
                      <span className="absolute top-2 left-2 bg-[#212529] text-white text-[9px] tracking-wider font-semibold uppercase px-2 py-0.5 rounded-sm">
                        {p.colors.length} Colors
                      </span>
                    )}
                  </div>
                  <h4 className="text-[13px] font-semibold text-[#212529] mb-0.5 group-hover:underline truncate">
                    {p.title?.split(" - ")[0]?.substring(0, 50)}
                  </h4>
                  <p className="text-[12px] text-[#767676] mb-0.5 truncate">{p.colors?.[0] || ""}</p>
                  <p className="text-[13px] font-semibold text-[#212529]">Rs.{p.min_price?.toLocaleString()}</p>
                </a>
              ))}
            </div>

            {/* Load More */}
            {hasNext && (
              <div className="text-center mt-10">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 border border-[#212529] text-[13px] font-semibold tracking-wider uppercase text-[#212529] hover:bg-[#212529] hover:text-white transition-all rounded-sm disabled:opacity-50"
                  data-testid="load-more-btn"
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-[#212529] text-white mt-8">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[13px]" style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}>tnv collection</span>
          <p className="text-[11px] text-white/40">&copy; 2026 TNV Collection. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
