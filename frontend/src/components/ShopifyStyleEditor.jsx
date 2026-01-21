import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Monitor, Tablet, Smartphone, ChevronRight, ChevronDown, ChevronLeft,
  Settings, Image, Eye, EyeOff, Plus, Save, X, Palette, Layers,
  ExternalLink, Edit3, Trash2, GripVertical, Move, Copy, RefreshCw,
  Undo2, Redo2, Search, Type, Layout, Grid, ImageIcon, Users,
  Megaphone, ShoppingBag, Star, Mail, Menu, Clock, Zap, Box, Tag, Link2
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Currency options with country mapping - Comprehensive list
const CURRENCIES = [
  // Major currencies
  { code: 'USD', symbol: '$', name: 'US Dollar', countries: ['US'] },
  { code: 'EUR', symbol: '€', name: 'Euro', countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'PT', 'AT', 'GR'] },
  { code: 'GBP', symbol: '£', name: 'British Pound', countries: ['GB'] },
  
  // Middle East & GCC
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', countries: ['AE'] },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', countries: ['SA'] },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', countries: ['KW'] },
  { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal', countries: ['QA'] },
  { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar', countries: ['BH'] },
  { code: 'OMR', symbol: '﷼', name: 'Omani Rial', countries: ['OM'] },
  { code: 'EGP', symbol: 'ج.م', name: 'Egyptian Pound', countries: ['EG'] },
  { code: 'JOD', symbol: 'د.ا', name: 'Jordanian Dinar', countries: ['JO'] },
  { code: 'LBP', symbol: 'ل.ل', name: 'Lebanese Pound', countries: ['LB'] },
  { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar', countries: ['IQ'] },
  { code: 'IRR', symbol: '﷼', name: 'Iranian Rial', countries: ['IR'] },
  
  // South Asia
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', countries: ['IN'] },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', countries: ['PK'] },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', countries: ['BD'] },
  { code: 'LKR', symbol: 'රු', name: 'Sri Lankan Rupee', countries: ['LK'] },
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee', countries: ['NP'] },
  { code: 'AFN', symbol: '؋', name: 'Afghan Afghani', countries: ['AF'] },
  { code: 'MVR', symbol: 'ރ.', name: 'Maldivian Rufiyaa', countries: ['MV'] },
  
  // Southeast Asia
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', countries: ['MY'] },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', countries: ['SG'] },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', countries: ['ID'] },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', countries: ['TH'] },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', countries: ['VN'] },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', countries: ['PH'] },
  { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat', countries: ['MM'] },
  
  // East Asia
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', countries: ['CN'] },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', countries: ['JP'] },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', countries: ['KR'] },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', countries: ['HK'] },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar', countries: ['TW'] },
  
  // Europe
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', countries: ['TR'] },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', countries: ['RU'] },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', countries: ['PL'] },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', countries: ['SE'] },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', countries: ['NO'] },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', countries: ['DK'] },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', countries: ['CH'] },
  
  // Americas
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', countries: ['CA'] },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', countries: ['MX'] },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', countries: ['BR'] },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso', countries: ['AR'] },
  { code: 'COP', symbol: '$', name: 'Colombian Peso', countries: ['CO'] },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso', countries: ['CL'] },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', countries: ['PE'] },
  
  // Oceania
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', countries: ['AU'] },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', countries: ['NZ'] },
  
  // Africa
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', countries: ['ZA'] },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', countries: ['NG'] },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', countries: ['KE'] },
  { code: 'MAD', symbol: 'د.م.', name: 'Moroccan Dirham', countries: ['MA'] },
];

// Language options with country mapping - All supported languages
const LANGUAGES = [
  // Global
  { code: 'en', name: 'English', rtl: false, countries: ['US', 'GB', 'AU', 'CA', 'SG', 'NZ', 'ZA', 'NG', 'KE'] },
  
  // Arabic & Middle East
  { code: 'ar', name: 'العربية (Arabic)', rtl: true, countries: ['AE', 'SA', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO', 'LB', 'IQ', 'MA'] },
  { code: 'fa', name: 'فارسی (Persian/Farsi)', rtl: true, countries: ['IR', 'AF'] },
  { code: 'he', name: 'עברית (Hebrew)', rtl: true, countries: ['IL'] },
  
  // South Asian
  { code: 'hi', name: 'हिन्दी (Hindi)', rtl: false, countries: ['IN'] },
  { code: 'ur', name: 'اردو (Urdu)', rtl: true, countries: ['PK'] },
  { code: 'bn', name: 'বাংলা (Bengali)', rtl: false, countries: ['BD'] },
  { code: 'ta', name: 'தமிழ் (Tamil)', rtl: false, countries: ['IN', 'LK', 'SG', 'MY'] },
  { code: 'te', name: 'తెలుగు (Telugu)', rtl: false, countries: ['IN'] },
  { code: 'mr', name: 'मराठी (Marathi)', rtl: false, countries: ['IN'] },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)', rtl: false, countries: ['IN'] },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)', rtl: false, countries: ['IN'] },
  { code: 'ml', name: 'മലയാളം (Malayalam)', rtl: false, countries: ['IN'] },
  { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)', rtl: false, countries: ['IN', 'PK'] },
  { code: 'si', name: 'සිංහල (Sinhala)', rtl: false, countries: ['LK'] },
  { code: 'ne', name: 'नेपाली (Nepali)', rtl: false, countries: ['NP'] },
  { code: 'dv', name: 'ދިވެހި (Dhivehi)', rtl: true, countries: ['MV'] },
  
  // Southeast Asian
  { code: 'ms', name: 'Bahasa Melayu (Malay)', rtl: false, countries: ['MY', 'SG'] },
  { code: 'id', name: 'Bahasa Indonesia', rtl: false, countries: ['ID'] },
  { code: 'th', name: 'ไทย (Thai)', rtl: false, countries: ['TH'] },
  { code: 'vi', name: 'Tiếng Việt (Vietnamese)', rtl: false, countries: ['VN'] },
  { code: 'tl', name: 'Filipino/Tagalog', rtl: false, countries: ['PH'] },
  { code: 'my', name: 'မြန်မာ (Burmese)', rtl: false, countries: ['MM'] },
  
  // East Asian
  { code: 'zh', name: '中文 (Chinese)', rtl: false, countries: ['CN', 'SG', 'HK', 'TW'] },
  { code: 'ja', name: '日本語 (Japanese)', rtl: false, countries: ['JP'] },
  { code: 'ko', name: '한국어 (Korean)', rtl: false, countries: ['KR'] },
  
  // European
  { code: 'fr', name: 'Français (French)', rtl: false, countries: ['FR', 'CA', 'BE', 'CH'] },
  { code: 'de', name: 'Deutsch (German)', rtl: false, countries: ['DE', 'AT', 'CH'] },
  { code: 'es', name: 'Español (Spanish)', rtl: false, countries: ['ES', 'MX', 'AR', 'CO', 'CL', 'PE'] },
  { code: 'it', name: 'Italiano (Italian)', rtl: false, countries: ['IT', 'CH'] },
  { code: 'pt', name: 'Português (Portuguese)', rtl: false, countries: ['PT', 'BR'] },
  { code: 'ru', name: 'Русский (Russian)', rtl: false, countries: ['RU'] },
  { code: 'tr', name: 'Türkçe (Turkish)', rtl: false, countries: ['TR'] },
  { code: 'nl', name: 'Nederlands (Dutch)', rtl: false, countries: ['NL', 'BE'] },
  { code: 'pl', name: 'Polski (Polish)', rtl: false, countries: ['PL'] },
  { code: 'sv', name: 'Svenska (Swedish)', rtl: false, countries: ['SE'] },
  { code: 'no', name: 'Norsk (Norwegian)', rtl: false, countries: ['NO'] },
  { code: 'da', name: 'Dansk (Danish)', rtl: false, countries: ['DK'] },
  { code: 'el', name: 'Ελληνικά (Greek)', rtl: false, countries: ['GR'] },
  
  // African
  { code: 'sw', name: 'Kiswahili (Swahili)', rtl: false, countries: ['KE'] },
];

