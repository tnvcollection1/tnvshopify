import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  X,
  ShoppingCart,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
  Link2,
  Package,
  Truck,
  Plus,
  Edit,
  Zap,
  RefreshCw,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const OrderFulfillmentModal = ({ order, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lineItems, setLineItems] = useState([]);
  const [fulfillmentData, setFulfillmentData] = useState({
    order_1688_id: '',
    fulfillment_1688_id: '',
    dwz_fulfillment_id: '',
  });
  
  // Modal states for each line item
  const [activeItemIndex, setActiveItemIndex] = useState(null);
  const [linkInput, setLinkInput] = useState('');
  const [orderingItemIndex, setOrderingItemIndex] = useState(null);
  const [loadingSkus, setLoadingSkus] = useState(false);
  const [productSkus, setProductSkus] = useState([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSpecId, setSelectedSpecId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [productLinks, setProductLinks] = useState({}); // Store 1688 links for each SKU

  useEffect(() => {
    if (order) {
      // Initialize line items with 1688 IDs from SKU
      const items = (order.line_items || []).map(item => ({
        ...item,
        product_id_1688: extract1688ProductId(item.sku) || '',
        order_1688_id: '',
        fulfillment_1688_id: '',
        status: 'pending',
      }));
      setLineItems(items);
      
      // Load existing fulfillment data if available
      loadFulfillmentData();
      
      // Auto-fetch 1688 links for all line items
      fetchProductLinks(items);
    }
  }, [order]);

  // Fetch 1688 links for all line items
  const fetchProductLinks = async (items) => {
    const links = {};
    for (const item of items) {
      if (item.sku) {
        try {
          const res = await fetch(`${API}/api/1688-scraper/products/get-1688-link?shopify_sku=${encodeURIComponent(item.sku)}`);
          const data = await res.json();
          if (data.success) {
            links[item.sku] = data.link || data.suggested_link || null;
          }
        } catch (err) {
          console.error('Failed to fetch link for', item.sku, err);
        }
      }
    }
    setProductLinks(links);
  };

  // Extract 1688 product ID from SKU
  const extract1688ProductId = (sku) => {
    if (!sku) return null;
    const match = sku.match(/(\d{12,})/);
    return match ? match[1] : null;
  };

  // Load existing fulfillment data for this order
  const loadFulfillmentData = async () => {
    try {
      const res = await fetch(`${API}/api/fulfillment/order/${order.order_number || order.order_id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.fulfillment) {
          setFulfillmentData({
            order_1688_id: data.fulfillment.order_1688_id || '',
            fulfillment_1688_id: data.fulfillment.fulfillment_1688_id || '',
            dwz_fulfillment_id: data.fulfillment.dwz_fulfillment_id || '',
          });
          // Update line items with saved 1688 links
          if (data.fulfillment.line_items) {
            setLineItems(prev => prev.map((item, idx) => ({
              ...item,
              product_id_1688: data.fulfillment.line_items[idx]?.product_id_1688 || item.product_id_1688,
              order_1688_id: data.fulfillment.line_items[idx]?.order_1688_id || '',
              status: data.fulfillment.line_items[idx]?.status || 'pending',
            })));
          }
        }
      }
    } catch (error) {
      console.error('Failed to load fulfillment data:', error);
    }
  };

  // Save 1688 link for a line item
  const save1688Link = (index) => {
    if (!linkInput.trim()) {
      setActiveItemIndex(null);
      return;
    }

    let productId = linkInput.trim();
    const urlMatch = linkInput.match(/offer\/(\d+)/);
    if (urlMatch) {
      productId = urlMatch[1];
    }
    
    if (!/^\d+$/.test(productId)) {
      toast.error('Invalid 1688 product ID');
      return;
    }

    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        product_id_1688: productId,
      };
      return updated;
    });
    
    setActiveItemIndex(null);
    setLinkInput('');
    toast.success('1688 link saved!');
  };

  // Fetch SKUs for a product
  const fetchProductSkus = async (productId) => {
    setLoadingSkus(true);
    setProductSkus([]);
    
    try {
      const res = await fetch(`${API}/api/1688/product-skus/${productId}`);
      const data = await res.json();
      
      if (data.success && data.skus && data.skus.length > 0) {
        setProductSkus(data.skus);
      }
    } catch (error) {
      console.error('Failed to fetch SKUs:', error);
    } finally {
      setLoadingSkus(false);
    }
  };

  // Open ordering panel for a line item
  const openOrderingPanel = async (index) => {
    const item = lineItems[index];
    setOrderingItemIndex(index);
    setSelectedSize(item.variant_title?.split('/')[0]?.trim() || '');
    setSelectedColor(item.variant_title?.split('/')[1]?.trim() || '');
    setSelectedSpecId('');
    setQuantity(item.quantity || 1);
    
    if (item.product_id_1688) {
      await fetchProductSkus(item.product_id_1688);
    }
  };

  // Place order on 1688 for a line item
  const placeOrder1688 = async (index) => {
    const item = lineItems[index];
    if (!item.product_id_1688) {
      toast.error('No 1688 product ID');
      return;
    }

    setLoading(true);
    
    try {
      const res = await fetch(`${API}/api/1688/create-purchase-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: item.product_id_1688,
          quantity: quantity,
          size: selectedSize,
          color: selectedColor,
          spec_id: selectedSpecId,
          shopify_order_id: order.order_number || order.order_id,
          notes: `${item.name || 'Product'} - ${item.variant_title || ''}`,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Order placed on 1688! Order ID: ${data.alibaba_order_id}`);
        
        // Update line item with order ID
        setLineItems(prev => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            order_1688_id: data.alibaba_order_id,
            status: 'ordered',
          };
          return updated;
        });
        
        // Update fulfillment data
        setFulfillmentData(prev => ({
          ...prev,
          order_1688_id: data.alibaba_order_id,
        }));
        
        setOrderingItemIndex(null);
      } else {
        toast.error(data.message || data.error || 'Failed to place order');
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  // Save all fulfillment data
  const saveFulfillmentData = async () => {
    setSaving(true);
    
    try {
      const res = await fetch(`${API}/api/fulfillment/order/${order.order_number || order.order_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopify_order_id: order.order_number || order.order_id,
          store_name: order.store_name,
          order_1688_id: fulfillmentData.order_1688_id,
          fulfillment_1688_id: fulfillmentData.fulfillment_1688_id,
          dwz_fulfillment_id: fulfillmentData.dwz_fulfillment_id,
          line_items: lineItems.map(item => ({
            sku: item.sku,
            name: item.name,
            product_id_1688: item.product_id_1688,
            order_1688_id: item.order_1688_id,
            status: item.status,
          })),
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Fulfillment data saved!');
        if (onUpdate) onUpdate();
      } else {
        toast.error(data.message || 'Failed to save');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save fulfillment data');
    } finally {
      setSaving(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Open 1688 product
  const open1688Product = (productId) => {
    window.open(`https://detail.1688.com/offer/${productId}.html`, '_blank');
  };

  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-bold">Order Fulfillment</h2>
              <p className="text-sm text-orange-100">#{order.order_number} - {order.first_name} {order.last_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Order Info */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-blue-600 mb-1">Store</p>
                <p className="font-semibold text-blue-800">{order.store_name}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-green-600 mb-1">Total</p>
                <p className="font-semibold text-green-800">{order.currency || 'PKR'} {order.total_price}</p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-purple-600 mb-1">Items</p>
                <p className="font-semibold text-purple-800">{lineItems.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Fulfillment Tracking IDs */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-500" />
                Fulfillment Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">1688 Order ID</label>
                  <div className="flex gap-1">
                    <Input
                      value={fulfillmentData.order_1688_id}
                      onChange={(e) => setFulfillmentData(prev => ({ ...prev, order_1688_id: e.target.value }))}
                      placeholder="e.g., 123456789"
                      className="text-sm font-mono"
                    />
                    {fulfillmentData.order_1688_id && (
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(fulfillmentData.order_1688_id)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">1688 Fulfillment ID</label>
                  <div className="flex gap-1">
                    <Input
                      value={fulfillmentData.fulfillment_1688_id}
                      onChange={(e) => setFulfillmentData(prev => ({ ...prev, fulfillment_1688_id: e.target.value }))}
                      placeholder="Tracking from 1688"
                      className="text-sm font-mono"
                    />
                    {fulfillmentData.fulfillment_1688_id && (
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(fulfillmentData.fulfillment_1688_id)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">DWZ Fulfillment ID</label>
                  <div className="flex gap-1">
                    <Input
                      value={fulfillmentData.dwz_fulfillment_id}
                      onChange={(e) => setFulfillmentData(prev => ({ ...prev, dwz_fulfillment_id: e.target.value }))}
                      placeholder="DWZ tracking"
                      className="text-sm font-mono"
                    />
                    {fulfillmentData.dwz_fulfillment_id && (
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(fulfillmentData.dwz_fulfillment_id)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-gray-500" />
                Products ({lineItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-3 hover:border-orange-300 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name || item.title || 'Product'}</p>
                      {item.variant_title && (
                        <p className="text-xs text-gray-500">{item.variant_title}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>SKU: {item.sku || 'N/A'}</span>
                        <span>Qty: {item.quantity || 1}</span>
                        <span>${item.price || '0'}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {item.status === 'ordered' ? (
                        <Badge className="bg-green-500 text-white text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          Ordered
                        </Badge>
                      ) : item.product_id_1688 ? (
                        <Badge className="bg-orange-100 text-orange-700 text-xs">Ready</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500 text-xs">Need Link</Badge>
                      )}
                    </div>
                  </div>

                  {/* 1688 Link Section */}
                  <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2">
                    {activeItemIndex === index ? (
                      // Edit mode
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={linkInput}
                          onChange={(e) => setLinkInput(e.target.value)}
                          placeholder="Paste 1688 URL or Product ID"
                          className="flex-1 text-sm"
                          autoFocus
                        />
                        <Button size="sm" onClick={() => save1688Link(index)} className="bg-orange-500 hover:bg-orange-600">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setActiveItemIndex(null); setLinkInput(''); }}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : item.product_id_1688 ? (
                      // Has 1688 ID
                      <div className="flex-1 flex items-center gap-2">
                        <code className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">
                          {item.product_id_1688}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setActiveItemIndex(index); setLinkInput(item.product_id_1688); }}
                          className="h-7 px-2"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => open1688Product(item.product_id_1688)}
                          className="h-7 border-orange-300 text-orange-600"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                    ) : (
                      // No 1688 ID
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setActiveItemIndex(index); setLinkInput(''); }}
                        className="text-blue-600 border-blue-300"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add 1688 Link
                      </Button>
                    )}

                    {/* Order Button */}
                    {item.product_id_1688 && item.status !== 'ordered' && (
                      <Button
                        size="sm"
                        onClick={() => openOrderingPanel(index)}
                        className="bg-green-500 hover:bg-green-600 text-white h-7"
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Order
                      </Button>
                    )}

                    {/* Show 1688 Order ID if ordered */}
                    {item.order_1688_id && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>1688: {item.order_1688_id}</span>
                      </div>
                    )}
                  </div>

                  {/* Ordering Panel */}
                  {orderingItemIndex === index && (
                    <div className="mt-3 pt-3 border-t bg-gray-50 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Place Order on 1688</h4>
                        <Button size="sm" variant="ghost" onClick={() => setOrderingItemIndex(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {loadingSkus && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading variants from 1688...
                        </div>
                      )}

                      {/* SKU Dropdown when variants are available */}
                      {productSkus.length > 0 && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <label className="text-xs text-green-700 font-medium block mb-2">
                            ✓ Select Size/Color Variant
                          </label>
                          <select
                            value={selectedSpecId}
                            onChange={(e) => {
                              const sku = productSkus.find(s => s.specId === e.target.value);
                              if (sku) {
                                setSelectedSpecId(sku.specId);
                                // Extract color and size from props_names or color/size fields
                                if (sku.color) setSelectedColor(sku.color);
                                if (sku.size) setSelectedSize(sku.size);
                              }
                            }}
                            className="w-full p-2 border border-green-300 rounded text-sm bg-white"
                          >
                            <option value="">-- Select variant --</option>
                            {productSkus.map((sku, idx) => {
                              // Try props_names first (from TMAPI), then attributes, then fallback
                              let displayText = '';
                              if (sku.props_names) {
                                // Parse "颜色:黑色;尺码:46" into "黑色 / 46"
                                const parts = sku.props_names.split(';').map(p => {
                                  const [, value] = p.split(':');
                                  return value?.trim() || '';
                                }).filter(Boolean);
                                displayText = parts.join(' / ');
                              } else if (sku.color || sku.size) {
                                displayText = [sku.color, sku.size].filter(Boolean).join(' / ');
                              } else if (sku.attributes?.length > 0) {
                                displayText = sku.attributes.map(a => a.attributeValue || a.value).join(' / ');
                              }
                              displayText = displayText || `SKU ${idx + 1}`;
                              
                              return (
                                <option key={sku.specId || idx} value={sku.specId}>
                                  {displayText} - ¥{sku.price} ({sku.stock} in stock)
                                </option>
                              );
                            })}
                          </select>
                          {selectedSpecId && (
                            <p className="text-xs text-green-600 mt-1">
                              SpecID: <code className="bg-green-100 px-1 rounded">{selectedSpecId}</code>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Manual entry when no SKUs available */}
                      {!loadingSkus && productSkus.length === 0 && (
                        <>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Size</label>
                              <Input
                                value={selectedSize}
                                onChange={(e) => setSelectedSize(e.target.value)}
                                placeholder="e.g., XL, 42"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Color</label>
                              <Input
                                value={selectedColor}
                                onChange={(e) => setSelectedColor(e.target.value)}
                                placeholder="e.g., Black"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Qty</label>
                              <Input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                className="text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs text-gray-500 block mb-1">
                              Spec ID <span className="text-red-500">*</span>
                              <span className="text-gray-400 ml-1">(Required for variants)</span>
                            </label>
                            <Input
                              value={selectedSpecId}
                              onChange={(e) => setSelectedSpecId(e.target.value)}
                              placeholder="Find from 1688 product page"
                              className="text-sm font-mono"
                            />
                          </div>

                          {!selectedSpecId && (
                            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-700">
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                              Spec ID required for products with size/color. Find it on the 1688 product page.
                            </div>
                          )}
                        </>
                      )}

                      {/* Quantity (always shown) */}
                      {productSkus.length > 0 && (
                        <div className="w-24">
                          <label className="text-xs text-gray-500 block mb-1">Qty</label>
                          <Input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            className="text-sm"
                          />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => open1688Product(item.product_id_1688)}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Open on 1688
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => placeOrder1688(index)}
                          disabled={loading || !selectedSpecId}
                          className="bg-green-500 hover:bg-green-600 text-white flex-1"
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Zap className="w-4 h-4 mr-1" />
                          )}
                          Place Order via API
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleString()}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={saveFulfillmentData} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Fulfillment Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderFulfillmentModal;
