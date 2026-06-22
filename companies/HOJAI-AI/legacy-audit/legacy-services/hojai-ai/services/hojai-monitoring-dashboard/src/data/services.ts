// All 31 RTNM services with their ports and companies
export interface ServiceConfig {
  name: string;
  port: number;
  company: string;
  layer: number;
  layerName: string;
  description: string;
  healthEndpoint: string;
}

export const SERVICES: ServiceConfig[] = [
  // Layer 1: Identity & Foundation (Ports 4140-4142)
  {
    name: 'hojai-corpid',
    port: 4140,
    company: 'HOJAI',
    layer: 1,
    layerName: 'Identity Network',
    description: 'Universal identity for ALL entities',
    healthEndpoint: '/health'
  },
  {
    name: 'hojai-axp-protocol',
    port: 4141,
    company: 'HOJAI',
    layer: 1,
    layerName: 'Identity Network',
    description: 'Structured JSON for AI-to-AI messages',
    healthEndpoint: '/health'
  },
  {
    name: 'hojai-agent-registry',
    port: 4142,
    company: 'HOJAI',
    layer: 1,
    layerName: 'Identity Network',
    description: 'Agent registration with capabilities',
    healthEndpoint: '/health'
  },

  // Layer 2: Twin & Policy (Ports 4150-4153)
  {
    name: 'hojai-merchant-twin',
    port: 4150,
    company: 'HOJAI',
    layer: 2,
    layerName: 'Twin Layer',
    description: 'Merchant inventory, policies, budget',
    healthEndpoint: '/health'
  },
  {
    name: 'hojai-asset-twin',
    port: 4151,
    company: 'HOJAI',
    layer: 2,
    layerName: 'Twin Layer',
    description: 'Equipment, vehicles, properties',
    healthEndpoint: '/health'
  },
  {
    name: 'hojai-twin-gateway',
    port: 4152,
    company: 'HOJAI',
    layer: 2,
    layerName: 'Twin Layer',
    description: 'Unified API for all twins',
    healthEndpoint: '/health'
  },
  {
    name: 'hojai-policy-engine',
    port: 4153,
    company: 'HOJAI',
    layer: 2,
    layerName: 'Twin Layer',
    description: 'Policy enforcement before any action',
    healthEndpoint: '/health'
  },

  // Layer 3: Graphs & Ledger (Ports 4160-4162)
  {
    name: 'rez-commerce-graph',
    port: 4160,
    company: 'REZ-Intelligence',
    layer: 3,
    layerName: 'Economic Graph',
    description: 'Restaurant → Distributor → Supplier',
    healthEndpoint: '/health'
  },
  {
    name: 'rez-identity-graph',
    port: 4161,
    company: 'REZ-Intelligence',
    layer: 3,
    layerName: 'Economic Graph',
    description: 'Entity identity relationships',
    healthEndpoint: '/health'
  },
  {
    name: 'rez-economic-ledger',
    port: 4162,
    company: 'REZ-Intelligence',
    layer: 3,
    layerName: 'Economic Graph',
    description: 'Double-entry accounting, audit trail',
    healthEndpoint: '/health'
  },

  // Layer 4: Exchange & Trust (Ports 4170-4181)
  {
    name: 'nexha-ai-exchange',
    port: 4170,
    company: 'Nexha',
    layer: 4,
    layerName: 'Exchange Network',
    description: 'AI-to-AI exchange, matching, price discovery',
    healthEndpoint: '/health'
  },
  {
    name: 'nexha-auction-engine',
    port: 4171,
    company: 'Nexha',
    layer: 4,
    layerName: 'Exchange Network',
    description: 'Competitive bidding',
    healthEndpoint: '/health'
  },
  {
    name: 'rabtul-trust-engine',
    port: 4180,
    company: 'RABTUL',
    layer: 4,
    layerName: 'Exchange Network',
    description: 'Trust, payment, fulfillment, credit scores',
    healthEndpoint: '/health'
  },
  {
    name: 'rabtul-credit-engine',
    port: 4181,
    company: 'RABTUL',
    layer: 4,
    layerName: 'Exchange Network',
    description: 'Credit scoring for BNPL/terms',
    healthEndpoint: '/health'
  },

  // Layer 5: Contract & Commerce (Ports 4190-4193)
  {
    name: 'contract-os',
    port: 4190,
    company: 'LawGens',
    layer: 5,
    layerName: 'Policy & Contract',
    description: 'Machine-readable contracts for AI transactions',
    healthEndpoint: '/health'
  },
  {
    name: 'hojai-negotiation-engine',
    port: 4191,
    company: 'HOJAI',
    layer: 5,
    layerName: 'Policy & Contract',
    description: 'Structured offer/counteroffer',
    healthEndpoint: '/health'
  },
  {
    name: 'hojai-autonomous-orders',
    port: 4192,
    company: 'HOJAI',
    layer: 5,
    layerName: 'Policy & Contract',
    description: 'AI-initiated transactions',
    healthEndpoint: '/health'
  },
  {
    name: 'hojai-agent-discovery',
    port: 4193,
    company: 'HOJAI',
    layer: 5,
    layerName: 'Policy & Contract',
    description: 'Capability-based agent discovery',
    healthEndpoint: '/health'
  },

  // Layer 6: Workflow & Intelligence (Ports 4200-4212)
  {
    name: 'flow-os',
    port: 4200,
    company: 'HOJAI',
    layer: 6,
    layerName: 'Workflow Network',
    description: 'Multi-step workflows across companies',
    healthEndpoint: '/health'
  },
  {
    name: 'flow-orchestrator',
    port: 4201,
    company: 'HOJAI',
    layer: 6,
    layerName: 'Workflow Network',
    description: 'Cross-company workflow coordination',
    healthEndpoint: '/health'
  },
  {
    name: 'rez-demand-sensing',
    port: 4210,
    company: 'REZ-Intelligence',
    layer: 6,
    layerName: 'Workflow Network',
    description: 'Network-wide demand intelligence',
    healthEndpoint: '/health'
  },
  {
    name: 'rez-supply-intelligence',
    port: 4211,
    company: 'REZ-Intelligence',
    layer: 6,
    layerName: 'Workflow Network',
    description: 'Supplier capacity & shortage prediction',
    healthEndpoint: '/health'
  },
  {
    name: 'rez-market-opportunities',
    port: 4212,
    company: 'REZ-Intelligence',
    layer: 6,
    layerName: 'Workflow Network',
    description: 'Cross-network opportunity detection',
    healthEndpoint: '/health'
  },

  // Layer 7: Ecosystem Services (Ports 6000-6007)
  {
    name: 'rtnm-company-registry',
    port: 6000,
    company: 'RTNM-Group',
    layer: 7,
    layerName: 'Ecosystem',
    description: 'Register all 22 companies',
    healthEndpoint: '/health'
  },
  {
    name: 'rtnm-inter-company-graph',
    port: 6001,
    company: 'RTNM-Group',
    layer: 7,
    layerName: 'Ecosystem',
    description: 'Map who pays whom, who provides what',
    healthEndpoint: '/health'
  },
  {
    name: 'rtnm-company-twins',
    port: 6002,
    company: 'RTNM-Group',
    layer: 7,
    layerName: 'Ecosystem',
    description: 'Each company\'s twin',
    healthEndpoint: '/health'
  },
  {
    name: 'rtnm-service-catalog',
    port: 6003,
    company: 'RTNM-Group',
    layer: 7,
    layerName: 'Ecosystem',
    description: 'Every service published',
    healthEndpoint: '/health'
  },
  {
    name: 'rtnm-inter-company-ledger',
    port: 6004,
    company: 'RTNM-Group',
    layer: 7,
    layerName: 'Ecosystem',
    description: 'Track revenue/cost between companies',
    healthEndpoint: '/health'
  },
  {
    name: 'rtnm-automated-billing',
    port: 6005,
    company: 'RTNM-Group',
    layer: 7,
    layerName: 'Ecosystem',
    description: 'Monthly settlements, invoices',
    healthEndpoint: '/health'
  },
  {
    name: 'rtnm-company-credit',
    port: 6006,
    company: 'RTNM-Group',
    layer: 7,
    layerName: 'Ecosystem',
    description: 'Credit limits, BNPL between companies',
    healthEndpoint: '/health'
  },
  {
    name: 'rtnm-company-trust',
    port: 6007,
    company: 'RTNM-Group',
    layer: 7,
    layerName: 'Ecosystem',
    description: 'Company trust scores',
    healthEndpoint: '/health'
  }
];

