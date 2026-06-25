/**
 * Blueprint Generator — Converts interview answers into CompanyBlueprint YAML/JSON
 */

import { QUESTIONS } from './questions/index.js';

/**
 * Default workforce agents by business type
 */
const DEFAULT_WORKFORCE = {
  marketplace: ['ceo', 'sales', 'procurement', 'finance', 'support'],
  b2b: ['ceo', 'sales', 'procurement', 'finance', 'logistics', 'support'],
  company: ['ceo', 'sales', 'marketing', 'hr', 'finance', 'operations'],
  hotel: ['ceo', 'sales', 'support', 'finance', 'operations'],
  restaurant: ['ceo', 'sales', 'procurement', 'finance', 'support'],
  logistics: ['ceo', 'sales', 'finance', 'operations'],
  crm: ['ceo', 'sales', 'marketing', 'support'],
  erp: ['ceo', 'procurement', 'finance', 'hr', 'operations'],
  pos: ['ceo', 'sales', 'finance', 'support']
};

/**
 * Agent definitions with full config
 */
const AGENT_DEFINITIONS = {
  ceo: {
    name: 'CEO Agent',
    type: 'orchestrator',
    industry: null,
    description: 'Strategic orchestrator — sets KPIs, routes tasks, manages priorities',
    capabilities: ['strategy', 'kpi-management', 'task-routing', 'decision-making'],
    role: 'Executive'
  },
  sales: {
    name: 'Sales Agent',
    type: 'merchant',
    industry: null,
    description: 'Lead qualification, quotations, pricing, follow-ups, pipeline management',
    capabilities: ['lead-qualification', 'quotations', 'pricing', 'follow-up', 'rfq-processing'],
    role: 'Sales'
  },
  marketing: {
    name: 'Marketing Agent',
    type: 'merchant',
    industry: null,
    description: 'Campaign creation, content generation, audience targeting, analytics',
    capabilities: ['campaigns', 'content', 'audience-targeting', 'analytics', 'seo'],
    role: 'Marketing'
  },
  procurement: {
    name: 'Procurement Agent',
    type: 'merchant',
    industry: null,
    description: 'Supplier discovery, RFQ management, negotiation, purchase orders',
    capabilities: ['supplier-discovery', 'rfq', 'negotiation', 'purchase-orders', 'vendor-management'],
    role: 'Procurement'
  },
  finance: {
    name: 'Finance Agent',
    type: 'merchant',
    industry: null,
    description: 'Invoicing, payments, bookkeeping, expense tracking, financial reporting',
    capabilities: ['invoicing', 'payments', 'bookkeeping', 'expenses', 'financial-reporting'],
    role: 'Finance'
  },
  support: {
    name: 'Customer Support Agent',
    type: 'merchant',
    industry: null,
    description: 'Ticket management, chat support, WhatsApp integration, NPS tracking',
    capabilities: ['tickets', 'chat', 'whatsapp', 'nps', 'faq-management'],
    role: 'Support'
  },
  logistics: {
    name: 'Logistics Agent',
    type: 'merchant',
    industry: null,
    description: 'Shipping coordination, tracking, delivery management, carrier integration',
    capabilities: ['shipping', 'tracking', 'delivery', 'carrier-integration', 'route-optimization'],
    role: 'Logistics'
  },
  hr: {
    name: 'HR Agent',
    type: 'merchant',
    industry: null,
    description: 'Recruitment, onboarding, performance reviews, benefits management',
    capabilities: ['recruitment', 'onboarding', 'performance-reviews', 'benefits', 'compliance'],
    role: 'HR'
  },
  operations: {
    name: 'Operations Agent',
    type: 'merchant',
    industry: null,
    description: 'Process automation, scheduling, resource allocation, incident management',
    capabilities: ['process-automation', 'scheduling', 'resource-allocation', 'incident-management'],
    role: 'Operations'
  }
};

/**
 * Integration dependencies by business type
 */
