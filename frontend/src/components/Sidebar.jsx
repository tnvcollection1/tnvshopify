import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Users, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Settings,
  LogOut,
  TrendingUp,
  Truck,
  PhoneCall,
  MessageCircle,
  Inbox,
  FileText,
  Target,
  Zap,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Store,
  Megaphone,
  PieChart,
  Receipt,
  Tags,
  Gift,
  RefreshCw,
  Check
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, agent } = useAuth();
  const { stores, selectedStore, switchStore, syncStoreData, syncing, getStoreName } = useStore();
  const [expandedSections, setExpandedSections] = useState(['orders', 'marketing']);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  const toggleSection = (section) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const menuItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { 
      icon: ShoppingCart, 
      label: 'Orders', 
      section: 'orders',
      children: [
        { label: 'All Orders', path: '/dashboard' },
        { label: 'Drafts', path: '/orders' },
        { label: 'Dispatch Tracker', path: '/tracker' },
        { label: 'Confirmation', path: '/confirmation' },
        { label: 'Purchase Tracker', path: '/purchase' },
      ]
    },
    { 
      icon: Package, 
      label: 'Products', 
      section: 'products',
      children: [
        { label: 'Inventory', path: '/inventory' },
        { label: 'Overview', path: '/inventory-overview' },
        { label: 'Inventory Health', path: '/inventory-health' },
        { label: 'Smart Clearance', path: '/inventory-clearance' },
      ]
    },
    { icon: Users, label: 'Customers', path: '/customers' },
    { 
      icon: DollarSign, 
      label: 'Finances', 
      section: 'finances',
      children: [
        { label: 'Reconciliation', path: '/finance-reconciliation' },
        { label: 'Dynamic Pricing', path: '/dynamic-pricing' },
      ]
    },
    { icon: BarChart3, label: 'Analytics', path: '/reports' },
    { 
      icon: Megaphone, 
      label: 'Marketing', 
      section: 'marketing',
      children: [
        { label: 'Dashboard', path: '/marketing' },
        { label: 'Meta Ads', path: '/meta-ads' },
        { label: 'Facebook Ads', path: '/facebook-marketing' },
        { label: 'Campaigns', path: '/campaigns' },
        { label: 'Flash Sales', path: '/flash-sales' },
        { label: 'Customer Segments', path: '/segments' },
        { label: 'Bundles', path: '/bundles' },
      ]
    },
    { 
      icon: MessageCircle, 
      label: 'WhatsApp', 
      section: 'whatsapp',
      children: [
        { label: 'Inbox', path: '/whatsapp-inbox' },
        { label: 'Templates', path: '/whatsapp-templates' },
        { label: 'Campaigns', path: '/whatsapp-campaigns' },
        { label: 'Analytics', path: '/whatsapp-analytics' },
      ]
    },
  ];

  const bottomItems = [
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: Users, label: 'Users', path: '/users' },
  ];

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

  const isActive = (path) => location.pathname === path;
  const isSectionActive = (children) => children?.some(child => location.pathname === child.path);

  return (
    <div className="w-56 bg-[#1a1a1a] h-screen flex flex-col border-r border-gray-800">
      {/* Store Switcher */}
      <div className="px-4 py-4 border-b border-gray-800">
        <div className="relative">
          <button
            onClick={() => setShowStoreDropdown(!showStoreDropdown)}
            className="w-full flex items-center gap-2 hover:bg-gray-800 rounded-lg p-2 transition-colors"
          >
            <div className="w-8 h-8 bg-[#95bf47] rounded-md flex items-center justify-center flex-shrink-0">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <h1 className="text-white font-semibold text-sm truncate">
                {getStoreName(selectedStore)}
              </h1>
              <p className="text-gray-500 text-xs">Click to switch</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showStoreDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Store Dropdown */}
          {showStoreDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
              {/* All Stores Option */}
              <button
                onClick={() => { switchStore('all'); setShowStoreDropdown(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                  selectedStore === 'all' ? 'bg-[#95bf47] text-white' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>All Stores</span>
                {selectedStore === 'all' && <Check className="w-4 h-4 ml-auto" />}
              </button>
              
              <div className="border-t border-gray-700" />
              
              {/* Individual Stores */}
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => { switchStore(store.store_name); setShowStoreDropdown(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                    selectedStore === store.store_name ? 'bg-[#95bf47] text-white' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span className="truncate">{getStoreName(store.store_name)}</span>
                  {selectedStore === store.store_name && <Check className="w-4 h-4 ml-auto flex-shrink-0" />}
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
                ? 'bg-green-600 text-white'
                : syncStatus === 'error'
                ? 'bg-red-600 text-white'
                : syncing
                ? 'bg-gray-700 text-gray-400 cursor-wait'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : syncStatus === 'success' ? 'Synced!' : 'Sync Store Data'}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedSections.includes(item.section);
          const sectionActive = hasChildren && isSectionActive(item.children);
          
          return (
            <div key={index}>
              <button
                onClick={() => hasChildren ? toggleSection(item.section) : navigate(item.path)}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                  isActive(item.path) || sectionActive
                    ? 'bg-gray-800 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {hasChildren && (
                  isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              {hasChildren && isExpanded && (
                <div className="ml-4 border-l border-gray-800">
                  {item.children.map((child, childIndex) => (
                    <button
                      key={childIndex}
                      onClick={() => navigate(child.path)}
                      className={`w-full flex items-center px-4 py-2 text-sm transition-colors ${
                        isActive(child.path)
                          ? 'text-white bg-gray-800' 
                          : 'text-gray-500 hover:text-white hover:bg-gray-800/50'
                      }`}
                    >
                      <span className="ml-3">{child.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-800 py-2">
        {bottomItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                isActive(item.path)
                  ? 'bg-gray-800 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* User */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {agent?.full_name?.charAt(0) || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{agent?.full_name || 'Admin'}</p>
            <p className="text-gray-500 text-xs truncate">{agent?.role || 'admin'}</p>
          </div>
          <button
            onClick={logout}
            className="text-gray-500 hover:text-white transition-colors"
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
