/**
 * RTMN Knowledge Marketplace Service
 *
 * Port: 4939
 * Purpose: Knowledge base marketplace for SOPs, documentation, templates,
 *          and reusable knowledge assets across the RTMN ecosystem
 *
 * Features:
 * - Browse knowledge packs by category
 * - Search with filters
 * - Preview content
 * - Purchase and download
 * - Rate and review
 * - Creator dashboard
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

// Auth bypass for internal/test use
const KNOWLEDGE_MARKETPLACE_REQUIRE_AUTH =
  (process.env.KNOWLEDGE_MARKETPLACE_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
const authOrBypass = (req, res, next) =>
  KNOWLEDGE_MARKETPLACE_REQUIRE_AUTH ? requireAuth(req, res, next) : next();

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.KNOWLEDGE_MARKETPLACE_PORT || 4939;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ============================================================
// KNOWLEDGE PACKS DATA STORE
// ============================================================

const knowledgePacks = new PersistentMap('knowledge-packs', { serviceName: 'knowledge-marketplace' });
const reviews = new PersistentMap('reviews', { serviceName: 'knowledge-marketplace' });
const purchases = new PersistentMap('purchases', { serviceName: 'knowledge-marketplace' });
const categories = new PersistentMap('categories', { serviceName: 'knowledge-marketplace' });
const creators = new PersistentMap('creators', { serviceName: 'knowledge-marketplace' });

// Initialize categories
const initialCategories = [
  { id: 'sops', name: 'Standard Operating Procedures', icon: 'list-checks', color: '#10b981', count: 0 },
  { id: 'templates', name: 'Templates', icon: 'file-text', color: '#3b82f6', count: 0 },
  { id: 'guides', name: 'Industry Guides', icon: 'book-open', color: '#f59e0b', count: 0 },
  { id: 'prompts', name: 'AI Prompts', icon: 'sparkles', color: '#8b5cf6', count: 0 },
  { id: 'compliance', name: 'Compliance', icon: 'shield-check', color: '#ec4899', count: 0 },
  { id: 'training', name: 'Training Materials', icon: 'graduation-cap', color: '#6366f1', count: 0 },
  { id: 'playbooks', name: 'Playbooks', icon: 'target', color: '#ef4444', count: 0 },
  { id: 'checklists', name: 'Checklists', icon: 'clipboard-check', color: '#14b8a6', count: 0 },
];
initialCategories.forEach(cat => categories.set(cat.id, cat));

// Initialize sample knowledge packs
const samplePacks = [
  // SOPs
  {
    id: 'kp-restaurant-onboarding',
    name: 'Restaurant Operations SOP',
    description: 'Complete standard operating procedures for restaurant operations including food safety, customer service, and staff management',
    category: 'sops',
    type: 'sop',
    price: 149,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 1234,
      rating: 4.8,
      reviews: 89
    },
    tags: ['restaurant', 'operations', 'food-safety', 'hospitality'],
    preview: {
      pages: 52,
      format: 'PDF',
      includes: ['Employee Handbook', 'Food Safety Guide', 'Customer Service Standards', 'Inventory Management']
    },
    industries: ['Restaurant', 'Food & Beverage', 'Hospitality'],
    difficulty: 'intermediate',
    featured: true,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'kp-hotel-checkin',
    name: 'Hotel Check-in SOP',
    description: 'Professional check-in/check-out procedures for hotels with guest satisfaction focus',
    category: 'sops',
    type: 'sop',
    price: 129,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 892,
      rating: 4.9,
      reviews: 67
    },
    tags: ['hotel', 'check-in', 'front-desk', 'guest-service'],
    preview: {
      pages: 35,
      format: 'PDF',
      includes: ['Pre-Arrival', 'Check-in Process', 'Upselling', 'Check-out', 'Complaints Handling']
    },
    industries: ['Hotel', 'Hospitality', 'Lodging'],
    difficulty: 'beginner',
    featured: true,
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-05-30T10:00:00Z'
  },
  {
    id: 'kp-customer-support',
    name: 'Customer Support SOP',
    description: 'Standardized customer support procedures for consistent service delivery',
    category: 'sops',
    type: 'sop',
    price: 99,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 2345,
      rating: 4.7,
      reviews: 156
    },
    tags: ['support', 'customer-service', 'satisfaction', 'tickets'],
    preview: {
      pages: 45,
      format: 'PDF',
      includes: ['Ticket Management', 'Response Templates', 'Escalation Rules', 'SLA Guidelines']
    },
    industries: ['SaaS', 'E-commerce', 'Any'],
    difficulty: 'beginner',
    featured: false,
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-05-25T10:00:00Z'
  },
  {
    id: 'kp-sales-process',
    name: 'Sales Process SOP',
    description: 'End-to-end sales process from lead to cash with best practices',
    category: 'sops',
    type: 'sop',
    price: 149,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 1567,
      rating: 4.8,
      reviews: 112
    },
    tags: ['sales', 'process', 'crm', 'pipeline'],
    preview: {
      pages: 58,
      format: 'PDF',
      includes: ['Lead Qualification', 'Discovery', 'Demo', 'Proposal', 'Negotiation', 'Closing']
    },
    industries: ['SaaS', 'B2B', 'Professional Services'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-05-20T10:00:00Z'
  },
  {
    id: 'kp-hr-onboarding',
    name: 'Employee Onboarding SOP',
    description: 'Complete onboarding procedures from offer to Day 1 and beyond',
    category: 'sops',
    type: 'sop',
    price: 99,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 1876,
      rating: 4.6,
      reviews: 134
    },
    tags: ['hr', 'onboarding', 'new-hire', 'paperwork'],
    preview: {
      pages: 42,
      format: 'PDF',
      includes: ['Pre-boarding', 'Day 1', 'Week 1', '30-60-90 Days', 'Templates']
    },
    industries: ['All Industries'],
    difficulty: 'beginner',
    featured: false,
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-05-30T10:00:00Z'
  },

  // Templates
  {
    id: 'kp-sales-proposal',
    name: 'Sales Proposal Template',
    description: 'Professional sales proposal template with sections for every deal stage',
    category: 'templates',
    type: 'template',
    price: 49,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 3456,
      rating: 4.7,
      reviews: 234
    },
    tags: ['sales', 'proposal', 'template', 'document'],
    preview: {
      format: 'Word/Google Docs',
      includes: ['Executive Summary', 'Solution Overview', 'Pricing', 'Case Studies', 'Terms']
    },
    industries: ['SaaS', 'B2B', 'Consulting'],
    difficulty: 'beginner',
    featured: true,
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'kp-contract-template',
    name: 'Service Contract Template',
    description: 'Legal-ready service contract template with customizable clauses',
    category: 'templates',
    type: 'template',
    price: 79,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 2345,
      rating: 4.8,
      reviews: 178
    },
    tags: ['contract', 'legal', 'agreement', 'template'],
    preview: {
      format: 'Word/Google Docs',
      includes: ['Services', 'Payment Terms', 'Liability', 'Termination', 'Governing Law']
    },
    industries: ['Legal', 'Consulting', 'Professional Services'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-05-25T10:00:00Z'
  },
  {
    id: 'kp-employee-contract',
    name: 'Employment Contract Template',
    description: 'Standard employment contract template compliant with labor laws',
    category: 'templates',
    type: 'template',
    price: 59,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 1234,
      rating: 4.6,
      reviews: 89
    },
    tags: ['hr', 'employment', 'contract', 'template'],
    preview: {
      format: 'Word/Google Docs',
      includes: ['Position Details', 'Compensation', 'Benefits', 'Confidentiality', 'Termination']
    },
    industries: ['All Industries'],
    difficulty: 'beginner',
    featured: false,
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-05-20T10:00:00Z'
  },
  {
    id: 'kp-marketing-campaign',
    name: 'Marketing Campaign Template',
    description: 'Complete marketing campaign planning and execution template',
    category: 'templates',
    type: 'template',
    price: 69,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 987,
      rating: 4.5,
      reviews: 67
    },
    tags: ['marketing', 'campaign', 'planning', 'template'],
    preview: {
      format: 'Excel/Sheets',
      includes: ['Budget', 'Timeline', 'Channels', 'Assets', 'Metrics']
    },
    industries: ['Marketing', 'Any'],
    difficulty: 'beginner',
    featured: false,
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-05-25T10:00:00Z'
  },
  {
    id: 'kp-financial-report',
    name: 'Monthly Financial Report Template',
    description: 'Automated financial reporting template with P&L, balance sheet, cash flow',
    category: 'templates',
    type: 'template',
    price: 59,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 876,
      rating: 4.7,
      reviews: 56
    },
    tags: ['finance', 'reporting', 'p&l', 'template'],
    preview: {
      format: 'Excel/Sheets',
      includes: ['P&L Statement', 'Balance Sheet', 'Cash Flow', 'Variance Analysis']
    },
    industries: ['All Industries'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-05-30T10:00:00Z'
  },

  // Industry Guides
  {
    id: 'kp-restaurant-guide',
    name: 'Restaurant Operations Guide',
    description: 'Comprehensive guide to running a successful restaurant from scratch',
    category: 'guides',
    type: 'guide',
    price: 199,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 567,
      rating: 4.9,
      reviews: 45
    },
    tags: ['restaurant', 'operations', 'guide', 'startup'],
    preview: {
      pages: 120,
      format: 'PDF',
      includes: ['Location', 'Menu Design', 'Staffing', 'Marketing', 'Financials']
    },
    industries: ['Restaurant', 'Food & Beverage'],
    difficulty: 'advanced',
    featured: true,
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'kp-hotel-guide',
    name: 'Hotel Management Guide',
    description: 'Complete guide to hotel management including revenue optimization',
    category: 'guides',
    type: 'guide',
    price: 249,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 345,
      rating: 4.9,
      reviews: 28
    },
    tags: ['hotel', 'management', 'revenue', 'guide'],
    preview: {
      pages: 150,
      format: 'PDF',
      includes: ['Operations', 'Revenue Management', 'Marketing', 'Staffing', 'Technology']
    },
    industries: ['Hotel', 'Hospitality'],
    difficulty: 'advanced',
    featured: false,
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-05-30T10:00:00Z'
  },
  {
    id: 'kp-retail-guide',
    name: 'Retail Best Practices Guide',
    description: 'Industry best practices for retail store management and growth',
    category: 'guides',
    type: 'guide',
    price: 179,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 456,
      rating: 4.7,
      reviews: 34
    },
    tags: ['retail', 'best-practices', 'management', 'guide'],
    preview: {
      pages: 95,
      format: 'PDF',
      includes: ['Store Layout', 'Inventory', 'Staff', 'Customer Experience', 'Analytics']
    },
    industries: ['Retail', 'E-commerce'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-05-25T10:00:00Z'
  },
  {
    id: 'kp-healthcare-guide',
    name: 'Healthcare Compliance Guide',
    description: 'Complete guide to healthcare regulations and compliance requirements',
    category: 'guides',
    type: 'guide',
    price: 299,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 234,
      rating: 4.8,
      reviews: 19
    },
    tags: ['healthcare', 'compliance', 'hipaa', 'guide'],
    preview: {
      pages: 180,
      format: 'PDF',
      includes: ['HIPAA', 'Privacy', 'Security', 'Documentation', 'Training']
    },
    industries: ['Healthcare', 'Medical'],
    difficulty: 'advanced',
    featured: false,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-05-30T10:00:00Z'
  },

  // AI Prompts
  {
    id: 'kp-sales-prompts',
    name: 'Sales AI Prompt Library',
    description: '500+ ready-to-use AI prompts for sales automation and outreach',
    category: 'prompts',
    type: 'prompts',
    price: 49,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 4567,
      rating: 4.8,
      reviews: 312
    },
    tags: ['ai', 'prompts', 'sales', 'automation', 'chatgpt'],
    preview: {
      prompts: 500,
      format: 'Notion/Text',
      includes: ['Cold Emails', 'Follow-ups', 'LinkedIn', 'Discovery', 'Closing']
    },
    industries: ['Sales', 'Any'],
    difficulty: 'beginner',
    featured: true,
    createdAt: '2026-01-05T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'kp-hr-prompts',
    name: 'HR AI Prompt Library',
    description: '300+ prompts for HR automation including recruiting, onboarding, and employee relations',
    category: 'prompts',
    type: 'prompts',
    price: 39,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 2345,
      rating: 4.7,
      reviews: 156
    },
    tags: ['ai', 'prompts', 'hr', 'recruiting', 'chatgpt'],
    preview: {
      prompts: 300,
      format: 'Notion/Text',
      includes: ['Job Descriptions', 'Interview Questions', 'Policies', 'Performance']
    },
    industries: ['HR', 'Any'],
    difficulty: 'beginner',
    featured: false,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-05-30T10:00:00Z'
  },
  {
    id: 'kp-marketing-prompts',
    name: 'Marketing AI Prompt Library',
    description: '400+ prompts for content creation, social media, and campaign optimization',
    category: 'prompts',
    type: 'prompts',
    price: 49,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 3456,
      rating: 4.8,
      reviews: 234
    },
    tags: ['ai', 'prompts', 'marketing', 'content', 'social-media'],
    preview: {
      prompts: 400,
      format: 'Notion/Text',
      includes: ['Blog Posts', 'Social Media', 'Email', 'Ads', 'SEO']
    },
    industries: ['Marketing', 'Any'],
    difficulty: 'beginner',
    featured: false,
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-05-25T10:00:00Z'
  },
  {
    id: 'kp-support-prompts',
    name: 'Customer Support AI Prompt Library',
    description: '250+ prompts for automated customer support responses and ticket handling',
    category: 'prompts',
    type: 'prompts',
    price: 39,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 1876,
      rating: 4.6,
      reviews: 123
    },
    tags: ['ai', 'prompts', 'support', 'tickets', 'chatgpt'],
    preview: {
      prompts: 250,
      format: 'Notion/Text',
      includes: ['FAQs', 'Refunds', 'Technical', 'Billing', 'Escalation']
    },
    industries: ['Support', 'SaaS', 'E-commerce'],
    difficulty: 'beginner',
    featured: false,
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-05-20T10:00:00Z'
  },

  // Compliance
  {
    id: 'kp-gdpr-pack',
    name: 'GDPR Compliance Pack',
    description: 'Complete GDPR documentation including policies, procedures, and templates',
    category: 'compliance',
    type: 'compliance',
    price: 299,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 567,
      rating: 4.9,
      reviews: 45
    },
    tags: ['gdpr', 'compliance', 'privacy', 'europe', 'documentation'],
    preview: {
      documents: 25,
      format: 'PDF/Word',
      includes: ['Privacy Policy', 'Consent Forms', 'DPO Procedures', 'Data Mapping', 'Incident Response']
    },
    industries: ['Any (EU)', 'Technology', 'E-commerce'],
    difficulty: 'advanced',
    featured: true,
    createdAt: '2026-01-25T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'kp-hipaa-pack',
    name: 'HIPAA Compliance Pack',
    description: 'Healthcare compliance documentation including policies and risk assessments',
    category: 'compliance',
    type: 'compliance',
    price: 399,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 234,
      rating: 4.9,
      reviews: 18
    },
    tags: ['hipaa', 'compliance', 'healthcare', 'phi', 'security'],
    preview: {
      documents: 35,
      format: 'PDF/Word',
      includes: ['Security Policies', 'Risk Assessment', 'Business Associate Agreements', 'Training Materials']
    },
    industries: ['Healthcare', 'Medical', 'Health Tech'],
    difficulty: 'advanced',
    featured: false,
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-05-30T10:00:00Z'
  },
  {
    id: 'kp-soc2-pack',
    name: 'SOC2 Documentation Pack',
    description: 'Complete SOC2 Type II documentation for technology companies',
    category: 'compliance',
    type: 'compliance',
    price: 349,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 345,
      rating: 4.8,
      reviews: 27
    },
    tags: ['soc2', 'compliance', 'security', 'audit', 'trust'],
    preview: {
      documents: 40,
      format: 'PDF/Word',
      includes: ['Security Policies', 'Access Controls', 'Incident Response', 'Vendor Management']
    },
    industries: ['SaaS', 'Technology', 'Cloud Services'],
    difficulty: 'advanced',
    featured: false,
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-05-25T10:00:00Z'
  },
  {
    id: 'kp-iso27001-pack',
    name: 'ISO 27001 Controls Pack',
    description: 'Information security management documentation for ISO 27001 certification',
    category: 'compliance',
    type: 'compliance',
    price: 299,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 189,
      rating: 4.7,
      reviews: 15
    },
    tags: ['iso27001', 'compliance', 'security', 'certification', 'isms'],
    preview: {
      documents: 50,
      format: 'PDF/Word',
      includes: ['ISMS Manual', 'Risk Assessment', 'Control Procedures', 'Audit Checklist']
    },
    industries: ['Any', 'Enterprise', 'Government'],
    difficulty: 'advanced',
    featured: false,
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-05-30T10:00:00Z'
  },

  // Training Materials
  {
    id: 'kp-new-manager-training',
    name: 'New Manager Training Program',
    description: 'Complete training program for first-time managers with modules and assessments',
    category: 'training',
    type: 'training',
    price: 149,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 876,
      rating: 4.7,
      reviews: 56
    },
    tags: ['training', 'management', 'leadership', 'onboarding'],
    preview: {
      modules: 12,
      format: 'PDF/Video Links',
      includes: ['Leadership Basics', 'One-on-Ones', 'Performance', 'Hiring', 'Conflict']
    },
    industries: ['All Industries'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: '2026-02-05T10:00:00Z',
    updatedAt: '2026-05-25T10:00:00Z'
  },
  {
    id: 'kp-onboarding-training',
    name: 'Company Onboarding Training',
    description: 'Ready-to-use onboarding program for new employee orientation',
    category: 'training',
    type: 'training',
    price: 99,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 1234,
      rating: 4.6,
      reviews: 78
    },
    tags: ['training', 'onboarding', 'orientation', 'new-hire'],
    preview: {
      modules: 8,
      format: 'PDF/Slides',
      includes: ['Company History', 'Culture', 'Tools', 'Processes', 'Policies']
    },
    industries: ['All Industries'],
    difficulty: 'beginner',
    featured: false,
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-05-30T10:00:00Z'
  },

  // Playbooks
  {
    id: 'kp-sales-playbook',
    name: 'Enterprise Sales Playbook',
    description: 'Battle-tested sales playbook for closing enterprise deals',
    category: 'playbooks',
    type: 'playbook',
    price: 199,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 654,
      rating: 4.8,
      reviews: 45
    },
    tags: ['sales', 'playbook', 'enterprise', 'methodology'],
    preview: {
      pages: 85,
      format: 'PDF',
      includes: ['Discovery Framework', 'Value Props', 'Objection Handling', 'Competitive Positioning']
    },
    industries: ['SaaS', 'Enterprise', 'B2B'],
    difficulty: 'advanced',
    featured: true,
    createdAt: '2026-01-30T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'kp-customer-success-playbook',
    name: 'Customer Success Playbook',
    description: 'Complete guide to building a scalable customer success function',
    category: 'playbooks',
    type: 'playbook',
    price: 149,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 456,
      rating: 4.7,
      reviews: 34
    },
    tags: ['customer-success', 'playbook', 'retention', 'churn'],
    preview: {
      pages: 65,
      format: 'PDF',
      includes: ['Health Scoring', 'Onboarding', 'QBRs', 'Renewals', 'Expansion']
    },
    industries: ['SaaS', 'Subscription'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-05-25T10:00:00Z'
  },

  // Checklists
  {
    id: 'kp-launch-checklist',
    name: 'Product Launch Checklist',
    description: 'Comprehensive checklist for launching new products or features',
    category: 'checklists',
    type: 'checklist',
    price: 29,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 2345,
      rating: 4.6,
      reviews: 167
    },
    tags: ['checklist', 'launch', 'product', 'go-to-market'],
    preview: {
      items: 100,
      format: 'Excel/Notion',
      includes: ['Pre-Launch', 'Launch Week', 'Post-Launch', 'Monitoring']
    },
    industries: ['Technology', 'SaaS', 'Any'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-05-30T10:00:00Z'
  },
  {
    id: 'kp-security-checklist',
    name: 'Security Audit Checklist',
    description: 'Annual security audit checklist covering all major domains',
    category: 'checklists',
    type: 'checklist',
    price: 49,
    priceType: 'one-time',
    creator: {
      id: 'creator-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.9
    },
    stats: {
      sales: 876,
      rating: 4.8,
      reviews: 56
    },
    tags: ['checklist', 'security', 'audit', 'compliance'],
    preview: {
      items: 150,
      format: 'Excel',
      includes: ['Network', 'Application', 'Access', 'Data', 'Incident Response']
    },
    industries: ['Technology', 'Any'],
    difficulty: 'advanced',
    featured: false,
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-05-25T10:00:00Z'
  }
];

// Add packs to store
samplePacks.forEach(pack => knowledgePacks.set(pack.id, pack));

// Update category counts
knowledgePacks.forEach(pack => {
  if (categories.has(pack.category)) {
    const cat = categories.get(pack.category);
    cat.count++;
    categories.set(pack.category, cat);
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Knowledge Marketplace',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      knowledgePacks: knowledgePacks.size,
      categories: categories.size,
      totalSales: Array.from(knowledgePacks.values()).reduce((sum, p) => sum + p.stats.sales, 0)
    }
  });
});

// ============================================================
// PUBLIC ENDPOINTS
// ============================================================

// Get all knowledge packs with filters
app.get('/api/knowledge', (req, res) => {
  const { category, type, search, minPrice, maxPrice, industry, sort, page = 1, limit = 20 } = req.query;

  let result = Array.from(knowledgePacks.values());

  // Filters
  if (category) result = result.filter(p => p.category === category);
  if (type) result = result.filter(p => p.type === type);
  if (industry) result = result.filter(p => p.industries.includes(industry));
  if (minPrice) result = result.filter(p => p.price >= parseInt(minPrice));
  if (maxPrice) result = result.filter(p => p.price <= parseInt(maxPrice));
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(s) ||
      p.description.toLowerCase().includes(s) ||
      p.tags.some(t => t.toLowerCase().includes(s))
    );
  }

  // Sorting
  if (sort === 'popular') result.sort((a, b) => b.stats.sales - a.stats.sales);
  else if (sort === 'rating') result.sort((a, b) => b.stats.rating - a.stats.rating);
  else if (sort === 'price-low') result.sort((a, b) => a.price - b.price);
  else if (sort === 'price-high') result.sort((a, b) => b.price - a.price);
  else if (sort === 'newest') result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Pagination
  const start = (parseInt(page) - 1) * parseInt(limit);
  const end = start + parseInt(limit);
  const paginated = result.slice(start, end);

  res.json({
    success: true,
    total: result.length,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(result.length / parseInt(limit)),
    knowledgePacks: paginated
  });
});

// Get single knowledge pack
app.get('/api/knowledge/:id', (req, res) => {
  const pack = knowledgePacks.get(req.params.id);
  if (!pack) {
    return res.status(404).json({ success: false, error: 'Knowledge pack not found' });
  }

  // Get reviews
  const packReviews = Array.from(reviews.values())
    .filter(r => r.packId === req.params.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    pack,
    reviews: packReviews
  });
});

// Get categories
app.get('/api/categories', (req, res) => {
  const cats = Array.from(categories.values()).sort((a, b) => b.count - a.count);
  res.json({ success: true, categories: cats });
});

// Get featured packs
app.get('/api/knowledge/featured/list', (req, res) => {
  const featured = Array.from(knowledgePacks.values())
    .filter(p => p.featured)
    .sort((a, b) => b.stats.sales - a.stats.sales);
  res.json({ success: true, knowledgePacks: featured });
});

// Search knowledge
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ success: false, error: 'Query required' });

  const s = q.toLowerCase();
  const results = Array.from(knowledgePacks.values())
    .filter(p =>
      p.name.toLowerCase().includes(s) ||
      p.description.toLowerCase().includes(s) ||
      p.tags.some(t => t.toLowerCase().includes(s)))
    .slice(0, 10);

  res.json({
    success: true,
    query: q,
    count: results.length,
    results
  });
});

// Get industries
app.get('/api/industries', (req, res) => {
  const industries = new Set();
  knowledgePacks.forEach(p => p.industries.forEach(i => industries.add(i)));
  res.json({ success: true, industries: Array.from(industries).sort() });
});

// ============================================================
// PURCHASE
// ============================================================

// Purchase knowledge pack
app.post('/api/knowledge/:id/purchase',requireAuth,  authOrBypass,  (req, res) => {
  const pack = knowledgePacks.get(req.params.id);
  if (!pack) {
    return res.status(404).json({ success: false, error: 'Knowledge pack not found' });
  }

  const { userId, organizationId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID required' });
  }

  // Check if already purchased
  const existing = Array.from(purchases.values()).find(
    p => p.packId === req.params.id && p.userId === userId
  );
  if (existing) {
    return res.json({
      success: true,
      message: 'Already purchased',
      purchase: existing
    });
  }

  const purchase = {
    id: `purchase-${uuidv4()}`,
    packId: pack.id,
    packName: pack.name,
    userId,
    organizationId,
    price: pack.price,
    purchasedAt: new Date().toISOString(),
    downloadUrl: `/api/knowledge/${pack.id}/download`,
    license: 'single-use'
  };

  purchases.set(purchase.id, purchase);

  // Update sales count
  pack.stats.sales++;
  knowledgePacks.set(pack.id, pack);

  res.json({
    success: true,
    message: 'Purchase successful',
    purchase
  });
});

// Get user purchases
app.get('/api/purchases', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID required' });
  }

  const userPurchases = Array.from(purchases.values())
    .filter(p => p.userId === userId)
    .sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt));

  res.json({ success: true, purchases: userPurchases });
});

// Download knowledge pack (simulated)
app.get('/api/knowledge/:id/download', (req, res) => {
  const pack = knowledgePacks.get(req.params.id);
  if (!pack) {
    return res.status(404).json({ success: false, error: 'Knowledge pack not found' });
  }

  // In production, this would verify purchase and return actual download URL
  res.json({
    success: true,
    message: 'Download link generated',
    packId: pack.id,
    name: pack.name,
    format: pack.preview?.format || 'PDF',
    downloadUrl: `https://storage.rtmn.com/knowledge/${pack.id}.zip`
  });
});

// ============================================================
// REVIEWS
// ============================================================

// Add review
app.post('/api/knowledge/:id/reviews',requireAuth,  authOrBypass,  (req, res) => {
  const pack = knowledgePacks.get(req.params.id);
  if (!pack) {
    return res.status(404).json({ success: false, error: 'Knowledge pack not found' });
  }

  const { rating, comment, author } = req.body;
  if (!rating || !comment) {
    return res.status(400).json({ success: false, error: 'Rating and comment required' });
  }

  const review = {
    id: `review-${uuidv4()}`,
    packId: req.params.id,
    rating,
    comment,
    author: author || 'Anonymous',
    createdAt: new Date().toISOString()
  };

  reviews.set(review.id, review);

  // Update pack rating
  const allReviews = Array.from(reviews.values()).filter(r => r.packId === req.params.id);
  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
  pack.stats.rating = Math.round(avgRating * 10) / 10;
  pack.stats.reviews = allReviews.length;
  knowledgePacks.set(pack.id, pack);

  res.json({ success: true, review });
});

// ============================================================
// CREATOR DASHBOARD
// ============================================================

// Get creator knowledge packs
app.get('/api/creator/packs', (req, res) => {
  const { creatorId } = req.query;
  if (!creatorId) {
    return res.status(400).json({ success: false, error: 'Creator ID required' });
  }

  const creatorPacks = Array.from(knowledgePacks.values())
    .filter(p => p.creator.id === creatorId);

  res.json({ success: true, packs: creatorPacks });
});

// Create knowledge pack (for creators)
app.post('/api/knowledge',requireAuth,  authOrBypass,  (req, res) => {
  const { name, description, category, type, price, preview, industries, tags, creator } = req.body;

  if (!name || !category || !creator) {
    return res.status(400).json({ success: false, error: 'Name, category, and creator required' });
  }

  const pack = {
    id: `kp-${uuidv4()}`,
    name,
    description: description || '',
    category,
    type: type || 'other',
    price: price || 0,
    priceType: 'one-time',
    creator,
    stats: {
      sales: 0,
      rating: 0,
      reviews: 0
    },
    tags: tags || [],
    preview: preview || {},
    industries: industries || ['Any'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  knowledgePacks.set(pack.id, pack);

  // Update category count
  if (categories.has(category)) {
    const cat = categories.get(category);
    cat.count++;
    categories.set(category, cat);
  }

  res.status(201).json({ success: true, pack });
});

// Update knowledge pack
app.patch('/api/knowledge/:id',requireAuth,  authOrBypass,  (req, res) => {
  const pack = knowledgePacks.get(req.params.id);
  if (!pack) {
    return res.status(404).json({ success: false, error: 'Knowledge pack not found' });
  }

  const updated = { ...pack, ...req.body, updatedAt: new Date().toISOString() };
  knowledgePacks.set(req.params.id, updated);

  res.json({ success: true, pack: updated });
});

// ============================================================
// ANALYTICS
// ============================================================

// Get marketplace stats
app.get('/api/stats', (req, res) => {
  const allPacks = Array.from(knowledgePacks.values());
  const totalSales = allPacks.reduce((sum, p) => sum + p.stats.sales, 0);
  const avgRating = allPacks.reduce((sum, p) => sum + p.stats.rating, 0) / allPacks.length;

  res.json({
    success: true,
    stats: {
      totalPacks: allPacks.length,
      totalSales,
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: allPacks.reduce((sum, p) => sum + p.stats.reviews, 0),
      byCategory: Array.from(categories.values()),
      byType: {
        sop: allPacks.filter(p => p.type === 'sop').length,
        template: allPacks.filter(p => p.type === 'template').length,
        guide: allPacks.filter(p => p.type === 'guide').length,
        prompts: allPacks.filter(p => p.type === 'prompts').length,
        compliance: allPacks.filter(p => p.type === 'compliance').length,
        training: allPacks.filter(p => p.type === 'training').length,
        playbook: allPacks.filter(p => p.type === 'playbook').length,
        checklist: allPacks.filter(p => p.type === 'checklist').length
      }
    }
  });
});

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ============================================================
// START SERVER
// ============================================================
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



// Auto-start gated — skip listen() in test mode or when explicitly disabled
if (process.env.NODE_ENV !== 'test' && !process.env.KNOWLEDGE_MARKETPLACE_NO_LISTEN) {
  const server = app.listen(PORT, () => {
    console.log(`[Knowledge Marketplace] Service started on port ${PORT}`);
    console.log(`[Knowledge Marketplace] ${knowledgePacks.size} knowledge packs loaded`);
    console.log(`[Knowledge Marketplace] ${categories.size} categories available`);
  });
  installGracefulShutdown(server);
}

// Named exports for vitest
module.exports = app;
module.exports.app = app;
module.exports.authOrBypass = authOrBypass;
module.exports.KNOWLEDGE_MARKETPLACE_REQUIRE_AUTH = KNOWLEDGE_MARKETPLACE_REQUIRE_AUTH;
module.exports.PORT = PORT;
