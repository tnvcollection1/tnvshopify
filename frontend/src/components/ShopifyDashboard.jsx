import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  RefreshCw,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  ExternalLink,
  Eye,
  ChevronRight,
  Store,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '../contexts/StoreContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = 'blue', onClick }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50',
    yellow: 'text-yellow-600 bg-yellow-50'
  };

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-5 text-left hover:shadow-md hover:border-gray-300 transition-all w-full"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </button>
  );
};

// Recent Order Row
const OrderRow = ({ order, onView }) => {
  const getStatusBadge = (status, type) => {
    const configs = {
      fulfillment: {
        fulfilled: { label: 'Fulfilled', class: 'bg-green-100 text-green-700' },
        unfulfilled: { label: 'Unfulfilled', class: 'bg-yellow-100 text-yellow-700' },
        cancelled: { label: 'Cancelled', class: 'bg-red-100 text-red-700' },
        restocked: { label: 'Cancelled', class: 'bg-red-100 text-red-700' }
      },
      payment: {
        paid: { label: 'Paid', class: 'bg-green-100 text-green-700' },
        pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-700' },
        refunded: { label: 'Refunded', class: 'bg-red-100 text-red-700' }
      }
    };
    
    const config = configs[type]?.[status] || { label: status || 'Unknown', class: 'bg-gray-100 text-gray-700' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.class}`}>{config.label}</span>;
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-blue-600 hover:text-blue-800">
          #{order.order_number || order.name || 'N/A'}
        </span>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900">
          {order.first_name} {order.last_name}
        </p>
        {order.email && <p className="text-xs text-gray-500 truncate max-w-[150px]">{order.email}</p>}
      </td>
      <td className="px-4 py-3 text-center">
        {getStatusBadge(order.fulfillment_status, 'fulfillment')}
      </td>
      <td className="px-4 py-3 text-center">
        {getStatusBadge(order.financial_status || order.payment_status, 'payment')}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-medium text-gray-900">
          ₹{(order.total_price || order.total_spent || 0).toLocaleString()}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onView(order)}>
          <Eye className="w-4 h-4 text-gray-500" />
        </Button>
      </td>
    </tr>
  );
};

// Quick Action Card
const QuickAction = ({ title, description, icon: Icon, to, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-500 hover:bg-blue-600',
    green: 'bg-green-500 hover:bg-green-600',
    orange: 'bg-orange-500 hover:bg-orange-600',
    purple: 'bg-purple-500 hover:bg-purple-600'
  };

  return (
    <Link
      to={to}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]} text-white`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700">{title}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
      </div>
    </Link>
  );
};

