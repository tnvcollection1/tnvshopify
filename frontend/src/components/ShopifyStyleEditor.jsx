import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Monitor, Tablet, Smartphone, ChevronRight, ChevronDown, ChevronLeft,
  Settings, Image, Eye, EyeOff, Plus, Save, X, Palette, Layers,
  ExternalLink, Edit3, Trash2, GripVertical, Move, Copy,
  Undo2, Redo2, Search, Type, Layout, Grid, ImageIcon, 
  Megaphone, ShoppingBag, Star, Mail, Menu, Clock, Zap, Box
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// ============================================
// SECTION DEFINITIONS (Like Shopify Schema)
// ============================================
const SECTION_LIBRARY = {
  'announcement-bar': {
    name: 'Announcement bar',
    icon: Megaphone,
    category: 'Header',
    limit: 1,
    settings: [
      { type: 'text', id: 'text', label: 'Announcement text', default: 'Free shipping on orders over $50!' },
      { type: 'color', id: 'background_color', label: 'Background color', default: '#000000' },
      { type: 'color', id: 'text_color', label: 'Text color', default: '#ffffff' },
      { type: 'checkbox', id: 'show_close', label: 'Show close button', default: false },
    ],
    blocks: []
  },
  'header': {
    name: 'Header',
    icon: Menu,
    category: 'Header',
    limit: 1,
    settings: [
      { type: 'image_picker', id: 'logo', label: 'Logo image' },
      { type: 'text', id: 'logo_text', label: 'Logo text', default: 'TNV' },
      { type: 'checkbox', id: 'show_search', label: 'Show search', default: true },
      { type: 'checkbox', id: 'show_cart', label: 'Show cart icon', default: true },
      { type: 'checkbox', id: 'sticky', label: 'Enable sticky header', default: true },
    ],
    blocks: [
      { type: 'menu_item', name: 'Menu item', settings: [
        { type: 'text', id: 'label', label: 'Label', default: 'Shop' },
        { type: 'url', id: 'link', label: 'Link', default: '/shop' },
      ]}
    ],
    max_blocks: 10
  },
  'hero-banner': {
    name: 'Hero banner',
    icon: ImageIcon,
    category: 'Hero',
    settings: [
      { type: 'select', id: 'layout', label: 'Layout', options: [
        { value: 'full', label: 'Full width' },
        { value: 'contained', label: 'Contained' }
      ], default: 'full' },
      { type: 'range', id: 'height', label: 'Height', min: 300, max: 800, step: 50, default: 500, unit: 'px' },
    ],
    blocks: [
      { type: 'slide', name: 'Slide', settings: [
        { type: 'image_picker', id: 'image', label: 'Image' },
        { type: 'text', id: 'heading', label: 'Heading', default: 'Welcome to our store' },
        { type: 'text', id: 'subheading', label: 'Subheading', default: 'Shop the latest collection' },
        { type: 'text', id: 'button_label', label: 'Button label', default: 'Shop now' },
        { type: 'url', id: 'button_link', label: 'Button link', default: '/shop' },
        { type: 'select', id: 'text_position', label: 'Text position', options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' }
        ], default: 'center' },
      ]}
    ],
    max_blocks: 5
  },
  'featured-collection': {
    name: 'Featured collection',
    icon: Grid,
    category: 'Collection',
    settings: [
      { type: 'text', id: 'title', label: 'Heading', default: 'Featured Products' },
      { type: 'collection', id: 'collection', label: 'Collection' },
      { type: 'range', id: 'products_to_show', label: 'Maximum products to show', min: 2, max: 12, step: 1, default: 4 },
      { type: 'range', id: 'columns_desktop', label: 'Number of columns on desktop', min: 2, max: 6, step: 1, default: 4 },
      { type: 'checkbox', id: 'show_view_all', label: 'Enable "View all" button', default: true },
    ],
    blocks: []
  },
  'image-with-text': {
    name: 'Image with text',
    icon: Layout,
    category: 'Image',
    settings: [
      { type: 'image_picker', id: 'image', label: 'Image' },
      { type: 'select', id: 'image_position', label: 'Image position', options: [
        { value: 'left', label: 'Image first' },
        { value: 'right', label: 'Image second' }
      ], default: 'left' },
      { type: 'text', id: 'heading', label: 'Heading', default: 'Image with text' },
      { type: 'richtext', id: 'text', label: 'Text', default: 'Pair text with an image to focus on your chosen product, collection, or blog post.' },
      { type: 'text', id: 'button_label', label: 'Button label', default: 'Shop now' },
      { type: 'url', id: 'button_link', label: 'Button link', default: '/shop' },
    ],
    blocks: []
  },
  'rich-text': {
    name: 'Rich text',
    icon: Type,
    category: 'Text',
    settings: [
      { type: 'select', id: 'text_alignment', label: 'Text alignment', options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' }
      ], default: 'center' },
    ],
    blocks: [
      { type: 'heading', name: 'Heading', settings: [
        { type: 'text', id: 'heading', label: 'Heading', default: 'Talk about your brand' },
        { type: 'select', id: 'heading_size', label: 'Heading size', options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' }
        ], default: 'medium' }
      ]},
      { type: 'text', name: 'Text', settings: [
        { type: 'richtext', id: 'text', label: 'Text', default: 'Share information about your brand with your customers.' }
      ]},
      { type: 'button', name: 'Button', settings: [
        { type: 'text', id: 'button_label', label: 'Button label', default: 'Learn more' },
        { type: 'url', id: 'button_link', label: 'Button link', default: '/about' }
      ]}
    ],
    max_blocks: 6
  },
  'collection-list': {
    name: 'Collection list',
    icon: Box,
    category: 'Collection',
    settings: [
      { type: 'text', id: 'title', label: 'Heading', default: 'Collections' },
      { type: 'range', id: 'columns_desktop', label: 'Number of columns on desktop', min: 2, max: 5, step: 1, default: 3 },
    ],
    blocks: [
      { type: 'collection', name: 'Collection', settings: [
        { type: 'collection', id: 'collection', label: 'Collection' },
        { type: 'image_picker', id: 'image', label: 'Custom image (optional)' }
      ]}
    ],
    max_blocks: 8
  },
  'newsletter': {
    name: 'Email signup',
    icon: Mail,
    category: 'Newsletter',
    settings: [
      { type: 'text', id: 'heading', label: 'Heading', default: 'Subscribe to our emails' },
      { type: 'richtext', id: 'subheading', label: 'Subheading', default: 'Be the first to know about new collections and exclusive offers.' },
      { type: 'color', id: 'background_color', label: 'Background color', default: '#f5f5f5' },
    ],
    blocks: []
  },
  'testimonials': {
    name: 'Testimonials',
    icon: Star,
    category: 'Social proof',
    settings: [
      { type: 'text', id: 'heading', label: 'Heading', default: 'What our customers say' },
    ],
    blocks: [
      { type: 'testimonial', name: 'Testimonial', settings: [
        { type: 'text', id: 'quote', label: 'Quote', default: 'Amazing products and great service!' },
        { type: 'text', id: 'author', label: 'Author', default: 'Happy Customer' },
        { type: 'range', id: 'rating', label: 'Rating', min: 1, max: 5, step: 1, default: 5 }
      ]}
    ],
    max_blocks: 6
  },
  'countdown': {
    name: 'Countdown timer',
    icon: Clock,
    category: 'Promotion',
    settings: [
      { type: 'text', id: 'heading', label: 'Heading', default: 'FLASH SALE' },
      { type: 'text', id: 'subheading', label: 'Subheading', default: 'Ends in' },
      { type: 'text', id: 'end_date', label: 'End date (YYYY-MM-DD HH:MM)', default: '' },
      { type: 'color', id: 'background_color', label: 'Background color', default: '#ef4444' },
      { type: 'url', id: 'link', label: 'Link', default: '/sale' },
    ],
    blocks: []
  },
  'footer': {
    name: 'Footer',
    icon: Layout,
    category: 'Footer',
    limit: 1,
    settings: [
      { type: 'checkbox', id: 'show_social', label: 'Show social icons', default: true },
      { type: 'checkbox', id: 'show_payment_icons', label: 'Show payment icons', default: true },
      { type: 'text', id: 'copyright', label: 'Copyright text', default: '© 2026 TNV Collection. All rights reserved.' },
    ],
    blocks: [
      { type: 'link_list', name: 'Menu', settings: [
        { type: 'text', id: 'heading', label: 'Heading', default: 'Quick links' },
      ]},
    ],
    max_blocks: 4
  },
};

