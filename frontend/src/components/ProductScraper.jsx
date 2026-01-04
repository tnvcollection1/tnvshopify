import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
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
  ListPlus,
  Link2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';

const API = process.env.REACT_APP_BACKEND_URL;

const ProductScraper = () => {
  const { stores } = useStore();
  
  // URL Scraping state
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [maxProducts, setMaxProducts] = useState(20);
  
  // Batch Import state
  const [productIds, setProductIds] = useState('');
  const [translateToEnglish, setTranslateToEnglish] = useState(true);
  
  // Shared state
  const [selectedStore, setSelectedStore] = useState('');
  const [createInShopify, setCreateInShopify] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('extension');
  
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
              toast.success(`Imported ${data.job.products_scraped} products! ${data.job.products_created} created in Shopify.`);
            } else {
              toast.error('Import failed: ' + (data.job.error || 'Unknown error'));
            }
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 2000);
    
    return () => clearInterval(pollInterval);
  }, [currentJobId, fetchProducts]);

  // Start URL scraping
  const startScrape = async () => {
    if (!scrapeUrl.trim()) {
      toast.error('Please enter a 1688 URL');
      return;
    }
    
    setIsLoading(true);
    setJobStatus(null);
    
    const storeToUse = selectedStore && selectedStore !== 'none' ? selectedStore : null;
    
    try {
      const response = await fetch(`${API}/api/1688-scraper/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: scrapeUrl,
          store_name: createInShopify ? storeToUse : null,
          create_in_shopify: createInShopify && storeToUse,
          max_products: maxProducts,
          translate: translateToEnglish,
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

  // Start batch import
  const startBatchImport = async () => {
    const ids = productIds.split(/[\n,;]+/).map(id => id.trim()).filter(Boolean);
    
    if (ids.length === 0) {
      toast.error('Please enter at least one product ID or URL');
      return;
    }
    
    setIsLoading(true);
    setJobStatus(null);
    
    const storeToUse = selectedStore && selectedStore !== 'none' ? selectedStore : null;
    
    try {
      const response = await fetch(`${API}/api/1688-scraper/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: ids,
          store_name: createInShopify ? storeToUse : null,
          create_in_shopify: createInShopify && storeToUse,
          translate: translateToEnglish,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentJobId(data.job_id);
        toast.info(`Importing ${data.product_ids.length} products...`);
      } else {
        toast.error(data.detail || 'Failed to start import');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to start import');
      setIsLoading(false);
    }
  };

  // Import single product to Shopify
  const importToShopify = async (productId) => {
    const storeToUse = selectedStore && selectedStore !== 'none' ? selectedStore : null;
    if (!storeToUse) {
      toast.error('Please select a Shopify store first');
      return;
    }
    
    try {
      const response = await fetch(
        `${API}/api/1688-scraper/import-to-shopify/${productId}?store_name=${storeToUse}`,
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
          <h1 className="text-2xl font-bold text-gray-900" data-testid="scraper-title">1688 Product Importer</h1>
          <p className="text-sm text-gray-500 mt-1">
            Import products from 1688 by URL or product IDs and push to Shopify
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a 
            href={`${API}/api/extension/download`}
            className="inline-flex items-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
            download
          >
            <Download className="w-4 h-4" />
            Chrome Extension
          </a>
          <Badge className="bg-orange-500 text-white">
            {totalProducts} Products Imported
          </Badge>
        </div>
      </div>

      {/* Extension Banner - Main Feature */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-5 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="text-4xl bg-white/20 rounded-xl p-3">🧩</div>
            <div>
              <h3 className="font-bold text-lg">WaMerce Chrome Extension v2.0</h3>
              <p className="text-sm text-purple-100 mt-1">One-click import from any 1688 page - works like Dianxiaomi!</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-1 bg-white/20 rounded text-xs">✨ Auto-detect products</span>
                <span className="px-2 py-1 bg-white/20 rounded text-xs">🌐 Auto-translate to English</span>
                <span className="px-2 py-1 bg-white/20 rounded text-xs">⚡ Bulk import</span>
              </div>
            </div>
          </div>
          <a 
            href={`${API}/download/chrome-extension`}
            className="flex-shrink-0 px-5 py-3 bg-white text-purple-700 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center gap-2 shadow-md"
            download="wamerce-1688-extension.zip"
          >
            <Download className="w-5 h-5" />
            Download
          </a>
        </div>
        
        {/* Installation Steps */}
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-xs text-purple-200 font-medium mb-2">📋 How to install:</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs text-purple-100">
            <div className="bg-white/10 rounded p-2">
              <span className="font-bold">1.</span> Download & unzip
            </div>
            <div className="bg-white/10 rounded p-2">
              <span className="font-bold">2.</span> Go to <code className="bg-white/20 px-1 rounded">chrome://extensions</code>
            </div>
            <div className="bg-white/10 rounded p-2">
              <span className="font-bold">3.</span> Enable "Developer mode"
            </div>
            <div className="bg-white/10 rounded p-2">
              <span className="font-bold">4.</span> Click "Load unpacked" → select folder
            </div>
          </div>
        </div>
      </div>

      {/* Import Methods */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="extension" className="flex items-center gap-2" data-testid="tab-extension">
                🧩 Chrome Extension
              </TabsTrigger>
              <TabsTrigger value="batch" className="flex items-center gap-2" data-testid="tab-batch">
                <ListPlus className="w-4 h-4" />
                Batch Import
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-2" data-testid="tab-url">
                <Link2 className="w-4 h-4" />
                Manual Script
              </TabsTrigger>
            </TabsList>

            {/* Extension Tab */}
            <TabsContent value="extension" className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                  Recommended: Chrome Extension (Like Dianxiaomi!)
                </h3>
                <p className="text-sm text-green-700 mb-4">
                  The extension runs in YOUR browser, so it bypasses 1688's anti-bot protection. It can scan any 1688 page and import products with one click.
                </p>
                
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <h4 className="font-medium text-gray-800 mb-3">🛠️ Setup Instructions:</h4>
                  <ol className="space-y-3 text-sm text-gray-700">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-xs">1</span>
                      <div>
                        <strong>Download the extension</strong>
                        <p className="text-gray-500 text-xs mt-0.5">Click the download button above to get the .zip file</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-xs">2</span>
                      <div>
                        <strong>Unzip the file</strong>
                        <p className="text-gray-500 text-xs mt-0.5">Extract to a folder on your computer</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-xs">3</span>
                      <div>
                        <strong>Open Chrome Extensions</strong>
                        <p className="text-gray-500 text-xs mt-0.5">
                          Go to <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">chrome://extensions</code> in your browser
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-xs">4</span>
                      <div>
                        <strong>Enable Developer Mode</strong>
                        <p className="text-gray-500 text-xs mt-0.5">Toggle the switch in the top-right corner</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-xs">5</span>
                      <div>
                        <strong>Load the extension</strong>
                        <p className="text-gray-500 text-xs mt-0.5">Click "Load unpacked" and select the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">browser-extension</code> folder</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-xs">✓</span>
                      <div>
                        <strong>Configure the server URL</strong>
                        <p className="text-gray-500 text-xs mt-0.5">
                          Click the extension icon, go to Settings, and enter: 
                          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs block mt-1">{API}</code>
                        </p>
                      </div>
                    </li>
                  </ol>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 text-sm mb-2">💡 How to use:</h4>
                  <ol className="text-xs text-blue-700 space-y-1">
                    <li>1. Go to any 1688 store page, search results, or product page</li>
                    <li>2. Click the WaMerce extension icon in your toolbar</li>
                    <li>3. Click "Import Products to WaMerce"</li>
                    <li>4. Products are automatically fetched, translated, and saved!</li>
                  </ol>
                </div>
              </div>
            </TabsContent>

            {/* Batch Import Tab */}
            <TabsContent value="batch" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Manual Import Method</p>
                  <p className="text-blue-600 mt-1">
                    Paste product IDs or full URLs (one per line). Use this if you have IDs from the extension or console script.
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  1688 Product IDs or URLs
                </label>
                <Textarea
                  value={productIds}
                  onChange={(e) => setProductIds(e.target.value)}
                  placeholder={`Enter product IDs or URLs, one per line:\n\n684567890123\nhttps://detail.1688.com/offer/684567890123.html\n723456789012`}
                  className="font-mono text-sm min-h-[120px]"
                  data-testid="product-ids-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste product IDs (12+ digits) or full 1688 product URLs. Separate by newlines, commas, or semicolons.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Import to Shopify Store (Optional)
                  </label>
                  <Select value={selectedStore} onValueChange={setSelectedStore}>
                    <SelectTrigger data-testid="store-select">
                      <SelectValue placeholder="Select store (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Don't import to Shopify</SelectItem>
                      {stores.map((store) => (
                        <SelectItem key={store.store_name} value={store.store_name}>
                          {store.store_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Translation Option */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="translateToEnglish"
                  checked={translateToEnglish}
                  onChange={(e) => setTranslateToEnglish(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="translateToEnglish" className="text-sm text-gray-700">
                  🌐 Translate Chinese → English (product titles & descriptions)
                </label>
              </div>
              
              {selectedStore && selectedStore !== 'none' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createInShopifyBatch"
                    checked={createInShopify}
                    onChange={(e) => setCreateInShopify(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="createInShopifyBatch" className="text-sm text-gray-700">
                    Auto-create products in Shopify after importing
                  </label>
                </div>
              )}
              
              {/* Bookmarklet Helper */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">📑 Quick Extract Tool</p>
                <p className="text-xs text-gray-600 mb-2">
                  Drag this button to your bookmarks bar, then click it on any 1688 page to copy all product IDs:
                </p>
                <a
                  href={`javascript:(function(){var ids=[];document.querySelectorAll('a[href*="offer/"]').forEach(function(a){var m=a.href.match(/offer\\/(\\d{10,})/);if(m)ids.push(m[1])});ids=[...new Set(ids)];if(ids.length){prompt('Found '+ids.length+' product IDs. Copy below:',ids.join('\\n'));alert('Found '+ids.length+' products! Press Ctrl+A then Ctrl+C to copy.')}else{alert('No product IDs found on this page')}})();`}
                  className="inline-flex items-center px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded text-sm font-medium border border-orange-300"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info('Drag this button to your bookmarks bar!');
                  }}
                >
                  🔖 Extract 1688 IDs
                </a>
              </div>
              
              <Button
                onClick={startBatchImport}
                disabled={isLoading || !productIds.trim()}
                className="w-full bg-orange-500 hover:bg-orange-600"
                data-testid="start-batch-import-btn"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing... {jobStatus?.progress || 0}%
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Import Products {translateToEnglish ? '(with Translation)' : ''}
                  </>
                )}
              </Button>
            </TabsContent>

            {/* URL Scrape Tab */}
            <TabsContent value="url" className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">⚠️ 1688 Blocks Server-Side Scraping</p>
                  <p className="text-yellow-600 mt-1">
                    1688.com blocks automated access from servers. Use the <strong>recommended workaround below</strong> to extract product IDs from your browser.
                  </p>
                </div>
              </div>
              
              {/* Console Script Workaround */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 mb-2">✨ Easy Workaround: Browser Console Script</p>
                <ol className="text-sm text-blue-700 space-y-2 mb-3">
                  <li>1. Open the 1688 store/collection page in your browser</li>
                  <li>2. Press <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">F12</kbd> to open Developer Tools</li>
                  <li>3. Go to the <strong>Console</strong> tab</li>
                  <li>4. Paste this script and press Enter:</li>
                </ol>
                <div className="relative">
                  <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`(function(){var ids=[];document.querySelectorAll('a[href*="offer/"]').forEach(function(a){var m=a.href.match(/offer\\/(\\d{10,})/);if(m)ids.push(m[1])});ids=[...new Set(ids)];if(ids.length){var t=ids.join('\\n');navigator.clipboard.writeText(t).then(function(){alert('✅ Copied '+ids.length+' product IDs to clipboard!\\n\\nNow paste them in the "Batch Import" tab.')});console.log(t)}else{alert('No products found. Scroll down to load more products, then try again.')}})();`}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2 text-xs bg-white"
                    onClick={() => {
                      const script = `(function(){var ids=[];document.querySelectorAll('a[href*="offer/"]').forEach(function(a){var m=a.href.match(/offer\\/(\\d{10,})/);if(m)ids.push(m[1])});ids=[...new Set(ids)];if(ids.length){var t=ids.join('\\n');navigator.clipboard.writeText(t).then(function(){alert('✅ Copied '+ids.length+' product IDs to clipboard!\\n\\nNow paste them in the "Batch Import" tab.')});console.log(t)}else{alert('No products found. Scroll down to load more products, then try again.')}})();`;
                      navigator.clipboard.writeText(script);
                      toast.success('Script copied! Paste in browser console on 1688 page');
                    }}
                  >
                    📋 Copy Script
                  </Button>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  5. The product IDs will be copied to your clipboard. Paste them in the "Batch Import" tab above.
                </p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-500 mb-3">Or try automatic scraping (may not work due to 1688's protection):</p>
              
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    1688 Store/Collection URL
                  </label>
                  <Input
                    value={scrapeUrl}
                    onChange={(e) => setScrapeUrl(e.target.value)}
                    placeholder="https://shop123456.1688.com or collection URL"
                    className="font-mono text-sm"
                    data-testid="scrape-url-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste the URL of a 1688 store page or product collection
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                
                {selectedStore && selectedStore !== 'none' && (
                  <div className="flex items-center gap-2 mt-4">
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
                  className="w-full bg-gray-500 hover:bg-gray-600 mt-4"
                  data-testid="start-scraping-btn"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scraping... {jobStatus?.progress || 0}%
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Try Automatic Scraping (May Fail)
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Job Progress */}
          {jobStatus && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 mt-4">
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
              {jobStatus.errors && jobStatus.errors.length > 0 && (
                <div className="text-sm text-red-600">
                  <span className="font-medium">Errors ({jobStatus.errors.length}):</span>
                  <ul className="mt-1 ml-4 list-disc text-xs">
                    {jobStatus.errors.slice(0, 3).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {jobStatus.errors.length > 3 && <li>...and {jobStatus.errors.length - 3} more</li>}
                  </ul>
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
              Imported Products ({totalProducts})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                  data-testid="search-products"
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchProducts} data-testid="refresh-btn">
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
              <p>No products imported yet</p>
              <p className="text-sm">Use the form above to import products from 1688</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <div
                  key={product.product_id}
                  className="border rounded-lg overflow-hidden hover:border-orange-300 transition-colors"
                  data-testid={`product-card-${product.product_id}`}
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
                        data-testid={`view-btn-${product.product_id}`}
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
                          data-testid={`import-btn-${product.product_id}`}
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
                        data-testid={`delete-btn-${product.product_id}`}
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
