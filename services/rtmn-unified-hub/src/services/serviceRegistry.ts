/**
 * RTMN Unified Hub — Service Registry
 *
 * Single entry point for all RTMN services.
 * Routes /api/* to appropriate downstream services.
 * Provides service health monitoring.
 */

export interface ServiceEntry {
  name: string;
  url: string;
  prefix: string;            // URL prefix to route
  healthPath: string;        // health check path
  timeout: number;
  category: 'genie' | 'rtmn' | 'integration';
}

export const SERVICE_REGISTRY: ServiceEntry[] = [
  // ====== Genie OS Runtime (port 7100) ======
  // Genie has its own router that includes all 14 sub-services
  {
    name: 'Genie Runtime',
    url: process.env.GENIE_RUNTIME_URL || 'http://localhost:7100',
    prefix: '/api/genie',
    healthPath: '/health',
    timeout: 10000,
    category: 'genie',
  },
  {
    name: 'Genie Twinst (Wish Service)',
    url: process.env.GENIE_TWINS_URL || 'http://localhost:4001',
    prefix: '/api/genie-twins',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Genie Agents (Wish Service)',
    url: process.env.GENIE_AGENTS_URL || 'http://localhost:4001',
    prefix: '/api/genie-agents',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },

  // ====== Direct access to 14 Genie services ======
  {
    name: 'Decision Intelligence',
    url: process.env.DECISION_INTELLIGENCE_URL || 'http://localhost:4740',
    prefix: '/api/services/decision',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Learning Loop',
    url: process.env.LEARNING_LOOP_URL || 'http://localhost:4742',
    prefix: '/api/services/learning',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Anticipation',
    url: process.env.ANTICIPATION_URL || 'http://localhost:4745',
    prefix: '/api/services/anticipation',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Ambient',
    url: process.env.AMBIENT_URL || 'http://localhost:4746',
    prefix: '/api/services/ambient',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Constitution',
    url: process.env.CONSTITUTION_URL || 'http://localhost:4743',
    prefix: '/api/services/constitution',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Financial Life',
    url: process.env.FINANCIAL_LIFE_URL || 'http://localhost:4747',
    prefix: '/api/services/financial',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Health Intelligence',
    url: process.env.HEALTH_URL || 'http://localhost:4748',
    prefix: '/api/services/health',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Household',
    url: process.env.HOUSEHOLD_URL || 'http://localhost:4749',
    prefix: '/api/services/household',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Travel',
    url: process.env.TRAVEL_URL || 'http://localhost:4750',
    prefix: '/api/services/travel',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Spiritual',
    url: process.env.SPIRITUAL_URL || 'http://localhost:4751',
    prefix: '/api/services/spiritual',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Life Simulation',
    url: process.env.LIFE_SIMULATION_URL || 'http://localhost:4752',
    prefix: '/api/services/simulation',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Focus',
    url: process.env.FOCUS_URL || 'http://localhost:4753',
    prefix: '/api/services/focus',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Dreams',
    url: process.env.DREAMS_URL || 'http://localhost:4754',
    prefix: '/api/services/dreams',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Legacy',
    url: process.env.LEGACY_URL || 'http://localhost:4755',
    prefix: '/api/services/legacy',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },

  // ====== Other RTMN Services ======
  {
    name: 'Genie Gateway',
    url: process.env.GENIE_GATEWAY_URL || 'http://localhost:4701',
    prefix: '/api/genie-gateway',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Genie Wish Fulfillment',
    url: process.env.GENIE_WISHES_URL || 'http://localhost:4001',
    prefix: '/api/wishes',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Genie Fulfillments',
    url: process.env.GENIE_WISHES_URL || 'http://localhost:4001',
    prefix: '/api/fulfillments',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Genie Templates',
    url: process.env.GENIE_WISHES_URL || 'http://localhost:4001',
    prefix: '/api/templates',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'Genie Skills',
    url: process.env.GENIE_WISHES_URL || 'http://localhost:4001',
    prefix: '/api/skills',
    healthPath: '/health',
    timeout: 5000,
    category: 'genie',
  },
  {
    name: 'MemoryOS',
    url: process.env.MEMORYOS_URL || 'http://localhost:4703',
    prefix: '/api/memory',
    healthPath: '/health',
    timeout: 5000,
    category: 'rtmn',
  },
  {
    name: 'TwinOS',
    url: process.env.TWINOS_URL || 'http://localhost:4705',
    prefix: '/api/twin',
    healthPath: '/health',
    timeout: 5000,
    category: 'rtmn',
  },
  {
    name: 'CorpID',
    url: process.env.CORPID_URL || 'http://localhost:4702',
    prefix: '/api/corpid',
    healthPath: '/health',
    timeout: 5000,
    category: 'rtmn',
  },
  {
    name: 'Calendar',
    url: process.env.CALENDAR_URL || 'http://localhost:4709',
    prefix: '/api/calendar',
    healthPath: '/health',
    timeout: 5000,
    category: 'rtmn',
  },
  {
    name: 'Wellness',
    url: process.env.WELLNESS_URL || 'http://localhost:4723',
    prefix: '/api/wellness',
    healthPath: '/health',
    timeout: 5000,
    category: 'rtmn',
  },
  {
    name: 'Money',
    url: process.env.MONEY_URL || 'http://localhost:4724',
    prefix: '/api/money',
    healthPath: '/health',
    timeout: 5000,
    category: 'rtmn',
  },
  {
    name: 'SUTAR Gateway',
    url: process.env.SUTAR_URL || 'http://localhost:4140',
    prefix: '/api/sutar',
    healthPath: '/health',
    timeout: 5000,
    category: 'rtmn',
  },
  {
    name: 'RAZO',
    url: process.env.RAZO_URL || 'http://localhost:4299',
    prefix: '/api/razo',
    healthPath: '/health',
    timeout: 5000,
    category: 'integration',
  },

  // ====== HOJAI Foundry Services ======
  {
    name: 'Creator Economy',
    url: process.env.CREATOR_ECONOMY_URL || 'http://localhost:4514',
    prefix: '/api/creator-economy',
    healthPath: '/health',
    timeout: 5000,
    category: 'rtmn',
  },
  {
    name: 'Visual Builder',
    url: process.env.VISUAL_BUILDER_URL || 'http://localhost:4600',
    prefix: '/api/visual-builder',
    healthPath: '/health',
    timeout: 5000,
    category: 'rtmn',
  },
];

export function findService(prefix: string): ServiceEntry | undefined {
  return SERVICE_REGISTRY.find(s => s.prefix === prefix);
}

export function findServiceByPath(path: string): ServiceEntry | undefined {
  return SERVICE_REGISTRY
    .filter(s => path.startsWith(s.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
}