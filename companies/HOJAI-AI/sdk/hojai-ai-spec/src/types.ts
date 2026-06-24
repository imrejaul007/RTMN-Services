/**
 * @hojai/ai-spec — core types and Zod schemas.
 *
 * The three artifacts every HOJAI project carries:
 *   1. hojai.ai.md          — markdown AI tools read first
 *   2. .hojai/manifest.json — machine-readable project schema
 *   3. .hojai/capability.json — Nexha federation profile
 *
 * All three are versioned via `schemaVersion`. The first version is 1.0.0.
 */

import { z } from 'zod';

// ─── Common enums ──────────────────────────────────────────────

export const STARTER_TYPES = [
  'marketplace', 'b2b', 'company', 'hotel', 'restaurant',
  'logistics', 'crm', 'erp', 'pos', 'sdk', 'library', 'other'
] as const;
export type StarterType = typeof STARTER_TYPES[number];

export const REGIONS = [
  'us-east', 'us-west', 'eu-west', 'eu-central', 'ap-south',
  'ap-south-east', 'me', 'africa', 'global'
] as const;
export type Region = typeof REGIONS[number];

export const LANGUAGES = [
  'en', 'hi', 'es', 'ar', 'fr', 'de', 'zh', 'ja', 'ko', 'pt', 'ru', 'it'
] as const;
export type Language = typeof LANGUAGES[number];

export const AGENT_ROLES = [
  'CEO', 'Sales', 'Marketing', 'Procurement', 'Finance', 'HR',
  'Operations', 'Support', 'Logistics', 'Dispatch', 'Fleet',
  'Customer', 'Reception', 'Housekeeping', 'Revenue',
  'Front-of-house', 'Kitchen', 'Cashier', 'Inventory',
  'Receptionist', 'Concierge', 'Pharmacist', 'Doctor', 'Nurse',
  'Teacher', 'Tutor', 'Designer', 'Writer', 'Other'
] as const;
export type AgentRole = typeof AGENT_ROLES[number];

export const STACK_TEMPLATES = [
  'node-express-typescript', 'node-fastify-typescript', 'nestjs-typescript',
  'nextjs-app-router', 'nextjs-pages', 'remix', 'react-vite', 'sveltekit',
  'flutter', 'react-native', 'swift', 'kotlin',
  'mongodb', 'postgresql', 'mysql', 'redis', 'sqlite', 'dynamodb',
  'sutar', 'nexha', 'corpId', 'memoryos', 'twinos'
] as const;
export type StackTemplate = typeof STACK_TEMPLATES[number];

// ─── Manifest schema (machine-readable project description) ────

export const AgentSpecSchema = z.object({
  role: z.string(),
  purpose: z.string(),
  file: z.string().optional(),
  capabilities: z.array(z.string()).optional()
});

export const StackSpecSchema = z.object({
  backend: z.string().optional(),
  frontend: z.string().optional(),
  mobile: z.string().optional(),
  database: z.union([z.string(), z.array(z.string())]).optional(),
  ai: z.string().optional()
}).strict();

export const ConventionsSpecSchema = z.object({
  validation: z.string().optional(),
  auth: z.string().optional(),
  events: z.string().optional(),
  tests: z.string().optional(),
  linter: z.string().optional(),
  formatter: z.string().optional()
}).strict();

export const EntrypointsSpecSchema = z.object({
  backend: z.string().optional(),
  frontend: z.string().optional(),
  mobile: z.string().optional(),
  nexha: z.string().optional()
}).strict();

export const ScriptsSpecSchema = z.object({
  dev: z.string().optional(),
  build: z.string().optional(),
  test: z.string().optional(),
  deploy: z.string().optional(),
  lint: z.string().optional()
}).strict();

export const ManifestSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  projectId: z.string(),
  /** Short hash of all project files, for integrity */
  projectHash: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(STARTER_TYPES),
  industry: z.string().optional(),
  region: z.enum(REGIONS).optional(),
  languages: z.array(z.enum(LANGUAGES)).min(1),
  primaryLanguage: z.enum(LANGUAGES).optional(),
  hojaiVersion: z.string().default('1.0.0'),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  stack: StackSpecSchema.optional(),
  agents: z.array(AgentSpecSchema).default([]),
  integrations: z.array(z.string()).default([]),
  conventions: ConventionsSpecSchema.optional(),
  entrypoints: EntrypointsSpecSchema.optional(),
  scripts: ScriptsSpecSchema.optional(),
  files: z.array(z.string()).optional()
}).strict();

export type Manifest = z.infer<typeof ManifestSchema>;
export type AgentSpec = z.infer<typeof AgentSpecSchema>;
export type StackSpec = z.infer<typeof StackSpecSchema>;
export type ConventionsSpec = z.infer<typeof ConventionsSpecSchema>;
export type EntrypointsSpec = z.infer<typeof EntrypointsSpecSchema>;
export type ScriptsSpec = z.infer<typeof ScriptsSpecSchema>;

// ─── Capability schema (Nexha federation profile) ──────────────

export const CapabilityItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.enum(['core', 'business', 'support']),
  /** 'offer' = we provide this; 'seek' = we want to consume this */
  type: z.enum(['offer', 'seek']).default('offer'),
  description: z.string().optional()
});

export const SlaTargetsSchema = z.object({
  uptimePercent: z.number().min(0).max(100).optional(),
  responseMs: z.number().positive().optional(),
  /** ISO timezone */
  timezone: z.string().optional()
});

export const CapabilitySchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  projectId: z.string(),
  /** Platform-as-an-Economy layer: 1=Consumer, 2=Industry, 3=Vertical, 4=B2B, 5=DevTools, 6=AI-Native, 7=Autonomous, 8=Company, 9=Government */
  layer: z.number().int().min(1).max(9).optional(),
  name: z.string(),
  description: z.string().optional(),
  capabilities: z.array(CapabilityItemSchema),
  regions: z.array(z.enum(REGIONS)).optional(),
  languages: z.array(z.enum(LANGUAGES)).optional(),
  slaTargets: SlaTargetsSchema.optional()
}).strict();

export type Capability = z.infer<typeof CapabilitySchema>;
export type CapabilityItem = z.infer<typeof CapabilityItemSchema>;
export type SlaTargets = z.infer<typeof SlaTargetsSchema>;

// ─── Project context (the in-memory representation) ─────────────

export interface ProjectContext {
  manifest: Manifest;
  capability: Capability;
  /** Path to hojai.ai.md that was written (or will be written) */
  aiMdPath: string;
}
