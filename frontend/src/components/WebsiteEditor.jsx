import React, { useState, useEffect, useCallback } from 'react';
import { 
  Monitor,
  RefreshCw, 
  Moon, 
  Sun, 
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Settings,
  Image,
  Type,
  Palette,
  Layout,
  Grid,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Save,
  X,
  Layers,
  BoxSelect,
  ShoppingBag,
  Search,
  Heart,
  User,
  Menu,
  Star,
  ArrowRight,
  Tablet,
  Smartphone as Phone
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const WebsiteEditor = () => {
  const { selectedStore } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState('desktop'); // desktop, tablet, mobile
  
  // Configuration state
  const [config, setConfig] = useState({
    store: { 
      name: 'TNV Collection', 
      tagline: 'Fashion at your fingertips',
      logo: null,
      currency: 'AED'
    },
    theme: { 
      primaryColor: '#000000', 
      accentColor: '#FF3366', 
      backgroundColor: '#FFFFFF',
      fontFamily: 'Inter'
    },
    header: {
      enabled: true,
      showSearch: true,
      showCart: true,
      showAccount: true,
      showWishlist: true,
      announcement: 'Free shipping on orders over AED 200',
      announcementEnabled: true
    },
    sections: [
      { id: 'hero', type: 'hero_banner', enabled: true, settings: { 
        title: 'Summer Collection 2025', 
        subtitle: 'NEW ARRIVALS', 
        buttonText: 'Shop Now',
        buttonLink: '/collections/summer',
        image: null,
        overlay: true,
        height: 'large'
      }},
      { id: 'categories', type: 'category_grid', enabled: true, settings: { 
        title: 'Shop by Category',
        columns: 4,
        showTitle: true
      }},
      { id: 'featured', type: 'product_carousel', enabled: true, settings: { 
        title: 'Featured Products',
        subtitle: 'Handpicked for you',
        collection: 'featured',
        limit: 8,
        showArrows: true,
        autoplay: false
      }},
      { id: 'promo', type: 'promo_banner', enabled: true, settings: { 
        title: 'Flash Sale',
        subtitle: 'Up to 50% OFF',
        buttonText: 'Shop Sale',
        buttonLink: '/sale',
        bgColor: '#FF3366',
        textColor: '#FFFFFF'
      }},
      { id: 'new_arrivals', type: 'product_grid', enabled: true, settings: { 
        title: 'New Arrivals',
        subtitle: 'Fresh styles just in',
        collection: 'new-arrivals',
        columns: 4,
        rows: 2,
        showViewAll: true
      }},
      { id: 'testimonials', type: 'testimonials', enabled: false, settings: { 
        title: 'What Our Customers Say',
        items: []
      }},
      { id: 'newsletter', type: 'newsletter', enabled: true, settings: { 
        title: 'Join Our Newsletter',
        subtitle: 'Get exclusive offers and updates',
        buttonText: 'Subscribe',
        bgColor: '#F5F5F5'
      }},
    ],
    footer: {
      enabled: true,
      columns: [
        { title: 'Shop', links: ['New Arrivals', 'Sale', 'Men', 'Women'] },
        { title: 'Help', links: ['Contact Us', 'FAQs', 'Shipping', 'Returns'] },
        { title: 'Company', links: ['About Us', 'Careers', 'Press'] },
      ],
      showSocial: true,
      showPaymentIcons: true,
      copyright: '© 2025 TNV Collection. All rights reserved.'
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
      const [collectionsRes, productsRes, bannersRes, configRes] = await Promise.all([
        fetch(`${API_URL}/api/storefront/collections?store=${selectedStore || 'tnvcollection'}`),
        fetch(`${API_URL}/api/storefront/products?store=${selectedStore || 'tnvcollection'}&limit=20`),
        fetch(`${API_URL}/api/storefront-banners?store=${selectedStore || 'tnvcollection'}`),
        fetch(`${API_URL}/api/storefront-config/${selectedStore || 'tnvcollection'}`)
      ]);

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
      if (configRes.ok) {
        const data = await configRes.json();
        if (data.config) {
          setConfig(prev => ({ ...prev, ...data.config }));
        }
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
      const response = await fetch(`${API_URL}/api/storefront-config/${selectedStore || 'tnvcollection'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
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

  // Preview width based on view mode
  const previewWidth = viewMode === 'desktop' ? '100%' : viewMode === 'tablet' ? '768px' : '375px';

  // Render section in the preview
  const renderSection = (section) => {
    const isSelected = selectedSection === section.id;
    const sectionStyle = {
      cursor: 'pointer',
      outline: isSelected ? `2px solid ${config.theme?.accentColor}` : 'none',
      outlineOffset: '2px',
      opacity: section.enabled ? 1 : 0.4,
      transition: 'all 0.2s ease'
    };

    switch (section.type) {
      case 'hero_banner':
        return (
          <div 
            key={section.id}
            onClick={() => setSelectedSection(section.id)}
            className="relative"
            style={{ 
              ...sectionStyle,
              height: section.settings?.height === 'large' ? '500px' : section.settings?.height === 'medium' ? '400px' : '300px',
              background: section.settings?.image 
                ? `url(${section.settings.image}) center/cover` 
                : `linear-gradient(135deg, ${config.theme?.accentColor || '#FF3366'}, ${config.theme?.primaryColor || '#000'})`
            }}
          >
            {section.settings?.overlay && (
              <div className="absolute inset-0 bg-black/30" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
              <p className="text-sm uppercase tracking-wider mb-2">{section.settings?.subtitle}</p>
              <h1 className="text-4xl md:text-6xl font-bold mb-4">{section.settings?.title}</h1>
              {section.settings?.buttonText && (
                <button className="px-8 py-3 bg-white text-black font-medium rounded hover:bg-gray-100 transition">
                  {section.settings?.buttonText}
                </button>
              )}
            </div>
          </div>
        );

      case 'category_grid':
        return (
          <div 
            key={section.id}
            onClick={() => setSelectedSection(section.id)}
            className="py-12 px-4 md:px-8"
            style={sectionStyle}
          >
            {section.settings?.showTitle && (
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">{section.settings?.title}</h2>
            )}
            <div className={`grid grid-cols-2 md:grid-cols-${section.settings?.columns || 4} gap-4`}>
              {collections.slice(0, 8).map((col, i) => (
                <div key={i} className="group relative h-48 bg-gray-100 rounded-lg overflow-hidden cursor-pointer">
                  {col.image && (
                    <img src={col.image} alt={col.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">{col.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'product_carousel':
      case 'product_grid':
        return (
          <div 
            key={section.id}
            onClick={() => setSelectedSection(section.id)}
            className="py-12 px-4 md:px-8"
            style={sectionStyle}
          >
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">{section.settings?.title}</h2>
                {section.settings?.subtitle && (
                  <p className="text-gray-500 mt-1">{section.settings?.subtitle}</p>
                )}
              </div>
              {section.settings?.showViewAll && (
                <a href="#" className="text-sm font-medium flex items-center gap-1 hover:underline">
                  View All <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
            <div className={`grid grid-cols-2 md:grid-cols-${section.settings?.columns || 4} gap-4`}>
              {products.slice(0, (section.settings?.columns || 4) * (section.settings?.rows || 2)).map((product, i) => (
                <div key={i} className="group">
                  <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
                    {product.image && (
                      <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    )}
                    <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition">
                      <Heart className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-medium text-sm truncate">{product.title || 'Product Name'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold" style={{ color: config.theme?.accentColor }}>
                      {config.store?.currency} {product.price || '99.00'}
                    </span>
                    {product.compare_at_price && (
                      <span className="text-gray-400 line-through text-sm">
                        {config.store?.currency} {product.compare_at_price}
                      </span>
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
            onClick={() => setSelectedSection(section.id)}
            className="py-16 px-4 text-center"
            style={{ 
              ...sectionStyle,
              backgroundColor: section.settings?.bgColor || '#FF3366',
              color: section.settings?.textColor || '#FFFFFF'
            }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-2">{section.settings?.title}</h2>
            <p className="text-lg opacity-90 mb-6">{section.settings?.subtitle}</p>
            {section.settings?.buttonText && (
              <button 
                className="px-8 py-3 font-medium rounded transition"
                style={{ 
                  backgroundColor: section.settings?.textColor || '#FFFFFF',
                  color: section.settings?.bgColor || '#FF3366'
                }}
              >
                {section.settings?.buttonText}
              </button>
            )}
          </div>
        );

      case 'newsletter':
        return (
          <div 
            key={section.id}
            onClick={() => setSelectedSection(section.id)}
            className="py-16 px-4 text-center"
            style={{ ...sectionStyle, backgroundColor: section.settings?.bgColor || '#F5F5F5' }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{section.settings?.title}</h2>
            <p className="text-gray-500 mb-6">{section.settings?.subtitle}</p>
            <div className="flex max-w-md mx-auto gap-2">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1 px-4 py-3 border rounded focus:outline-none focus:ring-2"
              />
              <button 
                className="px-6 py-3 font-medium rounded text-white"
                style={{ backgroundColor: config.theme?.accentColor || '#FF3366' }}
              >
                {section.settings?.buttonText || 'Subscribe'}
              </button>
            </div>
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
              <Label>Button Text</Label>
              <Input 
                value={sectionData.settings?.buttonText || ''}
                onChange={(e) => updateSection(section, { buttonText: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Button Link</Label>
              <Input 
                value={sectionData.settings?.buttonLink || ''}
                onChange={(e) => updateSection(section, { buttonLink: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Banner Height</Label>
              <div className="flex gap-2 mt-1">
                {['small', 'medium', 'large'].map(size => (
                  <Button
                    key={size}
                    variant={sectionData.settings?.height === size ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSection(section, { height: size })}
                    className="capitalize"
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Overlay</Label>
              <Switch 
                checked={sectionData.settings?.overlay}
                onCheckedChange={(v) => updateSection(section, { overlay: v })}
              />
            </div>
          </div>
        )}

        {(sectionData.type === 'product_grid' || sectionData.type === 'product_carousel') && (
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
              <Label>Subtitle</Label>
              <Input 
                value={sectionData.settings?.subtitle || ''}
                onChange={(e) => updateSection(section, { subtitle: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Columns</Label>
              <div className="flex gap-2 mt-1">
                {[2, 3, 4, 5].map(num => (
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
            {sectionData.type === 'product_grid' && (
              <div>
                <Label>Rows</Label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3].map(num => (
                    <Button
                      key={num}
                      variant={sectionData.settings?.rows === num ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSection(section, { rows: num })}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Show "View All" Link</Label>
              <Switch 
                checked={sectionData.settings?.showViewAll}
                onCheckedChange={(v) => updateSection(section, { showViewAll: v })}
              />
            </div>
          </div>
        )}

        {sectionData.type === 'category_grid' && (
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
              <Label>Show Title</Label>
              <Switch 
                checked={sectionData.settings?.showTitle}
                onCheckedChange={(v) => updateSection(section, { showTitle: v })}
              />
            </div>
            <div>
              <Label>Columns</Label>
              <div className="flex gap-2 mt-1">
                {[2, 3, 4, 6].map(num => (
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
              <Label>Button Text</Label>
              <Input 
                value={sectionData.settings?.buttonText || ''}
                onChange={(e) => updateSection(section, { buttonText: e.target.value })}
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

        {sectionData.type === 'newsletter' && (
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
              <Label>Button Text</Label>
              <Input 
                value={sectionData.settings?.buttonText || ''}
                onChange={(e) => updateSection(section, { buttonText: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Background Color</Label>
              <div className="flex gap-2 mt-1">
                <input 
                  type="color"
                  value={sectionData.settings?.bgColor || '#F5F5F5'}
                  onChange={(e) => updateSection(section, { bgColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input 
                  value={sectionData.settings?.bgColor || '#F5F5F5'}
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
            <Monitor className="w-5 h-5" />
            <span className="font-semibold">Online Store Editor</span>
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
                settings: { title: 'New Section', columns: 4, rows: 1, showViewAll: true }
              };
              setConfig(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
              setSelectedSection(newSection.id);
              setHasChanges(true);
            }}>
              <Plus className="w-4 h-4 mr-2" /> Add Section
            </Button>
          </div>
        </div>

        {/* Center - Website Preview */}
        <div className="flex-1 overflow-auto bg-gray-200 p-4">
          {!showLeftPanel && (
            <Button 
              variant="ghost" 
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white shadow"
              onClick={() => setShowLeftPanel(true)}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
          
          <div 
            className="mx-auto bg-white shadow-xl rounded-lg overflow-hidden transition-all"
            style={{ maxWidth: previewWidth, minHeight: '100%' }}
          >
            {/* Preview Header */}
            <div className="border-b">
              {/* Announcement Bar */}
              {config.header?.announcementEnabled && (
                <div 
                  className="py-2 px-4 text-center text-sm"
                  style={{ backgroundColor: config.theme?.primaryColor, color: '#fff' }}
                >
                  {config.header?.announcement}
                </div>
              )}
              
              {/* Main Header */}
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-4">
                  <Menu className="w-6 h-6 md:hidden" />
                  <h1 className="text-xl font-bold">{config.store?.name}</h1>
                </div>
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <span>Men</span>
                  <span>Women</span>
                  <span>Kids</span>
                  <span>Sale</span>
                </div>
                <div className="flex items-center gap-3">
                  {config.header?.showSearch && <Search className="w-5 h-5" />}
                  {config.header?.showAccount && <User className="w-5 h-5" />}
                  {config.header?.showWishlist && <Heart className="w-5 h-5" />}
                  {config.header?.showCart && <ShoppingBag className="w-5 h-5" />}
                </div>
              </div>
            </div>

            {/* Sections */}
            {config.sections.filter(s => s.enabled).map(renderSection)}

            {/* Footer */}
            {config.footer?.enabled && (
              <footer className="bg-gray-900 text-white py-12 px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                  {config.footer?.columns?.map((col, i) => (
                    <div key={i}>
                      <h4 className="font-semibold mb-4">{col.title}</h4>
                      <ul className="space-y-2 text-sm text-gray-400">
                        {col.links?.map((link, j) => (
                          <li key={j} className="hover:text-white cursor-pointer">{link}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
                  {config.footer?.copyright}
                </div>
              </footer>
            )}
          </div>
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
                  value={config.theme?.backgroundColor || '#FFFFFF'}
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

export default WebsiteEditor;
