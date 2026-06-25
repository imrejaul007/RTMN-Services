/**
 * BAM (BLR AI Marketplace) — Catalog Seed Data (245 entries).
 *
 * Seeds the marketplace-listings MongoDB collection with the full catalog
 * covering:
 *   1. AI Agents (150+)
 *   2. Digital Twins (23+)
 *   3. Knowledge Packs (20)
 *   4. Industry OS (24)
 *   5. Department OS (9)
 *   6. Workflows (30)
 *   7. Analytics & Insights (20)
 *   8. Add-Ons (15)
 *   9. Bundles (12)
 *
 * Run with: node src/seed-data.js
 * Requires: MONGODB_URI env var (defaults to mongodb://localhost:27017/marketplace_listings)
 */

import mongoose from 'mongoose';
import { Listing } from './models/Listing.js';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace_listings';
const TENANT_SYSTEM = 'bam-platform'; // System tenant for seed data

const now = () => new Date().toISOString();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function entry(overrides) {
  return {
    tenantId: TENANT_SYSTEM,
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    pricingModel: 'subscription',
    currency: 'INR',
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  };
}

function agentEntry(id, title, category, tags, priceINR, description, options = {}) {
  return entry({
    listingId: id,
    title,
    description,
    shortDescription: description.slice(0, 120) + '...',
    category: 'agent',
    tags,
    pricingModel: 'subscription',
    price: priceINR,
    currency: 'INR',
    pricing: { model: 'subscription', perMonth: priceINR / 100 },
    accuracy: options.accuracy || null,
    tasksCompleted: options.tasks || 0,
    rating: options.rating || null,
    reviews: options.reviews || 0,
    provider: options.provider || 'HOJAI AI',
    capabilities: options.capabilities || [],
    agentType: options.agentType || 'genie',
    metadata: {
      accuracy: options.accuracy,
      avgResponseTime: options.responseTime || null,
      languages: options.languages || ['English'],
      integrations: options.integrations || [],
      ...options.metadata,
    },
  });
}

function twinEntry(id, title, port, priceINR, description, capabilities) {
  return entry({
    listingId: id,
    title,
    description,
    shortDescription: description.slice(0, 120) + '...',
    category: 'twin',
    tags: ['digital-twin', 'ai', 'real-time'],
    pricingModel: 'subscription',
    price: priceINR,
    currency: 'INR',
    pricing: { model: 'subscription', perMonth: priceINR / 100 },
    provider: 'HOJAI AI',
    capabilities,
    metadata: { port, twinCategory: capabilities[0] || 'general' },
  });
}

function serviceEntry(id, title, port, priceINR, description, tags, capabilities) {
  return entry({
    listingId: id,
    title,
    description,
    shortDescription: description.slice(0, 120) + '...',
    category: 'service',
    tags,
    pricingModel: 'subscription',
    price: priceINR,
    currency: 'INR',
    pricing: { model: 'subscription', perMonth: priceINR / 100 },
    provider: 'HOJAI AI',
    capabilities,
    metadata: { port },
  });
}

// ─── 1. AI Agents (150+) ───────────────────────────────────────────────────