// Group sections by category
const SECTION_CATEGORIES = Object.entries(SECTION_LIBRARY).reduce((acc, [id, section]) => {
  const category = section.category || 'Other';
  if (!acc[category]) acc[category] = [];
  acc[category].push({ id, ...section });
  return acc;
}, {});

// ============================================
// SETTINGS INPUT COMPONENTS
// ============================================
const SettingInput = ({ setting, value, onChange }) => {
  switch (setting.type) {
    case 'text':
    case 'url':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <Input 
            value={value || setting.default || ''} 
            onChange={(e) => onChange(e.target.value)}
            placeholder={setting.default}
            className="h-9 text-sm"
          />
        </div>
      );
    
    case 'richtext':
    case 'textarea':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <textarea
            value={value || setting.default || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-[80px] p-2 text-sm border rounded-md resize-y"
            placeholder={setting.default}
          />
        </div>
      );
    
    case 'color':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value || setting.default || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="w-9 h-9 rounded border cursor-pointer"
            />
            <Input 
              value={value || setting.default || '#000000'} 
              onChange={(e) => onChange(e.target.value)}
              className="h-9 text-sm flex-1 font-mono"
            />
          </div>
        </div>
      );
    
    case 'checkbox':
      return (
        <div className="flex items-center justify-between py-2">
          <Label className="text-sm">{setting.label}</Label>
          <Switch 
            checked={value ?? setting.default ?? false}
            onCheckedChange={onChange}
          />
        </div>
      );
    
    case 'range':
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-gray-600">{setting.label}</Label>
            <span className="text-xs text-gray-500">{value || setting.default}{setting.unit || ''}</span>
          </div>
          <input
            type="range"
            min={setting.min}
            max={setting.max}
            step={setting.step}
            value={value || setting.default}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      );
    
    case 'select':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <select
            value={value || setting.default}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-9 px-3 text-sm border rounded-md bg-white"
          >
            {setting.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    
    case 'image_picker':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-gray-400 transition cursor-pointer">
            {value ? (
              <div className="relative">
                <img src={value} alt="" className="w-full h-24 object-cover rounded" />
                <button 
                  onClick={() => onChange('')}
                  className="absolute top-1 right-1 bg-white rounded-full p-1 shadow"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="text-gray-400">
                <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                <p className="text-xs">Click to upload</p>
              </div>
            )}
          </div>
          <Input 
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste image URL"
            className="h-8 text-xs"
          />
        </div>
      );
    
    case 'collection':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-9 px-3 text-sm border rounded-md bg-white"
          >
            <option value="">Select a collection</option>
            <option value="all">All products</option>
            <option value="new-arrivals">New arrivals</option>
            <option value="best-sellers">Best sellers</option>
            <option value="sale">Sale</option>
          </select>
        </div>
      );
    
    default:
      return null;
  }
};

