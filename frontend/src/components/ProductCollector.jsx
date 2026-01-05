import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Package,
  Upload,
  Loader2,
  Check,
  X,
  Edit,
  Trash2,
  Image as ImageIcon,
  Globe,
  ShoppingBag,
  ArrowRight,
  Plus,
  RefreshCw,
  ExternalLink,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import ProductEditModal from './ProductEditModal';

const API = process.env.REACT_APP_BACKEND_URL;

const ProductCollector = () => {
  const [urls, setUrls] = useState('');
  const [collecting, setCollecting] = useState(false);
  const [collectedProducts, setCollectedProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState('collect'); // collect, draft, published
  const [draftProducts, setDraftProducts] = useState([]);

  // Load draft products on mount
  useEffect(() => {
    loadDraftProducts();
  }, []);

  const loadDraftProducts = async () => {
    try {
      const res = await fetch(`${API}/api/1688-scraper/products?limit=50`);
      const data = await res.json();
      if (data.products) {
        setDraftProducts(data.products);
      }
    } catch (error) {
      console.error('Failed to load draft products:', error);
    }
  };

  // Collect products from URLs (like Dianxiaomi)
  const collectProducts = async () => {
    const urlList = urls.split('\n').filter(u => u.trim());
    if (urlList.length === 0) {
      toast.error('Please enter at least one product URL');
      return;
    }

    setCollecting(true);
    setCollectedProducts([]);

    try {
      // Extract product IDs from URLs
      const productIds = urlList.map(url => {
        const match = url.match(/offer\/(\d+)|item_id=(\d+)|id=(\d+)|(\d{10,})/);
        return match ? (match[1] || match[2] || match[3] || match[4]) : null;
      }).filter(Boolean);

      if (productIds.length === 0) {
        toast.error('No valid product IDs found in URLs');
        setCollecting(false);
        return;
      }

      // Use TMAPI batch import
      const res = await fetch(`${API}/api/1688-scraper/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: productIds,
          translate: true,
        }),
      });

      const data = await res.json();

      if (data.success || data.results) {
        const results = data.results || [];
        setCollectedProducts(results.filter(r => r.status === 'success').map(r => r.product));
        toast.success(`Collected ${results.filter(r => r.status === 'success').length} products`);
        loadDraftProducts();
      } else {
        toast.error(data.error || 'Collection failed');
      }
    } catch (error) {
      toast.error('Failed to collect products');
    } finally {
      setCollecting(false);
    }
  };

  // Publish selected products to Shopify
  const publishToShopify = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select products to publish');
      return;
    }

    setPublishing(true);
    try {
      const res = await fetch(`${API}/api/shopify/products/create-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: selectedProducts,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Published ${data.created || selectedProducts.length} products to Shopify!`);
        setSelectedProducts([]);
        loadDraftProducts();
      } else {
        toast.error(data.error || 'Publishing failed');
      }
    } catch (error) {
      toast.error('Failed to publish to Shopify');
    } finally {
      setPublishing(false);
    }
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAll = () => {
    const allIds = draftProducts.map(p => p.product_id);
    setSelectedProducts(allIds);
  };

  const deselectAll = () => {
    setSelectedProducts([]);
  };

  return (
    <div className="p-6 space-y-6" data-testid="product-collector">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Collector</h1>
          <p className="text-gray-500">Collect products from 1688, edit, and publish to Shopify</p>
        </div>
        <Button onClick={loadDraftProducts} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Workflow Steps */}
      <div className="flex items-center justify-center gap-4 py-4 bg-gray-50 rounded-lg">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${activeTab === 'collect' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600'}`}>
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-current/20 text-sm">1</span>
          Data Collection
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${activeTab === 'draft' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600'}`}>
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-current/20 text-sm">2</span>
          Edit & Review
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${activeTab === 'published' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600'}`}>
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-current/20 text-sm">3</span>
          Publish to Shopify
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('collect')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'collect' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'
          }`}
        >
          <Upload className="w-4 h-4" />
          Collect Products
        </button>
        <button
          onClick={() => setActiveTab('draft')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'draft' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'
          }`}
        >
          <Package className="w-4 h-4" />
          Draft Products ({draftProducts.length})
        </button>
      </div>

      {/* Collect Tab */}
      {activeTab === 'collect' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Paste Product URLs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder={`Paste 1688/Taobao/Tmall product URLs, one per line:
https://detail.1688.com/offer/123456789.html
https://detail.1688.com/offer/987654321.html
...`}
                className="w-full h-40 p-3 border rounded-lg font-mono text-sm resize-none"
                data-testid="url-input"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Supported:</span>
                <Badge variant="outline">1688</Badge>
                <Badge variant="outline">Taobao</Badge>
                <Badge variant="outline">Tmall</Badge>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={collectProducts}
                disabled={collecting || !urls.trim()}
                className="bg-orange-500 hover:bg-orange-600 gap-2"
                data-testid="collect-btn"
              >
                {collecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Collecting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Collect Products
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setUrls('')}>
                Clear
              </Button>
            </div>

            {/* Recently Collected */}
            {collectedProducts.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3 text-green-600 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Just Collected ({collectedProducts.length} products)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {collectedProducts.slice(0, 8).map((product, idx) => (
                    <div key={idx} className="border rounded-lg p-2 bg-green-50">
                      <img
                        src={product.images?.[0] || '/placeholder.png'}
                        alt={product.title}
                        className="w-full h-24 object-cover rounded"
                      />
                      <p className="text-xs mt-1 line-clamp-2">{product.title}</p>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => setActiveTab('draft')}
                  className="mt-3 gap-2"
                  variant="outline"
                >
                  View in Draft Products
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Draft Products Tab */}
      {activeTab === 'draft' && (
        <div className="space-y-4">
          {/* Actions Bar */}
          <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
              <span className="text-sm text-gray-500">
                {selectedProducts.length} selected
              </span>
            </div>
            <Button
              onClick={publishToShopify}
              disabled={publishing || selectedProducts.length === 0}
              className="bg-green-500 hover:bg-green-600 gap-2"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Store className="w-4 h-4" />
                  Publish to Shopify ({selectedProducts.length})
                </>
              )}
            </Button>
          </div>

          {/* Products Grid */}
          {draftProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No draft products yet. Collect some products first!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftProducts.map((product) => (
                <Card
                  key={product.product_id}
                  className={`cursor-pointer transition-all ${
                    selectedProducts.includes(product.product_id)
                      ? 'ring-2 ring-orange-500 bg-orange-50'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleProductSelection(product.product_id)}
                >
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      {/* Checkbox */}
                      <div className="pt-1">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedProducts.includes(product.product_id)
                            ? 'bg-orange-500 border-orange-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedProducts.includes(product.product_id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>

                      {/* Image */}
                      <div className="w-20 h-20 flex-shrink-0">
                        <img
                          src={product.images?.[0] || '/placeholder.png'}
                          alt={product.title}
                          className="w-full h-full object-cover rounded"
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/80?text=No+Image'; }}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm line-clamp-2 mb-1">
                          {product.title_en || product.title}
                        </h3>
                        <p className="text-orange-600 font-bold">
                          ¥{product.price || '---'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {product.variants?.length || 0} variants
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {product.images?.length || 0} images
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" className="flex-1 gap-1">
                        <Edit className="w-3 h-3" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={`https://detail.1688.com/offer/${product.product_id}.html`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductCollector;
