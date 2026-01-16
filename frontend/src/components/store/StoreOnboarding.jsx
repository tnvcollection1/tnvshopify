import React, { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, Bell, Sparkles, Globe } from 'lucide-react';

// Country data with flags and language defaults
const COUNTRIES = [
  { code: 'SA', name: 'SAUDI ARABIA', nameAr: 'المملكة العربية السعودية', flag: '🇸🇦', currency: 'SAR', defaultLang: 'ar', isRTL: true },
  { code: 'AE', name: 'UNITED ARAB EMIRATES', nameAr: 'الإمارات العربية المتحدة', flag: '🇦🇪', currency: 'AED', defaultLang: 'ar', isRTL: true },
  { code: 'KW', name: 'KUWAIT', nameAr: 'الكويت', flag: '🇰🇼', currency: 'KWD', defaultLang: 'ar', isRTL: true },
  { code: 'QA', name: 'QATAR', nameAr: 'قطر', flag: '🇶🇦', currency: 'QAR', defaultLang: 'ar', isRTL: true },
  { code: 'BH', name: 'BAHRAIN', nameAr: 'البحرين', flag: '🇧🇭', currency: 'BHD', defaultLang: 'ar', isRTL: true },
  { code: 'OM', name: 'OMAN', nameAr: 'عمان', flag: '🇴🇲', currency: 'OMR', defaultLang: 'ar', isRTL: true },
  { code: 'PK', name: 'PAKISTAN', nameLocal: 'پاکستان', flag: '🇵🇰', currency: 'PKR', defaultLang: 'ur', isRTL: true },
  { code: 'IN', name: 'INDIA', nameLocal: 'भारत', flag: '🇮🇳', currency: 'INR', defaultLang: 'hi', isRTL: false },
];

// Language options for the selector
const LANGUAGES = [
  { code: 'en', name: 'ENGLISH', nameNative: 'English', isRTL: false },
  { code: 'ar', name: 'عربي', nameNative: 'العربية', isRTL: true },
  { code: 'hi', name: 'हिन्दी', nameNative: 'हिन्दी', isRTL: false },
  { code: 'ur', name: 'اردو', nameNative: 'اردو', isRTL: true },
];

// Translations
const TRANSLATIONS = {
  en: {
    language: 'LANGUAGE',
    selectLanguage: 'Select your language',
    country: 'COUNTRY',
    selectCountry: 'Select your country',
    confirm: 'CONFIRM',
    skip: 'Skip for now',
    continue: 'CONTINUE',
    browseAll: 'BROWSE ALL',
    // Slides
    slide1Title: 'Want Faster Deliveries?',
    slide1Desc: 'Allow TNV to access your location for quicker deliveries and accurate timings.',
    slide2Title: 'Curious about the latest drops and deals?',
    slide2Desc: 'Turn on notifications to get instant alerts about sales, fresh drops, and personalized offers.',
    slide3Title: 'Want a Shopping Experience Built for You?',
    slide3Desc: 'Allow tracking to get style recommendations that match your vibe.',
    // Categories
    women: 'WOMEN',
    men: 'MEN',
    kids: 'KIDS',
  },
  ar: {
    language: 'اللغة',
    selectLanguage: 'اختر لغتك',
    country: 'البلد',
    selectCountry: 'اختر بلدك',
    confirm: 'تأكيد',
    skip: 'تخطي الآن',
    continue: 'متابعة',
    browseAll: 'تصفح الكل',
    // Slides
    slide1Title: 'هل تريد توصيل أسرع؟',
    slide1Desc: 'اسمح لـ TNV بالوصول إلى موقعك للحصول على توصيل أسرع ومواعيد دقيقة.',
    slide2Title: 'هل أنت فضولي بشأن أحدث المنتجات والعروض؟',
    slide2Desc: 'قم بتشغيل الإشعارات للحصول على تنبيهات فورية حول التخفيضات والمنتجات الجديدة.',
    slide3Title: 'هل تريد تجربة تسوق مصممة لك؟',
    slide3Desc: 'اسمح بالتتبع للحصول على توصيات أزياء تناسب ذوقك.',
    // Categories
    women: 'نساء',
    men: 'رجال',
    kids: 'أطفال',
  },
  hi: {
    language: 'भाषा',
    selectLanguage: 'अपनी भाषा चुनें',
    country: 'देश',
    selectCountry: 'अपना देश चुनें',
    confirm: 'पुष्टि करें',
    skip: 'अभी छोड़ें',
    continue: 'जारी रखें',
    browseAll: 'सभी देखें',
    // Slides
    slide1Title: 'तेज़ डिलीवरी चाहिए?',
    slide1Desc: 'तेज़ डिलीवरी और सही समय के लिए TNV को अपना लोकेशन एक्सेस करने दें।',
    slide2Title: 'नए प्रोडक्ट्स और डील्स के बारे में जानना चाहते हैं?',
    slide2Desc: 'सेल, नए प्रोडक्ट्स और पर्सनल ऑफर्स की तुरंत जानकारी के लिए नोटिफिकेशन चालू करें।',
    slide3Title: 'आपके लिए बनाया गया शॉपिंग अनुभव चाहिए?',
    slide3Desc: 'अपनी स्टाइल के हिसाब से सुझाव पाने के लिए ट्रैकिंग की अनुमति दें।',
    // Categories
    women: 'महिलाएं',
    men: 'पुरुष',
    kids: 'बच्चे',
  },
  ur: {
    language: 'زبان',
    selectLanguage: 'اپنی زبان منتخب کریں',
    country: 'ملک',
    selectCountry: 'اپنا ملک منتخب کریں',
    confirm: 'تصدیق کریں',
    skip: 'ابھی چھوڑیں',
    continue: 'جاری رکھیں',
    browseAll: 'سب دیکھیں',
    // Slides
    slide1Title: 'تیز ڈیلیوری چاہتے ہیں؟',
    slide1Desc: 'تیز ڈیلیوری اور درست وقت کے لیے TNV کو اپنا مقام رسائی دیں۔',
    slide2Title: 'نئی پروڈکٹس اور ڈیلز جاننا چاہتے ہیں؟',
    slide2Desc: 'سیل، نئی پروڈکٹس اور خاص آفرز کی فوری اطلاع کے لیے نوٹیفیکیشن آن کریں۔',
    slide3Title: 'آپ کے لیے بنایا گیا شاپنگ تجربہ چاہتے ہیں؟',
    slide3Desc: 'اپنے انداز کے مطابق سفارشات حاصل کرنے کے لیے ٹریکنگ کی اجازت دیں۔',
    // Categories
    women: 'خواتین',
    men: 'مرد',
    kids: 'بچے',
  },
};

