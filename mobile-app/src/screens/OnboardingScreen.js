/**
 * Store Onboarding Screen - Namshi Style
 * 5-step onboarding flow matching the web storefront
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  },
  {
    id: 'notifications',
    title: 'Curious about the latest drops and deals?',
    description: 'Turn on notifications to get instant alerts about sales, fresh drops, and personalized offers.',
    bgImage: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&h=1200&fit=crop',
    bgColor: '#e53935',
  },
  {
    id: 'personalization',
    title: 'Want a Shopping Experience Built for You?',
    description: 'Allow tracking to get style recommendations that match your vibe. Let TNV personalize your journey by tracking your activity.',
    bgImage: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=1200&fit=crop',
    bgColor: '#c6ff00',
  },
];

// Category images for final step
const CATEGORIES = [
  { name: 'WOMEN', image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&h=400&fit=crop' },
  { name: 'MEN', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop' },
  { name: 'KIDS', image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&h=400&fit=crop' },
];

const OnboardingScreen = ({ onComplete }) => {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0); // 0: language/country, 1-3: slides, 4: category
  const [language, setLanguage] = useState('en');
  const [selectedCountry, setSelectedCountry] = useState('AE');

  const handleCountryConfirm = () => {
    setStep(1);
  };

  const handleSlideNext = () => {
    if (step < SLIDES.length) {
      setStep(step + 1);
    } else {
      setStep(4); // Go to category selection
    }
  };

  const handleCategorySelect = async (category) => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      await AsyncStorage.setItem('preferred_category', category);
      await AsyncStorage.setItem('selected_country', selectedCountry);
      await AsyncStorage.setItem('selected_language', language);
      onComplete?.();
    } catch (e) {
      console.log('Error saving onboarding data:', e);
      onComplete?.();
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      onComplete?.();
    } catch (e) {
      console.log('Error saving onboarding data:', e);
      onComplete?.();
    }
  };

  // Step 0: Language & Country Selection
  if (step === 0) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        {/* Logo Header */}
        <View style={[styles.logoHeader, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.logoArabic}>تي إن في</Text>
          <Text style={styles.logoEnglish}>TNV</Text>
        </View>

        {/* Content */}
        <View style={styles.contentCard}>
          {/* Language Selection */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>LANGUAGE</Text>
            <Text style={styles.sectionHint}>Select your language</Text>
            
            <View style={styles.languageButtons}>
              <TouchableOpacity
                style={[styles.languageButton, language === 'en' && styles.languageButtonSelected]}
                onPress={() => setLanguage('en')}
              >
                <Text style={styles.languageButtonText}>ENGLISH</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.languageButton, language === 'ar' && styles.languageButtonSelected]}
                onPress={() => setLanguage('ar')}
              >
                <Text style={styles.languageButtonText}>عربي</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Country Selection */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>COUNTRY</Text>
            <Text style={styles.sectionHint}>Select your country</Text>
            
            <ScrollView style={styles.countryList} showsVerticalScrollIndicator={false}>
              {COUNTRIES.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={[styles.countryItem, selectedCountry === country.code && styles.countryItemSelected]}
                  onPress={() => setSelectedCountry(country.code)}
                >
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={styles.countryName}>{country.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity style={styles.confirmButton} onPress={handleCountryConfirm}>
            <Text style={styles.confirmButtonText}>CONFIRM</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Steps 1-3: Permission Slides
  if (step >= 1 && step <= 3) {
    const slideIndex = step - 1;
    const slide = SLIDES[slideIndex];
    
    return (
      <View style={[styles.container, { backgroundColor: slide.bgColor }]}>
        {/* Image Section */}
        <View style={styles.slideImageContainer}>
          <Image source={{ uri: slide.bgImage }} style={styles.slideImage} />
          <LinearGradient
            colors={['transparent', slide.bgColor]}
            style={styles.slideGradient}
          />
        </View>

        {/* Content Section */}
        <View style={styles.slideContent}>
          {/* Progress Dots */}
          <View style={styles.progressDots}>
            {SLIDES.map((_, idx) => (
              <View 
                key={idx}
                style={[styles.dot, idx === slideIndex ? styles.dotActive : styles.dotInactive]}
              />
            ))}
          </View>

          <Text style={styles.slideTitle}>{slide.title}</Text>
          <Text style={styles.slideDescription}>{slide.description}</Text>

          <TouchableOpacity style={styles.continueButton} onPress={handleSlideNext}>
            <Text style={styles.continueButtonText}>CONTINUE</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonTextLight}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 4: Category Selection
  return (
    <View style={[styles.container, { backgroundColor: '#fff', paddingTop: insets.top }]}>
      {/* Logo Header */}
      <View style={styles.categoryLogoHeader}>
        <Text style={styles.categoryLogoArabic}>تي إن في</Text>
        <Text style={styles.categoryLogoEnglish}>TNV</Text>
      </View>

      {/* Category Cards */}
      <View style={styles.categoryContainer}>
        {CATEGORIES.map((cat, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.categoryCard}
            onPress={() => handleCategorySelect(cat.name.toLowerCase())}
            activeOpacity={0.9}
          >
            <Image source={{ uri: cat.image }} style={styles.categoryImage} />
            <LinearGradient
              colors={['rgba(0,0,0,0.5)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.categoryGradient}
            />
            <Text style={styles.categoryTitle}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Browse All Option */}
      <View style={[styles.browseAllContainer, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity style={styles.browseAllButton} onPress={() => handleCategorySelect('all')}>
          <Text style={styles.browseAllText}>BROWSE ALL</Text>
          <Text style={styles.browseAllArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Logo Header (Step 0)
  logoHeader: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  logoArabic: {
    color: '#fff',
    fontSize: 16,
  },
  logoEnglish: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    marginTop: 4,
  },
  
  // Content Card (Step 0)
  contentCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#eee',
    alignItems: 'center',
  },
  languageButtonSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  countryList: {
    maxHeight: 280,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#f5f5f5',
    marginBottom: 8,
  },
  countryItemSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    fontSize: 13,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#999',
    fontSize: 13,
  },
  
  // Slide Screens (Steps 1-3)
  slideImageContainer: {
    flex: 1,
    position: 'relative',
  },
  slideImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  slideGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  slideContent: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 32,
    backgroundColor: '#fff',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#444',
  },
  slideTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  slideDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  continueButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  continueButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  skipButtonTextLight: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  
  // Category Selection (Step 4)
  categoryLogoHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryLogoArabic: {
    fontSize: 12,
    color: '#000',
  },
  categoryLogoEnglish: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    marginTop: 2,
  },
  categoryContainer: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  categoryImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '60%',
  },
  categoryTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginLeft: 24,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  browseAllContainer: {
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  browseAllButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  browseAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  browseAllArrow: {
    color: '#fff',
    fontSize: 16,
  },
});

export default OnboardingScreen;
