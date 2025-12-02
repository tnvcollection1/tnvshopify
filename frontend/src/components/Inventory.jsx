import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload,
  Package,
  AlertCircle,
  Search,
  Download,
  RefreshCw,
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

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState("all");
  const [stores, setStores] = useState([]);
  const [stats, setStats] = useState({
    totalSKUs: 0,
    totalQuantity: 0,
    lowStock: 0,
    outOfStock: 0,
  });

  useEffect(() => {
    fetchStores();
    fetchInventory();
  }, [selectedStore]);

  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API}/stores`);
      setStores(response.data || []);
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStore !== "all") params.append("store_name", selectedStore);

      const response = await axios.get(`${API}/inventory/items?${params.toString()}`);
      const items = response.data.items || [];
      setInventory(items);

      // Calculate stats
      const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const lowStock = items.filter((item) => item.quantity > 0 && item.quantity <= 5).length;
      const outOfStock = items.filter((item) => item.quantity === 0).length;

      setStats({
        totalSKUs: items.length,
        totalQuantity: totalQty,
        lowStock,
        outOfStock,
      });
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleInventoryUpload = async (event, storeName) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!storeName || storeName === "all") {
      toast.error("Please select a specific store before uploading");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      toast.info("Uploading inventory...");
      const response = await axios.post(`${API}/inventory/upload/${storeName}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        toast.success(
          `✅ ${response.data.message}\n${response.data.items_added} items added, ${response.data.items_updated} updated`
        );
        await fetchInventory();
      }
    } catch (error) {
      console.error("Inventory upload error:", error);
      toast.error(error.response?.data?.detail || "Failed to upload inventory");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const filteredInventory = inventory.filter((item) =>
    searchQuery
      ? item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const getStockBadge = (quantity) => {
    if (quantity === 0) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">Out of Stock</Badge>;
    } else if (quantity <= 5) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Low Stock</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800 border-green-200">In Stock</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Inventory</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your product stock levels</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-48 border-gray-300">
                <SelectValue placeholder="Select Store" />
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
            <Button
              variant="outline"
              onClick={fetchInventory}
              disabled={loading}
              className="border-gray-300 hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <label htmlFor="inventory-upload">
              <Button
                variant="default"
                disabled={uploading || selectedStore === "all"}
                className="bg-green-600 hover:bg-green-700"
                onClick={() => document.getElementById("inventory-upload").click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Stock Sheet
              </Button>
            </label>
            <input
              id="inventory-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleInventoryUpload(e, selectedStore)}
              className="hidden"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Total SKUs</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalSKUs}</p>
                </div>
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Total Quantity</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalQuantity}</p>
                </div>
                <Package className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.lowStock}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{stats.outOfStock}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-300"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="p-8">
        <Card className="border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700">SKU</TableHead>
                    <TableHead className="font-semibold text-gray-700">Size</TableHead>
                    <TableHead className="font-semibold text-gray-700">Color</TableHead>
                    <TableHead className="font-semibold text-gray-700">Cost</TableHead>
                    <TableHead className="font-semibold text-gray-700">Box No</TableHead>
                    <TableHead className="font-semibold text-gray-700">Store</TableHead>
                    <TableHead className="font-semibold text-gray-700">Quantity</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Loading inventory...
                      </TableCell>
                    </TableRow>
                  ) : filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        {selectedStore === "all"
                          ? "Select a store and upload inventory"
                          : "No inventory items found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((item) => (
                      <TableRow key={item._id || item.sku} className="hover:bg-gray-50">
                        <TableCell className="font-medium font-mono text-gray-900">
                          {item.sku}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{item.size || "N/A"}</TableCell>
                        <TableCell className="text-sm text-gray-600">{item.color || "N/A"}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {item.cost ? `$${item.cost}` : "N/A"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{item.box_no || "N/A"}</TableCell>
                        <TableCell className="text-sm text-gray-600">{item.store_name}</TableCell>
                        <TableCell className="font-semibold text-gray-900">{item.quantity}</TableCell>
                        <TableCell>{getStockBadge(item.quantity)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Inventory;