// Onboarding slides configuration
const getSlides = (lang) => [
  {
    id: 'location',
    title: TRANSLATIONS[lang].slide1Title,
    description: TRANSLATIONS[lang].slide1Desc,
    bgImage: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&h=1200&fit=crop',
    bgColor: '#f5f5f5',
    icon: MapPin,
  },
  {
    id: 'notifications',
    title: TRANSLATIONS[lang].slide2Title,
    description: TRANSLATIONS[lang].slide2Desc,
    bgImage: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&h=1200&fit=crop',
    bgColor: '#e53935',
    icon: Bell,
  },
  {
    id: 'personalization',
    title: TRANSLATIONS[lang].slide3Title,
    description: TRANSLATIONS[lang].slide3Desc,
    bgImage: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=1200&fit=crop',
    bgColor: '#c6ff00',
    icon: Sparkles,
  },
];

// Locale Context for sharing language/RTL across app
export const LocaleContext = createContext({
  language: 'en',
  isRTL: false,
  country: 'AE',
  currency: 'AED',
  t: (key) => key,
  setLocale: () => {},
});

export const useLocale = () => useContext(LocaleContext);

// Locale Provider Component
export const LocaleProvider = ({ children, storeName = 'tnvcollection' }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem(`${storeName}_language`) || 'en';
  });
  const [country, setCountry] = useState(() => {
    return localStorage.getItem(`${storeName}_country`) || 'AE';
  });

  const countryData = COUNTRIES.find(c => c.code === country) || COUNTRIES[1];
  const langData = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
  const isRTL = langData.isRTL;

  // Apply RTL to document
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [isRTL, language]);

  const t = (key) => TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;

  const setLocale = (lang, countryCode) => {
    setLanguage(lang);
    setCountry(countryCode);
    localStorage.setItem(`${storeName}_language`, lang);
    localStorage.setItem(`${storeName}_country`, countryCode);
  };

  return (
    <LocaleContext.Provider value={{
      language,
      isRTL,
      country,
      currency: countryData.currency,
      t,
      setLocale,
      countryData,
    }}>
      {children}
    </LocaleContext.Provider>
  );
};

