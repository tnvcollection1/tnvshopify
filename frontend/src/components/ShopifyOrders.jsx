import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Download,
  Eye,
  MessageCircle,
  ChevronDown,
  X,
  Package,
  CheckCircle,
  Clock,
  Truck,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStore } from '../contexts/StoreContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Status Badge Component
const StatusBadge = ({ status, type }) => {
  const configs = {
    fulfillment: {
      fulfilled: { label: 'Fulfilled', class: 'bg-green-100 text-green-700' },
      unfulfilled: { label: 'Unfulfilled', class: 'bg-yellow-100 text-yellow-700' },
      cancelled: { label: 'Cancelled', class: 'bg-red-100 text-red-700' },
      restocked: { label: 'Cancelled', class: 'bg-red-100 text-red-700' },
      partial: { label: 'Partial', class: 'bg-blue-100 text-blue-700' }
    },
    payment: {
      paid: { label: 'Paid', class: 'bg-green-100 text-green-700' },
      pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-700' },
      refunded: { label: 'Refunded', class: 'bg-red-100 text-red-700' },
      partially_refunded: { label: 'Partial Refund', class: 'bg-orange-100 text-orange-700' }
    },
    delivery: {
      DELIVERED: { label: 'Delivered', class: 'bg-green-100 text-green-700' },
      IN_TRANSIT: { label: 'In Transit', class: 'bg-blue-100 text-blue-700' },
      BOOKED: { label: 'Booked', class: 'bg-blue-100 text-blue-700' },
      OUT_FOR_DELIVERY: { label: 'Out for Delivery', class: 'bg-purple-100 text-purple-700' },
      PENDING: { label: 'Pending', class: 'bg-yellow-100 text-yellow-700' },
      RETURNED: { label: 'Returned', class: 'bg-red-100 text-red-700' }
    }
  };
  
  const config = configs[type]?.[status] || { label: status || 'Unknown', class: 'bg-gray-100 text-gray-600' };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}>{config.label}</span>;
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, active, onClick }) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-300' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-300' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-300' },
    red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-300' }
  };
  const c = colorClasses[color] || colorClasses.blue;

  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-lg border p-4 text-left transition-all hover:shadow-md ${
        active ? `ring-2 ring-offset-1 ${c.border} ring-${color}-500` : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-2xl font-semibold mt-1 ${c.text}`}>{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
      </div>
    </button>
  );
};

// Order Detail Modal
const OrderDetailModal = ({ order, open, onClose, globalStore, onRefresh }) => {
  const [linkedProduct, setLinkedProduct] = useState(null);
  const [pipelineData, setPipelineData] = useState(null);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [lineItem1688Orders, setLineItem1688Orders] = useState({});
  const [linkingItem, setLinkingItem] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch linked product and pipeline data when modal opens
  useEffect(() => {
    if (open && order) {
      fetchLinkedData();
    }
  }, [open, order]);

  const fetchLinkedData = async () => {
    if (!order) return;
    setLoading(true);
    
    try {
      // Get first SKU from line items
      const firstSku = order.line_items?.[0]?.sku || order.order_skus?.[0];
      
      if (firstSku) {
        // Extract base SKU (product ID part)
        const baseSku = firstSku.split('-')[0];
        
        // Try to get linked product
        try {
          const linkedRes = await axios.get(`${API}/api/product-scraper/linked-product`, {
            params: { sku: baseSku, store_name: order.store_name }
          });
          if (linkedRes.data?.linked_product) {
            setLinkedProduct(linkedRes.data.linked_product);
          }
        } catch (e) {
          // No linked product found - that's ok
        }
      }

      // Get fulfillment pipeline data
      try {
        const pipelineRes = await axios.get(`${API}/api/fulfillment/pipeline`, {
          params: { 
            store_name: order.store_name,
            order_number: order.order_number 
          }
        });
        const pipelineOrder = pipelineRes.data?.orders?.find(
          o => String(o.order_number) === String(order.order_number)
        );
        if (pipelineOrder) {
          setPipelineData(pipelineOrder);
        }
      } catch (e) {
        // No pipeline data - that's ok
      }

      // Get 1688 purchase orders for this Shopify order (all line items)
      try {
        const purchaseRes = await axios.get(`${API}/api/1688/purchase-orders`, {
          params: { 
            shopify_order_id: order.order_number,
            page_size: 50
          }
        });
        if (purchaseRes.data?.orders?.length > 0) {
          setPurchaseOrder(purchaseRes.data.orders[0]);
          
          // Map 1688 orders to line items by SKU/product_id
          const orderMap = {};
          purchaseRes.data.orders.forEach(po => {
            // Use product_id or SKU as key
            const key = po.product_id || po.sku || po.notes;
            if (key) {
              orderMap[key] = po;
            }
          });
          setLineItem1688Orders(orderMap);
        }
      } catch (e) {
        // No purchase order - that's ok
      }
    } catch (error) {
      console.error('Error fetching linked data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to link a line item to 1688
  const handleLink1688 = async (item) => {
    // Prompt for 1688 order ID
    const alibaba1688Id = prompt('Enter 1688 Order ID to link with this item:');
    
    if (!alibaba1688Id || !alibaba1688Id.trim()) {
      return; // User cancelled
    }
    
    // Get item details
    const sku = item.sku || '';
    const productId = sku.split('-')[0] || '';
    const itemTitle = item.title || item.name || '';
    
    // Extract size and color from title (e.g., "XON Edge 27 - Color / 45")
    const titleParts = itemTitle.split(' - ');
    let size = '';
    let color = '';
    if (titleParts.length > 1) {
      const variantPart = titleParts[titleParts.length - 1];
      const variantSplit = variantPart.split(' / ');
      if (variantSplit.length >= 2) {
        color = variantSplit[0].trim();
        size = variantSplit[1].trim();
      } else if (variantSplit.length === 1) {
        // Try to determine if it's size or color
        const val = variantSplit[0].trim();
        if (/^\d+$/.test(val)) {
          size = val;
        } else {
          color = val;
        }
      }
    }
    
    try {
      toast.loading('Linking to 1688...', { id: 'link-1688' });
      
      // Call API to link/create the 1688 order record
      const response = await fetch(`${API}/api/1688/purchase-orders/link-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alibaba_order_id: alibaba1688Id.trim(),
          shopify_order_number: String(order.order_number),
          shopify_order_id: order.shopify_order_id || order.id,
          product_id: productId,
          sku: sku,
          product_name: itemTitle,
          quantity: item.quantity || 1,
          size: size,
          color: color,
          notes: itemTitle,
          customer_name: order.customer?.first_name ? `${order.customer.first_name} ${order.customer.last_name || ''}`.trim() : '',
          store_name: globalStore || 'default'
        })
      });
      
      const data = await response.json();
      
      if (data.success || response.ok) {
        toast.success(`Linked to 1688 order: ${alibaba1688Id}`, { id: 'link-1688' });
        // Refresh to show the linked order
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast.error(data.detail || data.message || 'Failed to link order', { id: 'link-1688' });
      }
    } catch (error) {
      console.error('Error linking to 1688:', error);
      toast.error('Failed to link to 1688 order', { id: 'link-1688' });
    }
  };

  if (!order) return null;

  const lineItems = order.line_items || [];
  const address = order.default_address || order.shipping_address || {};
  
  // Get 1688 order ID from various sources
  const alibaba1688OrderId = purchaseOrder?.alibaba_order_id ||
    order.alibaba_order_id || 
    order.order_1688_id || 
    pipelineData?.alibaba_order_id ||
    order.line_item_orders?.[0]?.alibaba_order_id;

  // Helper to find 1688 order for a line item
  const get1688OrderForItem = (item) => {
    const sku = item.sku || '';
    const productId = sku.split('-')[0];
    const itemTitle = (item.title || item.name || '').toLowerCase();
    
    // Check all 1688 orders for this Shopify order
    for (const [key, po] of Object.entries(lineItem1688Orders)) {
      // Match by product_id
      if (po.product_id && productId && String(po.product_id) === String(productId)) {
        return po;
      }
      
      // Match by SKU
      if (po.sku && sku && po.sku.includes(productId)) {
        return po;
      }
      
      // Match by title in notes
      if (po.notes && itemTitle) {
        const notesLower = po.notes.toLowerCase();
        // Check if item title words appear in notes
        const titleWords = itemTitle.split(' ').filter(w => w.length > 3);
        const matchCount = titleWords.filter(w => notesLower.includes(w)).length;
        if (matchCount >= 2 || (titleWords.length <= 2 && matchCount >= 1)) {
          return po;
        }
      }
    }
    return null;
  };

  // Count linked items
  const linkedItemsCount = lineItems.filter(item => get1688OrderForItem(item)).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-gray-900">
            <span>Order #{order.order_number || order.name}</span>
            <StatusBadge status={order.fulfillment_status} type="fulfillment" />
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 py-4">
          {/* Customer Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Customer</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="font-medium text-gray-900">{order.first_name} {order.last_name}</p>
              {order.email && <p className="text-sm text-gray-600">{order.email}</p>}
              {order.phone && <p className="text-sm text-gray-600">{order.phone}</p>}
            </div>
          </div>

          {/* Shipping Address */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Shipping Address</h4>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
              {address.address1 || address.address ? (
                <>
                  {(address.address1 || address.address) && <p>{address.address1 || address.address}</p>}
                  {address.address2 && <p>{address.address2}</p>}
                  {(address.city || address.province || address.zip) && (
                    <p>{[address.city, address.province, address.zip].filter(Boolean).join(', ')}</p>
                  )}
                  {address.country && <p>{address.country}</p>}
                </>
              ) : (
                <p className="text-gray-400 italic">No shipping address available</p>
              )}
            </div>
          </div>

          {/* 1688 Order Info */}
          <div className="md:col-span-2">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-500" />
              1688 Sourcing Info
            </h4>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              {loading ? (
                <p className="text-sm text-orange-600">Loading...</p>
              ) : (
                <div className="space-y-2">
                  {/* Show linked count */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">1688 Orders Linked:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      linkedItemsCount === lineItems.length 
                        ? 'bg-green-100 text-green-700' 
                        : linkedItemsCount > 0 
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {linkedItemsCount} / {lineItems.length} items
                    </span>
                  </div>
                  
                  {Object.keys(lineItem1688Orders).length > 0 && (
                    <div className="text-xs text-gray-500 pt-1 border-t">
                      {Object.values(lineItem1688Orders).map((po, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1">
                          <span className="truncate max-w-[150px]">{po.notes?.split(' - ')[0] || 'Product'}</span>
                          <a 
                            href={`https://trade.1688.com/order/order_detail.htm?orderId=${po.alibaba_order_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:underline font-mono"
                          >
                            {po.alibaba_order_id?.slice(-8)}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {linkedItemsCount < lineItems.length && (
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ {lineItems.length - linkedItemsCount} item(s) not linked to 1688 yet
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="md:col-span-2">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Items ({lineItems.length})</h4>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 bg-white">
              {lineItems.map((item, idx) => {
                const item1688Order = get1688OrderForItem(item);
                const is1688Fulfilled = item1688Order && ['shipped', 'delivered', 'fulfilled', 'completed'].includes(item1688Order.status?.toLowerCase());
                const hasDwzTracking = item1688Order?.dwz_tracking_number;
                
                return (
                  <div key={idx} className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{item.title || item.name}</p>
                        {item.sku && <p className="text-xs text-gray-500 mt-0.5">SKU: {item.sku}</p>}
                        <p className="text-xs text-gray-500">Qty: {item.quantity || 1}</p>
                      </div>
                      <p className="font-semibold text-sm text-gray-900">₹{parseFloat(item.price || 0).toLocaleString()}</p>
                    </div>
                    
                    {/* Fulfillment Status Flow */}
                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                      {/* Step 1: 1688 Order */}
                      {item1688Order ? (
                        <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <div>
                              <span className="text-xs font-medium text-green-800">1688 Order: </span>
                              <a 
                                href={`https://trade.1688.com/order/order_detail.htm?orderId=${item1688Order.alibaba_order_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-700 hover:underline font-mono"
                              >
                                {item1688Order.alibaba_order_id}
                              </a>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            is1688Fulfilled
                              ? 'bg-green-200 text-green-800' 
                              : item1688Order.status === 'paid'
                              ? 'bg-blue-200 text-blue-800'
                              : 'bg-yellow-200 text-yellow-800'
                          }`}>
                            {item1688Order.status?.toUpperCase() || 'PENDING'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-xs text-gray-500">① No 1688 order linked</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                            onClick={() => handleLink1688(item)}
                          >
                            <Package className="w-3 h-3 mr-1" />
                            Link to 1688
                          </Button>
                        </div>
                      )}
                      
                      {/* Step 2: DWZ Warehouse */}
                      {item1688Order && (
                        <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                          hasDwzTracking ? 'bg-blue-50' : is1688Fulfilled ? 'bg-purple-50' : 'bg-gray-50'
                        }`}>
                          {hasDwzTracking ? (
                            <>
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-blue-600" />
                                <div>
                                  <span className="text-xs font-medium text-blue-800">DWZ Tracking: </span>
                                  <span className="text-xs text-blue-700 font-mono">{item1688Order.dwz_tracking_number}</span>
                                </div>
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-200 text-blue-800">
                                SHIPPED
                              </span>
                            </>
                          ) : is1688Fulfilled ? (
                            <>
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-purple-600" />
                                <span className="text-xs text-purple-700">② Ready at DWZ Warehouse</span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200"
                                onClick={async () => {
                                  // Extract color/size from SKU or title
                                  const sku = item.sku || '';
                                  const skuParts = sku.split('-');
                                  const color = skuParts.length >= 2 ? skuParts[skuParts.length - 2] : '';
                                  const size = skuParts.length >= 1 ? skuParts[skuParts.length - 1] : '';
                                  const country = address?.country_code || 'IN';
                                  
                                  try {
                                    // Generate TNV tracking number
                                    const trackingRes = await fetch(
                                      `${API}/api/dwz56/generate-tracking?country=${country}&color=${encodeURIComponent(color)}&size=${encodeURIComponent(size)}`
                                    );
                                    const trackingData = await trackingRes.json();
                                    
                                    const params = new URLSearchParams({
                                      tracking: trackingData.tracking_number || '',
                                      ref_no: order.order_number,
                                      shopify_order: order.order_number,
                                      alibaba_order: item1688Order.alibaba_order_id,
                                      product_id: item1688Order.product_id || '',
                                      color: color,
                                      size: size,
                                      remarks: `#${order.order_number} | ${item.title || ''}`.substring(0, 100),
                                    });
                                    window.open(`/dwz56-shipping?${params.toString()}`, '_blank');
                                  } catch (e) {
                                    console.error('Error generating tracking:', e);
                                    // Fallback without tracking
                                    const params = new URLSearchParams({
                                      shopify_order: order.order_number,
                                      alibaba_order: item1688Order.alibaba_order_id,
                                      product_id: item1688Order.product_id || '',
                                    });
                                    window.open(`/dwz56-shipping?${params.toString()}`, '_blank');
                                  }
                                }}
                              >
                                <Truck className="w-3 h-3 mr-1" />
                                Place DWZ Order
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-500">② Waiting for 1688 fulfillment</span>
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                                PENDING
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Summary */}
          <div className="md:col-span-2">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Order Summary</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">₹{parseFloat(order.subtotal_price || order.total_price || order.total_spent || 0).toLocaleString()}</span>
              </div>
              {order.total_shipping_price_set && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-900">₹{parseFloat(order.total_shipping_price_set?.shop_money?.amount || 0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base pt-2 border-t border-gray-200">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">₹{parseFloat(order.total_price || order.total_spent || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Tracking */}
          {order.tracking_number && (
            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Tracking</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="font-mono text-sm text-blue-900">{order.tracking_number}</p>
                {order.tracking_company && (
                  <p className="text-xs text-blue-700 mt-1">Carrier: {order.tracking_company}</p>
                )}
                {order.tracking_url && (
                  <a 
                    href={order.tracking_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-1 block"
                  >
                    Track Package →
                  </a>
                )}
                <p className="text-xs text-blue-700 mt-1">
                  Status: {order.delivery_status || 'Unknown'}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Orders Component
const ShopifyOrders = () => {
  const { selectedStore } = useStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const [filters, setFilters] = useState({
    fulfillment: 'all',
    payment: 'all',
    delivery: 'all'
  });

  const [stats, setStats] = useState({
    total: 0,
    fulfilled: 0,
    unfulfilled: 0,
    cancelled: 0
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchStats = useCallback(async () => {
    // Don't fetch until store is selected
    if (!selectedStore) return;
    
    try {
      const params = { store_name: selectedStore };
      const response = await axios.get(`${API}/api/customers/stats`, { params });
      const data = response.data;
      setStats({
        total: data.total || 0,
        fulfilled: data.fulfilled || 0,
        unfulfilled: data.unfulfilled || 0,
        cancelled: data.cancelled || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [selectedStore]);

  const fetchOrders = useCallback(async () => {
    // Don't fetch until store is selected
    if (!selectedStore) return;
    
    setLoading(true);
    try {
      const params = { limit: 50, page, store_name: selectedStore };
      if (filters.fulfillment !== 'all') params.fulfillment_status = filters.fulfillment;
      if (filters.payment !== 'all') params.payment_status = filters.payment;
      if (filters.delivery !== 'all') params.delivery_status = filters.delivery;
      if (debouncedSearch) params.search = debouncedSearch;

      const response = await axios.get(`${API}/api/customers`, { params });
      const data = response.data?.customers || response.data || [];
      setOrders(Array.isArray(data) ? data : []);
      setTotal(response.data?.total || data.length);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStore, filters, debouncedSearch, page]);

  // Reset page when store changes
  useEffect(() => {
    setPage(1);
  }, [selectedStore]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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
        fetchOrders();
      }, 3000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleStatClick = (filterType) => {
    if (filters.fulfillment === filterType) {
      setFilters({ ...filters, fulfillment: 'all' });
    } else {
      setFilters({ ...filters, fulfillment: filterType });
    }
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ fulfillment: 'all', payment: 'all', delivery: 'all' });
    setSearchQuery('');
    setPage(1);
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== 'all').length;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Orders</h1>
              <p className="text-sm text-gray-500">{total.toLocaleString()} orders total</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          <StatCard 
            title="Total Orders" 
            value={stats.total.toLocaleString()} 
            icon={Package} 
            color="blue"
            active={filters.fulfillment === 'all'}
            onClick={() => handleStatClick('all')}
          />
          <StatCard 
            title="Fulfilled" 
            value={stats.fulfilled.toLocaleString()} 
            icon={CheckCircle} 
            color="green"
            active={filters.fulfillment === 'fulfilled'}
            onClick={() => handleStatClick('fulfilled')}
          />
          <StatCard 
            title="Unfulfilled" 
            value={stats.unfulfilled.toLocaleString()} 
            icon={Clock} 
            color="yellow"
            active={filters.fulfillment === 'unfulfilled'}
            onClick={() => handleStatClick('unfulfilled')}
          />
          <StatCard 
            title="Cancelled" 
            value={stats.cancelled.toLocaleString()} 
            icon={AlertCircle} 
            color="red"
            active={filters.fulfillment === 'cancelled'}
            onClick={() => handleStatClick('cancelled')}
          />
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by order #, customer name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-gray-100' : ''}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {(activeFilterCount > 0 || searchQuery) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Fulfillment</label>
                <Select value={filters.fulfillment} onValueChange={(v) => setFilters({...filters, fulfillment: v})}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                    <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Payment</label>
                <Select value={filters.payment} onValueChange={(v) => setFilters({...filters, payment: v})}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Delivery</label>
                <Select value={filters.delivery} onValueChange={(v) => setFilters({...filters, delivery: v})}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                    <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="RETURNED">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Fulfillment</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Delivery</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">Loading orders...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Package className="w-12 h-12 mx-auto text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No orders found</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const firstItem = order.line_items?.[0];
                  const itemCount = order.line_items?.length || 0;
                  
                  return (
                    <tr key={order.customer_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          #{order.order_number || order.name}
                        </button>
                        {order.tracking_number && (
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{order.tracking_number}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(order.last_order_date || order.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{order.first_name} {order.last_name}</p>
                        {order.phone && <p className="text-xs text-gray-500">{order.phone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {firstItem ? (
                          <div className="max-w-[180px]">
                            <p className="text-sm text-gray-900 truncate">{firstItem.title || firstItem.name}</p>
                            {itemCount > 1 && (
                              <p className="text-xs text-blue-600">+{itemCount - 1} more</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={order.fulfillment_status} type="fulfillment" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={order.financial_status || order.payment_status} type="payment" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={order.delivery_status} type="delivery" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium">
                          ₹{(order.total_price || order.total_spent || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </Button>
                          {order.phone && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => window.open(`https://wa.me/${order.phone.replace(/[^0-9]/g, '')}`, '_blank')}
                            >
                              <MessageCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {orders.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {orders.length} of {total.toLocaleString()} orders
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">Page {page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal 
        order={selectedOrder} 
        open={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
      />
    </div>
  );
};

export default ShopifyOrders;
