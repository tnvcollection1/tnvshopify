import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Package,
  Search,
  RefreshCw,
  ExternalLink,
  Link2,
  Unlink,
  Filter,
  Grid,
  List,
  Loader2,
  Check,
  X,
  Image as ImageIcon,
  Store,
  Tag,
  DollarSign,
  Box,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Product Card Component
const ProductCard = ({ product, onLink, viewMode }) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linking, setLinking] = useState(false);
  
  const linked1688 = product.linked_1688_product_id;
  
  const handleLink = async () => {
    if (!linkInput.trim()) return;
    
    setLinking(true);
    try {
      // Extract product ID from URL if needed
      let productId = linkInput.trim();
      const urlMatch = linkInput.match(/offer\/(\d+)/);
      if (urlMatch) {
        productId = urlMatch[1];
      }
      
      const res = await fetch(`${API}/api/shopify/products/${product.shopify_product_id}/link-1688`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          alibaba_product_id: productId,
          store_name: product.store_name 
        }),
      });
      const data = await res.json();
      if (data.success) {
        onLink();
        setShowLinkModal(false);
        setLinkInput('');
      } else {
        alert(data.message || 'Failed to link product');
      }
    } catch (error) {
      console.error('Link failed:', error);
    } finally {
      setLinking(false);
    }
  };
  
  const handleUnlink = async () => {
    if (!window.confirm('Remove 1688 link from this product?')) return;
    
    try {
      const res = await fetch(`${API}/api/shopify/products/${product.shopify_product_id}/unlink-1688`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_name: product.store_name }),
      });
      const data = await res.json();
      if (data.success) {
        onLink();
      }
    } catch (error) {
      console.error('Unlink failed:', error);
    }
  };
  
  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow">
        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-gray-300" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{product.title}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Store className="w-3 h-3" />
              {product.store_name}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              ₹{product.price?.toFixed(2) || '0.00'}
            </span>
            {product.vendor && (
              <>
                <span>•</span>
                <span>{product.vendor}</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {linked1688 ? (
            <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              1688: {linked1688}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-gray-500">
              Not linked
            </Badge>
          )}
          
          {linked1688 ? (
            <Button size="sm" variant="ghost" onClick={handleUnlink}>
              <Unlink className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowLinkModal(true)}>
              <Link2 className="w-4 h-4 mr-1" />
              Link
            </Button>
          )}
        </div>
        
        {/* Link Modal */}
        {showLinkModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLinkModal(false)}>
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Link to 1688 Product</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter the 1688 product URL or ID to link with:<br />
                <strong>{product.title}</strong>
              </p>
              <Input
                placeholder="https://detail.1688.com/offer/123456.html or 123456"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                className="mb-4"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowLinkModal(false)}>Cancel</Button>
                <Button onClick={handleLink} disabled={linking || !linkInput.trim()} className="bg-orange-500 hover:bg-orange-600">
                  {linking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                  Link Product
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Grid view
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-square bg-gray-100 relative">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-gray-300" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          {linked1688 ? (
            <Badge className="bg-orange-500 text-white">
              <Link2 className="w-3 h-3 mr-1" />
              Linked
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-white/90">
              Not linked
            </Badge>
          )}
        </div>
        
        {/* Store Badge */}
        <div className="absolute bottom-2 left-2">
          <Badge className="bg-black/70 text-white text-xs">
            {product.store_name}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 mb-2" title={product.title}>
          {product.title}
        </h3>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-green-600">
            ₹{product.price?.toFixed(2) || '0.00'}
          </span>
          {product.variants?.length > 1 && (
            <Badge variant="outline" className="text-xs">
              {product.variants.length} variants
            </Badge>
          )}
        </div>
        
        {linked1688 ? (
          <div className="flex gap-2">
            <a
              href={`https://detail.1688.com/offer/${linked1688}.html`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button size="sm" variant="outline" className="w-full text-orange-600 border-orange-300">
                <ExternalLink className="w-3 h-3 mr-1" />
                View on 1688
              </Button>
            </a>
            <Button size="sm" variant="ghost" onClick={handleUnlink} className="text-gray-500">
              <Unlink className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button 
            size="sm" 
            className="w-full bg-orange-500 hover:bg-orange-600"
            onClick={() => setShowLinkModal(true)}
          >
            <Link2 className="w-4 h-4 mr-1" />
            Link to 1688
          </Button>
        )}
      </CardContent>
      
      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLinkModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Link to 1688 Product</h3>
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden">
                {product.image_url && <img src={product.image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div>
                <p className="font-medium text-sm line-clamp-1">{product.title}</p>
                <p className="text-xs text-gray-500">₹{product.price?.toFixed(2)}</p>
              </div>
            </div>
            <Input
              placeholder="https://detail.1688.com/offer/123456.html or 123456"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              className="mb-4"
            />
            <p className="text-xs text-gray-500 mb-4">
              Paste the 1688 product URL or just the product ID number
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowLinkModal(false)}>Cancel</Button>
              <Button onClick={handleLink} disabled={linking || !linkInput.trim()} className="bg-orange-500 hover:bg-orange-600">
                {linking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                Link Product
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

// Main Component
const ProductsCatalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [linkFilter, setLinkFilter] = useState('all'); // all, linked, unlinked
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 24;
  
  useEffect(() => {
    fetchProducts();
    fetchSyncStatus();
  }, [page, storeFilter, linkFilter]);
  
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      
      if (storeFilter !== 'all') {
        params.append('store_name', storeFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (linkFilter !== 'all') {
        params.append('link_status', linkFilter);
      }
      
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
  };
  
  const fetchSyncStatus = async () => {
    try {
      const res = await fetch(`${API}/api/shopify/products/sync-status`);
      const data = await res.json();
      if (data.success) {
        setSyncStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };
  
  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/api/shopify/sync-products-all`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        alert(`Product sync started for ${data.stores?.length || 0} stores. This may take a few minutes.`);
        // Poll for status
        setTimeout(fetchSyncStatus, 5000);
        setTimeout(fetchSyncStatus, 15000);
        setTimeout(() => {
          fetchSyncStatus();
          fetchProducts();
        }, 30000);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };
  
  const totalPages = Math.ceil(total / pageSize);
  
  // Calculate linked stats
  const linkedCount = syncStatus?.statuses?.reduce((acc, s) => {
    // This is approximate - we'd need a backend endpoint for exact counts
    return acc;
  }, 0) || 0;
  
  return (
    <div className="p-6 space-y-6" data-testid="products-catalog">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-500" />
            Products Catalog
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {total.toLocaleString()} Shopify products synced • Link to 1688 for auto-fulfillment
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleSyncAll}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Products
          </Button>
        </div>
      </div>
      
      {/* Sync Status Cards */}
      {syncStatus && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{syncStatus.total_products?.toLocaleString() || 0}</div>
              <p className="text-xs text-gray-500">Total Products</p>
            </CardContent>
          </Card>
          {syncStatus.statuses?.slice(0, 3).map((status) => (
            <Card key={status.store_name} className={status.status === 'error' ? 'border-red-200' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold">{status.product_count?.toLocaleString() || 0}</div>
                    <p className="text-xs text-gray-500 capitalize">{status.store_name}</p>
                  </div>
                  {status.status === 'completed' ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : status.status === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
        
        <div className="flex gap-2 items-center">
          <select
            value={storeFilter}
            onChange={(e) => { setStoreFilter(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All Stores</option>
            {syncStatus?.statuses?.map((s) => (
              <option key={s.store_name} value={s.store_name}>
                {s.store_name} ({s.product_count})
              </option>
            ))}
          </select>
          
          <select
            value={linkFilter}
            onChange={(e) => { setLinkFilter(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All Products</option>
            <option value="linked">Linked to 1688</option>
            <option value="unlinked">Not Linked</option>
          </select>
          
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Products Grid/List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : products.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No products found</h3>
            <p className="text-gray-500 mt-1">
              {searchQuery ? 'Try a different search term' : 'Sync products from Shopify to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={handleSyncAll} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'
            : 'space-y-2'
          }>
            {products.map((product) => (
              <ProductCard 
                key={`${product.store_name}-${product.shopify_product_id}`}
                product={product}
                onLink={fetchProducts}
                viewMode={viewMode}
              />
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
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
                <span className="px-3 py-1 text-sm">
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
  );
};

export default ProductsCatalog;
