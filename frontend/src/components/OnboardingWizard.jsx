import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Zap, 
  Building2, 
  Store, 
  MessageSquare, 
  BarChart3,
  CreditCard,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const steps = [
  { id: 1, title: 'Business Info', icon: Building2, description: 'Tell us about your business' },
  { id: 2, title: 'Connect Shopify', icon: Store, description: 'Link your Shopify store' },
  { id: 3, title: 'WhatsApp', icon: MessageSquare, description: 'Set up WhatsApp Business (Optional)' },
  { id: 4, title: 'Facebook Ads', icon: BarChart3, description: 'Connect Meta Ads (Optional)' },
  { id: 5, title: 'Choose Plan', icon: CreditCard, description: 'Select your subscription' },
];

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const { agent, login } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [plans, setPlans] = useState([]);
  
  // Form states
  const [businessInfo, setBusinessInfo] = useState({
    business_name: '',
    business_category: 'retail',
    business_phone: '',
    business_address: ''
  });
  
  const [shopifyInfo, setShopifyInfo] = useState({
    shopify_domain: '',
    shopify_token: ''
  });
  
  const [whatsappInfo, setWhatsappInfo] = useState({
    whatsapp_phone_id: '',
    whatsapp_token: '',
    whatsapp_business_id: ''
  });
  
  const [facebookInfo, setFacebookInfo] = useState({
    facebook_access_token: '',
    facebook_ad_account_id: '',
    facebook_page_id: ''
  });
  
  const [selectedPlan, setSelectedPlan] = useState('growth');

  useEffect(() => {
    fetchPlans();
    if (agent?.tenant_id) {
      fetchTenant(agent.tenant_id);
    }
  }, [agent]);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API}/tenants/plans/all`);
      const data = await response.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchTenant = async (tenantId) => {
    try {
      const response = await fetch(`${API}/tenants/${tenantId}`);
      const data = await response.json();
      if (data.success) {
        setTenant(data.tenant);
        setCurrentStep(data.tenant.onboarding_step || 1);
        setBusinessInfo({
          business_name: data.tenant.business_name || '',
          business_category: data.tenant.business_category || 'retail',
          business_phone: data.tenant.business_phone || '',
          business_address: data.tenant.business_address || ''
        });
      }
    } catch (error) {
      console.error('Error fetching tenant:', error);
    }
  };

  const updateOnboarding = async (step, completed = false) => {
    if (!agent?.tenant_id) return;
    
    try {
      const params = new URLSearchParams({
        step: step.toString(),
        ...(completed && { completed: 'true' }),
        ...businessInfo
      });
      
      await fetch(`${API}/tenants/${agent.tenant_id}/onboarding?${params}`, {
        method: 'PUT'
      });
    } catch (error) {
      console.error('Error updating onboarding:', error);
    }
  };

  const saveAPIKeys = async (keys) => {
    if (!agent?.tenant_id) return;
    
    try {
      const params = new URLSearchParams();
      Object.entries(keys).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`${API}/tenants/${agent.tenant_id}/api-keys?${params}`, {
        method: 'PUT'
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.detail || 'Failed to save API keys');
      }
      
      return true;
    } catch (error) {
      console.error('Error saving API keys:', error);
      toast.error('Failed to save settings');
      return false;
    }
  };

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
        await updateOnboarding(2);
      }
      
      if (currentStep === 2 && (shopifyInfo.shopify_domain || shopifyInfo.shopify_token)) {
        await saveAPIKeys(shopifyInfo);
        await updateOnboarding(3);
      } else if (currentStep === 2) {
        await updateOnboarding(3);
      }
      
      if (currentStep === 3 && (whatsappInfo.whatsapp_phone_id || whatsappInfo.whatsapp_token)) {
        await saveAPIKeys(whatsappInfo);
        await updateOnboarding(4);
      } else if (currentStep === 3) {
        await updateOnboarding(4);
      }
      
      if (currentStep === 4 && (facebookInfo.facebook_access_token || facebookInfo.facebook_ad_account_id)) {
        await saveAPIKeys(facebookInfo);
        await updateOnboarding(5);
      } else if (currentStep === 4) {
        await updateOnboarding(5);
      }
      
      if (currentStep === 5) {
        // Complete onboarding
        await updateOnboarding(5, true);
        
        // Update subscription (mock)
        await fetch(`${API}/tenants/${agent.tenant_id}/subscription?plan=${selectedPlan}&status=active`, {
          method: 'PUT'
        });
        
        toast.success('Onboarding complete! Welcome to OmniSales.');
        navigate('/dashboard');
        return;
      }
      
      setCurrentStep(prev => prev + 1);
    } catch (error) {
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

  const handleSkip = () => {
    if (currentStep >= 2 && currentStep <= 4) {
      setCurrentStep(prev => prev + 1);
      updateOnboarding(currentStep + 1);
    }
  };

  const categories = [
    { id: 'retail', name: 'Retail / E-commerce' },
    { id: 'fashion', name: 'Fashion & Apparel' },
    { id: 'electronics', name: 'Electronics' },
    { id: 'food', name: 'Food & Beverages' },
    { id: 'beauty', name: 'Beauty & Personal Care' },
    { id: 'home', name: 'Home & Furniture' },
    { id: 'other', name: 'Other' }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">OmniSales</span>
          </div>
          <div className="text-sm text-gray-400">Step {currentStep} of {steps.length}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-2 ${isActive ? 'text-white' : isCompleted ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isActive ? 'border-emerald-500 bg-emerald-500/20' : 
                      isCompleted ? 'border-emerald-500 bg-emerald-500' : 
                      'border-white/20 bg-white/5'
                    }`}>
                      {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                    </div>
                    <span className="hidden md:block text-sm font-medium">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 lg:w-24 h-0.5 mx-2 ${isCompleted ? 'bg-emerald-500' : 'bg-white/10'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Step 1: Business Info */}
        {currentStep === 1 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Tell us about your business</h1>
              <p className="text-gray-400">This helps us customize OmniSales for your needs</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Business Name *</label>
                <Input
                  value={businessInfo.business_name}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, business_name: e.target.value }))}
                  placeholder="Enter your business name"
                  className="bg-white/5 border-white/10 text-white h-12"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Business Category</label>
                <select
                  value={businessInfo.business_category}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, business_category: e.target.value }))}
                  className="w-full h-12 px-4 rounded-lg bg-white/5 border border-white/10 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id} className="bg-[#1a1a1a]">{cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <Input
                  value={businessInfo.business_phone}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, business_phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="bg-white/5 border-white/10 text-white h-12"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Business Address</label>
                <Input
                  value={businessInfo.business_address}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, business_address: e.target.value }))}
                  placeholder="City, State"
                  className="bg-white/5 border-white/10 text-white h-12"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Shopify */}
        {currentStep === 2 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Connect your Shopify store</h1>
              <p className="text-gray-400">Sync orders, customers, and inventory automatically</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#95BF47]/20 flex items-center justify-center flex-shrink-0">
                  <Store className="w-6 h-6 text-[#95BF47]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Shopify Admin API</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Enter your Shopify store domain and Admin API access token.
                    <a href="https://help.shopify.com/en/manual/apps/app-types/custom-apps" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline ml-1">
                      How to get API credentials <ExternalLink className="inline w-3 h-3" />
                    </a>
                  </p>
                </div>
              </div>
              
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Store Domain</label>
                  <Input
                    value={shopifyInfo.shopify_domain}
                    onChange={(e) => setShopifyInfo(prev => ({ ...prev, shopify_domain: e.target.value }))}
                    placeholder="your-store.myshopify.com"
                    className="bg-white/5 border-white/10 text-white h-12"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Admin API Access Token</label>
                  <Input
                    type="password"
                    value={shopifyInfo.shopify_token}
                    onChange={(e) => setShopifyInfo(prev => ({ ...prev, shopify_token: e.target.value }))}
                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
                    className="bg-white/5 border-white/10 text-white h-12"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: WhatsApp */}
        {currentStep === 3 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Connect WhatsApp Business</h1>
              <p className="text-gray-400">Send order updates and marketing campaigns via WhatsApp</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#25D366]/20 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-[#25D366]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Meta WhatsApp Business API</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Connect your WhatsApp Business account for automated messaging.
                    <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline ml-1">
                      Setup guide <ExternalLink className="inline w-3 h-3" />
                    </a>
                  </p>
                </div>
              </div>
              
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number ID</label>
                  <Input
                    value={whatsappInfo.whatsapp_phone_id}
                    onChange={(e) => setWhatsappInfo(prev => ({ ...prev, whatsapp_phone_id: e.target.value }))}
                    placeholder="Enter Phone Number ID from Meta"
                    className="bg-white/5 border-white/10 text-white h-12"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Access Token</label>
                  <Input
                    type="password"
                    value={whatsappInfo.whatsapp_token}
                    onChange={(e) => setWhatsappInfo(prev => ({ ...prev, whatsapp_token: e.target.value }))}
                    placeholder="WhatsApp Cloud API access token"
                    className="bg-white/5 border-white/10 text-white h-12"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Business Account ID</label>
                  <Input
                    value={whatsappInfo.whatsapp_business_id}
                    onChange={(e) => setWhatsappInfo(prev => ({ ...prev, whatsapp_business_id: e.target.value }))}
                    placeholder="WhatsApp Business Account ID"
                    className="bg-white/5 border-white/10 text-white h-12"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Facebook Ads */}
        {currentStep === 4 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Connect Facebook Ads</h1>
              <p className="text-gray-400">Analyze ad performance and compare campaigns</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1877F2]/20 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-6 h-6 text-[#1877F2]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Meta Marketing API</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Connect your Facebook Ads account for real-time analytics.
                    <a href="https://developers.facebook.com/docs/marketing-apis/get-started" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline ml-1">
                      Get credentials <ExternalLink className="inline w-3 h-3" />
                    </a>
                  </p>
                </div>
              </div>
              
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Access Token</label>
                  <Input
                    type="password"
                    value={facebookInfo.facebook_access_token}
                    onChange={(e) => setFacebookInfo(prev => ({ ...prev, facebook_access_token: e.target.value }))}
                    placeholder="Facebook Graph API access token"
                    className="bg-white/5 border-white/10 text-white h-12"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Ad Account ID</label>
                  <Input
                    value={facebookInfo.facebook_ad_account_id}
                    onChange={(e) => setFacebookInfo(prev => ({ ...prev, facebook_ad_account_id: e.target.value }))}
                    placeholder="act_XXXXXXXXXX"
                    className="bg-white/5 border-white/10 text-white h-12"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Page ID (Optional)</label>
                  <Input
                    value={facebookInfo.facebook_page_id}
                    onChange={(e) => setFacebookInfo(prev => ({ ...prev, facebook_page_id: e.target.value }))}
                    placeholder="Facebook Page ID"
                    className="bg-white/5 border-white/10 text-white h-12"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Choose Plan */}
        {currentStep === 5 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Choose your plan</h1>
              <p className="text-gray-400">Start with a 14-day free trial on any plan</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {plans.filter(p => p.id !== 'free').map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative p-6 rounded-xl border cursor-pointer transition-all ${
                    selectedPlan === plan.id 
                      ? 'bg-emerald-500/10 border-emerald-500' 
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-emerald-500 text-black text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === plan.id ? 'border-emerald-500 bg-emerald-500' : 'border-white/30'
                    }`}>
                      {selectedPlan === plan.id && <Check className="w-3 h-3 text-black" />}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <span className="text-3xl font-bold">₹{plan.price.toLocaleString()}</span>
                    <span className="text-gray-400">/{plan.billing_period}</span>
                  </div>
                  
                  <ul className="space-y-2">
                    {plan.features.slice(0, 5).map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-emerald-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            
            <div className="text-center text-sm text-gray-500">
              You can change your plan anytime. No credit card required for trial.
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-12">
          <div>
            {currentStep > 1 && (
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-gray-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {currentStep >= 2 && currentStep <= 4 && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-gray-400 hover:text-white"
              >
                Skip for now
              </Button>
            )}
            
            <Button
              onClick={handleNext}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-8"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : currentStep === 5 ? (
                'Complete Setup'
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
    </div>
  );
};

export default OnboardingWizard;
