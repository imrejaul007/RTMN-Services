import { z } from 'zod';

// ============================================
// Service Category Types
// ============================================

/**
 * Service Category Entity
 * Represents a hierarchical service category in the marketplace
 */
export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
  displayOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service Category Zod Schema
 */
export const ServiceCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Category name is required'),
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens'),
  description: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().uuid().optional(),
  displayOrder: z.number().int().default(0),
  active: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Create Service Category Input
 */
export interface CreateServiceCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  parentId?: string;
  displayOrder?: number;
}

export const CreateServiceCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens').optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().uuid().optional(),
  displayOrder: z.number().int().optional(),
});

/**
 * Update Service Category Input
 */
export interface UpdateServiceCategoryInput {
  name?: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
  active?: boolean;
}

export const UpdateServiceCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  displayOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

// ============================================
// Service Vendor Types
// ============================================

/**
 * Service Vendor Pricing Model
 */
export const ServicePricingModelSchema = z.enum(['fixed', 'hourly', 'project', 'per_unit', 'custom']);
export type ServicePricingModel = z.infer<typeof ServicePricingModelSchema>;

/**
 * Service Area Entry
 */
export interface ServiceAreaEntry {
  city: string;
  state?: string;
  radiusKm?: number;
}

export const ServiceAreaEntrySchema = z.object({
  city: z.string().min(1),
  state: z.string().optional(),
  radiusKm: z.number().positive().optional(),
});

/**
 * Certification Entry
 */
export interface CertificationEntry {
  name: string;
  validUntil?: string;
  documentUrl?: string;
}

export const CertificationEntrySchema = z.object({
  name: z.string().min(1),
  validUntil: z.string().optional(),
  documentUrl: z.string().url().optional(),
});

/**
 * Service Vendor Entity
 * Links a supplier to a service category they provide
 */
