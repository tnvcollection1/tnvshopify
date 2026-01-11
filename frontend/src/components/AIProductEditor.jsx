import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Sparkles,
  Wand2,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Tag,
  FileText,
  List,
  ChevronRight,
  Package,
  Camera,
  Image as ImageIcon,
  Link2,
  Eye,
  Search,
  Store,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Zap,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Copy button component
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy}>
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
};

// Product Card for Catalog
const ProductCard = ({ product, onSelect, isSelected, isProcessing }) => {
  const linked = product.linked_1688_product_id;
  const hasAIContent = product.ai_enhanced;
  
  return (
    <div 
      onClick={() => !isProcessing && onSelect(product)}
      className={`
        group relative bg-white rounded-lg border overflow-hidden cursor-pointer transition-all
        ${isSelected ? 'ring-2 ring-purple-500 border-purple-300' : 'border-gray-200 hover:border-purple-300 hover:shadow-md'}
        ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
      `}
      data-testid={`product-card-${product.shopify_product_id}`}
    >
      {/* Image */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-gray-300" />
          </div>
        )}
        
        {/* Status badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {linked && (
            <Badge className="bg-orange-500 text-white border-0 text-xs">
              <Link2 className="w-3 h-3 mr-1" />
              1688
            </Badge>
          )}
          {hasAIContent && (
            <Badge className="bg-purple-500 text-white border-0 text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              AI
            </Badge>
          )}
        </div>
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white rounded-full p-2 shadow-lg">
            <Wand2 className="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>
      
      {/* Info */}
      <div className="p-3">
        <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
          {product.title}
        </h4>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Store className="w-3 h-3" />
            {product.store_name}
          </span>
          <span className="font-medium text-gray-700">
            ₹{parseFloat(product.price || 0).toFixed(0)}
          </span>
        </div>
      </div>
      
      {/* Processing indicator */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      )}
    </div>
  );
};

