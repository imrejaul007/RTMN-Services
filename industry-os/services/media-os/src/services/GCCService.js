/**
 * Media OS - GCC Service
 * Gulf Cooperation Council regional support
 * UAE, Saudi Arabia, Qatar, Kuwait, Oman, Bahrain
 */

const logger = require('../config/database');

/**
 * GCC Regional Configuration
 */
const GCC_CONFIG = {
  countries: {
    AE: { name: 'United Arab Emirates', currency: 'AED', locale: 'ar-AE', timezone: 'Asia/Dubai' },
    SA: { name: 'Saudi Arabia', currency: 'SAR', locale: 'ar-SA', timezone: 'Asia/Riyadh' },
    QA: { name: 'Qatar', currency: 'QAR', locale: 'ar-QA', timezone: 'Asia/Qatar' },
    KW: { name: 'Kuwait', currency: 'KWD', locale: 'ar-KW', timezone: 'Asia/Kuwait' },
    OM: { name: 'Oman', currency: 'OMR', locale: 'ar-OM', timezone: 'Asia/Muscat' },
    BH: { name: 'Bahrain', currency: 'BHD', locale: 'ar-BH', timezone: 'Asia/Bahrain' },
  },

  // Exchange rates (approximate, should fetch from API)
  exchangeRates: {
    AED: { USD: 0.272, INR: 22.85 },
    SAR: { USD: 0.267, INR: 22.38 },
    QAR: { USD: 0.275, INR: 22.98 },
    KWD: { USD: 3.25, INR: 272.0 },
    OMR: { USD: 2.60, INR: 218.0 },
    BHD: { USD: 2.65, INR: 222.0 },
  },

  // Content regulations by country
  contentRules: {
    AE: {
      maxRating: 'PG-13',
      prohibited: ['gambling', 'adult', 'political_religious_extremism'],
      requiresWarning: ['violence', 'language', 'discrimination'],
    },
    SA: {
      maxRating: 'PG',
      prohibited: ['gambling', 'adult', 'political_content', 'religious_criticism'],
      requiresWarning: ['violence', 'mixed_gender', 'western_values'],
    },
    QA: {
      maxRating: 'PG',
      prohibited: ['gambling', 'adult', 'politics'],
      requiresWarning: ['violence', 'cultural_sensitivity'],
    },
    KW: {
      maxRating: 'PG-13',
      prohibited: ['gambling', 'adult', 'political'],
      requiresWarning: ['violence', 'language'],
    },
    OM: {
      maxRating: 'PG',
      prohibited: ['gambling', 'adult', 'political_extremism'],
      requiresWarning: ['violence'],
    },
    BH: {
      maxRating: 'PG-13',
      prohibited: ['gambling', 'adult', 'political'],
      requiresWarning: ['violence', 'language'],
    },
  },

  // Payment providers by country
  paymentProviders: {
    AE: ['card', 'apple_pay', 'google_pay', 'local_bank'],
    SA: ['card', 'mada', 'apple_pay', 'stc_pay'],
    QA: ['card', 'apple_pay'],
    KW: ['card', 'apple_pay', 'knet'],
    OM: ['card', 'apple_pay', 'oman_net'],
    BH: ['card', 'apple_pay', 'benefit'],
  },

  // Tax rules
  taxRules: {
    AE: { vat: 5, name: 'VAT' },
    SA: { vat: 15, name: 'VAT' },
    QA: { vat: 0, name: 'No VAT' },
    KW: { vat: 0, name: 'No VAT' },
    OM: { vat: 5, name: 'VAT' },
    BH: { vat: 10, name: 'VAT' },
  },
};

/**
 * GCC Service Class
 */
class GCCService {
  constructor() {
    this.config = GCC_CONFIG;
  }

  /**
   * Get country config
   */
  getCountry(countryCode) {
    return this.config.countries[countryCode];
  }

  /**
   * Get all GCC countries
   */
  getAllCountries() {
    return Object.entries(this.config.countries).map(([code, data]) => ({
      code,
      ...data,
    }));
  }

  /**
   * Convert currency
   */
  convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;

    // Get rates relative to USD
    const fromRate = this.config.exchangeRates[fromCurrency]?.USD || 1;
    const toRate = this.config.exchangeRates[toCurrency]?.USD || 1;

