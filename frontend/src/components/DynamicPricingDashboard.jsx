import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown, DollarSign, Settings, RefreshCw, Zap, Tag, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DynamicPricingDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pricingRules, setPricingRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, A, B, C
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [filter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const statsRes = await axios.get(`${API_URL}/api/pricing/dashboard-stats`);
      setStats(statsRes.data.stats);
      
      // Fetch pricing rules
      const rulesQuery = filter !== 'all' ? `?category=${filter}` : '';
      const rulesRes = await axios.get(`${API_URL}/api/pricing/rules${rulesQuery}&limit=50`);
      
      // Calculate current prices for each rule
      const rulesWithPrices = await Promise.all(
        rulesRes.data.rules.map(async (rule) => {
          try {
            const priceRes = await axios.get(`${API_URL}/api/pricing/calculate/${rule.sku}`);
            return {
              ...rule,
              ...priceRes.data.pricing
            };
          } catch (err) {
            return rule;
          }
        })
      );
      
      setPricingRules(rulesWithPrices);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const handleClassifyAll = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/api/pricing/classify-all`);
      alert(`✅ ${res.data.message}\nCategory A: ${res.data.category_breakdown.A}\nCategory B: ${res.data.category_breakdown.B}\nCategory C: ${res.data.category_breakdown.C}`);
      fetchDashboardData();
    } catch (error) {
      console.error('Error classifying SKUs:', error);
      alert('❌ Error classifying SKUs');
    }
  };

  const handleSyncToShopify = async (sku = null) => {
    try {
      setSyncing(true);
      
      if (sku) {
        // Sync single SKU
        const storeName = 'asmia'; // Default store
        const res = await axios.post(`${API_URL}/api/pricing/sync-to-shopify/${sku}?store_name=${storeName}`);
        
        if (res.data.success) {
          alert(`✅ Price synced to Shopify for ${sku}\nNew Price: Rs. ${res.data.new_price}`);
        } else {
          alert(`❌ Sync failed: ${res.data.error || 'Unknown error'}`);
        }
      } else {
        // Bulk sync all
        const storeName = 'asmia';
        const res = await axios.post(`${API_URL}/api/pricing/sync-all-to-shopify?store_name=${storeName}&limit=100`);
        
        if (res.data.success) {
          alert(`✅ Bulk sync complete!\n\nSuccessfully synced: ${res.data.success_count || 0} SKUs\nFailed: ${res.data.failed_count || 0} SKUs\nTotal processed: ${res.data.total_processed || 0}`);
        } else {
          alert(`❌ Sync failed: ${res.data.error || 'Unknown error'}\n\nNote: Make sure Shopify credentials are configured correctly.`);
        }
      }
      
      setSyncing(false);
    } catch (error) {
      console.error('Error syncing to Shopify:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
      alert(`❌ Error syncing to Shopify\n\n${errorMsg}\n\nPlease check:\n1. Shopify credentials are configured\n2. Store has valid API access\n3. Backend is running`);
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

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
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
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleClassifyAll}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Zap className="w-4 h-4" />
              Classify All SKUs
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
        
        {/* Shopify Configuration Notice */}
        <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-yellow-400 font-semibold mb-1">Shopify Configuration Required</h3>
              <p className="text-sm text-gray-300">
                To sync prices automatically to Shopify, make sure your store credentials are configured in Settings. 
                The system will calculate prices automatically, but manual sync to Shopify requires valid API access.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold">{stats.total_skus}</span>
            </div>
            <h3 className="text-gray-400 text-sm">Total SKUs</h3>
            <p className="text-xs text-gray-500 mt-1">{stats.enabled_skus} enabled</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-red-900/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-red-400" />
              <span className="text-2xl font-bold">{stats.category_a_count}</span>
            </div>
            <h3 className="text-gray-400 text-sm">Category A</h3>
            <p className="text-xs text-red-400 mt-1">High Velocity (10+ orders)</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-yellow-900/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-8 h-8 text-yellow-400" />
              <span className="text-2xl font-bold">{stats.category_b_count}</span>
            </div>
            <h3 className="text-gray-400 text-sm">Category B</h3>
            <p className="text-xs text-yellow-400 mt-1">Medium (3-9 orders)</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-green-900/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Tag className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold">{stats.category_c_count}</span>
            </div>
            <h3 className="text-gray-400 text-sm">Category C</h3>
            <p className="text-xs text-green-400 mt-1">Low Velocity (0-2 orders)</p>
          </div>
        </div>
      )}

      {/* Surging Items Alert */}
      {stats && stats.surging_items && stats.surging_items.length > 0 && (
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/50 rounded-xl p-6 mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-red-400" />
            🔥 Hot Items (Price Surging)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.surging_items.slice(0, 3).map((item) => (
              <div key={item.sku} className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-sm font-semibold text-gray-300 mb-1">{item.sku}</div>
                <div className="text-xs text-gray-500 mb-2">{item.product_name || 'N/A'}</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400">Base: Rs. {item.base_price}</div>
                    <div className="text-lg font-bold text-red-400">
                      Rs. {item.current_price || (item.base_price * item.multiplier).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Surge</div>
                    <div className="text-lg font-bold text-red-400">
                      +{((item.multiplier - 1) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {item.rolling_orders || 0} orders this week
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
    </div>
  );
};

export default DynamicPricingDashboard;
