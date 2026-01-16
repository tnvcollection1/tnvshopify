import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Smartphone, RefreshCw, Moon, Sun, Home, Search, ShoppingCart, Heart, User,
  ChevronRight, ChevronLeft, ChevronDown, Star, Settings, Bell, Zap, Wifi,
  Battery, Signal, Image, Eye, EyeOff, Plus, Save, X, Palette, Layers,
  BoxSelect, Trash2, Edit3, MousePointer, Check, Type, GripVertical,
  Undo2, Redo2, Copy, Sparkles, Layout, Clock, ImagePlus, FileText, Menu
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Template presets for mobile
const TEMPLATES = {
  minimal: {
    name: 'Minimal',
    icon: '○',
    description: 'Clean & focused',
    sections: ['header', 'hero', 'trending'],
    theme: { accentColor: '#000000', primaryColor: '#000000' }
  },
  vibrant: {
    name: 'Vibrant',
    icon: '◆',
    description: 'Bold & colorful',
    sections: ['header', 'hero', 'categories', 'trending', 'promo'],
    theme: { accentColor: '#FF3366', primaryColor: '#6366F1' }
  },
  elegant: {
    name: 'Elegant',
    icon: '□',
    description: 'Sophisticated look',
    sections: ['header', 'hero', 'categories', 'trending'],
    theme: { accentColor: '#D4AF37', primaryColor: '#1a1a1a' }
  },
  playful: {
    name: 'Playful',
    icon: '◇',
    description: 'Fun & engaging',
    sections: ['header', 'hero', 'categories', 'promo', 'trending'],
    theme: { accentColor: '#EC4899', primaryColor: '#8B5CF6' }
  }
};

// Component library for mobile
const COMPONENT_LIBRARY = [
  { id: 'hero_banner', name: 'Hero Banner', icon: Image, description: 'Featured promotion' },
  { id: 'categories', name: 'Categories', icon: Menu, description: 'Category circles' },
  { id: 'product_grid', name: 'Products', icon: BoxSelect, description: 'Product showcase' },
  { id: 'promo_banner', name: 'Promo', icon: Zap, description: 'Sale banner' },
  { id: 'stories', name: 'Stories', icon: Sparkles, description: 'Instagram-style stories' },
  { id: 'countdown', name: 'Countdown', icon: Clock, description: 'Flash sale timer' },
];

