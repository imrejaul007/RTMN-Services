/**
 * BCP Engine — Type definitions
 *
 * A Business Capability Pack (BCP) is a pre-built bundle of:
 * - AI employees (SUTAR agents)
 * - Skills (SkillOS capabilities)
 * - Workflows (FlowOS sequences)
 * - Integrations (Stripe, Slack, WhatsApp, etc.)
 * - KPIs + metrics
 * - Guided setup steps
 */

export type BCPStatus = 'draft' | 'published' | 'deprecated';
export type BCPCategory =
  | 'sales' | 'marketing' | 'finance' | 'proprocurement' | 'support'
  | 'operations' | 'hr' | 'legal' | 'it' | 'analytics'
  | 'commerce' | 'logistics' | 'compliance' | 'customer-success'
  | 'industry' | 'company' | 'other';
export type BCPPriceModel = 'free' | 'subscription' | 'per-seat' | 'usage' | 'one-time';
export type BCPSetupStepStatus = 'pending' | 'in-progress' | 'done' | 'skipped';
export type BCPInstallStatus = 'installing' | 'active' | 'failed' | 'uninstalled';

/** An AI employee definition inside a BCP. */
export interface BCPEmployee {
  id: string;
  name: string;          // "Sales Agent"
  role: string;           // "sales-agent"
  description: string;
  capabilities: string[]; // ["lead-generation", "proposal-generation", "negotiation"]
  kpis: string[];        // ["conversion-rate", "deals-closed", "avg-deal-size"]
  port: number;           // assigned port for this agent
}

/** A SkillOS skill bundled in a BCP. */
export interface BCPSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  required: boolean;
}

/** A FlowOS workflow bundled in a BCP. */
export interface BCPWorkflow {
  id: string;
  name: string;
  description: string;
  steps: string[];     // step IDs
  trigger: 'manual' | 'scheduled' | 'event';
  frequency?: string;   // "daily", "hourly", etc.
}

/** An integration bundled in a BCP. */
export interface BCPIntegration {
  id: string;
  name: string;         // "Stripe"
  category: string;      // "payments"
  configSchema: Record<string, unknown>; // JSON schema for required config
  required: boolean;
  docsUrl?: string;
}

/** One guided setup step for installing a BCP. */
export interface BCPSetupStep {
  id: string;
  title: string;
  description: string;
  order: number;
  status: BCPSetupStepStatus;
  required: boolean;
  configFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'toggle' | 'api-key';
    placeholder?: string;
    options?: string[];
    required: boolean;
  }>;
}

/** A Business Capability Pack definition. */
export interface BusinessCapabilityPack {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: BCPCategory;
  status: BCPStatus;
  version: string;
  publisher: string;
  publisherId: string;
  tags: string[];
  thumbnail?: string;
  demoUrl?: string;
  docsUrl?: string;
  /** Pricing */
  priceModel: BCPPriceModel;
  priceAmount?: number;     // in INR
  priceCurrency?: string;   // default INR
  /** What's in the pack */
  employees: BCPEmployee[];
  skills: BCPSkill[];
  workflows: BCPWorkflow[];
  integrations: BCPIntegration[];
  /** Setup */
  setupSteps: BCPSetupStep[];
  estimatedSetupMinutes: number;
  /** Stats */
  installCount: number;
  rating: number;           // 0-5
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

/** A company installation of a BCP. */
export interface BCPInstallation {
  id: string;
  bcpId: string;
  companyId: string;
  status: BCPInstallStatus;
  config: Record<string, unknown>;
  installedEmployees: string[];   // employee IDs
  installedSkills: string[];
  installedWorkflows: string[];
  installedIntegrations: string[];
  stepStatus: Record<string, BCPSetupStepStatus>;
  installedAt: string;
  updatedAt: string;
}

/** Discovery / browse response. */
export interface BCPBrowseResponse {
  packs: BusinessCapabilityPack[];
  total: number;
  page: number;
  pageSize: number;
  categories: Record<BCPCategory, number>;
}

/** Search query. */
export interface BCPSearchQuery {
  q?: string;
  category?: BCPCategory;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: 'popular' | 'rating' | 'recent' | 'name';
  page?: number;
  pageSize?: number;
}

/** Health response. */
export interface BCPHealthResponse {
  status: 'healthy';
  service: string;
  version: string;
  port: number;
  uptime: number;
  totalPacks: number;
  totalInstallations: number;
  categories: string[];
  timestamp: string;
}