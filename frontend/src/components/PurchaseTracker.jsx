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
  Package,
  Plane,
  MapPin,
  Edit,
  Save,
  ChevronLeft,
  ChevronRight,
  Globe,
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

const PurchaseTracker = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    purchase_status: "all",
    store: "all",
    year: "all",
    sortBy: "date_desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    ordered: 0,
    shipped: 0,
    inTransit: 0,
    arrived: 0,
    delivered: 0,
  });
  const [stores, setStores] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const prevFiltersRef = useRef(filters);
  const prevSearchRef = useRef(searchQuery);

  useEffect(() => {
    const filtersChanged = JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters);
    const searchChanged = prevSearchRef.current !== searchQuery;
    
    if ((filtersChanged || searchChanged) && currentPage !== 1) {
      setCurrentPage(1);
      prevFiltersRef.current = filters;
      prevSearchRef.current = searchQuery;
    } else {
      fetchOrders();
      prevFiltersRef.current = filters;
      prevSearchRef.current = searchQuery;
    }
  }, [currentPage, filters, searchQuery]);

  useEffect(() => {
    fetchStores();
  }, []);

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
      // Show orders with tracking numbers starting with 'X' (China Post tracking)
      params.append("china_tracking", "true");
      
      if (filters.purchase_status !== "all") params.append("purchase_status", filters.purchase_status);
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
      setStats({
        total: total,
        ordered: allOrders.filter(c => c.purchase_status === "ORDERED").length,
        shipped: allOrders.filter(c => c.purchase_status === "SHIPPED").length,
        inTransit: allOrders.filter(c => c.purchase_status === "IN_TRANSIT").length,
        arrived: allOrders.filter(c => c.purchase_status === "ARRIVED_PAKISTAN").length,
        delivered: allOrders.filter(c => c.purchase_status === "DELIVERED_WAREHOUSE").length,
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
      purchase_status: order.purchase_status || "ORDERED",
      tracking_number: order.tracking_number || "",
      purchase_cost_pkr: order.purchase_cost_pkr || 0,
      shipping_cost_pkr: order.shipping_cost_pkr || 0,
      customs_duty_pkr: order.customs_duty_pkr || 0,
      purchase_notes: order.purchase_notes || "",
    });
    setEditDialog(true);
  };

  const handleSaveOrder = async () => {
    try {
      await axios.put(`${API}/customers/${editingOrder.customer_id}`, {
        purchase_status: editingOrder.purchase_status,
        tracking_number: editingOrder.tracking_number,
        purchase_cost_pkr: parseFloat(editingOrder.purchase_cost_pkr) || 0,
        shipping_cost_pkr: parseFloat(editingOrder.shipping_cost_pkr) || 0,
        customs_duty_pkr: parseFloat(editingOrder.customs_duty_pkr) || 0,
        purchase_notes: editingOrder.purchase_notes,
      });
      
      toast.success("Purchase order updated successfully");
      setEditDialog(false);
      setEditingOrder(null);
      await fetchOrders();
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    }
  };

  const getPurchaseStatusBadge = (status) => {
    const variants = {
      ORDERED: "bg-blue-100 text-blue-800 border-blue-200",
      SHIPPED: "bg-purple-100 text-purple-800 border-purple-200",
      IN_TRANSIT: "bg-cyan-100 text-cyan-800 border-cyan-200",
      ARRIVED_PAKISTAN: "bg-green-100 text-green-800 border-green-200",
      DELIVERED_WAREHOUSE: "bg-emerald-100 text-emerald-800 border-emerald-200",
    };
    const variant = variants[status] || "bg-gray-100 text-gray-800 border-gray-200";
    const labels = {
      ORDERED: "Ordered",
      SHIPPED: "Shipped from China",
      IN_TRANSIT: "In Transit",
      ARRIVED_PAKISTAN: "Arrived Pakistan",
      DELIVERED_WAREHOUSE: "At Warehouse",
    };
    return <Badge variant="outline" className={`${variant} font-medium text-xs`}>{labels[status] || status || "ORDERED"}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Purchase Tracker (China Post)</h1>
            <p className="text-sm text-gray-500 mt-1">Track orders purchased from China with X-prefix tracking numbers (e.g., XM5XFD030626)</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={fetchOrders}
              disabled={loading}
              className="border-gray-300 hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-6 gap-4 mt-6">
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
                <p className="text-xs font-medium text-gray-500 uppercase">Ordered</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.ordered}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Shipped</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.shipped}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">In Transit</p>
                <p className="text-2xl font-bold text-cyan-600 mt-1">{stats.inTransit}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">Arrived PK</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.arrived}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase">At Warehouse</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.delivered}</p>
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
          <Select value={filters.purchase_status} onValueChange={(v) => setFilters({ ...filters, purchase_status: v })}>
            <SelectTrigger className="w-44 border-gray-300">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ORDERED">Ordered</SelectItem>
              <SelectItem value="SHIPPED">Shipped from China</SelectItem>
              <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
              <SelectItem value="ARRIVED_PAKISTAN">Arrived Pakistan</SelectItem>
              <SelectItem value="DELIVERED_WAREHOUSE">At Warehouse</SelectItem>
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
                    <TableHead className="font-semibold text-gray-700">China Tracking</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Purchase Cost</TableHead>
                    <TableHead className="font-semibold text-gray-700">Shipping</TableHead>
                    <TableHead className="font-semibold text-gray-700">Customs</TableHead>
                    <TableHead className="font-semibold text-gray-700">Total Cost</TableHead>
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
                        <div>
                          <p className="text-lg font-medium">No China purchase orders found</p>
                          <p className="text-sm mt-2">Orders with China Post tracking numbers (starting with 'X') will appear here</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => {
                      const totalCost = (order.purchase_cost_pkr || 0) + (order.shipping_cost_pkr || 0) + (order.customs_duty_pkr || 0);
                      const trackingNum = order.tracking_number || "—";
                      return (
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
                          <TableCell className="text-sm font-mono text-gray-600">
                            {trackingNum !== "—" ? (
                              <div className="flex items-center gap-1">
                                <Globe className="w-3 h-3 text-blue-500" />
                                {trackingNum}
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {getPurchaseStatusBadge(order.purchase_status || "ORDERED")}
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900">
                            Rs {(order.purchase_cost_pkr || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            Rs {(order.shipping_cost_pkr || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            Rs {(order.customs_duty_pkr || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-bold text-green-600">
                            Rs {totalCost.toLocaleString()}
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
                      );
                    })
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
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Purchase - Order #{editingOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {editingOrder && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">China Tracking Number</label>
                  <Input
                    value={editingOrder.tracking_number}
                    onChange={(e) => setEditingOrder({ ...editingOrder, tracking_number: e.target.value })}
                    placeholder="e.g., XM5XFD031540"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Purchase Status</label>
                  <Select
                    value={editingOrder.purchase_status}
                    onValueChange={(v) => setEditingOrder({ ...editingOrder, purchase_status: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ORDERED">Ordered</SelectItem>
                      <SelectItem value="SHIPPED">Shipped from China</SelectItem>
                      <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                      <SelectItem value="ARRIVED_PAKISTAN">Arrived Pakistan</SelectItem>
                      <SelectItem value="DELIVERED_WAREHOUSE">At Warehouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Purchase Cost (PKR)</label>
                  <Input
                    type="number"
                    value={editingOrder.purchase_cost_pkr}
                    onChange={(e) => setEditingOrder({ ...editingOrder, purchase_cost_pkr: e.target.value })}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Shipping Cost (PKR)</label>
                  <Input
                    type="number"
                    value={editingOrder.shipping_cost_pkr}
                    onChange={(e) => setEditingOrder({ ...editingOrder, shipping_cost_pkr: e.target.value })}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Customs Duty (PKR)</label>
                  <Input
                    type="number"
                    value={editingOrder.customs_duty_pkr}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customs_duty_pkr: e.target.value })}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-sm font-medium text-gray-700">Total Purchase Cost</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  Rs {(
                    (parseFloat(editingOrder.purchase_cost_pkr) || 0) + 
                    (parseFloat(editingOrder.shipping_cost_pkr) || 0) + 
                    (parseFloat(editingOrder.customs_duty_pkr) || 0)
                  ).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <Textarea
                  value={editingOrder.purchase_notes}
                  onChange={(e) => setEditingOrder({ ...editingOrder, purchase_notes: e.target.value })}
                  placeholder="Add notes about the purchase..."
                  rows={3}
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

export default PurchaseTracker;