const StoreOnboarding = ({ storeName = 'tnvcollection', onComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(() => {
    const savedStep = localStorage.getItem(`${storeName}_onboarding_step`);
    return savedStep ? parseInt(savedStep, 10) : 0;
  });
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem(`${storeName}_language`) || 'en';
  });
  const [selectedCountry, setSelectedCountry] = useState(() => {
    return localStorage.getItem(`${storeName}_country`) || 'AE';
  });
  
  const t = (key) => TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
  const isRTL = language === 'ar';
  const SLIDES = getSlides(language);
  
  // Auto-select language based on country
  const handleCountrySelect = (countryCode) => {
    setSelectedCountry(countryCode);
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      // Auto-switch to country's default language
      setLanguage(country.defaultLang);
    }
  };
  
  // Save step to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`${storeName}_onboarding_step`, step.toString());
  }, [step, storeName]);
  
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
    // Apply RTL if Arabic
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    setStep(1);
  };

  const handleSlideNext = () => {
    if (step < SLIDES.length) {
      setStep(step + 1);
    } else {
      setStep(4);
    }
  };

  const handleCategorySelect = (category) => {
    localStorage.setItem(`${storeName}_preferred_category`, category);
    localStorage.setItem(`${storeName}_onboarding_completed`, 'true');
    localStorage.removeItem(`${storeName}_onboarding_step`);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(`${storeName}_onboarding_completed`, 'true');
    localStorage.removeItem(`${storeName}_onboarding_step`);
    onComplete?.();
  };

  // Step 0: Language & Country Selection
  if (step === 0) {
    return (
      <div className={`min-h-screen bg-black flex flex-col ${isRTL ? 'rtl' : 'ltr'}`} data-testid="store-onboarding" dir={isRTL ? 'rtl' : 'ltr'}>
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
            <p className="text-sm font-bold text-gray-500 mb-1">{t('language')}</p>
            <p className="text-sm text-gray-400 mb-4">{t('selectLanguage')}</p>
            
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
            <p className="text-sm font-bold text-gray-500 mb-1">{t('country')}</p>
            <p className="text-sm text-gray-400 mb-4">{t('selectCountry')}</p>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  onClick={() => handleCountrySelect(country.code)}
                  className={`w-full py-4 px-4 text-left flex items-center gap-4 border-2 transition-all ${
                    selectedCountry === country.code 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <span className="text-2xl">{country.flag}</span>
                  <span className="font-medium text-sm">
                    {language === 'ar' ? country.nameAr : country.name}
                  </span>
                  {/* Show recommended language badge */}
                  {country.defaultLang === 'ar' && (
                    <span className="ml-auto text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500">
                      {language === 'ar' ? 'عربي' : 'Arabic'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleCountryConfirm}
            className="w-full bg-black text-white py-4 font-bold text-sm hover:bg-gray-800 transition-colors"
          >
            {t('confirm')}
          </button>
          
          <button
            onClick={handleSkip}
            className="w-full mt-3 text-gray-400 text-sm hover:text-gray-600 transition-colors"
          >
            {t('skip')}
          </button>
        </div>
      </div>
    );
  }

  // Steps 1-3: Permission Slides
  if (step >= 1 && step <= 3) {
    const slideIndex = step - 1;
    const slide = SLIDES[slideIndex];
    
    return (
      <div 
        className={`min-h-screen flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}
        style={{ backgroundColor: slide.bgColor }}
        data-testid={`onboarding-slide-${slide.id}`}
        dir={isRTL ? 'rtl' : 'ltr'}
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

          <h2 className={`text-2xl font-bold mb-3 leading-tight ${isRTL ? 'text-right' : 'text-left'}`}>
            {slide.title}
          </h2>
          <p className={`text-gray-300 text-sm mb-8 leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
            {slide.description}
          </p>

          <button
            onClick={handleSlideNext}
            className="w-full bg-white text-black py-4 font-bold text-sm hover:bg-gray-100 transition-colors border-2 border-white"
          >
            {t('continue')}
          </button>
          
          <button
            onClick={handleSkip}
            className="w-full mt-3 text-gray-400 text-sm hover:text-gray-300 transition-colors"
          >
            {t('skip')}
          </button>
        </div>
      </div>
    );
  }

  // Step 4: Category Selection
  return (
    <div className={`min-h-screen bg-white flex flex-col ${isRTL ? 'rtl' : 'ltr'}`} data-testid="onboarding-category" dir={isRTL ? 'rtl' : 'ltr'}>
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
          <div className={`absolute inset-0 bg-gradient-to-${isRTL ? 'l' : 'r'} from-black/50 to-transparent flex items-center`}>
            <h3 className={`text-white text-3xl font-black ${isRTL ? 'mr-6' : 'ml-6'}`}>{t('women')}</h3>
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
          <div className={`absolute inset-0 bg-gradient-to-${isRTL ? 'l' : 'r'} from-black/50 to-transparent flex items-center`}>
            <h3 className={`text-white text-3xl font-black ${isRTL ? 'mr-6' : 'ml-6'}`}>{t('men')}</h3>
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
          <div className={`absolute inset-0 bg-gradient-to-${isRTL ? 'l' : 'r'} from-black/50 to-transparent flex items-center`}>
            <h3 className={`text-white text-3xl font-black ${isRTL ? 'mr-6' : 'ml-6'}`}>{t('kids')}</h3>
          </div>
        </button>
      </div>

      {/* Browse All Option */}
      <div className="p-4 border-t">
        <button
          onClick={() => handleCategorySelect('all')}
          className="w-full bg-black text-white py-4 font-bold text-sm hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
        >
          {t('browseAll')}
          <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
};

export { COUNTRIES, TRANSLATIONS };
export default StoreOnboarding;
