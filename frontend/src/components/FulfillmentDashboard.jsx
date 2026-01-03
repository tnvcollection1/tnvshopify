import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Package,
  ShoppingCart,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Play,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Loader2,
  XCircle,
  Zap,
  Box,
  Send,
  MapPin,
  Link2,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Status configurations
const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: Loader2 },
  purchased: { label: '1688 Purchased', color: 'bg-orange-100 text-orange-700', icon: ShoppingCart },
  shipped_from_supplier: { label: 'Shipped from Supplier', color: 'bg-purple-100 text-purple-700', icon: Truck },
  sent_to_dwz56: { label: 'At DWZ56', color: 'bg-indigo-100 text-indigo-700', icon: Box },
  fulfilled: { label: 'Fulfilled', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  error: { label: 'Error', color: 'bg-red-100 text-red-700', icon: XCircle },
};

// Pipeline Stage Component
const PipelineStage = ({ label, icon: Icon, active, completed, error }) => {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
        error ? 'bg-red-100 text-red-600' :
        completed ? 'bg-green-500 text-white' :
        active ? 'bg-blue-500 text-white animate-pulse' :
        'bg-gray-100 text-gray-400'
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className={`text-xs mt-1 text-center ${
        completed ? 'text-green-600 font-medium' :
        active ? 'text-blue-600 font-medium' :
        'text-gray-500'
      }`}>
        {label}
      </span>
    </div>
  );
};

// Pipeline Connector
const PipelineConnector = ({ completed, active }) => (
  <div className="flex-1 h-0.5 mx-1 mt-5">
    <div className={`h-full transition-all ${
      completed ? 'bg-green-500' :
      active ? 'bg-blue-500' :
      'bg-gray-200'
    }`} />
  </div>
);

