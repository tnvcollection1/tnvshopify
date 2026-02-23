import React, { useState } from 'react';
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Users,
  BarChart3,
  BarChart2,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Store,
  RefreshCw,
  Check,
  Search,
  Truck,
  ShoppingBag,
  FileText,
  Link2,
  Box,
  Activity,
  Globe,
  Layers,
  CreditCard,
  MessageCircle,
  Send,
  Layout,
  TrendingUp,
  MapPin,
  Sparkles,
  Image,
  Menu,
  Smartphone,
  Eye,
  Palette,
  Bell,
  Zap,
  Phone
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { ShopifySpinner } from './ui/ShopifyLoading';

const ShopifySidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, agent, isAdmin } = useAuth();
  const { stores, selectedStore, switchStore, syncStoreData, syncing, getStoreName } = useStore();
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [expandedSections, setExpandedSections] = useState(['sales', 'products', 'mobile']);
  const [syncStatus, setSyncStatus] = useState(null);

  const handleSync = async () => {
    if (!selectedStore || syncing) return;
    try {
      setSyncStatus('syncing');
      await syncStoreData(selectedStore);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus(null), 2000);
    } catch (error) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const isActive = (path) => location.pathname === path;

  // Navigation structure - Full feature set
  const navigation = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/dashboard',
    },
    {
      id: 'online-store',
      label: 'Online Store',
      icon: Globe,
      children: [
        { label: 'Theme Editor', path: '/theme-editor', icon: Palette, badge: 'Pro' },
        { label: 'Website Editor', path: '/website-editor', icon: Layout },
        { label: 'Mobile App Editor', path: '/mobile-app-editor', icon: Smartphone },
        { label: 'Header & Menu', path: '/header-config', icon: Menu },
        { label: 'Banners', path: '/storefront-config', icon: Image },
        { label: 'Storefront CMS', path: '/storefront-cms', icon: Layout },
        { label: 'Store Settings', path: '/store-management', icon: Settings },
      ]
    },
    {
      id: 'sales',
      label: 'Sales',
      icon: ShoppingCart,
      children: [
        { label: 'Orders', path: '/orders', icon: FileText },
        { label: 'Storefront Orders', path: '/storefront-orders', icon: Store },
        { label: 'Website Editor', path: '/website-editor', icon: Layout, badge: 'New' },
        { label: 'Storefront Manager', path: '/storefront-cms', icon: Layout },
        { label: 'Banner & Collections', path: '/storefront-config', icon: Image },
        { label: 'Menu & Tags', path: '/menu-tags', icon: Menu },
        { label: 'Store Management', path: '/store-management', icon: Globe },
        { label: 'Drafts', path: '/drafts', icon: FileText },
        { label: 'Fulfillment', path: '/fulfillment', icon: Truck },
        { label: 'Fulfillment Pipeline', path: '/fulfillment-pipeline', icon: Truck },
        { label: 'Analytics', path: '/analytics', icon: BarChart3 },
      ]
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      children: [
        { label: 'Approve Products', path: '/product-approval', icon: Check },
        { label: 'Catalog', path: '/products', icon: ShoppingBag },
        { label: '1688 Products', path: '/1688-products', icon: Globe },
        { label: 'Inventory', path: '/inventory', icon: Layers },
        { label: 'Inventory Health', path: '/inventory-health', icon: Activity },
        { label: 'Inventory Clearance', path: '/inventory-clearance', icon: Box },
        { label: 'Stock Upload', path: '/stock-upload', icon: FileText },
        { label: 'AI Image Enhancer', path: '/image-enhancer', icon: Sparkles, badge: 'AI' },
        { label: 'Stories Manager', path: '/stories-manager', icon: Image, badge: 'NEW' },
      ]
    },
    {
      id: '1688',
      label: '1688 Sourcing',
      icon: Link2,
      children: [
        { label: '1688 Trade Center', path: '/1688-trade', icon: ShoppingBag },
        { label: '1688 Merchants', path: '/1688-merchants', icon: Store },
        { label: 'Product Links', path: '/product-link-manager', icon: Link2 },
        { label: 'AI Product Editor', path: '/ai-product-editor', icon: Sparkles },
        { label: 'Purchase Orders', path: '/purchase-1688', icon: CreditCard },
        { label: 'Bulk Order', path: '/bulk-order-1688', icon: Box },
        { label: 'Image Search', path: '/image-search', icon: Search },
        { label: 'Competitor Prices', path: '/competitor-dashboard', icon: TrendingUp },
        { label: 'Price Comparison', path: '/price-comparison', icon: BarChart2 },
        { label: 'Scheduled Checks', path: '/scheduled-price-checks', icon: RefreshCw },
        { label: 'AI Tools', path: '/1688-ai-tools', icon: Activity },
        { label: 'Product Collector', path: '/product-collector', icon: Package },
        { label: '1688 Accounts', path: '/1688-accounts', icon: Users },
        { label: 'Taobao Import', path: '/taobao-import', icon: Globe },
      ]
    },
    {
      id: 'shipping',
      label: 'Shipping',
      icon: Truck,
      children: [
        { label: 'DTDC Shipping', path: '/dtdc-shipping', icon: Truck },
        { label: 'DWZ56 Tracking', path: '/dwz56-tracking', icon: MapPin },
        { label: 'DWZ56 Purchase', path: '/dwz56-purchase', icon: Activity },
        { label: 'DWZ56 Shipping', path: '/dwz56-shipping', icon: Send },
        { label: 'Dispatch Tracker', path: '/dispatch-tracker', icon: Truck },
      ]
    },
    {
      id: 'marketing',
      label: 'Marketing',
      icon: BarChart3,
      children: [
        { label: 'Dashboard', path: '/marketing', icon: Home },
        { label: 'Meta Ads', path: '/meta-ads', icon: Activity },
        { label: 'Facebook Marketing', path: '/facebook-marketing', icon: Globe },
        { label: 'Lead Ads', path: '/lead-ads', icon: Users },
        { label: 'Campaigns', path: '/campaigns', icon: Send },
        { label: 'Flash Sales', path: '/flash-sales', icon: Activity },
        { label: 'Performance', path: '/performance-comparison', icon: BarChart3 },
      ]
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      children: [
        { label: 'All Customers', path: '/customers', icon: Users },
        { label: 'Segments', path: '/segments', icon: Layers },
        { label: 'Bundles', path: '/bundles', icon: Package },
      ]
    },
    {
      id: 'messaging',
      label: 'Messaging',
      icon: MessageCircle,
      children: [
        { label: 'WhatsApp', path: '/whatsapp', icon: MessageCircle },
        { label: 'Inbox', path: '/whatsapp-inbox', icon: FileText },
        { label: 'Templates', path: '/whatsapp-templates', icon: FileText },
        { label: 'Campaigns', path: '/whatsapp-campaigns', icon: Send },
        { label: 'Analytics', path: '/whatsapp-analytics', icon: BarChart3 },
        { label: 'Notifications', path: '/whatsapp-notifications', icon: Send },
        { label: 'VPBX Calls', path: '/vpbx-calls', icon: Zap, badge: 'New' },
        { label: 'Business Setup', path: '/whatsapp-business', icon: Settings },
      ]
    },
    {
      id: 'finance',
      label: 'Finance',
      icon: CreditCard,
      children: [
        { label: 'Reconciliation', path: '/finance-reconciliation', icon: CreditCard },
        { label: 'DTDC Reconciliation', path: '/dtdc-reconciliation', icon: Truck },
        { label: 'Dynamic Pricing', path: '/dynamic-pricing', icon: Activity },
        { label: 'Pricing', path: '/pricing', icon: CreditCard },
      ]
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      path: '/reports',
    },
    {
      id: 'sync',
      label: 'Data Sync',
      icon: RefreshCw,
      path: '/sync-dashboard',
    },
    {
      id: 'system',
      label: 'System',
      icon: Settings,
      children: [
        { label: 'TMAPI Monitor', path: '/tmapi-monitor', icon: Activity },
        { label: 'Security Logs', path: '/security-logs', icon: FileText },
        { label: 'Settings', path: '/settings', icon: Settings },
      ]
    },
    {
      id: 'mobile',
      label: 'Mobile App',
      icon: Smartphone,
      badge: 'New',
      children: [
        { label: 'Visual Editor', path: '/mobile-app-editor', icon: Eye },
        { label: 'App Settings', path: '/mobile-app-settings', icon: Settings },
        { label: 'Theme & Colors', path: '/mobile-app-theme', icon: Palette },
        { label: 'Push Notifications', path: '/mobile-push-notifications', icon: Bell },
        { label: 'Features', path: '/mobile-app-features', icon: Zap },
      ]
    },
    {
      id: 'create-store',
      label: 'Create New Store',
      icon: Store,
      path: '/create-store',
      badge: 'New',
      highlight: true
    },
  ];

  const NavItem = ({ item, depth = 0 }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.includes(item.id);
    const active = item.path && isActive(item.path);
    const Icon = item.icon;

    if (hasChildren) {
      return (
        <div>
          <button
            onClick={() => toggleSection(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${isExpanded ? 'bg-[#2a2a2a] text-white' : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'}`}
          >
            <Icon className="w-5 h-5" />
            <span className="flex-1 text-left flex items-center gap-2">
              {item.label}
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-500 text-white rounded">
                  {item.badge}
                </span>
              )}
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-3">
              {item.children.map((child) => (
                <NavItem key={child.path} item={child} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        onClick={() => navigate(item.path)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
          ${item.highlight
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
            : active 
              ? 'bg-[#008060] text-white' 
              : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'}`}
      >
        {Icon && <Icon className="w-5 h-5" />}
        <span className="flex-1 text-left flex items-center gap-2">
          {item.label}
          {item.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-500 text-white rounded">
              {item.badge}
            </span>
          )}
        </span>
        {active && !item.highlight && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </button>
    );
  };

  return (
    <div className="w-60 bg-[#1a1a1a] h-screen flex flex-col fixed left-0 top-0 z-50">
      {/* Store Selector Header */}
      <div className="p-4 border-b border-gray-800 flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => setShowStoreDropdown(!showStoreDropdown)}
            className="w-full flex items-center gap-3 px-3 py-2.5 bg-[#2a2a2a] rounded-lg hover:bg-[#333] transition-colors"
          >
            <div className="w-8 h-8 bg-[#008060] rounded-lg flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white truncate">
                {selectedStore ? getStoreName(selectedStore) : 'Select Store'}
              </p>
              <p className="text-xs text-gray-500">{selectedStore || 'No store selected'}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showStoreDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Store Dropdown */}
          {showStoreDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#2a2a2a] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-2 border-b border-gray-700">
                <p className="text-xs text-gray-500 font-medium px-2">SELECT STORE</p>
              </div>
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => { switchStore(store.store_name); setShowStoreDropdown(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                    selectedStore === store.store_name 
                      ? 'bg-[#008060]/20 text-[#00a67d]' 
                      : 'text-gray-300 hover:bg-[#333]'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span className="flex-1 text-left truncate">{getStoreName(store.store_name)}</span>
                  {selectedStore === store.store_name && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sync Button */}
        {selectedStore && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all
              ${syncStatus === 'success' 
                ? 'bg-[#008060]/20 text-[#00a67d] border border-[#008060]/30'
                : syncStatus === 'error'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : syncing
                ? 'bg-[#2a2a2a] text-gray-400 cursor-wait'
                : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333] border border-gray-700'}`}
          >
            {syncing ? (
              <>
                <ShopifySpinner size="small" />
                Syncing...
              </>
            ) : syncStatus === 'success' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Synced!
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Sync from Shopify
              </>
            )}
          </button>
        )}
      </div>

      {/* Navigation - Scrollable area */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {navigation.map((item) => (
          <NavItem key={item.id} item={item} />
        ))}
      </nav>

      {/* Bottom Section - Fixed at bottom */}
      <div className="p-3 border-t border-gray-800 space-y-1 flex-shrink-0">
        <button
          onClick={() => navigate('/settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
            ${isActive('/settings') ? 'bg-[#008060] text-white' : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'}`}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>

        {/* User Info */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-[#008060] rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {agent?.full_name?.[0] || agent?.username?.[0] || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{agent?.full_name || agent?.username}</p>
            <p className="text-xs text-gray-500 capitalize">{agent?.role || 'User'}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
};

export default ShopifySidebar;
