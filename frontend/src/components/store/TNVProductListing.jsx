import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, ChevronDown, Grid, X, Heart } from 'lucide-react';
import { useStore } from './TNVStoreLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TNVProductListing = () => {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { storeName, formatPrice, toggleWishlist, isInWishlist } = useStore();
  
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [gridCols, setGridCols] = useState(4);

  const categoryTitles = {
    'women': 'Women\'s Fashion',
    'men': 'Men\'s Fashion',
    'kids': 'Kids\' Fashion',
    'beauty': 'Beauty',
    'sale': 'Sale',
    'new': 'New Arrivals',
    'all': 'All Products'
  };

  useEffect(() => {
    fetchProducts();
  }, [category, storeName, sortBy]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/storefront/products?store=${storeName}&limit=50`);
      const data = await res.json();
      setProducts(data.products || []);
      
      const colRes = await fetch(`${API_URL}/api/storefront/collections?store=${storeName}&limit=20`);
      const colData = await colRes.json();
      setCollections(colData.collections || []);
    } catch (e) {
      console.error('Error fetching products:', e);
    } finally {
      setLoading(false);
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    const priceA = parseFloat(a.variants?.[0]?.price || a.price || 0);
    const priceB = parseFloat(b.variants?.[0]?.price || b.price || 0);
    switch (sortBy) {
      case 'price-low': return priceA - priceB;
      case 'price-high': return priceB - priceA;
      case 'name': return (a.title || '').localeCompare(b.title || '');
      default: return 0;
    }
  });

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '6', '7', '8', '9', '10', '11', '12'];
  const colors = [
    { name: 'Black', value: '#000' },
    { name: 'White', value: '#fff' },
    { name: 'Navy', value: '#1e3a5f' },
    { name: 'Brown', value: '#8B4513' },
    { name: 'Beige', value: '#F5F5DC' },
    { name: 'Red', value: '#dc2626' },
    { name: 'Blue', value: '#2563eb' },
    { name: 'Green', value: '#16a34a' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="text-sm">
            <Link to="/store" className="text-gray-500 hover:text-black">Home</Link>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-black">{categoryTitles[category] || category}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b sticky top-[104px] z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{categoryTitles[category] || category}</h1>
              <p className="text-sm text-gray-500">{sortedProducts.length} products</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Filter Button - Mobile */}
              <button 
                onClick={() => setFilterOpen(true)}
                className="lg:hidden flex items-center space-x-2 px-4 py-2 border rounded-full hover:bg-gray-50"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-sm">Filter</span>
              </button>
              
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white border rounded-full px-4 py-2 pr-8 text-sm cursor-pointer hover:bg-gray-50"
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name A-Z</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
              </div>

              {/* Grid Toggle - Desktop */}
              <div className="hidden sm:flex items-center border rounded-full overflow-hidden">
                {[2, 3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => setGridCols(n)}
                    className={`p-2 ${gridCols === n ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                  >
                    <div className={`grid gap-0.5`} style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, width: '16px', height: '16px' }}>
                      {Array(n * n).fill(0).map((_, i) => (
                        <div key={i} className="bg-current rounded-sm" />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-xl p-6 sticky top-[180px]">
              <h3 className="font-bold mb-4">Filters</h3>
              
              {/* Categories */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Category</h4>
                <div className="space-y-2">
                  {collections.slice(0, 8).map(col => (
                    <label key={col.id} className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" className="rounded text-black focus:ring-black" />
                      <span className="text-sm">{col.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Price</h4>
                <div className="space-y-2">
                  {['Under 100', '100 - 300', '300 - 500', 'Over 500'].map(range => (
                    <label key={range} className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" className="rounded text-black focus:ring-black" />
                      <span className="text-sm">{range}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sizes */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Size</h4>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => {
                        setSelectedSizes(prev => 
                          prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
                        );
                      }}
                      className={`px-3 py-1 border rounded text-sm ${
                        selectedSizes.includes(size) ? 'bg-black text-white border-black' : 'hover:border-black'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Color</h4>
                <div className="flex flex-wrap gap-2">
                  {colors.map(color => (
                    <button
                      key={color.name}
                      onClick={() => {
                        setSelectedColors(prev => 
                          prev.includes(color.name) ? prev.filter(c => c !== color.name) : [...prev, color.name]
                        );
                      }}
                      className={`w-8 h-8 rounded-full border-2 ${
                        selectedColors.includes(color.name) ? 'ring-2 ring-black ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <button className="w-full py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800">
                Apply Filters
              </button>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500">No products found</p>
              </div>
            ) : (
              <div className={`grid gap-4 grid-cols-2 sm:grid-cols-${Math.min(gridCols, 3)} lg:grid-cols-${gridCols}`}>
                {sortedProducts.map((product, idx) => (
                  <ProductCard key={product.shopify_product_id || idx} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFilterOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Filters</h2>
              <button onClick={() => setFilterOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Same filter content as sidebar */}
              <div>
                <h4 className="font-medium mb-3">Size</h4>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => {
                        setSelectedSizes(prev => 
                          prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
                        );
                      }}
                      className={`px-3 py-1 border rounded text-sm ${
                        selectedSizes.includes(size) ? 'bg-black text-white border-black' : 'hover:border-black'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Color</h4>
                <div className="flex flex-wrap gap-2">
                  {colors.map(color => (
                    <button
                      key={color.name}
                      onClick={() => {
                        setSelectedColors(prev => 
                          prev.includes(color.name) ? prev.filter(c => c !== color.name) : [...prev, color.name]
                        );
                      }}
                      className={`w-10 h-10 rounded-full border-2 ${
                        selectedColors.includes(color.name) ? 'ring-2 ring-black ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t p-4 flex space-x-3">
              <button 
                onClick={() => { setSelectedSizes([]); setSelectedColors([]); }}
                className="flex-1 py-3 border rounded-full font-medium"
              >
                Clear All
              </button>
              <button 
                onClick={() => setFilterOpen(false)}
                className="flex-1 py-3 bg-black text-white rounded-full font-medium"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Product Card Component
const ProductCard = ({ product }) => {
  const { formatPrice, toggleWishlist, isInWishlist } = useStore();
  const [imageError, setImageError] = useState(false);
  
  const image = product.images?.[0]?.src || 'https://via.placeholder.com/400x500?text=No+Image';
  const price = product.variants?.[0]?.price || product.price || 0;
  const comparePrice = product.variants?.[0]?.compare_at_price;
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : 0;

  return (
    <div className="group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <Link to={`/store/product/${product.shopify_product_id}`}>
        <div className="aspect-[3/4] overflow-hidden bg-gray-100">
          <img
            src={imageError ? 'https://via.placeholder.com/400x500?text=No+Image' : image}
            alt={product.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </Link>
      
      {/* Wishlist Button */}
      <button
        onClick={() => toggleWishlist(product)}
        className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition"
      >
        <Heart 
          className={`w-4 h-4 ${isInWishlist(product.shopify_product_id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
        />
      </button>
      
      {/* Discount Badge */}
      {discount > 0 && (
        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
          -{discount}%
        </span>
      )}
      
      <div className="p-3">
        <p className="text-xs text-gray-500 mb-1">TNV Collection</p>
        <h3 className="text-sm font-medium line-clamp-2 mb-2 min-h-[2.5rem]">{product.title}</h3>
        <div className="flex items-center space-x-2">
          <span className="font-bold text-sm">{formatPrice(price)}</span>
          {comparePrice && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(comparePrice)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TNVProductListing;
