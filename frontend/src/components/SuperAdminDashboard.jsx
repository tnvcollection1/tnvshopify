import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Store,
  MessageCircle,
  Target,
  Activity,
  Settings,
  Search,
  RefreshCw,
  Eye,
  Ban,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Crown,
  Zap,
  Database,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SuperAdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showTenantDetail, setShowTenantDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  useEffect(() => {
    fetchDashboard();
    fetchTenants();
    fetchPlans();
    fetchActivityLogs();
    
    // Refresh every minute
    const interval = setInterval(() => {
      fetchDashboard();
      fetchTenants();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [statusFilter, planFilter, searchQuery]);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/super-admin/dashboard`);
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (planFilter !== 'all') params.append('plan', planFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await axios.get(`${API}/super-admin/tenants?${params}`);
      setTenants(response.data.tenants || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${API}/super-admin/plans`);
      setPlans(response.data.plans || {});
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const response = await axios.get(`${API}/super-admin/activity-logs?limit=50`);
      setActivityLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleSuspendTenant = async (tenantId) => {
    if (!window.confirm('Are you sure you want to suspend this tenant?')) return;
    
    try {
      await axios.post(`${API}/super-admin/tenants/${tenantId}/suspend`);
      toast.success('Tenant suspended');
      fetchTenants();
    } catch (error) {
      toast.error('Failed to suspend tenant');
    }
  };

  const handleActivateTenant = async (tenantId) => {
    try {
      await axios.post(`${API}/super-admin/tenants/${tenantId}/activate`);
      toast.success('Tenant activated');
      fetchTenants();
    } catch (error) {
      toast.error('Failed to activate tenant');
    }
  };

  const handleChangePlan = async (tenantId, newPlan) => {
    try {
      await axios.patch(`${API}/super-admin/tenants/${tenantId}`, { plan: newPlan });
      toast.success(`Plan changed to ${newPlan}`);
      fetchTenants();
    } catch (error) {
      toast.error('Failed to change plan');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-blue-100 text-blue-800',
      suspended: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const getPlanBadge = (plan) => {
    const styles = {
      free: 'bg-gray-100 text-gray-800',
      starter: 'bg-blue-100 text-blue-800',
      pro: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-yellow-100 text-yellow-800'
    };
    return <Badge className={styles[plan] || 'bg-gray-100'}>{plan}</Badge>;
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f7]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" />
              Super Admin Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor tenant usage and manage subscriptions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-purple-100 text-purple-800">
              <Crown className="w-3 h-3 mr-1" />
              Super Admin
            </Badge>
            <Button onClick={() => { fetchDashboard(); fetchTenants(); }} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Tenants</p>
                  <p className="text-2xl font-semibold">{dashboard?.overview?.total_tenants || 0}</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <ArrowUpRight className="w-3 h-3" />
                    {dashboard?.overview?.new_signups_this_month || 0} this month
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Monthly Revenue (MRR)</p>
                  <p className="text-2xl font-semibold">{formatCurrency(dashboard?.revenue?.mrr || 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    ARR: {formatCurrency(dashboard?.revenue?.arr || 0)}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-2xl font-semibold">{dashboard?.usage_totals?.total_orders?.toLocaleString() || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {dashboard?.usage_totals?.orders_today || 0} today
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Tenants</p>
                  <p className="text-2xl font-semibold">{dashboard?.overview?.active_tenants || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {dashboard?.usage_totals?.total_stores || 0} stores connected
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <Activity className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plan Distribution */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Object.entries(plans).map(([key, plan]) => (
            <Card key={key} className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{plan.name}</span>
                  {getPlanBadge(key)}
                </div>
                <p className="text-2xl font-semibold">
                  {dashboard?.plan_distribution?.[key] || 0}
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(plan.price_monthly)}/mo
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="tenants" className="space-y-4">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="activity">Activity Logs</TabsTrigger>
            <TabsTrigger value="plans">Plans & Limits</TabsTrigger>
          </TabsList>

          {/* Tenants Tab */}
          <TabsContent value="tenants">
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Tenants</CardTitle>
                    <CardDescription>Manage and monitor tenant accounts</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search tenants..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={planFilter} onValueChange={setPlanFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tenants.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No tenants found</p>
                    </div>
                  ) : (
                    tenants.map((tenant) => (
                      <div
                        key={tenant.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold">
                            {tenant.name?.charAt(0)?.toUpperCase() || 'T'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{tenant.name || 'Unnamed Tenant'}</h4>
                              {getStatusBadge(tenant.subscription?.status || tenant.status || 'active')}
                              {getPlanBadge(tenant.subscription?.plan || tenant.plan || 'free')}
                            </div>
                            <p className="text-sm text-gray-500">{tenant.email || '—'}</p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                              <span>{tenant.usage?.orders_this_month || 0} orders</span>
                              <span>{tenant.usage?.stores_connected || 0} stores</span>
                              <span>{tenant.usage?.team_members || 0} users</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* Usage Progress */}
                          <div className="w-32">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-500">Orders</span>
                              <span>{tenant.usage_percentage?.orders || 0}%</span>
                            </div>
                            <Progress 
                              value={tenant.usage_percentage?.orders || 0} 
                              className={`h-2 ${getUsageColor(tenant.usage_percentage?.orders || 0)}`}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTenant(tenant);
                                setShowTenantDetail(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Select
                              value={tenant.subscription?.plan || 'free'}
                              onValueChange={(v) => handleChangePlan(tenant.id, v)}
                            >
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="starter">Starter</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                <SelectItem value="enterprise">Enterprise</SelectItem>
                              </SelectContent>
                            </Select>
                            {(tenant.subscription?.status || tenant.status) === 'active' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleSuspendTenant(tenant.id)}
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-500 hover:text-green-700"
                                onClick={() => handleActivateTenant(tenant.id)}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="activity">
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>Recent system activity and tenant actions</CardDescription>
              </CardHeader>
              <CardContent>
                {activityLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No activity logs yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activityLogs.map((log, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="p-2 bg-gray-100 rounded">
                          <Activity className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{log.action}</p>
                          <p className="text-xs text-gray-500">
                            {log.tenant_id && `Tenant: ${log.tenant_id} • `}
                            {formatDate(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans">
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(plans).map(([key, plan]) => (
                <Card key={key} className="bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {plan.name}
                      {key === 'enterprise' && <Crown className="w-5 h-5 text-yellow-500" />}
                    </CardTitle>
                    <CardDescription>
                      {formatCurrency(plan.price_monthly)}/month
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm">
                        <p className="font-medium mb-2">Limits:</p>
                        <ul className="space-y-1 text-gray-600">
                          <li className="flex justify-between">
                            <span>Orders/mo</span>
                            <span>{plan.limits?.orders_per_month === -1 ? '∞' : plan.limits?.orders_per_month}</span>
                          </li>
                          <li className="flex justify-between">
                            <span>WhatsApp msgs</span>
                            <span>{plan.limits?.whatsapp_messages_per_month === -1 ? '∞' : plan.limits?.whatsapp_messages_per_month}</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Stores</span>
                            <span>{plan.limits?.stores_limit === -1 ? '∞' : plan.limits?.stores_limit}</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Team members</span>
                            <span>{plan.limits?.team_members_limit === -1 ? '∞' : plan.limits?.team_members_limit}</span>
                          </li>
                        </ul>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium mb-2">Features:</p>
                        <ul className="space-y-1 text-gray-600">
                          {plan.features?.slice(0, 4).map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Tenant Detail Dialog */}
      <Dialog open={showTenantDetail} onOpenChange={setShowTenantDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
            <DialogDescription>
              View detailed usage and manage tenant
            </DialogDescription>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xl font-semibold">
                  {selectedTenant.name?.charAt(0)?.toUpperCase() || 'T'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedTenant.name}</h3>
                  <p className="text-gray-500">{selectedTenant.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(selectedTenant.subscription?.status || 'active')}
                    {getPlanBadge(selectedTenant.subscription?.plan || 'free')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">Orders (30d)</p>
                    <p className="text-xl font-semibold">{selectedTenant.usage?.orders_this_month || 0}</p>
                    <Progress value={selectedTenant.usage_percentage?.orders || 0} className="h-2 mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">WhatsApp Messages</p>
                    <p className="text-xl font-semibold">{selectedTenant.usage?.whatsapp_messages || 0}</p>
                    <Progress value={selectedTenant.usage_percentage?.messages || 0} className="h-2 mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">Leads Captured</p>
                    <p className="text-xl font-semibold">{selectedTenant.usage?.leads_captured || 0}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Stores Connected</label>
                  <p className="font-medium">{selectedTenant.usage?.stores_connected || 0}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Team Members</label>
                  <p className="font-medium">{selectedTenant.usage?.team_members || 0}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Inventory Items</label>
                  <p className="font-medium">{selectedTenant.usage?.inventory_items || 0}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Created</label>
                  <p className="font-medium">{formatDate(selectedTenant.created_at)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTenantDetail(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminDashboard;
