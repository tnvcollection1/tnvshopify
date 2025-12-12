import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, TrendingDown, TrendingUp, Package, DollarSign, Calendar, Tag, Store, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '../contexts/StoreContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const InventoryHealthDashboard = () => {
  const { selectedStore: globalStore, getStoreName } = useStore();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchHealthData();
  }, [globalStore]);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      // Use the clearance health endpoint which supports store filtering
      const params = globalStore !== 'all' ? `?store_name=${globalStore}` : '';
      const res = await axios.get(`${API_URL}/api/clearance/health${params}`);
      
      if (res.data.success) {
        // Transform data for the dashboard
        const summary = res.data.summary || {};
        const categories = res.data.categories || {};
        
        setHealthData({
          // Use summary counts for accurate totals (categories are limited to 50 items)
          dead_stock_count: summary.dead_stock_count || 0,
          dead_stock_value: summary.dead_stock_value || 0,
          dead_stock_items: categories.dead_stock || [],
          slow_moving_count: summary.slow_moving_count || 0,
          slow_moving_value: summary.slow_moving_value || 0,
          fast_moving_count: summary.healthy_count || 0,
          fast_moving_value: categories.healthy?.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0) || 0,
          total_items: summary.total_items || 0,
          total_value: summary.dead_stock_value + summary.slow_moving_value || 0,
          alerts: generateAlerts(summary, categories),
          age_buckets: generateAgeBuckets(summary, categories),
          margin_analysis: [],
          raw_categories: categories,
          raw_summary: summary
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching health data:', error);
      setLoading(false);
    }
  };

  const generateAlerts = (summary, categories) => {
    const alerts = [];
    const deadStockCount = summary.dead_stock_count || 0;
    const deadStockValue = summary.dead_stock_value || 0;
    const slowMovingCount = summary.slow_moving_count || 0;
    const slowMovingValue = summary.slow_moving_value || 0;
    const totalItems = summary.total_items || 1;
    const healthyCount = summary.healthy_count || 0;
    
    // Check if most items have no sales data (suggests order sync needed)
    const deadStockPercentage = (deadStockCount / totalItems) * 100;
    
    if (deadStockCount > 0) {
      let message = `${deadStockCount} items are dead stock (never sold or 360+ days) worth Rs. ${deadStockValue.toLocaleString()}`;
      
      // Add sync hint if >80% items show as dead stock with few healthy items
      if (deadStockPercentage > 80 && healthyCount < 200) {
        message += ` ⚠️ High dead stock may indicate orders need syncing from Shopify.`;
      }
      
      alerts.push({
        message,
        action: 'Create Clearance Campaign',
        age_threshold: 360,
        syncHint: deadStockPercentage > 80
      });
    }
    
    if (slowMovingCount > 0) {
      alerts.push({
        message: `${slowMovingCount} items are slow-moving (180-360 days) worth Rs. ${slowMovingValue.toLocaleString()}`,
        action: 'Review Items',
        age_threshold: 180
      });
    }
    
    return alerts;
  };

  const generateAgeBuckets = (summary, categories) => {
    return [
      {
        label: '360+ Days / Never Sold (Dead Stock)',
        count: summary.dead_stock_count || 0,
        value: summary.dead_stock_value || 0,
        min_age: 360,
        action: true
      },
      {
        label: '180-360 Days (Slow Moving)',
        count: summary.slow_moving_count || 0,
        value: summary.slow_moving_value || 0,
        min_age: 180,
        action: true
      },
      {
        label: '90-180 Days (Moderate)',
        count: summary.moderate_count || 0,
        value: categories.moderate?.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0) || 0,
        min_age: 90,
        action: false
      },
      {
        label: '0-90 Days (Healthy)',
        count: summary.healthy_count || 0,
        value: categories.healthy?.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0) || 0,
        min_age: 0,
        action: false
      }
    ];
  };

  const createClearanceCampaign = async (ageThreshold) => {
    try {
      setAiLoading(true);
      const category = ageThreshold >= 360 ? 'dead_stock' : 
                       ageThreshold >= 180 ? 'slow_moving' : 'moderate';
      
      const params = globalStore !== 'all' ? `store_name=${globalStore}&` : '';
      const res = await axios.post(`${API_URL}/api/clearance/quick-clearance?${params}category=${category}&auto_discount=true`);
      
      if (res.data.success) {
        alert(`✅ Clearance campaign created!\n\n` +
              `Campaign: ${res.data.campaign?.name || 'Quick Clearance'}\n` +
              `Items: ${res.data.campaign?.items_count || 0}\n` +
              `Total Value: Rs. ${res.data.campaign?.total_value?.toLocaleString() || 0}`);
        fetchHealthData();
      } else {
        alert(`⚠️ ${res.data.error || 'No items found for clearance'}`);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('❌ Error creating clearance campaign');
    } finally {
      setAiLoading(false);
    }
  };

  const getAIRecommendations = async (category = 'dead_stock') => {
    try {
      setAiLoading(true);
      const params = globalStore !== 'all' ? `store_name=${globalStore}&` : '';
      const res = await axios.post(`${API_URL}/api/clearance/ai-recommendations?${params}category=${category}`);
      
      if (res.data.success) {
        alert(`🤖 AI Recommendations:\n\n${res.data.overall_strategy || 'Analysis complete'}\n\n` +
              `Recommendations: ${res.data.recommendations?.length || 0} items analyzed`);
      } else {
        alert(`⚠️ ${res.data.error || 'No recommendations available'}`);
      }
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      alert('❌ Error getting AI recommendations');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
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
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            📊 Inventory Health Dashboard
          </h1>
          <p className="text-gray-400">
            Real-time insights on stock health, dead stock, and clearance opportunities
          </p>
        </div>
        
        {/* Store Indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700">
            <Store className="w-5 h-5 text-blue-400" />
            <span className="text-white font-medium">{getStoreName(globalStore)}</span>
          </div>
          <Button
            onClick={fetchHealthData}
            variant="outline"
            className="border-gray-700 hover:bg-gray-700 text-gray-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Store Badge */}
      {globalStore !== 'all' && (
        <div className="mb-6 inline-block bg-blue-500/20 border border-blue-500/40 text-blue-300 px-4 py-2 rounded-full text-sm">
          Showing data for: <strong>{getStoreName(globalStore)}</strong>
        </div>
      )}

      {/* Critical Alerts */}
      {healthData?.alerts && healthData.alerts.length > 0 && (
        <div className="mb-8 bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400 mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-red-400 mb-2">🚨 Critical Alerts</h2>
              <div className="space-y-3">
                {healthData.alerts.map((alert, idx) => (
                  <div key={idx} className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-gray-300">• {alert.message}</span>
                    <div className="flex gap-2">
                      {alert.action && (
                        <button
                          onClick={() => createClearanceCampaign(alert.age_threshold)}
                          disabled={aiLoading}
                          className="text-sm px-3 py-1 bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
                        >
                          {aiLoading ? 'Processing...' : alert.action}
                        </button>
                      )}
                      <button
                        onClick={() => getAIRecommendations(alert.age_threshold >= 360 ? 'dead_stock' : 'slow_moving')}
                        disabled={aiLoading}
                        className="text-sm px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded transition-colors disabled:opacity-50"
                      >
                        🤖 AI Analysis
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 hover:border-red-500/60 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <TrendingDown className="w-8 h-8 text-red-400" />
            <span className="text-3xl font-bold">{healthData?.dead_stock_count || 0}</span>
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Dead Stock</h3>
          <p className="text-xs text-red-400">360+ days without sale</p>
          <p className="text-lg font-semibold text-red-300 mt-2">
            Rs. {healthData?.dead_stock_value?.toLocaleString() || 0}
          </p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 hover:border-yellow-500/60 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <Package className="w-8 h-8 text-yellow-400" />
            <span className="text-3xl font-bold">{healthData?.slow_moving_count || 0}</span>
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Slow Moving</h3>
          <p className="text-xs text-yellow-400">180-360 days old</p>
          <p className="text-lg font-semibold text-yellow-300 mt-2">
            Rs. {healthData?.slow_moving_value?.toLocaleString() || 0}
          </p>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 hover:border-green-500/60 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-green-400" />
            <span className="text-3xl font-bold">{healthData?.fast_moving_count || 0}</span>
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Healthy Stock</h3>
          <p className="text-xs text-green-400">0-90 days old</p>
          <p className="text-lg font-semibold text-green-300 mt-2">
            Rs. {healthData?.fast_moving_value?.toLocaleString() || 0}
          </p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 hover:border-blue-500/60 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 text-blue-400" />
            <span className="text-3xl font-bold">{healthData?.total_items || 0}</span>
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Total Items</h3>
          <p className="text-xs text-blue-400">Entire inventory</p>
          <p className="text-lg font-semibold text-blue-300 mt-2">
            Rs. {healthData?.total_value?.toLocaleString() || 0}
          </p>
        </div>
      </div>

      {/* Age-Based Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Inventory Age Analysis
          </h2>
          <div className="space-y-3">
            {healthData?.age_buckets?.map((bucket, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                <div>
                  <div className="font-semibold">{bucket.label}</div>
                  <div className="text-sm text-gray-400">{bucket.count} items</div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <div className="text-lg font-bold">Rs. {bucket.value?.toLocaleString()}</div>
                  </div>
                  {bucket.action && bucket.count > 0 && (
                    <button
                      onClick={() => createClearanceCampaign(bucket.min_age)}
                      disabled={aiLoading}
                      className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded transition-colors disabled:opacity-50"
                    >
                      Create Campaign
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-green-400" />
            Quick Actions
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => createClearanceCampaign(360)}
              disabled={aiLoading || (healthData?.dead_stock_count || 0) === 0}
              className="w-full p-4 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-lg text-left transition-colors disabled:opacity-50"
            >
              <div className="font-semibold text-red-300">🗑️ Clear Dead Stock</div>
              <div className="text-sm text-gray-400">Create clearance campaign for 360+ day items</div>
            </button>
            
            <button
              onClick={() => createClearanceCampaign(180)}
              disabled={aiLoading || (healthData?.slow_moving_count || 0) === 0}
              className="w-full p-4 bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-500/30 rounded-lg text-left transition-colors disabled:opacity-50"
            >
              <div className="font-semibold text-yellow-300">⏳ Clear Slow Moving</div>
              <div className="text-sm text-gray-400">Create clearance campaign for 180-360 day items</div>
            </button>
            
            <button
              onClick={() => getAIRecommendations('dead_stock')}
              disabled={aiLoading}
              className="w-full p-4 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg text-left transition-colors disabled:opacity-50"
            >
              <div className="font-semibold text-purple-300">🤖 Get AI Recommendations</div>
              <div className="text-sm text-gray-400">AI-powered discount suggestions for dead stock</div>
            </button>
          </div>
        </div>
      </div>

      {/* Dead Stock Details */}
      {healthData?.dead_stock_items && healthData.dead_stock_items.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              Dead Stock Items (360+ Days - Need Immediate Action)
            </h2>
            <span className="text-gray-400">{healthData.dead_stock_items.length} items</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">SKU</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Product</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Store</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Days Without Sale</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Price</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Quantity</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {healthData.dead_stock_items.slice(0, 30).map((item) => (
                  <tr key={item.sku} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold">{item.sku}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{item.title || item.product_name || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 bg-gray-700 rounded">{item.store_name || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-red-400 font-semibold">{item.days_without_sale || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold">
                      Rs. {item.price?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 text-right">{item.quantity || 1}</td>
                    <td className="px-6 py-4 text-right text-red-300 font-semibold">
                      Rs. {((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {healthData.dead_stock_items.length > 30 && (
            <div className="p-4 text-center text-gray-400 border-t border-gray-700">
              Showing 30 of {healthData.dead_stock_items.length} items
            </div>
          )}
        </div>
      )}

      {/* No Dead Stock Message */}
      {(!healthData?.dead_stock_items || healthData.dead_stock_items.length === 0) && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-8 text-center">
          <TrendingUp className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-green-400 mb-2">🎉 Great News!</h3>
          <p className="text-gray-400">
            No dead stock items found{selectedStore !== 'all' ? ` for ${selectedStore}` : ''}. Your inventory is healthy!
          </p>
        </div>
      )}
    </div>
  );
};

export default InventoryHealthDashboard;
