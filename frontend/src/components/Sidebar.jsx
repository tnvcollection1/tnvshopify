import React from 'react';
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
  ClipboardList,
  PhoneCall,
  Plane,
  MessageCircle,
  Inbox,
  FileText,
  Target,
  Zap,
  Users as UsersIcon,
  DollarSign,
  Facebook
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, agent } = useAuth();

  // Check if user is demo/reviewer
  const isDemoUser = agent?.role === 'demo' || agent?.role === 'reviewer';

  const menuSections = [
    {
      title: 'MAIN',
      items: [
        { icon: Home, label: 'Dashboard', path: '/dashboard', showForDemo: false },
        { icon: Target, label: 'Marketing Dashboard', path: '/marketing', highlighted: true, showForDemo: false },
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { icon: PhoneCall, label: 'Confirmation Tracker', path: '/confirmation', showForDemo: false },
        { icon: Truck, label: 'Dispatch Tracker', path: '/tracker', showForDemo: false },
        { icon: Plane, label: 'Purchase Tracker', path: '/purchase', showForDemo: false },
        { icon: ShoppingCart, label: 'Orders', path: '/orders', showForDemo: false },
        { icon: Users, label: 'Customers', path: '/customers', showForDemo: false },
      ]
    },
    {
      title: 'WHATSAPP CRM',
      items: [
        { icon: Inbox, label: 'WhatsApp Inbox', path: '/whatsapp-inbox', highlighted: true, showForDemo: true },
        { icon: FileText, label: 'Templates', path: '/whatsapp-templates', highlighted: true, showForDemo: true },
        { icon: Target, label: 'Campaigns', path: '/whatsapp-campaigns', highlighted: true, showForDemo: true },
        { icon: BarChart3, label: 'Analytics', path: '/whatsapp-analytics', highlighted: true, showForDemo: true },
        { icon: MessageCircle, label: 'Legacy Messaging', path: '/whatsapp', showForDemo: false },
      ]
    },
    {
      title: 'FINANCE',
      items: [
        { icon: DollarSign, label: 'Finance Reconciliation', path: '/finance-reconciliation', highlighted: true, showForDemo: false },
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        { icon: Package, label: 'Inventory', path: '/inventory', showForDemo: false },
        { icon: BarChart3, label: 'Inventory Overview', path: '/inventory-overview', showForDemo: false },
        { icon: TrendingUp, label: 'Inventory Health', path: '/inventory-health', highlighted: true, showForDemo: false },
      ]
    },
    {
      title: 'MARKETING',
      items: [
        { icon: Facebook, label: 'Facebook Ads', path: '/facebook-marketing', highlighted: true, showForDemo: false },
        { icon: BarChart3, label: 'Performance', path: '/performance-comparison', highlighted: true, showForDemo: false },
        { icon: TrendingUp, label: 'Dynamic Pricing', path: '/dynamic-pricing', highlighted: true, showForDemo: false },
        { icon: Target, label: 'Campaigns', path: '/campaigns', showForDemo: false },
        { icon: Zap, label: 'Flash Sales', path: '/flash-sales', showForDemo: false },
        { icon: UsersIcon, label: 'Customer Segments', path: '/segments', showForDemo: false },
        { icon: Package, label: 'Bundles', path: '/bundles', showForDemo: false },
      ]
    },
    {
      title: 'INSIGHTS',
      items: [
        { icon: BarChart3, label: 'Reports', path: '/reports', showForDemo: false },
        { icon: TrendingUp, label: 'Analytics', path: '/analytics', showForDemo: false },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { icon: Settings, label: 'Settings', path: '/settings', showForDemo: false },
      ]
    }
  ];

  // Filter sections and items based on demo user status
  const filteredSections = isDemoUser 
    ? menuSections
        .map(section => ({
          ...section,
          items: section.items.filter(item => item.showForDemo)
        }))
        .filter(section => section.items.length > 0)
    : menuSections;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-64 bg-[#1a1a1a] min-h-screen flex flex-col text-white">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          TNC Collection
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          {isDemoUser ? 'WhatsApp CRM Demo' : 'Dispatch Management'}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {filteredSections.map((section, sectionIndex) => (
          <div key={section.title} className={sectionIndex > 0 ? 'mt-6' : ''}>
            <div className="px-4 mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </span>
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg
                      transition-all duration-200 text-left relative
                      ${isActive 
                        ? 'bg-green-600 text-white shadow-lg shadow-green-900/50' 
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }
                      ${item.highlighted && !isActive ? 'border border-green-600/30' : ''}
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    {item.highlighted && !isActive && (
                      <span className="ml-auto">
                        <span className="flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 rounded-lg mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center">
            <span className="text-white font-bold">
              {agent?.username?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {agent?.full_name || agent?.username || 'Admin'}
            </p>
            <p className="text-xs text-gray-400 capitalize">
              {isDemoUser ? 'Demo Reviewer' : (agent?.role || 'Administrator')}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-900/20 hover:text-red-400 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
