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
        setStats({
          total: data.orders?.length || 0,
          with1688: data.orders?.filter(o => o.product_id_1688).length || 0,
          without1688: data.orders?.filter(o => !o.product_id_1688).length || 0,
        });
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
      .filter(o => o.product_id_1688 && !purchasedOrders.has(o.order_id))
      .map(o => o.product_id_1688);
    
    if (productIds.length === 0) {
      toast.info('No products to open');
      return;
    }

    // Open with delay to prevent popup blocking
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

  // Export remaining orders
  const exportRemaining = () => {
    const remaining = orders.filter(o => !purchasedOrders.has(o.order_id));
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
                              <p className="text-xs text-gray-500">SKU: {order.sku}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">{order.size || '-'}</td>
                        <td className="p-3">{order.color || '-'}</td>
                        <td className="p-3">
                          {has1688Id ? (
                            <code className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                              {order.product_id_1688}
                            </code>
                          ) : (
                            <Badge variant="outline" className="text-red-500 border-red-300">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Missing
                            </Badge>
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
                              N/A
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {has1688Id && !isPurchased && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    open1688Product(order.product_id_1688);
                                  }}
                                  className="bg-orange-500 hover:bg-orange-600 text-white"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Open 1688
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markAsPurchased(order.order_id + '-' + index)}
                                  className="border-green-500 text-green-600 hover:bg-green-50"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Done
                                </Button>
                              </>
                            )}
                            {isPurchased && (
                              <span className="text-green-600 text-sm flex items-center gap-1">
                                <Check className="h-4 w-4" />
                                Completed
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
    </div>
  );
};

export default Purchase1688Orders;
