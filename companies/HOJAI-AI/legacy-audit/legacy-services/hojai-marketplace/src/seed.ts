/**
 * Seed Hojai Marketplace with sample agents
 */

import { v4 as uuidv4 } from 'uuid';

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  provider: {
    id: string;
    name: string;
    verified: boolean;
    rating: number;
    totalAgents: number;
  };
  pricing: {
    model: string;
    price: number;
    currency: string;
    minSubscription?: number;
  };
  capabilities: {
    languages: string[];
    channels: string[];
    industries: string[];
    integrations: string[];
  };
  metrics: {
    installations: number;
    rating: number;
    reviews: number;
    avgResponseTime: number;
    uptime: number;
  };
  status: string;
  certification?: {
    level: string;
    auditedBy: string;
    certifiedAt: Date;
    expiresAt: Date;
  };
  media: {
    icon: string;
    screenshots: string[];
    demoVideo?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const seedAgents: Agent[] = [
  {
    id: 'agent-legal-doc-analyzer',
    name: 'Legal Document Analyzer',
    description: 'AI agent that reviews, analyzes, and summarizes legal documents including contracts, NDAs, and compliance documents.',
    category: 'legal',
    tags: ['legal', 'document', 'analysis', 'contracts', 'NDA', 'compliance'],
    provider: { id: 'prov-legaltech', name: 'LegalTech AI', verified: true, rating: 4.8, totalAgents: 5 },
    pricing: { model: 'monthly', price: 29999, currency: 'INR', minSubscription: 1 },
    capabilities: {
      languages: ['en', 'hi'],
      channels: ['api', 'chat'],
      industries: ['legal', 'finance', 'corporate'],
      integrations: ['DocuSign', 'Google Drive', 'Dropbox']
    },
    metrics: { installations: 234, rating: 4.7, reviews: 48, avgResponseTime: 2.3, uptime: 99.9 },
    status: 'featured',
    certification: { level: 'platinum', auditedBy: 'Hojai', certifiedAt: new Date('2026-01-15'), expiresAt: new Date('2027-01-15') },
    media: { icon: '⚖️', screenshots: [] },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'agent-hr-screener',
    name: 'HR Resume Screener',
    description: 'Intelligent resume screening agent that ranks candidates based on job requirements using NLP and ML.',
    category: 'hr',
    tags: ['hr', 'recruitment', 'screening', 'hiring', 'ATS'],
    provider: { id: 'prov-talentai', name: 'TalentAI Labs', verified: true, rating: 4.6, totalAgents: 3 },
    pricing: { model: 'per_task', price: 50, currency: 'INR' },
    capabilities: {
      languages: ['en', 'hi', 'ta', 'te'],
      channels: ['api', 'chat', 'email'],
      industries: ['tech', 'finance', 'healthcare', 'retail'],
      integrations: ['Workday', 'Greenhouse', 'LinkedIn']
    },
    metrics: { installations: 567, rating: 4.5, reviews: 123, avgResponseTime: 1.8, uptime: 99.8 },
    status: 'approved',
    certification: { level: 'gold', auditedBy: 'Hojai', certifiedAt: new Date('2026-02-01'), expiresAt: new Date('2027-02-01') },
    media: { icon: '👔', screenshots: [] },
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date()
  },
  {
    id: 'agent-finance-reports',
    name: 'Financial Report Generator',
    description: 'Automatically generates quarterly financial reports, investor presentations, and compliance documents.',
    category: 'finance',
    tags: ['finance', 'reports', 'accounting', 'compliance', 'CFO'],
    provider: { id: 'prov-finbot', name: 'FinBot Solutions', verified: true, rating: 4.9, totalAgents: 8 },
    pricing: { model: 'monthly', price: 49999, currency: 'INR', minSubscription: 1 },
    capabilities: {
      languages: ['en'],
      channels: ['api', 'chat'],
      industries: ['finance', 'banking', 'investment'],
      integrations: ['QuickBooks', 'Xero', 'Tally', 'SAP']
    },
    metrics: { installations: 189, rating: 4.8, reviews: 34, avgResponseTime: 3.1, uptime: 99.95 },
    status: 'featured',
    certification: { level: 'platinum', auditedBy: 'Hojai', certifiedAt: new Date('2026-01-20'), expiresAt: new Date('2027-01-20') },
    media: { icon: '📊', screenshots: [] },
    createdAt: new Date('2025-12-15'),
    updatedAt: new Date()
  },
  {
    id: 'agent-healthcare-appointments',
    name: 'Healthcare Appointment Bot',
    description: 'Manages patient appointments, sends reminders, handles rescheduling for clinics and hospitals.',
    category: 'healthcare',
    tags: ['healthcare', 'appointments', 'clinics', 'hospitals', 'telemedicine'],
    provider: { id: 'prov-medibot', name: 'MediBot Inc', verified: true, rating: 4.7, totalAgents: 4 },
    pricing: { model: 'per_conversation', price: 5, currency: 'INR' },
    capabilities: {
      languages: ['en', 'hi', 'bn', 'ta', 'te', 'mr'],
      channels: ['whatsapp', 'chat', 'voice', 'api'],
      industries: ['healthcare', 'pharma', 'wellness'],
      integrations: ['Practo', 'BookMyDoc', 'Lybrate']
    },
    metrics: { installations: 892, rating: 4.6, reviews: 256, avgResponseTime: 0.8, uptime: 99.7 },
    status: 'approved',
    certification: { level: 'gold', auditedBy: 'Hojai', certifiedAt: new Date('2026-03-01'), expiresAt: new Date('2027-03-01') },
    media: { icon: '🏥', screenshots: [] },
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date()
  },
  {
    id: 'agent-marketing-content',
    name: 'Marketing Content Generator',
    description: 'Creates social media posts, email campaigns, blog articles, and ad copies with brand voice training.',
    category: 'marketing',
    tags: ['marketing', 'content', 'social media', 'email', 'copywriting'],
    provider: { id: 'prov-contentai', name: 'ContentAI Studio', verified: false, rating: 4.3, totalAgents: 2 },
    pricing: { model: 'freemium', price: 0, currency: 'INR' },
    capabilities: {
      languages: ['en', 'hi'],
      channels: ['api', 'chat'],
      industries: ['retail', 'ecommerce', 'agency'],
      integrations: ['Canva', 'Buffer', 'Mailchimp']
    },
    metrics: { installations: 2341, rating: 4.2, reviews: 567, avgResponseTime: 2.5, uptime: 99.5 },
    status: 'approved',
    media: { icon: '📝', screenshots: [] },
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date()
  },
  {
    id: 'agent-support-omnichannel',
    name: 'Omnichannel Support Agent',
    description: 'Handles customer queries across WhatsApp, email, chat, and voice with context preservation.',
    category: 'support',
    tags: ['support', 'omnichannel', 'whatsapp', 'chat', 'voice'],
    provider: { id: 'prov-supportai', name: 'SupportAI Pro', verified: true, rating: 4.5, totalAgents: 12 },
    pricing: { model: 'per_conversation', price: 8, currency: 'INR' },
    capabilities: {
      languages: ['en', 'hi', 'ta', 'te', 'bn', 'mr'],
      channels: ['whatsapp', 'chat', 'email', 'voice', 'api'],
      industries: ['ecommerce', 'fintech', 'saas', 'retail'],
      integrations: ['Zendesk', 'Freshdesk', 'Intercom']
    },
    metrics: { installations: 1567, rating: 4.4, reviews: 389, avgResponseTime: 1.2, uptime: 99.9 },
    status: 'approved',
    certification: { level: 'gold', auditedBy: 'Hojai', certifiedAt: new Date('2026-04-01'), expiresAt: new Date('2027-04-01') },
    media: { icon: '🎧', screenshots: [] },
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date()
  },
  {
    id: 'agent-sales-crm',
    name: 'Sales Intelligence CRM Agent',
    description: 'AI agent that qualifies leads, schedules meetings, and provides real-time deal insights.',
    category: 'sales',
    tags: ['sales', 'crm', 'leads', 'qualification', 'pipeline'],
    provider: { id: 'prov-salesai', name: 'SalesAI Labs', verified: true, rating: 4.7, totalAgents: 6 },
    pricing: { model: 'monthly', price: 19999, currency: 'INR', minSubscription: 1 },
    capabilities: {
      languages: ['en', 'hi'],
      channels: ['api', 'chat', 'email'],
      industries: ['saas', 'b2b', 'finance', 'real estate'],
      integrations: ['Salesforce', 'HubSpot', 'Pipedrive', 'Zoho']
    },
    metrics: { installations: 456, rating: 4.6, reviews: 89, avgResponseTime: 2.0, uptime: 99.85 },
    status: 'approved',
    certification: { level: 'gold', auditedBy: 'Hojai', certifiedAt: new Date('2026-03-15'), expiresAt: new Date('2027-03-15') },
    media: { icon: '💰', screenshots: [] },
    createdAt: new Date('2026-03-15'),
    updatedAt: new Date()
  },
  {
    id: 'agent-operations-workflow',
    name: 'Operations Workflow Automator',
    description: 'Automates repetitive operations tasks including data entry, reporting, and process monitoring.',
    category: 'operations',
    tags: ['operations', 'automation', 'workflow', 'data entry'],
    provider: { id: 'prov-opsai', name: 'OpsAI Solutions', verified: true, rating: 4.4, totalAgents: 4 },
    pricing: { model: 'per_task', price: 25, currency: 'INR' },
    capabilities: {
      languages: ['en'],
      channels: ['api', 'chat'],
      industries: ['operations', 'admin', 'logistics'],
      integrations: ['Slack', 'Teams', 'Google Sheets', 'Notion']
    },
    metrics: { installations: 678, rating: 4.3, reviews: 145, avgResponseTime: 1.5, uptime: 99.7 },
    status: 'approved',
    media: { icon: '⚙️', screenshots: [] },
    createdAt: new Date('2026-04-15'),
    updatedAt: new Date()
  }
];

console.log('Seeding Hojai Marketplace...');
console.log(`Loaded ${seedAgents.length} agents`);
console.log('\nAgents:');
seedAgents.forEach((agent, i) => {
  console.log(`${i + 1}. ${agent.name} (${agent.category}) - ₹${agent.pricing.price}/${agent.pricing.model}`);
});
console.log('\nSeed data ready for upload!');
