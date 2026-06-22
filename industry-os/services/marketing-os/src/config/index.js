/**
 * Marketing OS Configuration
 */

module.exports = {
  // Server Configuration
  PORT: process.env.MARKETING_OS_PORT || 5500,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // CORS Configuration
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || '*',

  // JWT Configuration
  JWT: {
    secret: process.env.JWT_SECRET || 'marketing-os-secret-key-change-in-production',
    expiresIn: '24h',
    refreshExpiresIn: '7d'
  },

  // Database Configuration (MongoDB)
  DATABASE: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/marketing-os',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },

  // Rate Limiting
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },

  // Services Configuration (RTMN Ecosystem)
  SERVICES: {
    // RTMN Hub
    RTMN_HUB: process.env.RTMN_HUB_URL || 'http://localhost:4399',

    // Foundation
    CORPID: process.env.CORPID_URL || 'http://localhost:4702',
    MEMORY_OS: process.env.MEMORY_OS_URL || 'http://localhost:4703',
    TWIN_OS: process.env.TWIN_OS_URL || 'http://localhost:4705',

    // HOJAI AI
    HOJAI_INTELLIGENCE: process.env.HOJAI_INTELLIGENCE_URL || 'http://localhost:4761',
    HOJAI_MEMORY: process.env.HOJAI_MEMORY_URL || 'http://localhost:4762',
    HOJAI_TWIN: process.env.HOJAI_TWIN_URL || 'http://localhost:4763',
    HOJAI_AGENTS: process.env.HOJAI_AGENTS_URL || 'http://localhost:4764',
    HOJAI_COPILOT: process.env.HOJAI_COPILOT_URL || 'http://localhost:4765',

    // AdBazaar
    ADBAZAAR_DSP: process.env.DSP_URL || 'http://localhost:4990',
    ADBAZAAR_AUDIENCE: process.env.AUDIENCE_URL || 'http://localhost:4805',
    ADBAZAAR_ATTRIBUTION: process.env.ATTRIBUTION_URL || 'http://localhost:4803',
    ADBAZAAR_CDP: process.env.CDP_URL || 'http://localhost:4901',

    // REZ Services
    REZ_POS: process.env.REZ_POS_URL || 'http://localhost:4800',
    REZ_ORDERS: process.env.REZ_ORDERS_URL || 'http://localhost:4801',
    REZ_WALLET: process.env.REZ_WALLET_URL || 'http://localhost:4004',
    REZ_CRM: process.env.REZ_CRM_URL || 'http://localhost:4056',
    REZ_CARE: process.env.REZ_CARE_URL || 'http://localhost:4055',

    // Industry OS
    SALES_OS: process.env.SALES_OS_URL || 'http://localhost:5055',
    MEDIA_OS: process.env.MEDIA_OS_URL || 'http://localhost:5600',

    // Other
    FLOW_OS: process.env.FLOW_OS_URL || 'http://localhost:4244',
    // SUTAR OS — prefer going through the RTMN Hub (SUTAR_HUB_URL)
    // The Hub routes /api/sutar/<service>/<path> to the correct upstream port.
    // Direct Economy OS port was renumbered 4251→4294 on 2026-06-22; Decision 4240→4290.
    SUTAR_OS: process.env.SUTAR_OS_URL
      || (process.env.SUTAR_HUB_URL
          ? `${process.env.SUTAR_HUB_URL}/api/sutar/sutar-gateway`
          : 'http://localhost:4140'),
  },

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};
