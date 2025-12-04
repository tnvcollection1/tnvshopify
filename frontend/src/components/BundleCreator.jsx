import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Package, Plus, Trash2, Edit, TrendingUp, DollarSign } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const BundleCreator = () => {
  const [bundles, setBundles] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [newBundle, setNewBundle] = useState({
    name: '',
    items: [],
    discount: '',
    description: ''
  });
  const [searchSKU, setSearchSKU] = useState('');

  useEffect(() => {
    fetchBundles();
    fetchCollections();
  }, []);

  const fetchBundles = async () => {
    try {
      const response = await axios.get(`${API}/api/bundles`);
      if (response.data.success) {
        setBundles(response.data.bundles || []);
      }
    } catch (error) {
      console.error('Error fetching bundles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const response = await axios.get(`${API}/api/inventory/v2/overview-stats`);
      if (response.data.success) {
        setCollections(response.data.stats.by_collection || []);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const handleAddItem = () => {
    if (!searchSKU) return;
    
    setNewBundle({
      ...newBundle,
      items: [...newBundle.items, { sku: searchSKU, quantity: 1 }]
    });
    setSearchSKU('');
  };

  const handleRemoveItem = (index) => {
    const items = [...newBundle.items];
    items.splice(index, 1);
    setNewBundle({ ...newBundle, items });
  };

  const handleCreateBundle = async () => {
    try {
      const response = await axios.post(`${API}/api/bundles/create`, newBundle);
      
      if (response.data.success) {
        toast.success('Bundle created!');
        setCreateDialog(false);
        setNewBundle({
          name: '',
          items: [],
          discount: '',
          description: ''
        });
        await fetchBundles();
      }
    } catch (error) {
      console.error('Error creating bundle:', error);
      toast.error('Failed to create bundle');
    }
  };

  const handleDeleteBundle = async (bundleId) => {
    if (!confirm('Delete this bundle?')) return;
    
    try {
      const response = await axios.delete(`${API}/api/bundles/${bundleId}`);
      
      if (response.data.success) {
        toast.success('Bundle deleted');
        await fetchBundles();
      }
    } catch (error) {
      console.error('Error deleting bundle:', error);
      toast.error('Failed to delete bundle');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">📦 Bundle Creator</h1>
            <p className="text-gray-600">Create combo offers to increase average order value</p>
          </div>
          <Button
            onClick={() => setCreateDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Bundle
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-700 font-semibold">Active Bundles</CardDescription>
              <CardTitle className="text-3xl font-bold text-blue-600">
                {bundles.length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-700 font-semibold">Bundle Revenue</CardDescription>
              <CardTitle className="text-3xl font-bold text-green-600">
                Rs. {bundles.reduce((sum, b) => sum + (b.revenue || 0), 0).toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-700 font-semibold">Avg Discount</CardDescription>
              <CardTitle className="text-3xl font-bold text-purple-600">
                {bundles.length > 0 
                  ? Math.round(bundles.reduce((sum, b) => sum + (b.discount || 0), 0) / bundles.length)
                  : 0}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Bundles List */}
        <Card>
          <CardHeader>
            <CardTitle>Product Bundles</CardTitle>
            <CardDescription>Manage your combo offers</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Bundle Name</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading bundles...
                      </TableCell>
                    </TableRow>
                  ) : bundles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No bundles created yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    bundles.map((bundle) => (
                      <TableRow key={bundle.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <p className="font-semibold">{bundle.name}</p>
                            <p className="text-xs text-gray-500">{bundle.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {bundle.items?.slice(0, 3).map((item, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {item.sku}
                              </Badge>
                            ))}
                            {bundle.items?.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{bundle.items.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-700">
                            {bundle.discount}% OFF
                          </Badge>
                        </TableCell>
                        <TableCell>{bundle.orders || 0}</TableCell>
                        <TableCell className="font-semibold">
                          Rs. {(bundle.revenue || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteBundle(bundle.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Create Bundle Dialog */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Product Bundle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">Bundle Name</label>
                <Input
                  placeholder="e.g., Formal Shoe Combo"
                  value={newBundle.name}
                  onChange={(e) => setNewBundle({...newBundle, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Input
                  placeholder="e.g., Get 2 pairs of formal shoes"
                  value={newBundle.description}
                  onChange={(e) => setNewBundle({...newBundle, description: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Bundle Discount (%)</label>
                <Input
                  type="number"
                  placeholder="e.g., 15"
                  value={newBundle.discount}
                  onChange={(e) => setNewBundle({...newBundle, discount: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Add Items (SKU)</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter SKU"
                    value={searchSKU}
                    onChange={(e) => setSearchSKU(e.target.value)}
                  />
                  <Button onClick={handleAddItem} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {newBundle.items.length > 0 && (
                <div className="border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium">Bundle Items:</p>
                  {newBundle.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm font-mono">{item.sku}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveItem(idx)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateBundle} 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newBundle.name || newBundle.items.length === 0}
              >
                Create Bundle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default BundleCreator;