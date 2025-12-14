import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Store, Plus, Trash2, CheckCircle, XCircle, Settings as SettingsIcon, Key, Shield } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';
import APIKeysSettings from './APIKeysSettings';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SettingsOptimized = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingStore, setEditingStore] = useState(null);
  const [showNewStore, setShowNewStore] = useState(false);
  const [newStore, setNewStore] = useState({
    store_name: '',
    shop_url: '',
    shopify_domain: '',
    shopify_token: ''
  });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/stores`);
      setStores(response.data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async () => {
    if (!newStore.store_name || !newStore.shop_url) {
      toast.error('Store name and Shop URL are required');
      return;
    }

    try {
      await axios.post(`${API}/stores`, newStore);
      toast.success('Store created successfully');
      setNewStore({ store_name: '', shop_url: '', shopify_domain: '', shopify_token: '' });
      setShowNewStore(false);
      fetchStores();
    } catch (error) {
      console.error('Error creating store:', error);
      toast.error(error.response?.data?.detail || 'Failed to create store');
    }
  };

  const handleUpdateStore = async (storeId, updates) => {
    try {
      await axios.put(`${API}/stores/${storeId}`, updates);
      toast.success('Store updated successfully');
      setEditingStore(null);
      fetchStores();
    } catch (error) {
      console.error('Error updating store:', error);
      toast.error(error.response?.data?.detail || 'Failed to update store');
    }
  };

  const handleDeleteStore = async (storeId, storeName) => {
    if (!window.confirm(`Are you sure you want to delete ${storeName}?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/stores/${storeId}`);
      toast.success('Store deleted successfully');
      fetchStores();
    } catch (error) {
      console.error('Error deleting store:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete store');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading settings..." size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-500 mt-1">Configure stores and Shopify integration</p>
        </div>
        <Button onClick={() => setShowNewStore(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Store
        </Button>
      </div>

      <Tabs defaultValue="stores" className="w-full">
        <TabsList>
          <TabsTrigger value="stores">
            <Store className="h-4 w-4 mr-2" />
            Stores
          </TabsTrigger>
          <TabsTrigger value="shopify">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Shopify Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stores" className="space-y-4">
          {/* New Store Form */}
          {showNewStore && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle>Add New Store</CardTitle>
                <CardDescription>Create a new store configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="store_name">Store Name *</Label>
                  <Input
                    id="store_name"
                    value={newStore.store_name}
                    onChange={(e) => setNewStore({ ...newStore, store_name: e.target.value })}
                    placeholder="e.g., tnvcollectionpk"
                  />
                </div>
                <div>
                  <Label htmlFor="shop_url">Shop URL *</Label>
                  <Input
                    id="shop_url"
                    value={newStore.shop_url}
                    onChange={(e) => setNewStore({ ...newStore, shop_url: e.target.value })}
                    placeholder="e.g., tnvcollectionpk.myshopify.com"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateStore}>Create Store</Button>
                  <Button variant="outline" onClick={() => setShowNewStore(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Stores */}
          <div className="grid gap-4">
            {stores.map((store) => (
              <Card key={store.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Store className="h-6 w-6" />
                      <div>
                        <CardTitle>{store.store_name}</CardTitle>
                        <CardDescription>{store.shop_url}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {store.shopify_token ? (
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Configured
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Configured
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingStore(store.id)}
                      >
                        Configure Shopify
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteStore(store.id, store.store_name)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {editingStore === store.id && (
                  <CardContent className="space-y-4 border-t pt-4">
                    <ShopifyConfigForm
                      store={store}
                      onSave={(updates) => handleUpdateStore(store.id, updates)}
                      onCancel={() => setEditingStore(null)}
                    />
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="shopify" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shopify API Configuration Guide</CardTitle>
              <CardDescription>How to get your Shopify API credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">📋 Steps to Get API Credentials:</h3>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal ml-5">
                  <li>Go to your Shopify Admin: <strong>yourstore.myshopify.com/admin</strong></li>
                  <li>Navigate to: <strong>Settings → Apps and sales channels → Develop apps</strong></li>
                  <li>Click <strong>"Create an app"</strong></li>
                  <li>Give it a name (e.g., "Order Manager")</li>
                  <li>Go to <strong>Configuration tab</strong></li>
                  <li>Under <strong>Admin API</strong>, click "Configure"</li>
                  <li>Select these scopes:
                    <ul className="ml-5 mt-1">
                      <li>• read_orders</li>
                      <li>• read_customers</li>
                      <li>• read_products</li>
                      <li>• read_inventory</li>
                    </ul>
                  </li>
                  <li>Click <strong>"Install app"</strong></li>
                  <li>Copy the <strong>Admin API access token</strong></li>
                  <li>Use the token in the "Configure Shopify" form above</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important:</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Store your API token securely</li>
                  <li>• Never share your token publicly</li>
                  <li>• Each store needs its own API token</li>
                  <li>• Token format: shpat_xxxxxxxxxxxxxxxxxx</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Shopify Configuration Form Component
const ShopifyConfigForm = ({ store, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    shopify_domain: store.shopify_domain || '',
    shopify_token: store.shopify_token || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.shopify_domain || !formData.shopify_token) {
      toast.error('Shopify domain and token are required');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="shopify_domain">Shopify Domain *</Label>
        <Input
          id="shopify_domain"
          value={formData.shopify_domain}
          onChange={(e) => setFormData({ ...formData, shopify_domain: e.target.value })}
          placeholder="yourstore.myshopify.com"
        />
        <p className="text-xs text-gray-500 mt-1">Your Shopify store domain</p>
      </div>
      <div>
        <Label htmlFor="shopify_token">Admin API Access Token *</Label>
        <Input
          id="shopify_token"
          type="password"
          value={formData.shopify_token}
          onChange={(e) => setFormData({ ...formData, shopify_token: e.target.value })}
          placeholder="shpat_xxxxxxxxxxxxxxxxxx"
        />
        <p className="text-xs text-gray-500 mt-1">Get this from Shopify Admin → Apps → Develop apps</p>
      </div>
      <div className="flex gap-2">
        <Button type="submit">Save Configuration</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default SettingsOptimized;