// Order Card Component
const OrderCard = ({ order, onRefresh, onAutoPurchase, onSendToDWZ56 }) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const stages = order.stages || {};
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  
  const handleSyncTracking = async () => {
    setLoading(true);
    try {
      await fetch(`${API}/api/fulfillment/sync-1688-tracking/${order.shopify_order_id}`, {
        method: 'POST',
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to sync tracking:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <div>
              <h3 className="font-semibold text-sm">
                Order #{order.order_number || order.shopify_order_id?.slice(-8)}
              </h3>
              <p className="text-xs text-gray-500">
                {order.customer?.name || 'Unknown Customer'}
              </p>
            </div>
          </div>
          <Badge className={statusConfig.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>
        
        {/* Pipeline Visualization */}
        <div className="flex items-start justify-between px-2 mb-4">
          <PipelineStage 
            label="Shopify" 
            icon={ShoppingCart} 
            completed={stages.shopify_received}
            active={!stages.shopify_received}
          />
          <PipelineConnector completed={stages.alibaba_purchased} active={stages.shopify_received && !stages.alibaba_purchased} />
          <PipelineStage 
            label="1688" 
            icon={Package} 
            completed={stages.alibaba_shipped}
            active={stages.alibaba_purchased && !stages.alibaba_shipped}
          />
          <PipelineConnector completed={stages.dwz56_received} active={stages.alibaba_shipped && !stages.dwz56_received} />
          <PipelineStage 
            label="DWZ56" 
            icon={Box} 
            completed={stages.dwz56_shipped}
            active={stages.dwz56_received && !stages.dwz56_shipped}
          />
          <PipelineConnector completed={stages.delivered} active={stages.dwz56_shipped && !stages.delivered} />
          <PipelineStage 
            label="Delivered" 
            icon={CheckCircle} 
            completed={stages.delivered}
            error={order.status === 'error'}
          />
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {!stages.alibaba_purchased && stages.products_matched && (
            <Button 
              size="sm" 
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => onAutoPurchase(order.customer_id || order.shopify_order_id)}
            >
              <Zap className="w-3 h-3 mr-1" />
              Auto-Purchase
            </Button>
          )}
          {stages.alibaba_purchased && !stages.alibaba_shipped && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleSyncTracking}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Sync Tracking
            </Button>
          )}
          {stages.alibaba_shipped && !stages.dwz56_received && (
            <Button 
              size="sm" 
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
              onClick={() => onSendToDWZ56(order.shopify_order_id)}
            >
              <Send className="w-3 h-3 mr-1" />
              Send to DWZ56
            </Button>
          )}
        </div>
        
        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {/* 1688 Order Info */}
            {order.alibaba_order_id && (
              <div className="bg-orange-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  1688 Order
                </h4>
                <p className="text-sm text-orange-700">
                  Order ID: {order.alibaba_order_id}
                </p>
                {order.alibaba_tracking && (
                  <p className="text-sm text-orange-700">
                    Tracking: {order.alibaba_tracking}
                  </p>
                )}
              </div>
            )}
            
            {/* Matched Products */}
            {order.matched_products && order.matched_products.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-800 mb-2">
                  Matched Products ({order.matched_products.length})
                </h4>
                {order.matched_products.map((match, idx) => (
                  <div key={idx} className="text-xs text-gray-600 flex items-center gap-2">
                    <span>•</span>
                    <span>{match.shopify_item?.name || 'Product'}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-orange-600">1688: {match.product_id}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Unmatched Products */}
            {order.unmatched_products && order.unmatched_products.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Unmatched Products ({order.unmatched_products.length})
                </h4>
                {order.unmatched_products.map((item, idx) => (
                  <p key={idx} className="text-xs text-red-600">
                    • {item.name || 'Unknown product'}
                  </p>
                ))}
              </div>
            )}
            
            {/* Error */}
            {order.error && (
              <div className="bg-red-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-red-800 mb-1 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Error
                </h4>
                <p className="text-sm text-red-700">{order.error}</p>
              </div>
            )}
            
            {/* Shipping Address */}
            {order.shipping_address && (
              <div className="bg-blue-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-800 mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Ship To
                </h4>
                <p className="text-sm text-blue-700">
                  {order.shipping_address.address}, {order.shipping_address.city}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Pending Order Card (for orders not yet in pipeline)
const PendingOrderCard = ({ order, onProcess }) => {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow border-dashed">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">
              Order #{order.order_number || 'N/A'}
            </h3>
            <p className="text-xs text-gray-500">
              {order.first_name} {order.last_name}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {order.line_items?.length || 0} items • ₹{order.total_spent?.toFixed(2) || '0.00'}
            </p>
          </div>
          <Button 
            size="sm"
            variant="outline"
            onClick={() => onProcess(order.customer_id)}
            className="border-green-500 text-green-600 hover:bg-green-50"
          >
            <Play className="w-3 h-3 mr-1" />
            Process
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Component
const FulfillmentDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pipelineOrders, setPipelineOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, [statusFilter]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const statsRes = await fetch(`${API}/api/fulfillment/stats`);
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }
      
      // Fetch pipeline orders
      const pipelineParams = new URLSearchParams({ page: '1', page_size: '50' });
      if (statusFilter !== 'all') {
        pipelineParams.append('status', statusFilter);
      }
      const pipelineRes = await fetch(`${API}/api/fulfillment/pipeline?${pipelineParams}`);
      const pipelineData = await pipelineRes.json();
      if (pipelineData.success) {
        setPipelineOrders(pipelineData.orders || []);
      }
      
      // Fetch pending orders (not in pipeline)
      const pendingRes = await fetch(`${API}/api/fulfillment/pending-purchase?page_size=20`);
      const pendingData = await pendingRes.json();
      if (pendingData.success) {
        setPendingOrders(pendingData.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAutoPurchase = async (customerId) => {
    try {
      const res = await fetch(`${API}/api/fulfillment/auto-purchase/${customerId}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.message || 'Failed to process auto-purchase');
      }
    } catch (error) {
      console.error('Auto-purchase failed:', error);
    }
  };
  
  const handleProcessOrder = async (customerId) => {
    try {
      const res = await fetch(`${API}/api/fulfillment/process-new-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, auto_purchase: false }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error('Process order failed:', error);
    }
  };
  
  const handleSendToDWZ56 = async (shopifyOrderId) => {
    try {
      const res = await fetch(`${API}/api/fulfillment/send-to-dwz56/${shopifyOrderId}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Failed to send to DWZ56');
      }
    } catch (error) {
      console.error('Send to DWZ56 failed:', error);
    }
  };
  
  const handleSyncAllTracking = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/api/fulfillment/sync-all-tracking`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        alert(`Updated ${data.results?.updated || 0} orders with tracking`);
        fetchData();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };
  
  const filteredOrders = pipelineOrders.filter(order => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.order_number?.toLowerCase().includes(query) ||
      order.customer?.name?.toLowerCase().includes(query) ||
      order.alibaba_order_id?.toLowerCase().includes(query)
    );
  });
  
  return (
    <div className="p-6 space-y-6" data-testid="fulfillment-dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-indigo-500" />
            Fulfillment Pipeline
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Automate order fulfillment: Shopify → 1688 → DWZ56 → Delivery
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleSyncAllTracking}
            disabled={syncing}
            data-testid="sync-tracking-btn"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync All Tracking
          </Button>
          <Button 
            onClick={fetchData}
            className="bg-indigo-500 hover:bg-indigo-600"
            data-testid="refresh-btn"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="bg-gray-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total_orders || 0}</p>
              <p className="text-xs text-gray-500">Total</p>
            </CardContent>
          </Card>
          {Object.entries(stats.by_status || {}).map(([status, count]) => {
            const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
            const Icon = config.icon;
            return (
              <Card 
                key={status} 
                className={`cursor-pointer transition-all ${statusFilter === status ? 'ring-2 ring-indigo-500' : ''}`}
                onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              >
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Icon className="h-4 w-4 text-gray-500" />
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <p className="text-xs text-gray-500 capitalize">{status.replace(/_/g, ' ')}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-input"
          />
        </div>
        {statusFilter !== 'all' && (
          <Badge className="bg-indigo-100 text-indigo-700">
            Filtered: {statusFilter.replace(/_/g, ' ')}
            <button 
              onClick={() => setStatusFilter('all')}
              className="ml-2 hover:text-indigo-900"
            >
              ×
            </button>
          </Badge>
        )}
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pipeline Orders */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">
                Pipeline Orders ({filteredOrders.length})
              </h2>
            </div>
            
            {filteredOrders.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Box className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No orders in pipeline</h3>
                  <p className="text-gray-500 mt-1">
                    Process pending orders to start the fulfillment pipeline
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <OrderCard 
                    key={order.shopify_order_id} 
                    order={order}
                    onRefresh={fetchData}
                    onAutoPurchase={handleAutoPurchase}
                    onSendToDWZ56={handleSendToDWZ56}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Pending Orders Sidebar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">
                Pending Orders ({pendingOrders.length})
              </h2>
              <Badge variant="outline" className="text-xs">
                Ready to Process
              </Badge>
            </div>
            
            {pendingOrders.length === 0 ? (
              <Card className="py-8">
                <CardContent className="text-center">
                  <CheckCircle className="h-10 w-10 mx-auto text-green-300 mb-3" />
                  <p className="text-gray-500 text-sm">All orders processed!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {pendingOrders.slice(0, 15).map((order) => (
                  <PendingOrderCard 
                    key={order.customer_id} 
                    order={order}
                    onProcess={handleProcessOrder}
                  />
                ))}
                {pendingOrders.length > 15 && (
                  <p className="text-center text-sm text-gray-500 py-2">
                    +{pendingOrders.length - 15} more orders
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Pipeline Legend */}
      <Card className="bg-gray-50">
        <CardContent className="py-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Pipeline Flow</h3>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <span>Shopify Order</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <span>1688 Purchase</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                <Box className="w-4 h-4 text-white" />
              </div>
              <span>DWZ56 Shipping</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <span>Delivered</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FulfillmentDashboard;
