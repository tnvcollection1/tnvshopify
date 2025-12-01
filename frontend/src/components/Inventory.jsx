import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Package, 
  Upload, 
  Plus, 
  Search,
  AlertTriangle,
  TrendingDown,
  Edit,
  History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalSKUs: 0,
    totalStock: 0,
    lowStock: 0,
    outOfStock: 0
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    sku: '',
    product_name: '',
    opening_stock: 0,
    reorder_level: 5
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/inventory`);
      setInventory(response.data.inventory || []);
      setStats(response.data.stats || stats);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      toast.info('Uploading inventory...');
      const response = await axios.post(`${API}/inventory/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        toast.success(`✅ ${response.data.message}`);
        fetchInventory();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload inventory');
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.sku || !newProduct.product_name) {
      toast.error('SKU and Product Name are required');
      return;
    }

    try {
      const response = await axios.post(`${API}/inventory/add`, newProduct);
      if (response.data.success) {
        toast.success('✅ Product added successfully');
        setShowAddModal(false);
        setNewProduct({ sku: '', product_name: '', opening_stock: 0, reorder_level: 5 });
        fetchInventory();
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    }
  };

  const handleStockAdjustment = async (sku, adjustment, reason) => {
    try {
      const response = await axios.post(`${API}/inventory/adjust`, {
        sku,
        adjustment,
        reason
      });
      
      if (response.data.success) {
        toast.success('✅ Stock adjusted');
        fetchInventory();
      }
    } catch (error) {
      toast.error('Failed to adjust stock');
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (currentStock, reorderLevel) => {
    if (currentStock === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700' };
    if (currentStock <= reorderLevel) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track and manage your product inventory
            </p>
          </div>
          
          <div className="flex gap-3">
            <input
              type="file"
              id="inventory-upload"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              className="hidden"
            />
            <Button
              onClick={() => document.getElementById('inventory-upload').click()}
              className="bg-gray-800 hover:bg-gray-900"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Excel
            </Button>
            
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total SKUs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-gray-900">{stats.totalSKUs}</span>
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-green-600">{stats.totalStock}</span>
                <TrendingDown className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Low Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-yellow-600">{stats.lowStock}</span>
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Out of Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-red-600">{stats.outOfStock}</span>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by SKU or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Inventory Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">SKU</TableHead>
                  <TableHead className="font-semibold">Product Name</TableHead>
                  <TableHead className="font-semibold">Opening Stock</TableHead>
                  <TableHead className="font-semibold">Current Stock</TableHead>
                  <TableHead className="font-semibold">Sold</TableHead>
                  <TableHead className="font-semibold">Reorder Level</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
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
                      No inventory items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map((item) => {
                    const status = getStockStatus(item.current_stock, item.reorder_level);
                    return (
                      <TableRow key={item.sku}>
                        <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.opening_stock}</TableCell>
                        <TableCell className="font-bold">{item.current_stock}</TableCell>
                        <TableCell className="text-gray-600">{item.sold_quantity || 0}</TableCell>
                        <TableCell>{item.reorder_level}</TableCell>
                        <TableCell>
                          <Badge className={status.color}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {/* Adjust stock modal */}}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Adjust
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {/* View history */}}
                            >
                              <History className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add New Product</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">SKU *</label>
                <Input
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                  placeholder="e.g., SHOE-001"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Product Name *</label>
                <Input
                  value={newProduct.product_name}
                  onChange={(e) => setNewProduct({...newProduct, product_name: e.target.value})}
                  placeholder="e.g., Running Shoes Size 42"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Opening Stock</label>
                <Input
                  type="number"
                  value={newProduct.opening_stock}
                  onChange={(e) => setNewProduct({...newProduct, opening_stock: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Reorder Level</label>
                <Input
                  type="number"
                  value={newProduct.reorder_level}
                  onChange={(e) => setNewProduct({...newProduct, reorder_level: parseInt(e.target.value)})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleAddProduct} className="flex-1 bg-green-600 hover:bg-green-700">
                  Add Product
                </Button>
                <Button onClick={() => setShowAddModal(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Inventory;
