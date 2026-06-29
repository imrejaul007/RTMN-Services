/**
 * AI Worker Registry
 *
 * Central registry of all available AI workers.
 */

import { AIWorker, WorkerRegistry } from '../types';

// ============================================
// All Available AI Workers
// ============================================

export const WORKER_REGISTRY: WorkerRegistry = {
  // ============================================
  // Finance Workers
  // ============================================
  'ai-cfo': {
    id: 'ai-cfo',
    name: 'AI Chief Financial Officer',
    department: 'finance',
    level: 'senior',
    description: 'Leads finance department, reports to CEO, oversees all financial operations',
    capabilities: [
      'financial_planning',
      'cash_flow_optimization',
      'risk_management',
      'investor_reporting',
      'board_presentations',
      'budget_oversight',
      'treasury_management',
    ],
    skills: [
      'financial_analysis',
      'cash_flow_management',
      'risk_assessment',
      'investment_planning',
      'compliance_management',
      'stakeholder_communication',
    ],
    policies: ['spending-limits', 'approval-matrix', 'board-reporting'],
    authority: {
      maxTransactionValue: 100000,
      requireApprovalAbove: 500000,
      canApproveBudgets: true,
      canHireStaff: false,
      canFireVendors: false,
    },
    memory: {
      shortTerm: true,
      longTerm: true,
      retention: '90d',
      sources: ['erp_system', 'bank_statements', 'invoices', 'market_data'],
    },
    twin: {
      type: 'worker:ai-cfo',
      updateFrequency: 'realtime',
    },
    status: 'registered',
  },

  'ai-accountant': {
    id: 'ai-accountant',
    name: 'AI Accountant',
    department: 'finance',
    level: 'senior',
    description: 'Handles day-to-day accounting operations and bookkeeping',
    capabilities: [
      'bookkeeping',
      'invoice_processing',
      'reconciliation',
      'tax_calculation',
      'financial_reporting',
      'audit_support',
    ],
    skills: [
      'double_entry_bookkeeping',
      'tally_erp',
      'gst_compliance',
      'tds_calculation',
      'payroll_accounting',
    ],
    policies: ['invoice-validation', 'reconciliation-check'],
    authority: {
      maxTransactionValue: 10000,
      requireApprovalAbove: 50000,
      canApproveBudgets: false,
      canHireStaff: false,
      canFireVendors: false,
    },
    memory: {
      shortTerm: true,
      longTerm: true,
      retention: '180d',
      sources: ['invoices', 'bank_statements', 'expense_reports'],
    },
    twin: {
      type: 'worker:ai-accountant',
      updateFrequency: 'hourly',
    },
    status: 'registered',
  },

  'ai-treasury-manager': {
    id: 'ai-treasury-manager',
    name: 'AI Treasury Manager',
    department: 'finance',
    level: 'senior',
    description: 'Manages cash, liquidity, and banking relationships',
    capabilities: [
      'cash_flow_forecasting',
      'investment_management',
      'bank_relationship',
      'liquidity_optimization',
      'forex_management',
    ],
    skills: [
      'cash_flow_forecasting',
      'investment_portfolio',
      'banking_operations',
      'working_capital',
    ],
    policies: ['treasury-limits', 'investment-policy'],
    authority: {
      maxTransactionValue: 250000,
      requireApprovalAbove: 1000000,
      canApproveBudgets: false,
      canHireStaff: false,
      canFireVendors: false,
    },
    memory: {
      shortTerm: true,
      longTerm: true,
      retention: '30d',
      sources: ['bank_accounts', 'market_data', 'payment_history'],
    },
    twin: {
      type: 'worker:ai-treasury-manager',
      updateFrequency: 'realtime',
    },
    status: 'registered',
  },

  // ============================================
  // HR Workers
  // ============================================
  'ai-recruiter': {
    id: 'ai-recruiter',
    name: 'AI Recruiter',
    department: 'hr',
    level: 'senior',
    description: 'Screens candidates, schedules interviews, manages hiring pipeline',
    capabilities: [
      'resume_screening',
      'candidate_sourcing',
      'interview_scheduling',
      'offer_management',
      'background_verification',
    ],
    skills: [
      'candidate_matching',
      'job_description_writing',
      'interview_question_generation',
      'compensation_analysis',
    ],
    policies: ['hiring-approval', 'salary-benchmarking'],
    authority: {
      maxTransactionValue: 0,
      requireApprovalAbove: 0,
      canApproveBudgets: false,
      canHireStaff: false,
      canFireVendors: false,
    },
    memory: {
      shortTerm: true,
      longTerm: true,
      retention: '365d',
      sources: ['ats_system', 'linkedin', 'resume_database'],
    },
    twin: {
      type: 'worker:ai-recruiter',
      updateFrequency: 'daily',
    },
    status: 'registered',
  },

  'ai-payroll-manager': {
    id: 'ai-payroll-manager',
    name: 'AI Payroll Manager',
    department: 'hr',
    level: 'senior',
    description: 'Processes payroll, manages compliance, handles benefits',
    capabilities: [
      'payroll_processing',
      'compliance_management',
      'benefits_administration',
      'pf_esi_management',
      'expense_processing',
    ],
    skills: [
      'salary_calculation',
      'pf_esi_compliance',
      'gst_on_fringe_benefits',
      'leave_management',
    ],
    policies: ['payroll-validation', 'compliance-check'],
    authority: {
      maxTransactionValue: 1000,
      requireApprovalAbove: 10000,
      canApproveBudgets: false,
      canHireStaff: false,
      canFireVendors: false,
    },
    memory: {
      shortTerm: true,
      longTerm: true,
      retention: '7y',
      sources: ['hris_system', 'attendance_system', 'bank_records'],
    },
    twin: {
      type: 'worker:ai-payroll-manager',
      updateFrequency: 'monthly',
    },
    status: 'registered',
  },

  // ============================================
  // Marketing Workers
  // ============================================
  'ai-cmo': {
    id: 'ai-cmo',
    name: 'AI Chief Marketing Officer',
    department: 'marketing',
    level: 'senior',
    description: 'Leads marketing strategy, brand management, campaign oversight',
    capabilities: [
      'marketing_strategy',
      'brand_management',
      'campaign_optimization',
      'budget_allocation',
      'market_intelligence',
      'competitor_analysis',
    ],
    skills: [
      'campaign_strategy',
      'budget_optimization',
      'brand_management',
      'market_research',
      'performance_marketing',
    ],
    policies: ['campaign-limits', 'brand-guidelines'],
    authority: {
      maxTransactionValue: 50000,
      requireApprovalAbove: 200000,
      canApproveBudgets: true,
      canHireStaff: false,
      canFireVendors: false,
    },
    memory: {
      shortTerm: true,
      longTerm: true,
      retention: '90d',
      sources: ['analytics', 'crm', 'competitor_data', 'market_trends'],
    },
    twin: {
      type: 'worker:ai-cmo',
      updateFrequency: 'daily',
    },
    status: 'registered',
  },

  'ai-content-manager': {
    id: 'ai-content-manager',
    name: 'AI Content Manager',
    department: 'marketing',
    level: 'senior',
    description: 'Creates and manages content across all channels',
    capabilities: [
      'content_creation',
      'seo_optimization',
      'social_posting',
      'email_campaigns',
      'copywriting',
    ],
    skills: [
      'content_writing',
      'seo_optimization',
      'social_media_management',
      'email_marketing',
    ],
    policies: ['content-approval', 'brand-voice'],
    authority: {
      maxTransactionValue: 5000,
      requireApprovalAbove: 25000,
      canApproveBudgets: false,
      canHireStaff: false,
      canFireVendors: false,
    },
    memory: {
      shortTerm: true,
      longTerm: true,
      retention: '180d',
      sources: ['content_library', 'seo_tools', 'social_media'],
    },
    twin: {
      type: 'worker:ai-content-manager',
      updateFrequency: 'daily',
    },
    status: 'registered',
  },

  // ============================================
  // Sales Workers
  // ============================================
  'ai-sdr': {
    id: 'ai-sdr',
    name: 'AI Sales Development Rep',
    department: 'sales',
    level: 'senior',
    description: 'Qualifies leads, schedules meetings, manages outbound pipeline',
    capabilities: [
      'lead_qualification',
      'cold_outreach',
      'meeting_scheduling',
      'follow_up_management',
      'crm_data_entry',
    ],
    skills: [
      'lead_scoring',
      'email_outreach',
      'calendar_management',
      'discovery_calls',
    ],
    policies: ['outreach-limits', 'communication-guidelines'],
    authority: {
      maxTransactionValue: 0,
      requireApprovalAbove: 0,
      canApproveBudgets: false,
      canHireStaff: false,
      canFireVendors: false,
    },
    memory: {
      shortTerm: true,
      longTerm: true,
      retention: '90d',
      sources: ['crm', 'linkedin', 'email_history'],
    },
    twin: {
      type: 'worker:ai-sdr',
      updateFrequency: 'daily',
    },
    status: 'registered',
  },

  'ai-closer': {
    id: 'ai-closer',
    name: 'AI Sales Closer',
    department: 'sales',
    level: 'senior',
    description: 'Negotiates deals, creates proposals, closes revenue',
    capabilities: [
      'deal_negotiation',
      'proposal_creation',
      'pricing_optimization',
      'contract_review',
      'stakeholder_management',
    ],
    skills: [
      'negotiation',
      'pricing_strategy',
      'proposal_writing',
      'objection_handling',
    ],
    policies: ['discount-limits', 'contract-approval'],
    authority: {
      maxTransactionValue: 25000,
      requireApprovalAbove: 100000,
      canApproveBudgets: false,
      canHireStaff: false,
      canFireVendors: false,
    },
    memory: {
      shortTerm: true,
      longTerm: true,
      retention: '365d',
      sources: ['crm', 'deal_history', 'competitor_intel'],
    },
    twin: {
      type: 'worker:ai-closer',
      updateFrequency: 'daily',
    },
    status: 'registered',
  },

  // ============================================
  // Operations Workers
  // ============================================
  'ai-ops-manager': {
    id: 'ai-ops-manager',
    name: 'AI Operations Manager',
    department: 'operations',
    level: 'senior',
    description: 'Optimizes operations, manages resources, ensures quality',
    capabilities: [
      'process_optimization',
      'resource_allocation',
      'risk_management',
      'vendor_management',
      'quality_assurance',
    ],
    skills: [
      'process_improvement',
      'sla_management',
      'vendor_evaluation',
      'capacity_planning',
    ],
    policies: ['ops-approval', 'sla-compliance'],
    authority: {
      maxTransactionValue: 25000,
      requireApprovalAbove: 100000,
      canApproveBudgets: true,
      canHireStaff: false,
      canFireVendors: false,
    },
    memory: {
      shortTerm: true,
      longTerm: true,
      retention: '90d',
      sources: ['ops_dashboard', 'sla_metrics', 'vendor_data'],
    },
    twin: {
      type: 'worker:ai-ops-manager',
      updateFrequency: 'hourly',
    },
    status: 'registered',
  },

  // ============================================
  // Legal Workers
  // ============================================
  'ai-legal-counsel': {
    id: 'ai-legal-counsel',
    name: 'AI Legal Counsel',
    department: 'legal',
    level: 'senior',
    description: 'Reviews contracts, ensures compliance, manages legal risk',
    capabilities: [
      'contract_review',
      'compliance_check',
      'risk_assessment',
      'legal_research',
      'policy_review',
    ],
    skills: [
      'contract_analysis',
      'regulatory_compliance',
      'risk_quantification',
      'legal_drafting',
    ],
    policies: ['legal-review', 'regulatory-compliance'],
    authority: {
      maxTransactionValue: 0,
      requireApprovalAbove: 0,
      canApproveBudgets: false,
      canHireStaff: false,
      canFireVendors: false,
    },
    memory: {
      shortTerm: true,
      longTerm: true,
      retention: '7y',
      sources: ['contract_repository', 'compliance_logs', 'legal_precedents'],
    },
    twin: {
      type: 'worker:ai-legal-counsel',
      updateFrequency: 'daily',
    },
    status: 'registered',
  },
};

// ============================================
// Registry Functions
// ============================================

/**
 * Get all registered workers
 */
export function getAllWorkers(): AIWorker[] {
  return Object.values(WORKER_REGISTRY);
}

/**
 * Get worker by ID
 */
export function getWorker(workerId: string): AIWorker | undefined {
  return WORKER_REGISTRY[workerId];
}

/**
 * Get workers by department
 */
export function getWorkersByDepartment(department: string): AIWorker[] {
  return Object.values(WORKER_REGISTRY).filter(w => w.department === department);
}

/**
 * Check if worker exists
 */
export function workerExists(workerId: string): boolean {
  return workerId in WORKER_REGISTRY;
}

/**
 * Get worker count by department
 */
export function getWorkerCountByDepartment(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const worker of Object.values(WORKER_REGISTRY)) {
    counts[worker.department] = (counts[worker.department] || 0) + 1;
  }
  return counts;
}
