import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Truck,
  Package,
  Building2,
  Send,
  ChevronRight,
  ExternalLink,
  Clock,
  ShoppingBag,
  Warehouse,
  MapPin,
  User,
  Search,
  Filter,
  ArrowRight,
  Circle,
  Check,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Fulfillment stages in order
const FULFILLMENT_STAGES = [
  { key: 'shopify_order', label: 'Shopify Order', icon: ShoppingBag, color: 'blue' },
  { key: '1688_ordered', label: '1688 Ordered', icon: Package, color: 'orange' },
  { key: 'dwz56_shipped', label: 'DWZ56 Shipped', icon: Truck, color: 'purple' },
  { key: 'in_transit', label: 'In Transit', icon: MapPin, color: 'yellow' },
  { key: 'warehouse_arrived', label: 'Warehouse Arrived', icon: Warehouse, color: 'indigo' },
  { key: 'warehouse_received', label: 'Received', icon: Check, color: 'teal' },
  { key: 'local_shipped', label: 'Shipped to Customer', icon: Send, color: 'green' },
];

// Carrier mapping by store
const STORE_CARRIERS = {
  'tnvcollectionpk': { carrier: 'TCS', country: 'Pakistan' },
  'tnvcollection': { carrier: 'DTDC', country: 'India' },
};

