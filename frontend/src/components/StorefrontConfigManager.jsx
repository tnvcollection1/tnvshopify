import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Edit2, Eye, EyeOff, GripVertical, 
  Image, Save, X, Upload, Monitor, Smartphone, Square, 
  Maximize, LayoutTemplate, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Banner size configurations
const BANNER_SIZES = {
  hero: { width: 1920, height: 800, label: "Hero Banner", icon: Maximize, description: "Full width, high impact (1920×800)" },
  wide: { width: 1920, height: 600, label: "Wide Banner", icon: LayoutTemplate, description: "Promotional banner (1920×600)" },
  standard: { width: 1200, height: 600, label: "Standard", icon: Monitor, description: "Versatile size (1200×600)" },
  mobile: { width: 768, height: 400, label: "Mobile", icon: Smartphone, description: "Mobile optimized (768×400)" },
  square: { width: 800, height: 800, label: "Square", icon: Square, description: "Social style (800×800)" }
};

const StorefrontConfigManager = () => {
  const [activeTab, setActiveTab] = useState('banners');
  const [store, setStore] = useState('tnvcollection');
  const [banners, setBanners] = useState([]);
  const [collections, setCollections] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showImageLibrary, setShowImageLibrary] = useState(false);

  useEffect(() => {
    fetchData();
  }, [store]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bannersRes, collectionsRes, imagesRes] = await Promise.all([
        fetch(`${API}/api/storefront/banners?store=${store}&include_inactive=true`),
        fetch(`${API}/api/storefront/collections?store=${store}&include_inactive=true`),
        fetch(`${API}/api/storefront/uploaded-images?store=${store}`)
      ]);
      
      const bannersData = await bannersRes.json();
      const collectionsData = await collectionsRes.json();
      const imagesData = await imagesRes.json();
      
      setBanners(bannersData.banners || []);
      setCollections(collectionsData.collections || []);
      setUploadedImages(imagesData.images || []);
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
          <p className="text-gray-500 mt-1">Manage homepage banners and collections with image upload</p>
        </div>

        {/* Store Selector */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
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
          
          <button
            onClick={() => setShowImageLibrary(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition ml-auto"
          >
            <Image className="w-4 h-4" />
            Image Library ({uploadedImages.length})
          </button>
        </div>

        {/* Banner Size Guide */}
        <div className="mb-6 bg-white rounded-xl p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Recommended Banner Sizes</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(BANNER_SIZES).map(([key, size]) => (
              <div key={key} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                <size.icon className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{size.label}:</span>
                <span className="text-gray-500">{size.width}×{size.height}px</span>
              </div>
            ))}
          </div>
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
                  data-testid="add-banner-btn"
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
            store={store}
            uploadedImages={uploadedImages}
            onSave={editingItem.type === 'banner' ? handleSaveBanner : handleSaveCollection}
            onClose={() => {
              setShowModal(false);
              setEditingItem(null);
            }}
            onImageUploaded={fetchData}
          />
        )}

        {/* Image Library Modal */}
        {showImageLibrary && (
          <ImageLibraryModal
            store={store}
            images={uploadedImages}
            onClose={() => setShowImageLibrary(false)}
            onRefresh={fetchData}
          />
        )}
      </div>
    </div>
  );
};

