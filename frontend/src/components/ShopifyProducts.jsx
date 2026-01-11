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
  Filter,
  Image as ImageIcon,
  Store,
  X,
  Zap,
  Play,
  Check,
  AlertCircle,
  Loader2,
  Palette,
  Ruler,
  Plus,
  AlertTriangle,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Status Badge Component
const StatusBadge = ({ type, children }) => {
  const styles = {
    shopify: "bg-emerald-50 text-emerald-700 border-emerald-200",
    source: "bg-orange-50 text-orange-700 border-orange-200",
    missing: "bg-white text-zinc-500 border-zinc-300 border-dashed",
    synced: "bg-emerald-50 text-emerald-600 border-emerald-200",
  };
  
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${styles[type] || styles.source}`}>
      {children}
    </span>
  );
};

// Variant Row Component for cleaner list display
const VariantRow = ({ variant, isSelected, onToggle, isMissing }) => {
  return (
    <div 
      onClick={() => isMissing && onToggle?.()}
      className={`group flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
        isMissing 
          ? isSelected
            ? 'border-orange-400 bg-orange-50 cursor-pointer'
            : 'border-dashed border-orange-300 bg-orange-50/30 hover:bg-orange-50 hover:border-orange-400 cursor-pointer'
          : 'border-zinc-200 bg-white'
      }`}
      data-testid={`variant-row-${variant.color}-${variant.size}`}
    >
      <div className="flex items-center gap-3">
        {isMissing && (
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={onToggle}
            className="border-orange-400 data-[state=checked]:bg-orange-500"
          />
        )}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center">
            <Palette className="w-4 h-4 text-zinc-500" />
          </div>
          <div>
            <p className="font-medium text-sm text-zinc-900">{variant.color || 'Default'}</p>
            <p className="text-xs text-zinc-500">Size: {variant.size || 'One Size'}</p>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm font-medium text-orange-600">¥{variant.price?.toFixed(2) || '0.00'}</p>
        <p className="text-xs text-zinc-400">Stock: {variant.stock || 0}</p>
      </div>
    </div>
  );
};

// Variant Comparison Modal Component - Redesigned
const VariantComparisonModal = ({ product, onClose, onVariantsCreated }) => {
  const [loading, setLoading] = useState(true);
  const [variantsData, setVariantsData] = useState(null);
  const [selectedVariants, setSelectedVariants] = useState(new Set());
  const [creating, setCreating] = useState(false);
  const [scraping, setScraping] = useState(false);
  
  // Shopify variants from product
  const shopifyVariants = product.variants || [];
  
  useEffect(() => {
    const fetchVariants = async () => {
      if (!product.linked_1688_product_id) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`${API}/api/1688-scraper/products/${product.linked_1688_product_id}/scrape-variants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopify_product_id: product.shopify_product_id?.toString() }),
        });
        const data = await res.json();
        if (data.success) {
          // Compare with Shopify variants
          const shopifyColors = new Set(shopifyVariants.map(v => (v.option1 || '').toLowerCase().trim()));
          const shopifySizes = new Set(shopifyVariants.map(v => (v.option2 || '').toLowerCase().trim()));
          const shopifyCombos = new Set(shopifyVariants.map(v => 
            `${(v.option1 || '').toLowerCase().trim()}|${(v.option2 || '').toLowerCase().trim()}`
          ));
          
          // Mark missing variants
          const variantsWithStatus = data.variants.map(v => {
            const combo = `${(v.color || '').toLowerCase().trim()}|${(v.size || '').toLowerCase().trim()}`;
            const colorExists = shopifyColors.has((v.color || '').toLowerCase().trim());
            const sizeExists = shopifySizes.has((v.size || '').toLowerCase().trim());
            const comboExists = shopifyCombos.has(combo);
            
            return {
              ...v,
              existsInShopify: comboExists,
              colorMissing: !colorExists && v.color,
              sizeMissing: !sizeExists && v.size,
            };
          });
          
          // Find missing colors and sizes
          const missingColors = [...new Set(variantsWithStatus.filter(v => v.colorMissing).map(v => v.color))];
          const missingSizes = [...new Set(variantsWithStatus.filter(v => v.sizeMissing).map(v => v.size))];
          const missingVariants = variantsWithStatus.filter(v => !v.existsInShopify);
          
          setVariantsData({
            ...data,
            variants: variantsWithStatus,
            missingColors,
            missingSizes,
            missingVariants,
            shopifyVariantsCount: shopifyVariants.length,
          });
          
          // Select all missing variants by default
          setSelectedVariants(new Set(missingVariants.map((_, i) => i)));
        }
      } catch (e) {
        console.error('Failed to fetch variants:', e);
        toast.error('Failed to load 1688 variants');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVariants();
  }, [product.linked_1688_product_id, product.shopify_product_id, shopifyVariants]);
  
  const toggleVariant = (index) => {
    const newSelected = new Set(selectedVariants);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedVariants(newSelected);
  };
  
  const toggleSelectAll = () => {
    if (selectedVariants.size === variantsData?.missingVariants?.length) {
      setSelectedVariants(new Set());
    } else {
      setSelectedVariants(new Set(variantsData?.missingVariants?.map((_, i) => i) || []));
    }
  };
  
  const handleCreateVariants = async () => {
    if (selectedVariants.size === 0) return;
    
    setCreating(true);
    try {
      const variantsToCreate = Array.from(selectedVariants).map(i => variantsData.missingVariants[i]);
      
      const res = await fetch(`${API}/api/shopify/products/${product.shopify_product_id}/create-variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: product.store_name,
          variants: variantsToCreate.map(v => ({
            option1: v.color || 'Default',
            option2: v.size || 'One Size',
            price: v.price || product.price || 0,
            sku: `${product.linked_1688_product_id}-${(v.color || '').slice(0,3)}-${v.size || ''}`.toUpperCase(),
            inventory_quantity: v.stock || 0,
          })),
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Created ${data.created_count || selectedVariants.size} variants in Shopify!`);
        onVariantsCreated?.();
        onClose();
      } else {
        toast.error(data.message || 'Failed to create variants');
      }
    } catch (e) {
      console.error('Failed to create variants:', e);
      toast.error('Failed to create variants');
    } finally {
      setCreating(false);
    }
  };
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500" />
            Variant Comparison: {product.title?.slice(0, 40)}...
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <span className="ml-3">Loading 1688 variants...</span>
          </div>
        ) : !product.linked_1688_product_id ? (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>This product is not linked to 1688</p>
            <p className="text-sm mt-1">Link it first to compare variants</p>
          </div>
        ) : variantsData ? (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-blue-50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{variantsData.shopifyVariantsCount}</p>
                  <p className="text-xs text-blue-600">Shopify Variants</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-orange-600">{variantsData.total_variants}</p>
                  <p className="text-xs text-orange-600">1688 Variants</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{variantsData.missingVariants?.length || 0}</p>
                  <p className="text-xs text-red-600">Missing in Shopify</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{variantsData.variants?.filter(v => v.existsInShopify).length || 0}</p>
                  <p className="text-xs text-green-600">Already Synced</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Existing Shopify Variants */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-500" />
                Current Shopify Variants ({shopifyVariants.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {shopifyVariants.map((v, i) => (
                  <Badge key={i} className="bg-blue-100 text-blue-700">
                    {v.option1 || 'Default'} / {v.option2 || 'One Size'}
                  </Badge>
                ))}
                {shopifyVariants.length === 0 && (
                  <span className="text-sm text-gray-500">No variants in Shopify</span>
                )}
              </div>
            </div>
            
            {/* 1688 Colors */}
            {variantsData.colors?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-purple-500" />
                  1688 Colors ({variantsData.colors.length})
                  {variantsData.missingColors?.length > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {variantsData.missingColors.length} missing
                    </Badge>
                  )}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {variantsData.colors.map((color, i) => {
                    const isMissing = variantsData.missingColors?.includes(color);
                    return (
                      <Badge 
                        key={i} 
                        className={isMissing ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700'}
                      >
                        {isMissing && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {color}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* 1688 Sizes */}
            {variantsData.sizes?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-green-500" />
                  1688 Sizes ({variantsData.sizes.length})
                  {variantsData.missingSizes?.length > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {variantsData.missingSizes.length} missing
                    </Badge>
                  )}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {variantsData.sizes.map((size, i) => {
                    const isMissing = variantsData.missingSizes?.includes(size);
                    return (
                      <Badge 
                        key={i} 
                        className={isMissing ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700'}
                      >
                        {isMissing && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {size}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Missing Variants to Create */}
            {variantsData.missingVariants?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    Missing Variants ({variantsData.missingVariants.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={selectedVariants.size === variantsData.missingVariants.length}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-xs text-gray-500">Select All</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-auto p-1">
                  {variantsData.missingVariants.map((v, i) => (
                    <div 
                      key={i}
                      onClick={() => toggleVariant(i)}
                      className={`p-2 rounded border cursor-pointer transition-colors ${
                        selectedVariants.has(i) 
                          ? 'bg-orange-100 border-orange-400' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox checked={selectedVariants.has(i)} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {v.color || 'Default'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Size: {v.size || 'One Size'}
                          </p>
                          <p className="text-xs text-orange-600 font-medium">
                            ¥{v.price?.toFixed(2)} • Stock: {v.stock || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {variantsData.missingVariants?.length === 0 && (
              <div className="text-center py-8 bg-green-50 rounded-lg">
                <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p className="text-green-700 font-medium">All variants are synced!</p>
                <p className="text-sm text-green-600">Shopify has all the variants from 1688</p>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {variantsData.missingVariants?.length > 0 && (
                <Button 
                  onClick={handleCreateVariants}
                  disabled={creating || selectedVariants.size === 0}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Create {selectedVariants.size} Variants in Shopify
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Failed to load variant data
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

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
