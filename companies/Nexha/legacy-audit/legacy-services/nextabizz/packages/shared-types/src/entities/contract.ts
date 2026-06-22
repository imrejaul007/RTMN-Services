import { z } from 'zod';

// ============================================
// Contract Status Enum
// ============================================
export const ContractStatusSchema = z.enum(['draft', 'active', 'expired', 'terminated']);
export type ContractStatus = z.infer<typeof ContractStatusSchema>;

// ============================================
// Renewal Type Enum
// ============================================
export const RenewalTypeSchema = z.enum(['manual', 'auto_renew', 'evergreen']);
export type RenewalType = z.infer<typeof RenewalTypeSchema>;

// ============================================
// Contract Template Entity
// ============================================
export interface ContractTemplate {
  id: string;
  name: string;
  description?: string;
  content: string;
  terms: ContractTerms;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Contract Terms
// ============================================
export interface ContractTerms {
  paymentTerms: string;
  deliveryTerms: string;
  warrantyTerms?: string;
  penaltyTerms?: string;
  terminationTerms: string;
  confidentialityTerms?: string;
  intellectualPropertyTerms?: string;
  liabilityTerms?: string;
  forceMajeureTerms?: string;
}

// ============================================
// Contract Attachment
// ============================================
export interface ContractAttachment {
  id: string;
  contractId: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
}

// ============================================
// Service Contract Entity
// ============================================
export interface ServiceContract {
  id: string;
  contractNumber: string;
  title: string;
  description?: string;

  // Parties
  merchantId: string;
  supplierId: string;
  merchantName: string;
  supplierName: string;

  // Terms
  terms: ContractTerms;
  totalValue: number;
  currency: string;

  // Dates
  startDate: Date;
  endDate: Date;
  signedDate?: Date;

  // Renewal
  renewalType: RenewalType;
  renewalPeriodMonths?: number;
  autoRenewalNoticeDays?: number;

  // Status
  status: ContractStatus;

  // Source
  sourceType: 'quote' | 'manual';
  sourceId?: string;

  // Templates
  templateId?: string;
  templateName?: string;

