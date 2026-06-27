/**
 * SiteOS Gateway Configuration
 * Centralizes all service URLs and API keys
 */

require('dotenv').config();

module.exports = {
  // Port
  PORT: process.env.SITEOS_GATEWAY_PORT || 5450,

  // API Key for internal services
  HOJAI_API_KEY: process.env.HOJAI_API_KEY || 'dev-api-key',

  // Service URLs - Widget Backend
  WIDGET_BACKEND_URL: process.env.WIDGET_BACKEND_URL || 'http://localhost:5380',

  // Memory Layer
  MEMORY_OS_URL: process.env.MEMORY_OS_URL || 'http://localhost:4703',
  MEMORY_CONFIDENCE_URL: process.env.MEMORY_CONFIDENCE_URL || 'http://localhost:4152',

  // TwinOS Services
  CUSTOMER_TWIN_URL: process.env.CUSTOMER_TWIN_URL || 'http://localhost:4895',
  ORDER_TWIN_URL: process.env.ORDER_TWIN_URL || 'http://localhost:4885',
  WALLET_TWIN_URL: process.env.WALLET_TWIN_URL || 'http://localhost:4896',
  EMPLOYEE_TWIN_URL: process.env.EMPLOYEE_TWIN_URL || 'http://localhost:4730',
  VOICE_TWIN_URL: process.env.VOICE_TWIN_URL || 'http://localhost:4876',
  PRODUCT_TWIN_URL: process.env.PRODUCT_TWIN_URL || 'http://localhost:4720',

  // AgentOS
  AGENT_OS_URL: process.env.AGENT_OS_URL || 'http://localhost:4802',
  AGENT_EXECUTION_URL: process.env.AGENT_EXECUTION_URL || 'http://localhost:4813',
  CAPABILITY_STORE_URL: process.env.CAPABILITY_STORE_URL || 'http://localhost:4804',

  // Department OS
  SALES_OS_URL: process.env.SALES_OS_URL || 'http://localhost:5055',
  MARKETING_OS_URL: process.env.MARKETING_OS_URL || 'http://localhost:5500',
  CUSTOMER_SUCCESS_OS_URL: process.env.CUSTOMER_SUCCESS_OS_URL || 'http://localhost:4050',
  PROCUREMENT_OS_URL: process.env.PROCUREMENT_OS_URL || 'http://localhost:5096',
  WORKFORCE_OS_URL: process.env.WORKFORCE_OS_URL || 'http://localhost:5077',
  FINANCE_OS_URL: process.env.FINANCE_OS_URL || 'http://localhost:4801',
  OPERATIONS_OS_URL: process.env.OPERATIONS_OS_URL || 'http://localhost:5250',
  CXO_OS_URL: process.env.CXO_OS_URL || 'http://localhost:5100',
  REVENUE_OS_URL: process.env.REVENUE_OS_URL || 'http://localhost:5400',

  // FlowOS
  FLOW_OS_URL: process.env.FLOW_OS_URL || 'http://localhost:7007',
  FLOW_CANONICAL_URL: process.env.FLOW_CANONICAL_URL || 'http://localhost:4156',

  // Genie Services
  GENIE_URL: process.env.GENIE_URL || 'http://localhost:4701',
  GENIE_BRIEFING_URL: process.env.GENIE_BRIEFING_URL || 'http://localhost:4712',
  GENIE_SEARCH_URL: process.env.GENIE_SEARCH_URL || 'http://localhost:4713',
  GENIE_CALENDAR_URL: process.env.GENIE_CALENDAR_URL || 'http://localhost:4709',

  // Voice Services
  VOICE_GATEWAY_URL: process.env.VOICE_GATEWAY_URL || 'http://localhost:4880',

  // Analytics
  ANALYTICS_URL: process.env.ANALYTICS_URL || 'http://localhost:4750',

  // Nexha Platform
  NEXHA_DISCOVERY_URL: process.env.NEXHA_DISCOVERY_URL || 'http://localhost:4272',
  NEXHA_REPUTATION_URL: process.env.NEXHA_REPUTATION_URL || 'http://localhost:4271',
  NEXHA_CAPABILITY_URL: process.env.NEXHA_CAPABILITY_URL || 'http://localhost:4270',
  NEXHA_FEDERATION_URL: process.env.NEXHA_FEDERATION_URL || 'http://localhost:4273',

  // Industry OS
  RESTAURANT_OS_URL: process.env.RESTAURANT_OS_URL || 'http://localhost:5010',
  HOTEL_OS_URL: process.env.HOTEL_OS_URL || 'http://localhost:5025',
  HEALTHCARE_OS_URL: process.env.HEALTHCARE_OS_URL || 'http://localhost:5020',
  RETAIL_OS_URL: process.env.RETAIL_OS_URL || 'http://localhost:5030',

  // SUTAR OS
  SUTAR_GATEWAY_URL: process.env.SUTAR_GATEWAY_URL || 'http://localhost:4140',
  SUTAR_DECISION_URL: process.env.SUTAR_DECISION_URL || 'http://localhost:4290',
  SUTAR_ECONOMY_URL: process.env.SUTAR_ECONOMY_URL || 'http://localhost:4294',

  // Timeouts (ms)
  TIMEOUT: {
    DEFAULT: parseInt(process.env.DEFAULT_TIMEOUT) || 30000,
    MEMORY: parseInt(process.env.MEMORY_TIMEOUT) || 5000,
    TWIN: parseInt(process.env.TWIN_TIMEOUT) || 10000,
    AGENT: parseInt(process.env.AGENT_TIMEOUT) || 60000,
    FLOW: parseInt(process.env.FLOW_TIMEOUT) || 120000
  },

  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 1000,
    MAX_DELAY: 10000
  }
};
