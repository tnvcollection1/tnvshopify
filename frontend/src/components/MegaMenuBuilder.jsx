import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Trash2, GripVertical, Save, Eye, ChevronDown, ChevronRight,
  Image, Link2, Type, Columns, Layout, Settings, Copy, RefreshCw,
  ArrowLeft, AlertCircle, Check, X, Upload, Edit2, Move, Sparkles,
  Store, ShoppingBag, Home, Utensils, Laptop, Package
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Template icons mapping
const TEMPLATE_ICONS = {
  'fashion_store': ShoppingBag,
  'electronics': Laptop,
  'beauty': Sparkles,
  'home_living': Home,
  'grocery': Utensils
};

// Sortable Item Component
const SortableItem = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-center">
        <div {...listeners} className="cursor-grab p-1 hover:bg-gray-100 rounded mr-2">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        {children}
      </div>
    </div>
  );
};

// Menu Item Editor
const MenuItemEditor = ({ item, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [localItem, setLocalItem] = useState(item);
  
  const handleSave = () => {
    onUpdate(localItem);
    setEditing(false);
  };
  
  if (editing) {
    return (
      <div className="bg-gray-50 p-3 rounded-lg border space-y-2">
        <input
          type="text"
          value={localItem.name}
          onChange={(e) => setLocalItem({ ...localItem, name: e.target.value })}
          placeholder="Item name"
          className="w-full px-3 py-2 border rounded text-sm"
        />
        <input
          type="text"
          value={localItem.path}
          onChange={(e) => setLocalItem({ ...localItem, path: e.target.value })}
          placeholder="Link path (e.g., /women/dresses)"
          className="w-full px-3 py-2 border rounded text-sm"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={localItem.badge || ''}
            onChange={(e) => setLocalItem({ ...localItem, badge: e.target.value })}
            placeholder="Badge (e.g., NEW, SALE)"
            className="flex-1 px-3 py-2 border rounded text-sm"
          />
          <input
            type="color"
            value={localItem.badgeColor || '#ef4444'}
            onChange={(e) => setLocalItem({ ...localItem, badgeColor: e.target.value })}
            className="w-12 h-10 border rounded cursor-pointer"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="px-3 py-1 bg-green-500 text-white rounded text-sm flex items-center gap-1">
            <Check className="w-4 h-4" /> Save
          </button>
          <button onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-200 rounded text-sm flex items-center gap-1">
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-white border rounded hover:border-blue-300 group">
      <div className="flex items-center gap-2">
        <span className="text-sm">{item.name}</span>
        {item.badge && (
          <span 
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: item.badgeColor || '#ef4444', color: 'white' }}
          >
            {item.badge}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        <button onClick={() => setEditing(true)} className="p-1 hover:bg-gray-100 rounded">
          <Edit2 className="w-4 h-4 text-gray-500" />
        </button>
        <button onClick={() => onDelete(item.id)} className="p-1 hover:bg-red-50 rounded">
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </div>
  );
};

// Column Editor Component
const ColumnEditor = ({ column, onUpdate, onDelete, baseUrl }) => {
  const [expanded, setExpanded] = useState(true);
  const [items, setItems] = useState(column.items || []);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      onUpdate({ ...column, items: newItems });
    }
  };
  
  const handleAddItem = () => {
    const newItem = {
      id: `item-${Date.now()}`,
      name: 'New Item',
      path: `${baseUrl}/new-item`
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    onUpdate({ ...column, items: newItems });
  };
  
  const handleUpdateItem = (updatedItem) => {
    const newItems = items.map(i => i.id === updatedItem.id ? updatedItem : i);
    setItems(newItems);
    onUpdate({ ...column, items: newItems });
  };
  
  const handleDeleteItem = (itemId) => {
    const newItems = items.filter(i => i.id !== itemId);
    setItems(newItems);
    onUpdate({ ...column, items: newItems });
  };
  
  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      {/* Column Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <input
            type="text"
            value={column.title}
            onChange={(e) => onUpdate({ ...column, title: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
          />
          <span className="text-xs text-gray-400">({items.length} items)</span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(column.id); }}
          className="p-1 hover:bg-red-50 rounded text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {/* Column Content */}
      {expanded && (
        <div className="p-4 space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {items.map(item => (
                <SortableItem key={item.id} id={item.id}>
                  <div className="flex-1">
                    <MenuItemEditor
                      item={item}
                      onUpdate={handleUpdateItem}
                      onDelete={handleDeleteItem}
                    />
                  </div>
                </SortableItem>
              ))}
            </SortableContext>
          </DndContext>
          
          <button
            onClick={handleAddItem}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      )}
    </div>
  );
};

