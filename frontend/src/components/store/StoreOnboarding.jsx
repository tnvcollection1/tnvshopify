import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, Bell, Sparkles } from 'lucide-react';

// Country data with flags
const COUNTRIES = [
  { code: 'SA', name: 'SAUDI ARABIA', flag: '🇸🇦', currency: 'SAR' },
  { code: 'AE', name: 'UNITED ARAB EMIRATES', flag: '🇦🇪', currency: 'AED' },
  { code: 'KW', name: 'KUWAIT', flag: '🇰🇼', currency: 'KWD' },
  { code: 'QA', name: 'QATAR', flag: '🇶🇦', currency: 'QAR' },
  { code: 'BH', name: 'BAHRAIN', flag: '🇧🇭', currency: 'BHD' },
  { code: 'OM', name: 'OMAN', flag: '🇴🇲', currency: 'OMR' },
  { code: 'PK', name: 'PAKISTAN', flag: '🇵🇰', currency: 'PKR' },
  { code: 'IN', name: 'INDIA', flag: '🇮🇳', currency: 'INR' },
];

// Onboarding slides configuration
const SLIDES = [
  {
    id: 'location',
    title: 'Want Faster Deliveries?',
    description: 'Allow TNV to access your location for quicker deliveries and accurate timings.',
    bgImage: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&h=1200&fit=crop',
    bgColor: '#f5f5f5',
    icon: MapPin,
  },
  {
    id: 'notifications',
    title: 'Curious about the latest drops and deals?',
    description: 'Turn on notifications to get instant alerts about sales, fresh drops, and personalized offers.',
    bgImage: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&h=1200&fit=crop',
    bgColor: '#e53935',
    icon: Bell,
  },
  {
    id: 'personalization',
    title: 'Want a Shopping Experience Built for You?',
    description: 'Allow tracking to get style recommendations that match your vibe. Let TNV personalize your journey by tracking your activity to offer recommendations that match your style.',
    bgImage: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=1200&fit=crop',
    bgColor: '#c6ff00',
    icon: Sparkles,
  },
];