// Country to Language/Currency mapping - Comprehensive list
const COUNTRY_CONFIG = {
  // Middle East & GCC
  'AE': { language: 'ar', currency: 'AED', name: 'UAE', flag: '🇦🇪' },
  'SA': { language: 'ar', currency: 'SAR', name: 'Saudi Arabia', flag: '🇸🇦' },
  'KW': { language: 'ar', currency: 'KWD', name: 'Kuwait', flag: '🇰🇼' },
  'QA': { language: 'ar', currency: 'QAR', name: 'Qatar', flag: '🇶🇦' },
  'BH': { language: 'ar', currency: 'BHD', name: 'Bahrain', flag: '🇧🇭' },
  'OM': { language: 'ar', currency: 'OMR', name: 'Oman', flag: '🇴🇲' },
  'EG': { language: 'ar', currency: 'EGP', name: 'Egypt', flag: '🇪🇬' },
  'JO': { language: 'ar', currency: 'JOD', name: 'Jordan', flag: '🇯🇴' },
  'LB': { language: 'ar', currency: 'LBP', name: 'Lebanon', flag: '🇱🇧' },
  'IQ': { language: 'ar', currency: 'IQD', name: 'Iraq', flag: '🇮🇶' },
  'IR': { language: 'fa', currency: 'IRR', name: 'Iran', flag: '🇮🇷' },
  
  // South Asia
  'IN': { language: 'hi', currency: 'INR', name: 'India', flag: '🇮🇳' },
  'PK': { language: 'ur', currency: 'PKR', name: 'Pakistan', flag: '🇵🇰' },
  'BD': { language: 'bn', currency: 'BDT', name: 'Bangladesh', flag: '🇧🇩' },
  'LK': { language: 'si', currency: 'LKR', name: 'Sri Lanka', flag: '🇱🇰' },
  'NP': { language: 'ne', currency: 'NPR', name: 'Nepal', flag: '🇳🇵' },
  'AF': { language: 'fa', currency: 'AFN', name: 'Afghanistan', flag: '🇦🇫' },
  'MV': { language: 'dv', currency: 'MVR', name: 'Maldives', flag: '🇲🇻' },
  
  // Southeast Asia
  'MY': { language: 'ms', currency: 'MYR', name: 'Malaysia', flag: '🇲🇾' },
  'SG': { language: 'en', currency: 'SGD', name: 'Singapore', flag: '🇸🇬' },
  'ID': { language: 'id', currency: 'IDR', name: 'Indonesia', flag: '🇮🇩' },
  'TH': { language: 'th', currency: 'THB', name: 'Thailand', flag: '🇹🇭' },
  'VN': { language: 'vi', currency: 'VND', name: 'Vietnam', flag: '🇻🇳' },
  'PH': { language: 'tl', currency: 'PHP', name: 'Philippines', flag: '🇵🇭' },
  'MM': { language: 'my', currency: 'MMK', name: 'Myanmar', flag: '🇲🇲' },
  
  // East Asia
  'CN': { language: 'zh', currency: 'CNY', name: 'China', flag: '🇨🇳' },
  'JP': { language: 'ja', currency: 'JPY', name: 'Japan', flag: '🇯🇵' },
  'KR': { language: 'ko', currency: 'KRW', name: 'South Korea', flag: '🇰🇷' },
  'HK': { language: 'zh', currency: 'HKD', name: 'Hong Kong', flag: '🇭🇰' },
  'TW': { language: 'zh', currency: 'TWD', name: 'Taiwan', flag: '🇹🇼' },
  
  // Europe
  'GB': { language: 'en', currency: 'GBP', name: 'United Kingdom', flag: '🇬🇧' },
  'DE': { language: 'de', currency: 'EUR', name: 'Germany', flag: '🇩🇪' },
  'FR': { language: 'fr', currency: 'EUR', name: 'France', flag: '🇫🇷' },
  'IT': { language: 'it', currency: 'EUR', name: 'Italy', flag: '🇮🇹' },
  'ES': { language: 'es', currency: 'EUR', name: 'Spain', flag: '🇪🇸' },
  'NL': { language: 'nl', currency: 'EUR', name: 'Netherlands', flag: '🇳🇱' },
  'BE': { language: 'nl', currency: 'EUR', name: 'Belgium', flag: '🇧🇪' },
  'PT': { language: 'pt', currency: 'EUR', name: 'Portugal', flag: '🇵🇹' },
  'RU': { language: 'ru', currency: 'RUB', name: 'Russia', flag: '🇷🇺' },
  'TR': { language: 'tr', currency: 'TRY', name: 'Turkey', flag: '🇹🇷' },
  'PL': { language: 'pl', currency: 'PLN', name: 'Poland', flag: '🇵🇱' },
  'SE': { language: 'sv', currency: 'SEK', name: 'Sweden', flag: '🇸🇪' },
  'NO': { language: 'no', currency: 'NOK', name: 'Norway', flag: '🇳🇴' },
  'DK': { language: 'da', currency: 'DKK', name: 'Denmark', flag: '🇩🇰' },
  'CH': { language: 'de', currency: 'CHF', name: 'Switzerland', flag: '🇨🇭' },
  'AT': { language: 'de', currency: 'EUR', name: 'Austria', flag: '🇦🇹' },
  'GR': { language: 'el', currency: 'EUR', name: 'Greece', flag: '🇬🇷' },
  
  // Americas
  'US': { language: 'en', currency: 'USD', name: 'United States', flag: '🇺🇸' },
  'CA': { language: 'en', currency: 'CAD', name: 'Canada', flag: '🇨🇦' },
  'MX': { language: 'es', currency: 'MXN', name: 'Mexico', flag: '🇲🇽' },
  'BR': { language: 'pt', currency: 'BRL', name: 'Brazil', flag: '🇧🇷' },
  'AR': { language: 'es', currency: 'ARS', name: 'Argentina', flag: '🇦🇷' },
  'CO': { language: 'es', currency: 'COP', name: 'Colombia', flag: '🇨🇴' },
  'CL': { language: 'es', currency: 'CLP', name: 'Chile', flag: '🇨🇱' },
  'PE': { language: 'es', currency: 'PEN', name: 'Peru', flag: '🇵🇪' },
  
  // Oceania
  'AU': { language: 'en', currency: 'AUD', name: 'Australia', flag: '🇦🇺' },
  'NZ': { language: 'en', currency: 'NZD', name: 'New Zealand', flag: '🇳🇿' },
  
  // Africa
  'ZA': { language: 'en', currency: 'ZAR', name: 'South Africa', flag: '🇿🇦' },
  'NG': { language: 'en', currency: 'NGN', name: 'Nigeria', flag: '🇳🇬' },
  'KE': { language: 'sw', currency: 'KES', name: 'Kenya', flag: '🇰🇪' },
  'MA': { language: 'ar', currency: 'MAD', name: 'Morocco', flag: '🇲🇦' },
};

// ============================================
// TEMPLATE PRESETS
// ============================================
const TEMPLATE_PRESETS = [
  {
    id: 'namshi-default',
    name: 'Namshi Style',
    description: 'Clean, modern fashion e-commerce layout inspired by Namshi.com',
    thumbnail: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&h=150&fit=crop',
    sections: ['announcement-bar', 'header', 'stories', 'category-tabs', 'sub-navigation', 'hero-banner', 'featured-collection', 'promo-banner', 'countdown', 'newsletter', 'footer']
  },
  {
    id: 'minimal-luxury',
    name: 'Minimal Luxury',
    description: 'Elegant, minimalist design for premium brands',
    thumbnail: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=150&fit=crop',
    sections: ['announcement-bar', 'header', 'hero-banner', 'featured-collection', 'testimonials', 'newsletter', 'footer']
  },
  {
    id: 'flash-sale-focus',
    name: 'Flash Sale Focus',
    description: 'Optimized for promotions and sales events',
    thumbnail: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=200&h=150&fit=crop',
    sections: ['announcement-bar', 'header', 'countdown', 'hero-banner', 'category-tabs', 'featured-collection', 'promo-banner', 'footer']
  },
  {
    id: 'mobile-first',
    name: 'Mobile First',
    description: 'Optimized for mobile shopping experience',
    thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=200&h=150&fit=crop',
    sections: ['stories', 'category-tabs', 'hero-banner', 'featured-collection', 'promo-banner', 'footer']
  }
];

