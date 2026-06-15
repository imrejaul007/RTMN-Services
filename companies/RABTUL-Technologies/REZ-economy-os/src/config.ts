import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4251', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceName: 'rez-economy-os',

  // External service connections
  eventBusUrl: process.env.EVENT_BUS_URL || 'http://localhost:4510',
  eventBusEnabled: process.env.EVENT_BUS_ENABLED !== 'false',
  trustScorerUrl: process.env.TRUST_SCORER_URL || 'http://localhost:4180',
  walletServiceUrl: process.env.WALLET_SERVICE_URL || 'http://localhost:4004',
  goalOsUrl: process.env.GOAL_OS_URL || 'http://localhost:4242',

  // Karma configuration
  karma: {
    tierThresholds: {
      bronze: 0,
      silver: 100,
      gold: 500,
      platinum: 2000,
      diamond: 10000,
    },
    karmaSources: {
      taskCompleted: 10,
      slaMet: 5,
      positiveReview: 15,
      negativeReview: -10,
      disputeResolved: 20,
      breachDetected: -25,
      onTimePayment: 8,
      latePayment: -5,
    },
  },

  // Credit scoring configuration
  credit: {
    weights: {
      creditHistory: 0.25,
      paymentHistory: 0.25,
      disputeRate: 0.25,
      deliverySuccess: 0.25,
    },
    scoreRange: { min: 0, max: 1000 },
    tierThresholds: {
      excellent: 850,
      good: 700,
      fair: 550,
      poor: 400,
      veryPoor: 0,
    },
  },

  // Ledger configuration
  ledger: {
    precision: 4, // decimal places
    maxTransactionAmount: 1_000_000,
    minTransactionAmount: 0.0001,
  },

  // Rate limits
  rateLimit: {
    windowMs: 60_000,
    maxRequests: 200, // economy endpoints are higher traffic
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};
