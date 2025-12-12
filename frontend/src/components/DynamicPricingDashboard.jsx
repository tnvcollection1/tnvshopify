import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown, DollarSign, Settings, RefreshCw, Zap, Tag, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DynamicPricingDashboard = () => {
  const [report, setReport] = useState(null);
  const [pricingRules, setPricingRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, A, B, C
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editingDiscounts, setEditingDiscounts] = useState({ A: 0, B: 10, C: 20 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState('tnvcollectionpk'); // Default store
  const [viewingCategory, setViewingCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);

  useEffect(() => {
    fetchReport();
  }, []);

  useEffect(() => {
    if (report) {
      updatePricingRules(report, filter);
    }
  }, [filter]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/dynamic-pricing/report`, {
        timeout: 60000 // Increased timeout to 60s
      });
      
      // Check if data exists
      if (!response.data || !response.data.categories) {
        alert('⚠️ No pricing data available.\n\nPlease run "Analyze Products" first to generate pricing recommendations.\n\nThis will analyze your Shopify products and create ABC categories based on sales performance.');
        setReport(null);
        setLoading(false);
        return;
      }
      
      setReport(response.data);
      updatePricingRules(response.data, filter);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      const errorMsg = error.response?.data?.detail || error.message;
      
      if (error.code === 'ECONNABORTED' || errorMsg?.includes('timeout')) {
        alert('⏱️ Request timed out.\n\nThe pricing analysis is taking longer than expected.\n\nPlease:\n1. Check if Shopify sync is complete\n2. Try running "Analyze Products" again\n3. Contact support if issue persists');
      } else {
        alert(`❌ Failed to load pricing data.\n\n${errorMsg}\n\nTry refreshing or run "Analyze Products" first.`);
      }
      
      setLoading(false);
    }
  };

  const viewCategoryProducts = (category) => {
    if (!report || !report.categories || !report.categories[category]) {
      alert('No products found in this category');
      return;
    }
    
    setCategoryProducts(report.categories[category]);
    setViewingCategory(category);
  };

  const closeProductView = () => {
    setViewingCategory(null);
    setCategoryProducts([]);
  };

  const updatePricingRules = (reportData, currentFilter) => {
    if (!reportData || !reportData.categories) return;
    
    const categories = reportData.categories;
    let allProducts = [];
    
    if (currentFilter === 'all') {
      allProducts = [...(categories.A || []), ...(categories.B || []), ...(categories.C || [])];
    } else {
      allProducts = categories[currentFilter] || [];
    }
    
    setPricingRules(allProducts.slice(0, 50));
  };

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/api/dynamic-pricing/analyze?days_lookback=60`);
      alert(`✅ Analyzed ${res.data.total_products} products!\nCategory A: ${res.data.categories.A.length}\nCategory B: ${res.data.categories.B.length}\nCategory C: ${res.data.categories.C.length}`);
      fetchReport();
    } catch (error) {
      console.error('Error analyzing products:', error);
      alert('❌ Error analyzing products');
      setLoading(false);
    }
  };

  const handleSyncToShopify = async () => {
    try {
      setSyncing(true);
      
      const res = await axios.post(`${API_URL}/api/dynamic-pricing/sync-to-shopify`, {
        discounts: editingDiscounts
      });
      
      if (res.data.success) {
        alert(`✅ Synced ${res.data.updated_count} products to Shopify!\n\nTotal Products: ${res.data.total_products}\nDiscounts Applied:\nCategory A: ${editingDiscounts.A}%\nCategory B: ${editingDiscounts.B}%\nCategory C: ${editingDiscounts.C}%`);
      } else {
        alert(`❌ Sync failed: ${res.data.error || 'Unknown error'}`);
      }
      
      setSyncing(false);
    } catch (error) {
      console.error('Error syncing to Shopify:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
      alert(`❌ Error syncing to Shopify\n\n${errorMsg}`);
      setSyncing(false);
    }
  };

  const handleToggleRule = async (sku, currentStatus) => {
    try {
      await axios.put(`${API_URL}/api/pricing/rule/${sku}`, {
        enabled: !currentStatus
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error toggling rule:', error);
      alert('❌ Error updating rule');
    }
  };

  const getCategoryBadge = (category) => {
    const styles = {
      'A': 'bg-red-500/20 text-red-300 border-red-500/50',
      'B': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
      'C': 'bg-green-500/20 text-green-300 border-green-500/50'
    };
    
    const labels = {
      'A': '🔥 High Velocity',
      'B': '⚡ Medium Velocity',
      'C': '💰 Low Velocity (Sale)'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${styles[category]}`}>
        {labels[category]}
      </span>
    );
  };

  if (loading && !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          <p className="ml-4 text-gray-400">Loading pricing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              🎯 Dynamic Pricing Engine
            </h1>
            <p className="text-gray-400">
              Intelligent pricing based on demand and stock velocity
            </p>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                📊 Classification: Last 60 days
              </span>
              <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                💰 Price Changes: 7-day rolling
              </span>
            </div>
          </div>
          
          <div className="flex gap-3 items-center">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="tnvcollection">TNC Collection ✅</option>
              <option value="tnvcollectionpk">TNC Collection PK ✅</option>
              <option value="ashmiaa">Ashmiaa ✅</option>
            </select>
            
            <button
              onClick={handleAnalyze}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Zap className="w-4 h-4" />
              Re-Analyze Products
            </button>
            
            <button
              onClick={() => handleSyncToShopify()}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync All to Shopify'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold">{report.total_products}</span>
            </div>
            <h3 className="text-gray-400 text-sm">Total Products</h3>
            <p className="text-xs text-gray-500 mt-1">From lifetime orders</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-red-900/50 rounded-xl p-6 cursor-pointer hover:bg-red-900/30 hover:border-red-500 transition-all transform hover:scale-105"
               onClick={() => viewCategoryProducts('A')}>
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-red-400" />
              <span className="text-2xl font-bold">{report.categories.A?.length || 0}</span>
            </div>
            <h3 className="text-gray-400 text-sm">Category A 🔥</h3>
            <p className="text-xs text-red-400 mt-1">Fast-moving (Top 20%)</p>
            <p className="text-xs text-gray-500 mt-2">Click to view products</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-yellow-900/50 rounded-xl p-6 cursor-pointer hover:bg-yellow-900/30 hover:border-yellow-500 transition-all transform hover:scale-105"
               onClick={() => viewCategoryProducts('B')}>
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-8 h-8 text-yellow-400" />
              <span className="text-2xl font-bold">{report.categories.B?.length || 0}</span>
            </div>
            <h3 className="text-gray-400 text-sm">Category B ⚡</h3>
            <p className="text-xs text-yellow-400 mt-1">Medium (30%)</p>
            <p className="text-xs text-gray-500 mt-2">Click to view products</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-green-900/50 rounded-xl p-6 cursor-pointer hover:bg-green-900/30 hover:border-green-500 transition-all transform hover:scale-105"
               onClick={() => viewCategoryProducts('C')}>
            <div className="flex items-center justify-between mb-4">
              <Tag className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold">{report.categories.C?.length || 0}</span>
            </div>
            <h3 className="text-gray-400 text-sm">Category C 💰</h3>
            <p className="text-xs text-green-400 mt-1">Slow (50% - Need Discount)</p>
            <p className="text-xs text-gray-500 mt-2">Click to view products</p>
          </div>
        </div>
      )}

      {/* Top Sellers Section */}
      {report && report.categories && report.categories.A && report.categories.A.length > 0 && (
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/50 rounded-xl p-6 mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-red-400" />
            🔥 Top Selling Products (Category A)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {report.categories.A.slice(0, 3).map((item) => (
              <div key={item.sku} className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-sm font-semibold text-gray-300 mb-1">{item.sku}</div>
                <div className="text-xs text-gray-500 mb-2">{item.product_name || 'N/A'}</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400">Price: Rs. {item.current_price?.toFixed(2)}</div>
                    <div className="text-lg font-bold text-green-400">
                      {item.total_quantity_sold} units sold
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Revenue</div>
                    <div className="text-lg font-bold text-green-400">
                      Rs. {item.total_revenue?.toFixed(0)}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {item.order_count} orders received
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          All Categories
        </button>
        <button
          onClick={() => setFilter('A')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'A' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          🔥 Category A
        </button>
        <button
          onClick={() => setFilter('B')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'B' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          ⚡ Category B
        </button>
        <button
          onClick={() => setFilter('C')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'C' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          💰 Category C (Sale)
        </button>
      </div>

      {/* Pricing Rules Table */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold">Pricing Rules & Current Prices</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">SKU</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Product</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Category</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Base Price</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Current Price</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Change</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Orders (7d)</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {pricingRules.map((rule) => {
                const priceChange = rule.percentage_change || 0;
                const isPriceUp = priceChange > 0;
                const isPriceDown = priceChange < 0;
                
                return (
                  <tr key={rule.sku} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold">{rule.sku}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300">{rule.product_name || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getCategoryBadge(rule.category)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-gray-400">Rs. {rule.base_price?.toFixed(2) || '0.00'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-lg font-bold text-white">
                        Rs. {rule.current_price?.toFixed(2) || (rule.base_price || 0).toFixed(2)}
                      </span>
                      {rule.is_on_sale && (
                        <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">SALE</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isPriceUp && <TrendingUp className="w-4 h-4 text-red-400" />}
                        {isPriceDown && <TrendingDown className="w-4 h-4 text-green-400" />}
                        <span className={`font-semibold ${isPriceUp ? 'text-red-400' : isPriceDown ? 'text-green-400' : 'text-gray-400'}`}>
                          {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-white font-semibold">{rule.rolling_orders || 0}</span>
                      <span className="text-xs text-gray-500 ml-1">orders</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {rule.enabled ? (
                        <CheckCircle className="w-5 h-5 text-green-400 inline" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-500 inline" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleToggleRule(rule.sku, rule.enabled)}
                          className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                        >
                          {rule.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleSyncToShopify(rule.sku)}
                          disabled={syncing}
                          className="text-xs px-3 py-1 bg-green-700 hover:bg-green-600 rounded transition-colors disabled:opacity-50"
                        >
                          Sync
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricing Legend */}
      <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">📖 Pricing Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="font-semibold text-red-400 mb-2">🔥 Category A (High Velocity)</div>
            <ul className="space-y-1 text-gray-400">
              <li>• 10+ historical orders</li>
              <li>• Base price → +0%</li>
              <li>• 2 orders/week → +50%</li>
              <li>• 5 orders/week → +100%</li>
              <li>• 10 orders/week → +150%</li>
              <li>• 20 orders/week → +200% MAX</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-yellow-400 mb-2">⚡ Category B (Medium Velocity)</div>
            <ul className="space-y-1 text-gray-400">
              <li>• 3-9 historical orders</li>
              <li>• Base price → +0%</li>
              <li>• 2 orders/week → +5%</li>
              <li>• 5 orders/week → +12%</li>
              <li>• 10 orders/week → +20%</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-green-400 mb-2">💰 Category C (Low Velocity)</div>
            <ul className="space-y-1 text-gray-400">
              <li>• 0-2 historical orders</li>
              <li>• Start at -20% (SALE)</li>
              <li>• 2 orders/week → Base price</li>
              <li>• 5 orders/week → +10% (promoted!)</li>
              <li>• Auto-promote to Category A after 5 orders</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Product View Modal */}
      {viewingCategory && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className={`p-6 border-b border-gray-700 flex items-center justify-between ${
              viewingCategory === 'A' ? 'bg-gradient-to-r from-red-600/20 to-orange-600/20' :
              viewingCategory === 'B' ? 'bg-gradient-to-r from-yellow-600/20 to-amber-600/20' :
              'bg-gradient-to-r from-green-600/20 to-emerald-600/20'
            }`}>
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  {viewingCategory === 'A' && <><TrendingUp className="w-6 h-6 text-red-400" /> 🔥 Category A - Fast Moving</>}
                  {viewingCategory === 'B' && <><Zap className="w-6 h-6 text-yellow-400" /> ⚡ Category B - Medium</>}
                  {viewingCategory === 'C' && <><Tag className="w-6 h-6 text-green-400" /> 💰 Category C - Sale Items</>}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {categoryProducts.length} products • {
                    viewingCategory === 'A' ? 'Top 20% sellers - Premium pricing' :
                    viewingCategory === 'B' ? 'Steady sellers - Standard pricing' :
                    'Slow movers - Discount recommended'
                  }
                </p>
              </div>
              <button
                onClick={closeProductView}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body - Product List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryProducts.map((product, idx) => (
                  <div key={idx} className={`border rounded-lg p-5 transition-all hover:shadow-lg ${
                    viewingCategory === 'A' ? 'bg-red-900/10 border-red-500/30 hover:border-red-500' :
                    viewingCategory === 'B' ? 'bg-yellow-900/10 border-yellow-500/30 hover:border-yellow-500' :
                    'bg-green-900/10 border-green-500/30 hover:border-green-500'
                  }`}>
                    {/* Product Header */}
                    <div className="mb-3 pb-3 border-b border-gray-700">
                      <div className="font-bold text-white text-lg mb-1">
                        {product.product_name || product.sku || 'Unknown Product'}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        SKU: {product.sku || 'N/A'}
                      </div>
                    </div>

                    {/* Pricing Info */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <div className="text-xs text-gray-400">Current Price</div>
                        <div className="text-lg font-bold text-blue-400">
                          Rs. {product.current_price?.toLocaleString() || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Days Since Sale</div>
                        <div className={`text-lg font-bold ${
                          (product.days_since_last_sale || 0) < 30 ? 'text-green-400' :
                          (product.days_since_last_sale || 0) < 90 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {product.days_since_last_sale || 0} days
                        </div>
                      </div>
                    </div>

                    {/* Sales Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-center">
                        <div className="text-xs text-gray-400">Orders</div>
                        <div className="text-sm font-bold text-white">
                          {product.order_count || product.order_frequency || 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-400">Revenue</div>
                        <div className="text-sm font-bold text-green-400">
                          Rs. {product.total_revenue?.toLocaleString() || 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-400">Units Sold</div>
                        <div className="text-sm font-bold text-purple-400">
                          {product.total_quantity_sold || 0}
                        </div>
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className="flex items-center justify-between">
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                        viewingCategory === 'A' ? 'bg-red-500/20 text-red-400' :
                        viewingCategory === 'B' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {viewingCategory === 'A' && '🔥 Fast Mover'}
                        {viewingCategory === 'B' && '⚡ Steady Seller'}
                        {viewingCategory === 'C' && '💰 Needs Boost'}
                      </div>
                      <div className="text-xs text-gray-400">
                        Stock: {product.current_stock || 0}
                      </div>
                    </div>

                    {/* Velocity Score Indicator */}
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Velocity Score</span>
                        <span className={`font-semibold ${
                          (product.velocity_score || 0) > 0.5 ? 'text-green-400' :
                          (product.velocity_score || 0) > 0.2 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {((product.velocity_score || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                        <div 
                          className={`h-1.5 rounded-full ${
                            (product.velocity_score || 0) > 0.5 ? 'bg-green-500' :
                            (product.velocity_score || 0) > 0.2 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{width: `${Math.min((product.velocity_score || 0) * 100, 100)}%`}}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {categoryProducts.length === 0 && (
                <div className="text-center py-12">
                  <Tag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No products found in this category</p>
                </div>
              )}
            </div>

            {/* Modal Footer - Summary */}
            <div className="p-6 border-t border-gray-700 bg-gray-800/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-400">Total Products</div>
                  <div className="text-xl font-bold text-white">{categoryProducts.length}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Avg Price</div>
                  <div className="text-xl font-bold text-blue-400">
                    Rs. {(categoryProducts.reduce((sum, p) => sum + (p.current_price || 0), 0) / categoryProducts.length || 0).toFixed(0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Total Revenue</div>
                  <div className="text-xl font-bold text-green-400">
                    Rs. {categoryProducts.reduce((sum, p) => sum + (p.total_revenue || 0), 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Total Units Sold</div>
                  <div className="text-xl font-bold text-purple-400">
                    {categoryProducts.reduce((sum, p) => sum + (p.total_quantity_sold || 0), 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicPricingDashboard;
