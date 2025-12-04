import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Package, DollarSign, TrendingUp, ShoppingBag, Palette, Ruler } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const InventoryOverview = () => {
  const [stats, setStats] = useState({
    total_items: 0,
    total_cost: 0,
    total_sale_value: 0,
    total_profit: 0,
    in_stock: { count: 0, cost: 0, sale_value: 0, profit: 0 },
    in_transit: { count: 0, cost: 0, sale_value: 0, profit: 0 },
    delivered: { count: 0, cost: 0, sale_value: 0, profit: 0 },
    by_collection: [],
    by_size: [],
    by_color: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventoryStats();
  }, []);

  const fetchInventoryStats = async () => {
    try {
      const response = await axios.get(`${API}/api/inventory/v2/overview-stats`);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk' }}>
            📦 Inventory Overview
          </h1>
          <p className="text-gray-600">Financial and stock analytics for your inventory</p>
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-orange-200 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
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
            </CardContent>
          </Card>

          <Card className="border-blue-200 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
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
            </CardContent>
          </Card>

          <Card className="border-green-200 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
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
            </CardContent>
          </Card>

          <Card className="border-purple-200 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
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
            </CardContent>
          </Card>
        </div>

        {/* SKU Status Breakdown - Matched with Shopify Orders */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📦 SKU Status by Order Delivery
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* In Stock (No Order Match) */}
            <Card className="border-gray-200 shadow-lg bg-gradient-to-br from-gray-50 to-gray-100">
              <CardHeader className="pb-3">
                <CardDescription className="text-gray-700 font-semibold">📦 In Stock (No Order)</CardDescription>
                <CardTitle className="text-3xl font-bold text-gray-600">
                  {stats.in_stock.count.toLocaleString()} SKUs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost:</span>
                    <span className="font-semibold text-gray-700">
                      Rs. {stats.in_stock.cost.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sale Value:</span>
                    <span className="font-semibold text-gray-500 italic">
                      Pending Orders
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit:</span>
                    <span className="font-semibold text-gray-500 italic">
                      Pending Orders
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* In Transit */}
            <Card className="border-yellow-200 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100">
              <CardHeader className="pb-3">
                <CardDescription className="text-yellow-700 font-semibold">🚛 In Transit (Matched)</CardDescription>
                <CardTitle className="text-3xl font-bold text-yellow-600">
                  {stats.in_transit.count.toLocaleString()} SKUs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-yellow-600">Cost:</span>
                    <span className="font-semibold text-yellow-700">
                      Rs. {stats.in_transit.cost.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-600">Sale Value:</span>
                    <span className="font-semibold text-yellow-700">
                      Rs. {stats.in_transit.sale_value.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-600">Profit:</span>
                    <span className="font-semibold text-green-600">
                      Rs. {stats.in_transit.profit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivered */}
            <Card className="border-green-200 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
              <CardHeader className="pb-3">
                <CardDescription className="text-green-700 font-semibold">✅ Delivered (Matched)</CardDescription>
                <CardTitle className="text-3xl font-bold text-green-600">
                  {stats.delivered.count.toLocaleString()} SKUs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">Cost:</span>
                    <span className="font-semibold text-green-700">
                      Rs. {stats.delivered.cost.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Sale Value:</span>
                    <span className="font-semibold text-green-700">
                      Rs. {stats.delivered.sale_value.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Profit:</span>
                    <span className="font-semibold text-green-700">
                      Rs. {stats.delivered.profit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
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
    </div>
  );
};

export default InventoryOverview;
