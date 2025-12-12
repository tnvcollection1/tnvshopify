import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
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
  Ship,
  CheckCircle,
  Truck,
  Warehouse,
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PurchaseTracker = () => {
  const { selectedStore: globalStore, getStoreName } = useStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    purchase_status: "all",
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
  const [editingOrder, setEditingOrder] = useState(null);
  const [editDialog, setEditDialog] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [currentPage, filters, searchQuery, globalStore]);

  useEffect(() => {
    if (currentPage > 1) {
      setCurrentPage(1);
    }
  }, [filters.purchase_status, filters.year, filters.sortBy, searchQuery, globalStore]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("china_tracking", "true");
      
      if (filters.purchase_status !== "all") params.append("purchase_status", filters.purchase_status);
      if (globalStore !== "all") params.append("store_name", globalStore);
      if (filters.year !== "all") params.append("year", filters.year);
      if (filters.sortBy) params.append("sort_by", filters.sortBy);
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", currentPage);
      params.append("limit", "100");

      const [ordersResponse, countResponse] = await Promise.all([
        axios.get(`${API}/customers?${params.toString()}`),
        axios.get(`${API}/customers/count?${params.toString()}`)
      ]);
      
      const allOrders = Array.isArray(ordersResponse.data) ? ordersResponse.data : ordersResponse.data.customers || [];
      const total = countResponse.data.total || 0;
      
      setOrders(allOrders);
      
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
      SHIPPED: "Shipped",
      IN_TRANSIT: "In Transit",
      ARRIVED_PAKISTAN: "Arrived PK",
      DELIVERED_WAREHOUSE: "At Warehouse",
    };
    return <Badge variant="outline" className={`${variant} font-medium text-xs`}>{labels[status] || status || "ORDERED"}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Purchase Tracker (China Post)</h1>
            <p className="text-sm text-gray-500 mt-1">Track orders with X-prefix tracking numbers from China</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600">
              📍 {getStoreName(globalStore)}
            </div>
            <Button
              variant="outline"
              onClick={fetchOrders}
              disabled={loading}
              className="h-9 text-sm border-gray-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6">
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
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
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ordered</p>
                <p className="text-xl font-semibold text-blue-600">{stats.ordered}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Ship className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Shipped</p>
                <p className="text-xl font-semibold text-purple-600">{stats.shipped}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-50 rounded-lg">
                <Truck className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Transit</p>
                <p className="text-xl font-semibold text-cyan-600">{stats.inTransit}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Arrived PK</p>
                <p className="text-xl font-semibold text-green-600">{stats.arrived}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Warehouse className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Warehouse</p>
                <p className="text-xl font-semibold text-emerald-600">{stats.delivered}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by order #, customer, tracking #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-300 bg-white"
            />
          </div>
          <Select value={filters.purchase_status} onValueChange={(v) => setFilters({ ...filters, purchase_status: v })}>
            <SelectTrigger className="w-44 border-gray-300 bg-white">
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

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-medium">Date</TableHead>
                <TableHead className="font-medium">Order #</TableHead>
                <TableHead className="font-medium">Store</TableHead>
                <TableHead className="font-medium">Customer</TableHead>
                <TableHead className="font-medium">China Tracking</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium">Purchase Cost</TableHead>
                <TableHead className="font-medium">Shipping</TableHead>
                <TableHead className="font-medium">Customs</TableHead>
                <TableHead className="font-medium">Total Cost</TableHead>
                <TableHead className="font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-gray-500">
                    <Globe className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No China orders found</h3>
                    <p>Orders with China Post tracking (X-prefix) will appear here</p>
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
                      <TableCell className="font-medium text-gray-900">
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
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOrder(order)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {orders.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Showing page {currentPage} of {totalPages}
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
