import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Users, Filter, Download, MessageCircle, DollarSign, ShoppingCart, TrendingUp, Target } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const CustomerSegmentation = () => {
  const [segments, setSegments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [createDialog, setCreateDialog] = useState(false);
  const [newSegment, setNewSegment] = useState({
    name: '',
    criteria: 'high_value',
    min_orders: '',
    min_spend: '',
    collection: ''
  });

  const segmentTypes = [
    { value: 'high_value', label: '💎 High Value Customers', desc: 'Orders > Rs. 10,000' },
    { value: 'frequent', label: '🔄 Frequent Buyers', desc: '3+ orders' },
    { value: 'new', label: '🆕 New Customers', desc: 'First order in last 30 days' },
    { value: 'inactive', label: '😴 Inactive', desc: 'No order in 60+ days' },
    { value: 'collection', label: '👟 Collection Buyers', desc: 'Bought specific collection' },
    { value: 'pending', label: '⏰ Pending Orders', desc: 'Unfulfilled orders' }
  ];

  useEffect(() => {
    fetchSegments();
    fetchCustomers(selectedSegment);
  }, [selectedSegment]);

  const fetchSegments = async () => {
    try {
      const response = await axios.get(`${API}/api/customers/segments`);
      if (response.data.success) {
        setSegments(response.data.segments || []);
      }
    } catch (error) {
      console.error('Error fetching segments:', error);
    }
  };

  const fetchCustomers = async (segment) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/customers/segment/${segment}`);
      if (response.data.success) {
        setCustomers(response.data.customers || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSegment = async () => {
    try {
      const response = await axios.post(`${API}/api/customers/segments/create`, newSegment);
      
      if (response.data.success) {
        toast.success('Segment created!');
        setCreateDialog(false);
        setNewSegment({
          name: '',
          criteria: 'high_value',
          min_orders: '',
          min_spend: '',
          collection: ''
        });
        await fetchSegments();
      }
    } catch (error) {
      console.error('Error creating segment:', error);
      toast.error('Failed to create segment');
    }
  };

  const handleExportSegment = async () => {
    try {
      const response = await axios.get(`${API}/api/customers/segment/${selectedSegment}/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `segment_${selectedSegment}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Segment exported!');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export segment');
    }
  };

  const handleBulkWhatsApp = async () => {
    const customerIds = customers.map(c => c.customer_id);
    
    try {
      const response = await axios.post(`${API}/api/customers/bulk-whatsapp`, {
        customer_ids: customerIds,
        template: 'order_ready'
      });
      
      if (response.data.success) {
        toast.success(`WhatsApp sent to ${response.data.sent_count} customers!`);
      }
    } catch (error) {
      console.error('Error sending bulk WhatsApp:', error);
      toast.error('Failed to send messages');
    }
  };

  const getSegmentStats = () => {
    const totalSpent = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const avgSpent = customers.length > 0 ? totalSpent / customers.length : 0;
    const totalOrders = customers.reduce((sum, c) => sum + (c.order_count || 1), 0);
    
    return {
      totalCustomers: customers.length,
      totalSpent,
      avgSpent,
      totalOrders
    };
  };

  const stats = getSegmentStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">🎯 Customer Segmentation</h1>
            <p className="text-gray-600">Target specific customer groups for better conversions</p>
          </div>
          <Button
            onClick={() => setCreateDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Target className="w-4 h-4 mr-2" />
            Create Segment
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-700 font-semibold">Total Customers</CardDescription>
              <CardTitle className="text-3xl font-bold text-blue-600">
                {stats.totalCustomers.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-700 font-semibold">Total Spent</CardDescription>
              <CardTitle className="text-3xl font-bold text-green-600">
                Rs. {stats.totalSpent.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-700 font-semibold">Avg Spent</CardDescription>
              <CardTitle className="text-3xl font-bold text-purple-600">
                Rs. {Math.round(stats.avgSpent).toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-orange-700 font-semibold">Total Orders</CardDescription>
              <CardTitle className="text-3xl font-bold text-orange-600">
                {stats.totalOrders.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Segment Filter */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Select Segment</label>
                <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {segmentTypes.map(seg => (
                      <SelectItem key={seg.value} value={seg.value}>
                        {seg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 items-end">
                <Button
                  onClick={handleExportSegment}
                  variant="outline"
                  className="border-blue-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  onClick={handleBulkWhatsApp}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={customers.length === 0}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Send WhatsApp
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Customers in Segment</CardTitle>
            <CardDescription>
              {customers.length} customers found
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Last Order</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading customers...
                      </TableCell>
                    </TableRow>
                  ) : customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No customers in this segment
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.slice(0, 100).map((customer, idx) => (
                      <TableRow key={idx} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                            <p className="text-xs text-gray-500">{customer.email || 'No email'}</p>
                          </div>
                        </TableCell>
                        <TableCell>{customer.phone || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{customer.order_count || 1}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          Rs. {(customer.total_spent || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {customer.last_order_date 
                            ? new Date(customer.last_order_date).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {customer.messaged ? (
                            <Badge className="bg-green-100 text-green-700">Messaged</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-700">Not Contacted</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create Segment Dialog */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Segment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">Segment Name</label>
                <Input
                  placeholder="e.g., VIP Leather Buyers"
                  value={newSegment.name}
                  onChange={(e) => setNewSegment({...newSegment, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Criteria Type</label>
                <Select 
                  value={newSegment.criteria} 
                  onValueChange={(v) => setNewSegment({...newSegment, criteria: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {segmentTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newSegment.criteria === 'high_value' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Minimum Spend (Rs.)</label>
                  <Input
                    type="number"
                    placeholder="e.g., 10000"
                    value={newSegment.min_spend}
                    onChange={(e) => setNewSegment({...newSegment, min_spend: e.target.value})}
                  />
                </div>
              )}
              {newSegment.criteria === 'frequent' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Minimum Orders</label>
                  <Input
                    type="number"
                    placeholder="e.g., 3"
                    value={newSegment.min_orders}
                    onChange={(e) => setNewSegment({...newSegment, min_orders: e.target.value})}
                  />
                </div>
              )}
              {newSegment.criteria === 'collection' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Collection</label>
                  <Input
                    placeholder="e.g., leather-shoe"
                    value={newSegment.collection}
                    onChange={(e) => setNewSegment({...newSegment, collection: e.target.value})}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSegment} className="bg-blue-600 hover:bg-blue-700">
                Create Segment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CustomerSegmentation;
