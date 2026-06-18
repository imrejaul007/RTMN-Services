/**
 * Utility functions for Revenue Intelligence OS
 */

/**
 * Format currency
 */
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with abbreviation
 */
export function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format percentage
 */
export function formatPercent(value, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calculate compound growth rate
 */
export function calculateCAGR(startValue, endValue, years) {
  if (startValue === 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

/**
 * Calculate moving average
 */
export function calculateMA(values, window = 3) {
  const result = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

/**
 * Calculate standard deviation
 */
export function calculateStdDev(values) {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Detect anomaly using z-score
 */
export function detectAnomaly(value, values, threshold = 3) {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = calculateStdDev(values);

  if (stdDev === 0) return false;
  const zScore = Math.abs((value - avg) / stdDev);
  return zScore > threshold;
}

/**
 * Linear regression for trend
 */
export function linearRegression(values) {
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Forecast using linear regression
 */
export function linearForecast(values, periods = 3) {
  const regression = linearRegression(values);
  const forecasts = [];

  for (let i = 0; i < periods; i++) {
    forecasts.push({
      period: i + 1,
      value: regression.slope * (values.length + i) + regression.intercept,
    });
  }

  return forecasts;
}

/**
 * Calculate confidence interval
 */
export function confidenceInterval(value, confidence, stdDev) {
  const zScores = { 90: 1.645, 95: 1.96, 99: 2.576 };
  const z = zScores[confidence] || 1.96;
  const margin = z * stdDev;

  return {
    low: value - margin,
    high: value + margin,
  };
}

/**
 * Generate date range
 */
export function dateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }

  return dates;
}

/**
 * Get quarter from date
 */
export function getQuarter(date) {
  const month = date.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter}-${date.getFullYear()}`;
}

/**
 * Get days between dates
 */
export function daysBetween(start, end) {
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Round to nearest increment
 */
export function roundTo(value, increment) {
  return Math.round(value / increment) * increment;
}

/**
 * Clamp value between min and max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Group array by key
 */
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
}

/**
 * Sort array by multiple keys
 */
export function sortBy(array, ...keys) {
  return array.sort((a, b) => {
    for (const key of keys) {
      if (a[key] < b[key]) return -1;
      if (a[key] > b[key]) return 1;
    }
    return 0;
  });
}

/**
 * Calculate weighted average
 */
export function weightedAverage(values, weights) {
  const sum = values.reduce((acc, v, i) => acc + v * weights[i], 0);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  return sum / weightSum;
}

/**
 * Generate UUID
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Validate email
 */
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Sanitize string for safe display
 */
export function sanitize(str) {
  return str.replace(/[<>]/g, '');
}

/**
 * Parse date string to ISO format
 */
export function parseDate(dateStr) {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

export default {
  formatCurrency,
  formatNumber,
  formatPercent,
  calculateCAGR,
  calculateMA,
  calculateStdDev,
  detectAnomaly,
  linearRegression,
  linearForecast,
  confidenceInterval,
  dateRange,
  getQuarter,
  daysBetween,
  roundTo,
  clamp,
  deepClone,
  groupBy,
  sortBy,
  weightedAverage,
  generateUUID,
  isValidEmail,
  sanitize,
  parseDate,
};
