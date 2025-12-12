import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    store: "all",
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
    inTransit: 0,
  });
  const [stores, setStores] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkWhatsAppDialog, setBulkWhatsAppDialog] = useState(false);
  const [whatsappTemplate, setWhatsappTemplate] = useState("order_ready");
  
  // Clickable cards states
  const [viewingCard, setViewingCard] = useState(null);
  const [cardData, setCardData] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchStores();
  }, [currentPage, filters, searchQuery, dateRange]);

  // Reset to page 1 when filters or search change
  useEffect(() => {
    if (currentPage > 1) {
      setCurrentPage(1);
    }
  }, [filters.calling_status, filters.confirmation_status, filters.store, filters.year, filters.sortBy, searchQuery]);

  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API}/stores`);
      // API returns array directly
      setStores(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // ONLY show unfulfilled orders (need confirmation)
      params.append("fulfillment_status", "unfulfilled");
      
      if (filters.calling_status !== "all") params.append("calling_status", filters.calling_status);
      if (filters.confirmation_status !== "all") params.append("confirmation_status", filters.confirmation_status);
      if (filters.stock_status !== "all") params.append("stock_availability", filters.stock_status);
      if (filters.store !== "all") params.append("store_name", filters.store);
      if (filters.year !== "all") params.append("year", filters.year);
      if (filters.sortBy) params.append("sort_by", filters.sortBy);
      if (searchQuery) params.append("search", searchQuery);
      if (dateRange.start) params.append("start_date", dateRange.start);
      if (dateRange.end) params.append("end_date", dateRange.end);
      params.append("page", currentPage);
      params.append("limit", "100");

      // Fetch orders, count, and stock stats with values
      const [ordersResponse, countResponse, stockStatsResponse] = await Promise.all([
        axios.get(`${API}/customers?${params.toString()}`),
        axios.get(`${API}/customers/count?${params.toString()}`),
        axios.get(`${API}/customers/stock-stats?${params.toString()}`)
      ]);
      
      const allOrders = Array.isArray(ordersResponse.data) ? ordersResponse.data : ordersResponse.data.customers || [];
      const total = countResponse.data.total || 0;
      
      setOrders(allOrders);
      setTotalCount(total);
      
      // Calculate page-level stats
      const inStockOrders = allOrders.filter(c => c.stock_status === "in_stock");
      const outOfStockOrders = allOrders.filter(c => c.stock_status === "out_of_stock");
      
      // Get stock stats with SKU-based sale values from backend
      const stockStats = stockStatsResponse.data || {};
      
      setStats({
        total: total,  // Show actual total from database
        notCalled: allOrders.filter(c => !c.calling_status || c.calling_status === "NOT_CALLED").length,
        called: allOrders.filter(c => c.calling_status === "CALLED" || c.calling_status === "CONFIRMED").length,
        purchased: allOrders.filter(c => c.confirmation_status === "PURCHASED").length,
        notPurchased: allOrders.filter(c => c.confirmation_status === "NOT_PURCHASED").length,
        canceled: allOrders.filter(c => c.confirmation_status === "CANCELED").length,
        inTransit: allOrders.filter(c => c.dubai_tracking_number).length,
        inStock: stockStats.in_stock || 0,
        inStockValue: stockStats.in_stock_value || 0,
        outOfStock: stockStats.out_of_stock || 0,
        outOfStockValue: stockStats.out_of_stock_value || 0,
        currency: stockStats.currency || "PKR",  // Store currency from backend
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

  // Clickable card functions
  const viewCardDetails = (cardType) => {
    let filtered = orders.filter(order => {
      switch(cardType) {
        case 'total': return true;
        case 'notCalled': return !order.calling_status || order.calling_status === 'NOT_CALLED';
        case 'called': return order.calling_status === 'CALLED' || order.calling_status === 'NO_ANSWER' || order.calling_status === 'CONFIRMED';
        case 'purchased': return order.confirmation_status === 'PURCHASED';
        case 'notPurchased': return order.confirmation_status === 'NOT_PURCHASED';
        case 'canceled': return order.confirmation_status === 'CANCELED';
        case 'inStock': return order.stock_status === 'in_stock';
        case 'outOfStock': return order.stock_status === 'out_of_stock';
        default: return false;
      }
    });
    setCardData(filtered);
    setViewingCard(cardType);
  };

  const closeCardView = () => {
    setViewingCard(null);
    setCardData([]);
  };

  const handleSyncStockStatus = async () => {
    try {
      toast.loading("Syncing stock status for all unfulfilled orders...");
      const response = await axios.post(`${API}/customers/sync-stock-status`);
      
      if (response.data.success) {
        toast.success(
          `Stock status synced! In Stock: ${response.data.in_stock}, Out of Stock: ${response.data.out_of_stock}`
        );
        await fetchOrders(); // Refresh the orders list
      }
    } catch (error) {
      console.error("Error syncing stock status:", error);
      toast.error("Failed to sync stock status");
    }
  };

  const handleSendWhatsApp = async (customerId, customerName) => {
    try {
      const response = await axios.post(`${API}/customers/${customerId}/send-whatsapp`);
      
      if (response.data.success) {
        toast.success(`WhatsApp message sent to ${customerName}`);
        await fetchOrders(); // Refresh to show updated messaged status
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
    const variant = variants[status] || variants.unknown;
    const label = labels[status] || "Unknown";
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
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Confirmation Tracker</h1>
            <p className="text-sm text-gray-500 mt-1">Call customers and confirm unfulfilled orders before dispatch</p>
          </div>
          <Button
            onClick={handleSyncStockStatus}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Package className="w-4 h-4 mr-2" />
            Sync Stock Status
          </Button>
        </div>

        {/* Stats Cards - Clickable */}
        <div className="grid grid-cols-5 gap-4 mt-6">
          <Card className="border-gray-200 cursor-pointer hover:shadow-lg hover:border-gray-400 transition-all" onClick={() => viewCardDetails('total')}>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 cursor-pointer hover:shadow-lg hover:border-gray-400 transition-all" onClick={() => viewCardDetails('notCalled')}>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Not Called</p>
                <p className="text-2xl font-bold text-gray-600 mt-1">{stats.notCalled}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all" onClick={() => viewCardDetails('called')}>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Called</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.called}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 cursor-pointer hover:shadow-lg hover:border-green-500 transition-all" onClick={() => viewCardDetails('purchased')}>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Purchased</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.purchased}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 cursor-pointer hover:shadow-lg hover:border-orange-500 transition-all" onClick={() => viewCardDetails('canceled')}>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Canceled</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{stats.canceled}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stock Status Cards with Sale Value - Clickable */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Card className="border-green-200 bg-green-50 cursor-pointer hover:shadow-lg hover:border-green-500 transition-all" onClick={() => viewCardDetails('inStock')}>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-green-700 uppercase">✅ In Stock</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.inStock || 0}</p>
                <p className="text-sm text-green-600 mt-1">
                  Sale Value: {stats.currency || "PKR"} {(stats.inStockValue || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50 cursor-pointer hover:shadow-lg hover:border-red-500 transition-all" onClick={() => viewCardDetails('outOfStock')}>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-red-700 uppercase">❌ Out of Stock</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.outOfStock || 0}</p>
                <p className="text-sm text-red-600 mt-1">
                  Sale Value: {stats.currency || "PKR"} {(stats.outOfStockValue || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by order #, customer name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-300"
            />
          </div>
          <Select value={filters.store} onValueChange={(v) => setFilters({ ...filters, store: v })}>
            <SelectTrigger className="w-36 border-gray-300">
              <SelectValue placeholder="Store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.store_name}>
                  {store.store_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.calling_status} onValueChange={(v) => setFilters({ ...filters, calling_status: v })}>
            <SelectTrigger className="w-40 border-gray-300">
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
            <SelectTrigger className="w-40 border-gray-300">
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
            <SelectTrigger className="w-40 border-gray-300">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in_stock">✅ In Stock</SelectItem>
              <SelectItem value="out_of_stock">❌ Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.year} onValueChange={(v) => setFilters({ ...filters, year: v })}>
            <SelectTrigger className="w-32 border-gray-300">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.sortBy} onValueChange={(v) => setFilters({ ...filters, sortBy: v })}>
            <SelectTrigger className="w-40 border-gray-300">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Newest First</SelectItem>
              <SelectItem value="date_asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Date Range Filter */}
        <div className="flex items-center gap-3 px-8 py-3 border-t border-gray-200 bg-gray-50">
          <span className="text-sm font-medium text-gray-600">Filter by Date:</span>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateRange({ start: '', end: '' })}
            className="text-gray-600 hover:bg-gray-100"
          >
            Clear Dates
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedOrders.length > 0 && (
        <div className="px-8 py-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
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
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Send WhatsApp to Selected ({selectedOrders.length})
            </Button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="p-8">
        <Card className="border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700 w-12">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectedOrders.length > 0 && selectedOrders.length === orders.filter(o => !o.messaged && o.phone).length}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">Date</TableHead>
                    <TableHead className="font-semibold text-gray-700">Order #</TableHead>
                    <TableHead className="font-semibold text-gray-700">Store</TableHead>
                    <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                    <TableHead className="font-semibold text-gray-700">Phone</TableHead>
                    <TableHead className="font-semibold text-gray-700">WhatsApp</TableHead>
                    <TableHead className="font-semibold text-gray-700">Stock Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Calling Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Confirmation</TableHead>
                    <TableHead className="font-semibold text-gray-700">Dubai Tracking</TableHead>
                    <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                    <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                        Loading orders...
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                        No unfulfilled orders found
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
                          <Badge variant="outline" className="bg-slate-50">
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
                            <Badge className="bg-green-100 text-green-700 border-green-300">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Sent
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 border-gray-300">
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
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditOrder(order)}
                              className="border-gray-300 hover:bg-blue-50"
                              title="Edit Order"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            {!order.messaged && order.phone && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendWhatsApp(order.customer_id, `${order.first_name} ${order.last_name}`)}
                                className="border-green-300 hover:bg-green-50 text-green-600"
                                title="Send WhatsApp Message"
                              >
                                <Phone className="w-3 h-3" />
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
          </CardContent>
        </Card>

        {/* Pagination */}
        {orders.length > 0 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500">
              Showing {Math.min((currentPage - 1) * 100 + 1, totalCount)} to {Math.min(currentPage * 100, totalCount)} of {totalCount} orders
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-gray-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-gray-300"
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
                  <p className="text-xs text-gray-500 mt-1">Enter tracking number when item is in transit to Dubai</p>
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
                  <SelectItem value="order_ready">
                    ✅ Order Ready - Your order is ready! Confirm within 24 hours
                  </SelectItem>
                  <SelectItem value="flash_sale">
                    ⚡ Flash Sale - Limited time: 20% off on your favorites!
                  </SelectItem>
                  <SelectItem value="stock_alert">
                    📦 Stock Alert - Items you wanted are back in stock
                  </SelectItem>
                  <SelectItem value="payment_reminder">
                    💰 Payment Reminder - Complete your pending order
                  </SelectItem>
                  <SelectItem value="new_arrivals">
                    🆕 New Arrivals - Check out our latest collection
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Messages will be sent to customers with valid phone numbers who have not been messaged yet.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkWhatsAppDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendBulkWhatsApp}
              className="bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Send Messages
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Details Modal */}
      {viewingCard && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeCardView}>
          <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {viewingCard === 'total' && '📦 All Orders'}
                    {viewingCard === 'notCalled' && '📞 Not Called'}
                    {viewingCard === 'called' && '✅ Called'}
                    {viewingCard === 'purchased' && '🛒 Purchased'}
                    {viewingCard === 'notPurchased' && '❌ Not Purchased'}
                    {viewingCard === 'canceled' && '🚫 Canceled'}
                    {viewingCard === 'inStock' && '✅ In Stock'}
                    {viewingCard === 'outOfStock' && '❌ Out of Stock'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">{cardData.length} orders found</p>
                </div>
                <button
                  onClick={closeCardView}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cardData.map((order, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-lg text-gray-900">#{order.order_number}</div>
                        <div className="text-sm text-gray-600">{order.first_name} {order.last_name}</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        order.confirmation_status === 'PURCHASED' ? 'bg-green-100 text-green-800' :
                        order.confirmation_status === 'NOT_PURCHASED' ? 'bg-red-100 text-red-800' :
                        order.confirmation_status === 'CANCELED' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.confirmation_status || 'PENDING'}
                      </div>
                    </div>

                    <div className="space-y-2 mb-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{order.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className={`font-medium ${
                          order.stock_status === 'in_stock' ? 'text-green-600' :
                          order.stock_status === 'out_of_stock' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {order.stock_status === 'in_stock' ? '✅ In Stock' :
                           order.stock_status === 'out_of_stock' ? '❌ Out of Stock' :
                           'Unknown'}
                        </span>
                      </div>
                      <div className="text-gray-600">
                        Calling: <span className={`font-medium ${
                          order.calling_status === 'CALLED' || order.calling_status === 'CONFIRMED' ? 'text-green-600' :
                          order.calling_status === 'NO_ANSWER' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>{order.calling_status || 'NOT_CALLED'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingOrder(order);
                          setEditDialog(true);
                          closeCardView();
                        }}
                        className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                      >
                        <Edit className="w-3 h-3 inline mr-1" />
                        Edit
                      </button>
                      {order.phone && (
                        <button
                          onClick={() => handleSendWhatsApp(order.customer_id, order.first_name)}
                          className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" />
                          WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {cardData.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No orders found in this category</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total: <span className="font-bold">{cardData.length}</span> orders
              </div>
              <button
                onClick={closeCardView}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmationTracker;