// Industry AI Agents (separate monitoring)
export const INDUSTRY_AGENTS = [
  {
    name: 'waitron',
    port: 4620,
    company: 'HOJAI',
    industry: 'Restaurant',
    description: 'Restaurant AI Operating System',
    healthEndpoint: '/health'
  },
  {
    name: 'staybot',
    port: 4840,
    company: 'HOJAI',
    industry: 'Hotel',
    description: 'Hotel AI Operating System',
    healthEndpoint: '/health'
  },
  {
    name: 'carecode',
    port: 4628,
    company: 'HOJAI',
    industry: 'Healthcare',
    description: 'Healthcare AI Operating System',
    healthEndpoint: '/health'
  },
  {
    name: 'shopflow',
    port: 4830,
    company: 'HOJAI',
    industry: 'Retail',
    description: 'Retail AI Operating System',
    healthEndpoint: '/health'
  },
  {
    name: 'glamai',
    port: 4622,
    company: 'HOJAI',
    industry: 'Salon',
    description: 'Salon AI Operating System',
    healthEndpoint: '/health'
  },
  {
    name: 'fitmind',
    port: 4623,
    company: 'HOJAI',
    industry: 'Fitness',
    description: 'Fitness AI Operating System',
    healthEndpoint: '/health'
  },
  {
    name: 'ledgerai',
    port: 4625,
    company: 'HOJAI',
    industry: 'Accounting',
    description: 'Accounting AI Operating System',
    healthEndpoint: '/health'
  },
  {
    name: 'fleetiq',
    port: 4626,
    company: 'HOJAI',
    industry: 'Fleet',
    description: 'Fleet AI Operating System',
    healthEndpoint: '/health'
  },
  {
    name: 'neighborai',
    port: 4627,
    company: 'HOJAI',
    industry: 'Society',
    description: 'Society AI Operating System',
    healthEndpoint: '/health'
  },
  {
    name: 'groceryiq',
    port: 4131,
    company: 'HOJAI',
    industry: 'Grocery',
    description: 'Grocery AI Operating System',
    healthEndpoint: '/health'
  }
];

// CEO Agent
export const CEO_AGENT = {
  name: 'hojai-ai-ceo-agent',
  port: 4800,
  company: 'HOJAI',
  description: 'AI CEO - Autonomous company orchestrator',
  healthEndpoint: '/health'
};

// Get all services combined
export const ALL_SERVICES = [...SERVICES, ...INDUSTRY_AGENTS, CEO_AGENT];

// Layer names for display
export const LAYER_NAMES: Record<number, string> = {
  1: 'Identity Network',
  2: 'Twin Layer',
  3: 'Economic Graph',
  4: 'Exchange Network',
  5: 'Policy & Contract',
  6: 'Workflow Network',
  7: 'Ecosystem'
};

// Company colors for dashboard
export const COMPANY_COLORS: Record<string, string> = {
  'HOJAI': '#3B82F6',
  'REZ-Intelligence': '#10B981',
  'RABTUL': '#F59E0B',
  'Nexha': '#8B5CF6',
  'LawGens': '#EF4444',
  'RTNM-Group': '#06B6D4'
};