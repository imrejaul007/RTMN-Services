/**
 * Sales OS - Enterprise-Grade Unified Sales Intelligence Platform
 *
 * Combined Services: REZ SalesMind, CRM Engine, Lead Twin, Sales Copilot,
 * Customer Success OS, CPQ, Contract Lifecycle, Territory Management,
 * Sales Forecasting, Revenue Intelligence, Partner OS, Sales Enablement,
 * Call/Meeting Intelligence, Workflow Automation, Commission OS, Subscription Management
 *
 * 20+ AI Agents: Lead Scoring, Opportunity, Forecasting, Churn Prediction,
 * Pricing, Contract, Territory, Commission, Coaching, Enablement, Engagement,
 * Competitor, Sentiment, Next Best Action, Auto Follow-up, Renewal,
 * Upsell/Cross-sell, Onboarding, Health Score, Social Selling, Battlecard
 *
 * Port: 5055
 * Part of: RTMN Industry OS Ecosystem
 * Version: 2.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const crypto = require('crypto');

// RTMN Integration Modules (optional - graceful degradation)
let bridgeManager = null;
let rtmntEcosystem = null;
let rezSalesMind = null;

try {
  const bridges = require('../bridges');
  bridgeManager = bridges.bridgeManager;
} catch (e) {
  console.log('[Sales OS] Industry Bridges not available:', e.message);
}

try {
  const rtmntIntegration = require('../integrations/rtmn-ecosystem');
  rtmntEcosystem = rtmntIntegration.rtmntEcosystemIntegration;
} catch (e) {
  console.log('[Sales OS] RTMN Ecosystem not available:', e.message);
}

try {
  const salesmind = require('../integrations/rez-salesmind');
  rezSalesMind = salesmind.rezSalesMind;
} catch (e) {
  console.log('[Sales OS] REZ-SalesMind not available:', e.message);
}

const app = express();
const PORT = process.env.SALES_OS_PORT || 5055;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ============================================================
// DATA STORES - Complete Enterprise CRM + CS + CPQ + More
// ============================================================

const dataStores = {
  // ===== CORE CRM =====
  leads: new Map(),
  leadActivities: new Map(),
  contacts: new Map(),
  accounts: new Map(),
  opportunities: new Map(),
  dealActivities: new Map(),
  activities: new Map(),
  tasks: new Map(),
  meetings: new Map(),
  calls: new Map(),
  pipelineStages: new Map([
    ['lead', { id: 'lead', name: 'Lead', order: 1 }],
    ['qualified', { id: 'qualified', name: 'Qualified', order: 2 }],
    ['proposal', { id: 'proposal', name: 'Proposal', order: 3 }],
    ['negotiation', { id: 'negotiation', name: 'Negotiation', order: 4 }],
    ['closed_won', { id: 'closed_won', name: 'Closed Won', order: 5 }],
    ['closed_lost', { id: 'closed_lost', name: 'Closed Lost', order: 6 }],
  ]),

  // ===== PRODUCTS & CPQ =====
  products: new Map(),
  productBundles: new Map(),
  priceBooks: new Map(),
  quotes: new Map(),
  discountApprovals: new Map(),

  // ===== CONTRACTS =====
  contracts: new Map(),
  contractVersions: new Map(),
  contractAmendments: new Map(),
  esignatures: new Map(),

  // ===== CUSTOMER SUCCESS =====
  customers: new Map(),
  onboardingJourneys: new Map(),
  healthScores: new Map(),
  npsSurveys: new Map(),
  npsResponses: new Map(),
  churnRisks: new Map(),
  renewals: new Map(),

  // ===== TERRITORY MANAGEMENT =====
  territories: new Map(),
  territoryAssignments: new Map(),
  quotaAllocations: new Map(),

  // ===== FORECASTING =====
  forecasts: new Map(),
  forecastAdjustments: new Map(),
  pipelineMovements: new Map(),

  // ===== REVENUE INTELLIGENCE =====
  revenueAttribution: new Map(),
  revenueAnalytics: new Map(),
  mrrTracking: new Map(),
  arrTracking: new Map(),
  cohortAnalysis: new Map(),

  // ===== PARTNER OS =====
  partners: new Map(),
  partnerAccounts: new Map(),
  partnerDeals: new Map(),
  partnerCommissions: new Map(),
  partnerPerformance: new Map(),

  // ===== SALES ENABLEMENT =====
  content: new Map(),
  trainingModules: new Map(),
  certifications: new Map(),
  battleCards: new Map(),
  playbooks: new Map(),

  // ===== CALL/MEETING INTELLIGENCE =====
  recordings: new Map(),
  transcripts: new Map(),
  meetingNotes: new Map(),
  callMetrics: new Map(),
  sentimentAnalysis: new Map(),

  // ===== WORKFLOW AUTOMATION =====
  workflows: new Map(),
  workflowRuns: new Map(),
  automationRules: new Map(),

  // ===== COMMISSION OS =====
  commissionPlans: new Map(),
  commissions: new Map(),
  commissionPayouts: new Map(),
  spiffs: new Map(),

  // ===== SUBSCRIPTION MANAGEMENT =====
  subscriptions: new Map(),
  subscriptionChanges: new Map(),
  billingSchedules: new Map(),

  // ===== TEAM & ORGS =====
  salesReps: new Map(),
  teams: new Map(),
  managers: new Map(),

  // ===== CAMPAIGNS & SOURCES =====
  campaigns: new Map(),
  leadsources: new Map(),

  // ===== ANALYTICS =====
  reports: new Map(),
  dashboards: new Map(),

  // ===== AI AGENTS =====
  aiAgents: new Map(),
  agentTasks: new Map(),

  // ===== GCC/ENTERPRISE =====
  multiCurrencyRates: new Map(),
  taxConfigurations: new Map(),
  complianceLogs: new Map(),
  auditTrails: new Map(),

  // ===== INTEGRATIONS =====
  integrations: new Map(),
  webhooks: new Map(),
};

// ============================================================
// AUTHENTICATION (from Legal OS pattern)
// ============================================================
const sessions = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function requireAuth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authorization required' });
  }
  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Invalid session' });
  }
  req.user = session;
  next();
}

// ============================================================
// SAMPLE DATA INITIALIZATION
// ============================================================

function initSampleData() {
  // ===== SALES REPS =====
  const salesReps = [
    { id: 'SR001', name: 'Rahul Sharma', email: 'rahul@rtmn.com', role: 'Account Executive', territory: 'North', quota: 500000, achieved: 325000, managerId: 'MGR001' },
    { id: 'SR002', name: 'Priya Patel', email: 'priya@rtmn.com', role: 'Account Executive', territory: 'South', quota: 500000, achieved: 475000, managerId: 'MGR001' },
    { id: 'SR003', name: 'Amit Kumar', email: 'amit@rtmn.com', role: 'SDR', territory: 'East', quota: 200000, achieved: 210000, managerId: 'MGR001' },
    { id: 'SR004', name: 'Sneha Gupta', email: 'sneha@rtmn.com', role: 'Account Executive', territory: 'West', quota: 500000, achieved: 380000, managerId: 'MGR002' },
    { id: 'SR005', name: 'Vikram Singh', email: 'vikram@rtmn.com', role: 'Partner Manager', territory: 'All', quota: 1000000, achieved: 720000, managerId: 'MGR002' },
  ];
  salesReps.forEach(rep => dataStores.salesReps.set(rep.id, rep));

  // ===== MANAGERS =====
  const managers = [
    { id: 'MGR001', name: 'Anita Desai', email: 'anita@rtmn.com', role: 'Sales Manager', team: 'Enterprise' },
    { id: 'MGR002', name: 'Rajiv Mehta', email: 'rajiv@rtmn.com', role: 'Sales Director', team: 'Strategic' },
  ];
  managers.forEach(mgr => dataStores.managers.set(mgr.id, mgr));

  // ===== ACCOUNTS =====
  const accounts = [
    { id: 'ACC001', name: 'TechCorp India', industry: 'Technology', size: 'Enterprise', revenue: 50000000, employees: 500, status: 'active', region: 'North' },
    { id: 'ACC002', name: 'Global Retail Solutions', industry: 'Retail', size: 'Enterprise', revenue: 120000000, employees: 1000, status: 'active', region: 'South' },
    { id: 'ACC003', name: 'HealthFirst Hospitals', industry: 'Healthcare', size: 'Enterprise', revenue: 80000000, employees: 2000, status: 'active', region: 'West' },
    { id: 'ACC004', name: 'EduTech Innovations', industry: 'Education', size: 'SMB', revenue: 15000000, employees: 100, status: 'active', region: 'East' },
    { id: 'ACC005', name: 'FinServe Financial', industry: 'Finance', size: 'Enterprise', revenue: 200000000, employees: 3000, status: 'active', region: 'North' },
    { id: 'ACC006', name: 'LogiTech Logistics', industry: 'Logistics', size: 'Mid-Market', revenue: 45000000, employees: 400, status: 'active', region: 'West' },
  ];
  accounts.forEach(acc => dataStores.accounts.set(acc.id, acc));

  // ===== CONTACTS =====
  const contacts = [
    { id: 'CNT001', firstName: 'Ravi', lastName: 'Krishnan', email: 'ravi@techcorp.com', title: 'CTO', accountId: 'ACC001', phone: '+91-9876543210' },
    { id: 'CNT002', firstName: 'Meera', lastName: 'Shah', email: 'meera@techcorp.com', title: 'VP Operations', accountId: 'ACC001', phone: '+91-9876543211' },
    { id: 'CNT003', firstName: 'Sanjay', lastName: 'Gupta', email: 'sanjay@globalretail.com', title: 'CEO', accountId: 'ACC002', phone: '+91-9876543212' },
    { id: 'CNT004', firstName: 'Priya', lastName: 'Reddy', email: 'priya@healthfirst.com', title: 'CFO', accountId: 'ACC003', phone: '+91-9876543213' },
    { id: 'CNT005', firstName: 'Arun', lastName: 'Nair', email: 'arun@finserve.com', title: 'CIO', accountId: 'ACC005', phone: '+91-9876543214' },
  ];
  contacts.forEach(cnt => dataStores.contacts.set(cnt.id, cnt));

  // ===== LEADS =====
  const leads = [
    { id: 'LD001', firstName: 'Vikram', lastName: 'Singh', email: 'vikram@startupx.com', company: 'StartupX', source: 'website', status: 'new', score: 85, value: 150000, ownerId: 'SR001' },
    { id: 'LD002', firstName: 'Ananya', lastName: 'Reddy', email: 'ananya@legalfirm.com', company: 'LegalFirm LLP', source: 'referral', status: 'contacted', score: 72, value: 200000, ownerId: 'SR002' },
    { id: 'LD003', firstName: 'Rajesh', lastName: 'Mehta', email: 'rajesh@manuf.com', company: 'Manufacturing Co', source: 'linkedin', status: 'qualified', score: 90, value: 350000, ownerId: 'SR003' },
    { id: 'LD004', firstName: 'Kavitha', lastName: 'Nair', email: 'kavitha@trading.com', company: 'Trading House', source: 'event', status: 'new', score: 45, value: 100000, ownerId: 'SR001' },
    { id: 'LD005', firstName: 'Deepak', lastName: 'Sharma', email: 'deepak@ecom.com', company: 'E-Commerce Plus', source: 'webinar', status: 'converted', score: 88, value: 500000, ownerId: 'SR004' },
  ];
  leads.forEach(lead => dataStores.leads.set(lead.id, lead));

  // ===== OPPORTUNITIES =====
  const opportunities = [
    { id: 'OPP001', title: 'TechCorp CRM Implementation', accountId: 'ACC001', value: 2500000, stage: 'proposal', probability: 60, closeDate: '2026-07-15', ownerId: 'SR001', products: ['PRD001', 'PRD002'], competitors: ['Salesforce', 'HubSpot'], weightedValue: 1500000 },
    { id: 'OPP002', title: 'Global Retail POS Rollout', accountId: 'ACC002', value: 5000000, stage: 'negotiation', probability: 80, closeDate: '2026-06-30', ownerId: 'SR002', products: ['PRD004', 'PRD003'], competitors: ['Zoho', 'Lightspeed'], weightedValue: 4000000 },
    { id: 'OPP003', title: 'HealthFirst Patient Portal', accountId: 'ACC003', value: 1800000, stage: 'qualified', probability: 50, closeDate: '2026-08-01', ownerId: 'SR003', products: ['PRD005'], competitors: ['Epic', 'Cerner'], weightedValue: 900000 },
    { id: 'OPP004', title: 'EduTech LMS Platform', accountId: 'ACC004', value: 800000, stage: 'closed_won', probability: 100, closeDate: '2026-05-15', ownerId: 'SR001', products: ['PRD006'], competitors: ['Moodle', 'Canvas'], weightedValue: 800000 },
    { id: 'OPP005', title: 'FinServe Compliance Suite', accountId: 'ACC005', value: 3500000, stage: 'lead', probability: 20, closeDate: '2026-09-01', ownerId: 'SR004', products: ['PRD001', 'PRD007'], competitors: ['SAP', 'Oracle'], weightedValue: 700000 },
    { id: 'OPP006', title: 'LogiTech Fleet Management', accountId: 'ACC006', value: 1200000, stage: 'proposal', probability: 55, closeDate: '2026-07-20', ownerId: 'SR005', products: ['PRD008'], competitors: ['Teletrac', 'Samsara'], weightedValue: 660000 },
  ];
  opportunities.forEach(opp => dataStores.opportunities.set(opp.id, opp));

  // ===== PRODUCTS =====
  const products = [
    { id: 'PRD001', name: 'CRM Engine', category: 'Sales', price: 50000, unit: 'month', description: 'Full CRM capabilities', cost: 25000, margin: 50, type: 'subscription' },
    { id: 'PRD002', name: 'Sales Copilot', category: 'AI', price: 25000, unit: 'month', description: 'AI-powered sales assistant', cost: 10000, margin: 60, type: 'subscription' },
    { id: 'PRD003', name: 'Lead Twin', category: 'Intelligence', price: 15000, unit: 'month', description: 'Lead intelligence & scoring', cost: 7500, margin: 50, type: 'subscription' },
    { id: 'PRD004', name: 'POS Service', category: 'Commerce', price: 30000, unit: 'month', description: 'Point of Sale system', cost: 15000, margin: 50, type: 'subscription' },
    { id: 'PRD005', name: 'Healthcare OS', category: 'Industry', price: 75000, unit: 'month', description: 'Healthcare management', cost: 40000, margin: 47, type: 'subscription' },
    { id: 'PRD006', name: 'Education OS', category: 'Industry', price: 60000, unit: 'month', description: 'Education platform', cost: 30000, margin: 50, type: 'subscription' },
    { id: 'PRD007', name: 'Compliance Suite', category: 'Enterprise', price: 100000, unit: 'month', description: 'Enterprise compliance', cost: 50000, margin: 50, type: 'subscription' },
    { id: 'PRD008', name: 'Fleet Tracker', category: 'Logistics', price: 40000, unit: 'month', description: 'Fleet management', cost: 20000, margin: 50, type: 'subscription' },
    { id: 'PRD009', name: 'Implementation', category: 'Service', price: 500000, unit: 'one-time', description: 'One-time setup', cost: 250000, margin: 50, type: 'one-time' },
    { id: 'PRD010', name: 'Training', category: 'Service', price: 50000, unit: 'one-time', description: 'On-site training', cost: 25000, margin: 50, type: 'one-time' },
  ];
  products.forEach(prod => dataStores.products.set(prod.id, prod));

  // ===== PRODUCT BUNDLES =====
  const bundles = [
    { id: 'BUN001', name: 'Enterprise Suite', products: ['PRD001', 'PRD002', 'PRD003', 'PRD009'], discount: 20, description: 'Complete CRM + AI + Implementation' },
    { id: 'BUN002', name: 'Industry Starter', products: ['PRD005', 'PRD001', 'PRD009'], discount: 15, description: 'Industry OS + CRM + Setup' },
    { id: 'BUN003', name: 'Growth Pack', products: ['PRD001', 'PRD002', 'PRD010'], discount: 10, description: 'CRM + AI Copilot + Training' },
  ];
  bundles.forEach(bun => dataStores.productBundles.set(bun.id, bun));

  // ===== CONTRACTS =====
  const contracts = [
    { id: 'CTR001', accountId: 'ACC001', opportunityId: 'OPP001', title: 'TechCorp Master Agreement', type: 'master', status: 'draft', startDate: '2026-07-01', endDate: '2027-06-30', value: 2500000, paymentTerms: 'net-30', renewalType: 'auto', documents: [] },
    { id: 'CTR002', accountId: 'ACC004', opportunityId: 'OPP004', title: 'EduTech Annual License', type: 'subscription', status: 'active', startDate: '2026-05-15', endDate: '2027-05-14', value: 720000, paymentTerms: 'net-30', renewalType: 'manual', documents: [] },
  ];
  contracts.forEach(ctr => dataStores.contracts.set(ctr.id, ctr));

  // ===== CUSTOMERS (Customer Success) =====
  const customers = [
    { id: 'CUS001', accountId: 'ACC001', name: 'TechCorp India', tier: 'enterprise', healthScore: 78, nps: 8, contractValue: 2500000, renewalDate: '2027-06-30', csOwner: 'SR001', status: 'active' },
    { id: 'CUS002', accountId: 'ACC002', name: 'Global Retail Solutions', tier: 'enterprise', healthScore: 92, nps: 9, contractValue: 5000000, renewalDate: '2026-12-31', csOwner: 'SR002', status: 'active' },
    { id: 'CUS003', accountId: 'ACC003', name: 'HealthFirst Hospitals', tier: 'enterprise', healthScore: 65, nps: 6, contractValue: 1800000, renewalDate: '2026-08-01', csOwner: 'SR003', status: 'at-risk' },
    { id: 'CUS004', accountId: 'ACC004', name: 'EduTech Innovations', tier: 'smb', healthScore: 88, nps: 8, contractValue: 720000, renewalDate: '2027-05-14', csOwner: 'SR001', status: 'active' },
  ];
  customers.forEach(cus => dataStores.customers.set(cus.id, cus));

  // ===== HEALTH SCORES =====
  const healthScores = [
    { id: 'HS001', customerId: 'CUS001', score: 78, factors: { adoption: 85, engagement: 75, support: 70, revenue: 80 }, trends: { week1: 75, week2: 77, week3: 78 }, updatedAt: new Date().toISOString() },
    { id: 'HS002', customerId: 'CUS002', score: 92, factors: { adoption: 95, engagement: 90, support: 95, revenue: 88 }, trends: { week1: 90, week2: 91, week3: 92 }, updatedAt: new Date().toISOString() },
    { id: 'HS003', customerId: 'CUS003', score: 65, factors: { adoption: 55, engagement: 60, support: 80, revenue: 75 }, trends: { week1: 72, week2: 68, week3: 65 }, updatedAt: new Date().toISOString() },
  ];
  healthScores.forEach(hs => dataStores.healthScores.set(hs.id, hs));

  // ===== NPS SURVEYS =====
  const npsSurveys = [
    { id: 'NPS001', customerId: 'CUS001', name: 'Q2 2026 NPS', status: 'sent', sentAt: '2026-06-01', responses: 2, avgScore: 8 },
    { id: 'NPS002', customerId: 'CUS002', name: 'Q2 2026 NPS', status: 'completed', sentAt: '2026-06-01', respondedAt: '2026-06-05', score: 9, comments: 'Excellent platform!' },
  ];
  npsSurveys.forEach(nps => dataStores.npsSurveys.set(nps.id, nps));

  // ===== TERRITORIES =====
  const territories = [
    { id: 'TER001', name: 'North India', regions: ['Delhi', 'Punjab', 'Haryana', 'UP'], type: 'geographic', totalQuota: 1000000, assignedReps: ['SR001'] },
    { id: 'TER002', name: 'South India', regions: ['Tamil Nadu', 'Karnataka', 'Kerala', 'AP'], type: 'geographic', totalQuota: 1200000, assignedReps: ['SR002'] },
    { id: 'TER003', name: 'West India', regions: ['Maharashtra', 'Gujarat', 'Rajasthan'], type: 'geographic', totalQuota: 900000, assignedReps: ['SR003', 'SR004'] },
    { id: 'TER004', name: 'Enterprise Accounts', regions: ['All'], type: 'account', totalQuota: 2000000, assignedReps: ['SR005'] },
  ];
  territories.forEach(ter => dataStores.territories.set(ter.id, ter));

  // ===== PARTNERS =====
  const partners = [
    { id: 'PAR001', name: 'CloudTech Solutions', type: 'reseller', tier: 'gold', status: 'active', region: 'North', commission: 15, deals: 25, revenue: 1500000 },
    { id: 'PAR002', name: 'Digital Integration Partners', type: 'si', tier: 'platinum', status: 'active', region: 'All', commission: 20, deals: 45, revenue: 3200000 },
    { id: 'PAR003', name: 'Startup Hub', type: 'referral', tier: 'bronze', status: 'active', region: 'South', commission: 10, deals: 12, revenue: 450000 },
  ];
  partners.forEach(par => dataStores.partners.set(par.id, par));

  // ===== SALES CONTENT (Enablement) =====
  const content = [
    { id: 'CNT001', title: 'CRM Engine Overview', type: 'presentation', category: 'product', tags: ['CRM', 'sales'], views: 245, downloads: 87, lastUpdated: '2026-06-01' },
    { id: 'CNT002', title: 'Enterprise Pricing Guide', type: 'document', category: 'pricing', tags: ['pricing', 'enterprise'], views: 189, downloads: 134, lastUpdated: '2026-05-28' },
    { id: 'CNT003', title: 'Competitive Battlecard - Salesforce', type: 'battlecard', category: 'competitive', tags: ['salesforce', 'comparison'], views: 312, downloads: 98, lastUpdated: '2026-06-05' },
  ];
  content.forEach(c => dataStores.content.set(c.id, c));

  // ===== TRAINING MODULES =====
  const trainingModules = [
    { id: 'TRN001', title: 'Product Fundamentals', type: 'video', duration: 45, completions: 24, required: true },
    { id: 'TRN002', title: 'Discovery & Qualification', type: 'course', duration: 90, completions: 18, required: true },
    { id: 'TRN003', title: 'Handling Objections', type: 'workshop', duration: 60, completions: 12, required: false },
  ];
  trainingModules.forEach(trn => dataStores.trainingModules.set(trn.id, trn));

  // ===== BATTLE CARDS =====
  const battleCards = [
    { id: 'BC001', competitor: 'Salesforce', strengths: ['Brand recognition', 'Ecosystem'], weaknesses: ['Price', 'Complexity'], talkingPoints: ['Our TCO is 40% lower', 'Faster implementation'], winRate: 65 },
    { id: 'BC002', competitor: 'HubSpot', strengths: ['Marketing focus', 'Free CRM'], weaknesses: ['Enterprise limitations', 'Support'], talkingPoints: ['Scale with us as you grow', 'Better enterprise support'], winRate: 72 },
  ];
  battleCards.forEach(bc => dataStores.battleCards.set(bc.id, bc));

  // ===== COMMISSION PLANS =====
  const commissionPlans = [
    { id: 'CP001', name: 'Enterprise AE Plan', type: 'percentage', rate: 8, accelerators: { tier1: { threshold: 100, rate: 10 }, tier2: { threshold: 150, rate: 12 } }, effectiveDate: '2026-01-01' },
    { id: 'CP002', name: 'SMB AE Plan', type: 'percentage', rate: 10, accelerators: { tier1: { threshold: 80, rate: 12 }, tier2: { threshold: 120, rate: 15 } }, effectiveDate: '2026-01-01' },
    { id: 'CP003', name: 'Partner Manager Plan', type: 'percentage', rate: 5, bonuses: { newPartner: 5000, quota: 100000 }, effectiveDate: '2026-01-01' },
  ];
  commissionPlans.forEach(cp => dataStores.commissionPlans.set(cp.id, cp));

  // ===== SUBSCRIPTIONS =====
  const subscriptions = [
    { id: 'SUB001', accountId: 'ACC001', customerId: 'CUS001', plan: 'Enterprise', mrr: 208333, arr: 2500000, status: 'active', startDate: '2026-07-01', nextBilling: '2026-07-01', seats: 100 },
    { id: 'SUB002', accountId: 'ACC002', customerId: 'CUS002', plan: 'Enterprise Plus', mrr: 416667, arr: 5000000, status: 'active', startDate: '2025-12-31', nextBilling: '2026-06-30', seats: 250 },
    { id: 'SUB003', accountId: 'ACC003', customerId: 'CUS003', plan: 'Enterprise', mrr: 150000, arr: 1800000, status: 'active', startDate: '2025-08-01', nextBilling: '2026-08-01', seats: 75 },
  ];
  subscriptions.forEach(sub => dataStores.subscriptions.set(sub.id, sub));

  // ===== WORKFLOWS =====
  const workflows = [
    { id: 'WF001', name: 'Lead Nurturing Sequence', trigger: 'lead_created', steps: ['send_welcome', 'wait_3d', 'send_followup', 'assign_sdr'], status: 'active', runs: 456 },
    { id: 'WF002', name: 'Deal Stage Automation', trigger: 'opp_stage_change', steps: ['notify_manager', 'update_forecast', 'create_task'], status: 'active', runs: 1234 },
    { id: 'WF003', name: 'Renewal Reminder', trigger: 'contract_expiring', steps: ['notify_cs', 'create_task', 'schedule_meeting'], status: 'active', runs: 89 },
  ];
  workflows.forEach(wf => dataStores.workflows.set(wf.id, wf));

  // ===== AI AGENTS =====
  const aiAgents = [
    { id: 'AG001', name: 'Lead Scoring Agent', type: 'scoring', status: 'active', tasks: 1234, accuracy: 94.5 },
    { id: 'AG002', name: 'Opportunity Intelligence', type: 'opportunity', status: 'active', tasks: 856, accuracy: 91.2 },
    { id: 'AG003', name: 'Churn Prediction Agent', type: 'churn', status: 'active', tasks: 445, accuracy: 89.7 },
    { id: 'AG004', name: 'Pricing Optimizer', type: 'pricing', status: 'active', tasks: 567, accuracy: 87.3 },
    { id: 'AG005', name: 'Contract Analyzer', type: 'contract', status: 'active', tasks: 234, accuracy: 92.1 },
    { id: 'AG006', name: 'Territory Optimizer', type: 'territory', status: 'active', tasks: 45, accuracy: 85.6 },
    { id: 'AG007', name: 'Commission Calculator', type: 'commission', status: 'active', tasks: 890, accuracy: 99.1 },
    { id: 'AG008', name: 'Sales Coach Agent', type: 'coaching', status: 'active', tasks: 156, accuracy: 88.4 },
    { id: 'AG009', name: 'Enablement Recommender', type: 'enablement', status: 'active', tasks: 334, accuracy: 86.2 },
    { id: 'AG010', name: 'Engagement Predictor', type: 'engagement', status: 'active', tasks: 678, accuracy: 90.8 },
    { id: 'AG011', name: 'Competitor Intel Agent', type: 'competitor', status: 'active', tasks: 123, accuracy: 84.5 },
    { id: 'AG012', name: 'Sentiment Analyzer', type: 'sentiment', status: 'active', tasks: 2345, accuracy: 91.7 },
    { id: 'AG013', name: 'Next Best Action', type: 'nba', status: 'active', tasks: 1890, accuracy: 88.9 },
    { id: 'AG014', name: 'Auto Follow-up Agent', type: 'followup', status: 'active', tasks: 4567, accuracy: 95.2 },
    { id: 'AG015', name: 'Renewal Predictor', type: 'renewal', status: 'active', tasks: 234, accuracy: 90.3 },
    { id: 'AG016', name: 'Upsell/Cross-sell Agent', type: 'upsell', status: 'active', tasks: 567, accuracy: 82.4 },
    { id: 'AG017', name: 'Onboarding Guide', type: 'onboarding', status: 'active', tasks: 89, accuracy: 93.8 },
    { id: 'AG018', name: 'Health Score Monitor', type: 'health', status: 'active', tasks: 1234, accuracy: 87.6 },
    { id: 'AG019', name: 'Social Selling Agent', type: 'social', status: 'active', tasks: 456, accuracy: 79.8 },
    { id: 'AG020', name: 'Battlecard Generator', type: 'battlecard', status: 'active', tasks: 67, accuracy: 91.4 },
    { id: 'AG021', name: 'Forecast Assistant', type: 'forecast', status: 'active', tasks: 890, accuracy: 93.2 },
    { id: 'AG022', name: 'Pipeline Inspector', type: 'pipeline', status: 'active', tasks: 567, accuracy: 90.1 },
  ];
  aiAgents.forEach(ag => dataStores.aiAgents.set(ag.id, ag));

  // ===== MULTI-CURRENCY RATES =====
  const currencyRates = [
    { currency: 'USD', rate: 83.5, updatedAt: new Date().toISOString() },
    { currency: 'EUR', rate: 90.2, updatedAt: new Date().toISOString() },
    { currency: 'GBP', rate: 105.8, updatedAt: new Date().toISOString() },
    { currency: 'AED', rate: 22.75, updatedAt: new Date().toISOString() },
    { currency: 'SGD', rate: 61.8, updatedAt: new Date().toISOString() },
  ];
  currencyRates.forEach(cr => dataStores.multiCurrencyRates.set(cr.currency, cr));

  // ===== TAX CONFIGURATIONS (GCC) =====
  const taxConfigs = [
    { region: 'IN', type: 'GST', rate: 18, applicable: ['subscription', 'one-time'] },
    { region: 'AE', type: 'VAT', rate: 5, applicable: ['subscription', 'one-time'] },
    { region: 'SA', type: 'VAT', rate: 15, applicable: ['subscription', 'one-time'] },
  ];
  taxConfigs.forEach(tc => dataStores.taxConfigurations.set(tc.region, tc));

  // ===== CAMPAIGNS =====
  const campaigns = [
    { id: 'CMP001', name: 'Q2 Enterprise Push', type: 'email', status: 'active', budget: 500000, leadsGenerated: 150, conversion: 12.5 },
    { id: 'CMP002', name: 'Healthcare Summit 2026', type: 'event', status: 'active', budget: 200000, leadsGenerated: 45, conversion: 22.3 },
    { id: 'CMP003', name: 'SMB Winter Sale', type: 'discount', status: 'completed', budget: 100000, leadsGenerated: 89, conversion: 18.7 },
  ];
  campaigns.forEach(cmp => dataStores.campaigns.set(cmp.id, cmp));

  // ===== INTEGRATIONS =====
  const integrations = [
    { id: 'INT001', name: 'REZ CRM Hub', type: 'crm', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'INT002', name: 'Sales Copilot', type: 'ai', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'INT003', name: 'Lead Twin', type: 'intelligence', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'INT004', name: 'Executive Dashboard', type: 'analytics', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'INT005', name: 'Finance Copilot', type: 'finance', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'INT006', name: 'Marketing Copilot', type: 'marketing', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'INT007', name: 'SUTAR OS', type: 'autonomous', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'INT008', name: 'Memory OS', type: 'memory', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'INT009', name: 'Partner Twin', type: 'partner', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'INT010', name: 'Contract Twin', type: 'contract', status: 'connected', lastSync: new Date().toISOString() },
  ];
  integrations.forEach(int => dataStores.integrations.set(int.id, int));

  // ===== WEBHOOKS =====
  const webhooks = [
    { id: 'WH001', url: 'https://api.techcorp.com/webhooks/rtmn', events: ['deal.closed_won', 'deal.closed_lost', 'lead.created'], status: 'active', secret: 'whsec_xxx' },
    { id: 'WH002', url: 'https://erp.finserve.com/webhooks', events: ['contract.signed', 'invoice.created'], status: 'active', secret: 'whsec_yyy' },
  ];
  webhooks.forEach(wh => dataStores.webhooks.set(wh.id, wh));

  // ===== TASKS =====
  const tasks = [
    { id: 'TSK001', title: 'Prepare TechCorp proposal', type: 'task', priority: 'high', status: 'pending', dueDate: '2026-06-20', assigneeId: 'SR001', relatedTo: { type: 'opportunity', id: 'OPP001' }, createdAt: new Date().toISOString() },
    { id: 'TSK002', title: 'Follow up with Global Retail', type: 'task', priority: 'medium', status: 'in_progress', dueDate: '2026-06-18', assigneeId: 'SR002', relatedTo: { type: 'opportunity', id: 'OPP002' }, createdAt: new Date().toISOString() },
    { id: 'TSK003', title: 'Send pricing sheet to FinServe', type: 'task', priority: 'high', status: 'pending', dueDate: '2026-06-19', assigneeId: 'SR004', relatedTo: { type: 'opportunity', id: 'OPP005' }, createdAt: new Date().toISOString() },
    { id: 'TSK004', title: 'Schedule demo for HealthFirst', type: 'task', priority: 'medium', status: 'completed', dueDate: '2026-06-15', assigneeId: 'SR003', relatedTo: { type: 'opportunity', id: 'OPP003' }, createdAt: new Date().toISOString() },
    { id: 'TSK005', title: 'Review LogiTech contract', type: 'task', priority: 'high', status: 'pending', dueDate: '2026-06-21', assigneeId: 'SR005', relatedTo: { type: 'contract', id: 'CTR001' }, createdAt: new Date().toISOString() },
    { id: 'TSK006', title: 'Update battlecard for HubSpot', type: 'task', priority: 'low', status: 'pending', dueDate: '2026-06-25', assigneeId: 'SR001', createdAt: new Date().toISOString() },
    { id: 'TSK007', title: 'Complete certification module', type: 'task', priority: 'medium', status: 'in_progress', dueDate: '2026-06-30', assigneeId: 'SR002', relatedTo: { type: 'certification', id: 'CERT001' }, createdAt: new Date().toISOString() },
  ];
  tasks.forEach(t => dataStores.tasks.set(t.id, t));

  // ===== MEETINGS =====
  const meetings = [
    { id: 'MTG001', title: 'TechCorp QBR Review', type: 'quarterly_business_review', status: 'scheduled', startTime: '2026-06-25T10:00:00Z', duration: 60, attendees: ['SR001', 'CNT001', 'CNT002'], location: 'Google Meet', notes: 'Quarterly business review', createdBy: 'SR001' },
    { id: 'MTG002', title: 'Global Retail Demo', type: 'demo', status: 'completed', startTime: '2026-06-10T14:00:00Z', duration: 45, attendees: ['SR002', 'CNT003'], location: 'Zoom', notes: 'POS system demo completed', outcome: 'positive', createdBy: 'SR002' },
    { id: 'MTG003', title: 'HealthFirst Requirements', type: 'discovery', status: 'scheduled', startTime: '2026-06-22T11:00:00Z', duration: 90, attendees: ['SR003', 'CNT004'], location: 'Microsoft Teams', notes: 'Requirements gathering session', createdBy: 'SR003' },
    { id: 'MTG004', title: 'FinServe Executive Briefing', type: 'executive', status: 'scheduled', startTime: '2026-06-28T15:00:00Z', duration: 30, attendees: ['SR004', 'CNT005', 'MGR002'], location: 'On-site', notes: 'C-suite presentation', createdBy: 'SR004' },
    { id: 'MTG005', title: 'LogiTech Contract Negotiation', type: 'negotiation', status: 'completed', startTime: '2026-06-12T09:00:00Z', duration: 120, attendees: ['SR005', 'MGR002', 'Legal'], location: 'Conference Room A', notes: 'Contract terms discussed', outcome: 'progress', createdBy: 'SR005' },
  ];
  meetings.forEach(m => dataStores.meetings.set(m.id, m));

  // ===== CALLS =====
  const calls = [
    { id: 'CAL001', direction: 'outbound', status: 'completed', duration: 720, recordingId: 'REC001', from: 'SR001', to: '+91-9876543210', accountId: 'ACC001', outcome: 'connected', sentiment: 'positive', timestamp: '2026-06-10T09:30:00Z' },
    { id: 'CAL002', direction: 'outbound', status: 'completed', duration: 480, recordingId: 'REC002', from: 'SR002', to: '+91-9876543212', accountId: 'ACC002', outcome: 'connected', sentiment: 'positive', timestamp: '2026-06-11T14:15:00Z' },
    { id: 'CAL003', direction: 'inbound', status: 'completed', duration: 360, recordingId: 'REC003', from: '+91-9876543213', to: 'SR003', accountId: 'ACC003', outcome: 'callback_scheduled', sentiment: 'neutral', timestamp: '2026-06-12T10:00:00Z' },
    { id: 'CAL004', direction: 'outbound', status: 'completed', duration: 540, recordingId: 'REC004', from: 'SR004', to: '+91-9876543214', accountId: 'ACC005', outcome: 'meeting_scheduled', sentiment: 'positive', timestamp: '2026-06-13T16:30:00Z' },
    { id: 'CAL005', direction: 'outbound', status: 'no_answer', duration: 0, from: 'SR001', to: '+91-9876543211', accountId: 'ACC001', outcome: 'no_answer', timestamp: '2026-06-14T11:00:00Z' },
    { id: 'CAL006', direction: 'outbound', status: 'completed', duration: 900, recordingId: 'REC005', from: 'SR005', to: '+91-9998887777', accountId: 'ACC006', outcome: 'proposal_sent', sentiment: 'positive', timestamp: '2026-06-15T10:00:00Z' },
  ];
  calls.forEach(c => dataStores.calls.set(c.id, c));

  // ===== RECORDINGS =====
  const recordings = [
    { id: 'REC001', callId: 'CAL001', accountId: 'ACC001', duration: 720, transcript: 'TechCorp pricing discussion...', sentiment: 'positive', keyPoints: ['Budget approved', 'Timeline Q3', 'Decision by June 30'], actionItems: ['Send proposal', 'Schedule demo'], createdAt: '2026-06-10T09:30:00Z' },
    { id: 'REC002', callId: 'CAL002', accountId: 'ACC002', duration: 480, transcript: 'Global Retail POS requirements...', sentiment: 'positive', keyPoints: ['Need 50 terminals', 'Integration with SAP', 'Training required'], actionItems: ['Prepare integration docs', 'Training plan'], createdAt: '2026-06-11T14:15:00Z' },
    { id: 'REC003', callId: 'CAL003', accountId: 'ACC003', duration: 360, transcript: 'HealthFirst patient portal inquiry...', sentiment: 'neutral', keyPoints: ['HIPAA compliance needed', 'Large hospital network', 'Budget 20L'], actionItems: ['HIPAA compliance checklist', 'Site visit'], createdAt: '2026-06-12T10:00:00Z' },
    { id: 'REC004', callId: 'CAL004', accountId: 'ACC005', duration: 540, transcript: 'FinServe compliance requirements...', sentiment: 'positive', keyPoints: ['SEBI compliance mandatory', 'Enterprise tier needed', 'Multi-branch'], actionItems: ['Executive presentation', 'Compliance documentation'], createdAt: '2026-06-13T16:30:00Z' },
    { id: 'REC005', callId: 'CAL006', accountId: 'ACC006', duration: 900, transcript: 'LogiTech fleet management demo...', sentiment: 'positive', keyPoints: ['50 vehicles', 'Real-time tracking', 'Driver app needed'], actionItems: ['Proposal with fleet tracker', 'Pilot program'], createdAt: '2026-06-15T10:00:00Z' },
  ];
  recordings.forEach(r => dataStores.recordings.set(r.id, r));

  // ===== ACTIVITIES =====
  const activities = [
    { id: 'ACT001', type: 'email', subject: 'TechCorp Proposal Follow-up', accountId: 'ACC001', contactId: 'CNT001', ownerId: 'SR001', status: 'sent', sentAt: '2026-06-10T09:00:00Z', body: 'Following up on our proposal...' },
    { id: 'ACT002', type: 'email', subject: 'Global Retail Pricing', accountId: 'ACC002', contactId: 'CNT003', ownerId: 'SR002', status: 'sent', sentAt: '2026-06-11T14:00:00Z', body: 'Pricing sheet attached...' },
    { id: 'ACT003', type: 'note', subject: 'HealthFirst Requirements', accountId: 'ACC003', contactId: 'CNT004', ownerId: 'SR003', status: 'created', createdAt: '2026-06-12T10:30:00Z', body: 'HIPAA compliance required, 2000+ employees...' },
    { id: 'ACT004', type: 'email', subject: 'FinServe Demo Invitation', accountId: 'ACC005', contactId: 'CNT005', ownerId: 'SR004', status: 'sent', sentAt: '2026-06-13T16:00:00Z', body: 'Executive briefing invitation...' },
    { id: 'ACT005', type: 'task', subject: 'LogiTech Contract Review', accountId: 'ACC006', ownerId: 'SR005', status: 'completed', completedAt: '2026-06-14T17:00:00Z', body: 'Contract reviewed with legal...' },
    { id: 'ACT006', type: 'email', subject: 'EduTech Welcome Package', accountId: 'ACC004', contactId: 'CNT005', ownerId: 'SR001', status: 'sent', sentAt: '2026-06-15T08:00:00Z', body: 'Welcome to RTMN! Here is your onboarding...' },
  ];
  activities.forEach(a => dataStores.activities.set(a.id, a));

  // ===== PLAYBOOKS =====
  const playbooks = [
    { id: 'PLY001', name: 'Enterprise Sales Playbook', type: 'enterprise', stages: ['prospecting', 'discovery', 'demo', 'proposal', 'negotiation', 'closing'], status: 'active', usageCount: 156, lastUsed: '2026-06-15T10:00:00Z', owner: 'MGR001' },
    { id: 'PLY002', name: 'SMB Quick Win Playbook', type: 'smb', stages: ['qualify', 'quote', 'close'], status: 'active', usageCount: 234, lastUsed: '2026-06-14T15:00:00Z', owner: 'MGR002' },
    { id: 'PLY003', name: 'Partner Channel Playbook', type: 'partner', stages: ['recruit', 'enable', 'co-sell', 'accelerate'], status: 'active', usageCount: 89, lastUsed: '2026-06-13T11:00:00Z', owner: 'MGR002' },
    { id: 'PLY004', name: 'Healthcare Demoscript', type: 'vertical', industry: 'Healthcare', stages: ['intro', 'hipaa', 'compliance', 'roi', 'close'], status: 'active', usageCount: 45, lastUsed: '2026-06-12T09:00:00Z', owner: 'MGR001' },
    { id: 'PLY005', name: 'Renewal Playbook', type: 'renewal', stages: ['assess', 'expand', 'renew', 'celebrate'], status: 'active', usageCount: 67, lastUsed: '2026-06-11T14:00:00Z', owner: 'MGR001' },
  ];
  playbooks.forEach(p => dataStores.playbooks.set(p.id, p));

  // ===== CERTIFICATIONS =====
  const certifications = [
    { id: 'CERT001', name: 'Enterprise Sales Professional', provider: 'RTMN Academy', status: 'in_progress', assignedTo: 'SR002', completedAt: null, expiresAt: '2027-06-15', score: 75, modules: ['Product', 'Discovery', 'Negotiation', 'Closing'], progress: 75 },
    { id: 'CERT002', name: 'Healthcare Sales Specialist', provider: 'RTMN Academy', status: 'completed', assignedTo: 'SR003', completedAt: '2026-05-20', expiresAt: '2027-05-20', score: 92, modules: ['HIPAA', 'Compliance', 'Healthcare OS', 'Demo'] },
    { id: 'CERT003', name: 'Channel Sales Expert', provider: 'RTMN Academy', status: 'not_started', assignedTo: 'SR005', completedAt: null, expiresAt: null, score: null, modules: ['Partner Recruitment', 'Enablement', 'Co-selling', 'Accelerators'], progress: 0 },
    { id: 'CERT004', name: 'Sales Manager Certification', provider: 'RTMN Academy', status: 'completed', assignedTo: 'MGR001', completedAt: '2026-04-15', expiresAt: '2027-04-15', score: 88, modules: ['Team Management', 'Forecasting', 'Coaching', 'Performance'] },
    { id: 'CERT005', name: 'CPQ Configuration Pro', provider: 'RTMN Academy', status: 'in_progress', assignedTo: 'SR001', completedAt: null, expiresAt: '2027-06-30', score: 60, modules: ['Product Config', 'Bundles', 'Discounts', 'Approval Flows'], progress: 60 },
  ];
  certifications.forEach(c => dataStores.certifications.set(c.id, c));

  // ===== SPIFFS =====
  const spiffs = [
    { id: 'SPIFF001', name: 'New Logo Bonus', type: 'per_deal', amount: 5000, currency: 'INR', conditions: { minValue: 100000, isNewLogo: true }, status: 'active', validUntil: '2026-06-30' },
    { id: 'SPIFF002', name: 'Healthcare Win', type: 'per_deal', amount: 10000, currency: 'INR', conditions: { industry: 'Healthcare', minValue: 500000 }, status: 'active', validUntil: '2026-09-30' },
    { id: 'SPIFF003', name: 'Early Close Bonus', type: 'acceleration', amount: 2500, currency: 'INR', conditions: { closedBefore: '2026-06-30', stage: 'closed_won' }, status: 'active', validUntil: '2026-06-30' },
    { id: 'SPIFF004', name: 'Partner Referral', type: 'referral', amount: 3000, currency: 'INR', conditions: { viaPartner: true, dealClosed: true }, status: 'active', validUntil: '2026-12-31' },
    { id: 'SPIFF005', name: 'Cross-sell Bundle', type: 'per_deal', amount: 7500, currency: 'INR', conditions: { productCount: 3, upsell: true }, status: 'active', validUntil: '2026-08-31' },
  ];
  spiffs.forEach(s => dataStores.spiffs.set(s.id, s));

  // ===== AUTOMATION RULES =====
  const automationRules = [
    { id: 'AUR001', name: 'High-Value Lead Alert', trigger: 'lead_score_above', conditions: { score: 85 }, actions: ['notify_manager', 'assign_premium_rep', 'create_task'], status: 'active', runs: 234 },
    { id: 'AUR002', name: 'Stale Opportunity Nudge', trigger: 'opp_no_activity', conditions: { days: 14 }, actions: ['send_reminder', 'notify_manager', 'update_stage'], status: 'active', runs: 567 },
    { id: 'AUR003', name: 'Renewal 90-Day Warning', trigger: 'renewal_approaching', conditions: { daysBefore: 90 }, actions: ['create_task', 'notify_cs', 'send_email'], status: 'active', runs: 89 },
    { id: 'AUR004', name: 'Deal Won Celebration', trigger: 'opp_stage_changed', conditions: { stage: 'closed_won' }, actions: ['send_slack', 'update_dashboard', 'notify_team'], status: 'active', runs: 1234 },
    { id: 'AUR005', name: 'Low Health Score Alert', trigger: 'health_score_below', conditions: { score: 60 }, actions: ['notify_cs_manager', 'create_escalation', 'schedule_call'], status: 'active', runs: 45 },
    { id: 'AUR006', name: 'New Partner Onboarding', trigger: 'partner_created', conditions: {}, actions: ['send_welcome', 'assign_enablement', 'create_training_task'], status: 'active', runs: 34 },
  ];
  automationRules.forEach(r => dataStores.automationRules.set(r.id, r));

  // ===== QUOTES =====
  const quotes = [
    { id: 'QTE001', opportunityId: 'OPP001', accountId: 'ACC001', status: 'sent', validUntil: '2026-07-15', subtotal: 2500000, discount: 20, discountAmount: 500000, tax: 360000, total: 2360000, currency: 'INR', createdBy: 'SR001', createdAt: '2026-06-10T10:00:00Z', lineItems: [{ productId: 'PRD001', name: 'CRM Engine', quantity: 1, unitPrice: 50000, total: 600000 }, { productId: 'PRD002', name: 'Sales Copilot', quantity: 1, unitPrice: 25000, total: 300000 }, { productId: 'PRD009', name: 'Implementation', quantity: 1, unitPrice: 500000, total: 500000 }] },
    { id: 'QTE002', opportunityId: 'OPP002', accountId: 'ACC002', status: 'accepted', validUntil: '2026-07-01', subtotal: 5000000, discount: 15, discountAmount: 750000, tax: 765000, total: 5015000, currency: 'INR', createdBy: 'SR002', createdAt: '2026-06-08T14:00:00Z', lineItems: [{ productId: 'PRD004', name: 'POS Service', quantity: 50, unitPrice: 30000, total: 1500000 }, { productId: 'PRD003', name: 'Lead Twin', quantity: 1, unitPrice: 15000, total: 180000 }, { productId: 'PRD009', name: 'Implementation', quantity: 1, unitPrice: 500000, total: 500000 }] },
    { id: 'QTE003', opportunityId: 'OPP003', accountId: 'ACC003', status: 'draft', validUntil: '2026-08-15', subtotal: 1800000, discount: 0, discountAmount: 0, tax: 324000, total: 2124000, currency: 'INR', createdBy: 'SR003', createdAt: '2026-06-12T09:00:00Z', lineItems: [{ productId: 'PRD005', name: 'Healthcare OS', quantity: 1, unitPrice: 75000, total: 900000 }, { productId: 'PRD009', name: 'Implementation', quantity: 1, unitPrice: 500000, total: 500000 }] },
    { id: 'QTE004', opportunityId: 'OPP005', accountId: 'ACC005', status: 'pending_approval', validUntil: '2026-08-01', subtotal: 3500000, discount: 25, discountAmount: 875000, tax: 472500, total: 3097500, currency: 'INR', createdBy: 'SR004', createdAt: '2026-06-14T11:00:00Z', lineItems: [{ productId: 'PRD001', name: 'CRM Engine', quantity: 1, unitPrice: 50000, total: 600000 }, { productId: 'PRD007', name: 'Compliance Suite', quantity: 1, unitPrice: 100000, total: 1200000 }], approvalRequired: true },
    { id: 'QTE005', opportunityId: 'OPP006', accountId: 'ACC006', status: 'sent', validUntil: '2026-07-20', subtotal: 1200000, discount: 10, discountAmount: 120000, tax: 194400, total: 1274400, currency: 'INR', createdBy: 'SR005', createdAt: '2026-06-15T08:00:00Z', lineItems: [{ productId: 'PRD008', name: 'Fleet Tracker', quantity: 30, unitPrice: 40000, total: 1200000 }] },
  ];
  quotes.forEach(q => dataStores.quotes.set(q.id, q));

  // ===== PRICE BOOKS =====
  const priceBooks = [
    { id: 'PB001', name: 'Standard Pricing', status: 'active', currency: 'INR', products: ['PRD001', 'PRD002', 'PRD003', 'PRD004', 'PRD005', 'PRD006', 'PRD007', 'PRD008'], isDefault: true },
    { id: 'PB002', name: 'Partner Pricing', status: 'active', currency: 'INR', discountPercent: 20, products: ['PRD001', 'PRD002', 'PRD003', 'PRD004'], isDefault: false },
    { id: 'PB003', name: 'Enterprise Gold', status: 'active', currency: 'INR', discountPercent: 15, products: ['PRD001', 'PRD002', 'PRD003', 'PRD004', 'PRD005', 'PRD006', 'PRD007', 'PRD008', 'PRD009', 'PRD010'], isDefault: false },
  ];
  priceBooks.forEach(pb => dataStores.priceBooks.set(pb.id, pb));

  // ===== PIPELINE MOVEMENTS =====
  const pipelineMovements = [
    { id: 'PM001', opportunityId: 'OPP001', fromStage: 'qualified', toStage: 'proposal', movedBy: 'SR001', movedAt: '2026-06-10T10:00:00Z', notes: 'Proposal sent to CTO' },
    { id: 'PM002', opportunityId: 'OPP002', fromStage: 'proposal', toStage: 'negotiation', movedBy: 'SR002', movedAt: '2026-06-12T14:00:00Z', notes: 'Entered contract negotiation' },
    { id: 'PM003', opportunityId: 'OPP003', fromStage: 'lead', toStage: 'qualified', movedBy: 'SR003', movedAt: '2026-06-11T09:00:00Z', notes: 'Qualified based on discovery' },
    { id: 'PM004', opportunityId: 'OPP004', fromStage: 'negotiation', toStage: 'closed_won', movedBy: 'SR001', movedAt: '2026-06-15T17:00:00Z', notes: 'Deal closed!' },
  ];
  pipelineMovements.forEach(pm => dataStores.pipelineMovements.set(pm.id, pm));

  // ===== TEAMS =====
  const teams = [
    { id: 'TEAM001', name: 'Enterprise Team', managerId: 'MGR001', members: ['SR001', 'SR002', 'SR003'], region: 'All', quota: 1500000 },
    { id: 'TEAM002', name: 'Strategic Team', managerId: 'MGR002', members: ['SR004', 'SR005'], region: 'All', quota: 1000000 },
  ];
  teams.forEach(t => dataStores.teams.set(t.id, t));

  // ===== LEAD SOURCES =====
  const leadsources = [
    { id: 'LS001', name: 'Website', type: 'digital', cost: 50000, leads: 150, conversions: 12 },
    { id: 'LS002', name: 'LinkedIn Ads', type: 'social', cost: 80000, leads: 89, conversions: 8 },
    { id: 'LS003', name: 'Referral', type: 'referral', cost: 0, leads: 45, conversions: 15 },
    { id: 'LS004', name: 'Trade Shows', type: 'events', cost: 150000, leads: 120, conversions: 10 },
    { id: 'LS005', name: 'Webinars', type: 'content', cost: 30000, leads: 67, conversions: 5 },
  ];
  leadsources.forEach(ls => dataStores.leadsources.set(ls.id, ls));

  // ===== REPORTS =====
  const reports = [
    { id: 'RPT001', name: 'Pipeline Report', type: 'pipeline', frequency: 'weekly', lastRun: '2026-06-14T09:00:00Z', recipients: ['MGR001', 'MGR002'], status: 'active' },
    { id: 'RPT002', name: 'Forecast Accuracy', type: 'forecast', frequency: 'monthly', lastRun: '2026-06-01T09:00:00Z', recipients: ['MGR002'], status: 'active' },
    { id: 'RPT003', name: 'Win/Loss Analysis', type: 'analysis', frequency: 'quarterly', lastRun: '2026-04-01T09:00:00Z', recipients: ['MGR001', 'MGR002', 'Leadership'], status: 'active' },
  ];
  reports.forEach(r => dataStores.reports.set(r.id, r));

  // ===== DASHBOARDS =====
  const dashboards = [
    { id: 'DASH001', name: 'Sales Manager Dashboard', type: 'manager', owner: 'MGR001', widgets: ['pipeline', 'forecast', 'team_performance', 'activities'], sharedWith: ['MGR002'], createdAt: '2026-01-01T00:00:00Z' },
    { id: 'DASH002', name: 'Executive Dashboard', type: 'executive', owner: 'MGR002', widgets: ['revenue', 'quotas', 'win_rates', 'pipeline_health'], sharedWith: ['Leadership'], createdAt: '2026-01-01T00:00:00Z' },
    { id: 'DASH003', name: 'Sales Rep Personal', type: 'personal', owner: 'SR001', widgets: ['my_pipeline', 'my_activities', 'my_quotas'], sharedWith: [], createdAt: '2026-01-15T00:00:00Z' },
  ];
  dashboards.forEach(d => dataStores.dashboards.set(d.id, d));

  // ===== FORECASTS =====
  const forecasts = [
    { id: 'FRC001', period: 'Q2-2026', type: 'commit', totalAmount: 5500000, weightedAmount: 4700000, confidence: 85, createdBy: 'MGR001', createdAt: '2026-06-01T09:00:00Z', adjustments: [] },
    { id: 'FRC002', period: 'Q2-2026', type: 'best_case', totalAmount: 7500000, weightedAmount: 6200000, confidence: 70, createdBy: 'MGR001', createdAt: '2026-06-01T09:00:00Z', adjustments: [] },
    { id: 'FRC003', period: 'Q3-2026', type: 'commit', totalAmount: 8000000, weightedAmount: 6500000, confidence: 80, createdBy: 'MGR002', createdAt: '2026-06-15T09:00:00Z', adjustments: [] },
  ];
  forecasts.forEach(f => dataStores.forecasts.set(f.id, f));

  // ===== COMMISSIONS =====
  const commissions = [
    { id: 'COM001', repId: 'SR001', period: '2026-05', amount: 26000, status: 'paid', type: 'commission', breakdown: { base: 20000, bonus: 6000 } },
    { id: 'COM002', repId: 'SR002', period: '2026-05', amount: 38000, status: 'paid', type: 'commission', breakdown: { base: 30000, accelerator: 8000 } },
    { id: 'COM003', repId: 'SR003', period: '2026-05', amount: 16800, status: 'paid', type: 'commission', breakdown: { base: 14000, spiff: 2800 } },
    { id: 'COM004', repId: 'SR001', period: '2026-06', amount: 19500, status: 'pending', type: 'commission', breakdown: { base: 19500, bonus: 0 } },
  ];
  commissions.forEach(c => dataStores.commissions.set(c.id, c));

  // ===== PARTNER ACCOUNTS =====
  const partnerAccounts = [
    { id: 'PACC001', partnerId: 'PAR001', accountId: 'ACC001', assignedAt: '2026-03-01T00:00:00Z', status: 'active', revenue: 250000 },
    { id: 'PACC002', partnerId: 'PAR001', accountId: 'ACC003', assignedAt: '2026-04-15T00:00:00Z', status: 'active', revenue: 180000 },
    { id: 'PACC003', partnerId: 'PAR002', accountId: 'ACC002', assignedAt: '2026-01-10T00:00:00Z', status: 'active', revenue: 500000 },
    { id: 'PACC004', partnerId: 'PAR002', accountId: 'ACC005', assignedAt: '2026-05-20T00:00:00Z', status: 'active', revenue: 350000 },
    { id: 'PACC005', partnerId: 'PAR003', accountId: 'ACC004', assignedAt: '2026-06-01T00:00:00Z', status: 'active', revenue: 72000 },
  ];
  partnerAccounts.forEach(pa => dataStores.partnerAccounts.set(pa.id, pa));

  // ===== PARTNER DEALS =====
  const partnerDeals = [
    { id: 'PD001', partnerId: 'PAR001', opportunityId: 'OPP001', stage: 'proposal', value: 2500000, partnerCommission: 375000, status: 'active', createdAt: '2026-06-01T00:00:00Z' },
    { id: 'PD002', partnerId: 'PAR002', opportunityId: 'OPP002', stage: 'negotiation', value: 5000000, partnerCommission: 1000000, status: 'active', createdAt: '2026-05-15T00:00:00Z' },
    { id: 'PD003', partnerId: 'PAR002', opportunityId: 'OPP005', stage: 'lead', value: 3500000, partnerCommission: 700000, status: 'active', createdAt: '2026-06-10T00:00:00Z' },
  ];
  partnerDeals.forEach(pd => dataStores.partnerDeals.set(pd.id, pd));

  // ===== REVENUE ANALYTICS =====
  const revenueAnalytics = [
    { id: 'REV001', accountId: 'ACC001', period: '2026-06', mrr: 208333, arr: 2500000, growth: 0, churned: false },
    { id: 'REV002', accountId: 'ACC002', period: '2026-06', mrr: 416667, arr: 5000000, growth: 5, churned: false },
    { id: 'REV003', accountId: 'ACC003', period: '2026-06', mrr: 150000, arr: 1800000, growth: -2, churned: false },
    { id: 'REV004', accountId: 'ACC004', period: '2026-06', mrr: 60000, arr: 720000, growth: 0, churned: false },
  ];
  revenueAnalytics.forEach(ra => dataStores.revenueAnalytics.set(ra.id, ra));

  // ===== CHURN RISKS =====
  const churnRisks = [
    { id: 'CR001', customerId: 'CUS003', accountId: 'ACC003', score: 78, riskLevel: 'high', factors: ['low_health_score', 'support_tickets_up', 'executive_change'], recommendedActions: ['immediate_escalation', 'executive_meeting', 'health_improvement_plan'], createdAt: '2026-06-15T00:00:00Z' },
    { id: 'CR002', customerId: 'CUS001', accountId: 'ACC001', score: 25, riskLevel: 'low', factors: ['stable_usage', 'executive_engagement'], recommendedActions: ['quarterly_business_review'], createdAt: '2026-06-15T00:00:00Z' },
  ];
  churnRisks.forEach(cr => dataStores.churnRisks.set(cr.id, cr));

  // ===== RENEWALS =====
  const renewals = [
    { id: 'REN001', customerId: 'CUS001', accountId: 'ACC001', currentValue: 2500000, renewalDate: '2027-06-30', status: 'not_started', recommendedUpsell: 500000, healthScore: 78 },
    { id: 'REN002', customerId: 'CUS002', accountId: 'ACC002', currentValue: 5000000, renewalDate: '2026-12-31', status: 'in_progress', recommendedUpsell: 1000000, healthScore: 92 },
    { id: 'REN003', customerId: 'CUS003', accountId: 'ACC003', currentValue: 1800000, renewalDate: '2026-08-01', status: 'at_risk', recommendedUpsell: 0, healthScore: 65 },
    { id: 'REN004', customerId: 'CUS004', accountId: 'ACC004', currentValue: 720000, renewalDate: '2027-05-14', status: 'not_started', recommendedUpsell: 280000, healthScore: 88 },
  ];
  renewals.forEach(r => dataStores.renewals.set(r.id, r));

  console.log(`[Sales OS v2.0] Initialized: ${leads.length} leads, ${opportunities.length} deals, ${products.length} products, ${customers.length} customers, ${aiAgents.length} AI agents, ${tasks.length} tasks, ${meetings.length} meetings, ${quotes.length} quotes`);
}

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', (req, res) => {
  const agentStats = Array.from(dataStores.aiAgents.values()).reduce((acc, ag) => {
    acc[ag.type] = { tasks: ag.tasks, accuracy: ag.accuracy };
    return acc;
  }, {});

  res.json({
    status: 'healthy',
    service: 'Sales OS Enterprise',
    version: '2.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    modules: {
      crm: { leads: dataStores.leads.size, accounts: dataStores.accounts.size, opportunities: dataStores.opportunities.size, contacts: dataStores.contacts.size },
      customerSuccess: { customers: dataStores.customers.size, healthScores: dataStores.healthScores.size, npsSurveys: dataStores.npsSurveys.size, churnRisks: dataStores.churnRisks.size, renewals: dataStores.renewals.size },
      cpq: { products: dataStores.products.size, bundles: dataStores.productBundles.size, quotes: dataStores.quotes.size, priceBooks: dataStores.priceBooks.size },
      contracts: { contracts: dataStores.contracts.size },
      activities: { tasks: dataStores.tasks.size, meetings: dataStores.meetings.size, calls: dataStores.calls.size, recordings: dataStores.recordings.size, activities: dataStores.activities.size },
      territories: { territories: dataStores.territories.size },
      partners: { partners: dataStores.partners.size },
      subscriptions: { subscriptions: dataStores.subscriptions.size },
      commissions: { plans: dataStores.commissionPlans.size, spiffs: dataStores.spiffs.size },
      enablement: { content: dataStores.content.size, training: dataStores.trainingModules.size, certifications: dataStores.certifications.size, playbooks: dataStores.playbooks.size },
      workflows: { workflows: dataStores.workflows.size, automationRules: dataStores.automationRules.size },
      aiAgents: { total: dataStores.aiAgents.size, active: Array.from(dataStores.aiAgents.values()).filter(a => a.status === 'active').length },
    },
    integrations: {
      connected: Array.from(dataStores.integrations.values()),
      industryBridges: { available: !!bridgeManager, count: 24 },
      rtmntEcosystem: { available: !!rtmntEcosystem },
      rezSalesMind: { available: !!rezSalesMind },
    },
    agentStats,
  });
});

app.get('/status', (req, res) => {
  res.json({
    overview: {
      leads: dataStores.leads.size,
      contacts: dataStores.contacts.size,
      accounts: dataStores.accounts.size,
      opportunities: dataStores.opportunities.size,
      activities: dataStores.activities.size,
      products: dataStores.products.size,
      campaigns: dataStores.campaigns.size,
      salesReps: dataStores.salesReps.size,
      customers: dataStores.customers.size,
      contracts: dataStores.contracts.size,
      partners: dataStores.partners.size,
      subscriptions: dataStores.subscriptions.size,
      aiAgents: dataStores.aiAgents.size,
    },
    revenue: {
      totalPipeline: Array.from(dataStores.opportunities.values()).filter(o => !['closed_won', 'closed_lost'].includes(o.stage)).reduce((sum, o) => sum + o.value, 0),
      closedWon: Array.from(dataStores.opportunities.values()).filter(o => o.stage === 'closed_won').reduce((sum, o) => sum + o.value, 0),
      mrr: Array.from(dataStores.subscriptions.values()).filter(s => s.status === 'active').reduce((sum, s) => sum + s.mrr, 0),
      arr: Array.from(dataStores.subscriptions.values()).filter(s => s.status === 'active').reduce((sum, s) => sum + s.arr, 0),
    },
    health: {
      avgHealthScore: Math.round(Array.from(dataStores.healthScores.values()).reduce((sum, h) => sum + h.score, 0) / Math.max(1, dataStores.healthScores.size)),
      atRisk: Array.from(dataStores.customers.values()).filter(c => c.status === 'at-risk').length,
    },
  });
});

// ============================================================
// AUTH ENDPOINTS
// ============================================================

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const rep = Array.from(dataStores.salesReps.values()).find(r => r.email === email);
  if (!rep) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const token = generateToken();
  const session = { token, userId: rep.id, email: rep.email, name: rep.name, role: rep.role };

  sessions.set(token, session);

  res.json({ success: true, token, user: { id: rep.id, name: rep.name, email: rep.email, role: rep.role } });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  sessions.delete(req.user.token);
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ============================================================
// LEADS CRUD
// ============================================================

app.get('/api/leads', (req, res) => {
  const { status, source, minScore, assignedTo, search } = req.query;
  let leads = Array.from(dataStores.leads.values());

  if (status) leads = leads.filter(l => l.status === status);
  if (source) leads = leads.filter(l => l.source === source);
  if (minScore) leads = leads.filter(l => l.score >= parseInt(minScore));
  if (assignedTo) leads = leads.filter(l => l.ownerId === assignedTo);
  if (search) {
    const searchLower = search.toLowerCase();
    leads = leads.filter(l =>
      l.firstName?.toLowerCase().includes(searchLower) ||
      l.lastName?.toLowerCase().includes(searchLower) ||
      l.email?.toLowerCase().includes(searchLower) ||
      l.company?.toLowerCase().includes(searchLower)
    );
  }

  leads.sort((a, b) => b.score - a.score);
  res.json({ success: true, count: leads.length, leads });
});

app.get('/api/leads/:id', (req, res) => {
  const lead = dataStores.leads.get(req.params.id);
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

  const activities = Array.from(dataStores.leadActivities.values()).filter(a => a.leadId === req.params.id);
  const account = Array.from(dataStores.accounts.values()).find(a => a.name === lead.company);
  const owner = dataStores.salesReps.get(lead.ownerId);

  res.json({ success: true, lead, activities, account, owner });
});

app.post('/api/leads', requireAuth, (req, res) => {
  const { firstName, lastName, email, company, phone, source, value, ownerId } = req.body;

  if (!email || !company) {
    return res.status(400).json({ success: false, error: 'Email and company are required' });
  }

  const lead = {
    id: `LD${String(dataStores.leads.size + 1).padStart(4, '0')}`,
    firstName: firstName || '',
    lastName: lastName || '',
    email,
    phone: phone || '',
    company,
    source: source || 'direct',
    status: 'new',
    score: 50,
    value: value || 0,
    ownerId: ownerId || req.user.userId,
    temperature: 'warm',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dataStores.leads.set(lead.id, lead);

  // Trigger workflow
  triggerWorkflow('lead_created', { leadId: lead.id, ownerId: lead.ownerId });

  res.status(201).json({ success: true, lead });
});

app.patch('/api/leads/:id', requireAuth, (req, res) => {
  const lead = dataStores.leads.get(req.params.id);
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

  const updated = { ...lead, ...req.body, updatedAt: new Date().toISOString() };
  dataStores.leads.set(req.params.id, updated);
  res.json({ success: true, lead: updated });
});

app.delete('/api/leads/:id', requireAuth, (req, res) => {
  if (!dataStores.leads.has(req.params.id)) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }
  dataStores.leads.delete(req.params.id);
  res.json({ success: true, message: 'Lead deleted' });
});

// Convert lead to opportunity
app.post('/api/leads/:id/convert', requireAuth, (req, res) => {
  const lead = dataStores.leads.get(req.params.id);
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

  const { title, value, closeDate, accountId, products } = req.body;

  // Find or create account
  let account = accountId ? dataStores.accounts.get(accountId) :
    Array.from(dataStores.accounts.values()).find(a => a.name === lead.company);

  if (!account && lead.company) {
    account = {
      id: `ACC${String(dataStores.accounts.size + 1).padStart(3, '0')}`,
      name: lead.company,
      industry: 'Other',
      size: 'SMB',
      revenue: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    dataStores.accounts.set(account.id, account);
  }

  const opportunity = {
    id: `OPP${String(dataStores.opportunities.size + 1).padStart(4, '0')}`,
    title: title || `${lead.company} - New Deal`,
    accountId: account?.id || null,
    value: value || lead.value,
    stage: 'lead',
    probability: 10,
    closeDate: closeDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ownerId: lead.ownerId || req.user.userId,
    leadId: lead.id,
    products: products || [],
    competitors: [],
    notes: '',
    weightedValue: (value || lead.value) * 0.1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dataStores.opportunities.set(opportunity.id, opportunity);

  lead.status = 'converted';
  lead.convertedTo = opportunity.id;
  lead.convertedAt = new Date().toISOString();
  dataStores.leads.set(lead.id, lead);

  // Trigger workflow
  triggerWorkflow('lead_converted', { leadId: lead.id, opportunityId: opportunity.id });

  res.status(201).json({ success: true, opportunity, lead });
});

// AI Lead Scoring
app.post('/api/leads/:id/score', requireAuth, (req, res) => {
  const lead = dataStores.leads.get(req.params.id);
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

  // AI-powered scoring algorithm
  let score = 50;
  const factors = {};

  // Basic data completeness
  if (lead.email) { score += 10; factors.email = true; }
  if (lead.phone) { score += 10; factors.phone = true; }
  if (lead.company) { score += 15; factors.company = true; }

  // Source quality
  const sourceScores = { referral: 20, webinar: 15, event: 12, linkedin: 10, website: 5, direct: 3, cold: 0 };
  score += sourceScores[lead.source] || 5;
  factors.sourceScore = sourceScores[lead.source] || 5;

  // Value signals
  if (lead.value > 500000) { score += 15; factors.highValue = true; }
  else if (lead.value > 200000) { score += 10; factors.mediumValue = true; }
  else if (lead.value > 50000) { score += 5; factors.lowValue = true; }

  // Engagement signals (simulated)
  const engagementBonus = Math.random() * 15;
  score += engagementBonus;
  factors.engagement = Math.round(engagementBonus);

  lead.score = Math.min(100, Math.round(score));
  lead.temperature = lead.score >= 75 ? 'hot' : lead.score >= 50 ? 'warm' : 'cold';
  lead.scoredAt = new Date().toISOString();
  dataStores.leads.set(lead.id, lead);

  res.json({ success: true, score: lead.score, temperature: lead.temperature, factors });
});

// Bulk lead scoring
app.post('/api/leads/bulk-score', requireAuth, (req, res) => {
  const { leadIds } = req.body;
  const results = [];

  for (const id of leadIds) {
    const lead = dataStores.leads.get(id);
    if (lead) {
      // Simplified scoring for bulk
      let score = 50;
      if (lead.email) score += 10;
      if (lead.phone) score += 10;
      if (lead.company) score += 15;
      lead.score = Math.min(100, score);
      lead.temperature = score >= 75 ? 'hot' : score >= 50 ? 'warm' : 'cold';
      dataStores.leads.set(lead.id, lead);
      results.push({ id, score: lead.score, temperature: lead.temperature });
    }
  }

  res.json({ success: true, count: results.length, results });
});

// ============================================================
// ACCOUNTS CRUD
// ============================================================

app.get('/api/accounts', (req, res) => {
  const { industry, size, status, search } = req.query;
  let accounts = Array.from(dataStores.accounts.values());

  if (industry) accounts = accounts.filter(a => a.industry === industry);
  if (size) accounts = accounts.filter(a => a.size === size);
  if (status) accounts = accounts.filter(a => a.status === status);
  if (search) {
    const searchLower = search.toLowerCase();
    accounts = accounts.filter(a => a.name.toLowerCase().includes(searchLower));
  }

  // Add metrics
  accounts = accounts.map(acc => {
    const opportunities = Array.from(dataStores.opportunities.values()).filter(o => o.accountId === acc.id);
    const closedWon = opportunities.filter(o => o.stage === 'closed_won');
    return {
      ...acc,
      metrics: {
        totalDeals: opportunities.length,
        openDeals: opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage)).length,
        totalValue: opportunities.reduce((sum, o) => sum + o.value, 0),
        closedRevenue: closedWon.reduce((sum, o) => sum + o.value, 0),
      }
    };
  });

  res.json({ success: true, count: accounts.length, accounts });
});

app.get('/api/accounts/:id', (req, res) => {
  const account = dataStores.accounts.get(req.params.id);
  if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

  const opportunities = Array.from(dataStores.opportunities.values()).filter(o => o.accountId === req.params.id);
  const contacts = Array.from(dataStores.contacts.values()).filter(c => c.accountId === req.params.id);
  const customer = Array.from(dataStores.customers.values()).find(c => c.accountId === req.params.id);

  const totalRevenue = opportunities.filter(o => o.stage === 'closed_won').reduce((sum, o) => sum + o.value, 0);

  res.json({
    success: true,
    account,
    opportunities,
    contacts,
    customer,
    totalRevenue,
  });
});

app.post('/api/accounts', requireAuth, (req, res) => {
  const { name, industry, size, revenue, employees, website, phone, address, region } = req.body;

  if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

  const account = {
    id: `ACC${String(dataStores.accounts.size + 1).padStart(3, '0')}`,
    name,
    industry: industry || 'Other',
    size: size || 'SMB',
    revenue: revenue || 0,
    employees: employees || 0,
    website: website || '',
    phone: phone || '',
    address: address || '',
    region: region || 'Other',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dataStores.accounts.set(account.id, account);
  res.status(201).json({ success: true, account });
});

app.patch('/api/accounts/:id', requireAuth, (req, res) => {
  const account = dataStores.accounts.get(req.params.id);
  if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

  const updated = { ...account, ...req.body, updatedAt: new Date().toISOString() };
  dataStores.accounts.set(req.params.id, updated);
  res.json({ success: true, account: updated });
});

// ============================================================
// CONTACTS CRUD
// ============================================================

app.get('/api/contacts', (req, res) => {
  const { accountId, search } = req.query;
  let contacts = Array.from(dataStores.contacts.values());

  if (accountId) contacts = contacts.filter(c => c.accountId === accountId);
  if (search) {
    const searchLower = search.toLowerCase();
    contacts = contacts.filter(c =>
      c.firstName?.toLowerCase().includes(searchLower) ||
      c.lastName?.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower)
    );
  }

  res.json({ success: true, count: contacts.length, contacts });
});

app.get('/api/contacts/:id', (req, res) => {
  const contact = dataStores.contacts.get(req.params.id);
  if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });

  const account = dataStores.accounts.get(contact.accountId);
  const activities = Array.from(dataStores.activities.values()).filter(a => a.contactId === req.params.id);

  res.json({ success: true, contact, account, activities });
});

app.post('/api/contacts', requireAuth, (req, res) => {
  const { firstName, lastName, email, title, accountId, phone, linkedin } = req.body;

  if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

  const contact = {
    id: `CNT${String(dataStores.contacts.size + 1).padStart(3, '0')}`,
    firstName: firstName || '',
    lastName: lastName || '',
    email,
    title: title || '',
    accountId: accountId || null,
    phone: phone || '',
    linkedin: linkedin || '',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dataStores.contacts.set(contact.id, contact);
  res.status(201).json({ success: true, contact });
});

// ============================================================
// OPPORTUNITIES CRUD
// ============================================================

app.get('/api/opportunities', (req, res) => {
  const { stage, ownerId, accountId, minValue, maxValue, search } = req.query;
  let opportunities = Array.from(dataStores.opportunities.values());

  if (stage) opportunities = opportunities.filter(o => o.stage === stage);
  if (ownerId) opportunities = opportunities.filter(o => o.ownerId === ownerId);
  if (accountId) opportunities = opportunities.filter(o => o.accountId === accountId);
  if (minValue) opportunities = opportunities.filter(o => o.value >= parseInt(minValue));
  if (maxValue) opportunities = opportunities.filter(o => o.value <= parseInt(maxValue));
  if (search) {
    const searchLower = search.toLowerCase();
    opportunities = opportunities.filter(o => o.title.toLowerCase().includes(searchLower));
  }

  // Add computed fields
  opportunities = opportunities.map(opp => {
    const account = dataStores.accounts.get(opp.accountId);
    const owner = dataStores.salesReps.get(opp.ownerId);
    return {
      ...opp,
      accountName: account?.name,
      ownerName: owner?.name,
      daysInStage: Math.floor((Date.now() - new Date(opp.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
    };
  });

  res.json({ success: true, count: opportunities.length, opportunities });
});

app.get('/api/opportunities/:id', (req, res) => {
  const opportunity = dataStores.opportunities.get(req.params.id);
  if (!opportunity) return res.status(404).json({ success: false, error: 'Opportunity not found' });

  const activities = Array.from(dataStores.dealActivities.values()).filter(a => a.opportunityId === req.params.id);
  const account = dataStores.accounts.get(opportunity.accountId);
  const owner = dataStores.salesReps.get(opportunity.ownerId);
  const contacts = Array.from(dataStores.contacts.values()).filter(c => c.accountId === opportunity.accountId);
  const quotes = Array.from(dataStores.quotes.values()).filter(q => q.opportunityId === req.params.id);
  const contracts = Array.from(dataStores.contracts.values()).filter(c => c.opportunityId === req.params.id);

  res.json({
    success: true,
    opportunity,
    account,
    owner,
    contacts,
    activities,
    quotes,
    contracts,
    products: opportunity.products?.map(pid => dataStores.products.get(pid)).filter(Boolean),
  });
});

app.post('/api/opportunities', requireAuth, (req, res) => {
  const { title, accountId, value, stage, closeDate, ownerId, products, notes, probability } = req.body;

  if (!title || !value) {
    return res.status(400).json({ success: false, error: 'Title and value are required' });
  }

  const probabilities = {
    lead: 10, qualified: 25, proposal: 50, negotiation: 75, closed_won: 100, closed_lost: 0,
  };

  const stageProb = probability || probabilities[stage] || 10;

  const opportunity = {
    id: `OPP${String(dataStores.opportunities.size + 1).padStart(4, '0')}`,
    title,
    accountId: accountId || null,
    value: parseInt(value),
    stage: stage || 'lead',
    probability: stageProb,
    closeDate: closeDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ownerId: ownerId || req.user.userId,
    products: products || [],
    competitors: [],
    notes: notes || '',
    weightedValue: parseInt(value) * stageProb / 100,
    activities: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dataStores.opportunities.set(opportunity.id, opportunity);

  // Trigger workflow
  triggerWorkflow('opp_created', { opportunityId: opportunity.id });

  res.status(201).json({ success: true, opportunity });
});

app.patch('/api/opportunities/:id', requireAuth, (req, res) => {
  const opportunity = dataStores.opportunities.get(req.params.id);
  if (!opportunity) return res.status(404).json({ success: false, error: 'Opportunity not found' });

  const probabilities = {
    lead: 10, qualified: 25, proposal: 50, negotiation: 75, closed_won: 100, closed_lost: 0,
  };

  const updated = { ...opportunity, ...req.body, updatedAt: new Date().toISOString() };

  // Update probability if stage changed
  if (req.body.stage && req.body.stage !== opportunity.stage) {
    updated.probability = probabilities[req.body.stage] || updated.probability;
    updated.stageChangedAt = new Date().toISOString();
    updated.previousStage = opportunity.stage;

    // Trigger workflow
    triggerWorkflow('opp_stage_change', { opportunityId: opportunity.id, from: opportunity.stage, to: req.body.stage });
  }

  // Recalculate weighted value
  updated.weightedValue = updated.value * updated.probability / 100;

  dataStores.opportunities.set(req.params.id, updated);
  res.json({ success: true, opportunity: updated });
});

// Move opportunity in pipeline (drag-and-drop)
app.post('/api/opportunities/:id/move', requireAuth, (req, res) => {
  const opportunity = dataStores.opportunities.get(req.params.id);
  if (!opportunity) return res.status(404).json({ success: false, error: 'Opportunity not found' });

  const { stage, notes } = req.body;
  const stageOrder = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];

  if (!stageOrder.includes(stage)) {
    return res.status(400).json({ success: false, error: 'Invalid stage' });
  }

  const previousStage = opportunity.stage;
  const probabilities = { lead: 10, qualified: 25, proposal: 50, negotiation: 75, closed_won: 100, closed_lost: 0 };

  opportunity.stage = stage;
  opportunity.probability = probabilities[stage];
  opportunity.weightedValue = opportunity.value * probabilities[stage] / 100;
  opportunity.updatedAt = new Date().toISOString();
  opportunity.stageHistory = opportunity.stageHistory || [];
  opportunity.stageHistory.push({
    from: previousStage,
    to: stage,
    timestamp: new Date().toISOString(),
    userId: req.user.userId,
  });

  // Log activity
  const activity = {
    id: `ACT${dataStores.activities.size + 1}`,
    type: 'stage_change',
    opportunityId: opportunity.id,
    from: previousStage,
    to: stage,
    notes: notes || '',
    timestamp: new Date().toISOString(),
    userId: req.user.userId,
  };
  dataStores.activities.set(activity.id, activity);
  dataStores.dealActivities.set(activity.id, activity);

  dataStores.opportunities.set(opportunity.id, opportunity);

  // Trigger workflows
  triggerWorkflow('opp_stage_change', { opportunityId: opportunity.id, from: previousStage, to: stage });

  if (stage === 'closed_won') {
    triggerWorkflow('deal_closed_won', { opportunityId: opportunity.id, value: opportunity.value });
  } else if (stage === 'closed_lost') {
    triggerWorkflow('deal_closed_lost', { opportunityId: opportunity.id });
  }

  res.json({ success: true, opportunity });
});

// ============================================================
// PIPELINE
// ============================================================

app.get('/api/pipeline', (req, res) => {
  const { ownerId } = req.query;
  let opportunities = Array.from(dataStores.opportunities.values());

  if (ownerId) opportunities = opportunities.filter(o => o.ownerId === ownerId);

  const stages = ['lead', 'qualified', 'proposal', 'negotiation'];
  const pipeline = {};

  stages.forEach(stage => {
    const opps = opportunities.filter(o => o.stage === stage);
    pipeline[stage] = {
      id: stage,
      name: dataStores.pipelineStages.get(stage)?.name || stage,
      count: opps.length,
      value: opps.reduce((sum, o) => sum + o.value, 0),
      weightedValue: opps.reduce((sum, o) => sum + o.weightedValue, 0),
      opportunities: opps.map(o => ({
        id: o.id,
        title: o.title,
        value: o.value,
        probability: o.probability,
        weightedValue: o.weightedValue,
        closeDate: o.closeDate,
        ownerName: dataStores.salesReps.get(o.ownerId)?.name,
      })),
    };
  });

  const totals = {
    totalValue: opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage)).reduce((sum, o) => sum + o.value, 0),
    totalWeighted: opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage)).reduce((sum, o) => sum + o.weightedValue, 0),
    count: opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage)).length,
  };

  res.json({ success: true, pipeline, totals });
});

app.get('/api/pipeline/stages', (req, res) => {
  const stages = Array.from(dataStores.pipelineStages.values());
  res.json({ success: true, stages });
});

// ============================================================
// ACTIVITIES
// ============================================================

app.get('/api/activities', (req, res) => {
  const { type, ownerId, date, relatedTo } = req.query;
  let activities = Array.from(dataStores.activities.values());

  if (type) activities = activities.filter(a => a.type === type);
  if (ownerId) activities = activities.filter(a => a.ownerId === ownerId);
  if (relatedTo) activities = activities.filter(a => a.opportunityId === relatedTo || a.leadId === relatedTo);
  if (date) activities = activities.filter(a => a.timestamp.startsWith(date));

  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({ success: true, count: activities.length, activities });
});

app.post('/api/activities', requireAuth, (req, res) => {
  const { type, subject, description, ownerId, opportunityId, leadId, contactId, date } = req.body;

  const activity = {
    id: `ACT${dataStores.activities.size + 1}`,
    type: type || 'note',
    subject: subject || '',
    description: description || '',
    ownerId: ownerId || req.user.userId,
    opportunityId: opportunityId || null,
    leadId: leadId || null,
    contactId: contactId || null,
    timestamp: date || new Date().toISOString(),
    createdBy: req.user.userId,
  };

  dataStores.activities.set(activity.id, activity);

  if (opportunityId) dataStores.dealActivities.set(activity.id, activity);
  if (leadId) dataStores.leadActivities.set(activity.id, activity);

  res.status(201).json({ success: true, activity });
});

// ============================================================
// TASKS
// ============================================================

app.get('/api/tasks', (req, res) => {
  const { ownerId, status, priority, relatedTo } = req.query;
  let tasks = Array.from(dataStores.tasks.values());

  if (ownerId) tasks = tasks.filter(t => t.ownerId === ownerId);
  if (status) tasks = tasks.filter(t => t.status === status);
  if (priority) tasks = tasks.filter(t => t.priority === priority);
  if (relatedTo) tasks = tasks.filter(t => t.relatedTo === relatedTo);

  // Add computed fields
  tasks = tasks.map(task => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    return { ...task, isOverdue };
  });

  res.json({ success: true, count: tasks.length, tasks });
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const { title, description, ownerId, dueDate, priority, relatedTo, type } = req.body;

  const task = {
    id: `TSK${dataStores.tasks.size + 1}`,
    title,
    description: description || '',
    ownerId: ownerId || req.user.userId,
    dueDate: dueDate || null,
    priority: priority || 'medium',
    type: type || 'follow-up',
    status: 'pending',
    relatedTo: relatedTo || null,
    createdAt: new Date().toISOString(),
    createdBy: req.user.userId,
  };

  dataStores.tasks.set(task.id, task);
  res.status(201).json({ success: true, task });
});

app.patch('/api/tasks/:id', requireAuth, (req, res) => {
  const task = dataStores.tasks.get(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

  const updated = { ...task, ...req.body, updatedAt: new Date().toISOString() };
  dataStores.tasks.set(req.params.id, updated);
  res.json({ success: true, task: updated });
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  if (!dataStores.tasks.has(req.params.id)) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  dataStores.tasks.delete(req.params.id);
  res.json({ success: true, message: 'Task deleted' });
});

// ============================================================
// MEETINGS & CALLS
// ============================================================

app.get('/api/meetings', (req, res) => {
  const { ownerId, date, status } = req.query;
  let meetings = Array.from(dataStores.meetings.values());

  if (ownerId) meetings = meetings.filter(m => m.ownerId === ownerId);
  if (date) meetings = meetings.filter(m => m.date.startsWith(date));
  if (status) meetings = meetings.filter(m => m.status === status);

  res.json({ success: true, count: meetings.length, meetings });
});

app.post('/api/meetings', requireAuth, (req, res) => {
  const { title, accountId, opportunityId, date, duration, attendees, location, notes } = req.body;

  const meeting = {
    id: `MTG${dataStores.meetings.size + 1}`,
    title,
    accountId: accountId || null,
    opportunityId: opportunityId || null,
    date: date || new Date().toISOString(),
    duration: duration || 30,
    attendees: attendees || [],
    location: location || 'virtual',
    notes: notes || '',
    status: 'scheduled',
    ownerId: req.user.userId,
    createdAt: new Date().toISOString(),
  };

  dataStores.meetings.set(meeting.id, meeting);
  res.status(201).json({ success: true, meeting });
});

app.get('/api/calls', (req, res) => {
  const { ownerId, direction } = req.query;
  let calls = Array.from(dataStores.calls.values());

  if (ownerId) calls = calls.filter(c => c.ownerId === ownerId);
  if (direction) calls = calls.filter(c => c.direction === direction);

  res.json({ success: true, count: calls.length, calls });
});

app.post('/api/calls', requireAuth, (req, res) => {
  const { subject, contactId, accountId, direction, duration, outcome, notes } = req.body;

  const call = {
    id: `CALL${dataStores.calls.size + 1}`,
    subject,
    contactId: contactId || null,
    accountId: accountId || null,
    direction: direction || 'outbound',
    duration: duration || 0,
    outcome: outcome || 'connected',
    notes: notes || '',
    ownerId: req.user.userId,
    timestamp: new Date().toISOString(),
  };

  dataStores.calls.set(call.id, call);

  // Store call metrics
  const metrics = dataStores.callMetrics.get(req.user.userId) || { total: 0, duration: 0, outcomes: {} };
  metrics.total++;
  metrics.duration += duration || 0;
  metrics.outcomes[outcome] = (metrics.outcomes[outcome] || 0) + 1;
  dataStores.callMetrics.set(req.user.userId, metrics);

  res.status(201).json({ success: true, call });
});

// ============================================================
// PRODUCTS & CPQ
// ============================================================

app.get('/api/products', (req, res) => {
  const { category, type } = req.query;
  let products = Array.from(dataStores.products.values());

  if (category) products = products.filter(p => p.category === category);
  if (type) products = products.filter(p => p.type === type);

  res.json({ success: true, count: products.length, products });
});

app.get('/api/products/:id', (req, res) => {
  const product = dataStores.products.get(req.params.id);
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

  // Get related bundles
  const bundles = Array.from(dataStores.productBundles.values()).filter(b => b.products.includes(req.params.id));

  res.json({ success: true, product, bundles });
});

app.post('/api/products', requireAuth, (req, res) => {
  const { name, category, price, unit, description, cost, type } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ success: false, error: 'Name and price are required' });
  }

  const product = {
    id: `PRD${String(dataStores.products.size + 1).padStart(3, '0')}`,
    name,
    category: category || 'General',
    price: parseFloat(price),
    unit: unit || 'month',
    description: description || '',
    cost: cost || 0,
    margin: cost ? ((price - cost) / price * 100).toFixed(1) : 50,
    type: type || 'subscription',
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  dataStores.products.set(product.id, product);
  res.status(201).json({ success: true, product });
});

// Product Bundles
app.get('/api/bundles', (req, res) => {
  const bundles = Array.from(dataStores.productBundles.values()).map(bun => ({
    ...bun,
    products: bun.products.map(pid => dataStores.products.get(pid)).filter(Boolean),
    totalValue: bun.products.reduce((sum, pid) => {
      const prod = dataStores.products.get(pid);
      return sum + (prod?.price || 0);
    }, 0),
    bundlePrice: bun.products.reduce((sum, pid) => {
      const prod = dataStores.products.get(pid);
      return sum + (prod?.price || 0);
    }, 0) * (1 - bun.discount / 100),
  }));

  res.json({ success: true, count: bundles.length, bundles });
});

app.post('/api/bundles', requireAuth, (req, res) => {
  const { name, products, discount, description } = req.body;

  if (!name || !products?.length) {
    return res.status(400).json({ success: false, error: 'Name and products are required' });
  }

  const bundle = {
    id: `BUN${String(dataStores.productBundles.size + 1).padStart(3, '0')}`,
    name,
    products,
    discount: discount || 0,
    description: description || '',
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  dataStores.productBundles.set(bundle.id, bundle);
  res.status(201).json({ success: true, bundle });
});

// ============================================================
// QUOTES (CPQ)
// ============================================================

app.get('/api/quotes', (req, res) => {
  const { opportunityId, status } = req.query;
  let quotes = Array.from(dataStores.quotes.values());

  if (opportunityId) quotes = quotes.filter(q => q.opportunityId === opportunityId);
  if (status) quotes = quotes.filter(q => q.status === status);

  res.json({ success: true, count: quotes.length, quotes });
});

app.get('/api/quotes/:id', (req, res) => {
  const quote = dataStores.quotes.get(req.params.id);
  if (!quote) return res.status(404).json({ success: false, error: 'Quote not found' });

  const opportunity = dataStores.opportunities.get(quote.opportunityId);

  res.json({ success: true, quote, opportunity });
});

app.post('/api/quotes', requireAuth, (req, res) => {
  const { opportunityId, items, currency, taxRate, discount, notes, validDays } = req.body;

  if (!items?.length) {
    return res.status(400).json({ success: false, error: 'Quote items required' });
  }

  const currencyRate = dataStores.multiCurrencyRates.get(currency || 'INR')?.rate || 1;
  const taxConfig = dataStores.taxConfigurations.get('IN');

  const subtotal = items.reduce((sum, item) => {
    const product = dataStores.products.get(item.productId);
    return sum + ((product?.price || 0) * item.quantity * (1 - (item.discount || 0) / 100));
  }, 0);

  const lineDiscount = discount || 0;
  const discountedSubtotal = subtotal * (1 - lineDiscount / 100);
  const tax = discountedSubtotal * ((taxRate || taxConfig?.rate || 18) / 100);
  const total = discountedSubtotal + tax;

  const quote = {
    id: `QTE${String(dataStores.quotes.size + 1).padStart(4, '0')}`,
    opportunityId,
    items: items.map(item => ({
      ...item,
      product: dataStores.products.get(item.productId),
    })),
    currency: currency || 'INR',
    currencyRate,
    subtotal: subtotal.toFixed(2),
    lineDiscount,
    discountedSubtotal: discountedSubtotal.toFixed(2),
    taxRate: taxRate || taxConfig?.rate || 18,
    tax: tax.toFixed(2),
    total: total.toFixed(2),
    totalInBaseCurrency: (total * currencyRate).toFixed(2),
    notes: notes || '',
    status: 'draft',
    validDays: validDays || 30,
    validUntil: new Date(Date.now() + (validDays || 30) * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: req.user.userId,
    createdAt: new Date().toISOString(),
  };

  dataStores.quotes.set(quote.id, quote);
  res.status(201).json({ success: true, quote });
});

app.patch('/api/quotes/:id', requireAuth, (req, res) => {
  const quote = dataStores.quotes.get(req.params.id);
  if (!quote) return res.status(404).json({ success: false, error: 'Quote not found' });

  const updated = { ...quote, ...req.body, updatedAt: new Date().toISOString() };
  dataStores.quotes.set(req.params.id, updated);
  res.json({ success: true, quote: updated });
});

app.post('/api/quotes/:id/send', requireAuth, (req, res) => {
  const quote = dataStores.quotes.get(req.params.id);
  if (!quote) return res.status(404).json({ success: false, error: 'Quote not found' });

  quote.status = 'sent';
  quote.sentAt = new Date().toISOString();
  quote.sentTo = req.body.email || '';
  dataStores.quotes.set(req.params.id, quote);

  res.json({ success: true, quote });
});

app.post('/api/quotes/:id/accept', requireAuth, (req, res) => {
  const quote = dataStores.quotes.get(req.params.id);
  if (!quote) return res.status(404).json({ success: false, error: 'Quote not found' });

  quote.status = 'accepted';
  quote.acceptedAt = new Date().toISOString();
  dataStores.quotes.set(req.params.id, quote);

  res.json({ success: true, quote });
});

// Discount Approval Workflow
app.post('/api/discount-approvals', requireAuth, (req, res) => {
  const { quoteId, discount, reason, approverId } = req.body;

  const approval = {
    id: `APR${dataStores.discountApprovals.size + 1}`,
    quoteId,
    requestedDiscount: discount,
    reason,
    requesterId: req.user.userId,
    approverId: approverId || 'MGR001',
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  dataStores.discountApprovals.set(approval.id, approval);
  res.status(201).json({ success: true, approval });
});

app.post('/api/discount-approvals/:id/approve', requireAuth, (req, res) => {
  const approval = dataStores.discountApprovals.get(req.params.id);
  if (!approval) return res.status(404).json({ success: false, error: 'Approval not found' });

  approval.status = 'approved';
  approval.approvedBy = req.user.userId;
  approval.approvedAt = new Date().toISOString();
  approval.comments = req.body.comments || '';
  dataStores.discountApprovals.set(approval.id, approval);

  res.json({ success: true, approval });
});

app.post('/api/discount-approvals/:id/reject', requireAuth, (req, res) => {
  const approval = dataStores.discountApprovals.get(req.params.id);
  if (!approval) return res.status(404).json({ success: false, error: 'Approval not found' });

  approval.status = 'rejected';
  approval.rejectedBy = req.user.userId;
  approval.rejectedAt = new Date().toISOString();
  approval.rejectionReason = req.body.reason || '';
  dataStores.discountApprovals.set(approval.id, approval);

  res.json({ success: true, approval });
});

// ============================================================
// CONTRACTS (Contract Lifecycle Management)
// ============================================================

app.get('/api/contracts', (req, res) => {
  const { accountId, status, type } = req.query;
  let contracts = Array.from(dataStores.contracts.values());

  if (accountId) contracts = contracts.filter(c => c.accountId === accountId);
  if (status) contracts = contracts.filter(c => c.status === status);
  if (type) contracts = contracts.filter(c => c.type === type);

  // Add computed fields
  contracts = contracts.map(ctr => {
    const daysToExpiry = Math.ceil((new Date(ctr.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return {
      ...ctr,
      account: dataStores.accounts.get(ctr.accountId),
      daysToExpiry,
      isExpiringSoon: daysToExpiry <= 30 && daysToExpiry > 0,
      isExpired: daysToExpiry < 0,
    };
  });

  res.json({ success: true, count: contracts.length, contracts });
});

app.get('/api/contracts/:id', (req, res) => {
  const contract = dataStores.contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });

  const account = dataStores.accounts.get(contract.accountId);
  const opportunities = Array.from(dataStores.opportunities.values()).filter(o => o.accountId === contract.accountId);
  const amendments = Array.from(dataStores.contractAmendments.values()).filter(a => a.contractId === req.params.id);
  const versions = Array.from(dataStores.contractVersions.values()).filter(v => v.contractId === req.params.id);

  res.json({ success: true, contract, account, opportunities, amendments, versions });
});

app.post('/api/contracts', requireAuth, (req, res) => {
  const { accountId, opportunityId, title, type, startDate, endDate, value, paymentTerms, renewalType, terms } = req.body;

  if (!accountId || !title) {
    return res.status(400).json({ success: false, error: 'Account and title are required' });
  }

  const contract = {
    id: `CTR${String(dataStores.contracts.size + 1).padStart(4, '0')}`,
    accountId,
    opportunityId: opportunityId || null,
    title,
    type: type || 'subscription',
    status: 'draft',
    startDate,
    endDate,
    value: parseFloat(value) || 0,
    paymentTerms: paymentTerms || 'net-30',
    renewalType: renewalType || 'manual',
    terms: terms || '',
    documents: [],
    createdBy: req.user.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dataStores.contracts.set(contract.id, contract);

  // Create initial version
  const version = {
    id: `VER${dataStores.contractVersions.size + 1}`,
    contractId: contract.id,
    version: 1,
    content: terms || '',
    createdBy: req.user.userId,
    createdAt: new Date().toISOString(),
  };
  dataStores.contractVersions.set(version.id, version);

  res.status(201).json({ success: true, contract });
});

app.patch('/api/contracts/:id', requireAuth, (req, res) => {
  const contract = dataStores.contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });

  const updated = { ...contract, ...req.body, updatedAt: new Date().toISOString() };
  dataStores.contracts.set(req.params.id, updated);
  res.json({ success: true, contract: updated });
});

app.post('/api/contracts/:id/activate', requireAuth, (req, res) => {
  const contract = dataStores.contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });

  contract.status = 'active';
  contract.activatedAt = new Date().toISOString();
  contract.activatedBy = req.user.userId;
  dataStores.contracts.set(req.params.id, contract);

  // Trigger renewal workflow
  triggerWorkflow('contract_signed', { contractId: contract.id });

  res.json({ success: true, contract });
});

app.post('/api/contracts/:id/amend', requireAuth, (req, res) => {
  const contract = dataStores.contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });

  const { reason, changes } = req.body;

  const amendment = {
    id: `AMD${dataStores.contractAmendments.size + 1}`,
    contractId: contract.id,
    reason,
    changes,
    status: 'pending',
    createdBy: req.user.userId,
    createdAt: new Date().toISOString(),
  };

  dataStores.contractAmendments.set(amendment.id, amendment);

  // Update contract with amendment
  if (changes.value) contract.value = changes.value;
  if (changes.endDate) contract.endDate = changes.endDate;
  contract.amendments = [...(contract.amendments || []), amendment.id];
  dataStores.contracts.set(contract.id, contract);

  res.status(201).json({ success: true, amendment, contract });
});

// E-Signature
app.post('/api/contracts/:id/signature', requireAuth, (req, res) => {
  const contract = dataStores.contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });

  const { signerEmail, signerName, signatureData } = req.body;

  const signature = {
    id: `SIG${dataStores.esignatures.size + 1}`,
    contractId: contract.id,
    signerEmail,
    signerName,
    signatureData,
    signedAt: new Date().toISOString(),
    ipAddress: req.ip,
  };

  dataStores.esignatures.set(signature.id, signature);
  contract.signatures = [...(contract.signatures || []), signature.id];

  // Check if all parties have signed
  if (contract.signatures?.length >= 2) {
    contract.status = 'executed';
    contract.executedAt = new Date().toISOString();
  }

  dataStores.contracts.set(contract.id, contract);
  res.status(201).json({ success: true, signature, contract });
});

// ============================================================
// CUSTOMER SUCCESS
// ============================================================

app.get('/api/customers', (req, res) => {
  const { status, tier, csOwner } = req.query;
  let customers = Array.from(dataStores.customers.values());

  if (status) customers = customers.filter(c => c.status === status);
  if (tier) customers = customers.filter(c => c.tier === tier);
  if (csOwner) customers = customers.filter(c => c.csOwner === csOwner);

  // Add computed fields
  customers = customers.map(cus => {
    const account = dataStores.accounts.get(cus.accountId);
    const healthScore = dataStores.healthScores.get(`HS${cus.id.slice(3)}`);
    const daysToRenewal = Math.ceil((new Date(cus.renewalDate) - new Date()) / (1000 * 60 * 60 * 24));
    return {
      ...cus,
      account,
      healthScore,
      daysToRenewal,
      isRenewalSoon: daysToRenewal <= 30 && daysToRenewal > 0,
    };
  });

  res.json({ success: true, count: customers.length, customers });
});

app.get('/api/customers/:id', (req, res) => {
  const customer = dataStores.customers.get(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

  const account = dataStores.accounts.get(customer.accountId);
  const healthScore = dataStores.healthScores.get(`HS${customer.id.slice(3)}`);
  const subscriptions = Array.from(dataStores.subscriptions.values()).filter(s => s.customerId === req.params.id);
  const opportunities = Array.from(dataStores.opportunities.values()).filter(o => o.accountId === customer.accountId);
  const activities = Array.from(dataStores.activities.values()).filter(a => a.accountId === customer.accountId).slice(0, 10);

  res.json({
    success: true,
    customer,
    account,
    healthScore,
    subscriptions,
    opportunities,
    recentActivities: activities,
  });
});

// Health Score Management
app.get('/api/health-scores', (req, res) => {
  const { customerId } = req.query;
  let scores = Array.from(dataStores.healthScores.values());

  if (customerId) scores = scores.filter(h => h.customerId === customerId);

  scores = scores.map(hs => {
    const customer = dataStores.customers.get(hs.customerId);
    return { ...hs, customer };
  });

  res.json({ success: true, count: scores.length, healthScores: scores });
});

app.post('/api/health-scores/calculate', requireAuth, (req, res) => {
  const { customerId } = req.body;

  const customer = dataStores.customers.get(customerId);
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

  // AI-powered health score calculation
  const account = dataStores.accounts.get(customer.accountId);

  // Simulate health factors
  const adoption = Math.min(100, Math.round(Math.random() * 30 + 60));
  const engagement = Math.min(100, Math.round(Math.random() * 30 + 50));
  const support = Math.min(100, Math.round(Math.random() * 20 + 70));
  const revenue = Math.min(100, Math.round(Math.random() * 20 + 75));

  const factors = { adoption, engagement, support, revenue };
  const score = Math.round((adoption * 0.3 + engagement * 0.25 + support * 0.2 + revenue * 0.25));

  const healthScore = {
    id: `HS${customerId.slice(3)}`,
    customerId,
    score,
    factors,
    previousScore: customer.healthScore,
    trend: score > customer.healthScore ? 'improving' : score < customer.healthScore ? 'declining' : 'stable',
    updatedAt: new Date().toISOString(),
  };

  dataStores.healthScores.set(healthScore.id, healthScore);

  // Update customer
  customer.healthScore = score;
  customer.healthTrend = healthScore.trend;
  dataStores.customers.set(customer.id, customer);

  // Set at-risk status if score is low
  if (score < 50) {
    customer.status = 'at-risk';
    triggerWorkflow('customer_at_risk', { customerId: customer.id, score });
  }

  res.json({ success: true, healthScore });
});

// NPS Surveys
app.get('/api/nps', (req, res) => {
  const { customerId, status } = req.query;
  let surveys = Array.from(dataStores.npsSurveys.values());

  if (customerId) surveys = surveys.filter(n => n.customerId === customerId);
  if (status) surveys = surveys.filter(n => n.status === status);

  res.json({ success: true, count: surveys.length, surveys });
});

app.post('/api/nps', requireAuth, (req, res) => {
  const { customerId, name, questions } = req.body;

  const survey = {
    id: `NPS${String(dataStores.npsSurveys.size + 1).padStart(3, '0')}`,
    customerId,
    name: name || 'NPS Survey',
    questions: questions || [{ question: 'How likely are you to recommend us?', type: 'scale', required: true }],
    status: 'draft',
    sentAt: null,
    respondedAt: null,
    score: null,
    comments: null,
    createdBy: req.user.userId,
    createdAt: new Date().toISOString(),
  };

  dataStores.npsSurveys.set(survey.id, survey);
  res.status(201).json({ success: true, survey });
});

app.post('/api/nps/:id/send', requireAuth, (req, res) => {
  const survey = dataStores.npsSurveys.get(req.params.id);
  if (!survey) return res.status(404).json({ success: false, error: 'Survey not found' });

  survey.status = 'sent';
  survey.sentAt = new Date().toISOString();
  survey.sentTo = req.body.email || '';
  dataStores.npsSurveys.set(survey.id, survey);

  res.json({ success: true, survey });
});

app.post('/api/nps/:id/response', requireAuth, (req, res) => {
  const survey = dataStores.npsSurveys.get(req.params.id);
  if (!survey) return res.status(404).json({ success: false, error: 'Survey not found' });

  const { score, comments, responses } = req.body;

  survey.status = 'completed';
  survey.respondedAt = new Date().toISOString();
  survey.score = score;
  survey.comments = comments;
  survey.responses = responses;
  dataStores.npsSurveys.set(survey.id, survey);

  // Update customer NPS
  const customer = dataStores.customers.get(survey.customerId);
  if (customer) {
    customer.nps = score;
    dataStores.customers.set(customer.id, customer);
  }

  res.json({ success: true, survey });
});

// Churn Risk Assessment
app.get('/api/churn-risks', (req, res) => {
  const { riskLevel } = req.query;
  const customers = Array.from(dataStores.customers.values());

  const risks = customers.map(cus => {
    const healthScore = dataStores.healthScores.get(`HS${cus.id.slice(3)}`);
    const score = healthScore?.score || cus.healthScore || 50;
    const riskLevel = score < 40 ? 'critical' : score < 60 ? 'high' : score < 75 ? 'medium' : 'low';

    return {
      customerId: cus.id,
      customerName: cus.name,
      riskScore: score,
      riskLevel,
      factors: healthScore?.factors || {},
      recommendation: getChurnRecommendation(riskLevel),
    };
  });

  if (riskLevel) {
    return res.json({ success: true, count: risks.filter(r => r.riskLevel === riskLevel).length, churnRisks: risks.filter(r => r.riskLevel === riskLevel) });
  }

  res.json({ success: true, count: risks.length, churnRisks: risks });
});

function getChurnRecommendation(riskLevel) {
  const recommendations = {
    critical: 'Immediate intervention required. Schedule executive sponsor call and create retention plan.',
    high: 'Proactive outreach needed. Offer health check call and identify upsell opportunities.',
    medium: 'Monitor closely. Schedule QBR and ensure team is engaged.',
    low: 'Continue normal engagement. Look for expansion opportunities.',
  };
  return recommendations[riskLevel] || '';
}

// Renewals
app.get('/api/renewals', (req, res) => {
  const { status } = req.query;
  const customers = Array.from(dataStores.customers.values());

  const renewals = customers.map(cus => {
    const daysToRenewal = Math.ceil((new Date(cus.renewalDate) - new Date()) / (1000 * 60 * 60 * 24));
    const contractValue = cus.contractValue || 0;

    return {
      customerId: cus.id,
      customerName: cus.name,
      renewalDate: cus.renewalDate,
      daysToRenewal,
      contractValue,
      status: daysToRenewal < 0 ? 'expired' : daysToRenewal <= 30 ? 'at-risk' : daysToRenewal <= 90 ? 'upcoming' : 'on-track',
      owner: dataStores.salesReps.get(cus.csOwner)?.name,
    };
  });

  if (status) {
    return res.json({ success: true, count: renewals.filter(r => r.status === status).length, renewals: renewals.filter(r => r.status === status) });
  }

  res.json({ success: true, count: renewals.length, renewals });
});

// ============================================================
// TERRITORY MANAGEMENT
// ============================================================

app.get('/api/territories', (req, res) => {
  const territories = Array.from(dataStores.territories.values()).map(ter => ({
    ...ter,
    assignedReps: ter.assignedReps.map(rid => dataStores.salesReps.get(rid)).filter(Boolean),
    metrics: calculateTerritoryMetrics(ter.id),
  }));

  res.json({ success: true, count: territories.length, territories });
});

function calculateTerritoryMetrics(territoryId) {
  const territory = dataStores.territories.get(territoryId);
  if (!territory) return { totalValue: 0, deals: 0, quota: 0, attainment: 0 };

  const opportunities = Array.from(dataStores.opportunities.values()).filter(o =>
    territory.assignedReps.includes(o.ownerId)
  );

  const totalValue = opportunities.filter(o => !['closed_lost'].includes(o.stage)).reduce((sum, o) => sum + o.value, 0);
  const closedWon = opportunities.filter(o => o.stage === 'closed_won').reduce((sum, o) => sum + o.value, 0);

  return {
    totalValue,
    closedWon,
    deals: opportunities.length,
    quota: territory.totalQuota,
    attainment: territory.totalQuota > 0 ? ((closedWon / territory.totalQuota) * 100).toFixed(1) : 0,
  };
}

app.get('/api/territories/:id', (req, res) => {
  const territory = dataStores.territories.get(req.params.id);
  if (!territory) return res.status(404).json({ success: false, error: 'Territory not found' });

  const reps = territory.assignedReps.map(rid => dataStores.salesReps.get(rid)).filter(Boolean);
  const opportunities = Array.from(dataStores.opportunities.values()).filter(o => territory.assignedReps.includes(o.ownerId));
  const accounts = Array.from(dataStores.accounts.values()).filter(a => territory.regions.includes(a.region));

  res.json({
    success: true,
    territory,
    reps,
    opportunities,
    accounts,
    metrics: calculateTerritoryMetrics(req.params.id),
  });
});

app.post('/api/territories', requireAuth, (req, res) => {
  const { name, regions, type, totalQuota, assignedReps } = req.body;

  const territory = {
    id: `TER${String(dataStores.territories.size + 1).padStart(3, '0')}`,
    name,
    regions: regions || [],
    type: type || 'geographic',
    totalQuota: totalQuota || 0,
    assignedReps: assignedReps || [],
    createdAt: new Date().toISOString(),
  };

  dataStores.territories.set(territory.id, territory);
  res.status(201).json({ success: true, territory });
});

app.patch('/api/territories/:id', requireAuth, (req, res) => {
  const territory = dataStores.territories.get(req.params.id);
  if (!territory) return res.status(404).json({ success: false, error: 'Territory not found' });

  const updated = { ...territory, ...req.body };
  dataStores.territories.set(req.params.id, updated);
  res.json({ success: true, territory: updated });
});

// ============================================================
// SALES REP & TEAMS
// ============================================================

app.get('/api/sales-reps', (req, res) => {
  const { territory, role, managerId } = req.query;
  let reps = Array.from(dataStores.salesReps.values());

  if (territory) reps = reps.filter(r => r.territory === territory);
  if (role) reps = reps.filter(r => r.role === role);
  if (managerId) reps = reps.filter(r => r.managerId === managerId);

  // Add performance metrics
  reps = reps.map(rep => ({
    ...rep,
    manager: dataStores.managers.get(rep.managerId),
    metrics: calculateRepMetrics(rep.id),
    callMetrics: dataStores.callMetrics.get(rep.id),
  }));

  res.json({ success: true, count: reps.length, salesReps: reps });
});

function calculateRepMetrics(repId) {
  const opps = Array.from(dataStores.opportunities.values()).filter(o => o.ownerId === repId);
  const closedWon = opps.filter(o => o.stage === 'closed_won');
  const closedLost = opps.filter(o => o.stage === 'closed_lost');
  const active = opps.filter(o => !['closed_won', 'closed_lost'].includes(o.stage));

  const rep = dataStores.salesReps.get(repId);

  return {
    totalDeals: opps.length,
    closedWon: closedWon.length,
    closedLost: closedLost.length,
    activeDeals: active.length,
    totalValue: opps.reduce((sum, o) => sum + o.value, 0),
    closedValue: closedWon.reduce((sum, o) => sum + o.value, 0),
    quota: rep?.quota || 0,
    achieved: rep?.achieved || 0,
    quotaAttainment: rep?.quota > 0 ? ((rep.achieved / rep.quota) * 100).toFixed(1) : 0,
    winRate: (closedWon.length + closedLost.length) > 0 ? ((closedWon.length / (closedWon.length + closedLost.length)) * 100).toFixed(1) : 0,
    avgDealSize: closedWon.length > 0 ? Math.round(closedWon.reduce((sum, o) => sum + o.value, 0) / closedWon.length) : 0,
  };
}

app.get('/api/sales-reps/:id', (req, res) => {
  const rep = dataStores.salesReps.get(req.params.id);
  if (!rep) return res.status(404).json({ success: false, error: 'Sales rep not found' });

  const opportunities = Array.from(dataStores.opportunities.values()).filter(o => o.ownerId === req.params.id);
  const activities = Array.from(dataStores.activities.values()).filter(a => a.ownerId === req.params.id).slice(0, 20);
  const tasks = Array.from(dataStores.tasks.values()).filter(t => t.ownerId === req.params.id);
  const manager = dataStores.managers.get(rep.managerId);
  const customers = Array.from(dataStores.customers.values()).filter(c => c.csOwner === req.params.id);

  res.json({
    success: true,
    rep,
    manager,
    opportunities,
    activities,
    tasks,
    customers,
    metrics: calculateRepMetrics(req.params.id),
    callMetrics: dataStores.callMetrics.get(req.params.id),
  });
});

app.get('/api/managers', (req, res) => {
  const managers = Array.from(dataStores.managers.values()).map(mgr => ({
    ...mgr,
    team: Array.from(dataStores.salesReps.values()).filter(r => r.managerId === mgr.id),
    metrics: calculateManagerMetrics(mgr.id),
  }));

  res.json({ success: true, count: managers.length, managers });
});

function calculateManagerMetrics(managerId) {
  const teamReps = Array.from(dataStores.salesReps.values()).filter(r => r.managerId === managerId);
  const totalQuota = teamReps.reduce((sum, r) => sum + r.quota, 0);
  const totalAchieved = teamReps.reduce((sum, r) => sum + r.achieved, 0);

  return {
    teamSize: teamReps.length,
    totalQuota,
    totalAchieved,
    attainment: totalQuota > 0 ? ((totalAchieved / totalQuota) * 100).toFixed(1) : 0,
  };
}

// ============================================================
// SALES FORECASTING
// ============================================================

app.get('/api/forecasts', (req, res) => {
  const { period, ownerId } = req.query;
  const opportunities = Array.from(dataStores.opportunities.values());

  let forecastPeriod = period || 'Q2-2026';
  let forecast = calculateForecast(opportunities, forecastPeriod, ownerId);

  res.json({ success: true, forecast, period: forecastPeriod });
});

function calculateForecast(opportunities, period, ownerId) {
  const activeOpps = opportunities.filter(o =>
    !['closed_won', 'closed_lost'].includes(o.stage) &&
    (!ownerId || o.ownerId === ownerId)
  );

  const committed = activeOpps.filter(o => o.probability >= 75).reduce((sum, o) => sum + (o.value * o.probability / 100), 0);
  const bestCase = activeOpps.filter(o => o.probability >= 50).reduce((sum, o) => sum + (o.value * o.probability / 100), 0);
  const pipeline = activeOpps.reduce((sum, o) => sum + o.value, 0);
  const weightedPipeline = activeOpps.reduce((sum, o) => sum + o.weightedValue, 0);

  // AI-generated adjustments
  const aiAdjustment = calculateForecastAdjustment(activeOpps);

  return {
    period,
    committed: Math.round(committed),
    bestCase: Math.round(bestCase),
    pipeline,
    weightedPipeline: Math.round(weightedPipeline),
    aiAdjusted: Math.round(committed * (1 + aiAdjustment / 100)),
    aiConfidence: 85 + Math.round(Math.random() * 10),
    aiAdjustment,
    byStage: {
      lead: activeOpps.filter(o => o.stage === 'lead').reduce((sum, o) => sum + o.value, 0),
      qualified: activeOpps.filter(o => o.stage === 'qualified').reduce((sum, o) => sum + o.value, 0),
      proposal: activeOpps.filter(o => o.stage === 'proposal').reduce((sum, o) => sum + o.value, 0),
      negotiation: activeOpps.filter(o => o.stage === 'negotiation').reduce((sum, o) => sum + o.value, 0),
    },
    byMonth: calculateMonthlyForecast(activeOpps),
    generatedAt: new Date().toISOString(),
  };
}

function calculateForecastAdjustment(opportunities) {
  // Simulate AI-based adjustment based on historical win rates
  const avgWinRate = opportunities.length > 0 ?
    opportunities.filter(o => o.stage === 'closed_won').length /
    Math.max(1, opportunities.length) * 100 : 50;

  const stageAccuracy = {
    lead: 0.1,
    qualified: 0.25,
    proposal: 0.5,
    negotiation: 0.75,
  };

  let totalExpected = 0;
  opportunities.forEach(o => {
    const accuracy = stageAccuracy[o.stage] || 0.25;
    totalExpected += o.value * accuracy;
  });

  const expectedTotal = opportunities.reduce((sum, o) => sum + o.weightedValue, 0);
  const adjustment = expectedTotal > 0 ? ((totalExpected - expectedTotal) / expectedTotal) * 100 : 0;

  return Math.round(adjustment * 10) / 10;
}

function calculateMonthlyForecast(opportunities) {
  const months = {};
  const now = new Date();

  for (let i = 0; i < 6; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    months[monthKey] = { committed: 0, bestCase: 0, pipeline: 0 };
  }

  opportunities.forEach(o => {
    const closeMonth = new Date(o.closeDate).toISOString().slice(0, 7);
    if (months[closeMonth]) {
      months[closeMonth].pipeline += o.value;
      months[closeMonth].committed += o.value * o.probability / 100;
      months[closeMonth].bestCase += o.value * (o.probability >= 50 ? 1 : 0.5);
    }
  });

  return months;
}

app.get('/api/forecasts/adjustments', (req, res) => {
  const adjustments = Array.from(dataStores.forecastAdjustments.values());
  res.json({ success: true, count: adjustments.length, adjustments });
});

app.post('/api/forecasts/adjustments', requireAuth, (req, res) => {
  const { opportunityId, adjustment, reason } = req.body;

  const adjustmentRec = {
    id: `FADJ${dataStores.forecastAdjustments.size + 1}`,
    opportunityId,
    adjustment,
    reason,
    createdBy: req.user.userId,
    createdAt: new Date().toISOString(),
  };

  dataStores.forecastAdjustments.set(adjustmentRec.id, adjustmentRec);
  res.status(201).json({ success: true, adjustment: adjustmentRec });
});

// ============================================================
// REVENUE INTELLIGENCE
// ============================================================

app.get('/api/revenue/analytics', (req, res) => {
  const opportunities = Array.from(dataStores.opportunities.values());
  const subscriptions = Array.from(dataStores.subscriptions.values());
  const customers = Array.from(dataStores.customers.values());

  const analytics = {
    totalRevenue: opportunities.filter(o => o.stage === 'closed_won').reduce((sum, o) => sum + o.value, 0),
    pipeline: opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage)).reduce((sum, o) => sum + o.value, 0),
    weightedPipeline: opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage)).reduce((sum, o) => sum + o.weightedValue, 0),
    mrr: subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + s.mrr, 0),
    arr: subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + s.arr, 0),
    netNewARR: calculateNetNewARR(subscriptions),
    churnedARR: calculateChurnedARR(subscriptions),
    expansionARR: calculateExpansionARR(subscriptions),
    byIndustry: calculateRevenueByIndustry(opportunities),
    bySource: calculateRevenueBySource(opportunities),
    winRate: calculateWinRate(opportunities),
    avgDealSize: calculateAvgDealSize(opportunities),
    salesCycle: calculateSalesCycle(opportunities),
  };

  res.json({ success: true, analytics });
});

function calculateNetNewARR(subscriptions) {
  return subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + s.arr, 0);
}

function calculateChurnedARR(subscriptions) {
  return subscriptions.filter(s => s.status === 'churned').reduce((sum, s) => sum + s.arr, 0);
}

function calculateExpansionARR(subscriptions) {
  return 250000; // Simulated expansion revenue
}

function calculateRevenueByIndustry(opportunities) {
  const byIndustry = {};
  opportunities.filter(o => o.stage === 'closed_won').forEach(o => {
    const account = dataStores.accounts.get(o.accountId);
    const industry = account?.industry || 'Other';
    byIndustry[industry] = (byIndustry[industry] || 0) + o.value;
  });
  return byIndustry;
}

function calculateRevenueBySource(opportunities) {
  const leads = Array.from(dataStores.leads.values());
  const bySource = {};

  opportunities.filter(o => o.leadId).forEach(o => {
    const lead = leads.find(l => l.id === o.leadId);
    const source = lead?.source || 'direct';
    bySource[source] = (bySource[source] || 0) + o.value;
  });
  return bySource;
}

function calculateWinRate(opportunities) {
  const closed = opportunities.filter(o => ['closed_won', 'closed_lost'].includes(o.stage));
  const won = opportunities.filter(o => o.stage === 'closed_won');
  return closed.length > 0 ? ((won.length / closed.length) * 100).toFixed(1) : 0;
}

function calculateAvgDealSize(opportunities) {
  const won = opportunities.filter(o => o.stage === 'closed_won');
  return won.length > 0 ? Math.round(won.reduce((sum, o) => sum + o.value, 0) / won.length) : 0;
}

function calculateSalesCycle(opportunities) {
  const won = opportunities.filter(o => o.stage === 'closed_won');
  if (won.length === 0) return 0;

  const totalDays = won.reduce((sum, o) => {
    const created = new Date(o.createdAt);
    const updated = new Date(o.updatedAt);
    return sum + Math.ceil((updated - created) / (1000 * 60 * 60 * 24));
  }, 0);

  return Math.round(totalDays / won.length);
}

// Cohort Analysis
app.get('/api/revenue/cohorts', (req, res) => {
  const customers = Array.from(dataStores.customers.values());
  const subscriptions = Array.from(dataStores.subscriptions.values());

  const cohorts = customers.map(cus => {
    const sub = subscriptions.find(s => s.customerId === cus.id);
    const startDate = new Date(cus.contractValue ? '2026-01-01' : sub?.startDate || new Date().toISOString());
    const monthsActive = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24 * 30));

    return {
      cohort: startDate.toISOString().slice(0, 7),
      customerId: cus.id,
      initialValue: sub?.arr || cus.contractValue || 0,
      monthsActive,
      currentValue: sub?.arr || cus.contractValue || 0,
      churned: cus.status === 'churned',
    };
  });

  res.json({ success: true, count: cohorts.length, cohorts });
});

// MRR/ARR Tracking
app.get('/api/revenue/mrr', (req, res) => {
  const subscriptions = Array.from(dataStores.subscriptions.values());

  const mrrData = {
    total: subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + s.mrr, 0),
    new: subscriptions.filter(s => s.status === 'active' && s.startDate > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).reduce((sum, s) => sum + s.mrr, 0),
    expansion: calculateExpansionARR(subscriptions),
    churned: subscriptions.filter(s => s.status === 'churned').reduce((sum, s) => sum + s.mrr, 0),
    netNew: 0,
  };

  mrrData.netNew = mrrData.new + mrrData.expansion - mrrData.churned;

  res.json({ success: true, mrr: mrrData });
});

app.get('/api/revenue/arr', (req, res) => {
  const subscriptions = Array.from(dataStores.subscriptions.values());

  const arrData = {
    total: subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + s.arr, 0),
    byPlan: {},
    byTier: {},
  };

  subscriptions.filter(s => s.status === 'active').forEach(s => {
    arrData.byPlan[s.plan] = (arrData.byPlan[s.plan] || 0) + s.arr;
    const customer = dataStores.customers.get(s.customerId);
    if (customer) {
      arrData.byTier[customer.tier] = (arrData.byTier[customer.tier] || 0) + s.arr;
    }
  });

  res.json({ success: true, arr: arrData });
});

// ============================================================
// PARTNER OS
// ============================================================

app.get('/api/partners', (req, res) => {
  const { type, tier, status } = req.query;
  let partners = Array.from(dataStores.partners.values());

  if (type) partners = partners.filter(p => p.type === type);
  if (tier) partners = partners.filter(p => p.tier === tier);
  if (status) partners = partners.filter(p => p.status === status);

  // Add computed fields
  partners = partners.map(par => ({
    ...par,
    performance: dataStores.partnerPerformance.get(par.id),
    recentDeals: Array.from(dataStores.partnerDeals.values()).filter(d => d.partnerId === par.id).slice(0, 5),
  }));

  res.json({ success: true, count: partners.length, partners });
});

app.get('/api/partners/:id', (req, res) => {
  const partner = dataStores.partners.get(req.params.id);
  if (!partner) return res.status(404).json({ success: false, error: 'Partner not found' });

  const deals = Array.from(dataStores.partnerDeals.values()).filter(d => d.partnerId === req.params.id);
  const commissions = Array.from(dataStores.partnerCommissions.values()).filter(c => c.partnerId === req.params.id);

  res.json({ success: true, partner, deals, commissions });
});

app.post('/api/partners', requireAuth, (req, res) => {
  const { name, type, tier, region, contactEmail, contactName } = req.body;

  const partner = {
    id: `PAR${String(dataStores.partners.size + 1).padStart(3, '0')}`,
    name,
    type: type || 'reseller',
    tier: tier || 'bronze',
    status: 'active',
    region: region || 'All',
    commission: type === 'reseller' ? 15 : type === 'si' ? 20 : 10,
    deals: 0,
    revenue: 0,
    contactEmail: contactEmail || '',
    contactName: contactName || '',
    createdAt: new Date().toISOString(),
  };

  dataStores.partners.set(partner.id, partner);
  res.status(201).json({ success: true, partner });
});

app.patch('/api/partners/:id', requireAuth, (req, res) => {
  const partner = dataStores.partners.get(req.params.id);
  if (!partner) return res.status(404).json({ success: false, error: 'Partner not found' });

  const updated = { ...partner, ...req.body };
  dataStores.partners.set(req.params.id, updated);
  res.json({ success: true, partner: updated });
});

// Partner Deals
app.post('/api/partners/:id/deals', requireAuth, (req, res) => {
  const partner = dataStores.partners.get(req.params.id);
  if (!partner) return res.status(404).json({ success: false, error: 'Partner not found' });

  const { opportunityId, value, commission, status } = req.body;

  const deal = {
    id: `PDL${dataStores.partnerDeals.size + 1}`,
    partnerId: req.params.id,
    opportunityId,
    value: parseFloat(value) || 0,
    commission: commission || partner.commission,
    commissionValue: (value || 0) * (commission || partner.commission) / 100,
    status: status || 'pending',
    createdAt: new Date().toISOString(),
  };

  dataStores.partnerDeals.set(deal.id, deal);

  // Update partner metrics
  partner.deals++;
  partner.revenue += deal.value;
  dataStores.partners.set(partner.id, partner);

  res.status(201).json({ success: true, deal });
});

// Partner Commissions
app.get('/api/partner-commissions', (req, res) => {
  const { partnerId, status } = req.query;
  let commissions = Array.from(dataStores.partnerCommissions.values());

  if (partnerId) commissions = commissions.filter(c => c.partnerId === partnerId);
  if (status) commissions = commissions.filter(c => c.status === status);

  commissions = commissions.map(c => ({
    ...c,
    partner: dataStores.partners.get(c.partnerId),
  }));

  res.json({ success: true, count: commissions.length, commissions });
});

app.post('/api/partner-commissions/calculate', requireAuth, (req, res) => {
  const { partnerId, period } = req.body;

  const deals = Array.from(dataStores.partnerDeals.values()).filter(d =>
    d.partnerId === partnerId && d.status === 'closed_won'
  );

  const totalCommission = deals.reduce((sum, d) => sum + d.commissionValue, 0);

  const commission = {
    id: `PCM${dataStores.partnerCommissions.size + 1}`,
    partnerId,
    period: period || new Date().toISOString().slice(0, 7),
    dealsCount: deals.length,
    totalValue: deals.reduce((sum, d) => sum + d.value, 0),
    commissionRate: deals[0]?.commission || 15,
    totalCommission,
    status: 'calculated',
    createdAt: new Date().toISOString(),
  };

  dataStores.partnerCommissions.set(commission.id, commission);
  res.status(201).json({ success: true, commission });
});

// ============================================================
// SALES ENABLEMENT
// ============================================================

app.get('/api/content', (req, res) => {
  const { category, type } = req.query;
  let content = Array.from(dataStores.content.values());

  if (category) content = content.filter(c => c.category === category);
  if (type) content = content.filter(c => c.type === type);

  res.json({ success: true, count: content.length, content });
});

app.get('/api/content/:id', (req, res) => {
  const content = dataStores.content.get(req.params.id);
  if (!content) return res.status(404).json({ success: false, error: 'Content not found' });

  res.json({ success: true, content });
});

app.post('/api/content', requireAuth, (req, res) => {
  const { title, type, category, description, tags, url } = req.body;

  const contentItem = {
    id: `CNT${String(dataStores.content.size + 1).padStart(3, '0')}`,
    title,
    type: type || 'document',
    category: category || 'general',
    description: description || '',
    tags: tags || [],
    url: url || '',
    views: 0,
    downloads: 0,
    lastUpdated: new Date().toISOString(),
    createdBy: req.user.userId,
    createdAt: new Date().toISOString(),
  };

  dataStores.content.set(contentItem.id, contentItem);
  res.status(201).json({ success: true, content: contentItem });
});

app.post('/api/content/:id/view', requireAuth, (req, res) => {
  const content = dataStores.content.get(req.params.id);
  if (!content) return res.status(404).json({ success: false, error: 'Content not found' });

  content.views++;
  dataStores.content.set(content.id, content);
  res.json({ success: true, views: content.views });
});

app.post('/api/content/:id/download', requireAuth, (req, res) => {
  const content = dataStores.content.get(req.params.id);
  if (!content) return res.status(404).json({ success: false, error: 'Content not found' });

  content.downloads++;
  dataStores.content.set(content.id, content);
  res.json({ success: true, downloads: content.downloads });
});

// Training Modules
app.get('/api/training', (req, res) => {
  const training = Array.from(dataStores.trainingModules.values());
  res.json({ success: true, count: training.length, training });
});

app.get('/api/training/:id', (req, res) => {
  const training = dataStores.trainingModules.get(req.params.id);
  if (!training) return res.status(404).json({ success: false, error: 'Training not found' });

  res.json({ success: true, training });
});

app.post('/api/training/:id/complete', requireAuth, (req, res) => {
  const training = dataStores.trainingModules.get(req.params.id);
  if (!training) return res.status(404).json({ success: false, error: 'Training not found' });

  training.completions++;
  dataStores.trainingModules.set(training.id, training);

  res.json({ success: true, training });
});

// Certifications
app.get('/api/certifications', (req, res) => {
  const certifications = Array.from(dataStores.certifications.values());
  res.json({ success: true, count: certifications.length, certifications });
});

app.post('/api/certifications', requireAuth, (req, res) => {
  const { name, description, validity, examUrl } = req.body;

  const certification = {
    id: `CERT${String(dataStores.certifications.size + 1).padStart(3, '0')}`,
    name,
    description: description || '',
    validity: validity || 365,
    examUrl: examUrl || '',
    createdAt: new Date().toISOString(),
  };

  dataStores.certifications.set(certification.id, certification);
  res.status(201).json({ success: true, certification });
});

// Battle Cards
app.get('/api/battle-cards', (req, res) => {
  const cards = Array.from(dataStores.battleCards.values());
  res.json({ success: true, count: cards.length, battleCards: cards });
});

app.get('/api/battle-cards/:competitor', (req, res) => {
  const card = Array.from(dataStores.battleCards.values()).find(b => b.competitor === req.params.competitor);
  if (!card) return res.status(404).json({ success: false, error: 'Battle card not found' });

  res.json({ success: true, battleCard: card });
});

// Playbooks
app.get('/api/playbooks', (req, res) => {
  const playbooks = Array.from(dataStores.playbooks.values());
  res.json({ success: true, count: playbooks.length, playbooks });
});

// ============================================================
// CALL/MEETING INTELLIGENCE
// ============================================================

app.get('/api/recordings', (req, res) => {
  const recordings = Array.from(dataStores.recordings.values());
  res.json({ success: true, count: recordings.length, recordings });
});

app.post('/api/recordings', requireAuth, (req, res) => {
  const { meetingId, url, duration, participants } = req.body;

  const recording = {
    id: `REC${dataStores.recordings.size + 1}`,
    meetingId,
    url,
    duration,
    participants: participants || [],
    status: 'uploaded',
    createdAt: new Date().toISOString(),
  };

  dataStores.recordings.set(recording.id, recording);
  res.status(201).json({ success: true, recording });
});

// Transcripts
app.get('/api/transcripts', (req, res) => {
  const { recordingId } = req.query;
  let transcripts = Array.from(dataStores.transcripts.values());

  if (recordingId) transcripts = transcripts.filter(t => t.recordingId === recordingId);

  res.json({ success: true, count: transcripts.length, transcripts });
});

app.post('/api/transcripts', requireAuth, (req, res) => {
  const { recordingId, content, language } = req.body;

  const transcript = {
    id: `TRAN${dataStores.transcripts.size + 1}`,
    recordingId,
    content: content || '',
    language: language || 'en',
    wordCount: (content || '').split(/\s+/).length,
    createdAt: new Date().toISOString(),
  };

  dataStores.transcripts.set(transcript.id, transcript);
  res.status(201).json({ success: true, transcript });
});

// Sentiment Analysis
app.post('/api/sentiment/analyze', requireAuth, (req, res) => {
  const { text } = req.body;

  // Simulate AI sentiment analysis
  const words = (text || '').toLowerCase().split(/\s+/);
  const positiveWords = ['great', 'excellent', 'amazing', 'love', 'perfect', 'happy', 'good', 'wonderful'];
  const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'poor', 'disappointed', 'frustrated', 'angry'];

  let positive = 0;
  let negative = 0;

  words.forEach(word => {
    if (positiveWords.includes(word)) positive++;
    if (negativeWords.includes(word)) negative++;
  });

  const total = positive + negative;
  const score = total > 0 ? Math.round(((positive - negative) / total) * 50 + 50) : 50;

  const sentiment = {
    score,
    label: score >= 70 ? 'positive' : score >= 40 ? 'neutral' : 'negative',
    positiveSignals: positive,
    negativeSignals: negative,
    confidence: 85 + Math.round(Math.random() * 10),
  };

  // Store if transcript provided
  if (req.body.transcriptId) {
    sentiment.transcriptId = req.body.transcriptId;
    dataStores.sentimentAnalysis.set(req.body.transcriptId, sentiment);
  }

  res.json({ success: true, sentiment });
});

// Call Metrics
app.get('/api/call-metrics', (req, res) => {
  const { ownerId } = req.query;
  const reps = ownerId ? [ownerId] : Array.from(dataStores.salesReps.keys());

  const metrics = reps.map(rid => {
    const rep = dataStores.salesReps.get(rid);
    const callData = dataStores.callMetrics.get(rid) || { total: 0, duration: 0, outcomes: {} };

    return {
      repId: rid,
      repName: rep?.name,
      totalCalls: callData.total,
      totalDuration: callData.duration,
      avgDuration: callData.total > 0 ? Math.round(callData.duration / callData.total) : 0,
      outcomes: callData.outcomes,
      connectRate: callData.total > 0 ? ((callData.outcomes['connected'] || 0) / callData.total * 100).toFixed(1) : 0,
    };
  });

  res.json({ success: true, count: metrics.length, metrics });
});

// ============================================================
// WORKFLOW AUTOMATION
// ============================================================

app.get('/api/workflows', (req, res) => {
  const workflows = Array.from(dataStores.workflows.values());
  res.json({ success: true, count: workflows.length, workflows });
});

app.get('/api/workflows/:id', (req, res) => {
  const workflow = dataStores.workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ success: false, error: 'Workflow not found' });

  const runs = Array.from(dataStores.workflowRuns.values()).filter(r => r.workflowId === req.params.id).slice(0, 10);

  res.json({ success: true, workflow, recentRuns: runs });
});

app.post('/api/workflows', requireAuth, (req, res) => {
  const { name, trigger, steps, description } = req.body;

  const workflow = {
    id: `WF${String(dataStores.workflows.size + 1).padStart(3, '0')}`,
    name,
    trigger,
    steps: steps || [],
    description: description || '',
    status: 'active',
    runs: 0,
    createdBy: req.user.userId,
    createdAt: new Date().toISOString(),
  };

  dataStores.workflows.set(workflow.id, workflow);
  res.status(201).json({ success: true, workflow });
});

app.patch('/api/workflows/:id', requireAuth, (req, res) => {
  const workflow = dataStores.workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ success: false, error: 'Workflow not found' });

  const updated = { ...workflow, ...req.body };
  dataStores.workflows.set(req.params.id, updated);
  res.json({ success: true, workflow: updated });
});

app.post('/api/workflows/:id/trigger', requireAuth, (req, res) => {
  const workflow = dataStores.workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ success: false, error: 'Workflow not found' });

  const { context } = req.body;

  // Log workflow run
  const run = {
    id: `WFR${dataStores.workflowRuns.size + 1}`,
    workflowId: workflow.id,
    context,
    status: 'running',
    startedAt: new Date().toISOString(),
  };

  dataStores.workflowRuns.set(run.id, run);

  // Execute steps (simulated)
  executeWorkflow(workflow, context, run);

  workflow.runs++;
  dataStores.workflows.set(workflow.id, workflow);

  res.json({ success: true, run });
});

function triggerWorkflow(trigger, context) {
  const workflows = Array.from(dataStores.workflows.values()).filter(w => w.trigger === trigger && w.status === 'active');

  workflows.forEach(workflow => {
    const run = {
      id: `WFR${dataStores.workflowRuns.size + 1}`,
      workflowId: workflow.id,
      context,
      status: 'running',
      startedAt: new Date().toISOString(),
    };
    dataStores.workflowRuns.set(run.id, run);
    workflow.runs++;
    executeWorkflow(workflow, context, run);
  });
}

function executeWorkflow(workflow, context, run) {
  // Simulate workflow execution
  workflow.steps.forEach((step, index) => {
    // In production, each step would be executed
    console.log(`[Workflow ${workflow.id}] Executing step ${index + 1}: ${step}`);
  });

  run.status = 'completed';
  run.completedAt = new Date().toISOString();
  dataStores.workflowRuns.set(run.id, run);
}

// Automation Rules
app.get('/api/automation-rules', (req, res) => {
  const rules = Array.from(dataStores.automationRules.values());
  res.json({ success: true, count: rules.length, rules });
});

app.post('/api/automation-rules', requireAuth, (req, res) => {
  const { name, condition, action, enabled } = req.body;

  const rule = {
    id: `AUR${dataStores.automationRules.size + 1}`,
    name,
    condition,
    action,
    enabled: enabled !== false,
    createdBy: req.user.userId,
    createdAt: new Date().toISOString(),
  };

  dataStores.automationRules.set(rule.id, rule);
  res.status(201).json({ success: true, rule });
});

// ============================================================
// COMMISSION OS
// ============================================================

app.get('/api/commissions/plans', (req, res) => {
  const plans = Array.from(dataStores.commissionPlans.values());
  res.json({ success: true, count: plans.length, plans });
});

app.get('/api/commissions/plans/:id', (req, res) => {
  const plan = dataStores.commissionPlans.get(req.params.id);
  if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });

  res.json({ success: true, plan });
});

app.post('/api/commissions/plans', requireAuth, (req, res) => {
  const { name, type, rate, accelerators, bonuses, effectiveDate } = req.body;

  const plan = {
    id: `CP${String(dataStores.commissionPlans.size + 1).padStart(3, '0')}`,
    name,
    type: type || 'percentage',
    rate: rate || 10,
    accelerators: accelerators || {},
    bonuses: bonuses || {},
    effectiveDate: effectiveDate || new Date().toISOString(),
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  dataStores.commissionPlans.set(plan.id, plan);
  res.status(201).json({ success: true, plan });
});

app.get('/api/commissions/calculations', (req, res) => {
  const { repId, period } = req.query;
  let commissions = Array.from(dataStores.commissions.values());

  if (repId) commissions = commissions.filter(c => c.repId === repId);
  if (period) commissions = commissions.filter(c => c.period === period);

  commissions = commissions.map(c => ({
    ...c,
    rep: dataStores.salesReps.get(c.repId),
  }));

  res.json({ success: true, count: commissions.length, commissions });
});

app.post('/api/commissions/calculate', requireAuth, (req, res) => {
  const { repId, period } = req.body;

  const rep = dataStores.salesReps.get(repId);
  if (!rep) return res.status(404).json({ success: false, error: 'Sales rep not found' });

  // Find closed won opportunities for this rep in the period
  const periodStart = new Date(period + '-01');
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const closedWonDeals = Array.from(dataStores.opportunities.values()).filter(o =>
    o.ownerId === repId &&
    o.stage === 'closed_won' &&
    new Date(o.updatedAt) >= periodStart &&
    new Date(o.updatedAt) < periodEnd
  );

  const plan = dataStores.commissionPlans.values().next().value;
  const baseRate = plan?.rate || 10;

  // Calculate commission with accelerators
  let totalCommission = 0;
  const dealCommissions = closedWonDeals.map(deal => {
    let rate = baseRate;
    let commission = deal.value * rate / 100;

    // Check accelerators
    const attainment = rep.quota > 0 ? ((rep.achieved / rep.quota) * 100) : 100;
    if (plan?.accelerators?.tier2 && attainment >= plan.accelerators.tier2.threshold) {
      rate = plan.accelerators.tier2.rate;
    } else if (plan?.accelerators?.tier1 && attainment >= plan.accelerators.tier1.threshold) {
      rate = plan.accelerators.tier1.rate;
    }

    commission = deal.value * rate / 100;

    return {
      dealId: deal.id,
      dealValue: deal.value,
      rate,
      commission,
    };
  });

  totalCommission = dealCommissions.reduce((sum, d) => sum + d.commission, 0);

  const calculation = {
    id: `CALC${dataStores.commissions.size + 1}`,
    repId,
    repName: rep.name,
    period,
    closedDeals: closedWonDeals.length,
    totalValue: closedWonDeals.reduce((sum, d) => sum + d.value, 0),
    dealCommissions,
    baseRate,
    totalCommission,
    status: 'calculated',
    createdAt: new Date().toISOString(),
  };

  dataStores.commissions.set(calculation.id, calculation);
  res.status(201).json({ success: true, calculation });
});

app.get('/api/commissions/payouts', (req, res) => {
  const payouts = Array.from(dataStores.commissionPayouts.values());
  res.json({ success: true, count: payouts.length, payouts });
});

app.post('/api/commissions/payouts', requireAuth, (req, res) => {
  const { calculationId, bankDetails } = req.body;

  const calculation = dataStores.commissions.get(calculationId);
  if (!calculation) return res.status(404).json({ success: false, error: 'Calculation not found' });

  const payout = {
    id: `PAY${dataStores.commissionPayouts.size + 1}`,
    calculationId,
    repId: calculation.repId,
    amount: calculation.totalCommission,
    status: 'pending',
    bankDetails: bankDetails || {},
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  dataStores.commissionPayouts.set(payout.id, payout);
  res.status(201).json({ success: true, payout });
});

// SPIFFs (Spot Bonuses)
app.get('/api/spiffs', (req, res) => {
  const spiffs = Array.from(dataStores.spiffs.values());
  res.json({ success: true, count: spiffs.length, spiffs });
});

app.post('/api/spiffs', requireAuth, (req, res) => {
  const { name, amount, criteria, validUntil } = req.body;

  const spiff = {
    id: `SPIFF${dataStores.spiffs.size + 1}`,
    name,
    amount,
    criteria: criteria || '',
    validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    claimedBy: [],
    createdAt: new Date().toISOString(),
  };

  dataStores.spiffs.set(spiff.id, spiff);
  res.status(201).json({ success: true, spiff });
});

// ============================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================

app.get('/api/subscriptions', (req, res) => {
  const { accountId, status, plan } = req.query;
  let subscriptions = Array.from(dataStores.subscriptions.values());

  if (accountId) subscriptions = subscriptions.filter(s => s.accountId === accountId);
  if (status) subscriptions = subscriptions.filter(s => s.status === status);
  if (plan) subscriptions = subscriptions.filter(s => s.plan === plan);

  subscriptions = subscriptions.map(sub => ({
    ...sub,
    account: dataStores.accounts.get(sub.accountId),
    daysToNextBilling: Math.ceil((new Date(sub.nextBilling) - new Date()) / (1000 * 60 * 60 * 24)),
  }));

  res.json({ success: true, count: subscriptions.length, subscriptions });
});

app.get('/api/subscriptions/:id', (req, res) => {
  const subscription = dataStores.subscriptions.get(req.params.id);
  if (!subscription) return res.status(404).json({ success: false, error: 'Subscription not found' });

  const account = dataStores.accounts.get(subscription.accountId);
  const customer = dataStores.customers.get(subscription.customerId);
  const changes = Array.from(dataStores.subscriptionChanges.values()).filter(c => c.subscriptionId === req.params.id);
  const billingHistory = Array.from(dataStores.billingSchedules.values()).filter(b => b.subscriptionId === req.params.id);

  res.json({ success: true, subscription, account, customer, changes, billingHistory });
});

app.post('/api/subscriptions', requireAuth, (req, res) => {
  const { accountId, customerId, plan, mrr, seats, startDate } = req.body;

  const subscription = {
    id: `SUB${String(dataStores.subscriptions.size + 1).padStart(4, '0')}`,
    accountId,
    customerId,
    plan: plan || 'starter',
    mrr: parseFloat(mrr) || 0,
    arr: (parseFloat(mrr) || 0) * 12,
    status: 'active',
    seats: seats || 1,
    startDate: startDate || new Date().toISOString(),
    nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  dataStores.subscriptions.set(subscription.id, subscription);

  // Create billing schedule
  const billingSchedule = {
    id: `BILL${dataStores.billingSchedules.size + 1}`,
    subscriptionId: subscription.id,
    amount: subscription.mrr,
    status: 'scheduled',
    dueDate: subscription.nextBilling,
    createdAt: new Date().toISOString(),
  };
  dataStores.billingSchedules.set(billingSchedule.id, billingSchedule);

  res.status(201).json({ success: true, subscription });
});

app.post('/api/subscriptions/:id/upgrade', requireAuth, (req, res) => {
  const subscription = dataStores.subscriptions.get(req.params.id);
  if (!subscription) return res.status(404).json({ success: false, error: 'Subscription not found' });

  const { newPlan, newMrr, newSeats } = req.body;

  const change = {
    id: `CHG${dataStores.subscriptionChanges.size + 1}`,
    subscriptionId: subscription.id,
    type: 'upgrade',
    previousPlan: subscription.plan,
    newPlan,
    previousMrr: subscription.mrr,
    newMrr,
    previousSeats: subscription.seats,
    newSeats,
    effectiveDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  dataStores.subscriptionChanges.set(change.id, change);

  subscription.plan = newPlan;
  subscription.mrr = newMrr;
  subscription.arr = newMrr * 12;
  subscription.seats = newSeats;
  subscription.upgradedAt = new Date().toISOString();
  dataStores.subscriptions.set(subscription.id, subscription);

  res.json({ success: true, subscription, change });
});

app.post('/api/subscriptions/:id/cancel', requireAuth, (req, res) => {
  const subscription = dataStores.subscriptions.get(req.params.id);
  if (!subscription) return res.status(404).json({ success: false, error: 'Subscription not found' });

  const { reason, cancellationDate } = req.body;

  subscription.status = 'cancelled';
  subscription.cancellationReason = reason;
  subscription.cancellationDate = cancellationDate || new Date().toISOString();
  subscription.effectiveEndDate = subscription.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  dataStores.subscriptions.set(subscription.id, subscription);

  res.json({ success: true, subscription });
});

// ============================================================
// CAMPAIGNS
// ============================================================

app.get('/api/campaigns', (req, res) => {
  const campaigns = Array.from(dataStores.campaigns.values());
  res.json({ success: true, count: campaigns.length, campaigns });
});

app.get('/api/campaigns/:id', (req, res) => {
  const campaign = dataStores.campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

  const leads = Array.from(dataStores.leads.values()).filter(l => l.campaignId === req.params.id);

  res.json({ success: true, campaign, leads });
});

app.post('/api/campaigns', requireAuth, (req, res) => {
  const { name, type, status, budget, startDate, endDate } = req.body;

  const campaign = {
    id: `CMP${String(dataStores.campaigns.size + 1).padStart(3, '0')}`,
    name,
    type: type || 'email',
    status: status || 'draft',
    budget: budget || 0,
    leadsGenerated: 0,
    conversion: 0,
    startDate,
    endDate,
    createdBy: req.user.userId,
    createdAt: new Date().toISOString(),
  };

  dataStores.campaigns.set(campaign.id, campaign);
  res.status(201).json({ success: true, campaign });
});

// ============================================================
// ANALYTICS & REPORTS
// ============================================================

app.get('/api/analytics/overview', (req, res) => {
  const opportunities = Array.from(dataStores.opportunities.values());
  const leads = Array.from(dataStores.leads.values());
  const customers = Array.from(dataStores.customers.values());

  const totalPipeline = opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage)).reduce((sum, o) => sum + o.value, 0);
  const closedWon = opportunities.filter(o => o.stage === 'closed_won').reduce((sum, o) => sum + o.value, 0);
  const closedLost = opportunities.filter(o => o.stage === 'closed_lost').reduce((sum, o) => sum + o.value, 0);

  res.json({
    success: true,
    overview: {
      totalLeads: leads.length,
      activeLeads: leads.filter(l => l.status !== 'converted').length,
      hotLeads: leads.filter(l => l.temperature === 'hot').length,
      totalOpportunities: opportunities.length,
      activeOpportunities: opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage)).length,
      totalPipeline,
      closedWon,
      closedLost,
      avgDealSize: opportunities.length > 0 ? Math.round(opportunities.reduce((sum, o) => sum + o.value, 0) / opportunities.length) : 0,
      winRate: calculateWinRate(opportunities),
      conversionRate: ((leads.filter(l => l.status === 'converted').length / Math.max(1, leads.length)) * 100).toFixed(1),
      avgHealthScore: Math.round(customers.reduce((sum, c) => sum + (c.healthScore || 50), 0) / Math.max(1, customers.length)),
      mrr: Array.from(dataStores.subscriptions.values()).filter(s => s.status === 'active').reduce((sum, s) => sum + s.mrr, 0),
    },
  });
});

app.get('/api/analytics/forecast', (req, res) => {
  const opportunities = Array.from(dataStores.opportunities.values());
  const forecast = calculateForecast(opportunities, 'Q2-2026');
  res.json({ success: true, forecast });
});

app.get('/api/analytics/rep-performance', (req, res) => {
  const reps = Array.from(dataStores.salesReps.values());
  const performance = reps.map(rep => ({
    ...calculateRepMetrics(rep.id),
    repId: rep.id,
    name: rep.name,
    territory: rep.territory,
  }));
  res.json({ success: true, performance });
});

app.get('/api/analytics/conversion-funnel', (req, res) => {
  const opportunities = Array.from(dataStores.opportunities.values());
  const leads = Array.from(dataStores.leads.values());

  const funnel = [
    { stage: 'Leads', count: leads.length, value: leads.reduce((sum, l) => sum + l.value, 0) },
    { stage: 'Contacted', count: leads.filter(l => l.status === 'contacted').length, value: 0 },
    { stage: 'Qualified', count: opportunities.filter(o => o.stage !== 'lead').length, value: opportunities.filter(o => o.stage !== 'lead').reduce((sum, o) => sum + o.value, 0) },
    { stage: 'Proposal', count: opportunities.filter(o => ['proposal', 'negotiation'].includes(o.stage)).length, value: opportunities.filter(o => ['proposal', 'negotiation'].includes(o.stage)).reduce((sum, o) => sum + o.value, 0) },
    { stage: 'Negotiation', count: opportunities.filter(o => o.stage === 'negotiation').length, value: opportunities.filter(o => o.stage === 'negotiation').reduce((sum, o) => sum + o.value, 0) },
    { stage: 'Closed Won', count: opportunities.filter(o => o.stage === 'closed_won').length, value: opportunities.filter(o => o.stage === 'closed_won').reduce((sum, o) => sum + o.value, 0) },
  ];

  res.json({ success: true, funnel });
});

app.get('/api/analytics/pipeline-health', (req, res) => {
  const opportunities = Array.from(dataStores.opportunities.values());
  const activeOpps = opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage));

  const health = {
    total: activeOpps.length,
    healthy: activeOpps.filter(o => ['proposal', 'negotiation'].includes(o.stage)).length,
    stale: activeOpps.filter(o => {
      const daysInStage = Math.floor((Date.now() - new Date(o.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
      return daysInStage > 14;
    }).length,
    atRisk: activeOpps.filter(o => o.probability >= 70 && o.probability < 90).length,
    byStage: {},
  };

  ['lead', 'qualified', 'proposal', 'negotiation'].forEach(stage => {
    health.byStage[stage] = activeOpps.filter(o => o.stage === stage).length;
  });

  res.json({ success: true, health });
});

// ============================================================
// AI COPILOT ENDPOINTS
// ============================================================

app.post('/api/copilot/suggest', requireAuth, (req, res) => {
  const { action, context } = req.body;

  const suggestions = {
    next_best_action: [
      'Follow up with TechCorp India - proposal pending for 5 days',
      'Schedule demo for Global Retail Solutions - high intent signal',
      'Send case study to FinServe Financial - building trust',
      'Create renewal proposal for HealthFirst Hospitals - 30 days to expiry',
    ],
    lead_scoring: [
      'LD003 (Rajesh Mehta) - High priority, schedule call today',
      'LD001 (Vikram Singh) - Score increased to 85, ready for proposal',
    ],
    pricing: [
      'Consider 10% discount for Enterprise deals > 10L',
      'Bundle products for 15% discount to close faster',
      'Premium pricing justified for Healthcare vertical',
    ],
    coaching: [
      'Review LD002 conversation - qualification needs improvement',
      'Opportunity OPP003 needs more discovery questions',
      'Consider executive meeting for TechCorp deal',
    ],
  };

  res.json({ success: true, suggestions: suggestions[action] || [], action });
});

// AI Agent Task Execution
app.post('/api/agents/:id/execute', requireAuth, (req, res) => {
  const agent = dataStores.aiAgents.get(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  const { task, parameters } = req.body;

  const agentTask = {
    id: `AGTASK${dataStores.agentTasks.size + 1}`,
    agentId: req.params.id,
    agentName: agent.name,
    task,
    parameters: parameters || {},
    status: 'running',
    createdBy: req.user.userId,
    startedAt: new Date().toISOString(),
  };

  dataStores.agentTasks.set(agentTask.id, agentTask);

  // Simulate AI task execution
  setTimeout(() => {
    agentTask.status = 'completed';
    agentTask.result = simulateAgentTask(agent.type, task, parameters);
    agentTask.completedAt = new Date().toISOString();
    dataStores.agentTasks.set(agentTask.id, agentTask);

    agent.tasks++;
    dataStores.aiAgents.set(agent.id, agent);
  }, 500);

  res.json({ success: true, task: agentTask });
});

function simulateAgentTask(type, task, params) {
  const results = {
    scoring: { score: 75, confidence: 0.92, factors: ['engagement', 'demographics', 'behavior'] },
    churn: { riskLevel: 'medium', score: 65, recommendations: ['Schedule check-in call', 'Review usage data'] },
    forecast: { predicted: 2500000, confidence: 0.88, factors: ['historical', 'seasonal', 'pipeline'] },
    pricing: { optimalPrice: 45000, discountRange: '0-15%', margin: 0.55 },
    nba: { action: 'Schedule demo', reason: 'High engagement score', priority: 1 },
  };

  return results[type] || { status: 'completed', message: 'Task executed successfully' };
}

app.get('/api/agents', (req, res) => {
  const agents = Array.from(dataStores.aiAgents.values());
  res.json({ success: true, count: agents.length, agents });
});

app.get('/api/agents/:id', (req, res) => {
  const agent = dataStores.aiAgents.get(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  const tasks = Array.from(dataStores.agentTasks.values()).filter(t => t.agentId === req.params.id).slice(0, 10);

  res.json({ success: true, agent, recentTasks: tasks });
});

app.get('/api/agents/:id/tasks', (req, res) => {
  const tasks = Array.from(dataStores.agentTasks.values()).filter(t => t.agentId === req.params.id);
  res.json({ success: true, count: tasks.length, tasks });
});

// ============================================================
// DASHBOARD
// ============================================================

app.get('/api/dashboard', (req, res) => {
  const opportunities = Array.from(dataStores.opportunities.values());
  const leads = Array.from(dataStores.leads.values());
  const tasks = Array.from(dataStores.tasks.values());
  const customers = Array.from(dataStores.customers.values());
  const subscriptions = Array.from(dataStores.subscriptions.values());

  // Recent activities
  const recentActivities = Array.from(dataStores.activities.values())
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  // Upcoming tasks
  const upcomingTasks = tasks
    .filter(t => t.status === 'pending')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  // Hot deals
  const hotDeals = opportunities
    .filter(o => o.probability >= 50 && !['closed_won', 'closed_lost'].includes(o.stage))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map(o => ({
      ...o,
      accountName: dataStores.accounts.get(o.accountId)?.name,
      ownerName: dataStores.salesReps.get(o.ownerId)?.name,
    }));

  // At-risk customers
  const atRiskCustomers = customers
    .filter(c => c.status === 'at-risk' || c.healthScore < 60)
    .slice(0, 5);

  // Upcoming renewals
  const upcomingRenewals = customers
    .filter(c => {
      const days = Math.ceil((new Date(c.renewalDate) - new Date()) / (1000 * 60 * 60 * 24));
      return days <= 60 && days > 0;
    })
    .sort((a, b) => new Date(a.renewalDate) - new Date(b.renewalDate))
    .slice(0, 5);

  // Pipeline summary
  const pipelineSummary = {
    total: opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage)).reduce((sum, o) => sum + o.value, 0),
    count: opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage)).length,
    weighted: opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage)).reduce((sum, o) => sum + o.weightedValue, 0),
  };

  res.json({
    success: true,
    dashboard: {
      pipeline: pipelineSummary,
      newLeads: leads.filter(l => l.status === 'new').length,
      hotLeads: leads.filter(l => l.temperature === 'hot').length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      closedWonThisMonth: opportunities.filter(o => o.stage === 'closed_won').reduce((sum, o) => sum + o.value, 0),
      mrr: subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + s.mrr, 0),
      avgHealthScore: Math.round(customers.reduce((sum, c) => sum + (c.healthScore || 50), 0) / Math.max(1, customers.length)),
      recentActivities,
      upcomingTasks,
      hotDeals,
      atRiskCustomers,
      upcomingRenewals,
    },
  });
});

// ============================================================
// GCC/ENTERPRISE FEATURES
// ============================================================

app.get('/api/currencies/rates', (req, res) => {
  const rates = Array.from(dataStores.multiCurrencyRates.values());
  res.json({ success: true, rates });
});

app.post('/api/currencies/convert', requireAuth, (req, res) => {
  const { amount, from, to } = req.body;

  const fromRate = dataStores.multiCurrencyRates.get(from)?.rate || 1;
  const toRate = dataStores.multiCurrencyRates.get(to)?.rate || 1;

  const converted = (amount / fromRate) * toRate;

  res.json({
    success: true,
    conversion: {
      amount,
      from,
      to,
      rate: toRate / fromRate,
      converted: converted.toFixed(2),
    },
  });
});

app.get('/api/tax/configurations', (req, res) => {
  const configs = Array.from(dataStores.taxConfigurations.values());
  res.json({ success: true, configs });
});

app.post('/api/tax/calculate', requireAuth, (req, res) => {
  const { amount, region, type } = req.body;

  const config = dataStores.taxConfigurations.get(region);
  if (!config) return res.status(404).json({ success: false, error: 'Tax configuration not found' });

  const taxable = config.applicable.includes(type);
  const taxAmount = taxable ? (amount * config.rate / 100) : 0;

  res.json({
    success: true,
    tax: {
      region,
      type,
      taxable,
      rate: config.rate,
      taxType: config.type,
      taxAmount: taxAmount.toFixed(2),
      total: (amount + taxAmount).toFixed(2),
    },
  });
});

// Compliance & Audit
app.get('/api/audit/trail', (req, res) => {
  const { entityType, entityId, userId, date } = req.query;
  let trails = Array.from(dataStores.auditTrails.values());

  if (entityType) trails = trails.filter(t => t.entityType === entityType);
  if (entityId) trails = trails.filter(t => t.entityId === entityId);
  if (userId) trails = trails.filter(t => t.userId === userId);
  if (date) trails = trails.filter(t => t.timestamp.startsWith(date));

  trails.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({ success: true, count: trails.length, trails });
});

app.post('/api/audit/log', requireAuth, (req, res) => {
  const { entityType, entityId, action, changes, metadata } = req.body;

  const trail = {
    id: `AUD${dataStores.auditTrails.size + 1}`,
    entityType,
    entityId,
    action,
    changes: changes || {},
    metadata: metadata || {},
    userId: req.user.userId,
    userName: req.user.name,
    timestamp: new Date().toISOString(),
    ipAddress: req.ip,
  };

  dataStores.auditTrails.set(trail.id, trail);
  res.status(201).json({ success: true, trail });
});

// ============================================================
// TWIN OS INTEGRATION
// ============================================================

app.get('/api/twin/:type/:id', (req, res) => {
  const { type, id } = req.params;

  let twin = null;

  if (type === 'lead') {
    const lead = dataStores.leads.get(id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    twin = {
      id: `lead-twin-${id}`,
      type: 'lead',
      entityType: 'Lead',
      syncedAt: new Date().toISOString(),
      data: {
        ...lead,
        behavioralScore: lead.score,
        engagementLevel: lead.score > 70 ? 'high' : lead.score > 40 ? 'medium' : 'low',
        riskFactors: lead.score < 30 ? ['Low engagement', 'Missing data'] : [],
      },
    };
  } else if (type === 'account') {
    const account = dataStores.accounts.get(id);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    const opportunities = Array.from(dataStores.opportunities.values()).filter(o => o.accountId === id);

    twin = {
      id: `account-twin-${id}`,
      type: 'account',
      entityType: 'Account',
      syncedAt: new Date().toISOString(),
      data: {
        ...account,
        lifetimeValue: opportunities.filter(o => o.stage === 'closed_won').reduce((sum, o) => sum + o.value, 0),
        relationshipScore: 85,
        healthScore: 'good',
        totalOpportunities: opportunities.length,
        openOpportunities: opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage)).length,
      },
    };
  } else if (type === 'opportunity') {
    const opp = dataStores.opportunities.get(id);
    if (!opp) return res.status(404).json({ success: false, error: 'Opportunity not found' });

    twin = {
      id: `opp-twin-${id}`,
      type: 'opportunity',
      entityType: 'Opportunity',
      syncedAt: new Date().toISOString(),
      data: {
        ...opp,
        accountName: dataStores.accounts.get(opp.accountId)?.name,
        ownerName: dataStores.salesReps.get(opp.ownerId)?.name,
        stageHealth: calculateStageHealth(opp),
      },
    };
  } else if (type === 'customer') {
    const customer = dataStores.customers.get(id);
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

    const healthScore = dataStores.healthScores.get(`HS${id.slice(3)}`);
    const subscriptions = Array.from(dataStores.subscriptions.values()).filter(s => s.customerId === id);

    twin = {
      id: `customer-twin-${id}`,
      type: 'customer',
      entityType: 'Customer',
      syncedAt: new Date().toISOString(),
      data: {
        ...customer,
        healthScore,
        subscriptions,
        riskLevel: customer.healthScore < 50 ? 'critical' : customer.healthScore < 70 ? 'high' : 'normal',
      },
    };
  }

  if (!twin) {
    return res.status(400).json({ success: false, error: 'Invalid twin type' });
  }

  res.json({ success: true, twin });
});

function calculateStageHealth(opp) {
  const daysInStage = Math.floor((Date.now() - new Date(opp.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
  const expectedDays = { lead: 7, qualified: 14, proposal: 21, negotiation: 14 };

  if (daysInStage <= expectedDays[opp.stage]) return 'healthy';
  if (daysInStage <= expectedDays[opp.stage] * 1.5) return 'warning';
  return 'stale';
}

// ============================================================
// INTEGRATIONS
// ============================================================

app.get('/api/integrations', (req, res) => {
  const integrations = Array.from(dataStores.integrations.values());
  res.json({ success: true, integrations });
});

app.post('/api/integrations/:id/sync', requireAuth, (req, res) => {
  const integration = dataStores.integrations.get(req.params.id);
  if (!integration) return res.status(404).json({ success: false, error: 'Integration not found' });

  integration.lastSync = new Date().toISOString();
  integration.status = 'syncing';
  dataStores.integrations.set(integration.id, integration);

  // Simulate sync
  setTimeout(() => {
    integration.status = 'connected';
    dataStores.integrations.set(integration.id, integration);
  }, 1500);

  res.json({ success: true, integration });
});

app.get('/api/webhooks', (req, res) => {
  const webhooks = Array.from(dataStores.webhooks.values());
  res.json({ success: true, count: webhooks.length, webhooks });
});

app.post('/api/webhooks', requireAuth, (req, res) => {
  const { url, events, secret } = req.body;

  const webhook = {
    id: `WH${String(dataStores.webhooks.size + 1).padStart(3, '0')}`,
    url,
    events: events || [],
    secret: secret || crypto.randomBytes(16).toString('hex'),
    status: 'active',
    createdBy: req.user.userId,
    createdAt: new Date().toISOString(),
  };

  dataStores.webhooks.set(webhook.id, webhook);
  res.status(201).json({ success: true, webhook });
});

app.post('/api/webhooks/:id/test', requireAuth, (req, res) => {
  const webhook = dataStores.webhooks.get(req.params.id);
  if (!webhook) return res.status(404).json({ success: false, error: 'Webhook not found' });

  const testEvent = {
    type: 'test',
    timestamp: new Date().toISOString(),
    data: { message: 'Test webhook from Sales OS' },
  };

  // In production, this would send to the webhook URL
  res.json({ success: true, message: 'Test event sent', event: testEvent });
});

// ============================================================
// RTMN LAYER INTEGRATIONS
// ============================================================

app.get('/api/layer/intelligence', (req, res) => {
  res.json({
    success: true,
    layer: {
      name: 'Intelligence',
      description: 'HOJAI AI-powered sales intelligence',
      services: ['Lead Scoring Agent', 'Opportunity Intelligence', 'Churn Prediction', 'Sales Coach'],
      status: 'connected',
    },
  });
});

app.get('/api/layer/customer-growth', (req, res) => {
  res.json({
    success: true,
    layer: {
      name: 'Customer Growth',
      description: 'AdBazaar CRM and marketing integration',
      services: ['CRM Hub', 'Campaign Management', 'Loyalty Programs'],
      status: 'connected',
    },
  });
});

app.get('/api/layer/commerce', (req, res) => {
  res.json({
    success: true,
    layer: {
      name: 'Commerce',
      description: 'REZ-Merchant POS and order management',
      services: ['POS Service', 'Order Management', 'Inventory'],
      status: 'connected',
    },
  });
});

app.get('/api/layer/finance', (req, res) => {
  res.json({
    success: true,
    layer: {
      name: 'Finance',
      description: 'RABTUL payment and wallet services',
      services: ['Payments', 'Wallet', 'Invoicing'],
      status: 'connected',
    },
  });
});

app.get('/api/layer/identity', (req, res) => {
  res.json({
    success: true,
    layer: {
      name: 'Identity',
      description: 'CorpID universal identity service',
      services: ['Authentication', 'Verification', 'SSO'],
      status: 'connected',
    },
  });
});

app.get('/api/layer/memory', (req, res) => {
  res.json({
    success: true,
    layer: {
      name: 'Memory',
      description: 'MemoryOS customer interaction memory',
      services: ['Conversation Memory', 'Preference Memory', 'Context Store'],
      status: 'connected',
    },
  });
});

app.get('/api/layers', (req, res) => {
  res.json({
    success: true,
    layers: [
      { id: 'intelligence', name: 'Intelligence', status: 'connected' },
      { id: 'customer-growth', name: 'Customer Growth', status: 'connected' },
      { id: 'commerce', name: 'Commerce', status: 'connected' },
      { id: 'finance', name: 'Finance', status: 'connected' },
      { id: 'identity', name: 'Identity', status: 'connected' },
      { id: 'memory', name: 'Memory', status: 'connected' },
      { id: 'twins', name: 'Digital Twins', status: 'connected' },
      { id: 'automation', name: 'Automation', status: 'connected' },
    ],
  });
});

// ============================================================
// SUTAR OS INTEGRATION
// ============================================================

app.get('/api/goals', (req, res) => {
  const reps = Array.from(dataStores.salesReps.values());

  const goals = reps.map(rep => ({
    entityId: rep.id,
    entityType: 'sales_rep',
    goals: [
      { type: 'revenue', target: rep.quota, current: rep.achieved, period: 'Q2 2026', progress: ((rep.achieved / rep.quota) * 100).toFixed(1) },
      { type: 'deals', target: 10, current: Math.floor(rep.achieved / 50000), period: 'Q2 2026' },
      { type: 'calls', target: 100, current: (dataStores.callMetrics.get(rep.id)?.total || 0), period: 'Q2 2026' },
    ],
    progress: ((rep.achieved / rep.quota) * 100).toFixed(1),
  }));

  res.json({ success: true, goals });
});

app.post('/api/goals', requireAuth, (req, res) => {
  const { entityId, entityType, type, target, period } = req.body;

  const goal = {
    id: `GOAL${Date.now()}`,
    entityId,
    entityType,
    type,
    target,
    current: 0,
    period,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({ success: true, goal });
});

// ============================================================
// INDUSTRY BRIDGES
// ============================================================

app.get('/api/bridges', async (req, res) => {
  if (!bridgeManager) {
    return res.status(503).json({ success: false, error: 'Industry Bridges module not available' });
  }

  const industries = bridgeManager.getAllIndustries();
  res.json({ success: true, count: industries.length, industries });
});

app.get('/api/bridges/connections', async (req, res) => {
  if (!bridgeManager) {
    return res.status(503).json({ success: false, error: 'Industry Bridges module not available' });
  }

  const connections = await bridgeManager.checkAllConnections();
  const connected = Object.values(connections).filter(c => c.healthy).length;
  res.json({ success: true, total: Object.keys(connections).length, connected, connections });
});

app.get('/api/bridges/:industry', async (req, res) => {
  if (!bridgeManager) {
    return res.status(503).json({ success: false, error: 'Industry Bridges module not available' });
  }

  const { industry } = req.params;
  const bridge = bridgeManager.getBridge(industry);

  if (!bridge) {
    return res.status(404).json({ success: false, error: `Industry bridge not found: ${industry}` });
  }

  const health = await bridge.healthCheck();
  const insights = await bridge.getMarketInsights();

  res.json({ success: true, industry, health, insights });
});

app.get('/api/bridges/:industry/market', async (req, res) => {
  if (!bridgeManager) {
    return res.status(503).json({ success: false, error: 'Industry Bridges module not available' });
  }

  const { industry } = req.params;
  const bridge = bridgeManager.getBridge(industry);

  if (!bridge) {
    return res.status(404).json({ success: false, error: `Industry bridge not found: ${industry}` });
  }

  const insights = await bridge.getMarketInsights();
  res.json({ success: true, industry, ...insights });
});

// ============================================================
// RTMN ECOSYSTEM INTEGRATION
// ============================================================

app.get('/api/rtmn/services', async (req, res) => {
  if (!rtmntEcosystem) {
    return res.status(503).json({ success: false, error: 'RTMN Ecosystem module not available' });
  }

  const services = rtmntEcosystem.getServicesRegistry();
  res.json({ success: true, count: services.length, services });
});

app.get('/api/rtmn/connections', async (req, res) => {
  if (!rtmntEcosystem) {
    return res.status(503).json({ success: false, error: 'RTMN Ecosystem module not available' });
  }

  const connections = await rtmntEcosystem.checkAllServices();
  const connected = Object.values(connections).filter(c => c.healthy).length;
  res.json({ success: true, total: Object.keys(connections).length, connected, connections });
});

app.get('/api/rtmn/service/:serviceKey', async (req, res) => {
  if (!rtmntEcosystem) {
    return res.status(503).json({ success: false, error: 'RTMN Ecosystem module not available' });
  }

  const { serviceKey } = req.params;
  const status = await rtmntEcosystem.checkService(serviceKey);
  res.json({ success: true, serviceKey, ...status });
});

app.get('/api/rtmn/events', (req, res) => {
  if (!rtmntEcosystem) {
    return res.status(503).json({ success: false, error: 'RTMN Ecosystem module not available' });
  }

  const events = rtmntEcosystem.getEventsSchema();
  res.json({ success: true, count: events.length, events });
});

app.post('/api/rtmn/events', async (req, res) => {
  if (!rtmntEcosystem) {
    return res.status(503).json({ success: false, error: 'RTMN Ecosystem module not available' });
  }

  const { eventType, payload } = req.body;
  const result = await rtmntEcosystem.publishEvent(eventType, payload);
  res.json({ success: true, ...result });
});

app.get('/api/rtmn/cross-ecosystem', (req, res) => {
  if (!rtmntEcosystem) {
    return res.status(503).json({ success: false, error: 'RTMN Ecosystem module not available' });
  }

  const features = rtmntEcosystem.getCrossEcosystemFeatures();
  res.json({ success: true, features });
});

app.get('/api/rtmn/customer360/:accountId', async (req, res) => {
  if (!rtmntEcosystem) {
    return res.status(503).json({ success: false, error: 'RTMN Ecosystem module not available' });
  }

  const { accountId } = req.params;
  const customer360 = await rtmntEcosystem.getCustomer360(accountId);
  res.json({ success: true, accountId, ...customer360 });
});

app.get('/api/rtmn/deal-intelligence/:opportunityId', async (req, res) => {
  if (!rtmntEcosystem) {
    return res.status(503).json({ success: false, error: 'RTMN Ecosystem module not available' });
  }

  const { opportunityId } = req.params;
  const intelligence = await rtmntEcosystem.getDealIntelligence(opportunityId);
  res.json({ success: true, opportunityId, ...intelligence });
});

// ============================================================
// REZ-SALESMIND INTEGRATION
// ============================================================

app.get('/api/salesmind/connections', async (req, res) => {
  if (!rezSalesMind) {
    return res.status(503).json({ success: false, error: 'REZ-SalesMind module not available' });
  }

  const connections = await rezSalesMind.healthCheck();
  const connected = Object.values(connections).filter(c => c.healthy).length;
  res.json({ success: true, total: Object.keys(connections).length, connected, connections });
});

app.get('/api/salesmind/agents', (req, res) => {
  if (!rezSalesMind) {
    return res.status(503).json({ success: false, error: 'REZ-SalesMind module not available' });
  }

  const agents = rezSalesMind.getAgents();
  res.json({ success: true, count: Object.keys(agents).length, agents });
});

app.post('/api/salesmind/leads/enrich', async (req, res) => {
  if (!rezSalesMind) {
    return res.status(503).json({ success: false, error: 'REZ-SalesMind module not available' });
  }

  const { leadData } = req.body;
  const result = await rezSalesMind.enrichLead(leadData);
  res.json({ success: true, ...result });
});

app.get('/api/salesmind/customer360/:accountId', async (req, res) => {
  if (!rezSalesMind) {
    return res.status(503).json({ success: false, error: 'REZ-SalesMind module not available' });
  }

  const { accountId } = req.params;
  const result = await rezSalesMind.getCustomer360(accountId);
  res.json({ success: true, accountId, ...result });
});

app.get('/api/salesmind/deal-context/:opportunityId', async (req, res) => {
  if (!rezSalesMind) {
    return res.status(503).json({ success: false, error: 'REZ-SalesMind module not available' });
  }

  const { opportunityId } = req.params;
  const { accountId } = req.query;
  const result = await rezSalesMind.getDealContext(opportunityId, accountId);
  res.json({ success: true, opportunityId, ...result });
});

app.get('/api/salesmind/churn/:accountId', async (req, res) => {
  if (!rezSalesMind) {
    return res.status(503).json({ success: false, error: 'REZ-SalesMind module not available' });
  }

  const { accountId } = req.params;
  const result = await rezSalesMind.predictChurn(accountId);
  res.json({ success: true, ...result });
});

app.post('/api/salesmind/sentiment', async (req, res) => {
  if (!rezSalesMind) {
    return res.status(503).json({ success: false, error: 'REZ-SalesMind module not available' });
  }

  const { conversationId } = req.body;
  const result = await rezSalesMind.analyzeSentiment(conversationId);
  res.json({ success: true, ...result });
});

app.post('/api/salesmind/intent', async (req, res) => {
  if (!rezSalesMind) {
    return res.status(503).json({ success: false, error: 'REZ-SalesMind module not available' });
  }

  const { message, context } = req.body;
  const result = await rezSalesMind.detectIntent(message, context);
  res.json({ success: true, ...result });
});

app.post('/api/salesmind/next-action', async (req, res) => {
  if (!rezSalesMind) {
    return res.status(503).json({ success: false, error: 'REZ-SalesMind module not available' });
  }

  const { opportunityId, accountId, salesStage } = req.body;
  const result = await rezSalesMind.getNextBestAction(opportunityId, accountId, salesStage);
  res.json({ success: true, ...result });
});

app.post('/api/salesmind/deal-score', async (req, res) => {
  if (!rezSalesMind) {
    return res.status(503).json({ success: false, error: 'REZ-SalesMind module not available' });
  }

  const { opportunityId, accountData, activityHistory } = req.body;
  const result = await rezSalesMind.scoreDeal(opportunityId, accountData, activityHistory);
  res.json({ success: true, ...result });
});

app.get('/api/salesmind/knowledge', async (req, res) => {
  if (!rezSalesMind) {
    return res.status(503).json({ success: false, error: 'REZ-SalesMind module not available' });
  }

  const { q, filters } = req.query;
  const result = await rezSalesMind.searchKnowledge(q, filters);
  res.json({ success: true, ...result });
});

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
  console.error('[Sales OS Error]', err);

  // Log to audit trail
  const trail = {
    id: `AUD${dataStores.auditTrails.size + 1}`,
    entityType: 'error',
    entityId: req.path,
    action: 'error',
    error: err.message,
    userId: req.user?.userId,
    timestamp: new Date().toISOString(),
  };
  dataStores.auditTrails.set(trail.id, trail);

  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// START
// ============================================================

initSampleData();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    SALES OS v2.0.0 - ENTERPRISE                              ║
║              Unified Sales Intelligence Platform                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                                   ║
║  Status: Running                                                              ║
║                                                                               ║
║  ══════════════════════════════════════════════════════════════════════════   ║
║  ENTERPRISE MODULES                                                           ║
║  ══════════════════════════════════════════════════════════════════════════   ║
║                                                                               ║
║  📊 Core CRM          │  👥 Customer Success    │  💰 CPQ                     ║
║  • Leads & Contacts   │  • Health Scores       │  • Products & Bundles       ║
║  • Accounts           │  • NPS Surveys         │  • Quotes & Approvals        ║
║  • Opportunities     │  • Churn Prediction    │  • Pricing Engine           ║
║  • Pipeline           │  • Renewals            │  • Discount Workflows       ║
║  • Activities         │  • Onboarding          │                             ║
║                                                                               ║
║  📜 Contracts         │  🗺️  Territory        │  📈 Forecasting             ║
║  • Lifecycle Mgmt    │  • Territory Setup    │  • AI-Powered Forecasts     ║
║  • Version Control    │  • Quota Allocation   │  • Adjustments              ║
║  • E-Signatures       │  • Rep Assignments    │  • Pipeline Analysis        ║
║  • Amendments         │  • Region Mapping     │  • Trend Prediction         ║
║                                                                               ║
║  💵 Revenue Intel     │  🤝 Partner OS        │  📚 Sales Enablement       ║
║  • MRR/ARR Tracking   │  • Partner Mgmt       │  • Content Library          ║
║  • Cohort Analysis    │  • Deal Registration  │  • Training Modules        ║
║  • Attribution        │  • Commission Calc    │  • Battle Cards             ║
║  • Growth Analytics   │  • Performance        │  • Playbooks                ║
║                                                                               ║
║  📞 Call Intelligence │  ⚙️  Workflows         │  💵 Commission OS           ║
║  • Recordings         │  • Automation Rules   │  • Plans & Accelerators    ║
║  • Transcripts        │  • Trigger Actions    │  • Calculations            ║
║  • Sentiment          │  • Templates          │  • Payouts                  ║
║  • Call Metrics       │  • Execution Logs     │  • SPIFFs                   ║
║                                                                               ║
║  🔄 Subscriptions     │  🌐 GCC/Enterprise    │  🤖 AI AGENTS (22)         ║
║  • MRR Management     │  • Multi-Currency     │  • Lead Scoring             ║
║  • Plan Changes       │  • VAT/GST Config     │  • Churn Prediction        ║
║  • Billing Schedules  │  • Compliance Logs    │  • Forecasting              ║
║  • Renewals           │  • Audit Trails       │  • Pricing Optimizer       ║
║                       │                        │  • Sales Coach             ║
║                       │                        │  • Contract Analyzer       ║
║                       │                        │  • And 15+ more...         ║
║                                                                               ║
║  ══════════════════════════════════════════════════════════════════════════   ║
║  RTMN LAYER INTEGRATIONS                                                      ║
║  ══════════════════════════════════════════════════════════════════════════   ║
║  • Intelligence (HOJAI AI)     • Commerce (REZ-Merchant)                        ║
║  • Customer Growth (AdBazaar)  • Finance (RABTUL)                              ║
║  • Identity (CorpID)           • Memory (MemoryOS)                             ║
║  • Digital Twins (TwinOS Hub)  • Automation (FlowOS)                          ║
║  • Autonomous (SUTAR OS)                                                          ║
║                                                                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
