import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  Upload,
  Download,
  Filter,
  X,
  Check,
  Clock,
  Package,
  Truck,
  DollarSign,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  ExternalLink,
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [filters, setFilters] = useState({
    fulfillment: "all",
    delivery: "all",
    payment: "all",
    store: "all",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    inTransit: 0,
    pending: 0,
    returned: 0,
  });
  const [uploading, setUploading] = useState(false);
  const [stores, setStores] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchStores();
  }, [currentPage, filters]);

  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API}/stores`);
      setStores(response.data || []);
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.fulfillment !== "all") params.append("fulfillment_status", filters.fulfillment);
      if (filters.delivery !== "all") params.append("delivery_status", filters.delivery);
      if (filters.payment !== "all") params.append("payment_status", filters.payment);
      if (filters.store !== "all") params.append("store_name", filters.store);
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", currentPage);
      params.append("limit", "50");

      const response = await axios.get(`${API}/customers?${params.toString()}`);
      const customersData = response.data || [];
      setOrders(customersData);
      setStats({
        total: customersData.length,
        delivered: customersData.filter(c => c.delivery_status === "DELIVERED").length || 0,
        inTransit: customersData.filter(c => c.delivery_status === "IN_TRANSIT").length || 0,
        pending: customersData.filter(c => !c.delivery_status || c.delivery_status === "PENDING").length || 0,
        returned: customersData.filter(c => c.delivery_status === "RETURNED").length || 0,
      });
      setTotalPages(Math.ceil(customersData.length / 50));
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppNotification = async (order) => {
    try {
      // Extract phone number
      let phone = order.phone || order.default_address?.phone;
      if (!phone) {
        toast.error("No phone number found for this customer");
        return;
      }

      // Clean phone number (remove spaces, dashes, etc.)
      phone = phone.replace(/[\s-()]/g, '');
      
      // Add country code if not present (assuming Pakistan +92)
      if (!phone.startsWith('+') && !phone.startsWith('92')) {
        phone = '92' + phone;
      } else if (phone.startsWith('+')) {
        phone = phone.substring(1);
      }

      toast.info("Sending WhatsApp notification...");

      const response = await axios.post(`${API}/whatsapp/send-template`, {
        phone: phone,
        template_name: "order_confirmation_ashmiaa",
        language_code: "en_US",
        body_params: [
          { type: "text", text: `${order.first_name} ${order.last_name}` },
          { type: "text", text: order.order_number || "N/A" },
          { type: "text", text: order.tracking_number || "Will be updated soon" }
        ]
      });

      if (response.data.success) {
        toast.success(`✅ WhatsApp sent to ${order.first_name}!`);
      } else {
        toast.error("Failed to send WhatsApp notification");
      }
    } catch (error) {
      console.error("Error sending WhatsApp:", error);
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || "Failed to send WhatsApp";
      toast.error(errorMsg);
    }
  };

  const toggleSelectOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o.customer_id));
    }
  };

  const getRandomGreeting = () => {
    const greetings = [
      "Hello",
      "Hi",
      "Assalam o Alaikum",
      "Hey",
      "Greetings",
      "Good day"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  const sendBulkWhatsAppToSelected = async () => {
    const ordersToSend = orders.filter(o => 
      selectedOrders.includes(o.customer_id) && (o.phone || o.default_address?.phone)
    );
    
    if (ordersToSend.length === 0) {
      toast.error("No selected orders with phone numbers found");
      return;
    }

    toast.info(`Sending WhatsApp to ${ordersToSend.length} customers...`);
    
    let successCount = 0;
    let failCount = 0;

    for (const order of ordersToSend) {
      try {
        // Get random greeting for each customer
        const greeting = getRandomGreeting();
        
        // Extract phone number
        let phone = order.phone || order.default_address?.phone;
        phone = phone.replace(/[\s-()]/g, '');
        if (!phone.startsWith('+') && !phone.startsWith('92')) {
          phone = '92' + phone;
        } else if (phone.startsWith('+')) {
          phone = phone.substring(1);
        }

        // Get order details - try to extract product link from order
        const orderNumber = order.order_number || order.name || "N/A";
        const trackingLink = order.tracking_number 
          ? `https://footwear-analyzer.emergent.host/tracking/${order.tracking_number}`
          : `https://footwear-analyzer.emergent.host/tracking/${orderNumber}`;

        // Construct message with random greeting
        const message = `${greeting} ${order.first_name}!\n\nYour order #${orderNumber} has been confirmed.\n\nTrack your order: ${trackingLink}\n\nThank you for shopping with us!`;

        // Send via WhatsApp Web format (opens WhatsApp with pre-filled message)
        const whatsappUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');

        successCount++;
        toast.success(`✅ Opened chat ${successCount}/${ordersToSend.length}: ${order.first_name}`);
        
        // Delay to allow user to send message before opening next
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        failCount++;
        console.error(`Error for order ${order.order_number}:`, error);
      }
    }

    toast.success(`✅ Opened ${successCount} WhatsApp chats! ${failCount > 0 ? `${failCount} failed.` : ''}`);
    setSelectedOrders([]); // Clear selection after sending
  };

  const openWhatsAppWeb = () => {
    window.open('https://web.whatsapp.com/', '_blank');
  };

  const openWhatsAppWebWithNumber = (order) => {
    // Extract phone number
    let phone = order.phone || order.default_address?.phone;
    if (!phone) {
      toast.error("No phone number found for this customer");
      return;
    }

    // Clean phone number (remove spaces, dashes, etc.)
    phone = phone.replace(/[\s-()]/g, '');
    
    // Add country code if not present (assuming Pakistan +92)
    if (!phone.startsWith('+') && !phone.startsWith('92')) {
      phone = '92' + phone;
    } else if (phone.startsWith('+')) {
      phone = phone.substring(1);
    }

    // Open WhatsApp Web with pre-filled number
    const url = `https://web.whatsapp.com/send?phone=${phone}`;
    window.open(url, '_blank');
    toast.success(`Opening WhatsApp chat with ${order.first_name} ${order.last_name}`);
  };

  const handleShopifySync = async () => {
    try {
      setLoading(true);
      toast.info("Syncing orders from Shopify...");

      // Sync all stores
      const stores = ["tnvcollection", "tnvcollectionpk", "asmia"];
      let totalSynced = 0;

      for (const store of stores) {
        try {
          const response = await axios.post(`${API}/shopify/sync-fast/${store}`, null, {
            params: { days_back: 30 }
          });
          
          if (response.data.success) {
            totalSynced += response.data.total_synced || 0;
            toast.success(`✅ ${store}: ${response.data.total_synced || 0} orders synced`);
          }
        } catch (error) {
          console.error(`Error syncing ${store}:`, error);
          const errorMsg = error.response?.data?.detail || `Failed to sync ${store}`;
          toast.error(errorMsg);
        }
      }

      toast.success(`🎉 Total: ${totalSynced} orders synced from all stores!`);
      await fetchOrders(); // Refresh the orders list
    } catch (error) {
      console.error("Error syncing Shopify:", error);
      toast.error("Failed to sync orders from Shopify");
    } finally {
      setLoading(false);
    }
  };

  const handleDTDCSync = async () => {
    try {
      setLoading(true);
      toast.info("Syncing DTDC tracking for all orders...");

      const response = await axios.post(`${API}/dtdc/sync-all-tracking`);
      
      if (response.data.success) {
        toast.success(`✅ ${response.data.updated} orders updated! ${response.data.failed} failed.`);
        await fetchOrders(); // Refresh the orders list
      }
    } catch (error) {
      console.error("Error syncing DTDC:", error);
      toast.error(error.response?.data?.detail || "Failed to sync DTDC tracking");
    } finally {
      setLoading(false);
    }
  };

  const handleTCSPaymentUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
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
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSyncTCS = async () => {
    try {
      toast.info("Syncing TCS delivery status...");
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
        partially_refunded: "bg-orange-100 text-orange-800 border-orange-200",
      },
    };

    const variant = variants[type]?.[status] || "bg-gray-100 text-gray-800 border-gray-200";
    return <Badge variant="outline" className={`${variant} font-medium`}>{status || "N/A"}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and track all your orders</p>
          </div>
          <div className="flex items-center gap-3">
            {selectedOrders.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-700">
                  {selectedOrders.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOrders([])}
                  className="h-7 text-xs"
                >
                  Clear
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              onClick={openWhatsAppWeb}
              className="border-green-300 hover:bg-green-50 text-green-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open WhatsApp Web
            </Button>
            <Button
              variant="outline"
              onClick={sendBulkWhatsAppToSelected}
              disabled={loading || selectedOrders.length === 0}
              className="border-green-500 hover:bg-green-600 bg-green-500 text-white hover:text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Send to Selected ({selectedOrders.length})
            </Button>
            <Button
              variant="outline"
              onClick={handleShopifySync}
              disabled={loading}
              className="border-blue-500 hover:bg-blue-50 text-blue-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Sync Shopify Orders
            </Button>
            <Button
              variant="outline"
              onClick={handleDTDCSync}
              disabled={loading}
              className="border-purple-500 hover:bg-purple-50 text-purple-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Sync DTDC Tracking
            </Button>
            <Button
              variant="outline"
              onClick={handleSyncTCS}
              disabled={loading}
              className="border-gray-300 hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Sync TCS Status
            </Button>
            <label htmlFor="tcs-payment-upload">
              <Button
                variant="outline"
                disabled={uploading}
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
        <div className="grid grid-cols-5 gap-4 mt-6">
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Delivered</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.delivered}</p>
                </div>
                <Check className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">In Transit</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inTransit}</p>
                </div>
                <Truck className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Returned</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{stats.returned}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
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
              placeholder="Search by order #, customer name, tracking #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && fetchOrders()}
              className="pl-10 border-gray-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
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
            <Select value={filters.fulfillment} onValueChange={(v) => setFilters({ ...filters, fulfillment: v })}>
              <SelectTrigger className="w-40 border-gray-300">
                <SelectValue placeholder="Fulfillment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fulfillment</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                <SelectItem value="partially_fulfilled">Partially Fulfilled</SelectItem>
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
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                    <TableHead className="font-semibold text-gray-700 w-12">
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === orders.length && orders.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">Order #</TableHead>
                    <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                    <TableHead className="font-semibold text-gray-700">Date</TableHead>
                    <TableHead className="font-semibold text-gray-700">Store</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tracking #</TableHead>
                    <TableHead className="font-semibold text-gray-700">Fulfillment</TableHead>
                    <TableHead className="font-semibold text-gray-700">Delivery</TableHead>
                    <TableHead className="font-semibold text-gray-700">Payment</TableHead>
                    <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                    <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        Loading orders...
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow 
                        key={order.customer_id} 
                        className={`hover:bg-gray-50 ${selectedOrders.includes(order.customer_id) ? 'bg-green-50' : ''}`}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.customer_id)}
                            onChange={() => toggleSelectOrder(order.customer_id)}
                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">
                          {order.order_number || "N/A"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">
                              {order.first_name} {order.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{order.email}</p>
                            {order.phone && (
                              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                <MessageCircle className="w-3 h-3" />
                                {order.phone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {order.last_order_date
                            ? new Date(order.last_order_date).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {order.store_name || "N/A"}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-gray-600">
                          {order.tracking_number || "N/A"}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.fulfillment_status, "fulfillment")}</TableCell>
                        <TableCell>{getStatusBadge(order.delivery_status, "delivery")}</TableCell>
                        <TableCell>{getStatusBadge(order.payment_status, "payment")}</TableCell>
                        <TableCell className="font-semibold text-gray-900">
                          ${order.total_spent?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendWhatsAppNotification(order)}
                              disabled={!order.phone && !order.default_address?.phone}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title={order.phone || order.default_address?.phone ? "Send template message" : "No phone number"}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openWhatsAppWebWithNumber(order)}
                              disabled={!order.phone && !order.default_address?.phone}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title={order.phone || order.default_address?.phone ? "Open WhatsApp Web chat" : "No phone number"}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
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
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            Showing page {currentPage} of {totalPages}
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
      </div>
    </div>
  );
};

export default Orders;
