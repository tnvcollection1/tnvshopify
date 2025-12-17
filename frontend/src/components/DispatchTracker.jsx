import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
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
  MessageCircle,
  Send,
  Eye,
  RotateCcw,
  CreditCard,
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
import { useStore } from "../contexts/StoreContext";
import { formatCurrency, getCurrency } from '../utils/currency';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper function to get courier name based on order data
const getCourierName = (order) => {
  if (!order) return 'TCS';
  
  if (order.tracking_company) {
    if (order.tracking_company.toUpperCase().includes('DTDC')) return 'DTDC';
    if (order.tracking_company.toUpperCase().includes('TCS')) return 'TCS';
  }
  
  const tracking = order.tracking_number || '';
  if (tracking.match(/^[ID]\d{8}/)) {
    return 'DTDC';
  }
  
  if (order.store_name) {
    const store = order.store_name.toLowerCase();
    if (store === 'tnvcollection' || store === 'ashmiaa' || store === 'asmia') {
      return 'DTDC';
    }
    if (store === 'tnvcollectionpk') {
      return 'TCS';
    }
  }
  
  return 'TCS';
};

const DispatchTracker = () => {
  const { selectedStore: globalStore, getStoreName } = useStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({
    delivery: "all",
    payment: "all",
    year: "all",
    sortBy: "date_desc",
  });
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [syncingTCS, setSyncingTCS] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    inTransit: 0,
    pending: 0,
    returned: 0,
    returnInProcess: 0,
    paymentReceived: 0,
    paymentPending: 0,
    totalTcsCharges: 0,
    totalProfit: 0,
    returnedCharges: 0,
    netProfit: 0,
  });
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
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
  
  // WhatsApp states
  const [whatsappDialog, setWhatsappDialog] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [selectedWhatsappOrder, setSelectedWhatsappOrder] = useState(null);

  // Clickable cards states
  const [viewingCard, setViewingCard] = useState(null);
  const [cardData, setCardData] = useState([]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // 500ms delay
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchOrders();
    fetchAutoSyncStatus();
    
    const interval = setInterval(fetchAutoSyncStatus, 30000);
    return () => clearInterval(interval);
  }, [currentPage, filters, dateRange, globalStore, debouncedSearch]);

  useEffect(() => {
    if (currentPage > 1) {
      setCurrentPage(1);
    }
  }, [filters.delivery, filters.payment, filters.year, filters.sortBy, globalStore, debouncedSearch]);

  const handleTCSSync = async () => {
    setSyncingTCS(true);
    try {
      toast.info('Starting TCS tracking sync...');
      const response = await axios.post(`${API}/tcs/sync-all`);
      if (response.data.success) {
        toast.success(`TCS sync complete! Updated ${response.data.synced_count || 0} orders`);
        fetchOrders();
      } else {
        toast.warning('TCS sync completed with some issues');
      }
    } catch (error) {
      console.error('TCS sync error:', error);
      toast.error('Failed to sync TCS tracking');
    } finally {
      setSyncingTCS(false);
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

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedOrders(orders.map(o => o.customer_id));
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

  const viewCardDetails = (cardType) => {
    // Set the delivery filter to fetch from API - this updates the main table
    let deliveryFilter = "all";
    switch(cardType) {
      case 'delivered': 
        deliveryFilter = "DELIVERED";
        break;
      case 'inTransit': 
        deliveryFilter = "IN_TRANSIT";
        break;
      case 'pending': 
        deliveryFilter = "PENDING";
        break;
      case 'returned': 
        deliveryFilter = "RETURNED";
        break;
      case 'returnInProcess': 
        deliveryFilter = "RETURN_IN_PROCESS";
        break;
      case 'total':
      default:
        deliveryFilter = "all";
        break;
    }
    
    // Update the filter which will trigger a new API call via useEffect
    setFilters(prev => ({ ...prev, delivery: deliveryFilter }));
    setCurrentPage(1);
  };

  const closeCardView = () => {
    setViewingCard(null);
    setCardData([]);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("fulfillment_status", "fulfilled");
      params.append("tcs_only", "true"); // Exclude China Post orders (shown in Purchase Tracker)
      
      if (!dateRange.start && filters.year === "all") {
        const startDate = new Date('2016-01-01').toISOString().split('T')[0];
        params.append("start_date", startDate);
      }
      
      if (filters.delivery !== "all") params.append("delivery_status", filters.delivery);
      if (filters.payment !== "all") params.append("payment_status", filters.payment);
      if (globalStore !== "all") params.append("store_name", globalStore);
      if (filters.year !== "all") params.append("year", filters.year);
      if (dateRange.start) params.append("start_date", dateRange.start);
      if (dateRange.end) params.append("end_date", dateRange.end);
      
      const sortBy = filters.sortBy || "date_desc";
      params.append("sort_by", sortBy);
      
      if (debouncedSearch) params.append("search", debouncedSearch);
      params.append("page", currentPage);
      params.append("limit", "100");

      const [ordersResponse, statsResponse] = await Promise.all([
        axios.get(`${API}/customers?${params.toString()}`),
        axios.get(`${API}/customers/stats?${params.toString()}`)
      ]);
      
      const allOrders = Array.isArray(ordersResponse.data) ? ordersResponse.data : ordersResponse.data.customers || [];
      const statsData = statsResponse.data;
      
      setOrders(allOrders);
      
      setStats({
        total: statsData.total || 0,
        delivered: statsData.delivered || 0,
        inTransit: statsData.inTransit || 0,
        pending: statsData.pending || 0,
        returned: statsData.returned || 0,
        returnInProcess: statsData.returnInProcess || 0,
        paymentReceived: statsData.paymentReceived || 0,
        paymentPending: statsData.paymentPending || 0,
      });
      
      setTotalPages(Math.ceil(statsData.total / 100));
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

  const handleOpenWhatsApp = (order) => {
    setSelectedWhatsappOrder(order);
    const defaultMessage = `Hello ${order.first_name},\n\nYour order #${order.order_number} update:\nTracking: ${order.tracking_number}\nStatus: ${order.delivery_status}\n\nThank you for shopping with us!`;
    setWhatsappMessage(defaultMessage);
    setWhatsappDialog(true);
  };

  const handleSendWhatsApp = async () => {
    if (!selectedWhatsappOrder || !whatsappMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSendingWhatsapp(true);
    try {
      const response = await axios.post(`${API}/whatsapp/send`, {
        phone: selectedWhatsappOrder.phone,
        message: whatsappMessage
      });

      if (response.data.success) {
        toast.success("✅ WhatsApp message sent successfully!");
        setWhatsappDialog(false);
        setWhatsappMessage("");
        setSelectedWhatsappOrder(null);
      } else {
        toast.error(`Failed: ${response.data.error}`);
      }
    } catch (error) {
      console.error("WhatsApp send error:", error);
      toast.error("Failed to send WhatsApp message");
    } finally {
      setSendingWhatsapp(false);
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
      if (response.data && response.data.success && response.data.tracking) {
        setTrackingData(response.data.tracking);
      } else if (response.data && response.data.tracking_data) {
        setTrackingData(response.data.tracking_data);
      } else if (response.data) {
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
        PREPAID: "bg-blue-100 text-blue-800 border-blue-200",
        PAID: "bg-green-100 text-green-800 border-green-200", 
        PARTIAL: "bg-orange-100 text-orange-800 border-orange-200",
        COLLECTED: "bg-purple-100 text-purple-800 border-purple-200",
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
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Dispatch Tracker</h1>
            <p className="text-sm text-gray-500 mt-1">Track dispatched orders and monitor delivery & COD payment status</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600">
              📍 {getStoreName(globalStore)}
            </div>
            <Button
              variant="outline"
              onClick={handleSyncTCS}
              disabled={syncingTCS}
              className="h-9 text-sm border-gray-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncingTCS ? 'animate-spin' : ''}`} />
              {syncingTCS ? 'Syncing...' : 'Sync TCS'}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6">
        <div className="grid grid-cols-8 gap-4 mb-6">
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
            onClick={() => viewCardDetails('delivered')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Delivered</p>
                <p className="text-xl font-semibold text-green-600">{stats.delivered}</p>
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => viewCardDetails('inTransit')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Transit</p>
                <p className="text-xl font-semibold text-blue-600">{stats.inTransit}</p>
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => viewCardDetails('pending')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-xl font-semibold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => viewCardDetails('returned')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <RotateCcw className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Returned</p>
                <p className="text-xl font-semibold text-red-600">{stats.returned}</p>
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => viewCardDetails('returnInProcess')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Hand className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Return Process</p>
                <p className="text-xl font-semibold text-amber-600">{stats.returnInProcess}</p>
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => viewCardDetails('paymentReceived')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Paid</p>
                <p className="text-xl font-semibold text-emerald-600">{stats.paymentReceived}</p>
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => viewCardDetails('paymentPending')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Due</p>
                <p className="text-xl font-semibold text-orange-600">{stats.paymentPending}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by order #, customer, tracking..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-300 bg-white"
            />
          </div>
          <Select value={filters.delivery} onValueChange={(v) => setFilters({ ...filters, delivery: v })}>
            <SelectTrigger className="w-40 border-gray-300 bg-white">
              <SelectValue placeholder="Delivery" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Delivery</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
              <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="RETURNED">Returned</SelectItem>
              <SelectItem value="RETURN_IN_PROCESS">Return in Process</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.payment} onValueChange={(v) => setFilters({ ...filters, payment: v })}>
            <SelectTrigger className="w-32 border-gray-300 bg-white">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
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

        {/* Date Range & Sync Actions */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateRange({start: '', end: ''})}
            className="text-gray-600"
          >
            Clear Dates
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncTCSOneByOne}
            disabled={loading}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Sync One-by-One
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncPayment}
            disabled={loading}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Sync Payments
          </Button>
          <label htmlFor="tcs-payment-upload">
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("tcs-payment-upload").click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload TCS
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

        {/* Auto-Sync Status */}
        {autoSyncStatus && (
          <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-lg w-fit">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-800">Auto-Sync Active</span>
            <span className="text-sm text-green-700 ml-2">
              Synced today: {autoSyncStatus.synced_today} | Pending: {autoSyncStatus.pending_sync}
            </span>
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
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </TableHead>
                <TableHead className="font-medium">Date</TableHead>
                <TableHead className="font-medium">Order #</TableHead>
                <TableHead className="font-medium">Store</TableHead>
                <TableHead className="font-medium">Customer</TableHead>
                <TableHead className="font-medium">Phone</TableHead>
                <TableHead className="font-medium">Tracking #</TableHead>
                <TableHead className="font-medium">Current Status</TableHead>
                <TableHead className="font-medium">Payment</TableHead>
                <TableHead className="font-medium">COD Amount</TableHead>
                <TableHead className="font-medium">Weight</TableHead>
                <TableHead className="font-medium">TCS</TableHead>
                <TableHead className="font-medium">Net Profit</TableHead>
                <TableHead className="font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-12 text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No orders found</h3>
                    <p>Try adjusting your filters or search</p>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.customer_id} className="hover:bg-gray-50">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.customer_id)}
                        onChange={() => handleSelectOrder(order.customer_id)}
                        className="w-4 h-4 cursor-pointer"
                      />
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
                    <TableCell className="text-sm font-mono text-gray-600">
                      {order.tracking_number || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          {getStatusBadge(order.delivery_status || "PENDING", "delivery")}
                          {order.tracking_number && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleShowTracking(order)}
                              className="h-5 w-5 p-0 text-blue-600"
                              title="Track via TCS API"
                            >
                              <Truck className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        {order.current_location && (
                          <span className="text-xs text-gray-500">📍 {order.current_location}</span>
                        )}
                        {order.last_auto_sync && (
                          <span className="text-xs text-gray-400">
                            Updated: {new Date(order.last_auto_sync).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.payment_status || "pending", "payment")}</TableCell>
                    <TableCell className="font-semibold text-gray-900">
                      {formatCurrency(order.cod_amount || order.total_spent || 0, order.store_name)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {order.tcs_weight ? `${order.tcs_weight} kg` : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {order.tcs_charges ? `Rs.${order.tcs_charges}` : '-'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {(() => {
                        const salePrice = parseFloat(order.cod_amount || order.total_spent || 0);
                        const cost = parseFloat(order.cost || order.order_cost || 0);
                        const tcsCharges = parseFloat(order.tcs_charges || 0);
                        const netProfit = salePrice - cost - tcsCharges;
                        if (cost > 0) {
                          return (
                            <span className={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {netProfit >= 0 ? '+' : ''}Rs.{netProfit.toLocaleString()}
                            </span>
                          );
                        }
                        return <span className="text-gray-400">-</span>;
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditOrder(order)}
                          className="h-8 w-8 p-0"
                          title="Edit Order"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleShowTracking(order)}
                          className="h-8 w-8 p-0 text-blue-600"
                          title="Track Order"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenWhatsApp(order)}
                          className="h-8 w-8 p-0 text-green-600"
                          title="Send WhatsApp"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
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
              Showing {Math.min((currentPage - 1) * 100 + 1, stats.total)} to {Math.min(currentPage * 100, stats.total)} of {stats.total} orders
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

      {/* Tracking Dialog */}
      <Dialog open={trackingDialog} onOpenChange={setTrackingDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              Real-Time Tracking
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-semibold text-blue-900">Order:</span>
                    <span className="ml-2 text-blue-800">#{selectedOrder.order_number}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-900">Tracking:</span>
                    <span className="ml-2 text-blue-800 font-mono">{selectedOrder.tracking_number}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-900">Customer:</span>
                    <span className="ml-2 text-blue-800">{selectedOrder.first_name} {selectedOrder.last_name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-900">Phone:</span>
                    <span className="ml-2 text-blue-800">{selectedOrder.phone}</span>
                  </div>
                </div>
              </div>

              {loadingTracking && (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                  <p className="text-gray-600">Fetching real-time tracking data...</p>
                </div>
              )}

              {trackingData?.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-red-800">{trackingData.error}</p>
                </div>
              )}

              {trackingData && !trackingData.error && !loadingTracking && (
                <div className="space-y-4">
                  {trackingData.normalized_status !== 'UNKNOWN' && (
                    <div className="bg-white border-2 border-blue-300 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg text-gray-900">Current Status</h3>
                        {trackingData.is_delivered && (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                            ✓ Delivered
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <p className="font-semibold text-gray-900">{trackingData.status || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Location</p>
                          <p className="font-semibold text-gray-900">{trackingData.current_location || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {trackingData.checkpoints && trackingData.checkpoints.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 mb-3">Tracking Timeline</h3>
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                        <div className="space-y-4">
                          {trackingData.checkpoints.map((checkpoint, index) => (
                            <div key={index} className="relative pl-12">
                              <div className={`absolute left-2 w-4 h-4 rounded-full border-2 ${
                                index === 0 
                                  ? 'bg-blue-600 border-blue-600' 
                                  : 'bg-white border-gray-400'
                              }`}></div>
                              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900">{checkpoint.status}</p>
                                    {checkpoint.recievedby && (
                                      <p className="text-sm text-gray-600 mt-1">📍 {checkpoint.recievedby}</p>
                                    )}
                                  </div>
                                  <div className="text-right ml-4">
                                    <p className="text-sm text-gray-600">{checkpoint.datetime}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackingDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Dialog */}
      <Dialog open={whatsappDialog} onOpenChange={setWhatsappDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <MessageCircle className="w-5 h-5" />
              Send WhatsApp Message
            </DialogTitle>
          </DialogHeader>
          
          {selectedWhatsappOrder && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  Customer: {selectedWhatsappOrder.first_name} {selectedWhatsappOrder.last_name}
                </p>
                <p className="text-sm text-gray-600">
                  Phone: {selectedWhatsappOrder.phone}
                </p>
                <p className="text-sm text-gray-600">
                  Order: #{selectedWhatsappOrder.order_number}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Message
                </label>
                <Textarea
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={6}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWhatsappDialog(false)}
              disabled={sendingWhatsapp}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendWhatsApp}
              disabled={sendingWhatsapp}
              className="bg-green-600 hover:bg-green-700"
            >
              {sendingWhatsapp ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
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
                  {viewingCard === 'delivered' && '✅ Delivered Orders'}
                  {viewingCard === 'inTransit' && '🚚 In Transit'}
                  {viewingCard === 'pending' && '⏳ Pending Orders'}
                  {viewingCard === 'returned' && '↩️ Returned Orders'}
                  {viewingCard === 'paymentReceived' && '💳 Paid Orders'}
                  {viewingCard === 'paymentPending' && '💰 Payment Due'}
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
                      {getStatusBadge(order.delivery_status || "PENDING", "delivery")}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        {order.phone || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Package className="w-4 h-4" />
                        {order.tracking_number || 'No tracking'}
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <DollarSign className="w-4 h-4" />
                        ₹{order.cod_amount?.toFixed(0) || order.total_spent?.toFixed(0) || "0"}
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenWhatsApp(order)}
                        className="flex-1 text-green-600 border-green-200"
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />
                        WhatsApp
                      </Button>
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

export default DispatchTracker;
