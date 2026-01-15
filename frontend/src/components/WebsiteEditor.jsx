import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  Monitor,
  RefreshCw, 
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Settings,
  Image,
  Eye,
  EyeOff,
  Plus,
  Save,
  X,
  Palette,
  Layers,
  BoxSelect,
  Tablet,
  Smartphone as Phone,
  ExternalLink,
  Edit3,
  Megaphone,
  Type,
  Menu,
  LayoutGrid,
  Trash2,
  GripVertical
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';

// Emoji options for promo messages
const EMOJI_OPTIONS = ['💵', '🚚', '✓', '↩️', '🌟', '🔥', '💎', '🏷️', '👗', '👟', '👜', '⚽', '✨', '🎁', '💳', '📦'];

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Debounced Input Component
const DebouncedInput = memo(({ value, onChange, ...props }) => {
  const [localValue, setLocalValue] = useState(value);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localValue, value, onChange]);

  return (
    <Input 
      value={localValue} 
      onChange={(e) => setLocalValue(e.target.value)}
      {...props}
    />
  );
});

const WebsiteEditor = () => {
  const { selectedStore } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  
  // Data from API
  const [banners, setBanners] = useState([]);
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Header/Navigation config
  const [headerConfig, setHeaderConfig] = useState({
    logo: { text: 'TNV', badge: 'COLLECTION', badgeColor: '#FF6B9D' },
    promoMessages: [],
    categories: [],
    megaMenu: {}
  });
  
  // Editing states for header sections
  const [editingPromo, setEditingPromo] = useState(null);
  const [editingLogo, setEditingLogo] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  
  // Editable sections - with separate header subsections
  const [sections, setSections] = useState([
    { id: 'announcement', type: 'announcement_bar', title: 'Announcement Bar', enabled: true, parent: 'header' },
    { id: 'logo', type: 'logo', title: 'Logo & Branding', enabled: true, parent: 'header' },
    { id: 'mega_menu', type: 'mega_menu', title: 'Mega Menu', enabled: true, parent: 'header' },
    { id: 'search', type: 'search_bar', title: 'Search Bar', enabled: true, parent: 'header' },
    { id: 'secondary_nav', type: 'secondary_nav', title: 'Secondary Navigation', enabled: true, parent: 'header' },
    { id: 'hero', type: 'hero_carousel', title: 'Hero Banners', enabled: true },
    { id: 'categories', type: 'categories', title: 'Shop by Category', enabled: true },
    { id: 'trending', type: 'product_grid', title: 'Trending Products', enabled: true },
    { id: 'promo', type: 'promo_banner', title: 'Promo Banner', enabled: true },
    { id: 'newsletter', type: 'newsletter', title: 'Newsletter', enabled: true },
    { id: 'footer', type: 'footer', title: 'Footer', enabled: true },
  ]);
  
  // Selected banner for editing
  const [editingBanner, setEditingBanner] = useState(null);
  // Selected promo message for editing
  const [editingPromo, setEditingPromo] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedStore]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const storeName = selectedStore || 'tnvcollection';
      // Fetch from correct endpoints for Namshi storefront
      const [heroBannersRes, collectionsRes, productsRes, navConfigRes] = await Promise.all([
        fetch(`${API_URL}/api/storefront/banners/hero/${storeName}`),
        fetch(`${API_URL}/api/storefront/collections?store=${storeName}`),
        fetch(`${API_URL}/api/storefront/products?store=${storeName}&limit=20`),
        fetch(`${API_URL}/api/storefront/config/navigation/${storeName}`)
      ]);

      if (heroBannersRes.ok) {
        const data = await heroBannersRes.json();
        setBanners(data.banners || []);
      }
      if (collectionsRes.ok) {
        const data = await collectionsRes.json();
        setCollections(data.collections || []);
      }
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }
      // Process navigation/header config
      if (navConfigRes.ok) {
        const navData = await navConfigRes.json();
        setHeaderConfig({
          logo: navData.logo || { text: 'TNV', badge: 'COLLECTION', badgeColor: '#FF6B9D' },
          promoMessages: navData.promoMessages || [],
          categories: navData.categories || [],
          megaMenu: navData.megaMenu || {}
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveBanner = async (banner) => {
    setSaving(true);
    try {
      const storeName = selectedStore || 'tnvcollection';
      const response = await fetch(`${API_URL}/api/storefront/banners/hero/${storeName}/${banner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(banner)
      });
      
      if (response.ok) {
        toast.success('Banner saved!');
        setHasChanges(false);
        fetchData();
        setIframeKey(prev => prev + 1); // Refresh iframe
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const updateBanner = useCallback((key, value) => {
    setEditingBanner(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  // Save Logo Configuration
  const saveLogo = async () => {
    setSaving(true);
    try {
      const storeName = selectedStore || 'tnvcollection';
      const response = await fetch(`${API_URL}/api/storefront/config/logo/${storeName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(headerConfig.logo)
      });
      
      if (response.ok) {
        toast.success('Logo saved!');
        setHasChanges(false);
        setIframeKey(prev => prev + 1);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save logo');
    } finally {
      setSaving(false);
    }
  };

  // Save Promo Messages
  const savePromoMessages = async () => {
    setSaving(true);
    try {
      const storeName = selectedStore || 'tnvcollection';
      const response = await fetch(`${API_URL}/api/storefront/config/promo-messages/${storeName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(headerConfig.promoMessages)
      });
      
      if (response.ok) {
        toast.success('Announcement bar saved!');
        setHasChanges(false);
        setIframeKey(prev => prev + 1);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save announcement bar');
    } finally {
      setSaving(false);
    }
  };

  // Save Menu Categories
  const saveMenuCategories = async () => {
    setSaving(true);
    try {
      const storeName = selectedStore || 'tnvcollection';
      const response = await fetch(`${API_URL}/api/storefront/config/menu/${storeName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(headerConfig.categories)
      });
      
      if (response.ok) {
        toast.success('Navigation menu saved!');
        setHasChanges(false);
        setIframeKey(prev => prev + 1);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save menu');
    } finally {
      setSaving(false);
    }
  };

  // Update header config helpers
  const updateLogo = useCallback((key, value) => {
    setHeaderConfig(prev => ({
      ...prev,
      logo: { ...prev.logo, [key]: value }
    }));
    setHasChanges(true);
  }, []);

  const updatePromoMessage = useCallback((index, key, value) => {
    setHeaderConfig(prev => {
      const newMessages = [...prev.promoMessages];
      newMessages[index] = { ...newMessages[index], [key]: value };
      return { ...prev, promoMessages: newMessages };
    });
    setHasChanges(true);
  }, []);

  const addPromoMessage = useCallback(() => {
    setHeaderConfig(prev => ({
      ...prev,
      promoMessages: [...prev.promoMessages, { 
        text: 'New Message', 
        icon: '🌟', 
        active: true, 
        order: prev.promoMessages.length 
      }]
    }));
    setHasChanges(true);
  }, []);

  const removePromoMessage = useCallback((index) => {
    setHeaderConfig(prev => ({
      ...prev,
      promoMessages: prev.promoMessages.filter((_, i) => i !== index)
    }));
    setHasChanges(true);
  }, []);

  const movePromoMessage = useCallback((index, direction) => {
    setHeaderConfig(prev => {
      const newMessages = [...prev.promoMessages];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= newMessages.length) return prev;
      [newMessages[index], newMessages[newIndex]] = [newMessages[newIndex], newMessages[index]];
      return { ...prev, promoMessages: newMessages };
    });
    setHasChanges(true);
  }, []);

  const updateCategory = useCallback((index, key, value) => {
    setHeaderConfig(prev => {
      const newCategories = [...prev.categories];
      newCategories[index] = { ...newCategories[index], [key]: value };
      return { ...prev, categories: newCategories };
    });
    setHasChanges(true);
  }, []);

  const toggleSection = useCallback((sectionId) => {
    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    ));
    setHasChanges(true);
  }, []);

  const moveSection = useCallback((sectionId, direction) => {
    setSections(prev => {
      const newSections = [...prev];
      const index = newSections.findIndex(s => s.id === sectionId);
      if (direction === 'up' && index > 0) {
        [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
      } else if (direction === 'down' && index < newSections.length - 1) {
        [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
      }
      return newSections;
    });
    setHasChanges(true);
  }, []);

  const previewWidth = viewMode === 'desktop' ? '100%' : viewMode === 'tablet' ? '768px' : '375px';
  const storeName = selectedStore || 'tnvcollection';
  const storefrontUrl = `${window.location.origin}/tnv`; // Namshi-style storefront

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Bar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            <span className="font-semibold">Website Editor</span>
            <span className="text-sm text-gray-500">- {storeName}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
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
          
          <Button 
            variant="outline"
            onClick={() => window.open(storefrontUrl, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Live
          </Button>
          
          {hasChanges && editingBanner && (
            <Button 
              onClick={() => saveBanner(editingBanner)}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Sections & Banners */}
        {showLeftPanel && (
          <div className="w-80 bg-white border-r flex flex-col flex-shrink-0">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Page Sections
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowLeftPanel(false)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-auto">
              {/* Sections */}
              <div className="p-2 space-y-1">
                {sections.map((section, index) => (
                  <div
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      selectedSection === section.id 
                        ? 'bg-blue-50 border-blue-200 border' 
                        : 'hover:bg-gray-50 border border-transparent'
                    } ${!section.enabled && 'opacity-50'}`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'up'); }}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ChevronDown className="w-3 h-3 rotate-180" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'down'); }}
                        disabled={index === sections.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{section.title}</p>
                      <p className="text-xs text-gray-500 capitalize">{section.type.replace('_', ' ')}</p>
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
              
              {/* Banners List */}
              <div className="p-4 border-t">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Hero Banners ({banners.length})
                </h3>
                <div className="space-y-2">
                  {banners.map((banner) => (
                    <div
                      key={banner.id}
                      onClick={() => {
                        setSelectedSection('hero');
                        setEditingBanner(banner);
                      }}
                      className={`p-2 rounded-lg border cursor-pointer transition-all ${
                        editingBanner?.id === banner.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex gap-3">
                        {banner.image && (
                          <img 
                            src={banner.image} 
                            alt={banner.title}
                            className="w-16 h-10 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{banner.title}</p>
                          <p className="text-xs text-gray-500 truncate">{banner.subtitle}</p>
                        </div>
                        <Edit3 className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Collections Summary */}
              <div className="p-4 border-t">
                <h3 className="font-semibold text-sm mb-2">Collections ({collections.length})</h3>
                <div className="flex flex-wrap gap-1">
                  {collections.slice(0, 6).map((col) => (
                    <span key={col.id || col.handle} className="text-xs px-2 py-1 bg-gray-100 rounded">
                      {col.title}
                    </span>
                  ))}
                  {collections.length > 6 && (
                    <span className="text-xs px-2 py-1 text-gray-500">
                      +{collections.length - 6} more
                    </span>
                  )}
                </div>
              </div>
              
              {/* Products Summary */}
              <div className="p-4 border-t">
                <h3 className="font-semibold text-sm mb-2">Products ({products.length})</h3>
                <div className="grid grid-cols-4 gap-1">
                  {products.slice(0, 8).map((product) => (
                    <img 
                      key={product.id || product.handle}
                      src={product.image_url || product.images?.[0]?.src}
                      alt={product.title}
                      className="w-full aspect-square object-cover rounded"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Center - Live Preview */}
        <div className="flex-1 overflow-auto bg-gray-200 p-4 relative">
          {!showLeftPanel && (
            <Button 
              variant="ghost" 
              className="absolute left-4 top-4 z-10 bg-white shadow"
              onClick={() => setShowLeftPanel(true)}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
          
          <div 
            className="mx-auto bg-white shadow-xl rounded-lg overflow-hidden transition-all"
            style={{ maxWidth: previewWidth, minHeight: '100%' }}
          >
            <iframe 
              key={iframeKey}
              src={storefrontUrl}
              className="w-full border-0"
              style={{ height: 'calc(100vh - 150px)' }}
              title="Storefront Preview"
            />
          </div>
        </div>

        {/* Right Panel - Editor */}
        <div className="w-80 bg-white border-l overflow-auto flex-shrink-0">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {editingBanner ? 'Edit Banner' : 'Section Settings'}
            </h2>
          </div>
          
          {!editingBanner ? (
            <div className="p-4 text-center text-gray-500">
              <BoxSelect className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Select a banner to edit</p>
              <p className="text-sm">Click on a banner from the left panel</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Banner Details</h3>
                <Button variant="ghost" size="sm" onClick={() => setEditingBanner(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Banner Preview */}
              {editingBanner.image && (
                <div className="relative rounded-lg overflow-hidden">
                  <img 
                    src={editingBanner.image} 
                    alt="Preview"
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-end p-3">
                    <div className="text-white">
                      <p className="text-xs opacity-80">{editingBanner.subtitle}</p>
                      <p className="font-bold">{editingBanner.title}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <DebouncedInput 
                    value={editingBanner.title || ''}
                    onChange={(v) => updateBanner('title', v)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Subtitle</Label>
                  <DebouncedInput 
                    value={editingBanner.subtitle || ''}
                    onChange={(v) => updateBanner('subtitle', v)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Button Text</Label>
                  <DebouncedInput 
                    value={editingBanner.buttonText || ''}
                    onChange={(v) => updateBanner('buttonText', v)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Button Link</Label>
                  <DebouncedInput 
                    value={editingBanner.buttonLink || ''}
                    onChange={(v) => updateBanner('buttonLink', v)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Image URL</Label>
                  <DebouncedInput 
                    value={editingBanner.image || ''}
                    onChange={(v) => updateBanner('image', v)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Text Color</Label>
                  <div className="flex gap-2 mt-1">
                    <input 
                      type="color"
                      value={editingBanner.textColor || '#FFFFFF'}
                      onChange={(e) => updateBanner('textColor', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input 
                      value={editingBanner.textColor || '#FFFFFF'}
                      onChange={(e) => updateBanner('textColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Text Position</Label>
                  <div className="flex gap-2 mt-1">
                    {['left', 'center', 'right'].map(pos => (
                      <Button
                        key={pos}
                        variant={editingBanner.textPosition === pos ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateBanner('textPosition', pos)}
                        className="capitalize flex-1"
                      >
                        {pos}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Show Overlay</Label>
                  <Switch 
                    checked={editingBanner.overlay}
                    onCheckedChange={(v) => updateBanner('overlay', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch 
                    checked={editingBanner.active}
                    onCheckedChange={(v) => updateBanner('active', v)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={() => saveBanner(editingBanner)}
                  disabled={saving || !hasChanges}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Banner
                </Button>
              </div>
            </div>
          )}
          
          {/* Quick Links */}
          <div className="p-4 border-t">
            <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.location.href = '/storefront-config'}
              >
                <Image className="w-4 h-4 mr-2" />
                Manage Banners
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.location.href = '/storefront-cms'}
              >
                <Layers className="w-4 h-4 mr-2" />
                Storefront CMS
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.location.href = '/menu-tags'}
              >
                <Settings className="w-4 h-4 mr-2" />
                Menu & Tags
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebsiteEditor;
