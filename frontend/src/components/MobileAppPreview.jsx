import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  RefreshCw, 
  Moon, 
  Sun, 
  Home,
  Search,
  ShoppingCart,
  Heart,
  User,
  ChevronRight,
  Star,
  Settings,
  Bell,
  Zap,
  Wifi,
  Battery,
  Signal
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useStore } from '../contexts/StoreContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const MobileAppPreview = () => {
  const { selectedStore } = useStore();
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [config, setConfig] = useState({
    app: { name: 'TNV Collection', tagline: 'Fashion at your fingertips' },
    theme: { 
      primaryColor: '#000000', 
      accentColor: '#FF3366', 
      backgroundColor: '#FAFAFA',
      darkModeEnabled: true 
    },
    features: {
      pushNotifications: true,
      hapticFeedback: true,
      offlineMode: true
    }
  });

  useEffect(() => {
    fetchConfig();
  }, [selectedStore]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/mobile-app/config?store=${selectedStore}`);
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  // Theme colors based on mode
  const colors = isDarkMode ? {
    bg: '#0A0A0A',
    surface: '#1A1A1A',
    card: '#262626',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    border: '#333333',
    accent: config.theme.accentColor || '#FF3366',
    primary: '#FFFFFF'
  } : {
    bg: config.theme.backgroundColor || '#FAFAFA',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#666666',
    border: '#E5E5E5',
    accent: config.theme.accentColor || '#FF3366',
    primary: config.theme.primaryColor || '#000000'
  };

  // Phone Frame Component
  const PhoneFrame = ({ children }) => (
    <div className="relative mx-auto" style={{ width: '320px' }}>
      {/* Phone outer frame */}
      <div 
        className="rounded-[3rem] p-3 shadow-2xl"
        style={{ 
          background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
      >
        {/* Screen area */}
        <div 
          className="rounded-[2.5rem] overflow-hidden relative"
          style={{ backgroundColor: colors.bg }}
        >
          {/* Status bar */}
          <div 
            className="flex justify-between items-center px-6 py-2 text-xs"
            style={{ backgroundColor: colors.surface }}
          >
            <span style={{ color: colors.text }}>9:41</span>
            <div className="absolute left-1/2 transform -translate-x-1/2 w-24 h-6 bg-black rounded-full" />
            <div className="flex items-center gap-1" style={{ color: colors.text }}>
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-4 h-3" />
            </div>
          </div>
          
          {/* Screen content */}
          <div style={{ height: '580px', backgroundColor: colors.bg }}>
            {children}
          </div>
          
          {/* Home indicator */}
          <div className="flex justify-center py-2" style={{ backgroundColor: colors.bg }}>
            <div className="w-32 h-1 rounded-full" style={{ backgroundColor: colors.text, opacity: 0.3 }} />
          </div>
        </div>
      </div>
    </div>
  );

  // Home Screen
  const HomeScreen = () => (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <div className="px-4 py-3 flex justify-between items-center" style={{ backgroundColor: colors.surface }}>
        <div>
          <h1 className="text-lg font-bold" style={{ color: colors.text }}>{config.app.name}</h1>
        </div>
        <div className="flex gap-3">
          <Search className="w-5 h-5" style={{ color: colors.text }} />
          <Bell className="w-5 h-5" style={{ color: colors.text }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
        {/* Hero Banner */}
        <div 
          className="h-36 rounded-2xl flex items-end p-4"
          style={{ background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}99)` }}
        >
          <div>
            <p className="text-white text-xs opacity-80">NEW ARRIVALS</p>
            <p className="text-white text-xl font-bold">Summer Collection</p>
            <p className="text-white text-xs mt-1">Up to 50% OFF</p>
          </div>
        </div>

        {/* Categories */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold" style={{ color: colors.text }}>Categories</span>
            <span className="text-xs" style={{ color: colors.textSecondary }}>See all →</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {['👔', '👗', '👟', '👜', '⌚'].map((emoji, i) => (
              <div key={i} className="flex flex-col items-center">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl"
                  style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                >
                  {emoji}
                </div>
                <span className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  {['Men', 'Women', 'Shoes', 'Bags', 'Watch'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Products */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold" style={{ color: colors.text }}>Trending</span>
            <span className="text-xs" style={{ color: colors.textSecondary }}>See all →</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
              >
                <div className="h-28 bg-gradient-to-br from-gray-200 to-gray-300 relative">
                  <div 
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: colors.surface }}
                  >
                    <Heart className="w-4 h-4" style={{ color: colors.accent }} />
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs" style={{ color: colors.textSecondary }}>Brand</p>
                  <p className="text-sm font-medium truncate" style={{ color: colors.text }}>Product Name</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="font-bold text-sm" style={{ color: colors.text }}>$99</span>
                    <span className="text-xs line-through" style={{ color: colors.textSecondary }}>$149</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <TabBar colors={colors} currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
    </div>
  );

  // Cart Screen
  const CartScreen = () => (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.bg }}>
      <div className="px-4 py-3" style={{ backgroundColor: colors.surface }}>
        <h1 className="text-lg font-bold text-center" style={{ color: colors.text }}>Shopping Bag</h1>
      </div>
      
      <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
        {[1, 2].map((i) => (
          <div 
            key={i}
            className="flex gap-3 p-3 rounded-xl"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
          >
            <div className="w-20 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg" />
            <div className="flex-1">
              <p className="text-xs" style={{ color: colors.textSecondary }}>TNV Collection</p>
              <p className="font-medium" style={{ color: colors.text }}>Summer Dress</p>
              <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>Size: M • Color: Black</p>
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg" style={{ backgroundColor: colors.bg }}>
                  <span style={{ color: colors.text }}>−</span>
                  <span style={{ color: colors.text }}>1</span>
                  <span style={{ color: colors.text }}>+</span>
                </div>
                <span className="font-bold" style={{ color: colors.text }}>$129</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4" style={{ backgroundColor: colors.surface, borderTop: `1px solid ${colors.border}` }}>
        <div className="flex justify-between mb-3">
          <span style={{ color: colors.textSecondary }}>Total</span>
          <span className="font-bold text-lg" style={{ color: colors.text }}>$258</span>
        </div>
        <button 
          className="w-full py-3 rounded-full font-semibold"
          style={{ backgroundColor: colors.primary, color: isDarkMode ? '#000' : '#FFF' }}
        >
          Checkout →
        </button>
      </div>

      <TabBar colors={colors} currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
    </div>
  );

  // Settings Screen
  const SettingsScreen = () => (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.bg }}>
      <div className="px-4 py-3" style={{ backgroundColor: colors.surface }}>
        <h1 className="text-lg font-bold text-center" style={{ color: colors.text }}>Settings</h1>
      </div>
      
      <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
        {/* Theme Toggle */}
        <div 
          className="p-4 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <p className="font-semibold mb-3" style={{ color: colors.text }}>Appearance</p>
          <div className="flex gap-2">
            {['Light', 'Dark', 'System'].map((theme) => (
              <button
                key={theme}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ 
                  backgroundColor: (theme === 'Dark' && isDarkMode) || (theme === 'Light' && !isDarkMode) 
                    ? colors.primary 
                    : colors.bg,
                  color: (theme === 'Dark' && isDarkMode) || (theme === 'Light' && !isDarkMode)
                    ? (isDarkMode ? '#000' : '#FFF')
                    : colors.text
                }}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        {/* Features */}
        <div 
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          {[
            { icon: Bell, label: 'Push Notifications', enabled: config.features.pushNotifications },
            { icon: Zap, label: 'Haptic Feedback', enabled: config.features.hapticFeedback },
            { icon: Wifi, label: 'Offline Mode', enabled: config.features.offlineMode },
          ].map((item, i) => (
            <div 
              key={i}
              className="flex items-center justify-between p-4"
              style={{ borderBottom: i < 2 ? `1px solid ${colors.border}` : 'none' }}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" style={{ color: colors.accent }} />
                <span style={{ color: colors.text }}>{item.label}</span>
              </div>
              <div 
                className="w-10 h-6 rounded-full p-1 transition-colors"
                style={{ backgroundColor: item.enabled ? colors.accent : colors.border }}
              >
                <div 
                  className="w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: item.enabled ? 'translateX(16px)' : 'translateX(0)' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* App Info */}
        <div 
          className="p-4 rounded-xl text-center"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <p className="font-bold" style={{ color: colors.text }}>{config.app.name}</p>
          <p className="text-xs" style={{ color: colors.textSecondary }}>Version 1.0.0</p>
        </div>
      </div>

      <TabBar colors={colors} currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
    </div>
  );

  // Tab Bar Component
  const TabBar = ({ colors, currentScreen, setCurrentScreen }) => (
    <div 
      className="flex justify-around py-2 px-2"
      style={{ backgroundColor: colors.surface, borderTop: `1px solid ${colors.border}` }}
    >
      {[
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'search', icon: Search, label: 'Browse' },
        { id: 'cart', icon: ShoppingCart, label: 'Bag', badge: 2 },
        { id: 'wishlist', icon: Heart, label: 'Wishlist' },
        { id: 'settings', icon: User, label: 'Account' },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setCurrentScreen(tab.id)}
          className="flex flex-col items-center gap-1 relative"
        >
          <div className="relative">
            <tab.icon 
              className="w-5 h-5" 
              style={{ 
                color: currentScreen === tab.id ? colors.accent : colors.textSecondary,
                strokeWidth: currentScreen === tab.id ? 2.5 : 1.5
              }} 
            />
            {tab.badge && (
              <div 
                className="absolute -top-1 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                style={{ backgroundColor: colors.accent }}
              >
                {tab.badge}
              </div>
            )}
          </div>
          <span 
            className="text-[10px]"
            style={{ color: currentScreen === tab.id ? colors.accent : colors.textSecondary }}
          >
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'cart':
        return <CartScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Smartphone className="w-7 h-7" />
            Mobile App Preview
          </h1>
          <p className="text-gray-500 mt-1">Preview how your app looks on mobile devices</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="gap-2"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </Button>
          <Button variant="outline" onClick={fetchConfig}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Phone Preview */}
        <div className="lg:col-span-2 flex justify-center py-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl">
          <PhoneFrame>
            {renderScreen()}
          </PhoneFrame>
        </div>

        {/* Controls & Info */}
        <div className="space-y-4">
          {/* Screen Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Navigate Screens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { id: 'home', label: 'Home Screen', icon: Home },
                { id: 'cart', label: 'Shopping Cart', icon: ShoppingCart },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((screen) => (
                <button
                  key={screen.id}
                  onClick={() => setCurrentScreen(screen.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    currentScreen === screen.id 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <screen.icon className="w-4 h-4" />
                  {screen.label}
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Current Config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Current Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">App Name</span>
                <span className="font-medium">{config.app.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Primary Color</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: config.theme.primaryColor }}
                  />
                  <span className="font-mono text-xs">{config.theme.primaryColor}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Accent Color</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: config.theme.accentColor }}
                  />
                  <span className="font-mono text-xs">{config.theme.accentColor}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Dark Mode</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  config.theme.darkModeEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {config.theme.darkModeEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Features Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Active Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Push Notifications', enabled: config.features.pushNotifications },
                { label: 'Haptic Feedback', enabled: config.features.hapticFeedback },
                { label: 'Offline Mode', enabled: config.features.offlineMode },
              ].map((feature) => (
                <div key={feature.label} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${feature.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm text-gray-600">{feature.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/mobile-app-settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Settings
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/mobile-push-notifications">
                  <Bell className="w-4 h-4 mr-2" />
                  Send Push Notification
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MobileAppPreview;