// ============================================
// SECTION DEFINITIONS (Like Shopify Schema)
// ============================================
const SECTION_LIBRARY = {
  'stories': {
    name: 'Stories',
    icon: Users,
    category: 'Engagement',
    limit: 1,
    settings: [
      { type: 'checkbox', id: 'show_stories', label: 'Show Stories', default: true },
      { type: 'range', id: 'avatar_size', label: 'Avatar Size', min: 48, max: 100, step: 4, default: 68, unit: 'px' },
      { type: 'checkbox', id: 'show_labels', label: 'Show Labels', default: true },
      { type: 'checkbox', id: 'auto_play', label: 'Auto-play stories', default: false },
    ],
    blocks: [
      { type: 'story', name: 'Story', settings: [
        { type: 'text', id: 'title', label: 'Title', default: 'Story Title' },
        { type: 'image_picker', id: 'thumbnail', label: 'Thumbnail Image' },
        { type: 'image_picker', id: 'content_image', label: 'Full Story Image' },
        { type: 'url', id: 'link', label: 'Link (optional)', default: '' },
        { type: 'checkbox', id: 'is_official', label: 'Official Badge', default: false },
        { type: 'checkbox', id: 'active', label: 'Active', default: true },
      ]}
    ],
    max_blocks: 10
  },
  'store-settings': {
    name: 'Store Settings',
    icon: Settings,
    category: 'Settings',
    limit: 1,
    settings: [
      { type: 'select', id: 'country', label: 'Store Country', options: Object.entries(COUNTRY_CONFIG).map(([code, cfg]) => ({ value: code, label: `${cfg.flag || ''} ${cfg.name}` })), default: 'PK', autoConfigures: ['default_currency', 'default_language'] },
      { type: 'select', id: 'default_currency', label: 'Default Currency', options: CURRENCIES.map(c => ({ value: c.code, label: `${c.symbol} ${c.name}` })), default: 'PKR' },
      { type: 'select', id: 'default_language', label: 'Default Language', options: LANGUAGES.map(l => ({ value: l.code, label: l.name })), default: 'ur' },
      { type: 'checkbox', id: 'auto_configure', label: 'Auto-configure language & currency by country', default: true },
      { type: 'checkbox', id: 'show_currency_selector', label: 'Show currency selector to customers', default: true },
      { type: 'checkbox', id: 'show_language_selector', label: 'Show language selector to customers', default: true },
      { type: 'checkbox', id: 'auto_detect_location', label: 'Auto-detect customer location', default: true },
    ],
    blocks: [
      { type: 'supported_currency', name: 'Supported Currency', settings: [
        { type: 'select', id: 'currency', label: 'Currency', options: CURRENCIES.map(c => ({ value: c.code, label: `${c.symbol} ${c.name}` })), default: 'USD' },
        { type: 'checkbox', id: 'active', label: 'Active', default: true },
      ]},
      { type: 'supported_language', name: 'Supported Language', settings: [
        { type: 'select', id: 'language', label: 'Language', options: LANGUAGES.map(l => ({ value: l.code, label: l.name })), default: 'en' },
        { type: 'checkbox', id: 'active', label: 'Active', default: true },
      ]}
    ],
    max_blocks: 20
  },
  'announcement-bar': {
    name: 'Announcement bar',
    icon: Megaphone,
    category: 'Header',
    limit: 1,
    settings: [
      { type: 'checkbox', id: 'enabled', label: 'Show announcement bar', default: true },
      { type: 'color', id: 'background_color', label: 'Background color', default: '#000000' },
      { type: 'color', id: 'text_color', label: 'Text color', default: '#ffffff' },
    ],
    blocks: [
      { type: 'message', name: 'Message', settings: [
        { type: 'text', id: 'text', label: 'Message text', default: 'Free shipping on orders over $50!' },
        { type: 'text', id: 'icon', label: 'Icon (emoji)', default: '🚚' },
        { type: 'url', id: 'link', label: 'Link (optional)', default: '' },
      ]}
    ],
    max_blocks: 5
  },
  'header': {
    name: 'Header & Logo',
    icon: Menu,
    category: 'Header',
    limit: 1,
    settings: [
      { type: 'image_picker', id: 'logo', label: 'Logo image' },
      { type: 'text', id: 'logo_text', label: 'Logo text', default: 'TNV' },
      { type: 'text', id: 'logo_badge', label: 'Badge text', default: 'COLLECTION' },
      { type: 'color', id: 'badge_color', label: 'Badge color', default: '#FF6B9D' },
      { type: 'select', id: 'logo_position', label: 'Logo position', options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' }
      ], default: 'left' },
      { type: 'checkbox', id: 'show_search', label: 'Show search', default: true },
      { type: 'checkbox', id: 'show_cart', label: 'Show cart icon', default: true },
      { type: 'checkbox', id: 'show_wishlist', label: 'Show wishlist icon', default: true },
      { type: 'checkbox', id: 'sticky', label: 'Enable sticky header', default: true },
    ],
    blocks: [],
  },
  'main-menu': {
    name: 'Main Menu (Men/Women)',
    icon: Users,
    category: 'Navigation',
    limit: 1,
    settings: [
      { type: 'checkbox', id: 'show_icons', label: 'Show category icons', default: true },
    ],
    blocks: [
      { type: 'menu_category', name: 'Menu Category', settings: [
        { type: 'text', id: 'name', label: 'Name', default: 'WOMEN' },
        { type: 'url', id: 'path', label: 'Link', default: '/women' },
        { type: 'text', id: 'icon', label: 'Icon (emoji)', default: '👩' },
        { type: 'color', id: 'color', label: 'Text color', default: '#FF6B9D' },
        { type: 'color', id: 'bg_color', label: 'Background color', default: '#FFE8F0' },
        { type: 'checkbox', id: 'active', label: 'Active', default: true },
      ]}
    ],
    max_blocks: 10
  },
  'category-tabs': {
    name: 'Category Tabs',
    icon: Grid,
    category: 'Navigation',
    limit: 1,
    settings: [
      { type: 'checkbox', id: 'show_tabs', label: 'Show category tabs', default: true },
      { type: 'range', id: 'icon_size', label: 'Icon size', min: 40, max: 100, step: 5, default: 72, unit: 'px' },
      { type: 'range', id: 'icon_radius', label: 'Border radius', min: 0, max: 24, step: 2, default: 12, unit: 'px' },
      { type: 'select', id: 'layout', label: 'Layout', options: [
        { value: 'horizontal', label: 'Horizontal scroll' },
        { value: 'grid', label: 'Grid' }
      ], default: 'horizontal' },
    ],
    blocks: [
      { type: 'category_tab', name: 'Category Tab', settings: [
        { type: 'text', id: 'name', label: 'Name', default: 'FASHION' },
        { type: 'url', id: 'path', label: 'Link', default: '/fashion' },
        { type: 'image_picker', id: 'image', label: 'Tab Image/Icon' },
        { type: 'color', id: 'bg_color', label: 'Background color', default: '#c8e6c9' },
        { type: 'checkbox', id: 'active', label: 'Active', default: true },
      ]}
    ],
    max_blocks: 5,
    default_blocks: [
      { name: 'Fashion', path: '/fashion', bg_color: '#c8e6c9' },
      { name: 'Beauty', path: '/beauty', bg_color: '#f8bbd9' },
      { name: 'Baby & Kids', path: '/kids', bg_color: '#b3e5fc' },
      { name: 'Home & Lifestyle', path: '/home', bg_color: '#ffe0b2' },
      { name: 'Premium', path: '/premium', bg_color: '#e1bee7' },
    ]
  },
  'sub-navigation': {
    name: 'Sub Navigation',
    icon: Link2,
    category: 'Navigation',
    limit: 1,
    settings: [
      { type: 'checkbox', id: 'show_nav', label: 'Show sub navigation', default: true },
      { type: 'select', id: 'style', label: 'Style', options: [
        { value: 'pills', label: 'Pills' },
        { value: 'underline', label: 'Underline' },
        { value: 'plain', label: 'Plain' }
      ], default: 'pills' },
      { type: 'color', id: 'highlight_color', label: 'Highlight color', default: '#FF3366' },
    ],
    blocks: [
      { type: 'nav_item', name: 'Nav Item', settings: [
        { type: 'text', id: 'name', label: 'Name', default: 'CLOTHING' },
        { type: 'url', id: 'path', label: 'Link', default: '/clothing' },
        { type: 'checkbox', id: 'highlight', label: 'Highlight (sale/new)', default: false },
        { type: 'text', id: 'badge', label: 'Badge text (optional)', default: '' },
        { type: 'checkbox', id: 'active', label: 'Active', default: true },
      ]}
    ],
    max_blocks: 10,
    default_blocks: [
      { name: 'CLOTHING', path: '/clothing', highlight: false },
      { name: 'SHOES', path: '/shoes', highlight: false },
      { name: 'BAGS', path: '/bags', highlight: false },
      { name: 'ACCESSORIES', path: '/accessories', highlight: false },
      { name: 'SPORTS', path: '/sports', highlight: false },
      { name: 'SALE', path: '/sale', highlight: true },
      { name: 'NEW ARRIVALS', path: '/new', highlight: false },
      { name: 'DESIGNERS', path: '/designers', highlight: false },
      { name: 'COLLECTIONS', path: '/collections', highlight: false },
      { name: 'BRANDS', path: '/brands', highlight: false },
    ]
  },
  'hero-banner': {
    name: 'Hero Banner',
    icon: ImageIcon,
    category: 'Hero',
    settings: [
      { type: 'select', id: 'layout', label: 'Layout', options: [
        { value: 'full', label: 'Full width' },
        { value: 'contained', label: 'Contained' }
      ], default: 'full' },
      { type: 'range', id: 'height', label: 'Height', min: 300, max: 800, step: 50, default: 500, unit: 'px' },
      { type: 'checkbox', id: 'autoplay', label: 'Auto-rotate slides', default: true },
      { type: 'range', id: 'autoplay_speed', label: 'Slide duration (seconds)', min: 3, max: 10, step: 1, default: 5 },
    ],
    blocks: [
      { type: 'slide', name: 'Slide', settings: [
        { type: 'image_picker', id: 'image', label: 'Background image' },
        { type: 'image_picker', id: 'mobile_image', label: 'Mobile image (optional)' },
        { type: 'text', id: 'title', label: 'Title', default: 'DESIGNER COLLECTION' },
        { type: 'text', id: 'subtitle', label: 'Subtitle', default: 'Premium Shoes' },
        { type: 'text', id: 'button_text', label: 'Button text', default: 'Shop Now' },
        { type: 'url', id: 'button_link', label: 'Button link', default: '/shop' },
        { type: 'select', id: 'text_position', label: 'Text position', options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' }
        ], default: 'left' },
        { type: 'color', id: 'text_color', label: 'Text color', default: '#FFFFFF' },
        { type: 'checkbox', id: 'overlay', label: 'Show dark overlay', default: true },
      ]}
    ],
    max_blocks: 5
  },
  'featured-collection': {
    name: 'Featured Collection',
    icon: ShoppingBag,
    category: 'Products',
    settings: [
      { type: 'text', id: 'title', label: 'Heading', default: 'Featured Products' },
      { type: 'collection', id: 'collection', label: 'Collection' },
      { type: 'range', id: 'products_to_show', label: 'Products to show', min: 2, max: 12, step: 1, default: 8 },
      { type: 'range', id: 'columns_desktop', label: 'Columns (desktop)', min: 2, max: 6, step: 1, default: 4 },
      { type: 'checkbox', id: 'show_view_all', label: 'Show "View all" button', default: true },
    ],
    blocks: []
  },
  'promo-banner': {
    name: 'Promo Banner',
    icon: Tag,
    category: 'Promotion',
    settings: [
      { type: 'image_picker', id: 'image', label: 'Background image' },
      { type: 'text', id: 'title', label: 'Title', default: '30% CASHBACK' },
      { type: 'text', id: 'subtitle', label: 'Subtitle', default: 'On Sports Apparel & Footwear' },
      { type: 'text', id: 'code', label: 'Promo code (optional)', default: 'SPORTS30' },
      { type: 'url', id: 'link', label: 'Link', default: '/sale' },
      { type: 'color', id: 'gradient_from', label: 'Gradient from', default: '#06b6d4' },
      { type: 'color', id: 'gradient_to', label: 'Gradient to', default: '#10b981' },
    ],
    blocks: []
  },
  'countdown': {
    name: 'Countdown Timer',
    icon: Clock,
    category: 'Promotion',
    settings: [
      { type: 'text', id: 'heading', label: 'Heading', default: 'FLASH SALE' },
      { type: 'text', id: 'subheading', label: 'Subheading', default: 'Ends in' },
      { type: 'text', id: 'discount', label: 'Discount text', default: '50% OFF' },
      { type: 'text', id: 'end_date', label: 'End date (YYYY-MM-DD HH:MM)', default: '' },
      { type: 'color', id: 'background_color', label: 'Background color', default: '#ef4444' },
      { type: 'url', id: 'link', label: 'Link', default: '/sale' },
    ],
    blocks: []
  },
  'newsletter': {
    name: 'Email Signup',
    icon: Mail,
    category: 'Engagement',
    settings: [
      { type: 'text', id: 'heading', label: 'Heading', default: 'Subscribe to our emails' },
      { type: 'richtext', id: 'subheading', label: 'Subheading', default: 'Be the first to know about new collections and exclusive offers.' },
      { type: 'color', id: 'background_color', label: 'Background color', default: '#f5f5f5' },
    ],
    blocks: []
  },
  'testimonials': {
    name: 'Testimonials',
    icon: Star,
    category: 'Social Proof',
    settings: [
      { type: 'text', id: 'heading', label: 'Heading', default: 'What our customers say' },
    ],
    blocks: [
      { type: 'testimonial', name: 'Testimonial', settings: [
        { type: 'text', id: 'quote', label: 'Quote', default: 'Amazing products and great service!' },
        { type: 'text', id: 'author', label: 'Author', default: 'Happy Customer' },
        { type: 'range', id: 'rating', label: 'Rating', min: 1, max: 5, step: 1, default: 5 }
      ]}
    ],
    max_blocks: 6
  },
  'footer': {
    name: 'Footer',
    icon: Layout,
    category: 'Footer',
    limit: 1,
    settings: [
      { type: 'checkbox', id: 'show_social', label: 'Show social icons', default: true },
      { type: 'checkbox', id: 'show_payment_icons', label: 'Show payment icons', default: true },
      { type: 'text', id: 'copyright', label: 'Copyright text', default: '© 2026 TNV Collection. All rights reserved.' },
    ],
    blocks: [
      { type: 'link_list', name: 'Menu', settings: [
        { type: 'text', id: 'heading', label: 'Heading', default: 'Quick links' },
      ]},
    ],
    max_blocks: 4
  },
};

