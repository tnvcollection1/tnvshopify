import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Grid3X3, LayoutGrid, SlidersHorizontal, X, ChevronDown, 
  ArrowUpDown, Check, ChevronRight
} from 'lucide-react';
import { useStore } from './MrPorterLayout';
import { formatPrice, getApiUrl } from '../config/storeConfig';

const API = import.meta.env.VITE_API_URL || getApiUrl();

// ===================== PRODUCT CARD =====================

const ProductCard = ({ product, storeConfig, gridSize = 'normal' }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const imageUrl = product.images?.[0]?.src || product.image_url || product.image;
  const secondImage = product.images?.[1]?.src;
  const price = product.variants?.[0]?.price || product.price || 0;
  const comparePrice = product.variants?.[0]?.compare_at_price;
  const brand = product.vendor || 'TNC Collection';

  return (
    <Link
      to={`/product/${product.shopify_product_id || product.id}`}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`product-card-${product.shopify_product_id || product.id}`}
    >
      <div className={`relative bg-[#f5f5f5] overflow-hidden mb-4 ${
        gridSize === 'large' ? 'aspect-[3/4]' : 'aspect-[3/4]'
      }`}>
        {/* Primary Image */}
        <img
          src={imageUrl}
          alt={product.title}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-500 ${
            isHovered && secondImage ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
          }`}
          loading="lazy"
        />
        {/* Secondary Image on Hover */}
        {secondImage && (
          <img
            src={secondImage}
            alt={product.title}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-500 ${
              isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            loading="lazy"
          />
        )}
        
        {/* Sale Badge */}
        {comparePrice && parseFloat(comparePrice) > parseFloat(price) && (
          <span className="absolute top-3 left-3 bg-black text-white text-[10px] tracking-wider px-2 py-1">
            SALE
          </span>
        )}

        {/* Quick View Overlay */}
        <div className={`absolute bottom-0 left-0 right-0 p-3 transition-all duration-300 ${
          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}>
          <button className="w-full py-2.5 bg-black text-white text-[10px] tracking-[0.15em] uppercase hover:bg-gray-900 transition">
            Quick View
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] tracking-[0.15em] uppercase text-gray-500">
          {brand}
        </p>
        <h3 className="text-sm text-black line-clamp-2 group-hover:underline">
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

// ===================== COLLECTIONS FILTER SIDEBAR =====================

