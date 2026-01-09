import React, { useState, useEffect, useCallback } from 'react';
import {
  Check,
  X,
  RefreshCw,
  Search,
  Package,
  Image,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Archive
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useStore } from '../contexts/StoreContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Status badge component
const StatusBadge = ({ status }) => {
  const configs = {
    active: { label: 'Active', class: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
    draft: { label: 'Draft', class: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
    archived: { label: 'Archived', class: 'bg-gray-100 text-gray-700 border-gray-200', icon: Archive },
  };
  
  const config = configs[status] || configs.draft;
  const Icon = config.icon;
  
  return (
    <Badge className={`${config.class} flex items-center gap-1 border`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

// Product card component
const ProductCard = ({ product, selected, onSelect, onApprove, onArchive, onView }) => {
  const imageUrl = product.image_url || product.images?.[0]?.src || null;
  
  return (
    <div className={`bg-white rounded-lg border transition-all hover:shadow-md ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}>
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <Package className="w-12 h-12" />
          </div>
        )}
        
        {/* Checkbox overlay */}
        <div className="absolute top-2 left-2">
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            className="bg-white border-2"
          />
        </div>
        
        {/* Status badge overlay */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={product.status} />
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 line-clamp-2 text-sm mb-2">{product.title}</h3>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-semibold text-gray-900">
            {product.price ? `${product.currency || 'PKR'} ${parseFloat(product.price).toLocaleString()}` : 'No price'}
          </span>
          {product.variants?.length > 1 && (
            <span className="text-xs text-gray-500">{product.variants.length} variants</span>
          )}
        </div>
        
        <div className="text-xs text-gray-500 mb-3">
          <p>Vendor: {product.vendor || 'N/A'}</p>
          <p>Type: {product.product_type || 'N/A'}</p>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          {product.status === 'draft' && (
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => onApprove(product)}
              data-testid={`approve-btn-${product.shopify_product_id}`}
            >
              <Check className="w-4 h-4 mr-1" />
              Approve
            </Button>
          )}
          
          {product.status === 'active' && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onArchive(product)}
              data-testid={`archive-btn-${product.shopify_product_id}`}
            >
              <Archive className="w-4 h-4 mr-1" />
              Archive
            </Button>
          )}
          
          {product.status === 'archived' && (
            <Button
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => onApprove(product)}
              data-testid={`restore-btn-${product.shopify_product_id}`}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Restore
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onView(product)}
            data-testid={`view-btn-${product.shopify_product_id}`}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main component
const ProductApproval = () => {
  const { selectedStore, stores } = useStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusCounts, setStatusCounts] = useState({ active: 0, draft: 0, archived: 0 });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('draft');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewProduct, setViewProduct] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  const pageSize = 20;

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStore && selectedStore !== 'all') {
        params.append('store_name', selectedStore);
      }
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', page);
      params.append('page_size', pageSize);
      
      const response = await axios.get(`${API}/api/shopify/products?${params.toString()}`);
      
      if (response.data.success) {
        setProducts(response.data.products || []);
        setTotal(response.data.total || 0);
        setTotalPages(Math.ceil((response.data.total || 0) / pageSize));
        setStatusCounts(response.data.status_counts || { active: 0, draft: 0, archived: 0 });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [selectedStore, searchQuery, statusFilter, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
    setSelectedProducts([]);
  }, [selectedStore, searchQuery, statusFilter]);

  // Handle single product approval
  const handleApprove = async (product) => {
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/api/shopify/products/${product.shopify_product_id}/status`, {
        store_name: product.store_name,
        status: 'active'
      });
      
      if (response.data.success) {
        toast.success(`Product approved: ${product.title}`);
        fetchProducts();
      }
    } catch (error) {
      console.error('Error approving product:', error);
      toast.error('Failed to approve product');
    } finally {
      setProcessing(false);
    }
  };

  // Handle single product archive
  const handleArchive = async (product) => {
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/api/shopify/products/${product.shopify_product_id}/status`, {
        store_name: product.store_name,
        status: 'archived'
      });
      
      if (response.data.success) {
        toast.success(`Product archived: ${product.title}`);
        fetchProducts();
      }
    } catch (error) {
      console.error('Error archiving product:', error);
      toast.error('Failed to archive product');
    } finally {
      setProcessing(false);
    }
  };

  // Handle bulk approval
  const handleBulkApprove = async () => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected');
      return;
    }
    
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/api/shopify/products/bulk-status`, {
        product_ids: selectedProducts,
        store_name: selectedStore !== 'all' ? selectedStore : products[0]?.store_name,
        status: 'active'
      });
      
      if (response.data.success) {
        toast.success(`Approved ${response.data.updated.length} products`);
        setSelectedProducts([]);
        fetchProducts();
      }
    } catch (error) {
      console.error('Error bulk approving products:', error);
      toast.error('Failed to approve products');
    } finally {
      setProcessing(false);
    }
  };

  // Handle bulk archive
  const handleBulkArchive = async () => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected');
      return;
    }
    
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/api/shopify/products/bulk-status`, {
        product_ids: selectedProducts,
        store_name: selectedStore !== 'all' ? selectedStore : products[0]?.store_name,
        status: 'archived'
      });
      
      if (response.data.success) {
        toast.success(`Archived ${response.data.updated.length} products`);
        setSelectedProducts([]);
        fetchProducts();
      }
    } catch (error) {
      console.error('Error bulk archiving products:', error);
      toast.error('Failed to archive products');
    } finally {
      setProcessing(false);
    }
  };

  // Toggle product selection
  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Select all products on current page
  const selectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.shopify_product_id));
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen" data-testid="product-approval-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Approval</h1>
        <p className="text-gray-500">Approve draft products to make them visible on your storefront</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => setStatusFilter('draft')}
          className={`bg-white rounded-lg border p-4 text-left transition-all ${statusFilter === 'draft' ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-gray-200 hover:border-gray-300'}`}
          data-testid="filter-draft"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.draft || 0}</p>
              <p className="text-sm text-gray-500">Pending Approval</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => setStatusFilter('active')}
          className={`bg-white rounded-lg border p-4 text-left transition-all ${statusFilter === 'active' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200 hover:border-gray-300'}`}
          data-testid="filter-active"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.active || 0}</p>
              <p className="text-sm text-gray-500">Active Products</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => setStatusFilter('archived')}
          className={`bg-white rounded-lg border p-4 text-left transition-all ${statusFilter === 'archived' ? 'border-gray-500 ring-2 ring-gray-300' : 'border-gray-200 hover:border-gray-300'}`}
          data-testid="filter-archived"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Archive className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.archived || 0}</p>
              <p className="text-sm text-gray-500">Archived</p>
            </div>
          </div>
        </button>
      </div>

      {/* Filters & Actions Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search */}
          <div className="flex items-center gap-3 flex-1 min-w-[300px]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-3">
            {selectedProducts.length > 0 && (
              <>
                <span className="text-sm text-gray-500">
                  {selectedProducts.length} selected
                </span>
                <Button
                  onClick={handleBulkApprove}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="bulk-approve-btn"
                >
                  {processing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Approve Selected
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBulkArchive}
                  disabled={processing}
                  data-testid="bulk-archive-btn"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive Selected
                </Button>
              </>
            )}
            
            <Button
              variant="outline"
              onClick={fetchProducts}
              disabled={loading}
              data-testid="refresh-btn"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Select All */}
        {products.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
            <Checkbox
              checked={selectedProducts.length === products.length && products.length > 0}
              onCheckedChange={selectAll}
              data-testid="select-all-checkbox"
            />
            <span className="text-sm text-gray-600">
              {selectedProducts.length === products.length ? 'Deselect all' : 'Select all on this page'}
            </span>
          </div>
        )}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">
            {statusFilter === 'draft' 
              ? 'No draft products pending approval'
              : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
            {products.map(product => (
              <ProductCard
                key={product.shopify_product_id}
                product={product}
                selected={selectedProducts.includes(product.shopify_product_id)}
                onSelect={() => toggleProductSelection(product.shopify_product_id)}
                onApprove={handleApprove}
                onArchive={handleArchive}
                onView={setViewProduct}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} of {total} products
            </p>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                data-testid="prev-page-btn"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <span className="text-sm text-gray-600 px-3">
                Page {page} of {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                data-testid="next-page-btn"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Product Detail Dialog */}
      <Dialog open={!!viewProduct} onOpenChange={() => setViewProduct(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          
          {viewProduct && (
            <div className="grid grid-cols-2 gap-6">
              {/* Image */}
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {viewProduct.image_url || viewProduct.images?.[0]?.src ? (
                  <img 
                    src={viewProduct.image_url || viewProduct.images?.[0]?.src} 
                    alt={viewProduct.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <Package className="w-16 h-16" />
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="space-y-4">
                <div>
                  <StatusBadge status={viewProduct.status} />
                  <h3 className="text-lg font-semibold mt-2">{viewProduct.title}</h3>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Price</span>
                    <span className="font-medium">
                      {viewProduct.currency || 'PKR'} {parseFloat(viewProduct.price || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vendor</span>
                    <span>{viewProduct.vendor || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Product Type</span>
                    <span>{viewProduct.product_type || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Variants</span>
                    <span>{viewProduct.variants?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Store</span>
                    <span>{viewProduct.store_name}</span>
                  </div>
                </div>
                
                {viewProduct.tags && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {viewProduct.tags.split(',').map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-4">
            {viewProduct?.status === 'draft' && (
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  handleApprove(viewProduct);
                  setViewProduct(null);
                }}
              >
                <Check className="w-4 h-4 mr-2" />
                Approve Product
              </Button>
            )}
            
            {viewProduct?.status === 'active' && (
              <Button 
                variant="outline"
                onClick={() => {
                  handleArchive(viewProduct);
                  setViewProduct(null);
                }}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive Product
              </Button>
            )}
            
            {viewProduct?.shopify_product_id && viewProduct?.store_name && (
              <Button
                variant="ghost"
                onClick={() => {
                  const store = stores.find(s => s.store_name === viewProduct.store_name);
                  if (store?.shopify_domain) {
                    window.open(`https://${store.shopify_domain}/admin/products/${viewProduct.shopify_product_id}`, '_blank');
                  }
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View in Shopify
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductApproval;
