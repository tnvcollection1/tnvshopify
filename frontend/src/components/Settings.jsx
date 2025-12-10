import React, { useState, useEffect } from 'react';
import { Store, CheckCircle, XCircle, Loader2, AlertCircle, Truck, Package, Key, RefreshCw, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const Settings = () => {
  const { agent } = useAuth();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [formData, setFormData] = useState({});
  const [tcsConfig, setTcsConfig] = useState({
    auth_type: 'bearer',
    bearer_token: '',
    token_expiry: '',
    username: '',
    password: '',
    customer_no: ''
  });
  const [tcsConfigured, setTcsConfigured] = useState(false);
  const [savingTcs, setSavingTcs] = useState(false);
  
  // DTDC config state
  const [dtdcConfig, setDtdcConfig] = useState({
    username: '',
    password: '',
    api_url: 'https://customer.dtdc.in/api'
  });
  const [dtdcConfigured, setDtdcConfigured] = useState(false);
  const [savingDtdc, setSavingDtdc] = useState(false);
  
  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Auto-sync state
  const [autoSyncSettings, setAutoSyncSettings] = useState({
    enabled: false,
    interval_minutes: 60,
    sync_shopify: true,
    sync_tcs: true,
    sync_inventory: true,
    last_sync: null
  });
  const [savingAutoSync, setSavingAutoSync] = useState(false);
  const [triggeringSync, setTriggeringSync] = useState(false);

  useEffect(() => {
    fetchStores();
    fetchTcsConfig();
    fetchDtdcConfig();
    fetchAutoSyncSettings();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/stores`);
      if (!response.ok) throw new Error('Failed to fetch stores');
      const data = await response.json();
      setStores(data);
      
      // Initialize form data
      const initialFormData = {};
      data.forEach(store => {
        initialFormData[store.store_name] = {
          shopify_domain: store.shopify_domain || '',
          shopify_token: store.shopify_token || '',
        };
      });
      setFormData(initialFormData);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const fetchTcsConfig = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tcs/credentials`);
      if (!response.ok) throw new Error('Failed to fetch TCS config');
      const data = await response.json();
      
      if (data.configured) {
        setTcsConfigured(true);
        setTcsConfig(prev => ({
          ...prev,
          auth_type: data.auth_type || 'bearer',
          customer_no: data.customer_no || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching TCS config:', error);
    }
  };

  const handleInputChange = (storeName, field, value) => {
    setFormData(prev => ({
      ...prev,
      [storeName]: {
        ...prev[storeName],
        [field]: value
      }
    }));
  };

  const handleSaveStore = async (storeName) => {
    const data = formData[storeName];
    
    if (!data.shopify_domain || !data.shopify_token) {
      toast.error('Both Shopify domain and API token are required');
      return;
    }

    setSaving(storeName);
    
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/shopify/configure?store_name=${storeName}&shopify_domain=${data.shopify_domain}&shopify_token=${data.shopify_token}`,
        { method: 'POST' }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to configure Shopify');
      }
      
      const result = await response.json();
      toast.success(`Shopify configured successfully for ${storeName}!`);
      
      // Refresh stores to get updated status
      await fetchStores();
    } catch (error) {
      console.error('Error configuring Shopify:', error);
      toast.error(error.message || 'Failed to configure Shopify');
    } finally {
      setSaving(null);
    }
  };

  const handleTcsConfigChange = (field, value) => {
    setTcsConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveTcsConfig = async () => {
    if (tcsConfig.auth_type === 'bearer') {
      if (!tcsConfig.bearer_token) {
        toast.error('Bearer token is required');
        return;
      }
    } else {
      if (!tcsConfig.username || !tcsConfig.password) {
        toast.error('Username and password are required');
        return;
      }
    }

    setSavingTcs(true);

    try {
      const payload = {
        auth_type: tcsConfig.auth_type
      };

      if (tcsConfig.auth_type === 'bearer') {
        payload.bearer_token = tcsConfig.bearer_token;
        payload.token_expiry = tcsConfig.token_expiry;
      } else {
        payload.username = tcsConfig.username;
        payload.password = tcsConfig.password;
      }

      if (tcsConfig.customer_no) {
        payload.customer_no = tcsConfig.customer_no;
      }

      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/tcs/configure`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to configure TCS API');
      }

      toast.success('TCS API configured successfully!');
      setTcsConfigured(true);
      await fetchTcsConfig();
    } catch (error) {
      console.error('Error configuring TCS:', error);
      toast.error(error.message || 'Failed to configure TCS API');
    } finally {
      setSavingTcs(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    setChangingPassword(true);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/agents/change-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: agent?.username,
            current_password: passwordForm.current_password,
            new_password: passwordForm.new_password
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password');
      }

      toast.success('Password changed successfully!');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const fetchAutoSyncSettings = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/settings/auto-sync`);
      if (!response.ok) throw new Error('Failed to fetch auto-sync settings');
      const data = await response.json();
      setAutoSyncSettings(data);
    } catch (error) {
      console.error('Error fetching auto-sync settings:', error);
    }
  };

  const handleSaveAutoSync = async () => {
    setSavingAutoSync(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/settings/auto-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(autoSyncSettings)
      });
      
      if (!response.ok) throw new Error('Failed to save auto-sync settings');
      
      toast.success('Auto-sync settings saved successfully!');
      fetchAutoSyncSettings(); // Refresh
    } catch (error) {
      console.error('Error saving auto-sync settings:', error);
      toast.error('Failed to save auto-sync settings');
    } finally {
      setSavingAutoSync(false);
    }
  };

  const handleTriggerSync = async () => {
    setTriggeringSync(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/settings/auto-sync/trigger`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to trigger sync');
      
      const data = await response.json();
      toast.success(`Sync completed! ${data.stores_synced} stores synced.`);
      fetchAutoSyncSettings(); // Refresh to get last_sync time
    } catch (error) {
      console.error('Error triggering sync:', error);
      toast.error('Failed to trigger sync');
    } finally {
      setTriggeringSync(false);
    }
  };

  const getStoreStatus = (store) => {
    if (store.shopify_domain && store.shopify_token) {
      return {
        configured: true,
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Configured'
      };
    }
    return {
      configured: false,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: 'Not Configured'
    };
  };

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure integrations and system preferences</p>
      </div>
      
      <div className="p-8">
        <Tabs defaultValue="shopify" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-4">
            <TabsTrigger value="shopify" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Shopify Integration
            </TabsTrigger>
            <TabsTrigger value="tcs" className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              TCS API
            </TabsTrigger>
            <TabsTrigger value="autosync" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Auto-Sync
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Shopify Integration Tab */}
          <TabsContent value="shopify" className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Shopify Configuration</h3>
                <p className="text-sm text-blue-700">
                  Configure Shopify credentials for each store to enable order syncing, inventory management, and tracking updates.
                </p>
              </div>
            </div>

            {/* Store Configuration Cards */}
            <div className="grid gap-6">
          {stores.map(store => {
            const status = getStoreStatus(store);
            const StatusIcon = status.icon;
            const storeFormData = formData[store.store_name] || {};

            return (
              <Card key={store.store_name} className={`border-2 ${status.borderColor}`}>
                <CardHeader className={status.bgColor}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Store className="w-6 h-6 text-gray-700" />
                      <div>
                        <CardTitle className="text-xl">{store.store_name}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {store.shop_url}
                        </CardDescription>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${status.bgColor} border ${status.borderColor}`}>
                      <StatusIcon className={`w-4 h-4 ${status.color}`} />
                      <span className={`text-sm font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-4">
                  {store.last_synced_at && (
                    <div className="text-sm text-gray-600 mb-4">
                      Last synced: {new Date(store.last_synced_at).toLocaleString()}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`domain-${store.store_name}`}>
                        Shopify Domain
                      </Label>
                      <Input
                        id={`domain-${store.store_name}`}
                        type="text"
                        placeholder="yourstore.myshopify.com"
                        value={storeFormData.shopify_domain || ''}
                        onChange={(e) => handleInputChange(store.store_name, 'shopify_domain', e.target.value)}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500">
                        Your Shopify store domain (e.g., yourstore.myshopify.com)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`token-${store.store_name}`}>
                        Admin API Access Token
                      </Label>
                      <Input
                        id={`token-${store.store_name}`}
                        type="password"
                        placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
                        value={storeFormData.shopify_token || ''}
                        onChange={(e) => handleInputChange(store.store_name, 'shopify_token', e.target.value)}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500">
                        Your Shopify Admin API access token (starts with shpat_)
                      </p>
                    </div>

                    <Button
                      onClick={() => handleSaveStore(store.store_name)}
                      disabled={saving === store.store_name}
                      className="w-full sm:w-auto"
                    >
                      {saving === store.store_name ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving & Testing...
                        </>
                      ) : (
                        'Save Configuration'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
            </div>

            {stores.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Store className="w-16 h-16 text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Stores Found</h3>
                  <p className="text-gray-500">No stores available to configure</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TCS API Integration Tab */}
          <TabsContent value="tcs" className="space-y-6">
            {/* Info Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-purple-900 mb-1">TCS API Configuration</h3>
                <p className="text-sm text-purple-700">
                  Configure TCS Pakistan courier API credentials to enable delivery tracking, COD payment status, and shipment updates.
                </p>
              </div>
            </div>

            {/* TCS Configuration Card */}
            <Card className={`border-2 ${tcsConfigured ? 'border-green-200' : 'border-gray-200'}`}>
              <CardHeader className={tcsConfigured ? 'bg-green-50' : 'bg-gray-50'}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className="w-6 h-6 text-gray-700" />
                    <div>
                      <CardTitle className="text-xl">TCS Pakistan API</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        Delivery tracking and COD payment integration
                      </CardDescription>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
                    tcsConfigured 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    {tcsConfigured ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Configured</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-600">Not Configured</span>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-4">
                <div className="space-y-4">
                  {/* Authentication Type */}
                  <div className="space-y-2">
                    <Label>Authentication Type</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="auth_type"
                          value="bearer"
                          checked={tcsConfig.auth_type === 'bearer'}
                          onChange={(e) => handleTcsConfigChange('auth_type', e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Bearer Token</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="auth_type"
                          value="basic"
                          checked={tcsConfig.auth_type === 'basic'}
                          onChange={(e) => handleTcsConfigChange('auth_type', e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Username/Password</span>
                      </label>
                    </div>
                  </div>

                  {/* Bearer Token Fields */}
                  {tcsConfig.auth_type === 'bearer' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="bearer_token">Bearer Token</Label>
                        <Input
                          id="bearer_token"
                          type="password"
                          placeholder="Enter your TCS API bearer token"
                          value={tcsConfig.bearer_token}
                          onChange={(e) => handleTcsConfigChange('bearer_token', e.target.value)}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500">
                          Your TCS API bearer token for authentication
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="token_expiry">Token Expiry (Optional)</Label>
                        <Input
                          id="token_expiry"
                          type="datetime-local"
                          value={tcsConfig.token_expiry}
                          onChange={(e) => handleTcsConfigChange('token_expiry', e.target.value)}
                          className="text-sm"
                        />
                        <p className="text-xs text-gray-500">
                          When this token expires (leave empty if no expiry)
                        </p>
                      </div>
                    </>
                  )}

                  {/* Username/Password Fields */}
                  {tcsConfig.auth_type === 'basic' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="tcs_username">Username</Label>
                        <Input
                          id="tcs_username"
                          type="text"
                          placeholder="TCS API username"
                          value={tcsConfig.username}
                          onChange={(e) => handleTcsConfigChange('username', e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tcs_password">Password</Label>
                        <Input
                          id="tcs_password"
                          type="password"
                          placeholder="TCS API password"
                          value={tcsConfig.password}
                          onChange={(e) => handleTcsConfigChange('password', e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                    </>
                  )}

                  {/* Customer Number */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_no">TCS Customer Number (Optional)</Label>
                    <Input
                      id="customer_no"
                      type="text"
                      placeholder="046809"
                      value={tcsConfig.customer_no}
                      onChange={(e) => handleTcsConfigChange('customer_no', e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      Your TCS customer number for COD payment tracking
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveTcsConfig}
                    disabled={savingTcs}
                    className="w-full sm:w-auto"
                  >
                    {savingTcs ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving Configuration...
                      </>
                    ) : (
                      'Save TCS Configuration'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Auto-Sync Tab */}
          <TabsContent value="autosync" className="space-y-6">
            {/* Info Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-purple-900 mb-1">Automatic Sync Configuration</h3>
                <p className="text-sm text-purple-700">
                  Configure automatic syncing of orders, tracking, and inventory. When enabled, the system will sync all stores at the specified interval.
                </p>
              </div>
            </div>

            {/* Auto-Sync Settings Card */}
            <Card className="border-2">
              <CardHeader className="bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-6 h-6 text-gray-700" />
                    <div>
                      <CardTitle className="text-xl">Auto-Sync Settings</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {autoSyncSettings.last_sync 
                          ? `Last synced: ${new Date(autoSyncSettings.last_sync).toLocaleString()}`
                          : 'Never synced'}
                      </CardDescription>
                    </div>
                  </div>
                  <Button 
                    onClick={handleTriggerSync}
                    disabled={triggeringSync}
                    variant="outline"
                  >
                    {triggeringSync ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing...</>
                    ) : (
                      <><RefreshCw className="w-4 h-4 mr-2" /> Sync Now</>
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <div>
                      <Label className="text-base font-semibold">Enable Auto-Sync</Label>
                      <p className="text-sm text-gray-600 mt-1">
                        Automatically sync all stores at regular intervals
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoSyncSettings.enabled}
                      onChange={(e) => setAutoSyncSettings({...autoSyncSettings, enabled: e.target.checked})}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className={`text-sm font-medium ${autoSyncSettings.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {autoSyncSettings.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                {/* Sync Interval */}
                <div className="space-y-2">
                  <Label htmlFor="interval">Sync Interval (minutes)</Label>
                  <Input
                    id="interval"
                    type="number"
                    min="15"
                    max="1440"
                    value={autoSyncSettings.interval_minutes}
                    onChange={(e) => setAutoSyncSettings({...autoSyncSettings, interval_minutes: parseInt(e.target.value)})}
                    disabled={!autoSyncSettings.enabled}
                  />
                  <p className="text-xs text-gray-500">
                    Recommended: 60 minutes (1 hour). Minimum: 15 minutes. Maximum: 1440 minutes (24 hours).
                  </p>
                </div>

                {/* Sync Options */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">What to Sync</Label>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={autoSyncSettings.sync_shopify}
                        onChange={(e) => setAutoSyncSettings({...autoSyncSettings, sync_shopify: e.target.checked})}
                        disabled={!autoSyncSettings.enabled}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <Store className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <div className="font-medium">Shopify Orders</div>
                        <div className="text-sm text-gray-600">Sync new orders from all Shopify stores</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={autoSyncSettings.sync_tcs}
                        onChange={(e) => setAutoSyncSettings({...autoSyncSettings, sync_tcs: e.target.checked})}
                        disabled={!autoSyncSettings.enabled}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <Truck className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <div className="font-medium">TCS Tracking</div>
                        <div className="text-sm text-gray-600">Update delivery status from TCS</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={autoSyncSettings.sync_inventory}
                        onChange={(e) => setAutoSyncSettings({...autoSyncSettings, sync_inventory: e.target.checked})}
                        disabled={!autoSyncSettings.enabled}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <Package className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <div className="font-medium">Inventory Sync</div>
                        <div className="text-sm text-gray-600">Sync inventory with orders across all stores</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t">
                  <Button 
                    onClick={handleSaveAutoSync}
                    disabled={savingAutoSync}
                    className="w-full"
                  >
                    {savingAutoSync ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <>Save Auto-Sync Settings</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security/Password Change Tab */}
          <TabsContent value="security" className="space-y-6">
            {/* Info Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">Account Security</h3>
                <p className="text-sm text-amber-700">
                  Change your password to keep your account secure. Use a strong password with at least 6 characters.
                </p>
              </div>
            </div>

            {/* Password Change Card */}
            <Card className="border-2">
              <CardHeader className="bg-gray-50">
                <div className="flex items-center gap-3">
                  <Key className="w-6 h-6 text-gray-700" />
                  <div>
                    <CardTitle className="text-xl">Change Password</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Update your account password
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-4">
                {agent && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <span className="font-semibold">Current User:</span> {agent.username} ({agent.full_name})
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Current Password</Label>
                    <Input
                      id="current_password"
                      type="password"
                      placeholder="Enter your current password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <Input
                      id="new_password"
                      type="password"
                      placeholder="Enter new password (min 6 characters)"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      placeholder="Re-enter new password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="w-full sm:w-auto"
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Changing Password...
                        </>
                      ) : (
                        'Change Password'
                      )}
                    </Button>
                  </div>

                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Password Requirements:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Minimum 6 characters</li>
                      <li>• Use a combination of letters, numbers, and symbols</li>
                      <li>• Avoid common words or patterns</li>
                      <li>• Don't reuse old passwords</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;