const AI_AGENTS = [
  // Sales OS Agents (22)
  agentEntry('SA001', 'Lead Scoring Agent', 'sales', ['sales', 'crm', 'lead-intelligence'], 19900, 'AI-powered lead scoring with 94.5% accuracy. Prioritizes your pipeline automatically.', { accuracy: '94.5%', tasks: 1234, rating: 4.8, reviews: 89, capabilities: ['lead-scoring', 'prioritization', 'crm-sync'], agentType: 'sales' }),
  agentEntry('SA002', 'Opportunity Intelligence', 'sales', ['sales', 'analytics', 'forecasting'], 17900, 'Predictive analytics for deal closure probability and optimal next actions.', { accuracy: '91.2%', tasks: 856, rating: 4.7, reviews: 67, capabilities: ['prediction', 'analytics', 'deal-closure'], agentType: 'sales' }),
  agentEntry('SA003', 'Churn Prediction Agent', 'sales', ['churn', 'retention', 'crm'], 19900, 'Proactively identifies at-risk customers before they churn.', { accuracy: '89.7%', tasks: 445, rating: 4.6, reviews: 54, capabilities: ['churn-detection', 'risk-scoring', 'retention'], agentType: 'sales' }),
  agentEntry('SA004', 'Pricing Optimizer', 'sales', ['pricing', 'revenue', 'optimization'], 14900, 'Dynamic pricing recommendations based on market conditions and competitor data.', { accuracy: '87.3%', tasks: 567, rating: 4.5, reviews: 43, capabilities: ['pricing', 'market-analysis', 'revenue'], agentType: 'sales' }),
  agentEntry('SA005', 'Contract Analyzer', 'sales', ['contracts', 'legal', 'compliance'], 17900, 'Reviews contracts for risk, compliance issues, and negotiation points.', { accuracy: '92.1%', tasks: 234, rating: 4.7, reviews: 31, capabilities: ['contract-review', 'risk-analysis', 'compliance'], agentType: 'sales' }),
  agentEntry('SA006', 'Territory Optimizer', 'sales', ['territory', 'sales-ops', 'optimization'], 9900, 'Automatically assigns leads to reps based on territory and capacity.', { accuracy: '85.6%', tasks: 45, rating: 4.3, reviews: 12, capabilities: ['territory-management', 'assignment', 'capacity'], agentType: 'sales' }),
  agentEntry('SA007', 'Commission Calculator', 'sales', ['compensation', 'finance', 'payroll'], 9900, 'Accurately calculates sales commissions with multi-tier plans.', { accuracy: '99.1%', tasks: 890, rating: 5.0, reviews: 112, capabilities: ['commission', 'compensation', 'calculations'], agentType: 'sales' }),
  agentEntry('SA008', 'Sales Coach Agent', 'sales', ['coaching', 'training', 'performance'], 19900, 'Personal AI sales coach that analyzes calls and suggests improvements.', { accuracy: '88.4%', tasks: 156, rating: 4.6, reviews: 28, capabilities: ['call-analysis', 'coaching', 'skill-development'], agentType: 'sales' }),
  agentEntry('SA009', 'Enablement Recommender', 'sales', ['enablement', 'content', 'sales-ops'], 12900, 'Recommends the right content for each deal stage and buyer persona.', { accuracy: '86.2%', tasks: 334, rating: 4.5, reviews: 21, capabilities: ['content-recommendation', 'deal-stage', 'persona'], agentType: 'sales' }),
  agentEntry('SA010', 'Engagement Predictor', 'sales', ['engagement', 'outreach', 'prioritization'], 14900, 'Predicts which prospects will respond to outreach and when.', { accuracy: '90.8%', tasks: 678, rating: 4.7, reviews: 45, capabilities: ['engagement-prediction', 'outreach-optimization', 'timing'], agentType: 'sales' }),
  agentEntry('SA011', 'Competitor Intel Agent', 'sales', ['competitive-intelligence', 'research', 'strategy'], 14900, 'Tracks competitor moves, pricing changes, and market positioning.', { accuracy: '84.5%', tasks: 123, rating: 4.4, reviews: 18, capabilities: ['competitor-tracking', 'market-analysis', 'positioning'], agentType: 'sales' }),
  agentEntry('SA012', 'Sentiment Analyzer', 'sales', ['sentiment', 'nlp', 'social'], 17900, 'Analyzes sentiment from calls, emails, and social media mentions.', { accuracy: '91.7%', tasks: 2345, rating: 4.7, reviews: 134, capabilities: ['sentiment-analysis', 'nlp', 'social-listening'], agentType: 'sales' }),
  agentEntry('SA013', 'Next Best Action', 'sales', ['next-action', 'recommendation', 'ai'], 24900, 'AI-driven recommendations for the next best engagement with each prospect.', { accuracy: '88.9%', tasks: 1890, rating: 4.8, reviews: 98, capabilities: ['nba', 'recommendation', 'ai-decisions'], agentType: 'sales' }),
  agentEntry('SA014', 'Auto Follow-up Agent', 'sales', ['follow-up', 'automation', 'engagement'], 14900, 'Never miss a follow-up. Automated, personalized follow-up sequences.', { accuracy: '95.2%', tasks: 4567, rating: 4.9, reviews: 287, capabilities: ['follow-up', 'automation', 'email'], agentType: 'sales' }),
  agentEntry('SA015', 'Renewal Predictor', 'sales', ['renewal', 'expansion', 'crm'], 17900, 'Predicts renewal probability and identifies expansion opportunities.', { accuracy: '90.3%', tasks: 234, rating: 4.7, reviews: 41, capabilities: ['renewal-prediction', 'expansion', 'nrr'], agentType: 'sales' }),
  agentEntry('SA016', 'Upsell/Cross-sell Agent', 'sales', ['upsell', 'cross-sell', 'revenue'], 16900, 'Identifies the best upsell and cross-sell opportunities per customer.', { accuracy: '82.4%', tasks: 567, rating: 4.5, reviews: 62, capabilities: ['upsell', 'cross-sell', 'product-matching'], agentType: 'sales' }),
  agentEntry('SA017', 'Onboarding Guide', 'sales', ['onboarding', 'customer-success', 'engagement'], 12900, 'Guides new customers through onboarding with personalized steps.', { accuracy: '93.8%', tasks: 89, rating: 4.8, reviews: 34, capabilities: ['onboarding', 'customer-success', 'automation'], agentType: 'sales' }),
  agentEntry('SA018', 'Health Score Monitor', 'sales', ['health-score', 'monitoring', 'crm'], 14900, 'Continuous health scoring of customer accounts based on engagement signals.', { accuracy: '87.6%', tasks: 1234, rating: 4.7, reviews: 76, capabilities: ['health-scoring', 'monitoring', 'signals'], agentType: 'sales' }),
  agentEntry('SA019', 'Social Selling Agent', 'sales', ['social-selling', 'linkedin', 'outreach'], 9900, 'Automated LinkedIn and Twitter engagement for social selling.', { accuracy: '79.8%', tasks: 456, rating: 4.2, reviews: 38, capabilities: ['social-selling', 'linkedin', 'automation'], agentType: 'sales' }),
  agentEntry('SA020', 'Battlecard Generator', 'sales', ['battlecard', 'competitive', 'sales-enablement'], 9900, 'Automatically generates competitive battlecards from market data.', { accuracy: '91.4%', tasks: 67, rating: 4.6, reviews: 15, capabilities: ['battlecard', 'competitive', 'generation'], agentType: 'sales' }),
  agentEntry('SA021', 'Forecast Assistant', 'sales', ['forecasting', 'revenue', 'analytics'], 19900, 'AI-assisted revenue forecasting with scenario modeling.', { accuracy: '93.2%', tasks: 890, rating: 4.8, reviews: 54, capabilities: ['forecasting', 'scenario-modeling', 'revenue'], agentType: 'sales' }),
  agentEntry('SA022', 'Pipeline Inspector', 'sales', ['pipeline', 'inspection', 'crm'], 14900, 'Deep inspection of pipeline health, stalled deals, and risk factors.', { accuracy: '90.1%', tasks: 567, rating: 4.6, reviews: 43, capabilities: ['pipeline-analysis', 'risk-detection', 'inspection'], agentType: 'sales' }),

  // Workforce / HR Agents (25)
  agentEntry('WA001', 'AI HR Assistant', 'workforce', ['hr', 'employee', 'policy'], 19900, 'Answers employee policy, leave, and benefits questions instantly.', { accuracy: 94, tasks: 3456, rating: 4.7, reviews: 234, capabilities: ['hr-chatbot', 'policy', 'benefits'], agentType: 'hr' }),
  agentEntry('WA002', 'AI Recruiter', 'workforce', ['recruiting', 'hiring', 'ats'], 39900, 'End-to-end recruitment automation from sourcing to offer.', { accuracy: 91, tasks: 456, rating: 4.8, reviews: 123, capabilities: ['sourcing', 'screening', 'scheduling'], agentType: 'hr' }),
  agentEntry('WA003', 'AI Sourcer', 'workforce', ['sourcing', 'talent', 'recruitment'], 29900, 'Automated candidate sourcing from 50+ platforms.', { accuracy: 88, tasks: 2345, rating: 4.6, reviews: 87, capabilities: ['sourcing', 'platform-search', 'matching'], agentType: 'hr' }),
  agentEntry('WA004', 'AI Interviewer', 'workforce', ['interview', 'video', 'evaluation'], 24900, 'AI-powered video interviews with structured evaluation.', { accuracy: 89, tasks: 1234, rating: 4.7, reviews: 156, capabilities: ['video-interview', 'evaluation', 'transcription'], agentType: 'hr' }),
  agentEntry('WA005', 'AI Payroll Officer', 'workforce', ['payroll', 'compensation', 'compliance'], 19900, 'Automated payroll processing with tax compliance.', { accuracy: 99, tasks: 8900, rating: 4.9, reviews: 567, capabilities: ['payroll', 'tax', 'compliance'], agentType: 'hr' }),
  agentEntry('WA006', 'AI Leave Officer', 'workforce', ['leave', 'attendance', 'hr-ops'], 9900, 'Automated leave management and approval workflows.', { accuracy: 98, tasks: 4567, rating: 4.8, reviews: 345, capabilities: ['leave-management', 'approval', 'calendar'], agentType: 'hr' }),
  agentEntry('WA007', 'AI Attendance Officer', 'workforce', ['attendance', 'tracking', 'compliance'], 9900, 'AI-powered attendance tracking and anomaly detection.', { accuracy: 96, tasks: 7890, rating: 4.7, reviews: 234, capabilities: ['attendance', 'geofencing', 'anomaly'], agentType: 'hr' }),
  agentEntry('WA008', 'AI Compliance Officer', 'workforce', ['compliance', 'regulatory', 'audit'], 19900, 'Automated compliance monitoring and audit trail generation.', { accuracy: 97, tasks: 2345, rating: 4.8, reviews: 189, capabilities: ['compliance', 'audit', 'regulatory'], agentType: 'hr' }),
  agentEntry('WA009', 'AI Benefits Advisor', 'workforce', ['benefits', 'employee', 'wellness'], 14900, 'Personalized benefits recommendations for employees.', { accuracy: 90, tasks: 1234, rating: 4.6, reviews: 98, capabilities: ['benefits', 'recommendation', 'wellness'], agentType: 'hr' }),
  agentEntry('WA010', 'AI Expense Auditor', 'workforce', ['expenses', 'audit', 'finance'], 14900, 'Automated expense review with fraud detection.', { accuracy: 95, tasks: 3456, rating: 4.7, reviews: 167, capabilities: ['expense-review', 'fraud-detection', 'policy'], agentType: 'hr' }),
  agentEntry('WA011', 'AI Employee Assistant', 'workforce', ['employee', 'support', 'self-service'], 12900, 'Personal AI assistant for every employee query.', { accuracy: 93, tasks: 5678, rating: 4.7, reviews: 345, capabilities: ['employee-support', 'self-service', 'chat'], agentType: 'hr' }),
  agentEntry('WA012', 'AI Manager Coach', 'workforce', ['management', 'coaching', 'leadership'], 19900, 'AI coaching for managers on people management.', { accuracy: 87, tasks: 345, rating: 4.5, reviews: 67, capabilities: ['coaching', 'leadership', 'feedback'], agentType: 'hr' }),
  agentEntry('WA013', 'AI Career Coach', 'workforce', ['career', 'development', 'growth'], 17900, 'Personalized career path recommendations.', { accuracy: 86, tasks: 567, rating: 4.6, reviews: 123, capabilities: ['career-path', 'skill-gap', 'growth'], agentType: 'hr' }),
  agentEntry('WA014', 'AI Learning Coach', 'workforce', ['learning', 'lms', 'training'], 14900, 'Adaptive learning recommendations based on role and goals.', { accuracy: 88, tasks: 890, rating: 4.6, reviews: 145, capabilities: ['learning', 'lms', 'recommendation'], agentType: 'hr' }),
  agentEntry('WA015', 'AI Performance Coach', 'workforce', ['performance', 'review', 'feedback'], 19900, 'Continuous performance feedback and improvement suggestions.', { accuracy: 89, tasks: 1234, rating: 4.7, reviews: 178, capabilities: ['performance', 'feedback', 'goals'], agentType: 'hr' }),
  agentEntry('WA016', 'AI Wellness Coach', 'workforce', ['wellness', 'health', 'engagement'], 14900, 'Employee wellness programs with AI personalized nudges.', { accuracy: 84, tasks: 456, rating: 4.5, reviews: 89, capabilities: ['wellness', 'engagement', 'nudges'], agentType: 'hr' }),
  agentEntry('WA017', 'AI Culture Officer', 'workforce', ['culture', 'engagement', 'pulse'], 17900, 'Culture health monitoring and improvement recommendations.', { accuracy: 85, tasks: 234, rating: 4.5, reviews: 56, capabilities: ['culture', 'pulse', 'engagement'], agentType: 'hr' }),
  agentEntry('WA018', 'AI Employee Success Manager', 'workforce', ['employee-success', 'lifecycle', 'retention'], 19900, 'End-to-end employee lifecycle management.', { accuracy: 90, tasks: 567, rating: 4.7, reviews: 98, capabilities: ['lifecycle', 'retention', 'engagement'], agentType: 'hr' }),
  agentEntry('WA019', 'AI Internal Mobility Agent', 'workforce', ['mobility', 'internal-jobs', 'career'], 14900, 'Internal job matching and career mobility automation.', { accuracy: 87, tasks: 345, rating: 4.5, reviews: 67, capabilities: ['internal-jobs', 'matching', 'career'], agentType: 'hr' }),
  agentEntry('WA020', 'AI Visa Officer', 'workforce', ['visa', 'compliance', 'immigration'], 17900, 'Visa tracking, expiry alerts, and compliance management.', { accuracy: 95, tasks: 123, rating: 4.8, reviews: 34, capabilities: ['visa', 'compliance', 'tracking'], agentType: 'hr' }),
  agentEntry('WA021', 'AI HR Director', 'workforce', ['hr-leadership', 'strategy', 'analytics'], 59900, 'Strategic HR decisions with workforce analytics.', { accuracy: 92, tasks: 45, rating: 4.7, reviews: 12, capabilities: ['strategy', 'analytics', 'decision'], agentType: 'hr' }),
  agentEntry('WA022', 'AI Executive Advisor', 'workforce', ['executive', 'coaching', 'leadership'], 49900, 'C-suite advisory on people and organizational strategy.', { accuracy: 91, tasks: 23, rating: 4.6, reviews: 8, capabilities: ['executive', 'advisory', 'strategy'], agentType: 'hr' }),
  agentEntry('WA023', 'AI Talent Intelligence', 'workforce', ['talent', 'market', 'analytics'], 39900, 'Market intelligence on talent trends and compensation.', { accuracy: 90, tasks: 78, rating: 4.6, reviews: 23, capabilities: ['market-analysis', 'compensation', 'trends'], agentType: 'hr' }),
  agentEntry('WA024', 'AI Organization Designer', 'workforce', ['org-design', 'restructuring', 'strategy'], 44900, 'AI-assisted organizational design and restructuring.', { accuracy: 88, tasks: 34, rating: 4.5, reviews: 9, capabilities: ['org-design', 'restructuring', 'optimization'], agentType: 'hr' }),
  agentEntry('WA025', 'AI Workforce Planner', 'workforce', ['workforce', 'planning', 'forecasting'], 39900, 'Strategic workforce planning with demand forecasting.', { accuracy: 89, tasks: 56, rating: 4.6, reviews: 18, capabilities: ['workforce', 'forecasting', 'planning'], agentType: 'hr' }),

  // Media OS Agents (20)
  agentEntry('MA001', 'AI Editor', 'media', ['video', 'editing', 'content'], 14900, 'AI-powered video editing with automatic highlights and transitions.', { accuracy: 88, tasks: 5678, rating: 4.7, reviews: 345, capabilities: ['video-editing', 'highlights', 'automation'], agentType: 'media' }),
  agentEntry('MA002', 'AI News Writer', 'media', ['writing', 'news', 'content'], 12900, 'Automated news article writing from data sources.', { accuracy: 86, tasks: 2345, rating: 4.5, reviews: 234, capabilities: ['news-writing', 'content-generation', 'seo'], agentType: 'media' }),
  agentEntry('MA003', 'AI Fact Checker', 'media', ['fact-check', 'verification', 'nlp'], 17900, 'Real-time fact verification against trusted sources.', { accuracy: 91, tasks: 8900, rating: 4.8, reviews: 567, capabilities: ['fact-check', 'verification', 'sources'], agentType: 'media' }),
  agentEntry('MA004', 'AI Community Manager', 'media', ['community', 'engagement', 'social'], 14900, 'AI-powered community engagement and moderation.', { accuracy: 85, tasks: 3456, rating: 4.6, reviews: 234, capabilities: ['community', 'moderation', 'engagement'], agentType: 'media' }),
  agentEntry('MA005', 'AI Scheduler', 'media', ['scheduling', 'posting', 'automation'], 9900, 'Optimal posting time scheduler for social media.', { accuracy: 83, tasks: 1234, rating: 4.4, reviews: 123, capabilities: ['scheduling', 'posting', 'optimization'], agentType: 'media' }),
  agentEntry('MA006', 'AI Thumbnail Analyzer', 'media', ['thumbnail', 'ctr', 'optimization'], 9900, 'Thumbnail analysis for click-through rate optimization.', { accuracy: 87, tasks: 5678, rating: 4.5, reviews: 189, capabilities: ['thumbnail', 'ctr', 'optimization'], agentType: 'media' }),
  agentEntry('MA007', 'AI Transcript', 'media', ['transcription', 'captions', 'accessibility'], 11900, 'Automatic transcription with speaker identification.', { accuracy: 94, tasks: 8900, rating: 4.8, reviews: 678, capabilities: ['transcription', 'captions', 'speaker-id'], agentType: 'media' }),
  agentEntry('MA008', 'AI Translator', 'media', ['translation', 'localization', 'multilingual'], 14900, 'AI-powered translation in 20+ languages.', { accuracy: 92, tasks: 4567, rating: 4.7, reviews: 345, capabilities: ['translation', 'localization', 'multilingual'], agentType: 'media' }),
  agentEntry('MA009', 'AI Virality Predictor', 'media', ['virality', 'prediction', 'social'], 17900, 'Predicts viral potential of content before publishing.', { accuracy: 79, tasks: 2345, rating: 4.3, reviews: 123, capabilities: ['virality', 'prediction', 'social'], agentType: 'media' }),
  agentEntry('MA010', 'AI Content Planner', 'media', ['content', 'strategy', 'planning'], 12900, 'AI-driven content calendar and strategy planner.', { accuracy: 84, tasks: 1234, rating: 4.5, reviews: 189, capabilities: ['content-planning', 'strategy', 'calendar'], agentType: 'media' }),
  agentEntry('MA011', 'AI Compliance Officer', 'media', ['compliance', 'moderation', 'content-policy'], 14900, 'Automated content compliance checking.', { accuracy: 96, tasks: 5678, rating: 4.8, reviews: 234, capabilities: ['compliance', 'moderation', 'policy'], agentType: 'media' }),
  agentEntry('MA012', 'AI Engagement Bot', 'media', ['engagement', 'automation', 'social'], 9900, 'AI-powered comment and DM automation.', { accuracy: 82, tasks: 4567, rating: 4.4, reviews: 167, capabilities: ['engagement', 'automation', 'social'], agentType: 'media' }),
  agentEntry('MA013', 'AI Trend Forecaster', 'media', ['trends', 'forecasting', 'research'], 16900, 'AI analysis of emerging content trends.', { accuracy: 83, tasks: 890, rating: 4.5, reviews: 98, capabilities: ['trends', 'forecasting', 'research'], agentType: 'media' }),
  agentEntry('MA014', 'Script Writer Agent', 'media', ['script', 'writing', 'video'], 14900, 'AI script writing for videos, podcasts, and ads.', { accuracy: 86, tasks: 1234, rating: 4.6, reviews: 145, capabilities: ['script-writing', 'video', 'podcast'], agentType: 'media' }),
  agentEntry('MA015', 'Thumbnail Designer Agent', 'media', ['design', 'thumbnail', 'visual'], 9900, 'AI thumbnail generation with CTR optimization.', { accuracy: 84, tasks: 2345, rating: 4.5, reviews: 189, capabilities: ['thumbnail', 'design', 'visual'], agentType: 'media' }),
  agentEntry('MA016', 'SEO Optimizer Agent', 'media', ['seo', 'optimization', 'content'], 12900, 'Automated SEO optimization for all content.', { accuracy: 88, tasks: 5678, rating: 4.7, reviews: 345, capabilities: ['seo', 'optimization', 'keywords'], agentType: 'media' }),
  agentEntry('MA017', 'Content Repurposer Agent', 'media', ['repurpose', 'content', 'format'], 11900, 'Automatically repurposes content across formats.', { accuracy: 85, tasks: 2345, rating: 4.5, reviews: 178, capabilities: ['repurpose', 'format', 'content'], agentType: 'media' }),
  agentEntry('MA018', 'Translator Agent', 'media', ['translation', 'localization', 'ai'], 14900, '18-language AI translation with cultural adaptation.', { accuracy: 92, tasks: 4567, rating: 4.7, reviews: 289, capabilities: ['translation', 'localization', 'cultural'], agentType: 'media' }),
  agentEntry('MA019', 'Moderator Agent', 'media', ['moderation', 'safety', 'content'], 13900, 'AI content moderation for safety and policy compliance.', { accuracy: 94, tasks: 89000, rating: 4.8, reviews: 567, capabilities: ['moderation', 'safety', 'nlp'], agentType: 'media' }),
  agentEntry('MA020', 'Trend Hunter Agent', 'media', ['trends', 'discovery', 'social'], 14900, 'Real-time social media trend discovery.', { accuracy: 81, tasks: 1234, rating: 4.4, reviews: 134, capabilities: ['trend-discovery', 'social', 'research'], agentType: 'media' }),

  // Finance Agents (7)
  agentEntry('FA001', 'Finance CFO AI', 'finance', ['cfo', 'executive', 'finance'], 79900, 'AI-powered CFO insights, cash flow analysis, and strategic decisions.', { accuracy: 93, tasks: 345, rating: 4.8, reviews: 56, capabilities: ['cfo', 'cash-flow', 'strategy'], agentType: 'finance', port: 4900 }),
  agentEntry('FA002', 'Finance Accountant', 'finance', ['accounting', 'ledger', 'compliance'], 39900, 'Automated invoice-to-ledger accounting.', { accuracy: 98, tasks: 8900, rating: 4.9, reviews: 345, capabilities: ['accounting', 'ledger', 'invoicing'], agentType: 'finance', port: 4901 }),
  agentEntry('FA003', 'Finance Compliance Officer', 'finance', ['compliance', 'gst', 'regulatory'], 34900, 'GST and regulatory compliance validation.', { accuracy: 97, tasks: 4567, rating: 4.8, reviews: 234, capabilities: ['compliance', 'gst', 'regulatory'], agentType: 'finance', port: 4902 }),
  agentEntry('FA004', 'Finance Auditor', 'finance', ['audit', 'fraud', 'detection'], 39900, 'AI-powered audit and fraud detection.', { accuracy: 95, tasks: 2345, rating: 4.8, reviews: 178, capabilities: ['audit', 'fraud-detection', 'compliance'], agentType: 'finance', port: 4903 }),
  agentEntry('FA005', 'Finance Collections Agent', 'finance', ['collections', 'ar', 'follow-up'], 29900, 'Automated accounts receivable and collections.', { accuracy: 92, tasks: 3456, rating: 4.7, reviews: 234, capabilities: ['collections', 'ar', 'follow-up'], agentType: 'finance', port: 4904 }),
  agentEntry('FA006', 'Finance Payables Agent', 'finance', ['payables', 'ap', 'payments'], 29900, 'Automated accounts payable management.', { accuracy: 97, tasks: 5678, rating: 4.8, reviews: 289, capabilities: ['payables', 'ap', 'payments'], agentType: 'finance', port: 4905 }),
  agentEntry('FA007', 'Finance Budget Coach', 'finance', ['budget', 'forecast', 'planning'], 24900, 'AI budget forecasting and financial planning.', { accuracy: 91, tasks: 1234, rating: 4.6, reviews: 145, capabilities: ['budget', 'forecast', 'planning'], agentType: 'finance', port: 4906 }),

  // Customer Success Agents (9)
  agentEntry('CA001', 'Support AI', 'customer-success', ['support', 'chatbot', 'faq'], 19900, 'AI support chatbot for instant FAQ resolution.', { accuracy: 94, tasks: 89000, rating: 4.8, reviews: 1234, capabilities: ['support', 'chatbot', 'faq'], agentType: 'cs' }),
  agentEntry('CA002', 'Billing AI', 'customer-success', ['billing', 'payments', 'invoices'], 14900, 'AI billing and payment query resolution.', { accuracy: 96, tasks: 23456, rating: 4.8, reviews: 567, capabilities: ['billing', 'payments', 'invoices'], agentType: 'cs' }),
  agentEntry('CA003', 'Order AI', 'customer-success', ['orders', 'tracking', 'returns'], 14900, 'AI order tracking and return management.', { accuracy: 95, tasks: 45678, rating: 4.7, reviews: 678, capabilities: ['orders', 'tracking', 'returns'], agentType: 'cs' }),
  agentEntry('CA004', 'Booking AI', 'customer-success', ['booking', 'reservation', 'scheduling'], 17900, 'AI-powered booking and reservation management.', { accuracy: 93, tasks: 12345, rating: 4.7, reviews: 456, capabilities: ['booking', 'reservation', 'scheduling'], agentType: 'cs' }),
  agentEntry('CA005', 'Product AI', 'customer-success', ['product', 'search', 'recommendation'], 12900, 'AI product search and recommendation engine.', { accuracy: 91, tasks: 34567, rating: 4.7, reviews: 789, capabilities: ['product-search', 'recommendation', 'nlp'], agentType: 'cs' }),
  agentEntry('CA006', 'Legal AI', 'customer-success', ['legal', 'compliance', 'policies'], 19900, 'AI legal query resolution and policy assistance.', { accuracy: 92, tasks: 5678, rating: 4.7, reviews: 234, capabilities: ['legal', 'compliance', 'policies'], agentType: 'cs' }),
  agentEntry('CA007', 'Sales AI', 'customer-success', ['sales', 'upsell', 'cross-sell'], 19900, 'AI-driven upsell and cross-sell during support interactions.', { accuracy: 88, tasks: 8900, rating: 4.6, reviews: 345, capabilities: ['upsell', 'cross-sell', 'recommendation'], agentType: 'cs' }),
  agentEntry('CA008', 'Marketing AI', 'customer-success', ['marketing', 'campaigns', 'engagement'], 17900, 'AI campaign management and customer engagement.', { accuracy: 87, tasks: 3456, rating: 4.5, reviews: 234, capabilities: ['campaigns', 'engagement', 'automation'], agentType: 'cs' }),
  agentEntry('CA009', 'BPO AI', 'customer-success', ['bpo', 'escalation', 'transfer'], 14900, 'AI-powered BPO escalation and transfer management.', { accuracy: 90, tasks: 5678, rating: 4.6, reviews: 189, capabilities: ['escalation', 'transfer', 'routing'], agentType: 'cs' }),

  // Atlas / REZ Workforce Agents (6)
  agentEntry('AT001', 'Atlas SDR Agent', 'sales', ['sdr', 'outreach', 'cold-email'], 39900, 'Autonomous sales development rep for outreach campaigns.', { accuracy: 86, tasks: 3456, rating: 4.6, reviews: 123, capabilities: ['sdr', 'outreach', 'email'], agentType: 'sdr' }),
  agentEntry('AT002', 'Atlas Workforce Agent', 'workforce', ['workforce', 'merchant', 'management'], 34900, 'Merchant outreach and workforce management agent.', { accuracy: 84, tasks: 1234, rating: 4.5, reviews: 67, capabilities: ['workforce', 'merchant', 'outreach'], agentType: 'workforce' }),
  agentEntry('AT003', 'Atlas Qualification Agent', 'sales', ['qualification', 'lead', 'scoring'], 24900, 'AI lead qualification with BANT and other frameworks.', { accuracy: 91, tasks: 5678, rating: 4.7, reviews: 234, capabilities: ['qualification', 'lead-scoring', 'bant'], agentType: 'sales' }),
  agentEntry('AT004', 'Atlas Meeting Agent', 'sales', ['meeting', 'scheduling', 'calendar'], 19900, 'AI meeting scheduling and calendar management.', { accuracy: 94, tasks: 8900, rating: 4.8, reviews: 567, capabilities: ['scheduling', 'calendar', 'booking'], agentType: 'sales' }),
  agentEntry('AT005', 'Atlas Follow-up Agent', 'sales', ['follow-up', 'automation', 'nurture'], 14900, 'Automated follow-up sequences and nurture campaigns.', { accuracy: 92, tasks: 12345, rating: 4.7, reviews: 456, capabilities: ['follow-up', 'nurture', 'automation'], agentType: 'sales' }),
  agentEntry('AT006', 'Atlas AI Workforce Hub', 'workforce', ['workforce', 'orchestration', 'multi-agent'], 49900, 'Central orchestration hub for multi-agent workforce.', { accuracy: 89, tasks: 567, rating: 4.6, reviews: 89, capabilities: ['orchestration', 'multi-agent', 'coordination'], agentType: 'workforce' }),

  // Intent Graph Agents (11)
  agentEntry('IA001', 'Demand Signal Agent', 'analytics', ['demand', 'signals', 'detection'], 14900, 'Detects demand signals from social, search, and market data.', { accuracy: 87, tasks: 2345, rating: 4.5, reviews: 123, capabilities: ['demand-signals', 'detection', 'analytics'], agentType: 'analytics' }),
  agentEntry('IA002', 'Scarcity Agent', 'commerce', ['scarcity', 'inventory', 'pricing'], 9900, 'Identifies inventory scarcity and pricing opportunities.', { accuracy: 85, tasks: 3456, rating: 4.4, reviews: 89, capabilities: ['scarcity', 'inventory', 'pricing'], agentType: 'commerce' }),
  agentEntry('IA003', 'Personalization Agent', 'commerce', ['personalization', 'recommendation', 'ai'], 17900, 'Real-time personalization engine for every user.', { accuracy: 91, tasks: 56789, rating: 4.7, reviews: 678, capabilities: ['personalization', 'recommendation', 'real-time'], agentType: 'commerce' }),
  agentEntry('IA004', 'Attribution Agent', 'marketing', ['attribution', 'multi-touch', 'analytics'], 14900, 'Multi-touch attribution modeling across channels.', { accuracy: 88, tasks: 1234, rating: 4.6, reviews: 145, capabilities: ['attribution', 'multi-touch', 'modeling'], agentType: 'marketing' }),
  agentEntry('IA005', 'Adaptive Scoring Agent', 'analytics', ['scoring', 'adaptive', 'ml'], 16900, 'ML-powered adaptive scoring for leads and accounts.', { accuracy: 90, tasks: 4567, rating: 4.6, reviews: 234, capabilities: ['adaptive-scoring', 'ml', 'leads'], agentType: 'analytics' }),
  agentEntry('IA006', 'Feedback Loop Agent', 'product', ['feedback', 'loop', 'product'], 12900, 'Continuous product feedback analysis and routing.', { accuracy: 86, tasks: 8900, rating: 4.5, reviews: 345, capabilities: ['feedback', 'routing', 'analysis'], agentType: 'product' }),
  agentEntry('IA007', 'Network Effect Agent', 'growth', ['network-effect', 'growth', 'viral'], 14900, 'Analyzes and optimizes network effect loops.', { accuracy: 82, tasks: 567, rating: 4.4, reviews: 67, capabilities: ['network-effect', 'growth', 'analysis'], agentType: 'growth' }),
  agentEntry('IA008', 'Revenue Attribution Agent', 'finance', ['revenue', 'attribution', 'analytics'], 19900, 'End-to-end revenue attribution across the funnel.', { accuracy: 91, tasks: 2345, rating: 4.7, reviews: 178, capabilities: ['revenue', 'attribution', 'funnel'], agentType: 'finance' }),
  agentEntry('IA009', 'Support Agent', 'customer-success', ['support', 'ticket', 'routing'], 14900, 'AI ticket routing and support resolution.', { accuracy: 93, tasks: 45678, rating: 4.8, reviews: 890, capabilities: ['ticket-routing', 'support', 'resolution'], agentType: 'cs' }),
  agentEntry('IA010', 'Swarm Coordinator', 'orchestration', ['multi-agent', 'orchestration', 'coordination'], 29900, 'Multi-agent swarm coordination and orchestration.', { accuracy: 88, tasks: 345, rating: 4.5, reviews: 45, capabilities: ['swarm', 'orchestration', 'coordination'], agentType: 'orchestration' }),
  agentEntry('IA011', 'Autonomous Orchestrator', 'orchestration', ['autonomous', 'orchestration', 'ai'], 39900, 'Fully autonomous agentic workflow orchestration.', { accuracy: 86, tasks: 123, rating: 4.4, reviews: 23, capabilities: ['autonomous', 'orchestration', 'agentic'], agentType: 'orchestration' }),
];

