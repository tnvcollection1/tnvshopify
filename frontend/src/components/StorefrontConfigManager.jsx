import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit2, Eye, EyeOff, GripVertical, 
  Image, ArrowUp, ArrowDown, Save, X, Upload
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

const StorefrontConfigManager = () => {
  const [activeTab, setActiveTab] = useState('banners');
  const [store, setStore] = useState('tnvcollection');
  const [banners, setBanners] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [store]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bannersRes, collectionsRes] = await Promise.all([
        fetch(`${API}/api/storefront/banners?store=${store}&include_inactive=true`),
        fetch(`${API}/api/storefront/collections?store=${store}&include_inactive=true`)
      ]);
      
      const bannersData = await bannersRes.json();
      const collectionsData = await collectionsRes.json();
      
      setBanners(bannersData.banners || []);
      setCollections(collectionsData.collections || []);
    } catch (e) {
      console.error('Failed to fetch data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBanner = async (bannerData) => {
    try {
      const method = bannerData.id ? 'PUT' : 'POST';
      const url = bannerData.id 
        ? `${API}/api/storefront/banners/${bannerData.id}?store=${store}`
        : `${API}/api/storefront/banners?store=${store}`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bannerData)
      });
      
      if (response.ok) {
        fetchData();
        setShowModal(false);
        setEditingItem(null);
      }
    } catch (e) {
      console.error('Failed to save banner:', e);
    }
  };

  const handleSaveCollection = async (collectionData) => {
    try {
      const method = collectionData.id ? 'PUT' : 'POST';
      const url = collectionData.id 
        ? `${API}/api/storefront/collections/${collectionData.id}?store=${store}`
        : `${API}/api/storefront/collections?store=${store}`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectionData)
      });
      
      if (response.ok) {
        fetchData();
        setShowModal(false);
        setEditingItem(null);
      }
    } catch (e) {
      console.error('Failed to save collection:', e);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const url = type === 'banner' 
        ? `${API}/api/storefront/banners/${id}?store=${store}`
        : `${API}/api/storefront/collections/${id}?store=${store}`;
      
      const response = await fetch(url, { method: 'DELETE' });
      
      if (response.ok) {
        fetchData();
      }
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  const toggleActive = async (type, item) => {
    const updatedItem = { ...item, is_active: !item.is_active };
    if (type === 'banner') {
      await handleSaveBanner(updatedItem);
    } else {
      await handleSaveCollection(updatedItem);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" data-testid="storefront-config-manager">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Storefront Configuration</h1>
          <p className="text-gray-500 mt-1">Manage homepage banners and collections</p>
        </div>

        {/* Store Selector */}
        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Store:</label>
          <select
            value={store}
            onChange={(e) => setStore(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value="tnvcollection">TNC Collection (India)</option>
            <option value="tnvcollectionpk">TNC Collection (Pakistan)</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('banners')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'banners' 
                ? 'bg-white text-black shadow-sm' 
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Hero Banners ({banners.length})
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'collections' 
                ? 'bg-white text-black shadow-sm' 
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Collections ({collections.length})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-black rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Banners Tab */}
            {activeTab === 'banners' && (
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setEditingItem({ type: 'banner', data: null });
                    setShowModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Banner
                </button>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {banners.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No banners yet. Add your first banner to get started.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {banners.map((banner, index) => (
                        <BannerRow
                          key={banner.id}
                          banner={banner}
                          index={index}
                          onEdit={() => {
                            setEditingItem({ type: 'banner', data: banner });
                            setShowModal(true);
                          }}
                          onDelete={() => handleDelete('banner', banner.id)}
                          onToggleActive={() => toggleActive('banner', banner)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Collections Tab */}
            {activeTab === 'collections' && (
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setEditingItem({ type: 'collection', data: null });
                    setShowModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Collection
                </button>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {collections.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No collections yet. Add your first collection to get started.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {collections.map((collection, index) => (
                        <CollectionRow
                          key={collection.id}
                          collection={collection}
                          index={index}
                          onEdit={() => {
                            setEditingItem({ type: 'collection', data: collection });
                            setShowModal(true);
                          }}
                          onDelete={() => handleDelete('collection', collection.id)}
                          onToggleActive={() => toggleActive('collection', collection)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal */}
        {showModal && editingItem && (
          <ItemModal
            type={editingItem.type}
            data={editingItem.data}
            onSave={editingItem.type === 'banner' ? handleSaveBanner : handleSaveCollection}
            onClose={() => {
              setShowModal(false);
              setEditingItem(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

// Banner Row Component
const BannerRow = ({ banner, index, onEdit, onDelete, onToggleActive }) => (
  <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition">
    <div className="text-gray-400 cursor-move">
      <GripVertical className="w-5 h-5" />
    </div>
    
    <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
      <img 
        src={banner.image} 
        alt={banner.title}
        className="w-full h-full object-cover"
      />
    </div>
    
    <div className="flex-1 min-w-0">
      <h3 className="font-medium text-gray-900 truncate">{banner.title}</h3>
      <p className="text-sm text-gray-500 truncate">{banner.subtitle || 'No subtitle'}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className={`px-2 py-0.5 text-xs rounded-full ${
          banner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {banner.is_active ? 'Active' : 'Inactive'}
        </span>
        <span className="text-xs text-gray-400">Position: {banner.text_position}</span>
      </div>
    </div>
    
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleActive}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
        title={banner.is_active ? 'Deactivate' : 'Activate'}
      >
        {banner.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
      <button
        onClick={onEdit}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
        title="Edit"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button
        onClick={onDelete}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// Collection Row Component
const CollectionRow = ({ collection, index, onEdit, onDelete, onToggleActive }) => (
  <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition">
    <div className="text-gray-400 cursor-move">
      <GripVertical className="w-5 h-5" />
    </div>
    
    <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
      <img 
        src={collection.image} 
        alt={collection.title}
        className="w-full h-full object-cover"
      />
    </div>
    
    <div className="flex-1 min-w-0">
      <h3 className="font-medium text-gray-900 truncate">{collection.title}</h3>
      <p className="text-sm text-gray-500 truncate">{collection.subtitle || 'No subtitle'}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className={`px-2 py-0.5 text-xs rounded-full ${
          collection.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {collection.is_active ? 'Active' : 'Inactive'}
        </span>
        <span className={`px-2 py-0.5 text-xs rounded-full ${
          collection.size === 'large' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {collection.size === 'large' ? 'Large' : 'Small'}
        </span>
      </div>
    </div>
    
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleActive}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
        title={collection.is_active ? 'Deactivate' : 'Activate'}
      >
        {collection.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
      <button
        onClick={onEdit}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
        title="Edit"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button
        onClick={onDelete}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// Modal Component for Banner/Collection Editing
const ItemModal = ({ type, data, onSave, onClose }) => {
  const isEdit = !!data;
  const isBanner = type === 'banner';
  
  const [formData, setFormData] = useState(data || {
    title: '',
    subtitle: '',
    description: '',
    image: '',
    cta: 'SHOP NOW',
    link: '/products',
    text_color: 'white',
    text_position: 'left',
    size: 'small',
    is_active: true,
    order: 0
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit' : 'Add'} {isBanner ? 'Banner' : 'Collection'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="e.g., SPRING COLLECTION"
                required
              />
            </div>
            
            {/* Subtitle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="e.g., Just landed"
              />
            </div>
            
            {/* Description (Banner only) */}
            {isBanner && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  rows={2}
                  placeholder="Short description for the banner"
                />
              </div>
            )}
            
            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL *</label>
              <input
                type="url"
                value={formData.image}
                onChange={(e) => handleChange('image', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="https://..."
                required
              />
              {formData.image && (
                <div className="mt-2 aspect-video w-full max-w-xs rounded-lg overflow-hidden bg-gray-100">
                  <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            
            {/* Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link *</label>
              <input
                type="text"
                value={formData.link}
                onChange={(e) => handleChange('link', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="/products?collection=new"
                required
              />
            </div>
            
            {/* Banner specific fields */}
            {isBanner && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
                    <input
                      type="text"
                      value={formData.cta}
                      onChange={(e) => handleChange('cta', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="SHOP NOW"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Text Position</label>
                    <select
                      value={formData.text_position}
                      onChange={(e) => handleChange('text_position', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
              </>
            )}
            
            {/* Collection specific fields */}
            {!isBanner && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                <select
                  value={formData.size}
                  onChange={(e) => handleChange('size', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="large">Large (Featured)</option>
                  <option value="small">Small</option>
                </select>
              </div>
            )}
            
            {/* Order & Active */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => handleChange('order', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  min="0"
                />
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleChange('is_active', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save {isBanner ? 'Banner' : 'Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StorefrontConfigManager;
