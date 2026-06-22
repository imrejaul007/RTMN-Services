export interface NBFCPartnerConfig {
  name: string;
  apiUrl: string;
  apiKey: string;
  enabled: boolean;
  endpoints: {
    disbursement: string;
    status: string;
    health?: string;
  };
  headers?: Record<string, string>;
  webhookSecret?: string;
  timeout: number;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function getRequiredEnv(envVar: string, partnerId: string, field: string): string {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`Missing required environment variable ${envVar} for partner ${partnerId}. ${field} is required.`);
  }
  return value;
}

function getRequiredUrl(envVar: string, partnerId: string): string {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`Missing required environment variable ${envVar} for partner ${partnerId}. API URL is required.`);
  }
  // Validate URL format
  try {
    new URL(value);
  } catch {
    throw new Error(`Invalid URL format for ${envVar} for partner ${partnerId}: ${value}`);
  }
  return value;
}

export const nbfcPartners: Record<string, NBFCPartnerConfig> = {
  capital_float: {
    name: 'Capital Float',
    apiUrl: getRequiredUrl('CAPITAL_FLOAT_API_URL', 'capital_float'),
    apiKey: getRequiredEnv('CAPITAL_FLOAT_API_KEY', 'capital_float', 'API Key'),
    enabled: process.env.CAPITAL_FLOAT_ENABLED === 'true',
    endpoints: {
      disbursement: '/disbursements',
      status: '/disbursements/{ref}',
      health: '/health',
    },
    headers: {
      'X-Api-Version': '2.0',
    },
    webhookSecret: process.env.CAPITAL_FLOAT_WEBHOOK_SECRET,
    timeout: 30000,
  },
  pinelabs: {
    name: 'PineLabs',
    apiUrl: getRequiredUrl('PINELABS_API_URL', 'pinelabs'),
    apiKey: getRequiredEnv('PINELABS_API_KEY', 'pinelabs', 'API Key'),
    enabled: process.env.PINELABS_ENABLED === 'true',
    endpoints: {
      disbursement: '/merchant/advances',
      status: '/merchant/advances/{ref}',
      health: '/status',
    },
    headers: {
      'X-Merchant-Id': getRequiredEnv('PINELABS_MERCHANT_ID', 'pinelabs', 'Merchant ID'),
    },
    webhookSecret: process.env.PINELABS_WEBHOOK_SECRET,
    timeout: 30000,
  },
  indifi: {
    name: 'Indifi',
    apiUrl: getRequiredUrl('INDIFI_API_URL', 'indifi'),
    apiKey: getRequiredEnv('INDIFI_API_KEY', 'indifi', 'API Key'),
    enabled: process.env.INDIFI_ENABLED === 'true',
    endpoints: {
      disbursement: '/loans',
      status: '/loans/{ref}',
      health: '/health',
    },
    headers: {
      'X-Client-Id': getRequiredEnv('INDIFI_CLIENT_ID', 'indifi', 'Client ID'),
    },
    webhookSecret: process.env.INDIFI_WEBHOOK_SECRET,
    timeout: 30000,
  },
  lending_kart: {
    name: 'LendingKart',
    apiUrl: getRequiredUrl('LENDINGKART_API_URL', 'lending_kart'),
    apiKey: getRequiredEnv('LENDINGKART_API_KEY', 'lending_kart', 'API Key'),
    enabled: process.env.LENDINGKART_ENABLED === 'true',
    endpoints: {
      disbursement: '/disbursements/initiate',
      status: '/disbursements/{ref}/status',
      health: '/ping',
    },
    headers: {
      'X-Platform': 'ReZ-Capital',
    },
    webhookSecret: process.env.LENDINGKART_WEBHOOK_SECRET,
    timeout: 30000,
  },
};

// Partner selection strategy
export interface PartnerStrategy {
  type: 'round_robin' | 'lowest_rate' | 'availability' | 'affinity';
  fallbackPartners: string[];
}

export const defaultStrategy: PartnerStrategy = {
  type: 'availability',
  fallbackPartners: ['capital_float', 'pinelabs'],
};

// Interest rate caps by partner (for comparison)
export const partnerRateCaps: Record<string, number> = {
  capital_float: 24,
  pinelabs: 22,
  indifi: 26,
  lending_kart: 28,
};

// Minimum loan amounts by partner
export const partnerMinLoanAmounts: Record<string, number> = {
  capital_float: 5000,
  pinelabs: 10000,
  indifi: 25000,
  lending_kart: 5000,
};

// Maximum loan amounts by partner
export const partnerMaxLoanAmounts: Record<string, number> = {
  capital_float: 500000,
  pinelabs: 1000000,
  indifi: 2000000,
  lending_kart: 750000,
};

/**
 * Get the best available partner for a loan amount
 */
export function selectPartner(loanAmount: number): string | null {
  const availablePartners = Object.entries(nbfcPartners)
    .filter(([_, config]) => config.enabled)
    .filter(([id]) => {
      const min = partnerMinLoanAmounts[id] || 0;
      const max = partnerMaxLoanAmounts[id] || Infinity;
      return loanAmount >= min && loanAmount <= max;
    })
    .map(([id]) => id);

  if (availablePartners.length === 0) {
    return null;
  }

  // Return first available partner (could be enhanced with actual rate/availability check)
  return availablePartners[0];
}

/**
 * Get all partner capabilities
 */
export function getPartnerCapabilities(partnerId: string): {
  name: string;
  minLoan: number;
  maxLoan: number;
  rateCap: number;
  features: string[];
} | null {
  const config = nbfcPartners[partnerId];
  if (!config) return null;

  return {
    name: config.name,
    minLoan: partnerMinLoanAmounts[partnerId] || 0,
    maxLoan: partnerMaxLoanAmounts[partnerId] || 0,
    rateCap: partnerRateCaps[partnerId] || 24,
    features: [
      'disbursement',
      'status_check',
      'repayment_processing',
      'webhook_notifications',
    ],
  };
}