// ─── 2. Digital Twins (23) ───────────────────────────────────────────────────

const DIGITAL_TWINS = [
  twinEntry('DT001', 'Customer Twin', 4895, 9900, '360° digital twin of every customer: profile, LTV, churn risk, preferences, interaction history.', ['customer', 'crm', 'analytics']),
  twinEntry('DT002', 'Employee Twin', 4730, 7900, 'Digital twin of every employee: skills, performance, career path, engagement, capacity.', ['employee', 'hr', 'performance']),
  twinEntry('DT003', 'Product Twin', 4720, 6900, 'Digital twin of every product: specs, inventory, warranty status, support tickets, NPS.', ['product', 'inventory', 'support']),
  twinEntry('DT004', 'Asset Twin', 4890, 8900, 'Digital twin of every physical asset: IoT data, maintenance schedules, depreciation.', ['asset', 'iot', 'maintenance']),
  twinEntry('DT005', 'Partner Twin', 4892, 7900, 'Digital twin of every partner: SLAs, trust score, transaction history, compliance status.', ['partner', 'vendor', 'compliance']),
  twinEntry('DT006', 'Lead Twin', 4894, 9900, 'Digital twin of every lead: enrichment, scoring, activity timeline, intent signals.', ['lead', 'crm', 'analytics']),
  twinEntry('DT007', 'Order Twin', 4885, 5900, 'Digital twin of every order: lifecycle, shipment tracking, return probability, fulfillment cost.', ['order', 'commerce', 'fulfillment']),
  twinEntry('DT008', 'Voice Twin', 4876, 8900, 'Digital twin of every voice profile: TTS/STT models, language preferences, acoustic fingerprint.', ['voice', 'speech', 'tts-stt']),
  twinEntry('DT009', 'Organization Twin', 4710, 9900, 'Digital twin of every organization: KPIs, structure, dependencies, risk factors.', ['organization', 'executive', 'structure']),
  twinEntry('DT010', 'Industry Twin', 4893, 14900, 'Digital twin of an industry vertical: benchmarks, trends, regulatory changes, competitive landscape.', ['industry', 'analytics', 'benchmarking']),
  twinEntry('DT011', 'Campaign Twin', null, 6900, 'Digital twin of every marketing campaign: budget, reach, conversion, ROI by channel.', ['campaign', 'marketing', 'roi']),
  twinEntry('DT012', 'Agent Twin', null, 4900, 'Digital twin of every AI agent: capabilities, karma score, performance metrics, usage patterns.', ['agent', 'ai', 'performance']),
  twinEntry('DT013', 'Property Twin', null, 7900, 'Digital twin of every property or listing: condition, pricing history, demand signals.', ['property', 'real-estate', 'listing']),
  twinEntry('DT014', 'Referral Twin', null, 4900, 'Digital twin of every referral: source, conversion rate, reward cost, network depth.', ['referral', 'growth', 'network']),
  twinEntry('DT015', 'Wallet Twin', 4896, 5900, 'Digital twin of every wallet: balance, transactions, rewards points, credit limit.', ['wallet', 'payments', 'rewards']),
  twinEntry('DT016', 'Contract Twin', null, 7900, 'Digital twin of every contract: terms, expiry alerts, compliance flags, renegotiation signals.', ['contract', 'legal', 'compliance']),
  twinEntry('DT017', 'Subscription Twin', null, 6900, 'Digital twin of every subscription: MRR, churn risk, expansion signals, usage patterns.', ['subscription', 'revenue', 'saas']),
  twinEntry('DT018', 'Inventory Twin', null, 6900, 'Digital twin of every inventory item: stock levels, reorder points, demand forecast, shelf life.', ['inventory', 'supply-chain', 'forecast']),
  twinEntry('DT019', 'Shipment Twin', null, 5900, 'Digital twin of every shipment: carrier, ETA, condition sensors, delivery probability.', ['shipment', 'logistics', 'tracking']),
  twinEntry('DT020', 'Event Twin', null, 5900, 'Digital twin of every event: attendance, engagement, sentiment, ROI measurement.', ['event', 'marketing', 'analytics']),
  twinEntry('DT021', 'Healthcare Patient Twin', null, 9900, 'HIPAA-compliant digital twin of every patient: medical history, appointments, billing.', ['healthcare', 'patient', 'compliance']),
  twinEntry('DT022', 'Hotel Guest Twin', null, 7900, 'Digital twin of every hotel guest: preferences, stay history, loyalty tier, lifetime value.', ['hospitality', 'guest', 'loyalty']),
  twinEntry('DT023', 'Restaurant Guest Twin', null, 5900, 'Digital twin of every restaurant guest: order history, dietary preferences, visit frequency.', ['restaurant', 'guest', 'preferences']),
];