    const usdAmount = amount / fromRate;
    return usdAmount * toRate;
  }

  /**
   * Format price for GCC
   */
  formatPrice(amount, countryCode) {
    const country = this.config.countries[countryCode];
    if (!country) return `${amount} USD`;

    const formatted = new Intl.NumberFormat(country.locale, {
      style: 'currency',
      currency: country.currency,
    }).format(amount);

    return formatted;
  }

  /**
   * Get content rules for country
   */
  getContentRules(countryCode) {
    return this.config.contentRules[countryCode] || this.config.contentRules.AE;
  }

  /**
   * Check content compliance
   */
  checkContentCompliance(content, countryCode) {
    const rules = this.getContentRules(countryCode);
    const issues = [];
    const warnings = [];

    // Check rating
    const ratingOrder = ['G', 'PG', 'PG-13', 'UA', 'A'];
    const contentRatingIndex = ratingOrder.indexOf(content.rating || 'G');
    const maxRatingIndex = ratingOrder.indexOf(rules.maxRating);

    if (contentRatingIndex > maxRatingIndex) {
      issues.push(`Content rating ${content.rating} exceeds maximum ${rules.maxRating}`);
    }

    // Check prohibited content
    const contentTags = (content.tags || []).map(t => t.toLowerCase());
    for (const prohibited of rules.prohibited) {
      if (contentTags.some(t => t.includes(prohibited))) {
        issues.push(`Contains prohibited content: ${prohibited}`);
      }
    }

    // Check warnings
    for (const warning of rules.requiresWarning) {
      if (contentTags.some(t => t.includes(warning))) {
        warnings.push(`Requires warning: ${warning}`);
      }
    }

    return {
      compliant: issues.length === 0,
      issues,
      warnings,
      maxAllowed: rules.maxRating,
    };
  }

  /**
   * Get available payment methods
   */
  getPaymentMethods(countryCode) {
    return this.config.paymentProviders[countryCode] || ['card'];
  }

  /**
   * Calculate final price with tax
   */
  calculatePrice(basePrice, countryCode) {
    const country = this.config.countries[countryCode];
    if (!country) return { base: basePrice, tax: 0, total: basePrice };

    const taxRule = this.config.taxRules[countryCode];
    const tax = basePrice * (taxRule.vat / 100);

    return {
      base: basePrice,
      currency: country.currency,
      taxRate: taxRule.vat,
      taxName: taxRule.name,
      tax,
      total: basePrice + tax,
    };
  }

  /**
   * Generate RTL-friendly content
   */
  prepareRTLContent(content, countryCode) {
    const country = this.config.countries[countryCode];
    if (!country || !country.locale.startsWith('ar')) {
      return content;
    }

    // Add RTL direction
    return {
      ...content,
      direction: 'rtl',
      locale: country.locale,
      title: this.translateToArabic(content.title),
      description: this.translateToArabic(content.description),
    };
  }

  /**
   * Translate text to Arabic (placeholder)
   */
  translateToArabic(text) {
    if (!text) return text;
    // In production, use AI translation
    return `[AR] ${text}`;
  }

  /**
   * Get local regulations
   */
  getRegulations(countryCode) {
    return {
      country: this.config.countries[countryCode],
      contentRules: this.getContentRules(countryCode),
      paymentMethods: this.getPaymentMethods(countryCode),
      taxRules: this.config.taxRules[countryCode],
    };
  }
}

/**
 * Multi-language Service
 */
class MultiLanguageService {
  constructor() {
    this.languages = [
      { code: 'en', name: 'English', native: 'English', rtl: false },
      { code: 'hi', name: 'Hindi', native: 'हिन्दी', rtl: false },
      { code: 'ta', name: 'Tamil', native: 'தமிழ்', rtl: false },
      { code: 'te', name: 'Telugu', native: 'తెలుగు', rtl: false },
      { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', rtl: false },
      { code: 'ml', name: 'Malayalam', native: 'മലയാളം', rtl: false },
      { code: 'bn', name: 'Bengali', native: 'বাংলা', rtl: false },
      { code: 'mr', name: 'Marathi', native: 'मराठी', rtl: false },
      { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', rtl: false },
      { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', rtl: false },
      { code: 'ar', name: 'Arabic', native: 'العربية', rtl: true },
      { code: 'ur', name: 'Urdu', native: 'اردو', rtl: true },
      { code: 'fa', name: 'Persian', native: 'فارسی', rtl: true },
      { code: 'zh', name: 'Chinese', native: '中文', rtl: false },
      { code: 'ja', name: 'Japanese', native: '日本語', rtl: false },
      { code: 'ko', name: 'Korean', native: '한국어', rtl: false },
      { code: 'es', name: 'Spanish', native: 'Español', rtl: false },
      { code: 'fr', name: 'French', native: 'Français', rtl: false },
      { code: 'de', name: 'German', native: 'Deutsch', rtl: false },
      { code: 'pt', name: 'Portuguese', native: 'Português', rtl: false },
    ];
  }

  getAllLanguages() {
    return this.languages;
  }

  getLanguage(code) {
    return this.languages.find(l => l.code === code);
  }

  isRTL(code) {
    const lang = this.getLanguage(code);
    return lang?.rtl || false;
  }

  getLanguagesByRegion(region) {
    const regions = {
      india: ['hi', 'ta', 'te', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'],
      middleEast: ['ar', 'ur', 'fa'],
      eastAsia: ['zh', 'ja', 'ko'],
      europe: ['es', 'fr', 'de', 'pt', 'en'],
    };
    return this.languages.filter(l => regions[region]?.includes(l.code));
  }
}

// Export services
const gccService = new GCCService();
const multiLanguageService = new MultiLanguageService();

module.exports = {
  gccService,
  multiLanguageService,
  GCC_CONFIG,
};