const StoreOnboarding = ({ storeName = 'tnvcollection', onComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0: language/country, 1-3: slides, 4: category
  const [language, setLanguage] = useState('en');
  const [selectedCountry, setSelectedCountry] = useState('AE');
  
  // Check if onboarding was already completed
  useEffect(() => {
    const completed = localStorage.getItem(`${storeName}_onboarding_completed`);
    if (completed) {
      onComplete?.();
    }
  }, [storeName, onComplete]);

  const handleCountryConfirm = () => {
    localStorage.setItem(`${storeName}_language`, language);
    localStorage.setItem(`${storeName}_country`, selectedCountry);
    setStep(1);
  };

  const handleSlideNext = () => {
    if (step < SLIDES.length) {
      setStep(step + 1);
    } else {
      setStep(4); // Go to category selection
    }
  };

  const handleCategorySelect = (category) => {
    localStorage.setItem(`${storeName}_preferred_category`, category);
    localStorage.setItem(`${storeName}_onboarding_completed`, 'true');
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(`${storeName}_onboarding_completed`, 'true');
    onComplete?.();
  };

  // Step 0: Language & Country Selection
  if (step === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col" data-testid="store-onboarding">
        {/* Logo Header */}
        <div className="py-8 text-center">
          <h1 className="text-white text-3xl font-black italic">
            <span className="font-arabic">تي إن في</span>
            <br />
            TNV
          </h1>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-t-3xl px-6 py-8">
          {/* Language Selection */}
          <div className="mb-8">
            <p className="text-sm font-bold text-gray-500 mb-1">LANGUAGE</p>
            <p className="text-sm text-gray-400 mb-4">Select your language</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLanguage('en')}
                className={`py-4 px-6 text-center font-bold text-sm border-2 transition-all ${
                  language === 'en' 
                    ? 'border-green-500 bg-green-50 text-black' 
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                ENGLISH
              </button>
              <button
                onClick={() => setLanguage('ar')}
                className={`py-4 px-6 text-center font-bold text-sm border-2 transition-all ${
                  language === 'ar' 
                    ? 'border-green-500 bg-green-50 text-black' 
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                عربي
              </button>
            </div>
          </div>

          {/* Country Selection */}
          <div className="mb-8">
            <p className="text-sm font-bold text-gray-500 mb-1">COUNTRY</p>
            <p className="text-sm text-gray-400 mb-4">Select your country</p>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  onClick={() => setSelectedCountry(country.code)}
                  className={`w-full py-4 px-4 text-left flex items-center gap-4 border-2 transition-all ${
                    selectedCountry === country.code 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <span className="text-2xl">{country.flag}</span>
                  <span className="font-medium text-sm">{country.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleCountryConfirm}
            className="w-full bg-black text-white py-4 font-bold text-sm hover:bg-gray-800 transition-colors"
          >
            CONFIRM
          </button>
          
          {/* Skip option */}
          <button
            onClick={handleSkip}
            className="w-full mt-3 text-gray-400 text-sm hover:text-gray-600 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // Steps 1-3: Permission Slides
  if (step >= 1 && step <= 3) {
    const slideIndex = step - 1;
    const slide = SLIDES[slideIndex];
    const Icon = slide.icon;
    
    return (
      <div 
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: slide.bgColor }}
        data-testid={`onboarding-slide-${slide.id}`}
      >
        {/* Image Section */}
        <div className="flex-1 relative overflow-hidden">
          <img 
            src={slide.bgImage}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div 
            className="absolute inset-0"
            style={{ 
              background: `linear-gradient(to bottom, transparent 50%, ${slide.bgColor} 100%)` 
            }}
          />
        </div>

        {/* Content Section */}
        <div className="bg-black text-white px-6 py-8 rounded-t-3xl -mt-8 relative z-10">
          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-6">
            {SLIDES.map((_, idx) => (
              <div 
                key={idx}
                className={`h-1 rounded-full transition-all ${
                  idx === slideIndex ? 'w-8 bg-white' : 'w-2 bg-gray-600'
                }`}
              />
            ))}
          </div>

          <h2 className="text-2xl font-bold mb-3 leading-tight">
            {slide.title}
          </h2>
          <p className="text-gray-300 text-sm mb-8 leading-relaxed">
            {slide.description}
          </p>

          <button
            onClick={handleSlideNext}
            className="w-full bg-white text-black py-4 font-bold text-sm hover:bg-gray-100 transition-colors border-2 border-white"
          >
            CONTINUE
          </button>
          
          <button
            onClick={handleSkip}
            className="w-full mt-3 text-gray-400 text-sm hover:text-gray-300 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  // Step 4: Category Selection
  return (
    <div className="min-h-screen bg-white flex flex-col" data-testid="onboarding-category">
      {/* Logo Header */}
      <div className="py-6 text-center border-b">
        <h1 className="text-2xl font-black italic">
          <span className="font-arabic text-lg">تي إن في</span>
          <br />
          TNV
        </h1>
      </div>

      {/* Category Cards */}
      <div className="flex-1 p-4 space-y-4">
        {/* Women */}
        <button
          onClick={() => handleCategorySelect('women')}
          className="w-full relative overflow-hidden rounded-lg h-40 group"
        >
          <img 
            src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&h=400&fit=crop"
            alt="Women"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex items-center">
            <h3 className="text-white text-3xl font-black ml-6">WOMEN</h3>
          </div>
        </button>

        {/* Men */}
        <button
          onClick={() => handleCategorySelect('men')}
          className="w-full relative overflow-hidden rounded-lg h-40 group"
        >
          <img 
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop"
            alt="Men"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex items-center">
            <h3 className="text-white text-3xl font-black ml-6">MEN</h3>
          </div>
        </button>

        {/* Kids */}
        <button
          onClick={() => handleCategorySelect('kids')}
          className="w-full relative overflow-hidden rounded-lg h-40 group"
        >
          <img 
            src="https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&h=400&fit=crop"
            alt="Kids"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex items-center">
            <h3 className="text-white text-3xl font-black ml-6">KIDS</h3>
          </div>
        </button>
      </div>

      {/* Browse All Option */}
      <div className="p-4 border-t">
        <button
          onClick={() => handleCategorySelect('all')}
          className="w-full bg-black text-white py-4 font-bold text-sm hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
        >
          BROWSE ALL
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default StoreOnboarding;
