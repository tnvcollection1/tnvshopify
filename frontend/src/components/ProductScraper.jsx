import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Search,
  Download,
  Loader2,
  ExternalLink,
  Plus,
  Trash2,
  Package,
  ShoppingCart,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';

const API = process.env.REACT_APP_BACKEND_URL;

const ProductScraper = () => {
  const { stores } = useStore();
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [createInShopify, setCreateInShopify] = useState(false);
  const [maxProducts, setMaxProducts] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Fetch scraped products
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
      });
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`${API}/api/1688-scraper/products?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.products || []);
        setTotalProducts(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Poll job status
  useEffect(() => {
    if (!currentJobId) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API}/api/1688-scraper/job/${currentJobId}`);
        const data = await response.json();
        
        if (data.success) {
          setJobStatus(data.job);
          
          if (data.job.status === 'completed' || data.job.status === 'failed') {
            clearInterval(pollInterval);
            setIsLoading(false);
            setCurrentJobId(null);
            fetchProducts();
            
            if (data.job.status === 'completed') {
              toast.success(`Scraped ${data.job.products_scraped} products! ${data.job.products_created} created in Shopify.`);
            } else {
              toast.error('Scraping failed: ' + (data.job.error || 'Unknown error'));
            }
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 2000);
    
    return () => clearInterval(pollInterval);
  }, [currentJobId, fetchProducts]);

  // Start scraping
  const startScrape = async () => {
    if (!scrapeUrl.trim()) {
      toast.error('Please enter a 1688 URL');
      return;
    }
    
    setIsLoading(true);
    setJobStatus(null);
    
    try {
      const response = await fetch(`${API}/api/1688-scraper/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: scrapeUrl,
          store_name: createInShopify ? selectedStore : null,
          create_in_shopify: createInShopify && selectedStore,
          max_products: maxProducts,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentJobId(data.job_id);
        toast.info('Scraping started...');
      } else {
        toast.error(data.detail || 'Failed to start scraping');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Scrape error:', error);
      toast.error('Failed to start scraping');
      setIsLoading(false);
    }
  };

  // Import single product to Shopify
  const importToShopify = async (productId) => {
    if (!selectedStore) {
      toast.error('Please select a Shopify store first');
      return;
    }
    
    try {
      const response = await fetch(
        `${API}/api/1688-scraper/import-to-shopify/${productId}?store_name=${selectedStore}`,
        { method: 'POST' }
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Product imported to Shopify!');
        fetchProducts();
      } else {
        toast.error(data.detail || 'Failed to import');
      }
    } catch (error) {
      toast.error('Failed to import product');
    }
  };

  // Delete scraped product
  const deleteProduct = async (productId) => {
    try {
      const response = await fetch(`${API}/api/1688-scraper/products/${productId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Product deleted');
        fetchProducts();
      }
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">1688 Product Scraper</h1>
          <p className="text-sm text-gray-500 mt-1">
            Scrape products from 1688 store/collection pages and import to Shopify
          </p>
        </div>
        <Badge className="bg-orange-500 text-white">
          {totalProducts} Products Scraped
        </Badge>
      </div>

      {/* Scrape Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="w-5 h-5 text-orange-500" />
            Scrape Products from 1688
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1">
                1688 Store/Collection URL
              </label>
              <Input
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                placeholder="https://shop123456.1688.com or collection URL"
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Paste the URL of a 1688 store page or product collection
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Max Products to Scrape
              </label>
              <Input
                type="number"
                min="1"
                max="100"
                value={maxProducts}
                onChange={(e) => setMaxProducts(parseInt(e.target.value) || 20)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Import to Shopify Store
              </label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Select store (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Don't import</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.store_name} value={store.store_name}>
                      {store.store_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedStore && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createInShopify"
                checked={createInShopify}
                onChange={(e) => setCreateInShopify(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="createInShopify" className="text-sm text-gray-700">
                Auto-create products in Shopify after scraping
              </label>
            </div>
          )}
          
          <Button
            onClick={startScrape}
            disabled={isLoading || !scrapeUrl.trim()}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scraping... {jobStatus?.progress || 0}%
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Start Scraping
              </>
            )}
          </Button>
          
          {/* Job Progress */}
          {jobStatus && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <Badge className={
                  jobStatus.status === 'completed' ? 'bg-green-500' :
                  jobStatus.status === 'failed' ? 'bg-red-500' :
                  'bg-blue-500'
                }>
                  {jobStatus.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Products Found:</span>
                <span className="font-medium">{jobStatus.products_scraped || 0}</span>
              </div>
              {createInShopify && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Created in Shopify:</span>
                  <span className="font-medium text-green-600">{jobStatus.products_created || 0}</span>
                </div>
              )}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all"
                  style={{ width: `${jobStatus.progress || 0}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-500" />
              Scraped Products ({totalProducts})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchProducts}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No products scraped yet</p>
              <p className="text-sm">Enter a 1688 URL above to start scraping</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <div
                  key={product.product_id}
                  className="border rounded-lg overflow-hidden hover:border-orange-300 transition-colors"
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-100 relative">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100" style={{ display: product.images?.[0] ? 'none' : 'flex' }}>
                      <ImageIcon className="w-12 h-12 text-gray-300" />
                    </div>
                    {product.shopify_product_id && (
                      <Badge className="absolute top-2 right-2 bg-green-500 text-white text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        In Shopify
                      </Badge>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-3 space-y-2">
                    <h3 className="font-medium text-sm line-clamp-2" title={product.title}>
                      {product.title || `Product ${product.product_id}`}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-orange-600 font-bold">
                        ¥{product.price || 0}
                      </span>
                      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                        {product.product_id}
                      </code>
                    </div>
                    {product.seller_name && (
                      <p className="text-xs text-gray-500 truncate">
                        {product.seller_name}
                      </p>
                    )}
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 h-8 text-xs"
                        onClick={() => window.open(product.url, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      {!product.shopify_product_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 h-8 text-xs text-green-600"
                          onClick={() => importToShopify(product.product_id)}
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          Import
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500"
                        onClick={() => deleteProduct(product.product_id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {totalProducts > 20 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {Math.ceil(totalProducts / 20)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= Math.ceil(totalProducts / 20)}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductScraper;
