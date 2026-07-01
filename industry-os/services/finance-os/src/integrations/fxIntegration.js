/**
 * FX Integration - Live foreign exchange rates
 *
 * Supports:
 * - Open Exchange Rates API
 * - Fixer.io
 * - Mock rates for development
 */

const FX_PROVIDER = process.env.FX_PROVIDER || 'mock';
const FX_API_KEY = process.env.FX_API_KEY || '';

// Base currency for conversions
const BASE_CURRENCY = 'INR';

// Exchange rates cache
let ratesCache = {
  rates: null,
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5 minutes
};

// Mock rates (updated periodically)
const MOCK_RATES = {
  INR_USD: 0.01198,  // 1 INR = 0.012 USD
  USD_INR: 83.50,
  INR_EUR: 0.01104,
  EUR_INR: 90.58,
  INR_GBP: 0.00944,
  GBP_INR: 105.96,
  INR_AED: 0.0440,
  AED_INR: 22.73,
  INR_SGD: 0.01612,
  SGD_INR: 62.04,
  INR_SAR: 0.0449,
  SAR_INR: 22.27,
  USD_EUR: 0.9215,
  EUR_USD: 1.0852,
  USD_GBP: 0.7880,
  GBP_USD: 1.2690,
  USD_AED: 3.6725,
  USD_SAR: 3.7505
};

/**
 * Get exchange rate between two currencies
 */
async function getRate(from, to) {
  if (from === to) return 1;

  const pair = `${from}_${to}`;
  const reversePair = `${to}_${from}`;

  // Check cache
  if (ratesCache.rates &&
      Date.now() - ratesCache.timestamp < ratesCache.ttl) {
    const rate = ratesCache.rates[pair] || 1 / ratesCache.rates[reversePair];
    return rate || await fetchRate(from, to);
  }

  // Try to get from provider
  const rate = await fetchRate(from, to);
  if (rate) {
    // Update cache
    ratesCache.rates = { ...ratesCache.rates, [pair]: rate };
    ratesCache.timestamp = Date.now();
    return rate;
  }

  // Fallback to mock rates
  return MOCK_RATES[pair] || 1 / MOCK_RATES[reversePair] || 1;
}

/**
 * Fetch rate from provider
 */
async function fetchRate(from, to) {
  switch (FX_PROVIDER) {
    case 'openexchangerates':
      return await fetchFromOpenExchangeRates(from, to);
    case 'fixer':
      return await fetchFromFixer(from, to);
    default:
      return null;
  }
}

/**
 * Open Exchange Rates API
 */
async function fetchFromOpenExchangeRates(from, to) {
  if (!FX_API_KEY) return null;

  try {
    const res = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${FX_API_KEY}&base=${from}`
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data.rates?.[to] || null;
  } catch {
    return null;
  }
}

/**
 * Fixer.io API
 */
async function fetchFromFixer(from, to) {
  if (!FX_API_KEY) return null;

  try {
    const res = await fetch(
      `http://data.fixer.io/api/latest?access_key=${FX_API_KEY}&base=${from}&symbols=${to}`
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data.rates?.[to] || null;
  } catch {
    return null;
  }
}

/**
 * Convert amount between currencies
 */
async function convert(amount, from, to) {
  const rate = await getRate(from, to);
  return {
    from,
    to,
    rate,
    originalAmount: amount,
    convertedAmount: Math.round(amount * rate * 100) / 100,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get all available rates
 */
async function getAllRates(base = BASE_CURRENCY) {
  const currencies = ['USD', 'EUR', 'GBP', 'AED', 'SGD', 'SAR'];

  if (FX_PROVIDER !== 'mock') {
    const rate = await getRate(base, 'USD');
    if (rate) {
      const baseRates = { [base]: 1 };
      currencies.forEach(c => {
        if (c !== base) {
          baseRates[c] = MOCK_RATES[`${base}_${c}`] || rate;
        }
      });
      return baseRates;
    }
  }

  // Return mock rates relative to base
  const rates = { [base]: 1 };
  currencies.forEach(c => {
    if (c !== base) {
      rates[c] = MOCK_RATES[`${base}_${c}`] || 1;
    }
  });

  return rates;
}

/**
 * Calculate forward rate for hedging
 */
async function getForwardRate(from, to, days = 90) {
  const spotRate = await getRate(from, to);

  // Simplified forward calculation
  // In production, would use interest rate differential
  const forwardPoints = (days / 365) * 0.02; // 2% annualized premium
  const forwardRate = spotRate * (1 + forwardPoints);

  return {
    from,
    to,
    spotRate,
    forwardRate: Math.round(forwardRate * 10000) / 10000,
    points: Math.round(forwardPoints * 10000) / 10000,
    tenorDays: days,
    validUntil: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
  };
}

/**
 * Get historical rate
 */
async function getHistoricalRate(from, to, date) {
  // In production, would fetch from provider's historical endpoint
  // For now, return current rate
  return {
    from,
    to,
    date: date.toISOString().split('T')[0],
    rate: await getRate(from, to),
    source: 'current_rate_fallback'
  };
}

/**
 * Health check
 */
async function healthCheck() {
  if (FX_PROVIDER === 'mock') {
    return {
      healthy: true,
      provider: 'mock',
      rates: Object.keys(MOCK_RATES).length,
      cached: !!ratesCache.rates
    };
  }

  const rate = await getRate('USD', 'INR');
  return {
    healthy: !!rate,
    provider: FX_PROVIDER,
    baseRate: `${FX_PROVIDER !== 'mock' ? FX_PROVIDER : 'mock'}: USD/INR = ${rate?.toFixed(4) || 'N/A'}`
  };
}

module.exports = {
  getRate,
  convert,
  getAllRates,
  getForwardRate,
  getHistoricalRate,
  healthCheck,
  MOCK_RATES
};
