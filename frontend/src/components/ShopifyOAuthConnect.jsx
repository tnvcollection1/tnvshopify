import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Store,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Unplug,
  ShoppingBag,
  Globe,
  Calendar,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ShopifyOAuthConnect = ({ onConnectionChange }) => {
  const [shopDomain, setShopDomain] = useState('');
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchConnections();
    
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const shopifyConnected = urlParams.get('shopify_connected');
    const shopifyError = urlParams.get('shopify_error');
    const shop = urlParams.get('shop');
    
    if (shopifyConnected === 'true') {
      toast.success(`🎉 Successfully connected ${shop || 'Shopify store'}!`);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchConnections();
      if (onConnectionChange) onConnectionChange();
    }
    
    if (shopifyError) {
      const message = urlParams.get('message') || 'Connection failed';
      toast.error(`Shopify connection failed: ${message}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/shopify/oauth/connections`);
      setConnections(response.data.connections || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!shopDomain.trim()) {
      toast.error('Please enter your Shopify store domain');
      return;
    }

    setConnecting(true);
    
    try {
      // Get the auth URL
      const response = await axios.get(`${API}/shopify/oauth/auth-url`, {
        params: { shop: shopDomain.trim() }
      });
      
      if (response.data.auth_url) {
        // Redirect to Shopify OAuth
        window.location.href = response.data.auth_url;
      }
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      toast.error(error.response?.data?.detail || 'Failed to connect to Shopify');
      setConnecting(false);
    }
  };

  const handleDisconnect = async (shopDomain) => {
    if (!window.confirm(`Are you sure you want to disconnect ${shopDomain}?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/shopify/oauth/disconnect/${shopDomain}`);
      toast.success(`Disconnected ${shopDomain}`);
      fetchConnections();
      if (onConnectionChange) onConnectionChange();
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect store');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Alert className="bg-green-50 border-green-200">
        <Shield className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>🔐 Secure OAuth Connection:</strong> Connect your Shopify stores with one click. 
          No need to manually copy API tokens - Wamerce uses secure OAuth 2.0 authentication.
        </AlertDescription>
      </Alert>

      {/* Connect New Store */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-green-600" />
            Connect Shopify Store
          </CardTitle>
          <CardDescription>
            Enter your store domain and click connect to authorize Wamerce
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="shop-domain" className="sr-only">Store Domain</Label>
              <div className="flex">
                <Input
                  id="shop-domain"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  placeholder="mystore"
                  className="rounded-r-none"
                />
                <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md">
                  .myshopify.com
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter just your store name (e.g., "mystore" for mystore.myshopify.com)
              </p>
            </div>
            <Button 
              onClick={handleConnect}
              disabled={connecting || !shopDomain.trim()}
              className="bg-[#95BF47] hover:bg-[#7EA83B] text-white min-w-[160px]"
            >
              {connecting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Store className="w-4 h-4 mr-2" />
              )}
              {connecting ? 'Connecting...' : 'Connect Store'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connected Stores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Connected Stores
            </span>
            <Button variant="ghost" size="sm" onClick={fetchConnections}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
          <CardDescription>
            {connections.length} store{connections.length !== 1 ? 's' : ''} connected via OAuth
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading connections...
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Store className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No Stores Connected</h3>
              <p className="text-sm">Connect your first Shopify store above to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <div
                  key={connection.shop}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#95BF47] rounded-lg flex items-center justify-center">
                      <Store className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">
                          {connection.shop_info?.name || connection.shop}
                        </h4>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{connection.shop}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Connected: {formatDate(connection.connected_at)}
                        </span>
                        {connection.shop_info?.plan_name && (
                          <span>Plan: {connection.shop_info.plan_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://${connection.shop}/admin`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Admin
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDisconnect(connection.shop)}
                    >
                      <Unplug className="w-4 h-4 mr-1" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scopes Info */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-gray-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-800">Permissions Requested</h4>
              <p className="text-sm text-gray-600 mt-1 mb-2">
                Wamerce requests the following permissions from your Shopify store:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <Badge variant="outline">📦 Read Orders</Badge>
                <Badge variant="outline">✏️ Write Orders</Badge>
                <Badge variant="outline">👥 Read Customers</Badge>
                <Badge variant="outline">🏷️ Read Products</Badge>
                <Badge variant="outline">📊 Read Inventory</Badge>
                <Badge variant="outline">🚚 Read Fulfillments</Badge>
                <Badge variant="outline">📝 Draft Orders</Badge>
                <Badge variant="outline">📍 Read Locations</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopifyOAuthConnect;
