/**
 * @hojai/department SDK
 *
 * Client for the 9 horizontal Department OS services of RTMN. Pairs
 * with @hojai/industry to cover the **8 horizontal × 26 vertical matrix**
 * that is the core RTMN value prop.
 *
 * @example
 * ```ts
 * import { Department } from '@hojai/department';
 *
 * const dept = new Department({ apiKey, baseUrl: 'https://api.hojai.ai' });
 *
 * // 1. Sales: create a lead, qualify, convert to deal
 * const lead = await dept.sales.createLead({ name: 'Maya Collective', source: 'web' });
 * await dept.sales.qualifyLead(lead.id, { score: 87 });
 * const deal = await dept.sales.createDeal({ name: 'Maya × 1000 units', leadId: lead.id, value: { amount: 50000, currency: 'USD' } });
 *
 * // 2. Workforce: onboard a new employee
 * const employee = await dept.workforce.createEmployee({
 *   name: 'Alice', email: 'alice@example.com', role: 'Engineer', hireDate: '2026-07-01'
 * });
 *
 * // 3. CXO: executive KPI dashboard
 * const kpis = await dept.cxo.getKpis();
 *
 * // 4. Revenue Intelligence: forecast
 * const forecast = await dept.revenueIntelligence.forecast({ months: 12 });
 *
 * // 5. Cross-OS company view
 * const summary = {
 *   employees: (await dept.workforce.listEmployees()).length,
 *   openDeals: (await dept.sales.listDeals({ stage: 'negotiation' })).length,
 *   mrr: (await dept.revenueIntelligence.getRevenueHub()).totalMrr,
 * };
 * ```
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { DepartmentBaseClient, DEPARTMENT_PORTS } from './base.js';
import { SalesClient, type Lead, type Deal, type Account, type Activity, type LeadStatus, type LeadSource, type DealStage } from './sales.js';
import { MarketingClient, type Brand, type Campaign, type Audience, type Content, type Journey, type CampaignChannel, type CampaignStatus } from './marketing.js';
import { CustomerSuccessClient, type CsCustomer, type NpsSurvey, type HealthSnapshot, type CheckIn, type HealthStatus, type NpsCategory } from './customer-success.js';
import { ProcurementClient, type Supplier, type Requisition, type PurchaseOrder, type Rfq, type SupplierStatus, type RequisitionStatus, type PurchaseOrderStatus } from './procurement.js';
import { WorkforceClient, type HrDepartment, type Employee, type Attendance, type LeaveRequest, type Payroll, type EmployeeStatus, type LeaveType, type LeaveStatus } from './workforce.js';
import { FinanceClient, type FinAccount, type LedgerEntry, type TrialBalance, type FinancialReport, type IndustryFinancials, type AccountType, type EntryType } from './finance.js';
import { OperationsClient, type Project, type Process, type Incident, type Risk, type Sop, type ProjectStatus, type IncidentSeverity, type IncidentStatus, type RiskLevel } from './operations.js';
import { CxoClient, type ExecutiveKpi, type StrategicPillar, type DepartmentSummary, type BoardReport, type Competitor, type StrategicPillarStatus } from './cxo.js';
import { RevenueIntelligenceClient, type RevenueStream, type RevenueSnapshot, type DemandSignal, type PricingRecommendation, type Promotion, type Cohort, type RevenueScenario, type RevenueStreamKind, type PricingModel } from './revenue-intelligence.js';
import type { Money, DateRange, Contact } from './types.js';

export type { HojaiConfig } from './foundation-config.js';
export { resolveConfig } from './foundation-config.js';
export { DepartmentBaseClient, DEPARTMENT_PORTS } from './base.js';
export type { Money, DateRange, Contact } from './types.js';

export { SalesClient, type Lead, type Deal, type Account, type Activity, type LeadStatus, type LeadSource, type DealStage } from './sales.js';
export { MarketingClient, type Brand, type Campaign, type Audience, type Content, type Journey, type CampaignChannel, type CampaignStatus } from './marketing.js';
export { CustomerSuccessClient, type CsCustomer, type NpsSurvey, type HealthSnapshot, type CheckIn, type HealthStatus, type NpsCategory } from './customer-success.js';
export { ProcurementClient, type Supplier, type Requisition, type PurchaseOrder, type Rfq, type SupplierStatus, type RequisitionStatus, type PurchaseOrderStatus } from './procurement.js';
export { WorkforceClient, type HrDepartment, type Employee, type Attendance, type LeaveRequest, type Payroll, type EmployeeStatus, type LeaveType, type LeaveStatus } from './workforce.js';
export { FinanceClient, type FinAccount, type LedgerEntry, type TrialBalance, type FinancialReport, type IndustryFinancials, type AccountType, type EntryType } from './finance.js';
export { OperationsClient, type Project, type Process, type Incident, type Risk, type Sop, type ProjectStatus, type IncidentSeverity, type IncidentStatus, type RiskLevel } from './operations.js';
export { CxoClient, type ExecutiveKpi, type StrategicPillar, type DepartmentSummary, type BoardReport, type Competitor, type StrategicPillarStatus } from './cxo.js';
export { RevenueIntelligenceClient, type RevenueStream, type RevenueSnapshot, type DemandSignal, type PricingRecommendation, type Promotion, type Cohort, type RevenueScenario, type RevenueStreamKind, type PricingModel } from './revenue-intelligence.js';

/**
 * Main Department SDK client (facade)
 *
 * Exposes one sub-client per Department OS, each targeting its dedicated
 * port. Together with @hojai/industry, covers the 8 × 26 RTMN matrix.
 */
export class Department {
  public readonly sales: SalesClient;
  public readonly marketing: MarketingClient;
  public readonly customerSuccess: CustomerSuccessClient;
  public readonly procurement: ProcurementClient;
  public readonly workforce: WorkforceClient;
  public readonly finance: FinanceClient;
  public readonly operations: OperationsClient;
  public readonly cxo: CxoClient;
  public readonly revenueIntelligence: RevenueIntelligenceClient;
  public readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.sales = new SalesClient(resolved);
    this.marketing = new MarketingClient(resolved);
    this.customerSuccess = new CustomerSuccessClient(resolved);
    this.procurement = new ProcurementClient(resolved);
    this.workforce = new WorkforceClient(resolved);
    this.finance = new FinanceClient(resolved);
    this.operations = new OperationsClient(resolved);
    this.cxo = new CxoClient(resolved);
    this.revenueIntelligence = new RevenueIntelligenceClient(resolved);
  }
}

export default Department;
