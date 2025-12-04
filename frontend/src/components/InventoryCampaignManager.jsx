import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tag, DollarSign, Package, TrendingDown, Clock, Edit, Save, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const InventoryCampaignManager = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkTagDialog, setBulkTagDialog] = useState(false);
  const [bulkPriceDialog, setBulkPriceDialog] = useState(false);
  const [selectedTag, setSelectedTag] = useState('hot_seller');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('all');

  const tagOptions = [
    { value: 'hot_seller', label: '🔥 Hot Seller', color: 'bg-red-100 text-red-700' },
    { value: 'clearance', label: '💰 Clearance', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'flash_sale', label: '⚡ Flash Sale', color: 'bg-purple-100 text-purple-700' },
    { value: 'bundle', label: '📦 Bundle Deal', color: 'bg-blue-100 text-blue-700' },
    { value: 'new_arrival', label: '🆕 New Arrival', color: 'bg-green-100 text-green-700' },
    { value: 'limited_stock', label: '⏰ Limited Stock', color: 'bg-orange-100 text-orange-700' }
  ];

  useEffect(() => {
    fetchInventoryItems();
  }, [filterTag]);

  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      let url = `${API}/api/inventory/v2/campaign-items`;
      if (filterTag !== 'all') {
        url += `?tag=${filterTag}`;
      }
      
      const response = await axios.get(url);
      if (response.data.success) {
        setItems(response.data.items || []);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(items.map(item => item.sku));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (sku) => {
    setSelectedItems(prev => {
      if (prev.includes(sku)) {
        return prev.filter(s => s !== sku);
      } else {
        return [...prev, sku];
      }
    });
  };

  const handleBulkTag = async () => {
    try {
      const response = await axios.post(`${API}/api/inventory/v2/bulk-tag`, {
        skus: selectedItems,
        tag: selectedTag
      });

      if (response.data.success) {
        toast.success(`Tagged ${response.data.updated_count} items!`);
        setSelectedItems([]);
        setBulkTagDialog(false);
        await fetchInventoryItems();
      }
    } catch (error) {
      console.error('Error bulk tagging:', error);
      toast.error('Failed to tag items');
    }
  };

  const handleBulkPricing = async () => {
    try {
      const response = await axios.post(`${API}/api/inventory/v2/bulk-pricing`, {
        skus: selectedItems,
        discount_type: discountType,
        discount_value: parseFloat(discountValue)
      });

      if (response.data.success) {
        toast.success(`Updated pricing for ${response.data.updated_count} items!`);
        setSelectedItems([]);
        setBulkPriceDialog(false);
        setDiscountValue('');
        await fetchInventoryItems();
      }
    } catch (error) {
      console.error('Error updating pricing:', error);
      toast.error('Failed to update pricing');
    }
  };

  const filteredItems = items.filter(item => 
    !searchQuery || 
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.collection && item.collection.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getTagBadge = (tag) => {
    const tagOption = tagOptions.find(t => t.value === tag);
    if (!tagOption) return null;
    
    return (
      <Badge className={`${tagOption.color} border-0`}>
        {tagOption.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🏷️ Inventory Campaign Manager</h1>
          <p className="text-gray-600">Tag items, set pricing, and create campaigns</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-red-700 font-semibold">Hot Sellers</CardDescription>
              <CardTitle className="text-3xl font-bold text-red-600">
                {items.filter(i => i.campaign_tag === 'hot_seller').length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-yellow-700 font-semibold">Clearance</CardDescription>
              <CardTitle className="text-3xl font-bold text-yellow-600">
                {items.filter(i => i.campaign_tag === 'clearance').length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-700 font-semibold">Flash Sale</CardDescription>
              <CardTitle className="text-3xl font-bold text-purple-600">
                {items.filter(i => i.campaign_tag === 'flash_sale').length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-700 font-semibold">Bundles</CardDescription>
              <CardTitle className="text-3xl font-bold text-blue-600">
                {items.filter(i => i.campaign_tag === 'bundle').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search by SKU or Collection..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {tagOptions.map(tag => (
                    <SelectItem key={tag.value} value={tag.value}>{tag.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-900">
                  {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setBulkTagDialog(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    Bulk Tag
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setBulkPriceDialog(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Bulk Pricing
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedItems([])}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectedItems.length > 0 && selectedItems.length === filteredItems.length}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Collection</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Sale Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Tag</TableHead>
                    <TableHead>Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading items...
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.slice(0, 100).map((item) => (
                      <TableRow key={item.sku} className="hover:bg-gray-50">
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.sku)}
                            onChange={() => handleSelectItem(item.sku)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.collection || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>Rs. {item.cost?.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">
                          Rs. {(item.sale_price || item.cost)?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {item.discount_percentage ? (
                            <Badge className="bg-green-100 text-green-700">
                              {item.discount_percentage}% OFF
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.campaign_tag ? getTagBadge(item.campaign_tag) : (
                            <span className="text-gray-400 text-xs">No tag</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={item.quantity > 0 ? 'bg-green-50' : 'bg-red-50'}>
                            {item.quantity || 0}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Tag Dialog */}
        <Dialog open={bulkTagDialog} onOpenChange={setBulkTagDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Tag Items</DialogTitle>
              <DialogDescription>
                Apply tag to {selectedItems.length} selected items
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tagOptions.map(tag => (
                    <SelectItem key={tag.value} value={tag.value}>
                      {tag.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkTagDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkTag} className="bg-purple-600 hover:bg-purple-700">
                Apply Tag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Pricing Dialog */}
        <Dialog open={bulkPriceDialog} onOpenChange={setBulkPriceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Pricing Update</DialogTitle>
              <DialogDescription>
                Update pricing for {selectedItems.length} selected items
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">Discount Type</label>
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (Rs.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Discount Value {discountType === 'percentage' ? '(%)' : '(Rs.)'}
                </label>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="Enter discount value"
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-900">
                  <strong>Preview:</strong> Sale price will be reduced by {discountValue}{discountType === 'percentage' ? '%' : ' Rs.'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkPriceDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkPricing} className="bg-green-600 hover:bg-green-700">
                Update Prices
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default InventoryCampaignManager;