// Main Dashboard Component
const ShopifyDashboard = () => {
  const { selectedStore, stores } = useStore();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    fulfilled: 0,
    unfulfilled: 0,
    cancelled: 0,
    paid: 0,
    pending: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [storefrontStats, setStorefrontStats] = useState({ total: 0, pending: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const params = {};
      if (selectedStore && selectedStore !== 'all') {
        params.store_name = selectedStore;
      }
      const response = await axios.get(`${API}/api/customers/stats`, { params });
      const data = response.data;
      setStats({
        totalOrders: data.total || 0,
        fulfilled: data.fulfilled || 0,
        unfulfilled: data.unfulfilled || 0,
        cancelled: data.cancelled || 0,
        paid: data.paymentReceived || 0,
        pending: data.paymentPending || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [selectedStore]);

  const fetchRecentOrders = useCallback(async () => {
    try {
      const params = { limit: 10 };
      if (selectedStore && selectedStore !== 'all') {
        params.store_name = selectedStore;
      }
      const response = await axios.get(`${API}/api/customers`, { params });
      const orders = response.data?.customers || response.data || [];
      setRecentOrders(Array.isArray(orders) ? orders.slice(0, 10) : []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }, [selectedStore]);

  const fetchStorefrontStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/api/storefront/orders?limit=1`);
      if (response.data.success) {
        setStorefrontStats({
          total: response.data.total || 0,
          pending: response.data.orders?.filter(o => o.status === 'pending').length || 0
        });
      }
    } catch (error) {
      console.error('Error fetching storefront stats:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchRecentOrders(), fetchStorefrontStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchStats, fetchRecentOrders, fetchStorefrontStats]);

  const handleSync = async () => {
    if (!selectedStore || selectedStore === 'all') {
      toast.error('Please select a specific store to sync');
      return;
    }
    setSyncing(true);
    try {
      await axios.post(`${API}/api/shopify/sync/${selectedStore}`);
      toast.success('Sync started successfully');
      setTimeout(() => {
        fetchStats();
        fetchRecentOrders();
      }, 3000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f1f1] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-[#008060] rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">
                {selectedStore && selectedStore !== 'all' 
                  ? `Overview for ${selectedStore}` 
                  : 'Overview across all stores'}
              </p>
            </div>
            <Button 
              onClick={handleSync} 
              disabled={syncing || !selectedStore || selectedStore === 'all'}
              className="bg-[#008060] hover:bg-[#006e52] text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Orders'}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard 
            title="Total Orders" 
            value={stats.totalOrders.toLocaleString()} 
            icon={ShoppingCart} 
            color="blue"
          />
          <StatCard 
            title="Fulfilled" 
            value={stats.fulfilled.toLocaleString()} 
            icon={CheckCircle} 
            color="green"
          />
          <StatCard 
            title="Unfulfilled" 
            value={stats.unfulfilled.toLocaleString()} 
            icon={Clock} 
            color="orange"
          />
          <StatCard 
            title="Cancelled" 
            value={stats.cancelled.toLocaleString()} 
            icon={AlertCircle} 
            color="red"
          />
          <StatCard 
            title="Payment Pending" 
            value={stats.pending.toLocaleString()} 
            icon={DollarSign} 
            color="yellow"
          />
          <StatCard 
            title="Paid" 
            value={stats.paid.toLocaleString()} 
            icon={CheckCircle} 
            color="green"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Recent Shopify Orders</h2>
              <Link to="/orders" className="text-sm text-[#008060] hover:text-[#006e52] flex items-center gap-1">
                View all <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Fulfillment</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        <Package className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                        <p>No orders found</p>
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order, idx) => (
                      <OrderRow 
                        key={order.customer_id || idx} 
                        order={order} 
                        onView={() => {}}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar - Quick Actions & Stats */}
          <div className="space-y-6">
            {/* Storefront Stats Card */}
            <div className="bg-gradient-to-br from-[#008060] to-[#004c3f] rounded-lg p-5 text-white">
              <div className="flex items-center gap-3 mb-4">
                <Store className="w-6 h-6" />
                <h3 className="font-semibold">Storefront</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-3xl font-bold">{storefrontStats.total}</p>
                  <p className="text-sm text-white/80">Total Orders</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{storefrontStats.pending}</p>
                  <p className="text-sm text-white/80">Pending</p>
                </div>
              </div>
              <Link 
                to="/storefront-orders" 
                className="mt-4 inline-flex items-center gap-1 text-sm text-white/90 hover:text-white"
              >
                Manage storefront orders <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <QuickAction 
                  title="Bulk Order 1688"
                  description="Place orders on 1688"
                  icon={ShoppingCart}
                  to="/bulk-order-1688"
                  color="orange"
                />
                <QuickAction 
                  title="Sync Fulfillment"
                  description="Update order statuses"
                  icon={Truck}
                  to="/fulfillment"
                  color="blue"
                />
                <QuickAction 
                  title="Products Catalog"
                  description="Manage & link products"
                  icon={Package}
                  to="/products"
                  color="purple"
                />
                <QuickAction 
                  title="DWZ56 Tracking"
                  description="Track shipments"
                  icon={Activity}
                  to="/dwz56-purchase"
                  color="green"
                />
              </div>
            </div>

            {/* Store Health */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Store Health</h3>
              <div className="space-y-4">
                {stores.slice(0, 3).map(store => (
                  <div key={store.store_name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm font-medium">{store.store_name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Connected</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopifyDashboard;
