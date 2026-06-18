/**
 * Customer Model
 * Represents converted customers from leads/deals
 */

export interface Customer {
  id: string;
  // Basic Information
  firstName?: string;
  lastName?: string;
  fullName: string;
  email: string;
  phone?: string;
  alternateEmail?: string;
  alternatePhone?: string;

  // Company Information
  company: CompanyInfo;

  // Account Details
  accountType: AccountType;
  tier: CustomerTier;
  segment: CustomerSegment;
  industry: string;

  // Lifecycle
  status: CustomerStatus;
  lifecycleStage: LifecycleStage;
  health: CustomerHealth;

  // Conversion Details
  convertedFromLead?: string;
  convertedFromDeal?: string;
  convertedAt: Date;
  conversionValue: number;
  conversionSource?: string;

  // Subscription & Billing
  subscription: Subscription;
  billing: BillingInfo;

  // Engagement
  engagement: EngagementMetrics;
  nps?: number;
  satisfaction?: SatisfactionMetrics;

  // Relationships
  ownerId: string;
  ownerName: string;
  accountManager?: string;
  primaryContact: Contact;
  contacts: Contact[];

  // Partnerships
  partner?: PartnerReference;
  referralSource?: string;

  // Success
  successMetrics: SuccessMetrics;
  milestones: CustomerMilestone[];
  healthHistory: HealthHistoryPoint[];

  // Intelligence
  trustScore?: TrustScore;
  brandAffinity?: BrandAffinity;
  technology?: TechnologyStack;

  // Activity
  activities: CustomerActivity[];
  lastActivityAt?: Date;
  nextCheckIn?: Date;

  // Financial
  ltv: number;
  acquisitionCost: number;
  roi: number;
  paymentHistory: PaymentRecord[];

  // Organization
  organizationId: string;

  // Tags & Notes
  tags: string[];
  notes?: string;
  customFields?: Record<string, any>;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
}

export type AccountType =
  | 'individual' | 'small_business'
  | 'mid_market' | 'enterprise' | 'strategic';

export type CustomerTier =
  | 'free' | 'starter' | 'professional'
  | 'business' | 'enterprise' | 'strategic';

export type CustomerSegment =
  | 'smb' | 'mid_market' | 'enterprise'
  | 'government' | 'education' | 'nonprofit';

export type CustomerStatus =
  | 'active' | 'inactive' | 'churned' | 'at_risk'
  | 'paused' | 'trial' | 'pending';

export type LifecycleStage =
  | 'onboarding' | 'adoption' | 'value' | 'advocacy'
  | 'renewal' | 'expansion' | 'churn';

export type CustomerHealth = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface CompanyInfo {
  id?: string;
  name: string;
  legalName?: string;
  website?: string;
  logo?: string;
  industry: string;
  subIndustry?: string;
  size: CompanySize;
  founded?: number;
  headquarters: Location;
  locations?: Location[];
  description?: string;
  mission?: string;
  values?: string[];
}

export type CompanySize =
  | '1-10' | '11-50' | '51-200' | '201-500'
  | '501-1000' | '1001-5000' | '5001-10000' | '10000+';

export interface Location {
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  type: LocationType;
}

export type LocationType = 'headquarters' | 'branch' | 'warehouse' | 'other';

export interface Subscription {
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  mrr: number;
  arr: number;
  currency: string;
  billingCycle: BillingCycle;
  startDate: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  items: SubscriptionItem[];
}

export type SubscriptionStatus =
  | 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused';

export type BillingCycle = 'monthly' | 'quarterly' | 'annually';

export interface SubscriptionItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  recurring: boolean;
}

export interface BillingInfo {
  currency: string;
  paymentMethod: PaymentMethod;
  billingAddress: BillingAddress;
  vatId?: string;
  taxExempt: boolean;
  invoicePrefix: string;
  invoices: InvoiceReference[];
  balance: number;
  creditLimit?: number;
}

