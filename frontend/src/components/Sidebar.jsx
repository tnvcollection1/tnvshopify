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
  Link2,
  Shield,
  Send,
  Inbox,
  LayoutTemplate,
  Radio,
  UserPlus,
  Tags,
  Plane,
  Box,
  Upload,
  Key,
  Activity
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, agent, isAdmin } = useAuth();
  const { stores, selectedStore, switchStore, syncStoreData, syncing, getStoreName } = useStore();
  const [expandedSections, setExpandedSections] = useState(['whatsapp', 'shopify']);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Keyboard shortcut for search (Cmd+K or Ctrl+K)
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
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

  // Full menu for Admin users
  const adminMenuItems = [
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
        { icon: FileText, label: 'Cost Reconciliation', path: '/finance-reconciliation' },
        { icon: Truck, label: 'DTDC Payments', path: '/dtdc-reconciliation' },
        { icon: TrendingUp, label: 'Dynamic Pricing', path: '/dynamic-pricing' },
      ]
    },
    { 
      icon: Plane, 
      label: 'DWZ56 Logistics', 
      section: 'dwz56',
      children: [
        { icon: Truck, label: 'Shipping Account', path: '/dwz56-shipping' },
        { icon: ShoppingCart, label: 'Purchase Account', path: '/dwz56-purchase' },
      ]
    },
    { 
      icon: Package, 
      label: '1688 Products', 
      path: '/1688-products',
      badge: 'New'
    },
    { 
      icon: Search, 
      label: '1688 Scraper', 
      path: '/product-scraper',
      badge: ''
    },
    { 
      icon: Upload, 
      label: 'Product Collector', 
      path: '/product-collector',
      badge: 'New'
    },
    { 
      icon: Key, 
      label: '1688 Accounts', 
      path: '/1688-accounts',
      badge: 'New'
    },
    { 
      icon: Activity, 
      label: 'API Monitor', 
      path: '/tmapi-monitor',
      badge: ''
    },
    { 
      icon: RefreshCw, 
      label: 'Shopify Sync', 
      path: '/shopify-sync',
      badge: 'New'
    },
    { 
      icon: Send, 
      label: 'Fulfillment Sync', 
      path: '/fulfillment-sync',
      badge: ''
    },
    { 
      icon: Truck, 
      label: 'Fulfillment Pipeline', 
      path: '/fulfillment-pipeline',
      badge: 'New'
    },
    { 
      icon: Truck, 
      label: 'Fulfillment', 
      path: '/fulfillment',
      badge: ''
    },
    { 
      icon: Box, 
      label: 'Products', 
      path: '/products',
      badge: 'New'
    },
    { 
      icon: ShoppingCart, 
      label: '1688 Purchase', 
      path: '/purchase-1688',
      badge: 'New'
    },
    { 
      icon: Zap, 
      label: 'Bulk Order 1688', 
      path: '/bulk-order-1688',
      badge: 'New'
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
        { icon: Inbox, label: 'Inbox', path: '/whatsapp-inbox' },
        { icon: Send, label: 'Send Message', path: '/whatsapp' },
        { icon: LayoutTemplate, label: 'Templates', path: '/whatsapp-templates' },
        { icon: Radio, label: 'Campaigns', path: '/whatsapp-campaigns' },
        { icon: BarChart3, label: 'Analytics', path: '/whatsapp-analytics' },
        { icon: Link2, label: 'Business Platform', path: '/whatsapp-business' },
        { icon: Bell, label: 'Order Notifications', path: '/notifications' },
      ]
    },
    { 
      icon: Store, 
      label: 'Shopify', 
      section: 'shopify',
      children: [
        { icon: RefreshCw, label: 'Sync Orders', path: '/dashboard' },
        { icon: FileText, label: 'Drafts & Abandoned', path: '/orders' },
        { icon: Settings, label: 'Store Settings', path: '/settings' },
      ]
    },
    { icon: Users, label: 'User Management', path: '/users' },
    { icon: Shield, label: 'Super Admin', path: '/super-admin' },
    { icon: CreditCard, label: 'Subscription', path: '/pricing' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  // Limited menu for regular users - Only WhatsApp + Shopify
  const userMenuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { 
      icon: MessageCircle, 
      label: 'WhatsApp', 
      section: 'whatsapp',
      children: [
        { icon: Inbox, label: 'Inbox', path: '/whatsapp-inbox' },
        { icon: Send, label: 'Send Message', path: '/whatsapp' },
        { icon: LayoutTemplate, label: 'Templates', path: '/whatsapp-templates' },
        { icon: Radio, label: 'Campaigns', path: '/whatsapp-campaigns' },
        { icon: BarChart3, label: 'Analytics', path: '/whatsapp-analytics' },
        { icon: Link2, label: 'Connect WhatsApp', path: '/whatsapp-business' },
      ]
    },
    { icon: Users, label: 'Contacts', path: '/customers' },
    { 
      icon: Store, 
      label: 'Shopify', 
      section: 'shopify',
      children: [
        { icon: Layers, label: 'Orders', path: '/dashboard' },
        { icon: FileText, label: 'Drafts', path: '/orders' },
        { icon: RefreshCw, label: 'Sync', path: '/settings' },
      ]
    },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  // Select menu based on user role
  const menuItems = isAdmin() ? adminMenuItems : userMenuItems;

  const isActive = (path) => location.pathname === path;
  const isSectionActive = (children) => children?.some(child => location.pathname === child.path);

  return (
    <div className="w-[240px] bg-[#075e54] h-screen flex flex-col overflow-hidden">
      {/* Brand Header - WhatsApp Style */}
      <div className="p-3 border-b border-[#128c7e]">
        <div className="relative">
          <button
            onClick={() => setShowStoreDropdown(!showStoreDropdown)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#128c7e]/50 transition-colors"
          >
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg">
              <MessageCircle className="w-5 h-5 text-[#25d366]" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-white font-semibold text-sm truncate">
                Wamerce
              </p>
              <p className="text-green-200 text-xs">
                {getStoreName(selectedStore)}
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-green-200 transition-transform duration-200 ${showStoreDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Store Dropdown */}
          {showStoreDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1f2c33] border border-[#2a3942] rounded-lg shadow-2xl z-50 overflow-hidden">
              <div className="p-2 border-b border-[#2a3942]">
                <p className="text-xs text-gray-400 font-medium px-2">SELECT STORE</p>
              </div>
              
              {/* Individual Stores Only - No "All Stores" option */}
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => { switchStore(store.store_name); setShowStoreDropdown(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                    selectedStore === store.store_name 
                      ? 'bg-[#25d366]/20 text-[#25d366]' 
                      : 'text-gray-300 hover:bg-[#2a3942]'
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

        {/* Sync Button - Only for admin */}
        {isAdmin() && selectedStore && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              syncStatus === 'success'
                ? 'bg-[#25d366]/20 text-[#25d366] border border-[#25d366]/30'
                : syncStatus === 'error'
                ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                : syncing
                ? 'bg-[#128c7e] text-green-200 cursor-wait'
                : 'bg-[#128c7e] text-white hover:bg-[#1a9e8b] border border-[#25d366]/30'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : syncStatus === 'success' ? 'Synced!' : 'Sync Store Data'}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <button 
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-[#128c7e]/50 rounded-lg text-green-200 text-sm hover:bg-[#128c7e] transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4" />
          <span>Search</span>
          <kbd className="ml-auto text-xs bg-[#128c7e] px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>
      </div>
      
      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20" onClick={() => setSearchOpen(false)}>
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders, customers, AWB..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      navigate(`/dashboard?search=${encodeURIComponent(searchQuery.trim())}`);
                      setSearchOpen(false);
                      setSearchQuery('');
                    }
                    if (e.key === 'Escape') {
                      setSearchOpen(false);
                    }
                  }}
                  className="flex-1 text-lg outline-none placeholder-gray-400"
                  autoFocus
                />
                <kbd className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">ESC</kbd>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-3">Quick Actions</p>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    if (searchQuery.trim()) {
                      navigate(`/dashboard?search=${encodeURIComponent(searchQuery.trim())}`);
                    } else {
                      navigate('/dashboard');
                    }
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left"
                >
                  <ShoppingCart className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{searchQuery ? `Search "${searchQuery}" in Orders` : 'Go to Orders'}</span>
                </button>
                <button
                  onClick={() => {
                    if (searchQuery.trim()) {
                      navigate(`/dispatch-tracker?search=${encodeURIComponent(searchQuery.trim())}`);
                    } else {
                      navigate('/dispatch-tracker');
                    }
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left"
                >
                  <Truck className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{searchQuery ? `Search "${searchQuery}" in Dispatch Tracker` : 'Go to Dispatch Tracker'}</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/dtdc-reconciliation');
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left"
                >
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">DTDC Reconciliation</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/finance-reconciliation');
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left"
                >
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Finance Reconciliation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    ? 'bg-[#128c7e] text-white' 
                    : 'text-green-100 hover:text-white hover:bg-[#128c7e]/50'
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
                <div className="mt-0.5 ml-3 pl-3 border-l border-[#128c7e]">
                  {item.children.map((child, childIndex) => {
                    const ChildIcon = child.icon;
                    return (
                      <button
                        key={childIndex}
                        onClick={() => navigate(child.path)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-150 ${
                          isActive(child.path)
                            ? 'bg-[#128c7e] text-white' 
                            : 'text-green-200 hover:text-white hover:bg-[#128c7e]/50'
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
      <div className="border-t border-[#128c7e] p-2">
        {isAdmin() && (
          <button
            onClick={() => navigate('/pricing')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
              isActive('/pricing') ? 'bg-[#128c7e] text-white' : 'text-green-100 hover:text-white hover:bg-[#128c7e]/50'
            }`}
          >
            <CreditCard className="w-[18px] h-[18px]" />
            <span className="font-medium">Subscription</span>
          </button>
        )}
        <button
          onClick={() => navigate('/settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
            isActive('/settings') ? 'bg-[#128c7e] text-white' : 'text-green-100 hover:text-white hover:bg-[#128c7e]/50'
          }`}
        >
          <Settings className="w-[18px] h-[18px]" />
          <span className="font-medium">Settings</span>
        </button>
      </div>

      {/* User Profile */}
      <div className="border-t border-[#128c7e] p-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#25d366] rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {agent?.full_name?.charAt(0) || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{agent?.full_name || 'Admin'}</p>
            <p className="text-green-200 text-xs capitalize">{agent?.role || 'admin'}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-green-200 hover:text-white hover:bg-[#128c7e] rounded-lg transition-colors"
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
