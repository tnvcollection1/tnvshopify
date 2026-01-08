import React, { useState, useEffect } from 'react';
import { 
  Bell, Send, CheckCircle, XCircle, Clock, Package, Truck, 
  MessageSquare, Settings, RefreshCw, ChevronDown, Filter,
  BarChart3, Users, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const NotificationDashboard = ({ storeName }) => {
  const [activeTab, setActiveTab] = useState('send');
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [subscriptionStats, setSubscriptionStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  
  // Send notification form
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [notificationType, setNotificationType] = useState('shipped');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, [storeName]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadLogs(),
        loadSubscriptionStats(),
        loadSettings(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/order-notifications/stats?store_name=${storeName}&days=30`);
      const data = await response.json();
      if (data.success) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/order-notifications/logs?store_name=${storeName}&limit=50`);
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const loadSubscriptionStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/stats/${storeName}`);
      const data = await response.json();
      if (data.success) {
        setSubscriptionStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading subscription stats:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/store-settings/${storeName}`);
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/store-settings/${storeName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
        toast.success('Settings updated');
      }
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const sendNotification = async (orderId) => {
    setSending(true);
    try {
      const response = await fetch(`${API_URL}/api/order-notifications/send-by-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          store_name: storeName,
          notification_type: notificationType,
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Notification sent for order #${orderId}`);
        loadLogs();
        loadStats();
      } else {
        toast.error(data.error || data.message || 'Failed to send notification');
      }
    } catch (error) {
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (success) => {
    return success ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getNotificationTypeIcon = (type) => {
    switch (type) {
      case 'order_confirmed':
        return <Package className="w-4 h-4" />;
      case 'order_shipped':
        return <Truck className="w-4 h-4" />;
      case 'order_delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'order_out_for_delivery':
        return <Truck className="w-4 h-4" />;
      case 'payment_reminder':
        return <Clock className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Notifications</h1>
            <p className="text-gray-500">Manage order notifications for {storeName}</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Subscribers</p>
              <p className="text-2xl font-bold text-gray-900">
                {subscriptionStats?.verified_subscriptions || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sent (30 days)</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.totals?.sent || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Failed</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.totals?.failed || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.totals?.success_rate || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {[
            { id: 'send', label: 'Send Notifications', icon: Send },
            { id: 'logs', label: 'Activity Log', icon: Clock },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Send Tab */}
          {activeTab === 'send' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Notification Consent Required</p>
                  <p className="text-sm text-yellow-700">
                    Notifications will only be sent to customers who have verified their WhatsApp and opted in.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Type
                  </label>
                  <select
                    value={notificationType}
                    onChange={(e) => setNotificationType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="confirmed">Order Confirmed</option>
                    <option value="shipped">Order Shipped</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Order Delivered</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="orderIdInput"
                      placeholder="Enter order ID or number"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('orderIdInput');
                        if (input.value) {
                          sendNotification(input.value);
                        }
                      }}
                      disabled={sending}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center gap-2"
                    >
                      {sending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Send
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Stats by Type */}
              {stats?.by_type && Object.keys(stats.by_type).length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Notifications by Type (30 days)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(stats.by_type).map(([type, counts]) => (
                      <div key={type} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          {getNotificationTypeIcon(type)}
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">{counts.sent}</p>
                        {counts.failed > 0 && (
                          <p className="text-xs text-red-500">{counts.failed} failed</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div>
              {logs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No notifications sent yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Order</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Phone</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            {getStatusIcon(log.success)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {getNotificationTypeIcon(log.notification_type)}
                              <span className="text-sm capitalize">
                                {log.notification_type?.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            #{log.order_id?.slice(-6) || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {log.phone?.slice(-4).padStart(log.phone?.length || 4, '*')}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {formatDate(log.sent_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-4">Auto-Send Notifications</h3>
                <div className="space-y-4">
                  {[
                    { key: 'auto_send_order_confirmed', label: 'Order Confirmation', desc: 'Automatically send when order is placed' },
                    { key: 'auto_send_order_shipped', label: 'Shipping Notification', desc: 'Automatically send when order is fulfilled' },
                    { key: 'auto_send_order_delivered', label: 'Delivery Confirmation', desc: 'Automatically send when order is delivered' },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{setting.label}</p>
                        <p className="text-sm text-gray-500">{setting.desc}</p>
                      </div>
                      <button
                        onClick={() => updateSettings({
                          ...settings,
                          [setting.key]: !settings[setting.key]
                        })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings[setting.key] ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings[setting.key] ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-4">Verification</h3>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Require OTP Verification</p>
                    <p className="text-sm text-gray-500">
                      Customers must verify their WhatsApp before receiving notifications
                    </p>
                  </div>
                  <button
                    onClick={() => updateSettings({
                      ...settings,
                      require_otp_verification: !settings.require_otp_verification
                    })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.require_otp_verification !== false ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.require_otp_verification !== false ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationDashboard;
