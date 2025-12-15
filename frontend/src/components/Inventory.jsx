import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { 
  Plus, 
  Upload, 
  Edit, 
  Trash2, 
  Package, 
  DollarSign,
  TrendingUp,
  Clock,
  Truck,
  CheckCircle,
  RefreshCw,
  Search,
  Download
} from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { useStore } from '../contexts/StoreContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Inventory = () => {
  console.log("🔍 LOADING: Inventory.jsx with Store-wise Sync");
  const { selectedStore: globalStore, getStoreName } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState([]);
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    store: 'all',
    search: ''
  });
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Dialogs
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [errorsDialog, setErrorsDialog] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);
  
  // Form states
  const [newItem, setNewItem] = useState({
    sku: '',
    product_name: '',
    collection: '',
    cost: '',
    order_number: '',
    store_name: 'tnvcollectionpk'
  });
  const [editingItem, setEditingItem] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    timestamp: new Date().toISOString().slice(0, 16)
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStore, setUploadStore] = useState('tnvcollectionpk'); // Store selection for upload

  // Sync local store filter with global store
  useEffect(() => {
    setFilters(prev => ({ ...prev, store: globalStore }));
  }, [globalStore]);

  // Debounced fetch effect
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchItems();
      // Reset selections when filters change
      setSelectedItems([]);
      setSelectAll(false);
    }, filters.search ? 300 : 0); // Debounce search, immediate for other filters
    
    return () => clearTimeout(timeout);
  }, [filters.store, filters.status, filters.search]);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // Use store from filters (synced with global store)
      if (filters.store !== 'all') params.append('store_name', filters.store);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      const response = await fetch(`${API}/inventory/v2?${params}`);
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await fetch(`${API}/stores`);
      const data = await response.json();
      setStores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const syncShopifyPrices = async () => {
    if (filters.store === 'all') {
      toast.error('Please select a specific store to sync prices');
      return;
    }
    
    setSyncingPrices(true);
    try {
      const params = new URLSearchParams();
      params.append('store_name', filters.store);
      
      // Use sync-shopify-prices endpoint (syncs from orders)
      const response = await fetch(`${API}/inventory/v2/sync-shopify-prices?${params}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`✅ Synced prices for ${data.updated_count} items!`);
        fetchItems(); // Refresh inventory
      } else {
        toast.error(data.message || 'Failed to sync prices');
      }
    } catch (error) {
      console.error('Error syncing prices:', error);
      toast.error('Failed to sync prices');
    } finally {
      setSyncingPrices(false);
    }
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
      setSelectAll(false);
    } else {
      setSelectedItems(items.map(item => item.id));
      setSelectAll(true);
    }
  };

  const handleSelectItem = (itemId) => {
    if (selectedItems.includes(itemId)) {
      const newSelected = selectedItems.filter(id => id !== itemId);
      setSelectedItems(newSelected);
      setSelectAll(false);
    } else {
      const newSelected = [...selectedItems, itemId];
      setSelectedItems(newSelected);
      if (newSelected.length === items.length) {
        setSelectAll(true);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      toast.error('No items selected');
      return;
    }

    if (!window.confirm(`Delete ${selectedItems.length} selected items?`)) {
      return;
    }

    try {
      const deletePromises = selectedItems.map(id =>
        fetch(`${API}/inventory/v2/${id}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      
      toast.success(`${selectedItems.length} items deleted successfully`);
      setSelectedItems([]);
      setSelectAll(false);
      fetchItems();
    } catch (error) {
      console.error('Error deleting items:', error);
      toast.error('Failed to delete some items');
    }
  };

  const handleAddItem = async () => {
    try {
      const response = await fetch(`${API}/inventory/v2/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          cost: parseFloat(newItem.cost) || 0
        })
      });
      
      if (!response.ok) throw new Error('Failed to add item');
      
      toast.success('Inventory item added successfully');
      setAddDialog(false);
      setNewItem({
        sku: '',
        product_name: '',
        collection: '',
        cost: '',
        order_number: '',
        store_name: 'tnvcollectionpk'
      });
      fetchItems();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add inventory item');
    }
  };

  const handleUpdateItem = async () => {
    try {
      const response = await fetch(`${API}/inventory/v2/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cost: parseFloat(editingItem.cost),
          sale_price: parseFloat(editingItem.sale_price),
          status: editingItem.status,
          order_number: editingItem.order_number,
          collection: editingItem.collection
        })
      });
      
      if (!response.ok) throw new Error('Failed to update item');
      
      toast.success('Inventory item updated successfully');
      setEditDialog(false);
      setEditingItem(null);
      fetchItems();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update inventory item');
    }
  };

  const handleAddDeliveryStatus = async () => {
    if (!statusUpdate.status.trim()) {
      toast.error('Please enter a status');
      return;
    }
    
    try {
      const response = await fetch(`${API}/inventory/v2/${editingItem.id}/delivery-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusUpdate)
      });
      
      if (!response.ok) throw new Error('Failed to add status');
      
      toast.success('Delivery status added');
      setStatusDialog(false);
      setStatusUpdate({
        status: '',
        timestamp: new Date().toISOString().slice(0, 16)
      });
      fetchItems();
    } catch (error) {
      console.error('Error adding delivery status:', error);
      toast.error('Failed to add delivery status');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const response = await fetch(`${API}/inventory/v2/${itemId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete item');
      
      toast.success('Inventory item deleted');
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete inventory item');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }
    
    if (!uploadStore || uploadStore === 'all') {
      toast.error('Please select a specific store');
      return;
    }
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      const response = await fetch(`${API}/inventory/v2/upload?store_name=${uploadStore}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.detail || 'Upload failed');
      
      const syncStatus = data.sync_status || {};
      toast.success(
        `✅ ${data.items_added} items uploaded for ${uploadStore}! ` +
        `Synced with ${syncStatus.orders_updated || 0} orders.`
      );
      if (data.errors && data.errors.length > 0) {
        setUploadErrors(data.errors);
        setErrorsDialog(true);
        console.error('Upload errors:', data.errors);
      }
      
      setUploadDialog(false);
      setSelectedFile(null);
      setUploadStore('tnvcollectionpk'); // Reset to default
      fetchItems();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload inventory file');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncInventory = async () => {
    if (filters.store === 'all') {
      toast.error('Please select a specific store to sync');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API}/inventory/sync/${filters.store}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.detail || 'Sync failed');
      
      toast.success(
        `✅ Inventory synced! Updated ${data.orders_updated} orders for ${data.store_name}`
      );
      
      fetchItems();
    } catch (error) {
      console.error('Error syncing inventory:', error);
      toast.error('Failed to sync inventory with orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      in_stock: 'bg-blue-100 text-blue-800 border-blue-200',
      in_transit: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      returned: 'bg-red-100 text-red-800 border-red-200'
    };
    return variants[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status) => {
    const icons = {
      in_stock: Package,
      in_transit: Truck,
      delivered: CheckCircle,
      returned: Trash2
    };
    const Icon = icons[status] || Package;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="flex-1 bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-sm text-gray-500 mt-1">Track products with order linking and delivery status</p>
          </div>
          <div className="flex gap-2">
            {selectedItems.length > 0 && (
              <Button 
                onClick={handleBulkDelete} 
                variant="destructive"
                className="mr-2"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedItems.length})
              </Button>
            )}
            <Button 
              onClick={handleSyncInventory} 
              variant="outline"
              disabled={filters.store === 'all' || loading}
              title={filters.store === 'all' ? 'Select a store to sync' : 'Sync inventory with store orders'}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sync Store
            </Button>
            <Button onClick={() => setUploadDialog(true)} variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Upload Excel
            </Button>
            <Button onClick={() => setAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Search Input */}
              <div className="flex-1 min-w-[250px]">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Search by SKU, product name, or collection..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-48">
                <Label>Store</Label>
                <Select value={filters.store} onValueChange={(val) => setFilters({...filters, store: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores.map(store => (
                      <SelectItem key={store.store_name} value={store.store_name}>
                        {store.store_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(val) => setFilters({...filters, status: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={syncShopifyPrices}
                  disabled={syncingPrices}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {syncingPrices ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Syncing...</>
                  ) : (
                    <><Download className="w-4 h-4 mr-2" /> Import Shopify Prices</>
                  )}
                </Button>
                {filters.search && (
                  <Button 
                    variant="ghost"
                    onClick={() => setFilters({...filters, search: ''})}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Items ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Collection</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Sale Price</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        No inventory items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => handleSelectItem(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono">{item.sku}</TableCell>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>
                          {item.collection ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {item.collection}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">
                          {item.order_number || '-'}
                        </TableCell>
                        <TableCell>Rs. {item.cost.toFixed(2)}</TableCell>
                        <TableCell>Rs. {item.sale_price.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={item.profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            Rs. {item.profit.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusBadge(item.status)} flex items-center gap-1 w-fit`}>
                            {getStatusIcon(item.status)}
                            {item.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setEditingItem(item);
                                setEditDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setEditingItem(item);
                                setStatusDialog(true);
                              }}
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
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
      </div>

      {/* Add Item Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>SKU</Label>
              <Input
                value={newItem.sku}
                onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                placeholder="Enter SKU"
              />
            </div>
            <div>
              <Label>Product Name</Label>
              <Input
                value={newItem.product_name}
                onChange={(e) => setNewItem({...newItem, product_name: e.target.value})}
                placeholder="Enter product name"
              />
            </div>
            <div>
              <Label>Collection (Optional)</Label>
              <Input
                value={newItem.collection || ''}
                onChange={(e) => setNewItem({...newItem, collection: e.target.value})}
                placeholder="e.g., Summer 2024, Men's Shoes, etc."
              />
            </div>
            <div>
              <Label>Cost</Label>
              <Input
                type="number"
                step="0.01"
                value={newItem.cost}
                onChange={(e) => setNewItem({...newItem, cost: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Order Number (Optional)</Label>
              <Input
                value={newItem.order_number}
                onChange={(e) => setNewItem({...newItem, order_number: e.target.value})}
                placeholder="Auto-fetch sale price from Shopify"
              />
              <p className="text-xs text-gray-500 mt-1">Enter Shopify order number to auto-fetch sale price</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      {editingItem && (
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Inventory Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Collection</Label>
                <Input
                  value={editingItem.collection || ''}
                  onChange={(e) => setEditingItem({...editingItem, collection: e.target.value})}
                  placeholder="e.g., Summer 2024, Men's Shoes, etc."
                />
              </div>
              <div>
                <Label>Order Number</Label>
                <Input
                  value={editingItem.order_number || ''}
                  onChange={(e) => setEditingItem({...editingItem, order_number: e.target.value})}
                  placeholder="Link to order"
                />
              </div>
              <div>
                <Label>Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingItem.cost}
                  onChange={(e) => setEditingItem({...editingItem, cost: e.target.value})}
                />
              </div>
              <div>
                <Label>Sale Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingItem.sale_price}
                  onChange={(e) => setEditingItem({...editingItem, sale_price: e.target.value})}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editingItem.status} onValueChange={(val) => setEditingItem({...editingItem, status: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
              <Button onClick={handleUpdateItem}>Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Delivery Status Dialog */}
      {editingItem && (
        <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Delivery Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {editingItem.delivery_timeline && editingItem.delivery_timeline.length > 0 && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2 text-sm">Current Timeline:</h4>
                  <div className="space-y-2">
                    {editingItem.delivery_timeline.map((entry, idx) => (
                      <div key={idx} className="text-sm border-l-2 border-blue-500 pl-3 py-1">
                        <div className="font-medium">{entry.status}</div>
                        <div className="text-gray-500 text-xs">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label>Status</Label>
                <Select value={statusUpdate.status} onValueChange={(val) => setStatusUpdate({...statusUpdate, status: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Shipment Picked Up">Shipment Picked Up</SelectItem>
                    <SelectItem value="Departed From TCS Facility">Departed From TCS Facility</SelectItem>
                    <SelectItem value="Arrived at TCS Facility">Arrived at TCS Facility</SelectItem>
                    <SelectItem value="Out For Delivery">Out For Delivery</SelectItem>
                    <SelectItem value="Shipment Delivered">Shipment Delivered</SelectItem>
                    <SelectItem value="Return In Process">Return In Process</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Timestamp</Label>
                <Input
                  type="datetime-local"
                  value={statusUpdate.timestamp}
                  onChange={(e) => setStatusUpdate({...statusUpdate, timestamp: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusDialog(false)}>Cancel</Button>
              <Button onClick={handleAddDeliveryStatus}>Add Status</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Inventory Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Store Selection */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2">⚠️ Select Store First</h4>
              <p className="text-sm text-purple-700 mb-3">
                Choose which store this inventory file belongs to. Inventory will be synced with orders from this store only.
              </p>
              <div>
                <Label className="text-purple-900">Store *</Label>
                <Select value={uploadStore} onValueChange={setUploadStore}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map(store => (
                      <SelectItem key={store.store_name} value={store.store_name}>
                        {store.store_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Excel Format:</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <div>Column 1: <span className="font-mono">Box No</span> (optional)</div>
                <div>Column 2: <span className="font-mono">SKU</span> (required)</div>
                <div>Column 3: <span className="font-mono">Size</span> (optional)</div>
                <div>Column 4: <span className="font-mono">Color</span> (optional)</div>
                <div>Column 5: <span className="font-mono">Collection</span> (optional)</div>
                <div>Column 6: <span className="font-mono">Cost</span> (required)</div>
              </div>
              <p className="text-xs text-blue-600 mt-2">* First row should contain headers</p>
              <p className="text-xs text-green-600 mt-1">* SKUs will be auto-matched with {uploadStore} orders</p>
            </div>
            <div>
              <Label>Select File</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(false)}>Cancel</Button>
            <Button onClick={handleFileUpload}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Errors Dialog */}
      <Dialog open={errorsDialog} onOpenChange={setErrorsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Upload Errors ({uploadErrors.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 overflow-y-auto max-h-96">
            {uploadErrors.map((error, idx) => (
              <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 font-mono">{error}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setErrorsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
