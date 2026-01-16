import React, { useState, useEffect } from 'react';
import { 
  ImagePlus, Sparkles, RefreshCw, Check, X, Wand2, Download,
  ChevronLeft, Eye, Trash2, Upload, Play, Pause, CheckCircle2,
  AlertCircle, Image, Loader2, Settings2, Zap
} from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const ImageEnhancer = () => {
  const { selectedStore } = useStore();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [enhancing, setEnhancing] = useState(false);
  const [bulkTaskId, setBulkTaskId] = useState(null);
  const [bulkStatus, setBulkStatus] = useState(null);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [previewEnhanced, setPreviewEnhanced] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Enhancement options
  const [options, setOptions] = useState({
    removeBackground: true,
    whiteBackground: true,
    enhanceQuality: true
  });

  const storeName = selectedStore || 'tnvcollection';

  useEffect(() => {
    fetchProducts();
  }, [selectedStore]);

  // Poll for bulk status
  useEffect(() => {
    let interval;
    if (bulkTaskId && bulkStatus?.status === 'processing') {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`${API_URL}/api/image-ai/status/${bulkTaskId}`);
          const data = await response.json();
          setBulkStatus(data);
          
          if (data.status === 'completed' || data.status === 'error') {
            clearInterval(interval);
            if (data.status === 'completed') {
              toast.success(`Enhanced ${data.success} images!`);
              fetchProducts(); // Refresh products
            } else {
              toast.error('Bulk enhancement failed');
            }
          }
        } catch (error) {
          console.error('Error polling status:', error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [bulkTaskId, bulkStatus]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Fetch from Shopify products endpoint
      const response = await fetch(`${API_URL}/api/shopify/products?limit=100`);
      const data = await response.json();
      
      // Handle different response formats
      let productList = [];
      if (Array.isArray(data)) {
        productList = data;
      } else if (data.products) {
        productList = data.products;
      } else if (data.data) {
        productList = data.data;
      }
      
      // Map products to our format
      const mappedProducts = productList.map(p => {
        // Get first image from images array or image field
        let imageUrl = p.image;
        if (!imageUrl && p.images && p.images.length > 0) {
          imageUrl = p.images[0].src || p.images[0];
        }
        
        return {
          _id: p.id || p._id,
          title: p.title || 'Untitled Product',
          image: imageUrl || '',
          enhanced_image: p.enhanced_image || null,
          image_enhanced_at: p.image_enhanced_at || null
        };
      }).filter(p => p.image); // Only products with images
      
      setProducts(mappedProducts);
      
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const enhanceSingleImage = async (product) => {
    setPreviewProduct(product);
    setPreviewEnhanced(null);
    setPreviewLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/image-ai/enhance-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: product.image,
          remove_background: options.removeBackground,
          enhance_quality: options.enhanceQuality,
          white_background: options.whiteBackground
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.enhanced_image) {
        setPreviewEnhanced(data.enhanced_image);
        toast.success('Image enhanced!');
      } else {
        toast.error('Failed to enhance image');
      }
    } catch (error) {
      toast.error('Enhancement failed');
      console.error('Error:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const startBulkEnhancement = async () => {
    setEnhancing(true);
    setBulkStatus(null);
    
    try {
      const response = await fetch(`${API_URL}/api/image-ai/enhance-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store: storeName,
          remove_background: options.removeBackground,
          enhance_quality: options.enhanceQuality,
          white_background: options.whiteBackground
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setBulkTaskId(data.task_id);
        setBulkStatus({ status: 'processing', total: products.length, processed: 0 });
        toast.info('Bulk enhancement started!');
      } else {
        toast.error('Failed to start bulk enhancement');
        setEnhancing(false);
      }
    } catch (error) {
      toast.error('Failed to start enhancement');
      setEnhancing(false);
      console.error('Error:', error);
    }
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p._id));
    }
  };

  const toggleProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="image-enhancer">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Wand2 className="w-6 h-6 text-purple-500" />
                AI Image Enhancer
              </h1>
              <p className="text-sm text-gray-500">Automatically enhance product photos with AI</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{products.length} products</span>
            <Button 
              onClick={startBulkEnhancement} 
              disabled={enhancing || products.length === 0}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {enhancing ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Enhance All Images</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - Options */}
        <div className="w-80 bg-white border-r p-6 min-h-[calc(100vh-73px)]">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Enhancement Options
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-medium">Remove Background</Label>
                <p className="text-xs text-gray-500">Extract product from background</p>
              </div>
              <Switch 
                checked={options.removeBackground}
                onCheckedChange={(v) => setOptions(prev => ({ ...prev, removeBackground: v }))}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-medium">White Background</Label>
                <p className="text-xs text-gray-500">Pure white (#FFFFFF)</p>
              </div>
              <Switch 
                checked={options.whiteBackground}
                onCheckedChange={(v) => setOptions(prev => ({ ...prev, whiteBackground: v }))}
                disabled={!options.removeBackground}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-medium">Enhance Quality</Label>
                <p className="text-xs text-gray-500">Improve lighting & colors</p>
              </div>
              <Switch 
                checked={options.enhanceQuality}
                onCheckedChange={(v) => setOptions(prev => ({ ...prev, enhanceQuality: v }))}
              />
            </div>
          </div>

          {/* Bulk Progress */}
          {bulkStatus && (
            <div className="mt-6 p-4 bg-purple-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-700">
                  {bulkStatus.status === 'processing' ? 'Processing...' : 
                   bulkStatus.status === 'completed' ? 'Completed!' : 'Error'}
                </span>
                <span className="text-sm text-purple-600">
                  {bulkStatus.processed || 0}/{bulkStatus.total || 0}
                </span>
              </div>
              <Progress 
                value={bulkStatus.total ? (bulkStatus.processed / bulkStatus.total) * 100 : 0} 
                className="h-2"
              />
              {bulkStatus.status === 'completed' && (
                <div className="mt-2 text-xs text-purple-600">
                  ✓ {bulkStatus.success} enhanced, {bulkStatus.failed} failed
                </div>
              )}
            </div>
          )}

          {/* Tips */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <h3 className="font-medium text-blue-700 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Pro Tips
            </h3>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>• White backgrounds increase conversions by 25%</li>
              <li>• Click any product to preview enhancement</li>
              <li>• High-quality images = more sales</li>
            </ul>
          </div>
        </div>

        {/* Main Content - Product Grid */}
        <div className="flex-1 p-6">
          {/* Select All */}
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={toggleSelectAll}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                selectedProducts.length === products.length ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
              }`}>
                {selectedProducts.length === products.length && <Check className="w-3 h-3 text-white" />}
              </div>
              Select All ({selectedProducts.length}/{products.length})
            </button>
            
            {selectedProducts.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setSelectedProducts([])}>
                Clear Selection
              </Button>
            )}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <div 
                key={product._id}
                className={`relative bg-white rounded-xl overflow-hidden shadow-sm border-2 transition-all cursor-pointer hover:shadow-md ${
                  selectedProducts.includes(product._id) ? 'border-purple-500 ring-2 ring-purple-200' : 'border-transparent'
                }`}
              >
                {/* Selection Checkbox */}
                <div 
                  className="absolute top-2 left-2 z-10"
                  onClick={(e) => { e.stopPropagation(); toggleProduct(product._id); }}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white shadow ${
                    selectedProducts.includes(product._id) ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                  }`}>
                    {selectedProducts.includes(product._id) && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>

                {/* Enhanced Badge */}
                {product.enhanced_image && (
                  <div className="absolute top-2 right-2 z-10 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Enhanced
                  </div>
                )}

                {/* Image */}
                <div 
                  className="aspect-square bg-gray-100 relative group"
                  onClick={() => enhanceSingleImage(product)}
                >
                  <img 
                    src={product.enhanced_image || product.image} 
                    alt={product.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/200?text=No+Image';
                    }}
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button size="sm" className="bg-white text-gray-900 hover:bg-gray-100">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{product.title}</p>
                  {product.image_enhanced_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      Enhanced {new Date(product.image_enhanced_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {products.length === 0 && (
            <div className="text-center py-20">
              <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600">No products found</h3>
              <p className="text-gray-400">Add products to start enhancing images</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setPreviewProduct(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Image Enhancement Preview</h2>
              <Button variant="ghost" size="sm" onClick={() => setPreviewProduct(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Original */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Original</h3>
                <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                  <img 
                    src={previewProduct.image} 
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Enhanced */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Enhanced</h3>
                <div className="aspect-square bg-white rounded-xl overflow-hidden border-2 border-dashed border-gray-200 flex items-center justify-center">
                  {previewLoading ? (
                    <div className="text-center">
                      <Loader2 className="w-10 h-10 animate-spin text-purple-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Enhancing with AI...</p>
                    </div>
                  ) : previewEnhanced ? (
                    <img 
                      src={previewEnhanced} 
                      alt="Enhanced"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <Sparkles className="w-10 h-10 mx-auto mb-2" />
                      <p className="text-sm">Click "Enhance" to see magic</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setPreviewProduct(null)}>
                Close
              </Button>
              {previewEnhanced && (
                <Button className="bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4 mr-2" />
                  Save Enhanced Image
                </Button>
              )}
              {!previewEnhanced && !previewLoading && (
                <Button 
                  onClick={() => enhanceSingleImage(previewProduct)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enhance Image
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageEnhancer;