// ============================================
// SORTABLE SECTION ITEM
// ============================================
const SortableSectionItem = ({ section, sectionDef, isExpanded, onToggle, onUpdate, onDelete, onDuplicate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [expandedBlocks, setExpandedBlocks] = useState({});
  const Icon = sectionDef?.icon || Box;

  const updateSetting = (settingId, value) => {
    onUpdate({
      ...section,
      settings: { ...section.settings, [settingId]: value }
    });
  };

  const updateBlock = (blockIndex, blockData) => {
    const newBlocks = [...(section.blocks || [])];
    newBlocks[blockIndex] = blockData;
    onUpdate({ ...section, blocks: newBlocks });
  };

  const addBlock = (blockType) => {
    const blockDef = sectionDef?.blocks?.find(b => b.type === blockType);
    if (!blockDef) return;
    
    const newBlock = {
      type: blockType,
      settings: blockDef.settings.reduce((acc, s) => ({ ...acc, [s.id]: s.default }), {})
    };
    onUpdate({ ...section, blocks: [...(section.blocks || []), newBlock] });
  };

  const deleteBlock = (blockIndex) => {
    const newBlocks = [...(section.blocks || [])];
    newBlocks.splice(blockIndex, 1);
    onUpdate({ ...section, blocks: newBlocks });
  };

  return (
    <div ref={setNodeRef} style={style} className="border-b border-gray-200">
      {/* Section Header */}
      <div 
        className={`flex items-center gap-2 px-3 py-3 cursor-pointer hover:bg-gray-50 ${isExpanded ? 'bg-gray-50' : ''}`}
        onClick={onToggle}
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-gray-300" />
        </div>
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="flex-1 text-sm font-medium truncate">{sectionDef?.name || section.type}</span>
        <button 
          onClick={(e) => { e.stopPropagation(); onUpdate({ ...section, disabled: !section.disabled }); }}
          className="p-1 hover:bg-gray-200 rounded"
        >
          {section.disabled ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-500" />}
        </button>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </div>

      {/* Section Settings */}
      {isExpanded && (
        <div className="px-3 pb-4 bg-gray-50/50">
          {/* Settings */}
          <div className="space-y-4 mt-2">
            {sectionDef?.settings?.map(setting => (
              <SettingInput
                key={setting.id}
                setting={setting}
                value={section.settings?.[setting.id]}
                onChange={(value) => updateSetting(setting.id, value)}
              />
            ))}
          </div>

          {/* Blocks */}
          {sectionDef?.blocks?.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Blocks</span>
                <span className="text-xs text-gray-400">{section.blocks?.length || 0}/{sectionDef.max_blocks || 50}</span>
              </div>

              {/* Block List */}
              <div className="space-y-1">
                {section.blocks?.map((block, blockIndex) => {
                  const blockDef = sectionDef.blocks.find(b => b.type === block.type);
                  const blockExpanded = expandedBlocks[blockIndex];
                  
                  return (
                    <div key={blockIndex} className="bg-white rounded border">
                      <div 
                        className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedBlocks({ ...expandedBlocks, [blockIndex]: !blockExpanded })}
                      >
                        <GripVertical className="w-3 h-3 text-gray-300" />
                        <span className="flex-1 text-xs truncate">{block.settings?.heading || block.settings?.label || blockDef?.name || block.type}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteBlock(blockIndex); }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Trash2 className="w-3 h-3 text-gray-400" />
                        </button>
                        {blockExpanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                      </div>

                      {blockExpanded && blockDef && (
                        <div className="px-2 pb-2 space-y-3">
                          {blockDef.settings.map(setting => (
                            <SettingInput
                              key={setting.id}
                              setting={setting}
                              value={block.settings?.[setting.id]}
                              onChange={(value) => updateBlock(blockIndex, {
                                ...block,
                                settings: { ...block.settings, [setting.id]: value }
                              })}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Block Button */}
              {(!sectionDef.max_blocks || (section.blocks?.length || 0) < sectionDef.max_blocks) && (
                <div className="mt-2">
                  <select 
                    className="w-full h-8 px-2 text-xs border rounded bg-white"
                    onChange={(e) => { if (e.target.value) { addBlock(e.target.value); e.target.value = ''; } }}
                    defaultValue=""
                  >
                    <option value="">+ Add block</option>
                    {sectionDef.blocks.map(b => (
                      <option key={b.type} value={b.type}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Section Actions */}
          <div className="mt-4 pt-4 border-t flex gap-2">
            <button 
              onClick={onDuplicate}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
            >
              <Copy className="w-3 h-3" /> Duplicate
            </button>
            <button 
              onClick={onDelete}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// ADD SECTION MODAL
// ============================================
const AddSectionModal = ({ onAdd, onClose, existingSections }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(Object.keys(SECTION_CATEGORIES)[0]);

  const filteredCategories = Object.entries(SECTION_CATEGORIES).reduce((acc, [category, sections]) => {
    const filtered = sections.filter(s => {
      // Check if section is at limit
      const sectionDef = SECTION_LIBRARY[s.id];
      if (sectionDef.limit) {
        const count = existingSections.filter(es => es.type === s.id).length;
        if (count >= sectionDef.limit) return false;
      }
      // Search filter
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
    if (filtered.length > 0) acc[category] = filtered;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add section</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search sections"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Section List */}
        <div className="flex-1 overflow-y-auto">
          {Object.entries(filteredCategories).map(([category, sections]) => (
            <div key={category}>
              <button 
                className="w-full px-4 py-2.5 flex items-center justify-between text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border-b"
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
              >
                {category}
                <ChevronRight className={`w-4 h-4 transition-transform ${expandedCategory === category ? 'rotate-90' : ''}`} />
              </button>
              
              {(expandedCategory === category || searchQuery) && (
                <div className="grid grid-cols-2 gap-2 p-3">
                  {sections.map(section => {
                    const Icon = section.icon || Box;
                    return (
                      <button
                        key={section.id}
                        onClick={() => onAdd(section.id)}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left group"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100">
                          <Icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                        </div>
                        <span className="text-sm font-medium">{section.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN EDITOR COMPONENT
// ============================================
const ShopifyStyleEditor = () => {
  const { selectedStore } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState('desktop');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAddSection, setShowAddSection] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [selectedPage, setSelectedPage] = useState('home');
  const iframeRef = useRef(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Page sections
  const [sections, setSections] = useState([
    {
      id: 'section-1',
      type: 'announcement-bar',
      settings: { text: 'Cash On Delivery • Free Delivery and Exchange • 100% Genuine Products' },
      blocks: []
    },
    {
      id: 'section-2',
      type: 'header',
      settings: { logo_text: 'TNV', show_search: true, show_cart: true, sticky: true },
      blocks: [
        { type: 'menu_item', settings: { label: 'WOMEN', link: '/women' } },
        { type: 'menu_item', settings: { label: 'MEN', link: '/men' } },
        { type: 'menu_item', settings: { label: 'KIDS', link: '/kids' } },
        { type: 'menu_item', settings: { label: 'SALE', link: '/sale' } },
      ]
    },
    {
      id: 'section-3',
      type: 'hero-banner',
      settings: { layout: 'full', height: 500 },
      blocks: [
        { type: 'slide', settings: { 
          heading: 'WHITE IN FOCUS', 
          subheading: 'Fresh styles for the new season',
          button_label: 'Shop Now',
          button_link: '/new-arrivals'
        }}
      ]
    },
    {
      id: 'section-4',
      type: 'featured-collection',
      settings: { title: 'New Arrivals', products_to_show: 8, columns_desktop: 4, show_view_all: true },
      blocks: []
    },
    {
      id: 'section-5',
      type: 'countdown',
      settings: { heading: 'FLASH SALE', subheading: 'Ends in', background_color: '#ef4444' },
      blocks: []
    },
  ]);

  const storeName = selectedStore || 'tnvcollection';

  // Initialize
  useEffect(() => {
    setLoading(false);
  }, []);

  // Add section
  const handleAddSection = (sectionType) => {
    const sectionDef = SECTION_LIBRARY[sectionType];
    if (!sectionDef) return;

    const newSection = {
      id: `section-${Date.now()}`,
      type: sectionType,
      settings: sectionDef.settings.reduce((acc, s) => ({ ...acc, [s.id]: s.default }), {}),
      blocks: []
    };

    setSections([...sections, newSection]);
    setShowAddSection(false);
    setHasChanges(true);
    toast.success(`Added ${sectionDef.name}`);
  };

  // Update section
  const handleUpdateSection = (sectionId, updatedSection) => {
    setSections(sections.map(s => s.id === sectionId ? updatedSection : s));
    setHasChanges(true);
  };

  // Delete section
  const handleDeleteSection = (sectionId) => {
    setSections(sections.filter(s => s.id !== sectionId));
    setHasChanges(true);
    toast.success('Section removed');
  };

  // Duplicate section
  const handleDuplicateSection = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const sectionDef = SECTION_LIBRARY[section.type];
    if (sectionDef?.limit) {
      const count = sections.filter(s => s.type === section.type).length;
      if (count >= sectionDef.limit) {
        toast.error(`Maximum ${sectionDef.limit} ${sectionDef.name} section(s) allowed`);
        return;
      }
    }

    const newSection = {
      ...JSON.parse(JSON.stringify(section)),
      id: `section-${Date.now()}`
    };
    const index = sections.findIndex(s => s.id === sectionId);
    const newSections = [...sections];
    newSections.splice(index + 1, 0, newSection);
    setSections(newSections);
    setHasChanges(true);
    toast.success('Section duplicated');
  };

  // Drag end handler
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over?.id);
      
      setSections(arrayMove(sections, oldIndex, newIndex));
      setHasChanges(true);
    }
  };

  // Save
  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Save to backend
      await new Promise(r => setTimeout(r, 500));
      setHasChanges(false);
      toast.success('Theme saved');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Get preview width
  const getPreviewWidth = () => {
    switch (viewMode) {
      case 'tablet': return '768px';
      case 'mobile': return '375px';
      default: return '100%';
    }
  };

  // Pages
  const PAGES = [
    { id: 'home', name: 'Home page' },
    { id: 'collection', name: 'Collection pages' },
    { id: 'product', name: 'Product pages' },
    { id: 'cart', name: 'Cart' },
    { id: 'checkout', name: 'Checkout' },
  ];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Loading editor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Top Toolbar */}
      <header className="h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {/* Back button */}
          <a href="/dashboard" className="flex items-center gap-2 text-gray-300 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Exit</span>
          </a>

          {/* Page selector */}
          <div className="flex items-center gap-2 ml-4">
            <select 
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded border border-gray-600 focus:border-blue-500 outline-none"
            >
              {PAGES.map(page => (
                <option key={page.id} value={page.id}>{page.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Center - Device toggles */}
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          <button 
            onClick={() => setViewMode('desktop')}
            className={`p-2 rounded ${viewMode === 'desktop' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            title="Desktop"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('tablet')}
            className={`p-2 rounded ${viewMode === 'tablet' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            title="Tablet"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('mobile')}
            className={`p-2 rounded ${viewMode === 'mobile' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            title="Mobile"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-3">
          <a 
            href="/tnv" 
            target="_blank"
            className="flex items-center gap-2 text-gray-300 hover:text-white text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            View store
          </a>
          <Button 
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <aside className={`${sidebarOpen ? 'w-80' : 'w-0'} bg-white border-r transition-all duration-300 flex flex-col overflow-hidden`}>
          {/* Sidebar Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
            <h2 className="font-semibold text-sm">Sections</h2>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Sections List */}
          <div className="flex-1 overflow-y-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {sections.map((section) => (
                  <SortableSectionItem
                    key={section.id}
                    section={section}
                    sectionDef={SECTION_LIBRARY[section.type]}
                    isExpanded={expandedSection === section.id}
                    onToggle={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    onUpdate={(updated) => handleUpdateSection(section.id, updated)}
                    onDelete={() => handleDeleteSection(section.id)}
                    onDuplicate={() => handleDuplicateSection(section.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Add Section Button */}
          <div className="p-3 border-t">
            <Button 
              onClick={() => setShowAddSection(true)}
              variant="outline" 
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add section
            </Button>
          </div>
        </aside>

        {/* Sidebar Toggle (when closed) */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white border rounded-r-lg p-2 shadow z-10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Preview */}
        <main className="flex-1 overflow-hidden bg-gray-200 flex justify-center">
          <div 
            className="bg-white shadow-lg transition-all duration-300 h-full overflow-hidden"
            style={{ width: getPreviewWidth(), maxWidth: '100%' }}
          >
            <iframe
              ref={iframeRef}
              src="/tnv"
              className="w-full h-full border-0"
              title="Store Preview"
            />
          </div>
        </main>
      </div>

      {/* Add Section Modal */}
      {showAddSection && (
        <AddSectionModal
          onAdd={handleAddSection}
          onClose={() => setShowAddSection(false)}
          existingSections={sections}
        />
      )}
    </div>
  );
};

export default ShopifyStyleEditor;
