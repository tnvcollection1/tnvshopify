import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { 
  Grid3X3, Grid2X2, SlidersHorizontal, X, ChevronDown, 
  ArrowUpDown, Check 
} from 'lucide-react';
import { useStore } from './LuxuryStorefrontLayout';
import { formatPrice } from './config/storeConfig';

const API = process.env.REACT_APP_BACKEND_URL;

// ===================== PRODUCT CARD =====================

const ProductCard = ({ product, storeConfig, gridSize = 'normal' }) => {
  const storeSlug = storeConfig?.id || 'tnvcollection';
  const [isHovered, setIsHovered] = useState(false);
  
  const imageUrl = product.images?.[0]?.src || product.image_url || product.image;
  const secondImage = product.images?.[1]?.src;
  const price = product.variants?.[0]?.price || product.price || 0;
  const comparePrice = product.variants?.[0]?.compare_at_price;

  return (
    <Link
      to={`/store/${storeSlug}/product/${product.shopify_product_id || product.id}`}
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
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ${
            isHovered && secondImage ? 'opacity-0' : 'opacity-100'
          }`}
          loading="lazy"
        />
        {/* Secondary Image on Hover */}
        {secondImage && (
          <img
            src={secondImage}
            alt={product.title}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
          />
        )}
        
        {/* Sale Badge */}
        {comparePrice && parseFloat(comparePrice) > parseFloat(price) && (
          <span className="absolute top-3 left-3 bg-red-600 text-white text-xs tracking-wider px-2 py-1">
            SALE
          </span>
        )}

        {/* Quick Add Overlay */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <button className="w-full py-3 bg-white text-black text-xs tracking-wider uppercase hover:bg-gray-100 transition">
            Quick View
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:underline">
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
        {/* Color Swatches Preview */}
        {product.variants && product.variants.length > 1 && (
          <div className="flex gap-1 mt-2">
            {product.variants.slice(0, 4).map((v, i) => (
              <div 
                key={i}
                className="w-3 h-3 rounded-full border border-gray-300"
                style={{ backgroundColor: v.color || '#ccc' }}
                title={v.title}
              />
            ))}
            {product.variants.length > 4 && (
              <span className="text-xs text-gray-400">+{product.variants.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

// ===================== FILTER SIDEBAR =====================

const FilterSidebar = ({ 
  isOpen, 
  onClose, 
  filters, 
  activeFilters, 
  onFilterChange 
}) => {
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
        overflow-y-auto
      `}>
        <div className="p-6 lg:p-0">
          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <h3 className="text-lg font-medium">Filters</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Groups */}
          <div className="space-y-8">
            {/* Category Filter */}
            <div>
              <h4 className="text-sm font-medium tracking-wider uppercase mb-4">Category</h4>
              <div className="space-y-3">
                {['All', 'Women', 'Men', 'Accessories'].map((cat) => (
                  <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 border rounded flex items-center justify-center transition ${
                      activeFilters.category === cat.toLowerCase() || (cat === 'All' && !activeFilters.category)
                        ? 'bg-black border-black' 
                        : 'border-gray-300 group-hover:border-gray-400'
                    }`}>
                      {(activeFilters.category === cat.toLowerCase() || (cat === 'All' && !activeFilters.category)) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm text-gray-700">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <h4 className="text-sm font-medium tracking-wider uppercase mb-4">Price</h4>
              <div className="space-y-3">
                {[
                  { label: 'Under ₹2,000', value: '0-2000' },
                  { label: '₹2,000 - ₹5,000', value: '2000-5000' },
                  { label: '₹5,000 - ₹10,000', value: '5000-10000' },
                  { label: 'Over ₹10,000', value: '10000-999999' },
                ].map((price) => (
                  <label key={price.value} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 border rounded flex items-center justify-center transition ${
                      activeFilters.price === price.value 
                        ? 'bg-black border-black' 
                        : 'border-gray-300 group-hover:border-gray-400'
                    }`}>
                      {activeFilters.price === price.value && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm text-gray-700">{price.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Size Filter */}
            <div>
              <h4 className="text-sm font-medium tracking-wider uppercase mb-4">Size</h4>
              <div className="flex flex-wrap gap-2">
                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                  <button
                    key={size}
                    onClick={() => onFilterChange('size', size === activeFilters.size ? null : size)}
                    className={`px-4 py-2 text-sm border transition ${
                      activeFilters.size === size
                        ? 'bg-black text-white border-black'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {Object.keys(activeFilters).length > 0 && (
              <button
                onClick={() => onFilterChange('clear', null)}
                className="w-full py-3 text-sm tracking-wider uppercase border border-black hover:bg-black hover:text-white transition"
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
        className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 hover:border-gray-400 transition"
      >
        <ArrowUpDown className="w-4 h-4" />
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
  const { storeSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gridSize, setGridSize] = useState('normal'); // 'normal' or 'large'
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [totalProducts, setTotalProducts] = useState(0);
  
  const activeFilters = {
    category: searchParams.get('category'),
    collection: searchParams.get('collection'),
    price: searchParams.get('price'),
    size: searchParams.get('size'),
  };

  const currentStoreSlug = storeSlug || storeConfig?.id || 'tnvcollection';

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
    if (activeFilters.collection === 'new') return 'New Arrivals';
    if (activeFilters.collection === 'sale') return 'Sale';
    if (activeFilters.category) return activeFilters.category.charAt(0).toUpperCase() + activeFilters.category.slice(1);
    return 'All Products';
  }, [activeFilters]);

  return (
    <div className="min-h-screen bg-white" data-testid="luxury-product-listing">
      {/* Breadcrumb */}
      <div className="bg-[#f8f8f8] py-4">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <nav className="text-sm text-gray-500">
            <Link to={`/store/${currentStoreSlug}`} className="hover:text-black transition">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-black">{pageTitle}</span>
          </nav>
        </div>
      </div>

      {/* Page Header */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <h1 className="text-3xl lg:text-4xl font-light tracking-wide text-center">
          {pageTitle}
        </h1>
        <p className="text-gray-500 text-center mt-2">
          {totalProducts} {totalProducts === 1 ? 'product' : 'products'}
        </p>
      </div>

      {/* Toolbar */}
      <div className="border-y border-gray-200">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Filter Toggle */}
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-2 text-sm tracking-wider uppercase"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {Object.values(activeFilters).filter(Boolean).length > 0 && (
                <span className="w-5 h-5 bg-black text-white text-xs rounded-full flex items-center justify-center">
                  {Object.values(activeFilters).filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Center: Grid Toggle */}
            <div className="flex items-center gap-1 border border-gray-300 rounded">
              <button
                onClick={() => setGridSize('normal')}
                className={`p-2 transition ${gridSize === 'normal' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                title="4 columns"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setGridSize('large')}
                className={`p-2 transition ${gridSize === 'large' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                title="2 columns"
              >
                <Grid2X2 className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Sort */}
            <SortDropdown value={sortBy} onChange={setSortBy} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <FilterSidebar
            isOpen={filterOpen}
            onClose={() => setFilterOpen(false)}
            filters={{}}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />

          {/* Product Grid */}
          <div className="flex-1">
            {loading ? (
              <div className={`grid gap-4 lg:gap-6 ${
                gridSize === 'large' 
                  ? 'grid-cols-1 sm:grid-cols-2' 
                  : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              }`}>
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] bg-gray-200 mb-4" />
                    <div className="h-4 bg-gray-200 w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 w-1/4" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg mb-4">No products found</p>
                <button
                  onClick={() => handleFilterChange('clear', null)}
                  className="text-sm tracking-wider uppercase underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className={`grid gap-4 lg:gap-6 ${
                gridSize === 'large' 
                  ? 'grid-cols-1 sm:grid-cols-2' 
                  : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              }`}>
                {products.map((product) => (
                  <ProductCard
                    key={product.id || product.shopify_product_id}
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