export interface PaymentMethod {
  type: PaymentType;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export type PaymentType = 'card' | 'bank_transfer' | 'check' | 'wire' | 'other';

export interface BillingAddress {
  name: string;
  company?: string;
  address: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface InvoiceReference {
  id: string;
  number: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: Date;
  paidAt?: Date;
}

export type InvoiceStatus =
  | 'draft' | 'pending' | 'paid' | 'overdue' | 'void';

export interface EngagementMetrics {
  loginFrequency: number;
  featureAdoption: FeatureAdoption;
  lastLoginAt?: Date;
  avgSessionDuration: number;
  monthlyActiveUsers: number;
  dailyActiveUsers: number;
  apiCalls?: number;
  dataVolume?: number;
  integrationsUsed: number;
  supportTickets: number;
  adoptionTrend: 'increasing' | 'stable' | 'declining';
}

export interface FeatureAdoption {
  totalFeatures: number;
  usedFeatures: number;
  adoptionRate: number;
  coreFeatures: CoreFeatureUsage;
  premiumFeatures?: CoreFeatureUsage;
}

export interface CoreFeatureUsage {
  [featureName: string]: {
    enabled: boolean;
    used: boolean;
    lastUsedAt?: Date;
    usageCount: number;
  };
}

export interface SatisfactionMetrics {
  npsScore?: number;
  npsSurveyDate?: Date;
  csatScore?: number;
  cesScore?: number;
  feedbackCount: number;
  complaintsCount: number;
  complimentsCount: number;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  title?: string;
  department?: string;
  isPrimary: boolean;
  isDecisionMaker: boolean;
  role?: ContactRole;
  linkedIn?: string;
  avatar?: string;
  timezone?: string;
  preferences?: ContactPreferences;
  lastContactedAt?: Date;
  notes?: string;
}

export type ContactRole =
  | 'champion' | 'executive' | 'technical'
  | 'financial' | 'day_to_day' | 'other';

export interface ContactPreferences {
  emailFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  preferredContactMethod: 'email' | 'phone' | 'linkedin';
  bestTimeToContact?: string;
}

export interface PartnerReference {
  id: string;
  name: string;
  type: PartnerType;
  since: Date;
}

export type PartnerType =
  | 'reseller' | 'referral' | 'technology'
  | 'implementation' | 'training' | 'strategic';

export interface SuccessMetrics {
  adoptionScore: number;
  roiScore: number;
  healthScore: number;
  valueScore: number;
  riskScore: number;
  lastQBR?: Date;
  nextQBR?: Date;
  healthChecksCompleted: number;
  integrationsEnabled: number;
  apiIntegrations: number;
  dataMigrated: boolean;
  trainingCompleted: boolean;
  goals: Goal[];
  achievements: Achievement[];
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: Date;
  status: GoalStatus;
  progress: number;
}

export type GoalCategory =
  | 'adoption' | 'revenue' | 'engagement'
  | 'integration' | 'training' | 'custom';

export type GoalStatus = 'not_started' | 'in_progress' | 'at_risk' | 'achieved' | 'missed';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: AchievementType;
  achievedAt: Date;
  badge?: string;
  points?: number;
}

export type AchievementType =
  | 'onboarding_complete' | 'first_milestone' | 'roi_achieved'
  | 'integration_master' | 'power_user' | 'advocate' | 'champion';

export interface CustomerMilestone {
  id: string;
  title: string;
  description: string;
  type: MilestoneType;
  date: Date;
  relatedDealId?: string;
  relatedContactId?: string;
  metadata?: Record<string, any>;
}

export type MilestoneType =
  | 'conversion' | 'first_purchase' | 'expansion'
  | 'renewal' | 'anniversary' | 'upgrade'
  | 'referral' | 'case_study' | 'award';

export interface HealthHistoryPoint {
  date: Date;
  health: CustomerHealth;
  score: number;
  factors: HealthFactor[];
  predictedRisk?: number;
}

export interface HealthFactor {
  name: string;
  contribution: number;
  trend: 'improving' | 'stable' | 'declining';
  details?: string;
}

export interface CustomerActivity {
  id: string;
  type: ActivityType;
  description: string;
  performedBy: string;
  performedAt: Date;
  relatedTo?: string;
  metadata?: Record<string, any>;
}

export type ActivityType =
  | 'note' | 'call' | 'meeting' | 'email'
  | 'support_ticket' | 'check_in' | 'health_update'
  | 'contract_signed' | 'payment_received' | 'upgrade' | 'downgrade';

export interface TrustScore {
  overall: number;
  financial: number;
  compliance: number;
  operational: number;
  lastUpdated: Date;
  verified: boolean;
  verificationDate?: Date;
}

export interface BrandAffinity {
  engagement: number;
  mentions: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  nps?: number;
  referrals?: number;
}

export interface TechnologyStack {
  crm?: string[];
  marketing?: string[];
  analytics?: string[];
  finance?: string[];
  operations?: string[];
  other?: string[];
}

export interface PaymentRecord {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  type: PaymentRecordType;
  status: PaymentStatus;
  invoiceId?: string;
  description?: string;
}

export type PaymentRecordType = 'charge' | 'refund' | 'credit' | 'adjustment';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

// Customer Filters
export interface CustomerFilters {
  status?: CustomerStatus[];
  tier?: CustomerTier[];
  segment?: CustomerSegment[];
  industry?: string[];
  ownerId?: string[];
  health?: CustomerHealth[];
  lifecycleStage?: LifecycleStage[];
  subscriptionStatus?: SubscriptionStatus[];
  tags?: string[];
  ltvMin?: number;
  ltvMax?: number;
  lastActivityBefore?: Date;
  lastActivityAfter?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
}

// Customer Stats
export interface CustomerStats {
  total: number;
  active: number;
  atRisk: number;
  churned: number;
  byTier: Record<CustomerTier, number>;
  bySegment: Record<CustomerSegment, number>;
  byIndustry: Record<string, number>;
  totalMRR: number;
  totalARR: number;
  avgLTV: number;
  avgCAC: number;
  avgHealth: number;
  avgNPS: number;
  totalRevenue: number;
  avgDealSize: number;
}
