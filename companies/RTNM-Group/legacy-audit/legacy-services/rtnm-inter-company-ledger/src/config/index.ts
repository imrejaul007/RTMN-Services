import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '6004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/rtnm_inter_company_ledger',
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },

  // Supported companies in RTNM Economic Network
  supportedCompanies: [
    'HOJAI-AI',
    'RABTUL-Technologies',
    'REZ-Intelligence',
    'REZ-Consumer',
    'KHAIRMOVE',
    'AXOM',
    'AdBazaar',
    'REZ-Merchant',
    'REZ-Move',
    'RIDZA',
    'LawGens',
    'AssetMind',
    'RisaCare',
    'CorpPerks',
    'StayOwn-Hospitality',
    'RTNM-Group',
    'RisnaEstate',
    'REZ-Workspace',
    'Hotel OTA',
    'RABTUL-SaaS',
    'RTNM-Digital',
    'Nexha',
  ] as const,

  // Supported transaction types
  transactionTypes: [
    'SERVICE_FEE',
    'REVENUE_SHARE',
    'API_USAGE',
    'DATA_SHARING',
    'MARKETING_FEE',
    'INFRASTRUCTURE_COST',
    'SUPPORT_FEE',
    'REFERRAL_COMMISSION',
    'LOYALTY_REWARD',
    'SETTLEMENT',
  ] as const,
};

export type SupportedCompany = typeof config.supportedCompanies[number];
export type TransactionType = typeof config.transactionTypes[number];

export default config;
