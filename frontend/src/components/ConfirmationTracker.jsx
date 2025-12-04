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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ConfirmationTracker = () => {
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

  useEffect(() => {
    fetchOrders();
    fetchStores();
  }, [currentPage, filters, searchQuery]);

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
      setTotalCount(total);
      
      // Calculate stats from current page only (for display purposes)
      setStats({
        total: total,  // Show actual total from database
        notCalled: allOrders.filter(c => !c.calling_status || c.calling_status === "NOT_CALLED").length,
        called: allOrders.filter(c => c.calling_status === "CALLED" || c.calling_status === "CONFIRMED").length,
        purchased: allOrders.filter(c => c.confirmation_status === "PURCHASED").length,
        notPurchased: allOrders.filter(c => c.confirmation_status === "NOT_PURCHASED").length,
        canceled: allOrders.filter(c => c.confirmation_status === "CANCELED").length,
        inTransit: allOrders.filter(c => c.dubai_tracking_number).length,
        inStock: allOrders.filter(c => c.stock_status === "in_stock").length,
        outOfStock: allOrders.filter(c => c.stock_status === "out_of_stock").length,
        partialStock: allOrders.filter(c => c.stock_status === "partial").length,
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
                <p className="text-xs font-medium text-gray-500 uppercase">Not Called</p>
                <p className="text-2xl font-bold text-gray-600 mt-1">{stats.notCalled}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Called</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.called}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Purchased</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.purchased}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Not Purchased</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.notPurchased}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Canceled</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{stats.canceled}</p>
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
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        Loading orders...
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        No unfulfilled orders found
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditOrder(order)}
                            className="border-gray-300 hover:bg-blue-50"
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
    </div>
  );
};

export default ConfirmationTracker;
