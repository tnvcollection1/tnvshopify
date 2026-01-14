import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  DollarSign,
  BarChart3,
  Eye,
  Loader2,
  AlertCircle,
  Bell,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { useStore } from '../contexts/StoreContext';

const API = process.env.REACT_APP_BACKEND_URL;

// ==================== Notification Bell Component ====================
const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/competitor/notifications?limit=20`);
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await axios.post(`${API}/api/competitor/notifications/mark-all-read`);
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark notifications as read');
    }
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" className="relative" onClick={() => setIsOpen(!isOpen)}>
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white border rounded-lg shadow-xl z-50">
          <div className="p-3 border-b flex items-center justify-between">
            <h3 className="font-semibold">Price Alerts</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllRead}>Mark all read</Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>No price alerts yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.notification_id} className={`p-3 border-b hover:bg-gray-50 ${!n.read ? 'bg-blue-50' : ''}`}>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Price Difference Badge ====================
const PriceDiffBadge = ({ yourPrice, competitorPrice }) => {
  if (!competitorPrice || !yourPrice) return <span className="text-gray-400">-</span>;
  
  const diff = ((yourPrice - competitorPrice) / yourPrice) * 100;
  const isHigher = diff > 0;
  const isLower = diff < 0;
  
  if (Math.abs(diff) < 1) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
        <Minus className="w-3 h-3" /> Similar
      </span>
    );
  }
  
  if (isHigher) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
        <TrendingUp className="w-3 h-3" /> {Math.abs(diff).toFixed(0)}% higher
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
      <TrendingDown className="w-3 h-3" /> {Math.abs(diff).toFixed(0)}% lower
    </span>
  );
};

// ==================== Main Component ====================
const CompetitorPriceCatalog = () => {
  const { selectedStore, stores, formatPrice, getCurrencySymbol } = useStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [stats, setStats] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, analyzed, not_analyzed, cheaper
  const [sortBy, setSortBy] = useState('title'); // title, price, diff
  const [sortOrder, setSortOrder] = useState('asc');
  const limit = 25;

  // Load products with competitor data
  const loadProducts = useCallback(async () => {
    if (!selectedStore) return;
    
    setLoading(true);
    try {
      // Fetch products from Shopify
      const productRes = await axios.get(`${API}/api/shopify/products`, {
        params: {
          store_name: selectedStore,
          page,
          limit,
          search: search || undefined
        }
      });

      if (productRes.data.success) {
        const shopifyProducts = productRes.data.products || [];
        setTotalProducts(productRes.data.total || 0);
        setTotalPages(Math.ceil((productRes.data.total || 0) / limit));

        // Fetch competitor analyses for these products
        const productIds = shopifyProducts.map(p => p.shopify_product_id);
        const analysesRes = await axios.post(`${API}/api/competitor/bulk-lookup`, {
          product_ids: productIds,
          store_name: selectedStore
        }).catch(() => ({ data: { analyses: {} } }));

        const analysesMap = analysesRes.data?.analyses || {};

        // Merge product data with competitor data
        const enrichedProducts = shopifyProducts.map(product => {
          const analysis = analysesMap[product.shopify_product_id];
          let bestCompetitor = null;
          let lowestPrice = null;

          if (analysis?.competitor_prices?.length > 0) {
            // Find the lowest competitor price
            for (const cp of analysis.competitor_prices) {
              if (cp.prices?.length > 0) {
                const minPrice = Math.min(...cp.prices);
                if (lowestPrice === null || minPrice < lowestPrice) {
                  lowestPrice = minPrice;
                  bestCompetitor = {
                    domain: cp.domain,
                    price: minPrice,
                    url: cp.url
                  };
                }
              }
            }
          }

          return {
            ...product,
            analysis,
            bestCompetitor,
            lowestCompetitorPrice: lowestPrice,
            hasAnalysis: !!analysis,
            competitorCount: analysis?.competitor_prices?.length || 0
          };
        });

        // Apply filters
        let filtered = enrichedProducts;
        if (filterStatus === 'analyzed') {
          filtered = enrichedProducts.filter(p => p.hasAnalysis);
        } else if (filterStatus === 'not_analyzed') {
          filtered = enrichedProducts.filter(p => !p.hasAnalysis);
        } else if (filterStatus === 'cheaper') {
          filtered = enrichedProducts.filter(p => 
            p.lowestCompetitorPrice && p.price && p.lowestCompetitorPrice < p.price
          );
        }

        // Apply sorting
        filtered.sort((a, b) => {
          let comparison = 0;
          if (sortBy === 'title') {
            comparison = (a.title || '').localeCompare(b.title || '');
          } else if (sortBy === 'price') {
            comparison = (a.price || 0) - (b.price || 0);
          } else if (sortBy === 'diff') {
            const aDiff = a.lowestCompetitorPrice && a.price ? ((a.price - a.lowestCompetitorPrice) / a.price) : -999;
            const bDiff = b.lowestCompetitorPrice && b.price ? ((b.price - b.lowestCompetitorPrice) / b.price) : -999;
            comparison = aDiff - bDiff;
          }
          return sortOrder === 'asc' ? comparison : -comparison;
        });

        setProducts(filtered);
      }

      // Load stats
      const statsRes = await axios.get(`${API}/api/competitor/dashboard-stats`);
      if (statsRes.data.success) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [selectedStore, page, search, filterStatus, sortBy, sortOrder]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Analyze a single product
  const analyzeProduct = async (product) => {
    if (!product.image_url) {
      toast.error('Product has no image for analysis');
      return;
    }

    setAnalyzing(prev => ({ ...prev, [product.shopify_product_id]: true }));
    
    try {
      const response = await axios.post(`${API}/api/competitor/analyze-from-url`, {
        product_id: product.shopify_product_id,
        product_name: product.title,
        your_price: product.price || 0,
        image_url: product.image_url,
        store_name: selectedStore,
        category: product.product_type || 'general'
      });

      if (response.data.success) {
        toast.success(`Found ${response.data.competitor_count} competitors for ${product.title}`);
        // Reload to get updated data
        setTimeout(loadProducts, 2000);
      }
    } catch (error) {
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(prev => ({ ...prev, [product.shopify_product_id]: false }));
    }
  };

  // Bulk analyze all products without analysis
  const bulkAnalyze = async () => {
    const toAnalyze = products.filter(p => !p.hasAnalysis && p.image_url).slice(0, 10);
    
    if (toAnalyze.length === 0) {
      toast.info('All visible products already analyzed');
      return;
    }

    toast.info(`Analyzing ${toAnalyze.length} products...`);
    
    for (const product of toAnalyze) {
      await analyzeProduct(product);
      await new Promise(r => setTimeout(r, 1000)); // Rate limit
    }

    loadProducts();
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Competitor Price Comparison</h1>
              <p className="text-sm text-gray-500">
                Compare your product prices with competitors
              </p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <Button variant="outline" onClick={bulkAnalyze}>
                <Search className="w-4 h-4 mr-2" />
                Analyze All
              </Button>
              <Button onClick={loadProducts}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Products</p>
                  <p className="text-2xl font-bold">{totalProducts}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Analyzed</p>
                  <p className="text-2xl font-bold">{stats.total_analyses || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cheaper Competitors</p>
                  <p className="text-2xl font-bold">
                    {products.filter(p => p.lowestCompetitorPrice && p.price && p.lowestCompetitorPrice < p.price).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Not Analyzed</p>
                  <p className="text-2xl font-bold">{products.filter(p => !p.hasAnalysis).length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="px-6 py-3">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadProducts()}
                className="max-w-md"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                className="border rounded-md px-3 py-2 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Products</option>
                <option value="analyzed">Analyzed Only</option>
                <option value="not_analyzed">Not Analyzed</option>
                <option value="cheaper">Competitors Cheaper</option>
              </select>
            </div>
            <div className="text-sm text-gray-500">
              Showing {products.length} of {totalProducts} products
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th 
                  className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-1">
                    Your Price
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Competitor
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Competitor Price
                </th>
                <th 
                  className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('diff')}
                >
                  <div className="flex items-center gap-1">
                    Difference
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-500 mt-2">Loading products...</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.shopify_product_id} className="hover:bg-gray-50">
                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                            <Eye className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="max-w-[200px]">
                          <p className="font-medium text-sm text-gray-900 truncate" title={product.title}>
                            {product.title}
                          </p>
                          <p className="text-xs text-gray-500">{product.product_type || 'Uncategorized'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Your Price */}
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900">
                        {formatPrice(product.price || 0)}
                      </span>
                    </td>

                    {/* Competitor Name */}
                    <td className="px-4 py-3">
                      {product.bestCompetitor ? (
                        <a 
                          href={product.bestCompetitor.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                        >
                          {product.bestCompetitor.domain}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : product.hasAnalysis ? (
                        <span className="text-gray-400 text-sm">No matches</span>
                      ) : (
                        <span className="text-gray-400 text-sm">Not analyzed</span>
                      )}
                    </td>

                    {/* Competitor Price */}
                    <td className="px-4 py-3">
                      {product.lowestCompetitorPrice ? (
                        <span className={`font-semibold ${
                          product.lowestCompetitorPrice < product.price 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {formatPrice(product.lowestCompetitorPrice)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Difference */}
                    <td className="px-4 py-3">
                      <PriceDiffBadge 
                        yourPrice={product.price} 
                        competitorPrice={product.lowestCompetitorPrice} 
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => analyzeProduct(product)}
                        disabled={analyzing[product.shopify_product_id] || !product.image_url}
                      >
                        {analyzing[product.shopify_product_id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompetitorPriceCatalog;
