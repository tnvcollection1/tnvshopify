import React, { useState } from 'react';
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Users,
  BarChart3, 
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
  Send
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
  const [expandedSections, setExpandedSections] = useState(['sales', 'products']);
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
      id: 'sales',
      label: 'Sales',
      icon: ShoppingCart,
      children: [
        { label: 'Orders', path: '/orders', icon: FileText },
        { label: 'Storefront Orders', path: '/storefront-orders', icon: Store },
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
        { label: 'Catalog', path: '/products', icon: ShoppingBag },
        { label: '1688 Products', path: '/1688-products', icon: Globe },
        { label: 'Inventory', path: '/inventory', icon: Layers },
        { label: 'Inventory Health', path: '/inventory-health', icon: Activity },
        { label: 'Inventory Clearance', path: '/inventory-clearance', icon: Box },
      ]
    },
    {
      id: '1688',
      label: '1688 Sourcing',
      icon: Link2,
      children: [
        { label: 'Purchase Orders', path: '/purchase-1688', icon: CreditCard },
        { label: 'Bulk Order', path: '/bulk-order-1688', icon: Box },
        { label: 'Image Search', path: '/image-search', icon: Search },
        { label: 'Product Collector', path: '/product-collector', icon: Package },
        { label: '1688 Accounts', path: '/1688-accounts', icon: Users },
      ]
    },
    {
      id: 'shipping',
      label: 'Shipping',
      icon: Truck,
      children: [
        { label: 'DWZ56 Tracking', path: '/dwz56-purchase', icon: Activity },
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
            <span className="flex-1 text-left">{item.label}</span>
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
          ${active 
            ? 'bg-[#008060] text-white' 
            : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'}`}
      >
        {Icon && <Icon className="w-5 h-5" />}
        <span className="flex-1 text-left">{item.label}</span>
        {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </button>
    );
  };

  return (
    <div className="w-60 bg-[#1a1a1a] min-h-screen flex flex-col fixed left-0 top-0 z-50">
      {/* Store Selector Header */}
      <div className="p-4 border-b border-gray-800">
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

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavItem key={item.id} item={item} />
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-gray-800 space-y-1">
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
