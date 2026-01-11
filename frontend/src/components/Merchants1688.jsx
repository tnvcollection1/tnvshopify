import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Store,
  Package,
  Search,
  RefreshCw,
  Loader2,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  ShoppingBag,
  TrendingUp,
  Calendar,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Merchant Card Component
const MerchantCard = ({ merchant, onViewProducts }) => {
  const sampleImage = merchant.sample_products?.[0]?.images?.[0];
  
  return (
    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => onViewProducts(merchant)}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Sample Product Image */}
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {sampleImage ? (
              <img 
                src={sampleImage} 
                alt={merchant.seller_name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Store className="w-8 h-8" />
              </div>
            )}
          </div>
          
          {/* Merchant Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                  {merchant.seller_name || 'Unknown Seller'}
                </h3>
                <p className="text-xs text-gray-500 font-mono">
                  ID: {merchant.seller_id || 'N/A'}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
            </div>
            
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                <Package className="w-3 h-3 mr-1" />
                {merchant.product_count} products
              </Badge>
              {merchant.platforms?.map(p => (
                <Badge key={p} variant="outline" className="text-xs">
                  {p}
                </Badge>
              ))}
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              <span>Avg: ¥{merchant.avg_price?.toFixed(2) || '0'}</span>
              <span className="mx-2">•</span>
              <span>Total: ¥{merchant.total_value?.toFixed(2) || '0'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Product Card Component
const ProductCard = ({ product, onSelect }) => {
  const mainImage = product.images?.[0];
  
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => onSelect?.(product)}>
      <div className="aspect-square relative overflow-hidden rounded-t-lg bg-gray-100">
        {mainImage ? (
          <img 
            src={mainImage} 
            alt={product.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <ImageIcon className="w-12 h-12" />
          </div>
        )}
        <Badge className="absolute top-2 left-2 bg-orange-500">
          {product.platform || '1688'}
        </Badge>
      </div>
      <CardContent className="p-3">
        <h3 className="text-sm font-medium line-clamp-2 h-10 group-hover:text-orange-600">
          {product.title}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-bold text-orange-600">
            ¥{product.price?.toFixed(2) || '0'}
          </span>
          {product.variants?.length > 0 && (
            <span className="text-xs text-gray-500">
              {product.variants.length} variants
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1 font-mono truncate">
          {product.product_id}
        </p>
      </CardContent>
    </Card>
  );
};

// Product Detail Modal
const ProductDetailModal = ({ product, onClose }) => {
  if (!product) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Product Details</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Images */}
            <div>
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-4">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-16 h-16" />
                  </div>
                )}
              </div>
              {product.images?.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {product.images.slice(1, 6).map((img, i) => (
                    <img key={i} src={img} alt="" className="aspect-square object-cover rounded" />
                  ))}
                </div>
              )}
            </div>
            
            {/* Info */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{product.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{product.seller_name}</p>
              </div>
              
              <div className="text-3xl font-bold text-orange-600">
                ¥{product.price?.toFixed(2)}
                {product.price_range && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    {product.price_range}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Product ID:</span>
                  <p className="font-mono">{product.product_id}</p>
                </div>
                <div>
                  <span className="text-gray-500">Platform:</span>
                  <p>{product.platform || '1688'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Min Order:</span>
                  <p>{product.min_order || 1}</p>
                </div>
                <div>
                  <span className="text-gray-500">Sales:</span>
                  <p>{product.sales || 'N/A'}</p>
                </div>
              </div>
              
              {/* Variants */}
              {product.variants?.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Variants ({product.variants.length})</h3>
                  <div className="max-h-40 overflow-auto space-y-2">
                    {product.variants.map((v, i) => (
                      <div key={i} className="text-sm p-2 bg-gray-50 rounded flex justify-between">
                        <span className="truncate flex-1">{v.props_names || v.attributes?.[0]?.value}</span>
                        <span className="font-medium ml-2">¥{v.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  onClick={() => window.open(product.source_url || product.url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on 1688
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main Component
const Merchants1688 = () => {
  const [merchants, setMerchants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // For viewing merchant products
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [merchantProducts, setMerchantProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [productsTotalPages, setProductsTotalPages] = useState(1);
  
  // For product detail modal
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Fetch merchants
  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await fetch(`${API}/api/1688-scraper/merchants?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setMerchants(data.merchants);
        setTotalPages(data.total_pages);
      }
    } catch (e) {
      toast.error('Failed to load merchants');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/1688-scraper/merchants/stats`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  }, []);

  // Fetch merchant products
  const fetchMerchantProducts = useCallback(async (merchant) => {
    setProductsLoading(true);
    try {
      const sellerId = merchant.seller_id || 'unknown';
      const res = await fetch(`${API}/api/1688-scraper/merchants/${sellerId}/products?page=${productsPage}&limit=20`);
      const data = await res.json();
      
      if (data.success) {
        setMerchantProducts(data.products);
        setProductsTotalPages(data.total_pages);
      }
    } catch (e) {
      toast.error('Failed to load products');
    } finally {
      setProductsLoading(false);
    }
  }, [productsPage]);

  useEffect(() => {
    fetchMerchants();
    fetchStats();
  }, [fetchMerchants, fetchStats]);

  useEffect(() => {
    if (selectedMerchant) {
      fetchMerchantProducts(selectedMerchant);
    }
  }, [selectedMerchant, productsPage, fetchMerchantProducts]);

  // Handle view merchant products
  const handleViewProducts = (merchant) => {
    setSelectedMerchant(merchant);
    setProductsPage(1);
  };

  // Go back to merchants list
  const handleBackToMerchants = () => {
    setSelectedMerchant(null);
    setMerchantProducts([]);
    setProductsPage(1);
  };

  // Search handler
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMerchants();
  };

  // If viewing merchant products
  if (selectedMerchant) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={handleBackToMerchants} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Merchants
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
              {selectedMerchant.sample_products?.[0]?.images?.[0] ? (
                <img 
                  src={selectedMerchant.sample_products[0].images[0]} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Store className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{selectedMerchant.seller_name || 'Unknown Seller'}</h1>
              <p className="text-gray-500">
                {selectedMerchant.product_count} products • ID: {selectedMerchant.seller_id || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {productsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {merchantProducts.map(product => (
                <ProductCard 
                  key={product.product_id} 
                  product={product} 
                  onSelect={setSelectedProduct}
                />
              ))}
            </div>
            
            {merchantProducts.length === 0 && (
              <Card className="py-12">
                <CardContent className="text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No products found for this merchant</p>
                </CardContent>
              </Card>
            )}

            {/* Pagination */}
            {productsTotalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button 
                  variant="outline" 
                  disabled={productsPage === 1}
                  onClick={() => setProductsPage(p => p - 1)}
                >
                  Previous
                </Button>
                <span className="px-4 py-2">
                  Page {productsPage} of {productsTotalPages}
                </span>
                <Button 
                  variant="outline" 
                  disabled={productsPage === productsTotalPages}
                  onClick={() => setProductsPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Product Detail Modal */}
        {selectedProduct && (
          <ProductDetailModal 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
          />
        )}
      </div>
    );
  }

  // Main merchants list view
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-7 h-7 text-orange-500" />
            1688 Merchants
          </h1>
          <p className="text-gray-500 mt-1">
            Browse suppliers and their products from your scraped data
          </p>
        </div>
        <Button onClick={fetchMerchants} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Store className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.unique_merchants}</p>
                  <p className="text-sm text-gray-500">Merchants</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_products}</p>
                  <p className="text-sm text-gray-500">Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">¥{stats.total_value?.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Total Value</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.platforms?.length || 0}</p>
                  <p className="text-sm text-gray-500">Platforms</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search merchants by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </div>
      </form>

      {/* Merchants List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {merchants.map((merchant, i) => (
              <MerchantCard 
                key={`${merchant.seller_id}-${i}`}
                merchant={merchant} 
                onViewProducts={handleViewProducts}
              />
            ))}
          </div>

          {merchants.length === 0 && (
            <Card className="py-12">
              <CardContent className="text-center text-gray-500">
                <Store className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No merchants found</p>
                <p className="text-sm mt-2">Scrape products from 1688 to see merchants here</p>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button 
                variant="outline" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="px-4 py-2">
                Page {page} of {totalPages}
              </span>
              <Button 
                variant="outline" 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}
    </div>
  );
};

export default Merchants1688;
