import React, { useState } from 'react';
import {
  Globe,
  Search,
  Package,
  Plus,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Image,
  Tag,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useStore } from '../contexts/StoreContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Product Card Component
const ProductCard = ({ product, onImport, importing }) => (
  <div className="bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow">
    <div className="aspect-square bg-gray-100 relative">
      <img
        src={product.image || product.pic_url || 'https://via.placeholder.com/200'}
        alt={product.title}
        className="w-full h-full object-cover"
      />
      {product.imported && (
        <div className="absolute top-2 right-2">
          <Badge className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Imported
          </Badge>
        </div>
      )}
    </div>
    <div className="p-3">
      <h3 className="font-medium text-sm line-clamp-2 mb-2">{product.title}</h3>
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-bold text-red-600">
          ¥{product.price || product.reserve_price || '0'}
        </span>
        {product.sold && (
          <span className="text-xs text-gray-500">{product.sold} sold</span>
        )}
      </div>
      <div className="flex gap-2">
        <Button 
          size="sm" 
          className="flex-1"
          onClick={() => onImport(product)}
          disabled={importing || product.imported}
        >
          {importing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : product.imported ? (
            'Imported'
          ) : (
            <><Plus className="w-4 h-4 mr-1" /> Import</>
          )}
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => window.open(`https://item.taobao.com/item.htm?id=${product.nid || product.product_id}`, '_blank')}
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
);

// Main Component
const TaobaoImport = () => {
  const { selectedStore, getStoreName } = useStore();
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [batchUrls, setBatchUrls] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // Search Taobao products
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setLoading(true);
    setProducts([]);
    try {
      const response = await axios.get(`${API}/api/taobao/shop/products`, {
        params: { keyword: searchQuery, limit: 24 }
      });
      setProducts(response.data.products || response.data || []);
      if (response.data.products?.length === 0) {
        toast.info('No products found');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Make sure TMAPI is configured.');
    } finally {
      setLoading(false);
    }
  };

  // Import single product
  const handleImportProduct = async (product) => {
    if (!selectedStore) {
      toast.error('Please select a store first');
      return;
    }

    setImporting(product.nid || product.product_id);
    try {
      const response = await axios.post(`${API}/api/taobao/product/${product.nid || product.product_id}`, {
        store_name: selectedStore
      });
      
      // Mark as imported
      setProducts(prev => prev.map(p => 
        (p.nid || p.product_id) === (product.nid || product.product_id) 
          ? { ...p, imported: true } 
          : p
      ));
      
      toast.success('Product imported successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(null);
    }
  };

  // Import from URL
  const handleUrlImport = async () => {
    if (!productUrl.trim()) {
      toast.error('Please enter a product URL');
      return;
    }

    if (!selectedStore) {
      toast.error('Please select a store first');
      return;
    }

    // Extract product ID from URL
    const match = productUrl.match(/id=(\d+)/);
    if (!match) {
      toast.error('Invalid Taobao URL. Make sure it contains the product ID.');
      return;
    }

    const productId = match[1];
    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/taobao/product/${productId}`, {
        store_name: selectedStore
      });
      toast.success('Product imported successfully');
      setProductUrl('');
      setImportResult(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  // Batch import
  const handleBatchImport = async () => {
    if (!batchUrls.trim()) {
      toast.error('Please enter product URLs');
      return;
    }

    if (!selectedStore) {
      toast.error('Please select a store first');
      return;
    }

    const urls = batchUrls.split('\n').filter(url => url.trim());
    const productIds = [];

    for (const url of urls) {
      const match = url.match(/id=(\d+)/);
      if (match) {
        productIds.push(match[1]);
      }
    }

    if (productIds.length === 0) {
      toast.error('No valid product IDs found in the URLs');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/taobao/batch-import`, {
        product_ids: productIds,
        store_name: selectedStore
      });
      toast.success(`Imported ${response.data.success || productIds.length} products`);
      setBatchUrls('');
      setImportResult(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Batch import failed');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedStore) {
    return (
      <div className="min-h-screen bg-[#f1f1f1] flex items-center justify-center">
        <div className="text-center">
          <Globe className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Please select a store first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="w-6 h-6 text-orange-500" />
                Taobao Import
              </h1>
              <p className="text-sm text-gray-500">
                Import products from Taobao to {getStoreName(selectedStore)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border mb-6">
            <TabsTrigger value="search" className="gap-2">
              <Search className="w-4 h-4" />
              Search Products
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Import by URL
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-2">
              <Package className="w-4 h-4" />
              Batch Import
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search">
            <div className="mb-6">
              <div className="flex gap-2 max-w-xl">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search Taobao products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
                <p className="text-gray-500 mt-2">Searching Taobao...</p>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {products.map((product, index) => (
                  <ProductCard
                    key={product.nid || product.product_id || index}
                    product={product}
                    onImport={handleImportProduct}
                    importing={importing === (product.nid || product.product_id)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border p-12 text-center">
                <Globe className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Search for products on Taobao</p>
                <p className="text-sm text-gray-400 mt-1">Enter keywords like "shoes", "bags", "electronics"</p>
              </div>
            )}
          </TabsContent>

          {/* URL Import Tab */}
          <TabsContent value="url">
            <div className="max-w-xl">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold mb-4">Import from Taobao URL</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Product URL</label>
                    <Input
                      placeholder="https://item.taobao.com/item.htm?id=123456789"
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Paste the full Taobao product URL
                    </p>
                  </div>
                  <Button onClick={handleUrlImport} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Import Product
                  </Button>
                </div>

                {importResult && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">Product Imported!</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      {importResult.title || 'Product added to your catalog'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Batch Import Tab */}
          <TabsContent value="batch">
            <div className="max-w-xl">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold mb-4">Batch Import from URLs</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Product URLs (one per line)</label>
                    <Textarea
                      placeholder={`https://item.taobao.com/item.htm?id=123456789
https://item.taobao.com/item.htm?id=987654321
https://item.taobao.com/item.htm?id=456789123`}
                      value={batchUrls}
                      onChange={(e) => setBatchUrls(e.target.value)}
                      rows={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter one Taobao URL per line. Maximum 50 products at a time.
                    </p>
                  </div>
                  <Button onClick={handleBatchImport} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Package className="w-4 h-4 mr-2" />}
                    Import All Products
                  </Button>
                </div>

                {importResult && importResult.success && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">Batch Import Complete!</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      {importResult.success} products imported successfully
                      {importResult.failed > 0 && `, ${importResult.failed} failed`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TaobaoImport;
