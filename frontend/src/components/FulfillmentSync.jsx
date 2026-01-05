import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Checkbox,
} from './ui/checkbox';
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

const FulfillmentSync = () => {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [fulfillmentMethod, setFulfillmentMethod] = useState('dwz');

  useEffect(() => {
    fetchStores();
    fetchSummary();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      fetchPendingOrders();
    }
  }, [selectedStore]);

  const fetchStores = async () => {
    try {
      const res = await fetch(`${API}/api/stores`);
      const data = await res.json();
      if (data.success && data.stores) {
        setStores(data.stores);
        if (data.stores.length === 1) {
          setSelectedStore(data.stores[0].store_name);
        }
      }
    } catch (e) {
      console.error('Error fetching stores:', e);
    }
  };

  const fetchSummary = async () => {
    try {
      const url = selectedStore 
        ? `${API}/api/fulfillment/sync-status-summary?store_name=${selectedStore}`
        : `${API}/api/fulfillment/sync-status-summary`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
      }
    } catch (e) {
      console.error('Error fetching summary:', e);
    }
  };

  const fetchPendingOrders = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedStore
        ? `${API}/api/fulfillment/pending-sync?store_name=${selectedStore}&page_size=50`
        : `${API}/api/fulfillment/pending-sync?page_size=50`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (e) {
      console.error('Error fetching pending orders:', e);
      toast.error('Failed to fetch pending orders');
    } finally {
      setLoading(false);
    }
  }, [selectedStore]);

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const selectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o.shopify_order_id));
    }
  };

  const syncSingleOrder = async (orderId, method) => {
    try {
      const endpoint = method === 'dwz' 
        ? `${API}/api/fulfillment/fulfill-via-dwz/${orderId}`
        : `${API}/api/fulfillment/fulfill-via-warehouse/${orderId}`;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notify_customer: true }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Order ${orderId} synced to Shopify!`);
        // Refresh the list
        fetchPendingOrders();
        fetchSummary();
        return true;
      } else {
        toast.error(data.detail || data.error || 'Sync failed');
        return false;
      }
    } catch (e) {
      toast.error('Error syncing order: ' + e.message);
      return false;
    }
  };

  const syncSelectedOrders = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders to sync');
      return;
    }

    setSyncing(true);
    
    try {
      const res = await fetch(`${API}/api/fulfillment/bulk-sync-to-shopify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_ids: selectedOrders,
          fulfillment_method: fulfillmentMethod,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Synced ${data.synced}/${data.total} orders to Shopify`);
        if (data.failed > 0) {
          toast.warning(`${data.failed} orders failed to sync`);
        }
        setSelectedOrders([]);
        fetchPendingOrders();
        fetchSummary();
      } else {
        toast.error(data.detail || 'Bulk sync failed');
      }
    } catch (e) {
      toast.error('Error during bulk sync: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (order) => {
    if (order.ready_for_dwz_fulfillment) {
      return <Badge className="bg-green-100 text-green-700">DWZ Ready</Badge>;
    }
    if (order.ready_for_warehouse_fulfillment) {
      return <Badge className="bg-blue-100 text-blue-700">Warehouse Ready</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.total_orders}</p>
                  <p className="text-xs text-gray-500">Total in Pipeline</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.ready_for_sync.total}</p>
                  <p className="text-xs text-gray-500">Ready to Sync</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Truck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.ready_for_sync.dwz}</p>
                  <p className="text-xs text-gray-500">DWZ Ready</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.already_synced}</p>
                  <p className="text-xs text-gray-500">Already Synced</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Sync Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-500" />
            Sync Fulfillment to Shopify
          </CardTitle>
          <CardDescription>
            Sync 1688 fulfillment status back to Shopify. Choose to fulfill via DWZ (international shipping) 
            or after arrival at your warehouse (local shipping).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Store</label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger data-testid="store-selector">
                  <SelectValue placeholder="All stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All stores</SelectItem>
                  {stores.map(store => (
                    <SelectItem key={store.store_name} value={store.store_name}>
                      {store.store_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Fulfillment Method</label>
              <Select value={fulfillmentMethod} onValueChange={setFulfillmentMethod}>
                <SelectTrigger data-testid="method-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dwz">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      DWZ56 Shipping
                    </div>
                  </SelectItem>
                  <SelectItem value="warehouse">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Warehouse Arrival
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => { fetchPendingOrders(); fetchSummary(); }}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Fulfillment Method Info */}
          <div className={`p-4 rounded-lg border ${fulfillmentMethod === 'dwz' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
            {fulfillmentMethod === 'dwz' ? (
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">DWZ56 Fulfillment</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Use this when DWZ56 is shipping directly to your customer. 
                    Tracking number will be fetched from DWZ56 and synced to Shopify.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">Warehouse Fulfillment</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Use this when the product has arrived at your warehouse and you&apos;re handling local shipping.
                    1688 tracking will be used or you can add local courier tracking later.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Orders Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-medium text-gray-700">All caught up!</h3>
              <p className="text-sm text-gray-500 mt-1">No orders pending Shopify sync</p>
            </div>
          ) : (
            <>
              {/* Bulk Actions */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedOrders.length === orders.length && orders.length > 0}
                    onCheckedChange={selectAll}
                    data-testid="select-all"
                  />
                  <span className="text-sm text-gray-600">
                    {selectedOrders.length > 0 
                      ? `${selectedOrders.length} orders selected`
                      : 'Select all'}
                  </span>
                </div>
                
                <Button
                  onClick={syncSelectedOrders}
                  disabled={selectedOrders.length === 0 || syncing}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="bulk-sync-btn"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Sync {selectedOrders.length || ''} to Shopify
                    </>
                  )}
                </Button>
              </div>

              {/* Orders List */}
              <div className="border rounded-lg divide-y">
                {orders.map((order) => (
                  <div 
                    key={order.shopify_order_id}
                    className="p-4 hover:bg-gray-50 flex items-center gap-4"
                  >
                    <Checkbox
                      checked={selectedOrders.includes(order.shopify_order_id)}
                      onCheckedChange={() => toggleOrderSelection(order.shopify_order_id)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{order.order_number || order.shopify_order_id}</span>
                        {getStatusBadge(order)}
                        <Badge variant="outline" className="text-xs">
                          {order.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {order.customer_name || 'Customer'} • {order.store_name}
                      </div>
                      {order.alibaba_order_id && (
                        <div className="text-xs text-orange-600 mt-1">
                          1688 Order: {order.alibaba_order_id}
                        </div>
                      )}
                      {(order.dwz56_tracking || order.alibaba_tracking) && (
                        <div className="text-xs text-green-600 mt-1">
                          Tracking: {order.dwz56_tracking || order.alibaba_tracking}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncSingleOrder(order.shopify_order_id, 'dwz')}
                        disabled={!order.ready_for_dwz_fulfillment}
                        className="text-green-600"
                      >
                        <Truck className="w-4 h-4 mr-1" />
                        DWZ
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncSingleOrder(order.shopify_order_id, 'warehouse')}
                        className="text-blue-600"
                      >
                        <Building2 className="w-4 h-4 mr-1" />
                        Warehouse
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-sm mb-2">💡 Fulfillment Flow</h4>
          <div className="text-xs text-gray-600 space-y-2">
            <div className="flex items-start gap-2">
              <ChevronRight className="w-3 h-3 mt-0.5" />
              <span><strong>DWZ Flow:</strong> 1688 Order → DWZ56 Picks Up → Ships to Customer → Sync to Shopify</span>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-3 h-3 mt-0.5" />
              <span><strong>Warehouse Flow:</strong> 1688 Order → Ships to Warehouse → You Ship Locally → Sync to Shopify</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FulfillmentSync;
