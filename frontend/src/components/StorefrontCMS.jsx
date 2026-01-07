import React, { useState, useEffect, useCallback } from 'react';
import {
  Image,
  Layout,
  Settings,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  GripVertical,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useStore } from '../contexts/StoreContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// ==================== Banner Management ====================
const BannerCard = ({ banner, onEdit, onDelete, onToggle }) => (
  <div className={`bg-white rounded-lg border overflow-hidden ${!banner.is_active ? 'opacity-60' : ''}`}>
    <div className="aspect-[3/1] relative bg-gray-100">
      <img 
        src={banner.image_url} 
        alt={banner.title}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex items-center">
        <div className="p-4 text-white">
          <h3 className="font-bold text-lg">{banner.title}</h3>
          {banner.subtitle && <p className="text-sm opacity-80">{banner.subtitle}</p>}
        </div>
      </div>
      <div className="absolute top-2 right-2 flex gap-1">
        <Button
          size="sm"
          variant="secondary"
          className="h-8 w-8 p-0"
          onClick={() => onToggle(banner)}
        >
          {banner.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
      </div>
    </div>
    <div className="p-3 flex items-center justify-between border-t">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <GripVertical className="w-4 h-4" />
        <span>Position: {banner.position}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => onEdit(banner)}>
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => onDelete(banner)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
);

