import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import {
  Link2,
  ExternalLink,
  Search,
  RefreshCw,
  Loader2,
  Package,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
  Zap,
  Image as ImageIcon,
  ShoppingBag,
  Palette,
  Ruler,
  Download,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';

const API = process.env.REACT_APP_BACKEND_URL;

// Color/Size Badge Component
const VariantBadge = ({ variant, linked, missingIn1688 }) => {
  const color = variant.option1 || variant.color || '';
  const size = variant.option2 || variant.size || '';
  
  return (
    <div className={`flex items-center gap-2 p-2 rounded text-sm ${
      linked ? 'bg-green-50 border border-green-200' : 
      missingIn1688 ? 'bg-red-50 border border-red-200' : 
      'bg-gray-50 border border-gray-200'
    }`}>
      <div className="flex-1">
        {color && (
          <span className="flex items-center gap-1">
            <Palette className="w-3 h-3" />
            {color}
          </span>
        )}
        {size && (
          <span className="flex items-center gap-1 text-gray-600">
            <Ruler className="w-3 h-3" />
            {size}
          </span>
        )}
        {!color && !size && <span>{variant.title || 'Default'}</span>}
      </div>
      <div className="text-xs">
        {linked ? (
          <Badge className="bg-green-500 text-white">Linked</Badge>
        ) : missingIn1688 ? (
          <Badge variant="destructive">Missing</Badge>
        ) : (
          <Badge variant="secondary">Not Linked</Badge>
        )}
      </div>
    </div>
  );
};

// Product Card with Expandable Variants
const ProductCard = ({ 
  product, 
  link1688, 
  onLink, 
  onScrapeVariants, 
  linking, 
  scraping,
  selected,
  onSelect 
}) => {
  const [expanded, setExpanded] = useState(false);
  const mainImage = product.image?.src || product.images?.[0]?.src;
  
  // Parse variants
  const variants = product.variants || [];
  const linkedVariants = variants.filter(v => v.linked_1688);
  const missingVariants = variants.filter(v => v.missing_in_1688);
  
  return (
    <Card className={`transition-all ${selected ? 'ring-2 ring-purple-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Checkbox for bulk selection */}
          <div className="flex items-start pt-1">
            <Checkbox 
              checked={selected}
              onCheckedChange={onSelect}
              data-testid={`select-product-${product.id}`}
            />
          </div>
          
          {/* Product Image */}
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {mainImage ? (
              <img src={mainImage} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <ImageIcon className="w-8 h-8" />
              </div>
            )}
          </div>
          
          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900 line-clamp-2">{product.title}</h3>
                <p className="text-sm text-gray-500">SKU: {product.variants?.[0]?.sku || 'N/A'}</p>
              </div>
              
              {/* Link Status */}
              {link1688 ? (
                <Badge className="bg-green-100 text-green-700 flex-shrink-0">
                  <Link2 className="w-3 h-3 mr-1" />
                  Linked
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex-shrink-0">
                  Not Linked
                </Badge>
              )}
            </div>
            
            {/* Variants Summary */}
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="text-gray-600">
                {variants.length} variant{variants.length !== 1 ? 's' : ''}
              </span>
              {linkedVariants.length > 0 && (
                <Badge variant="outline" className="text-green-600 border-green-300">
                  {linkedVariants.length} linked
                </Badge>
              )}
              {missingVariants.length > 0 && (
                <Badge variant="outline" className="text-red-600 border-red-300">
                  {missingVariants.length} missing
                </Badge>
              )}
            </div>
            
            {/* 1688 Link Info */}
            {link1688 && (
              <div className="mt-2 p-2 bg-orange-50 rounded text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-orange-700 truncate flex-1">
                    1688 ID: {link1688.product_1688_id}
                  </span>
                  <a 
                    href={link1688.product_1688_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-800 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View
                  </a>
                </div>
                {link1688.product_1688_price && (
                  <p className="text-orange-600 font-medium mt-1">
                    ¥{link1688.product_1688_price}
                  </p>
                )}
              </div>
            )}
            
            {/* Actions */}
            <div className="mt-3 flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="text-xs"
              >
                {expanded ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                {expanded ? 'Hide' : 'Show'} Variants
              </Button>
              
              {!link1688 && (
                <Button 
                  size="sm"
                  onClick={() => onLink(product)}
                  disabled={linking}
                  className="text-xs bg-orange-500 hover:bg-orange-600"
                >
                  {linking ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Link2 className="w-3 h-3 mr-1" />}
                  Link to 1688
                </Button>
              )}
              
              {missingVariants.length > 0 && (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => onScrapeVariants(product, link1688)}
                  disabled={scraping}
                  className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                >
                  {scraping ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                  Add Missing ({missingVariants.length})
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Expanded Variants Section */}
        {expanded && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Variants ({variants.length})</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-auto">
              {variants.map((variant, i) => (
                <VariantBadge 
                  key={variant.id || i}
                  variant={variant}
                  linked={variant.linked_1688}
                  missingIn1688={variant.missing_in_1688}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Link Modal
const LinkModal = ({ product, onClose, onSubmit, loading }) => {
  const [url, setUrl] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Please enter a 1688 product URL');
      return;
    }
    onSubmit(product, url);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-orange-500" />
            Link to 1688 Product
          </CardTitle>
          <CardDescription>
            {product.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">1688 Product URL</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://detail.1688.com/offer/123456789.html"
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Paste the full 1688 product page URL
              </p>
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                Link Product
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// Variants Scrape Modal
const VariantsModal = ({ product, link1688, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [variantsData, setVariantsData] = useState(null);
  const [selectedVariants, setSelectedVariants] = useState(new Set());
  
  useEffect(() => {
    const fetchVariants = async () => {
      if (!link1688?.product_1688_id) return;
      
      try {
        const res = await fetch(`${API}/api/1688-scraper/products/${link1688.product_1688_id}/scrape-variants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopify_product_id: product.id?.toString() }),
        });
        const data = await res.json();
        if (data.success) {
          setVariantsData(data);
          // Select all missing variants by default
          if (data.missing_variants) {
            setSelectedVariants(new Set(data.missing_variants.map((_, i) => i)));
          }
        }
      } catch (e) {
        console.error('Failed to fetch variants:', e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVariants();
  }, [link1688, product.id]);
  
  const toggleVariant = (index) => {
    const newSelected = new Set(selectedVariants);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedVariants(newSelected);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500" />
            1688 Product Variants
          </CardTitle>
          <CardDescription>
            {variantsData?.title || product.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : variantsData ? (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded text-center">
                  <p className="text-2xl font-bold text-blue-600">{variantsData.total_variants}</p>
                  <p className="text-xs text-blue-600">Total in 1688</p>
                </div>
                <div className="bg-green-50 p-3 rounded text-center">
                  <p className="text-2xl font-bold text-green-600">{variantsData.colors?.length || 0}</p>
                  <p className="text-xs text-green-600">Colors</p>
                </div>
                <div className="bg-purple-50 p-3 rounded text-center">
                  <p className="text-2xl font-bold text-purple-600">{variantsData.sizes?.length || 0}</p>
                  <p className="text-xs text-purple-600">Sizes</p>
                </div>
                <div className="bg-red-50 p-3 rounded text-center">
                  <p className="text-2xl font-bold text-red-600">{variantsData.missing_in_shopify || 0}</p>
                  <p className="text-xs text-red-600">Missing</p>
                </div>
              </div>
              
              {/* Colors List */}
              {variantsData.colors?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Available Colors ({variantsData.colors.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {variantsData.colors.map((color, i) => (
                      <Badge key={i} variant="outline">{color}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Sizes List */}
              {variantsData.sizes?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Available Sizes ({variantsData.sizes.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {variantsData.sizes.map((size, i) => (
                      <Badge key={i} variant="outline">{size}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Missing Variants */}
              {variantsData.missing_variants?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    Missing in Shopify ({variantsData.missing_variants.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-auto">
                    {variantsData.missing_variants.map((v, i) => (
                      <div 
                        key={i}
                        onClick={() => toggleVariant(i)}
                        className={`p-2 rounded border cursor-pointer transition-colors ${
                          selectedVariants.has(i) 
                            ? 'bg-orange-100 border-orange-300' 
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox checked={selectedVariants.has(i)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {v.color || 'Default'} / {v.size || 'One Size'}
                            </p>
                            <p className="text-xs text-gray-500">
                              ¥{v.price?.toFixed(2)} • Stock: {v.stock || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* All Variants */}
              <div>
                <h4 className="text-sm font-medium mb-2">All 1688 Variants ({variantsData.variants?.length})</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-60 overflow-auto">
                  {variantsData.variants?.slice(0, 50).map((v, i) => (
                    <div key={i} className="p-2 bg-gray-50 rounded text-xs">
                      <p className="font-medium truncate">{v.color || '-'} / {v.size || '-'}</p>
                      <p className="text-gray-500">¥{v.price?.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                {variantsData.missing_variants?.length > 0 && (
                  <Button 
                    className="bg-orange-500 hover:bg-orange-600"
                    disabled={selectedVariants.size === 0}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create {selectedVariants.size} Variants in Shopify
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Failed to load variants</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Main Component
const ProductLinkManager = () => {
  const { selectedStore } = useStore();
  const [products, setProducts] = useState([]);
  const [productLinks, setProductLinks] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Selection state
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Modal state
  const [linkModalProduct, setLinkModalProduct] = useState(null);
  const [linking, setLinking] = useState(null);
  const [scraping, setScraping] = useState(null);
  const [variantsModalProduct, setVariantsModalProduct] = useState(null);
  
  // Auto-link state
  const [autoLinking, setAutoLinking] = useState(false);
  const [autoLinkProgress, setAutoLinkProgress] = useState({ current: 0, total: 0 });

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!selectedStore) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '100',  // Backend uses page_size not limit
        store_name: selectedStore,
      });
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await fetch(`${API}/api/shopify/products?${params}`);
      const data = await res.json();
      
      if (data.products) {
        setProducts(data.products);
        setTotalPages(Math.ceil((data.total || data.products.length) / 100));
        setTotal(data.total || data.products.length);
      }
    } catch (e) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [selectedStore, page, searchQuery]);

  // Fetch product links
  const fetchProductLinks = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/1688-scraper/product-links/all?limit=500`);
      const data = await res.json();
      
      if (data.success && data.links) {
        // Create a map by SKU for quick lookup
        const linksMap = {};
        data.links.forEach(link => {
          linksMap[link.shopify_sku] = link;
        });
        setProductLinks(linksMap);
      }
    } catch (e) {
      console.error('Failed to fetch product links:', e);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchProductLinks();
  }, [fetchProducts, fetchProductLinks]);

  // Get link for a product
  const getProductLink = (product) => {
    if (!product.variants?.length) return null;
    
    // Check each variant's SKU
    for (const variant of product.variants) {
      if (variant.sku && productLinks[variant.sku]) {
        return productLinks[variant.sku];
      }
    }
    return null;
  };

  // Handle single product link
  const handleLinkProduct = async (product, url) => {
    setLinking(product.id);
    
    try {
      // Extract product ID from URL
      const match = url.match(/offer\/(\d+)/);
      if (!match) {
        toast.error('Invalid 1688 URL');
        return;
      }
      
      const product1688Id = match[1];
      const sku = product.variants?.[0]?.sku;
      
      if (!sku) {
        toast.error('Product has no SKU');
        return;
      }
      
      const res = await fetch(`${API}/api/1688-scraper/product-links/link-1688`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopify_sku: sku,
          product_1688_id: product1688Id,
          product_1688_url: url,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Product linked successfully');
        setLinkModalProduct(null);
        fetchProductLinks();
      } else {
        toast.error(data.detail || 'Failed to link product');
      }
    } catch (e) {
      toast.error('Failed to link product');
    } finally {
      setLinking(null);
    }
  };

  // Handle auto-link for selected products
  const handleAutoLinkSelected = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Please select products to auto-link');
      return;
    }
    
    setAutoLinking(true);
    setAutoLinkProgress({ current: 0, total: selectedProducts.size });
    
    const selectedList = products.filter(p => selectedProducts.has(p.id));
    let linked = 0;
    let failed = 0;
    
    for (let i = 0; i < selectedList.length; i++) {
      const product = selectedList[i];
      setAutoLinkProgress({ current: i + 1, total: selectedList.length });
      
      try {
        // Use image search to find matching 1688 product
        const mainImage = product.image?.src || product.images?.[0]?.src;
        if (!mainImage) continue;
        
        const res = await fetch(`${API}/api/1688-scraper/image-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: mainImage }),
        });
        
        const data = await res.json();
        
        if (data.success && data.results?.length > 0) {
          // Link to the first result
          const bestMatch = data.results[0];
          const sku = product.variants?.[0]?.sku;
          
          if (sku && bestMatch.product_id) {
            await fetch(`${API}/api/1688-scraper/product-links/link-1688`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                shopify_sku: sku,
                product_1688_id: bestMatch.product_id,
                product_1688_url: bestMatch.url || `https://detail.1688.com/offer/${bestMatch.product_id}.html`,
                product_1688_title: bestMatch.title,
                product_1688_price: bestMatch.price,
                product_1688_image: bestMatch.image,
              }),
            });
            linked++;
          }
        } else {
          failed++;
        }
      } catch (e) {
        failed++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }
    
    setAutoLinking(false);
    toast.success(`Auto-link complete: ${linked} linked, ${failed} failed`);
    fetchProductLinks();
    setSelectedProducts(new Set());
  };

  // Handle scrape missing variants - opens modal
  const handleScrapeVariants = async (product, link1688) => {
    if (!link1688?.product_1688_id) {
      toast.error('No 1688 link found for this product');
      return;
    }
    
    // Open the variants modal
    setVariantsModalProduct({ product, link1688 });
  };

  // Toggle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
    setSelectAll(!selectAll);
  };

  // Toggle single selection
  const handleSelectProduct = (productId) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
    setSelectAll(newSelected.size === products.length);
  };

  // Stats
  const linkedCount = products.filter(p => getProductLink(p)).length;
  const unlinkedCount = products.length - linkedCount;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="w-7 h-7 text-orange-500" />
            Product Link Manager
          </h1>
          <p className="text-gray-500 mt-1">
            Link Shopify products to 1688 suppliers and manage variants
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => { fetchProducts(); fetchProductLinks(); }}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-sm text-gray-500">Total Products</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{linkedCount}</p>
              <p className="text-sm text-gray-500">Linked</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unlinkedCount}</p>
              <p className="text-sm text-gray-500">Not Linked</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{selectedProducts.size}</p>
              <p className="text-sm text-gray-500">Selected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Select All */}
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={selectAll}
                onCheckedChange={handleSelectAll}
                data-testid="select-all-products"
              />
              <span className="text-sm">Select All</span>
            </div>
            
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Auto-Link Button */}
            <Button 
              onClick={handleAutoLinkSelected}
              disabled={autoLinking || selectedProducts.size === 0}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {autoLinking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Linking {autoLinkProgress.current}/{autoLinkProgress.total}...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Auto-Link Selected ({selectedProducts.size})
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                link1688={getProductLink(product)}
                onLink={() => setLinkModalProduct(product)}
                onScrapeVariants={handleScrapeVariants}
                linking={linking === product.id}
                scraping={scraping === product.id}
                selected={selectedProducts.has(product.id)}
                onSelect={() => handleSelectProduct(product.id)}
              />
            ))}
          </div>

          {products.length === 0 && (
            <Card className="py-12">
              <CardContent className="text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No products found</p>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button 
                variant="outline" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="px-4 py-2">
                Page {page} of {totalPages} ({total} products)
              </span>
              <Button 
                variant="outline" 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Link Modal */}
      {linkModalProduct && (
        <LinkModal
          product={linkModalProduct}
          onClose={() => setLinkModalProduct(null)}
          onSubmit={handleLinkProduct}
          loading={linking}
        />
      )}
      
      {/* Variants Modal */}
      {variantsModalProduct && (
        <VariantsModal
          product={variantsModalProduct.product}
          link1688={variantsModalProduct.link1688}
          onClose={() => setVariantsModalProduct(null)}
        />
      )}
    </div>
  );
};

export default ProductLinkManager;
