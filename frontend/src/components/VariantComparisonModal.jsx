import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Check, 
  AlertCircle, 
  Loader2, 
  Palette, 
  Ruler, 
  Plus, 
  AlertTriangle,
  X,
  ShoppingBag,
  Store,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Variant Card Component - Used for both sides
const VariantCard = ({ variant, type, isSelected, onToggle, isMissing }) => {
  const isShopify = type === 'shopify';
  const is1688 = type === '1688';
  
  return (
    <div 
      onClick={() => isMissing && onToggle?.()}
      data-testid={`variant-card-${type}-${variant.color || variant.option1 || 'default'}-${variant.size || variant.option2 || 'one-size'}`}
      className={`
        group relative p-3 rounded-xl border-2 transition-all duration-200
        ${isMissing 
          ? isSelected
            ? 'border-orange-500 bg-orange-50 shadow-md cursor-pointer'
            : 'border-dashed border-orange-300 bg-gradient-to-br from-orange-50/50 to-white hover:border-orange-400 hover:shadow-sm cursor-pointer'
          : isShopify
            ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white'
            : 'border-blue-200 bg-gradient-to-br from-blue-50/50 to-white'
        }
      `}
    >
      {/* Selection Checkbox for Missing Variants */}
      {isMissing && (
        <div className="absolute top-2 right-2">
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={onToggle}
            className="h-5 w-5 border-orange-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
          />
        </div>
      )}
      
      {/* Variant Info */}
      <div className="flex items-start gap-3">
        {/* Color Swatch */}
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center shrink-0
          ${isMissing 
            ? 'bg-gradient-to-br from-orange-100 to-orange-200' 
            : isShopify 
              ? 'bg-gradient-to-br from-emerald-100 to-emerald-200'
              : 'bg-gradient-to-br from-blue-100 to-blue-200'
          }
        `}>
          <Palette className={`w-5 h-5 ${isMissing ? 'text-orange-600' : isShopify ? 'text-emerald-600' : 'text-blue-600'}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-zinc-900 truncate">
            {variant.color || variant.option1 || 'Default Color'}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Ruler className="w-3 h-3 text-zinc-400" />
            <span className="text-xs text-zinc-500">
              {variant.size || variant.option2 || 'One Size'}
            </span>
          </div>
          
          {/* Price & Stock for 1688 variants */}
          {(is1688 || isMissing) && variant.price !== undefined && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-bold text-orange-600">¥{variant.price?.toFixed(2) || '0.00'}</span>
              <span className="text-xs text-zinc-400">•</span>
              <span className="text-xs text-zinc-500">Stock: {variant.stock || 0}</span>
            </div>
          )}
          
          {/* Price for Shopify variants */}
          {isShopify && variant.price !== undefined && (
            <p className="text-sm font-medium text-emerald-600 mt-1">
              ₹{parseFloat(variant.price || 0).toFixed(2)}
            </p>
          )}
        </div>
      </div>
      
      {/* Status Badge */}
      {!isMissing && (
        <div className="absolute top-2 right-2">
          {isShopify ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Synced
            </Badge>
          ) : variant.existsInShopify ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
              <Check className="w-3 h-3 mr-1" />
              Exists
            </Badge>
          ) : null}
        </div>
      )}
    </div>
  );
};