// ─── 3. Department OS (9) ────────────────────────────────────────────────────

const DEPARTMENT_OS = [
  serviceEntry('DO001', 'Sales OS', 5055, 49900, 'Enterprise CRM, lead scoring, pipeline management, forecasting, commission calculation, territory optimization.', ['sales', 'crm', 'enterprise'], ['sales', 'crm', 'forecasting', 'commission']),
  serviceEntry('DO002', 'Marketing OS', 5500, 39900, 'Campaign management, audience segmentation, journey automation, content generation, attribution.', ['marketing', 'campaigns', 'automation'], ['campaigns', 'audience', 'content', 'attribution']),
  serviceEntry('DO003', 'Customer Success OS', 4050, 29900, 'Customer lifecycle management, NPS surveys, health scoring, churn prediction, expansion tracking.', ['customer-success', 'retention', 'nps'], ['lifecycle', 'nps', 'churn', 'expansion']),
  serviceEntry('DO004', 'Procurement OS', 5096, 34900, 'Supplier management, requisitions, purchase orders, contracts, inventory, RFQ automation.', ['procurement', 'suppliers', 'purchasing'], ['suppliers', 'po', 'contracts', 'rfq']),
  serviceEntry('DO005', 'Workforce OS', 5077, 39900, 'Employee management, recruitment, attendance, leave, payroll, performance, benefits.', ['workforce', 'hr', 'payroll'], ['hr', 'payroll', 'attendance', 'performance']),
  serviceEntry('DO006', 'Finance OS', 4801, 49900, 'Chart of accounts, trial balance, consolidated dashboards, AI financial copilot across all 24 industries.', ['finance', 'accounting', 'consolidation'], ['accounting', 'consolidation', 'ai-copilot']),
  serviceEntry('DO007', 'Operations OS', 5250, 44900, 'Command center, process automation, project management, incident management, capacity planning.', ['operations', 'automation', 'projects'], ['process', 'projects', 'incidents', 'capacity']),
  serviceEntry('DO008', 'CXO OS', 5100, 59900, 'Executive KPIs, strategic pillars, department monitoring, board reports, competitor analysis, risk management.', ['executive', 'cxo', 'strategy'], ['executive', 'kpis', 'strategy', 'risk']),
  serviceEntry('DO009', 'Revenue Intelligence OS', 5400, 59900, 'AI revenue department: demand forecasting, dynamic pricing, promotion management, cohort analysis.', ['revenue', 'intelligence', 'analytics'], ['revenue', 'pricing', 'demand', 'cohort']),
];

