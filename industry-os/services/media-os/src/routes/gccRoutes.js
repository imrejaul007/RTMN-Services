/**
 * Media OS - GCC & Multi-language Routes
 * Gulf region support and localization
 */

const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware');
const { gccService, multiLanguageService } = require('../services/GCCService');
const logger = require('../config/database');

// ============================================
// GCC COUNTRIES
// ============================================

// Get all GCC countries
router.get('/countries', optionalAuth, (req, res) => {
  const countries = gccService.getAllCountries();
  res.json({ success: true, countries, count: countries.length });
});

// Get country details
router.get('/countries/:code', optionalAuth, (req, res) => {
  const country = gccService.getCountry(req.params.code.toUpperCase());
  if (!country) {
    return res.status(404).json({ success: false, error: 'Country not found' });
  }

  const regulations = gccService.getRegulations(req.params.code.toUpperCase());
  res.json({ success: true, country: { code: req.params.code, ...country }, regulations });
});

// ============================================
// CURRENCY & PRICING
// ============================================

// Get supported currencies
router.get('/currencies', optionalAuth, (req, res) => {
  const currencies = Object.entries(gccService.config.countries).map(([code, country]) => ({
    code,
    currency: country.currency,
    country: country.name,
    exchangeToUSD: gccService.config.exchangeRates[country.currency]?.USD,
  }));

  res.json({ success: true, currencies, count: currencies.length });
});

// Convert currency
router.post('/convert', optionalAuth, (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;

    const converted = gccService.convertCurrency(amount, fromCurrency, toCurrency);

    res.json({
      success: true,
      original: { amount, currency: fromCurrency },
      converted: { amount: converted, currency: toCurrency },
    });
  } catch (error) {
    logger.error('Currency conversion failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Conversion failed' });
  }
});

// Calculate price with tax
router.post('/price', optionalAuth, (req, res) => {
  try {
    const { basePrice, countryCode } = req.body;

    const pricing = gccService.calculatePrice(basePrice, countryCode.toUpperCase());

    res.json({ success: true, pricing });
  } catch (error) {
    logger.error('Price calculation failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Price calculation failed' });
  }
});

// ============================================
// CONTENT COMPLIANCE
// ============================================

// Check content compliance for GCC
router.post('/compliance', authenticate, (req, res) => {
  try {
    const { content, countryCode } = req.body;

    const compliance = gccService.checkContentCompliance(content, countryCode.toUpperCase());

    res.json({ success: true, compliance });
  } catch (error) {
    logger.error('Compliance check failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Compliance check failed' });
  }
});

// Get content rules for country
router.get('/rules/:countryCode', optionalAuth, (req, res) => {
  const rules = gccService.getContentRules(req.params.countryCode.toUpperCase());
  res.json({ success: true, rules });
});

// ============================================
// PAYMENT METHODS
// ============================================

// Get payment methods for country
router.get('/payments/:countryCode', optionalAuth, (req, res) => {
  const methods = gccService.getPaymentMethods(req.params.countryCode.toUpperCase());
  res.json({ success: true, methods, country: req.params.countryCode });
});

// ============================================
// LOCALIZATION
// ============================================

// Get all supported languages
router.get('/languages', optionalAuth, (req, res) => {
  const languages = multiLanguageService.getAllLanguages();
  res.json({ success: true, languages, count: languages.length });
});

// Get language details
router.get('/languages/:code', optionalAuth, (req, res) => {
  const language = multiLanguageService.getLanguage(req.params.code);
  if (!language) {
    return res.status(404).json({ success: false, error: 'Language not found' });
  }
  res.json({ success: true, language });
});

// Get languages by region
router.get('/languages/region/:region', optionalAuth, (req, res) => {
  const languages = multiLanguageService.getLanguagesByRegion(req.params.region.toLowerCase());
  res.json({ success: true, languages, region: req.params.region });
});

// Check if language is RTL
router.get('/rtl/:code', optionalAuth, (req, res) => {
  const isRTL = multiLanguageService.isRTL(req.params.code);
  res.json({ success: true, code: req.params.code, isRTL });
});

// ============================================
// RTL CONTENT
// ============================================

// Prepare content for RTL display
router.post('/rtl', authenticate, (req, res) => {
  try {
    const { content, countryCode } = req.body;

    const rtlContent = gccService.prepareRTLContent(content, countryCode.toUpperCase());

    res.json({ success: true, content: rtlContent });
  } catch (error) {
    logger.error('RTL preparation failed', { error: error.message });
    res.status(500).json({ success: false, error: 'RTL preparation failed' });
  }
});

// ============================================
// SUBSCRIPTION PLANS (GCC PRICING)
// ============================================

// Get plans for GCC country
router.get('/plans/:countryCode', optionalAuth, async (req, res) => {
  try {
    const { Plan } = require('../models');

    const plans = await Plan.findActive();
    const country = gccService.getCountry(req.params.countryCode.toUpperCase());

    if (!country) {
      return res.status(404).json({ success: false, error: 'Country not found' });
    }

    // Convert prices to local currency
    const localPlans = plans.map(plan => {
      const monthlyInLocal = gccService.convertCurrency(
        plan.pricing.monthly,
        'INR',
        country.currency
      );

      const yearlyInLocal = gccService.convertCurrency(
        plan.pricing.yearly,
        'INR',
        country.currency
      );

      const monthlyWithTax = gccService.calculatePrice(monthlyInLocal, req.params.countryCode.toUpperCase());
      const yearlyWithTax = gccService.calculatePrice(yearlyInLocal, req.params.countryCode.toUpperCase());

      return {
        ...plan.toObject(),
        localPricing: {
          currency: country.currency,
          monthly: monthlyWithTax,
          yearly: yearlyWithTax,
        },
      };
    });

    res.json({ success: true, plans: localPlans, country });
  } catch (error) {
    logger.error('Failed to fetch GCC plans', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch plans' });
  }
});

// ============================================
// REGULATIONS
// ============================================

// Get complete regulations for country
router.get('/regulations/:countryCode', optionalAuth, (req, res) => {
  try {
    const regulations = gccService.getRegulations(req.params.countryCode.toUpperCase());
    res.json({ success: true, regulations });
  } catch (error) {
    logger.error('Failed to get regulations', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get regulations' });
  }
});

// ============================================
// TRANSLATION HELPERS
// ============================================

// Get UI translations for language
router.get('/translations/:lang', optionalAuth, (req, res) => {
  try {
    const { lang } = req.params;

    // Base translations (would come from a translation service in production)
    const translations = {
      en: {
        welcome: 'Welcome',
        subscribe: 'Subscribe',
        watch: 'Watch',
        search: 'Search',
        profile: 'Profile',
        settings: 'Settings',
      },
      ar: {
        welcome: 'مرحبا',
        subscribe: 'اشترك',
        watch: 'مشاهدة',
        search: 'بحث',
        profile: 'الملف الشخصي',
        settings: 'الإعدادات',
      },
      hi: {
        welcome: 'स्वागत',
        subscribe: 'सदस्यता लें',
        watch: 'देखें',
        search: 'खोजें',
        profile: 'प्रोफ़ाइल',
        settings: 'सेटिंग्स',
      },
    };

    const langTranslations = translations[lang] || translations.en;

    res.json({
      success: true,
      language: lang,
      direction: multiLanguageService.isRTL(lang) ? 'rtl' : 'ltr',
      translations: langTranslations,
    });
  } catch (error) {
    logger.error('Failed to get translations', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get translations' });
  }
});

module.exports = router;
