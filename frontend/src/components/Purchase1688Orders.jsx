import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  ShoppingCart,
  ExternalLink,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  User,
  Hash,
  DollarSign,
  Filter,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const Purchase1688Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchShopifyId, setSearchShopifyId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/api/1688/purchase-orders?page=${page}&page_size=${pageSize}`;
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      if (searchShopifyId) {
        url += `&shopify_order_id=${searchShopifyId}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setOrders(data.orders || []);
        setTotalOrders(data.total || 0);
      } else {
        toast.error(data.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch 1688 purchase orders');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, searchShopifyId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const totalPages = Math.ceil(totalOrders / pageSize);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'created':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'paid':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'shipped':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const open1688Order = (orderId) => {
    window.open(`https://trade.1688.com/order/buyer_order_detail.htm?orderId=${orderId}`, '_blank');
  };

  const open1688Product = (productId) => {
    window.open(`https://detail.1688.com/offer/${productId}.html`, '_blank');
  };

  const clearFilters = () => {
    setStatusFilter('');
    setSearchShopifyId('');
    setPage(1);
  };

  return (
    <div className="p-6 space-y-6" data-testid="purchase-1688-orders">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-orange-500" />
            1688 Purchase Orders
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            View and track all orders placed on 1688
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchOrders}
            disabled={loading}
            className="border-gray-300"
            data-testid="refresh-orders-btn"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Search by Shopify Order ID
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Enter Shopify order ID..."
                  value={searchShopifyId}
                  onChange={(e) => setSearchShopifyId(e.target.value)}
                  className="pl-10"
                  data-testid="search-shopify-id"
                />
              </div>
            </div>

            <div className="w-full md:w-48">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                data-testid="status-filter"
              >
                <option value="">All Statuses</option>
                <option value="created">Created</option>
                <option value="paid">Paid</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <Button
              variant="outline"
              onClick={() => { setPage(1); fetchOrders(); }}
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
              data-testid="apply-filters-btn"
            >
              <Filter className="h-4 w-4 mr-2" />
              Apply
            </Button>

            {(statusFilter || searchShopifyId) && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-gray-500"
                data-testid="clear-filters-btn"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{totalOrders}</p>
            <p className="text-sm text-gray-500">Total Orders</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {orders.filter(o => o.status === 'created').length}
            </p>
            <p className="text-sm text-blue-700">Created</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">
              {orders.filter(o => o.status === 'paid').length}
            </p>
            <p className="text-sm text-green-700">Paid</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">
              {orders.filter(o => o.status === 'shipped' || o.status === 'delivered').length}
            </p>
            <p className="text-sm text-purple-700">Shipped/Delivered</p>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <span className="ml-3 text-gray-600">Loading orders...</span>
        </div>
      )}

      {/* Orders Table */}
      {!loading && orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Purchase Orders ({totalOrders})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="orders-table">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-semibold text-gray-700">1688 Order ID</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Product</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Qty</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Size/Color</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Shopify Order</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Account</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Status</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Created</th>
                    <th className="text-right p-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => (
                    <tr
                      key={order.alibaba_order_id || index}
                      className="border-b hover:bg-gray-50 transition-colors"
                      data-testid={`order-row-${index}`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-mono">
                            {order.alibaba_order_id || '-'}
                          </code>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <p
                            className="font-medium text-sm text-blue-600 hover:underline cursor-pointer truncate max-w-[200px]"
                            onClick={() => order.product_id && open1688Product(order.product_id)}
                            title={order.product_id}
                          >
                            {order.product_id || 'N/A'}
                          </p>
                          {order.notes && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]" title={order.notes}>
                              {order.notes}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-medium">{order.quantity || 1}</td>
                      <td className="p-3">
                        <div className="text-sm">
                          {order.size && <span className="mr-2">Size: {order.size}</span>}
                          {order.color && <span>Color: {order.color}</span>}
                          {!order.size && !order.color && '-'}
                        </div>
                      </td>
                      <td className="p-3">
                        {order.shopify_order_id ? (
                          <Badge variant="outline" className="text-gray-700">
                            <Hash className="h-3 w-3 mr-1" />
                            {order.shopify_order_id}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3 text-gray-400" />
                          <span className="truncate max-w-[100px]" title={order.account_name}>
                            {order.account_name || 'Default'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={`${getStatusColor(order.status)} border`}>
                          {order.status || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span className="whitespace-nowrap">{formatDate(order.created_at)}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {order.alibaba_order_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => open1688Order(order.alibaba_order_id)}
                              className="border-orange-300 text-orange-600 hover:bg-orange-50"
                              title="View on 1688"
                              data-testid={`view-on-1688-${index}`}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedOrder(order)}
                            title="View Details"
                            data-testid={`view-details-${index}`}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalOrders)} of {totalOrders}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    data-testid="prev-page-btn"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    data-testid="next-page-btn"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && orders.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Purchase Orders Found</h3>
            <p className="text-gray-500 mb-4">
              {statusFilter || searchShopifyId
                ? 'No orders match your filters. Try adjusting your search criteria.'
                : 'You haven\'t placed any 1688 orders yet. Start by placing an order from the Order Fulfillment page.'}
            </p>
            {(statusFilter || searchShopifyId) && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" />
                Order Details
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">1688 Order ID</p>
                  <p className="font-mono font-medium">{selectedOrder.alibaba_order_id || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <Badge className={`${getStatusColor(selectedOrder.status)} border mt-1`}>
                    {selectedOrder.status || 'Unknown'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Product ID</p>
                  <p
                    className="font-medium text-blue-600 hover:underline cursor-pointer"
                    onClick={() => selectedOrder.product_id && open1688Product(selectedOrder.product_id)}
                  >
                    {selectedOrder.product_id || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Quantity</p>
                  <p className="font-medium">{selectedOrder.quantity || 1}</p>
                </div>
              </div>

              {(selectedOrder.size || selectedOrder.color) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedOrder.size && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Size</p>
                      <p className="font-medium">{selectedOrder.size}</p>
                    </div>
                  )}
                  {selectedOrder.color && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Color</p>
                      <p className="font-medium">{selectedOrder.color}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Shopify Order</p>
                  <p className="font-medium">{selectedOrder.shopify_order_id || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Account</p>
                  <p className="font-medium">{selectedOrder.account_name || 'Default'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase">Created At</p>
                <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Notes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{selectedOrder.notes}</p>
                </div>
              )}

              {selectedOrder.api_response && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">API Response</p>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto max-h-32">
                    {JSON.stringify(selectedOrder.api_response, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
              {selectedOrder.alibaba_order_id && (
                <Button
                  onClick={() => open1688Order(selectedOrder.alibaba_order_id)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on 1688
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchase1688Orders;
