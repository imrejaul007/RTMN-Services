import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { logger } from '../utils/logger';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const CreateHandoverSchema = z.object({
  outgoingShiftId: z.string().min(1, 'outgoingShiftId is required'),
  incomingShiftId: z.string().optional(),
  outgoingStaffId: z.string().min(1, 'outgoingStaffId is required'),
  outgoingStaffName: z.string().min(1, 'outgoingStaffName is required'),
  incomingStaffId: z.string().optional(),
  incomingStaffName: z.string().optional(),
  shiftDate: z.string().datetime().or(z.date()).transform((val) => new Date(val)),
  shiftType: z.enum(['day', 'night', 'evening']),
  facilityId: z.string().min(1, 'facilityId is required'),
  facilityName: z.string().min(1, 'facilityName is required'),
  departmentId: z.string().optional(),
  departmentName: z.string().optional(),
  templateId: z.string().optional(),
  templateName: z.string().optional(),
  scheduledTime: z.string().datetime().or(z.date()).optional().transform((val) => val ? new Date(val) : undefined)
});

export const AddPatientSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
  patientName: z.string().min(1, 'patientName is required'),
  roomNumber: z.string().min(1, 'roomNumber is required'),
  bedNumber: z.string().optional(),
  condition: z.string().min(1, 'condition is required'),
  diagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  pendingTasks: z.array(z.string()).optional().default([]),
  concerns: z.array(z.string()).optional().default([]),
  vitals: z.object({
    bloodPressure: z.string().optional(),
    heartRate: z.number().optional(),
    temperature: z.number().optional(),
    oxygenSaturation: z.number().optional(),
    respiratoryRate: z.number().optional()
  }).optional()
});

export const AddTaskSchema = z.object({
  description: z.string().min(1, 'description is required'),
  category: z.string().optional(),
  assignedTo: z.string().optional(),
  assignedToName: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  dueTime: z.string().datetime().or(z.date()).optional().transform((val) => val ? new Date(val) : undefined),
  patientId: z.string().optional(),
  notes: z.string().optional()
});

export const AddAlertSchema = z.object({
  type: z.enum(['critical', 'urgent', 'warning', 'info', 'allergy', 'fall_risk', 'medication', 'lab_result']),
  patientId: z.string().optional(),
  patientName: z.string().optional(),
  description: z.string().min(1, 'description is required'),
  actionRequired: z.string().min(1, 'actionRequired is required'),
  createdBy: z.string().min(1, 'createdBy is required')
});

export const AcknowledgeSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  userName: z.string().min(1, 'userName is required'),
  role: z.string().min(1, 'role is required'),
  comments: z.string().optional(),
  signature: z.string().optional()
});

export const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  facilityId: z.string().min(1, 'facilityId is required'),
  facilityName: z.string().min(1, 'facilityName is required'),
  departmentId: z.string().optional(),
  departmentName: z.string().optional(),
  sections: z.object({
    includePatients: z.boolean().optional().default(true),
    includeTasks: z.boolean().optional().default(true),
    includeAlerts: z.boolean().optional().default(true),
    includeNotes: z.boolean().optional().default(true),
    patientFields: z.array(z.string()).optional().default([
      'patientId',
      'patientName',
      'roomNumber',
      'condition',
      'vitals',
      'pendingTasks',
      'concerns'
    ]),
    taskCategories: z.array(z.string()).optional().default([]),
    alertTypes: z.array(z.enum([
      'critical', 'urgent', 'warning', 'info', 'allergy', 'fall_risk', 'medication', 'lab_result'
    ])).optional().default([
      'critical', 'urgent', 'warning', 'info', 'allergy', 'fall_risk', 'medication', 'lab_result'
    ])
  }).optional(),
  createdBy: z.string().min(1, 'createdBy is required')
});

export const UpdateNotesSchema = z.object({
  notes: z.string()
});

export const UpdateTaskStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'delegated', 'cancelled'])
});

export const ResolveAlertSchema = z.object({
  actionTaken: z.string().min(1, 'actionTaken is required'),
  resolvedBy: z.string().min(1, 'resolvedBy is required')
});

export const ArchiveSchema = z.object({
  archivedBy: z.string().min(1, 'archivedBy is required'),
  reason: z.string().optional()
});

export const CancelHandoverSchema = z.object({
  reason: z.string().optional()
});

// ============================================================================
// VALIDATION MIDDLEWARE FACTORY
// ============================================================================

type ValidationSchema = ZodSchema;

export const validateRequest = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        logger.warn('Validation error:', errors);

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
      }
      next(error);
    }
  };
};

// ============================================================================
// SPECIFIC VALIDATION MIDDLEWARES
// ============================================================================

export const validateHandoverInput = validateRequest(CreateHandoverSchema);
export const validatePatientInput = validateRequest(AddPatientSchema);
export const validateTaskInput = validateRequest(AddTaskSchema);
export const validateAlertInput = validateRequest(AddAlertSchema);
export const validateAcknowledgeInput = validateRequest(AcknowledgeSchema);
export const validateTemplateInput = validateRequest(CreateTemplateSchema);
export const validateNotesInput = validateRequest(UpdateNotesSchema);
export const validateTaskStatusInput = validateRequest(UpdateTaskStatusSchema);
export const validateAlertResolveInput = validateRequest(ResolveAlertSchema);
export const validateArchiveInput = validateRequest(ArchiveSchema);
export const validateCancelInput = validateRequest(CancelHandoverSchema);

// ============================================================================
// QUERY VALIDATION
// ============================================================================

export const validateQueryParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: errors
        });
      }
      next(error);
    }
  };
};

// Common query schemas
export const DateRangeQuerySchema = z.object({
  facilityId: z.string().optional(),
  departmentId: z.string().optional(),
  startDate: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined)
});

export const SearchQuerySchema = z.object({
  facilityId: z.string().optional(),
  departmentId: z.string().optional(),
  startDate: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  status: z.string().optional(),
  outgoingStaffId: z.string().optional(),
  incomingStaffId: z.string().optional(),
  keyword: z.string().optional(),
  archived: z.enum(['true', 'false']).optional().transform((val) => val === 'true')
});

// ============================================================================
// SANITIZATION HELPERS
// ============================================================================

export const sanitizeString = (str: string): string => {
  return str
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
};

export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): T => {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized as T;
};
