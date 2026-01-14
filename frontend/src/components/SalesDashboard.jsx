import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package,
  ArrowUpRight, ArrowDownRight, Calendar, RefreshCw, Download,
  BarChart3, PieChart as PieChartIcon, Activity, Clock, MapPin, Store
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Store configurations
const STORE_CONFIGS = {
  'tnvcollection': { currency: 'INR', symbol: '₹', name: 'TNV Collection (IN)' },
  'tnvcollectionpk': { currency: 'PKR', symbol: 'Rs.', name: 'TNV Collection (PK)' }
};

const SalesDashboard = () => {
  const [store, setStore] = useState('tnvcollection');
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Get current store config
  const storeConfig = STORE_CONFIGS[store] || STORE_CONFIGS['tnvcollection'];
  
  // Data states
  const [overview, setOverview] = useState(null);
  const [revenueChart, setRevenueChart] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [ordersByStatus, setOrdersByStatus] = useState([]);
  const [customerStats, setCustomerStats] = useState(null);
  const [salesByCategory, setSalesByCategory] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    fetchAllData();
  }, [period, store]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [overviewRes, chartRes, productsRes, statusRes, customersRes, categoryRes, ordersRes] = await Promise.all([
        fetch(`${API}/api/analytics/overview?period=${period}&store=${store}`),
        fetch(`${API}/api/analytics/revenue-chart?period=${period}&store=${store}`),
        fetch(`${API}/api/analytics/top-products?limit=8&store=${store}`),
        fetch(`${API}/api/analytics/orders-by-status?store=${store}`),
        fetch(`${API}/api/analytics/customer-stats?store=${store}`),
        fetch(`${API}/api/analytics/sales-by-category?store=${store}`),
        fetch(`${API}/api/analytics/recent-orders?limit=8&store=${store}`)
      ]);

      const [overviewData, chartData, productsData, statusData, customersData, categoryData, ordersData] = await Promise.all([
        overviewRes.json(),
        chartRes.json(),
        productsRes.json(),
        statusRes.json(),
        customersRes.json(),
        categoryRes.json(),
        ordersRes.json()
      ]);

      setOverview(overviewData);
      setRevenueChart(chartData.data || []);
      setTopProducts(productsData.products || []);
      setOrdersByStatus(statusData.statuses || []);
      setCustomerStats(customersData);
      setSalesByCategory(categoryData.categories || []);
      setRecentOrders(ordersData.orders || []);
    } catch (e) {
      console.error('Failed to fetch analytics:', e);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const formatCurrency = (value) => {
    // Use the currency symbol from the API response if available, else fallback to store config
    const symbol = overview?.currency_symbol || storeConfig.symbol;
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Formatted currency with symbol
  const formatWithSymbol = (value) => {
    const symbol = overview?.currency_symbol || storeConfig.symbol;
    return `${symbol} ${formatCurrency(value)}`;
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-AE').format(value);
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
          <p className="text-gray-500">Track your store performance and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Store Selector */}
          <div className="flex bg-white rounded-lg border p-1">
            <select
              value={store}
              onChange={(e) => setStore(e.target.value)}
              className="px-3 py-2 text-sm font-medium bg-transparent border-none outline-none cursor-pointer"
              data-testid="store-selector"
            >
              <option value="tnvcollection">🇮🇳 TNV Collection (INR)</option>
              <option value="tnvcollectionpk">🇵🇰 TNV Collection (PKR)</option>
            </select>
          </div>
          {/* Period Selector */}
          <div className="flex bg-white rounded-lg border p-1">
            {['7d', '30d', '90d', '1y'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  period === p 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : '1 Year'}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Revenue Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <span className={`flex items-center gap-1 text-sm font-medium ${overview?.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {overview?.revenue_growth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(overview?.revenue_growth || 0)}%
            </span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{formatWithSymbol(overview?.total_revenue || 0)}</h3>
          <p className="text-gray-500 text-sm mt-1">Total Revenue</p>
        </div>

        {/* Orders Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
            <span className={`flex items-center gap-1 text-sm font-medium ${overview?.orders_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {overview?.orders_growth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(overview?.orders_growth || 0)}%
            </span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{formatNumber(overview?.total_orders || 0)}</h3>
          <p className="text-gray-500 text-sm mt-1">Total Orders</p>
        </div>

        {/* Customers Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <span className="flex items-center gap-1 text-sm font-medium text-green-600">
              <ArrowUpRight className="w-4 h-4" />
              8.2%
            </span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{formatNumber(overview?.total_customers || 0)}</h3>
          <p className="text-gray-500 text-sm mt-1">Total Customers</p>
        </div>

        {/* Avg Order Value Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
            <span className="flex items-center gap-1 text-sm font-medium text-green-600">
              <ArrowUpRight className="w-4 h-4" />
              {overview?.conversion_rate || 3.2}%
            </span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{formatWithSymbol(overview?.avg_order_value || 0)}</h3>
          <p className="text-gray-500 text-sm mt-1">Avg. Order Value</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Revenue Overview</h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                Revenue
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Orders
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueChart}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                formatter={(value, name) => [name === 'revenue' ? formatWithSymbol(value) : value, name === 'revenue' ? 'Revenue' : 'Orders']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRevenue)" />
              <Line type="monotone" dataKey="orders" stroke="#10B981" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sales by Category */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-6">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={salesByCategory}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="percentage"
              >
                {salesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {salesByCategory.map((cat, index) => (
              <div key={cat.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || COLORS[index] }}></span>
                  <span className="text-gray-600">{cat.name}</span>
                </div>
                <span className="font-medium">{formatWithSymbol(cat.sales)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Top Selling Products</h3>
          <div className="space-y-4">
            {topProducts.slice(0, 5).map((product, index) => (
              <div key={product.id} className="flex items-center gap-4">
                <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-sm font-medium text-gray-600">
                  {index + 1}
                </span>
                <img src={product.image} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                  <p className="text-sm text-gray-500">{product.sales} sold</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(product.revenue)}</p>
                  <p className={`text-sm flex items-center justify-end gap-1 ${product.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {product.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(product.growth)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Orders by Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ordersByStatus} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 12, textTransform: 'capitalize' }} stroke="#9CA3AF" width={80} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {ordersByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 flex flex-wrap gap-3">
            {ordersByStatus.map(status => (
              <div key={status.status} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }}></span>
                <span className="capitalize text-gray-600">{status.status}</span>
                <span className="font-medium">({status.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Orders</h3>
            <a href="/orders" className="text-blue-500 text-sm hover:underline">View All</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">Order ID</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Items</th>
                  <th className="pb-3 font-medium">Total</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{order.id}</td>
                    <td className="py-3 text-gray-600">{order.customer}</td>
                    <td className="py-3 text-gray-600">{order.items}</td>
                    <td className="py-3 font-medium">{formatCurrency(order.total)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Locations */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Top Customer Locations</h3>
          <div className="space-y-4">
            {customerStats?.top_locations?.map((location, index) => (
              <div key={location.city}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{location.city}</span>
                  </div>
                  <span className="text-gray-500">{location.customers} customers</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${location.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{customerStats?.returning_rate}%</p>
                <p className="text-sm text-gray-500">Returning Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(customerStats?.avg_lifetime_value || 0)}</p>
                <p className="text-sm text-gray-500">Avg. LTV</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
