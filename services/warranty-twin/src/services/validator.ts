import { z } from 'zod';
import { WarrantyType, ClaimStatus, RepairStatus } from '../models/Warranty';

// Warranty Coverage Schema
const warrantyCoverageSchema = z.object({
  parts: z.boolean().default(true),
  labor: z.boolean().default(true),
  type: z.enum(['basic', 'comprehensive', 'limited']).default('basic'),
  deductible: z.number().min(0).optional(),
  maxCoverageAmount: z.number().min(0).optional()
});

// Create Warranty Schema
export const createWarrantySchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  orderId: z.string().optional(),
  productName: z.string().min(1, 'Product name is required'),
  productModel: z.string().optional(),
  productSerial: z.string().optional(),
  manufacturer: z.string().optional(),
  type: z.enum(['manufacturer', 'extended']).default('manufacturer'),
  startDate: z.string().datetime().or(z.date()).transform(d => new Date(d)),
  endDate: z.string().datetime().or(z.date()).transform(d => new Date(d)),
  purchaseDate: z.string().datetime().or(z.date()).transform(d => new Date(d)),
  coverage: warrantyCoverageSchema.optional(),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Update Warranty Schema
export const updateWarrantySchema = z.object({
  productName: z.string().min(1).optional(),
  productModel: z.string().optional(),
  productSerial: z.string().optional(),
  manufacturer: z.string().optional(),
  type: z.enum(['manufacturer', 'extended']).optional(),
  startDate: z.string().datetime().or(z.date()).transform(d => new Date(d)).optional(),
  endDate: z.string().datetime().or(z.date()).transform(d => new Date(d)).optional(),
  coverage: warrantyCoverageSchema.optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Claim Item Schema
const claimItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  itemDescription: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  claimedAmount: z.number().min(0, 'Claimed amount must be non-negative'),
  approvedAmount: z.number().min(0).optional(),
  isApproved: z.boolean().optional()
});

// Create Claim Schema
export const createClaimSchema = z.object({
  warrantyId: z.string().min(1, 'Warranty ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  issue: z.string().min(1, 'Issue description is required'),
  description: z.string().min(1, 'Detailed description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  items: z.array(claimItemSchema).optional(),
  claimAmount: z.number().min(0, 'Claim amount must be non-negative'),
  documents: z.array(z.string().url()).optional(),
  scheduledDate: z.string().datetime().or(z.date()).transform(d => new Date(d)).optional(),
  estimatedCompletionDate: z.string().datetime().or(z.date()).transform(d => new Date(d)).optional(),
  metadata: z.record(z.any()).optional()
});

// Update Claim Schema
export const updateClaimSchema = z.object({
  description: z.string().min(1).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  items: z.array(claimItemSchema).optional(),
  scheduledDate: z.string().datetime().or(z.date()).transform(d => new Date(d)).optional(),
  estimatedCompletionDate: z.string().datetime().or(z.date()).transform(d => new Date(d)).optional()
});

// Claim Approval Schema
export const claimApprovalSchema = z.object({
  claimAmount: z.number().min(0),
  approvedAmount: z.number().min(0).max(z.number().refine(val => true, { message: 'Approved amount cannot exceed claim amount' }))
});

// Claim Rejection Schema
export const claimRejectionSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
  notes: z.string().optional()
});

// Part Schema
const partSchema = z.object({
  partId: z.string().optional(),
  partName: z.string().min(1, 'Part name is required'),
  partNumber: z.string().min(1, 'Part number is required'),
  quantity: z.number().int().min(1).default(1),
  unitCost: z.number().min(0).default(0),
  isWarrantyCovered: z.boolean().default(true)
});

// Labor Entry Schema
const laborSchema = z.object({
  technicianId: z.string().min(1, 'Technician ID is required'),
  technicianName: z.string().min(1, 'Technician name is required'),
  startTime: z.string().datetime().or(z.date()).transform(d => new Date(d)),
  endTime: z.string().datetime().or(z.date()).transform(d => new Date(d)).optional(),
  hourlyRate: z.number().min(0).optional(),
  notes: z.string().optional()
});

// Diagnosis Schema
const diagnosisSchema = z.object({
  symptoms: z.array(z.string()).min(1, 'At least one symptom is required'),
  rootCause: z.string().min(1, 'Root cause is required'),
  recommendedAction: z.string().min(1, 'Recommended action is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical'])
});