// ─── 4. Industry OS (24) ─────────────────────────────────────────────────────

const INDUSTRY_OS = [
  serviceEntry('IO001', 'Restaurant OS', 5010, 29900, 'Complete restaurant management: POS, kitchen display, menu engineering, table management.', ['restaurant', 'hospitality', 'pos'], ['pos', 'kitchen', 'menu', 'table']),
  serviceEntry('IO002', 'Hotel OS', 5025, 49900, 'Full hotel property management: reservations, housekeeping, front desk, concierge, billing.', ['hotel', 'hospitality', 'pms'], ['reservations', 'housekeeping', 'front-desk', 'billing']),
  serviceEntry('IO003', 'Healthcare OS', 5020, 59900, 'HIPAA-compliant healthcare management: patient records, appointments, billing, insurance, prescriptions.', ['healthcare', 'hipaa', 'medical'], ['patient-records', 'appointments', 'billing', 'prescriptions']),
  serviceEntry('IO004', 'Event & Banquet OS', 4751, 34900, 'Event management, banquet booking, venue management, catering, attendee tracking.', ['event', 'banquet', 'venue'], ['event', 'banquet', 'catering', 'attendees']),
  serviceEntry('IO005', 'Exhibition OS', 5040, 39900, 'Exhibition management: booth allocation, visitor tracking, lead capture, analytics.', ['exhibition', 'trade-show', 'booth'], ['booth', 'visitors', 'leads', 'analytics']),
  serviceEntry('IO006', 'Retail OS', 5030, 34900, 'Retail operations: inventory, POS, loyalty, e-commerce integration, visual merchandising.', ['retail', 'pos', 'inventory'], ['inventory', 'pos', 'loyalty', 'ecommerce']),
  serviceEntry('IO007', 'Legal OS', 5035, 49900, 'Legal practice management: case files, billing, compliance, contract management, court calendars.', ['legal', 'compliance', 'case-management'], ['cases', 'billing', 'contracts', 'compliance']),
  serviceEntry('IO008', 'Education OS', 5060, 29900, 'Educational institution management: admissions, attendance, grading, course management, e-learning.', ['education', 'lms', 'academic'], ['admissions', 'attendance', 'grading', 'courses']),
  serviceEntry('IO009', 'Agriculture OS', 5070, 24900, 'Farm management: crop planning, IoT monitoring, inventory, market pricing, compliance.', ['agriculture', 'farm', 'iot'], ['crops', 'iot', 'inventory', 'pricing']),
  serviceEntry('IO010', 'Automotive OS', 5080, 39900, 'Automotive dealership management: inventory, service scheduling, CRM, parts, warranty tracking.', ['automotive', 'dealership', 'service'], ['inventory', 'service', 'crm', 'parts']),
  serviceEntry('IO011', 'Beauty OS', 5090, 29900, 'Beauty salon/spa management: appointments, inventory, client records, loyalty, staff scheduling.', ['beauty', 'salon', 'spa'], ['appointments', 'inventory', 'loyalty', 'scheduling']),
  serviceEntry('IO012', 'Fashion OS', 5095, 34900, 'Fashion retail management: collections, lookbooks, inventory, supplier management, trend analytics.', ['fashion', 'retail', 'collections'], ['collections', 'lookbooks', 'inventory', 'trends']),
  serviceEntry('IO013', 'Fitness OS', 5110, 19900, 'Gym/fitness center management: memberships, class scheduling, trainer management, billing.', ['fitness', 'gym', 'membership'], ['memberships', 'classes', 'trainers', 'billing']),
  serviceEntry('IO014', 'Gaming OS', 5120, 34900, 'Gaming/entertainment management: player accounts, tournaments, in-game purchases, analytics.', ['gaming', 'esports', 'entertainment'], ['players', 'tournaments', 'analytics', 'purchases']),
  serviceEntry('IO015', 'Government OS', 5130, 59900, 'Government service management: citizen services, compliance, records, permit management.', ['government', 'citizen', 'compliance'], ['citizen-services', 'records', 'permits', 'compliance']),
  serviceEntry('IO016', 'Home Services OS', 5140, 24900, 'Home services management: job scheduling, technician routing, inventory, invoicing.', ['home-services', 'field-service', 'scheduling'], ['scheduling', 'routing', 'invoicing', 'inventory']),
  serviceEntry('IO017', 'Manufacturing OS', 5150, 49900, 'Manufacturing operations: production planning, quality control, supply chain, IoT monitoring.', ['manufacturing', 'production', 'quality'], ['production', 'quality', 'supply-chain', 'iot']),
  serviceEntry('IO018', 'Non-Profit OS', 5160, 24900, 'Non-profit management: donor management, grant tracking, volunteer coordination, impact reporting.', ['non-profit', 'donors', 'volunteers'], ['donors', 'grants', 'volunteers', 'impact']),
  serviceEntry('IO019', 'Professional Services OS', 5170, 34900, 'Professional services: project management, time tracking, resource allocation, client billing.', ['professional', 'services', 'consulting'], ['projects', 'time-tracking', 'billing', 'resources']),
  serviceEntry('IO020', 'Sports OS', 5180, 39900, 'Sports organization management: teams, schedules, athlete performance, fan engagement, merchandise.', ['sports', 'teams', 'athlete'], ['teams', 'schedules', 'performance', 'fans']),
  serviceEntry('IO021', 'Travel OS', 5190, 34900, 'Travel agency management: itinerary planning, supplier contracts, booking management, commissions.', ['travel', 'agency', 'itinerary'], ['itinerary', 'bookings', 'suppliers', 'commissions']),
  serviceEntry('IO022', 'Entertainment OS', 5200, 39900, 'Entertainment venue management: events, ticketing, concessions, fan engagement, analytics.', ['entertainment', 'venue', 'events'], ['events', 'ticketing', 'concessions', 'analytics']),
  serviceEntry('IO023', 'Construction OS', 5210, 44900, 'Construction project management: timelines, budget tracking, resource allocation, safety compliance.', ['construction', 'project', 'safety'], ['timelines', 'budget', 'resources', 'safety']),
  serviceEntry('IO024', 'Real Estate OS', 5230, 39900, 'Real estate management: property listings, lead tracking, transactions, rentals, maintenance.', ['real-estate', 'property', 'listings'], ['listings', 'leads', 'transactions', 'rentals']),
];

// ─── 5. Knowledge Packs (20) ────────────────────────────────────────────────

