/**
 * Marketplace Listing — a published AI agent, service, or twin template.
 *
 * Per ADR-0010 Phase 5 (2026-06-22): every listing carries a `tenantId` for
 * isolation. Listings can be public (visible to all tenants) or private
 * (visible only to the publishing tenant). Each listing links to a
 * `directoryCompanyId` in `nexha-business-directory` so consumers can
 * resolve trust + verification status.
 *
 * Lifecycle:
 *   DRAFT   → published (PUBLISHED)
 *   PUBLISHED → unpublished (UNPUBLISHED) | suspended (SUSPENDED)
 *   Any → ARCHIVED (admin action, terminal)
 *
 * Categories are a controlled vocabulary (see CATEGORIES) so cross-tenant
 * search and filtering is consistent.
 */

import mongoose from 'mongoose';

export const LISTING_STATUS = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'SUSPENDED', 'ARCHIVED'];
export const LISTING_VISIBILITY = ['PUBLIC', 'PRIVATE', 'UNLISTED'];
export const PRICING_MODELS = ['free', 'one-time', 'subscription', 'usage-based', 'quote-only'];

export const CATEGORIES = [
  // Core AI Categories
  'agent',              // AI Agents (individual specialists)
  'ai-employee',        // AI Employees (virtual workers - killer feature)
  'ai-team',            // AI Teams (multi-agent teams)
  'skill',              // Skills (reusable capabilities)
  'memory-pack',        // Memory Packs (domain knowledge)
  'twin',               // Twin Packs (digital twins)

  // Business Structure
  'department-os',      // Department OS (complete departments)
  'industry-os',        // Industry OS (vertical solutions)
  'business-capability-pack', // Business Capability Packs (killer feature)
  'company-blueprint',  // Company Blueprints (pre-built companies)

  // Workflows & Automation
  'workflow',           // Workflows (multi-step processes)
  'automation',         // Automation packs
  'policy-pack',        // Policy Packs (compliance)

  // Content & Design
  'ui-kit',             // UI Component Packs
  'theme',              // Visual themes
  'widget',             // Widgets (embeddable components)
  'mobile-app',         // Mobile apps
  'prompt-pack',        // Prompt Packs (tested prompts)
  'knowledge-pack',     // Knowledge Packs (knowledge bases)

  // Integrations & APIs
  'integration',        // Integration Connectors
  'api',                // APIs (exposed services)
  'mcp-server',         // MCP Servers (Model Context Protocol)
  'sdk-extension',       // SDK Extensions

  // Specialized
  'data',               // Data Connectors
  'simulation',         // Simulation Packs
  'analytics',          // Analytics Packs
  'ai-model',           // AI Models (vertical-specific)

  // Commerce
  'service',            // Services (general services)
  'consulting',         // Consulting services
  'training',           // Training services
  'starter-kit',        // Starter Kits (pre-built projects)
  'autonomous-network', // Autonomous Networks (Nexha extensions)
  'marketplace-blueprint', // Marketplace Blueprints
  'business-playbook',  // Business Playbooks
];

const ListingSchema = new mongoose.Schema(
  {
    tenantId:          { type: String, required: true, index: true },
    listingId:         { type: String, required: true },
    title:             { type: String, required: true },
    description:       { type: String, default: '' },
    shortDescription:  { type: String, default: '' },
    category:          { type: String, enum: CATEGORIES, required: true, index: true },
    tags:              { type: [String], default: [] },
    pricingModel:      { type: String, enum: PRICING_MODELS, default: 'free' },
    price:             { type: Number, default: 0 },         // in minor units (cents/paise)
    currency:          { type: String, default: 'INR' },
    visibility:        { type: String, enum: LISTING_VISIBILITY, default: 'PUBLIC', index: true },
    status:            { type: String, enum: LISTING_STATUS, default: 'DRAFT', index: true },
    // Linkage to nexha-business-directory (companies/agents)
    directoryCompanyId: { type: String, default: null, index: true },
    directoryAgentId:   { type: String, default: null, index: true },
    // Trust linkage (denormalized for fast read; canonical source is SADA)
    trustScore:        { type: Number, default: null, min: 0, max: 100 },
    // Counters (denormalized for listing-detail reads)
    reviewCount:       { type: Number, default: 0 },
    averageRating:     { type: Number, default: 0, min: 0, max: 5 },
    installCount:      { type: Number, default: 0 },
    viewCount:         { type: Number, default: 0 },
    // Publisher info (free text — usually also in directory)
    publisherName:     { type: String, default: '' },
    publisherUrl:      { type: String, default: '' },
    // Sample data + assets (URLs, not the assets themselves)
    sampleData:        { type: mongoose.Schema.Types.Mixed, default: {} },
    assets:            { type: [String], default: [] },
    metadata:          { type: mongoose.Schema.Types.Mixed, default: {} },
    publishedAt:       { type: Date, default: null },
    createdAt:         { type: Date, default: Date.now, index: true },
    updatedAt:         { type: Date, default: Date.now },
  },
  { versionKey: false, minimize: false },
);

// Per-tenant uniqueness
ListingSchema.index({ tenantId: 1, listingId: 1 }, { unique: true });

// Public discovery: PUBLISHED + PUBLIC, sorted by recent
ListingSchema.index({ visibility: 1, status: 1, publishedAt: -1 });
ListingSchema.index({ visibility: 1, status: 1, category: 1, publishedAt: -1 });
ListingSchema.index({ visibility: 1, status: 1, averageRating: -1, reviewCount: -1 });

// Text search across title/description (case-insensitive)
ListingSchema.index({ title: 'text', description: 'text', tags: 'text' });

ListingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.isModified('status') && this.status === 'PUBLISHED' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

export const Listing = mongoose.model('MarketplaceListing', ListingSchema);
export default Listing;
