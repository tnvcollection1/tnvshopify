import React, { useState, useEffect } from 'react';
import { 
  Save, Plus, Trash2, Edit2, GripVertical, Eye, EyeOff, 
  Image, Type, Palette, ChevronDown, ChevronUp, 
  Loader2, Check, X, Upload, ExternalLink, Layout, Grid3X3, Menu
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';

const BannerConfigManager = () => {
  const [activeTab, setActiveTab] = useState('banners');
  const [store, setStore] = useState('tnvcollection');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data states
  const [heroBanners, setHeroBanners] = useState([]);
  const [categoryTabs, setCategoryTabs] = useState([]);
  const [subNavItems, setSubNavItems] = useState([]);
  
  // Editing states
  const [editingBanner, setEditingBanner] = useState(null);
  const [editingTab, setEditingTab] = useState(null);
  const [editingSubNav, setEditingSubNav] = useState(null);

  useEffect(() => {
    fetchAllConfig();
  }, [store]);

  const fetchAllConfig = async () => {
    setLoading(true);
    try {
      const [bannersRes, tabsRes, subNavRes] = await Promise.all([
        fetch(`${API}/api/storefront/banners/hero/${store}`),
        fetch(`${API}/api/storefront/banners/category-tabs/${store}`),
        fetch(`${API}/api/storefront/banners/sub-nav/${store}`)
      ]);
      
      const bannersData = await bannersRes.json();
      const tabsData = await tabsRes.json();
      const subNavData = await subNavRes.json();
      
      setHeroBanners(bannersData.banners || []);
      setCategoryTabs(tabsData.categoryTabs || []);
      setSubNavItems(subNavData.subNavItems || []);
    } catch (e) {
      console.error('Failed to fetch config:', e);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  // ==================== HERO BANNERS ====================
  
  const saveBanners = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/storefront/banners/hero/${store}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(heroBanners)
      });
      
      if (res.ok) {
        toast.success('Hero banners saved successfully');
        const data = await res.json();
        if (data.banners) setHeroBanners(data.banners);
      } else {
        toast.error('Failed to save banners');
      }
    } catch (e) {
      toast.error('Failed to save banners');
    } finally {
      setSaving(false);
    }
  };

  const addBanner = () => {
    const newBanner = {
      id: `banner-${Date.now()}`,
      title: 'New Banner',
      subtitle: 'Add your subtitle here',
      buttonText: 'Shop Now',
      buttonLink: '/tnv/products',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=800&fit=crop',
      textColor: '#FFFFFF',
      textPosition: 'left',
      overlay: true,
      overlayOpacity: 0.3,
      active: true,
      order: heroBanners.length
    };
    setHeroBanners([...heroBanners, newBanner]);
    setEditingBanner(newBanner.id);
  };

  const updateBanner = (id, field, value) => {
    setHeroBanners(banners => 
      banners.map(b => b.id === id ? { ...b, [field]: value } : b)
    );
  };

  const deleteBanner = (id) => {
    if (confirm('Are you sure you want to delete this banner?')) {
      setHeroBanners(banners => banners.filter(b => b.id !== id));
      toast.success('Banner deleted');
    }
  };

  const moveBanner = (index, direction) => {
    const newBanners = [...heroBanners];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newBanners.length) return;
    [newBanners[index], newBanners[newIndex]] = [newBanners[newIndex], newBanners[index]];
    newBanners.forEach((b, i) => b.order = i);
    setHeroBanners(newBanners);
  };

  // ==================== CATEGORY TABS ====================
  
  const saveCategoryTabs = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/storefront/banners/category-tabs/${store}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryTabs)
      });
      
      if (res.ok) {
        toast.success('Category tabs saved successfully');
        const data = await res.json();
        if (data.categoryTabs) setCategoryTabs(data.categoryTabs);
      } else {
        toast.error('Failed to save category tabs');
      }
    } catch (e) {
      toast.error('Failed to save category tabs');
    } finally {
      setSaving(false);
    }
  };

  const addCategoryTab = () => {
    const newTab = {
      id: `cat-${Date.now()}`,
      name: 'New Category',
      path: '/tnv/new-category',
      image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=100&h=100&fit=crop',
      bgColor: '#f5f5f5',
      hasMegaMenu: false,
      active: true,
      order: categoryTabs.length
    };
    setCategoryTabs([...categoryTabs, newTab]);
    setEditingTab(newTab.id);
  };

  const updateCategoryTab = (id, field, value) => {
    setCategoryTabs(tabs => 
      tabs.map(t => t.id === id ? { ...t, [field]: value } : t)
    );
  };

  const deleteCategoryTab = (id) => {
    if (confirm('Are you sure you want to delete this category tab?')) {
      setCategoryTabs(tabs => tabs.filter(t => t.id !== id));
      toast.success('Category tab deleted');
    }
  };

  const moveCategoryTab = (index, direction) => {
    const newTabs = [...categoryTabs];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newTabs.length) return;
    [newTabs[index], newTabs[newIndex]] = [newTabs[newIndex], newTabs[index]];
    newTabs.forEach((t, i) => t.order = i);
    setCategoryTabs(newTabs);
  };

  // ==================== SUB NAVIGATION ====================
  
  const saveSubNav = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/storefront/banners/sub-nav/${store}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subNavItems)
      });
      
      if (res.ok) {
        toast.success('Sub-navigation saved successfully');
        const data = await res.json();
        if (data.subNavItems) setSubNavItems(data.subNavItems);
      } else {
        toast.error('Failed to save sub-navigation');
      }
    } catch (e) {
      toast.error('Failed to save sub-navigation');
    } finally {
      setSaving(false);
    }
  };

  const addSubNavItem = () => {
    const newItem = {
      id: `sub-${Date.now()}`,
      name: 'NEW ITEM',
      path: '/tnv/new-item',
      highlight: false,
      active: true,
      order: subNavItems.length
    };
    setSubNavItems([...subNavItems, newItem]);
    setEditingSubNav(newItem.id);
  };

  const updateSubNavItem = (id, field, value) => {
    setSubNavItems(items => 
      items.map(i => i.id === id ? { ...i, [field]: value } : i)
    );
  };

  const deleteSubNavItem = (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
      setSubNavItems(items => items.filter(i => i.id !== id));
      toast.success('Item deleted');
    }
  };

  const moveSubNavItem = (index, direction) => {
    const newItems = [...subNavItems];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newItems.length) return;
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    newItems.forEach((item, i) => item.order = i);
    setSubNavItems(newItems);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Banner & Menu Configuration</h2>
            <p className="text-sm text-gray-500">Manage hero banners, category tabs, and navigation</p>
          </div>
          <select
            value={store}
            onChange={(e) => setStore(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm"
          >
            <option value="tnvcollection">TNV Collection</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {[
          { id: 'banners', label: 'Hero Banners', icon: Image },
          { id: 'categories', label: 'Category Tabs', icon: Grid3X3 },
          { id: 'subnav', label: 'Sub Navigation', icon: Menu },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
              activeTab === tab.id 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* ==================== HERO BANNERS TAB ==================== */}
        {activeTab === 'banners' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Hero Banners ({heroBanners.length})</h3>
              <div className="flex gap-2">
                <button
                  onClick={addBanner}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4" />
                  Add Banner
                </button>
                <button
                  onClick={saveBanners}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save All
                </button>
              </div>
            </div>

            {heroBanners.map((banner, index) => (
              <div 
                key={banner.id} 
                className={`border rounded-lg overflow-hidden ${!banner.active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3 p-4 bg-gray-50 border-b">
                  <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                  <div className="flex gap-1">
                    <button onClick={() => moveBanner(index, -1)} disabled={index === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveBanner(index, 1)} disabled={index === heroBanners.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <img src={banner.image} alt="" className="w-16 h-10 object-cover rounded" />
                  
                  <div className="flex-1">
                    <h4 className="font-medium">{banner.title}</h4>
                    <p className="text-xs text-gray-500">{banner.subtitle}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateBanner(banner.id, 'active', !banner.active)}
                      className={`p-2 rounded ${banner.active ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
                    >
                      {banner.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditingBanner(editingBanner === banner.id ? null : banner.id)}
                      className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteBanner(banner.id)}
                      className="p-2 text-red-600 bg-red-50 rounded hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Edit Form */}
                {editingBanner === banner.id && (
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                      <input
                        value={banner.title}
                        onChange={(e) => updateBanner(banner.id, 'title', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="Banner Title"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Subtitle</label>
                      <input
                        value={banner.subtitle || ''}
                        onChange={(e) => updateBanner(banner.id, 'subtitle', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="Banner Subtitle"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Button Text</label>
                      <input
                        value={banner.buttonText || ''}
                        onChange={(e) => updateBanner(banner.id, 'buttonText', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="Shop Now"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Button Link</label>
                      <input
                        value={banner.buttonLink || ''}
                        onChange={(e) => updateBanner(banner.id, 'buttonLink', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="/tnv/products"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Image URL</label>
                      <input
                        value={banner.image}
                        onChange={(e) => updateBanner(banner.id, 'image', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Text Position</label>
                      <select
                        value={banner.textPosition || 'left'}
                        onChange={(e) => updateBanner(banner.id, 'textPosition', e.target.value)}
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
                        <input
                          type="color"
                          value={banner.textColor || '#FFFFFF'}
                          onChange={(e) => updateBanner(banner.id, 'textColor', e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <input
                          value={banner.textColor || '#FFFFFF'}
                          onChange={(e) => updateBanner(banner.id, 'textColor', e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={banner.overlay !== false}
                          onChange={(e) => updateBanner(banner.id, 'overlay', e.target.checked)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm">Dark Overlay</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Overlay Opacity</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={banner.overlayOpacity || 0.3}
                        onChange={(e) => updateBanner(banner.id, 'overlayOpacity', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-xs text-gray-500">{(banner.overlayOpacity || 0.3) * 100}%</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {heroBanners.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No banners yet. Click "Add Banner" to create one.</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== CATEGORY TABS TAB ==================== */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Category Tabs ({categoryTabs.length})</h3>
              <div className="flex gap-2">
                <button
                  onClick={addCategoryTab}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4" />
                  Add Tab
                </button>
                <button
                  onClick={saveCategoryTabs}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save All
                </button>
              </div>
            </div>

            {categoryTabs.map((tab, index) => (
              <div 
                key={tab.id} 
                className={`border rounded-lg overflow-hidden ${!tab.active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3 p-4 bg-gray-50 border-b">
                  <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                  <div className="flex gap-1">
                    <button onClick={() => moveCategoryTab(index, -1)} disabled={index === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveCategoryTab(index, 1)} disabled={index === categoryTabs.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div 
                    className="w-12 h-12 rounded overflow-hidden"
                    style={{ backgroundColor: tab.bgColor || '#f5f5f5' }}
                  >
                    <img src={tab.image} alt="" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium">{tab.name}</h4>
                    <p className="text-xs text-gray-500">{tab.path}</p>
                  </div>
                  
                  {tab.hasMegaMenu && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">Mega Menu</span>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCategoryTab(tab.id, 'active', !tab.active)}
                      className={`p-2 rounded ${tab.active ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
                    >
                      {tab.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditingTab(editingTab === tab.id ? null : tab.id)}
                      className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCategoryTab(tab.id)}
                      className="p-2 text-red-600 bg-red-50 rounded hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Edit Form */}
                {editingTab === tab.id && (
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                      <input
                        value={tab.name}
                        onChange={(e) => updateCategoryTab(tab.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="Category Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Path</label>
                      <input
                        value={tab.path}
                        onChange={(e) => updateCategoryTab(tab.id, 'path', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="/tnv/category"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Image URL</label>
                      <input
                        value={tab.image}
                        onChange={(e) => updateCategoryTab(tab.id, 'image', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Background Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={tab.bgColor || '#f5f5f5'}
                          onChange={(e) => updateCategoryTab(tab.id, 'bgColor', e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <input
                          value={tab.bgColor || '#f5f5f5'}
                          onChange={(e) => updateCategoryTab(tab.id, 'bgColor', e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tab.hasMegaMenu || false}
                          onChange={(e) => updateCategoryTab(tab.id, 'hasMegaMenu', e.target.checked)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm">Has Mega Menu (Gender Selector)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {categoryTabs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No category tabs yet. Click "Add Tab" to create one.</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== SUB NAVIGATION TAB ==================== */}
        {activeTab === 'subnav' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Sub-Navigation Items ({subNavItems.length})</h3>
              <div className="flex gap-2">
                <button
                  onClick={addSubNavItem}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
                <button
                  onClick={saveSubNav}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save All
                </button>
              </div>
            </div>

            {subNavItems.map((item, index) => (
              <div 
                key={item.id} 
                className={`border rounded-lg overflow-hidden ${!item.active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3 p-4 bg-gray-50">
                  <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                  <div className="flex gap-1">
                    <button onClick={() => moveSubNavItem(index, -1)} disabled={index === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveSubNavItem(index, 1)} disabled={index === subNavItems.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex-1">
                    <span className={`font-medium ${item.highlight ? 'text-red-500' : ''}`}>{item.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{item.path}</span>
                  </div>
                  
                  {item.highlight && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">Highlighted</span>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateSubNavItem(item.id, 'active', !item.active)}
                      className={`p-2 rounded ${item.active ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
                    >
                      {item.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditingSubNav(editingSubNav === item.id ? null : item.id)}
                      className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteSubNavItem(item.id)}
                      className="p-2 text-red-600 bg-red-50 rounded hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Edit Form */}
                {editingSubNav === item.id && (
                  <div className="p-4 grid grid-cols-3 gap-4 border-t">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                      <input
                        value={item.name}
                        onChange={(e) => updateSubNavItem(item.id, 'name', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="ITEM NAME"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Path</label>
                      <input
                        value={item.path}
                        onChange={(e) => updateSubNavItem(item.id, 'path', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="/tnv/path"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.highlight || false}
                          onChange={(e) => updateSubNavItem(item.id, 'highlight', e.target.checked)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm">Highlight (Red Text)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {subNavItems.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Menu className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No sub-navigation items yet. Click "Add Item" to create one.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerConfigManager;
