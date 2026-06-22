/**
 * RTMN Workflow Marketplace Service
 *
 * Port: 4938
 * Purpose: Workflow automation marketplace for discovering, sharing,
 *          and deploying pre-built workflow templates across the RTMN ecosystem
 *
 * Features:
 * - Browse workflow templates by category
 * - Search workflows with filters
 * - Preview workflow structure
 * - Deploy workflows to your organization
 * - Rate and review workflows
 * - Seller dashboard for publishing workflows
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

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.WORKFLOW_MARKETPLACE_PORT || 4938;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ============================================================
// WORKFLOW TEMPLATES DATA STORE
// ============================================================

const workflows = new PersistentMap('workflows', { serviceName: 'workflow-marketplace' });
const reviews = new PersistentMap('reviews', { serviceName: 'workflow-marketplace' });
const deployments = new PersistentMap('deployments', { serviceName: 'workflow-marketplace' });
const categories = new PersistentMap('categories', { serviceName: 'workflow-marketplace' });

// Initialize categories
const initialCategories = [
  { id: 'sales', name: 'Sales', icon: 'trending-up', color: '#10b981', count: 0 },
  { id: 'hr', name: 'Human Resources', icon: 'users', color: '#3b82f6', count: 0 },
  { id: 'marketing', name: 'Marketing', icon: 'megaphone', color: '#f59e0b', count: 0 },
  { id: 'operations', name: 'Operations', icon: 'settings', color: '#6366f1', count: 0 },
  { id: 'finance', name: 'Finance', icon: 'dollar-sign', color: '#ec4899', count: 0 },
  { id: 'customer-success', name: 'Customer Success', icon: 'heart', color: '#ef4444', count: 0 },
  { id: 'it', name: 'IT & Security', icon: 'shield', color: '#8b5cf6', count: 0 },
  { id: 'legal', name: 'Legal', icon: 'scale', color: '#14b8a6', count: 0 },
];
initialCategories.forEach(cat => categories.set(cat.id, cat));

// Initialize sample workflows
const sampleWorkflows = [
  // Sales Workflows
  {
    id: 'wf-lead-nurture',
    name: 'Lead Nurture Sequence',
    description: 'Automated lead nurturing from capture to conversion with personalized follow-ups',
    category: 'sales',
    price: 49,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 1234,
      rating: 4.7,
      reviews: 89
    },
    tags: ['lead', 'nurture', 'automation', 'email'],
    steps: [
      { order: 1, name: 'Capture Lead', type: 'trigger', description: 'New lead from form/import' },
      { order: 2, name: 'Send Welcome Email', type: 'action', description: 'Automated welcome sequence' },
      { order: 3, name: 'Wait 3 Days', type: 'delay', description: 'Delay before next action' },
      { order: 4, name: 'Score Lead', type: 'condition', description: 'AI-powered lead scoring' },
      { order: 5, name: 'Assign to Rep', type: 'action', description: 'Route to sales team' }
    ],
    integrations: ['email', 'crm', 'ai-intelligence'],
    industries: ['SaaS', 'E-commerce', 'Professional Services'],
    difficulty: 'beginner',
    featured: true,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'wf-demo-request',
    name: 'Demo Request Flow',
    description: 'Capture demo requests, schedule meetings, and send follow-ups automatically',
    category: 'sales',
    price: 39,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 892,
      rating: 4.6,
      reviews: 45
    },
    tags: ['demo', 'meeting', 'scheduling', 'calendar'],
    steps: [
      { order: 1, name: 'Demo Request', type: 'trigger', description: 'Form submission' },
      { order: 2, name: 'Qualify Lead', type: 'condition', description: 'Check company size, budget' },
      { order: 3, name: 'Schedule Meeting', type: 'action', description: 'Calendar integration' },
      { order: 4, name: 'Send Confirmation', type: 'action', description: 'Email confirmation with details' },
      { order: 5, name: 'Send Reminder', type: 'action', description: '24h and 1h reminders' }
    ],
    integrations: ['calendar', 'email', 'crm'],
    industries: ['SaaS', 'Technology', 'Consulting'],
    difficulty: 'beginner',
    featured: true,
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-06-05T10:00:00Z'
  },
  {
    id: 'wf-proposal-followup',
    name: 'Proposal Follow-up',
    description: 'Track proposal status and send intelligent follow-ups based on engagement',
    category: 'sales',
    price: 59,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 567,
      rating: 4.8,
      reviews: 34
    },
    tags: ['proposal', 'follow-up', 'engagement', 'tracking'],
    steps: [
      { order: 1, name: 'Proposal Sent', type: 'trigger', description: 'When proposal is sent' },
      { order: 2, name: 'Track Engagement', type: 'action', description: 'Monitor document views' },
      { order: 3, name: 'Wait 3 Days', type: 'delay', description: 'Give time to review' },
      { order: 4, name: 'Engaged?', type: 'condition', description: 'Check if viewed' },
      { order: 5, name: 'Send Follow-up', type: 'action', description: 'Personalized follow-up' },
      { order: 6, name: 'Escalate if No Response', type: 'action', description: 'Alert manager' }
    ],
    integrations: ['document-tracking', 'email', 'crm'],
    industries: ['B2B', 'Enterprise', 'Professional Services'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-05-20T10:00:00Z'
  },
  {
    id: 'wf-renewal-reminder',
    name: 'Renewal Reminder System',
    description: 'Automated renewal tracking with 90-60-30 day alerts',
    category: 'sales',
    price: 49,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 445,
      rating: 4.9,
      reviews: 28
    },
    tags: ['renewal', 'subscription', 'churn', 'retention'],
    steps: [
      { order: 1, name: 'Contract Expiry', type: 'trigger', description: '90 days before expiry' },
      { order: 2, name: 'Send 90-day Alert', type: 'action', description: 'Email notification' },
      { order: 3, name: 'Update Task', type: 'action', description: 'Create renewal task' },
      { order: 4, name: 'Send 60-day Alert', type: 'action', description: 'More urgent reminder' },
      { order: 5, name: 'Send 30-day Alert', type: 'action', description: 'Final warning' },
      { order: 6, name: 'Escalate to Manager', type: 'action', description: 'If no response' }
    ],
    integrations: ['crm', 'contract-management', 'email'],
    industries: ['SaaS', 'Subscriptions', 'Enterprise'],
    difficulty: 'beginner',
    featured: false,
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'wf-upsell-campaign',
    name: 'Upsell Campaign',
    description: 'Identify and act on upsell opportunities based on usage patterns',
    category: 'sales',
    price: 69,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 334,
      rating: 4.5,
      reviews: 21
    },
    tags: ['upsell', 'cross-sell', 'expansion', 'usage-based'],
    steps: [
      { order: 1, name: 'Usage Threshold', type: 'trigger', description: 'When usage exceeds threshold' },
      { order: 2, name: 'Check Eligibility', type: 'condition', description: 'Verify upgrade eligibility' },
      { order: 3, name: 'Generate Offer', type: 'action', description: 'Personalized upgrade offer' },
      { order: 4, name: 'Send Offer', type: 'action', description: 'Email with pricing' },
      { order: 5, name: 'Track Response', type: 'action', description: 'Monitor engagement' }
    ],
    integrations: ['usage-tracking', 'billing', 'crm'],
    industries: ['SaaS', 'Usage-based', 'Subscription'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-05-15T10:00:00Z'
  },

  // HR Workflows
  {
    id: 'wf-employee-onboarding',
    name: 'Employee Onboarding',
    description: 'Complete onboarding flow from offer acceptance to Day 1 readiness',
    category: 'hr',
    price: 79,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 1567,
      rating: 4.9,
      reviews: 102
    },
    tags: ['onboarding', 'hr', 'new-hire', 'paperwork'],
    steps: [
      { order: 1, name: 'Offer Accepted', type: 'trigger', description: 'Employee accepts offer' },
      { order: 2, name: 'Send Welcome Pack', type: 'action', description: 'Email with first-day info' },
      { order: 3, name: 'Create Accounts', type: 'action', description: 'Email, Slack, systems' },
      { order: 4, name: 'Schedule Training', type: 'action', description: 'Orientation sessions' },
      { order: 5, name: 'Assign Buddy', type: 'action', description: 'Pair with existing employee' },
      { order: 6, name: 'Day 30 Check-in', type: 'action', description: 'Feedback survey' }
    ],
    integrations: ['hr-system', 'email', 'slack', 'it-setup'],
    industries: ['All Industries'],
    difficulty: 'intermediate',
    featured: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'wf-leave-request',
    name: 'Leave Request Approval',
    description: 'Streamlined leave request workflow with manager approval and calendar sync',
    category: 'hr',
    price: 29,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 2345,
      rating: 4.6,
      reviews: 156
    },
    tags: ['leave', 'approval', 'hr', 'calendar'],
    steps: [
      { order: 1, name: 'Leave Request', type: 'trigger', description: 'Employee submits request' },
      { order: 2, name: 'Check Balance', type: 'action', description: 'Verify available leave' },
      { order: 3, name: 'Notify Manager', type: 'action', description: 'Email/Slack alert' },
      { order: 4, name: 'Manager Approval', type: 'condition', description: 'Approve or reject' },
      { order: 5, name: 'Update Calendar', type: 'action', description: 'Sync to team calendar' },
      { order: 6, name: 'Confirm Employee', type: 'action', description: 'Send decision email' }
    ],
    integrations: ['hr-system', 'calendar', 'email', 'slack'],
    industries: ['All Industries'],
    difficulty: 'beginner',
    featured: false,
    createdAt: '2026-01-05T10:00:00Z',
    updatedAt: '2026-05-30T10:00:00Z'
  },
  {
    id: 'wf-performance-review',
    name: 'Performance Review Cycle',
    description: 'Automated performance review scheduling and feedback collection',
    category: 'hr',
    price: 49,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 678,
      rating: 4.7,
      reviews: 45
    },
    tags: ['performance', 'review', 'feedback', '360'],
    steps: [
      { order: 1, name: 'Review Period Start', type: 'trigger', description: 'Scheduled annually/semi-annually' },
      { order: 2, name: 'Send Self-Review', type: 'action', description: 'Employee self-assessment' },
      { order: 3, name: 'Send Peer Reviews', type: 'action', description: '360 feedback collection' },
      { order: 4, name: 'Manager Review', type: 'action', description: 'Manager assessment' },
      { order: 5, name: 'Compile Results', type: 'action', description: 'Aggregate all feedback' },
      { order: 6, name: 'Schedule 1:1', type: 'action', description: 'Calendar invite for discussion' }
    ],
    integrations: ['hr-system', 'email', 'feedback-tool'],
    industries: ['All Industries'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-05-20T10:00:00Z'
  },
  {
    id: 'wf-employee-offboarding',
    name: 'Employee Offboarding',
    description: 'Comprehensive offboarding workflow ensuring complete exit process',
    category: 'hr',
    price: 59,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 445,
      rating: 4.8,
      reviews: 32
    },
    tags: ['offboarding', 'exit', 'hr', 'security'],
    steps: [
      { order: 1, name: 'Resignation Received', type: 'trigger', description: 'HR notified' },
      { order: 2, name: 'Create Task List', type: 'action', description: 'Generate checklist' },
      { order: 3, name: 'Revoke Access', type: 'action', description: 'Disable accounts' },
      { order: 4, name: 'Knowledge Transfer', type: 'action', description: 'Assign transition tasks' },
      { order: 5, name: 'Exit Interview', type: 'action', description: 'Schedule meeting' },
      { order: 6, name: 'Final Payroll', type: 'action', description: 'Process final settlement' }
    ],
    integrations: ['hr-system', 'it-helpdesk', 'security', 'email'],
    industries: ['All Industries'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-05-25T10:00:00Z'
  },
  {
    id: 'wf-payroll-processing',
    name: 'Payroll Processing',
    description: 'Automated payroll workflow with multi-level approvals',
    category: 'hr',
    price: 49,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 567,
      rating: 4.9,
      reviews: 41
    },
    tags: ['payroll', 'approval', 'finance', 'automation'],
    steps: [
      { order: 1, name: 'Pay Period End', type: 'trigger', description: 'Monthly/bi-weekly trigger' },
      { order: 2, name: 'Calculate Payroll', type: 'action', description: 'Generate pay run' },
      { order: 3, name: 'Manager Approval', type: 'condition', description: 'First level approval' },
      { order: 4, name: 'Finance Approval', type: 'condition', description: 'Second level approval' },
      { order: 5, name: 'Process Payment', type: 'action', description: 'Bank transfer' },
      { order: 6, name: 'Send Payslips', type: 'action', description: 'Email payslips' }
    ],
    integrations: ['payroll-system', 'banking', 'hr-system'],
    industries: ['All Industries'],
    difficulty: 'advanced',
    featured: false,
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-05-15T10:00:00Z'
  },

  // Marketing Workflows
  {
    id: 'wf-welcome-series',
    name: 'Welcome Email Series',
    description: 'Onboarding email sequence for new subscribers/customers',
    category: 'marketing',
    price: 39,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 1876,
      rating: 4.7,
      reviews: 123
    },
    tags: ['welcome', 'email', 'onboarding', 'automation'],
    steps: [
      { order: 1, name: 'New Subscriber', type: 'trigger', description: 'Email list signup' },
      { order: 2, name: 'Day 0 - Welcome', type: 'action', description: 'Immediate welcome email' },
      { order: 3, name: 'Day 1 - Value', type: 'action', description: 'Best content introduction' },
      { order: 4, name: 'Day 3 - Feature', type: 'action', description: 'Highlight key features' },
      { order: 5, name: 'Day 7 - CTA', type: 'action', description: 'First conversion ask' }
    ],
    integrations: ['email', 'crm', 'analytics'],
    industries: ['E-commerce', 'SaaS', 'Media', 'Any'],
    difficulty: 'beginner',
    featured: true,
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'wf-abandoned-cart',
    name: 'Abandoned Cart Recovery',
    description: 'Automated cart abandonment recovery with multi-channel follow-ups',
    category: 'marketing',
    price: 49,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 1234,
      rating: 4.8,
      reviews: 89
    },
    tags: ['abandoned-cart', 'recovery', 'e-commerce', 'retargeting'],
    steps: [
      { order: 1, name: 'Cart Abandoned', type: 'trigger', description: 'Checkout started but not completed' },
      { order: 2, name: 'Wait 1 Hour', type: 'delay', description: 'Give time to complete' },
      { order: 3, name: 'Email Reminder', type: 'action', description: 'Cart recovery email #1' },
      { order: 4, name: 'Wait 24 Hours', type: 'delay', description: 'Second delay' },
      { order: 5, name: 'SMS Reminder', type: 'action', description: 'Text message if available' },
      { order: 6, name: 'Final Email + Discount', type: 'action', description: 'Last chance with incentive' }
    ],
    integrations: ['ecommerce', 'email', 'sms', 'whatsapp'],
    industries: ['E-commerce', 'Retail'],
    difficulty: 'beginner',
    featured: true,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-06-05T10:00:00Z'
  },
  {
    id: 'wf-re-engagement',
    name: 'Re-engagement Campaign',
    description: 'Win back inactive customers with personalized outreach',
    category: 'marketing',
    price: 39,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 678,
      rating: 4.5,
      reviews: 45
    },
    tags: ['re-engagement', 'win-back', 'inactive', 'retention'],
    steps: [
      { order: 1, name: 'Inactive Detection', type: 'trigger', description: 'No activity for 30/60/90 days' },
      { order: 2, name: 'Segment', type: 'action', description: 'Group by inactivity period' },
      { order: 3, name: 'Personalized Offer', type: 'action', description: 'Tailored incentive' },
      { order: 4, name: 'Send Sequence', type: 'action', description: 'Multi-email campaign' },
      { order: 5, name: 'Track Response', type: 'action', description: 'Monitor engagement' }
    ],
    integrations: ['email', 'crm', 'analytics'],
    industries: ['SaaS', 'E-commerce', 'Media', 'Subscriptions'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: '2026-02-05T10:00:00Z',
    updatedAt: '2026-05-20T10:00:00Z'
  },
  {
    id: 'wf-loyalty-tier',
    name: 'Loyalty Tier Upgrade',
    description: 'Automated loyalty program management and tier upgrades',
    category: 'marketing',
    price: 29,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 567,
      rating: 4.6,
      reviews: 38
    },
    tags: ['loyalty', 'rewards', 'tiers', 'gamification'],
    steps: [
      { order: 1, name: 'Points Earned', type: 'trigger', description: 'Purchase/action completed' },
      { order: 2, name: 'Update Balance', type: 'action', description: 'Credit points' },
      { order: 3, name: 'Check Milestone', type: 'condition', description: 'Tier upgrade threshold?' },
      { order: 4, name: 'Announce Upgrade', type: 'action', description: 'Celebrate new tier' },
      { order: 5, name: 'Send Benefits', type: 'action', description: 'New tier perks' }
    ],
    integrations: ['loyalty-system', 'email', 'sms'],
    industries: ['Retail', 'E-commerce', 'Hospitality'],
    difficulty: 'beginner',
    featured: false,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-05-30T10:00:00Z'
  },

  // Operations Workflows
  {
    id: 'wf-approval-chain',
    name: 'Multi-Level Approval',
    description: 'Configurable approval chain with conditions and escalations',
    category: 'operations',
    price: 29,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 2345,
      rating: 4.7,
      reviews: 178
    },
    tags: ['approval', 'workflow', 'multi-level', 'automation'],
    steps: [
      { order: 1, name: 'Request Submitted', type: 'trigger', description: 'Any approval request' },
      { order: 2, name: 'Route to L1', type: 'action', description: 'First approver' },
      { order: 3, name: 'Check Amount', type: 'condition', description: 'Threshold check' },
      { order: 4, name: 'Route to L2', type: 'action', description: 'Second approver if needed' },
      { order: 5, name: 'Notify Requester', type: 'action', description: 'Decision notification' }
    ],
    integrations: ['erp', 'finance', 'email', 'slack'],
    industries: ['All Industries'],
    difficulty: 'beginner',
    featured: true,
    createdAt: '2026-01-08T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'wf-incident-response',
    name: 'Incident Response',
    description: 'Automated incident detection, triage, and resolution workflow',
    category: 'operations',
    price: 49,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 567,
      rating: 4.8,
      reviews: 45
    },
    tags: ['incident', 'sre', 'on-call', 'escalation'],
    steps: [
      { order: 1, name: 'Alert Triggered', type: 'trigger', description: 'Monitoring alert received' },
      { order: 2, name: 'Triage', type: 'action', description: 'Assess severity' },
      { order: 3, name: 'Page On-call', type: 'action', description: 'Notify responder' },
      { order: 4, name: 'Create Incident', type: 'action', description: 'Ticket creation' },
      { order: 5, name: 'Escalate if No ACK', type: 'condition', description: 'Auto-escalate' },
      { order: 6, name: 'Postmortem', type: 'action', description: 'Schedule review' }
    ],
    integrations: ['monitoring', 'pagerduty', 'slack', 'ticketing'],
    industries: ['Tech', 'SaaS', 'Any with IT'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-05-25T10:00:00Z'
  },
  {
    id: 'wf-document-routing',
    name: 'Document Routing',
    description: 'Automated document review and approval workflow',
    category: 'operations',
    price: 19,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 1234,
      rating: 4.5,
      reviews: 67
    },
    tags: ['document', 'routing', 'review', 'e-signature'],
    steps: [
      { order: 1, name: 'Document Upload', type: 'trigger', description: 'New document received' },
      { order: 2, name: 'Auto-classify', type: 'action', description: 'AI document type detection' },
      { order: 3, name: 'Route to Reviewer', type: 'action', description: 'Assign based on type' },
      { order: 4, name: 'Collect Feedback', type: 'action', description: 'Review comments' },
      { order: 5, name: 'Final Approval', type: 'condition', description: 'Approve or request changes' }
    ],
    integrations: ['document-management', 'e-signature', 'email'],
    industries: ['Legal', 'Finance', 'Healthcare', 'Any'],
    difficulty: 'beginner',
    featured: false,
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-05-20T10:00:00Z'
  },
  {
    id: 'wf-shift-handover',
    name: 'Shift Handover',
    description: 'Automated shift handover with issue tracking and priority routing',
    category: 'operations',
    price: 29,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 456,
      rating: 4.6,
      reviews: 28
    },
    tags: ['shift', 'handover', 'operations', 'tracking'],
    steps: [
      { order: 1, name: 'Shift End', type: 'trigger', description: 'Scheduled at shift end' },
      { order: 2, name: 'Generate Summary', type: 'action', description: 'Create shift report' },
      { order: 3, name: 'List Open Issues', type: 'action', description: 'Compile outstanding items' },
      { order: 4, name: 'Notify Next Shift', type: 'action', description: 'Alert incoming team' },
      { order: 5, name: 'Acknowledge', type: 'condition', description: 'Confirm handover' }
    ],
    integrations: ['operations', 'chat', 'email'],
    industries: ['Operations', 'Manufacturing', 'Healthcare', '24/7 Services'],
    difficulty: 'beginner',
    featured: false,
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-05-30T10:00:00Z'
  },

  // Finance Workflows
  {
    id: 'wf-invoice-processing',
    name: 'Invoice Processing',
    description: 'Automated invoice workflow from receipt to payment',
    category: 'finance',
    price: 49,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 789,
      rating: 4.8,
      reviews: 56
    },
    tags: ['invoice', 'accounts-payable', 'automation', 'approval'],
    steps: [
      { order: 1, name: 'Invoice Received', type: 'trigger', description: 'Email/upload' },
      { order: 2, name: 'Extract Data', type: 'action', description: 'OCR + AI extraction' },
      { order: 3, name: 'Match PO', type: 'condition', description: 'Three-way match' },
      { order: 4, name: 'Route for Approval', type: 'action', description: 'Based on amount' },
      { order: 5, name: 'Schedule Payment', type: 'action', description: 'Based on terms' },
      { order: 6, name: 'Reconcile', type: 'action', description: 'Mark as paid' }
    ],
    integrations: ['erp', 'accounting', 'banking', 'ocr'],
    industries: ['All Industries'],
    difficulty: 'intermediate',
    featured: true,
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'wf-expense-claims',
    name: 'Expense Claims',
    description: 'Mobile-first expense submission and approval workflow',
    category: 'finance',
    price: 29,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 1456,
      rating: 4.6,
      reviews: 98
    },
    tags: ['expense', 'reimbursement', 'mobile', 'approval'],
    steps: [
      { order: 1, name: 'Submit Expense', type: 'trigger', description: 'Photo upload' },
      { order: 2, name: 'Auto-categorize', type: 'action', description: 'AI categorization' },
      { order: 3, name: 'Policy Check', type: 'condition', description: 'Validate against policy' },
      { order: 4, name: 'Manager Approval', type: 'action', description: 'Route to manager' },
      { order: 5, name: 'Reimburse', type: 'action', description: 'Process payment' }
    ],
    integrations: ['expense-system', 'accounting', 'banking', 'mobile'],
    industries: ['All Industries'],
    difficulty: 'beginner',
    featured: false,
    createdAt: '2026-01-25T10:00:00Z',
    updatedAt: '2026-05-30T10:00:00Z'
  },
  {
    id: 'wf-vendor-onboarding',
    name: 'Vendor Onboarding',
    description: 'Comprehensive vendor verification and setup workflow',
    category: 'finance',
    price: 39,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 234,
      rating: 4.7,
      reviews: 18
    },
    tags: ['vendor', 'onboarding', 'verification', 'procurement'],
    steps: [
      { order: 1, name: 'Application', type: 'trigger', description: 'Vendor signup' },
      { order: 2, name: 'Collect Docs', type: 'action', description: 'Request documents' },
      { order: 3, name: 'Compliance Check', type: 'action', description: 'Verify credentials' },
      { order: 4, name: 'Risk Assessment', type: 'action', description: 'Evaluate risk level' },
      { order: 5, name: 'Approve', type: 'condition', description: 'Procurement approval' },
      { order: 6, name: 'Setup in System', type: 'action', description: 'Create vendor record' }
    ],
    integrations: ['procurement', 'compliance', 'accounting'],
    industries: ['All Industries'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-05-25T10:00:00Z'
  },
  {
    id: 'wf-budget-approval',
    name: 'Budget Approval',
    description: 'Department budget request and approval workflow',
    category: 'finance',
    price: 49,
    priceType: 'monthly',
    seller: {
      id: 'seller-rtmn',
      name: 'RTMN Official',
      verified: true,
      rating: 4.8
    },
    stats: {
      installs: 345,
      rating: 4.5,
      reviews: 23
    },
    tags: ['budget', 'approval', 'departmental', 'finance'],
    steps: [
      { order: 1, name: 'Budget Request', type: 'trigger', description: 'Department submits' },
      { order: 2, name: 'Validate Budget', type: 'action', description: 'Check against allocation' },
      { order: 3, name: 'Dept Head Approval', type: 'condition', description: 'First approval' },
      { order: 4, name: 'Finance Review', type: 'condition', description: 'Finance approval' },
      { order: 5, name: 'Update Budget', type: 'action', description: 'Allocate funds' },
      { order: 6, name: 'Notify Dept', type: 'action', description: 'Confirmation' }
    ],
    integrations: ['erp', 'budgeting', 'email'],
    industries: ['All Industries'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-05-30T10:00:00Z'
  }
];

// Add workflows to store
sampleWorkflows.forEach(wf => workflows.set(wf.id, wf));

// Update category counts
workflows.forEach(wf => {
  if (categories.has(wf.category)) {
    const cat = categories.get(wf.category);
    cat.count++;
    categories.set(wf.category, cat);
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Workflow Marketplace',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      workflows: workflows.size,
      categories: categories.size,
      totalInstalls: Array.from(workflows.values()).reduce((sum, w) => sum + w.stats.installs, 0)
    }
  });
});

// ============================================================
// PUBLIC ENDPOINTS
// ============================================================

// Get all workflows with filters
app.get('/api/workflows', (req, res) => {
  const { category, search, minPrice, maxPrice, difficulty, featured, industry, sort, page = 1, limit = 20 } = req.query;

  let result = Array.from(workflows.values());

  // Filters
  if (category) result = result.filter(w => w.category === category);
  if (featured === 'true') result = result.filter(w => w.featured);
  if (difficulty) result = result.filter(w => w.difficulty === difficulty);
  if (industry) result = result.filter(w => w.industries.includes(industry));
  if (minPrice) result = result.filter(w => w.price >= parseInt(minPrice));
  if (maxPrice) result = result.filter(w => w.price <= parseInt(maxPrice));
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(w =>
      w.name.toLowerCase().includes(s) ||
      w.description.toLowerCase().includes(s) ||
      w.tags.some(t => t.toLowerCase().includes(s))
    );
  }

  // Sorting
  if (sort === 'popular') result.sort((a, b) => b.stats.installs - a.stats.installs);
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
    workflows: paginated
  });
});

// Get single workflow
app.get('/api/workflows/:id', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) {
    return res.status(404).json({ success: false, error: 'Workflow not found' });
  }

  // Get reviews
  const workflowReviews = Array.from(reviews.values())
    .filter(r => r.workflowId === req.params.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    workflow,
    reviews: workflowReviews
  });
});

// Get categories
app.get('/api/categories', (req, res) => {
  const cats = Array.from(categories.values()).sort((a, b) => b.count - a.count);
  res.json({ success: true, categories: cats });
});

// Get featured workflows
app.get('/api/workflows/featured/list', (req, res) => {
  const featured = Array.from(workflows.values())
    .filter(w => w.featured)
    .sort((a, b) => b.stats.installs - a.stats.installs);
  res.json({ success: true, workflows: featured });
});

// Search workflows
app.get('/api/search', (req, res) => {
  const { q, type } = req.query;
  if (!q) return res.status(400).json({ success: false, error: 'Query required' });

  const s = q.toLowerCase();
  let results = Array.from(workflows.values())
    .filter(w =>
      w.name.toLowerCase().includes(s) ||
      w.description.toLowerCase().includes(s) ||
      w.tags.some(t => t.toLowerCase().includes(s))
    );

  res.json({
    success: true,
    query: q,
    count: results.length,
    results: results.slice(0, 10)
  });
});

// Get industries
app.get('/api/industries', (req, res) => {
  const industries = new Set();
  workflows.forEach(w => w.industries.forEach(i => industries.add(i)));
  res.json({ success: true, industries: Array.from(industries).sort() });
});

// ============================================================
// PURCHASE & DEPLOYMENT
// ============================================================

// Deploy workflow
app.post('/api/workflows/:id/deploy',requireAuth,  (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) {
    return res.status(404).json({ success: false, error: 'Workflow not found' });
  }

  const { organizationId, config } = req.body;
  if (!organizationId) {
    return res.status(400).json({ success: false, error: 'Organization ID required' });
  }

  const deployment = {
    id: `deploy-${uuidv4()}`,
    workflowId: workflow.id,
    workflowName: workflow.name,
    organizationId,
    status: 'active',
    config: config || {},
    deployedAt: new Date().toISOString(),
    lastTriggered: null,
    runs: 0
  };

  deployments.set(deployment.id, deployment);

  // Update install count
  workflow.stats.installs++;
  workflows.set(workflow.id, workflow);

  res.json({
    success: true,
    message: 'Workflow deployed successfully',
    deployment
  });
});

// Get organization deployments
app.get('/api/deployments', (req, res) => {
  const { organizationId } = req.query;
  if (!organizationId) {
    return res.status(400).json({ success: false, error: 'Organization ID required' });
  }

  const orgDeployments = Array.from(deployments.values())
    .filter(d => d.organizationId === organizationId);

  res.json({ success: true, deployments: orgDeployments });
});

// Get deployment details
app.get('/api/deployments/:id', (req, res) => {
  const deployment = deployments.get(req.params.id);
  if (!deployment) {
    return res.status(404).json({ success: false, error: 'Deployment not found' });
  }
  res.json({ success: true, deployment });
});

// Update deployment
app.patch('/api/deployments/:id',requireAuth,  (req, res) => {
  const deployment = deployments.get(req.params.id);
  if (!deployment) {
    return res.status(404).json({ success: false, error: 'Deployment not found' });
  }

  const updated = { ...deployment, ...req.body };
  deployments.set(req.params.id, updated);

  res.json({ success: true, deployment: updated });
});

// Delete deployment
app.delete('/api/deployments/:id',requireAuth,  (req, res) => {
  const deployment = deployments.get(req.params.id);
  if (!deployment) {
    return res.status(404).json({ success: false, error: 'Deployment not found' });
  }

  deployment.status = 'deleted';
  deployments.set(req.params.id, deployment);

  res.json({ success: true, message: 'Workflow undeployed' });
});

// ============================================================
// REVIEWS
// ============================================================

// Add review
app.post('/api/workflows/:id/reviews',requireAuth,  (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) {
    return res.status(404).json({ success: false, error: 'Workflow not found' });
  }

  const { rating, comment, author } = req.body;
  if (!rating || !comment) {
    return res.status(400).json({ success: false, error: 'Rating and comment required' });
  }

  const review = {
    id: `review-${uuidv4()}`,
    workflowId: req.params.id,
    rating,
    comment,
    author: author || 'Anonymous',
    createdAt: new Date().toISOString()
  };

  reviews.set(review.id, review);

  // Update workflow rating
  const allReviews = Array.from(reviews.values()).filter(r => r.workflowId === req.params.id);
  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
  workflow.stats.rating = Math.round(avgRating * 10) / 10;
  workflow.stats.reviews = allReviews.length;
  workflows.set(workflow.id, workflow);

  res.json({ success: true, review });
});

// ============================================================
// SELLER DASHBOARD (For workflow creators)
// ============================================================

// Get seller workflows
app.get('/api/seller/workflows', (req, res) => {
  const { sellerId } = req.query;
  if (!sellerId) {
    return res.status(400).json({ success: false, error: 'Seller ID required' });
  }

  const sellerWorkflows = Array.from(workflows.values())
    .filter(w => w.seller.id === sellerId);

  res.json({ success: true, workflows: sellerWorkflows });
});

// Create workflow (for sellers)
app.post('/api/workflows',requireAuth,  (req, res) => {
  const { name, description, category, price, priceType, steps, integrations, industries, tags, seller } = req.body;

  if (!name || !category || !seller) {
    return res.status(400).json({ success: false, error: 'Name, category, and seller required' });
  }

  const workflow = {
    id: `wf-${uuidv4()}`,
    name,
    description: description || '',
    category,
    price: price || 0,
    priceType: priceType || 'monthly',
    seller,
    stats: {
      installs: 0,
      rating: 0,
      reviews: 0
    },
    tags: tags || [],
    steps: steps || [],
    integrations: integrations || [],
    industries: industries || ['All Industries'],
    difficulty: 'intermediate',
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  workflows.set(workflow.id, workflow);

  // Update category count
  if (categories.has(category)) {
    const cat = categories.get(category);
    cat.count++;
    categories.set(category, cat);
  }

  res.status(201).json({ success: true, workflow });
});

// Update workflow
app.patch('/api/workflows/:id',requireAuth,  (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) {
    return res.status(404).json({ success: false, error: 'Workflow not found' });
  }

  const updated = { ...workflow, ...req.body, updatedAt: new Date().toISOString() };
  workflows.set(req.params.id, updated);

  res.json({ success: true, workflow: updated });
});

// ============================================================
// ANALYTICS
// ============================================================

// Get marketplace stats
app.get('/api/stats', (req, res) => {
  const allWorkflows = Array.from(workflows.values());
  const totalInstalls = allWorkflows.reduce((sum, w) => sum + w.stats.installs, 0);
  const avgRating = allWorkflows.reduce((sum, w) => sum + w.stats.rating, 0) / allWorkflows.length;

  res.json({
    success: true,
    stats: {
      totalWorkflows: allWorkflows.length,
      totalInstalls,
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: allWorkflows.reduce((sum, w) => sum + w.stats.reviews, 0),
      byCategory: Array.from(categories.values())
    }
  });
});

// ============================================================
// RTMN ECOSYSTEM INTEGRATION
// ============================================================

// Get workflow for execution (connects to workflow-engine)
app.get('/api/workflows/:id/execute', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) {
    return res.status(404).json({ success: false, error: 'Workflow not found' });
  }

  res.json({
    success: true,
    workflow: {
      id: workflow.id,
      name: workflow.name,
      steps: workflow.steps,
      integrations: workflow.integrations
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



const server = app.listen(PORT, () => {
  console.log(`[Workflow Marketplace] Service started on port ${PORT}`);
  console.log(`[Workflow Marketplace] ${workflows.size} workflows loaded`);
  console.log(`[Workflow Marketplace] ${categories.size} categories available`);
});
installGracefulShutdown(server);

module.exports = app;
