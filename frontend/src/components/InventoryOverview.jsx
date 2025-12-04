import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Package, DollarSign, TrendingUp, ShoppingBag, Palette, Ruler, X, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const InventoryOverview = () => {
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [stats, setStats] = useState({
    total_items: 0,
    total_cost: 0,
    total_sale_value: 0,
    total_profit: 0,
    can_fulfill_today: { count: 0, cost: 0, sale_value: 0, profit: 0 },
    in_transit_tracked: { count: 0, cost: 0, sale_value: 0, profit: 0 },
    delivered_recent: { count: 0, cost: 0, sale_value: 0, profit: 0 },
    unknown_old: { count: 0, cost: 0, sale_value: 0, profit: 0 },
    by_collection: [],
    by_size: [],
    by_color: []
  });
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState({
    open: false,
    category: '',
    title: '',
    data: null,
    loading: false
  });

  useEffect(() => {
    fetchInventoryStats();
  }, [dateRange]);

  const fetchInventoryStats = async () => {
    try {
      let url = `${API}/api/inventory/v2/overview-stats`;
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDetailModal = async (category, title) => {
    setDetailModal({
      open: true,
      category,
      title,
      data: null,
      loading: true
    });

    try {
      let url = `${API}/api/inventory/v2/overview-detail/${category}`;
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await axios.get(url);
      if (response.data.success) {
        setDetailModal(prev => ({
          ...prev,
          data: response.data,
          loading: false
        }));
      }
    } catch (error) {
      console.error('Error fetching detail:', error);
      setDetailModal(prev => ({
        ...prev,
        loading: false
      }));
    }
  };

  const closeDetailModal = () => {
    setDetailModal({
      open: false,
      category: '',
      title: '',
      data: null,
      loading: false
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-500">Loading inventory stats...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                📦 Inventory Overview
              </h1>
              <p className="text-gray-600">Financial and stock analytics for your inventory</p>
            </div>
            
            {/* Date Filter */}
            <div className="flex gap-4 items-center">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <button
                onClick={() => setDateRange({start: '', end: ''})}
                className="mt-6 px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Financial Stats - Shopify Orders */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-800 mb-3">💰 Shopify Order Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card 
              className="border-orange-200 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => openDetailModal('all_items', '💰 All Inventory Items - Detailed View')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-orange-700 font-semibold">Total Cost</CardDescription>
                  <DollarSign className="w-8 h-8 text-orange-500" />
                </div>
                <CardTitle className="text-3xl font-bold text-orange-600">
                  Rs. {stats.total_cost.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-orange-600">Stock Value Investment</p>
                <p className="text-xs text-orange-500 mt-1 italic">Click to view all items</p>
              </CardContent>
            </Card>

            <Card 
              className="border-blue-200 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => openDetailModal('all_items', '💰 All Inventory Items - Detailed View')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-blue-700 font-semibold">Sale Value</CardDescription>
                  <ShoppingBag className="w-8 h-8 text-blue-500" />
                </div>
                <CardTitle className="text-3xl font-bold text-blue-600">
                  Rs. {stats.total_sale_value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-600">From Shopify Matched Orders</p>
                <p className="text-xs text-blue-500 mt-1 italic">Click to view all items</p>
              </CardContent>
            </Card>

            <Card 
              className="border-green-200 shadow-lg bg-gradient-to-br from-green-50 to-green-100 cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => openDetailModal('all_items', '💰 All Inventory Items - Detailed View')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-green-700 font-semibold">Potential Profit</CardDescription>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
                <CardTitle className="text-3xl font-bold text-green-600">
                  Rs. {stats.total_profit.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-600">
                  {stats.total_cost > 0 ? `${((stats.total_profit / stats.total_cost) * 100).toFixed(1)}% Margin` : 'N/A'}
                </p>
                <p className="text-xs text-green-500 mt-1 italic">Click to view all items</p>
              </CardContent>
            </Card>

            <Card 
              className="border-purple-200 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => openDetailModal('all_items', '💰 All Inventory Items - Detailed View')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-purple-700 font-semibold">Total Items</CardDescription>
                  <Package className="w-8 h-8 text-purple-500" />
                </div>
                <CardTitle className="text-3xl font-bold text-purple-600">
                  {stats.total_items.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-purple-600">In inventory database</p>
                <p className="text-xs text-purple-500 mt-1 italic">Click to view all items</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* NEW: Inventory-Based Sale Value */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">🏷️ Inventory SKU Sale Prices</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-cyan-200 shadow-lg bg-gradient-to-br from-cyan-50 to-cyan-100">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-cyan-700 font-semibold">Inventory Sale Value</CardDescription>
                  <ShoppingBag className="w-8 h-8 text-cyan-500" />
                </div>
                <CardTitle className="text-3xl font-bold text-cyan-600">
                  Rs. {(stats.inventory_sale_value || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-cyan-600">Based on SKU sale prices</p>
                <p className="text-xs text-cyan-500 mt-1">{stats.items_with_sale_price || 0} items with sale price</p>
              </CardContent>
            </Card>

            <Card className="border-teal-200 shadow-lg bg-gradient-to-br from-teal-50 to-teal-100">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-teal-700 font-semibold">Inventory Profit</CardDescription>
                  <TrendingUp className="w-8 h-8 text-teal-500" />
                </div>
                <CardTitle className="text-3xl font-bold text-teal-600">
                  Rs. {(stats.inventory_profit || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-teal-600">
                  {stats.total_cost > 0 ? `${(((stats.inventory_profit || 0) / stats.total_cost) * 100).toFixed(1)}% Margin` : 'N/A'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-indigo-200 shadow-lg bg-gradient-to-br from-indigo-50 to-indigo-100">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-indigo-700 font-semibold">Value Difference</CardDescription>
                  <TrendingUp className="w-8 h-8 text-indigo-500" />
                </div>
                <CardTitle className="text-3xl font-bold text-indigo-600">
                  Rs. {((stats.inventory_sale_value || 0) - stats.total_sale_value).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-indigo-600">SKU Price vs Shopify Orders</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SKU Status Breakdown - By TCS Tracking & Fulfillment */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📦 Inventory by Order Status (TCS Tracking Based)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Can Fulfill Today */}
            <Card 
              className="border-blue-200 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => openDetailModal('can_fulfill_today', '🎯 Can Fulfill Today - Detailed Breakdown')}
            >
              <CardHeader className="pb-3">
                <CardDescription className="text-blue-700 font-semibold flex items-center justify-between">
                  <span>🎯 Can Fulfill Today</span>
                  <ExternalLink className="h-4 w-4" />
                </CardDescription>
                <CardTitle className="text-3xl font-bold text-blue-600">
                  {stats.can_fulfill_today.count.toLocaleString()} SKUs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-600">Cost:</span>
                    <span className="font-semibold text-blue-700">
                      Rs. {stats.can_fulfill_today.cost.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Order Value:</span>
                    <span className="font-semibold text-blue-700">
                      Rs. {stats.can_fulfill_today.sale_value.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Profit:</span>
                    <span className="font-semibold text-green-600">
                      Rs. {stats.can_fulfill_today.profit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-blue-500 mt-2 italic">Click to view details</p>
              </CardContent>
            </Card>

            {/* In Transit (TCS Tracked) */}
            <Card 
              className="border-yellow-200 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100 cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => openDetailModal('in_transit', '🚛 In Transit (TCS Live) - Detailed Breakdown')}
            >
              <CardHeader className="pb-3">
                <CardDescription className="text-yellow-700 font-semibold">🚛 In Transit (TCS Live)</CardDescription>
                <CardTitle className="text-3xl font-bold text-yellow-600">
                  {stats.in_transit_tracked.count.toLocaleString()} SKUs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-yellow-600">Cost:</span>
                    <span className="font-semibold text-yellow-700">
                      Rs. {stats.in_transit_tracked.cost.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-600">Order Value:</span>
                    <span className="font-semibold text-yellow-700">
                      Rs. {stats.in_transit_tracked.sale_value.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-600">Profit:</span>
                    <span className="font-semibold text-green-600">
                      Rs. {stats.in_transit_tracked.profit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-yellow-600 mt-2 italic">Click to view details</p>
              </CardContent>
            </Card>

            {/* Delivered Recent */}
            <Card 
              className="border-green-200 shadow-lg bg-gradient-to-br from-green-50 to-green-100 cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => openDetailModal('delivered', '✅ Delivered Recent - Detailed Breakdown')}
            >
              <CardHeader className="pb-3">
                <CardDescription className="text-green-700 font-semibold flex items-center justify-between">
                  <span>✅ Delivered Recent</span>
                  <ExternalLink className="h-4 w-4" />
                </CardDescription>
                <CardTitle className="text-3xl font-bold text-green-600">
                  {stats.delivered_recent.count.toLocaleString()} SKUs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">Cost:</span>
                    <span className="font-semibold text-green-700">
                      Rs. {stats.delivered_recent.cost.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Order Value:</span>
                    <span className="font-semibold text-green-700">
                      Rs. {stats.delivered_recent.sale_value.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Profit:</span>
                    <span className="font-semibold text-green-700">
                      Rs. {stats.delivered_recent.profit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2 italic">Click to view details</p>
              </CardContent>
            </Card>

            {/* Unknown/Old */}
            <Card 
              className="border-gray-300 shadow-lg bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => openDetailModal('other', '❓ Other Orders - Detailed Breakdown')}
            >
              <CardHeader className="pb-3">
                <CardDescription className="text-gray-700 font-semibold flex items-center justify-between">
                  <span>❓ Other Orders</span>
                  <ExternalLink className="h-4 w-4" />
                </CardDescription>
                <CardTitle className="text-3xl font-bold text-gray-600">
                  {stats.unknown_old.count.toLocaleString()} SKUs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost:</span>
                    <span className="font-semibold text-gray-700">
                      Rs. {stats.unknown_old.cost.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Value:</span>
                    <span className="font-semibold text-gray-700">
                      Rs. {stats.unknown_old.sale_value.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit:</span>
                    <span className="font-semibold text-green-600">
                      Rs. {stats.unknown_old.profit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">Click to view details</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Collection Breakdown */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            Count by Collection
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stats.by_collection.slice(0, 12).map((item, idx) => (
              <Card key={idx} className="border-indigo-100 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs text-indigo-600 font-semibold truncate" title={item._id}>
                    {item._id || 'Uncategorized'}
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold text-indigo-700">{item.count}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">Rs. {item.total_cost.toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Size Breakdown */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Ruler className="w-6 h-6" />
            Count by Size
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-10 gap-4">
            {stats.by_size.slice(0, 20).map((item, idx) => (
              <Card key={idx} className="border-teal-100 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2 text-center">
                  <CardDescription className="text-xs text-teal-600 font-semibold">
                    Size {item._id || 'N/A'}
                  </CardDescription>
                  <CardTitle className="text-xl font-bold text-teal-700">{item.count}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Color Breakdown */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Palette className="w-6 h-6" />
            Count by Color
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stats.by_color.slice(0, 12).map((item, idx) => (
              <Card key={idx} className="border-pink-100 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs text-pink-600 font-semibold uppercase">
                    {item._id || 'N/A'}
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold text-pink-700">{item.count}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">Items</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={detailModal.open} onOpenChange={closeDetailModal}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{detailModal.title}</DialogTitle>
            <DialogDescription>
              Detailed breakdown of products and orders in this category
            </DialogDescription>
          </DialogHeader>

          {detailModal.loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-lg text-gray-500">Loading details...</div>
            </div>
          ) : detailModal.data ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Total Items in Category</p>
                  <p className="text-2xl font-bold text-gray-900">{detailModal.data.total_items}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Showing top 500 items</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">SKU</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Collection</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Cost</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Sale Price</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {detailModal.data.items && detailModal.data.items.length > 0 ? (
                      detailModal.data.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                          <td className="px-4 py-3 text-xs">
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                              {item.collection || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            Rs. {item.cost.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            Rs. {(item.sale_price || item.cost).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">
                            {item.orders && item.orders.length > 0 ? (
                              <div className="space-y-1">
                                {item.orders.slice(0, 3).map((order, oidx) => (
                                  <div key={oidx} className="text-xs bg-blue-50 p-2 rounded">
                                    <div className="flex justify-between items-center">
                                      <span className="font-semibold text-blue-700">
                                        #{order.order_number}
                                      </span>
                                      {order.tracking_number && (
                                        <span className="text-gray-500 text-[10px] font-mono">
                                          {order.tracking_number}
                                        </span>
                                      )}
                                    </div>
                                    {order.customer && (
                                      <div className="text-gray-600 text-[10px]">{order.customer}</div>
                                    )}
                                    {order.delivery_status && (
                                      <div className="text-[10px] mt-1">
                                        <span className={`px-2 py-0.5 rounded ${
                                          order.delivery_status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                          order.delivery_status === 'IN_TRANSIT' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-gray-100 text-gray-700'
                                        }`}>
                                          {order.delivery_status}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {item.orders.length > 3 && (
                                  <div className="text-xs text-gray-500 italic">
                                    +{item.orders.length - 3} more orders
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">No linked orders</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                          No items found in this category
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              No data available
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button onClick={closeDetailModal} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryOverview;
