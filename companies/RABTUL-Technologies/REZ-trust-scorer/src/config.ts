import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4180', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceName: 'rez-trust-scorer',

  // External service connections
  eventBusUrl: process.env.EVENT_BUS_URL || 'http://localhost:4510',
  eventBusEnabled: process.env.EVENT_BUS_ENABLED !== 'false',
  economyOsUrl: process.env.ECONOMY_OS_URL || 'http://localhost:4251',

  // Trust scoring weights (25/25/25/25 formula)
  trust: {
    weights: {
      creditHistory: 0.25,
      paymentHistory: 0.25,
      disputeRate: 0.25,
      deliverySuccess: 0.25,
    },
    scoreRange: { min: 0, max: 1000 },
    // Thresholds for trust tiers
    tiers: {
      excellent: 850,
      good: 700,
      fair: 550,
      poor: 400,
      untrusted: 0,
    },
    // Component weights within each category
    components: {
      // Credit history components
      creditHistory: {
        accountAge: 0.4, // 40% - how long has the account existed
        transactionVolume: 0.3, // 30% - total transaction volume
        transactionCount: 0.2, // 20% - number of transactions
        diversity: 0.1, // 10% - diversity of transaction types
      },
      // Payment history components
      paymentHistory: {
        onTimeRate: 0.5, // 50% - ratio of on-time payments
        avgPaymentTime: 0.3, // 30% - how early on average
        paymentMethodDiversity: 0.2, // 20% - payment methods used
      },
      // Dispute rate components
      disputeRate: {
        disputeRate: 0.6, // 60% - disputes as % of transactions
        disputeResolutionRate: 0.3, // 30% - how often resolved in favor
        disputeSeverity: 0.1, // 10% - average severity
      },
      // Delivery success components
      deliverySuccess: {
        successRate: 0.5, // 50% - successful deliveries
        avgDeliveryTime: 0.3, // 30% - on-time delivery ratio
        returnRate: 0.2, // 20% - returns as % of deliveries
      },
    },
  },

  // Score decay settings
  decay: {
    enabled: true,
    // Decay old transactions weight after this many days
    decayAfterDays: 90,
    // Minimum weight for old transactions
    minWeight: 0.5,
  },

  // Rate limits
  rateLimit: {
    windowMs: 60_000,
    maxRequests: 200,
  },

  logLevel: process.env.LOG_LEVEL || 'info',
};