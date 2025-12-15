import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  Phone,
  CheckCircle,
  XCircle,
  Package,
  Plane,
  Edit,
  Save,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  RefreshCw,
  PhoneCall,
  ShoppingCart,
  X,
  AlertCircle,
  Box,
  Truck,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useStore } from "../contexts/StoreContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ConfirmationTracker = () => {
  const { selectedStore: globalStore, getStoreName } = useStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    calling_status: "all",
    confirmation_status: "all",
    stock_status: "all",
    year: "all",
    sortBy: "date_desc",
  });
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    notCalled: 0,
    called: 0,
    purchased: 0,
    notPurchased: 0,
    canceled: 0,
    inStock: 0,
    inStockValue: 0,
    outOfStock: 0,
    outOfStockValue: 0,
    currency: "PKR",
  });
  const [editingOrder, setEditingOrder] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkWhatsAppDialog, setBulkWhatsAppDialog] = useState(false);
  const [whatsappTemplate, setWhatsappTemplate] = useState("order_ready");
  
  const [viewingCard, setViewingCard] = useState(null);
  const [cardData, setCardData] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, [currentPage, filters, searchQuery, dateRange, globalStore]);

  useEffect(() => {
    if (currentPage > 1) {
      setCurrentPage(1);
    }
  }, [filters.calling_status, filters.confirmation_status, filters.stock_status, filters.year, filters.sortBy, searchQuery, globalStore]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("fulfillment_status", "unfulfilled");
      
      if (filters.calling_status !== "all") params.append("calling_status", filters.calling_status);
      if (filters.confirmation_status !== "all") params.append("confirmation_status", filters.confirmation_status);
      if (filters.stock_status !== "all") params.append("stock_availability", filters.stock_status);
      if (globalStore !== "all") params.append("store_name", globalStore);
      if (filters.year !== "all") params.append("year", filters.year);
      if (filters.sortBy) params.append("sort_by", filters.sortBy);
      if (searchQuery) params.append("search", searchQuery);
      if (dateRange.start) params.append("start_date", dateRange.start);
      if (dateRange.end) params.append("end_date", dateRange.end);
      params.append("page", currentPage);
      params.append("limit", "100");

      const [ordersResponse, countResponse, stockStatsResponse] = await Promise.all([
        axios.get(`${API}/customers?${params.toString()}`),
        axios.get(`${API}/customers/count?${params.toString()}`),
        axios.get(`${API}/customers/stock-stats?${params.toString()}`)
      ]);
      
      const allOrders = Array.isArray(ordersResponse.data) ? ordersResponse.data : ordersResponse.data.customers || [];
      const total = countResponse.data.total || 0;
      const stockStats = stockStatsResponse.data || {};
      
      setOrders(allOrders);
      setTotalCount(total);
      
      setStats({
        total: total,
        notCalled: allOrders.filter(c => !c.calling_status || c.calling_status === "NOT_CALLED").length,
        called: allOrders.filter(c => c.calling_status === "CALLED" || c.calling_status === "CONFIRMED").length,
        purchased: allOrders.filter(c => c.confirmation_status === "PURCHASED").length,
        notPurchased: allOrders.filter(c => c.confirmation_status === "NOT_PURCHASED").length,
        canceled: allOrders.filter(c => c.confirmation_status === "CANCELED").length,
        inStock: stockStats.in_stock || 0,
        inStockValue: stockStats.in_stock_value || 0,
        outOfStock: stockStats.out_of_stock || 0,
        outOfStockValue: stockStats.out_of_stock_value || 0,
        currency: stockStats.currency || "PKR",
      });
      
      setTotalPages(Math.ceil(total / 100));
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handleEditOrder = (order) => {
    setEditingOrder({
      ...order,
      calling_status: order.calling_status || "NOT_CALLED",
      confirmation_status: order.confirmation_status || "PENDING",
      dubai_tracking_number: order.dubai_tracking_number || "",
      confirmation_notes: order.confirmation_notes || "",
    });
    setEditDialog(true);
  };

  const handleSaveOrder = async () => {
    try {
      await axios.put(`${API}/customers/${editingOrder.customer_id}`, {
        calling_status: editingOrder.calling_status,
        confirmation_status: editingOrder.confirmation_status,
        dubai_tracking_number: editingOrder.dubai_tracking_number,
        confirmation_notes: editingOrder.confirmation_notes,
      });
      
      toast.success("Order updated successfully");
      setEditDialog(false);
      setEditingOrder(null);
      await fetchOrders();
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    }
  };

  const viewCardDetails = async (cardType) => {
    setViewingCard(cardType);
    setCardData([]);
    
    try {
      const params = new URLSearchParams();
      params.append("fulfillment_status", "unfulfilled");
      params.append("limit", "500");
      
      if (globalStore !== "all") params.append("store_name", globalStore);
      
      // Add specific filters based on card type
      switch(cardType) {
        case 'notCalled':
          params.append("calling_status", "NOT_CALLED");
          break;
        case 'called':
          params.append("calling_status", "CALLED");
          break;
        case 'purchased':
          params.append("confirmation_status", "PURCHASED");
          break;
        case 'notPurchased':
          params.append("confirmation_status", "NOT_PURCHASED");
          break;
        case 'canceled':
          params.append("confirmation_status", "CANCELED");
          break;
        case 'inStock':
          params.append("stock_availability", "in_stock");
          break;
        case 'outOfStock':
          params.append("stock_availability", "out_of_stock");
          break;
        case 'total':
        default:
          // No additional filter
          break;
      }
      
      const response = await axios.get(`${API}/customers?${params.toString()}`);
      const allOrders = Array.isArray(response.data) ? response.data : response.data.customers || [];
      setCardData(allOrders);
    } catch (error) {
      console.error("Error fetching card details:", error);
      toast.error("Failed to load order details");
    }
  };

  const closeCardView = () => {
    setViewingCard(null);
    setCardData([]);
  };

  const handleSyncStockStatus = async () => {
    try {
      toast.loading("Syncing stock status for all unfulfilled orders...");
      const params = new URLSearchParams();
      if (globalStore && globalStore !== 'all') {
        params.append('store_name', globalStore);
      }
      const response = await axios.post(`${API}/customers/sync-stock-status?${params.toString()}`);
      
      if (response.data.success) {
        toast.dismiss();
        toast.success(
          `Stock status synced! Updated: ${response.data.updated}, In Stock: ${response.data.in_stock}, Out of Stock: ${response.data.out_of_stock}`
        );
        await fetchOrders();
      }
    } catch (error) {
      toast.dismiss();
      console.error("Error syncing stock status:", error);
      toast.error("Failed to sync stock status");
    }
  };

  const handleSendWhatsApp = async (customerId, customerName) => {
    try {
      const response = await axios.post(`${API}/customers/${customerId}/send-whatsapp`);
      
      if (response.data.success) {
        toast.success(`WhatsApp message sent to ${customerName}`);
        await fetchOrders();
      }
    } catch (error) {
      console.error("Error sending WhatsApp:", error);
      toast.error("Failed to send WhatsApp message");
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = orders
        .filter(order => !order.messaged && order.phone)
        .map(order => order.customer_id);
      setSelectedOrders(allIds);
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (customerId) => {
    setSelectedOrders(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  const handleBulkWhatsApp = () => {
    if (selectedOrders.length === 0) {
      toast.error("Please select at least one customer");
      return;
    }
    setBulkWhatsAppDialog(true);
  };

  const handleSendBulkWhatsApp = async () => {
    try {
      toast.loading(`Sending WhatsApp to ${selectedOrders.length} customers...`);
      
      const response = await axios.post(`${API}/customers/bulk-whatsapp`, {
        customer_ids: selectedOrders,
        template: whatsappTemplate
      });
      
      if (response.data.success) {
        toast.success(`WhatsApp sent to ${response.data.sent_count} customers!`);
        setSelectedOrders([]);
        setBulkWhatsAppDialog(false);
        await fetchOrders();
      }
    } catch (error) {
      console.error("Error sending bulk WhatsApp:", error);
      toast.error("Failed to send bulk messages");
    }
  };

  const getCallingBadge = (status) => {
    const variants = {
      NOT_CALLED: "bg-gray-100 text-gray-800 border-gray-200",
      CALLED: "bg-green-100 text-green-800 border-green-200",
      NO_ANSWER: "bg-yellow-100 text-yellow-800 border-yellow-200",
      BUSY: "bg-orange-100 text-orange-800 border-orange-200",
      CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
    };
    const variant = variants[status] || "bg-gray-100 text-gray-800 border-gray-200";
    return <Badge variant="outline" className={`${variant} font-medium text-xs`}>{status || "NOT_CALLED"}</Badge>;
  };

  const getStockBadge = (status) => {
    const normalizedStatus = (status || '').toLowerCase().replace('_', '_');
    const variants = {
      in_stock: "bg-green-100 text-green-800 border-green-200",
      partial: "bg-yellow-100 text-yellow-800 border-yellow-200",
      out_of_stock: "bg-red-100 text-red-800 border-red-200",
      unknown: "bg-gray-100 text-gray-600 border-gray-200",
    };
    const labels = {
      in_stock: "✅ In Stock",
      partial: "⚠️ Partial",
      out_of_stock: "❌ Out of Stock",
      unknown: "Unknown",
    };
    const variant = variants[normalizedStatus] || variants.unknown;
    const label = labels[normalizedStatus] || "Unknown";
    return <Badge variant="outline" className={`${variant} font-medium text-xs`}>{label}</Badge>;
  };

  const getConfirmationBadge = (status) => {
    const variants = {
      PENDING: "bg-gray-100 text-gray-800 border-gray-200",
      PURCHASED: "bg-green-100 text-green-800 border-green-200",
      NOT_PURCHASED: "bg-red-100 text-red-800 border-red-200",
      CANCELED: "bg-orange-100 text-orange-800 border-orange-200",
    };
    const variant = variants[status] || "bg-gray-100 text-gray-800 border-gray-200";
    return <Badge variant="outline" className={`${variant} font-medium text-xs`}>{status || "PENDING"}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Confirmation Tracker</h1>
            <p className="text-sm text-gray-500 mt-1">Call customers and confirm unfulfilled orders before dispatch</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600">
              📍 {getStoreName(globalStore)}
            </div>
            <Button
              variant="outline"
              onClick={handleSyncStockStatus}
              className="h-9 text-sm border-gray-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Stock Status
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6">
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div 
            className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => viewCardDetails('total')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Package className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => viewCardDetails('notCalled')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Phone className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Not Called</p>
                <p className="text-xl font-semibold text-gray-600">{stats.notCalled}</p>
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => viewCardDetails('called')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <PhoneCall className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Called</p>
                <p className="text-xl font-semibold text-blue-600">{stats.called}</p>
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => viewCardDetails('purchased')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Purchased</p>
                <p className="text-xl font-semibold text-green-600">{stats.purchased}</p>
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => viewCardDetails('canceled')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <X className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Canceled</p>
                <p className="text-xl font-semibold text-orange-600">{stats.canceled}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Status Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div 
            className="bg-white rounded-lg border border-green-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => viewCardDetails('inStock')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">✅ In Stock</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-xl font-semibold text-green-600">{stats.inStock}</p>
                  <p className="text-sm text-green-600">
                    {stats.currency} {(stats.inStockValue || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg border border-red-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => viewCardDetails('outOfStock')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">❌ Out of Stock</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-xl font-semibold text-red-600">{stats.outOfStock}</p>
                  <p className="text-sm text-red-600">
                    {stats.currency} {(stats.outOfStockValue || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by order #, customer name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-300 bg-white"
            />
          </div>
          <Select value={filters.calling_status} onValueChange={(v) => setFilters({ ...filters, calling_status: v })}>
            <SelectTrigger className="w-36 border-gray-300 bg-white">
              <SelectValue placeholder="Calling Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="NOT_CALLED">Not Called</SelectItem>
              <SelectItem value="CALLED">Called</SelectItem>
              <SelectItem value="NO_ANSWER">No Answer</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.confirmation_status} onValueChange={(v) => setFilters({ ...filters, confirmation_status: v })}>
            <SelectTrigger className="w-36 border-gray-300 bg-white">
              <SelectValue placeholder="Confirmation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PURCHASED">Purchased</SelectItem>
              <SelectItem value="NOT_PURCHASED">Not Purchased</SelectItem>
              <SelectItem value="CANCELED">Canceled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.stock_status} onValueChange={(v) => setFilters({ ...filters, stock_status: v })}>
            <SelectTrigger className="w-36 border-gray-300 bg-white">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in_stock">✅ In Stock</SelectItem>
              <SelectItem value="out_of_stock">❌ Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.year} onValueChange={(v) => setFilters({ ...filters, year: v })}>
            <SelectTrigger className="w-28 border-gray-300 bg-white">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.sortBy} onValueChange={(v) => setFilters({ ...filters, sortBy: v })}>
            <SelectTrigger className="w-36 border-gray-300 bg-white">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Newest First</SelectItem>
              <SelectItem value="date_asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateRange({ start: '', end: '' })}
            className="text-gray-600"
          >
            Clear Dates
          </Button>
        </div>

        {/* Bulk Actions Bar */}
        {selectedOrders.length > 0 && (
          <div className="flex items-center justify-between mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-blue-900">
                {selectedOrders.length} customer{selectedOrders.length > 1 ? 's' : ''} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedOrders([])}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Clear Selection
              </Button>
            </div>
            <Button
              onClick={handleBulkWhatsApp}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Send WhatsApp ({selectedOrders.length})
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-12 font-medium">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedOrders.length > 0 && selectedOrders.length === orders.filter(o => !o.messaged && o.phone).length}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </TableHead>
                <TableHead className="font-medium">Date</TableHead>
                <TableHead className="font-medium">Order #</TableHead>
                <TableHead className="font-medium">Tracking #</TableHead>
                <TableHead className="font-medium">Delivery Status</TableHead>
                <TableHead className="font-medium">Store</TableHead>
                <TableHead className="font-medium">Customer</TableHead>
                <TableHead className="font-medium">Phone</TableHead>
                <TableHead className="font-medium">WhatsApp</TableHead>
                <TableHead className="font-medium">Stock</TableHead>
                <TableHead className="font-medium">Calling</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium">Amount</TableHead>
                <TableHead className="font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-12 text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No unfulfilled orders</h3>
                    <p>All orders have been processed</p>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.customer_id} className="hover:bg-gray-50">
                    <TableCell>
                      {!order.messaged && order.phone && (
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.customer_id)}
                          onChange={() => handleSelectOrder(order.customer_id)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {order.last_order_date
                        ? new Date(order.last_order_date).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell className="font-medium text-blue-600">
                      #{order.order_number || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 text-xs">
                        {order.store_name || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {order.first_name} {order.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{order.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {order.phone || "N/A"}
                    </TableCell>
                    <TableCell>
                      {order.messaged ? (
                        <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Sent
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600 border-gray-300 text-xs">
                          <XCircle className="w-3 h-3 mr-1" />
                          Not Sent
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStockBadge(order.stock_status || "unknown")}
                    </TableCell>
                    <TableCell>
                      {getCallingBadge(order.calling_status || "NOT_CALLED")}
                    </TableCell>
                    <TableCell>
                      {getConfirmationBadge(order.confirmation_status || "PENDING")}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-gray-600">
                      {order.dubai_tracking_number ? (
                        <div className="flex items-center gap-1">
                          <Plane className="w-3 h-3 text-blue-500" />
                          {order.dubai_tracking_number}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-gray-900">
                      ${order.total_spent?.toFixed(2) || "0.00"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditOrder(order)}
                          className="h-8 w-8 p-0"
                          title="Edit Order"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {!order.messaged && order.phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendWhatsApp(order.customer_id, `${order.first_name} ${order.last_name}`)}
                            className="h-8 w-8 p-0 text-green-600"
                            title="Send WhatsApp Message"
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {orders.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Showing {Math.min((currentPage - 1) * 100 + 1, totalCount)} to {Math.min(currentPage * 100, totalCount)} of {totalCount} orders
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600 px-2">Page {currentPage} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Order - {editingOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {editingOrder && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Calling Status</label>
                  <Select
                    value={editingOrder.calling_status}
                    onValueChange={(v) => setEditingOrder({ ...editingOrder, calling_status: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOT_CALLED">Not Called</SelectItem>
                      <SelectItem value="CALLED">Called</SelectItem>
                      <SelectItem value="NO_ANSWER">No Answer</SelectItem>
                      <SelectItem value="BUSY">Busy</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Confirmation Status</label>
                  <Select
                    value={editingOrder.confirmation_status}
                    onValueChange={(v) => setEditingOrder({ ...editingOrder, confirmation_status: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PURCHASED">Purchased</SelectItem>
                      <SelectItem value="NOT_PURCHASED">Not Purchased</SelectItem>
                      <SelectItem value="CANCELED">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editingOrder.confirmation_status === "PURCHASED" && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Dubai Tracking Number</label>
                  <Input
                    value={editingOrder.dubai_tracking_number}
                    onChange={(e) => setEditingOrder({ ...editingOrder, dubai_tracking_number: e.target.value })}
                    placeholder="e.g., DXB123456789"
                    className="mt-1"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <Input
                  value={editingOrder.confirmation_notes}
                  onChange={(e) => setEditingOrder({ ...editingOrder, confirmation_notes: e.target.value })}
                  placeholder="Add any notes about the call..."
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveOrder} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk WhatsApp Dialog */}
      <Dialog open={bulkWhatsAppDialog} onOpenChange={setBulkWhatsAppDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send WhatsApp Messages</DialogTitle>
            <DialogDescription>
              Send message to {selectedOrders.length} selected customer{selectedOrders.length > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Message Template
              </label>
              <Select value={whatsappTemplate} onValueChange={setWhatsappTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order_ready">✅ Order Ready</SelectItem>
                  <SelectItem value="flash_sale">⚡ Flash Sale</SelectItem>
                  <SelectItem value="stock_alert">📦 Stock Alert</SelectItem>
                  <SelectItem value="payment_reminder">💰 Payment Reminder</SelectItem>
                  <SelectItem value="new_arrivals">🆕 New Arrivals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Messages will be sent to customers with valid phone numbers.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkWhatsAppDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendBulkWhatsApp} className="bg-green-600 hover:bg-green-700">
              <MessageCircle className="w-4 h-4 mr-2" />
              Send Messages
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Details Modal */}
      {viewingCard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeCardView}>
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {viewingCard === 'total' && '📦 All Orders'}
                  {viewingCard === 'notCalled' && '📞 Not Called'}
                  {viewingCard === 'called' && '✅ Called'}
                  {viewingCard === 'purchased' && '🛒 Purchased'}
                  {viewingCard === 'notPurchased' && '❌ Not Purchased'}
                  {viewingCard === 'canceled' && '🚫 Canceled'}
                  {viewingCard === 'inStock' && '✅ In Stock'}
                  {viewingCard === 'outOfStock' && '❌ Out of Stock'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{cardData.length} orders found</p>
              </div>
              <Button variant="outline" onClick={closeCardView}>
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cardData.map((order, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-lg text-gray-900">#{order.order_number}</div>
                        <div className="text-sm text-gray-600">{order.first_name} {order.last_name}</div>
                      </div>
                      {getConfirmationBadge(order.confirmation_status || "PENDING")}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        {order.phone || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-gray-400" />
                        {getStockBadge(order.stock_status || "unknown")}
                      </div>
                      <div className="text-gray-600">
                        Calling: {getCallingBadge(order.calling_status || "NOT_CALLED")}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingOrder(order);
                          setEditDialog(true);
                          closeCardView();
                        }}
                        className="flex-1"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      {order.phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendWhatsApp(order.customer_id, order.first_name)}
                          className="flex-1 text-green-600 border-green-200"
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          WhatsApp
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {cardData.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No orders in this category</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmationTracker;
