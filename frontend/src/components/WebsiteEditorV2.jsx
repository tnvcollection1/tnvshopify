import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Monitor, RefreshCw, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Settings, Image, Eye, EyeOff, Plus, Save, X, Palette, Layers, BoxSelect,
  Tablet, Smartphone as Phone, ExternalLink, Edit3, Megaphone, Type, Menu,
  LayoutGrid, Trash2, GripVertical, MousePointer, Move, Check, Link2
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';

const EMOJI_OPTIONS = ['💵', '🚚', '✓', '↩️', '🌟', '🔥', '💎', '🏷️', '👗', '👟', '👜', '⚽', '✨', '🎁', '💳', '📦'];
const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const WebsiteEditorV2 = () => {
  const { selectedStore } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState('desktop');
  const [editMode, setEditMode] = useState('click'); // 'click' or 'drag'
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  
  // Currently selected/editing element
  const [selectedElement, setSelectedElement] = useState(null);
  const [editingInline, setEditingInline] = useState(false);
  const [inlineEditValue, setInlineEditValue] = useState('');
  
  // Data
  const [banners, setBanners] = useState([]);
  const [headerConfig, setHeaderConfig] = useState({
    logo: { text: 'TNV', badge: 'COLLECTION', badgeColor: '#FF6B9D' },
    promoMessages: [
      { emoji: '🚚', text: 'Free shipping on orders over ₹999', enabled: true },
      { emoji: '💵', text: 'Cash on delivery available', enabled: true },
    ],
    categories: ['MEN', 'WOMEN', 'KIDS', 'SHOES', 'ACCESSORIES'],
  });

  // Sections config
  const [sections, setSections] = useState([
    { id: 'announcement', type: 'announcement_bar', title: 'Announcement Bar', enabled: true },
    { id: 'header', type: 'header', title: 'Header & Logo', enabled: true },
    { id: 'hero', type: 'hero_carousel', title: 'Hero Banners', enabled: true },
    { id: 'categories', type: 'categories', title: 'Categories', enabled: true },
    { id: 'trending', type: 'product_grid', title: 'Trending Products', enabled: true },
    { id: 'promo', type: 'promo_banner', title: 'Promo Banner', enabled: true },
    { id: 'footer', type: 'footer', title: 'Footer', enabled: true },
  ]);

  const storeName = selectedStore || 'tnvcollection';
  const storefrontUrl = `https://stores.wamerce.com/${storeName}`;

  useEffect(() => {
    fetchData();
  }, [selectedStore]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bannersRes, navRes] = await Promise.all([
        fetch(`${API_URL}/api/storefront/banners/hero/${storeName}`),
        fetch(`${API_URL}/api/storefront/config/navigation/${storeName}`)
      ]);

      if (bannersRes.ok) {
        const data = await bannersRes.json();
        setBanners(data.banners || [
          { id: 1, title: 'Summer Collection', subtitle: 'Up to 50% OFF', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8', link: '/collection/summer' },
          { id: 2, title: 'New Arrivals', subtitle: 'Shop the latest trends', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64', link: '/new-arrivals' },
        ]);
      }
      if (navRes.ok) {
        const data = await navRes.json();
        if (data.logo) setHeaderConfig(prev => ({ ...prev, logo: data.logo }));
        if (data.promoMessages) setHeaderConfig(prev => ({ ...prev, promoMessages: data.promoMessages }));
        if (data.categories) setHeaderConfig(prev => ({ ...prev, categories: data.categories }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle element click in preview
  const handleElementClick = (elementType, elementId, elementData) => {
    setSelectedElement({ type: elementType, id: elementId, data: elementData });
    setEditingInline(false);
  };

  // Handle double-click for inline editing
  const handleElementDoubleClick = (elementType, elementId, currentValue) => {
    setSelectedElement({ type: elementType, id: elementId });
    setEditingInline(true);
    setInlineEditValue(currentValue);
  };

  // Save inline edit
  const saveInlineEdit = () => {
    if (!selectedElement) return;
    
    const { type, id } = selectedElement;
    
    if (type === 'logo_text') {
      setHeaderConfig(prev => ({ ...prev, logo: { ...prev.logo, text: inlineEditValue } }));
    } else if (type === 'logo_badge') {
      setHeaderConfig(prev => ({ ...prev, logo: { ...prev.logo, badge: inlineEditValue } }));
    } else if (type === 'promo_message') {
      setHeaderConfig(prev => ({
        ...prev,
        promoMessages: prev.promoMessages.map((p, i) => i === id ? { ...p, text: inlineEditValue } : p)
      }));
    } else if (type === 'banner_title') {
      setBanners(prev => prev.map(b => b.id === id ? { ...b, title: inlineEditValue } : b));
    } else if (type === 'banner_subtitle') {
      setBanners(prev => prev.map(b => b.id === id ? { ...b, subtitle: inlineEditValue } : b));
    } else if (type === 'category') {
      setHeaderConfig(prev => ({
        ...prev,
        categories: prev.categories.map((c, i) => {
          if (i !== id) return c;
          // Handle both string and object categories
          if (typeof c === 'string') return inlineEditValue;
          return { ...c, name: inlineEditValue };
        })
      }));
    }
    
    setHasChanges(true);
    setEditingInline(false);
    setInlineEditValue('');
  };

  // Update element from right panel
  const updateElement = (field, value) => {
    if (!selectedElement) return;
    
    const { type, id } = selectedElement;
    
    if (type.startsWith('logo')) {
      setHeaderConfig(prev => ({ ...prev, logo: { ...prev.logo, [field]: value } }));
    } else if (type === 'promo_message') {
      setHeaderConfig(prev => ({
        ...prev,
        promoMessages: prev.promoMessages.map((p, i) => i === id ? { ...p, [field]: value } : p)
      }));
    } else if (type.startsWith('banner')) {
      setBanners(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    }
    
    setHasChanges(true);
  };

  // Toggle section visibility
  const toggleSection = (sectionId) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, enabled: !s.enabled } : s));
    setHasChanges(true);
  };

  // Save all changes
  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all([
        fetch(`${API_URL}/api/storefront/config/logo/${storeName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(headerConfig.logo)
        }),
        fetch(`${API_URL}/api/storefront/config/promo-messages/${storeName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(headerConfig.promoMessages)
        }),
        fetch(`${API_URL}/api/storefront/config/menu/${storeName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(headerConfig.categories)
        }),
      ]);
      toast.success('All changes saved!');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Get preview width based on view mode
  const getPreviewWidth = () => {
    switch (viewMode) {
      case 'tablet': return '768px';
      case 'mobile': return '375px';
      default: return '100%';
    }
  };

  // Inline edit input component
  const InlineInput = ({ value, onSave, onCancel, className = '' }) => (
    <input
      type="text"
      value={value}
      onChange={(e) => setInlineEditValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSave();
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={onSave}
      autoFocus
      className={`bg-transparent border-b-2 border-blue-500 outline-none ${className}`}
      style={{ minWidth: '50px', width: `${value.length + 2}ch` }}
    />
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100" data-testid="website-editor">
      {/* Top Bar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            <span className="font-semibold">Website Editor</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Click to Edit</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Edit Mode Toggle */}
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg">
            <button 
              onClick={() => setEditMode('click')}
              className={`p-1.5 rounded flex items-center gap-1 text-xs ${editMode === 'click' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
              title="Click to Edit"
            >
              <MousePointer className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setEditMode('drag')}
              className={`p-1.5 rounded flex items-center gap-1 text-xs ${editMode === 'drag' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
              title="Drag to Reorder"
            >
              <Move className="w-4 h-4" />
            </button>
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg">
            <button 
              onClick={() => setViewMode('desktop')}
              className={`p-1.5 rounded ${viewMode === 'desktop' ? 'bg-white shadow' : ''}`}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('tablet')}
              className={`p-1.5 rounded ${viewMode === 'tablet' ? 'bg-white shadow' : ''}`}
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('mobile')}
              className={`p-1.5 rounded ${viewMode === 'mobile' ? 'bg-white shadow' : ''}`}
            >
              <Phone className="w-4 h-4" />
            </button>
          </div>
          
          <Button variant="outline" onClick={() => window.open(storefrontUrl, '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            View Live
          </Button>
          
          {hasChanges && (
            <Button onClick={saveAll} disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save All
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Sections */}
        {showLeftPanel && (
          <div className="w-64 bg-white border-r flex flex-col flex-shrink-0">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Sections
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowLeftPanel(false)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-auto p-3 space-y-1">
              {sections.map((section) => (
                <div
                  key={section.id}
                  onClick={() => handleElementClick('section', section.id, section)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                    selectedElement?.id === section.id && selectedElement?.type === 'section'
                      ? 'bg-blue-50 border-blue-200 border' 
                      : 'hover:bg-gray-50 border border-transparent'
                  } ${!section.enabled && 'opacity-50'}`}
                >
                  <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{section.title}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }}
                    className="p-1"
                  >
                    {section.enabled ? (
                      <Eye className="w-4 h-4 text-green-500" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Quick Tip */}
            <div className="p-3 border-t bg-blue-50">
              <p className="text-xs text-blue-700">
                <strong>💡 Tip:</strong> Click any element in the preview to edit it. Double-click text for inline editing.
              </p>
            </div>
          </div>
        )}

        {/* Center - Live Preview */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-200">
          {!showLeftPanel && (
            <Button 
              variant="ghost" 
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white shadow z-10"
              onClick={() => setShowLeftPanel(true)}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}

          <div className="flex-1 overflow-auto p-4">
            <div 
              className="mx-auto bg-white shadow-xl rounded-lg overflow-hidden transition-all"
              style={{ width: getPreviewWidth(), maxWidth: '100%' }}
            >
              {/* PREVIEW: Announcement Bar */}
              {sections.find(s => s.id === 'announcement')?.enabled && (
                <div 
                  className={`bg-black text-white text-center py-2 px-4 text-sm cursor-pointer transition-all ${
                    selectedElement?.type === 'announcement' ? 'ring-2 ring-blue-500 ring-inset' : 'hover:ring-2 hover:ring-blue-300 hover:ring-inset'
                  }`}
                  onClick={() => handleElementClick('announcement', 0, headerConfig.promoMessages[0])}
                >
                  <div className="flex items-center justify-center gap-2">
                    {headerConfig.promoMessages.length > 0 && (
                      <>
                        <span
                          onClick={(e) => { e.stopPropagation(); handleElementClick('promo_emoji', 0, headerConfig.promoMessages[0]); }}
                          className="cursor-pointer hover:scale-125 transition-transform"
                        >
                          {headerConfig.promoMessages[0]?.emoji || '🚚'}
                        </span>
                        {editingInline && selectedElement?.type === 'promo_message' && selectedElement?.id === 0 ? (
                          <InlineInput
                            value={inlineEditValue}
                            onSave={saveInlineEdit}
                            onCancel={() => setEditingInline(false)}
                            className="text-white"
                          />
                        ) : (
                          <span 
                            onDoubleClick={() => handleElementDoubleClick('promo_message', 0, headerConfig.promoMessages[0]?.text)}
                            className="hover:bg-white/10 px-1 rounded cursor-text"
                          >
                            {headerConfig.promoMessages[0]?.text || 'Free shipping on orders over ₹999'}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* PREVIEW: Header */}
              {sections.find(s => s.id === 'header')?.enabled && (
                <div className="bg-white border-b">
                  {/* Logo Bar */}
                  <div className="flex items-center justify-between px-6 py-4">
                    <div 
                      className={`flex items-center gap-1 cursor-pointer transition-all rounded px-2 py-1 ${
                        selectedElement?.type?.startsWith('logo') ? 'ring-2 ring-blue-500' : 'hover:ring-2 hover:ring-blue-300'
                      }`}
                      onClick={() => handleElementClick('logo', 'main', headerConfig.logo)}
                    >
                      {editingInline && selectedElement?.type === 'logo_text' ? (
                        <InlineInput
                          value={inlineEditValue}
                          onSave={saveInlineEdit}
                          onCancel={() => setEditingInline(false)}
                          className="text-2xl font-bold"
                        />
                      ) : (
                        <span 
                          className="text-2xl font-bold hover:bg-gray-100 px-1 rounded cursor-text"
                          onDoubleClick={() => handleElementDoubleClick('logo_text', 'main', headerConfig.logo.text)}
                        >
                          {headerConfig.logo.text}
                        </span>
                      )}
                      {editingInline && selectedElement?.type === 'logo_badge' ? (
                        <InlineInput
                          value={inlineEditValue}
                          onSave={saveInlineEdit}
                          onCancel={() => setEditingInline(false)}
                          className="text-xs font-semibold px-2 py-0.5 rounded"
                          style={{ backgroundColor: headerConfig.logo.badgeColor, color: 'white' }}
                        />
                      ) : (
                        <span 
                          className="text-xs font-semibold px-2 py-0.5 rounded hover:opacity-80 cursor-text"
                          style={{ backgroundColor: headerConfig.logo.badgeColor, color: 'white' }}
                          onDoubleClick={() => handleElementDoubleClick('logo_badge', 'main', headerConfig.logo.badge)}
                        >
                          {headerConfig.logo.badge}
                        </span>
                      )}
                    </div>

                    {/* Search & Icons */}
                    <div className="flex items-center gap-4">
                      <div className="w-64 h-10 bg-gray-100 rounded-full flex items-center px-4 text-gray-400 text-sm">
                        <BoxSelect className="w-4 h-4 mr-2" />
                        Search products...
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-center gap-8 py-3 border-t text-sm font-medium">
                    {headerConfig.categories.map((cat, idx) => {
                      // Handle both string and object categories
                      const catName = typeof cat === 'string' ? cat : cat?.name || 'Category';
                      return (
                        <span 
                          key={idx}
                          onClick={() => handleElementClick('category', idx, cat)}
                          onDoubleClick={() => handleElementDoubleClick('category', idx, catName)}
                          className={`cursor-pointer transition-all px-2 py-1 rounded ${
                            selectedElement?.type === 'category' && selectedElement?.id === idx 
                              ? 'ring-2 ring-blue-500 bg-blue-50' 
                              : 'hover:ring-2 hover:ring-blue-300 hover:bg-gray-50'
                          }`}
                        >
                          {editingInline && selectedElement?.type === 'category' && selectedElement?.id === idx ? (
                            <InlineInput
                              value={inlineEditValue}
                              onSave={saveInlineEdit}
                              onCancel={() => setEditingInline(false)}
                            />
                          ) : (
                            catName
                          )}
                        </span>
                      );
                    })}
                    <button 
                      onClick={() => {
                        setHeaderConfig(prev => ({ ...prev, categories: [...prev.categories, 'NEW'] }));
                        setHasChanges(true);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* PREVIEW: Hero Banners */}
              {sections.find(s => s.id === 'hero')?.enabled && banners.length > 0 && (
                <div className="relative">
                  {banners.slice(0, 1).map((banner) => (
                    <div 
                      key={banner.id}
                      onClick={() => handleElementClick('banner', banner.id, banner)}
                      className={`relative h-96 bg-cover bg-center cursor-pointer transition-all ${
                        selectedElement?.type === 'banner' && selectedElement?.id === banner.id 
                          ? 'ring-4 ring-blue-500 ring-inset' 
                          : 'hover:ring-4 hover:ring-blue-300 hover:ring-inset'
                      }`}
                      style={{ backgroundImage: `url(${banner.image})` }}
                    >
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="text-center text-white">
                          {editingInline && selectedElement?.type === 'banner_title' && selectedElement?.id === banner.id ? (
                            <InlineInput
                              value={inlineEditValue}
                              onSave={saveInlineEdit}
                              onCancel={() => setEditingInline(false)}
                              className="text-4xl font-bold text-white bg-transparent"
                            />
                          ) : (
                            <h2 
                              className="text-4xl font-bold mb-2 hover:bg-white/20 px-4 py-2 rounded cursor-text"
                              onDoubleClick={(e) => { e.stopPropagation(); handleElementDoubleClick('banner_title', banner.id, banner.title); }}
                            >
                              {banner.title}
                            </h2>
                          )}
                          {editingInline && selectedElement?.type === 'banner_subtitle' && selectedElement?.id === banner.id ? (
                            <InlineInput
                              value={inlineEditValue}
                              onSave={saveInlineEdit}
                              onCancel={() => setEditingInline(false)}
                              className="text-xl text-white bg-transparent"
                            />
                          ) : (
                            <p 
                              className="text-xl hover:bg-white/20 px-4 py-1 rounded cursor-text"
                              onDoubleClick={(e) => { e.stopPropagation(); handleElementDoubleClick('banner_subtitle', banner.id, banner.subtitle); }}
                            >
                              {banner.subtitle}
                            </p>
                          )}
                          <button className="mt-4 bg-white text-black px-6 py-2 rounded-full font-semibold hover:bg-gray-100">
                            Shop Now
                          </button>
                        </div>
                      </div>
                      {/* Edit indicator */}
                      {selectedElement?.type === 'banner' && selectedElement?.id === banner.id && (
                        <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                          <Edit3 className="w-4 h-4" />
                          Click text to edit
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* PREVIEW: Categories */}
              {sections.find(s => s.id === 'categories')?.enabled && (
                <div className="py-8 px-6">
                  <h3 className="text-xl font-bold mb-6 text-center">Shop by Category</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {['Men', 'Women', 'Kids', 'Accessories'].map((cat, idx) => (
                      <div key={idx} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center text-gray-600 font-medium hover:bg-gray-300 cursor-pointer">
                        {cat}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PREVIEW: Trending */}
              {sections.find(s => s.id === 'trending')?.enabled && (
                <div className="py-8 px-6 bg-gray-50">
                  <h3 className="text-xl font-bold mb-6">Trending Now</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="aspect-square bg-gray-200 rounded-lg mb-3" />
                        <p className="font-medium text-sm">Product Name</p>
                        <p className="text-gray-500 text-sm">₹1,299</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PREVIEW: Promo Banner */}
              {sections.find(s => s.id === 'promo')?.enabled && (
                <div 
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white py-12 text-center cursor-pointer hover:ring-4 hover:ring-blue-300 hover:ring-inset"
                  onClick={() => handleElementClick('promo_banner', 'main', {})}
                >
                  <h3 className="text-2xl font-bold mb-2">Flash Sale</h3>
                  <p className="text-lg opacity-90">Up to 70% OFF - Limited Time Only!</p>
                  <button className="mt-4 bg-white text-purple-600 px-6 py-2 rounded-full font-semibold">
                    Shop Sale
                  </button>
                </div>
              )}

              {/* PREVIEW: Footer */}
              {sections.find(s => s.id === 'footer')?.enabled && (
                <div className="bg-gray-900 text-white py-12 px-6">
                  <div className="grid grid-cols-4 gap-8">
                    <div>
                      <h4 className="font-bold mb-4">{headerConfig.logo.text}</h4>
                      <p className="text-sm text-gray-400">Your one-stop fashion destination</p>
                    </div>
                    <div>
                      <h4 className="font-bold mb-4">Shop</h4>
                      <ul className="space-y-2 text-sm text-gray-400">
                        <li>Men</li><li>Women</li><li>Kids</li><li>Sale</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold mb-4">Help</h4>
                      <ul className="space-y-2 text-sm text-gray-400">
                        <li>Contact</li><li>Shipping</li><li>Returns</li><li>FAQ</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold mb-4">Follow Us</h4>
                      <div className="flex gap-3 text-gray-400">
                        <span className="hover:text-white cursor-pointer">📘</span>
                        <span className="hover:text-white cursor-pointer">📸</span>
                        <span className="hover:text-white cursor-pointer">🐦</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Element Editor */}
        {selectedElement && (
          <div className="w-80 bg-white border-l flex flex-col flex-shrink-0">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Edit {selectedElement.type.replace('_', ' ')}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedElement(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Logo Editor */}
              {selectedElement.type?.startsWith('logo') && (
                <>
                  <div>
                    <Label className="text-sm">Logo Text</Label>
                    <Input 
                      value={headerConfig.logo.text}
                      onChange={(e) => { setHeaderConfig(prev => ({ ...prev, logo: { ...prev.logo, text: e.target.value } })); setHasChanges(true); }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Badge Text</Label>
                    <Input 
                      value={headerConfig.logo.badge}
                      onChange={(e) => { setHeaderConfig(prev => ({ ...prev, logo: { ...prev.logo, badge: e.target.value } })); setHasChanges(true); }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Badge Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input 
                        type="color"
                        value={headerConfig.logo.badgeColor}
                        onChange={(e) => { setHeaderConfig(prev => ({ ...prev, logo: { ...prev.logo, badgeColor: e.target.value } })); setHasChanges(true); }}
                        className="w-12 h-10 p-1"
                      />
                      <Input 
                        value={headerConfig.logo.badgeColor}
                        onChange={(e) => { setHeaderConfig(prev => ({ ...prev, logo: { ...prev.logo, badgeColor: e.target.value } })); setHasChanges(true); }}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Banner Editor */}
              {selectedElement.type === 'banner' && (
                <>
                  {banners.filter(b => b.id === selectedElement.id).map(banner => (
                    <div key={banner.id} className="space-y-4">
                      <div>
                        <Label className="text-sm">Title</Label>
                        <Input 
                          value={banner.title}
                          onChange={(e) => { setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, title: e.target.value } : b)); setHasChanges(true); }}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Subtitle</Label>
                        <Input 
                          value={banner.subtitle}
                          onChange={(e) => { setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, subtitle: e.target.value } : b)); setHasChanges(true); }}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Image URL</Label>
                        <Input 
                          value={banner.image}
                          onChange={(e) => { setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, image: e.target.value } : b)); setHasChanges(true); }}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Link</Label>
                        <Input 
                          value={banner.link}
                          onChange={(e) => { setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, link: e.target.value } : b)); setHasChanges(true); }}
                          className="mt-1"
                          placeholder="/collection/summer"
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Promo Message Editor */}
              {(selectedElement.type === 'promo_message' || selectedElement.type === 'announcement' || selectedElement.type === 'promo_emoji') && (
                <>
                  <div>
                    <Label className="text-sm">Emoji</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {EMOJI_OPTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            const idx = selectedElement.id || 0;
                            setHeaderConfig(prev => ({
                              ...prev,
                              promoMessages: prev.promoMessages.map((p, i) => i === idx ? { ...p, emoji } : p)
                            }));
                            setHasChanges(true);
                          }}
                          className={`w-8 h-8 rounded flex items-center justify-center hover:bg-gray-100 ${
                            headerConfig.promoMessages[selectedElement.id || 0]?.emoji === emoji ? 'bg-blue-100 ring-2 ring-blue-500' : ''
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">Message Text</Label>
                    <Input 
                      value={headerConfig.promoMessages[selectedElement.id || 0]?.text || ''}
                      onChange={(e) => {
                        const idx = selectedElement.id || 0;
                        setHeaderConfig(prev => ({
                          ...prev,
                          promoMessages: prev.promoMessages.map((p, i) => i === idx ? { ...p, text: e.target.value } : p)
                        }));
                        setHasChanges(true);
                      }}
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              {/* Category Editor */}
              {selectedElement.type === 'category' && (() => {
                const cat = headerConfig.categories[selectedElement.id];
                const catName = typeof cat === 'string' ? cat : cat?.name || '';
                return (
                  <div>
                    <Label className="text-sm">Category Name</Label>
                    <Input 
                      value={catName}
                      onChange={(e) => {
                        setHeaderConfig(prev => ({
                          ...prev,
                          categories: prev.categories.map((c, i) => {
                            if (i !== selectedElement.id) return c;
                            if (typeof c === 'string') return e.target.value;
                            return { ...c, name: e.target.value };
                          })
                        }));
                        setHasChanges(true);
                      }}
                      className="mt-1"
                    />
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="mt-3 w-full"
                      onClick={() => {
                        setHeaderConfig(prev => ({
                          ...prev,
                          categories: prev.categories.filter((_, i) => i !== selectedElement.id)
                        }));
                        setSelectedElement(null);
                        setHasChanges(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Category
                    </Button>
                  </div>
                );
              })()}
            </div>

            {/* Apply Changes */}
            {hasChanges && (
              <div className="p-4 border-t bg-gray-50">
                <Button onClick={saveAll} className="w-full bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4 mr-2" />
                  Apply Changes
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsiteEditorV2;