const KNOWLEDGE_PACKS = [
  entry({ listingId: 'KP001', title: 'Healthcare Regulations Knowledge Pack', description: 'Comprehensive healthcare regulations knowledge base covering HIPAA, state laws, and best practices.', category: 'data', tags: ['healthcare', 'compliance', 'hipaa', 'regulations'], pricingModel: 'one-time', price: 49900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['healthcare', 'compliance', 'hipaa'] }),
  entry({ listingId: 'KP002', title: 'GST & Tax Compliance Knowledge Pack', description: 'India GST rules, tax compliance, filing procedures, and exemption categories.', category: 'data', tags: ['gst', 'tax', 'compliance', 'india'], pricingModel: 'one-time', price: 29900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['gst', 'tax', 'compliance'] }),
  entry({ listingId: 'KP003', title: 'FMCG Industry Knowledge Pack', description: 'Fast-moving consumer goods industry benchmarks, distributor networks, and pricing strategies.', category: 'data', tags: ['fmcg', 'industry', 'distribution', 'pricing'], pricingModel: 'subscription', price: 9900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['fmcg', 'distribution', 'pricing'] }),
  entry({ listingId: 'KP004', title: 'Restaurant Operations Best Practices', description: 'Proven restaurant operations playbooks: kitchen management, service standards, cost control.', category: 'data', tags: ['restaurant', 'operations', 'best-practices'], pricingModel: 'one-time', price: 19900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['restaurant', 'operations', 'kitchen'] }),
  entry({ listingId: 'KP005', title: 'Hotel Revenue Management Guide', description: 'Hotel revenue management strategies: yield optimization, dynamic pricing, channel management.', category: 'data', tags: ['hotel', 'revenue', 'pricing', 'yield'], pricingModel: 'subscription', price: 9900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['revenue', 'yield', 'pricing'] }),
  entry({ listingId: 'KP006', title: 'Legal Contract Templates Pack', description: '200+ legal contract templates: SaaS, employment, NDA, MSA, SLA with Indian law annotations.', category: 'data', tags: ['legal', 'contracts', 'templates', 'india'], pricingModel: 'one-time', price: 49900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['legal', 'contracts', 'templates'] }),
  entry({ listingId: 'KP007', title: 'Sales Playbook for B2B SaaS', description: 'Complete B2B SaaS sales playbook: discovery, demo, negotiation, closing techniques.', category: 'data', tags: ['sales', 'b2b', 'saas', 'playbook'], pricingModel: 'one-time', price: 24900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['sales', 'b2b', 'saas'] }),
  entry({ listingId: 'KP008', title: 'Retail Inventory Optimization Guide', description: 'Retail inventory management: demand forecasting, stock optimization, shrinkage reduction.', category: 'data', tags: ['retail', 'inventory', 'optimization'], pricingModel: 'one-time', price: 19900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['inventory', 'retail', 'optimization'] }),
  entry({ listingId: 'KP009', title: 'Manufacturing Quality Standards Pack', description: 'ISO 9001, Six Sigma, and manufacturing quality management standards and checklists.', category: 'data', tags: ['manufacturing', 'quality', 'iso', 'six-sigma'], pricingModel: 'one-time', price: 39900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['quality', 'manufacturing', 'iso'] }),
  entry({ listingId: 'KP010', title: 'Financial Modeling Templates', description: '50+ Excel/Python financial models: DCF, LBO, revenue forecasting, budget planning.', category: 'data', tags: ['finance', 'modeling', 'excel', 'python'], pricingModel: 'one-time', price: 29900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['finance', 'modeling', 'excel'] }),
  entry({ listingId: 'KP011', title: 'HR Policy Handbook Templates', description: '200+ HR policy templates: onboarding, code of conduct, leave, performance, benefits.', category: 'data', tags: ['hr', 'policy', 'templates', 'handbook'], pricingModel: 'one-time', price: 19900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['hr', 'policy', 'templates'] }),
  entry({ listingId: 'KP012', title: 'Marketing Campaign Analytics Guide', description: 'Marketing analytics playbook: attribution, ROAS, funnel analysis, channel optimization.', category: 'data', tags: ['marketing', 'analytics', 'attribution', 'roas'], pricingModel: 'subscription', price: 9900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['marketing', 'analytics', 'attribution'] }),
  entry({ listingId: 'KP013', title: 'Real Estate Transaction Guide', description: 'Complete real estate transaction process: listings, agreements, RERA compliance, registration.', category: 'data', tags: ['real-estate', 'rera', 'transactions', 'india'], pricingModel: 'one-time', price: 29900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['real-estate', 'rera', 'transactions'] }),
  entry({ listingId: 'KP014', title: 'Healthcare Billing & Insurance Guide', description: 'Medical billing, insurance claim processing, and healthcare revenue cycle management.', category: 'data', tags: ['healthcare', 'billing', 'insurance', 'rcm'], pricingModel: 'one-time', price: 39900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['healthcare', 'billing', 'insurance'] }),
  entry({ listingId: 'KP015', title: 'Supply Chain Resilience Playbook', description: 'Supply chain risk management: disruption mapping, alternative sourcing, inventory buffers.', category: 'data', tags: ['supply-chain', 'risk', 'resilience', 'logistics'], pricingModel: 'one-time', price: 24900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['supply-chain', 'risk', 'resilience'] }),
  entry({ listingId: 'KP016', title: 'Startup Legal Checklist', description: 'Startup legal foundation: incorporation, IP, funding docs, employment agreements, compliance.', category: 'data', tags: ['startup', 'legal', 'incorporation', 'funding'], pricingModel: 'one-time', price: 19900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['startup', 'legal', 'incorporation'] }),
  entry({ listingId: 'KP017', title: 'Customer Success Playbook', description: 'Customer success frameworks: health scoring, churn prevention, expansion, NPS improvement.', category: 'data', tags: ['customer-success', 'playbook', 'churn', 'nps'], pricingModel: 'subscription', price: 9900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['customer-success', 'churn', 'nps'] }),
  entry({ listingId: 'KP018', title: 'Cybersecurity Compliance Pack', description: 'Cybersecurity frameworks: SOC2, ISO 27001, GDPR, and incident response procedures.', category: 'data', tags: ['cybersecurity', 'compliance', 'soc2', 'gdpr'], pricingModel: 'one-time', price: 49900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['cybersecurity', 'compliance', 'soc2'] }),
  entry({ listingId: 'KP019', title: 'Agriculture Market Intelligence', description: 'Crop prices, weather data, mandi rates, government schemes, and agricultural best practices.', category: 'data', tags: ['agriculture', 'market', 'weather', 'mandi'], pricingModel: 'subscription', price: 4900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['agriculture', 'market', 'weather'] }),
  entry({ listingId: 'KP020', title: 'Education Curriculum Standards', description: 'NCERT, CBSE, ICSE curriculum standards and assessment frameworks for K-12 education.', category: 'data', tags: ['education', 'curriculum', 'ncert', 'cbse'], pricingModel: 'subscription', price: 9900, currency: 'INR', provider: 'HOJAI AI', capabilities: ['education', 'curriculum', 'ncert'] }),
];

// ─── 6. Workflow Templates (20) ─────────────────────────────────────────────