const BannerForm = ({ banner, onSave, onCancel }) => {
  const [form, setForm] = useState({
    title: banner?.title || '',
    subtitle: banner?.subtitle || '',
    image_url: banner?.image_url || '',
    link_url: banner?.link_url || '/shop/products',
    button_text: banner?.button_text || 'Shop Now',
    position: banner?.position || 0,
    is_active: banner?.is_active ?? true
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Title *</label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="New Collection"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Subtitle</label>
        <Input
          value={form.subtitle}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          placeholder="Discover our latest styles"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Image URL *</label>
        <Input
          value={form.image_url}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          placeholder="https://images.unsplash.com/..."
        />
        {form.image_url && (
          <img src={form.image_url} alt="Preview" className="mt-2 h-24 object-cover rounded" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Button Text</label>
          <Input
            value={form.button_text}
            onChange={(e) => setForm({ ...form, button_text: e.target.value })}
            placeholder="Shop Now"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Link URL</label>
          <Input
            value={form.link_url}
            onChange={(e) => setForm({ ...form, link_url: e.target.value })}
            placeholder="/shop/products"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Position</label>
          <Input
            type="number"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch
            checked={form.is_active}
            onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
          />
          <span className="text-sm">Active</span>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.title || !form.image_url}>
          <Save className="w-4 h-4 mr-2" />
          Save Banner
        </Button>
      </div>
    </div>
  );
};

// ==================== Collection Management ====================
const CollectionCard = ({ collection, onEdit, onDelete, onToggle }) => (
  <div className={`bg-white rounded-lg border overflow-hidden ${!collection.is_active ? 'opacity-60' : ''}`}>
    <div className="aspect-square relative bg-gray-100">
      <img 
        src={collection.image_url} 
        alt={collection.name}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <h3 className="font-bold">{collection.name}</h3>
        <p className="text-sm opacity-80">{collection.product_count} Products</p>
      </div>
    </div>
    <div className="p-3 flex items-center justify-between border-t">
      <Button
        size="sm"
        variant="ghost"
        className="h-8 px-2"
        onClick={() => onToggle(collection)}
      >
        {collection.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </Button>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => onEdit(collection)}>
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => onDelete(collection)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
);

const CollectionForm = ({ collection, onSave, onCancel }) => {
  const [form, setForm] = useState({
    name: collection?.name || '',
    description: collection?.description || '',
    image_url: collection?.image_url || '',
    link_url: collection?.link_url || '',
    product_count: collection?.product_count || 0,
    position: collection?.position || 0,
    is_active: collection?.is_active ?? true
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name *</label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Shoes"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Our collection of premium footwear"
          rows={2}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Image URL *</label>
        <Input
          value={form.image_url}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          placeholder="https://images.unsplash.com/..."
        />
        {form.image_url && (
          <img src={form.image_url} alt="Preview" className="mt-2 h-24 w-24 object-cover rounded" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Link URL</label>
          <Input
            value={form.link_url}
            onChange={(e) => setForm({ ...form, link_url: e.target.value })}
            placeholder="/shop/shoes"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Product Count</label>
          <Input
            type="number"
            value={form.product_count}
            onChange={(e) => setForm({ ...form, product_count: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Position</label>
          <Input
            type="number"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch
            checked={form.is_active}
            onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
          />
          <span className="text-sm">Active</span>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name || !form.image_url}>
          <Save className="w-4 h-4 mr-2" />
          Save Collection
        </Button>
      </div>
    </div>
  );
};

// ==================== Settings Tab ====================
const SettingsForm = ({ settings, onSave }) => {
  const [form, setForm] = useState({
    hero_title: settings?.hero_title || 'Elevate Your Style',
    hero_subtitle: settings?.hero_subtitle || 'Discover our latest collection',
    hero_image: settings?.hero_image || '',
    newsletter_enabled: settings?.newsletter_enabled ?? true,
    footer_text: settings?.footer_text || '',
    logo_url: settings?.logo_url || '',
    primary_color: settings?.primary_color || '#000000',
    accent_color: settings?.accent_color || '#ffffff'
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Image className="w-5 h-5" />
          Hero Section
        </h3>
        <div>
          <label className="block text-sm font-medium mb-1">Hero Title</label>
          <Input
            value={form.hero_title}
            onChange={(e) => setForm({ ...form, hero_title: e.target.value })}
            placeholder="Elevate Your Style"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Hero Subtitle</label>
          <Textarea
            value={form.hero_subtitle}
            onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })}
            placeholder="Discover our latest collection"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Hero Background Image</label>
          <Input
            value={form.hero_image}
            onChange={(e) => setForm({ ...form, hero_image: e.target.value })}
            placeholder="https://images.unsplash.com/..."
          />
          {form.hero_image && (
            <img src={form.hero_image} alt="Hero Preview" className="mt-2 h-32 w-full object-cover rounded" />
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Layout className="w-5 h-5" />
          Branding
        </h3>
        <div>
          <label className="block text-sm font-medium mb-1">Logo URL</label>
          <Input
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            placeholder="https://yourstore.com/logo.png"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Primary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                className="h-10 w-16 rounded cursor-pointer"
              />
              <Input
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Accent Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={form.accent_color}
                onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                className="h-10 w-16 rounded cursor-pointer"
              />
              <Input
                value={form.accent_color}
                onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Other Settings
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Newsletter Section</p>
            <p className="text-sm text-gray-500">Show newsletter signup on homepage</p>
          </div>
          <Switch
            checked={form.newsletter_enabled}
            onCheckedChange={(checked) => setForm({ ...form, newsletter_enabled: checked })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Footer Text</label>
          <Input
            value={form.footer_text}
            onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
            placeholder="© 2024 Your Store. All rights reserved."
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save Settings
      </Button>
    </div>
  );
};

// ==================== Main Component ====================
const StorefrontCMS = () => {
  const { selectedStore, getStoreName } = useStore();
  const [activeTab, setActiveTab] = useState('banners');
  const [banners, setBanners] = useState([]);
  const [collections, setCollections] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [editingBanner, setEditingBanner] = useState(null);
  const [editingCollection, setEditingCollection] = useState(null);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [showCollectionForm, setShowCollectionForm] = useState(false);

  const fetchData = useCallback(async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const [bannersRes, collectionsRes, settingsRes] = await Promise.all([
        axios.get(`${API}/api/storefront-cms/banners?store_name=${selectedStore}`),
        axios.get(`${API}/api/storefront-cms/collections?store_name=${selectedStore}`),
        axios.get(`${API}/api/storefront-cms/settings/${selectedStore}`)
      ]);
      setBanners(bannersRes.data.banners || []);
      setCollections(collectionsRes.data.collections || []);
      setSettings(settingsRes.data);
    } catch (error) {
      console.error('Error fetching CMS data:', error);
      toast.error('Failed to load storefront content');
    } finally {
      setLoading(false);
    }
  }, [selectedStore]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Banner handlers
  const saveBanner = async (form) => {
    try {
      if (editingBanner) {
        await axios.put(`${API}/api/storefront-cms/banners/${editingBanner.id}`, form);
        toast.success('Banner updated');
      } else {
        await axios.post(`${API}/api/storefront-cms/banners`, { ...form, store_name: selectedStore });
        toast.success('Banner created');
      }
      setShowBannerForm(false);
      setEditingBanner(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to save banner');
    }
  };

  const deleteBanner = async (banner) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await axios.delete(`${API}/api/storefront-cms/banners/${banner.id}`);
      toast.success('Banner deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete banner');
    }
  };

  const toggleBanner = async (banner) => {
    try {
      await axios.put(`${API}/api/storefront-cms/banners/${banner.id}`, { is_active: !banner.is_active });
      fetchData();
    } catch (error) {
      toast.error('Failed to toggle banner');
    }
  };

  // Collection handlers
  const saveCollection = async (form) => {
    try {
      if (editingCollection) {
        await axios.put(`${API}/api/storefront-cms/collections/${editingCollection.id}`, form);
        toast.success('Collection updated');
      } else {
        await axios.post(`${API}/api/storefront-cms/collections`, { ...form, store_name: selectedStore });
        toast.success('Collection created');
      }
      setShowCollectionForm(false);
      setEditingCollection(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to save collection');
    }
  };

  const deleteCollection = async (collection) => {
    if (!confirm('Delete this collection?')) return;
    try {
      await axios.delete(`${API}/api/storefront-cms/collections/${collection.id}`);
      toast.success('Collection deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete collection');
    }
  };

  const toggleCollection = async (collection) => {
    try {
      await axios.put(`${API}/api/storefront-cms/collections/${collection.id}`, { is_active: !collection.is_active });
      fetchData();
    } catch (error) {
      toast.error('Failed to toggle collection');
    }
  };

  // Settings handler
  const saveSettings = async (form) => {
    try {
      await axios.put(`${API}/api/storefront-cms/settings`, { ...form, store_name: selectedStore });
      toast.success('Settings saved');
      fetchData();
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  if (!selectedStore) {
    return (
      <div className="min-h-screen bg-[#f1f1f1] flex items-center justify-center">
        <p className="text-gray-500">Please select a store first</p>
      </div>
    );
  }

  const storeUrl = `${window.location.origin}/store/${selectedStore}`;

  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Storefront Manager</h1>
              <p className="text-sm text-gray-500">
                Manage banners, collections, and settings for {getStoreName(selectedStore)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Store
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border">
            <TabsTrigger value="banners" className="gap-2">
              <Image className="w-4 h-4" />
              Banners ({banners.length})
            </TabsTrigger>
            <TabsTrigger value="collections" className="gap-2">
              <Layout className="w-4 h-4" />
              Collections ({collections.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Banners Tab */}
          <TabsContent value="banners" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Hero Banners</h2>
              <Button onClick={() => { setEditingBanner(null); setShowBannerForm(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Banner
              </Button>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              </div>
            ) : banners.length === 0 ? (
              <div className="bg-white rounded-lg border p-12 text-center">
                <Image className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No banners yet. Create your first banner!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {banners.map((banner) => (
                  <BannerCard
                    key={banner.id}
                    banner={banner}
                    onEdit={(b) => { setEditingBanner(b); setShowBannerForm(true); }}
                    onDelete={deleteBanner}
                    onToggle={toggleBanner}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Collections Tab */}
          <TabsContent value="collections" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Featured Collections</h2>
              <Button onClick={() => { setEditingCollection(null); setShowCollectionForm(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Collection
              </Button>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              </div>
            ) : collections.length === 0 ? (
              <div className="bg-white rounded-lg border p-12 text-center">
                <Layout className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No collections yet. Create your first collection!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {collections.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    onEdit={(c) => { setEditingCollection(c); setShowCollectionForm(true); }}
                    onDelete={deleteCollection}
                    onToggle={toggleCollection}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <h2 className="text-lg font-semibold mb-4">Storefront Settings</h2>
            <SettingsForm settings={settings} onSave={saveSettings} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Banner Form Dialog */}
      <Dialog open={showBannerForm} onOpenChange={setShowBannerForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBanner ? 'Edit Banner' : 'Add Banner'}</DialogTitle>
          </DialogHeader>
          <BannerForm
            banner={editingBanner}
            onSave={saveBanner}
            onCancel={() => { setShowBannerForm(false); setEditingBanner(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Collection Form Dialog */}
      <Dialog open={showCollectionForm} onOpenChange={setShowCollectionForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCollection ? 'Edit Collection' : 'Add Collection'}</DialogTitle>
          </DialogHeader>
          <CollectionForm
            collection={editingCollection}
            onSave={saveCollection}
            onCancel={() => { setShowCollectionForm(false); setEditingCollection(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StorefrontCMS;
