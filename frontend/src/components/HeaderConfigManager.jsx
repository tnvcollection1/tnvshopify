import React, { useState, useEffect } from 'react';
import { 
  Save, Plus, Trash2, Edit2, GripVertical, Eye, EyeOff, 
  Image, Type, Palette, Menu, ChevronDown, ChevronUp, 
  Settings, Megaphone, LayoutGrid, Loader2, Check, X,
  Upload, RefreshCw, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Default emoji icons for categories
const EMOJI_OPTIONS = ['👩', '👨', '👶', '💄', '🏠', '👗', '👟', '👜', '⚽', '✨', '💎', '🏷️', '🎒', '👔', '💵', '🚚', '✓', '↩️', '🌟', '🔥'];

const HeaderConfigManager = () => {
  const [activeTab, setActiveTab] = useState('logo');
  const [store, setStore] = useState('tnvcollection');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  
  // Individual state for each section
  const [logo, setLogo] = useState({ text: 'TNV', badge: 'COLLECTION', badgeColor: '#FF6B9D', image: null });
  const [promoMessages, setPromoMessages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [megaMenu, setMegaMenu] = useState({});
  
  // Editing states
  const [editingPromo, setEditingPromo] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingMegaMenu, setEditingMegaMenu] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, [store]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/storefront/config/navigation/${store}`);
      const data = await res.json();
      
      setConfig(data);
      setLogo(data.logo || { text: 'TNV', badge: 'COLLECTION', badgeColor: '#FF6B9D' });
      setPromoMessages(data.promoMessages || []);
      setCategories(data.categories || []);
      setMegaMenu(data.megaMenu || {});
    } catch (e) {
      console.error('Failed to fetch config:', e);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (section, data) => {
    setSaving(true);
    try {
      let endpoint = '';
      let body = data;
      
      switch(section) {
        case 'logo':
          endpoint = `/api/storefront/config/logo/${store}`;
          break;
        case 'promos':
          endpoint = `/api/storefront/config/promo-messages/${store}`;
          break;
        case 'menu':
          endpoint = `/api/storefront/config/menu/${store}`;
          break;
        case 'megaMenu':
          endpoint = `/api/storefront/config/mega-menu/${store}/${data.category}`;
          body = data.config;
          break;
        default:
          endpoint = `/api/storefront/config/navigation/${store}`;
      }
      
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        toast.success('Configuration saved successfully');
        fetchConfig();
      } else {
        throw new Error('Save failed');
      }
    } catch (e) {
      console.error('Failed to save:', e);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'logo', label: 'Logo', icon: Type },
    { id: 'promos', label: 'Promo Messages', icon: Megaphone },
    { id: 'menu', label: 'Navigation Menu', icon: Menu },
    { id: 'megaMenu', label: 'Mega Menu', icon: LayoutGrid },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Header Configuration</h1>
            <p className="text-gray-500 mt-1">Manage logo, promo messages, and navigation menu</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Store Selector */}
            <select
              value={store}
              onChange={(e) => setStore(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="tnvcollection">TNV Collection</option>
              <option value="tnvcollectionpk">TNV Collection PK</option>
            </select>
            
            {/* Preview Button */}
            <a
              href={`/tnv`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Preview</span>
            </a>
            
            {/* Refresh Button */}
            <button
              onClick={fetchConfig}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm mb-6">
        <div className="flex border-b">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition ${
                activeTab === tab.id 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Logo Tab */}
          {activeTab === 'logo' && (
            <LogoEditor 
              logo={logo} 
              setLogo={setLogo} 
              onSave={() => saveConfig('logo', logo)}
              saving={saving}
            />
          )}

          {/* Promo Messages Tab */}
          {activeTab === 'promos' && (
            <PromoMessagesEditor
              messages={promoMessages}
              setMessages={setPromoMessages}
              onSave={() => saveConfig('promos', promoMessages)}
              saving={saving}
            />
          )}

          {/* Navigation Menu Tab */}
          {activeTab === 'menu' && (
            <MenuEditor
              categories={categories}
              setCategories={setCategories}
              onSave={() => saveConfig('menu', categories)}
              saving={saving}
            />
          )}

          {/* Mega Menu Tab */}
          {activeTab === 'megaMenu' && (
            <MegaMenuEditor
              megaMenu={megaMenu}
              setMegaMenu={setMegaMenu}
              categories={categories}
              onSave={(category, config) => saveConfig('megaMenu', { category, config })}
              saving={saving}
            />
          )}
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-bold mb-4 flex items-center space-x-2">
          <Eye className="w-4 h-4" />
          <span>Live Preview</span>
        </h3>
        <HeaderPreview logo={logo} promoMessages={promoMessages} categories={categories} />
      </div>
    </div>
  );
};

// ==================== Logo Editor ====================
const LogoEditor = ({ logo, setLogo, onSave, saving }) => {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Text Logo */}
        <div className="space-y-4">
          <h3 className="font-medium">Text Logo</h3>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Logo Text</label>
            <input
              type="text"
              value={logo.text || ''}
              onChange={(e) => setLogo({ ...logo, text: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="TNV"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Badge Text</label>
            <input
              type="text"
              value={logo.badge || ''}
              onChange={(e) => setLogo({ ...logo, badge: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="COLLECTION"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Badge Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={logo.badgeColor || '#FF6B9D'}
                onChange={(e) => setLogo({ ...logo, badgeColor: e.target.value })}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={logo.badgeColor || '#FF6B9D'}
                onChange={(e) => setLogo({ ...logo, badgeColor: e.target.value })}
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#FF6B9D"
              />
            </div>
          </div>
        </div>

        {/* Image Logo */}
        <div className="space-y-4">
          <h3 className="font-medium">Image Logo (Optional)</h3>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Logo Image URL</label>
            <input
              type="text"
              value={logo.image || ''}
              onChange={(e) => setLogo({ ...logo, image: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/logo.png"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Width (px)</label>
              <input
                type="number"
                value={logo.width || ''}
                onChange={(e) => setLogo({ ...logo, width: parseInt(e.target.value) || null })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Auto"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Height (px)</label>
              <input
                type="number"
                value={logo.height || ''}
                onChange={(e) => setLogo({ ...logo, height: parseInt(e.target.value) || null })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="32"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Preview:</p>
            <div className="flex items-center space-x-2">
              {logo.image ? (
                <img src={logo.image} alt="Logo" style={{ height: logo.height || 32 }} />
              ) : (
                <>
                  <span className="text-2xl font-black">{logo.text || 'TNV'}</span>
                  {logo.badge && (
                    <span 
                      className="text-white px-3 py-1 rounded-full text-xs font-bold"
                      style={{ backgroundColor: logo.badgeColor || '#FF6B9D' }}
                    >
                      {logo.badge}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Logo</span>
        </button>
      </div>
    </div>
  );
};

// ==================== Promo Messages Editor ====================
const PromoMessagesEditor = ({ messages, setMessages, onSave, saving }) => {
  const [newMessage, setNewMessage] = useState({ text: '', icon: '💵', active: true, order: 0 });

  const addMessage = () => {
    if (!newMessage.text.trim()) return;
    setMessages([...messages, { ...newMessage, order: messages.length }]);
    setNewMessage({ text: '', icon: '💵', active: true, order: 0 });
  };

  const updateMessage = (index, field, value) => {
    const updated = [...messages];
    updated[index] = { ...updated[index], [field]: value };
    setMessages(updated);
  };

  const removeMessage = (index) => {
    setMessages(messages.filter((_, i) => i !== index));
  };

  const moveMessage = (index, direction) => {
    const updated = [...messages];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= messages.length) return;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setMessages(updated);
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        These messages rotate in the top bar of the header (e.g., "Cash On Delivery", "Free Delivery and Exchange")
      </p>

      {/* Existing Messages */}
      <div className="space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex flex-col">
              <button 
                onClick={() => moveMessage(idx, 'up')}
                className="p-1 hover:bg-gray-200 rounded"
                disabled={idx === 0}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button 
                onClick={() => moveMessage(idx, 'down')}
                className="p-1 hover:bg-gray-200 rounded"
                disabled={idx === messages.length - 1}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            
            {/* Icon Selector */}
            <select
              value={msg.icon || '💵'}
              onChange={(e) => updateMessage(idx, 'icon', e.target.value)}
              className="w-16 text-center text-xl bg-white border rounded p-1"
            >
              {EMOJI_OPTIONS.map(emoji => (
                <option key={emoji} value={emoji}>{emoji}</option>
              ))}
            </select>
            
            {/* Text */}
            <input
              type="text"
              value={msg.text}
              onChange={(e) => updateMessage(idx, 'text', e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Promo message text"
            />
            
            {/* Active Toggle */}
            <button
              onClick={() => updateMessage(idx, 'active', !msg.active)}
              className={`p-2 rounded-lg ${msg.active ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}
              title={msg.active ? 'Active' : 'Inactive'}
            >
              {msg.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            
            {/* Delete */}
            <button
              onClick={() => removeMessage(idx)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add New Message */}
      <div className="flex items-center space-x-3 p-3 border-2 border-dashed rounded-lg">
        <select
          value={newMessage.icon}
          onChange={(e) => setNewMessage({ ...newMessage, icon: e.target.value })}
          className="w-16 text-center text-xl bg-white border rounded p-1"
        >
          {EMOJI_OPTIONS.map(emoji => (
            <option key={emoji} value={emoji}>{emoji}</option>
          ))}
        </select>
        
        <input
          type="text"
          value={newMessage.text}
          onChange={(e) => setNewMessage({ ...newMessage, text: e.target.value })}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter new promo message..."
          onKeyPress={(e) => e.key === 'Enter' && addMessage()}
        />
        
        <button
          onClick={addMessage}
          className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </button>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Promo Messages</span>
        </button>
      </div>
    </div>
  );
};

// ==================== Menu Editor ====================
const MenuEditor = ({ categories, setCategories, onSave, saving }) => {
  const [editingIndex, setEditingIndex] = useState(null);

  const updateCategory = (index, field, value) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], [field]: value };
    setCategories(updated);
  };

  const addCategory = () => {
    setCategories([...categories, {
      name: 'New Category',
      path: '/new',
      icon: { type: 'emoji', value: '📁' },
      color: '#000000',
      bgColor: '#f5f5f5',
      order: categories.length,
      active: true,
      subNav: []
    }]);
    setEditingIndex(categories.length);
  };

  const removeCategory = (index) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const moveCategory = (index, direction) => {
    const updated = [...categories];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setCategories(updated);
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        Configure the main navigation categories (WOMEN, MEN, KIDS, etc.)
      </p>

      {/* Categories List */}
      <div className="space-y-3">
        {categories.map((cat, idx) => (
          <div key={idx} className="border rounded-lg overflow-hidden">
            <div className="flex items-center space-x-3 p-3 bg-gray-50">
              <div className="flex flex-col">
                <button 
                  onClick={() => moveCategory(idx, 'up')}
                  className="p-1 hover:bg-gray-200 rounded"
                  disabled={idx === 0}
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => moveCategory(idx, 'down')}
                  className="p-1 hover:bg-gray-200 rounded"
                  disabled={idx === categories.length - 1}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Icon */}
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{ backgroundColor: cat.bgColor || '#f5f5f5' }}
              >
                {cat.icon?.value || cat.icon || '📁'}
              </div>

              {/* Name */}
              <span className="font-medium flex-1">{cat.name}</span>

              {/* Path */}
              <span className="text-gray-400 text-sm">{cat.path}</span>

              {/* Active Toggle */}
              <button
                onClick={() => updateCategory(idx, 'active', !cat.active)}
                className={`p-2 rounded-lg ${cat.active !== false ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}
              >
                {cat.active !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              {/* Edit */}
              <button
                onClick={() => setEditingIndex(editingIndex === idx ? null : idx)}
                className={`p-2 rounded-lg ${editingIndex === idx ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
              >
                <Edit2 className="w-4 h-4" />
              </button>

              {/* Delete */}
              <button
                onClick={() => removeCategory(idx)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Expanded Edit Form */}
            {editingIndex === idx && (
              <div className="p-4 border-t bg-white space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Category Name</label>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => updateCategory(idx, 'name', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Path</label>
                    <input
                      type="text"
                      value={cat.path}
                      onChange={(e) => updateCategory(idx, 'path', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="/women"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Icon</label>
                    <select
                      value={cat.icon?.value || cat.icon || '📁'}
                      onChange={(e) => updateCategory(idx, 'icon', { type: 'emoji', value: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-xl"
                    >
                      {EMOJI_OPTIONS.map(emoji => (
                        <option key={emoji} value={emoji}>{emoji}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Icon Background Color</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={cat.bgColor || '#f5f5f5'}
                        onChange={(e) => updateCategory(idx, 'bgColor', e.target.value)}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={cat.bgColor || '#f5f5f5'}
                        onChange={(e) => updateCategory(idx, 'bgColor', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Text Color</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={cat.color || '#000000'}
                        onChange={(e) => updateCategory(idx, 'color', e.target.value)}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={cat.color || '#000000'}
                        onChange={(e) => updateCategory(idx, 'color', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-navigation Items */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Secondary Navigation (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={(cat.subNav || []).join(', ')}
                    onChange={(e) => updateCategory(idx, 'subNav', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CLOTHING, SHOES, ACCESSORIES, BAGS, SPORTS, NEW ARRIVALS, PREMIUM, SALE, BRANDS"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    These appear below the header when this category is active
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`highlight-${idx}`}
                    checked={cat.highlight || false}
                    onChange={(e) => updateCategory(idx, 'highlight', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor={`highlight-${idx}`} className="text-sm">
                    Highlight this category (e.g., for SALE)
                  </label>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Category */}
      <button
        onClick={addCategory}
        className="flex items-center space-x-2 px-4 py-2 border-2 border-dashed rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 w-full justify-center"
      >
        <Plus className="w-4 h-4" />
        <span>Add Category</span>
      </button>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Menu</span>
        </button>
      </div>
    </div>
  );
};

// ==================== Mega Menu Editor ====================
const MegaMenuEditor = ({ megaMenu, setMegaMenu, categories, onSave, saving }) => {
  const [selectedCategory, setSelectedCategory] = useState('WOMEN');
  const [editingColumn, setEditingColumn] = useState(null);

  const currentMegaMenu = megaMenu[selectedCategory] || { columns: [], featuredImage: '', featuredTitle: '', featuredLink: '' };

  const updateMegaMenu = (field, value) => {
    setMegaMenu({
      ...megaMenu,
      [selectedCategory]: {
        ...currentMegaMenu,
        [field]: value
      }
    });
  };

  const addColumn = () => {
    const newColumns = [...(currentMegaMenu.columns || []), { title: 'NEW COLUMN', items: [] }];
    updateMegaMenu('columns', newColumns);
  };

  const updateColumn = (colIdx, field, value) => {
    const newColumns = [...(currentMegaMenu.columns || [])];
    newColumns[colIdx] = { ...newColumns[colIdx], [field]: value };
    updateMegaMenu('columns', newColumns);
  };

  const removeColumn = (colIdx) => {
    const newColumns = (currentMegaMenu.columns || []).filter((_, i) => i !== colIdx);
    updateMegaMenu('columns', newColumns);
  };

  const addItem = (colIdx) => {
    const newColumns = [...(currentMegaMenu.columns || [])];
    newColumns[colIdx].items = [...(newColumns[colIdx].items || []), { name: 'New Item', path: '/new' }];
    updateMegaMenu('columns', newColumns);
  };

  const updateItem = (colIdx, itemIdx, field, value) => {
    const newColumns = [...(currentMegaMenu.columns || [])];
    newColumns[colIdx].items[itemIdx] = { ...newColumns[colIdx].items[itemIdx], [field]: value };
    updateMegaMenu('columns', newColumns);
  };

  const removeItem = (colIdx, itemIdx) => {
    const newColumns = [...(currentMegaMenu.columns || [])];
    newColumns[colIdx].items = newColumns[colIdx].items.filter((_, i) => i !== itemIdx);
    updateMegaMenu('columns', newColumns);
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        Configure the dropdown mega menu for each category (shows when hovering)
      </p>

      {/* Category Selector */}
      <div className="flex items-center space-x-4">
        <label className="font-medium">Select Category:</label>
        <div className="flex flex-wrap gap-2">
          {['WOMEN', 'MEN', 'KIDS', 'BEAUTY', 'HOME'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedCategory === cat 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Mega Menu Editor */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Columns */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="font-medium">Menu Columns</h4>
          
          <div className="grid md:grid-cols-2 gap-4">
            {(currentMegaMenu.columns || []).map((column, colIdx) => (
              <div key={colIdx} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={column.title}
                    onChange={(e) => updateColumn(colIdx, 'title', e.target.value)}
                    className="font-bold text-sm uppercase bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={() => removeColumn(colIdx)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {(column.items || []).map((item, itemIdx) => (
                    <div key={itemIdx} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(colIdx, itemIdx, 'name', e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Item name"
                      />
                      <input
                        type="text"
                        value={item.path}
                        onChange={(e) => updateItem(colIdx, itemIdx, 'path', e.target.value)}
                        className="w-24 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="/path"
                      />
                      <button
                        onClick={() => removeItem(colIdx, itemIdx)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => addItem(colIdx)}
                  className="mt-2 text-sm text-blue-500 hover:text-blue-600 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Item</span>
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addColumn}
            className="flex items-center space-x-2 px-4 py-2 border-2 border-dashed rounded-lg text-gray-500 hover:text-gray-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Column</span>
          </button>
        </div>

        {/* Featured Image */}
        <div className="space-y-4">
          <h4 className="font-medium">Featured Image</h4>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Image URL</label>
            <input
              type="text"
              value={currentMegaMenu.featuredImage || ''}
              onChange={(e) => updateMegaMenu('featuredImage', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Title</label>
            <input
              type="text"
              value={currentMegaMenu.featuredTitle || ''}
              onChange={(e) => updateMegaMenu('featuredTitle', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="New Arrivals"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Link</label>
            <input
              type="text"
              value={currentMegaMenu.featuredLink || ''}
              onChange={(e) => updateMegaMenu('featuredLink', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="/women/new"
            />
          </div>

          {/* Preview */}
          {currentMegaMenu.featuredImage && (
            <div className="border rounded-lg overflow-hidden">
              <img 
                src={currentMegaMenu.featuredImage} 
                alt={currentMegaMenu.featuredTitle}
                className="w-full h-40 object-cover"
              />
              <p className="p-2 text-sm font-medium text-center">{currentMegaMenu.featuredTitle}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onSave(selectedCategory, currentMegaMenu)}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save {selectedCategory} Mega Menu</span>
        </button>
      </div>
    </div>
  );
};

// ==================== Header Preview ====================
const HeaderPreview = ({ logo, promoMessages, categories }) => {
  const [promoIndex, setPromoIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPromoIndex(prev => (prev + 1) % (promoMessages.length || 1));
    }, 2000);
    return () => clearInterval(interval);
  }, [promoMessages.length]);

  const activeMessages = promoMessages.filter(m => m.active !== false);

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Top Bar Preview */}
      <div className="bg-[#1a1a1a] text-white h-9 px-4 flex items-center justify-between text-sm">
        <span>English | العربية</span>
        <span className="flex items-center space-x-2">
          <span>{activeMessages[promoIndex]?.icon}</span>
          <span>{activeMessages[promoIndex]?.text || 'No messages'}</span>
        </span>
        <span>🇦🇪 AE</span>
      </div>

      {/* Main Header Preview */}
      <div className="border-b px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {logo.image ? (
            <img src={logo.image} alt="Logo" style={{ height: logo.height || 32 }} />
          ) : (
            <>
              <span className="text-2xl font-black">{logo.text || 'TNV'}</span>
              {logo.badge && (
                <span 
                  className="text-white px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: logo.badgeColor || '#FF6B9D' }}
                >
                  {logo.badge}
                </span>
              )}
            </>
          )}
        </div>

        <nav className="flex items-center space-x-1">
          {categories.filter(c => c.active !== false).slice(0, 5).map((cat, idx) => (
            <div key={idx} className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-gray-100">
              <span 
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ backgroundColor: cat.bgColor || '#f5f5f5' }}
              >
                {cat.icon?.value || cat.icon || '📁'}
              </span>
              <span className="text-sm font-medium">{cat.name}</span>
            </div>
          ))}
        </nav>

        <div className="flex items-center space-x-4 text-gray-600">
          <span>🔍</span>
          <span>👤</span>
          <span>❤️</span>
          <span>🛒</span>
        </div>
      </div>
    </div>
  );
};

export default HeaderConfigManager;
