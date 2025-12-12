import React, { useState } from 'react';
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
  Gift
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, agent } = useAuth();
  const [expandedSections, setExpandedSections] = useState(['orders', 'marketing']);

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

  const isActive = (path) => location.pathname === path;
  const isSectionActive = (children) => children?.some(child => location.pathname === child.path);

  return (
    <div className="w-56 bg-[#1a1a1a] h-screen flex flex-col border-r border-gray-800">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#95bf47] rounded-md flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">TNC Collection</h1>
            <p className="text-gray-500 text-xs">Admin</p>
          </div>
        </div>
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
