import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Monitor, RefreshCw, ChevronRight, ChevronLeft, ChevronDown,
  Settings, Image, Eye, EyeOff, Plus, Save, X, Palette, Layers,
  Tablet, Smartphone as Phone, ExternalLink, Edit3, Trash2, GripVertical,
  Undo2, Redo2, Copy, Sparkles, Clock, Search, User, Heart, ShoppingBag, Globe
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';
// Import actual store components for live preview
import { TNVStoreProvider, TNVHeader, TNVFooter } from './store/TNVStoreLayout';
import TNVHomePage from './store/TNVHomePage';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Template presets
const TEMPLATES = {
  namshi: { name: 'Namshi Style', icon: '🛍️', description: 'Middle East fashion' },
  minimal: { name: 'Minimal', icon: '○', description: 'Clean & simple' },
  bold: { name: 'Bold', icon: '◆', description: 'Eye-catching' },
};

const WebsiteEditorV2 = () => {
  const { selectedStore } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState('desktop');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  
  // Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);

  // Store configuration - matches actual TNV store
  const [config, setConfig] = useState({
    // Announcement bar
    announcement: {
      enabled: true,
      messages: [
        { text: 'Cash On Delivery', enabled: true },
        { text: 'Free Delivery and Exchange', enabled: true },
        { text: '100% Genuine Products', enabled: true },
      ],
      bgColor: '#000000',
      textColor: '#ffffff'
    },
    // Logo
    logo: {
      text: 'TNV',
      badge: 'COLLECTION',
      badgeColor: '#FF6B9D'
    },
    // Category tabs (like Namshi)
    categoryTabs: [
      { id: 1, name: 'TNV', path: '/', image: '', bgColor: '#c8e6c9', enabled: true },
      { id: 2, name: 'FASHION', path: '/fashion', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=100', bgColor: '#f8e5e5', enabled: true },
      { id: 3, name: 'Beauty', path: '/beauty', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=100', bgColor: '#f5f5f5', enabled: true },
      { id: 4, name: 'BAGS & KIDS', path: '/bags', image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=100', bgColor: '#ffe0b2', enabled: true },
      { id: 5, name: 'HOME & MORE', path: '/home', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100', bgColor: '#b2dfdb', enabled: true },
      { id: 6, name: 'PREMIUM', path: '/premium', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=100', bgColor: '#f5f5f5', enabled: true },
    ],
    // Sub navigation
    subNav: [
      { id: 1, name: 'WOMEN', path: '/women', enabled: true },
      { id: 2, name: 'CLOTHING', path: '/clothing', enabled: true },
      { id: 3, name: 'SHOES', path: '/shoes', enabled: true },
      { id: 4, name: 'ACCESSORIES', path: '/accessories', enabled: true },
      { id: 5, name: 'BAGS', path: '/bags', enabled: true },
      { id: 6, name: 'SPORTS', path: '/sports', enabled: true },
      { id: 7, name: 'NEW ARRIVALS', path: '/new', enabled: true, highlight: true },
      { id: 8, name: 'PREMIUM', path: '/premium', enabled: true },
      { id: 9, name: 'SALE', path: '/sale', enabled: true, isRed: true },
      { id: 10, name: 'BRANDS', path: '/brands', enabled: true },
    ],
    // Hero banner
    heroBanner: {
      title: 'Test Banner',
      subtitle: 'This is a test',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
      link: '/shop',
      enabled: true
    },
    // Region settings
    region: {
      flag: '🇦🇪',
      code: 'AE',
      name: 'UAE',
      showLanguageToggle: true
    }
  });

  const storeName = selectedStore || 'tnvcollection';
  const storefrontUrl = `/tnv`;

  // Fetch existing config
  useEffect(() => {
    fetchConfig();
  }, [selectedStore]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const [navRes, bannersRes, tabsRes] = await Promise.all([
        fetch(`${API_URL}/api/storefront/config/navigation/${storeName}`),
        fetch(`${API_URL}/api/storefront/banners/hero/${storeName}`),
        fetch(`${API_URL}/api/storefront/banners/category-tabs/${storeName}`)
      ]);

      if (navRes.ok) {
        const data = await navRes.json();
        if (data.logo) setConfig(prev => ({ ...prev, logo: data.logo }));
        if (data.promoMessages) setConfig(prev => ({ 
          ...prev, 
          announcement: { ...prev.announcement, messages: data.promoMessages }
        }));
      }
      
      if (bannersRes.ok) {
        const data = await bannersRes.json();
        if (data.banners?.[0]) {
          setConfig(prev => ({ 
            ...prev, 
            heroBanner: { ...prev.heroBanner, ...data.banners[0] }
          }));
        }
      }
      
      if (tabsRes.ok) {
        const data = await tabsRes.json();
        if (data.categoryTabs) setConfig(prev => ({ ...prev, categoryTabs: data.categoryTabs }));
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save to history
  const saveToHistory = useCallback(() => {
    if (isUndoRedo.current) { isUndoRedo.current = false; return; }
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.stringify(config));
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [config, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    isUndoRedo.current = true;
    setConfig(JSON.parse(history[historyIndex - 1]));
    setHistoryIndex(prev => prev - 1);
    setHasChanges(true);
    toast.info('Undo');
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    isUndoRedo.current = true;
    setConfig(JSON.parse(history[historyIndex + 1]));
    setHistoryIndex(prev => prev + 1);
    setHasChanges(true);
    toast.info('Redo');
  }, [history, historyIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveAll(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => { if (!loading) saveToHistory(); }, [config, loading]);

  // Handle element selection
  const handleElementClick = (type, id, data) => {
    setSelectedElement({ type, id, data });
  };

  // Update config
  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let obj = newConfig;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return newConfig;
    });
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
          body: JSON.stringify(config.logo)
        }),
        fetch(`${API_URL}/api/storefront/config/promo-messages/${storeName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config.announcement.messages)
        }),
        fetch(`${API_URL}/api/storefront/banners/category-tabs/${storeName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryTabs: config.categoryTabs })
        }),
      ]);
      setLastSaved(new Date());
      toast.success('Saved!');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const getPreviewWidth = () => {
    switch (viewMode) {
      case 'tablet': return '768px';
      case 'mobile': return '375px';
      default: return '100%';
    }
  };

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
            <span className="font-semibold">Storefront Editor</span>
            <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full">Pro</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-2">
            <button onClick={undo} disabled={historyIndex <= 0} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30" title="Undo">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30" title="Redo">
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg">
            <button onClick={() => setViewMode('desktop')} className={`p-1.5 rounded ${viewMode === 'desktop' ? 'bg-white shadow' : ''}`}>
              <Monitor className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('tablet')} className={`p-1.5 rounded ${viewMode === 'tablet' ? 'bg-white shadow' : ''}`}>
              <Tablet className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('mobile')} className={`p-1.5 rounded ${viewMode === 'mobile' ? 'bg-white shadow' : ''}`}>
              <Phone className="w-4 h-4" />
            </button>
          </div>
          
          <Button variant="outline" size="sm" onClick={() => window.open(storefrontUrl, '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />View Live
          </Button>
          
          {lastSaved && <span className="text-xs text-gray-400"><Clock className="w-3 h-3 inline mr-1" />{lastSaved.toLocaleTimeString()}</span>}
          {hasChanges && <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
          
          <Button onClick={saveAll} disabled={saving || !hasChanges} className="bg-green-600 hover:bg-green-700">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}Save
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Sections */}
        {showLeftPanel && (
          <div className="w-72 bg-white border-r flex flex-col flex-shrink-0">
            <div className="p-4 border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4" />Sections
              </h2>
            </div>
            
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {/* Announcement Bar */}
              <div 
                onClick={() => handleElementClick('announcement', 'bar', config.announcement)}
                className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedElement?.type === 'announcement' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Announcement Bar</span>
                  <Switch checked={config.announcement.enabled} onCheckedChange={(v) => updateConfig('announcement.enabled', v)} />
                </div>
              </div>

              {/* Header/Logo */}
              <div 
                onClick={() => handleElementClick('logo', 'main', config.logo)}
                className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedElement?.type === 'logo' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}
              >
                <span className="font-medium text-sm">Header & Logo</span>
              </div>

              {/* Category Tabs */}
              <div 
                onClick={() => handleElementClick('categoryTabs', 'all', config.categoryTabs)}
                className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedElement?.type === 'categoryTabs' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}
              >
                <span className="font-medium text-sm">Category Tabs</span>
                <p className="text-xs text-gray-500">{config.categoryTabs.length} tabs</p>
              </div>

              {/* Sub Navigation */}
              <div 
                onClick={() => handleElementClick('subNav', 'all', config.subNav)}
                className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedElement?.type === 'subNav' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}
              >
                <span className="font-medium text-sm">Sub Navigation</span>
                <p className="text-xs text-gray-500">{config.subNav.length} items</p>
              </div>

              {/* Hero Banner */}
              <div 
                onClick={() => handleElementClick('heroBanner', 'main', config.heroBanner)}
                className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedElement?.type === 'heroBanner' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Hero Banner</span>
                  <Switch checked={config.heroBanner.enabled} onCheckedChange={(v) => updateConfig('heroBanner.enabled', v)} />
                </div>
              </div>

              {/* Region Settings */}
              <div 
                onClick={() => handleElementClick('region', 'settings', config.region)}
                className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedElement?.type === 'region' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}
              >
                <span className="font-medium text-sm">Region & Language</span>
                <p className="text-xs text-gray-500">{config.region.flag} {config.region.name}</p>
              </div>
            </div>

            <div className="p-3 border-t bg-gray-50 text-xs text-gray-500">
              <p>⌘Z Undo · ⌘Y Redo · ⌘S Save</p>
            </div>
          </div>
        )}

        {/* Center - Preview (ACTUAL LIVE STOREFRONT) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-200">
          {/* Preview Mode Indicator */}
          <div className="bg-blue-600 text-white text-xs py-1 px-4 flex items-center justify-center gap-2">
            <Eye className="w-3 h-3" />
            <span>Live Preview - Changes sync in real-time</span>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            <div 
              className="mx-auto bg-white shadow-xl rounded-lg overflow-hidden transition-all"
              style={{ width: getPreviewWidth(), maxWidth: '100%' }}
            >
              {/* Render the ACTUAL TNV Store Components */}
              <TNVStoreProvider storeName={storeName}>
                {/* Clickable overlay zones for editing */}
                <div className="relative">
                  {/* Header Section with Edit Overlay */}
                  <div 
                    className={`relative ${selectedElement?.type === 'header' ? 'ring-4 ring-blue-500 ring-inset' : ''}`}
                    onClick={() => handleElementClick('header', 'main', { logo: config.logo, announcement: config.announcement })}
                  >
                    <TNVHeader />
                    {/* Edit indicator on hover */}
                    <div className="absolute inset-0 bg-blue-500/0 hover:bg-blue-500/10 transition-colors cursor-pointer flex items-start justify-end p-2 pointer-events-none group-hover:pointer-events-auto">
                      <span className="opacity-0 group-hover:opacity-100 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        Click to edit header
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Main Content - Actual TNVHomePage */}
                <div className="relative">
                  <TNVHomePage />
                  
                  {/* Floating edit controls for sections */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleElementClick('heroBanner', 'main', config.heroBanner); }}
                      className="bg-white shadow-lg rounded-full p-2 hover:bg-blue-50 transition-colors"
                      title="Edit Hero Banner"
                    >
                      <Edit3 className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>
                
                {/* Footer */}
                <TNVFooter />
              </TNVStoreProvider>
            </div>
          </div>
          
          {/* Quick Actions Bar */}
          <div className="bg-white border-t px-4 py-2 flex items-center justify-between text-xs text-gray-500">
            <span>Preview: {storeName}</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Connected to live store
              </span>
              <button 
                onClick={fetchConfig}
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Editor */}
        {selectedElement && (
          <div className="w-80 bg-white border-l flex flex-col flex-shrink-0">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold"><Edit3 className="w-4 h-4 inline mr-2" />Edit {selectedElement.type}</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedElement(null)}><X className="w-4 h-4" /></Button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Announcement Editor */}
              {selectedElement.type === 'announcement' && (
                <>
                  <div className="flex items-center justify-between">
                    <Label>Enabled</Label>
                    <Switch checked={config.announcement.enabled} onCheckedChange={(v) => updateConfig('announcement.enabled', v)} />
                  </div>
                  <div>
                    <Label>Messages</Label>
                    {config.announcement.messages.map((msg, idx) => (
                      <div key={idx} className="flex gap-2 mt-2">
                        <Input 
                          value={msg.text} 
                          onChange={(e) => {
                            const newMsgs = [...config.announcement.messages];
                            newMsgs[idx].text = e.target.value;
                            updateConfig('announcement.messages', newMsgs);
                          }}
                        />
                        <Button variant="ghost" size="sm" onClick={() => {
                          const newMsgs = config.announcement.messages.filter((_, i) => i !== idx);
                          updateConfig('announcement.messages', newMsgs);
                        }}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => {
                      updateConfig('announcement.messages', [...config.announcement.messages, { text: 'New message', enabled: true }]);
                    }}>
                      <Plus className="w-4 h-4 mr-2" />Add Message
                    </Button>
                  </div>
                </>
              )}

              {/* Logo Editor */}
              {selectedElement.type === 'logo' && (
                <>
                  <div>
                    <Label>Logo Text</Label>
                    <Input value={config.logo.text} onChange={(e) => updateConfig('logo.text', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Badge Text</Label>
                    <Input value={config.logo.badge} onChange={(e) => updateConfig('logo.badge', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Badge Color</Label>
                    <div className="flex gap-2 mt-1">
                      <input type="color" value={config.logo.badgeColor} onChange={(e) => updateConfig('logo.badgeColor', e.target.value)} className="w-12 h-10" />
                      <Input value={config.logo.badgeColor} onChange={(e) => updateConfig('logo.badgeColor', e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {/* Category Tabs Editor */}
              {selectedElement.type === 'categoryTabs' && (
                <>
                  <p className="text-sm text-gray-500">Edit category tabs displayed in the header</p>
                  {config.categoryTabs.map((tab, idx) => (
                    <div key={tab.id || idx} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Input value={tab.name} onChange={(e) => {
                          const newTabs = [...config.categoryTabs];
                          newTabs[idx].name = e.target.value;
                          updateConfig('categoryTabs', newTabs);
                        }} className="font-medium" />
                        <Switch checked={tab.enabled} onCheckedChange={(v) => {
                          const newTabs = [...config.categoryTabs];
                          newTabs[idx].enabled = v;
                          updateConfig('categoryTabs', newTabs);
                        }} />
                      </div>
                      <Input placeholder="Image URL" value={tab.image || ''} onChange={(e) => {
                        const newTabs = [...config.categoryTabs];
                        newTabs[idx].image = e.target.value;
                        updateConfig('categoryTabs', newTabs);
                      }} />
                      <div className="flex gap-2">
                        <input type="color" value={tab.bgColor || '#f5f5f5'} onChange={(e) => {
                          const newTabs = [...config.categoryTabs];
                          newTabs[idx].bgColor = e.target.value;
                          updateConfig('categoryTabs', newTabs);
                        }} className="w-10 h-8" />
                        <Input value={tab.path} onChange={(e) => {
                          const newTabs = [...config.categoryTabs];
                          newTabs[idx].path = e.target.value;
                          updateConfig('categoryTabs', newTabs);
                        }} placeholder="/path" />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={() => {
                    updateConfig('categoryTabs', [...config.categoryTabs, { id: Date.now(), name: 'NEW', path: '/new', bgColor: '#f5f5f5', enabled: true }]);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />Add Tab
                  </Button>
                </>
              )}

              {/* Sub Nav Editor */}
              {selectedElement.type === 'subNav' && (
                <>
                  <p className="text-sm text-gray-500">Edit secondary navigation items</p>
                  {config.subNav.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center gap-2">
                      <Input value={item.name} onChange={(e) => {
                        const newNav = [...config.subNav];
                        newNav[idx].name = e.target.value;
                        updateConfig('subNav', newNav);
                      }} />
                      <Switch checked={item.enabled} onCheckedChange={(v) => {
                        const newNav = [...config.subNav];
                        newNav[idx].enabled = v;
                        updateConfig('subNav', newNav);
                      }} />
                    </div>
                  ))}
                </>
              )}

              {/* Hero Banner Editor */}
              {selectedElement.type === 'heroBanner' && (
                <>
                  <div className="flex items-center justify-between">
                    <Label>Enabled</Label>
                    <Switch checked={config.heroBanner.enabled} onCheckedChange={(v) => updateConfig('heroBanner.enabled', v)} />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input value={config.heroBanner.title} onChange={(e) => updateConfig('heroBanner.title', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Subtitle</Label>
                    <Input value={config.heroBanner.subtitle} onChange={(e) => updateConfig('heroBanner.subtitle', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Image URL</Label>
                    <Input value={config.heroBanner.image} onChange={(e) => updateConfig('heroBanner.image', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Link</Label>
                    <Input value={config.heroBanner.link} onChange={(e) => updateConfig('heroBanner.link', e.target.value)} className="mt-1" placeholder="/shop" />
                  </div>
                </>
              )}

              {/* Region Editor */}
              {selectedElement.type === 'region' && (
                <>
                  <div>
                    <Label>Country Flag (emoji)</Label>
                    <Input value={config.region.flag} onChange={(e) => updateConfig('region.flag', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Country Code</Label>
                    <Input value={config.region.code} onChange={(e) => updateConfig('region.code', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Country Name</Label>
                    <Input value={config.region.name} onChange={(e) => updateConfig('region.name', e.target.value)} className="mt-1" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Show Language Toggle</Label>
                    <Switch checked={config.region.showLanguageToggle} onCheckedChange={(v) => updateConfig('region.showLanguageToggle', v)} />
                  </div>
                </>
              )}
            </div>

            {hasChanges && (
              <div className="p-4 border-t bg-gray-50">
                <Button onClick={saveAll} className="w-full bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />Apply Changes
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
