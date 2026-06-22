import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { IncidentType, IncidentSeverity } from '../models/incident';

// ==================== ZOD SCHEMAS ====================

// Incident Schemas
export const incidentSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  patientName: z.string().min(1, 'Patient name is required'),
  facilityId: z.string().min(1, 'Facility ID is required'),
  facilityName: z.string().min(1, 'Facility name is required'),
  type: z.nativeEnum(IncidentType, {
    errorMap: () => ({ message: 'Invalid incident type' })
  }),
  severity: z.nativeEnum(IncidentSeverity, {
    errorMap: () => ({ message: 'Invalid severity level' })
  }),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  location: z.object({
    building: z.string().optional(),
    floor: z.string().optional(),
    room: z.string().optional(),
    area: z.string().min(1, 'Location area is required'),
    coordinates: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180)
      })
      .optional()
  }),
  incidentDate: z.string().datetime().or(z.date()).transform((val) => new Date(val)),
  incidentTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
  reportedBy: z.object({
    userId: z.string().min(1, 'Reporter user ID is required'),
    name: z.string().min(1, 'Reporter name is required'),
    role: z.string().min(1, 'Reporter role is required'),
    department: z.string().optional()
  }),
  injuries: z
    .array(
      z.object({
        type: z.string().min(1),
        bodyPart: z.string().min(1),
        severity: z.nativeEnum(IncidentSeverity),
        description: z.string().optional(),
        treatmentRequired: z.boolean().optional(),
        treatmentGiven: z.string().optional(),
        medicalAttentionRequired: z.boolean().optional()
      })
    )
    .optional()
    .default([]),
  tags: z.array(z.string()).optional().default([]),
  regulatoryReportable: z.boolean().optional().default(false),
  attachments: z.array(z.string()).optional().default([])
});

export const updateIncidentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(10).optional(),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  status: z.enum(['reported', 'investigating', 'resolved', 'escalated', 'closed']).optional(),
  location: z
    .object({
      building: z.string().optional(),
      floor: z.string().optional(),
      room: z.string().optional(),
      area: z.string().min(1),
      coordinates: z
        .object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180)
        })
        .optional()
    })
    .optional(),
  injuries: z
    .array(
      z.object({
        type: z.string().min(1),
        bodyPart: z.string().min(1),
        severity: z.nativeEnum(IncidentSeverity),
        description: z.string().optional(),
        treatmentRequired: z.boolean().optional(),
        treatmentGiven: z.string().optional(),
        medicalAttentionRequired: z.boolean().optional()
      })
    )
    .optional(),
  tags: z.array(z.string()).optional(),
  regulatoryReportable: z.boolean().optional(),
  regulatoryReportNumber: z.string().optional(),
  policeNotified: z.boolean().optional(),
  familyNotified: z.boolean().optional(),
  notes: z.array(z.string()).optional()
});

export const witnessSchema = z.object({
  witnessId: z.string().min(1, 'Witness ID is required'),
  witnessName: z.string().min(1, 'Witness name is required'),
  witnessRole: z.string().min(1, 'Witness role is required'),
  statement: z.string().min(10, 'Statement must be at least 10 characters'),
  timeOfObservation: z.string().datetime().or(z.date()).transform((val) => new Date(val)),
  contactNumber: z.string().optional(),
  isPrimaryWitness: z.boolean().optional().default(false),
  attachments: z.array(z.string()).optional().default([])
});

export const investigationSchema = z.object({
  investigatorId: z.string().min(1, 'Investigator ID is required'),
  investigatorName: z.string().min(1, 'Investigator name is required'),
  investigatorRole: z.string().min(1, 'Investigator role is required'),
  findings: z.string().min(10, 'Findings must be at least 10 characters'),
  rootCause: z.string().optional(),
  contributingFactors: z.array(z.string()).optional().default([]),
  recommendations: z
    .array(z.string())
    .min(1, 'At least one recommendation is required'),
  correctiveActions: z
    .array(
      z.object({
        action: z.string().min(1),
        assignedTo: z.string().min(1),
        dueDate: z.string().datetime().or(z.date()).transform((val) => new Date(val)),
        status: z.enum(['pending', 'in_progress', 'completed']).optional().default('pending')
      })
    )
    .optional()
    .default([])
});

export const resolutionSchema = z.object({
  resolvedBy: z.string().min(1, 'Resolver ID is required'),
  resolvedByName: z.string().min(1, 'Resolver name is required'),
  resolutionSummary: z.string().min(10, 'Resolution summary must be at least 10 characters'),
  followUpRequired: z.boolean().optional().default(false),
  followUpDate: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => new Date(val))
    .optional()
});

export const escalationSchema = z.object({
  escalatedBy: z.string().min(1, 'Escalator ID is required'),
  escalatedByName: z.string().min(1, 'Escalator name is required'),
  escalatedTo: z.string().min(1, 'Escalation target is required'),
  escalationReason: z.string().min(10, 'Escalation reason must be at least 10 characters')
});

