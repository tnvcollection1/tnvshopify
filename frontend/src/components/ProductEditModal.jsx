import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  X,
  Save,
  Trash2,
  Plus,
  Image as ImageIcon,
  GripVertical,
  DollarSign,
  Package,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const ProductEditModal = ({ product, onClose, onSave }) => {
  const [editedProduct, setEditedProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // basic, images, variants

  useEffect(() => {
    if (product) {
      setEditedProduct({
        ...product,
        title_en: product.title_en || product.title || '',
        title_cn: product.title_cn || product.title || '',
        description: product.description || '',
        price: product.price || 0,
        compare_price: product.compare_price || 0,
        cost: product.cost || product.price || 0,
        images: product.images || [],
        variants: product.variants || [],
        tags: product.tags || [],
        category: product.category || '',
      });
    }
  }, [product]);

  if (!editedProduct) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/1688-scraper/products/${editedProduct.product_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedProduct),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Product saved successfully!');
        onSave && onSave(editedProduct);
        onClose();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setEditedProduct(prev => ({ ...prev, [field]: value }));
  };

  const removeImage = (index) => {
    setEditedProduct(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      setEditedProduct(prev => ({
        ...prev,
        images: [...prev.images, url]
      }));
    }
  };

  const updateVariant = (index, field, value) => {
    setEditedProduct(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) => 
        i === index ? { ...v, [field]: value } : v
      )
    }));
  };

  const removeVariant = (index) => {
    setEditedProduct(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  const addVariant = () => {
    setEditedProduct(prev => ({
      ...prev,
      variants: [...prev.variants, {
        spec_id: `new_${Date.now()}`,
        color: '',
        size: '',
        price: prev.price || 0,
        stock: 100,
        props_names: '',
      }]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-bold">Edit Product</h2>
            <p className="text-sm text-gray-500">ID: {editedProduct.product_id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving} className="bg-green-500 hover:bg-green-600 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-6 py-3 font-medium ${activeTab === 'basic' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500'}`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`px-6 py-3 font-medium ${activeTab === 'images' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500'}`}
          >
            Images ({editedProduct.images.length})
          </button>
          <button
            onClick={() => setActiveTab('variants')}
            className={`px-6 py-3 font-medium ${activeTab === 'variants' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500'}`}
          >
            Variants ({editedProduct.variants.length})
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-6 py-3 font-medium ${activeTab === 'pricing' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500'}`}
          >
            Pricing
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Title (English) *</label>
                  <Input
                    value={editedProduct.title_en}
                    onChange={(e) => updateField('title_en', e.target.value)}
                    placeholder="Product title in English"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Title (Chinese)</label>
                  <Input
                    value={editedProduct.title_cn}
                    onChange={(e) => updateField('title_cn', e.target.value)}
                    placeholder="产品标题"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={editedProduct.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Product description..."
                  className="w-full h-32 p-3 border rounded-lg resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <Input
                    value={editedProduct.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    placeholder="e.g., Shoes, Clothing"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tags (comma separated)</label>
                  <Input
                    value={Array.isArray(editedProduct.tags) ? editedProduct.tags.join(', ') : editedProduct.tags}
                    onChange={(e) => updateField('tags', e.target.value.split(',').map(t => t.trim()))}
                    placeholder="men, shoes, casual"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Vendor/Supplier</label>
                  <Input
                    value={editedProduct.seller_name || ''}
                    onChange={(e) => updateField('seller_name', e.target.value)}
                    placeholder="Supplier name"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Images Tab */}
          {activeTab === 'images' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">Drag to reorder. First image is the main product image.</p>
                <Button onClick={addImage} variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Image
                </Button>
              </div>

              <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                {editedProduct.images.map((img, index) => (
                  <div key={index} className="relative group aspect-square border rounded-lg overflow-hidden">
                    <img
                      src={img}
                      alt={`Product ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Error'; }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => removeImage(index)}
                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {index === 0 && (
                      <div className="absolute top-1 left-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded">
                        Main
                      </div>
                    )}
                    <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>

              {editedProduct.images.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No images. Click "Add Image" to add product images.</p>
                </div>
              )}
            </div>
          )}

          {/* Variants Tab */}
          {activeTab === 'variants' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">Manage product variants (size, color combinations)</p>
                <Button onClick={addVariant} variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Variant
                </Button>
              </div>

              {editedProduct.variants.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Color</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Size</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Spec ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Price (¥)</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Stock</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {editedProduct.variants.map((variant, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <Input
                              value={variant.color || ''}
                              onChange={(e) => updateVariant(index, 'color', e.target.value)}
                              placeholder="Color"
                              className="w-24"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              value={variant.size || ''}
                              onChange={(e) => updateVariant(index, 'size', e.target.value)}
                              placeholder="Size"
                              className="w-20"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {variant.spec_id?.substring(0, 12)}...
                            </code>
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              value={variant.price || 0}
                              onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value))}
                              className="w-24"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              value={variant.stock || 0}
                              onChange={(e) => updateVariant(index, 'stock', parseInt(e.target.value))}
                              className="w-20"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeVariant(index)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No variants. This product has a single option.</p>
                  <Button onClick={addVariant} className="mt-4" variant="outline">
                    Add Variant
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-6 max-w-xl">
              <div>
                <label className="block text-sm font-medium mb-2">Cost Price (¥)</label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-gray-100 border border-r-0 rounded-l-lg">¥</span>
                  <Input
                    type="number"
                    value={editedProduct.cost || editedProduct.price || 0}
                    onChange={(e) => updateField('cost', parseFloat(e.target.value))}
                    className="rounded-l-none"
                    placeholder="Cost from supplier"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Your cost from 1688 supplier</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Selling Price ($)</label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-gray-100 border border-r-0 rounded-l-lg">$</span>
                  <Input
                    type="number"
                    value={editedProduct.price || 0}
                    onChange={(e) => updateField('price', parseFloat(e.target.value))}
                    className="rounded-l-none"
                    placeholder="Selling price on Shopify"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Compare at Price ($)</label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-gray-100 border border-r-0 rounded-l-lg">$</span>
                  <Input
                    type="number"
                    value={editedProduct.compare_price || 0}
                    onChange={(e) => updateField('compare_price', parseFloat(e.target.value))}
                    className="rounded-l-none"
                    placeholder="Original price (for showing discount)"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Shows as crossed-out price on Shopify</p>
              </div>

              {editedProduct.cost > 0 && editedProduct.price > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Profit Margin:</strong>{' '}
                    {((editedProduct.price - editedProduct.cost * 0.14) / editedProduct.price * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    (Assuming ¥1 = $0.14 exchange rate)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductEditModal;
