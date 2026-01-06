import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, ChevronDown, Filter, X, Grid, List } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Product Card Component
const ProductCard = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);
  const price = product.variants?.[0]?.price || product.price || '0';
  const comparePrice = product.variants?.[0]?.compare_at_price;
  const image = product.images?.[0]?.src || product.image || 'https://via.placeholder.com/400';
  const hoverImage = product.images?.[1]?.src;

  return (
    <Link 
      to={`/shop/product/${product.id}`}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-[3/4] bg-gray-100 overflow-hidden mb-4 relative">
        <img
          src={isHovered && hoverImage ? hoverImage : image}
          alt={product.title}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
        />
        {comparePrice && parseFloat(comparePrice) > parseFloat(price) && (
          <span className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 font-medium">
            SALE
          </span>
        )}
        <button className="absolute bottom-3 left-3 right-3 bg-white text-black py-3 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Quick View
        </button>
      </div>
      <h3 className="font-medium text-gray-900 mb-1 group-hover:underline line-clamp-2">{product.title}</h3>
      <div className="flex items-center gap-2">
        <span className="font-semibold">₹{parseFloat(price).toLocaleString()}</span>
        {comparePrice && parseFloat(comparePrice) > parseFloat(price) && (
          <span className="text-gray-400 line-through text-sm">
            ₹{parseFloat(comparePrice).toLocaleString()}
          </span>
        )}
      </div>
    </Link>
  );
};

// Filter Sidebar
const FilterSidebar = ({ filters, onChange, onClose, isMobile }) => {
  const priceRanges = [
    { label: 'Under ₹2,000', min: 0, max: 2000 },
    { label: '₹2,000 - ₹5,000', min: 2000, max: 5000 },
    { label: '₹5,000 - ₹10,000', min: 5000, max: 10000 },
    { label: 'Over ₹10,000', min: 10000, max: null },
  ];

  const sortOptions = [
    { label: 'Newest', value: 'newest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Best Selling', value: 'best_selling' },
  ];

  return (
    <div className={`${isMobile ? 'fixed inset-0 z-50 bg-white overflow-auto' : 'sticky top-24'}`}>
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button onClick={onClose} className="p-2">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      <div className="p-4 space-y-6">
        {/* Sort */}
        <div>
          <h3 className="font-semibold mb-3">Sort By</h3>
          <select
            value={filters.sort}
            onChange={(e) => onChange({ ...filters, sort: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div>
          <h3 className="font-semibold mb-3">Price</h3>
          <div className="space-y-2">
            {priceRanges.map((range) => (
              <label key={range.label} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="price"
                  checked={filters.minPrice === range.min && filters.maxPrice === range.max}
                  onChange={() => onChange({ ...filters, minPrice: range.min, maxPrice: range.max })}
                  className="w-4 h-4 text-black focus:ring-black"
                />
                <span className="text-sm">{range.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div>
          <h3 className="font-semibold mb-3">Availability</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.inStock}
              onChange={(e) => onChange({ ...filters, inStock: e.target.checked })}
              className="w-4 h-4 text-black focus:ring-black"
            />
            <span className="text-sm">In Stock Only</span>
          </label>
        </div>

        {isMobile && (
          <button
            onClick={onClose}
            className="w-full bg-black text-white py-3 font-medium"
          >
            Apply Filters
          </button>
        )}
      </div>
    </div>
  );
};

// Main Product Listing Page
const ProductListing = ({ storeName = 'tnvcollection' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  
  const [filters, setFilters] = useState({
    sort: searchParams.get('sort') || 'newest',
    minPrice: searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')) : null,
    maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')) : null,
    inStock: searchParams.get('inStock') === 'true',
  });

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let url = `${API}/api/shopify/products?store_name=${storeName}&page=${page}&limit=20`;
        
        // Add sort parameter
        if (filters.sort === 'price_asc') {
          url += '&sort=price&order=asc';
        } else if (filters.sort === 'price_desc') {
          url += '&sort=price&order=desc';
        }

        const response = await axios.get(url);
        setProducts(response.data.products || []);
        setTotal(response.data.total || 0);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [storeName, page, filters]);

  // Filter products client-side (for price filtering)
  const filteredProducts = products.filter(product => {
    const price = parseFloat(product.variants?.[0]?.price || product.price || 0);
    
    if (filters.minPrice && price < filters.minPrice) return false;
    if (filters.maxPrice && price > filters.maxPrice) return false;
    if (filters.inStock) {
      const hasStock = product.variants?.some(v => v.inventory_quantity > 0);
      if (!hasStock) return false;
    }
    
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link to="/shop" className="hover:text-black">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-black">All Products</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">All Products</h1>
          <p className="text-gray-500 mt-1">{total} products</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Mobile Filter Button */}
          <button
            onClick={() => setShowFilters(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center border border-gray-300">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-black text-white' : ''}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-black text-white' : ''}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Desktop Filters */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <FilterSidebar filters={filters} onChange={setFilters} />
        </div>

        {/* Mobile Filters */}
        {showFilters && (
          <FilterSidebar
            filters={filters}
            onChange={setFilters}
            onClose={() => setShowFilters(false)}
            isMobile
          />
        )}

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i}>
                  <div className="aspect-[3/4] bg-gray-100 animate-pulse mb-4" />
                  <div className="h-4 bg-gray-100 animate-pulse mb-2 w-3/4" />
                  <div className="h-4 bg-gray-100 animate-pulse w-1/4" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'} gap-6`}>
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500">No products found</p>
            </div>
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex justify-center gap-2 mt-12">
              {[...Array(Math.ceil(total / 20))].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-10 h-10 ${page === i + 1 ? 'bg-black text-white' : 'border border-gray-300 hover:border-black'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductListing;