const CollectionsFilterSidebar = ({ 
  isOpen, 
  onClose, 
  collections,
  activeFilters, 
  onFilterChange,
  storeConfig
}) => {
  const [expandedCategories, setExpandedCategories] = useState(['collections', 'price']);

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // Group collections by type for better organization
  const groupedCollections = useMemo(() => {
    const groups = {
      featured: [],
      clothing: [],
      shoes: [],
      bags: [],
      accessories: [],
      other: []
    };

    collections.forEach(col => {
      const title = col.title?.toLowerCase() || '';
      const handle = col.handle?.toLowerCase() || '';
      
      if (title.includes('new') || title.includes('sale') || title.includes('clearance') || title.includes('trend')) {
        groups.featured.push(col);
      } else if (title.includes('shirt') || title.includes('pant') || title.includes('jacket') || title.includes('suit') || title.includes('jean') || title.includes('hoodie') || title.includes('sweater') || title.includes('blazer')) {
        groups.clothing.push(col);
      } else if (title.includes('shoe') || title.includes('sneaker') || title.includes('loafer') || title.includes('boot') || title.includes('heel') || title.includes('flat') || title.includes('sandal') || title.includes('slipper') || title.includes('oxford')) {
        groups.shoes.push(col);
      } else if (title.includes('bag') || title.includes('backpack') || title.includes('clutch') || title.includes('satchel') || title.includes('shoulder')) {
        groups.bags.push(col);
      } else if (title.includes('watch') || title.includes('belt') || title.includes('sunglass') || title.includes('accessori')) {
        groups.accessories.push(col);
      } else {
        groups.other.push(col);
      }
    });

    return groups;
  }, [collections]);

  const FilterSection = ({ title, items, category }) => {
    if (!items || items.length === 0) return null;
    const isExpanded = expandedCategories.includes(category);

    return (
      <div className="border-b border-gray-100 pb-4">
        <button
          onClick={() => toggleCategory(category)}
          className="flex items-center justify-between w-full py-2 text-sm font-medium tracking-wider uppercase"
        >
          {title}
          <ChevronDown className={`w-4 h-4 transition ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        {isExpanded && (
          <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
            {items.map((item) => (
              <label 
                key={item.handle || item.value} 
                className="flex items-center gap-3 cursor-pointer group py-1"
              >
                <div className={`w-4 h-4 border flex items-center justify-center transition ${
                  activeFilters.collection === item.handle
                    ? 'bg-black border-black' 
                    : 'border-gray-300 group-hover:border-gray-500'
                }`}>
                  {activeFilters.collection === item.handle && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="text-sm text-gray-700 truncate">{item.title}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        w-80 lg:w-64 bg-white 
        transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        overflow-y-auto border-r border-gray-100
      `}>
        <div className="p-6 lg:p-0 lg:pr-6">
          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <h3 className="text-lg font-medium">Filters</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Groups */}
          <div className="space-y-4">
            {/* Featured Collections */}
            <FilterSection 
              title="Featured" 
              items={groupedCollections.featured} 
              category="featured" 
            />

            {/* Clothing */}
            <FilterSection 
              title="Clothing" 
              items={groupedCollections.clothing} 
              category="clothing" 
            />

            {/* Shoes */}
            <FilterSection 
              title="Shoes" 
              items={groupedCollections.shoes} 
              category="shoes" 
            />

            {/* Bags */}
            <FilterSection 
              title="Bags" 
              items={groupedCollections.bags} 
              category="bags" 
            />

            {/* Accessories */}
            <FilterSection 
              title="Accessories" 
              items={groupedCollections.accessories} 
              category="accessories" 
            />

            {/* Other */}
            <FilterSection 
              title="Other" 
              items={groupedCollections.other} 
              category="other" 
            />

            {/* Price Range */}
            <div className="border-b border-gray-100 pb-4">
              <button
                onClick={() => toggleCategory('price')}
                className="flex items-center justify-between w-full py-2 text-sm font-medium tracking-wider uppercase"
              >
                Price
                <ChevronDown className={`w-4 h-4 transition ${expandedCategories.includes('price') ? 'rotate-180' : ''}`} />
              </button>
              {expandedCategories.includes('price') && (
                <div className="space-y-2 mt-2">
                  {[
                    { label: 'Under Rs 2,000', value: '0-2000' },
                    { label: 'Rs 2,000 - Rs 5,000', value: '2000-5000' },
                    { label: 'Rs 5,000 - Rs 10,000', value: '5000-10000' },
                    { label: 'Over Rs 10,000', value: '10000-999999' },
                  ].map((price) => (
                    <label key={price.value} className="flex items-center gap-3 cursor-pointer group py-1">
                      <div className={`w-4 h-4 border flex items-center justify-center transition ${
                        activeFilters.price === price.value 
                          ? 'bg-black border-black' 
                          : 'border-gray-300 group-hover:border-gray-500'
                      }`}>
                        {activeFilters.price === price.value && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm text-gray-700">{price.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Filters */}
            {(activeFilters.collection || activeFilters.price || activeFilters.category) && (
              <button
                onClick={() => onFilterChange('clear', null)}
                className="w-full py-3 text-xs tracking-[0.15em] uppercase border border-black hover:bg-black hover:text-white transition"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

// ===================== SORT DROPDOWN =====================

const SortDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const options = [
    { value: 'newest', label: 'Newest' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'name-asc', label: 'Name: A-Z' },
    { value: 'name-desc', label: 'Name: Z-A' },
  ];

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-xs tracking-wider uppercase border border-gray-200 hover:border-black transition"
      >
        <span>{selectedOption.label}</span>
        <ChevronDown className={`w-4 h-4 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 shadow-lg z-20">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition ${
                  value === option.value ? 'bg-gray-50 font-medium' : ''
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ===================== MAIN COMPONENT =====================

const LuxuryProductListing = () => {
  const storeConfig = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gridSize, setGridSize] = useState('normal');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [totalProducts, setTotalProducts] = useState(0);
  
  const activeFilters = {
    category: searchParams.get('category'),
    collection: searchParams.get('collection'),
    price: searchParams.get('price'),
    size: searchParams.get('size'),
  };

  const currentStoreSlug = storeConfig?.id || 'tnvcollectionpk';

  // Fetch collections for filter sidebar
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await fetch(`${API}/api/storefront/collections?store=${currentStoreSlug}&limit=100`);
        const data = await res.json();
        setCollections(data.collections || []);
      } catch (e) {
        console.error('Failed to fetch collections:', e);
      }
    };
    fetchCollections();
  }, [currentStoreSlug]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          store: currentStoreSlug,
          limit: '48',
        });
        
        if (activeFilters.category) params.append('category', activeFilters.category);
        if (activeFilters.collection) params.append('collection', activeFilters.collection);
        
        const res = await fetch(`${API}/api/storefront/products?${params}`);
        const data = await res.json();
        
        let fetchedProducts = data.products || [];
        
        // Client-side price filtering
        if (activeFilters.price) {
          const [min, max] = activeFilters.price.split('-').map(Number);
          fetchedProducts = fetchedProducts.filter(p => {
            const price = parseFloat(p.variants?.[0]?.price) || 0;
            return price >= min && price <= max;
          });
        }
        
        setTotalProducts(fetchedProducts.length);
        
        // Client-side sorting
        if (sortBy === 'price-asc') {
          fetchedProducts.sort((a, b) => 
            (parseFloat(a.variants?.[0]?.price) || 0) - (parseFloat(b.variants?.[0]?.price) || 0)
          );
        } else if (sortBy === 'price-desc') {
          fetchedProducts.sort((a, b) => 
            (parseFloat(b.variants?.[0]?.price) || 0) - (parseFloat(a.variants?.[0]?.price) || 0)
          );
        } else if (sortBy === 'name-asc') {
          fetchedProducts.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortBy === 'name-desc') {
          fetchedProducts.sort((a, b) => b.title.localeCompare(a.title));
        }
        
        setProducts(fetchedProducts);
      } catch (e) {
        console.error('Failed to fetch products:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [currentStoreSlug, searchParams, sortBy]);

  const handleFilterChange = (key, value) => {
    if (key === 'clear') {
      setSearchParams({});
    } else if (value === null) {
      searchParams.delete(key);
      setSearchParams(searchParams);
    } else {
      searchParams.set(key, value);
      setSearchParams(searchParams);
    }
  };

  // Page title based on filters
  const pageTitle = useMemo(() => {
    if (activeFilters.collection) {
      const col = collections.find(c => c.handle === activeFilters.collection);
      if (col) return col.title;
      if (activeFilters.collection === 'new') return 'New Arrivals';
      if (activeFilters.collection === 'sale') return 'Sale';
      return activeFilters.collection.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    if (activeFilters.category) {
      return activeFilters.category.charAt(0).toUpperCase() + activeFilters.category.slice(1);
    }
    return 'All Products';
  }, [activeFilters, collections]);

  return (
    <div className="min-h-screen bg-white" data-testid="product-listing-page">
      {/* Breadcrumb */}
      <div className="bg-[#f8f8f8] py-4">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <nav className="flex items-center text-sm text-gray-500">
            <Link to="/" className="hover:text-black transition">Home</Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            {activeFilters.collection ? (
              <>
                <Link to="/collections" className="hover:text-black transition">Collections</Link>
                <ChevronRight className="w-4 h-4 mx-2" />
                <span className="text-black">{pageTitle}</span>
              </>
            ) : (
              <span className="text-black">{pageTitle}</span>
            )}
          </nav>
        </div>
      </div>

      {/* Page Header */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <h1 className="text-3xl lg:text-4xl font-light tracking-wide text-center">
          {pageTitle}
        </h1>
        <p className="text-gray-500 text-center mt-2 text-sm">
          {totalProducts} {totalProducts === 1 ? 'product' : 'products'}
        </p>
      </div>

      {/* Toolbar */}
      <div className="border-y border-gray-100 sticky top-[60px] bg-white z-20">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Filter Toggle */}
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-2 text-xs tracking-[0.15em] uppercase"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
              {Object.values(activeFilters).filter(Boolean).length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-black text-white text-[10px] rounded-full">
                  {Object.values(activeFilters).filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Right: Sort & Grid */}
            <div className="flex items-center gap-4">
              <SortDropdown value={sortBy} onChange={setSortBy} />
              
              <div className="hidden md:flex border border-gray-200">
                <button
                  onClick={() => setGridSize('normal')}
                  className={`p-2 transition ${gridSize === 'normal' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                  aria-label="Normal grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridSize('large')}
                  className={`p-2 transition ${gridSize === 'large' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                  aria-label="Large grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Filter Sidebar */}
          <CollectionsFilterSidebar
            isOpen={filterOpen}
            onClose={() => setFilterOpen(false)}
            collections={collections}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            storeConfig={storeConfig}
          />

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className={`grid gap-4 md:gap-6 ${
                gridSize === 'large' 
                  ? 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              }`}>
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] bg-gray-100 mb-4" />
                    <div className="h-3 bg-gray-100 w-1/3 mb-2" />
                    <div className="h-4 bg-gray-100 w-3/4 mb-2" />
                    <div className="h-4 bg-gray-100 w-1/4" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg mb-4">No products found</p>
                <button
                  onClick={() => handleFilterChange('clear', null)}
                  className="text-sm underline hover:no-underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className={`grid gap-4 md:gap-6 ${
                gridSize === 'large' 
                  ? 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              }`} data-testid="products-grid">
                {products.map((product) => (
                  <ProductCard 
                    key={product.shopify_product_id || product.id} 
                    product={product} 
                    storeConfig={storeConfig}
                    gridSize={gridSize}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LuxuryProductListing;
