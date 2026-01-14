import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, Plus, Trash2, Edit2, Eye, EyeOff, 
  Image, Type, Palette, ChevronDown, ChevronUp, 
  Loader2, Smartphone, Monitor, Layout, Grid3X3, 
  Menu, Megaphone, Settings, Store, Sparkles,
  Upload, X, Check, RefreshCw, ExternalLink, ImagePlus, GripVertical
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Sortable Item Wrapper Component
const SortableItem = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children({ listeners, isDragging })}
    </div>
  );
};

// Image Upload Component
const ImageUploader = ({ onUpload, category = 'general', currentImage, label }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API}/api/uploads/image?category=${category}`, {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        const fullUrl = `${API}${data.url}`;
        onUpload(fullUrl);
        toast.success('Image uploaded successfully');
      } else {
        toast.error('Failed to upload image');
      }
    } catch (e) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-medium text-gray-500">{label}</label>}
      <div className="flex gap-2 items-start">
        {/* Preview */}
        {currentImage && (
          <div className="w-20 h-14 rounded border overflow-hidden bg-gray-100 flex-shrink-0">
            <img src={currentImage} alt="" className="w-full h-full object-cover" onError={(e) => e.target.src = 'https://via.placeholder.com/80x56'} />
          </div>
        )}
        
        {/* Upload Button */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            id={`upload-${category}-${Math.random()}`}
          />
          <label 
            htmlFor={fileInputRef.current?.id}
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-2 px-3 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition ${uploading ? 'opacity-50 cursor-wait' : ''}`}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImagePlus className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-sm text-gray-500">{uploading ? 'Uploading...' : 'Upload Image'}</span>
          </label>
        </div>
      </div>
    </div>
  );
};