// Safeguarding Schemas
export const safeguardingConcernSchema = z.object({
  concernType: z.enum([
    'physical_abuse',
    'emotional_abuse',
    'sexual_abuse',
    'neglect',
    'financial_abuse',
    'self_neglect',
    'exploitation',
    'radicalisation',
    'missing_person',
    'other'
  ]),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  vulnerablePerson: z.object({
    personId: z.string().min(1, 'Person ID is required'),
    name: z.string().min(1, 'Person name is required'),
    dateOfBirth: z.string().datetime().or(z.date()).transform((val) => new Date(val)).optional(),
    gender: z.string().optional(),
    careType: z.string().optional(),
    careLocation: z.string().optional()
  }),
  concernRaisedBy: z.object({
    userId: z.string().min(1, 'Reporter user ID is required'),
    name: z.string().min(1, 'Reporter name is required'),
    role: z.string().min(1, 'Reporter role is required'),
    department: z.string().optional(),
    contactNumber: z.string().optional()
  }),
  incidentLinked: z.string().optional(),
  immediateActions: z.array(z.string()).optional().default([]),
  attachments: z.array(z.string()).optional().default([])
});

export const riskAssessmentSchema = z.object({
  riskScore: z.number().min(0).max(100, 'Risk score must be between 0 and 100'),
  riskFactors: z.array(z.string()).min(1, 'At least one risk factor is required'),
  protectiveFactors: z.array(z.string()).default([]),
  riskLevelJustification: z.string().min(20, 'Justification must be at least 20 characters'),
  assessedBy: z.string().min(1, 'Assessor ID is required')
});

export const protectionPlanSchema = z.object({
  measures: z
    .array(
      z.object({
        measure: z.string().min(1, 'Measure description is required'),
        responsibleParty: z.string().min(1, 'Responsible party is required'),
        startDate: z.string().datetime().or(z.date()).transform((val) => new Date(val)),
        endDate: z.string().datetime().or(z.date()).transform((val) => new Date(val)).optional()
      })
    )
    .min(1, 'At least one measure is required'),
  reviewDate: z.string().datetime().or(z.date()).transform((val) => new Date(val)),
  nextReviewDate: z.string().datetime().or(z.date()).transform((val) => new Date(val)),
  createdBy: z.string().min(1, 'Creator ID is required'),
  notes: z.string().optional()
});

export const authorityNotificationSchema = z.object({
  authorityName: z.string().min(1, 'Authority name is required'),
  contactMethod: z.string().optional(),
  contactPerson: z.string().optional(),
  referenceNumber: z.string().optional(),
  outcome: z.string().optional()
});

// ==================== VALIDATION MIDDLEWARE ====================

export const validateIncident = createValidator(incidentSchema, 'body');
export const validateUpdateIncident = createValidator(updateIncidentSchema, 'body');
export const validateWitness = createValidator(witnessSchema, 'body');
export const validateInvestigation = createValidator(investigationSchema, 'body');
export const validateResolution = createValidator(resolutionSchema, 'body');
export const validateEscalation = createValidator(escalationSchema, 'body');
export const validateSafeguardingConcern = createValidator(safeguardingConcernSchema, 'body');
export const validateRiskAssessment = createValidator(riskAssessmentSchema, 'body');
export const validateProtectionPlan = createValidator(protectionPlanSchema, 'body');
export const validateAuthorityNotification = createValidator(authorityNotificationSchema, 'body');

// ==================== HELPER FUNCTIONS ====================

function createValidator(schema: ZodSchema, target: 'body' | 'query' | 'params') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = target === 'body' ? req.body : target === 'query' ? req.query : req.params;
      const validated = schema.parse(data);

      if (target === 'body') {
        req.body = validated;
      } else if (target === 'query') {
        req.query = validated;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
        return;
      }
      next(error);
    }
  };
}

function formatZodErrors(error: ZodError): Array<{ field: string; message: string }> {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message
  }));
}

// ==================== CUSTOM VALIDATORS ====================

export const isValidIncidentId = (id: string): boolean => {
  return /^INC-\d+-[A-Z0-9]{8}$/.test(id);
};

export const isValidConcernId = (id: string): boolean => {
  return /^SGC-\d+-[A-Z0-9]{8}$/.test(id);
};

export const isValidTimeFormat = (time: string): boolean => {
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
};

export const isValidDateRange = (start: Date, end: Date): boolean => {
  return start <= end;
};

// ==================== SANITIZATION ====================

export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

export const sanitizeIncidentData = <T extends Record<string, unknown>>(data: T): T => {
  const sanitized = { ...data };

  Object.keys(sanitized).forEach((key) => {
    const value = sanitized[key];
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      (sanitized as Record<string, unknown>)[key] = sanitizeIncidentData(
        value as Record<string, unknown>
      );
    }
  });

  return sanitized;
};
