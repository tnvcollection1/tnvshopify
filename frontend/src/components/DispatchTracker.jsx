import { useState, useEffect } from "react";
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
  const [editingOrder, setEditingOrder] = useState(null);
  const [editDialog, setEditDialog] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchStores();
  }, [currentPage, filters]);

  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API}/stores`);
      setStores(response.data.stores || []);
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // ONLY show fulfilled orders in Dispatch Tracker
      params.append("fulfillment_status", "fulfilled");
      
      if (filters.delivery !== "all") params.append("delivery_status", filters.delivery);
      if (filters.payment !== "all") params.append("payment_status", filters.payment);
      if (filters.store !== "all") params.append("store_name", filters.store);
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", currentPage);
      params.append("limit", "100");

      const response = await axios.get(`${API}/customers?${params.toString()}`);
      const allOrders = Array.isArray(response.data) ? response.data : response.data.customers || [];
      setOrders(allOrders);
      
      // Calculate stats
      setStats({
        total: allOrders.length,
        delivered: allOrders.filter(c => c.delivery_status === "DELIVERED").length,
        inTransit: allOrders.filter(c => c.delivery_status === "IN_TRANSIT" || c.delivery_status === "OUT_FOR_DELIVERY").length,
        pending: allOrders.filter(c => !c.delivery_status || c.delivery_status === "PENDING").length,
        returned: allOrders.filter(c => c.delivery_status === "RETURNED").length,
        paymentReceived: allOrders.filter(c => c.cod_payment_status === "RECEIVED" || c.payment_status === "paid").length,
        paymentPending: allOrders.filter(c => (c.cod_payment_status !== "RECEIVED" && c.payment_status !== "paid") || (!c.cod_payment_status && !c.payment_status)).length,
      });
      
      setTotalPages(Math.ceil(allOrders.length / 50));
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
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dispatch Tracker</h1>
            <p className="text-sm text-gray-500 mt-1">Track fulfilled orders - Monitor delivery and payment status</p>
          </div>
          <div className="flex items-center gap-3">
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
                <SelectItem key={store.name} value={store.name}>
                  {store.name}
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
                    <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                    <TableHead className="font-semibold text-gray-700">Phone</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tracking #</TableHead>
                    <TableHead className="font-semibold text-gray-700">Calling</TableHead>
                    <TableHead className="font-semibold text-gray-700">Delivery</TableHead>
                    <TableHead className="font-semibold text-gray-700">Payment</TableHead>
                    <TableHead className="font-semibold text-gray-700">COD Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                    <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-gray-500">
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
                      <TableRow key={order.customer_id} className="hover:bg-gray-50">
                        <TableCell className="text-sm text-gray-600">
                          {order.last_order_date
                            ? new Date(order.last_order_date).toLocaleDateString()
                            : "N/A"}
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
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {order.phone || "N/A"}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-gray-600">
                          {order.tracking_number || "N/A"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.calling_status || "NOT_CALLED", "calling")}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.delivery_status, "delivery")}</TableCell>
                        <TableCell>{getStatusBadge(order.payment_status, "payment")}</TableCell>
                        <TableCell>
                          {getStatusBadge(order.cod_payment_status || "PENDING", "payment")}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">
                          ${order.total_spent?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditOrder(order)}
                            className="border-gray-300"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
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
    </div>
  );
};

export default DispatchTracker;