// Group sections by category
const SECTION_CATEGORIES = Object.entries(SECTION_LIBRARY).reduce((acc, [id, section]) => {
  const category = section.category || 'Other';
  if (!acc[category]) acc[category] = [];
  acc[category].push({ id, ...section });
  return acc;
}, {});

// ============================================
// SETTINGS INPUT COMPONENTS
// ============================================
const SettingInput = ({ setting, value, onChange }) => {
  switch (setting.type) {
    case 'text':
    case 'url':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <Input 
            value={value ?? setting.default ?? ''} 
            onChange={(e) => onChange(e.target.value)}
            placeholder={setting.default}
            className="h-9 text-sm"
          />
        </div>
      );
    
    case 'richtext':
    case 'textarea':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <textarea
            value={value ?? setting.default ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-[80px] p-2 text-sm border rounded-md resize-y"
            placeholder={setting.default}
          />
        </div>
      );
    
    case 'color':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value ?? setting.default ?? '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="w-9 h-9 rounded border cursor-pointer"
            />
            <Input 
              value={value ?? setting.default ?? '#000000'} 
              onChange={(e) => onChange(e.target.value)}
              className="h-9 text-sm flex-1 font-mono"
            />
          </div>
        </div>
      );
    
    case 'checkbox':
      return (
        <div className="flex items-center justify-between py-2">
          <Label className="text-sm">{setting.label}</Label>
          <Switch 
            checked={value ?? setting.default ?? false}
            onCheckedChange={onChange}
          />
        </div>
      );
    
    case 'range':
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-gray-600">{setting.label}</Label>
            <span className="text-xs text-gray-500">{value ?? setting.default}{setting.unit || ''}</span>
          </div>
          <input
            type="range"
            min={setting.min}
            max={setting.max}
            step={setting.step}
            value={value ?? setting.default}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      );
    
    case 'select':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <select
            value={value ?? setting.default}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-9 px-3 text-sm border rounded-md bg-white"
          >
            {setting.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    
    case 'image_picker':
      const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('File size must be less than 5MB');
          return;
        }
        
        // Convert to base64 for preview (in production, upload to server/CDN)
        const reader = new FileReader();
        reader.onloadend = () => {
          onChange(reader.result);
        };
        reader.readAsDataURL(file);
      };

      return (
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          
          {/* Image Preview */}
          <div className="border-2 border-dashed rounded-lg p-3 text-center hover:border-blue-400 transition cursor-pointer relative overflow-hidden">
            {value ? (
              <div className="relative">
                <img src={value} alt="" className="w-full h-24 object-contain rounded bg-gray-50" />
                <button 
                  onClick={(e) => { e.stopPropagation(); onChange(''); }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="text-gray-400 py-4 cursor-pointer block">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-medium">Click to upload image</p>
                <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, WEBP up to 5MB</p>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Upload button when image exists */}
          {value && (
            <label className="w-full py-2 text-xs text-center border rounded-lg cursor-pointer hover:bg-gray-50 flex items-center justify-center gap-2">
              <ImageIcon className="w-3 h-3" />
              Change image
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}
          
          {/* URL input */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">or</span>
            <Input 
              value={typeof value === 'string' && !value.startsWith('data:') ? value : ''} 
              onChange={(e) => onChange(e.target.value)}
              placeholder="Paste image URL"
              className="h-8 text-xs flex-1"
            />
          </div>
        </div>
      );
    
    case 'collection':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-9 px-3 text-sm border rounded-md bg-white"
          >
            <option value="">Select a collection</option>
            <option value="all">All products</option>
            <option value="new-arrivals">New arrivals</option>
            <option value="best-sellers">Best sellers</option>
            <option value="sale">Sale</option>
          </select>
        </div>
      );
    
    default:
      return null;
  }
};

// ============================================
// SORTABLE SECTION ITEM
// ============================================
const SortableSectionItem = ({ section, sectionDef, isExpanded, onToggle, onUpdate, onDelete, onDuplicate, onSelect }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [expandedBlocks, setExpandedBlocks] = useState({});
  const Icon = sectionDef?.icon || Box;

  const updateSetting = (settingId, value) => {
    onUpdate({
      ...section,
      settings: { ...section.settings, [settingId]: value }
    });
  };

  const updateBlock = (blockIndex, blockData) => {
    const newBlocks = [...(section.blocks || [])];
    newBlocks[blockIndex] = blockData;
    onUpdate({ ...section, blocks: newBlocks });
  };

  const addBlock = (blockType) => {
    const blockDef = sectionDef?.blocks?.find(b => b.type === blockType);
    if (!blockDef) return;
    
    const newBlock = {
      id: `block-${Date.now()}`,
      type: blockType,
      settings: blockDef.settings.reduce((acc, s) => ({ ...acc, [s.id]: s.default }), {})
    };
    onUpdate({ ...section, blocks: [...(section.blocks || []), newBlock] });
  };

  const deleteBlock = (blockIndex) => {
    const newBlocks = [...(section.blocks || [])];
    newBlocks.splice(blockIndex, 1);
    onUpdate({ ...section, blocks: newBlocks });
  };

  const moveBlock = (blockIndex, direction) => {
    const newBlocks = [...(section.blocks || [])];
    const newIndex = blockIndex + direction;
    if (newIndex < 0 || newIndex >= newBlocks.length) return;
    [newBlocks[blockIndex], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[blockIndex]];
    onUpdate({ ...section, blocks: newBlocks });
  };

  return (
    <div ref={setNodeRef} style={style} className="border-b border-gray-200" data-section-id={section.id}>
      {/* Section Header */}
      <div 
        className={`flex items-center gap-2 px-3 py-3 cursor-pointer hover:bg-gray-50 ${isExpanded ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
        onClick={onToggle}
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing" onClick={e => e.stopPropagation()}>
          <GripVertical className="w-4 h-4 text-gray-300 hover:text-gray-500" />
        </div>
        <Icon className="w-4 h-4 text-gray-500" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block">{sectionDef?.name || section.type}</span>
          {/* Show country/currency/language info for store-settings */}
          {section.type === 'store-settings' && section.settings?.country && (
            <span className="text-[10px] text-gray-500 block truncate">
              {COUNTRY_CONFIG[section.settings.country]?.flag} {COUNTRY_CONFIG[section.settings.country]?.name} • {section.settings.default_currency} • {LANGUAGES.find(l => l.code === section.settings.default_language)?.name?.split(' ')[0] || section.settings.default_language}
            </span>
          )}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onUpdate({ ...section, disabled: !section.disabled }); }}
          className="p-1 hover:bg-gray-200 rounded"
          title={section.disabled ? 'Show section' : 'Hide section'}
        >
          {section.disabled ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-500" />}
        </button>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </div>

      {/* Section Settings */}
      {isExpanded && (
        <div className="px-3 pb-4 bg-gray-50/50 border-l-2 border-l-blue-500">
          {/* Settings */}
          <div className="space-y-3 mt-2">
            {sectionDef?.settings?.map(setting => (
              <SettingInput
                key={setting.id}
                setting={setting}
                value={section.settings?.[setting.id]}
                onChange={(value) => updateSetting(setting.id, value)}
              />
            ))}
          </div>

          {/* Blocks */}
          {sectionDef?.blocks?.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Content</span>
                <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded">{section.blocks?.length || 0}/{sectionDef.max_blocks || 50}</span>
              </div>

              {/* Block List */}
              <div className="space-y-1">
                {section.blocks?.map((block, blockIndex) => {
                  const blockDef = sectionDef.blocks.find(b => b.type === block.type);
                  const blockExpanded = expandedBlocks[blockIndex];
                  const blockTitle = block.settings?.name || block.settings?.text || block.settings?.title || block.settings?.heading || block.settings?.label || blockDef?.name || block.type;
                  
                  return (
                    <div key={block.id || blockIndex} className="bg-white rounded border shadow-sm">
                      <div 
                        className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedBlocks({ ...expandedBlocks, [blockIndex]: !blockExpanded })}
                      >
                        <GripVertical className="w-3 h-3 text-gray-300" />
                        <span className="flex-1 text-xs font-medium truncate">{blockTitle}</span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); moveBlock(blockIndex, -1); }}
                            className="p-1 hover:bg-gray-200 rounded"
                            disabled={blockIndex === 0}
                          >
                            <ChevronUp className="w-3 h-3 text-gray-400" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); moveBlock(blockIndex, 1); }}
                            className="p-1 hover:bg-gray-200 rounded"
                            disabled={blockIndex === (section.blocks?.length || 0) - 1}
                          >
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteBlock(blockIndex); }}
                            className="p-1 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                        {blockExpanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                      </div>

                      {blockExpanded && blockDef && (
                        <div className="px-3 pb-3 pt-2 space-y-3 border-t bg-gray-50/50">
                          {blockDef.settings.map(setting => (
                            <SettingInput
                              key={setting.id}
                              setting={setting}
                              value={block.settings?.[setting.id]}
                              onChange={(value) => updateBlock(blockIndex, {
                                ...block,
                                settings: { ...block.settings, [setting.id]: value }
                              })}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Block Button */}
              {(!sectionDef.max_blocks || (section.blocks?.length || 0) < sectionDef.max_blocks) && (
                <button
                  onClick={() => addBlock(sectionDef.blocks[0].type)}
                  className="w-full mt-2 py-2 border-2 border-dashed rounded-lg text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add {sectionDef.blocks[0].name.toLowerCase()}
                </button>
              )}
            </div>
          )}

          {/* Section Actions */}
          <div className="mt-4 pt-4 border-t flex gap-2">
            <button 
              onClick={onDuplicate}
              className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded border"
            >
              <Copy className="w-3 h-3" /> Duplicate
            </button>
            <button 
              onClick={onDelete}
              className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ChevronUp component (not in lucide by default in our imports)
const ChevronUp = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

// ============================================
// ADD SECTION MODAL
// ============================================
const AddSectionModal = ({ onAdd, onClose, existingSections }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(Object.keys(SECTION_CATEGORIES)[0]);

  const filteredCategories = Object.entries(SECTION_CATEGORIES).reduce((acc, [category, sections]) => {
    const filtered = sections.filter(s => {
      const sectionDef = SECTION_LIBRARY[s.id];
      if (sectionDef.limit) {
        const count = existingSections.filter(es => es.type === s.id).length;
        if (count >= sectionDef.limit) return false;
      }
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
    if (filtered.length > 0) acc[category] = filtered;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[560px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add section</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search sections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {Object.entries(filteredCategories).map(([category, sections]) => (
            <div key={category}>
              <button 
                className="w-full px-4 py-2.5 flex items-center justify-between text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border-b"
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
              >
                {category}
                <ChevronRight className={`w-4 h-4 transition-transform ${expandedCategory === category ? 'rotate-90' : ''}`} />
              </button>
              
              {(expandedCategory === category || searchQuery) && (
                <div className="grid grid-cols-2 gap-2 p-3">
                  {sections.map(section => {
                    const Icon = section.icon || Box;
                    return (
                      <button
                        key={section.id}
                        onClick={() => onAdd(section.id)}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left group"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100">
                          <Icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                        </div>
                        <div>
                          <span className="text-sm font-medium block">{section.name}</span>
                          {section.blocks?.length > 0 && (
                            <span className="text-xs text-gray-400">Supports {section.blocks[0].name}s</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// TEMPLATE SELECTOR MODAL
// ============================================
const TemplateModal = ({ onSelect, onClose, currentSections }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[700px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Choose a Template</h2>
            <p className="text-xs text-gray-500">Select a pre-configured layout for your storefront</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-4">
            {TEMPLATE_PRESETS.map(template => (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className="text-left border rounded-xl overflow-hidden hover:border-blue-500 hover:shadow-lg transition group"
              >
                <div className="h-32 bg-gray-100 relative overflow-hidden">
                  <img 
                    src={template.thumbnail} 
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-2 left-3 text-white text-sm font-bold">{template.name}</span>
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-600">{template.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.sections.slice(0, 4).map(sec => (
                      <span key={sec} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {SECTION_LIBRARY[sec]?.name || sec}
                      </span>
                    ))}
                    {template.sections.length > 4 && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        +{template.sections.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {/* Warning if sections exist */}
          {currentSections.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> Applying a template will replace your current layout. Your existing configuration will be lost.
              </p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN EDITOR COMPONENT
// ============================================
const ShopifyStyleEditor = () => {
  const { selectedStore } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState('desktop');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [selectedPage, setSelectedPage] = useState('home');
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef(null);

  // Undo/Redo history
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistoryLength = 50;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Page sections state
  const [sections, setSections] = useState([]);

  const storeName = selectedStore || 'tnvcollection';

  // Save to history (for undo/redo)
  const saveToHistory = useCallback((newSections) => {
    setHistory(prev => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new state
      newHistory.push(JSON.stringify(newSections));
      // Limit history length
      if (newHistory.length > maxHistoryLength) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, maxHistoryLength - 1));
  }, [historyIndex]);

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousState = JSON.parse(history[newIndex]);
      setSections(previousState);
      setHistoryIndex(newIndex);
      setHasChanges(true);
      toast.info('Undo');
    }
  }, [history, historyIndex]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = JSON.parse(history[newIndex]);
      setSections(nextState);
      setHistoryIndex(newIndex);
      setHasChanges(true);
      toast.info('Redo');
    }
  }, [history, historyIndex]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Listen for messages from iframe (click-to-edit)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'EDITOR_SELECT_SECTION') {
        const sectionType = event.data.sectionType;
        const matchingSection = sections.find(s => s.type === sectionType);
        if (matchingSection) {
          setExpandedSection(matchingSection.id);
          setTimeout(() => {
            const element = document.querySelector(`[data-section-id="${matchingSection.id}"]`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
          toast.success(`Editing: ${SECTION_LIBRARY[sectionType]?.name || sectionType}`);
        } else {
          toast.info(`Section "${sectionType}" not found in current layout`);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sections]);

  // Load data from backend
  useEffect(() => {
    loadConfig();
  }, [storeName]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      // Fetch navigation config
      const [navRes, bannersRes, tabsRes, subNavRes] = await Promise.all([
        fetch(`${API_URL}/api/storefront/config/navigation/${storeName}`),
        fetch(`${API_URL}/api/storefront/banners/hero/${storeName}`),
        fetch(`${API_URL}/api/storefront/banners/category-tabs/${storeName}`),
        fetch(`${API_URL}/api/storefront/banners/sub-nav/${storeName}`),
      ]);

      const loadedSections = [];

      // Announcement bar
      if (navRes.ok) {
        const navData = await navRes.json();
        
        // Add announcement bar section
        loadedSections.push({
          id: 'section-announcement',
          type: 'announcement-bar',
          settings: { enabled: true, background_color: '#000000', text_color: '#ffffff' },
          blocks: (navData.promoMessages || []).map((msg, i) => ({
            id: `msg-${i}`,
            type: 'message',
            settings: { text: msg.text, icon: msg.icon || '✓', link: msg.link || '' }
          }))
        });

        // Add Stories section (Instagram-style)
        loadedSections.push({
          id: 'section-stories',
          type: 'stories',
          settings: { show_stories: true, avatar_size: 68, show_labels: true, auto_play: false },
          blocks: [
            { id: 'story-1', type: 'story', settings: { title: 'TNV Official', thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', is_official: true, active: true } },
            { id: 'story-2', type: 'story', settings: { title: 'Fashion Week', thumbnail: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop', is_official: false, active: true } },
            { id: 'story-3', type: 'story', settings: { title: 'Street Style', thumbnail: 'https://images.unsplash.com/photo-1504703395950-b89145a5425b?w=100&h=100&fit=crop', is_official: false, active: true } },
            { id: 'story-4', type: 'story', settings: { title: 'Sale Alert', thumbnail: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=100&h=100&fit=crop', is_official: false, active: true } },
            { id: 'story-5', type: 'story', settings: { title: 'Beauty Tips', thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop', is_official: false, active: true } },
          ]
        });

        // Add header section
        loadedSections.push({
          id: 'section-header',
          type: 'header',
          settings: { 
            logo_text: navData.logo?.text || 'TNV',
            logo_badge: navData.logo?.badge || 'COLLECTION',
            badge_color: navData.logo?.badgeColor || '#FF6B9D',
            logo: navData.logo?.image || '',
            show_search: true,
            show_cart: true,
            sticky: true
          },
          blocks: []
        });

        // Add main menu section
        if (navData.categories) {
          loadedSections.push({
            id: 'section-main-menu',
            type: 'main-menu',
            settings: { show_icons: true },
            blocks: navData.categories.map((cat, i) => ({
              id: `cat-${i}`,
              type: 'menu_category',
              settings: {
                name: cat.name,
                path: cat.path,
                icon: cat.icon?.value || '👔',
                color: cat.color || '#000000',
                bg_color: cat.bgColor || '#f5f5f5',
                active: cat.active !== false
              }
            }))
          });
        }
      }

      // Category tabs (5 tabs) - Always add section even if API fails
      let categoryBlocks = [
        { id: 'tab-0', type: 'category_tab', settings: { name: 'Fashion', path: '/fashion', bg_color: '#c8e6c9', active: true } },
        { id: 'tab-1', type: 'category_tab', settings: { name: 'Beauty', path: '/beauty', bg_color: '#f8bbd9', active: true } },
        { id: 'tab-2', type: 'category_tab', settings: { name: 'Baby & Kids', path: '/kids', bg_color: '#b3e5fc', active: true } },
        { id: 'tab-3', type: 'category_tab', settings: { name: 'Home & Lifestyle', path: '/home', bg_color: '#ffe0b2', active: true } },
        { id: 'tab-4', type: 'category_tab', settings: { name: 'Premium', path: '/premium', bg_color: '#e1bee7', active: true } },
      ];
      
      if (tabsRes.ok) {
        const tabsData = await tabsRes.json();
        if (tabsData.categoryTabs?.length > 0) {
          categoryBlocks = tabsData.categoryTabs.map((tab, i) => ({
            id: `tab-${i}`,
            type: 'category_tab',
            settings: {
              name: tab.name,
              path: tab.path,
              image: tab.image,
              bg_color: tab.bgColor || '#f5f5f5',
              active: tab.active !== false
            }
          }));
        }
      }
      
      loadedSections.push({
        id: 'section-category-tabs',
        type: 'category-tabs',
        settings: { show_tabs: true, icon_size: 72, icon_radius: 12, layout: 'horizontal' },
        blocks: categoryBlocks
      });

      // Sub navigation (10 items) - Always add section even if API fails
      let navBlocks = [
        { id: 'subnav-0', type: 'nav_item', settings: { name: 'CLOTHING', path: '/clothing', highlight: false, active: true } },
        { id: 'subnav-1', type: 'nav_item', settings: { name: 'SHOES', path: '/shoes', highlight: false, active: true } },
        { id: 'subnav-2', type: 'nav_item', settings: { name: 'BAGS', path: '/bags', highlight: false, active: true } },
        { id: 'subnav-3', type: 'nav_item', settings: { name: 'ACCESSORIES', path: '/accessories', highlight: false, active: true } },
        { id: 'subnav-4', type: 'nav_item', settings: { name: 'SPORTS', path: '/sports', highlight: false, active: true } },
        { id: 'subnav-5', type: 'nav_item', settings: { name: 'SALE', path: '/sale', highlight: true, badge: 'HOT', active: true } },
        { id: 'subnav-6', type: 'nav_item', settings: { name: 'NEW ARRIVALS', path: '/new', highlight: false, badge: 'NEW', active: true } },
        { id: 'subnav-7', type: 'nav_item', settings: { name: 'DESIGNERS', path: '/designers', highlight: false, active: true } },
        { id: 'subnav-8', type: 'nav_item', settings: { name: 'COLLECTIONS', path: '/collections', highlight: false, active: true } },
        { id: 'subnav-9', type: 'nav_item', settings: { name: 'BRANDS', path: '/brands', highlight: false, active: true } },
      ];
      
      if (subNavRes.ok) {
        const subNavData = await subNavRes.json();
        if (subNavData.subNavItems?.length > 0) {
          navBlocks = subNavData.subNavItems.map((item, i) => ({
            id: `subnav-${i}`,
            type: 'nav_item',
            settings: {
              name: item.name,
              path: item.path,
              highlight: item.highlight || false,
              badge: item.badge || '',
              active: item.active !== false
            }
          }));
        }
      }
      
      loadedSections.push({
        id: 'section-sub-nav',
        type: 'sub-navigation',
        settings: { show_nav: true, style: 'pills', highlight_color: '#FF3366' },
        blocks: navBlocks
      });

      // Hero banners with image upload support - Always add section even if API fails
      let bannerBlocks = [
        { id: 'banner-0', type: 'slide', settings: { 
          image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&h=800&fit=crop', 
          title: 'NEW COLLECTION', 
          subtitle: 'Discover the latest trends', 
          button_text: 'Shop Now', 
          button_link: '/shop',
          text_position: 'left',
          text_color: '#FFFFFF',
          overlay: true 
        }},
        { id: 'banner-1', type: 'slide', settings: { 
          image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&h=800&fit=crop', 
          title: 'SUMMER SALE', 
          subtitle: 'Up to 50% off', 
          button_text: 'Shop Sale', 
          button_link: '/sale',
          text_position: 'center',
          text_color: '#FFFFFF',
          overlay: true 
        }},
      ];
      
      if (bannersRes.ok) {
        const bannersData = await bannersRes.json();
        if (bannersData.banners?.length > 0) {
          bannerBlocks = bannersData.banners.map((banner, i) => ({
            id: `banner-${i}`,
            type: 'slide',
            settings: {
              image: banner.image,
              mobile_image: banner.mobileImage || '',
              title: banner.title,
              subtitle: banner.subtitle || '',
              button_text: banner.buttonText || 'Shop Now',
              button_link: banner.buttonLink || '/',
              text_position: banner.textPosition || 'left',
              text_color: banner.textColor || '#FFFFFF',
              overlay: banner.overlay !== false
            }
          }));
        }
      }
      
      loadedSections.push({
        id: 'section-hero',
        type: 'hero-banner',
        settings: { layout: 'full', height: 500, autoplay: true, autoplay_speed: 5 },
        blocks: bannerBlocks
      });

      // Add featured collection
      loadedSections.push({
        id: 'section-featured',
        type: 'featured-collection',
        settings: { title: 'New Arrivals', products_to_show: 8, columns_desktop: 4, show_view_all: true },
        blocks: []
      });

      // Add countdown
      loadedSections.push({
        id: 'section-countdown',
        type: 'countdown',
        settings: { heading: 'FLASH SALE', subheading: 'Ends in', discount: '50% OFF', background_color: '#ef4444' },
        blocks: []
      });

      setSections(loadedSections);
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  // Add section
  const handleAddSection = (sectionType) => {
    const sectionDef = SECTION_LIBRARY[sectionType];
    if (!sectionDef) return;

    const newSection = {
      id: `section-${Date.now()}`,
      type: sectionType,
      settings: sectionDef.settings.reduce((acc, s) => ({ ...acc, [s.id]: s.default }), {}),
      blocks: []
    };

    const newSections = [...sections, newSection];
    setSections(newSections);
    saveToHistory(newSections);
    setShowAddSection(false);
    setHasChanges(true);
    setExpandedSection(newSection.id);
    toast.success(`Added ${sectionDef.name}`);
  };

  // Apply template preset
  const handleApplyTemplate = (template) => {
    const newSections = template.sections.map((sectionType, idx) => {
      const sectionDef = SECTION_LIBRARY[sectionType];
      if (!sectionDef) return null;
      
      return {
        id: `section-${Date.now()}-${idx}`,
        type: sectionType,
        settings: sectionDef.settings.reduce((acc, s) => ({ ...acc, [s.id]: s.default }), {}),
        blocks: []
      };
    }).filter(Boolean);

    setSections(newSections);
    saveToHistory(newSections);
    setShowTemplates(false);
    setHasChanges(true);
    toast.success(`Template "${template.name}" applied!`);
  };

  // Update section
  const handleUpdateSection = (sectionId, updatedSection) => {
    // Auto-configure language and currency when country changes in store-settings
    if (updatedSection.type === 'store-settings') {
      const originalSection = sections.find(s => s.id === sectionId);
      if (originalSection && originalSection.settings.country !== updatedSection.settings.country) {
        // Country changed - auto-configure if enabled
        if (updatedSection.settings.auto_configure !== false) {
          const countryCode = updatedSection.settings.country;
          const config = COUNTRY_CONFIG[countryCode];
          if (config) {
            updatedSection.settings.default_currency = config.currency;
            updatedSection.settings.default_language = config.language;
            toast.success(`Auto-configured: ${config.name} → ${config.currency} / ${LANGUAGES.find(l => l.code === config.language)?.name || config.language}`);
          }
        }
      }
    }
    
    const newSections = sections.map(s => s.id === sectionId ? updatedSection : s);
    setSections(newSections);
    saveToHistory(newSections);
    setHasChanges(true);
  };

  // Delete section
  const handleDeleteSection = (sectionId) => {
    const newSections = sections.filter(s => s.id !== sectionId);
    setSections(newSections);
    saveToHistory(newSections);
    setHasChanges(true);
    toast.success('Section removed');
  };

  // Duplicate section
  const handleDuplicateSection = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const sectionDef = SECTION_LIBRARY[section.type];
    if (sectionDef?.limit) {
      const count = sections.filter(s => s.type === section.type).length;
      if (count >= sectionDef.limit) {
        toast.error(`Maximum ${sectionDef.limit} ${sectionDef.name} allowed`);
        return;
      }
    }

    const newSection = {
      ...JSON.parse(JSON.stringify(section)),
      id: `section-${Date.now()}`
    };
    const index = sections.findIndex(s => s.id === sectionId);
    const newSections = [...sections];
    newSections.splice(index + 1, 0, newSection);
    setSections(newSections);
    saveToHistory(newSections);
    setHasChanges(true);
    toast.success('Section duplicated');
  };

  // Drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over?.id);
      const newSections = arrayMove(sections, oldIndex, newIndex);
      setSections(newSections);
      saveToHistory(newSections);
      setHasChanges(true);
    }
  };

  // Save to backend
  const handleSave = async () => {
    setSaving(true);
    try {
      // Extract data from sections
      const announcementSection = sections.find(s => s.type === 'announcement-bar');
      const headerSection = sections.find(s => s.type === 'header');
      const mainMenuSection = sections.find(s => s.type === 'main-menu');
      const categoryTabsSection = sections.find(s => s.type === 'category-tabs');
      const subNavSection = sections.find(s => s.type === 'sub-navigation');
      const heroSection = sections.find(s => s.type === 'hero-banner');

      const savePromises = [];

      // Save navigation config (logo, promo messages, categories)
      if (announcementSection || headerSection || mainMenuSection) {
        const navConfig = {
          logo: {
            text: headerSection?.settings?.logo_text || 'TNV',
            badge: headerSection?.settings?.logo_badge || 'COLLECTION',
            badgeColor: headerSection?.settings?.badge_color || '#FF6B9D',
            image: headerSection?.settings?.logo || ''
          },
          promoMessages: (announcementSection?.blocks || []).map((b, i) => ({
            text: b.settings?.text || '',
            icon: b.settings?.icon || '',
            link: b.settings?.link || '',
            order: i,
            active: true
          })),
          categories: (mainMenuSection?.blocks || []).map((b, i) => ({
            name: b.settings?.name || '',
            path: b.settings?.path || '',
            icon: { type: 'emoji', value: b.settings?.icon || '' },
            color: b.settings?.color || '',
            bgColor: b.settings?.bg_color || '',
            order: i,
            active: b.settings?.active !== false
          }))
        };

        savePromises.push(
          fetch(`${API_URL}/api/storefront/config/navigation/${storeName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(navConfig)
          })
        );
      }

      // Save category tabs
      if (categoryTabsSection) {
        const categoryTabs = (categoryTabsSection.blocks || []).map((b, i) => ({
          id: b.id || `cat-${i}`,
          name: b.settings?.name || '',
          path: b.settings?.path || '',
          image: b.settings?.image || '',
          bgColor: b.settings?.bg_color || '#f5f5f5',
          active: b.settings?.active !== false,
          order: i
        }));

        savePromises.push(
          fetch(`${API_URL}/api/storefront/banners/category-tabs/${storeName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryTabs)
          })
        );
      }

      // Save sub navigation
      if (subNavSection) {
        const subNavItems = (subNavSection.blocks || []).map((b, i) => ({
          id: b.id || `subnav-${i}`,
          name: b.settings?.name || '',
          path: b.settings?.path || '',
          highlight: b.settings?.highlight || false,
          active: b.settings?.active !== false,
          order: i
        }));

        savePromises.push(
          fetch(`${API_URL}/api/storefront/banners/sub-nav/${storeName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subNavItems)
          })
        );
      }

      // Save hero banners
      if (heroSection) {
        const banners = (heroSection.blocks || []).map((b, i) => ({
          id: b.id || `banner-${i}`,
          title: b.settings?.title || '',
          subtitle: b.settings?.subtitle || '',
          buttonText: b.settings?.button_text || 'Shop Now',
          buttonLink: b.settings?.button_link || '/',
          image: b.settings?.image || '',
          mobileImage: b.settings?.mobile_image || '',
          textPosition: b.settings?.text_position || 'left',
          textColor: b.settings?.text_color || '#FFFFFF',
          overlay: b.settings?.overlay !== false,
          active: true,
          order: i
        }));

        savePromises.push(
          fetch(`${API_URL}/api/storefront/banners/hero/${storeName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(banners)
          })
        );
      }

      await Promise.all(savePromises);
      setHasChanges(false);
      toast.success('Theme saved successfully!');
      
      // Refresh preview
      setPreviewKey(prev => prev + 1);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Preview width
  const getPreviewWidth = () => {
    switch (viewMode) {
      case 'tablet': return '768px';
      case 'mobile': return '375px';
      default: return '100%';
    }
  };

  // Refresh preview
  const refreshPreview = () => {
    setPreviewKey(prev => prev + 1);
  };

  const PAGES = [
    { id: 'home', name: 'Home page' },
    { id: 'collection', name: 'Collection pages' },
    { id: 'product', name: 'Product pages' },
    { id: 'cart', name: 'Cart' },
  ];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Loading theme editor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Top Toolbar */}
      <header className="h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="flex items-center gap-2 text-gray-300 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Exit</span>
          </a>

          <div className="h-6 w-px bg-gray-700" />

          <select 
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded border border-gray-600 focus:border-blue-500 outline-none"
          >
            {PAGES.map(page => (
              <option key={page.id} value={page.id}>{page.name}</option>
            ))}
          </select>
        </div>

        {/* Device toggles */}
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          {[
            { mode: 'desktop', icon: Monitor },
            { mode: 'tablet', icon: Tablet },
            { mode: 'mobile', icon: Smartphone },
          ].map(({ mode, icon: Icon }) => (
            <button 
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`p-2 rounded transition ${viewMode === mode ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
              title={mode.charAt(0).toUpperCase() + mode.slice(1)}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo buttons */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 mr-2">
            <button 
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className={`p-2 rounded transition ${historyIndex > 0 ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 cursor-not-allowed'}`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button 
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className={`p-2 rounded transition ${historyIndex < history.length - 1 ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 cursor-not-allowed'}`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={refreshPreview}
            className="flex items-center gap-2 text-gray-300 hover:text-white text-sm p-2"
            title="Refresh preview"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a 
            href="/tnv" 
            target="_blank"
            className="flex items-center gap-2 text-gray-300 hover:text-white text-sm p-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Preview</span>
          </a>
          <Button 
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`${hasChanges ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600'} text-white min-w-[80px]`}
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Save
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <aside className={`${sidebarOpen ? 'w-80' : 'w-0'} bg-white border-r transition-all duration-300 flex flex-col overflow-hidden`}>
          <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
            <h2 className="font-semibold text-sm">Sections</h2>
            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-200 rounded">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                {sections.map((section) => (
                  <SortableSectionItem
                    key={section.id}
                    section={section}
                    sectionDef={SECTION_LIBRARY[section.type]}
                    isExpanded={expandedSection === section.id}
                    onToggle={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    onUpdate={(updated) => handleUpdateSection(section.id, updated)}
                    onDelete={() => handleDeleteSection(section.id)}
                    onDuplicate={() => handleDuplicateSection(section.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <div className="p-3 border-t bg-gray-50 space-y-2">
            <Button onClick={() => setShowAddSection(true)} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add section
            </Button>
            <Button onClick={() => setShowTemplates(true)} variant="ghost" className="w-full text-gray-600 hover:text-blue-600">
              <Layers className="w-4 h-4 mr-2" />
              Use template
            </Button>
          </div>
        </aside>

        {/* Sidebar Toggle */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white border rounded-r-lg p-2 shadow-lg z-10 hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Preview */}
        <main className="flex-1 overflow-auto bg-gray-200 flex justify-center p-4 relative">
          <div 
            className="bg-white shadow-2xl transition-all duration-300 overflow-auto rounded-lg relative"
            style={{ width: getPreviewWidth(), maxWidth: '100%', height: 'calc(100vh - 120px)' }}
          >
            <iframe
              key={previewKey}
              ref={iframeRef}
              src="/tnv?editor=true"
              className="w-full h-full border-0"
              title="Store Preview"
            />
            
            {/* Click-to-Edit Overlay */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{ display: 'none' }}
              id="editor-overlay"
            >
              {/* Section highlights will be rendered here */}
            </div>
          </div>
          
          {/* Editor Mode Indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
            <Edit3 className="w-3 h-3" />
            <span>Click any section to edit</span>
          </div>
        </main>
      </div>

      {/* Add Section Modal */}
      {showAddSection && (
        <AddSectionModal
          onAdd={handleAddSection}
          onClose={() => setShowAddSection(false)}
          existingSections={sections}
        />
      )}

      {/* Template Selector Modal */}
      {showTemplates && (
        <TemplateModal
          onSelect={handleApplyTemplate}
          onClose={() => setShowTemplates(false)}
          currentSections={sections}
        />
      )}
    </div>
  );
};

export default ShopifyStyleEditor;
