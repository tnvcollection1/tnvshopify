import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Search, 
  RefreshCw, 
  Link2, 
  Unlink,
  Grid,
  List,
  ExternalLink,
  Image as ImageIcon,
  Store,
  Zap,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import VariantComparisonModal from './VariantComparisonModal';

const API = process.env.REACT_APP_BACKEND_URL;

// Product Card Component
const ProductCard = ({ product, onRefresh, viewMode, onCompareVariants }) => {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linking, setLinking] = useState(false);
  
  const linked = product.linked_1688_product_id;

  const handleLink = async () => {
    if (!linkInput.trim()) return;
    
    setLinking(true);
    try {
      let productId = linkInput.trim();
      const urlMatch = linkInput.match(/offer\/(\d+)/);
      if (urlMatch) productId = urlMatch[1];

      const res = await fetch(`${API}/api/shopify/products/${product.shopify_product_id}/link-1688`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alibaba_product_id: productId, store_name: product.store_name })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Product linked successfully');
        onRefresh();
        setLinkModalOpen(false);
        setLinkInput('');
      } else {
        toast.error(data.message || 'Failed to link product');
      }
    } catch (error) {
      toast.error('Failed to link product');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Remove 1688 link from this product?')) return;
    
    try {
      const res = await fetch(`${API}/api/shopify/products/${product.shopify_product_id}/unlink-1688`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_name: product.store_name })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Product unlinked');
        onRefresh();
      }
    } catch (error) {
      toast.error('Failed to unlink');
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-all">
        <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-gray-300" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate text-gray-900">{product.title}</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Store className="w-3 h-3" />
              {product.store_name}
            </span>
            <span className="font-medium text-gray-700">₹{product.price?.toFixed(2) || '0.00'}</span>
            {product.variants?.length > 1 && (
              <span>{product.variants.length} variants</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {linked ? (
            <>
              <Badge 
                className="bg-orange-100 text-orange-700 border-0 cursor-pointer hover:bg-orange-200"
                onClick={() => onCompareVariants?.(product)}
              >
                <Link2 className="w-3 h-3 mr-1" />
                Linked
              </Badge>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onCompareVariants?.(product)}
                className="text-xs"
              >
                <Eye className="w-3 h-3 mr-1" />
                Variants
              </Button>
              <Button size="sm" variant="ghost" onClick={handleUnlink}>
                <Unlink className="w-4 h-4 text-gray-400" />
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setLinkModalOpen(true)}>
              <Link2 className="w-4 h-4 mr-1" />
              Link
            </Button>
          )}
        </div>

        {/* Link Modal */}
        <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link to 1688 Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden">
                  {product.image_url && <img src={product.image_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div>
                  <p className="font-medium text-sm">{product.title}</p>
                  <p className="text-xs text-gray-500">₹{product.price?.toFixed(2)}</p>
                </div>
              </div>
              <Input
                placeholder="1688 Product URL or ID"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setLinkModalOpen(false)}>Cancel</Button>
                <Button onClick={handleLink} disabled={linking || !linkInput.trim()} className="bg-orange-500 hover:bg-orange-600">
                  {linking ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                  Link
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Grid View
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all">
      <div className="aspect-square bg-gray-100 relative">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-gray-300" />
          </div>
        )}
        
        <div className="absolute top-2 right-2">
          {linked ? (
            <Badge className="bg-orange-500 text-white border-0">
              <Link2 className="w-3 h-3 mr-1" />
              Linked
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-white/90">Not linked</Badge>
          )}
        </div>
        
        <div className="absolute bottom-2 left-2">
          <Badge className="bg-black/70 text-white text-xs border-0">{product.store_name}</Badge>
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 text-gray-900 mb-2">{product.title}</h3>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-[#008060]">₹{product.price?.toFixed(2) || '0.00'}</span>
          {product.variants?.length > 1 && (
            <Badge variant="outline" className="text-xs">{product.variants.length} variants</Badge>
          )}
        </div>
        
        {linked ? (
          <div className="space-y-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full text-orange-600 border-orange-300"
              onClick={() => onCompareVariants?.(product)}
            >
              <Eye className="w-3 h-3 mr-1" />
              Compare Variants
            </Button>
            <div className="flex gap-2">
              <a
                href={`https://detail.1688.com/offer/${linked}.html`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button size="sm" variant="outline" className="w-full text-xs">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  1688
                </Button>
              </a>
              <Button size="sm" variant="ghost" onClick={handleUnlink}>
                <Unlink className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" className="w-full bg-orange-500 hover:bg-orange-600" onClick={() => setLinkModalOpen(true)}>
            <Link2 className="w-4 h-4 mr-1" />
            Link to 1688
          </Button>
        )}
      </div>

      {/* Link Modal */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to 1688 Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden">
                {product.image_url && <img src={product.image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div>
                <p className="font-medium text-sm">{product.title}</p>
                <p className="text-xs text-gray-500">₹{product.price?.toFixed(2)}</p>
              </div>
            </div>
            <Input
              placeholder="1688 Product URL or ID"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setLinkModalOpen(false)}>Cancel</Button>
              <Button onClick={handleLink} disabled={linking || !linkInput.trim()} className="bg-orange-500 hover:bg-orange-600">
                {linking ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Stat Card
const StatCard = ({ title, value, subtitle, icon: Icon, status }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{title}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      {Icon && (
        <div className="flex items-center gap-1">
          {status === 'success' && <Check className="w-5 h-5 text-green-500" />}
          {status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
          {status === 'loading' && <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />}
        </div>
      )}
    </div>
  </div>
);

// Main Component
const ShopifyProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [linkFilter, setLinkFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [bulkLinkJob, setBulkLinkJob] = useState(null);
  const [bulkLinking, setBulkLinking] = useState(false);
  const [comparisonProduct, setComparisonProduct] = useState(null); // For variant comparison modal
  const pageSize = 24;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
      if (storeFilter !== 'all') params.append('store_name', storeFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (linkFilter !== 'all') params.append('link_status', linkFilter);

      const res = await fetch(`${API}/api/shopify/products?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setProducts(data.products || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [page, storeFilter, linkFilter, searchQuery]);

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch(`${API}/api/shopify/products/sync-status`);
      const data = await res.json();
      if (data.success) setSyncStatus(data);
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSyncStatus();
  }, [fetchProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/api/shopify/sync-products-all`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Sync started for ${data.stores?.length || 0} stores`);
        setTimeout(fetchSyncStatus, 5000);
        setTimeout(() => { fetchSyncStatus(); fetchProducts(); }, 30000);
      }
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Bulk Auto-Link to 1688 using image search
  const handleBulkAutoLink = async () => {
    if (storeFilter === 'all') {
      toast.error('Please select a specific store to auto-link');
      return;
    }
    
    setBulkLinking(true);
    try {
      const res = await fetch(`${API}/api/shopify/products/bulk-auto-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: storeFilter,
          limit: 100  // Process 100 unlinked products at a time
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Auto-link job started! This may take a few minutes.');
        setBulkLinkJob({ job_id: data.job_id, status: 'starting' });
        
        // Poll for status
        const pollStatus = async () => {
          try {
            const statusRes = await fetch(`${API}/api/shopify/products/bulk-auto-link/status/${data.job_id}`);
            const statusData = await statusRes.json();
            const job = statusData.job;
            
            setBulkLinkJob(job);
            
            if (job.status === 'completed') {
              toast.success(`Auto-link completed! ${job.linked} products linked, ${job.failed} failed`);
              fetchProducts();
              setBulkLinking(false);
            } else if (job.status === 'error') {
              toast.error(`Auto-link failed: ${job.error}`);
              setBulkLinking(false);
            } else {
              // Still processing, poll again
              setTimeout(pollStatus, 3000);
            }
          } catch (err) {
            console.error('Error polling status:', err);
            setBulkLinking(false);
          }
        };
        
        setTimeout(pollStatus, 2000);
      } else {
        toast.error(data.message || 'Failed to start auto-link');
        setBulkLinking(false);
      }
    } catch (error) {
      toast.error('Failed to start auto-link');
      setBulkLinking(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Products Catalog</h1>
              <p className="text-sm text-gray-500">
                {total.toLocaleString()} products • Link to 1688 for auto-fulfillment
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleBulkAutoLink} 
                disabled={bulkLinking || storeFilter === 'all'} 
                className="bg-orange-500 hover:bg-orange-600"
                title={storeFilter === 'all' ? 'Select a store first' : 'Auto-link unlinked products using image search'}
              >
                <Zap className={`w-4 h-4 mr-2 ${bulkLinking ? 'animate-pulse' : ''}`} />
                {bulkLinking ? 'Auto-Linking...' : 'Auto-Link to 1688'}
              </Button>
              <Button onClick={handleSyncAll} disabled={syncing} className="bg-[#008060] hover:bg-[#006e52]">
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Products'}
              </Button>
            </div>
          </div>
          
          {/* Bulk Link Progress */}
          {bulkLinkJob && bulkLinkJob.status !== 'completed' && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-800">
                  Auto-linking in progress...
                </span>
                <span className="text-sm text-orange-600">
                  {bulkLinkJob.processed || 0} / {bulkLinkJob.total || 0} products
                </span>
              </div>
              <div className="w-full bg-orange-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all"
                  style={{ width: `${bulkLinkJob.total ? (bulkLinkJob.processed / bulkLinkJob.total) * 100 : 0}%` }}
                />
              </div>
              {bulkLinkJob.linked > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  ✓ {bulkLinkJob.linked} linked successfully
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {syncStatus && (
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              title="Total Products" 
              value={syncStatus.total_products?.toLocaleString() || 0} 
            />
            {syncStatus.statuses?.slice(0, 3).map(status => (
              <StatCard 
                key={status.store_name}
                title={status.store_name}
                value={status.product_count?.toLocaleString() || 0}
                status={status.status === 'completed' ? 'success' : status.status === 'error' ? 'error' : 'loading'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>

          <div className="flex items-center gap-2">
            <Select value={storeFilter} onValueChange={(v) => { setStoreFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {syncStatus?.statuses?.map(s => (
                  <SelectItem key={s.store_name} value={s.store_name}>
                    {s.store_name} ({s.product_count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={linkFilter} onValueChange={(v) => { setLinkFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="linked">Linked to 1688</SelectItem>
                <SelectItem value="unlinked">Not Linked</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-[#008060] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-[#008060] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Loading products...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 py-12 text-center">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No products found</h3>
            <p className="text-gray-500 mt-1">
              {searchQuery ? 'Try a different search term' : 'Sync products from Shopify to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={handleSyncAll} className="mt-4 bg-[#008060] hover:bg-[#006e52]">
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'
              : 'space-y-3'
            }>
              {products.map(product => (
                <ProductCard 
                  key={`${product.store_name}-${product.shopify_product_id}`}
                  product={product}
                  onRefresh={fetchProducts}
                  viewMode={viewMode}
                  onCompareVariants={setComparisonProduct}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} of {total.toLocaleString()}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="px-3 py-1.5 text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Variant Comparison Modal */}
      {comparisonProduct && (
        <VariantComparisonModal
          product={comparisonProduct}
          onClose={() => setComparisonProduct(null)}
          onVariantsCreated={fetchProducts}
        />
      )}
    </div>
  );
};

export default ShopifyProducts;