const UnifiedStoreSettings = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [store, setStore] = useState('tnvcollection');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // All configuration data
  const [config, setConfig] = useState({
    // General Store Settings
    general: {
      storeName: 'TNV Collection',
      storeDescription: 'Premium Fashion & Footwear',
      currency: 'AED',
      timezone: 'Asia/Dubai',
      supportEmail: 'support@tnvcollection.com',
      supportPhone: '+971 50 123 4567',
    },
    // Logo & Branding
    branding: {
      logo: { text: 'NAMSHI', badge: '', badgeColor: '#FF6B9D', image: null },
      primaryColor: '#000000',
      accentColor: '#FF6B9D',
      fontFamily: 'Inter',
    },
    // Hero Banners
    heroBanners: [],
    // Category Tabs
    categoryTabs: [],
    // Sub Navigation
    subNavItems: [],
    // Promo Messages
    promoMessages: [],
    // Mobile App Settings
    mobileApp: {
      appName: 'TNV Collection',
      primaryColor: '#000000',
      accentColor: '#FF6B9D',
      showBottomNav: true,
      enablePushNotifications: true,
      enableWishlist: true,
      enableCart: true,
      splashScreenImage: null,
      appIcon: null,
    },
  });

  // Editing states
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchAllConfig();
  }, [store]);

  const fetchAllConfig = async () => {
    setLoading(true);
    try {
      const [bannersRes, navRes] = await Promise.all([
        fetch(`${API}/api/storefront/banners/layout/${store}`),
        fetch(`${API}/api/storefront/config/navigation/${store}`)
      ]);
      
      const bannersData = await bannersRes.json();
      const navData = await navRes.json();
      
      setConfig(prev => ({
        ...prev,
        heroBanners: bannersData.heroBanners || [],
        categoryTabs: bannersData.categoryTabs || [],
        subNavItems: bannersData.subNavItems || [],
        promoMessages: navData.promoMessages || [],
        branding: {
          ...prev.branding,
          logo: navData.logo || prev.branding.logo,
        }
      }));
    } catch (e) {
      console.error('Failed to fetch config:', e);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  // Save functions
  const saveSection = async (section) => {
    setSaving(true);
    try {
      let res;
      switch (section) {
        case 'heroBanners':
          res = await fetch(`${API}/api/storefront/banners/hero/${store}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config.heroBanners)
          });
          break;
        case 'categoryTabs':
          res = await fetch(`${API}/api/storefront/banners/category-tabs/${store}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config.categoryTabs)
          });
          break;
        case 'subNavItems':
          res = await fetch(`${API}/api/storefront/banners/sub-nav/${store}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config.subNavItems)
          });
          break;
        case 'promoMessages':
          res = await fetch(`${API}/api/storefront/config/promo-messages/${store}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config.promoMessages)
          });
          break;
        case 'branding':
          res = await fetch(`${API}/api/storefront/config/logo/${store}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config.branding.logo)
          });
          break;
        case 'mobileApp':
          res = await fetch(`${API}/api/storefront/config/mobile-app/${store}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config.mobileApp)
          });
          break;
        default:
          toast.info('Section save not implemented');
          return;
      }
      
      if (res && res.ok) {
        toast.success(`${section} saved successfully`);
      } else {
        toast.error(`Failed to save ${section}`);
      }
    } catch (e) {
      toast.error(`Failed to save ${section}`);
    } finally {
      setSaving(false);
    }
  };

  // Update config helper
  const updateConfig = (section, field, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: typeof field === 'object' 
        ? { ...prev[section], ...field }
        : { ...prev[section], [field]: value }
    }));
  };

  // Array item helpers
  const updateArrayItem = (section, index, field, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: prev[section].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addArrayItem = (section, newItem) => {
    setConfig(prev => ({
      ...prev,
      [section]: [...prev[section], { ...newItem, id: `${section}-${Date.now()}`, order: prev[section].length }]
    }));
  };

  const deleteArrayItem = (section, index) => {
    if (confirm('Are you sure you want to delete this item?')) {
      setConfig(prev => ({
        ...prev,
        [section]: prev[section].filter((_, i) => i !== index)
      }));
      toast.success('Item deleted');
    }
  };

  const moveArrayItem = (section, index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= config[section].length) return;
    
    setConfig(prev => {
      const items = [...prev[section]];
      [items[index], items[newIndex]] = [items[newIndex], items[index]];
      items.forEach((item, i) => item.order = i);
      return { ...prev, [section]: items };
    });
  };

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for reordering
  const handleDragEnd = (event, section) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setConfig(prev => {
        const items = prev[section];
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        newItems.forEach((item, i) => item.order = i);
        
        return { ...prev, [section]: newItems };
      });
      toast.success('Order updated');
    }
  };

  // Sidebar sections
  const sections = [
    { id: 'general', label: 'General Settings', icon: Settings, platform: 'both' },
    { id: 'branding', label: 'Logo & Branding', icon: Palette, platform: 'both' },
    { id: 'heroBanners', label: 'Hero Banners', icon: Image, platform: 'web' },
    { id: 'categoryTabs', label: 'Category Tabs', icon: Grid3X3, platform: 'both' },
    { id: 'subNavItems', label: 'Sub Navigation', icon: Menu, platform: 'web' },
    { id: 'promoMessages', label: 'Promo Messages', icon: Megaphone, platform: 'both' },
    { id: 'mobileApp', label: 'Mobile App', icon: Smartphone, platform: 'mobile' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading store settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Store className="w-6 h-6 text-blue-500" />
            Store Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">Configure web & mobile app</p>
        </div>

        {/* Store Selector */}
        <div className="p-4 border-b">
          <label className="block text-xs font-medium text-gray-500 mb-2">Active Store</label>
          <select
            value={store}
            onChange={(e) => setStore(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
          >
            <option value="tnvcollection">TNV Collection</option>
          </select>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                  activeSection === section.id 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <section.icon className="w-5 h-5" />
                <span className="flex-1 font-medium text-sm">{section.label}</span>
                {section.platform === 'web' && (
                  <Monitor className="w-4 h-4 text-gray-400" />
                )}
                {section.platform === 'mobile' && (
                  <Smartphone className="w-4 h-4 text-gray-400" />
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Preview Links */}
        <div className="p-4 border-t space-y-2">
          <a 
            href="/tnv" 
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition"
          >
            <Monitor className="w-4 h-4" />
            <span>Preview Web Store</span>
            <ExternalLink className="w-3 h-3 ml-auto" />
          </a>
          <a 
            href="/mobile-app-preview" 
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition"
          >
            <Smartphone className="w-4 h-4" />
            <span>Preview Mobile App</span>
            <ExternalLink className="w-3 h-3 ml-auto" />
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          
          {/* ==================== GENERAL SETTINGS ==================== */}
          {activeSection === 'general' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">General Settings</h2>
                  <p className="text-gray-500">Basic store information</p>
                </div>
                <button
                  onClick={() => saveSection('general')}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>

              <div className="bg-white rounded-xl border p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                    <input
                      value={config.general.storeName}
                      onChange={(e) => updateConfig('general', 'storeName', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="TNV Collection"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={config.general.currency}
                      onChange={(e) => updateConfig('general', 'currency', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="AED">AED - UAE Dirham</option>
                      <option value="SAR">SAR - Saudi Riyal</option>
                      <option value="PKR">PKR - Pakistani Rupee</option>
                      <option value="USD">USD - US Dollar</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Store Description</label>
                  <textarea
                    value={config.general.storeDescription}
                    onChange={(e) => updateConfig('general', 'storeDescription', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    placeholder="Premium Fashion & Footwear"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                    <input
                      value={config.general.supportEmail}
                      onChange={(e) => updateConfig('general', 'supportEmail', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="support@store.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Support Phone</label>
                    <input
                      value={config.general.supportPhone}
                      onChange={(e) => updateConfig('general', 'supportPhone', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="+971 50 123 4567"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== BRANDING ==================== */}
          {activeSection === 'branding' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Logo & Branding</h2>
                  <p className="text-gray-500">Customize your store's visual identity</p>
                </div>
                <button
                  onClick={() => saveSection('branding')}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>

              <div className="bg-white rounded-xl border p-6 space-y-6">
                {/* Logo Preview */}
                <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-2">Current Logo</p>
                    <div className="bg-white px-6 py-3 rounded-lg shadow-sm">
                      <span className="text-2xl font-black italic">{config.branding.logo.text}</span>
                      {config.branding.logo.badge && (
                        <span 
                          className="ml-2 text-xs px-2 py-0.5 rounded"
                          style={{ backgroundColor: config.branding.logo.badgeColor, color: 'white' }}
                        >
                          {config.branding.logo.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo Text</label>
                    <input
                      value={config.branding.logo.text}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        branding: { ...prev.branding, logo: { ...prev.branding.logo, text: e.target.value } }
                      }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="NAMSHI"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Badge Text (optional)</label>
                    <input
                      value={config.branding.logo.badge || ''}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        branding: { ...prev.branding, logo: { ...prev.branding.logo, badge: e.target.value } }
                      }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="COLLECTION"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Badge Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.branding.logo.badgeColor || '#FF6B9D'}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          branding: { ...prev.branding, logo: { ...prev.branding.logo, badgeColor: e.target.value } }
                        }))}
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <input
                        value={config.branding.logo.badgeColor || '#FF6B9D'}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          branding: { ...prev.branding, logo: { ...prev.branding.logo, badgeColor: e.target.value } }
                        }))}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.branding.primaryColor}
                        onChange={(e) => updateConfig('branding', 'primaryColor', e.target.value)}
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <input
                        value={config.branding.primaryColor}
                        onChange={(e) => updateConfig('branding', 'primaryColor', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.branding.accentColor}
                        onChange={(e) => updateConfig('branding', 'accentColor', e.target.value)}
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <input
                        value={config.branding.accentColor}
                        onChange={(e) => updateConfig('branding', 'accentColor', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo Image URL (optional)</label>
                  <input
                    value={config.branding.logo.image || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      branding: { ...prev.branding, logo: { ...prev.branding.logo, image: e.target.value } }
                    }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ==================== HERO BANNERS ==================== */}
          {activeSection === 'heroBanners' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Hero Banners</h2>
                  <p className="text-gray-500">Homepage slider banners - <span className="text-blue-500 font-medium">Drag to reorder</span></p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addArrayItem('heroBanners', {
                      title: 'New Banner',
                      subtitle: 'Add your subtitle',
                      buttonText: 'Shop Now',
                      buttonLink: '/tnv/products',
                      image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&h=800&fit=crop',
                      textColor: '#FFFFFF',
                      textPosition: 'left',
                      overlay: true,
                      overlayOpacity: 0.3,
                      active: true,
                    })}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add Banner
                  </button>
                  <button
                    onClick={() => saveSection('heroBanners')}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save All
                  </button>
                </div>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(event, 'heroBanners')}
              >
                <SortableContext
                  items={config.heroBanners.map(b => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {config.heroBanners.map((banner, index) => (
                      <SortableItem key={banner.id} id={banner.id}>
                        {({ listeners, isDragging }) => (
                          <div 
                            className={`bg-white border rounded-xl overflow-hidden ${!banner.active ? 'opacity-60' : ''} ${isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''}`}
                          >
                            <div className="flex items-center gap-4 p-4 border-b bg-gray-50">
                              <div 
                                {...listeners}
                                className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-200 rounded"
                                title="Drag to reorder"
                              >
                                <GripVertical className="w-5 h-5 text-gray-400" />
                              </div>
                              <img src={banner.image} alt="" className="w-24 h-14 object-cover rounded" />
                              <div className="flex-1">
                                <h4 className="font-semibold">{banner.title}</h4>
                                <p className="text-sm text-gray-500">{banner.subtitle}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateArrayItem('heroBanners', index, 'active', !banner.active)}
                                  className={`p-2 rounded ${banner.active ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
                                >
                                  {banner.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => setEditingItem(editingItem === `banner-${index}` ? null : `banner-${index}`)}
                                  className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteArrayItem('heroBanners', index)}
                                  className="p-2 text-red-600 bg-red-50 rounded hover:bg-red-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {editingItem === `banner-${index}` && (
                              <div className="p-4 grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                                  <input
                                    value={banner.title}
                                    onChange={(e) => updateArrayItem('heroBanners', index, 'title', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Subtitle</label>
                                  <input
                                    value={banner.subtitle || ''}
                                    onChange={(e) => updateArrayItem('heroBanners', index, 'subtitle', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Button Text</label>
                          <input
                            value={banner.buttonText || ''}
                            onChange={(e) => updateArrayItem('heroBanners', index, 'buttonText', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Button Link</label>
                          <input
                            value={banner.buttonLink || ''}
                            onChange={(e) => updateArrayItem('heroBanners', index, 'buttonLink', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Banner Image</label>
                          <div className="flex gap-3 items-start">
                            <ImageUploader 
                              category="banners"
                              currentImage={banner.image}
                              onUpload={(url) => updateArrayItem('heroBanners', index, 'image', url)}
                            />
                            <div className="flex-1">
                              <input
                                value={banner.image}
                                onChange={(e) => updateArrayItem('heroBanners', index, 'image', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                placeholder="Or paste image URL..."
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Text Position</label>
                          <select
                            value={banner.textPosition || 'left'}
                            onChange={(e) => updateArrayItem('heroBanners', index, 'textPosition', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Text Color</label>
                          <div className="flex gap-2">
                            <input type="color" value={banner.textColor || '#FFFFFF'} onChange={(e) => updateArrayItem('heroBanners', index, 'textColor', e.target.value)} className="w-10 h-9 rounded" />
                            <input value={banner.textColor || '#FFFFFF'} onChange={(e) => updateArrayItem('heroBanners', index, 'textColor', e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                        )}
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {config.heroBanners.length === 0 && (
                <div className="bg-white border rounded-xl p-12 text-center text-gray-500">
                  <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No banners yet. Click "Add Banner" to create one.</p>
                </div>
              )}
            </div>
          )}

          {/* ==================== CATEGORY TABS ==================== */}
          {activeSection === 'categoryTabs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Category Tabs</h2>
                  <p className="text-gray-500">Navigation categories - <span className="text-blue-500 font-medium">Drag to reorder</span></p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addArrayItem('categoryTabs', {
                      name: 'New Category',
                      path: '/tnv/new-category',
                      image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=100&h=100&fit=crop',
                      bgColor: '#f5f5f5',
                      hasMegaMenu: false,
                      active: true,
                    })}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add Tab
                  </button>
                  <button
                    onClick={() => saveSection('categoryTabs')}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save All
                  </button>
                </div>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(event, 'categoryTabs')}
              >
                <SortableContext
                  items={config.categoryTabs.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="bg-white border rounded-xl divide-y">
                    {config.categoryTabs.map((tab, index) => (
                      <SortableItem key={tab.id} id={tab.id}>
                        {({ listeners, isDragging }) => (
                          <div className={`${!tab.active ? 'opacity-60' : ''} ${isDragging ? 'bg-blue-50' : ''}`}>
                            <div className="flex items-center gap-4 p-4">
                              <div 
                                {...listeners}
                                className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-200 rounded"
                                title="Drag to reorder"
                              >
                                <GripVertical className="w-5 h-5 text-gray-400" />
                              </div>
                              <div className="w-12 h-12 rounded overflow-hidden" style={{ backgroundColor: tab.bgColor }}>
                                <img src={tab.image} alt="" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold">{tab.name}</h4>
                                <p className="text-sm text-gray-500">{tab.path}</p>
                              </div>
                              {tab.hasMegaMenu && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">Mega Menu</span>}
                              <div className="flex items-center gap-2">
                                <button onClick={() => updateArrayItem('categoryTabs', index, 'active', !tab.active)} className={`p-2 rounded ${tab.active ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}>
                                  {tab.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                                <button onClick={() => setEditingItem(editingItem === `tab-${index}` ? null : `tab-${index}`)} className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteArrayItem('categoryTabs', index)} className="p-2 text-red-600 bg-red-50 rounded hover:bg-red-100">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {editingItem === `tab-${index}` && (
                              <div className="p-4 bg-gray-50 border-t grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                                  <input value={tab.name} onChange={(e) => updateArrayItem('categoryTabs', index, 'name', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Path</label>
                                  <input value={tab.path} onChange={(e) => updateArrayItem('categoryTabs', index, 'path', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Category Image</label>
                                  <div className="flex gap-2 items-start">
                                    <ImageUploader 
                              category="categories"
                              currentImage={tab.image}
                              onUpload={(url) => updateArrayItem('categoryTabs', index, 'image', url)}
                            />
                            <input value={tab.image} onChange={(e) => updateArrayItem('categoryTabs', index, 'image', e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="Or paste URL..." />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Background Color</label>
                          <div className="flex gap-2">
                            <input type="color" value={tab.bgColor || '#f5f5f5'} onChange={(e) => updateArrayItem('categoryTabs', index, 'bgColor', e.target.value)} className="w-10 h-9 rounded" />
                            <input value={tab.bgColor || '#f5f5f5'} onChange={(e) => updateArrayItem('categoryTabs', index, 'bgColor', e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                          </div>
                        </div>
                        <div className="col-span-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={tab.hasMegaMenu || false} onChange={(e) => updateArrayItem('categoryTabs', index, 'hasMegaMenu', e.target.checked)} className="w-4 h-4 rounded" />
                            <span className="text-sm">Enable Mega Menu (WOMEN/MEN gender selector)</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== SUB NAVIGATION ==================== */}
          {activeSection === 'subNavItems' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Sub Navigation</h2>
                  <p className="text-gray-500">Secondary navigation items (CLOTHING, SHOES, SALE, etc.)</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addArrayItem('subNavItems', {
                      name: 'NEW ITEM',
                      path: '/tnv/new-item',
                      highlight: false,
                      active: true,
                    })}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                  <button
                    onClick={() => saveSection('subNavItems')}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save All
                  </button>
                </div>
              </div>

              <div className="bg-white border rounded-xl divide-y">
                {config.subNavItems.map((item, index) => (
                  <div key={item.id || index} className={`flex items-center gap-4 p-4 ${!item.active ? 'opacity-60' : ''}`}>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => moveArrayItem('subNavItems', index, -1)} disabled={index === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => moveArrayItem('subNavItems', index, 1)} disabled={index === config.subNavItems.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {editingItem === `sub-${index}` ? (
                      <div className="flex-1 flex items-center gap-4">
                        <input
                          value={item.name}
                          onChange={(e) => updateArrayItem('subNavItems', index, 'name', e.target.value.toUpperCase())}
                          className="px-3 py-2 border rounded-lg text-sm w-40"
                          placeholder="NAME"
                        />
                        <input
                          value={item.path}
                          onChange={(e) => updateArrayItem('subNavItems', index, 'path', e.target.value)}
                          className="px-3 py-2 border rounded-lg text-sm flex-1"
                          placeholder="/tnv/path"
                        />
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.highlight || false}
                            onChange={(e) => updateArrayItem('subNavItems', index, 'highlight', e.target.checked)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-red-500">Highlight</span>
                        </label>
                        <button onClick={() => setEditingItem(null)} className="p-2 text-green-600 bg-green-50 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <span className={`font-semibold ${item.highlight ? 'text-red-500' : ''}`}>{item.name}</span>
                          <span className="text-sm text-gray-500 ml-3">{item.path}</span>
                        </div>
                        {item.highlight && <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">Highlighted</span>}
                      </>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateArrayItem('subNavItems', index, 'active', !item.active)} className={`p-2 rounded ${item.active ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}>
                        {item.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setEditingItem(editingItem === `sub-${index}` ? null : `sub-${index}`)} className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteArrayItem('subNavItems', index)} className="p-2 text-red-600 bg-red-50 rounded hover:bg-red-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== PROMO MESSAGES ==================== */}
          {activeSection === 'promoMessages' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Promo Messages</h2>
                  <p className="text-gray-500">Rotating messages in header carousel</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addArrayItem('promoMessages', {
                      text: 'New Promo Message',
                      icon: '🎉',
                      active: true,
                    })}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add Message
                  </button>
                  <button
                    onClick={() => saveSection('promoMessages')}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save All
                  </button>
                </div>
              </div>

              <div className="bg-white border rounded-xl divide-y">
                {config.promoMessages.map((msg, index) => (
                  <div key={msg.id || index} className={`flex items-center gap-4 p-4 ${!msg.active ? 'opacity-60' : ''}`}>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => moveArrayItem('promoMessages', index, -1)} disabled={index === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => moveArrayItem('promoMessages', index, 1)} disabled={index === config.promoMessages.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {editingItem === `promo-${index}` ? (
                      <div className="flex-1 flex items-center gap-4">
                        <input
                          value={msg.icon || ''}
                          onChange={(e) => updateArrayItem('promoMessages', index, 'icon', e.target.value)}
                          className="px-3 py-2 border rounded-lg text-sm w-16 text-center text-xl"
                          placeholder="🎉"
                        />
                        <input
                          value={msg.text}
                          onChange={(e) => updateArrayItem('promoMessages', index, 'text', e.target.value)}
                          className="px-3 py-2 border rounded-lg text-sm flex-1"
                          placeholder="Promo message text"
                        />
                        <button onClick={() => setEditingItem(null)} className="p-2 text-green-600 bg-green-50 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center gap-3">
                        <span className="text-2xl">{msg.icon}</span>
                        <span className="font-medium">{msg.text}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateArrayItem('promoMessages', index, 'active', !msg.active)} className={`p-2 rounded ${msg.active ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}>
                        {msg.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setEditingItem(editingItem === `promo-${index}` ? null : `promo-${index}`)} className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteArrayItem('promoMessages', index)} className="p-2 text-red-600 bg-red-50 rounded hover:bg-red-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== MOBILE APP SETTINGS ==================== */}
          {activeSection === 'mobileApp' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Mobile App Settings</h2>
                  <p className="text-gray-500">Configure the React Native mobile app</p>
                </div>
                <button
                  onClick={() => saveSection('mobileApp')}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* App Info */}
                <div className="bg-white rounded-xl border p-6 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-blue-500" />
                    App Information
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">App Name</label>
                    <input
                      value={config.mobileApp.appName}
                      onChange={(e) => updateConfig('mobileApp', 'appName', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="TNV Collection"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">App Icon URL</label>
                    <input
                      value={config.mobileApp.appIcon || ''}
                      onChange={(e) => updateConfig('mobileApp', 'appIcon', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Splash Screen Image</label>
                    <input
                      value={config.mobileApp.splashScreenImage || ''}
                      onChange={(e) => updateConfig('mobileApp', 'splashScreenImage', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* App Colors */}
                <div className="bg-white rounded-xl border p-6 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Palette className="w-5 h-5 text-purple-500" />
                    App Colors
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.mobileApp.primaryColor}
                        onChange={(e) => updateConfig('mobileApp', 'primaryColor', e.target.value)}
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <input
                        value={config.mobileApp.primaryColor}
                        onChange={(e) => updateConfig('mobileApp', 'primaryColor', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.mobileApp.accentColor}
                        onChange={(e) => updateConfig('mobileApp', 'accentColor', e.target.value)}
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <input
                        value={config.mobileApp.accentColor}
                        onChange={(e) => updateConfig('mobileApp', 'accentColor', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="bg-white rounded-xl border p-6 space-y-4 col-span-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    Feature Toggles
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                      <div>
                        <p className="font-medium">Bottom Navigation</p>
                        <p className="text-sm text-gray-500">Show tab bar at bottom</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.mobileApp.showBottomNav}
                        onChange={(e) => updateConfig('mobileApp', 'showBottomNav', e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                      <div>
                        <p className="font-medium">Push Notifications</p>
                        <p className="text-sm text-gray-500">Enable push notifications</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.mobileApp.enablePushNotifications}
                        onChange={(e) => updateConfig('mobileApp', 'enablePushNotifications', e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                      <div>
                        <p className="font-medium">Wishlist</p>
                        <p className="text-sm text-gray-500">Allow users to save favorites</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.mobileApp.enableWishlist}
                        onChange={(e) => updateConfig('mobileApp', 'enableWishlist', e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                      <div>
                        <p className="font-medium">Shopping Cart</p>
                        <p className="text-sm text-gray-500">Enable cart functionality</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.mobileApp.enableCart}
                        onChange={(e) => updateConfig('mobileApp', 'enableCart', e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                    </label>
                  </div>
                </div>

                {/* Preview Link */}
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-2">Preview Mobile App</h3>
                      <p className="text-white/80">See how your mobile app looks with current settings</p>
                    </div>
                    <a 
                      href="/mobile-app-preview"
                      target="_blank"
                      className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition"
                    >
                      <Smartphone className="w-5 h-5" />
                      Open Preview
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default UnifiedStoreSettings;
