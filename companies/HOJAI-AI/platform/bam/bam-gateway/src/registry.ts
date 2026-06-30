/**
 * BAM Worker Registry — Central registry of all available workers
 */

export interface WorkerDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  url: string;
  skills: WorkerSkill[];
  pricing: WorkerPricing;
  inputs: string[];
  outputs: string[];
}

export interface WorkerSkill {
  id: string;
  name: string;
  description: string;
  cost: number;
}

export interface WorkerPricing {
  model: 'per_request' | 'per_record' | 'subscription' | 'one_time';
  basePrice: number;
  unitPrice?: number;
  currency: string;
}

// Worker registry - ports defined here
export const WORKER_REGISTRY: WorkerDefinition[] = [
  {
    id: 'vendor-acquisition',
    name: 'Vendor Acquisition Worker',
    description: 'AI worker that finds, qualifies, and onboards new vendors',
    category: 'marketplace',
    url: process.env.VENDOR_ACQUISITION_URL || 'http://localhost:5551',
    pricing: {
      model: 'per_record',
      basePrice: 999,
      unitPrice: 10,
      currency: 'INR',
    },
    inputs: ['industry', 'criteria', 'target_count'],
    outputs: ['prospects', 'qualified_vendors', 'onboarded_vendors'],
    skills: [
      {
        id: 'vendor-discovery',
        name: 'Vendor Discovery',
        description: 'Search directories, social, web for potential vendors',
        cost: 50,
      },
      {
        id: 'vendor-outreach',
        name: 'Vendor Outreach',
        description: 'Send emails and WhatsApp to prospects',
        cost: 20,
      },
      {
        id: 'vendor-qualify',
        name: 'Vendor Qualification',
        description: 'Score and qualify prospects based on trust, capability',
        cost: 30,
      },
      {
        id: 'vendor-onboard',
        name: 'Vendor Onboarding',
        description: 'Generate contracts, collect documents, activate vendor',
        cost: 100,
      },
    ],
  },
  {
    id: 'catalog-normalization',
    name: 'Catalog Normalization Worker',
    description: 'AI worker that normalizes product catalogs (images, descriptions, specs)',
    category: 'catalog',
    url: process.env.CATALOG_NORMALIZATION_URL || 'http://localhost:5552',
    pricing: {
      model: 'per_record',
      basePrice: 499,
      unitPrice: 5,
      currency: 'INR',
    },
    inputs: ['products', 'options'],
    outputs: ['normalized_products', 'quality_scores'],
    skills: [
      {
        id: 'image-processing',
        name: 'Image Processing',
        description: 'Remove background, enhance quality, generate sizes',
        cost: 10,
      },
      {
        id: 'description-generation',
        name: 'Description Generation',
        description: 'Generate titles, bullets, full descriptions, SEO',
        cost: 20,
      },
      {
        id: 'spec-extraction',
        name: 'Spec Extraction',
        description: 'Extract specs from OCR, normalize units',
        cost: 15,
      },
      {
        id: 'quality-scoring',
        name: 'Quality Scoring',
        description: 'Score completeness, quality, compliance',
        cost: 5,
      },
    ],
  },
  {
    id: 'recommendation',
    name: 'Recommendation Worker',
    description: 'AI worker that personalizes product recommendations',
    category: 'personalization',
    url: process.env.RECOMMENDATION_WORKER_URL || 'http://localhost:5553',
    pricing: {
      model: 'per_request',
      basePrice: 0,
      unitPrice: 1,
      currency: 'INR',
    },
    inputs: ['user_id', 'context', 'limit'],
    outputs: ['recommendations', 'scores'],
    skills: [
      {
        id: 'user-profiling',
        name: 'User Profiling',
        description: 'Build user profiles from behavior',
        cost: 5,
      },
      {
        id: 'collaborative-filtering',
        name: 'Collaborative Filtering',
        description: 'Find similar users and their preferences',
        cost: 3,
      },
      {
        id: 'content-matching',
        name: 'Content Matching',
        description: 'Match products to user preferences',
        cost: 2,
      },
      {
        id: 'real-time-ranking',
        name: 'Real-time Ranking',
        description: 'Rank products by relevance, price, availability',
        cost: 2,
      },
    ],
  },
  {
    id: 'growth',
    name: 'Growth Worker',
    description: 'AI worker for campaigns, A/B testing, conversion optimization',
    category: 'marketing',
    url: process.env.GROWTH_WORKER_URL || 'http://localhost:5554',
    pricing: {
      model: 'one_time',
      basePrice: 1999,
      unitPrice: 500,
      currency: 'INR',
    },
    inputs: ['type', 'target', 'objective'],
    outputs: ['campaign', 'targeting', 'content'],
    skills: [
      {
        id: 'campaign-creation',
        name: 'Campaign Creation',
        description: 'Create campaigns with targeting and content',
        cost: 500,
      },
      {
        id: 'audience-targeting',
        name: 'Audience Targeting',
        description: 'Select and segment audiences',
        cost: 200,
      },
      {
        id: 'ab-testing',
        name: 'A/B Testing',
        description: 'Run split tests and analyze results',
        cost: 300,
      },
      {
        id: 'conversion-optimization',
        name: 'Conversion Optimization',
        description: 'Optimize landing pages and funnels',
        cost: 400,
      },
    ],
  },
  {
    id: 'fraud-detection',
    name: 'Fraud Detection Worker',
    description: 'AI worker that detects fraud patterns and anomalies',
    category: 'security',
    url: process.env.FRAUD_WORKER_URL || 'http://localhost:5555',
    pricing: {
      model: 'per_request',
      basePrice: 0,
      unitPrice: 2,
      currency: 'INR',
    },
    inputs: ['transaction', 'user', 'context'],
    outputs: ['risk_score', 'flags', 'recommendations'],
    skills: [
      {
        id: 'pattern-analysis',
        name: 'Pattern Analysis',
        description: 'Analyze patterns across millions of transactions',
        cost: 5,
      },
      {
        id: 'anomaly-detection',
        name: 'Anomaly Detection',
        description: 'Detect unusual behavior in real-time',
        cost: 3,
      },
    ],
  },
  {
    id: 'customer-support',
    name: 'Customer Support Worker',
    description: 'AI worker for customer service, FAQs, refunds',
    category: 'service',
    url: process.env.SUPPORT_WORKER_URL || 'http://localhost:5482',
    pricing: {
      model: 'per_request',
      basePrice: 0,
      unitPrice: 1,
      currency: 'INR',
    },
    inputs: ['query', 'context', 'history'],
    outputs: ['response', 'action', 'escalation'],
    skills: [
      {
        id: 'faq-handling',
        name: 'FAQ Handling',
        description: 'Answer common questions automatically',
        cost: 1,
      },
      {
        id: 'refund-processing',
        name: 'Refund Processing',
        description: 'Handle refund requests automatically',
        cost: 5,
      },
      {
        id: 'complaint-escalation',
        name: 'Complaint Escalation',
        description: 'Escalate complex issues to human agents',
        cost: 1,
      },
    ],
  },
];

export function findWorker(id: string): WorkerDefinition | undefined {
  return WORKER_REGISTRY.find(w => w.id === id);
}

export function findWorkersByCategory(category: string): WorkerDefinition[] {
  return WORKER_REGISTRY.filter(w => w.category === category);
}

export function findSkill(workerId: string, skillId: string): WorkerSkill | undefined {
  const worker = findWorker(workerId);
  return worker?.skills.find(s => s.id === skillId);
}
