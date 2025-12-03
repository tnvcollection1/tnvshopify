import React, { useState, useEffect } from 'react';
import { Store, CheckCircle, XCircle, Loader2, AlertCircle, Truck, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';

const Settings = () => {
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

  useEffect(() => {
    fetchStores();
    fetchTcsConfig();
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
        <p className="text-sm text-gray-500 mt-1">Configure Shopify integration for your stores</p>
      </div>
      
      <div className="p-8 space-y-6">
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
      </div>
    </div>
  );
};

export default Settings;