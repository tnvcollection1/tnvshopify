import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Clock, Zap, Play, Pause, Trash2, Plus } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const FlashSaleManager = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [newSale, setNewSale] = useState({
    name: '',
    collection: '',
    discount: '',
    duration_hours: 24,
    start_time: ''
  });

  useEffect(() => {
    fetchFlashSales();
  }, []);

  const fetchFlashSales = async () => {
    try {
      const response = await axios.get(`${API}/api/flash-sales`);
      if (response.data.success) {
        setSales(response.data.sales || []);
      }
    } catch (error) {
      console.error('Error fetching flash sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSale = async () => {
    try {
      const response = await axios.post(`${API}/api/flash-sales/create`, newSale);
      
      if (response.data.success) {
        toast.success('Flash sale created!');
        setCreateDialog(false);
        setNewSale({
          name: '',
          collection: '',
          discount: '',
          duration_hours: 24,
          start_time: ''
        });
        await fetchFlashSales();
      }
    } catch (error) {
      console.error('Error creating flash sale:', error);
      toast.error('Failed to create flash sale');
    }
  };

  const handleToggleSale = async (saleId, currentStatus) => {
    try {
      const response = await axios.post(`${API}/api/flash-sales/${saleId}/toggle`, {
        active: !currentStatus
      });
      
      if (response.data.success) {
        toast.success(currentStatus ? 'Flash sale paused' : 'Flash sale activated');
        await fetchFlashSales();
      }
    } catch (error) {
      console.error('Error toggling flash sale:', error);
      toast.error('Failed to update flash sale');
    }
  };

  const handleDeleteSale = async (saleId) => {
    if (!confirm('Are you sure you want to delete this flash sale?')) return;
    
    try {
      const response = await axios.delete(`${API}/api/flash-sales/${saleId}`);
      
      if (response.data.success) {
        toast.success('Flash sale deleted');
        await fetchFlashSales();
      }
    } catch (error) {
      console.error('Error deleting flash sale:', error);
      toast.error('Failed to delete flash sale');
    }
  };

  const getTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">⚡ Flash Sale Manager</h1>
            <p className="text-gray-600">Create time-limited offers to boost sales</p>
          </div>
          <Button
            onClick={() => setCreateDialog(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Flash Sale
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-700 font-semibold">Active Sales</CardDescription>
              <CardTitle className="text-3xl font-bold text-green-600">
                {sales.filter(s => s.active).length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-700 font-semibold">Scheduled</CardDescription>
              <CardTitle className="text-3xl font-bold text-blue-600">
                {sales.filter(s => !s.active && new Date(s.start_time) > new Date()).length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-700 font-semibold">Total Revenue</CardDescription>
              <CardTitle className="text-3xl font-bold text-purple-600">
                Rs. {sales.reduce((sum, s) => sum + (s.revenue || 0), 0).toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Sales List */}
        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                Loading flash sales...
              </CardContent>
            </Card>
          ) : sales.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No flash sales created yet. Click "Create Flash Sale" to get started!
              </CardContent>
            </Card>
          ) : (
            sales.map((sale) => (
              <Card key={sale.id} className={`border-2 ${sale.active ? 'border-purple-300 bg-purple-50' : 'border-gray-200'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {sale.active && <Zap className="w-6 h-6 text-purple-600" />}
                      <div>
                        <CardTitle className="text-xl">{sale.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {sale.collection} • {sale.discount}% OFF
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={sale.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {sale.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleSale(sale.id, sale.active)}
                      >
                        {sale.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteSale(sale.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Time Remaining</p>
                      <p className="text-lg font-semibold text-purple-600 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {getTimeRemaining(sale.end_time)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Orders</p>
                      <p className="text-lg font-semibold">{sale.orders_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Revenue</p>
                      <p className="text-lg font-semibold">Rs. {(sale.revenue || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Conversion</p>
                      <p className="text-lg font-semibold">{sale.conversion_rate || 0}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create Sale Dialog */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Flash Sale</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">Sale Name</label>
                <Input
                  placeholder="e.g., Weekend Leather Shoes Sale"
                  value={newSale.name}
                  onChange={(e) => setNewSale({...newSale, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Collection/Tag</label>
                <Select value={newSale.collection} onValueChange={(v) => setNewSale({...newSale, collection: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select collection" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leather-shoe">Leather Shoes</SelectItem>
                    <SelectItem value="semi-formal">Semi Formal</SelectItem>
                    <SelectItem value="loafers">Loafers</SelectItem>
                    <SelectItem value="all">All Items</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Discount (%)</label>
                <Input
                  type="number"
                  placeholder="e.g., 25"
                  value={newSale.discount}
                  onChange={(e) => setNewSale({...newSale, discount: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Duration (Hours)</label>
                <Select value={newSale.duration_hours.toString()} onValueChange={(v) => setNewSale({...newSale, duration_hours: parseInt(v)})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 Hours</SelectItem>
                    <SelectItem value="12">12 Hours</SelectItem>
                    <SelectItem value="24">24 Hours (1 Day)</SelectItem>
                    <SelectItem value="48">48 Hours (2 Days)</SelectItem>
                    <SelectItem value="72">72 Hours (3 Days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Start Time</label>
                <Input
                  type="datetime-local"
                  value={newSale.start_time}
                  onChange={(e) => setNewSale({...newSale, start_time: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSale} className="bg-purple-600 hover:bg-purple-700">
                Create Sale
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default FlashSaleManager;