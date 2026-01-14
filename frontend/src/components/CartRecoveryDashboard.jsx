import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Send, Settings, Clock, DollarSign, TrendingUp,
  RefreshCw, Bell, MessageCircle, ChevronRight, Filter, Calendar,
  Users, Package, Percent, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Store configurations
const STORE_CONFIGS = {
  'tnvcollection': { currency: 'INR', symbol: '₹', name: 'TNV Collection (IN)', flag: '🇮🇳' },
  'tnvcollectionpk': { currency: 'PKR', symbol: 'Rs.', name: 'TNV Collection (PK)', flag: '🇵🇰' }
};

const CartRecoveryDashboard = () => {
  const [store, setStore] = useState('tnvcollection');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [abandonedCarts, setAbandonedCarts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [sending, setSending] = useState({});
  const [settingsOpen, setSettingsOpen] = useState(false);

  const storeConfig = STORE_CONFIGS[store] || STORE_CONFIGS['tnvcollection'];

  const formatPrice = (amount) => {
    if (!amount) return `${storeConfig.symbol}0`;
    return `${storeConfig.symbol}${Number(amount).toLocaleString()}`;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, cartsRes, settingsRes, logsRes] = await Promise.all([
        fetch(`${API}/api/cart-recovery/stats?store=${store}&days=30`),
        fetch(`${API}/api/cart-recovery/abandoned-carts?store=${store}&min_hours=1&max_hours=168`),
        fetch(`${API}/api/cart-recovery/settings/${store}`),
        fetch(`${API}/api/cart-recovery/logs?store=${store}&limit=20`)
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (cartsRes.ok) {
        const data = await cartsRes.json();
        setAbandonedCarts(data.carts || []);
      }
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to fetch data:', e);
      toast.error('Failed to load cart recovery data');
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSendReminder = async (sessionId, reminderNumber = 1) => {
    setSending({ ...sending, [sessionId]: true });
    try {
      const res = await fetch(`${API}/api/cart-recovery/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          reminder_number: reminderNumber,
          include_discount: reminderNumber >= 2
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Reminder sent successfully!');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to send reminder');
      }
    } catch (e) {
      toast.error('Failed to send reminder');
    } finally {
      setSending({ ...sending, [sessionId]: false });
    }
  };

  const handleSendBulk = async (hours) => {
    try {
      const res = await fetch(`${API}/api/cart-recovery/send-bulk-reminders?store=${store}&reminder_hours=${hours}&limit=50`, {
        method: 'POST'
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Sent ${data.reminders_sent} reminders!`);
        fetchData();
      } else {
        toast.error(data.message || 'Failed to send reminders');
      }
    } catch (e) {
      toast.error('Failed to send bulk reminders');
    }
  };

  const handleUpdateSettings = async (newSettings) => {
    try {
      const res = await fetch(`${API}/api/cart-recovery/settings/${store}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });

      if (res.ok) {
        setSettings(newSettings);
        toast.success('Settings updated!');
      }
    } catch (e) {
      toast.error('Failed to update settings');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'carts', label: 'Abandoned Carts', icon: ShoppingCart },
    { id: 'logs', label: 'Recovery Logs', icon: MessageCircle },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-7 h-7" />
              Cart Recovery
            </h1>
            <p className="text-gray-500 mt-1">Recover abandoned carts via WhatsApp</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Store Selector */}
            <select
              value={store}
              onChange={(e) => setStore(e.target.value)}
              className="border rounded-lg px-4 py-2 bg-white"
              data-testid="store-selector"
            >
              {Object.entries(STORE_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.flag} {config.name}
                </option>
              ))}
            </select>

            <Button onClick={fetchData} variant="outline" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b pb-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === id
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={ShoppingCart}
                label="Abandoned Carts"
                value={stats?.abandoned_carts || 0}
                subtext="Last 30 days"
                color="orange"
              />
              <StatCard
                icon={Send}
                label="Reminders Sent"
                value={stats?.reminders_sent || 0}
                subtext="Last 30 days"
                color="blue"
              />
              <StatCard
                icon={CheckCircle}
                label="Recovered"
                value={stats?.recovered_carts || 0}
                subtext={`${stats?.recovery_rate || 0}% rate`}
                color="green"
              />
              <StatCard
                icon={DollarSign}
                label="Revenue Recovered"
                value={formatPrice(stats?.revenue_recovered)}
                subtext="Last 30 days"
                color="purple"
              />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <ActionCard
                  title="1-Hour Reminders"
                  description="Send to carts abandoned 1 hour ago"
                  icon={Clock}
                  onClick={() => handleSendBulk(1)}
                />
                <ActionCard
                  title="24-Hour Reminders"
                  description="Send with discount offer"
                  icon={Bell}
                  onClick={() => handleSendBulk(24)}
                />
                <ActionCard
                  title="72-Hour Final Notice"
                  description="Last chance with special offer"
                  icon={AlertCircle}
                  onClick={() => handleSendBulk(72)}
                />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">Recent Recovery Activity</h2>
              {logs.length > 0 ? (
                <div className="space-y-3">
                  {logs.slice(0, 5).map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          log.result?.success ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {log.result?.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">Reminder #{log.reminder_number}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">
                        {log.phone?.slice(0, 4)}****
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No recovery activity yet</p>
              )}
            </div>
          </div>
        )}

        {/* Abandoned Carts Tab */}
        {activeTab === 'carts' && (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">Abandoned Carts ({abandonedCarts.length})</h2>
              <p className="text-sm text-gray-500">Carts with items waiting for recovery</p>
            </div>

            {abandonedCarts.length > 0 ? (
              <div className="divide-y">
                {abandonedCarts.map((cart) => (
                  <div key={cart.session_id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">
                            {cart.customer_name || cart.phone || cart.email || 'Anonymous'}
                          </span>
                          {cart.phone && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              WhatsApp Ready
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {cart.items?.length || 0} items
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {formatPrice(cart.total)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {cart.hours_abandoned?.toFixed(0)}h ago
                          </span>
                          {cart.reminders_sent > 0 && (
                            <span className="text-orange-600">
                              {cart.reminders_sent} reminder(s) sent
                            </span>
                          )}
                        </div>

                        {/* Items Preview */}
                        <div className="mt-2 flex gap-2">
                          {cart.items?.slice(0, 3).map((item, i) => (
                            <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {item.name?.slice(0, 20) || item.title?.slice(0, 20)}...
                            </span>
                          ))}
                          {cart.items?.length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{cart.items.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSendReminder(cart.session_id, (cart.reminders_sent || 0) + 1)}
                          disabled={sending[cart.session_id] || !cart.phone}
                          data-testid={`send-reminder-${cart.session_id}`}
                        >
                          {sending[cart.session_id] ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-1" />
                              Send Reminder
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No abandoned carts found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Carts appear here 1+ hours after abandonment
                </p>
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">Recovery Logs</h2>
              <p className="text-sm text-gray-500">History of sent reminders</p>
            </div>

            {logs.length > 0 ? (
              <div className="divide-y">
                {logs.map((log, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          log.result?.success ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className="font-medium">Reminder #{log.reminder_number}</span>
                        <span className="text-sm text-gray-500">
                          to {log.phone?.slice(0, 4)}****{log.phone?.slice(-4)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{log.message?.slice(0, 150)}...</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No recovery logs yet</p>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && settings && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-6">Recovery Settings</h2>

            <div className="space-y-6 max-w-lg">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Cart Recovery</p>
                  <p className="text-sm text-gray-500">Send automated WhatsApp reminders</p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => handleUpdateSettings({ ...settings, enabled: checked })}
                />
              </div>

              {/* Timing */}
              <div className="space-y-4">
                <h3 className="font-medium">Reminder Timing</h3>
                
                <div className="flex items-center gap-4">
                  <label className="text-sm text-gray-600 w-32">1st Reminder:</label>
                  <Input
                    type="number"
                    value={settings.first_reminder_hours}
                    onChange={(e) => setSettings({ ...settings, first_reminder_hours: parseInt(e.target.value) })}
                    className="w-20"
                    min={1}
                    max={24}
                  />
                  <span className="text-sm text-gray-500">hours after abandonment</span>
                </div>

                <div className="flex items-center gap-4">
                  <label className="text-sm text-gray-600 w-32">2nd Reminder:</label>
                  <Input
                    type="number"
                    value={settings.second_reminder_hours}
                    onChange={(e) => setSettings({ ...settings, second_reminder_hours: parseInt(e.target.value) })}
                    className="w-20"
                    min={1}
                    max={72}
                  />
                  <span className="text-sm text-gray-500">hours</span>
                </div>

                <div className="flex items-center gap-4">
                  <label className="text-sm text-gray-600 w-32">3rd Reminder:</label>
                  <Input
                    type="number"
                    value={settings.third_reminder_hours}
                    onChange={(e) => setSettings({ ...settings, third_reminder_hours: parseInt(e.target.value) })}
                    className="w-20"
                    min={24}
                    max={168}
                  />
                  <span className="text-sm text-gray-500">hours</span>
                </div>

                <div className="flex items-center gap-4">
                  <label className="text-sm text-gray-600 w-32">Max Reminders:</label>
                  <Input
                    type="number"
                    value={settings.max_reminders}
                    onChange={(e) => setSettings({ ...settings, max_reminders: parseInt(e.target.value) })}
                    className="w-20"
                    min={1}
                    max={5}
                  />
                </div>
              </div>

              {/* Discount */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Include Discount Offer</p>
                    <p className="text-sm text-gray-500">Add discount code in reminders</p>
                  </div>
                  <Switch
                    checked={settings.include_discount}
                    onCheckedChange={(checked) => setSettings({ ...settings, include_discount: checked })}
                  />
                </div>

                {settings.include_discount && (
                  <>
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-gray-600 w-32">Discount Code:</label>
                      <Input
                        value={settings.discount_code}
                        onChange={(e) => setSettings({ ...settings, discount_code: e.target.value })}
                        className="w-40"
                        placeholder="COMEBACK10"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="text-sm text-gray-600 w-32">Discount %:</label>
                      <Input
                        type="number"
                        value={settings.discount_percent}
                        onChange={(e) => setSettings({ ...settings, discount_percent: parseInt(e.target.value) })}
                        className="w-20"
                        min={5}
                        max={50}
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </>
                )}
              </div>

              <Button onClick={() => handleUpdateSettings(settings)} className="w-full">
                Save Settings
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, subtext, color }) => {
  const colors = {
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  );
};

// Action Card Component
const ActionCard = ({ title, description, icon: Icon, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-4 border-2 border-dashed rounded-xl hover:border-black hover:bg-gray-50 transition-colors text-left"
    >
      <Icon className="w-8 h-8 text-gray-400 mb-2" />
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </button>
  );
};

export default CartRecoveryDashboard;
