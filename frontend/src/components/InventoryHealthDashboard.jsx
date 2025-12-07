import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, TrendingDown, TrendingUp, Package, DollarSign, Calendar, Tag } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const InventoryHealthDashboard = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/inventory/health-analysis`);
      setHealthData(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching health data:', error);
      setLoading(false);
    }
  };

  const createClearanceCampaign = async (ageThreshold) => {
    try {
      const res = await axios.post(`${API_URL}/api/inventory/create-clearance-campaign`, {
        age_days: ageThreshold,
        discount_percentage: ageThreshold >= 180 ? 30 : ageThreshold >= 90 ? 20 : 10
      });
      alert(`✅ ${res.data.message}\nCreated campaign for ${res.data.items_count} items`);
      fetchHealthData();
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('❌ Error creating clearance campaign');
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
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          📊 Inventory Health Dashboard
        </h1>
        <p className="text-gray-400">
          Real-time insights on stock health, dead stock, and profit margins
        </p>
      </div>

      {/* Critical Alerts */}
      {healthData?.alerts && healthData.alerts.length > 0 && (
        <div className="mb-8 bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-red-400 mb-2">🚨 Critical Alerts</h2>
              <div className="space-y-2">
                {healthData.alerts.map((alert, idx) => (
                  <div key={idx} className="text-gray-300">
                    • {alert.message} 
                    {alert.action && (
                      <button
                        onClick={() => createClearanceCampaign(alert.age_threshold)}
                        className="ml-3 text-sm px-3 py-1 bg-red-600 hover:bg-red-700 rounded transition-colors"
                      >
                        {alert.action}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingDown className="w-8 h-8 text-red-400" />
            <span className="text-3xl font-bold">{healthData?.dead_stock_count || 0}</span>
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Dead Stock</h3>
          <p className="text-xs text-red-400">0 orders in 180+ days</p>
          <p className="text-lg font-semibold text-red-300 mt-2">
            Rs. {healthData?.dead_stock_value?.toLocaleString() || 0}
          </p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Package className="w-8 h-8 text-yellow-400" />
            <span className="text-3xl font-bold">{healthData?.slow_moving_count || 0}</span>
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Slow Moving</h3>
          <p className="text-xs text-yellow-400">90-180 days old</p>
          <p className="text-lg font-semibold text-yellow-300 mt-2">
            Rs. {healthData?.slow_moving_value?.toLocaleString() || 0}
          </p>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-green-400" />
            <span className="text-3xl font-bold">{healthData?.fast_moving_count || 0}</span>
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Fast Moving</h3>
          <p className="text-xs text-green-400">Sold in last 30 days</p>
          <p className="text-lg font-semibold text-green-300 mt-2">
            Rs. {healthData?.fast_moving_value?.toLocaleString() || 0}
          </p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
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
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                <div>
                  <div className="font-semibold">{bucket.label}</div>
                  <div className="text-sm text-gray-400">{bucket.count} items</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">Rs. {bucket.value?.toLocaleString()}</div>
                  {bucket.action && (
                    <button
                      onClick={() => createClearanceCampaign(bucket.min_age)}
                      className="mt-1 text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
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
            Profit Margin Analysis
          </h2>
          <div className="space-y-3">
            {healthData?.margin_analysis?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                <div>
                  <div className="font-semibold">{item.category}</div>
                  <div className="text-sm text-gray-400">{item.count} items</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-400">{item.avg_margin}%</div>
                  <div className="text-xs text-gray-400">Avg Margin</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dead Stock Details */}
      {healthData?.dead_stock_items && healthData.dead_stock_items.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              Dead Stock Items (Need Immediate Action)
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">SKU</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Product</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Age (Days)</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Cost</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Sale Price</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Quantity</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {healthData.dead_stock_items.slice(0, 20).map((item) => (
                  <tr key={item.sku} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold">{item.sku}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{item.product_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-red-400 font-semibold">{item.age_days}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400">
                      Rs. {item.cost?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold">
                      Rs. {item.sale_price?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">{item.quantity}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => createClearanceCampaign(180)}
                        className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 rounded transition-colors"
                      >
                        Add to Clearance
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryHealthDashboard;
