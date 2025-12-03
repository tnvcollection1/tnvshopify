import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  Upload,
  Edit,
  Save,
  X,
  Check,
  Clock,
  Package,
  Truck,
  DollarSign,
  Phone,
  ChevronLeft,
  ChevronRight,
  Hand,
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DispatchTracker = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    delivery: "all",
    payment: "all",
    store: "all",
    year: "all",
    sortBy: "date_desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    inTransit: 0,
    pending: 0,
    returned: 0,
    paymentReceived: 0,
    paymentPending: 0,
  });
  const [stores, setStores] = useState([]);
  const [autoSyncStatus, setAutoSyncStatus] = useState(null);
  const [manualStatusDialog, setManualStatusDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [manualStatus, setManualStatus] = useState({
    status: '',
    location: ''
  });
  const [trackingDialog, setTrackingDialog] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editDialog, setEditDialog] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchStores();
    fetchAutoSyncStatus();
    
    // Refresh auto-sync status every 30 seconds
    const interval = setInterval(fetchAutoSyncStatus, 30000);
    return () => clearInterval(interval);
  }, [currentPage, filters]);

  // Reset to page 1 when filters change (but not on initial load)
  useEffect(() => {
    if (currentPage > 1) {
      setCurrentPage(1);
    }
  }, [filters.delivery, filters.payment, filters.store, filters.year, filters.sortBy]);

  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API}/stores`);
      // API returns array directly
      setStores(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const fetchAutoSyncStatus = async () => {
    try {
      const response = await axios.get(`${API}/tcs/auto-sync-status`);
      if (response.data.success) {
        setAutoSyncStatus(response.data);
      }
    } catch (error) {
      console.error("Error fetching auto-sync status:", error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // ONLY show fulfilled orders with TCS tracking (exclude X-prefix China tracking)
      params.append("fulfillment_status", "fulfilled");
      params.append("tcs_only", "true");
      
      if (filters.delivery !== "all") params.append("delivery_status", filters.delivery);
      if (filters.payment !== "all") params.append("payment_status", filters.payment);
      if (filters.store !== "all") params.append("store_name", filters.store);
      if (filters.year !== "all") params.append("year", filters.year);
      if (filters.sortBy) params.append("sort_by", filters.sortBy);
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", currentPage);
      params.append("limit", "100");

      // Fetch both orders and count
      const [ordersResponse, countResponse] = await Promise.all([
        axios.get(`${API}/customers?${params.toString()}`),
        axios.get(`${API}/customers/count?${params.toString()}`)
      ]);
      
      const allOrders = Array.isArray(ordersResponse.data) ? ordersResponse.data : ordersResponse.data.customers || [];
      const total = countResponse.data.total || 0;
      
      setOrders(allOrders);
      
      // Calculate stats - use actual total from database
      const delivered = allOrders.filter(c => c.delivery_status === "DELIVERED").length;
      const inTransit = allOrders.filter(c => c.delivery_status === "IN_TRANSIT" || c.delivery_status === "OUT_FOR_DELIVERY").length;
      const pending = allOrders.filter(c => !c.delivery_status || c.delivery_status === "PENDING" || c.delivery_status === "UNKNOWN").length;
      const returned = allOrders.filter(c => c.delivery_status === "RETURNED").length;
      const paymentReceived = allOrders.filter(c => c.cod_payment_status === "RECEIVED" || c.payment_status === "paid").length;
      const paymentPending = allOrders.filter(c => c.cod_payment_status === "PENDING" || c.payment_status === "pending" || !c.cod_payment_status).length;
      
      setStats({
        total: total,  // Show actual total from database
        delivered,
        inTransit,
        pending,
        returned,
        paymentReceived,
        paymentPending,
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
      return_reason: order.return_reason || "",
      remarks: order.remarks || "",
      retail_amount: order.total_spent || 0,
      cost: order.cost || 0,
      tcs_charges: order.tcs_charges || 0,
    });
    setEditDialog(true);
  };

  const handleSaveOrder = async () => {
    try {
      await axios.put(`${API}/customers/${editingOrder.customer_id}`, {
        calling_status: editingOrder.calling_status,
        return_reason: editingOrder.return_reason,
        remarks: editingOrder.remarks,
        retail_amount: parseFloat(editingOrder.retail_amount) || 0,
        cost: parseFloat(editingOrder.cost) || 0,
        tcs_charges: parseFloat(editingOrder.tcs_charges) || 0,
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

  const handleTCSPaymentUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      toast.info("Uploading TCS payment data...");
      const response = await axios.post(`${API}/tcs/upload-payment`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        toast.success(`✅ ${response.data.message}\n${response.data.matched} orders updated`);
        await fetchOrders();
      }
    } catch (error) {
      console.error("TCS payment upload error:", error);
      toast.error("Failed to upload TCS payment data");
    } finally {
      event.target.value = "";
    }
  };

  const handleSyncTCS = async () => {
    try {
      toast.info("Syncing TCS delivery status (batch mode)...");
      const response = await axios.post(`${API}/tcs/sync-all`);
      if (response.data.success) {
        toast.success(`✅ ${response.data.message}\n${response.data.synced_count} orders updated`);
        await fetchOrders();
      }
    } catch (error) {
      console.error("TCS sync error:", error);
      toast.error("Failed to sync TCS status");
    }
  };

  const handleSyncTCSOneByOne = async () => {
    try {
      toast.info("Syncing TCS one-by-one (slower but more reliable)...", { duration: 5000 });
      const response = await axios.post(`${API}/tcs/sync-one-by-one?limit=50&delay=2`);
      if (response.data.success) {
        toast.success(`✅ ${response.data.message}\n${response.data.synced_count} orders updated`);
        await fetchOrders();
      }
    } catch (error) {
      console.error("TCS one-by-one sync error:", error);
      toast.error("Failed to sync TCS status");
    }
  };

  const handleOpenManualStatusUpdate = (order) => {
    setSelectedOrder(order);
    setManualStatus({
      status: order.delivery_status || '',
      location: order.delivery_location || ''
    });
    setManualStatusDialog(true);
  };

  const handleManualStatusUpdate = async () => {
    if (!manualStatus.status) {
      toast.error("Please select a delivery status");
      return;
    }

    try {
      const response = await axios.post(
        `${API}/orders/${selectedOrder.order_number}/manual-delivery-status?status=${manualStatus.status}&location=${encodeURIComponent(manualStatus.location || '')}&updated_by=admin`
      );
      
      if (response.data.success) {
        toast.success(`✅ Delivery status updated to ${manualStatus.status}`);
        setManualStatusDialog(false);
        await fetchOrders();
      }
    } catch (error) {
      console.error("Manual status update error:", error);
      toast.error(error.response?.data?.detail || "Failed to update status");
    }
  };

  const handleMarkReturnReceived = async (order, received) => {
    try {
      const response = await axios.post(
        `${API}/orders/${order.order_number}/mark-return-received?received=${received}&received_by=admin`
      );
      
      if (response.data.success) {
        toast.success(`✅ Return marked as ${received ? 'received' : 'not received'}`);
        await fetchOrders();
      }
    } catch (error) {
      console.error("Mark return error:", error);
      toast.error("Failed to update return status");
    }
  };

  const handleShowTracking = async (order) => {
    if (!order.tracking_number) {
      toast.error("No tracking number available");
      return;
    }

    setSelectedOrder(order);
    setTrackingDialog(true);
    setLoadingTracking(true);
    setTrackingData(null);

    try {
      const response = await axios.post(`${API}/tcs/track/${order.tracking_number}`);
      if (response.data) {
        setTrackingData(response.data);
      }
    } catch (error) {
      console.error("Tracking error:", error);
      toast.error("Failed to fetch tracking information");
      setTrackingData({ error: "Failed to fetch tracking data" });
    } finally {
      setLoadingTracking(false);
    }
  };

  const handleSyncPayment = async () => {
    try {
      toast.info("Syncing TCS payment status...");
      const response = await axios.post(`${API}/tcs/sync-payment-status`);
      if (response.data.success) {
        toast.success(`✅ ${response.data.message}\n${response.data.checked} orders checked, ${response.data.paid} payments verified`);
        await fetchOrders();
      }
    } catch (error) {
      console.error("TCS payment sync error:", error);
      toast.error(error.response?.data?.detail || "Failed to sync payment status");
    }
  };

  const getStatusBadge = (status, type) => {
    const variants = {
      fulfillment: {
        fulfilled: "bg-green-100 text-green-800 border-green-200",
        unfulfilled: "bg-yellow-100 text-yellow-800 border-yellow-200",
        partially_fulfilled: "bg-blue-100 text-blue-800 border-blue-200",
      },
      delivery: {
        DELIVERED: "bg-green-100 text-green-800 border-green-200",
        IN_TRANSIT: "bg-blue-100 text-blue-800 border-blue-200",
        OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800 border-purple-200",
        PENDING: "bg-gray-100 text-gray-800 border-gray-200",
        RETURNED: "bg-red-100 text-red-800 border-red-200",
      },
      payment: {
        paid: "bg-green-100 text-green-800 border-green-200",
        pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
        refunded: "bg-red-100 text-red-800 border-red-200",
        RECEIVED: "bg-green-100 text-green-800 border-green-200",
        PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
      },
      calling: {
        CALLED: "bg-green-100 text-green-800 border-green-200",
        NOT_CALLED: "bg-gray-100 text-gray-800 border-gray-200",
        NO_ANSWER: "bg-yellow-100 text-yellow-800 border-yellow-200",
        BUSY: "bg-orange-100 text-orange-800 border-orange-200",
        CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
      },
    };

    const variant = variants[type]?.[status] || "bg-gray-100 text-gray-800 border-gray-200";
    return <Badge variant="outline" className={`${variant} font-medium text-xs`}>{status || "N/A"}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dispatch Tracker (TCS)</h1>
              <p className="text-sm text-gray-500 mt-1">Track TCS dispatched orders - Monitor delivery and COD payment status</p>
            </div>
            
            {/* Auto-Sync Status Badge */}
            {autoSyncStatus && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-green-900">Auto-Sync Active</span>
                </div>
                <div className="text-xs text-green-700 ml-2 border-l border-green-300 pl-2">
                  <div>Synced today: <span className="font-semibold">{autoSyncStatus.synced_today}</span></div>
                  <div>Pending: <span className="font-semibold">{autoSyncStatus.pending_sync}</span></div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSyncTCS}
              disabled={loading}
              className="border-gray-300 hover:bg-gray-50"
              title="Fast batch sync (100 orders)"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Sync TCS (Batch)
            </Button>
            <Button
              variant="outline"
              onClick={handleSyncTCSOneByOne}
              disabled={loading}
              className="border-blue-300 hover:bg-blue-50 text-blue-700"
              title="Slower but more reliable - syncs one by one with 2s delay"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Sync TCS (One-by-One)
            </Button>
            <Button
              variant="outline"
              onClick={handleSyncPayment}
              disabled={loading}
              className="border-gray-300 hover:bg-gray-50"
            >
              <DollarSign className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Sync Payment Status
            </Button>
            <label htmlFor="tcs-payment-upload">
              <Button
                variant="outline"
                className="border-gray-300 hover:bg-gray-50"
                onClick={() => document.getElementById("tcs-payment-upload").click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload TCS Payment
              </Button>
            </label>
            <input
              id="tcs-payment-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleTCSPaymentUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-7 gap-4 mt-6">
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Delivered</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.delivered}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">In Transit</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inTransit}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Returned</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.returned}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Paid</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.paymentReceived}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Due</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{stats.paymentPending}</p>
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
              placeholder="Search by order #, customer name, tracking #, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && fetchOrders()}
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
          <Select value={filters.delivery} onValueChange={(v) => setFilters({ ...filters, delivery: v })}>
            <SelectTrigger className="w-36 border-gray-300">
              <SelectValue placeholder="Delivery" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Delivery</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
              <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="RETURNED">Returned</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.payment} onValueChange={(v) => setFilters({ ...filters, payment: v })}>
            <SelectTrigger className="w-32 border-gray-300">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
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
      </div>

      {/* Orders Table */}
      <div className="p-8">
        <Card className="border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700">Date</TableHead>
                    <TableHead className="font-semibold text-gray-700">Order #</TableHead>
                    <TableHead className="font-semibold text-gray-700">Store</TableHead>
                    <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                    <TableHead className="font-semibold text-gray-700">Phone</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tracking #</TableHead>
                    <TableHead className="font-semibold text-gray-700">Calling Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Delivery Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Shopify Payment</TableHead>
                    <TableHead className="font-semibold text-gray-700">COD Payment</TableHead>
                    <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                    <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                        Loading orders...
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                        No fulfilled orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow key={order.customer_id} className="hover:bg-gray-50">
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
                        <TableCell className="text-sm font-mono text-gray-600">
                          {order.tracking_number || "—"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.calling_status || "NOT_CALLED", "calling")}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.delivery_status || "PENDING", "delivery")}</TableCell>
                        <TableCell>{getStatusBadge(order.payment_status || "pending", "payment")}</TableCell>
                        <TableCell>
                          {getStatusBadge(order.cod_payment_status || "PENDING", "payment")}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">
                          ${order.total_spent?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditOrder(order)}
                              className="border-gray-300 hover:bg-blue-50"
                              title="Edit Order"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenManualStatusUpdate(order)}
                              className="border-green-300 hover:bg-green-50 text-green-700"
                              title="Manual Status Update"
                            >
                              <Hand className="w-3 h-3" />
                            </Button>
                            {order.delivery_status === 'RETURN_IN_PROCESS' && !order.return_received && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkReturnReceived(order, true)}
                                className="border-purple-300 hover:bg-purple-50 text-purple-700"
                                title="Mark Return Received"
                              >
                                <Package className="w-3 h-3" />
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
            Showing {Math.min((currentPage - 1) * 100 + 1, stats.total)} to {Math.min(currentPage * 100, stats.total)} of {stats.total} orders
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
            <DialogTitle>Edit Order - {editingOrder?.order_number}</DialogTitle>
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
                  <label className="text-sm font-medium text-gray-700">Return Reason</label>
                  <Input
                    value={editingOrder.return_reason}
                    onChange={(e) => setEditingOrder({ ...editingOrder, return_reason: e.target.value })}
                    placeholder="e.g., Size issue, Quality issue"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Retail Amount</label>
                  <Input
                    type="number"
                    value={editingOrder.retail_amount}
                    onChange={(e) => setEditingOrder({ ...editingOrder, retail_amount: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Cost</label>
                  <Input
                    type="number"
                    value={editingOrder.cost}
                    onChange={(e) => setEditingOrder({ ...editingOrder, cost: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">TCS Charges</label>
                  <Input
                    type="number"
                    value={editingOrder.tcs_charges}
                    onChange={(e) => setEditingOrder({ ...editingOrder, tcs_charges: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Remarks</label>
                <Textarea
                  value={editingOrder.remarks}
                  onChange={(e) => setEditingOrder({ ...editingOrder, remarks: e.target.value })}
                  placeholder="Add any notes or remarks..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm font-medium text-gray-700">Profit Calculation</p>
                <p className="text-lg font-bold text-green-600 mt-1">
                  ${((editingOrder.retail_amount || 0) - (editingOrder.cost || 0) - (editingOrder.tcs_charges || 0)).toFixed(2)}
                </p>
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

      {/* Manual Delivery Status Update Dialog */}
      <Dialog open={manualStatusDialog} onOpenChange={setManualStatusDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manual Delivery Status Update</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Order:</span> #{selectedOrder.order_number}
                </p>
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Customer:</span> {selectedOrder.first_name} {selectedOrder.last_name}
                </p>
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Tracking:</span> {selectedOrder.tracking_number}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Delivery Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={manualStatus.status}
                  onChange={(e) => setManualStatus({...manualStatus, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Status</option>
                  <option value="PENDING">PENDING</option>
                  <option value="IN_TRANSIT">IN TRANSIT</option>
                  <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="RETURN_IN_PROCESS">RETURN IN PROCESS</option>
                  <option value="RETURNED">RETURNED (Received)</option>
                  <option value="UNKNOWN">UNKNOWN</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Location (Optional)
                </label>
                <Input
                  value={manualStatus.location}
                  onChange={(e) => setManualStatus({...manualStatus, location: e.target.value})}
                  placeholder="Enter city or location"
                />
              </div>

              {(manualStatus.status === 'RETURN_IN_PROCESS' || manualStatus.status === 'RETURNED') && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-900 font-semibold mb-2">Return Information:</p>
                  <p className="text-xs text-amber-800">
                    • RETURN_IN_PROCESS: Item is in transit back to you<br/>
                    • RETURNED: Item has been received at your location
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualStatusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleManualStatusUpdate} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DispatchTracker;
