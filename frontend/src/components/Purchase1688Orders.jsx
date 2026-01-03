import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Upload,
  ShoppingCart,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  Check,
  X,
  Package,
  RefreshCw,
  Trash2,
  Download,
  AlertCircle,
  Link2,
  Plus,
  Edit,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const Purchase1688Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [purchasedOrders, setPurchasedOrders] = useState(new Set());
  const [stats, setStats] = useState({ total: 0, with1688: 0, without1688: 0 });
  
  // Modal states
  const [linkModal, setLinkModal] = useState({ open: false, orderIndex: null });
  const [linkInput, setLinkInput] = useState('');
  const [orderModal, setOrderModal] = useState({ open: false, order: null, orderIndex: null });
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSpecId, setSelectedSpecId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [loadingSkus, setLoadingSkus] = useState(false);
  const [productSkus, setProductSkus] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);

  // Parse Excel file
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API}/api/1688/parse-purchase-excel`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (data.success) {
        setOrders(data.orders || []);
        updateStats(data.orders || []);
        toast.success(`Loaded ${data.orders?.length || 0} orders from Excel`);
      } else {
        toast.error(data.message || 'Failed to parse Excel file');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const updateStats = (ordersList) => {
    setStats({
      total: ordersList.length,
      with1688: ordersList.filter(o => o.product_id_1688).length,
      without1688: ordersList.filter(o => !o.product_id_1688).length,
    });
  };

  // Open 1688 product page
  const open1688Product = (productId) => {
    window.open(`https://detail.1688.com/offer/${productId}.html`, '_blank');
  };

  // Mark order as purchased
  const markAsPurchased = (orderId) => {
    setPurchasedOrders(prev => new Set([...prev, orderId]));
  };

  // Open all 1688 products
  const openAll1688Products = () => {
    const productIds = orders
      .filter(o => o.product_id_1688 && !purchasedOrders.has(o.order_id + '-' + orders.indexOf(o)))
      .map(o => o.product_id_1688);
    
    if (productIds.length === 0) {
      toast.info('No products to open');
      return;
    }

    productIds.forEach((id, idx) => {
      setTimeout(() => open1688Product(id), idx * 600);
    });
    
    toast.success(`Opening ${productIds.length} products on 1688...`);
  };

  // Clear all data
  const clearData = () => {
    setOrders([]);
    setFileName('');
    setPurchasedOrders(new Set());
    setStats({ total: 0, with1688: 0, without1688: 0 });
  };

  // Add/Edit 1688 link
  const openLinkModal = (orderIndex) => {
    setLinkModal({ open: true, orderIndex });
    setLinkInput(orders[orderIndex]?.product_id_1688 || '');
  };

  const saveLinkModal = () => {
    if (!linkInput.trim()) {
      setLinkModal({ open: false, orderIndex: null });
      return;
    }

    // Extract product ID from URL or use as-is
    let productId = linkInput.trim();
    const urlMatch = linkInput.match(/offer\/(\d+)/);
    if (urlMatch) {
      productId = urlMatch[1];
    }
    
    // Validate it's a valid 1688 ID (should be numeric)
    if (!/^\d+$/.test(productId)) {
      toast.error('Invalid 1688 product ID');
      return;
    }

    // Update the order
    const updatedOrders = [...orders];
    updatedOrders[linkModal.orderIndex] = {
      ...updatedOrders[linkModal.orderIndex],
      product_id_1688: productId,
      url_1688: `https://detail.1688.com/offer/${productId}.html`,
    };
    setOrders(updatedOrders);
    updateStats(updatedOrders);
    
    setLinkModal({ open: false, orderIndex: null });
    setLinkInput('');
    toast.success('1688 link added!');
  };

  // Open order modal for API ordering
  const openOrderModal = async (order, orderIndex) => {
    setOrderModal({ open: true, order, orderIndex });
    setSelectedSize(order.size || '');
    setSelectedColor(order.color || '');
    setSelectedSpecId('');
    setQuantity(1);
    setProductSkus([]);
    setAvailableSizes([]);
    setAvailableColors([]);
    
    // Fetch SKUs from 1688
    if (order.product_id_1688) {
      setLoadingSkus(true);
      try {
        const res = await fetch(`${API}/api/1688/product-skus/${order.product_id_1688}`);
        const data = await res.json();
        
        if (data.success && data.skus && data.skus.length > 0) {
          setProductSkus(data.skus);
          
          // Extract unique sizes and colors from SKUs
          const sizes = new Set();
          const colors = new Set();
          
          data.skus.forEach(sku => {
            if (sku.attributes) {
              sku.attributes.forEach(attr => {
                const name = attr.attributeName || attr.name || '';
                const value = attr.attributeValue || attr.value || '';
                if (name.toLowerCase().includes('size') || name.includes('尺') || name.includes('码')) {
                  sizes.add(value);
                }
                if (name.toLowerCase().includes('color') || name.toLowerCase().includes('colour') || name.includes('颜色')) {
                  colors.add(value);
                }
              });
            }
          });
          
          setAvailableSizes(Array.from(sizes));
          setAvailableColors(Array.from(colors));
        }
        
        // Also check attributes
        if (data.attributes) {
          Object.entries(data.attributes).forEach(([key, values]) => {
            if (key.toLowerCase().includes('size') || key.includes('尺')) {
              setAvailableSizes(prev => [...new Set([...prev, ...(Array.isArray(values) ? values : [values])])]);
            }
            if (key.toLowerCase().includes('color') || key.includes('颜色')) {
              setAvailableColors(prev => [...new Set([...prev, ...(Array.isArray(values) ? values : [values])])]);
            }
          });
        }
      } catch (error) {
        console.error('Failed to fetch SKUs:', error);
      } finally {
        setLoadingSkus(false);
      }
    }
  };

  // Find specId based on selected size/color
  const findSpecId = () => {
    if (!productSkus.length) return null;
    
    for (const sku of productSkus) {
      if (!sku.attributes) continue;
      
      let sizeMatch = !selectedSize;
      let colorMatch = !selectedColor;
      
      for (const attr of sku.attributes) {
        const name = attr.attributeName || attr.name || '';
        const value = attr.attributeValue || attr.value || '';
        
        if ((name.toLowerCase().includes('size') || name.includes('尺')) && value === selectedSize) {
          sizeMatch = true;
        }
        if ((name.toLowerCase().includes('color') || name.includes('颜色')) && value === selectedColor) {
          colorMatch = true;
        }
      }
      
      if (sizeMatch && colorMatch && sku.specId) {
        return sku.specId;
      }
    }
    return null;
  };

  // Place order via 1688 API
  const placeOrder1688 = async () => {
    if (!orderModal.order?.product_id_1688) {
      toast.error('No 1688 product ID');
      return;
    }

    setOrdering(true);
    
    try {
      const res = await fetch(`${API}/api/1688/create-purchase-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: orderModal.order.product_id_1688,
          quantity: quantity,
          size: selectedSize,
          color: selectedColor,
          shopify_order_id: orderModal.order.order_id,
          notes: `Order #${orderModal.order.order_id} - ${orderModal.order.product_name || 'Product'}`,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Order placed on 1688! Order ID: ${data.alibaba_order_id || 'Created'}`);
        markAsPurchased(orderModal.order.order_id + '-' + orderModal.orderIndex);
        setOrderModal({ open: false, order: null, orderIndex: null });
      } else {
        toast.error(data.message || data.error || 'Failed to place order');
        // If API fails, offer to open manually
        if (window.confirm('API order failed. Open product on 1688.com to order manually?')) {
          open1688Product(orderModal.order.product_id_1688);
        }
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to place order. Try opening on 1688.com');
      if (window.confirm('Open product on 1688.com to order manually?')) {
        open1688Product(orderModal.order.product_id_1688);
      }
    } finally {
      setOrdering(false);
    }
  };

  // Export remaining orders
  const exportRemaining = () => {
    const remaining = orders.filter((o, idx) => !purchasedOrders.has(o.order_id + '-' + idx));
    const csv = [
      ['Order ID', 'Product', 'Size', 'Color', '1688 Product ID', '1688 URL'].join(','),
      ...remaining.map(o => [
        o.order_id,
        `"${o.product_name || ''}"`,
        o.size || '',
        o.color || '',
        o.product_id_1688 || '',
        o.product_id_1688 ? `https://detail.1688.com/offer/${o.product_id_1688}.html` : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remaining_orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6" data-testid="purchase-1688-orders">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-orange-500" />
            1688 Purchase Orders
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Upload your Excel file and purchase from 1688 with one click
          </p>
        </div>
        
        {orders.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportRemaining}
              className="border-gray-300"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Remaining
            </Button>
            <Button
              variant="outline"
              onClick={clearData}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <Card className="border-2 border-dashed border-orange-200 bg-orange-50/50">
        <CardContent className="p-8">
          <div className="text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-orange-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Upload Purchase Excel</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload your Excel file with Order ID, SKU (containing 1688 Product ID), Size, Color
            </p>
            
            <div className="flex items-center justify-center gap-4">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  <span>{uploading ? 'Processing...' : 'Choose File'}</span>
                </div>
              </label>
              
              {fileName && (
                <Badge variant="outline" className="text-orange-700 border-orange-300">
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                  {fileName}
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mt-4">
              Supported formats: .xlsx, .xls, .csv
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {orders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Orders</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{stats.with1688}</p>
              <p className="text-sm text-green-700">With 1688 ID</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{stats.without1688}</p>
              <p className="text-sm text-red-700">Missing 1688 ID</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{purchasedOrders.size}</p>
              <p className="text-sm text-blue-700">Purchased</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      {orders.length > 0 && stats.with1688 > 0 && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-semibold text-orange-800">Quick Actions</h3>
                <p className="text-sm text-orange-600">
                  {stats.with1688 - purchasedOrders.size} orders ready to purchase
                </p>
              </div>
              <Button
                onClick={openAll1688Products}
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={purchasedOrders.size >= stats.with1688}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open All on 1688 ({stats.with1688 - purchasedOrders.size})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Orders to Purchase ({orders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-semibold text-gray-700">Order #</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Product</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Size</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Color</th>
                    <th className="text-left p-3 font-semibold text-gray-700">1688 ID</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Status</th>
                    <th className="text-right p-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => {
                    const isPurchased = purchasedOrders.has(order.order_id + '-' + index);
                    const has1688Id = !!order.product_id_1688;
                    
                    return (
                      <tr 
                        key={`${order.order_id}-${index}`}
                        className={`border-b hover:bg-gray-50 transition-colors ${isPurchased ? 'bg-green-50' : ''}`}
                      >
                        <td className="p-3 font-medium">{order.order_id}</td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-sm">{order.product_name || 'N/A'}</p>
                            {order.sku && (
                              <p className="text-xs text-gray-500 truncate max-w-[200px]" title={order.sku}>
                                SKU: {order.sku.split('\n')[0]}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">{order.size || '-'}</td>
                        <td className="p-3">{order.color || '-'}</td>
                        <td className="p-3">
                          {has1688Id ? (
                            <div className="flex items-center gap-1">
                              <code className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                {order.product_id_1688}
                              </code>
                              <button
                                onClick={() => openLinkModal(index)}
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Edit link"
                              >
                                <Edit className="h-3 w-3 text-gray-400" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openLinkModal(index)}
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Link
                            </Button>
                          )}
                        </td>
                        <td className="p-3">
                          {isPurchased ? (
                            <Badge className="bg-green-500 text-white">
                              <Check className="h-3 w-3 mr-1" />
                              Purchased
                            </Badge>
                          ) : has1688Id ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              Ready
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              Need Link
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {has1688Id && !isPurchased && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => openOrderModal(order, index)}
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                  title="Order via API"
                                >
                                  <Zap className="h-3 w-3 mr-1" />
                                  Order
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => open1688Product(order.product_id_1688)}
                                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                                  title="Open on 1688.com"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => markAsPurchased(order.order_id + '-' + index)}
                                  className="text-gray-500 hover:text-green-600"
                                  title="Mark as done"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {isPurchased && (
                              <span className="text-green-600 text-sm flex items-center gap-1">
                                <Check className="h-4 w-4" />
                                Done
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {orders.length === 0 && !uploading && (
        <Card className="py-12">
          <CardContent className="text-center">
            <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Orders Loaded</h3>
            <p className="text-gray-500 mb-4">
              Upload your Excel file to see orders and purchase from 1688
            </p>
            <p className="text-sm text-gray-400">
              Make sure your Excel has columns: ORDER ID, SKU (with 12-digit 1688 ID), SIZE, COLOR
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Link Modal */}
      {linkModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setLinkModal({ open: false, orderIndex: null })}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Link2 className="w-5 h-5 text-orange-500" />
                {orders[linkModal.orderIndex]?.product_id_1688 ? 'Edit' : 'Add'} 1688 Link
              </h3>
              <button onClick={() => setLinkModal({ open: false, orderIndex: null })} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">Order #{orders[linkModal.orderIndex]?.order_id}</p>
              <p className="text-sm text-gray-600">{orders[linkModal.orderIndex]?.product_name}</p>
              <p className="text-xs text-gray-500">Size: {orders[linkModal.orderIndex]?.size} | Color: {orders[linkModal.orderIndex]?.color}</p>
            </div>
            
            <Input
              placeholder="Paste 1688 URL or Product ID (e.g., 739758517850)"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              className="mb-4"
            />
            <p className="text-xs text-gray-500 mb-4">
              Example: https://detail.1688.com/offer/739758517850.html or just 739758517850
            </p>
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setLinkModal({ open: false, orderIndex: null })}>
                Cancel
              </Button>
              <Button onClick={saveLinkModal} className="bg-orange-500 hover:bg-orange-600">
                <Link2 className="w-4 h-4 mr-2" />
                Save Link
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Order Modal - Place order via API */}
      {orderModal.open && orderModal.order && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setOrderModal({ open: false, order: null, orderIndex: null })}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-500" />
                Place Order on 1688
              </h3>
              <button onClick={() => setOrderModal({ open: false, order: null, orderIndex: null })} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Order Info */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">Order #{orderModal.order.order_id}</p>
                  <p className="text-sm text-gray-600">{orderModal.order.product_name}</p>
                </div>
                <a 
                  href={`https://detail.1688.com/offer/${orderModal.order.product_id_1688}.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 hover:underline text-sm flex items-center"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View on 1688
                </a>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                1688 ID: {orderModal.order.product_id_1688}
              </p>
            </div>
            
            {/* Size & Color Selection */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                <Input
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  placeholder="Enter size (e.g., 42, L, XL)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <Input
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  placeholder="Enter color (e.g., Black, White)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            
            {/* Shipping Info */}
            <div className="mb-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Ships to:</strong> Your default 1688 shipping address (DWZ56 warehouse)
              </p>
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  open1688Product(orderModal.order.product_id_1688);
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Manually
              </Button>
              <Button 
                onClick={placeOrder1688} 
                className="bg-green-500 hover:bg-green-600"
                disabled={ordering}
              >
                {ordering ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {ordering ? 'Placing Order...' : 'Place Order via API'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchase1688Orders;