  // Attachments
  attachments: ContractAttachment[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ============================================
// Zod Schemas
// ============================================

// Contract Terms Schema
export const ContractTermsSchema: z.ZodType<ContractTerms> = z.object({
  paymentTerms: z.string().min(1, 'Payment terms are required'),
  deliveryTerms: z.string().min(1, 'Delivery terms are required'),
  warrantyTerms: z.string().optional(),
  penaltyTerms: z.string().optional(),
  terminationTerms: z.string().min(1, 'Termination terms are required'),
  confidentialityTerms: z.string().optional(),
  intellectualPropertyTerms: z.string().optional(),
  liabilityTerms: z.string().optional(),
  forceMajeureTerms: z.string().optional(),
});

// Contract Attachment Schema
export const ContractAttachmentSchema = z.object({
  id: z.string().uuid(),
  contractId: z.string().uuid(),
  name: z.string().min(1),
  fileUrl: z.string().url(),
  fileType: z.string(),
  fileSize: z.number().positive(),
  uploadedAt: z.date(),
});

// Contract Template Schema
export const ContractTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  content: z.string().min(1, 'Template content is required'),
  terms: ContractTermsSchema,
  isDefault: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Service Contract Schema
export const ServiceContractSchema = z.object({
  id: z.string().uuid(),
  contractNumber: z.string().min(1),
  title: z.string().min(1, 'Contract title is required'),
  description: z.string().optional(),

  // Parties
  merchantId: z.string().uuid(),
  supplierId: z.string().uuid(),
  merchantName: z.string().min(1),
  supplierName: z.string().min(1),

  // Terms
  terms: ContractTermsSchema,
  totalValue: z.number().min(0),
  currency: z.string().default('INR'),

  // Dates
  startDate: z.date(),
  endDate: z.date(),
  signedDate: z.date().optional(),

  // Renewal
  renewalType: RenewalTypeSchema,
  renewalPeriodMonths: z.number().int().positive().optional(),
  autoRenewalNoticeDays: z.number().int().positive().optional(),

  // Status
  status: ContractStatusSchema,

  // Source
  sourceType: z.enum(['quote', 'manual']),
  sourceId: z.string().uuid().optional(),

  // Templates
  templateId: z.string().uuid().optional(),
  templateName: z.string().optional(),

  // Attachments
  attachments: z.array(ContractAttachmentSchema).default([]),

  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
});

// ============================================
// Input Types
// ============================================

// Create Contract From Quote Input
export interface CreateContractFromQuoteInput {
  quoteId: string;
  merchantId: string;
  supplierId: string;
  merchantName: string;
  supplierName: string;
  startDate: Date;
  endDate: Date;
  renewalType?: RenewalType;
  renewalPeriodMonths?: number;
  terms?: Partial<ContractTerms>;
}

export const CreateContractFromQuoteSchema = z.object({
  quoteId: z.string().uuid(),
  merchantId: z.string().uuid(),
  supplierId: z.string().uuid(),
  merchantName: z.string().min(1),
  supplierName: z.string().min(1),
  startDate: z.date(),
  endDate: z.date(),
  renewalType: RenewalTypeSchema.optional(),
  renewalPeriodMonths: z.number().int().positive().optional(),
  terms: ContractTermsSchema.optional(),
});

// Create Manual Contract Input
export interface CreateManualContractInput {
  merchantId: string;
  supplierId: string;
  title: string;
  description?: string;
  totalValue: number;
  currency?: string;
  startDate: Date;
  endDate: Date;
  renewalType?: RenewalType;
  renewalPeriodMonths?: number;
  terms: ContractTerms;
  templateId?: string;
  createdBy: string;
}

export const CreateManualContractSchema = z.object({
  merchantId: z.string().uuid(),
  supplierId: z.string().uuid(),
  title: z.string().min(1, 'Contract title is required'),
  description: z.string().optional(),
  totalValue: z.number().min(0),
  currency: z.string().default('INR'),
  startDate: z.date(),
  endDate: z.date(),
  renewalType: RenewalTypeSchema.default('manual'),
  renewalPeriodMonths: z.number().int().positive().optional(),
  terms: ContractTermsSchema,
  templateId: z.string().uuid().optional(),
  createdBy: z.string().uuid(),
});

// Update Contract Input
export interface UpdateContractInput {
  title?: string;
  description?: string;
  totalValue?: number;
  startDate?: Date;
  endDate?: Date;
  renewalType?: RenewalType;
  renewalPeriodMonths?: number;
  terms?: Partial<ContractTerms>;
  status?: ContractStatus;
}

export const UpdateContractSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  totalValue: z.number().min(0).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  renewalType: RenewalTypeSchema.optional(),
  renewalPeriodMonths: z.number().int().positive().optional(),
  terms: ContractTermsSchema.optional(),
  status: ContractStatusSchema.optional(),
});

// Create Template Input
export interface CreateTemplateInput {
  name: string;
  description?: string;
  content: string;
  terms: ContractTerms;
  isDefault?: boolean;
}

export const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  content: z.string().min(1, 'Template content is required'),
  terms: ContractTermsSchema,
  isDefault: z.boolean().default(false),
});

// Add Attachment Input
export interface AddAttachmentInput {
  contractId: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export const AddAttachmentSchema = z.object({
  contractId: z.string().uuid(),
  name: z.string().min(1),
  fileUrl: z.string().url(),
  fileType: z.string(),
  fileSize: z.number().positive(),
});

// ============================================
// Query Types
// ============================================

// List Contracts Query
export interface ListContractsQuery {
  page?: number;
  limit?: number;
  merchantId?: string;
  supplierId?: string;
  status?: ContractStatus;
  renewalType?: RenewalType;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export const ListContractsQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  merchantId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  status: ContractStatusSchema.optional(),
  renewalType: RenewalTypeSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
});
