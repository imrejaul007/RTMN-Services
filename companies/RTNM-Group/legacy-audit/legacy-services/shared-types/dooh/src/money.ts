/**
 * DOOH - Money Utilities
 *
 * Handles financial calculations with proper precision to avoid floating-point errors.
 * All money values are stored and processed in the smallest currency unit (cents).
 */

// ============================================================================
// Money Types
// ============================================================================

/**
 * Money in the smallest unit (e.g., cents for INR, cents for USD)
 */
export interface Money {
  amount: number; // Amount in smallest unit (e.g., cents)
  currency: string; // ISO 4217 currency code (e.g., 'INR', 'USD')
}

/**
 * Default currency for DOOH
 */
export const DEFAULT_CURRENCY = 'INR';

/**
 * Number of decimal places for common currencies
 */
export const CURRENCY_DECIMALS: Record<string, number> = {
  INR: 2, // Indian Rupee
  USD: 2, // US Dollar
  EUR: 2, // Euro
  GBP: 2, // British Pound
  JPY: 0, // Japanese Yen (no decimal places)
  CNY: 2, // Chinese Yuan
};

/**
 * Get decimal places for a currency
 */
export function getCurrencyDecimals(currency: string): number {
  return CURRENCY_DECIMALS[currency] ?? 2;
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert a float amount to cents/smallest unit
 * Handles floating-point precision issues
 */
export function toCents(amount: number, currency: string = DEFAULT_CURRENCY): number {
  const decimals = getCurrencyDecimals(currency);
  const multiplier = Math.pow(10, decimals);

  // Round to avoid floating-point errors
  return Math.round(amount * multiplier);
}

/**
 * Convert cents/smallest unit back to float
 */
export function fromCents(cents: number, currency: string = DEFAULT_CURRENCY): number {
  const decimals = getCurrencyDecimals(currency);
  const divisor = Math.pow(10, decimals);

  return cents / divisor;
}

/**
 * Parse a money string like "₹1,234.56" to cents
 */
export function parseMoney(value: string, currency: string = DEFAULT_CURRENCY): Money {
  // Remove currency symbols and formatting
  const cleaned = value
    .replace(/[^0-9.-]/g, '')
    .trim();

  const amount = parseFloat(cleaned);

  if (isNaN(amount)) {
    throw new Error(`Invalid money format: ${value}`);
  }

  return {
    amount: toCents(amount, currency),
    currency,
  };
}

// ============================================================================
// Arithmetic Functions
// ============================================================================

/**
 * Add two money amounts
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add different currencies: ${a.currency} and ${b.currency}`);
  }

  return {
    amount: a.amount + b.amount,
    currency: a.currency,
  };
}

/**
 * Subtract money amounts
 */
export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot subtract different currencies: ${a.currency} and ${b.currency}`);
  }

  return {
    amount: a.amount - b.amount,
    currency: a.currency,
  };
}

/**
 * Multiply money by a factor (e.g., for revenue sharing)
 */
export function multiplyMoney(money: Money, factor: number): Money {
  return {
    amount: Math.round(money.amount * factor),
    currency: money.currency,
  };
}

/**
 * Divide money by a divisor
 */
export function divideMoney(money: Money, divisor: number): Money {
  if (divisor === 0) {
    throw new Error('Cannot divide by zero');
  }

  return {
    amount: Math.round(money.amount / divisor),
    currency: money.currency,
  };
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format money as a display string (e.g., "₹1,234.56")
 */
export function formatMoney(money: Money, options?: Intl.NumberFormatOptions): string {
  const amount = fromCents(money.amount, money.currency);

  const localeMap: Record<string, string> = {
    INR: 'en-IN',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    CNY: 'zh-CN',
  };

  const locale = localeMap[money.currency] ?? 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
    ...options,
  }).format(amount);
}

/**
 * Format money as a compact string (e.g., "₹1.2K", "₹1.5M")
 */
export function formatMoneyCompact(money: Money): string {
  const amount = fromCents(money.amount, money.currency);

  const absAmount = Math.abs(amount);

  if (absAmount >= 10000000) {
    return `${money.currency === 'INR' ? '₹' : money.currency + ' '}${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (absAmount >= 100000) {
    return `${money.currency === 'INR' ? '₹' : money.currency + ' '}${(amount / 100000).toFixed(1)}L`;
  }
  if (absAmount >= 1000) {
    return `${money.currency === 'INR' ? '₹' : money.currency + ' '}${(amount / 1000).toFixed(1)}K`;
  }

  return formatMoney(money);
}

// ============================================================================
// CPM Calculation Utilities
// ============================================================================

/**
 * Calculate cost based on CPM and impressions
 */
export function calculateCPMCost(
  cpm: Money,
  impressions: number
): Money {
  return {
    amount: Math.round((cpm.amount * impressions) / 1000),
    currency: cpm.currency,
  };
}

/**
 * Calculate CPM from cost and impressions
 */
export function calculateCPM(
  cost: Money,
  impressions: number
): Money {
  if (impressions === 0) {
    return { amount: 0, currency: cost.currency };
  }

  return {
    amount: Math.round((cost.amount * 1000) / impressions),
    currency: cost.currency,
  };
}

/**
 * Calculate slot price based on CPM and duration
 */
export function calculateSlotPrice(
  cpm: Money,
  durationSeconds: number,
  avgImpressionsPerSlot: number = 100
): Money {
  // CPM is cost per 1000 impressions for a 30-second slot
  // Adjust for actual duration
  const baseCPM = cpm.amount;
  const adjustedCPM = Math.round((baseCPM * durationSeconds) / 30);

  return {
    amount: Math.round((adjustedCPM * avgImpressionsPerSlot) / 1000),
    currency: cpm.currency,
  };
}

// ============================================================================
// Revenue Share Utilities
// ============================================================================

/**
 * Calculate revenue share split
 */
export function calculateRevenueShare(
  totalRevenue: Money,
  screenOwnerPercent: number,
  platformPercent: number,
  contentProviderPercent?: number
): {
  screenOwner: Money;
  platform: Money;
  contentProvider?: Money;
  remainder: Money;
} {
  // Ensure percentages sum to 100
  const totalPercent = screenOwnerPercent + platformPercent + (contentProviderPercent ?? 0);

  if (totalPercent > 100) {
    throw new Error('Revenue share percentages exceed 100%');
  }

  const screenOwner = multiplyMoney(totalRevenue, screenOwnerPercent / 100);
  const platform = multiplyMoney(totalRevenue, platformPercent / 100);

  const result: {
    screenOwner: Money;
    platform: Money;
    contentProvider?: Money;
    remainder: Money;
  } = {
    screenOwner,
    platform,
    remainder: { amount: 0, currency: totalRevenue.currency },
  };

  if (contentProviderPercent !== undefined) {
    result.contentProvider = multiplyMoney(totalRevenue, contentProviderPercent / 100);
    result.remainder = {
      amount: totalRevenue.amount - screenOwner.amount - platform.amount - (result.contentProvider?.amount ?? 0),
      currency: totalRevenue.currency,
    };
  } else {
    result.remainder = {
      amount: totalRevenue.amount - screenOwner.amount - platform.amount,
      currency: totalRevenue.currency,
    };
  }

  return result;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that a money amount is positive
 */
export function isPositiveMoney(money: Money): boolean {
  return money.amount > 0;
}

/**
 * Validate that a money amount is non-negative
 */
export function isNonNegativeMoney(money: Money): boolean {
  return money.amount >= 0;
}

/**
 * Assert that a money amount is valid
 */
export function assertValidMoney(money: Money): void {
  if (!Number.isFinite(money.amount)) {
    throw new Error(`Invalid money amount: ${money.amount}`);
  }

  if (!CURRENCY_DECIMALS[money.currency]) {
    console.warn(`Unknown currency: ${money.currency}`);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a Money object from a float amount
 */
export function money(
  amount: number,
  currency: string = DEFAULT_CURRENCY
): Money {
  return {
    amount: toCents(amount, currency),
    currency,
  };
}

/**
 * Create a Money object from cents
 */
export function moneyFromCents(
  amount: number,
  currency: string = DEFAULT_CURRENCY
): Money {
  return {
    amount,
    currency,
  };
}

/**
 * Zero money
 */
export function zeroMoney(currency: string = DEFAULT_CURRENCY): Money {
  return {
    amount: 0,
    currency,
  };
}
