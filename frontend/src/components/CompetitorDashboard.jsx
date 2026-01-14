import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Upload,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Image,
  DollarSign,
  BarChart3,
  Eye,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  ImagePlus,
  Package,
  Store,
  ChevronLeft,
  ChevronRight,
  Bell,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { useStore } from '../contexts/StoreContext';

const API = process.env.REACT_APP_BACKEND_URL;

// Store selector component for admin pages
const StoreSelector = ({ selectedStore, stores, onStoreChange, className = '' }) => {
  return (
    <select
      value={selectedStore || ''}
      onChange={(e) => onStoreChange(e.target.value)}
      className={`border rounded-lg px-3 py-2 text-sm bg-white ${className}`}
      data-testid="store-selector"
    >
      {stores.map((store) => (
        <option key={store.store_name} value={store.store_name}>
          {store.store_name === 'tnvcollection' ? '🇮🇳 TNV India (INR)' :
           store.store_name === 'tnvcollectionpk' ? '🇵🇰 TNV Pakistan (PKR)' :
           store.store_name}
        </option>
      ))}
    </select>
  );
};

// ==================== Notification Bell Component ====================
const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/competitor/notifications?limit=20`);
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await axios.post(`${API}/api/competitor/notifications/mark-all-read`);
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const markRead = async (notificationId) => {
    try {
      await axios.post(`${API}/api/competitor/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.notification_id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="sm" 
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white border rounded-lg shadow-xl z-50">
          <div className="p-3 border-b flex items-center justify-between">
            <h3 className="font-semibold">Price Alerts</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllRead}>
                  Mark all read
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>No price alerts yet</p>
                <p className="text-xs mt-1">You'll be notified when competitors lower their prices</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.notification_id} 
                  className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${!n.read ? 'bg-blue-50' : ''}`}
                  onClick={() => !n.read && markRead(n.notification_id)}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-1 w-2 h-2 rounded-full ${!n.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Product Selector ====================
const ProductSelector = ({ onSelectProduct, selectedStore }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  const loadProducts = useCallback(async () => {
    if (!selectedStore) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        store_name: selectedStore,
        page: page.toString(),
        page_size: pageSize.toString()
      });
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      const response = await axios.get(`${API}/api/shopify/products?${params}`);
      setProducts(response.data.products || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [selectedStore, page, searchQuery]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadProducts();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={loading}>
          <Search className="w-4 h-4" />
        </Button>
      </form>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-40 animate-pulse" />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
          {products.map((product) => (
            <div
              key={product.shopify_product_id}
              onClick={() => product.image_url && onSelectProduct(product)}
              className={`
                border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md
                ${!product.image_url ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500'}
              `}
            >
              <div className="aspect-square bg-gray-100 relative">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Image className="w-8 h-8 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate">{product.title}</p>
                <p className="text-sm font-bold text-green-600">₹{product.price?.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p>No products found</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-gray-500">
            {total} products total
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Analysis Dialog ====================
const AnalysisDialog = ({ isOpen, onClose, onAnalysisComplete, stores, selectedStore, onStoreChange }) => {
  const [mode, setMode] = useState('select'); // 'select', 'upload', or 'title'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState({
    product_id: '',
    product_name: '',
    your_price: '',
    category: 'general'
  });
  const fileInputRef = useRef(null);

  // Reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      setMode('select');
      setSelectedProduct(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      setForm({ product_id: '', product_name: '', your_price: '', category: 'general' });
    }
  }, [isOpen]);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setForm({
      product_id: product.shopify_product_id,
      product_name: product.title,
      your_price: product.price?.toString() || '',
      category: product.product_type || 'general'
    });
    setPreviewUrl(product.image_url);
  };

  const handleFile = (file) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large (max 10MB)');
      return;
    }
    
    setSelectedFile(file);
    setSelectedProduct(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result);
    reader.readAsDataURL(file);
  };

  // Title-only search
  const handleTitleSearch = async () => {
    if (!form.product_name) {
      toast.error('Please enter a product name');
      return;
    }

    setUploading(true);
    try {
      const response = await axios.post(
        `${API}/api/competitor/search-by-title`,
        {
          product_id: form.product_id || `title_${Date.now()}`,
          product_name: form.product_name,
          your_price: parseFloat(form.your_price) || 0,
          category: form.category,
          store_name: selectedStore
        },
        { timeout: 120000 }
      );

      const searchMethod = response.data.search_method || 'title_search';
      toast.success(`Found ${response.data.competitor_count} competitors via title search!`);
      onAnalysisComplete(response.data);
      onClose();
    } catch (error) {
      console.error('Title search error:', error);
      toast.error(error.response?.data?.detail || 'Title search failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    // For title-only mode, use dedicated handler
    if (mode === 'title') {
      return handleTitleSearch();
    }

    if ((!selectedProduct && !selectedFile) || !form.product_name || !form.your_price) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      let response;

      if (selectedProduct && selectedProduct.image_url) {
        // Use product image URL
        response = await axios.post(
          `${API}/api/competitor/analyze-from-url`,
          {
            image_url: selectedProduct.image_url,
            product_id: form.product_id || `prod_${Date.now()}`,
            product_name: form.product_name,
            your_price: parseFloat(form.your_price),
            category: form.category,
            store_name: selectedStore
          },
          { timeout: 120000 }
        );
      } else if (selectedFile) {
        // Upload file
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('product_id', form.product_id || `prod_${Date.now()}`);
        formData.append('product_name', form.product_name);
        formData.append('your_price', form.your_price);
        formData.append('category', form.category);

        response = await axios.post(
          `${API}/api/competitor/analyze-image`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
        );
      }

      toast.success(`Found ${response.data.competitor_count} competitors!`);
      onAnalysisComplete(response.data);
      onClose();
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error.response?.data?.detail || 'Failed to analyze image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Analyze Product for Competitors</DialogTitle>
        </DialogHeader>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Button
            variant={mode === 'select' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('select')}
          >
            <Package className="w-4 h-4 mr-2" />
            Select from Products
          </Button>
          <Button
            variant={mode === 'upload' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('upload')}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Image
          </Button>
          <Button
            variant={mode === 'title' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('title')}
          >
            <Search className="w-4 h-4 mr-2" />
            Title Search Only
          </Button>
        </div>

        {/* Info about search methods */}
        <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-50 rounded">
          {mode === 'select' && '🖼️ Image search with automatic title fallback if no exact image matches found'}
          {mode === 'upload' && '🖼️ Upload your own image - falls back to title search if needed'}
          {mode === 'title' && '📝 Search by product name only - best for unique/custom products'}
        </div>

        {/* Store Selector */}
        {mode === 'select' && (
          <div className="mb-4">
            <label className="text-sm font-medium mb-1 block">Select Store</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={selectedStore}
              onChange={(e) => onStoreChange(e.target.value)}
            >
              {stores.map((store) => (
                <option key={store.store_name} value={store.store_name}>
                  {store.display_name || store.store_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Content based on mode */}
        {mode === 'select' ? (
          <ProductSelector 
            selectedStore={selectedStore} 
            onSelectProduct={handleProductSelect} 
          />
        ) : mode === 'title' ? (
          /* Title Search Form */
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Product Name *</label>
              <Input
                placeholder="Enter product name to search..."
                value={form.product_name}
                onChange={(e) => setForm(f => ({ ...f, product_name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Your Price (optional)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={form.your_price}
                  onChange={(e) => setForm(f => ({ ...f, your_price: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={form.category}
                  onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  <option value="general">General</option>
                  <option value="apparel">Apparel</option>
                  <option value="electronics">Electronics</option>
                  <option value="home">Home & Garden</option>
                  <option value="beauty">Beauty</option>
                  <option value="sports">Sports</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files[0]); }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
              ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            `}
          >
            {previewUrl && !selectedProduct ? (
              <div className="space-y-2">
                <img src={previewUrl} alt="Preview" className="max-h-32 mx-auto rounded" />
                <p className="text-sm text-gray-600">{selectedFile?.name}</p>
              </div>
            ) : (
              <div>
                <ImagePlus className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                <p className="font-medium text-gray-600">Drop product image here</p>
                <p className="text-sm text-gray-400">or click to select (max 10MB)</p>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {/* Selected Product Preview */}
        {selectedProduct && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
            <img 
              src={selectedProduct.image_url} 
              alt={selectedProduct.title}
              className="w-16 h-16 object-cover rounded"
            />
            <div className="flex-1">
              <p className="font-medium">{selectedProduct.title}</p>
              <p className="text-sm text-gray-600">₹{selectedProduct.price?.toLocaleString()}</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => { setSelectedProduct(null); setPreviewUrl(null); }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Form Fields - Only show for select/upload modes, title mode has its own form */}
        {mode !== 'title' && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="col-span-2">
              <label className="text-sm font-medium">Product Name *</label>
              <Input
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                placeholder="e.g., Blue Wireless Headphones"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Your Price (₹) *</label>
              <Input
                type="number"
                value={form.your_price}
                onChange={(e) => setForm({ ...form, your_price: e.target.value })}
                placeholder="1999"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="general">General</option>
                <option value="electronics">Electronics</option>
                <option value="fashion">Fashion</option>
                <option value="home">Home & Living</option>
                <option value="beauty">Beauty</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={uploading || (mode !== 'title' && !selectedProduct && !selectedFile) || (mode === 'title' && !form.product_name)}
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {mode === 'title' ? 'Searching...' : 'Analyzing...'}</>
            ) : (
              <><Search className="w-4 h-4 mr-2" /> {mode === 'title' ? 'Search by Title' : 'Find Competitors'}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ==================== Analysis Results Card ====================
const AnalysisResultsCard = ({ analysis, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [fullAnalysis, setFullAnalysis] = useState(null);

  const loadFullAnalysis = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/competitor/analysis/${analysis.analysis_id}`);
      setFullAnalysis(response.data.analysis);
    } catch (error) {
      toast.error('Failed to load analysis details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (analysis.analysis_id) {
      loadFullAnalysis();
    }
  }, [analysis.analysis_id]);

  const priceAnalysis = fullAnalysis?.price_analysis;
  const competitorPrices = fullAnalysis?.competitor_prices || [];

  const getPriceIndicator = () => {
    if (!priceAnalysis) return null;
    const diff = priceAnalysis.price_difference_percent;
    if (Math.abs(diff) < 10) return { icon: Minus, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Competitive' };
    if (diff > 0) return { icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-100', label: 'Above Market' };
    return { icon: TrendingDown, color: 'text-green-600', bg: 'bg-green-100', label: 'Below Market' };
  };

  const indicator = getPriceIndicator();

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">{analysis.product_name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500">
              {analysis.competitor_count || analysis.competitor_pages?.length || 0} competitors found
            </p>
            {analysis.search_method && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                analysis.search_method === 'image_search' 
                  ? 'bg-blue-100 text-blue-700' 
                  : analysis.search_method === 'title_fallback'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {analysis.search_method === 'image_search' 
                  ? '🖼️ Image Match' 
                  : analysis.search_method === 'title_fallback'
                  ? '🔍 Title Fallback'
                  : '📝 Title Search'}
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={loadFullAnalysis} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Price Comparison */}
      <div className="p-4 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Your Price</p>
          <p className="text-2xl font-bold text-blue-600">₹{analysis.your_price?.toLocaleString()}</p>
        </div>
        
        {priceAnalysis ? (
          <>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Avg Competitor</p>
              <p className="text-2xl font-bold text-gray-700">
                {priceAnalysis.currency === 'INR' ? '₹' : priceAnalysis.currency + ' '}
                {priceAnalysis.avg_competitor_price?.toLocaleString()}
              </p>
              {priceAnalysis.prices_converted && (
                <p className="text-xs text-green-600 mt-1">✓ Currency converted</p>
              )}
            </div>
            <div className={`text-center p-3 ${indicator?.bg} rounded-lg`}>
              <p className="text-xs text-gray-600 mb-1">Difference</p>
              <div className="flex items-center justify-center gap-1">
                {indicator && <indicator.icon className={`w-5 h-5 ${indicator.color}`} />}
                <p className={`text-xl font-bold ${indicator?.color}`}>
                  {priceAnalysis.price_difference_percent > 0 ? '+' : ''}{priceAnalysis.price_difference_percent}%
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="col-span-2 flex items-center justify-center text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Extracting prices...
          </div>
        )}
      </div>

      {/* Competitor List */}
      {competitorPrices.length > 0 && (
        <div className="p-4 border-t">
          <h4 className="font-medium mb-3">Competitor Prices (converted to ₹ INR)</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {competitorPrices.map((cp, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div className="flex-1 truncate">
                  <a
                    href={cp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {cp.domain}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {cp.original_currency && cp.original_currency !== 'INR' && (
                    <span className="text-xs text-gray-400 ml-2">
                      (from {cp.original_currency})
                    </span>
                  )}
                </div>
                <div className="text-right">
                  {cp.prices && cp.prices.length > 0 ? (
                    <span className="font-semibold">
                      ₹{Math.min(...cp.prices).toLocaleString()}
                      {cp.prices.length > 1 && ` - ₹${Math.max(...cp.prices).toLocaleString()}`}
                    </span>
                  ) : (
                    <span className="text-gray-400">No price found</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Web Entities */}
      {analysis.web_entities && analysis.web_entities.length > 0 && (
        <div className="p-4 border-t">
          <h4 className="font-medium mb-2">Related Keywords</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.web_entities.slice(0, 8).map((entity, idx) => (
              <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-xs">
                {entity.description}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Main Dashboard ====================
const CompetitorDashboard = () => {
  const { selectedStore } = useStore();
  const [showDialog, setShowDialog] = useState(false);
  const [analyses, setAnalyses] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [analysisStore, setAnalysisStore] = useState('ashmiaa');

  const loadStores = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/api/stores`);
      setStores(response.data.stores || []);
      if (!analysisStore && response.data.stores?.length > 0) {
        setAnalysisStore(response.data.stores[0].store_name);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  }, [analysisStore]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [analysesRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/competitor/analyses?limit=20`),
        axios.get(`${API}/api/competitor/dashboard-stats`)
      ]);
      setAnalyses(analysesRes.data.analyses || []);
      setStats(statsRes.data.stats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStores();
    loadData();
  }, [loadStores, loadData]);

  useEffect(() => {
    if (selectedStore) {
      setAnalysisStore(selectedStore);
    }
  }, [selectedStore]);

  const handleAnalysisComplete = (result) => {
    setCurrentAnalysis(result);
    loadData();
  };

  const handleDelete = async (analysisId) => {
    if (!window.confirm('Delete this analysis?')) return;
    try {
      await axios.delete(`${API}/api/competitor/analysis/${analysisId}`);
      toast.success('Analysis deleted');
      loadData();
      if (currentAnalysis?.analysis_id === analysisId) {
        setCurrentAnalysis(null);
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Competitor Price Dashboard</h1>
              <p className="text-sm text-gray-500">
                Analyze your products to discover competitor pricing
              </p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <Button onClick={() => setShowDialog(true)}>
                <Search className="w-4 h-4 mr-2" />
                Analyze Product
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Analyses</p>
                  <p className="text-2xl font-bold">{stats.total_analyses}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">With Prices</p>
                  <p className="text-2xl font-bold">{stats.analyses_with_prices}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Store className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Competitors</p>
                  <p className="text-2xl font-bold">{stats.avg_competitors_found}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">API Status</p>
                  <p className="text-sm font-medium text-yellow-600">
                    Add API Key
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-6">
          {/* Current Analysis */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Current Analysis</h2>
            {currentAnalysis ? (
              <AnalysisResultsCard analysis={currentAnalysis} onRefresh={loadData} />
            ) : (
              <div className="bg-white rounded-lg border p-12 text-center">
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">No analysis selected</p>
                <Button onClick={() => setShowDialog(true)}>
                  <Search className="w-4 h-4 mr-2" />
                  Analyze Product
                </Button>
              </div>
            )}
          </div>

          {/* Analysis History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Analysis History</h2>
              <Button variant="ghost" size="sm" onClick={loadData}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            <div className="bg-white rounded-lg border">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                </div>
              ) : analyses.length > 0 ? (
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {analyses.map((analysis) => (
                    <div
                      key={analysis.analysis_id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        currentAnalysis?.analysis_id === analysis.analysis_id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setCurrentAnalysis(analysis)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium truncate">{analysis.product_name}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span>₹{analysis.your_price?.toLocaleString()}</span>
                            <span>•</span>
                            <span>{analysis.competitor_pages?.length || 0} competitors</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setCurrentAnalysis(analysis); }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={(e) => { e.stopPropagation(); handleDelete(analysis.analysis_id); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>No analyses yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Dialog */}
      <AnalysisDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onAnalysisComplete={handleAnalysisComplete}
        stores={stores}
        selectedStore={analysisStore}
        onStoreChange={setAnalysisStore}
      />
    </div>
  );
};

export default CompetitorDashboard;