const FulfillmentPipeline = () => {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [stats, setStats] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      fetchOrders();
    }
  }, [selectedStore]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, stageFilter]);

  const fetchStores = async () => {
    try {
      const res = await fetch(`${API}/api/stores`);
      const data = await res.json();
      if (data.success && data.stores) {
        setStores(data.stores);
        if (data.stores.length > 0) {
          setSelectedStore(data.stores[0].store_name);
        }
      }
    } catch (e) {
      console.error('Error fetching stores:', e);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/fulfillment/pipeline?store_name=${selectedStore}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        setStats(data.stats || {});
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.order_number?.toString().includes(query) ||
        o.shopify_order_id?.toString().includes(query) ||
        o.alibaba_order_id?.includes(query) ||
        o.dwz_tracking?.toLowerCase().includes(query) ||
        o.local_tracking?.toLowerCase().includes(query) ||
        o.customer_name?.toLowerCase().includes(query)
      );
    }
    
    if (stageFilter && stageFilter !== 'all') {
      filtered = filtered.filter(o => o.current_stage === stageFilter);
    }
    
    setFilteredOrders(filtered);
  };

  const updateOrderStage = async (orderId, newStage, additionalData = {}) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`${API}/api/fulfillment/pipeline/${orderId}/update-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: newStage,
          store_name: selectedStore,
          ...additionalData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Order updated to ${newStage.replace(/_/g, ' ')}`);
        fetchOrders();
      } else {
        toast.error(data.message || 'Failed to update order');
      }
    } catch (e) {
      toast.error('Failed to update order stage');
    } finally {
      setUpdating(null);
    }
  };

  const getStageIndex = (stage) => {
    return FULFILLMENT_STAGES.findIndex(s => s.key === stage);
  };

  const getStageColor = (stage) => {
    const stageInfo = FULFILLMENT_STAGES.find(s => s.key === stage);
    return stageInfo?.color || 'gray';
  };

  const getCarrierInfo = () => {
    return STORE_CARRIERS[selectedStore] || { carrier: 'Local Carrier', country: 'Unknown' };
  };

  const StageProgressBar = ({ currentStage }) => {
    const currentIndex = getStageIndex(currentStage);
    
    return (
      <div className="flex items-center gap-1 w-full">
        {FULFILLMENT_STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const StageIcon = stage.icon;
          
          return (
            <React.Fragment key={stage.key}>
              <div 
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs
                  ${isCompleted ? 'bg-green-500 text-white' : 
                    isCurrent ? `bg-${stage.color}-500 text-white` : 
                    'bg-gray-200 text-gray-500'}`}
                title={stage.label}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : <StageIcon className="w-3 h-3" />}
              </div>
              {index < FULFILLMENT_STAGES.length - 1 && (
                <div className={`flex-1 h-1 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const OrderCard = ({ order }) => {
    const currentIndex = getStageIndex(order.current_stage);
    const nextStage = FULFILLMENT_STAGES[currentIndex + 1];
    const carrierInfo = getCarrierInfo();
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-bold text-lg">#{order.order_number || order.shopify_order_id}</p>
              <p className="text-sm text-gray-500">{order.customer_name || 'Customer'}</p>
            </div>
            <Badge className={`bg-${getStageColor(order.current_stage)}-100 text-${getStageColor(order.current_stage)}-700 border-${getStageColor(order.current_stage)}-300`}>
              {order.current_stage?.replace(/_/g, ' ') || 'New'}
            </Badge>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <StageProgressBar currentStage={order.current_stage} />
          </div>
          
          {/* Tracking Info */}
          <div className="grid grid-cols-3 gap-2 text-xs mb-3">
            <div>
              <p className="text-gray-500">1688 Order</p>
              <p className="font-mono truncate" title={order.alibaba_order_id}>
                {order.alibaba_order_id ? order.alibaba_order_id.slice(-8) : '-'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">DWZ56 #</p>
              <p className="font-mono">{order.dwz_tracking || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">{carrierInfo.carrier} #</p>
              <p className="font-mono">{order.local_tracking || '-'}</p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-between items-center pt-2 border-t">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedOrder(order)}
            >
              View Details
            </Button>
            
            {nextStage && (
              <Button
                size="sm"
                onClick={() => updateOrderStage(order._id || order.shopify_order_id, nextStage.key)}
                disabled={updating === (order._id || order.shopify_order_id)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updating === (order._id || order.shopify_order_id) ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-1" />
                )}
                Move to {nextStage.label}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const OrderDetailModal = ({ order, onClose }) => {
    const [trackingNumber, setTrackingNumber] = useState('');
    const [trackingType, setTrackingType] = useState('dwz');
    const carrierInfo = getCarrierInfo();
    
    if (!order) return null;
    
    const handleAddTracking = async () => {
      if (!trackingNumber.trim()) {
        toast.error('Please enter a tracking number');
        return;
      }
      
      const updateData = trackingType === 'dwz' 
        ? { dwz_tracking: trackingNumber }
        : { local_tracking: trackingNumber, local_carrier: carrierInfo.carrier };
      
      await updateOrderStage(order._id || order.shopify_order_id, order.current_stage, updateData);
      setTrackingNumber('');
      onClose();
    };
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold">Order #{order.order_number || order.shopify_order_id}</h2>
              <p className="text-gray-500">{order.customer_name}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>
          
          {/* Full Pipeline Status */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Fulfillment Pipeline</h3>
            <div className="space-y-2">
              {FULFILLMENT_STAGES.map((stage, index) => {
                const currentIndex = getStageIndex(order.current_stage);
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                const StageIcon = stage.icon;
                
                return (
                  <div 
                    key={stage.key}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isCurrent ? 'bg-blue-50 border border-blue-200' :
                      isCompleted ? 'bg-green-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${
                      isCompleted ? 'bg-green-500 text-white' :
                      isCurrent ? 'bg-blue-500 text-white' : 'bg-gray-200'
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : <StageIcon className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isCurrent ? 'text-blue-700' : ''}`}>{stage.label}</p>
                      {stage.key === 'local_shipped' && (
                        <p className="text-xs text-gray-500">via {carrierInfo.carrier} ({carrierInfo.country})</p>
                      )}
                    </div>
                    {order.stage_dates?.[stage.key] && (
                      <p className="text-xs text-gray-500">
                        {new Date(order.stage_dates[stage.key]).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Tracking Numbers */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Tracking Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-orange-600 font-medium">1688 Order ID</p>
                <p className="font-mono text-sm">{order.alibaba_order_id || 'Not placed'}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-600 font-medium">DWZ56 Tracking</p>
                <p className="font-mono text-sm">{order.dwz_tracking || 'Not assigned'}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 font-medium">{carrierInfo.carrier} Tracking</p>
                <p className="font-mono text-sm">{order.local_tracking || 'Not assigned'}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 font-medium">Shopify Fulfillment</p>
                <p className="font-mono text-sm">{order.shopify_fulfillment_id || 'Not fulfilled'}</p>
              </div>
            </div>
          </div>
          
          {/* Add Tracking */}
          <div className="mb-6 p-4 border rounded-lg">
            <h3 className="font-semibold mb-3">Add/Update Tracking</h3>
            <div className="flex gap-2">
              <Select value={trackingType} onValueChange={setTrackingType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dwz">DWZ56</SelectItem>
                  <SelectItem value="local">{carrierInfo.carrier}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddTracking}>
                Add
              </Button>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            {FULFILLMENT_STAGES.map((stage, index) => {
              const currentIndex = getStageIndex(order.current_stage);
              if (index <= currentIndex) return null;
              
              return (
                <Button
                  key={stage.key}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateOrderStage(order._id || order.shopify_order_id, stage.key);
                    onClose();
                  }}
                >
                  Mark as {stage.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6" data-testid="fulfillment-pipeline">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-purple-500" />
            Fulfillment Pipeline
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track orders through: Shopify → 1688 → DWZ56 → Warehouse → {getCarrierInfo().carrier}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map(store => (
                <SelectItem key={store.store_name} value={store.store_name}>
                  {store.store_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {FULFILLMENT_STAGES.map(stage => (
          <Card key={stage.key} className={`bg-${stage.color}-50 border-${stage.color}-200`}>
            <CardContent className="p-3 text-center">
              <stage.icon className={`h-5 w-5 mx-auto mb-1 text-${stage.color}-600`} />
              <p className="text-2xl font-bold">{stats[stage.key] || 0}</p>
              <p className="text-xs text-gray-600 truncate">{stage.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by order #, tracking #, customer..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {FULFILLMENT_STAGES.map(stage => (
                  <SelectItem key={stage.key} value={stage.key}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Orders Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <span className="ml-3">Loading orders...</span>
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(order => (
            <OrderCard key={order._id || order.shopify_order_id} order={order} />
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="text-center">
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Orders Found</h3>
            <p className="text-gray-500">
              {searchQuery || stageFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'No orders in the fulfillment pipeline yet'}
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}
    </div>
  );
};

export default FulfillmentPipeline;