const TYPE_INTEGRATIONS = {
  marketplace: ['corp-id', 'memory-os', 'twin-os', 'sada', 'nexha', 'rabtul', 'nexha-autonomous-logistics'],
  b2b: ['corp-id', 'memory-os', 'twin-os', 'sada', 'nexha', 'rabtul'],
  company: ['corp-id', 'memory-os', 'twin-os', 'sada', 'nexha', 'rabtul', 'nexha-autonomous-logistics'],
  hotel: ['corp-id', 'memory-os', 'twin-os', 'sada', 'nexha', 'rabtul', 'nexha-autonomous-logistics'],
  restaurant: ['corp-id', 'memory-os', 'twin-os', 'sada', 'nexha', 'rabtul', 'nexha-autonomous-logistics'],
  logistics: ['corp-id', 'memory-os', 'twin-os', 'sada', 'nexha', 'rabtul', 'nexha-autonomous-logistics'],
  crm: ['corp-id', 'memory-os', 'twin-os', 'sada', 'nexha'],
  erp: ['corp-id', 'memory-os', 'twin-os', 'sada', 'nexha', 'rabtul'],
  pos: ['corp-id', 'memory-os', 'twin-os', 'sada', 'nexha', 'rabtul']
};

/**
 * Apps included by business type
 */
const TYPE_APPS = {
  marketplace: { buyerPortal: true, sellerPortal: true, adminDashboard: true, mobileApp: true },
  b2b: { buyerPortal: true, sellerPortal: true, adminDashboard: true, mobileApp: true },
  company: { buyerPortal: false, sellerPortal: false, adminDashboard: true, mobileApp: false },
  hotel: { buyerPortal: true, sellerPortal: false, adminDashboard: true, mobileApp: true },
  restaurant: { buyerPortal: true, sellerPortal: false, adminDashboard: true, mobileApp: true },
  logistics: { buyerPortal: true, sellerPortal: true, adminDashboard: true, mobileApp: true },
  crm: { buyerPortal: false, sellerPortal: false, adminDashboard: true, mobileApp: false },
  erp: { buyerPortal: false, sellerPortal: false, adminDashboard: true, mobileApp: false },
  pos: { buyerPortal: false, sellerPortal: false, adminDashboard: true, mobileApp: false }
};

/**
 * Generate a CompanyBlueprint from interview answers
 */
export function generateBlueprint(interviewId, idea, answers) {
  // Extract key values from answers
  const name = answers['name'] || 'My Company';
  const type = answers['type'] || 'marketplace';
  const industries = answers['industries'] || [];
  const regions = answers['regions'] || ['us-east'];
  const languages = answers['languages'] || ['en'];
  const currency = answers['currency'] || 'USD';
  const marketSize = answers['marketSize'] || 'regional';
  const workforce = answers['workforce'] || DEFAULT_WORKFORCE[type] || ['ceo', 'sales'];
  const compliance = answers['compliance'] || [];
  const commerce = answers['commerce'] || 'yes-rfq';
  const platforms = answers['platforms'] || ['web'];
  const federation = answers['federation'] || 'yes';

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);

  // Build agent configs
  const agents = workforce.map(key => {
    const def = AGENT_DEFINITIONS[key] || AGENT_DEFINITIONS.sales;
    return {
      key,
      ...def,
      industry: industries[0] || null
    };
  });

  // Build config
  const config = {
    name,
    slug,
    type,
    regions,
    languages,
    currency,
    marketSize,
    commerce: commerce !== 'no',
    commerceType: commerce,
    platforms,
    federation: federation === 'yes',
    compliance
  };

  // Build apps
  const apps = TYPE_APPS[type] || TYPE_APPS.marketplace;

  // Build integrations
  const integrations = TYPE_INTEGRATIONS[type] || TYPE_INTEGRATIONS.marketplace;
  if (commerce !== 'no') {
    integrations.push('commerce');
  }
  if (platforms.includes('whatsapp')) {
    integrations.push('whatsapp');
  }

  // Generate next steps based on type
  const nextSteps = generateNextSteps(type, agents, commerce, federation);

  // Build the blueprint
  const blueprint = {
    id: `bp_${interviewId}`,
    interviewId,
    createdAt: new Date().toISOString(),
    status: 'approved',
    version: '1.0',
    idea,
    config,
    apps,
    agents,
    integrations,
    nextSteps,
    metadata: {
      generatedBy: 'ai-architect',
      generatorVersion: '1.0.0',
      questionCount: QUESTIONS.length,
      answeredCount: Object.keys(answers).length,
      industryFocus: industries.join(', ') || 'General',
      regionScope: regions.length === 1 ? 'single-region' : 'multi-region'
    }
  };

  return blueprint;
}