// Promo Banner Editor
const PromoBannerEditor = ({ banner, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [localBanner, setLocalBanner] = useState(banner);
  
  const handleSave = () => {
    onUpdate(localBanner);
    setEditing(false);
  };
  
  if (editing) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Image URL</label>
          <input
            type="text"
            value={localBanner.image}
            onChange={(e) => setLocalBanner({ ...localBanner, image: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Title</label>
            <input
              type="text"
              value={localBanner.title || ''}
              onChange={(e) => setLocalBanner({ ...localBanner, title: e.target.value })}
              className="w-full px-3 py-2 border rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Subtitle</label>
            <input
              type="text"
              value={localBanner.subtitle || ''}
              onChange={(e) => setLocalBanner({ ...localBanner, subtitle: e.target.value })}
              className="w-full px-3 py-2 border rounded text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Link</label>
            <input
              type="text"
              value={localBanner.link}
              onChange={(e) => setLocalBanner({ ...localBanner, link: e.target.value })}
              className="w-full px-3 py-2 border rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Button Text</label>
            <input
              type="text"
              value={localBanner.buttonText || ''}
              onChange={(e) => setLocalBanner({ ...localBanner, buttonText: e.target.value })}
              className="w-full px-3 py-2 border rounded text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="px-4 py-2 bg-green-500 text-white rounded text-sm">Save</button>
          <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-200 rounded text-sm">Cancel</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative group">
      <div className="aspect-[4/5] rounded-lg overflow-hidden border bg-gray-100">
        <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
          {banner.title && <h4 className="text-white font-bold">{banner.title}</h4>}
          {banner.subtitle && <p className="text-white/80 text-sm">{banner.subtitle}</p>}
          {banner.buttonText && (
            <span className="inline-block mt-2 px-3 py-1 bg-white text-black text-sm rounded">{banner.buttonText}</span>
          )}
        </div>
      </div>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
        <button onClick={() => setEditing(true)} className="p-1.5 bg-white rounded-full shadow">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(banner.id)} className="p-1.5 bg-white rounded-full shadow text-red-500">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Section Editor Component
const SectionEditor = ({ section, onUpdate, onDelete, baseUrl }) => {
  const [expanded, setExpanded] = useState(true);
  const [columns, setColumns] = useState(section.columns || []);
  const [promoBanners, setPromoBanners] = useState(section.promoBanners || []);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  const handleColumnDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = columns.findIndex(c => c.id === active.id);
      const newIndex = columns.findIndex(c => c.id === over.id);
      const newColumns = arrayMove(columns, oldIndex, newIndex);
      setColumns(newColumns);
      onUpdate({ ...section, columns: newColumns });
    }
  };
  
  const handleAddColumn = () => {
    const newColumn = {
      id: `col-${Date.now()}`,
      title: 'NEW COLUMN',
      titleLink: `${baseUrl}/category`,
      width: 1,
      items: []
    };
    const newColumns = [...columns, newColumn];
    setColumns(newColumns);
    onUpdate({ ...section, columns: newColumns });
  };
  
  const handleUpdateColumn = (updatedColumn) => {
    const newColumns = columns.map(c => c.id === updatedColumn.id ? updatedColumn : c);
    setColumns(newColumns);
    onUpdate({ ...section, columns: newColumns });
  };
  
  const handleDeleteColumn = (columnId) => {
    const newColumns = columns.filter(c => c.id !== columnId);
    setColumns(newColumns);
    onUpdate({ ...section, columns: newColumns });
  };
  
  const handleAddPromoBanner = () => {
    const newBanner = {
      id: `promo-${Date.now()}`,
      image: 'https://via.placeholder.com/400x500',
      title: 'New Banner',
      subtitle: 'Click to edit',
      link: `${baseUrl}/promo`,
      buttonText: 'Shop Now',
      position: 'right'
    };
    const newBanners = [...promoBanners, newBanner];
    setPromoBanners(newBanners);
    onUpdate({ ...section, promoBanners: newBanners });
  };
  
  const handleUpdatePromoBanner = (updatedBanner) => {
    const newBanners = promoBanners.map(b => b.id === updatedBanner.id ? updatedBanner : b);
    setPromoBanners(newBanners);
    onUpdate({ ...section, promoBanners: newBanners });
  };
  
  const handleDeletePromoBanner = (bannerId) => {
    const newBanners = promoBanners.filter(b => b.id !== bannerId);
    setPromoBanners(newBanners);
    onUpdate({ ...section, promoBanners: newBanners });
  };
  
  return (
    <div className="bg-white border-2 rounded-2xl overflow-hidden shadow-sm">
      {/* Section Header */}
      <div 
        className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <h3 className="text-lg font-bold">{section.categoryName}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${section.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {section.enabled ? 'Active' : 'Disabled'}
          </span>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={section.enabled}
              onChange={(e) => onUpdate({ ...section, enabled: e.target.checked })}
              className="rounded"
            />
            Enabled
          </label>
          <button 
            onClick={() => onDelete(section.id)}
            className="p-2 hover:bg-red-50 rounded-lg text-red-500"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Section Content */}
      {expanded && (
        <div className="p-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Columns Section */}
            <div className="col-span-9">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Columns className="w-4 h-4" /> Menu Columns
                </h4>
                <button
                  onClick={handleAddColumn}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4" /> Add Column
                </button>
              </div>
              
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColumnDragEnd}>
                <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                  <div className="grid grid-cols-4 gap-4">
                    {columns.map(column => (
                      <SortableItem key={column.id} id={column.id}>
                        <div className="flex-1">
                          <ColumnEditor
                            column={column}
                            onUpdate={handleUpdateColumn}
                            onDelete={handleDeleteColumn}
                            baseUrl={baseUrl}
                          />
                        </div>
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              
              {columns.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed">
                  <Columns className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-3">No columns yet</p>
                  <button
                    onClick={handleAddColumn}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
                  >
                    Add First Column
                  </button>
                </div>
              )}
            </div>
            
            {/* Promo Banners Section */}
            <div className="col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Image className="w-4 h-4" /> Promo Banners
                </h4>
                <button
                  onClick={handleAddPromoBanner}
                  className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                {promoBanners.map(banner => (
                  <PromoBannerEditor
                    key={banner.id}
                    banner={banner}
                    onUpdate={handleUpdatePromoBanner}
                    onDelete={handleDeletePromoBanner}
                  />
                ))}
                
                {promoBanners.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed">
                    <Image className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No banners</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Live Preview Component
const LivePreview = ({ sections, activeSection, baseUrl }) => {
  const section = sections.find(s => s.categoryName === activeSection);
  
  if (!section || !section.enabled) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Select a section to preview</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-2xl border overflow-hidden">
      {/* Preview Header */}
      <div className="bg-gray-100 px-4 py-2 border-b flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <span className="text-sm text-gray-500 ml-4">Mega Menu Preview - {section.categoryName}</span>
      </div>
      
      {/* Preview Content */}
      <div className="p-6" style={{ backgroundColor: section.backgroundColor || '#fff' }}>
        <div className="flex gap-6">
          {/* Columns */}
          <div className="flex-1 grid grid-cols-4 gap-6">
            {section.columns?.map(column => (
              <div key={column.id}>
                <h4 className="font-bold text-sm text-gray-900 mb-3 pb-2 border-b">
                  {column.title}
                </h4>
                <ul className="space-y-2">
                  {column.items?.map(item => (
                    <li key={item.id} className="flex items-center gap-2">
                      <a href={`${baseUrl}${item.path}`} className="text-sm text-gray-600 hover:text-black hover:underline">
                        {item.name}
                      </a>
                      {item.badge && (
                        <span 
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: item.badgeColor || '#ef4444', color: 'white' }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          {/* Promo Banner */}
          {section.promoBanners?.length > 0 && (
            <div className="w-48 flex-shrink-0">
              {section.promoBanners.map(banner => (
                <div key={banner.id} className="relative rounded-lg overflow-hidden">
                  <img src={banner.image} alt={banner.title} className="w-full aspect-[4/5] object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-3">
                    {banner.title && <h5 className="text-white font-bold text-sm">{banner.title}</h5>}
                    {banner.subtitle && <p className="text-white/80 text-xs">{banner.subtitle}</p>}
                    {banner.buttonText && (
                      <span className="inline-block mt-2 px-2 py-1 bg-white text-black text-xs rounded">{banner.buttonText}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Quick Links */}
        {section.quickLinks?.length > 0 && (
          <div className="mt-4 pt-4 border-t flex gap-4">
            {section.quickLinks.map(link => (
              <a 
                key={link.id}
                href={`${baseUrl}${link.path}`}
                className={`text-sm ${link.highlight ? 'text-red-500 font-semibold' : 'text-gray-600'} hover:underline`}
              >
                {link.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Main Mega Menu Builder Component
const MegaMenuBuilder = () => {
  const [store, setStore] = useState('tnvcollection');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({});
  const [activePreview, setActivePreview] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [applyingTemplate, setApplyingTemplate] = useState(null);
  
  const baseUrl = store === 'tnvcollectionpk' ? '/tnv-pk' : '/tnv';
  
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/mega-menu/config/${store}`);
      const data = await res.json();
      setSections(data.sections || []);
      setGlobalSettings(data.globalSettings || {});
      if (data.sections?.length > 0) {
        setActivePreview(data.sections[0].categoryName);
      }
    } catch (e) {
      toast.error('Failed to load menu configuration');
    } finally {
      setLoading(false);
    }
  }, [store]);
  
  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/mega-menu/templates`);
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (e) {
      console.log('Failed to fetch templates');
    }
  }, []);
  
  useEffect(() => {
    fetchConfig();
    fetchTemplates();
  }, [fetchConfig, fetchTemplates]);
  
  // Apply template
  const handleApplyTemplate = async (templateKey, merge = false) => {
    if (!merge && sections.length > 0) {
      if (!window.confirm('This will replace your current menu. Continue?')) return;
    }
    
    setApplyingTemplate(templateKey);
    try {
      const res = await fetch(`${API}/api/mega-menu/templates/${templateKey}/apply/${store}?merge=${merge}`, {
        method: 'POST'
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        fetchConfig();
        setShowTemplates(false);
      } else {
        toast.error('Failed to apply template');
      }
    } catch (e) {
      toast.error('Failed to apply template');
    } finally {
      setApplyingTemplate(null);
    }
  };
  
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/mega-menu/config/${store}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store, sections, globalSettings })
      });
      
      if (res.ok) {
        toast.success('Menu configuration saved!');
      } else {
        toast.error('Failed to save configuration');
      }
    } catch (e) {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };
  
  const handleAddSection = () => {
    const newSection = {
      id: `section-${Date.now()}`,
      categoryId: `cat-${Date.now()}`,
      categoryName: 'NEW CATEGORY',
      enabled: true,
      layout: 'columns',
      columns: [],
      promoBanners: [],
      quickLinks: []
    };
    setSections([...sections, newSection]);
  };
  
  const handleUpdateSection = (updatedSection) => {
    setSections(sections.map(s => s.id === updatedSection.id ? updatedSection : s));
  };
  
  const handleDeleteSection = (sectionId) => {
    if (window.confirm('Are you sure you want to delete this section?')) {
      setSections(sections.filter(s => s.id !== sectionId));
    }
  };
  
  const handleCloneFromStore = async (sourceStore) => {
    if (window.confirm(`Clone menu from ${sourceStore} to ${store}?`)) {
      try {
        const res = await fetch(`${API}/api/mega-menu/clone/${sourceStore}/${store}`, {
          method: 'POST'
        });
        if (res.ok) {
          toast.success('Menu cloned successfully!');
          fetchConfig();
        }
      } catch (e) {
        toast.error('Failed to clone menu');
      }
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="/store-settings" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </a>
              <div>
                <h1 className="text-xl font-bold">Mega Menu Builder</h1>
                <p className="text-sm text-gray-500">Configure dropdown menus for your storefront</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Store Selector */}
              <select
                value={store}
                onChange={(e) => setStore(e.target.value)}
                className="px-4 py-2 border rounded-lg text-sm font-medium"
                data-testid="store-selector"
              >
                <option value="tnvcollection">🇮🇳 TNV Collection (India)</option>
                <option value="tnvcollectionpk">🇵🇰 TNV Collection (Pakistan)</option>
              </select>
              
              {/* Clone Menu */}
              <div className="relative group">
                <button className="px-3 py-2 border rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50">
                  <Copy className="w-4 h-4" /> Clone
                </button>
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 hidden group-hover:block min-w-[200px]">
                  {store !== 'tnvcollection' && (
                    <button 
                      onClick={() => handleCloneFromStore('tnvcollection')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Clone from India Store
                    </button>
                  )}
                  {store !== 'tnvcollectionpk' && (
                    <button 
                      onClick={() => handleCloneFromStore('tnvcollectionpk')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Clone from Pakistan Store
                    </button>
                  )}
                </div>
              </div>
              
              {/* Templates Button */}
              <button 
                onClick={() => setShowTemplates(!showTemplates)}
                className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 ${showTemplates ? 'bg-purple-50 border-purple-300 text-purple-700' : ''}`}
                data-testid="templates-btn"
              >
                <Sparkles className="w-4 h-4" /> Templates
              </button>
              
              {/* Settings */}
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 border rounded-lg hover:bg-gray-50"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-blue-600 disabled:opacity-50"
                data-testid="save-menu-btn"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Global Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <h3 className="font-semibold mb-4">Global Settings</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Hover Delay (ms)</label>
                <input
                  type="number"
                  value={globalSettings.hoverDelay || 150}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, hoverDelay: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Animation</label>
                <select
                  value={globalSettings.animationType || 'fade'}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, animationType: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="fade">Fade</option>
                  <option value="slide">Slide Down</option>
                  <option value="scale">Scale</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Max Width</label>
                <input
                  type="text"
                  value={globalSettings.maxWidth || '1200px'}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, maxWidth: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    checked={globalSettings.showOnMobile ?? true}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, showOnMobile: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Show on Mobile (Click)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Templates Panel */}
      {showTemplates && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Quick Start Templates
                </h3>
                <p className="text-sm text-gray-600">Apply a pre-built menu structure with one click</p>
              </div>
              <button onClick={() => setShowTemplates(false)} className="p-2 hover:bg-white/50 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-5 gap-4">
              {templates.map(template => {
                const IconComponent = TEMPLATE_ICONS[template.key] || Package;
                return (
                  <div 
                    key={template.id}
                    className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-lg transition group"
                  >
                    <div className="aspect-[2/1] overflow-hidden">
                      <img 
                        src={template.preview} 
                        alt={template.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <IconComponent className="w-4 h-4 text-purple-500" />
                        <h4 className="font-semibold text-sm">{template.name}</h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{template.description}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApplyTemplate(template.key, false)}
                          disabled={applyingTemplate === template.key}
                          className="flex-1 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-medium hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {applyingTemplate === template.key ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Apply
                        </button>
                        <button
                          onClick={() => handleApplyTemplate(template.key, true)}
                          disabled={applyingTemplate === template.key}
                          className="px-2 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-50"
                          title="Merge with existing menu"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Section Editor */}
          <div className="col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Menu Sections</h2>
              <button
                onClick={handleAddSection}
                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-green-600"
              >
                <Plus className="w-4 h-4" /> Add Section
              </button>
            </div>
            
            {sections.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed">
                <Layout className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Menu Sections</h3>
                <p className="text-gray-500 mb-6">Create your first mega menu section</p>
                <button
                  onClick={handleAddSection}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium"
                >
                  Create First Section
                </button>
              </div>
            ) : (
              sections.map(section => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  onUpdate={handleUpdateSection}
                  onDelete={handleDeleteSection}
                  baseUrl={baseUrl}
                />
              ))
            )}
          </div>
          
          {/* Live Preview */}
          <div className="col-span-4">
            <div className="sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="w-5 h-5" /> Live Preview
                </h2>
              </div>
              
              {/* Section Tabs */}
              {sections.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {sections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => setActivePreview(section.categoryName)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        activePreview === section.categoryName
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border hover:border-blue-300'
                      }`}
                    >
                      {section.categoryName}
                    </button>
                  ))}
                </div>
              )}
              
              <LivePreview 
                sections={sections} 
                activeSection={activePreview}
                baseUrl={baseUrl}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MegaMenuBuilder;
