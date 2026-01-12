import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Truck,
  MapPin,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  DollarSign,
  User,
  Phone,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Copy,
  Eye,
  Plus,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Helper to fix image URLs (convert http to https)
const fixImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
};

// Order Status Badge
const OrderStatusBadge = ({ status }) => {
  const statusConfig = {
    waitbuyerpay: { label: 'Pending Payment', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
    waitsellersend: { label: 'Processing', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Package },
    waitbuyerreceive: { label: 'Shipped', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Truck },
    success: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
    cancel: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
    confirm_goods: { label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  };
  
  const config = statusConfig[status?.toLowerCase()] || {
    label: status || 'Unknown',
    color: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    icon: AlertCircle,
  };
  
  const Icon = config.icon;
  
  return (
    <Badge className={`${config.color} border font-medium`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

// Order Card Component
const OrderCard = ({ order, onViewDetails, onCreateDwzOrder, creatingDwz }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Handle nested baseInfo structure from 1688 API
  const baseInfo = order.baseInfo || order;
  
  const orderId = baseInfo.idOfStr || baseInfo.id || order.id || order.orderId || order.tradeId;
  const totalAmount = baseInfo.totalAmount || order.totalAmount || order.sumPayment || 0;
  const status = baseInfo.status || order.orderStatus || order.status || 'unknown';
  const createTime = baseInfo.createTime || order.createTime || order.gmtCreate;
  const sellerName = baseInfo.sellerContact?.companyName || baseInfo.sellerLoginId || order.sellerCompanyName || 'Unknown Seller';
  const productItems = order.productItems || order.orderEntries || [];
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow" data-testid={`order-card-${orderId}`}>
      <CardHeader className="pb-3 bg-gradient-to-r from-zinc-50 to-white">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">
                Order #{orderId?.slice(-8) || 'N/A'}
              </CardTitle>
              <OrderStatusBadge status={status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {sellerName}
              </span>
              {createTime && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {(() => {
                    // Handle 1688 date format: "20260109180137000+0800"
                    if (typeof createTime === 'string' && createTime.length >= 14) {
                      const year = createTime.slice(0, 4);
                      const month = createTime.slice(4, 6);
                      const day = createTime.slice(6, 8);
                      return `${year}-${month}-${day}`;
                    }
                    return new Date(createTime).toLocaleDateString();
                  })()}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-orange-600">¥{parseFloat(totalAmount).toFixed(2)}</p>
            <p className="text-xs text-zinc-400">{productItems.length} items</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-3">
        {/* Product Items Preview */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
          {productItems.slice(0, 4).map((item, i) => {
            // Handle productImgUrl which can be an array
            const imgUrl = Array.isArray(item.productImgUrl) 
              ? item.productImgUrl[0] 
              : (item.productImgUrl || item.productImg || item.picUrl);
            
            return (
              <div 
                key={i}
                className="flex-shrink-0 w-16 h-16 rounded-lg bg-zinc-100 overflow-hidden border"
              >
                {imgUrl ? (
                  <img 
                    src={imgUrl} 
                    alt={item.name || item.productName || 'Product'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-zinc-300" />
                  </div>
                )}
              </div>
            );
          })}
          {productItems.length > 4 && (
            <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-zinc-100 flex items-center justify-center border">
              <span className="text-sm font-medium text-zinc-500">+{productItems.length - 4}</span>
            </div>
          )}
        </div>
        
        {/* Expandable Details */}
        {expanded && (
          <div className="pt-3 border-t mt-3 space-y-3">
            {productItems.map((item, i) => {
              const imgUrl = Array.isArray(item.productImgUrl) 
                ? item.productImgUrl[0] 
                : (item.productImgUrl || item.productImg || item.picUrl);
              
              return (
                <div key={i} className="flex gap-3 p-2 bg-zinc-50 rounded-lg">
                  <div className="w-12 h-12 rounded bg-white border overflow-hidden flex-shrink-0">
                    {imgUrl ? (
                      <img 
                        src={imgUrl} 
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-zinc-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {item.name || item.productName || 'Product'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {item.skuInfos?.map(s => `${s.name}: ${s.value}`).join(' | ') || `SKU: ${item.specId || item.skuId || 'N/A'}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-orange-600">
                        ¥{parseFloat(item.itemAmount || item.price || 0).toFixed(2)}
                      </span>
                      <span className="text-xs text-zinc-400">
                        × {item.quantity || 1} {item.unit || ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-zinc-600"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show Items
              </>
            )}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(orderId);
                toast.success('Order ID copied');
              }}
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy ID
            </Button>
            <a
              href={`https://trade.1688.com/order/trade_detail.htm?orderId=${orderId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="w-3 h-3 mr-1" />
                View on 1688
              </Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Address Card Component
const AddressCard = ({ address, isDefault }) => {
  const copyAddress = () => {
    const fullAddress = `${address.fullName || ''}, ${address.phone || ''}, ${address.provinceName || ''} ${address.cityName || ''} ${address.areaName || ''} ${address.detailAddress || ''}`;
    navigator.clipboard.writeText(fullAddress.trim());
    toast.success('Address copied to clipboard');
  };
  
  return (
    <Card className={`overflow-hidden ${isDefault ? 'border-orange-300 ring-1 ring-orange-200' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900">{address.fullName || 'No Name'}</span>
              {isDefault && (
                <Badge className="bg-orange-100 text-orange-700 border-0">Default</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <Phone className="w-4 h-4" />
              <span>{address.phone || address.mobilePhone || 'No Phone'}</span>
            </div>
            
            <div className="flex items-start gap-2 text-sm text-zinc-600">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                {[
                  address.provinceName,
                  address.cityName,
                  address.areaName,
                  address.townName,
                  address.detailAddress,
                ].filter(Boolean).join(' ')}
              </span>
            </div>
            
            {address.postCode && (
              <div className="text-xs text-zinc-400">
                Postal Code: {address.postCode}
              </div>
            )}
          </div>
          
          <Button variant="outline" size="sm" onClick={copyAddress}>
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Component
const Trade1688Dashboard = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '20',
      });
      
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const res = await fetch(`${API}/api/1688/orders?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        setError(data.detail || 'Failed to fetch orders');
      }
    } catch (e) {
      console.error('Failed to fetch orders:', e);
      setError('Failed to connect to 1688 API');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);
  
  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/1688/shipping-addresses`);
      const data = await res.json();
      
      if (data.success) {
        setAddresses(data.addresses || []);
      } else {
        setError(data.detail || 'Failed to fetch addresses');
      }
    } catch (e) {
      console.error('Failed to fetch addresses:', e);
      setError('Failed to connect to 1688 API');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'addresses') {
      fetchAddresses();
    }
  }, [activeTab, fetchOrders, fetchAddresses]);
  
  const handleRefresh = () => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else {
      fetchAddresses();
    }
  };
  
  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const orderId = (order.id || order.orderId || order.tradeId || '').toLowerCase();
    const seller = (order.sellerCompanyName || order.sellerLoginId || '').toLowerCase();
    return orderId.includes(searchQuery.toLowerCase()) || seller.includes(searchQuery.toLowerCase());
  });
  
  return (
    <div className="min-h-screen bg-[#f1f1f1]" data-testid="trade-1688-dashboard">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-orange-500" />
                1688 Trade Center
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage your 1688 orders and shipping addresses
              </p>
            </div>
            <Button onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border">
            <TabsTrigger value="orders" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
              <Truck className="w-4 h-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="addresses" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
              <MapPin className="w-4 h-4 mr-2" />
              Shipping Addresses
            </TabsTrigger>
          </TabsList>
          
          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-4">
            {/* Filters */}
            <div className="bg-white rounded-lg border p-4 mb-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px] max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      placeholder="Search by order ID or seller..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="waitbuyerpay">Pending Payment</SelectItem>
                    <SelectItem value="waitsellersend">Processing</SelectItem>
                    <SelectItem value="waitbuyerreceive">Shipped</SelectItem>
                    <SelectItem value="success">Completed</SelectItem>
                    <SelectItem value="cancel">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Orders List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
                <p className="text-zinc-600">Loading orders from 1688...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border">
                <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                <p className="text-zinc-700 font-medium">Failed to Load Orders</p>
                <p className="text-zinc-500 text-sm mt-1">{error}</p>
                <Button onClick={handleRefresh} className="mt-4" variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border">
                <Package className="w-12 h-12 text-zinc-300 mb-4" />
                <p className="text-zinc-700 font-medium">No Orders Found</p>
                <p className="text-zinc-500 text-sm mt-1">
                  {searchQuery ? 'Try a different search term' : 'Your 1688 order history will appear here'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order, i) => (
                  <OrderCard key={order.id || order.orderId || i} order={order} />
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {!loading && filteredOrders.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-zinc-500">
                  Showing {filteredOrders.length} orders
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="px-3 py-1.5 text-sm text-zinc-600">
                    Page {page}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={orders.length < 20}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Addresses Tab */}
          <TabsContent value="addresses" className="mt-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
                <p className="text-zinc-600">Loading shipping addresses...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border">
                <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                <p className="text-zinc-700 font-medium">Failed to Load Addresses</p>
                <p className="text-zinc-500 text-sm mt-1">{error}</p>
                <Button onClick={handleRefresh} className="mt-4" variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : addresses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border">
                <MapPin className="w-12 h-12 text-zinc-300 mb-4" />
                <p className="text-zinc-700 font-medium">No Addresses Found</p>
                <p className="text-zinc-500 text-sm mt-1">
                  Your 1688 shipping addresses will appear here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {addresses.map((address, i) => (
                  <AddressCard 
                    key={address.id || address.addressId || i} 
                    address={address}
                    isDefault={address.isDefault || i === 0}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Trade1688Dashboard;
