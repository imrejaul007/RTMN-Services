/**
 * HOJAI SiteOS Multi-Currency Service
 * Port: 5490
 * Currency conversion, formatting, exchange rates
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const app = express();
const PORT = process.env.PORT || 5490;
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

// Exchange rates (base: USD)
const EXCHANGE_RATES = {
  USD: 1,
  INR: 83.12,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SAR: 3.75,
  SGD: 1.34,
  AUD: 1.53,
  CAD: 1.36,
  JPY: 149.50
};

const CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE', rtl: true },
  SAR: { symbol: '﷼', name: 'Saudi Riyal', locale: 'ar-SA', rtl: true },
  SGD: { symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  JPY: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', decimals: 0 }
};

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'multi-currency', port: PORT });
});

// Get supported currencies
app.get('/api/currencies', (req, res) => {
  res.json({
    currencies: Object.entries(CURRENCIES).map(([code, info]) => ({
      code,
      ...info,
      rate: EXCHANGE_RATES[code]
    }))
  });
});

// Get exchange rates
app.get('/api/rates', (req, res) => {
  const { base = 'USD' } = req.query;
  const baseRate = EXCHANGE_RATES[base] || 1;

  res.json({
    base,
    timestamp: new Date().toISOString(),
    rates: Object.fromEntries(
      Object.entries(EXCHANGE_RATES).map(([code, rate]) => [code, rate / baseRate])
    )
  });
});

// Convert currency
app.post('/api/convert', requireAuth, (req, res) => {
  const { amount, from, to } = req.body;

  if (!amount || !from || !to) {
    return res.status(400).json({ error: 'amount, from, to required' });
  }

  if (!EXCHANGE_RATES[from] || !EXCHANGE_RATES[to]) {
    return res.status(400).json({ error: 'Unsupported currency' });
  }

  const inUSD = amount / EXCHANGE_RATES[from];
  const converted = inUSD * EXCHANGE_RATES[to];

  res.json({
    original: { amount, currency: from },
    converted: {
      amount: Math.round(converted * 100) / 100,
      currency: to
    },
    rate: EXCHANGE_RATES[to] / EXCHANGE_RATES[from]
  });
});

// Format currency
app.post('/api/format', requireAuth, (req, res) => {
  const { amount, currency = 'USD', locale } = req.body;

  if (amount === undefined) {
    return res.status(400).json({ error: 'amount required' });
  }

  const info = CURRENCIES[currency] || CURRENCIES.USD;
  const useLocale = locale || info.locale;
  const decimals = info.decimals !== undefined ? info.decimals : 2;

  try {
    const formatted = new Intl.NumberFormat(useLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);

    res.json({
      amount,
      currency,
      formatted,
      symbol: info.symbol,
      locale: useLocale,
      rtl: info.rtl || false
    });
  } catch (err) {
    res.status(500).json({ error: 'Formatting failed', details: err.message });
  }
});

// Auto-detect currency from locale/IP
app.get('/api/detect', requireAuth, (req, res) => {
  const { ip, locale } = req.query;

  // Map common locales to currencies
  const localeMap = {
    'IN': 'INR', 'US': 'USD', 'GB': 'GBP', 'DE': 'EUR', 'FR': 'EUR',
    'AE': 'AED', 'SA': 'SAR', 'SG': 'SGD', 'AU': 'AUD', 'CA': 'CAD', 'JP': 'JPY'
  };

  let detected = 'USD';
  if (locale) {
    const country = locale.split('-')[1] || locale.split('_')[1];
    if (country && localeMap[country]) {
      detected = localeMap[country];
    }
  }

  res.json({
    detected,
    currency: CURRENCIES[detected],
    rate: EXCHANGE_RATES[detected]
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Multi-Currency Service running on port ${PORT}`);
});

export default app;
