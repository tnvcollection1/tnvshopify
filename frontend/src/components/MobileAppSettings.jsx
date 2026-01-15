import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Settings, 
  Palette, 
  Bell, 
  Image, 
  Type, 
  Save,
  RefreshCw,
  Eye,
  Moon,
  Sun,
  Upload,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Globe,
  Shield,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const MobileAppSettings = () => {
  const { selectedStore } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  
  const [settings, setSettings] = useState({
    // General
    appName: 'TNV Collection',
    appTagline: 'Fashion at your fingertips',
    appVersion: '1.0.0',
    bundleId: 'com.tnvcollection.app',
    
    // Theme
    primaryColor: '#000000',
    accentColor: '#FF3366',
    backgroundColor: '#FAFAFA',
    darkModeEnabled: true,
    defaultTheme: 'system', // light, dark, system
    
    // Content - Home Screen
    homeScreenSections: [
      { id: 'hero_banner', title: 'Hero Banner', enabled: true, type: 'banner' },
      { id: 'categories', title: 'Categories', enabled: true, type: 'categories' },
      { id: 'featured_products', title: 'Featured Products', enabled: true, type: 'products' },
      { id: 'new_arrivals', title: 'New Arrivals', enabled: true, type: 'products' },
      { id: 'sale_banner', title: 'Sale Banner', enabled: true, type: 'banner' },
      { id: 'best_sellers', title: 'Best Sellers', enabled: true, type: 'products' },
    ],
    
    // Content - Collections
    featuredCollections: [],
    showCollectionImages: true,
    collectionsDisplayStyle: 'grid', // grid, list, carousel
    
    // Content - Products
    productsPerRow: 2,
    showProductRatings: true,
    showQuickAddToCart: true,
    productCardStyle: 'modern', // modern, classic, minimal
    
    // Content - Banners
    heroBanners: [],
    promoBanners: [],
    
    // Features
    enablePushNotifications: true,
    enableHapticFeedback: true,
    enableOfflineMode: true,
    enableBiometricAuth: false,
    enableSocialLogin: true,
    
    // Store Info
    supportPhone: '+971501234567',
    supportEmail: 'support@tnvcollection.com',
    supportWhatsApp: '+971501234567',
    
    // App Store
    appStoreUrl: '',
    playStoreUrl: '',
    
    // Splash Screen
    splashBackgroundColor: '#000000',
    splashDuration: 2000,
  });

  useEffect(() => {
    fetchSettings();
    fetchCollections();
    fetchProducts();
    fetchBanners();
  }, [selectedStore]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/mobile-app/settings?store=${selectedStore}`);
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/api/mobile-app/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store: selectedStore, settings }),
      });
      
      if (response.ok) {
        toast.success('Settings saved successfully!');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const response = await fetch(`${API_URL}/api/storefront/collections?store=${selectedStore || 'tnvcollection'}`);
      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections || []);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/storefront/products?store=${selectedStore || 'tnvcollection'}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchBanners = async () => {
    try {
      const response = await fetch(`${API_URL}/api/storefront-banners?store=${selectedStore || 'tnvcollection'}`);
      if (response.ok) {
        const data = await response.json();
        setBanners(data.banners || []);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleHomeSection = (sectionId) => {
    setSettings(prev => ({
      ...prev,
      homeScreenSections: prev.homeScreenSections.map(section =>
        section.id === sectionId ? { ...section, enabled: !section.enabled } : section
      )
    }));
  };

  const reorderHomeSection = (sectionId, direction) => {
    setSettings(prev => {
      const sections = [...prev.homeScreenSections];
      const index = sections.findIndex(s => s.id === sectionId);
      if (direction === 'up' && index > 0) {
        [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
      } else if (direction === 'down' && index < sections.length - 1) {
        [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
      }
      return { ...prev, homeScreenSections: sections };
    });
  };

  const toggleFeaturedCollection = (collectionId) => {
    setSettings(prev => {
      const featured = prev.featuredCollections || [];
      if (featured.includes(collectionId)) {
        return { ...prev, featuredCollections: featured.filter(id => id !== collectionId) };
      } else {
        return { ...prev, featuredCollections: [...featured, collectionId] };
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Smartphone className="w-7 h-7" />
            Mobile App Settings
          </h1>
          <p className="text-gray-500 mt-1">Configure your mobile app appearance and features</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.open('/mobile-app-preview', '_blank')}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-gray-100 p-1 flex-wrap">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Store Info
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                App Identity
              </CardTitle>
              <CardDescription>Basic information about your mobile app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appName">App Name</Label>
                  <Input 
                    id="appName"
                    value={settings.appName}
                    onChange={(e) => updateSetting('appName', e.target.value)}
                    placeholder="My Store App"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appTagline">Tagline</Label>
                  <Input 
                    id="appTagline"
                    value={settings.appTagline}
                    onChange={(e) => updateSetting('appTagline', e.target.value)}
                    placeholder="Your catchy tagline"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appVersion">Version</Label>
                  <Input 
                    id="appVersion"
                    value={settings.appVersion}
                    onChange={(e) => updateSetting('appVersion', e.target.value)}
                    placeholder="1.0.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bundleId">Bundle ID</Label>
                  <Input 
                    id="bundleId"
                    value={settings.bundleId}
                    onChange={(e) => updateSetting('bundleId', e.target.value)}
                    placeholder="com.yourcompany.app"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                App Icon & Splash Screen
              </CardTitle>
              <CardDescription>Upload your app icon and splash screen images</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>App Icon (1024x1024)</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 transition-colors cursor-pointer">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold">
                      TNV
                    </div>
                    <p className="text-sm text-gray-500 mt-3">Click to upload icon</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Splash Screen</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 transition-colors cursor-pointer">
                    <div className="w-24 h-40 bg-black rounded-xl mx-auto flex items-center justify-center">
                      <span className="text-white text-lg font-bold">TNV</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-3">Click to upload splash</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="splashBg">Splash Background Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color"
                      value={settings.splashBackgroundColor}
                      onChange={(e) => updateSetting('splashBackgroundColor', e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input 
                      value={settings.splashBackgroundColor}
                      onChange={(e) => updateSetting('splashBackgroundColor', e.target.value)}
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="splashDuration">Splash Duration (ms)</Label>
                  <Input 
                    type="number"
                    value={settings.splashDuration}
                    onChange={(e) => updateSetting('splashDuration', parseInt(e.target.value))}
                    placeholder="2000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Color Scheme
              </CardTitle>
              <CardDescription>Customize your app's color palette</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input 
                      value={settings.primaryColor}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => updateSetting('accentColor', e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input 
                      value={settings.accentColor}
                      onChange={(e) => updateSetting('accentColor', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Background Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color"
                      value={settings.backgroundColor}
                      onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input 
                      value={settings.backgroundColor}
                      onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <Label className="mb-3 block">Preview</Label>
                <div className="flex gap-4">
                  <div 
                    className="w-32 h-56 rounded-2xl shadow-lg overflow-hidden"
                    style={{ backgroundColor: settings.backgroundColor }}
                  >
                    <div 
                      className="h-12 flex items-center justify-center"
                      style={{ backgroundColor: settings.primaryColor }}
                    >
                      <span className="text-white text-xs font-semibold">{settings.appName}</span>
                    </div>
                    <div className="p-2 space-y-2">
                      <div className="h-16 bg-gray-200 rounded-lg"></div>
                      <div 
                        className="h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: settings.accentColor }}
                      >
                        <span className="text-white text-xs">Shop Now</span>
                      </div>
                    </div>
                  </div>
                  <div 
                    className="w-32 h-56 rounded-2xl shadow-lg overflow-hidden bg-gray-900"
                  >
                    <div 
                      className="h-12 flex items-center justify-center bg-gray-800"
                    >
                      <span className="text-white text-xs font-semibold">{settings.appName}</span>
                    </div>
                    <div className="p-2 space-y-2">
                      <div className="h-16 bg-gray-700 rounded-lg"></div>
                      <div 
                        className="h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: settings.accentColor }}
                      >
                        <span className="text-white text-xs">Shop Now</span>
                      </div>
                    </div>
                    <p className="text-center text-gray-500 text-xs mt-1">Dark Mode</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="w-5 h-5" />
                Dark Mode
              </CardTitle>
              <CardDescription>Configure dark mode settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Dark Mode</Label>
                  <p className="text-sm text-gray-500">Allow users to switch to dark theme</p>
                </div>
                <Switch 
                  checked={settings.darkModeEnabled}
                  onCheckedChange={(checked) => updateSetting('darkModeEnabled', checked)}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Theme</Label>
                <div className="flex gap-2">
                  {['light', 'dark', 'system'].map((theme) => (
                    <Button
                      key={theme}
                      variant={settings.defaultTheme === theme ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSetting('defaultTheme', theme)}
                      className="capitalize"
                    >
                      {theme === 'light' && <Sun className="w-4 h-4 mr-1" />}
                      {theme === 'dark' && <Moon className="w-4 h-4 mr-1" />}
                      {theme === 'system' && <Settings className="w-4 h-4 mr-1" />}
                      {theme}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                App Features
              </CardTitle>
              <CardDescription>Enable or disable app features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-gray-500">Send order updates and promotions</p>
                  </div>
                </div>
                <Switch 
                  checked={settings.enablePushNotifications}
                  onCheckedChange={(checked) => updateSetting('enablePushNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <Label>Haptic Feedback</Label>
                    <p className="text-sm text-gray-500">Tactile feedback on interactions</p>
                  </div>
                </div>
                <Switch 
                  checked={settings.enableHapticFeedback}
                  onCheckedChange={(checked) => updateSetting('enableHapticFeedback', checked)}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <Label>Offline Mode</Label>
                    <p className="text-sm text-gray-500">Cache products for offline browsing</p>
                  </div>
                </div>
                <Switch 
                  checked={settings.enableOfflineMode}
                  onCheckedChange={(checked) => updateSetting('enableOfflineMode', checked)}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <Label>Biometric Authentication</Label>
                    <p className="text-sm text-gray-500">Face ID / Fingerprint login</p>
                  </div>
                </div>
                <Switch 
                  checked={settings.enableBiometricAuth}
                  onCheckedChange={(checked) => updateSetting('enableBiometricAuth', checked)}
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <Label>Social Login</Label>
                    <p className="text-sm text-gray-500">Login with Apple, Google</p>
                  </div>
                </div>
                <Switch 
                  checked={settings.enableSocialLogin}
                  onCheckedChange={(checked) => updateSetting('enableSocialLogin', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Info Tab */}
        <TabsContent value="store" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Contact & Support
              </CardTitle>
              <CardDescription>Customer support information shown in the app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supportPhone">Support Phone</Label>
                  <Input 
                    id="supportPhone"
                    value={settings.supportPhone}
                    onChange={(e) => updateSetting('supportPhone', e.target.value)}
                    placeholder="+971501234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportWhatsApp">WhatsApp Number</Label>
                  <Input 
                    id="supportWhatsApp"
                    value={settings.supportWhatsApp}
                    onChange={(e) => updateSetting('supportWhatsApp', e.target.value)}
                    placeholder="+971501234567"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input 
                  id="supportEmail"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => updateSetting('supportEmail', e.target.value)}
                  placeholder="support@example.com"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                App Store Links
              </CardTitle>
              <CardDescription>Links to your published apps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appStoreUrl">Apple App Store URL</Label>
                <Input 
                  id="appStoreUrl"
                  value={settings.appStoreUrl}
                  onChange={(e) => updateSetting('appStoreUrl', e.target.value)}
                  placeholder="https://apps.apple.com/app/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="playStoreUrl">Google Play Store URL</Label>
                <Input 
                  id="playStoreUrl"
                  value={settings.playStoreUrl}
                  onChange={(e) => updateSetting('playStoreUrl', e.target.value)}
                  placeholder="https://play.google.com/store/apps/..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MobileAppSettings;
