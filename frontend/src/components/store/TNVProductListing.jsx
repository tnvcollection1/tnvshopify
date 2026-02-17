import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { SlidersHorizontal, ChevronDown, Grid, X, Heart } from 'lucide-react';
import { useStore } from './TNVStoreLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper to get full image URL (handles relative proxy URLs)
const getImageUrl = (src) => {
  if (!src) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop';
  if (src.startsWith('/api/')) {
    return `${API_URL}${src}`;
  }
  return src;
};

// Category Hero Banner Component (Namshi-style)
const CategoryHeroBanner = ({ currentCategory }) => {
  const categories = [
    {
      name: 'WOMEN',
      path: '/tnv/women/clothing',
      image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&h=800&fit=crop',
      bgColor: '#f8f4f0'
    },
    {
      name: 'MEN',
      path: '/tnv/men/clothing',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop',
      bgColor: '#f0f4f8'
    }
  ];

  // Only show for main category pages (women, men, fashion, products)
  const showHero = ['women', 'men', 'fashion', 'products', undefined].includes(currentCategory);
  
  if (!showHero) return null;

  return (
    <div className="bg-white py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={cat.path}
              className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
              style={{ backgroundColor: cat.bgColor }}
            >
              <div className="p-6">
                {/* Category Title */}
                <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 tracking-wide">
                  {cat.name}
                </h2>
                
                {/* Model Image */}
                <div className="relative aspect-[3/4] max-h-[400px] overflow-hidden rounded-lg mx-auto">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const TNVProductListing = () => {
  const { category } = useParams();
  const location = useLocation();
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

  // Check if this is a main category page (show hero) vs sub-category page (show products)
  const pathParts = location.pathname.split('/').filter(Boolean);
  const isMainCategoryPage = pathParts.length <= 2; // /tnv/women or /tnv/men
  const isSubCategoryPage = pathParts.length > 2; // /tnv/women/clothing

  const categoryTitles = {
    'women': 'Women\'s Fashion',
    'men': 'Men\'s Fashion',
    'kids': 'Kids\' Fashion',
    'beauty': 'Beauty',
    'sale': 'Sale',
    'new': 'New Arrivals',
    'all': 'All Products',
    'clothing': 'Clothing',
    'shoes': 'Shoes',
    'accessories': 'Accessories',
    'bags': 'Bags',
    'sports': 'Sports',
    'premium': 'Premium',
    'brands': 'All Brands'
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

  // Get the last part of the path for title
  const lastPathPart = pathParts[pathParts.length - 1];
  const pageTitle = categoryTitles[lastPathPart] || categoryTitles[category] || 'All Products';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Category Hero Banner - Only on main category pages */}
      {isMainCategoryPage && (category === 'women' || category === 'men' || category === 'fashion' || category === 'products' || !category) && (
        <CategoryHeroBanner currentCategory={category} />
      )}

      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="text-sm">
            <Link to="/tnv" className="text-gray-500 hover:text-black">Home</Link>
            <span className="mx-2 text-gray-300">/</span>
            {pathParts.slice(1).map((part, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="mx-2 text-gray-300">/</span>}
                <span className={idx === pathParts.length - 2 ? 'font-medium' : 'text-gray-500'}>
                  {categoryTitles[part] || part.charAt(0).toUpperCase() + part.slice(1)}
                </span>
              </React.Fragment>
            ))}
          </nav>
        </div>
      </div>

      {/* Show products grid only for sub-category pages or when explicitly browsing */}
      {(isSubCategoryPage || !['women', 'men', 'fashion'].includes(category)) && (
        <>
          {/* Header */}
          <div className="bg-white border-b sticky top-[100px] z-30">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold">{pageTitle}</h1>
                  <p className="text-sm text-gray-500">{sortedProducts.length} products</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* Sort Dropdown */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="appearance-none bg-white border rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                    >
                      <option value="newest">Newest</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="name">Name A-Z</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Filter Button - Mobile */}
                  <button
                    onClick={() => setFilterOpen(true)}
                    className="lg:hidden flex items-center space-x-2 border rounded-lg px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Filter</span>
                  </button>

                  {/* Grid Toggle */}
                  <div className="hidden sm:flex items-center border rounded-lg overflow-hidden">
                    {[2, 3, 4].map(cols => (
                      <button
                        key={cols}
                        onClick={() => setGridCols(cols)}
                        className={`p-2 ${gridCols === cols ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex gap-6">
              {/* Filters Sidebar - Desktop */}
              <aside className="hidden lg:block w-64 flex-shrink-0">
                <div className="bg-white rounded-xl p-6 sticky top-[180px]">
                  <h3 className="font-bold mb-4">Filters</h3>
                  
                  {/* Categories */}
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Category</h4>
                    <div className="space-y-2">
                      {collections.slice(0, 8).map(col => (
                        <label key={col.handle} className="flex items-center space-x-2 text-sm">
                          <input type="checkbox" className="rounded" />
                          <span>{col.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Price Range</h4>
                    <div className="space-y-2">
                      {[
                        [0, 100, 'Under AED 100'],
                        [100, 300, 'AED 100 - 300'],
                        [300, 500, 'AED 300 - 500'],
                        [500, 1000, 'AED 500 - 1000'],
                        [1000, 100000, 'Over AED 1000'],
                      ].map(([min, max, label]) => (
                        <label key={label} className="flex items-center space-x-2 text-sm">
                          <input type="checkbox" className="rounded" />
                          <span>{label}</span>
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
                          onClick={() => setSelectedSizes(prev => 
                            prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
                          )}
                          className={`px-3 py-1 text-sm border rounded-lg ${
                            selectedSizes.includes(size) ? 'bg-black text-white border-black' : 'hover:border-gray-400'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Colors */}
                  <div>
                    <h4 className="font-medium mb-3">Color</h4>
                    <div className="flex flex-wrap gap-2">
                      {colors.map(color => (
                        <button
                          key={color.name}
                          onClick={() => setSelectedColors(prev =>
                            prev.includes(color.name) ? prev.filter(c => c !== color.name) : [...prev, color.name]
                          )}
                          className={`w-8 h-8 rounded-full border-2 ${
                            selectedColors.includes(color.name) ? 'border-black ring-2 ring-black ring-offset-2' : 'border-gray-200'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </aside>

              {/* Products Grid */}
              <main className="flex-1">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className={`grid gap-4 ${
                    gridCols === 2 ? 'grid-cols-2' : 
                    gridCols === 3 ? 'grid-cols-2 sm:grid-cols-3' : 
                    'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                  }`}>
                    {sortedProducts.map((product, idx) => (
                      <ProductCard key={product.shopify_product_id || idx} product={product} />
                    ))}
                  </div>
                )}

                {!loading && sortedProducts.length === 0 && (
                  <div className="text-center py-20">
                    <p className="text-gray-500">No products found</p>
                  </div>
                )}
              </main>
            </div>
          </div>

          {/* Mobile Filter Modal */}
          {filterOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 lg:hidden">
              <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-4 py-4 flex items-center justify-between">
                  <h3 className="font-bold text-lg">Filters</h3>
                  <button onClick={() => setFilterOpen(false)}>
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-4 space-y-6">
                  {/* Categories */}
                  <div>
                    <h4 className="font-medium mb-3">Category</h4>
                    <div className="space-y-2">
                      {collections.slice(0, 8).map(col => (
                        <label key={col.handle} className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded" />
                          <span>{col.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sizes */}
                  <div>
                    <h4 className="font-medium mb-3">Size</h4>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map(size => (
                        <button
                          key={size}
                          onClick={() => setSelectedSizes(prev => 
                            prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
                          )}
                          className={`px-4 py-2 text-sm border rounded-lg ${
                            selectedSizes.includes(size) ? 'bg-black text-white border-black' : ''
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Colors */}
                  <div>
                    <h4 className="font-medium mb-3">Color</h4>
                    <div className="flex flex-wrap gap-3">
                      {colors.map(color => (
                        <button
                          key={color.name}
                          onClick={() => setSelectedColors(prev =>
                            prev.includes(color.name) ? prev.filter(c => c !== color.name) : [...prev, color.name]
                          )}
                          className={`w-10 h-10 rounded-full border-2 ${
                            selectedColors.includes(color.name) ? 'border-black ring-2 ring-black ring-offset-2' : 'border-gray-200'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t p-4">
                  <button
                    onClick={() => setFilterOpen(false)}
                    className="w-full py-3 bg-black text-white rounded-lg font-bold"
                  >
                    Show {sortedProducts.length} Results
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* For main category pages, show sub-categories below the hero */}
      {isMainCategoryPage && ['women', 'men'].includes(category) && (
        <div className="bg-white py-8">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-lg font-bold mb-6">Shop by Category</h2>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {[
                { name: 'Clothing', path: 'clothing', icon: '👔' },
                { name: 'Shoes', path: 'shoes', icon: '👟' },
                { name: 'Accessories', path: 'accessories', icon: '👜' },
                { name: 'Bags', path: 'bags', icon: '🎒' },
                { name: 'Sports', path: 'sports', icon: '⚽' },
                { name: 'New In', path: 'new-arrivals', icon: '✨' },
                { name: 'Premium', path: 'premium', icon: '💎' },
                { name: 'Sale', path: 'sale', icon: '🏷️', highlight: true },
              ].map((subCat) => (
                <Link
                  key={subCat.name}
                  to={`/tnv/${category}/${subCat.path}`}
                  className="flex flex-col items-center text-center group"
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-2 transition ${
                    subCat.highlight ? 'bg-red-100 group-hover:bg-red-200' : 'bg-gray-100 group-hover:bg-gray-200'
                  }`}>
                    {subCat.icon}
                  </div>
                  <span className={`text-sm font-medium ${subCat.highlight ? 'text-red-500' : ''}`}>
                    {subCat.name}
                  </span>
                </Link>
              ))}
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
  
  const image = getImageUrl(product.images?.[0]?.src);
  const price = product.variants?.[0]?.price || product.price || 0;
  const comparePrice = product.variants?.[0]?.compare_at_price;
  // Only show discount if compare price exists AND is greater than current price
  const discount = comparePrice && parseFloat(comparePrice) > parseFloat(price) 
    ? Math.round((1 - parseFloat(price) / parseFloat(comparePrice)) * 100) 
    : 0;

  // Use product ID for consistent delivery display
  const deliveryOptions = ['TODAY', 'TOMORROW', '2-3 DAYS'];
  const delivery = deliveryOptions[product.shopify_product_id % 2];

  return (
    <div className="group relative bg-white rounded-lg overflow-hidden">
      <Link to={`/tnv/product/${product.shopify_product_id}`}>
        <div className="aspect-[3/4] overflow-hidden bg-gray-100">
          <img
            src={imageError ? 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop' : image}
            alt={product.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </Link>
      
      <button
        onClick={() => toggleWishlist(product)}
        className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition opacity-0 group-hover:opacity-100"
      >
        <Heart className={`w-4 h-4 ${isInWishlist(product.shopify_product_id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
      </button>
      
      {discount > 0 && (
        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
          -{discount}%
        </span>
      )}
      
      <div className="p-3">
        <p className="text-xs text-gray-500 mb-1">{product.vendor || 'TNV Collection'}</p>
        <h3 className="text-sm font-medium line-clamp-2 mb-2 min-h-[2.5rem]">{product.title}</h3>
        <div className="flex items-center space-x-2 mb-1">
          <span className="font-bold text-sm">{formatPrice(price)}</span>
          {discount > 0 && comparePrice && (
            <>
              <span className="text-xs text-gray-400 line-through">{formatPrice(comparePrice)}</span>
              <span className="text-xs text-red-500 font-medium">-{discount}%</span>
            </>
          )}
        </div>
        <p className="text-xs text-gray-500">Free delivery</p>
        <p className="text-xs mt-0.5">
          <span className="text-gray-600">GET IT </span>
          <span className={`font-bold ${delivery === 'TODAY' ? 'text-green-600' : 'text-orange-500'}`}>{delivery}</span>
        </p>
      </div>
    </div>
  );
};

export default TNVProductListing;
