/**
 * HOJAI SiteOS i18n Service
 * Port: 5491
 * Translations, RTL support, locale management
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const app = express();
const PORT = process.env.PORT || 5491;
const STORAGE_PATH = process.env.STORAGE_PATH || '/tmp';

app.use(helmet());
app.use(cors());
app.use(express.json());

const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
  if (!apiKey) return res.status(401).json({ error: 'API key required' });
  req.companyId = req.headers['x-company-id'] || 'default';
  next();
};

const getFile = (companyId, type) => `${STORAGE_PATH}/i18n-${type}-${companyId}.json`;
const loadData = (companyId, type) => {
  const file = getFile(companyId, type);
  if (existsSync(file)) {
    try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return {}; }
  }
  return {};
};
const saveData = (companyId, type, data) => {
  writeFileSync(getFile(companyId, type), JSON.stringify(data, null, 2));
};

// Supported locales
const LOCALES = {
  en: { name: 'English', nativeName: 'English', rtl: false, flag: '🇺🇸' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', rtl: false, flag: '🇮🇳' },
  ar: { name: 'Arabic', nativeName: 'العربية', rtl: true, flag: '🇸🇦' },
  zh: { name: 'Chinese', nativeName: '中文', rtl: false, flag: '🇨🇳' },
  es: { name: 'Spanish', nativeName: 'Español', rtl: false, flag: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', rtl: false, flag: '🇫🇷' },
  de: { name: 'German', nativeName: 'Deutsch', rtl: false, flag: '🇩🇪' },
  pt: { name: 'Portuguese', nativeName: 'Português', rtl: false, flag: '🇧🇷' },
  ru: { name: 'Russian', nativeName: 'Русский', rtl: false, flag: '🇷🇺' },
  ja: { name: 'Japanese', nativeName: '日本語', rtl: false, flag: '🇯🇵' },
  ko: { name: 'Korean', nativeName: '한국어', rtl: false, flag: '🇰🇷' },
  th: { name: 'Thai', nativeName: 'ไทย', rtl: false, flag: '🇹🇭' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', rtl: false, flag: '🇻🇳' },
  id: { name: 'Indonesian', nativeName: 'Bahasa', rtl: false, flag: '🇮🇩' },
  tr: { name: 'Turkish', nativeName: 'Türkçe', rtl: false, flag: '🇹🇷' },
  he: { name: 'Hebrew', nativeName: 'עברית', rtl: true, flag: '🇮🇱' }
};

// Default translations
const DEFAULT_TRANSLATIONS = {
  en: {
    common: { save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', add: 'Add', search: 'Search', loading: 'Loading...' },
    ecommerce: { cart: 'Cart', checkout: 'Checkout', buy: 'Buy Now', price: 'Price', quantity: 'Quantity', total: 'Total' },
    auth: { login: 'Login', logout: 'Logout', register: 'Register', forgotPassword: 'Forgot Password?' },
    messages: { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info' }
  }
};

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'i18n-service', port: PORT });
});

// Get available locales
app.get('/api/locales', (req, res) => {
  res.json({ locales: Object.entries(LOCALES).map(([code, info]) => ({ code, ...info })) });
});

// Get translations for a locale
app.get('/api/translations/:locale', requireAuth, (req, res) => {
  const { locale } = req.params;
  const { namespace = 'common' } = req.query;

  if (!LOCALES[locale]) {
    return res.status(404).json({ error: 'Locale not found' });
  }

  const translations = loadData(req.companyId, 'translations');
  const localeTranslations = translations[locale] || {};
  const defaults = DEFAULT_TRANSLATIONS[locale] || {};

  const nsTranslations = localeTranslations[namespace] || {};
  const nsDefaults = defaults[namespace] || {};

  res.json({
    locale,
    namespace,
    translations: { ...nsDefaults, ...nsTranslations },
    rtl: LOCALES[locale].rtl
  });
});

// Get all namespaces for a locale
app.get('/api/translations', requireAuth, (req, res) => {
  const { locale } = req.query;

  if (locale) {
    if (!LOCALES[locale]) {
      return res.status(404).json({ error: 'Locale not found' });
    }

    const translations = loadData(req.companyId, 'translations');
    const defaults = DEFAULT_TRANSLATIONS[locale] || {};
    const custom = translations[locale] || {};

    res.json({
      locale,
      namespaces: Object.keys({ ...defaults, ...custom }),
      rtl: LOCALES[locale].rtl
    });
  } else {
    const translations = loadData(req.companyId, 'translations');
    res.json({
      locales: Object.keys(translations),
      available: LOCALES
    });
  }
});

// Set translations
app.post('/api/translations/:locale', requireAuth, (req, res) => {
  const { locale } = req.params;
  const { namespace = 'common', key, value } = req.body;

  if (!LOCALES[locale]) {
    return res.status(404).json({ error: 'Locale not found' });
  }

  if (!key) {
    return res.status(400).json({ error: 'key required' });
  }

  const translations = loadData(req.companyId, 'translations');
  translations[locale] = translations[locale] || {};
  translations[locale][namespace] = translations[locale][namespace] || {};
  translations[locale][namespace][key] = value;

  saveData(req.companyId, 'translations', translations);

  res.json({ success: true, locale, namespace, key, value });
});

// Bulk set translations
app.post('/api/translations/:locale/bulk', requireAuth, (req, res) => {
  const { locale } = req.params;
  const { namespace = 'common', translations } = req.body;

  if (!LOCALES[locale]) {
    return res.status(404).json({ error: 'Locale not found' });
  }

  if (!translations || typeof translations !== 'object') {
    return res.status(400).json({ error: 'translations object required' });
  }

  const data = loadData(req.companyId, 'translations');
  data[locale] = data[locale] || {};
  data[locale][namespace] = { ...data[locale][namespace], ...translations };

  saveData(req.companyId, 'translations', data);

  res.json({ success: true, count: Object.keys(translations).length });
});

// Check RTL support
app.get('/api/rtl/:locale', (req, res) => {
  const { locale } = req.params;

  if (!LOCALES[locale]) {
    return res.status(404).json({ error: 'Locale not found' });
  }

  res.json({
    locale,
    rtl: LOCALES[locale].rtl,
    direction: LOCALES[locale].rtl ? 'rtl' : 'ltr'
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`i18n Service running on port ${PORT}`);
});

export default app;
