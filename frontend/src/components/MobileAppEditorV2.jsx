import React, { useState, useEffect, useCallback } from 'react';
import { 
  Smartphone, RefreshCw, Moon, Sun, Home, Search, ShoppingCart, Heart, User,
  ChevronRight, ChevronLeft, ChevronDown, Star, Settings, Bell, Zap, Wifi,
  Battery, Signal, Image, Eye, EyeOff, Plus, Save, X, Palette, Layers,
  BoxSelect, Trash2, Edit3, MousePointer, Check, Type, GripVertical
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const MobileAppEditorV2 = () => {
  const { selectedStore } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  
  // Click-to-edit state
  const [selectedElement, setSelectedElement] = useState(null);
  const [editingInline, setEditingInline] = useState(false);
  const [inlineEditValue, setInlineEditValue] = useState('');

  // Configuration
  const [config, setConfig] = useState({
    app: { name: 'TNV Collection', tagline: 'Fashion at your fingertips' },
    theme: { 
      primaryColor: '#000000', 
      accentColor: '#FF3366', 
      backgroundColor: '#FAFAFA',
      darkModeEnabled: true 
    },
    sections: [
      { id: 'header', type: 'header', enabled: true, settings: { showSearch: true, showNotifications: true } },
      { id: 'hero', type: 'hero_banner', enabled: true, settings: { 
        title: 'Summer Collection', 
        subtitle: 'NEW ARRIVALS', 
        discount: 'Up to 50% OFF',
        bgColor: '#FF3366' 
      }},
      { id: 'categories', type: 'categories', enabled: true, settings: { 
        title: 'Categories',
        items: ['Men', 'Women', 'Shoes', 'Bags', 'Watch'],
        showAll: true
      }},
      { id: 'trending', type: 'product_grid', enabled: true, settings: { 
        title: 'Trending',
        columns: 2,
        showRatings: true,
        showWishlist: true,
        limit: 4
      }},
      { id: 'promo', type: 'promo_banner', enabled: true, settings: { 
        title: 'Flash Sale',
        subtitle: 'Ending Soon',
        bgColor: '#8B5CF6'
      }},
    ],
    tabBar: {
      items: ['Home', 'Browse', 'Cart', 'Wishlist', 'Account'],
      activeColor: '#FF3366'
    }
  });

  useEffect(() => {
    fetchData();
  }, [selectedStore]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/mobile-app/settings?store=${selectedStore || 'tnvcollection'}`);
      if (response.ok) {
        const data = await response.json();
        if (data.settings) setConfig(prev => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/mobile-app/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store: selectedStore || 'tnvcollection', settings: config })
      });
      
      if (response.ok) {
        toast.success('Changes saved successfully!');
        setHasChanges(false);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Handle element click
  const handleElementClick = (elementType, elementId, elementData = null) => {
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
    
    if (type === 'app_name') {
      setConfig(prev => ({ ...prev, app: { ...prev.app, name: inlineEditValue } }));
    } else if (type === 'section_title') {
      setConfig(prev => ({
        ...prev,
        sections: prev.sections.map(s => s.id === id ? { ...s, settings: { ...s.settings, title: inlineEditValue } } : s)
      }));
    } else if (type === 'section_subtitle') {
      setConfig(prev => ({
        ...prev,
        sections: prev.sections.map(s => s.id === id ? { ...s, settings: { ...s.settings, subtitle: inlineEditValue } } : s)
      }));
    } else if (type === 'section_discount') {
      setConfig(prev => ({
        ...prev,
        sections: prev.sections.map(s => s.id === id ? { ...s, settings: { ...s.settings, discount: inlineEditValue } } : s)
      }));
    } else if (type === 'category_item') {
      const [sectionId, itemIdx] = id.split('_');
      setConfig(prev => ({
        ...prev,
        sections: prev.sections.map(s => {
          if (s.id === sectionId) {
            const newItems = [...(s.settings?.items || [])];
            newItems[parseInt(itemIdx)] = inlineEditValue;
            return { ...s, settings: { ...s.settings, items: newItems } };
          }
          return s;
        })
      }));
    }
    
    setHasChanges(true);
    setEditingInline(false);
    setInlineEditValue('');
  };

  // Update section setting
  const updateSectionSetting = (sectionId, key, value) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, settings: { ...s.settings, [key]: value } } : s
      )
    }));
    setHasChanges(true);
  };

  // Toggle section
  const toggleSection = (sectionId) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      )
    }));
    setHasChanges(true);
  };

  // Move section
  const moveSection = (sectionId, direction) => {
    setConfig(prev => {
      const sections = [...prev.sections];
      const index = sections.findIndex(s => s.id === sectionId);
      if (direction === 'up' && index > 0) {
        [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
      } else if (direction === 'down' && index < sections.length - 1) {
        [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
      }
      return { ...prev, sections };
    });
    setHasChanges(true);
  };

  // Theme colors
  const colors = isDarkMode ? {
    bg: '#0A0A0A',
    surface: '#1A1A1A',
    card: '#262626',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    border: '#333333',
    accent: config.theme?.accentColor || '#FF3366',
    primary: '#FFFFFF'
  } : {
    bg: config.theme?.backgroundColor || '#FAFAFA',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#666666',
    border: '#E5E5E5',
    accent: config.theme?.accentColor || '#FF3366',
    primary: config.theme?.primaryColor || '#000000'
  };

  // Inline edit input
  const InlineInput = ({ value, onSave, onCancel, style = {}, className = '' }) => (
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
      style={{ minWidth: '50px', width: `${value.length + 2}ch`, ...style }}
    />
  );

  // Check if element is selected
  const isSelected = (type, id) => selectedElement?.type === type && selectedElement?.id === id;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100" data-testid="mobile-app-editor">
      {/* Top Bar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            <span className="font-semibold">Mobile App Editor</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Click to Edit</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
            <Sun className="w-4 h-4 text-gray-500" />
            <Switch checked={isDarkMode} onCheckedChange={setIsDarkMode} />
            <Moon className="w-4 h-4 text-gray-500" />
          </div>
          
          {hasChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              Unsaved
            </span>
          )}
          
          <Button onClick={saveConfig} disabled={saving || !hasChanges} className="bg-green-600 hover:bg-green-700">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
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
            
            <div className="flex-1 overflow-auto p-2 space-y-1">
              {config.sections.map((section, index) => (
                <div
                  key={section.id}
                  onClick={() => handleElementClick('section', section.id, section)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${
                    isSelected('section', section.id)
                      ? 'bg-blue-50 border-blue-200 border' 
                      : 'hover:bg-gray-50 border border-transparent'
                  } ${!section.enabled && 'opacity-50'}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'up'); }} disabled={index === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">
                      <ChevronDown className="w-3 h-3 rotate-180" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'down'); }} disabled={index === config.sections.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize truncate">{section.type.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-500 truncate">{section.settings?.title || 'No title'}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }} className="p-1">
                    {section.enabled ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              ))}
            </div>

            {/* Theme Settings */}
            <div className="p-3 border-t">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Theme Colors</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={config.theme.accentColor}
                    onChange={(e) => { setConfig(prev => ({ ...prev, theme: { ...prev.theme, accentColor: e.target.value } })); setHasChanges(true); }}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <span className="text-xs text-gray-600">Accent Color</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={config.theme.primaryColor}
                    onChange={(e) => { setConfig(prev => ({ ...prev, theme: { ...prev.theme, primaryColor: e.target.value } })); setHasChanges(true); }}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <span className="text-xs text-gray-600">Primary Color</span>
                </div>
              </div>
            </div>

            {/* Quick Tip */}
            <div className="p-3 border-t bg-blue-50">
              <p className="text-xs text-blue-700">
                <strong>💡 Tip:</strong> Click any element in the phone preview to edit it. Double-click text for inline editing.
              </p>
            </div>
          </div>
        )}

        {/* Center - Phone Preview */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto relative">
          {!showLeftPanel && (
            <Button variant="ghost" className="absolute left-4 top-1/2 -translate-y-1/2 bg-white shadow" onClick={() => setShowLeftPanel(true)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
          
          {/* Phone Frame */}
          <div className="relative mx-auto" style={{ width: '320px' }}>
            <div 
              className="rounded-[3rem] p-3 shadow-2xl"
              style={{ background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
            >
              <div className="rounded-[2.5rem] overflow-hidden relative" style={{ backgroundColor: colors.bg }}>
                {/* Status bar */}
                <div className="flex justify-between items-center px-6 py-2 text-xs" style={{ backgroundColor: colors.surface }}>
                  <span style={{ color: colors.text }}>9:41</span>
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-24 h-6 bg-black rounded-full" />
                  <div className="flex items-center gap-1" style={{ color: colors.text }}>
                    <Signal className="w-3 h-3" />
                    <Wifi className="w-3 h-3" />
                    <Battery className="w-4 h-3" />
                  </div>
                </div>
                
                {/* Screen content */}
                <div style={{ height: '540px', overflow: 'auto', backgroundColor: colors.bg }}>
                  {config.sections.filter(s => s.enabled).map((section) => {
                    const sectionSelected = isSelected('section', section.id);
                    const sectionStyle = {
                      cursor: 'pointer',
                      outline: sectionSelected ? `2px solid ${colors.accent}` : 'none',
                      outlineOffset: '-2px',
                      transition: 'outline 0.2s ease',
                    };

                    switch (section.type) {
                      case 'header':
                        return (
                          <div 
                            key={section.id}
                            onClick={() => handleElementClick('section', section.id, section)}
                            className="px-4 py-3 flex justify-between items-center"
                            style={{ ...sectionStyle, backgroundColor: colors.surface }}
                          >
                            {editingInline && selectedElement?.type === 'app_name' ? (
                              <InlineInput
                                value={inlineEditValue}
                                onSave={saveInlineEdit}
                                onCancel={() => setEditingInline(false)}
                                style={{ color: colors.text, fontSize: '1.125rem', fontWeight: 'bold' }}
                              />
                            ) : (
                              <h1 
                                className="text-lg font-bold hover:bg-black/10 px-2 py-1 rounded cursor-text"
                                style={{ color: colors.text }}
                                onDoubleClick={(e) => { e.stopPropagation(); handleElementDoubleClick('app_name', 'main', config.app?.name); }}
                              >
                                {config.app?.name}
                              </h1>
                            )}
                            <div className="flex gap-3">
                              {section.settings?.showSearch && <Search className="w-5 h-5" style={{ color: colors.text }} />}
                              {section.settings?.showNotifications && <Bell className="w-5 h-5" style={{ color: colors.text }} />}
                            </div>
                          </div>
                        );

                      case 'hero_banner':
                        return (
                          <div 
                            key={section.id}
                            onClick={() => handleElementClick('section', section.id, section)}
                            className="mx-4 my-3 h-32 rounded-2xl flex items-end p-4 relative"
                            style={{ 
                              ...sectionStyle,
                              background: `linear-gradient(135deg, ${section.settings?.bgColor || colors.accent}, ${section.settings?.bgColor || colors.accent}99)` 
                            }}
                          >
                            <div>
                              {editingInline && selectedElement?.type === 'section_subtitle' && selectedElement?.id === section.id ? (
                                <InlineInput value={inlineEditValue} onSave={saveInlineEdit} onCancel={() => setEditingInline(false)} className="text-white text-xs opacity-80" />
                              ) : (
                                <p className="text-white text-xs opacity-80 hover:bg-white/20 px-1 rounded cursor-text" onDoubleClick={(e) => { e.stopPropagation(); handleElementDoubleClick('section_subtitle', section.id, section.settings?.subtitle); }}>
                                  {section.settings?.subtitle}
                                </p>
                              )}
                              {editingInline && selectedElement?.type === 'section_title' && selectedElement?.id === section.id ? (
                                <InlineInput value={inlineEditValue} onSave={saveInlineEdit} onCancel={() => setEditingInline(false)} className="text-white text-xl font-bold" />
                              ) : (
                                <p className="text-white text-xl font-bold hover:bg-white/20 px-1 rounded cursor-text" onDoubleClick={(e) => { e.stopPropagation(); handleElementDoubleClick('section_title', section.id, section.settings?.title); }}>
                                  {section.settings?.title}
                                </p>
                              )}
                              {editingInline && selectedElement?.type === 'section_discount' && selectedElement?.id === section.id ? (
                                <InlineInput value={inlineEditValue} onSave={saveInlineEdit} onCancel={() => setEditingInline(false)} className="text-white text-xs mt-1" />
                              ) : (
                                <p className="text-white text-xs mt-1 hover:bg-white/20 px-1 rounded cursor-text" onDoubleClick={(e) => { e.stopPropagation(); handleElementDoubleClick('section_discount', section.id, section.settings?.discount); }}>
                                  {section.settings?.discount}
                                </p>
                              )}
                            </div>
                            {sectionSelected && (
                              <div className="absolute top-2 right-2 bg-white text-xs px-2 py-1 rounded-full text-gray-700 flex items-center gap-1">
                                <Edit3 className="w-3 h-3" />
                                Double-click text
                              </div>
                            )}
                          </div>
                        );

                      case 'categories':
                        return (
                          <div 
                            key={section.id}
                            onClick={() => handleElementClick('section', section.id, section)}
                            className="px-4 py-3"
                            style={sectionStyle}
                          >
                            <div className="flex justify-between items-center mb-3">
                              {editingInline && selectedElement?.type === 'section_title' && selectedElement?.id === section.id ? (
                                <InlineInput value={inlineEditValue} onSave={saveInlineEdit} onCancel={() => setEditingInline(false)} style={{ color: colors.text, fontWeight: 600 }} />
                              ) : (
                                <span className="font-semibold hover:bg-black/10 px-1 rounded cursor-text" style={{ color: colors.text }} onDoubleClick={(e) => { e.stopPropagation(); handleElementDoubleClick('section_title', section.id, section.settings?.title); }}>
                                  {section.settings?.title}
                                </span>
                              )}
                              {section.settings?.showAll && <span className="text-xs" style={{ color: colors.textSecondary }}>See all →</span>}
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-2">
                              {(section.settings?.items || []).map((item, idx) => (
                                <div 
                                  key={idx}
                                  onClick={(e) => { e.stopPropagation(); handleElementClick('category_item', `${section.id}_${idx}`, item); }}
                                  className={`flex-shrink-0 w-16 text-center cursor-pointer transition-all ${
                                    isSelected('category_item', `${section.id}_${idx}`) ? 'ring-2 ring-blue-500 rounded-xl' : ''
                                  }`}
                                >
                                  <div className="w-14 h-14 rounded-full mx-auto mb-1" style={{ backgroundColor: colors.accent + '20' }} />
                                  {editingInline && selectedElement?.type === 'category_item' && selectedElement?.id === `${section.id}_${idx}` ? (
                                    <InlineInput value={inlineEditValue} onSave={saveInlineEdit} onCancel={() => setEditingInline(false)} className="text-xs" style={{ color: colors.textSecondary }} />
                                  ) : (
                                    <span 
                                      className="text-xs hover:bg-black/10 px-1 rounded cursor-text" 
                                      style={{ color: colors.textSecondary }}
                                      onDoubleClick={(e) => { e.stopPropagation(); handleElementDoubleClick('category_item', `${section.id}_${idx}`, item); }}
                                    >
                                      {item}
                                    </span>
                                  )}
                                </div>
                              ))}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfig(prev => ({
                                    ...prev,
                                    sections: prev.sections.map(s => 
                                      s.id === section.id ? { ...s, settings: { ...s.settings, items: [...(s.settings?.items || []), 'New'] } } : s
                                    )
                                  }));
                                  setHasChanges(true);
                                }}
                                className="flex-shrink-0 w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center"
                                style={{ borderColor: colors.border }}
                              >
                                <Plus className="w-5 h-5" style={{ color: colors.textSecondary }} />
                              </button>
                            </div>
                          </div>
                        );

                      case 'product_grid':
                        return (
                          <div 
                            key={section.id}
                            onClick={() => handleElementClick('section', section.id, section)}
                            className="px-4 py-3"
                            style={sectionStyle}
                          >
                            <div className="flex justify-between items-center mb-3">
                              {editingInline && selectedElement?.type === 'section_title' && selectedElement?.id === section.id ? (
                                <InlineInput value={inlineEditValue} onSave={saveInlineEdit} onCancel={() => setEditingInline(false)} style={{ color: colors.text, fontWeight: 600 }} />
                              ) : (
                                <span className="font-semibold hover:bg-black/10 px-1 rounded cursor-text" style={{ color: colors.text }} onDoubleClick={(e) => { e.stopPropagation(); handleElementDoubleClick('section_title', section.id, section.settings?.title); }}>
                                  {section.settings?.title}
                                </span>
                              )}
                              <span className="text-xs" style={{ color: colors.textSecondary }}>See all →</span>
                            </div>
                            <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${section.settings?.columns || 2}, 1fr)` }}>
                              {[1, 2, 3, 4].slice(0, section.settings?.limit || 4).map((i) => (
                                <div key={i} className="rounded-xl p-2" style={{ backgroundColor: colors.card }}>
                                  <div className="aspect-square rounded-lg mb-2 relative" style={{ backgroundColor: colors.border }}>
                                    {section.settings?.showWishlist && (
                                      <Heart className="absolute top-2 right-2 w-4 h-4" style={{ color: colors.textSecondary }} />
                                    )}
                                  </div>
                                  <p className="text-xs font-medium truncate" style={{ color: colors.text }}>Product Name</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs font-bold" style={{ color: colors.accent }}>₹999</span>
                                    {section.settings?.showRatings && (
                                      <div className="flex items-center gap-0.5">
                                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                        <span className="text-xs" style={{ color: colors.textSecondary }}>4.5</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );

                      case 'promo_banner':
                        return (
                          <div 
                            key={section.id}
                            onClick={() => handleElementClick('section', section.id, section)}
                            className="mx-4 my-3 p-4 rounded-2xl text-center"
                            style={{ 
                              ...sectionStyle,
                              backgroundColor: section.settings?.bgColor || '#8B5CF6' 
                            }}
                          >
                            {editingInline && selectedElement?.type === 'section_title' && selectedElement?.id === section.id ? (
                              <InlineInput value={inlineEditValue} onSave={saveInlineEdit} onCancel={() => setEditingInline(false)} className="text-white text-lg font-bold" />
                            ) : (
                              <p className="text-white text-lg font-bold hover:bg-white/20 px-2 py-1 rounded cursor-text inline-block" onDoubleClick={(e) => { e.stopPropagation(); handleElementDoubleClick('section_title', section.id, section.settings?.title); }}>
                                {section.settings?.title}
                              </p>
                            )}
                            <br />
                            {editingInline && selectedElement?.type === 'section_subtitle' && selectedElement?.id === section.id ? (
                              <InlineInput value={inlineEditValue} onSave={saveInlineEdit} onCancel={() => setEditingInline(false)} className="text-white/80 text-sm" />
                            ) : (
                              <p className="text-white/80 text-sm hover:bg-white/20 px-2 py-1 rounded cursor-text inline-block" onDoubleClick={(e) => { e.stopPropagation(); handleElementDoubleClick('section_subtitle', section.id, section.settings?.subtitle); }}>
                                {section.settings?.subtitle}
                              </p>
                            )}
                          </div>
                        );

                      default:
                        return null;
                    }
                  })}
                </div>

                {/* Tab Bar */}
                <div className="flex justify-around items-center py-2 border-t" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  {[
                    { icon: Home, label: 'Home', active: true },
                    { icon: Search, label: 'Browse' },
                    { icon: ShoppingCart, label: 'Cart' },
                    { icon: Heart, label: 'Wishlist' },
                    { icon: User, label: 'Account' }
                  ].map((item, idx) => (
                    <div key={idx} className="text-center">
                      <item.icon 
                        className="w-5 h-5 mx-auto" 
                        style={{ color: item.active ? colors.accent : colors.textSecondary }}
                      />
                      <span className="text-[10px]" style={{ color: item.active ? colors.accent : colors.textSecondary }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Element Editor */}
        {selectedElement && (
          <div className="w-80 bg-white border-l flex flex-col flex-shrink-0">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Edit {selectedElement.type === 'section' ? config.sections.find(s => s.id === selectedElement.id)?.type.replace('_', ' ') : selectedElement.type.replace('_', ' ')}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedElement(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {selectedElement.type === 'section' && (() => {
                const section = config.sections.find(s => s.id === selectedElement.id);
                if (!section) return null;

                return (
                  <>
                    {/* Header Settings */}
                    {section.type === 'header' && (
                      <>
                        <div>
                          <Label className="text-sm">App Name</Label>
                          <Input 
                            value={config.app?.name || ''}
                            onChange={(e) => { setConfig(prev => ({ ...prev, app: { ...prev.app, name: e.target.value } })); setHasChanges(true); }}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Show Search</Label>
                          <Switch checked={section.settings?.showSearch} onCheckedChange={(v) => updateSectionSetting(section.id, 'showSearch', v)} />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Show Notifications</Label>
                          <Switch checked={section.settings?.showNotifications} onCheckedChange={(v) => updateSectionSetting(section.id, 'showNotifications', v)} />
                        </div>
                      </>
                    )}

                    {/* Hero Banner Settings */}
                    {section.type === 'hero_banner' && (
                      <>
                        <div>
                          <Label className="text-sm">Title</Label>
                          <Input value={section.settings?.title || ''} onChange={(e) => updateSectionSetting(section.id, 'title', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-sm">Subtitle</Label>
                          <Input value={section.settings?.subtitle || ''} onChange={(e) => updateSectionSetting(section.id, 'subtitle', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-sm">Discount Text</Label>
                          <Input value={section.settings?.discount || ''} onChange={(e) => updateSectionSetting(section.id, 'discount', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-sm">Background Color</Label>
                          <div className="flex gap-2 mt-1">
                            <input type="color" value={section.settings?.bgColor || '#FF3366'} onChange={(e) => updateSectionSetting(section.id, 'bgColor', e.target.value)} className="w-12 h-10 p-1 rounded" />
                            <Input value={section.settings?.bgColor || '#FF3366'} onChange={(e) => updateSectionSetting(section.id, 'bgColor', e.target.value)} className="flex-1" />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Categories Settings */}
                    {section.type === 'categories' && (
                      <>
                        <div>
                          <Label className="text-sm">Section Title</Label>
                          <Input value={section.settings?.title || ''} onChange={(e) => updateSectionSetting(section.id, 'title', e.target.value)} className="mt-1" />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Show "See All"</Label>
                          <Switch checked={section.settings?.showAll} onCheckedChange={(v) => updateSectionSetting(section.id, 'showAll', v)} />
                        </div>
                        <div>
                          <Label className="text-sm">Categories ({section.settings?.items?.length || 0})</Label>
                          <div className="space-y-2 mt-2">
                            {(section.settings?.items || []).map((item, idx) => (
                              <div key={idx} className="flex gap-2">
                                <Input 
                                  value={item}
                                  onChange={(e) => {
                                    const newItems = [...(section.settings?.items || [])];
                                    newItems[idx] = e.target.value;
                                    updateSectionSetting(section.id, 'items', newItems);
                                  }}
                                  className="flex-1"
                                />
                                <Button variant="ghost" size="sm" onClick={() => {
                                  const newItems = (section.settings?.items || []).filter((_, i) => i !== idx);
                                  updateSectionSetting(section.id, 'items', newItems);
                                }}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Product Grid Settings */}
                    {section.type === 'product_grid' && (
                      <>
                        <div>
                          <Label className="text-sm">Section Title</Label>
                          <Input value={section.settings?.title || ''} onChange={(e) => updateSectionSetting(section.id, 'title', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-sm">Columns</Label>
                          <select 
                            value={section.settings?.columns || 2}
                            onChange={(e) => updateSectionSetting(section.id, 'columns', parseInt(e.target.value))}
                            className="w-full mt-1 p-2 border rounded-md"
                          >
                            <option value={1}>1 Column</option>
                            <option value={2}>2 Columns</option>
                            <option value={3}>3 Columns</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-sm">Products to Show</Label>
                          <Input type="number" min={2} max={10} value={section.settings?.limit || 4} onChange={(e) => updateSectionSetting(section.id, 'limit', parseInt(e.target.value))} className="mt-1" />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Show Ratings</Label>
                          <Switch checked={section.settings?.showRatings} onCheckedChange={(v) => updateSectionSetting(section.id, 'showRatings', v)} />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Show Wishlist Icon</Label>
                          <Switch checked={section.settings?.showWishlist} onCheckedChange={(v) => updateSectionSetting(section.id, 'showWishlist', v)} />
                        </div>
                      </>
                    )}

                    {/* Promo Banner Settings */}
                    {section.type === 'promo_banner' && (
                      <>
                        <div>
                          <Label className="text-sm">Title</Label>
                          <Input value={section.settings?.title || ''} onChange={(e) => updateSectionSetting(section.id, 'title', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-sm">Subtitle</Label>
                          <Input value={section.settings?.subtitle || ''} onChange={(e) => updateSectionSetting(section.id, 'subtitle', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-sm">Background Color</Label>
                          <div className="flex gap-2 mt-1">
                            <input type="color" value={section.settings?.bgColor || '#8B5CF6'} onChange={(e) => updateSectionSetting(section.id, 'bgColor', e.target.value)} className="w-12 h-10 p-1 rounded" />
                            <Input value={section.settings?.bgColor || '#8B5CF6'} onChange={(e) => updateSectionSetting(section.id, 'bgColor', e.target.value)} className="flex-1" />
                          </div>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}

              {/* Category Item Editor */}
              {selectedElement.type === 'category_item' && (
                <div>
                  <Label className="text-sm">Category Name</Label>
                  <Input 
                    value={selectedElement.data || ''}
                    onChange={(e) => {
                      const [sectionId, itemIdx] = selectedElement.id.split('_');
                      setConfig(prev => ({
                        ...prev,
                        sections: prev.sections.map(s => {
                          if (s.id === sectionId) {
                            const newItems = [...(s.settings?.items || [])];
                            newItems[parseInt(itemIdx)] = e.target.value;
                            return { ...s, settings: { ...s.settings, items: newItems } };
                          }
                          return s;
                        })
                      }));
                      setSelectedElement(prev => ({ ...prev, data: e.target.value }));
                      setHasChanges(true);
                    }}
                    className="mt-1"
                  />
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="mt-3 w-full"
                    onClick={() => {
                      const [sectionId, itemIdx] = selectedElement.id.split('_');
                      setConfig(prev => ({
                        ...prev,
                        sections: prev.sections.map(s => {
                          if (s.id === sectionId) {
                            const newItems = (s.settings?.items || []).filter((_, i) => i !== parseInt(itemIdx));
                            return { ...s, settings: { ...s.settings, items: newItems } };
                          }
                          return s;
                        })
                      }));
                      setSelectedElement(null);
                      setHasChanges(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Category
                  </Button>
                </div>
              )}
            </div>

            {/* Apply Changes */}
            {hasChanges && (
              <div className="p-4 border-t bg-gray-50">
                <Button onClick={saveConfig} className="w-full bg-green-600 hover:bg-green-700">
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

export default MobileAppEditorV2;
