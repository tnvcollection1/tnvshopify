import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Package,
  Plus,
  Search,
  ExternalLink,
  Trash2,
  Edit,
  ShoppingCart,
  RefreshCw,
  Upload,
  X,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Link as LinkIcon,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const Products1688 = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [apiHealth, setApiHealth] = useState(null);
  const [orders1688, setOrders1688] = useState([]);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Form state for adding new product
  const [newProduct, setNewProduct] = useState({
    product_id: '',
    title: '',
    description: '',
    price: '',
    price_range: '',
    images: [],
    category: '',
    min_order: 1,
    supplier_name: '',
    supplier_url: '',
    variants: [],
  });
  const [productUrl, setProductUrl] = useState('');
  const [addError, setAddError] = useState('');

  useEffect(() => {
    fetchProducts();
    checkApiHealth();
  }, [page, searchQuery]);

  const checkApiHealth = async () => {
    try {
      const response = await fetch(`${API}/api/1688/health`);
      const data = await response.json();
      setApiHealth(data);
    } catch (error) {
      console.error('Failed to check API health:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '20',
      });
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      const response = await fetch(`${API}/api/1688/catalog?${params}`);
      const data = await response.json();
      if (data.success) {
        setProducts(data.products || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetch1688Orders = async () => {
    try {
      const response = await fetch(`${API}/api/1688/orders?page=1&page_size=10`);
      const data = await response.json();
      if (data.success) {
        setOrders1688(data.orders || []);
        setShowOrdersModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const extractProductId = (url) => {
    // Extract product ID from 1688 URL
    const patterns = [
      /detail\.1688\.com\/offer\/(\d+)/,
      /offer\/(\d+)\.html/,
      /offerId=(\d+)/,
      /\/(\d{10,})/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  const handleUrlPaste = (e) => {
    const url = e.target.value;
    setProductUrl(url);
    const productId = extractProductId(url);
    if (productId) {
      setNewProduct(prev => ({ ...prev, product_id: productId }));
      setAddError('');
    }
  };

  const addImageUrl = () => {
    const imageUrl = document.getElementById('image-url-input')?.value;
    if (imageUrl && imageUrl.startsWith('http')) {
      setNewProduct(prev => ({
        ...prev,
        images: [...prev.images, imageUrl]
      }));
      document.getElementById('image-url-input').value = '';
    }
  };

  const removeImage = (index) => {
    setNewProduct(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleAddProduct = async () => {
    if (!newProduct.product_id || !newProduct.title || !newProduct.price) {
      setAddError('Product ID, Title, and Price are required');
      return;
    }

    try {
      const response = await fetch(`${API}/api/1688/add-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProduct,
          price: parseFloat(newProduct.price),
          min_order: parseInt(newProduct.min_order) || 1,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        setNewProduct({
          product_id: '',
          title: '',
          description: '',
          price: '',
          price_range: '',
          images: [],
          category: '',
          min_order: 1,
          supplier_name: '',
          supplier_url: '',
          variants: [],
        });
        setProductUrl('');
        fetchProducts();
      } else {
        setAddError(data.message || 'Failed to add product');
      }
    } catch (error) {
      setAddError('Failed to add product: ' + error.message);
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const response = await fetch(`${API}/api/1688/catalog/${productId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-orange-500" />
            1688 Products
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your 1688 product catalog for auto-purchasing
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetch1688Orders}
            className="flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            View 1688 Orders
          </Button>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* API Status */}
      {apiHealth && (
        <Card className="bg-gray-50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant={apiHealth.has_access_token ? "default" : "destructive"}>
                  {apiHealth.has_access_token ? "Connected" : "Not Connected"}
                </Badge>
                <span className="text-sm text-gray-600">
                  App Key: {apiHealth.app_key}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={checkApiHealth}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={fetchProducts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : products.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No products yet</h3>
            <p className="text-gray-500 mt-1">
              Add products from 1688 to enable auto-purchasing
            </p>
            <Button 
              className="mt-4 bg-orange-500 hover:bg-orange-600"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <Card key={product.source_id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-gray-100 relative">
                {product.images && product.images.length > 0 ? (
                  <img 
                    src={product.images[0]} 
                    alt={product.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`absolute inset-0 ${product.images?.length > 0 ? 'hidden' : 'flex'} items-center justify-center`}>
                  <ImageIcon className="h-12 w-12 text-gray-300" />
                </div>
                <Badge className="absolute top-2 right-2 bg-orange-500">
                  1688
                </Badge>
              </div>
              <CardContent className="p-4">
                <h3 className="font-medium text-sm line-clamp-2 mb-2" title={product.title}>
                  {product.title}
                </h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-orange-500">
                    ¥{product.price || product.price_info?.price || '-'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Min: {product.min_order || 1}
                  </span>
                </div>
                {product.shop_info?.name && (
                  <p className="text-xs text-gray-500 truncate mb-2">
                    {product.shop_info.name}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => window.open(product.source_url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteProduct(product.source_id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <Button 
            variant="outline" 
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Product from 1688
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {addError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {addError}
                </div>
              )}

              {/* URL Input */}
              <div>
                <label className="text-sm font-medium block mb-1">
                  1688 Product URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Paste 1688 product URL here..."
                      value={productUrl}
                      onChange={handleUrlPaste}
                      className="pl-10"
                    />
                  </div>
                </div>
                {newProduct.product_id && (
                  <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Product ID extracted: {newProduct.product_id}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Product ID <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={newProduct.product_id}
                    onChange={(e) => setNewProduct(p => ({ ...p, product_id: e.target.value }))}
                    placeholder="e.g. 557856910956"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Price (CNY) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct(p => ({ ...p, price: e.target.value }))}
                    placeholder="e.g. 25.00"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newProduct.title}
                  onChange={(e) => setNewProduct(p => ({ ...p, title: e.target.value }))}
                  placeholder="Product title from 1688"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">
                  Description
                </label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm min-h-[80px]"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct(p => ({ ...p, description: e.target.value }))}
                  placeholder="Product description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Category
                  </label>
                  <Input
                    value={newProduct.category}
                    onChange={(e) => setNewProduct(p => ({ ...p, category: e.target.value }))}
                    placeholder="e.g. Phone Cases"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Min Order Qty
                  </label>
                  <Input
                    type="number"
                    value={newProduct.min_order}
                    onChange={(e) => setNewProduct(p => ({ ...p, min_order: e.target.value }))}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Supplier Name
                  </label>
                  <Input
                    value={newProduct.supplier_name}
                    onChange={(e) => setNewProduct(p => ({ ...p, supplier_name: e.target.value }))}
                    placeholder="Shop name on 1688"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Price Range
                  </label>
                  <Input
                    value={newProduct.price_range}
                    onChange={(e) => setNewProduct(p => ({ ...p, price_range: e.target.value }))}
                    placeholder="e.g. 10-50"
                  />
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="text-sm font-medium block mb-1">
                  Product Images
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="image-url-input"
                    placeholder="Paste image URL..."
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={addImageUrl}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {newProduct.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newProduct.images.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded overflow-hidden border">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddProduct}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Add Product
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 1688 Orders Modal */}
      {showOrdersModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Your 1688 Orders
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowOrdersModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {orders1688.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No orders found
                </div>
              ) : (
                <div className="space-y-3">
                  {orders1688.map((order, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">
                            Order #{order.baseInfo?.id || order.orderId || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {order.baseInfo?.createTime || 'N/A'}
                          </p>
                        </div>
                        <Badge>
                          {order.baseInfo?.status || order.orderStatus || 'N/A'}
                        </Badge>
                      </div>
                      {order.nativeLogistics && (
                        <p className="text-sm text-gray-600">
                          Ship to: {order.nativeLogistics.contactPerson} - {order.nativeLogistics.address}
                        </p>
                      )}
                      {order.tradeTerms && order.tradeTerms[0] && (
                        <p className="text-sm font-medium mt-2">
                          Amount: ¥{order.tradeTerms[0].phasAmount}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Products1688;