// Banner Row Component
const BannerRow = ({ banner, index, onEdit, onDelete, onToggleActive }) => (
  <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition" data-testid={`banner-row-${index}`}>
    <div className="text-gray-400 cursor-move">
      <GripVertical className="w-5 h-5" />
    </div>
    
    <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
      <img 
        src={banner.image?.startsWith('/api') ? `${API}${banner.image}` : banner.image} 
        alt={banner.title}
        className="w-full h-full object-cover"
        onError={(e) => { e.target.src = 'https://via.placeholder.com/128x80?text=No+Image'; }}
      />
    </div>
    
    <div className="flex-1 min-w-0">
      <h3 className="font-medium text-gray-900 truncate">{banner.title}</h3>
      <p className="text-sm text-gray-500 truncate">{banner.subtitle || 'No subtitle'}</p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <span className={`px-2 py-0.5 text-xs rounded-full ${
          banner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {banner.is_active ? 'Active' : 'Inactive'}
        </span>
        <span className="text-xs text-gray-400">Position: {banner.text_position}</span>
        {banner.size_type && (
          <span className="text-xs text-gray-400">Size: {BANNER_SIZES[banner.size_type]?.label || banner.size_type}</span>
        )}
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
        src={collection.image?.startsWith('/api') ? `${API}${collection.image}` : collection.image} 
        alt={collection.title}
        className="w-full h-full object-cover"
        onError={(e) => { e.target.src = 'https://via.placeholder.com/96?text=No+Image'; }}
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

// Image Upload Component
const ImageUploader = ({ store, onImageUploaded, onSelectImage }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('store', store);

      const response = await fetch(`${API}/api/storefront/upload-banner-image`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess('Image uploaded successfully!');
        onSelectImage(result.image_url);
        onImageUploaded();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.detail || 'Failed to upload image');
      }
    } catch (err) {
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3">
      <div 
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
          uploading ? 'border-gray-300 bg-gray-50' : 'border-gray-300 hover:border-black hover:bg-gray-50'
        }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
            <span className="text-sm text-gray-500">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-700">Click to upload image</span>
            <span className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP, GIF up to 10MB</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 px-3 py-2 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}
    </div>
  );
};

// Image Library Modal
const ImageLibraryModal = ({ store, images, onClose, onRefresh }) => {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (filename) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    
    setDeleting(filename);
    try {
      const response = await fetch(`${API}/api/storefront/uploaded-images/${filename}?store=${store}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error('Failed to delete image:', e);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Uploaded Images</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {images.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No uploaded images yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div key={image.filename} className="group relative rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={`${API}${image.url}`}
                    alt={image.filename}
                    className="w-full aspect-video object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button
                      onClick={() => handleDelete(image.filename)}
                      disabled={deleting === image.filename}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      {deleting === image.filename ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 truncate">
                    {image.filename}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Modal Component for Banner/Collection Editing with Image Upload
const ItemModal = ({ type, data, store, uploadedImages, onSave, onClose, onImageUploaded }) => {
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
    size_type: 'hero',
    width: 1920,
    height: 800,
    is_active: true,
    order: 0
  });

  const [showImagePicker, setShowImagePicker] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSizeTypeChange = (sizeType) => {
    const size = BANNER_SIZES[sizeType];
    setFormData(prev => ({
      ...prev,
      size_type: sizeType,
      width: size?.width || prev.width,
      height: size?.height || prev.height
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const getFullImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/api')) return `${API}${url}`;
    return url;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
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
                placeholder="e.g., SUPER SAVER SALE"
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
                placeholder="e.g., 11.11"
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
                  placeholder="Grab your favorite styles at unbelievable prices!"
                />
              </div>
            )}

            {/* Banner Size Selection (Banner only) */}
            {isBanner && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Banner Size</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(BANNER_SIZES).map(([key, size]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSizeTypeChange(key)}
                      className={`p-3 border rounded-lg text-left transition ${
                        formData.size_type === key
                          ? 'border-black bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <size.icon className="w-4 h-4" />
                        <span className="font-medium text-sm">{size.label}</span>
                      </div>
                      <span className="text-xs text-gray-500">{size.width}×{size.height}px</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Image Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image *</label>
              
              {/* Upload New Image */}
              <ImageUploader
                store={store}
                onImageUploaded={onImageUploaded}
                onSelectImage={(url) => handleChange('image', url)}
              />

              {/* Or Enter URL */}
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-xs text-gray-500">OR enter URL</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => handleChange('image', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="https://cdn.shopify.com/..."
                />
              </div>

              {/* Choose from Library */}
              {uploadedImages.length > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowImagePicker(!showImagePicker)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showImagePicker ? 'Hide' : 'Choose from'} uploaded images ({uploadedImages.length})
                  </button>
                  
                  {showImagePicker && (
                    <div className="mt-2 grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                      {uploadedImages.map((img) => (
                        <button
                          key={img.filename}
                          type="button"
                          onClick={() => {
                            handleChange('image', img.url);
                            setShowImagePicker(false);
                          }}
                          className={`aspect-video rounded overflow-hidden border-2 transition ${
                            formData.image === img.url ? 'border-black' : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={`${API}${img.url}`}
                            alt={img.filename}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview */}
              {formData.image && (
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1">Preview:</label>
                  <div className="aspect-video w-full max-w-md rounded-lg overflow-hidden bg-gray-100 border">
                    <img 
                      src={getFullImageUrl(formData.image)} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/400x200?text=Invalid+Image+URL'; }}
                    />
                  </div>
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
                placeholder="/products?collection=sale"
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleChange('is_active', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
              data-testid="save-banner-btn"
            >
              <Save className="w-4 h-4" />
              {isEdit ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StorefrontConfigManager;
