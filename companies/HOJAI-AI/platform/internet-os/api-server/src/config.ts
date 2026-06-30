/**
 * InternetOS API Server Configuration
 */

export const config = {
  port: parseInt(process.env.INTERNET_OS_PORT || '4595'),

  services: {
    // REUSE existing HOJAI services
    memoryOs: process.env.MEMORY_OS_URL || 'http://localhost:4703',
    twinOs: process.env.TWIN_OS_URL || 'http://localhost:4705',
    knowledgeExtraction: process.env.KNOWLEDGE_EXTRACTION_URL || 'http://localhost:4784',
    webhookBus: process.env.WEBHOOK_BUS_URL || 'http://localhost:4110',
    skillOs: process.env.SKILL_OS_URL || 'http://localhost:4743',
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'internet-os-secret-key-change-in-production',
    internalToken: process.env.INTERNAL_SERVICE_TOKEN || 'webhook-bus-internal-token',
  },

  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config;
