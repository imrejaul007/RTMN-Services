/**
 * SkillOS SDK — Type definitions
 *
 * Auto-generated from /openapi.json — DO NOT EDIT BY HAND.
 * Regenerate with: node scripts/generate-sdk.mjs
 *
 * Source version: 1.3.0
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
  [k: string]: any;
}

export interface Skill {
  id?: string;
  name?: string;
  category?: string;
  description?: string;
  tags?: string[];
  version?: string;
  status?: string;
  code?: string;
}

export interface Asset {
  id?: string;
  assetType?: 'skill' | 'agent-template' | 'workflow-template' | 'prompt-pack' | 'knowledge-pack' | 'tool-connector' | 'model-adapter' | 'automation-pack' | 'industry-pack' | 'enterprise-pack' | 'pack';
  name?: string;
  description?: string;
  publisher?: string;
  pricingModel?: 'free' | 'one-time' | 'subscription' | 'usage';
  price?: number;
  visibility?: 'public' | 'private' | 'org-only';
  certification?: any;
}

export interface Install {
  id?: string;
  assetId?: string;
  tenantId?: string;
  version?: string;
  status?: string;
  installedAt?: string;
}

export interface Transaction {
  id?: string;
  kind?: 'install' | 'execution' | 'subscription' | 'refund' | 'payout';
  assetId?: string;
  tenantId?: string;
  publisherId?: string;
  amount?: number;
  currency?: string;
  status?: string;
}