// Create Repair Schema
export const createRepairSchema = z.object({
  warrantyId: z.string().optional(),
  claimId: z.string().optional(),
  productId: z.string().min(1, 'Product ID is required'),
  productSerial: z.string().optional(),
  type: z.string().min(1, 'Repair type is required'),
  category: z.enum(['hardware', 'software', 'maintenance', 'inspection']).default('hardware'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  diagnosis: diagnosisSchema.optional(),
  scheduledDate: z.string().datetime().or(z.date()).transform(d => new Date(d)).optional(),
  estimatedCompletionDate: z.string().datetime().or(z.date()).transform(d => new Date(d)).optional(),
  technician: z.string().optional(),
  isWarrantyCovered: z.boolean().default(true),
  warrantyCoverageAmount: z.number().min(0).optional(),
  metadata: z.record(z.any()).optional()
});

// Update Repair Schema
export const updateRepairSchema = z.object({
  type: z.string().optional(),
  category: z.enum(['hardware', 'software', 'maintenance', 'inspection']).optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  diagnosis: diagnosisSchema.optional(),
  scheduledDate: z.string().datetime().or(z.date()).transform(d => new Date(d)).optional(),
  estimatedCompletionDate: z.string().datetime().or(z.date()).transform(d => new Date(d)).optional(),
  technician: z.string().optional(),
  technicianNotes: z.string().optional(),
  nextServiceDate: z.string().datetime().or(z.date()).transform(d => new Date(d)).optional()
});

// Part Addition Schema
export const addPartSchema = z.object({
  partId: z.string().optional(),
  partName: z.string().min(1, 'Part name is required'),
  partNumber: z.string().min(1, 'Part number is required'),
  quantity: z.number().int().min(1).default(1),
  unitCost: z.number().min(0).default(0),
  isWarrantyCovered: z.boolean().default(true)
});

// Labor Addition Schema
export const addLaborSchema = z.object({
  technicianId: z.string().min(1, 'Technician ID is required'),
  technicianName: z.string().min(1, 'Technician name is required'),
  startTime: z.string().datetime().or(z.date()).transform(d => new Date(d)),
  endTime: z.string().datetime().or(z.date()).transform(d => new Date(d)).optional(),
  hourlyRate: z.number().min(0).optional(),
  notes: z.string().optional()
});

// Validation Result Type
export interface ValidationResult {
  success: boolean;
  errors?: any;
  data?: any;
}

// Validation Functions
export function validateWarranty(data: any): ValidationResult {
  try {
    const validated = createWarrantySchema.parse(data);

    // Additional validations
    const startDate = new Date(validated.startDate);
    const endDate = new Date(validated.endDate);
    const purchaseDate = new Date(validated.purchaseDate);

    if (endDate <= startDate) {
      return {
        success: false,
        errors: { endDate: 'End date must be after start date' }
      };
    }

    if (startDate < purchaseDate) {
      return {
        success: false,
        errors: { startDate: 'Start date cannot be before purchase date' }
      };
    }

    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors };
    }
    return { success: false, errors: error };
  }
}

export function validateWarrantyUpdate(data: any): ValidationResult {
  try {
    const validated = updateWarrantySchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors };
    }
    return { success: false, errors: error };
  }
}

export function validateClaim(data: any): ValidationResult {
  try {
    const validated = createClaimSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors };
    }
    return { success: false, errors: error };
  }
}

export function validateClaimUpdate(data: any): ValidationResult {
  try {
    const validated = updateClaimSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors };
    }
    return { success: false, errors: error };
  }
}

export function validateClaimApproval(data: any): ValidationResult {
  try {
    const validated = claimApprovalSchema.parse(data);

    if (validated.approvedAmount > validated.claimAmount) {
      return {
        success: false,
        errors: { approvedAmount: 'Approved amount cannot exceed claim amount' }
      };
    }

    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors };
    }
    return { success: false, errors: error };
  }
}

export function validateRepair(data: any): ValidationResult {
  try {
    const validated = createRepairSchema.parse(data);

    // Additional validations
    if (validated.scheduledDate && validated.estimatedCompletionDate) {
      if (new Date(validated.estimatedCompletionDate) <= new Date(validated.scheduledDate)) {
        return {
          success: false,
          errors: { estimatedCompletionDate: 'Estimated completion must be after scheduled date' }
        };
      }
    }

    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors };
    }
    return { success: false, errors: error };
  }
}

export function validateRepairUpdate(data: any): ValidationResult {
  try {
    const validated = updateRepairSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors };
    }
    return { success: false, errors: error };
  }
}

export function validatePart(data: any): ValidationResult {
  try {
    const validated = addPartSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors };
    }
    return { success: false, errors: error };
  }
}

