import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Smartphone, 
  RefreshCw, 
  Moon, 
  Sun, 
  Home,
  Search,
  ShoppingCart,
  Heart,
  User,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Star,
  Settings,
  Bell,
  Zap,
  Wifi,
  Battery,
  Signal,
  Image,
  Type,
  Palette,
  Layout,
  Grid,
  Eye,
  EyeOff,
  Move,
  Trash2,
  Plus,
  Save,
  Undo,
  X,
  Check,
  Upload,
  Monitor,
  Layers,
  BoxSelect
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const MobileAppEditor = () => {
  const { selectedStore } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Configuration state
  const [config, setConfig] = useState({
    app: { 
      name: 'TNV Collection', 
      tagline: 'Fashion at your fingertips' 
    },
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
      { id: 'new_arrivals', type: 'product_grid', enabled: false, settings: { 
        title: 'New Arrivals',
        columns: 2,
        showRatings: true,
        showWishlist: true,
        limit: 4
      }},
    ],
    tabBar: {
      items: ['Home', 'Browse', 'Cart', 'Wishlist', 'Account'],
      activeColor: '#FF3366'
    }
  });

  // Collections and products from API
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    fetchData();
  }, [selectedStore]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [settingsRes, collectionsRes, productsRes, bannersRes] = await Promise.all([
        fetch(`${API_URL}/api/mobile-app/settings?store=${selectedStore || 'tnvcollection'}`),
        fetch(`${API_URL}/api/storefront/collections?store=${selectedStore || 'tnvcollection'}`),
        fetch(`${API_URL}/api/storefront/products?store=${selectedStore || 'tnvcollection'}&limit=20`),
        fetch(`${API_URL}/api/storefront-banners?store=${selectedStore || 'tnvcollection'}`)
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (data.settings) {
          setConfig(prev => ({ ...prev, ...data.settings }));
        }
      }
      if (collectionsRes.ok) {
        const data = await collectionsRes.json();
        setCollections(data.collections || []);
      }
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }
      if (bannersRes.ok) {
        const data = await bannersRes.json();
        setBanners(data.banners || []);
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

  const updateConfig = useCallback((path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (Array.isArray(current[keys[i]])) {
          current[keys[i]] = [...current[keys[i]]];
        } else {
          current[keys[i]] = { ...current[keys[i]] };
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      return newConfig;
    });
    setHasChanges(true);
  }, []);

  const updateSection = useCallback((sectionId, settings) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, settings: { ...s.settings, ...settings } } : s
      )
    }));
    setHasChanges(true);
  }, []);

  const toggleSection = useCallback((sectionId) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      )
    }));
    setHasChanges(true);
  }, []);

  const moveSection = useCallback((sectionId, direction) => {
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
  }, []);

  // Theme colors based on mode
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

  // Render section in the phone preview
  const renderSection = (section) => {
    const isSelected = selectedSection === section.id;
    const sectionStyle = {
      cursor: 'pointer',
      outline: isSelected ? `2px solid ${colors.accent}` : 'none',
      outlineOffset: '2px',
      opacity: section.enabled ? 1 : 0.4,
      transition: 'all 0.2s ease'
    };

    switch (section.type) {
      case 'header':
        return (
          <div 
            key={section.id}
            onClick={() => setSelectedSection(section.id)}
            className="px-4 py-3 flex justify-between items-center"
            style={{ ...sectionStyle, backgroundColor: colors.surface }}
          >
            <div>
              <h1 className="text-lg font-bold" style={{ color: colors.text }}>{config.app?.name}</h1>
            </div>
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
            onClick={() => setSelectedSection(section.id)}
            className="mx-4 my-3 h-32 rounded-2xl flex items-end p-4"
            style={{ 
              ...sectionStyle,
              background: `linear-gradient(135deg, ${section.settings?.bgColor || colors.accent}, ${section.settings?.bgColor || colors.accent}99)` 
            }}
          >
            <div>
              <p className="text-white text-xs opacity-80">{section.settings?.subtitle}</p>
              <p className="text-white text-xl font-bold">{section.settings?.title}</p>
              <p className="text-white text-xs mt-1">{section.settings?.discount}</p>
            </div>
          </div>
        );

      case 'categories':
        return (
          <div 
            key={section.id}
            onClick={() => setSelectedSection(section.id)}
            className="px-4 py-3"
            style={sectionStyle}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold" style={{ color: colors.text }}>{section.settings?.title}</span>
              {section.settings?.showAll && (
                <span className="text-xs" style={{ color: colors.textSecondary }}>See all →</span>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {(section.settings?.items || []).slice(0, 5).map((item, i) => (
                <div key={i} className="flex flex-col items-center min-w-[56px]">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center text-xl"
                    style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                  >
                    {['👔', '👗', '👟', '👜', '⌚'][i]}
                  </div>
                  <span className="text-xs mt-1 text-center" style={{ color: colors.textSecondary }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'product_grid':
        return (
          <div 
            key={section.id}
            onClick={() => setSelectedSection(section.id)}
            className="px-4 py-3"
            style={sectionStyle}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold" style={{ color: colors.text }}>{section.settings?.title}</span>
              <span className="text-xs" style={{ color: colors.textSecondary }}>See all →</span>
            </div>
            <div className={`grid grid-cols-${section.settings?.columns || 2} gap-3`}>
              {Array.from({ length: Math.min(section.settings?.limit || 4, 4) }).map((_, i) => (
                <div 
                  key={i} 
                  className="rounded-xl overflow-hidden"
                  style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                >
                  <div className="h-24 bg-gradient-to-br from-gray-200 to-gray-300 relative">
                    {section.settings?.showWishlist && (
                      <div 
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: colors.surface }}
                      >
                        <Heart className="w-3 h-3" style={{ color: colors.textSecondary }} />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium truncate" style={{ color: colors.text }}>Product Name</p>
                    {section.settings?.showRatings && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs" style={{ color: colors.textSecondary }}>4.5</span>
                      </div>
                    )}
                    <p className="text-xs font-bold mt-1" style={{ color: colors.accent }}>$99.00</p>
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
            onClick={() => setSelectedSection(section.id)}
            className="mx-4 my-3 h-20 rounded-xl flex items-center justify-between px-4"
            style={{ 
              ...sectionStyle,
              background: `linear-gradient(135deg, ${section.settings?.bgColor || '#8B5CF6'}, ${section.settings?.bgColor || '#8B5CF6'}99)` 
            }}
          >
            <div>
              <p className="text-white text-sm font-bold">{section.settings?.title}</p>
              <p className="text-white text-xs opacity-80">{section.settings?.subtitle}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white" />
          </div>
        );

      default:
        return null;
    }
  };

  // Section Editor Panel
  const SectionEditor = ({ section }) => {
    if (!section) {
      return (
        <div className="p-4 text-center text-gray-500">
          <BoxSelect className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No section selected</p>
          <p className="text-sm">Click on a section in the preview to edit it</p>
        </div>
      );
    }

    const sectionData = config.sections.find(s => s.id === section);
    if (!sectionData) return null;

    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold capitalize">{sectionData.type.replace('_', ' ')}</h3>
          <div className="flex items-center gap-2">
            <Switch 
              checked={sectionData.enabled}
              onCheckedChange={() => toggleSection(section)}
            />
            <Button variant="ghost" size="sm" onClick={() => setSelectedSection(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {sectionData.type === 'header' && (
          <div className="space-y-3">
            <div>
              <Label>App Name</Label>
              <Input 
                value={config.app?.name || ''}
                onChange={(e) => updateConfig('app.name', e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Search</Label>
              <Switch 
                checked={sectionData.settings?.showSearch}
                onCheckedChange={(v) => updateSection(section, { showSearch: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Notifications</Label>
              <Switch 
                checked={sectionData.settings?.showNotifications}
                onCheckedChange={(v) => updateSection(section, { showNotifications: v })}
              />
            </div>
          </div>
        )}

        {sectionData.type === 'hero_banner' && (
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input 
                value={sectionData.settings?.title || ''}
                onChange={(e) => updateSection(section, { title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input 
                value={sectionData.settings?.subtitle || ''}
                onChange={(e) => updateSection(section, { subtitle: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Discount Text</Label>
              <Input 
                value={sectionData.settings?.discount || ''}
                onChange={(e) => updateSection(section, { discount: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Background Color</Label>
              <div className="flex gap-2 mt-1">
                <input 
                  type="color"
                  value={sectionData.settings?.bgColor || '#FF3366'}
                  onChange={(e) => updateSection(section, { bgColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input 
                  value={sectionData.settings?.bgColor || '#FF3366'}
                  onChange={(e) => updateSection(section, { bgColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )}

        {sectionData.type === 'categories' && (
          <div className="space-y-3">
            <div>
              <Label>Section Title</Label>
              <Input 
                value={sectionData.settings?.title || ''}
                onChange={(e) => updateSection(section, { title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show "See All"</Label>
              <Switch 
                checked={sectionData.settings?.showAll}
                onCheckedChange={(v) => updateSection(section, { showAll: v })}
              />
            </div>
            <div>
              <Label>Categories</Label>
              <div className="mt-2 space-y-2">
                {(sectionData.settings?.items || []).map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input 
                      value={item}
                      onChange={(e) => {
                        const newItems = [...(sectionData.settings?.items || [])];
                        newItems[i] = e.target.value;
                        updateSection(section, { items: newItems });
                      }}
                      className="flex-1"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        const newItems = (sectionData.settings?.items || []).filter((_, idx) => idx !== i);
                        updateSection(section, { items: newItems });
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    const newItems = [...(sectionData.settings?.items || []), 'New Category'];
                    updateSection(section, { items: newItems });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Category
                </Button>
              </div>
            </div>
          </div>
        )}

        {sectionData.type === 'product_grid' && (
          <div className="space-y-3">
            <div>
              <Label>Section Title</Label>
              <Input 
                value={sectionData.settings?.title || ''}
                onChange={(e) => updateSection(section, { title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Columns</Label>
              <div className="flex gap-2 mt-1">
                {[1, 2, 3].map(num => (
                  <Button
                    key={num}
                    variant={sectionData.settings?.columns === num ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSection(section, { columns: num })}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Products to Show</Label>
              <div className="flex gap-2 mt-1">
                {[2, 4, 6, 8].map(num => (
                  <Button
                    key={num}
                    variant={sectionData.settings?.limit === num ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSection(section, { limit: num })}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Ratings</Label>
              <Switch 
                checked={sectionData.settings?.showRatings}
                onCheckedChange={(v) => updateSection(section, { showRatings: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Wishlist Button</Label>
              <Switch 
                checked={sectionData.settings?.showWishlist}
                onCheckedChange={(v) => updateSection(section, { showWishlist: v })}
              />
            </div>
          </div>
        )}

        {sectionData.type === 'promo_banner' && (
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input 
                value={sectionData.settings?.title || ''}
                onChange={(e) => updateSection(section, { title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input 
                value={sectionData.settings?.subtitle || ''}
                onChange={(e) => updateSection(section, { subtitle: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Background Color</Label>
              <div className="flex gap-2 mt-1">
                <input 
                  type="color"
                  value={sectionData.settings?.bgColor || '#8B5CF6'}
                  onChange={(e) => updateSection(section, { bgColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input 
                  value={sectionData.settings?.bgColor || '#8B5CF6'}
                  onChange={(e) => updateSection(section, { bgColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Reorder buttons */}
        <div className="pt-4 border-t flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => moveSection(section, 'up')}
          >
            <ChevronLeft className="w-4 h-4 mr-1 rotate-90" /> Move Up
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => moveSection(section, 'down')}
          >
            Move Down <ChevronRight className="w-4 h-4 ml-1 rotate-90" />
          </Button>
        </div>
      </div>
    );
  };

  // Phone Frame Component
  const PhoneFrame = ({ children }) => (
    <div className="relative mx-auto" style={{ width: '320px' }}>
      <div 
        className="rounded-[3rem] p-3 shadow-2xl"
        style={{ 
          background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
      >
        <div 
          className="rounded-[2.5rem] overflow-hidden relative"
          style={{ backgroundColor: colors.bg }}
        >
          {/* Status bar */}
          <div 
            className="flex justify-between items-center px-6 py-2 text-xs"
            style={{ backgroundColor: colors.surface }}
          >
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
            {children}
          </div>
          
          {/* Tab Bar */}
          <div 
            className="flex justify-around items-center py-2 border-t"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            {[Home, Search, ShoppingCart, Heart, User].map((Icon, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <Icon 
                  className="w-5 h-5" 
                  style={{ color: i === 0 ? colors.accent : colors.textSecondary }} 
                />
                <span 
                  className="text-[10px]"
                  style={{ color: i === 0 ? colors.accent : colors.textSecondary }}
                >
                  {config.tabBar?.items?.[i] || ['Home', 'Browse', 'Cart', 'Wishlist', 'Account'][i]}
                </span>
              </div>
            ))}
          </div>
          
          {/* Home indicator */}
          <div className="flex justify-center py-2" style={{ backgroundColor: colors.surface }}>
            <div className="w-32 h-1 rounded-full" style={{ backgroundColor: colors.text, opacity: 0.3 }} />
          </div>
        </div>
      </div>
    </div>
  );

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
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            <span className="font-semibold">Mobile App Editor</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
            <Sun className="w-4 h-4 text-gray-500" />
            <Switch 
              checked={isDarkMode}
              onCheckedChange={setIsDarkMode}
            />
            <Moon className="w-4 h-4 text-gray-500" />
          </div>
          
          {hasChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              Unsaved changes
            </span>
          )}
          
          <Button 
            onClick={saveConfig}
            disabled={saving || !hasChanges}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Section List */}
        <div className={`bg-white border-r transition-all ${showLeftPanel ? 'w-72' : 'w-0'} overflow-hidden`}>
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Sections
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowLeftPanel(false)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="p-2 space-y-1 overflow-auto" style={{ height: 'calc(100% - 60px)' }}>
            {config.sections.map((section, index) => (
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
                    disabled={index === config.sections.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium capitalize">{section.type.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-500">{section.settings?.title || 'No title'}</p>
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
            
            {/* Add Section Button */}
            <Button variant="outline" className="w-full mt-4" onClick={() => {
              const newSection = {
                id: `section_${Date.now()}`,
                type: 'product_grid',
                enabled: true,
                settings: { title: 'New Section', columns: 2, showRatings: true, showWishlist: true, limit: 4 }
              };
              setConfig(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
              setSelectedSection(newSection.id);
              setHasChanges(true);
            }}>
              <Plus className="w-4 h-4 mr-2" /> Add Section
            </Button>
          </div>
        </div>

        {/* Center - Phone Preview */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          {!showLeftPanel && (
            <Button 
              variant="ghost" 
              className="absolute left-4 top-1/2 -translate-y-1/2"
              onClick={() => setShowLeftPanel(true)}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
          
          <PhoneFrame>
            {config.sections.filter(s => s.enabled).map(renderSection)}
          </PhoneFrame>
        </div>

        {/* Right Panel - Section Editor */}
        <div className="w-80 bg-white border-l overflow-auto">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {selectedSection ? 'Edit Section' : 'Section Settings'}
            </h2>
          </div>
          <SectionEditor section={selectedSection} />
          
          {/* Theme Settings at bottom */}
          <div className="p-4 border-t mt-auto">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Theme Colors
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input 
                  type="color"
                  value={config.theme?.primaryColor || '#000000'}
                  onChange={(e) => updateConfig('theme.primaryColor', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <span className="text-sm">Primary</span>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="color"
                  value={config.theme?.accentColor || '#FF3366'}
                  onChange={(e) => updateConfig('theme.accentColor', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <span className="text-sm">Accent</span>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="color"
                  value={config.theme?.backgroundColor || '#FAFAFA'}
                  onChange={(e) => updateConfig('theme.backgroundColor', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <span className="text-sm">Background</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileAppEditor;