export interface ServiceVendor {
  id: string;
  supplierId: string;
  serviceCategoryId: string;
  description?: string;
  serviceArea: ServiceAreaEntry[];
  pricingModel: ServicePricingModel;
  hourlyRate?: number;
  projectRate?: number;
  minProjectValue?: number;
  certifications: CertificationEntry[];
  portfolioUrls: string[];
  avgResponseTimeHours?: number;
  active: boolean;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service Vendor Zod Schema
 */
export const ServiceVendorSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
  serviceCategoryId: z.string().uuid(),
  description: z.string().optional(),
  serviceArea: z.array(ServiceAreaEntrySchema).default([]),
  pricingModel: ServicePricingModelSchema.default('fixed'),
  hourlyRate: z.number().positive().optional(),
  projectRate: z.number().positive().optional(),
  minProjectValue: z.number().positive().optional(),
  certifications: z.array(CertificationEntrySchema).default([]),
  portfolioUrls: z.array(z.string().url()).default([]),
  avgResponseTimeHours: z.number().int().min(0).optional(),
  active: z.boolean().default(true),
  verified: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Create Service Vendor Input
 */
export interface CreateServiceVendorInput {
  supplierId: string;
  serviceCategoryId: string;
  description?: string;
  serviceArea?: ServiceAreaEntry[];
  pricingModel?: ServicePricingModel;
  hourlyRate?: number;
  projectRate?: number;
  minProjectValue?: number;
  certifications?: CertificationEntry[];
  portfolioUrls?: string[];
  avgResponseTimeHours?: number;
}

export const CreateServiceVendorSchema = z.object({
  supplierId: z.string().uuid(),
  serviceCategoryId: z.string().uuid(),
  description: z.string().optional(),
  serviceArea: z.array(ServiceAreaEntrySchema).optional(),
  pricingModel: ServicePricingModelSchema.optional(),
  hourlyRate: z.number().positive().optional(),
  projectRate: z.number().positive().optional(),
  minProjectValue: z.number().positive().optional(),
  certifications: z.array(CertificationEntrySchema).optional(),
  portfolioUrls: z.array(z.string().url()).optional(),
  avgResponseTimeHours: z.number().int().min(0).optional(),
});

/**
 * Update Service Vendor Input
 */
export interface UpdateServiceVendorInput {
  description?: string;
  serviceArea?: ServiceAreaEntry[];
  pricingModel?: ServicePricingModel;
  hourlyRate?: number;
  projectRate?: number;
  minProjectValue?: number;
  certifications?: CertificationEntry[];
  portfolioUrls?: string[];
  avgResponseTimeHours?: number;
  active?: boolean;
}

export const UpdateServiceVendorSchema = z.object({
  description: z.string().optional(),
  serviceArea: z.array(ServiceAreaEntrySchema).optional(),
  pricingModel: ServicePricingModelSchema.optional(),
  hourlyRate: z.number().positive().optional(),
  projectRate: z.number().positive().optional(),
  minProjectValue: z.number().positive().optional(),
  certifications: z.array(CertificationEntrySchema).optional(),
  portfolioUrls: z.array(z.string().url()).optional(),
  avgResponseTimeHours: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

// ============================================
// Service RFQ Types
// ============================================

/**
 * Service RFQ Urgency
 */
export const ServiceRFQUrgencySchema = z.enum(['standard', 'urgent', 'emergency']);
export type ServiceRFQUrgency = z.infer<typeof ServiceRFQUrgencySchema>;

/**
 * Preferred Vendor Gender
 */
export const PreferredVendorGenderSchema = z.enum(['male', 'female', 'any']);
export type PreferredVendorGender = z.infer<typeof PreferredVendorGenderSchema>;

/**
 * Preferred Schedule Entry
 */
export interface PreferredScheduleEntry {
  days?: string[];
  timeStart?: string;
  timeEnd?: string;
  specificDates?: string[];
}

export const PreferredScheduleEntrySchema = z.object({
  days: z.array(z.string()).optional(),
  timeStart: z.string().optional(),
  timeEnd: z.string().optional(),
  specificDates: z.array(z.string()).optional(),
});

/**
 * Service Location Entry
 */
export interface ServiceLocationEntry {
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  floor?: string;
  liftAvailable?: boolean;
  parkingAvailable?: boolean;
}

export const ServiceLocationEntrySchema = z.object({
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().optional(),
  pincode: z.string().optional(),
  landmark: z.string().optional(),
  floor: z.string().optional(),
  liftAvailable: z.boolean().optional(),
  parkingAvailable: z.boolean().optional(),
});

/**
 * Service Requirements Entry
 */
export interface ServiceRequirementsEntry {
  experienceYears?: number;
  equipmentProvided?: boolean;
  licenseRequired?: boolean;
  insuranceRequired?: boolean;
  backgroundVerified?: boolean;
}

export const ServiceRequirementsEntrySchema = z.object({
  experienceYears: z.number().int().min(0).optional(),
  equipmentProvided: z.boolean().optional(),
  licenseRequired: z.boolean().optional(),
  insuranceRequired: z.boolean().optional(),
  backgroundVerified: z.boolean().optional(),
});

/**
 * Service RFQ Entity
 * Extends RFQ with service-specific fields
 */
export interface ServiceRFQ {
  id: string;
  rfqId: string;
  serviceCategoryId: string;
  serviceDetails?: string;
  scopeOfWork?: string;
  requirements: ServiceRequirementsEntry;
  urgency: ServiceRFQUrgency;
  preferredSchedule: PreferredScheduleEntry;
  serviceLocation: ServiceLocationEntry;
  estimatedBudget?: number;
  budgetFlexible: boolean;
  inspectionRequired: boolean;
  materialsProvided: boolean;
  warrantyRequired: boolean;
  warrantyMonths?: number;
  insuranceRequired: boolean;
  preferredVendorGender?: PreferredVendorGender;
  languageRequirements: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service RFQ Zod Schema
 */
export const ServiceRFQSchema = z.object({
  id: z.string().uuid(),
  rfqId: z.string().uuid(),
  serviceCategoryId: z.string().uuid(),
  serviceDetails: z.string().optional(),
  scopeOfWork: z.string().optional(),
  requirements: ServiceRequirementsEntrySchema.default({}),
  urgency: ServiceRFQUrgencySchema.default('standard'),
  preferredSchedule: PreferredScheduleEntrySchema.default({}),
  serviceLocation: ServiceLocationEntrySchema.default({}),
  estimatedBudget: z.number().positive().optional(),
  budgetFlexible: z.boolean().default(false),
  inspectionRequired: z.boolean().default(false),
  materialsProvided: z.boolean().default(false),
  warrantyRequired: z.boolean().default(false),
  warrantyMonths: z.number().int().positive().optional(),
  insuranceRequired: z.boolean().default(false),
  preferredVendorGender: PreferredVendorGenderSchema.optional(),
  languageRequirements: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Create Service RFQ Input
 */
export interface CreateServiceRFQInput {
  rfqId: string;
  serviceCategoryId: string;
  serviceDetails?: string;
  scopeOfWork?: string;
  requirements?: ServiceRequirementsEntry;
  urgency?: ServiceRFQUrgency;
  preferredSchedule?: PreferredScheduleEntry;
  serviceLocation?: ServiceLocationEntry;
  estimatedBudget?: number;
  budgetFlexible?: boolean;
  inspectionRequired?: boolean;
  materialsProvided?: boolean;
  warrantyRequired?: boolean;
  warrantyMonths?: number;
  insuranceRequired?: boolean;
  preferredVendorGender?: PreferredVendorGender;
  languageRequirements?: string[];
}

export const CreateServiceRFQSchema = z.object({
  rfqId: z.string().uuid(),
  serviceCategoryId: z.string().uuid(),
  serviceDetails: z.string().optional(),
  scopeOfWork: z.string().optional(),
  requirements: ServiceRequirementsEntrySchema.optional(),
  urgency: ServiceRFQUrgencySchema.optional(),
  preferredSchedule: PreferredScheduleEntrySchema.optional(),
  serviceLocation: ServiceLocationEntrySchema.optional(),
  estimatedBudget: z.number().positive().optional(),
  budgetFlexible: z.boolean().optional(),
  inspectionRequired: z.boolean().optional(),
  materialsProvided: z.boolean().optional(),
  warrantyRequired: z.boolean().optional(),
  warrantyMonths: z.number().int().positive().optional(),
  insuranceRequired: z.boolean().optional(),
  preferredVendorGender: PreferredVendorGenderSchema.optional(),
  languageRequirements: z.array(z.string()).optional(),
});

/**
 * Update Service RFQ Input
 */
export interface UpdateServiceRFQInput {
  serviceDetails?: string;
  scopeOfWork?: string;
  requirements?: ServiceRequirementsEntry;
  urgency?: ServiceRFQUrgency;
  preferredSchedule?: PreferredScheduleEntry;
  serviceLocation?: ServiceLocationEntry;
  estimatedBudget?: number;
  budgetFlexible?: boolean;
  inspectionRequired?: boolean;
  materialsProvided?: boolean;
  warrantyRequired?: boolean;
  warrantyMonths?: number;
  insuranceRequired?: boolean;
  preferredVendorGender?: PreferredVendorGender;
  languageRequirements?: string[];
}

export const UpdateServiceRFQSchema = z.object({
  serviceDetails: z.string().optional(),
  scopeOfWork: z.string().optional(),
  requirements: ServiceRequirementsEntrySchema.optional(),
  urgency: ServiceRFQUrgencySchema.optional(),
  preferredSchedule: PreferredScheduleEntrySchema.optional(),
  serviceLocation: ServiceLocationEntrySchema.optional(),
  estimatedBudget: z.number().positive().optional(),
  budgetFlexible: z.boolean().optional(),
  inspectionRequired: z.boolean().optional(),
  materialsProvided: z.boolean().optional(),
  warrantyRequired: z.boolean().optional(),
  warrantyMonths: z.number().int().positive().optional(),
  insuranceRequired: z.boolean().optional(),
  preferredVendorGender: PreferredVendorGenderSchema.optional(),
  languageRequirements: z.array(z.string()).optional(),
});

// ============================================
// Service Quote Types
// ============================================

/**
 * Service Quote Status
 */
export const ServiceQuoteStatusSchema = z.enum(['draft', 'submitted', 'revised', 'accepted', 'rejected', 'expired']);
export type ServiceQuoteStatus = z.infer<typeof ServiceQuoteStatusSchema>;

/**
 * Proposed Schedule Entry
 */
export interface ProposedScheduleEntry {
  startDate?: string;
  endDate?: string;
  dailyHours?: number;
  breaks?: { start: string; end: string }[];
  notes?: string;
}

export const ProposedScheduleEntrySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  dailyHours: z.number().positive().optional(),
  breaks: z.array(z.object({ start: z.string(), end: z.string() })).optional(),
  notes: z.string().optional(),
});

/**
 * Material List Entry
 */
export interface MaterialListEntry {
  item: string;
  quantity: string;
  unitPrice?: number;
  cost: number;
  notes?: string;
}

export const MaterialListEntrySchema = z.object({
  item: z.string().min(1),
  quantity: z.string(),
  unitPrice: z.number().positive().optional(),
  cost: z.number().min(0),
  notes: z.string().optional(),
});

/**
 * Equipment List Entry
 */
export interface EquipmentListEntry {
  name: string;
  provided: boolean;
  cost?: number;
  notes?: string;
}

export const EquipmentListEntrySchema = z.object({
  name: z.string().min(1),
  provided: z.boolean(),
  cost: z.number().positive().optional(),
  notes: z.string().optional(),
});

/**
 * Payment Terms Entry (Percentage-based)
 */
export interface PaymentTermsPercentage {
  type: 'percentage';
  terms: { milestone: string; percentage: number; dueDays?: number }[];
}

export const PaymentTermsPercentageSchema = z.object({
  type: z.literal('percentage'),
  terms: z.array(z.object({
    milestone: z.string(),
    percentage: z.number().min(0).max(100),
    dueDays: z.number().int().optional(),
  })),
});

/**
 * Payment Terms Entry (Milestone-based)
 */
export interface PaymentTermsMilestones {
  type: 'milestones';
  advancePercentage?: number;
  onCompletionPercentage?: number;
  milestones: { name: string; percentage: number; trigger: string }[];
}

export const PaymentTermsMilestonesSchema = z.object({
  type: z.literal('milestones'),
  advancePercentage: z.number().min(0).max(100).optional(),
  onCompletionPercentage: z.number().min(0).max(100).optional(),
  milestones: z.array(z.object({
    name: z.string(),
    percentage: z.number().min(0).max(100),
    trigger: z.string(),
  })),
});

export const PaymentTermsSchema = z.union([
  PaymentTermsPercentageSchema,
  PaymentTermsMilestonesSchema,
]);

/**
 * Service Quote Entity
 * Extends RFQ response with service-specific fields
 */
export interface ServiceQuote {
  id: string;
  rfqResponseId?: string;
  serviceRfqId: string;
  serviceVendorId: string;
  proposedSchedule: ProposedScheduleEntry;
  estimatedDurationHours?: number;
  estimatedDurationDays?: number;
  laborCount?: number;
  materialsIncluded: boolean;
  materialsList: MaterialListEntry[];
  materialsCost?: number;
  equipmentProvided: boolean;
  equipmentList: EquipmentListEntry[];
  transportationIncluded: boolean;
  transportationCost?: number;
  warrantyMonthsOffered?: number;
  warrantyDetails?: string;
  paymentTerms: PaymentTermsPercentage | PaymentTermsMilestones;
  validUntil?: Date;
  inclusions?: string;
  exclusions?: string;
  termsConditions?: string;
  status: ServiceQuoteStatus;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service Quote Zod Schema
 */
export const ServiceQuoteSchema = z.object({
  id: z.string().uuid(),
  rfqResponseId: z.string().uuid().optional(),
  serviceRfqId: z.string().uuid(),
  serviceVendorId: z.string().uuid(),
  proposedSchedule: ProposedScheduleEntrySchema.default({}),
  estimatedDurationHours: z.number().positive().optional(),
  estimatedDurationDays: z.number().int().positive().optional(),
  laborCount: z.number().int().positive().optional(),
  materialsIncluded: z.boolean().default(false),
  materialsList: z.array(MaterialListEntrySchema).default([]),
  materialsCost: z.number().min(0).optional(),
  equipmentProvided: z.boolean().default(true),
  equipmentList: z.array(EquipmentListEntrySchema).default([]),
  transportationIncluded: z.boolean().default(false),
  transportationCost: z.number().min(0).optional(),
  warrantyMonthsOffered: z.number().int().positive().optional(),
  warrantyDetails: z.string().optional(),
  paymentTerms: PaymentTermsSchema.default({ type: 'percentage', terms: [] }),
  validUntil: z.date().optional(),
  inclusions: z.string().optional(),
  exclusions: z.string().optional(),
  termsConditions: z.string().optional(),
  status: ServiceQuoteStatusSchema.default('draft'),
  adminNotes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Create Service Quote Input
 */
export interface CreateServiceQuoteInput {
  rfqResponseId?: string;
  serviceRfqId: string;
  serviceVendorId: string;
  proposedSchedule?: ProposedScheduleEntry;
  estimatedDurationHours?: number;
  estimatedDurationDays?: number;
  laborCount?: number;
  materialsIncluded?: boolean;
  materialsList?: MaterialListEntry[];
  materialsCost?: number;
  equipmentProvided?: boolean;
  equipmentList?: EquipmentListEntry[];
  transportationIncluded?: boolean;
  transportationCost?: number;
  warrantyMonthsOffered?: number;
  warrantyDetails?: string;
  paymentTerms?: PaymentTermsPercentage | PaymentTermsMilestones;
  validUntil?: Date;
  inclusions?: string;
  exclusions?: string;
  termsConditions?: string;
}

export const CreateServiceQuoteSchema = z.object({
  rfqResponseId: z.string().uuid().optional(),
  serviceRfqId: z.string().uuid(),
  serviceVendorId: z.string().uuid(),
  proposedSchedule: ProposedScheduleEntrySchema.optional(),
  estimatedDurationHours: z.number().positive().optional(),
  estimatedDurationDays: z.number().int().positive().optional(),
  laborCount: z.number().int().positive().optional(),
  materialsIncluded: z.boolean().optional(),
  materialsList: z.array(MaterialListEntrySchema).optional(),
  materialsCost: z.number().min(0).optional(),
  equipmentProvided: z.boolean().optional(),
  equipmentList: z.array(EquipmentListEntrySchema).optional(),
  transportationIncluded: z.boolean().optional(),
  transportationCost: z.number().min(0).optional(),
  warrantyMonthsOffered: z.number().int().positive().optional(),
  warrantyDetails: z.string().optional(),
  paymentTerms: PaymentTermsSchema.optional(),
  validUntil: z.date().optional(),
  inclusions: z.string().optional(),
  exclusions: z.string().optional(),
  termsConditions: z.string().optional(),
});

/**
 * Update Service Quote Input
 */
export interface UpdateServiceQuoteInput {
  proposedSchedule?: ProposedScheduleEntry;
  estimatedDurationHours?: number;
  estimatedDurationDays?: number;
  laborCount?: number;
  materialsIncluded?: boolean;
  materialsList?: MaterialListEntry[];
  materialsCost?: number;
  equipmentProvided?: boolean;
  equipmentList?: EquipmentListEntry[];
  transportationIncluded?: boolean;
  transportationCost?: number;
  warrantyMonthsOffered?: number;
  warrantyDetails?: string;
  paymentTerms?: PaymentTermsPercentage | PaymentTermsMilestones;
  validUntil?: Date;
  inclusions?: string;
  exclusions?: string;
  termsConditions?: string;
  status?: ServiceQuoteStatus;
}

export const UpdateServiceQuoteSchema = z.object({
  proposedSchedule: ProposedScheduleEntrySchema.optional(),
  estimatedDurationHours: z.number().positive().optional(),
  estimatedDurationDays: z.number().int().positive().optional(),
  laborCount: z.number().int().positive().optional(),
  materialsIncluded: z.boolean().optional(),
  materialsList: z.array(MaterialListEntrySchema).optional(),
  materialsCost: z.number().min(0).optional(),
  equipmentProvided: z.boolean().optional(),
  equipmentList: z.array(EquipmentListEntrySchema).optional(),
  transportationIncluded: z.boolean().optional(),
  transportationCost: z.number().min(0).optional(),
  warrantyMonthsOffered: z.number().int().positive().optional(),
  warrantyDetails: z.string().optional(),
  paymentTerms: PaymentTermsSchema.optional(),
  validUntil: z.date().optional(),
  inclusions: z.string().optional(),
  exclusions: z.string().optional(),
  termsConditions: z.string().optional(),
  status: ServiceQuoteStatusSchema.optional(),
});

// ============================================
// Aggregate/View Types
// ============================================

/**
 * Service Category with Subcategories
 */
export interface ServiceCategoryWithChildren extends ServiceCategory {
  children: ServiceCategory[];
}

/**
 * Service Vendor with Category Details
 */
export interface ServiceVendorWithCategory extends ServiceVendor {
  category?: ServiceCategory;
  supplierName?: string;
  supplierRating?: number;
}

/**
 * Service RFQ with Category and Vendor Details
 */
export interface ServiceRFQWithDetails extends ServiceRFQ {
  category?: ServiceCategory;
  rfqNumber?: string;
  merchantName?: string;
  quoteCount?: number;
}

/**
 * Service Quote with Full Details
 */
export interface ServiceQuoteWithDetails extends ServiceQuote {
  vendor?: ServiceVendor;
  serviceRfq?: ServiceRFQ;
  totalPrice?: number;
}

// ============================================
// Export all types and schemas
// ============================================

export type {
  ServiceCategory,
  CreateServiceCategoryInput,
  UpdateServiceCategoryInput,
  ServiceVendor,
  CreateServiceVendorInput,
  UpdateServiceVendorInput,
  ServiceRFQ,
  CreateServiceRFQInput,
  UpdateServiceRFQInput,
  ServiceQuote,
  CreateServiceQuoteInput,
  UpdateServiceQuoteInput,
  ServiceCategoryWithChildren,
  ServiceVendorWithCategory,
  ServiceRFQWithDetails,
  ServiceQuoteWithDetails,
  ServiceAreaEntry,
  CertificationEntry,
  PreferredScheduleEntry,
  ServiceLocationEntry,
  ServiceRequirementsEntry,
  ProposedScheduleEntry,
  MaterialListEntry,
  EquipmentListEntry,
  PaymentTermsPercentage,
  PaymentTermsMilestones,
};
