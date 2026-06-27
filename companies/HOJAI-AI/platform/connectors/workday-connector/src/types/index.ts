/**
 * TypeScript types for Workday Connector
 * Covers all Workday HCM, Payroll, and Time Tracking APIs
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface WorkdayConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  privateKeyPath: string;
  privateKeyPassword?: string;
  refreshToken?: string;
  apiBaseUrl?: string;
  wqlEndpoint?: string;
  webhookSecret?: string;
}

export interface WorkdayCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
  scope?: string;
}

// ============================================================================
// OAuth & SAML Types
// ============================================================================

export interface SAMLAssertionConfig {
  issuer: string;
  subjectNameId: string;
  audience: string;
  privateKeyPath: string;
  privateKeyPassword?: string;
  certificatePath: string;
  workdayUsername: string;
}

export interface SAMLAssertion {
  assertion: string;
  expiresAt: Date;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  issued_at?: string;
}

// ============================================================================
// Worker Types
// ============================================================================

export interface WorkdayWorker {
  id: string;
  descriptor: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  primaryWorkEmail?: string;
  businessTitle?: string;
  supervisoryOrganization?: WorkdaySupervisoryOrganization;
  managerId?: string;
  managerName?: string;
  hireDate?: Date;
  terminationDate?: Date;
  workerType?: WorkdayWorkerType;
  location?: WorkdayLocation;
  costCenter?: WorkdayCostCenter;
  payGroup?: WorkdayPayGroup;
  active: boolean;
  workerStatus?: string;
  phoneNumbers?: WorkdayPhoneNumber[];
  addresses?: WorkdayAddress[];
  emergencyContacts?: WorkdayEmergencyContact[];
  customFields?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkdayWorkerType {
  id: string;
  descriptor: string;
  code?: string;
}

export interface WorkdayPhoneNumber {
  id: string;
  type: string;
  countryCode?: string;
  phoneNumber: string;
  primary: boolean;
}

export interface WorkdayAddress {
  id: string;
  type: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  formattedAddress?: string;
}

export interface WorkdayEmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  priority: number;
}

export interface WorkerQueryParams {
  limit?: number;
  offset?: number;
  active?: boolean;
  supervisorId?: string;
  organizationId?: string;
  locationId?: string;
  searchText?: string;
  include?: string[];
  fields?: string[];
  sort?: string;
  ascending?: boolean;
}

export interface WorkerListResponse {
  data: WorkdayWorker[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ============================================================================
// Organization Types
// ============================================================================

export interface WorkdaySupervisoryOrganization {
  id: string;
  descriptor: string;
  name: string;
  parentOrgId?: string;
  parentOrgName?: string;
  leaderId?: string;
  leaderName?: string;
  orgType?: string;
  inactive?: boolean;
}

export interface WorkdayCostCenter {
  id: string;
  descriptor: string;
  code: string;
  name: string;
  description?: string;
  managerId?: string;
  managerName?: string;
  region?: string;
  inactive?: boolean;
}

export interface WorkdayBusinessTitle {
  id: string;
  descriptor: string;
  jobProfileId?: string;
  jobProfileName?: string;
  level?: string;
  family?: string;
}

export interface WorkdayLocation {
  id: string;
  descriptor: string;
  name: string;
  address?: WorkdayAddress;
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  locationType?: string;
  timeZone?: string;
  inactive?: boolean;
}

export interface WorkdayOrganizationHierarchy {
  id: string;
  name: string;
  level: number;
  parent?: WorkdayOrganizationHierarchy;
  children: WorkdayOrganizationHierarchy[];
  workers: WorkdayWorker[];
}

export interface OrganizationQueryParams {
  limit?: number;
  offset?: number;
  parentOrgId?: string;
  includeChildren?: boolean;
  active?: boolean;
  searchText?: string;
  fields?: string[];
}

// ============================================================================
// Time Off / Absence Types
// ============================================================================

export interface WorkdayTimeOffRequest {
  id: string;
  descriptor: string;
  workerId: string;
  workerName: string;
  type: WorkdayTimeOffType;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  status: WorkdayTimeOffStatus;
  statusDate?: Date;
  submittedDate?: Date;
  approvedBy?: string;
  approvedByName?: string;
  denialReason?: string;
  comments?: string;
  cancelReason?: string;
  balanceImpact?: number;
  createdAt?: Date;
}

export interface WorkdayTimeOffType {
  id: string;
  descriptor: string;
  name: string;
  code: string;
  category?: string;
  color?: string;
}

export type WorkdayTimeOffStatus =
  | 'APPROVED'
  | 'DENIED'
  | 'CANCELLED'
  | 'SUBMITTED'
  | 'NOT_SUBMITTED'
  | 'SUSPENDED'
  | 'ON_HOLD'
  | 'APPROVAL_IN_PROGRESS';

export interface WorkdayTimeOffBalance {
  workerId: string;
  workerName: string;
  timeOffType: WorkdayTimeOffType;
  availableBalance: number;
  pendingBalance: number;
  usedBalance: number;
  totalEntitlement: number;
  accrualRate?: number;
  asOfDate: Date;
  expirationDate?: Date;
  unit: string;
}

export interface TimeOffRequestInput {
  workerId: string;
  timeOffTypeId: string;
  startDate: string;
  endDate: string;
  comments?: string;
  partialDay?: boolean;
  partialDays?: WorkdayPartialDay[];
}

export interface WorkdayPartialDay {
  date: string;
  hours: number;
}

export interface TimeOffQueryParams {
  limit?: number;
  offset?: number;
  workerId?: string;
  status?: WorkdayTimeOffStatus[];
  startDate?: string;
  endDate?: string;
  timeOffTypeId?: string;
  includeDetails?: boolean;
}

export interface TimeOffBalanceQueryParams {
  workerId: string;
  asOfDate?: string;
  timeOffTypeId?: string;
  includeProjectedBalance?: boolean;
}

export interface AccrualRate {
  id: string;
  descriptor: string;
  timeOffTypeId: string;
  timeOffTypeName: string;
  accrualRate: number;
  unit: string;
  maxCarryover?: number;
  maxBalance?: number;
  waitingPeriodDays?: number;
}

// ============================================================================
// Payroll Types
// ============================================================================

export interface WorkdayPayGroup {
  id: string;
  descriptor: string;
  name: string;
  code: string;
  payFrequency?: string;
  currency?: string;
  nextPayPeriodStart?: Date;
  nextPayPeriodEnd?: Date;
  inactive?: boolean;
}

export interface WorkdayPayPeriod {
  id: string;
  descriptor: string;
  payGroupId: string;
  startDate: Date;
  endDate: Date;
  payDate: Date;
  periodStatus: string;
  processingStatus?: string;
  isOpen: boolean;
  isClosed: boolean;
}

export interface WorkdayWorkerPayroll {
  workerId: string;
  workerName: string;
  payGroup: WorkdayPayGroup;
  effectiveDate: Date;
  payRate?: number;
  payRateType?: string;
  payFrequency?: string;
  currency?: string;
  exemptStatus?: string;
  salariedExempt?: boolean;
  annualBenefitBase?: number;
  compensationGrade?: string;
  compensationStep?: number;
  compensationRate?: number;
  additionalCompensations?: WorkdayAdditionalCompensation[];
}

export interface WorkdayAdditionalCompensation {
  id: string;
  descriptor: string;
  compensationType: string;
  amount: number;
  frequency: string;
  effectiveDate: Date;
  endDate?: Date;
  reason?: string;
}

export interface WorkdayPayStub {
  id: string;
  descriptor: string;
  workerId: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  payDate: Date;
  grossPay: number;
  netPay: number;
  currency: string;
  earnings: WorkdayEarning[];
  deductions: WorkdayDeduction[];
  taxes: WorkdayTax[];
  accruals?: WorkdayAccrual[];
}

export interface WorkdayEarning {
  type: string;
  typeDescriptor: string;
  hours?: number;
  rate?: number;
  amount: number;
  ytdAmount?: number;
}

export interface WorkdayDeduction {
  type: string;
  typeDescriptor: string;
  amount: number;
  ytdAmount?: number;
  isPreTax: boolean;
}

export interface WorkdayTax {
  type: string;
  typeDescriptor: string;
  federal?: number;
  state?: number;
  local?: number;
  ytdAmount?: number;
}

export interface WorkdayAccrual {
  type: string;
  typeDescriptor: string;
  balance: number;
  used: number;
  ytdAmount?: number;
}

export interface PayrollQueryParams {
  limit?: number;
  offset?: number;
  active?: boolean;
  effectiveDate?: string;
}

export interface PayPeriodQueryParams {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  isOpen?: boolean;
}

// ============================================================================
// Hire & Termination Types
// ============================================================================

export interface WorkdayHire {
  id: string;
  workerId: string;
  workerName: string;
  hireDate: Date;
  hireType: string;
  businessTitle: string;
  supervisoryOrganization: WorkdaySupervisoryOrganization;
  location: WorkdayLocation;
  costCenter: WorkdayCostCenter;
  payGroup: WorkdayPayGroup;
  initialCompensation?: WorkdayWorkerPayroll;
  status: string;
  onboardingStatus?: string;
  createdAt: Date;
}

export interface WorkdayTermination {
  id: string;
  workerId: string;
  workerName: string;
  terminationDate: Date;
  terminationType: string;
  reason?: string;
  involuntary?: boolean;
  rehiredEligible?: boolean;
  finalPayDate?: Date;
  benefitsEndDate?: Date;
  accruedTimePaidOut?: boolean;
  ptoPayout?: number;
  severancePay?: number;
  createdAt: Date;
}

export interface HireQueryParams {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  organizationId?: string;
  status?: string;
}

export interface TerminationQueryParams {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  organizationId?: string;
  terminationType?: string;
}

// ============================================================================
// Benefits Types
// ============================================================================

export interface WorkdayBenefit {
  id: string;
  workerId: string;
  planType: string;
  planName: string;
  coverageLevel: string;
  enrollmentDate: Date;
  effectiveDate: Date;
  costPerPayPeriod?: number;
  employerContribution?: number;
  employeeContribution?: number;
  status: string;
}

export interface WorkdaySkills {
  skillId: string;
  skillName: string;
  proficiencyLevel?: string;
  yearsOfExperience?: number;
  lastUsedDate?: Date;
  certificationExpiry?: Date;
  verified: boolean;
}

export interface WorkerSkills {
  workerId: string;
  skills: WorkdaySkills[];
  languages?: WorkdayLanguage[];
  education?: WorkdayEducation[];
  certifications?: WorkdayCertification[];
}

export interface WorkdayLanguage {
  languageId: string;
  languageName: string;
  proficiencyLevel: string;
  isNative: boolean;
}

export interface WorkdayEducation {
  schoolName: string;
  degree: string;
  fieldOfStudy: string;
  graduationDate?: Date;
  gpa?: string;
}

export interface WorkdayCertification {
  certificationId: string;
  certificationName: string;
  issuingOrganization: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
  verified: boolean;
}

// ============================================================================
// Webhook Event Types
// ============================================================================

export interface WorkdayWebhookEvent {
  eventId: string;
  eventType: WorkdayEventType;
  eventTimestamp: Date;
  tenantId: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  changeData?: WorkdayChangeData;
}

export type WorkdayEventType =
  | 'worker.hired'
  | 'worker.terminated'
  | 'worker.rehired'
  | 'worker.updated'
  | 'worker.time_off_submitted'
  | 'worker.time_off_approved'
  | 'worker.time_off_denied'
  | 'worker.time_off_cancelled'
  | 'organization.updated'
  | 'organization.created'
  | 'payroll.processed'
  | 'benefit.enrollment_changed'
  | 'compensation.updated';

export interface WorkdayChangeData {
  changedFields?: string[];
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export interface WebhookHandlerConfig {
  verifySignature: boolean;
  signatureHeader: string;
  secret: string;
  handlers: Partial<Record<WorkdayEventType, (event: WorkdayWebhookEvent) => Promise<void>>>;
}

// ============================================================================
// Observer Event Types (for SUTAR OS integration)
// ============================================================================

export interface ObserverEvent {
  eventId: string;
  userId: string;
  eventType: string;
  timestamp: Date;
  source: 'workday';
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ObserverQueryParams {
  userId: string;
  startDate?: string;
  endDate?: string;
  eventType?: string;
  limit?: number;
}

// ============================================================================
// API Client Types
// ============================================================================

export interface WorkdayApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    offset?: number;
    limit?: number;
    requestId?: string;
  };
}

export interface WorkdayError {
  errorCode: string;
  errorMessage: string;
  details?: string;
  validationErrors?: WorkdayValidationError[];
  statusCode: number;
}

export interface WorkdayValidationError {
  field: string;
  message: string;
  code: string;
}

export interface WorkdayRequestConfig {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
}

// ============================================================================
// Compensation Types
// ============================================================================

export interface WorkdayCompensation {
  workerId: string;
  effectiveDate: Date;
  payRate?: number;
  payRateType: string;
  payFrequency: string;
  currency: string;
  compensationGrade?: string;
  compensationStep?: number;
  compensationRate?: number;
  annualBenefitBase?: number;
  hourlyRate?: number;
  salary?: number;
  additionalCompensations?: WorkdayAdditionalCompensation[];
  lastIncreaseDate?: Date;
  lastIncreaseAmount?: number;
  nextReviewDate?: Date;
  rangeMinimum?: number;
  rangeMidpoint?: number;
  rangeMaximum?: number;
  rangePercent?: number;
}

// ============================================================================
// Common Types
// ============================================================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

export interface SearchParams {
  searchText?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface SortParams {
  sort?: string;
  ascending?: boolean;
}

// ============================================================================
// WQL (Workday Query Language) Types
// ============================================================================

export interface WQLQuery {
  SelectFields: WQLSelectField[];
  From: string;
  Where?: string;
  OrderBy?: WQLOrderBy[];
  GroupBy?: string[];
  Having?: string;
  Limit?: number;
  Offset?: number;
}

export interface WQLSelectField {
  FieldPath: string;
  Alias?: string;
}

export interface WQLOrderBy {
  FieldPath: string;
  SortOrder: 'ASC' | 'DESC';
}

// ============================================================================
// Export all types
// ============================================================================

export type {
  PaginationParams,
  DateRangeParams,
  SearchParams,
  SortParams,
  SortDirection,
  WQLQuery,
  WQLSelectField,
  WQLOrderBy
};