/**
 * Generate context-aware next steps based on blueprint config
 */
function generateNextSteps(type, agents, commerce, federation) {
  const steps = [];

  // Step 1: Review the blueprint
  steps.push({
    step: 1,
    action: 'Review your blueprint',
    description: 'Review the AI-generated blueprint and make any adjustments',
    estimatedTime: '2 minutes',
    icon: 'eye'
  });

  // Step 2: Approve and generate
  steps.push({
    step: 2,
    action: 'Approve and generate',
    description: 'Approve your blueprint to generate the complete company',
    estimatedTime: '30 seconds',
    icon: 'check'
  });

  // Step 3: Company generation
  steps.push({
    step: 3,
    action: 'Company generated',
    description: 'Your AI-native company is being generated with all agents and integrations',
    estimatedTime: '30 seconds',
    icon: 'sparkles'
  });

  // Step 4: Deploy
  steps.push({
    step: 4,
    action: 'Deploy to cloud',
    description: 'Your company is deployed to HOJAI Cloud and ready to use',
    estimatedTime: '15 seconds',
    icon: 'rocket'
  });

  // Step 5: Customization
  steps.push({
    step: 5,
    action: 'Customize in Cursor',
    description: 'Open in Cursor or VS Code to customize with AI assistance',
    estimatedTime: 'Ongoing',
    icon: 'code'
  });

  // Add commerce step if needed
  if (commerce !== 'no') {
    steps.push({
      step: 6,
      action: 'Configure payments',
      description: 'Set up payment gateway, escrow, and BNPL options',
      estimatedTime: '5 minutes',
      icon: 'credit-card'
    });
  }

  // Add federation step if selected
  if (federation === 'yes') {
    steps.push({
      step: steps.length + 1,
      action: 'Join Global Nexha',
      description: 'Your company is registered on Global Nexha for discovery',
      estimatedTime: 'Instant',
      icon: 'globe'
    });
  }

  return steps;
}

/**
 * Export blueprint as YAML string
 */
export function exportBlueprintYaml(blueprint) {
  const lines = [
    '# HOJAI Company Blueprint',
    '# Generated by AI Architect',
    `# Created: ${blueprint.createdAt}`,
    '',
    `id: ${blueprint.id}`,
    `interviewId: ${blueprint.interviewId}`,
    `version: ${blueprint.version}`,
    '',
    'idea: |',
    `  ${blueprint.idea.split('\n').join('\n  ')}`,
    '',
    'config:',
    `  name: ${blueprint.config.name}`,
    `  slug: ${blueprint.config.slug}`,
    `  type: ${blueprint.config.type}`,
    `  regions: [${blueprint.config.regions.join(', ')}]`,
    `  languages: [${blueprint.config.languages.join(', ')}]`,
    `  currency: ${blueprint.config.currency}`,
    `  marketSize: ${blueprint.config.marketSize}`,
    `  commerce: ${blueprint.config.commerce}`,
    `  platforms: [${blueprint.config.platforms.join(', ')}]`,
    `  federation: ${blueprint.config.federation}`,
    '',
    'apps:',
    `  buyerPortal: ${blueprint.apps.buyerPortal}`,
    `  sellerPortal: ${blueprint.apps.sellerPortal}`,
    `  adminDashboard: ${blueprint.apps.adminDashboard}`,
    `  mobileApp: ${blueprint.apps.mobileApp}`,
    '',
    'agents:',
    ...blueprint.agents.map(a => `  - name: ${a.name}`),
    '',
    'integrations:',
    `  - ${blueprint.integrations.join('\n  - ')}`,
    '',
    'nextSteps:',
    ...blueprint.nextSteps.map(s => `  - step: ${s.step}, action: ${s.action}`)
  ];

  return lines.join('\n');
}

/**
 * Export blueprint as JSON string
 */
export function exportBlueprintJson(blueprint) {
  return JSON.stringify(blueprint, null, 2);
}
