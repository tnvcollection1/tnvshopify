import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import {
  ShoppingCart,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Package,
  Search,
  RefreshCw,
  Zap,
  ExternalLink,
  Link2,
  X,
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

const BulkOrder1688 = () => {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [linkedProducts, setLinkedProducts] = useState({});
  const [loading, setLoading] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [alibaba1688Accounts, setAlibaba1688Accounts] = useState([]);
  const [selected1688Account, setSelected1688Account] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStores();
    fetch1688Accounts();
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

  const fetch1688Accounts = async () => {
    try {
      const res = await fetch(`${API}/api/1688/accounts`);
      const data = await res.json();
      if (data.success && data.accounts) {
        setAlibaba1688Accounts(data.accounts);
        const defaultAcc = data.accounts.find(a => a.is_default) || data.accounts[0];
        if (defaultAcc) {
          setSelected1688Account(defaultAcc.account_id);
        }
      }
    } catch (e) {
      console.error('Error fetching 1688 accounts:', e);
    }
  };

  const fetchPendingOrders = async () => {
    setLoading(true);
    try {
      // Fetch confirmed orders that haven't been ordered on 1688 yet
      const res = await fetch(
        `${API}/api/customers?store_name=${selectedStore}&limit=100&confirmation_status=confirmed`
      );
      const data = await res.json();
      
      if (data.success && data.customers) {
        // Filter orders that need 1688 ordering
        const pendingOrders = data.customers.filter(o => 
          !o.alibaba_order_id && o.confirmation_status === 'confirmed'
        );
        setOrders(pendingOrders);
        
        // Find linked products for these orders
        if (pendingOrders.length > 0) {
          const orderIds = pendingOrders.map(o => o.shopify_order_id || o.customer_id);
          await findLinkedProducts(orderIds);
        }
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const findLinkedProducts = async (orderIds) => {
    try {
      const res = await fetch(`${API}/api/1688/find-linked-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderIds),
      });
      const data = await res.json();
      
      if (data.success) {
        const linkMap = {};
        data.orders.forEach(o => {
          linkMap[o.shopify_order_id] = o;
        });
        setLinkedProducts(linkMap);
      }
    } catch (e) {
      console.error('Error finding linked products:', e);
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const selectAllLinked = () => {
    const linkedOrderIds = orders
      .filter(o => {
        const link = linkedProducts[o.shopify_order_id || o.customer_id];
        return link && link.linked;
      })
      .map(o => o.shopify_order_id || o.customer_id);
    
    if (selectedOrders.length === linkedOrderIds.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(linkedOrderIds);
    }
  };

  const bulkOrderSelected = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders to place on 1688');
      return;
    }

    // Build items array
    const items = [];
    
    for (const orderId of selectedOrders) {
      const link = linkedProducts[orderId];
      if (!link || !link.products) continue;
      
      for (const product of link.products) {
        if (product.linked && product.product_id_1688) {
          items.push({
            shopify_order_id: orderId,
            product_id_1688: product.product_id_1688,
            quantity: product.quantity || 1,
          });
        }
      }
    }

    if (items.length === 0) {
      toast.error('No linked 1688 products found in selected orders');
      return;
    }

    const confirm = window.confirm(
      `Place ${items.length} orders on 1688 for ${selectedOrders.length} Shopify orders?`
    );
    if (!confirm) return;

    setOrdering(true);

    try {
      const res = await fetch(`${API}/api/1688/bulk-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          account_id: selected1688Account || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`🎉 Ordered ${data.ordered}/${data.total} items on 1688!`);
        if (data.skipped > 0) {
          toast.info(`${data.skipped} items skipped (already ordered)`);
        }
        if (data.failed > 0) {
          toast.warning(`${data.failed} items failed`);
        }
        setSelectedOrders([]);
        fetchPendingOrders();
      } else {
        toast.error(data.error || data.message || 'Bulk order failed');
      }
    } catch (e) {
      toast.error('Error placing bulk order: ' + e.message);
    } finally {
      setOrdering(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (o.order_number && o.order_number.toString().includes(search)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(search)) ||
      (o.name && o.name.toLowerCase().includes(search))
    );
  });

  const linkedCount = orders.filter(o => {
    const link = linkedProducts[o.shopify_order_id || o.customer_id];
    return link && link.linked;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            Bulk Order on 1688
          </CardTitle>
          <CardDescription>
            Select confirmed Shopify orders and place bulk orders on 1688 in one click.
            Orders must have linked 1688 products (via SKU pattern 1688-PRODUCTID).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters Row */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Store</label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger data-testid="store-selector">
                  <SelectValue placeholder="Select store..." />
                </SelectTrigger>
                <SelectContent>
                  {stores.map(store => (
                    <SelectItem key={store.store_name} value={store.store_name}>
                      {store.store_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">1688 Account</label>
              <Select value={selected1688Account} onValueChange={setSelected1688Account}>
                <SelectTrigger data-testid="account-selector">
                  <SelectValue placeholder="Default account" />
                </SelectTrigger>
                <SelectContent>
                  {alibaba1688Accounts.map(acc => (
                    <SelectItem key={acc.account_id} value={acc.account_id}>
                      {acc.account_name || acc.member_id}
                      {acc.is_default && ' (Default)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Order # or customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              variant="outline"
              onClick={fetchPendingOrders}
              disabled={loading || !selectedStore}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{orders.length}</p>
              <p className="text-xs text-gray-500">Confirmed Orders</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{linkedCount}</p>
              <p className="text-xs text-gray-500">With 1688 Links</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{selectedOrders.length}</p>
              <p className="text-xs text-gray-500">Selected</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-orange-600">{orders.length - linkedCount}</p>
              <p className="text-xs text-gray-500">Need Linking</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Banner */}
      {linkedCount > 0 && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Quick Order All Linked</h3>
                <p className="text-sm text-white/80">
                  {linkedCount} orders ready • Place all on 1688 instantly
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={selectAllLinked}
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Select All Linked ({linkedCount})
              </Button>
              <Button
                onClick={bulkOrderSelected}
                disabled={ordering || selectedOrders.length === 0}
                className="bg-white text-orange-600 hover:bg-white/90 font-semibold"
                data-testid="bulk-order-btn"
              >
                {ordering ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ordering...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Order on 1688 ({selectedOrders.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading orders...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-medium text-gray-700">No confirmed orders</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedStore ? 'All orders have been placed on 1688' : 'Select a store to view orders'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredOrders.map((order) => {
                const orderId = order.shopify_order_id || order.customer_id;
                const link = linkedProducts[orderId];
                const isLinked = link && link.linked;
                const isSelected = selectedOrders.includes(orderId);

                return (
                  <div
                    key={orderId}
                    className={`p-4 hover:bg-gray-50 flex items-center gap-4 ${isSelected ? 'bg-orange-50' : ''}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOrderSelection(orderId)}
                      disabled={!isLinked}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{order.order_number}</span>
                        {isLinked ? (
                          <Badge className="bg-green-100 text-green-700">
                            <Link2 className="w-3 h-3 mr-1" />
                            1688 Linked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            No Link
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {order.confirmation_status || 'confirmed'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {order.customer_name || order.name} • {order.store_name}
                      </div>
                      
                      {/* Show linked products */}
                      {link && link.products && (
                        <div className="mt-2 space-y-1">
                          {link.products.map((product, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              {product.linked ? (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-gray-400" />
                              )}
                              <span className={product.linked ? 'text-green-700' : 'text-gray-500'}>
                                {product.name?.substring(0, 40)}...
                              </span>
                              {product.product_id_1688 && (
                                <code className="bg-green-100 px-1 rounded text-green-800">
                                  {product.product_id_1688}
                                </code>
                              )}
                              <span className="text-gray-400">x{product.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="font-medium">
                        {order.total_price_formatted || `${order.currency || 'PKR'} ${order.total_price || 0}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.line_items?.length || 0} items
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-sm mb-2">💡 How to Link Products</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Use SKU format: <code className="bg-gray-200 px-1 rounded">1688-PRODUCTID-SIZE-COLOR</code></li>
            <li>• Example: <code className="bg-gray-200 px-1 rounded">1688-850596274690-XL-Black</code></li>
            <li>• Or link manually in the Order Fulfillment modal</li>
            <li>• Only orders with linked products can be bulk ordered</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkOrder1688;