// AI Enhancement Modal
const AIEnhancementModal = ({ 
  product, 
  onClose, 
  onSave,
  enhancementData,
  loading,
  saving,
}) => {
  const [selectedTitle, setSelectedTitle] = useState(0);
  const [customTitle, setCustomTitle] = useState('');
  const [selectedDescription, setSelectedDescription] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  
  useEffect(() => {
    if (enhancementData) {
      // Set best title as default
      setCustomTitle(enhancementData.suggested_titles?.[0] || product.title);
      setSelectedDescription(enhancementData.description || product.description || '');
    }
  }, [enhancementData, product]);
  
  const handleSave = () => {
    onSave({
      title: editingTitle ? customTitle : (enhancementData?.suggested_titles?.[selectedTitle] || product.title),
      description: selectedDescription,
      selling_points: enhancementData?.selling_points || [],
      tags: enhancementData?.tags || [],
      seo_title: enhancementData?.seo_title || '',
    });
  };
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-white">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-500" />
            AI Product Enhancement
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
              <p className="text-gray-700 font-medium">Analyzing product...</p>
              <p className="text-gray-500 text-sm mt-1">Recognizing image & scraping 1688 data</p>
            </div>
          ) : enhancementData ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Left - Product Info */}
              <div className="space-y-4">
                {/* Product Preview */}
                <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-white border flex-shrink-0">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">Original Title</p>
                    <p className="font-medium text-sm text-gray-900 line-clamp-2">{product.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">{product.store_name}</Badge>
                      {product.linked_1688_product_id && (
                        <Badge className="bg-orange-100 text-orange-700 text-xs border-0">
                          <Link2 className="w-3 h-3 mr-1" />
                          Linked
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Scraped 1688 Info */}
                {enhancementData.scraped_from_1688 && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm font-medium text-orange-800 flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4" />
                      Scraped from 1688
                    </p>
                    {enhancementData.original_1688_title && (
                      <p className="text-xs text-orange-700 mb-1">
                        <strong>Original:</strong> {enhancementData.original_1688_title}
                      </p>
                    )}
                    {enhancementData.translated_title && (
                      <p className="text-xs text-orange-700">
                        <strong>Translated:</strong> {enhancementData.translated_title}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Image Recognition Results */}
                {enhancementData.image_recognition && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-800 flex items-center gap-2 mb-2">
                      <Camera className="w-4 h-4" />
                      Image Recognition
                    </p>
                    {enhancementData.image_recognition.category && (
                      <p className="text-xs text-blue-700 mb-1">
                        <strong>Category:</strong> {enhancementData.image_recognition.category}
                      </p>
                    )}
                    {enhancementData.image_recognition.attributes?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {enhancementData.image_recognition.attributes.slice(0, 5).map((attr, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {attr.name}: {attr.value}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Right - AI Suggestions */}
              <div className="space-y-4">
                {/* Title Suggestions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      Improved Titles
                    </label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setEditingTitle(!editingTitle)}
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      {editingTitle ? 'Use Suggestion' : 'Custom Edit'}
                    </Button>
                  </div>
                  
                  {editingTitle ? (
                    <Textarea
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      rows={2}
                      className="text-sm"
                      placeholder="Enter custom title..."
                    />
                  ) : (
                    <div className="space-y-2">
                      {enhancementData.suggested_titles?.map((title, i) => (
                        <div 
                          key={i}
                          onClick={() => setSelectedTitle(i)}
                          className={`
                            p-3 rounded-lg border cursor-pointer transition-all text-sm
                            ${selectedTitle === i 
                              ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-200' 
                              : 'border-gray-200 hover:border-purple-300'
                            }
                          `}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="flex-1">{title}</span>
                            {selectedTitle === i && (
                              <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    Product Description
                  </label>
                  <Textarea
                    value={selectedDescription}
                    onChange={(e) => setSelectedDescription(e.target.value)}
                    rows={4}
                    className="text-sm"
                    placeholder="Product description..."
                  />
                </div>
                
                {/* Selling Points */}
                {enhancementData.selling_points?.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                      <List className="w-4 h-4 text-purple-500" />
                      Selling Points
                    </label>
                    <div className="space-y-1">
                      {enhancementData.selling_points.map((point, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <ChevronRight className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Tags */}
                {enhancementData.tags?.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-purple-500" />
                      SEO Tags
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {enhancementData.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <p className="text-gray-700 font-medium">Failed to analyze product</p>
              <p className="text-gray-500 text-sm mt-1">Please try again</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {enhancementData && !loading && (
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Changes will be saved to your Shopify store
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="bg-purple-500 hover:bg-purple-600"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Apply Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Main Component
const AIProductEditor = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [linkFilter, setLinkFilter] = useState('all');
  const [stores, setStores] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 24;
  
  // Enhancement state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancementData, setEnhancementData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [processingProductId, setProcessingProductId] = useState(null);
  
  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      
      if (searchQuery) params.append('search', searchQuery);
      if (storeFilter !== 'all') params.append('store_name', storeFilter);
      if (linkFilter === 'linked') params.append('linked_only', 'true');
      if (linkFilter === 'unlinked') params.append('unlinked_only', 'true');
      
      const res = await fetch(`${API}/api/shopify/products?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setProducts(data.products || []);
        setTotal(data.total || 0);
        
        // Extract unique stores
        const uniqueStores = [...new Set(data.products?.map(p => p.store_name).filter(Boolean))];
        setStores(uniqueStores);
      }
    } catch (e) {
      console.error('Failed to fetch products:', e);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, storeFilter, linkFilter]);
  
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  
  // Handle product selection - analyze and enhance
  const handleProductSelect = async (product) => {
    setSelectedProduct(product);
    setEnhancementData(null);
    setEnhancing(true);
    setProcessingProductId(product.shopify_product_id);
    
    try {
      const res = await fetch(`${API}/api/ai-product/enhance-from-catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopify_product_id: product.shopify_product_id,
          store_name: product.store_name,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setEnhancementData(data);
      } else {
        toast.error(data.detail || 'Failed to analyze product');
        setSelectedProduct(null);
      }
    } catch (e) {
      console.error('Enhancement error:', e);
      toast.error('Failed to analyze product');
      setSelectedProduct(null);
    } finally {
      setEnhancing(false);
      setProcessingProductId(null);
    }
  };
  
  // Save enhanced content
  const handleSaveEnhancement = async (content) => {
    if (!selectedProduct) return;
    
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/ai-product/save-enhancement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopify_product_id: selectedProduct.shopify_product_id,
          store_name: selectedProduct.store_name,
          title: content.title,
          description: content.description,
          tags: content.tags,
          selling_points: content.selling_points,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Product updated successfully!');
        setSelectedProduct(null);
        setEnhancementData(null);
        fetchProducts(); // Refresh list
      } else {
        toast.error(data.detail || 'Failed to save changes');
      }
    } catch (e) {
      console.error('Save error:', e);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };
  
  // Filter products
  const filteredProducts = products;
  
  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Wand2 className="w-6 h-6 text-purple-500" />
                AI Product Editor
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Click on any product to enhance titles and descriptions with AI
              </p>
            </div>
            <Button onClick={fetchProducts} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Store Filter */}
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {stores.map(store => (
                  <SelectItem key={store} value={store}>{store}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Link Filter */}
            <Select value={linkFilter} onValueChange={setLinkFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="linked">Linked to 1688</SelectItem>
                <SelectItem value="unlinked">Not Linked</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Stats */}
            <div className="ml-auto flex items-center gap-4 text-sm text-gray-500">
              <span>{total} products</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Products Grid */}
      <div className="px-6 pb-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
            <p className="text-gray-600">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border">
            <Package className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-700 font-medium">No products found</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.shopify_product_id}
                  product={product}
                  onSelect={handleProductSelect}
                  isSelected={selectedProduct?.shopify_product_id === product.shopify_product_id}
                  isProcessing={processingProductId === product.shopify_product_id}
                />
              ))}
            </div>
            
            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Page {page} of {Math.ceil(total / pageSize)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(total / pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Enhancement Modal */}
      {selectedProduct && (
        <AIEnhancementModal
          product={selectedProduct}
          onClose={() => {
            setSelectedProduct(null);
            setEnhancementData(null);
          }}
          onSave={handleSaveEnhancement}
          enhancementData={enhancementData}
          loading={enhancing}
          saving={saving}
        />
      )}
    </div>
  );
};

export default AIProductEditor;