export function validateLabor(data: any): ValidationResult {
  try {
    const validated = addLaborSchema.parse(data);

    // Additional validation for labor hours
    if (validated.endTime) {
      const start = new Date(validated.startTime);
      const end = new Date(validated.endTime);
      if (end <= start) {
        return {
          success: false,
          errors: { endTime: 'End time must be after start time' }
        };
      }
    }

    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors };
    }
    return { success: false, errors: error };
  }
}

// Warranty Validation Utilities
export class WarrantyValidator {
  static isWithinWarrantyPeriod(warranty: any): boolean {
    const now = new Date();
    const startDate = new Date(warranty.startDate);
    const endDate = new Date(warranty.endDate);
    return now >= startDate && now <= endDate;
  }

  static isWarrantyExpired(warranty: any): boolean {
    return new Date() > new Date(warranty.endDate);
  }

  static daysRemaining(warranty: any): number {
    const now = new Date();
    const endDate = new Date(warranty.endDate);
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  static coversParts(warranty: any): boolean {
    return warranty.isValid && warranty.isActive && warranty.coverage.parts;
  }

  static coversLabor(warranty: any): boolean {
    return warranty.isValid && warranty.isActive && warranty.coverage.labor;
  }

  static getCoverageLevel(warranty: any): 'basic' | 'comprehensive' | 'limited' {
    return warranty.coverage?.type || 'limited';
  }

  static calculateClaimDeductible(warranty: any): number {
    return warranty.coverage?.deductible || 0;
  }

  static maxCoverageAmount(warranty: any): number {
    return warranty.coverage?.maxCoverageAmount || Infinity;
  }
}

// Claim Workflow Validation
export class ClaimWorkflowValidator {
  static canFileClaim(warranty: any): { valid: boolean; reason?: string } {
    if (!warranty) {
      return { valid: false, reason: 'Warranty not found' };
    }
    if (!warranty.isValid) {
      return { valid: false, reason: 'Warranty is not valid' };
    }
    if (!warranty.isActive) {
      return { valid: false, reason: 'Warranty is not active' };
    }
    if (WarrantyValidator.isWarrantyExpired(warranty)) {
      return { valid: false, reason: 'Warranty has expired' };
    }
    return { valid: true };
  }

  static canApproveClaim(claim: any): { valid: boolean; reason?: string } {
    if (claim.status !== 'pending') {
      return { valid: false, reason: `Cannot approve claim with status: ${claim.status}` };
    }
    return { valid: true };
  }

  static canRejectClaim(claim: any): { valid: boolean; reason?: string } {
    if (claim.status !== 'pending') {
      return { valid: false, reason: `Cannot reject claim with status: ${claim.status}` };
    }
    return { valid: true };
  }

  static canStartProcessing(claim: any): { valid: boolean; reason?: string } {
    if (claim.status !== 'approved') {
      return { valid: false, reason: 'Claim must be approved before processing' };
    }
    return { valid: true };
  }

  static canCompleteClaim(claim: any): { valid: boolean; reason?: string } {
    if (claim.status !== 'in_progress') {
      return { valid: false, reason: 'Claim must be in progress to complete' };
    }
    return { valid: true };
  }
}

// Repair Workflow Validation
export class RepairWorkflowValidator {
  static canStartRepair(repair: any): { valid: boolean; reason?: string } {
    if (repair.status !== 'scheduled') {
      return { valid: false, reason: `Cannot start repair with status: ${repair.status}` };
    }
    return { valid: true };
  }

  static canCompleteRepair(repair: any): { valid: boolean; reason?: string } {
    if (repair.status !== 'in_progress') {
      return { valid: false, reason: 'Repair must be in progress to complete' };
    }
    return { valid: true };
  }

  static canCancelRepair(repair: any): { valid: boolean; reason?: string } {
    if (repair.status === 'completed' || repair.status === 'cancelled') {
      return { valid: false, reason: `Cannot cancel repair with status: ${repair.status}` };
    }
    return { valid: true };
  }

  static calculateWarrantyCoverage(repair: any, warranty: any): number {
    if (!warranty || !repair.isWarrantyCovered) {
      return 0;
    }

    const maxCoverage = WarrantyValidator.maxCoverageAmount(warranty);
    const totalCost = repair.totalCost;
    const deductible = WarrantyValidator.calculateClaimDeductible(warranty);

    let coveredAmount = Math.min(totalCost, maxCoverage) - deductible;
    return Math.max(0, coveredAmount);
  }
}