const MobileAppEditorV2 = () => {
  const { selectedStore } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showComponentLibrary, setShowComponentLibrary] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  // Drag and drop state
  const [draggedSection, setDraggedSection] = useState(null);
  const [dragOverSection, setDragOverSection] = useState(null);
  
  // Undo/Redo state
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);
  
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

  // Save state to history for undo/redo
  const saveToHistory = useCallback(() => {
    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.stringify(config));
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [config, historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    isUndoRedo.current = true;
    const prevState = JSON.parse(history[historyIndex - 1]);
    setConfig(prevState);
    setHistoryIndex(prev => prev - 1);
    setHasChanges(true);
    toast.info('Undo');
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    isUndoRedo.current = true;
    const nextState = JSON.parse(history[historyIndex + 1]);
    setConfig(nextState);
    setHistoryIndex(prev => prev + 1);
    setHasChanges(true);
    toast.info('Redo');
  }, [history, historyIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault(); redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); saveConfig();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => { fetchData(); }, [selectedStore]);
  useEffect(() => { if (!loading) saveToHistory(); }, [config, loading]);

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
        toast.success('Changes saved!');
        setHasChanges(false);
        setLastSaved(new Date());
      }
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, sectionId) => {
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, sectionId) => {
    e.preventDefault();
    if (draggedSection !== sectionId) setDragOverSection(sectionId);
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedSection || draggedSection === targetId) return;

    setConfig(prev => {
      const newSections = [...prev.sections];
      const dragIndex = newSections.findIndex(s => s.id === draggedSection);
      const dropIndex = newSections.findIndex(s => s.id === targetId);
      const [removed] = newSections.splice(dragIndex, 1);
      newSections.splice(dropIndex, 0, removed);
      return { ...prev, sections: newSections };
    });

    setDraggedSection(null);
    setDragOverSection(null);
    setHasChanges(true);
    toast.success('Section moved!');
  };

  const handleDragEnd = () => {
    setDraggedSection(null);
    setDragOverSection(null);
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
      sections: prev.sections.map(s => s.id === sectionId ? { ...s, enabled: !s.enabled } : s)
    }));
    setHasChanges(true);
  };

  // Duplicate section
  const duplicateSection = (sectionId) => {
    const section = config.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const newSection = {
      ...JSON.parse(JSON.stringify(section)),
      id: `${section.id}_copy_${Date.now()}`,
    };
    
    setConfig(prev => {
      const idx = prev.sections.findIndex(s => s.id === sectionId);
      const newSections = [...prev.sections];
      newSections.splice(idx + 1, 0, newSection);
      return { ...prev, sections: newSections };
    });
    
    setHasChanges(true);
    toast.success('Section duplicated!');
  };

  // Delete section
  const deleteSection = (sectionId) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
    setSelectedElement(null);
    setHasChanges(true);
    toast.success('Section deleted');
  };

  // Add section from library
  const addSection = (componentType) => {
    const component = COMPONENT_LIBRARY.find(c => c.id === componentType);
    const newSection = {
      id: `${componentType}_${Date.now()}`,
      type: componentType,
      enabled: true,
      settings: {
        title: component?.name || 'New Section',
        bgColor: config.theme.accentColor
      }
    };
    
    setConfig(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
    setShowComponentLibrary(false);
    setHasChanges(true);
    toast.success(`${component?.name || 'Section'} added!`);
  };

  // Apply template
  const applyTemplate = (templateKey) => {
    const template = TEMPLATES[templateKey];
    if (!template) return;

    setConfig(prev => ({
      ...prev,
      theme: { ...prev.theme, ...template.theme },
      sections: prev.sections.map(s => ({
        ...s,
        enabled: template.sections.includes(s.id) || template.sections.includes(s.type)
      }))
    }));

    setShowTemplates(false);
    setHasChanges(true);
    toast.success(`Applied "${template.name}" template!`);
  };

  // Theme colors
  const colors = isDarkMode ? {
    bg: '#0A0A0A', surface: '#1A1A1A', card: '#262626', text: '#FFFFFF',
    textSecondary: '#A0A0A0', border: '#333333', accent: config.theme?.accentColor || '#FF3366', primary: '#FFFFFF'
  } : {
    bg: config.theme?.backgroundColor || '#FAFAFA', surface: '#FFFFFF', card: '#FFFFFF', text: '#1A1A1A',
    textSecondary: '#666666', border: '#E5E5E5', accent: config.theme?.accentColor || '#FF3366', primary: config.theme?.primaryColor || '#000000'
  };

  // Inline edit input
  const InlineInput = ({ value, onSave, onCancel, style = {}, className = '' }) => (
    <input
      type="text"
      value={value}
      onChange={(e) => setInlineEditValue(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
      onBlur={onSave}
      autoFocus
      className={`bg-transparent border-b-2 border-blue-500 outline-none ${className}`}
      style={{ minWidth: '50px', width: `${value.length + 2}ch`, ...style }}
    />
  );

  const isSelected = (type, id) => selectedElement?.type === type && selectedElement?.id === id;

  // Quick Actions Toolbar
  const QuickActionsToolbar = () => {
    if (!selectedElement) return null;
    
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-4">
        <span className="text-sm opacity-70">Quick Actions:</span>
        <button onClick={() => duplicateSection(selectedElement.id)} className="p-2 hover:bg-white/20 rounded-full" title="Duplicate">
          <Copy className="w-4 h-4" />
        </button>
        <button onClick={() => toggleSection(selectedElement.id)} className="p-2 hover:bg-white/20 rounded-full" title="Toggle">
          <Eye className="w-4 h-4" />
        </button>
        <button onClick={() => deleteSection(selectedElement.id)} className="p-2 hover:bg-red-500/50 rounded-full" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-white/30" />
        <button onClick={() => setSelectedElement(null)} className="p-2 hover:bg-white/20 rounded-full" title="Deselect">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

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
            <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full">Pro</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 mr-2">
            <button onClick={undo} disabled={historyIndex <= 0} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30" title="Undo (Ctrl+Z)">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30" title="Redo (Ctrl+Y)">
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Templates */}
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Templates
            </Button>
            {showTemplates && (
              <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-xl border p-3 w-64 z-50">
                <h3 className="font-semibold text-sm mb-2">App Templates</h3>
                <div className="space-y-2">
                  {Object.entries(TEMPLATES).map(([key, template]) => (
                    <button key={key} onClick={() => applyTemplate(key)} className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border transition-all hover:border-blue-300">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{template.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{template.name}</p>
                          <p className="text-xs text-gray-500">{template.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
            <Sun className="w-4 h-4 text-gray-500" />
            <Switch checked={isDarkMode} onCheckedChange={setIsDarkMode} />
            <Moon className="w-4 h-4 text-gray-500" />
          </div>
          
          {/* Save Status */}
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {hasChanges && <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
            <Button onClick={saveConfig} disabled={saving || !hasChanges} className="bg-green-600 hover:bg-green-700">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Sections */}
        {showLeftPanel && (
          <div className="w-72 bg-white border-r flex flex-col flex-shrink-0">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Sections
              </h2>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowComponentLibrary(true)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Add Section">
                  <Plus className="w-4 h-4" />
                </button>
                <Button variant="ghost" size="sm" onClick={() => setShowLeftPanel(false)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-2 space-y-1">
              {config.sections.map((section) => (
                <div
                  key={section.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, section.id)}
                  onDragOver={(e) => handleDragOver(e, section.id)}
                  onDragLeave={() => setDragOverSection(null)}
                  onDrop={(e) => handleDrop(e, section.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleElementClick('section', section.id, section)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${
                    dragOverSection === section.id ? 'border-2 border-blue-500 border-dashed bg-blue-50' :
                    draggedSection === section.id ? 'opacity-50' :
                    isSelected('section', section.id) ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-gray-50 border border-transparent'
                  } ${!section.enabled && 'opacity-50'}`}
                >
                  <div className="cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize truncate">{section.settings?.title || section.type.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-400 truncate">{section.type}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); duplicateSection(section.id); }} className="p-1 hover:bg-gray-200 rounded opacity-60 hover:opacity-100" title="Duplicate">
                      <Copy className="w-3 h-3 text-gray-500" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }} className="p-1">
                      {section.enabled ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Theme Settings */}
            <div className="p-3 border-t">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Theme Colors</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="color" value={config.theme.accentColor} onChange={(e) => { setConfig(prev => ({ ...prev, theme: { ...prev.theme, accentColor: e.target.value } })); setHasChanges(true); }} className="w-8 h-8 rounded cursor-pointer" />
                  <span className="text-xs text-gray-600">Accent</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.theme.primaryColor} onChange={(e) => { setConfig(prev => ({ ...prev, theme: { ...prev.theme, primaryColor: e.target.value } })); setHasChanges(true); }} className="w-8 h-8 rounded cursor-pointer" />
                  <span className="text-xs text-gray-600">Primary</span>
                </div>
              </div>
            </div>

            {/* Shortcuts */}
            <div className="p-3 border-t bg-gray-50">
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
                <span>⌘Z Undo</span>
                <span>⌘Y Redo</span>
                <span>⌘S Save</span>
                <span>Drag sections</span>
              </div>
            </div>
          </div>
        )}

        {/* Center - Phone Preview */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto relative bg-gradient-to-br from-gray-100 to-gray-200">
          {!showLeftPanel && (
            <Button variant="ghost" className="absolute left-4 top-1/2 -translate-y-1/2 bg-white shadow" onClick={() => setShowLeftPanel(true)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
          
          {/* Phone Frame */}
          <div className="relative mx-auto" style={{ width: '320px' }}>
            <div className="rounded-[3rem] p-3 shadow-2xl" style={{ background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <div className="rounded-[2.5rem] overflow-hidden relative" style={{ backgroundColor: colors.bg }}>
                {/* Status bar */}
                <div className="flex justify-between items-center px-6 py-2 text-xs" style={{ backgroundColor: colors.surface }}>
                  <span style={{ color: colors.text }}>9:41</span>
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-24 h-6 bg-black rounded-full" />
                  <div className="flex items-center gap-1" style={{ color: colors.text }}>
                    <Signal className="w-3 h-3" /><Wifi className="w-3 h-3" /><Battery className="w-4 h-3" />
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
                          <div key={section.id} onClick={() => handleElementClick('section', section.id, section)} className="px-4 py-3 flex justify-between items-center" style={{ ...sectionStyle, backgroundColor: colors.surface }}>
                            {editingInline && selectedElement?.type === 'app_name' ? (
                              <InlineInput value={inlineEditValue} onSave={saveInlineEdit} onCancel={() => setEditingInline(false)} style={{ color: colors.text, fontSize: '1.125rem', fontWeight: 'bold' }} />
                            ) : (
                              <h1 className="text-lg font-bold hover:bg-black/10 px-2 py-1 rounded cursor-text" style={{ color: colors.text }} onDoubleClick={(e) => { e.stopPropagation(); handleElementDoubleClick('app_name', 'main', config.app?.name); }}>
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
                          <div key={section.id} onClick={() => handleElementClick('section', section.id, section)} className="mx-4 my-3 h-32 rounded-2xl flex items-end p-4 relative" style={{ ...sectionStyle, background: `linear-gradient(135deg, ${section.settings?.bgColor || colors.accent}, ${section.settings?.bgColor || colors.accent}99)` }}>
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
                              {section.settings?.discount && (
                                <p className="text-white text-xs mt-1">{section.settings?.discount}</p>
                              )}
                            </div>
                            {sectionSelected && (
                              <div className="absolute top-2 right-2 bg-white text-xs px-2 py-1 rounded-full text-gray-700 flex items-center gap-1">
                                <Edit3 className="w-3 h-3" />
                                Double-click
                              </div>
                            )}
                          </div>
                        );

                      case 'categories':
                        return (
                          <div key={section.id} onClick={() => handleElementClick('section', section.id, section)} className="px-4 py-3" style={sectionStyle}>
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-semibold" style={{ color: colors.text }}>{section.settings?.title}</span>
                              {section.settings?.showAll && <span className="text-xs" style={{ color: colors.textSecondary }}>See all →</span>}
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-2">
                              {(section.settings?.items || []).map((item, idx) => (
                                <div key={idx} onClick={(e) => { e.stopPropagation(); handleElementClick('category_item', `${section.id}_${idx}`, item); }} className={`flex-shrink-0 w-16 text-center cursor-pointer ${isSelected('category_item', `${section.id}_${idx}`) ? 'ring-2 ring-blue-500 rounded-xl' : ''}`}>
                                  <div className="w-14 h-14 rounded-full mx-auto mb-1" style={{ backgroundColor: colors.accent + '20' }} />
                                  <span className="text-xs" style={{ color: colors.textSecondary }}>{item}</span>
                                </div>
                              ))}
                              <button onClick={(e) => { e.stopPropagation(); setConfig(prev => ({ ...prev, sections: prev.sections.map(s => s.id === section.id ? { ...s, settings: { ...s.settings, items: [...(s.settings?.items || []), 'New'] } } : s) })); setHasChanges(true); }} className="flex-shrink-0 w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center" style={{ borderColor: colors.border }}>
                                <Plus className="w-5 h-5" style={{ color: colors.textSecondary }} />
                              </button>
                            </div>
                          </div>
                        );

                      case 'product_grid':
                        return (
                          <div key={section.id} onClick={() => handleElementClick('section', section.id, section)} className="px-4 py-3" style={sectionStyle}>
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-semibold" style={{ color: colors.text }}>{section.settings?.title}</span>
                              <span className="text-xs" style={{ color: colors.textSecondary }}>See all →</span>
                            </div>
                            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${section.settings?.columns || 2}, 1fr)` }}>
                              {[1, 2, 3, 4].slice(0, section.settings?.limit || 4).map((i) => (
                                <div key={i} className="rounded-xl p-2" style={{ backgroundColor: colors.card }}>
                                  <div className="aspect-square rounded-lg mb-2 relative" style={{ backgroundColor: colors.border }}>
                                    {section.settings?.showWishlist && <Heart className="absolute top-2 right-2 w-4 h-4" style={{ color: colors.textSecondary }} />}
                                  </div>
                                  <p className="text-xs font-medium truncate" style={{ color: colors.text }}>Product</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs font-bold" style={{ color: colors.accent }}>₹999</span>
                                    {section.settings?.showRatings && <div className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /><span className="text-xs" style={{ color: colors.textSecondary }}>4.5</span></div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );

                      case 'promo_banner':
                        return (
                          <div key={section.id} onClick={() => handleElementClick('section', section.id, section)} className="mx-4 my-3 p-4 rounded-2xl text-center" style={{ ...sectionStyle, backgroundColor: section.settings?.bgColor || '#8B5CF6' }}>
                            <p className="text-white text-lg font-bold">{section.settings?.title}</p>
                            <p className="text-white/80 text-sm">{section.settings?.subtitle}</p>
                          </div>
                        );

                      default:
                        return null;
                    }
                  })}
                </div>

                {/* Tab Bar */}
                <div className="flex justify-around items-center py-2 border-t" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  {[{ icon: Home, label: 'Home', active: true }, { icon: Search, label: 'Browse' }, { icon: ShoppingCart, label: 'Cart' }, { icon: Heart, label: 'Wishlist' }, { icon: User, label: 'Account' }].map((item, idx) => (
                    <div key={idx} className="text-center">
                      <item.icon className="w-5 h-5 mx-auto" style={{ color: item.active ? colors.accent : colors.textSecondary }} />
                      <span className="text-[10px]" style={{ color: item.active ? colors.accent : colors.textSecondary }}>{item.label}</span>
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
                Edit Section
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
                    {section.type === 'header' && (
                      <>
                        <div>
                          <Label className="text-sm">App Name</Label>
                          <Input value={config.app?.name || ''} onChange={(e) => { setConfig(prev => ({ ...prev, app: { ...prev.app, name: e.target.value } })); setHasChanges(true); }} className="mt-1" />
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

                    {section.type === 'hero_banner' && (
                      <>
                        <div><Label className="text-sm">Title</Label><Input value={section.settings?.title || ''} onChange={(e) => updateSectionSetting(section.id, 'title', e.target.value)} className="mt-1" /></div>
                        <div><Label className="text-sm">Subtitle</Label><Input value={section.settings?.subtitle || ''} onChange={(e) => updateSectionSetting(section.id, 'subtitle', e.target.value)} className="mt-1" /></div>
                        <div><Label className="text-sm">Discount Text</Label><Input value={section.settings?.discount || ''} onChange={(e) => updateSectionSetting(section.id, 'discount', e.target.value)} className="mt-1" /></div>
                        <div><Label className="text-sm">Background Color</Label><div className="flex gap-2 mt-1"><input type="color" value={section.settings?.bgColor || '#FF3366'} onChange={(e) => updateSectionSetting(section.id, 'bgColor', e.target.value)} className="w-12 h-10 p-1 rounded" /><Input value={section.settings?.bgColor || '#FF3366'} onChange={(e) => updateSectionSetting(section.id, 'bgColor', e.target.value)} className="flex-1" /></div></div>
                      </>
                    )}

                    {section.type === 'categories' && (
                      <>
                        <div><Label className="text-sm">Section Title</Label><Input value={section.settings?.title || ''} onChange={(e) => updateSectionSetting(section.id, 'title', e.target.value)} className="mt-1" /></div>
                        <div className="flex items-center justify-between"><Label className="text-sm">Show "See All"</Label><Switch checked={section.settings?.showAll} onCheckedChange={(v) => updateSectionSetting(section.id, 'showAll', v)} /></div>
                        <div>
                          <Label className="text-sm">Categories</Label>
                          <div className="space-y-2 mt-2">
                            {(section.settings?.items || []).map((item, idx) => (
                              <div key={idx} className="flex gap-2">
                                <Input value={item} onChange={(e) => { const newItems = [...(section.settings?.items || [])]; newItems[idx] = e.target.value; updateSectionSetting(section.id, 'items', newItems); }} className="flex-1" />
                                <Button variant="ghost" size="sm" onClick={() => { const newItems = (section.settings?.items || []).filter((_, i) => i !== idx); updateSectionSetting(section.id, 'items', newItems); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {section.type === 'product_grid' && (
                      <>
                        <div><Label className="text-sm">Section Title</Label><Input value={section.settings?.title || ''} onChange={(e) => updateSectionSetting(section.id, 'title', e.target.value)} className="mt-1" /></div>
                        <div><Label className="text-sm">Columns</Label><select value={section.settings?.columns || 2} onChange={(e) => updateSectionSetting(section.id, 'columns', parseInt(e.target.value))} className="w-full mt-1 p-2 border rounded-md"><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></div>
                        <div><Label className="text-sm">Products</Label><Input type="number" min={2} max={10} value={section.settings?.limit || 4} onChange={(e) => updateSectionSetting(section.id, 'limit', parseInt(e.target.value))} className="mt-1" /></div>
                        <div className="flex items-center justify-between"><Label className="text-sm">Show Ratings</Label><Switch checked={section.settings?.showRatings} onCheckedChange={(v) => updateSectionSetting(section.id, 'showRatings', v)} /></div>
                        <div className="flex items-center justify-between"><Label className="text-sm">Show Wishlist</Label><Switch checked={section.settings?.showWishlist} onCheckedChange={(v) => updateSectionSetting(section.id, 'showWishlist', v)} /></div>
                      </>
                    )}

                    {section.type === 'promo_banner' && (
                      <>
                        <div><Label className="text-sm">Title</Label><Input value={section.settings?.title || ''} onChange={(e) => updateSectionSetting(section.id, 'title', e.target.value)} className="mt-1" /></div>
                        <div><Label className="text-sm">Subtitle</Label><Input value={section.settings?.subtitle || ''} onChange={(e) => updateSectionSetting(section.id, 'subtitle', e.target.value)} className="mt-1" /></div>
                        <div><Label className="text-sm">Background Color</Label><div className="flex gap-2 mt-1"><input type="color" value={section.settings?.bgColor || '#8B5CF6'} onChange={(e) => updateSectionSetting(section.id, 'bgColor', e.target.value)} className="w-12 h-10 p-1 rounded" /><Input value={section.settings?.bgColor || '#8B5CF6'} onChange={(e) => updateSectionSetting(section.id, 'bgColor', e.target.value)} className="flex-1" /></div></div>
                      </>
                    )}

                    <Button variant="destructive" size="sm" className="w-full mt-4" onClick={() => deleteSection(section.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />Delete Section
                    </Button>
                  </>
                );
              })()}
            </div>

            {hasChanges && (
              <div className="p-4 border-t bg-gray-50">
                <Button onClick={saveConfig} className="w-full bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4 mr-2" />Apply Changes
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Component Library Modal */}
      {showComponentLibrary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowComponentLibrary(false)}>
          <div className="bg-white rounded-xl p-6 w-[500px] max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Plus className="w-5 h-5" />Add Section</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowComponentLibrary(false)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {COMPONENT_LIBRARY.map(component => (
                <button key={component.id} onClick={() => addSection(component.id)} className="p-4 border rounded-xl hover:border-blue-500 hover:bg-blue-50 text-left transition-all">
                  <component.icon className="w-8 h-8 text-blue-500 mb-2" />
                  <p className="font-medium">{component.name}</p>
                  <p className="text-xs text-gray-500">{component.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Toolbar */}
      <QuickActionsToolbar />
    </div>
  );
};

export default MobileAppEditorV2;
