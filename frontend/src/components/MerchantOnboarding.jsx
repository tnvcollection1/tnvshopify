import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Building2, 
  Store, 
  Smartphone,
  Palette,
  MessageSquare, 
  BarChart3,
  CreditCard,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Globe,
  ShoppingBag,
  Zap,
  Moon,
  Sun,
  Sparkles,
  Upload,
  Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Pre-configured themes
const THEMES = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean, white backgrounds with elegant typography',
    icon: '✨',
    preview: {
      primary: '#000000',
      accent: '#10B981',
      background: '#FFFFFF',
      text: '#1F2937'
    },
    features: ['Clean layouts', 'Lots of whitespace', 'Focus on products']
  },
  {
    id: 'fashion-forward',
    name: 'Fashion Forward',
    description: 'Bold colors, large imagery inspired by Namshi',
    icon: '👗',
    preview: {
      primary: '#FF3366',
      accent: '#FF6B8A',
      background: '#FFFFFF',
      text: '#1A1A1A'
    },
    features: ['Hero banners', 'Grid layouts', 'Trend badges']
  },
  {
    id: 'luxury',
    name: 'Luxury',
    description: 'Dark mode, premium feel like high-end brands',
    icon: '💎',
    preview: {
      primary: '#D4AF37',
      accent: '#F5E6D3',
      background: '#0A0A0A',
      text: '#FFFFFF'
    },
    features: ['Dark backgrounds', 'Gold accents', 'Elegant animations']
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    description: 'Colorful and playful, great for lifestyle brands',
    icon: '🌈',
    preview: {
      primary: '#8B5CF6',
      accent: '#EC4899',
      background: '#FAFAFA',
      text: '#374151'
    },
    features: ['Gradient buttons', 'Colorful badges', 'Fun interactions']
  },
  {
    id: 'classic',
    name: 'Classic E-commerce',
    description: 'Traditional layout with familiar UX patterns',
    icon: '🏪',
    preview: {
      primary: '#2563EB',
      accent: '#3B82F6',
      background: '#FFFFFF',
      text: '#111827'
    },
    features: ['Category navigation', 'Filter sidebars', 'Trust badges']
  }
];

// Business categories
const CATEGORIES = [
  { value: 'fashion', label: 'Fashion & Apparel', icon: '👕' },
  { value: 'electronics', label: 'Electronics', icon: '📱' },
  { value: 'beauty', label: 'Beauty & Cosmetics', icon: '💄' },
  { value: 'home', label: 'Home & Living', icon: '🏠' },
  { value: 'food', label: 'Food & Beverages', icon: '🍕' },
  { value: 'health', label: 'Health & Wellness', icon: '💊' },
  { value: 'sports', label: 'Sports & Fitness', icon: '⚽' },
  { value: 'jewelry', label: 'Jewelry & Accessories', icon: '💍' },
  { value: 'toys', label: 'Toys & Games', icon: '🎮' },
  { value: 'other', label: 'Other', icon: '📦' }
];

// Currencies
const CURRENCIES = [
  { value: 'INR', label: 'Indian Rupee (₹)', symbol: '₹' },
  { value: 'PKR', label: 'Pakistani Rupee (Rs)', symbol: 'Rs' },
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { value: 'AED', label: 'UAE Dirham (AED)', symbol: 'AED' },
  { value: 'SAR', label: 'Saudi Riyal (SAR)', symbol: 'SAR' }
];

const steps = [
  { id: 1, title: 'Business Info', icon: Building2, description: 'Tell us about your business' },
  { id: 2, title: 'Store Setup', icon: Store, description: 'Configure your store' },
  { id: 3, title: 'Choose Platforms', icon: Globe, description: 'Web store & Mobile app' },
  { id: 4, title: 'Select Theme', icon: Palette, description: 'Pick your store design' },
  { id: 5, title: 'Customize', icon: Sparkles, description: 'Brand colors & logo' },
  { id: 6, title: 'Integrations', icon: Zap, description: 'Connect services' },
  { id: 7, title: 'Launch', icon: Check, description: 'Go live!' },
];

