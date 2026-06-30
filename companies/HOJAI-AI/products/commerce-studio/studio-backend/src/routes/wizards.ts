/**
 * Wizards Routes
 * Static wizard configuration data (lists of options)
 */

import { Router } from 'express';

const router = Router();

// GET /api/studio/wizards/commerce-modules - List all commerce modules
router.get('/commerce-modules', (req, res) => {
  res.json({
    modules: [
      {
        id: 'catalog',
        name: 'Catalog',
        description: 'Product/service management',
        category: 'core',
        required: true,
      },
      {
        id: 'inventory',
        name: 'Inventory',
        description: 'Stock tracking and reorder',
        category: 'core',
      },
      {
        id: 'order',
        name: 'Order',
        description: 'Order processing',
        category: 'core',
        required: true,
      },
      {
        id: 'checkout',
        name: 'Checkout',
        description: 'Payment and address collection',
        category: 'core',
        required: true,
      },
      {
        id: 'pricing',
        name: 'Pricing',
        description: 'Dynamic pricing strategies',
        category: 'core',
        required: true,
      },
      {
        id: 'promotion',
        name: 'Promotions',
        description: 'Discounts, coupons, bundles',
        category: 'marketing',
      },
      {
        id: 'loyalty',
        name: 'Loyalty',
        description: 'Points, tiers, rewards',
        category: 'marketing',
      },
      {
        id: 'recommendation',
        name: 'Recommendations',
        description: 'AI-powered product suggestions',
        category: 'marketing',
        tier: 'advanced',
      },
      {
        id: 'subscription',
        name: 'Subscription',
        description: 'Recurring billing and plans',
        category: 'advanced',
      },
    ],
    timestamp: new Date().toISOString(),
  });
});

// GET /api/studio/wizards/pricing-strategies
router.get('/pricing-strategies', (req, res) => {
  res.json({
    strategies: [
      {
        id: 'fixed',
        name: 'Fixed Pricing',
        description: 'Same price for everyone',
        useCase: 'Retail stores, simple products',
      },
      {
        id: 'dynamic',
        name: 'Dynamic Pricing',
        description: 'Price changes based on demand, time, inventory',
        useCase: 'Restaurants, hot commodities',
      },
      {
        id: 'competitive',
        name: 'Competitive Pricing',
        description: 'Match or beat competitor prices',
        useCase: 'Electronics, retail',
      },
      {
        id: 'seasonal',
        name: 'Seasonal Pricing',
        description: 'Change based on season/fashion trends',
        useCase: 'Fashion, hospitality',
      },
      {
        id: 'tier-based',
        name: 'Tier-Based Pricing',
        description: 'Different prices for different customer tiers',
        useCase: 'SaaS, premium services',
      },
      {
        id: 'volume',
        name: 'Volume Discount',
        description: 'Bulk discounts for large orders',
        useCase: 'B2B, wholesale',
      },
    ],
    timestamp: new Date().toISOString(),
  });
});

// GET /api/studio/wizards/payment-methods
router.get('/payment-methods', (req, res) => {
  res.json({
    india: ['UPI', 'cards', 'wallets', 'netbanking', 'cash', 'BNPL', 'EMI'],
    uae: ['cards', 'bank-transfer', 'wallets', 'BNPL'],
    global: ['cards', 'bank-transfer', 'wallets', 'crypto'],
    all: ['UPI', 'cards', 'wallets', 'netbanking', 'bank-transfer', 'cash', 'BNPL', 'EMI', 'crypto'],
  });
});

// GET /api/studio/wizards/settlement-terms
router.get('/settlement-terms', (req, res) => {
  res.json({
    terms: [
      { value: 'instant', name: 'Instant', description: 'Settlement within seconds' },
      { value: 'T+1', name: 'T+1', description: 'Next business day' },
      { value: 'T+2', name: 'T+2', description: 'Two business days' },
      { value: 'daily', name: 'Daily', description: 'End-of-day' },
      { value: 'weekly', name: 'Weekly', description: 'Every Monday' },
      { value: 'monthly', name: 'Monthly', description: 'End of month' },
    ],
  });
});

// GET /api/studio/wizards/regions
router.get('/regions', (req, res) => {
  res.json({
    regions: [
      { code: 'IN', name: 'India', defaultLanguage: 'en', currency: 'INR' },
      { code: 'UAE', name: 'UAE', defaultLanguage: 'ar', currency: 'AED' },
      { code: 'UK', name: 'United Kingdom', defaultLanguage: 'en', currency: 'GBP' },
      { code: 'US', name: 'United States', defaultLanguage: 'en', currency: 'USD' },
      { code: 'SA', name: 'Saudi Arabia', defaultLanguage: 'ar', currency: 'SAR' },
      { code: 'TH', name: 'Thailand', defaultLanguage: 'th', currency: 'THB' },
      { code: 'ID', name: 'Indonesia', defaultLanguage: 'id', currency: 'IDR' },
      { code: 'global', name: 'Global', defaultLanguage: 'en', currency: 'multi' },
    ],
  });
});

// GET /api/studio/wizards/currencies
router.get('/currencies', (req, res) => {
  res.json({
    currencies: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'SGD', 'THB', 'IDR', 'JPY', 'CNY', 'AUD', 'CAD'],
  });
});

// GET /api/studio/wizards/languages
router.get('/languages', (req, res) => {
  res.json({
    languages: [
      { code: 'en', name: 'English' },
      { code: 'hi', name: 'Hindi' },
      { code: 'ar', name: 'Arabic' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ja', name: 'Japanese' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'tr', name: 'Turkish' },
    ],
  });
});

// GET /api/studio/wizards/trust-requirements
router.get('/trust-requirements', (req, res) => {
  res.json({
    universal: ['kyb', 'bank-account', 'tax-id'],
    industrySpecific: {
      restaurant: ['fssai-license', 'gst-registration'],
      hotel: ['hotel-license', 'fire-safety-cert'],
      healthcare: ['medical-license', 'nabh-accreditation'],
      finance: ['rbi-registration', 'irda-license'],
      government: ['government-registration', 'gem-portal-registration'],
      real_estate: ['rera-registration'],
      education: ['ugc-recognized'],
    },
  });
});

export default router;
