import React, { useState } from 'react';
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Users,
  BarChart3, 
  Settings,
  LogOut,
  MessageCircle,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Store,
  Megaphone,
  RefreshCw,
  Check,
  Search,
  Bell,
  HelpCircle,
  Layers,
  TrendingUp,
  Truck,
  ClipboardCheck,
  ShoppingBag,
  PieChart,
  Target,
  Zap,
  Gift,
  FileText,
  CreditCard,
  Link2
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, agent } = useAuth();
  const { stores, selectedStore, switchStore, syncStoreData, syncing, getStoreName } = useStore();
  const [expandedSections, setExpandedSections] = useState(['orders', 'products', 'marketing']);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  const toggleSection = (section) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleSync = async () => {
    if (selectedStore === 'all') {
      alert('Please select a specific store to sync');
      return;
    }
    
    setSyncStatus('syncing');
    const result = await syncStoreData();
    
    if (result.success) {
      setSyncStatus('success');
      setTimeout(() => setSyncStatus(null), 3000);
    } else {
      setSyncStatus('error');
      alert(result.message);
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const menuItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { 
      icon: ShoppingCart, 
      label: 'Orders', 
      section: 'orders',
      children: [
        { icon: Layers, label: 'All Orders', path: '/dashboard' },
        { icon: FileText, label: 'Drafts', path: '/orders' },
        { icon: Truck, label: 'Dispatch Tracker', path: '/tracker' },
        { icon: ClipboardCheck, label: 'Confirmation', path: '/confirmation' },
        { icon: ShoppingBag, label: 'Purchase Tracker', path: '/purchase' },
      ]
    },
    { 
      icon: Package, 
      label: 'Products', 
      section: 'products',
      children: [
        { icon: Package, label: 'Inventory', path: '/inventory' },
        { icon: PieChart, label: 'Overview', path: '/inventory-overview' },
        { icon: TrendingUp, label: 'Inventory Health', path: '/inventory-health' },
        { icon: Zap, label: 'Smart Clearance', path: '/inventory-clearance' },
      ]
    },
    { icon: Users, label: 'Customers', path: '/customers' },
    { 
      icon: DollarSign, 
      label: 'Finances', 
      section: 'finances',
      children: [
        { icon: FileText, label: 'Reconciliation', path: '/finance-reconciliation' },
        { icon: TrendingUp, label: 'Dynamic Pricing', path: '/dynamic-pricing' },
      ]
    },
    { icon: BarChart3, label: 'Analytics', path: '/reports' },
    { 
      icon: Megaphone, 
      label: 'Marketing', 
      section: 'marketing',
      children: [
        { icon: PieChart, label: 'Dashboard', path: '/marketing' },
        { icon: Target, label: 'Meta Ads', path: '/meta-ads' },
        { icon: Megaphone, label: 'Facebook Ads', path: '/facebook-marketing' },
        { icon: Users, label: 'Lead Ads', path: '/lead-ads' },
        { icon: Zap, label: 'Campaigns', path: '/campaigns' },
        { icon: Zap, label: 'Flash Sales', path: '/flash-sales' },
        { icon: Users, label: 'Customer Segments', path: '/segments' },
        { icon: Gift, label: 'Bundles', path: '/bundles' },
      ]
    },
    { 
      icon: MessageCircle, 
      label: 'WhatsApp', 
      section: 'whatsapp',
      children: [
        { icon: MessageCircle, label: 'Inbox', path: '/whatsapp-inbox' },
        { icon: FileText, label: 'Templates', path: '/whatsapp-templates' },
        { icon: Megaphone, label: 'Campaigns', path: '/whatsapp-campaigns' },
        { icon: BarChart3, label: 'Analytics', path: '/whatsapp-analytics' },
        { icon: Link2, label: 'Business Platform', path: '/whatsapp-business' },
        { icon: Bell, label: 'Order Notifications', path: '/notifications' },
      ]
    },
    { icon: Users, label: 'User Management', path: '/users' },
    { icon: Shield, label: 'Super Admin', path: '/super-admin', adminOnly: true },
    { icon: CreditCard, label: 'Subscription', path: '/pricing' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isActive = (path) => location.pathname === path;
  const isSectionActive = (children) => children?.some(child => location.pathname === child.path);

  return (
    <div className="w-[240px] bg-[#1a1a1a] h-screen flex flex-col">
      {/* Store Switcher - Shopify Style */}
      <div className="p-3 border-b border-gray-800">
        <div className="relative">
          <button
            onClick={() => setShowStoreDropdown(!showStoreDropdown)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-white font-medium text-sm truncate">
                {getStoreName(selectedStore)}
              </p>
              <p className="text-gray-500 text-xs">
                {selectedStore === 'all' ? 'All stores' : 'Store'}
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showStoreDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Store Dropdown */}
          {showStoreDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#2a2a2a] border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
              <div className="p-2 border-b border-gray-700">
                <p className="text-xs text-gray-400 font-medium px-2">SELECT STORE</p>
              </div>
              
              {/* All Stores Option */}
              <button
                onClick={() => { switchStore('all'); setShowStoreDropdown(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                  selectedStore === 'all' 
                    ? 'bg-green-600/20 text-green-400' 
                    : 'text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span className="flex-1 text-left">All Stores</span>
                {selectedStore === 'all' && <Check className="w-4 h-4" />}
              </button>
              
              <div className="border-t border-gray-700 my-1" />
              
              {/* Individual Stores */}
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => { switchStore(store.store_name); setShowStoreDropdown(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                    selectedStore === store.store_name 
                      ? 'bg-green-600/20 text-green-400' 
                      : 'text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span className="flex-1 text-left truncate">{getStoreName(store.store_name)}</span>
                  {selectedStore === store.store_name && <Check className="w-4 h-4 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sync Button */}
        {selectedStore !== 'all' && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              syncStatus === 'success'
                ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                : syncStatus === 'error'
                ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                : syncing
                ? 'bg-gray-800 text-gray-400 cursor-wait'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : syncStatus === 'success' ? 'Synced!' : 'Sync Store Data'}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg text-gray-400 text-sm">
          <Search className="w-4 h-4" />
          <span>Search</span>
          <kbd className="ml-auto text-xs bg-gray-700 px-1.5 py-0.5 rounded">⌘K</kbd>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedSections.includes(item.section);
          const sectionActive = hasChildren && isSectionActive(item.children);
          
          return (
            <div key={index} className="mb-0.5">
              <button
                onClick={() => hasChildren ? toggleSection(item.section) : navigate(item.path)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-150 ${
                  isActive(item.path) || sectionActive
                    ? 'bg-gray-800 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-[18px] h-[18px]" />
                  <span className="font-medium">{item.label}</span>
                </div>
                {hasChildren && (
                  <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                )}
              </button>
              
              {/* Children */}
              {hasChildren && isExpanded && (
                <div className="mt-0.5 ml-3 pl-3 border-l border-gray-800">
                  {item.children.map((child, childIndex) => {
                    const ChildIcon = child.icon;
                    return (
                      <button
                        key={childIndex}
                        onClick={() => navigate(child.path)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-150 ${
                          isActive(child.path)
                            ? 'bg-gray-800 text-white' 
                            : 'text-gray-500 hover:text-white hover:bg-gray-800/50'
                        }`}
                      >
                        <ChildIcon className="w-4 h-4" />
                        <span>{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-800 p-2">
        <button
          onClick={() => navigate('/pricing')}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
            isActive('/pricing') ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <CreditCard className="w-[18px] h-[18px]" />
          <span className="font-medium">Subscription</span>
        </button>
        <button
          onClick={() => navigate('/settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
            isActive('/settings') ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <Settings className="w-[18px] h-[18px]" />
          <span className="font-medium">Settings</span>
        </button>
      </div>

      {/* User Profile */}
      <div className="border-t border-gray-800 p-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {agent?.full_name?.charAt(0) || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{agent?.full_name || 'Admin'}</p>
            <p className="text-gray-500 text-xs capitalize">{agent?.role || 'admin'}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