const MerchantOnboarding = () => {
  const navigate = useNavigate();
  const { agent, login } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Business Info
  const [businessInfo, setBusinessInfo] = useState({
    business_name: '',
    business_category: '',
    business_email: '',
    business_phone: ''
  });
  
  // Step 2: Store Setup
  const [storeInfo, setStoreInfo] = useState({
    store_name: '',
    subdomain: '',
    currency: 'INR',
    custom_domain: ''
  });
  
  // Step 3: Platform Selection
  const [platforms, setPlatforms] = useState({
    web_store: true,
    mobile_app: true
  });
  
  // Step 4: Theme Selection
  const [selectedTheme, setSelectedTheme] = useState('fashion-forward');
  
  // Step 5: Customization
  const [customization, setCustomization] = useState({
    primary_color: '#FF3366',
    accent_color: '#FF6B8A',
    logo_url: '',
    dark_mode_enabled: true
  });
  
  // Step 6: Integrations
  const [integrations, setIntegrations] = useState({
    whatsapp: { enabled: false, phone_id: '', token: '', business_id: '' },
    facebook: { enabled: false, access_token: '', ad_account_id: '', page_id: '', catalog_id: '' },
    shopify: { enabled: false, domain: '', token: '' },
    razorpay: { enabled: false, key_id: '', key_secret: '' }
  });

  // Auto-generate subdomain from store name
  useEffect(() => {
    if (storeInfo.store_name) {
      const subdomain = storeInfo.store_name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
      setStoreInfo(prev => ({ ...prev, subdomain }));
    }
  }, [storeInfo.store_name]);

  // Update colors when theme changes
  useEffect(() => {
    const theme = THEMES.find(t => t.id === selectedTheme);
    if (theme) {
      setCustomization(prev => ({
        ...prev,
        primary_color: theme.preview.primary,
        accent_color: theme.preview.accent
      }));
    }
  }, [selectedTheme]);

  const handleNext = async () => {
    setLoading(true);
    
    try {
      // Validate current step
      if (currentStep === 1) {
        if (!businessInfo.business_name.trim()) {
          toast.error('Please enter your business name');
          setLoading(false);
          return;
        }
        if (!businessInfo.business_category) {
          toast.error('Please select a business category');
          setLoading(false);
          return;
        }
      }
      
      if (currentStep === 2) {
        if (!storeInfo.store_name.trim()) {
          toast.error('Please enter your store name');
          setLoading(false);
          return;
        }
        // Check subdomain availability (with error handling)
        try {
          const checkResponse = await fetch(`${API}/merchants/check-subdomain?subdomain=${storeInfo.subdomain}`);
          const checkData = await checkResponse.json();
          if (checkData.available === false) {
            toast.error(checkData.reason || 'This subdomain is already taken. Please choose another.');
            setLoading(false);
            return;
          }
        } catch (error) {
          console.warn('Subdomain check failed, continuing anyway:', error);
          // Continue anyway if check fails
        }
      }
      
      if (currentStep === 3) {
        if (!platforms.web_store && !platforms.mobile_app) {
          toast.error('Please select at least one platform');
          setLoading(false);
          return;
        }
      }
      
      // Final step - Create everything
      if (currentStep === 7) {
        await createMerchantStore();
        return;
      }
      
      setCurrentStep(prev => prev + 1);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const createMerchantStore = async () => {
    setLoading(true);
    
    try {
      const payload = {
        business: businessInfo,
        store: storeInfo,
        platforms,
        theme: selectedTheme,
        customization,
        integrations: Object.fromEntries(
          Object.entries(integrations).filter(([_, v]) => v.enabled)
        )
      };
      
      const response = await fetch(`${API}/merchants/create-store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('🎉 Your store has been created!');
        
        // Show what was created
        if (platforms.web_store) {
          toast.success(`Web store live at: ${storeInfo.subdomain}.wamerce.com`);
        }
        if (platforms.mobile_app) {
          toast.success('Mobile app configuration ready!');
        }
        
        navigate('/dashboard');
      } else {
        throw new Error(data.detail || 'Failed to create store');
      }
    } catch (error) {
      console.error('Error creating store:', error);
      toast.error(error.message || 'Failed to create store');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Tell us about your business</h2>
              <p className="text-gray-400">This helps us customize your store experience</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Business Name *</label>
                <Input
                  value={businessInfo.business_name}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, business_name: e.target.value }))}
                  placeholder="e.g., Fashion Hub"
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Business Category *</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setBusinessInfo(prev => ({ ...prev, business_category: cat.value }))}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        businessInfo.business_category === cat.value
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <p className="text-xs text-gray-300 mt-1">{cat.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Business Email</label>
                  <Input
                    type="email"
                    value={businessInfo.business_email}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, business_email: e.target.value }))}
                    placeholder="contact@yourbusiness.com"
                    className="bg-[#2a2a2a] border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                  <Input
                    value={businessInfo.business_phone}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, business_phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="bg-[#2a2a2a] border-gray-700 text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Set up your store</h2>
              <p className="text-gray-400">Configure your online store details</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Store Name *</label>
                <Input
                  value={storeInfo.store_name}
                  onChange={(e) => setStoreInfo(prev => ({ ...prev, store_name: e.target.value }))}
                  placeholder="e.g., My Awesome Store"
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Store URL</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={storeInfo.subdomain}
                    onChange={(e) => setStoreInfo(prev => ({ 
                      ...prev, 
                      subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') 
                    }))}
                    placeholder="mystore"
                    className="bg-[#2a2a2a] border-gray-700 text-white"
                  />
                  <span className="text-gray-400 whitespace-nowrap">.wamerce.com</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your store will be available at: https://{storeInfo.subdomain || 'mystore'}.wamerce.com
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Currency *</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {CURRENCIES.map(curr => (
                    <button
                      key={curr.value}
                      onClick={() => setStoreInfo(prev => ({ ...prev, currency: curr.value }))}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        storeInfo.currency === curr.value
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <span className="text-xl font-bold text-white">{curr.symbol}</span>
                      <p className="text-xs text-gray-400 mt-1">{curr.value}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Custom Domain (Optional)</label>
                <Input
                  value={storeInfo.custom_domain}
                  onChange={(e) => setStoreInfo(prev => ({ ...prev, custom_domain: e.target.value }))}
                  placeholder="www.yourdomain.com"
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can connect your own domain later
                </p>
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Choose your platforms</h2>
              <p className="text-gray-400">Select where you want to sell</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Web Store */}
              <button
                onClick={() => setPlatforms(prev => ({ ...prev, web_store: !prev.web_store }))}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  platforms.web_store
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Globe className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    platforms.web_store ? 'border-green-500 bg-green-500' : 'border-gray-600'
                  }`}>
                    {platforms.web_store && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Web Storefront</h3>
                <p className="text-sm text-gray-400 mb-4">
                  A beautiful, responsive website for your customers to browse and shop
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Custom domain support</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>SEO optimized</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Mobile responsive</span>
                  </div>
                </div>
              </button>
              
              {/* Mobile App */}
              <button
                onClick={() => setPlatforms(prev => ({ ...prev, mobile_app: !prev.mobile_app }))}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  platforms.mobile_app
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    platforms.mobile_app ? 'border-green-500 bg-green-500' : 'border-gray-600'
                  }`}>
                    {platforms.mobile_app && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Mobile App</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Native iOS & Android app with push notifications and offline support
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Push notifications</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Offline browsing</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>App Store & Play Store</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Select your theme</h2>
              <p className="text-gray-400">Choose a pre-configured design for your store</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedTheme === theme.id
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {/* Theme Preview */}
                  <div 
                    className="h-24 rounded-lg mb-3 relative overflow-hidden"
                    style={{ backgroundColor: theme.preview.background }}
                  >
                    <div 
                      className="absolute top-2 left-2 right-2 h-6 rounded"
                      style={{ backgroundColor: theme.preview.primary }}
                    />
                    <div className="absolute bottom-2 left-2 flex gap-2">
                      <div 
                        className="w-12 h-12 rounded"
                        style={{ backgroundColor: theme.preview.accent }}
                      />
                      <div 
                        className="w-12 h-12 rounded"
                        style={{ backgroundColor: theme.preview.accent, opacity: 0.7 }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{theme.icon}</span>
                    <h3 className="font-semibold text-white">{theme.name}</h3>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{theme.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {theme.features.map((feature, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400">
                        {feature}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
        
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Customize your brand</h2>
              <p className="text-gray-400">Upload your logo and pick your brand colors</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Store Logo</label>
                <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-gray-600 transition-colors cursor-pointer">
                  {customization.logo_url ? (
                    <img src={customization.logo_url} alt="Logo" className="w-24 h-24 mx-auto object-contain" />
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">Click to upload logo</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                    </>
                  )}
                </div>
              </div>
              
              {/* Color Pickers */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={customization.primary_color}
                      onChange={(e) => setCustomization(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-12 h-12 rounded-lg cursor-pointer border-0"
                    />
                    <Input
                      value={customization.primary_color}
                      onChange={(e) => setCustomization(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="bg-[#2a2a2a] border-gray-700 text-white uppercase"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={customization.accent_color}
                      onChange={(e) => setCustomization(prev => ({ ...prev, accent_color: e.target.value }))}
                      className="w-12 h-12 rounded-lg cursor-pointer border-0"
                    />
                    <Input
                      value={customization.accent_color}
                      onChange={(e) => setCustomization(prev => ({ ...prev, accent_color: e.target.value }))}
                      className="bg-[#2a2a2a] border-gray-700 text-white uppercase"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Dark Mode</label>
                  <button
                    onClick={() => setCustomization(prev => ({ ...prev, dark_mode_enabled: !prev.dark_mode_enabled }))}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                      customization.dark_mode_enabled
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-gray-700'
                    }`}
                  >
                    {customization.dark_mode_enabled ? (
                      <Moon className="w-5 h-5 text-purple-400" />
                    ) : (
                      <Sun className="w-5 h-5 text-yellow-400" />
                    )}
                    <span className="text-white">
                      {customization.dark_mode_enabled ? 'Dark mode enabled' : 'Light mode only'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Live Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Preview</label>
              <div className="bg-gray-800 rounded-xl p-4">
                <div 
                  className="rounded-lg p-4"
                  style={{ backgroundColor: customization.dark_mode_enabled ? '#0a0a0a' : '#ffffff' }}
                >
                  <div 
                    className="h-10 rounded-lg mb-3"
                    style={{ backgroundColor: customization.primary_color }}
                  />
                  <div className="flex gap-3">
                    <div 
                      className="w-20 h-20 rounded-lg"
                      style={{ backgroundColor: customization.accent_color }}
                    />
                    <div className="flex-1 space-y-2">
                      <div 
                        className="h-4 w-3/4 rounded"
                        style={{ backgroundColor: customization.dark_mode_enabled ? '#333' : '#e5e7eb' }}
                      />
                      <div 
                        className="h-4 w-1/2 rounded"
                        style={{ backgroundColor: customization.dark_mode_enabled ? '#333' : '#e5e7eb' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Connect your services</h2>
              <p className="text-gray-400">Set up integrations to power your store (all optional)</p>
            </div>
            
            <div className="space-y-4">
              {/* WhatsApp */}
              <div className={`p-4 rounded-xl border-2 transition-all ${
                integrations.whatsapp.enabled ? 'border-green-500 bg-green-500/5' : 'border-gray-700'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">WhatsApp Business</h3>
                      <p className="text-xs text-gray-400">Customer support & notifications</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIntegrations(prev => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, enabled: !prev.whatsapp.enabled }
                    }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      integrations.whatsapp.enabled
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {integrations.whatsapp.enabled ? 'Enabled' : 'Enable'}
                  </button>
                </div>
                
                {integrations.whatsapp.enabled && (
                  <div className="grid md:grid-cols-3 gap-3 pt-4 border-t border-gray-700">
                    <Input
                      placeholder="Phone Number ID"
                      value={integrations.whatsapp.phone_id}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, phone_id: e.target.value }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white text-sm"
                    />
                    <Input
                      placeholder="Access Token"
                      value={integrations.whatsapp.token}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, token: e.target.value }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white text-sm"
                    />
                    <Input
                      placeholder="Business ID"
                      value={integrations.whatsapp.business_id}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, business_id: e.target.value }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white text-sm"
                    />
                  </div>
                )}
              </div>
              
              {/* Facebook */}
              <div className={`p-4 rounded-xl border-2 transition-all ${
                integrations.facebook.enabled ? 'border-blue-500 bg-blue-500/5' : 'border-gray-700'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Facebook / Meta</h3>
                      <p className="text-xs text-gray-400">Ads, Catalogue & Marketing</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIntegrations(prev => ({
                      ...prev,
                      facebook: { ...prev.facebook, enabled: !prev.facebook.enabled }
                    }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      integrations.facebook.enabled
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {integrations.facebook.enabled ? 'Enabled' : 'Enable'}
                  </button>
                </div>
                
                {integrations.facebook.enabled && (
                  <div className="grid md:grid-cols-2 gap-3 pt-4 border-t border-gray-700">
                    <Input
                      placeholder="Access Token"
                      value={integrations.facebook.access_token}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        facebook: { ...prev.facebook, access_token: e.target.value }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white text-sm"
                    />
                    <Input
                      placeholder="Ad Account ID"
                      value={integrations.facebook.ad_account_id}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        facebook: { ...prev.facebook, ad_account_id: e.target.value }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white text-sm"
                    />
                    <Input
                      placeholder="Page ID"
                      value={integrations.facebook.page_id}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        facebook: { ...prev.facebook, page_id: e.target.value }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white text-sm"
                    />
                    <Input
                      placeholder="Catalogue ID"
                      value={integrations.facebook.catalog_id}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        facebook: { ...prev.facebook, catalog_id: e.target.value }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white text-sm"
                    />
                  </div>
                )}
              </div>
              
              {/* Shopify */}
              <div className={`p-4 rounded-xl border-2 transition-all ${
                integrations.shopify.enabled ? 'border-green-400 bg-green-400/5' : 'border-gray-700'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-400/20 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Shopify</h3>
                      <p className="text-xs text-gray-400">Sync products & orders</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIntegrations(prev => ({
                      ...prev,
                      shopify: { ...prev.shopify, enabled: !prev.shopify.enabled }
                    }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      integrations.shopify.enabled
                        ? 'bg-green-400 text-black'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {integrations.shopify.enabled ? 'Enabled' : 'Enable'}
                  </button>
                </div>
                
                {integrations.shopify.enabled && (
                  <div className="grid md:grid-cols-2 gap-3 pt-4 border-t border-gray-700">
                    <Input
                      placeholder="Store Domain (mystore.myshopify.com)"
                      value={integrations.shopify.domain}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        shopify: { ...prev.shopify, domain: e.target.value }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white text-sm"
                    />
                    <Input
                      placeholder="API Access Token"
                      value={integrations.shopify.token}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        shopify: { ...prev.shopify, token: e.target.value }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white text-sm"
                    />
                  </div>
                )}
              </div>
              
              {/* Razorpay */}
              <div className={`p-4 rounded-xl border-2 transition-all ${
                integrations.razorpay.enabled ? 'border-blue-400 bg-blue-400/5' : 'border-gray-700'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-400/20 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Razorpay</h3>
                      <p className="text-xs text-gray-400">Accept payments</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIntegrations(prev => ({
                      ...prev,
                      razorpay: { ...prev.razorpay, enabled: !prev.razorpay.enabled }
                    }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      integrations.razorpay.enabled
                        ? 'bg-blue-400 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {integrations.razorpay.enabled ? 'Enabled' : 'Enable'}
                  </button>
                </div>
                
                {integrations.razorpay.enabled && (
                  <div className="grid md:grid-cols-2 gap-3 pt-4 border-t border-gray-700">
                    <Input
                      placeholder="Key ID"
                      value={integrations.razorpay.key_id}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        razorpay: { ...prev.razorpay, key_id: e.target.value }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white text-sm"
                    />
                    <Input
                      placeholder="Key Secret"
                      type="password"
                      value={integrations.razorpay.key_secret}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        razorpay: { ...prev.razorpay, key_secret: e.target.value }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-sm text-gray-500 text-center">
              You can configure these integrations later from your dashboard
            </p>
          </div>
        );
        
      case 7:
        return (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <Zap className="w-10 h-10 text-green-500" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Ready to launch!</h2>
              <p className="text-gray-400">Review your store configuration</p>
            </div>
            
            <div className="bg-[#2a2a2a] rounded-xl p-6 text-left space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                <span className="text-gray-400">Business Name</span>
                <span className="text-white font-medium">{businessInfo.business_name}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                <span className="text-gray-400">Store URL</span>
                <span className="text-green-400">{storeInfo.subdomain}.wamerce.com</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                <span className="text-gray-400">Currency</span>
                <span className="text-white">{storeInfo.currency}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                <span className="text-gray-400">Platforms</span>
                <div className="flex gap-2">
                  {platforms.web_store && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">Web</span>
                  )}
                  {platforms.mobile_app && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">Mobile</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                <span className="text-gray-400">Theme</span>
                <span className="text-white">{THEMES.find(t => t.id === selectedTheme)?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Integrations</span>
                <div className="flex gap-2">
                  {integrations.whatsapp.enabled && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">WhatsApp</span>
                  )}
                  {integrations.facebook.enabled && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">Facebook</span>
                  )}
                  {integrations.shopify.enabled && (
                    <span className="px-2 py-1 bg-green-400/20 text-green-400 rounded text-sm">Shopify</span>
                  )}
                  {integrations.razorpay.enabled && (
                    <span className="px-2 py-1 bg-blue-400/20 text-blue-400 rounded text-sm">Razorpay</span>
                  )}
                  {!integrations.whatsapp.enabled && !integrations.facebook.enabled && 
                   !integrations.shopify.enabled && !integrations.razorpay.enabled && (
                    <span className="text-gray-500">None configured</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-3 py-4">
              <div 
                className="w-6 h-6 rounded"
                style={{ backgroundColor: customization.primary_color }}
              />
              <div 
                className="w-6 h-6 rounded"
                style={{ backgroundColor: customization.accent_color }}
              />
              <span className="text-gray-400 text-sm">Your brand colors</span>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="w-8 h-8 text-green-500" />
            <span className="text-xl font-bold">Wamerce</span>
          </div>
          <div className="text-sm text-gray-400">Step {currentStep} of {steps.length}</div>
        </div>
      </div>
      
      {/* Progress Steps */}
      <div className="border-b border-gray-800 px-6 py-4 overflow-x-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 min-w-max">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-green-500/20 text-green-500' 
                      : isCompleted 
                        ? 'text-green-500' 
                        : 'text-gray-500'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive 
                        ? 'bg-green-500 text-white' 
                        : isCompleted 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'bg-gray-800'
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                    </div>
                    <span className="hidden md:block text-sm font-medium">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <ChevronRight className={`w-4 h-4 mx-1 ${
                      isCompleted ? 'text-green-500' : 'text-gray-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {renderStepContent()}
      </div>
      
      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
            className="text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-white px-8"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : currentStep === 7 ? (
              <>
                Launch Store
                <Zap className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MerchantOnboarding;