// Summary Stat Card
const StatCard = ({ label, value, icon: Icon, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${colors[color]}`}>
      <div className={`p-2 rounded-lg ${color === 'blue' ? 'bg-blue-100' : color === 'orange' ? 'bg-orange-100' : color === 'emerald' ? 'bg-emerald-100' : 'bg-red-100'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs opacity-80">{label}</p>
      </div>
    </div>
  );
};

const VariantComparisonModal = ({ product, onClose, onVariantsCreated }) => {
  const [loading, setLoading] = useState(true);
  const [variantsData, setVariantsData] = useState(null);
  const [selectedVariants, setSelectedVariants] = useState(new Set());
  const [creating, setCreating] = useState(false);
  
  // Shopify variants from product - memoized to prevent dependency changes
  const shopifyVariants = React.useMemo(() => product.variants || [], [product.variants]);
  
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
          const matchedVariants = variantsWithStatus.filter(v => v.existsInShopify);
          
          setVariantsData({
            ...data,
            variants: variantsWithStatus,
            missingColors,
            missingSizes,
            missingVariants,
            matchedVariants,
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
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden" data-testid="variant-comparison-modal">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-zinc-50 to-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-zinc-900 truncate">
                  Variant Comparison
                </h2>
                <p className="text-sm text-zinc-500 truncate mt-0.5">
                  {product.title?.slice(0, 60)}{product.title?.length > 60 ? '...' : ''}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>
        
        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
            <p className="text-zinc-600 font-medium">Loading 1688 variants...</p>
            <p className="text-zinc-400 text-sm mt-1">Scraping product data from 1688</p>
          </div>
        ) : !product.linked_1688_product_id ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-zinc-100 rounded-full mb-4">
              <AlertCircle className="w-10 h-10 text-zinc-400" />
            </div>
            <p className="text-zinc-700 font-medium">Product Not Linked</p>
            <p className="text-zinc-500 text-sm mt-1">Link this product to 1688 first to compare variants</p>
          </div>
        ) : variantsData ? (
          <div className="flex flex-col h-[calc(90vh-180px)]">
            {/* Stats Row */}
            <div className="px-6 py-4 border-b bg-zinc-50/50">
              <div className="grid grid-cols-4 gap-3">
                <StatCard 
                  label="Shopify Variants" 
                  value={variantsData.shopifyVariantsCount} 
                  icon={Store}
                  color="emerald"
                />
                <StatCard 
                  label="1688 Variants" 
                  value={variantsData.total_variants || 0}
                  icon={ShoppingBag}
                  color="blue"
                />
                <StatCard 
                  label="Missing in Shopify" 
                  value={variantsData.missingVariants?.length || 0}
                  icon={AlertTriangle}
                  color="red"
                />
                <StatCard 
                  label="Already Synced" 
                  value={variantsData.matchedVariants?.length || 0}
                  icon={CheckCircle2}
                  color="emerald"
                />
              </div>
            </div>
            
            {/* Side-by-Side Comparison */}
            <div className="flex-1 overflow-hidden">
              <div className="grid grid-cols-2 h-full divide-x">
                {/* Left Side - Shopify Variants */}
                <div className="flex flex-col">
                  <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-emerald-800">Shopify Variants</span>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 ml-auto">
                        {shopifyVariants.length}
                      </Badge>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-2">
                      {shopifyVariants.length > 0 ? (
                        shopifyVariants.map((v, i) => (
                          <VariantCard 
                            key={i}
                            variant={{
                              color: v.option1,
                              size: v.option2,
                              price: v.price,
                            }}
                            type="shopify"
                          />
                        ))
                      ) : (
                        <div className="text-center py-8 text-zinc-400">
                          <Store className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No variants in Shopify</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
                
                {/* Right Side - 1688 Variants */}
                <div className="flex flex-col">
                  <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-orange-600" />
                      <span className="font-semibold text-orange-800">1688 Variants</span>
                      <Badge className="bg-orange-100 text-orange-700 border-0 ml-auto">
                        {variantsData.total_variants || 0}
                      </Badge>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-4">
                    {/* Missing Variants Section */}
                    {variantsData.missingVariants?.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-semibold text-red-600">
                              Missing in Shopify ({variantsData.missingVariants.length})
                            </span>
                          </div>
                          <button 
                            onClick={toggleSelectAll}
                            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                            data-testid="select-all-missing"
                          >
                            {selectedVariants.size === variantsData.missingVariants.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="space-y-2">
                          {variantsData.missingVariants.map((v, i) => (
                            <VariantCard 
                              key={`missing-${i}`}
                              variant={v}
                              type="1688"
                              isMissing={true}
                              isSelected={selectedVariants.has(i)}
                              onToggle={() => toggleVariant(i)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Matched Variants Section */}
                    {variantsData.matchedVariants?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-semibold text-emerald-600">
                            Already Synced ({variantsData.matchedVariants.length})
                          </span>
                        </div>
                        <div className="space-y-2 opacity-70">
                          {variantsData.matchedVariants.map((v, i) => (
                            <VariantCard 
                              key={`matched-${i}`}
                              variant={v}
                              type="1688"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* All Synced Message */}
                    {variantsData.missingVariants?.length === 0 && (
                      <div className="text-center py-8">
                        <div className="p-4 bg-emerald-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                          <Check className="w-8 h-8 text-emerald-600" />
                        </div>
                        <p className="text-emerald-700 font-semibold">All Variants Synced!</p>
                        <p className="text-emerald-600 text-sm mt-1">Shopify has all variants from 1688</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>
            
            {/* Footer Actions */}
            <div className="px-6 py-4 border-t bg-zinc-50 flex items-center justify-between">
              <div className="text-sm text-zinc-500">
                {selectedVariants.size > 0 ? (
                  <span className="text-orange-600 font-medium">
                    {selectedVariants.size} variant{selectedVariants.size > 1 ? 's' : ''} selected for creation
                  </span>
                ) : variantsData.missingVariants?.length > 0 ? (
                  'Select variants to create in Shopify'
                ) : (
                  'All variants are synchronized'
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} data-testid="close-modal-btn">
                  Close
                </Button>
                {variantsData.missingVariants?.length > 0 && (
                  <Button 
                    onClick={handleCreateVariants}
                    disabled={creating || selectedVariants.size === 0}
                    className="bg-orange-500 hover:bg-orange-600"
                    data-testid="create-variants-btn"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create {selectedVariants.size} Variant{selectedVariants.size > 1 ? 's' : ''} in Shopify
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <XCircle className="w-10 h-10 text-red-400 mb-4" />
            <p className="text-zinc-700 font-medium">Failed to Load Data</p>
            <p className="text-zinc-500 text-sm mt-1">Could not fetch variant information from 1688</p>
            <Button variant="outline" className="mt-4" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VariantComparisonModal;
