/**
 * Finance Department Pack
 * Complete AI finance team with accounting, reporting, and compliance
 */

import { Department } from '@hojai/agents';
import { Agent } from '@hojai/agents';

const invoiceAgent = new Agent({
  id: 'invoice-agent',
  name: 'Accounts Payable',
  role: 'ap',
  description: 'Invoice processing and vendor payments',
  skills: ['invoice_processing', 'po_matching', 'payment_scheduling', 'vendor_management'],
});

const arAgent = new Agent({
  id: 'ar-agent',
  name: 'Accounts Receivable',
  role: 'ar',
  description: 'Collections and revenue tracking',
  skills: ['collections', 'invoice_reminders', 'reconciliation', 'cash_application'],
});

const reportAgent = new Agent({
  id: 'report-agent',
  name: 'Financial Reporter',
  role: 'reporting',
  description: 'Financial reports and analysis',
  skills: ['financial_reports', 'variance_analysis', 'dashboarding', 'forecasting'],
});

const complianceAgent = new Agent({
  id: 'compliance-agent',
  name: 'Compliance Officer',
  role: 'compliance',
  description: 'Regulatory compliance and audit support',
  skills: ['tax_compliance', 'audit_support', 'policy_enforcement', 'risk_assessment'],
});

const fpAgent = new Agent({
  id: 'fp-agent',
  name: 'FP&A Analyst',
  role: 'fp',
  description: 'Financial planning and analysis',
  skills: ['budgeting', 'forecasting', 'scenario_modeling', 'kpi_tracking'],
});

export const financeDepartment = new Department({
  id: 'finance-department',
  name: 'Finance Department',
  type: 'finance',
  description: 'AI-powered finance team with AP, AR, reporting, compliance, and FP&A',
  head: fpAgent,
  agents: [invoiceAgent, arAgent, reportAgent, complianceAgent, fpAgent],
  workflows: [
    'invoice-processing',
    'expense-approval',
    'budget-alerts',
    'cashflow-forecast',
    'monthly-close',
    'vendor-onboarding',
    'collections',
    'compliance-check',
  ],
  twins: ['vendor_twin', 'customer_twin', 'expense_twin', 'invoice_twin', 'budget_twin'],
  memory: ['transaction_history', 'vendor_records', 'compliance_documents'],
});

export const financeMetrics = {
  agents: 5,
  estimatedMonthlyCost: 60000,
  workflows: 8,
  integrations: ['erp', 'accounting', 'banking', 'expense_management'],
};

export default financeDepartment;
