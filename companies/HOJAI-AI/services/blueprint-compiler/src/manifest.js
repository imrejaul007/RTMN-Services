/**
 * Manifest Builder — Generates .hojai/manifest.json and .hojai/capability.json
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Build .hojai/manifest.json
 */
export function buildManifest(blueprint, projectId) {
  const config = blueprint.config;

  return {
    schemaVersion: '1.0.0',
    projectId: projectId || uuidv4(),
    projectHash: generateHash(blueprint.id || projectId || uuidv4()),
    name: config.slug || slugify(config.name),
    template: config.type || 'company',
    agents: blueprint.agents?.map(a => a.name || a.key) || [],
    region: config.regions?.[0] || 'us-east',
    languages: config.languages || ['en'],
    primaryLanguage: config.languages?.[0] || 'en',
    hojaiVersion: '1.0.0',
    generatedBy: 'blueprint-compiler',
    generatedAt: new Date().toISOString(),
    sdkDependencies: buildSdkDependencies(blueprint),
    entrypoints: {
      backend: 'apps/backend/src/index.js',
      frontend: 'apps/frontend/public/index.html',
      mobile: 'apps/mobile/lib/main.dart'
    },
    nexha: {
      enabled: config.federation !== false,
      federationEndpoint: 'https://nexha.hojai.ai/federation'
    },
    metadata: {
      idea: blueprint.idea,
      industries: blueprint.config.industries || [],
      currency: config.currency,
      marketSize: config.marketSize,
      commerce: config.commerce,
      platforms: config.platforms || ['web']
    }
  };
}

/**
 * Build .hojai/capability.json — CapabilityOS layer 2 declaration
 */
export function buildCapability(blueprint) {
  const config = blueprint.config;

  return {
    schemaVersion: '1.0.0',
    capabilityId: `cap_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
    name: config.name,
    type: 'company',
    industry: config.industries?.[0] || 'general',
    capabilities: buildCapabilities(blueprint),
    agents: blueprint.agents?.map(a => ({
      name: a.name || a.key,
      type: a.type,
      capabilities: a.capabilities || []
    })) || [],
    regions: config.regions || ['us-east'],
    languages: config.languages || ['en'],
    federation: {
      enabled: config.federation !== false,
      network: 'global-nexha'
    },
    sla: {
      uptime: 99.5,
      responseTime: 500,
      availability: 'global'
    },
    compliance: config.compliance || [],
    metadata: {
      createdBy: 'blueprint-compiler',
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * Build capabilities list based on blueprint
 */
function buildCapabilities(blueprint) {
  const caps = ['company-operations'];
  const config = blueprint.config;

  // Type-based capabilities
  const typeCaps = {
    marketplace: ['marketplace', 'catalog', 'rfq', 'quote', 'order', 'checkout'],
    b2b: ['b2b-commerce', 'wholesale', 'rfq', 'quote', 'procurement'],
    company: ['company-os', 'hr', 'finance', 'operations', 'sales', 'marketing'],
    hotel: ['hotel-management', 'booking', 'reservation', 'guest-services'],
    restaurant: ['restaurant-management', 'menu', 'orders', 'kitchen', 'delivery'],
    logistics: ['logistics', 'fleet-management', 'dispatch', 'tracking', 'delivery'],
    crm: ['crm', 'sales-pipeline', 'customer-management', 'lead-tracking'],
    erp: ['erp', 'inventory', 'procurement', 'finance', 'hr'],
    pos: ['pos', 'point-of-sale', 'checkout', 'inventory']
  };

  caps.push(...(typeCaps[config.type] || []));

  // Commerce capability
  if (config.commerce) {
    caps.push('commerce', 'payments', 'invoicing');
    if (config.commerceType === 'yes-full') {
      caps.push('cart', 'checkout', 'escrow', 'bnpl');
    } else {
      caps.push('rfq', 'quote');
    }
  }

  // Platform capabilities
  if (config.platforms?.includes('mobile-ios')) caps.push('mobile-ios');
  if (config.platforms?.includes('mobile-android')) caps.push('mobile-android');
  if (config.platforms?.includes('whatsapp')) caps.push('whatsapp-commerce');

  return [...new Set(caps)]; // Dedupe
}

/**
 * Build SDK dependencies based on blueprint
 */
function buildSdkDependencies(blueprint) {
  const deps = [
    '@hojai/foundation',
    '@hojai/sutar'
  ];

  const config = blueprint.config;

  if (config.federation !== false) {
    deps.push('@hojai/nexha', '@hojai/discovery');
  }

  if (config.commerce) {
    deps.push('@hojai/commerce', '@hojai/payment');
  }

  const hasLogistics = blueprint.agents?.some(a =>
    a.key === 'logistics' || a.name?.toLowerCase().includes('logistics')
  );
  if (hasLogistics || config.type === 'logistics') {
    deps.push('@hojai/logistics');
  }

  const hasReputation = config.federation !== false;
  if (hasReputation) {
    deps.push('@hojai/reputation');
  }

  return [...new Set(deps)];
}

/**
 * Generate a short hash from string
 */
function generateHash(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).substring(0, 16);
}

/**
 * Slugify a string
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
}
