import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit2, Eye, EyeOff, GripVertical, Menu, 
  Tag, ChevronRight, ChevronDown, Save, X, Link, Hash,
  Layout, Smartphone, ArrowRight, Palette, Loader2
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

const MenuTagsManager = () => {
  const [activeTab, setActiveTab] = useState('header');
  const [store, setStore] = useState('tnvcollection');
  const [menus, setMenus] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchData();
  }, [store, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const menuType = activeTab === 'tags' ? null : activeTab;
      
      const [menusRes, tagsRes] = await Promise.all([
        fetch(`${API}/api/storefront/menus?store=${store}${menuType ? `&menu_type=${menuType}` : ''}`),
        fetch(`${API}/api/storefront/tags?store=${store}&include_inactive=true`)
      ]);
      
      const menusData = await menusRes.json();
      const tagsData = await tagsRes.json();
      
      setMenus(menusData.menus || []);
      setTags(tagsData.tags || []);
    } catch (e) {
      console.error('Failed to fetch data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMenu = async (menuData) => {
    try {
      const method = menuData.id ? 'PUT' : 'POST';
      const url = menuData.id 
        ? `${API}/api/storefront/menus/${menuData.id}?store=${store}`
        : `${API}/api/storefront/menus?store=${store}`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuData)
      });
      
      if (response.ok) {
        fetchData();
        setShowModal(false);
        setEditingItem(null);
      }
    } catch (e) {
      console.error('Failed to save menu:', e);
    }
  };

  const handleSaveTag = async (tagData) => {
    try {
      const method = tagData.id ? 'PUT' : 'POST';
      const url = tagData.id 
        ? `${API}/api/storefront/tags/${tagData.id}?store=${store}`
        : `${API}/api/storefront/tags?store=${store}`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData)
      });
      
      if (response.ok) {
        fetchData();
        setShowModal(false);
        setEditingItem(null);
      }
    } catch (e) {
      console.error('Failed to save tag:', e);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const url = type === 'tag' 
        ? `${API}/api/storefront/tags/${id}?store=${store}`
        : `${API}/api/storefront/menus/${id}?store=${store}`;
      
      await fetch(url, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  const handleAddChild = (parentMenu) => {
    setEditingItem({ 
      type: 'menu', 
      data: { 
        parent_id: parentMenu.id, 
        menu_type: parentMenu.menu_type,
        title: '',
        link: '/'
      } 
    });
    setShowModal(true);
  };

  const initializeDefaultMenus = async () => {
    if (!window.confirm('This will create default menu structure. Continue?')) return;
    
    const defaultMenus = [
      // Header menus
      { title: "Men", link: "/products?category=men", menu_type: "header", order: 0 },
      { title: "Women", link: "/products?category=women", menu_type: "header", order: 1 },
      { title: "Accessories", link: "/products?category=accessories", menu_type: "header", order: 2 },
      { title: "Sale", link: "/products?sale=true", menu_type: "header", order: 3 },
      { title: "New Arrivals", link: "/products?new=true", menu_type: "header", order: 4 },
      // Footer menus
      { title: "Customer Service", link: "#", menu_type: "footer", order: 0 },
      { title: "About Us", link: "/about", menu_type: "footer", order: 1 },
      { title: "Privacy Policy", link: "/privacy", menu_type: "footer", order: 2 },
      { title: "Terms & Conditions", link: "/terms", menu_type: "footer", order: 3 },
    ];

    try {
      await fetch(`${API}/api/storefront/menus/bulk?store=${store}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultMenus)
      });
      fetchData();
    } catch (e) {
      console.error('Failed to create default menus:', e);
    }
  };

  const initializeDefaultTags = async () => {
    if (!window.confirm('This will create default tags. Continue?')) return;
    
    const defaultTags = [
      { name: "New Arrival", slug: "new-arrival", color: "#22c55e" },
      { name: "Best Seller", slug: "best-seller", color: "#f59e0b" },
      { name: "Sale", slug: "sale", color: "#ef4444" },
      { name: "Limited Edition", slug: "limited-edition", color: "#8b5cf6" },
      { name: "Express Shipping", slug: "express-shipping", color: "#3b82f6" },
      { name: "Trending", slug: "trending", color: "#ec4899" },
      { name: "Premium", slug: "premium", color: "#000000" },
      { name: "Eco-Friendly", slug: "eco-friendly", color: "#10b981" },
    ];

    try {
      await fetch(`${API}/api/storefront/tags/bulk?store=${store}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultTags)
      });
      fetchData();
    } catch (e) {
      console.error('Failed to create default tags:', e);
    }
  };

  const getMenuTypeIcon = (type) => {
    switch (type) {
      case 'header': return <Layout className="w-4 h-4" />;
      case 'footer': return <Menu className="w-4 h-4" />;
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      default: return <Menu className="w-4 h-4" />;
    }
  };

  const filteredMenus = activeTab === 'tags' 
    ? [] 
    : menus.filter(m => m.menu_type === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 p-6" data-testid="menu-tags-manager">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Menu & Tags Manager</h1>
          <p className="text-gray-500 mt-1">Manage navigation menus and product tags for your store</p>
        </div>

        {/* Store Selector */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Store:</label>
            <select
              value={store}
              onChange={(e) => setStore(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="tnvcollection">TNC Collection (India)</option>
              <option value="tnvcollectionpk">TNC Collection (Pakistan)</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('header')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'header' 
                ? 'bg-white text-black shadow-sm' 
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <Layout className="w-4 h-4" />
            Header Menu
          </button>
          <button
            onClick={() => setActiveTab('footer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'footer' 
                ? 'bg-white text-black shadow-sm' 
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <Menu className="w-4 h-4" />
            Footer Menu
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'tags' 
                ? 'bg-white text-black shadow-sm' 
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <Tag className="w-4 h-4" />
            Tags ({tags.length})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Menu Tabs (Header/Footer) */}
            {activeTab !== 'tags' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingItem({ type: 'menu', data: { menu_type: activeTab } });
                      setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                    data-testid="add-menu-btn"
                  >
                    <Plus className="w-4 h-4" />
                    Add Menu Item
                  </button>
                  
                  {filteredMenus.length === 0 && (
                    <button
                      onClick={initializeDefaultMenus}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      <Plus className="w-4 h-4" />
                      Initialize Default Menus
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {filteredMenus.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <Menu className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No menu items yet. Add your first menu item or initialize defaults.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredMenus.map((menu) => (
                        <MenuItemRow
                          key={menu.id}
                          menu={menu}
                          onEdit={() => {
                            setEditingItem({ type: 'menu', data: menu });
                            setShowModal(true);
                          }}
                          onDelete={() => handleDelete('menu', menu.id)}
                          onAddChild={() => handleAddChild(menu)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags Tab */}
            {activeTab === 'tags' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingItem({ type: 'tag', data: null });
                      setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                    data-testid="add-tag-btn"
                  >
                    <Plus className="w-4 h-4" />
                    Add Tag
                  </button>
                  
                  {tags.length === 0 && (
                    <button
                      onClick={initializeDefaultTags}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      <Plus className="w-4 h-4" />
                      Initialize Default Tags
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {tags.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No tags yet. Add your first tag or initialize defaults.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                      {tags.map((tag) => (
                        <TagCard
                          key={tag.id}
                          tag={tag}
                          onEdit={() => {
                            setEditingItem({ type: 'tag', data: tag });
                            setShowModal(true);
                          }}
                          onDelete={() => handleDelete('tag', tag.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal */}
        {showModal && editingItem && (
          editingItem.type === 'menu' ? (
            <MenuModal
              data={editingItem.data}
              menus={menus}
              onSave={handleSaveMenu}
              onClose={() => {
                setShowModal(false);
                setEditingItem(null);
              }}
            />
          ) : (
            <TagModal
              data={editingItem.data}
              onSave={handleSaveTag}
              onClose={() => {
                setShowModal(false);
                setEditingItem(null);
              }}
            />
          )
        )}
      </div>
    </div>
  );
};

// Menu Item Row Component with children
const MenuItemRow = ({ menu, onEdit, onDelete, onAddChild, level = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = menu.children && menu.children.length > 0;

  return (
    <div>
      <div 
        className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition ${level > 0 ? 'pl-12 bg-gray-50/50' : ''}`}
        data-testid={`menu-row-${menu.id}`}
      >
        <div className="text-gray-400 cursor-move">
          <GripVertical className="w-5 h-5" />
        </div>
        
        {hasChildren && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{menu.title}</h3>
            {menu.is_active === false && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                Inactive
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <Link className="w-3 h-3" />
            <span className="truncate">{menu.link}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onAddChild}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title="Add submenu"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Children */}
      {expanded && hasChildren && (
        <div className="border-l-2 border-gray-200 ml-8">
          {menu.children.map((child) => (
            <div key={child.id} className="flex items-center gap-4 p-3 pl-6 hover:bg-gray-50 transition">
              <ArrowRight className="w-4 h-4 text-gray-300" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-700">{child.title}</h4>
                <span className="text-xs text-gray-400">{child.link}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(child)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onDelete(child.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Tag Card Component
const TagCard = ({ tag, onEdit, onDelete }) => (
  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
    <div 
      className="w-4 h-4 rounded-full flex-shrink-0"
      style={{ backgroundColor: tag.color || '#000' }}
    />
    <div className="flex-1 min-w-0">
      <h3 className="font-medium text-gray-900">{tag.name}</h3>
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Hash className="w-3 h-3" />
        <span>{tag.slug}</span>
      </div>
    </div>
    <div className="flex items-center gap-1">
      <button
        onClick={onEdit}
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition"
        title="Edit"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// Menu Modal Component
const MenuModal = ({ data, menus, onSave, onClose }) => {
  const isEdit = data?.id;
  
  const [formData, setFormData] = useState({
    title: data?.title || '',
    link: data?.link || '/',
    menu_type: data?.menu_type || 'header',
    parent_id: data?.parent_id || null,
    icon: data?.icon || '',
    is_active: data?.is_active !== false,
    order: data?.order || 0,
    ...data
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  // Get parent menus for dropdown
  const parentMenus = menus.filter(m => !m.parent_id && m.menu_type === formData.menu_type);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Menu Item' : 'Add Menu Item'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="e.g., Men's Shoes"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link *</label>
            <input
              type="text"
              value={formData.link}
              onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="/products?category=men"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Menu Type</label>
              <select
                value={formData.menu_type}
                onChange={(e) => setFormData(prev => ({ ...prev, menu_type: e.target.value, parent_id: null }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="header">Header</option>
                <option value="footer">Footer</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                min="0"
              />
            </div>
          </div>
          
          {parentMenus.length > 0 && !formData.parent_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Menu (optional)</label>
              <select
                value={formData.parent_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, parent_id: e.target.value || null }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="">None (Top Level)</option>
                {parentMenus.map(menu => (
                  <option key={menu.id} value={menu.id}>{menu.title}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex items-center pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
            >
              <Save className="w-4 h-4" />
              {isEdit ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Tag Modal Component
const TagModal = ({ data, onSave, onClose }) => {
  const isEdit = !!data?.id;
  
  const [formData, setFormData] = useState({
    name: data?.name || '',
    slug: data?.slug || '',
    description: data?.description || '',
    color: data?.color || '#000000',
    is_active: data?.is_active !== false,
    ...data
  });

  const handleNameChange = (name) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setFormData(prev => ({ 
      ...prev, 
      name, 
      slug: prev.id ? prev.slug : slug // Only auto-generate slug for new tags
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const presetColors = [
    '#000000', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', 
    '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#84cc16'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Tag' : 'Add Tag'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tag Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="e.g., New Arrival"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="new-arrival"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              rows={2}
              placeholder="Optional description for this tag"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {presetColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`w-6 h-6 rounded-full border-2 transition ${
                      formData.color === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-8 h-8 rounded cursor-pointer"
              />
            </div>
          </div>
          
          <div className="flex items-center pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>
          
          {/* Preview */}
          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
            <div className="flex items-center gap-2">
              <span 
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: formData.color }}
              >
                {formData.name || 'Tag Name'}
              </span>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
            >
              <Save className="w-4 h-4" />
              {isEdit ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuTagsManager;