const WORKFLOWS = [
  entry({ listingId: 'WF001', title: 'Lead-to-Revenue Automation', description: 'Full funnel automation: lead capture → scoring → nurture → demo → close → onboard.', category: 'workflow', tags: ['sales', 'automation', 'lead', 'funnel'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['lead', 'nurture', 'demo', 'close'] }),
  entry({ listingId: 'WF002', title: 'Employee Onboarding Automation', description: 'Automated onboarding: offer letter → document collection → IT setup → training → buddy assignment.', category: 'workflow', tags: ['hr', 'onboarding', 'automation'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['onboarding', 'documents', 'training'] }),
  entry({ listingId: 'WF003', title: 'Invoice-to-Payment Workflow', description: 'Accounts payable automation: invoice capture → validation → approval → payment → reconciliation.', category: 'workflow', tags: ['finance', 'invoice', 'automation', 'ap'], pricingModel: 'subscription', price: 14900, provider: 'HOJAI AI', capabilities: ['invoice', 'approval', 'payment'] }),
  entry({ listingId: 'WF004', title: 'Customer Complaint Resolution', description: 'Complaint-to-resolution: ticket → routing → assignment → resolution → feedback → closure.', category: 'workflow', tags: ['cs', 'complaint', 'resolution', 'sla'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['complaint', 'sla', 'resolution'] }),
  entry({ listingId: 'WF005', title: 'Marketing Campaign Launch', description: 'Campaign launch: audience selection → content generation → approval → scheduling → launch → attribution.', category: 'workflow', tags: ['marketing', 'campaign', 'automation'], pricingModel: 'subscription', price: 14900, provider: 'HOJAI AI', capabilities: ['campaign', 'content', 'attribution'] }),
  entry({ listingId: 'WF006', title: 'Purchase Order Approval', description: 'PO workflow: requisition → approval (amount-based routing) → vendor notification → receipt → payment.', category: 'workflow', tags: ['procurement', 'po', 'approval', 'automation'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['po', 'approval', 'receipt'] }),
  entry({ listingId: 'WF007', title: 'Restaurant Order-to-Delivery', description: 'Order flow: online order → kitchen display → prep → quality check → delivery dispatch → confirmation.', category: 'workflow', tags: ['restaurant', 'order', 'delivery', 'kds'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['order', 'kitchen', 'delivery'] }),
  entry({ listingId: 'WF008', title: 'Hotel Check-in/Check-out', description: 'Guest flow: pre-arrival → check-in → room assignment → services → billing → check-out → feedback.', category: 'workflow', tags: ['hotel', 'checkin', 'checkout', 'guest'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['checkin', 'checkout', 'billing'] }),
  entry({ listingId: 'WF009', title: 'Sales Commission Calculation', description: 'Commission workflow: deal closed → plan lookup → tier calculation → manager approval → payout.', category: 'workflow', tags: ['sales', 'commission', 'payout', 'automation'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['commission', 'calculation', 'payout'] }),
  entry({ listingId: 'WF010', title: 'Supplier Onboarding', description: 'Vendor onboarding: sourcing → KYB verification → contract negotiation → compliance → activation.', category: 'workflow', tags: ['procurement', 'supplier', 'kyb', 'compliance'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['kyb', 'contract', 'compliance'] }),
  entry({ listingId: 'WF011', title: 'Incident-to-Resolution', description: 'ITSM workflow: incident detection → categorization → assignment → resolution → RCA → closure.', category: 'workflow', tags: ['operations', 'itsm', 'incident', 'automation'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['incident', 'itsm', 'rca'] }),
  entry({ listingId: 'WF012', title: 'Insurance Claim Processing', description: 'Claim flow: submission → document verification → adjudication → approval → payment → closure.', category: 'workflow', tags: ['insurance', 'claims', 'healthcare', 'automation'], pricingModel: 'subscription', price: 24900, provider: 'HOJAI AI', capabilities: ['claims', 'verification', 'adjudication'] }),
  entry({ listingId: 'WF013', title: 'Event Registration & Check-in', description: 'Event flow: registration → badge printing → check-in → session tracking → feedback → analytics.', category: 'workflow', tags: ['event', 'registration', 'checkin', 'analytics'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['registration', 'checkin', 'analytics'] }),
  entry({ listingId: 'WF014', title: 'Loan Application Processing', description: 'Loan flow: application → KYC → credit check → underwriting → approval → disbursement → repayment.', category: 'workflow', tags: ['finance', 'loan', 'kyc', 'underwriting'], pricingModel: 'subscription', price: 39900, provider: 'HOJAI AI', capabilities: ['kyc', 'underwriting', 'disbursement'] }),
  entry({ listingId: 'WF015', title: 'Contract Renewal Automation', description: 'Renewal flow: expiry detection → health check → risk assessment → renewal offer → close.', category: 'workflow', tags: ['sales', 'renewal', 'contract', 'automation'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['renewal', 'risk', 'automation'] }),
  entry({ listingId: 'WF016', title: 'Content Creation Pipeline', description: 'Content flow: brief → research → writing → review → SEO optimization → publishing → analytics.', category: 'workflow', tags: ['marketing', 'content', 'seo', 'pipeline'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['content', 'seo', 'publishing'] }),
  entry({ listingId: 'WF017', title: 'Warranty Claim Processing', description: 'Warranty flow: claim submission → product verification → damage assessment → approval → repair/replace.', category: 'workflow', tags: ['retail', 'warranty', 'claims', 'service'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['warranty', 'claims', 'repair'] }),
  entry({ listingId: 'WF018', title: 'Student Admission Process', description: 'Admission flow: application → shortlisting → interview → offer → acceptance → enrollment → orientation.', category: 'workflow', tags: ['education', 'admission', 'enrollment', 'automation'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['admission', 'interview', 'enrollment'] }),
  entry({ listingId: 'WF019', title: 'Maintenance Request Management', description: 'Maintenance flow: request → triage → technician assignment → work order → completion → feedback.', category: 'workflow', tags: ['operations', 'maintenance', 'facility', 'work-order'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['maintenance', 'work-order', 'facility'] }),
  entry({ listingId: 'WF020', title: 'Subscription Billing Cycle', description: 'Subscription flow: billing date → invoice generation → payment retry → dunning → closure → churn analysis.', category: 'workflow', tags: ['saas', 'subscription', 'billing', 'dunning'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['billing', 'dunning', 'churn'] }),
];

// ─── 7. Analytics & Insights (20) ────────────────────────────────────────────

const ANALYTICS = [
  entry({ listingId: 'AN001', title: 'Revenue Analytics Dashboard', description: 'Real-time revenue dashboard across all channels, segments, and time periods.', category: 'data', tags: ['revenue', 'analytics', 'dashboard', 'real-time'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['revenue', 'dashboard', 'real-time'] }),
  entry({ listingId: 'AN002', title: 'Customer Analytics Platform', description: '360° customer analytics: LTV, churn, engagement, NPS, segmentation, cohort analysis.', category: 'data', tags: ['customer', 'analytics', 'ltv', 'churn'], pricingModel: 'subscription', price: 29900, provider: 'HOJAI AI', capabilities: ['customer', 'ltv', 'churn', 'cohort'] }),
  entry({ listingId: 'AN003', title: 'Marketing Attribution Matrix', description: 'Multi-touch attribution across all marketing channels with AI-driven model optimization.', category: 'data', tags: ['marketing', 'attribution', 'channels', 'ai'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['attribution', 'channels', 'ai'] }),
  entry({ listingId: 'AN004', title: 'Sales Pipeline Intelligence', description: 'Pipeline analytics with AI-driven deal inspection, risk flags, and forecast accuracy.', category: 'data', tags: ['sales', 'pipeline', 'analytics', 'forecast'], pricingModel: 'subscription', price: 14900, provider: 'HOJAI AI', capabilities: ['pipeline', 'forecast', 'risk'] }),
  entry({ listingId: 'AN005', title: 'HR Analytics Suite', description: 'Workforce analytics: attrition, engagement, productivity, compensation benchmarks, headcount planning.', category: 'data', tags: ['hr', 'analytics', 'workforce', 'engagement'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['hr', 'attrition', 'engagement'] }),
  entry({ listingId: 'AN006', title: 'Financial Consolidation Engine', description: 'Automated financial consolidation across business units, entities, and currencies.', category: 'data', tags: ['finance', 'consolidation', 'multi-entity', 'currency'], pricingModel: 'subscription', price: 39900, provider: 'HOJAI AI', capabilities: ['consolidation', 'multi-entity', 'currency'] }),
  entry({ listingId: 'AN007', title: 'Supply Chain Analytics', description: 'End-to-end supply chain visibility: demand, inventory, logistics, supplier performance.', category: 'data', tags: ['supply-chain', 'analytics', 'logistics', 'inventory'], pricingModel: 'subscription', price: 24900, provider: 'HOJAI AI', capabilities: ['supply-chain', 'inventory', 'logistics'] }),
  entry({ listingId: 'AN008', title: 'Product Analytics Platform', description: 'Product usage analytics: feature adoption, funnel, retention curves, A/B test analysis.', category: 'data', tags: ['product', 'analytics', 'adoption', 'a-b-test'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['product', 'adoption', 'a-b-test'] }),
  entry({ listingId: 'AN009', title: 'Social Media Intelligence', description: 'Social listening, sentiment analysis, competitive benchmarking, influencer identification.', category: 'data', tags: ['social', 'sentiment', 'listening', 'influencer'], pricingModel: 'subscription', price: 14900, provider: 'HOJAI AI', capabilities: ['social', 'sentiment', 'influencer'] }),
  entry({ listingId: 'AN010', title: 'Operations Command Center', description: 'Real-time operations dashboard: processes, incidents, capacity, SLA compliance.', category: 'data', tags: ['operations', 'dashboard', 'real-time', 'sla'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['operations', 'sla', 'capacity'] }),
  entry({ listingId: 'AN011', title: 'Healthcare Outcomes Analytics', description: 'Clinical outcomes, readmission rates, patient satisfaction, and operational efficiency.', category: 'data', tags: ['healthcare', 'outcomes', 'analytics', 'hipaa'], pricingModel: 'subscription', price: 29900, provider: 'HOJAI AI', capabilities: ['healthcare', 'outcomes', 'readmission'] }),
  entry({ listingId: 'AN012', title: 'Retail Performance Intelligence', description: 'POS analytics, sell-through rates, basket size, conversion, footfall, inventory turn.', category: 'data', tags: ['retail', 'pos', 'analytics', 'performance'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['retail', 'pos', 'footfall'] }),
  entry({ listingId: 'AN013', title: 'Real Estate Market Intelligence', description: 'Property valuations, market trends, price index, demand forecasting, investment analysis.', category: 'data', tags: ['real-estate', 'market', 'valuation', 'investment'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['valuation', 'market', 'investment'] }),
  entry({ listingId: 'AN014', title: 'Restaurant Performance Analytics', description: 'Table turn, average check, food cost, labor cost, covers, peak hour analysis.', category: 'data', tags: ['restaurant', 'analytics', 'food-cost', 'turn'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['restaurant', 'food-cost', 'turn'] }),
  entry({ listingId: 'AN015', title: 'Manufacturing OEE Dashboard', description: 'Overall Equipment Effectiveness: availability, performance, quality metrics by line.', category: 'data', tags: ['manufacturing', 'oee', 'equipment', 'quality'], pricingModel: 'subscription', price: 24900, provider: 'HOJAI AI', capabilities: ['oee', 'equipment', 'quality'] }),
  entry({ listingId: 'AN016', title: 'CX Journey Analytics', description: 'Customer journey mapping, touchpoint analysis, friction detection, experience scoring.', category: 'data', tags: ['cx', 'journey', 'analytics', 'friction'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['journey', 'friction', 'touchpoint'] }),
  entry({ listingId: 'AN017', title: 'Pricing Intelligence Engine', description: 'Competitor price monitoring, elasticity analysis, dynamic pricing recommendations.', category: 'data', tags: ['pricing', 'competitor', 'elasticity', 'dynamic'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['pricing', 'competitor', 'elasticity'] }),
  entry({ listingId: 'AN018', title: 'Employee Engagement Pulse', description: 'Real-time employee sentiment, engagement surveys, manager effectiveness, culture health.', category: 'data', tags: ['hr', 'engagement', 'pulse', 'culture'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['engagement', 'pulse', 'culture'] }),
  entry({ listingId: 'AN019', title: 'Cash Flow Forecasting Engine', description: 'AI-driven cash flow forecasting with scenario modeling and working capital optimization.', category: 'data', tags: ['finance', 'cash-flow', 'forecast', 'scenario'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['cash-flow', 'forecast', 'scenario'] }),
  entry({ listingId: 'AN020', title: 'Compliance & Audit Dashboard', description: 'Real-time compliance monitoring, audit trail, regulatory reporting, exception alerts.', category: 'data', tags: ['compliance', 'audit', 'regulatory', 'dashboard'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['compliance', 'audit', 'regulatory'] }),
];

// ─── 8. Bundles (12) ────────────────────────────────────────────────────────

const BUNDLES = [
  entry({ listingId: 'BD001', title: 'Sales Agent Bundle', description: 'All 22 Sales OS AI agents at 43% discount. Complete sales intelligence stack.', category: 'service', tags: ['sales', 'bundle', 'crm', 'ai'], pricingModel: 'subscription', price: 249900, currency: 'INR', pricing: { model: 'bundle', agents: 22, savings: '43%' }, provider: 'HOJAI AI', capabilities: ['sales', 'crm', 'ai', 'intelligence'] }),
  entry({ listingId: 'BD002', title: 'HR Agent Bundle', description: 'All 25 Workforce OS AI agents at 41% discount. Complete HR automation stack.', category: 'service', tags: ['hr', 'bundle', 'workforce', 'ai'], pricingModel: 'subscription', price: 299900, currency: 'INR', pricing: { model: 'bundle', agents: 25, savings: '41%' }, provider: 'HOJAI AI', capabilities: ['hr', 'workforce', 'automation'] }),
  entry({ listingId: 'BD003', title: 'Media Agent Bundle', description: 'All 20 Media OS AI agents at 35% discount. Complete content intelligence stack.', category: 'service', tags: ['media', 'bundle', 'content', 'ai'], pricingModel: 'subscription', price: 199900, currency: 'INR', pricing: { model: 'bundle', agents: 20, savings: '35%' }, provider: 'HOJAI AI', capabilities: ['media', 'content', 'ai'] }),
  entry({ listingId: 'BD004', title: 'Finance Agent Bundle', description: 'All 7 Finance AI agents at 36% discount. Complete financial intelligence stack.', category: 'service', tags: ['finance', 'bundle', 'ai', 'cfo'], pricingModel: 'subscription', price: 179900, currency: 'INR', pricing: { model: 'bundle', agents: 7, savings: '36%' }, provider: 'HOJAI AI', capabilities: ['finance', 'cfo', 'ai'] }),
  entry({ listingId: 'BD005', title: 'Support Bundle', description: 'All 9 Customer Operations agents at 42% discount. Complete support automation.', category: 'service', tags: ['support', 'bundle', 'cs', 'automation'], pricingModel: 'subscription', price: 129900, currency: 'INR', pricing: { model: 'bundle', agents: 9, savings: '42%' }, provider: 'HOJAI AI', capabilities: ['support', 'cs', 'automation'] }),
  entry({ listingId: 'BD006', title: 'Atlas Bundle', description: 'All 6 Atlas Workforce agents at 30% discount. Autonomous sales & workforce outreach.', category: 'service', tags: ['atlas', 'bundle', 'sdr', 'workforce'], pricingModel: 'subscription', price: 129900, currency: 'INR', pricing: { model: 'bundle', agents: 6, savings: '30%' }, provider: 'HOJAI AI', capabilities: ['sdr', 'workforce', 'outreach'] }),
  entry({ listingId: 'BD007', title: 'Digital Twin Enterprise Bundle', description: 'All 23 Digital Twins at 40% discount. Complete twin infrastructure.', category: 'twin', tags: ['twin', 'bundle', 'enterprise', 'ai'], pricingModel: 'subscription', price: 99900, currency: 'INR', pricing: { model: 'bundle', twins: 23, savings: '40%' }, provider: 'HOJAI AI', capabilities: ['customer-twin', 'employee-twin', 'product-twin'] }),
  entry({ listingId: 'BD008', title: 'Hospitality Suite', description: 'Restaurant OS + Hotel OS + Event OS at 30% discount. Complete hospitality stack.', category: 'service', tags: ['hospitality', 'bundle', 'restaurant', 'hotel'], pricingModel: 'subscription', price: 79900, currency: 'INR', pricing: { model: 'bundle', services: 3, savings: '30%' }, provider: 'HOJAI AI', capabilities: ['restaurant', 'hotel', 'event'] }),
  entry({ listingId: 'BD009', title: 'Department OS Bundle', description: 'All 9 Department OS platforms at 35% discount. Complete horizontal layer.', category: 'service', tags: ['department', 'bundle', 'horizontal', 'enterprise'], pricingModel: 'subscription', price: 299900, currency: 'INR', pricing: { model: 'bundle', services: 9, savings: '35%' }, provider: 'HOJAI AI', capabilities: ['sales', 'marketing', 'hr', 'finance', 'ops'] }),
  entry({ listingId: 'BD010', title: 'Industry OS Bundle', description: 'All 24 Industry OS platforms at 40% discount. Complete vertical layer.', category: 'service', tags: ['industry', 'bundle', 'vertical', 'enterprise'], pricingModel: 'subscription', price: 499900, currency: 'INR', pricing: { model: 'bundle', services: 24, savings: '40%' }, provider: 'HOJAI AI', capabilities: ['restaurant', 'hotel', 'healthcare', 'retail'] }),
  entry({ listingId: 'BD011', title: 'Genie AI Suite', description: 'All 13 Genie vision agents + 3 missing (Budgeting, Legal, Localization). 18 AI companions.', category: 'agent', tags: ['genie', 'bundle', 'personal-ai', 'vision'], pricingModel: 'subscription', price: 9900, currency: 'INR', pricing: { model: 'subscription', perMonth: 99 }, provider: 'HOJAI AI', capabilities: ['companion', 'memory', 'research', 'travel', 'finance'] }),
  entry({ listingId: 'BD012', title: 'Startup Growth Pack', description: 'Sales OS + Marketing OS + Customer Success OS + Genie AI Suite at 50% discount.', category: 'service', tags: ['startup', 'bundle', 'growth', 'sme'], pricingModel: 'subscription', price: 49900, currency: 'INR', pricing: { model: 'bundle', services: 4, savings: '50%' }, provider: 'HOJAI AI', capabilities: ['sales', 'marketing', 'cs', 'genie'] }),
];

// ─── 9. Integration Packs (10) ─────────────────────────────────────────────

const INTEGRATIONS = [
  entry({ listingId: 'IN001', title: 'WhatsApp Business Integration', description: 'Native WhatsApp integration for customer messaging, support, and commerce with AI automation.', category: 'integration', tags: ['whatsapp', 'messaging', 'integration', 'commerce'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['whatsapp', 'messaging', 'commerce'] }),
  entry({ listingId: 'IN002', title: 'Salesforce Connector', description: 'Bi-directional Salesforce sync: leads, contacts, opportunities, and custom objects.', category: 'integration', tags: ['salesforce', 'crm', 'integration', 'sync'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['salesforce', 'sync', 'crm'] }),
  entry({ listingId: 'IN003', title: 'Zoho CRM Connector', description: 'Zoho CRM integration for lead management, deal tracking, and workflow automation.', category: 'integration', tags: ['zoho', 'crm', 'integration'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['zoho', 'crm', 'sync'] }),
  entry({ listingId: 'IN004', title: 'QuickBooks / Tally Integration', description: 'Accounting integration with QuickBooks and Tally for invoice sync and financial consolidation.', category: 'integration', tags: ['quickbooks', 'tally', 'accounting', 'integration'], pricingModel: 'subscription', price: 14900, provider: 'HOJAI AI', capabilities: ['quickbooks', 'tally', 'accounting'] }),
  entry({ listingId: 'IN005', title: 'Razorpay Payment Gateway', description: 'Razorpay payment integration for online payments, subscriptions, and refunds.', category: 'integration', tags: ['razorpay', 'payments', 'gateway', 'integration'], pricingModel: 'usage-based', price: 0, pricing: { model: 'usage-based', perTransaction: 100 }, provider: 'HOJAI AI', capabilities: ['payments', 'razorpay', 'gateway'] }),
  entry({ listingId: 'IN006', title: 'UPI & BharatQR Integration', description: 'UPI and QR code payments integration for in-store and online transactions.', category: 'integration', tags: ['upi', 'payments', 'qr', 'india'], pricingModel: 'usage-based', price: 0, pricing: { model: 'usage-based', perTransaction: 50 }, provider: 'HOJAI AI', capabilities: ['upi', 'qr', 'payments'] }),
  entry({ listingId: 'IN007', title: 'Shopify E-Commerce Connector', description: 'Shopify store integration for product sync, order management, and inventory.', category: 'integration', tags: ['shopify', 'ecommerce', 'integration', 'orders'], pricingModel: 'subscription', price: 14900, provider: 'HOJAI AI', capabilities: ['shopify', 'ecommerce', 'orders'] }),
  entry({ listingId: 'IN008', title: 'Google Workspace Integration', description: 'Google Workspace sync: Gmail, Calendar, Drive, Meet, and Chat automation.', category: 'integration', tags: ['google', 'workspace', 'gmail', 'calendar'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['gmail', 'calendar', 'drive', 'meet'] }),
  entry({ listingId: 'IN009', title: 'Microsoft 365 Connector', description: 'Microsoft 365 integration: Outlook, Teams, SharePoint, and Copilot automation.', category: 'integration', tags: ['microsoft', 'm365', 'outlook', 'teams'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['outlook', 'teams', 'sharepoint'] }),
  entry({ listingId: 'IN010', title: 'Zomato & Swiggy Integration', description: 'Restaurant aggregator integration for menu sync, order management, and ratings.', category: 'integration', tags: ['zomato', 'swiggy', 'restaurant', 'delivery'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['zomato', 'swiggy', 'orders'] }),
];

// ─── 10. Add-Ons (7) ──────────────────────────────────────────────────────

const ADD_ONS = [
  entry({ listingId: 'AO001', title: 'Multi-Tenant Isolation', description: 'Enterprise multi-tenant isolation with per-tenant data partitioning and RBAC.', category: 'service', tags: ['multi-tenant', 'enterprise', 'rbac', 'security'], pricingModel: 'subscription', price: 49900, provider: 'HOJAI AI', capabilities: ['multi-tenant', 'rbac', 'isolation'] }),
  entry({ listingId: 'AO002', title: 'AI Model Fine-Tuning', description: 'Custom fine-tuning of AI models on your proprietary data for higher accuracy.', category: 'service', tags: ['ai', 'fine-tuning', 'llm', 'custom'], pricingModel: 'quote-only', price: 0, pricing: { model: 'quote-only' }, provider: 'HOJAI AI', capabilities: ['fine-tuning', 'llm', 'custom-ai'] }),
  entry({ listingId: 'AO003', title: 'Dedicated AI Infrastructure', description: 'Dedicated GPU infrastructure for latency-sensitive workloads and data residency.', category: 'service', tags: ['infrastructure', 'gpu', 'dedicated', 'latency'], pricingModel: 'quote-only', price: 0, pricing: { model: 'quote-only' }, provider: 'HOJAI AI', capabilities: ['gpu', 'dedicated', 'latency'] }),
  entry({ listingId: 'AO004', title: 'Custom Domain & White-Label', description: 'White-label deployment with custom domain, branding, and zero HOJAI references.', category: 'service', tags: ['white-label', 'custom-domain', 'branding', 'enterprise'], pricingModel: 'subscription', price: 19900, provider: 'HOJAI AI', capabilities: ['white-label', 'custom-domain', 'branding'] }),
  entry({ listingId: 'AO005', title: 'Priority Support SLA', description: '24/7 priority support with 1-hour response SLA and dedicated success manager.', category: 'service', tags: ['support', 'sla', 'enterprise', 'priority'], pricingModel: 'subscription', price: 29900, provider: 'HOJAI AI', capabilities: ['support', 'sla', 'priority'] }),
  entry({ listingId: 'AO006', title: 'Audit & Compliance Pack', description: 'SOC2, ISO 27001, GDPR, and HIPAA compliance documentation and audit support.', category: 'service', tags: ['compliance', 'soc2', 'iso27001', 'gdpr', 'hipaa'], pricingModel: 'subscription', price: 49900, provider: 'HOJAI AI', capabilities: ['soc2', 'iso27001', 'gdpr', 'hipaa'] }),
  entry({ listingId: 'AO007', title: 'API Rate Limit Upgrade', description: 'Increased API rate limits from 1000 to 10000 req/min for high-volume workloads.', category: 'service', tags: ['api', 'rate-limit', 'enterprise', 'volume'], pricingModel: 'subscription', price: 9900, provider: 'HOJAI AI', capabilities: ['api', 'rate-limit'] }),
];

// ─── Seed function ────────────────────────────────────────────────────────────

async function seed() {
  console.log(`[bam-seed] Connecting to MongoDB: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI);
  console.log('[bam-seed] Connected. Starting seed...');

  const allEntries = [
    ...AI_AGENTS,
    ...DIGITAL_TWINS,
    ...DEPARTMENT_OS,
    ...INDUSTRY_OS,
    ...KNOWLEDGE_PACKS,
    ...WORKFLOWS,
    ...ANALYTICS,
    ...BUNDLES,
    ...INTEGRATIONS,
    ...ADD_ONS,
  ];

  console.log(`[bam-seed] Total entries to upsert: ${allEntries.length}`);
  console.log(`  AI Agents:        ${AI_AGENTS.length}`);
  console.log(`  Digital Twins:    ${DIGITAL_TWINS.length}`);
  console.log(`  Department OS:    ${DEPARTMENT_OS.length}`);
  console.log(`  Industry OS:      ${INDUSTRY_OS.length}`);
  console.log(`  Knowledge Packs:  ${KNOWLEDGE_PACKS.length}`);
  console.log(`  Workflows:        ${WORKFLOWS.length}`);
  console.log(`  Analytics:       ${ANALYTICS.length}`);
  console.log(`  Bundles:         ${BUNDLES.length}`);
  console.log(`  Integrations:    ${INTEGRATIONS.length}`);
  console.log(`  Add-Ons:         ${ADD_ONS.length}`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const entry of allEntries) {
    try {
      const result = await Listing.updateOne(
        { tenantId: entry.tenantId, listingId: entry.listingId },
        { $set: entry },
        { upsert: true }
      );
      if (result.upsertedCount > 0) inserted++;
      else if (result.modifiedCount > 0) updated++;
    } catch (err) {
      console.error(`[bam-seed] Error upserting ${entry.listingId}:`, err.message);
      errors++;
    }
  }

  console.log(`\n[bam-seed] Done! inserted=${inserted}, updated=${updated}, errors=${errors}`);
  console.log(`[bam-seed] Total catalog: ${await Listing.countDocuments({ tenantId: TENANT_SYSTEM })} entries`);

  await mongoose.disconnect();
  process.exit(errors > 0 ? 1 : 0);
}

seed().catch((err) => {
  console.error('[bam-seed] Fatal:', err);
  process.exit(1);
});
