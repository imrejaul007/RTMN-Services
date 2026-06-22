import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';

// Zod schemas for request validation

export const FallRiskFactorsSchema = z.object({
  vision: z.object({
    impaired: z.boolean(),
    severity: z.enum(['mild', 'moderate', 'severe']).optional(),
    lastEyeExam: z.date().optional()
  }),
  balance: z.object({
    impaired: z.boolean(),
    gait: z.enum(['normal', 'steady', 'unsteady', 'abnormal']),
    assistiveDevice: z.string().optional()
  }),
  strength: z.object({
    lowerExtremity: z.enum(['normal', 'mild_weakness', 'moderate_weakness', 'severe_weakness']),
    fatigueLevel: z.enum(['none', 'mild', 'moderate', 'severe'])
  }),
  medications: z.object({
    highRiskMedications: z.array(z.string()),
    totalMedications: z.number().min(0),
    sedatives: z.boolean(),
    antihypertensives: z.boolean(),
    analgesics: z.boolean()
  }),
  history: z.object({
    previousFalls: z.number().min(0),
    recentFallWithin30Days: z.boolean(),
    fearOfFalling: z.boolean(),
    hipFracture: z.boolean()
  }),
  environment: z.object({
    homeHazards: z.array(z.string()),
    poorLighting: z.boolean(),
    stairs: z.boolean(),
    bathroomsafety: z.boolean(),
    rugsCarpet: z.boolean()
  }),
  additionalFactors: z.object({
    ageOver65: z.boolean().optional(),
    cognitiveImpairment: z.boolean().optional(),
    alcoholUse: z.boolean().optional(),
    orthostaticHypotension: z.boolean().optional(),
    incontinence: z.boolean().optional(),
    footwear: z.enum(['appropriate', 'inappropriate']).optional()
  }).optional()
});

export const MobilitySchema = z.object({
  ambulationStatus: z.enum(['independent', 'supervision', 'limited', 'dependent']),
  distance: z.number().min(0),
  assistanceRequired: z.boolean()
});

export const FallMedicationsSchema = z.object({
  anticoagulants: z.boolean(),
  psychotropics: z.boolean(),
  polypharmacy: z.boolean()
});

export const FallHistorySchema = z.object({
  fallsInPastYear: z.number().min(0),
  injuriousFalls: z.number().min(0),
  lastFallDate: z.date().optional()
});

export const FallRiskAssessmentInputSchema = z.object({
  factors: FallRiskFactorsSchema,
  mobility: MobilitySchema,
  medications: FallMedicationsSchema,
  history: FallHistorySchema,
  assessedBy: z.string().optional()
});

export const WoundRiskFactorsSchema = z.object({
  nutrition: z.object({
    status: z.enum(['good', 'moderate', 'poor']),
    albumin: z.number().optional(),
    bmi: z.number(),
    hydrationStatus: z.enum(['adequate', 'mildly_dehydrated', 'dehydrated']).optional()
  }),
  mobility: z.object({
    level: z.enum(['full', 'limited', 'immobile']),
    repositioningFrequency: z.number().optional(),
    abilityToShift: z.boolean()
  }),
  continence: z.object({
    urinary: z.enum(['continent', 'occasionally_incontinent', 'incontinent']),
    fecal: z.enum(['continent', 'occasionally_incontinent', 'incontinent']),
    combined: z.enum(['dry', 'moist_intermittently', 'moist_constantly'])
  }),
  age: z.number().min(0).max(120),
  comorbidities: z.object({
    diabetes: z.boolean(),
    vascularDisease: z.boolean(),
    anemia: z.boolean(),
    neuropathy: z.boolean(),
    respiratoryDisease: z.boolean(),
    renalDisease: z.boolean(),
    cancer: z.boolean()
  }),
  sensory: z.object({
    sensoryLoss: z.boolean(),
    painLevel: z.number().min(0).max(10),
    numbness: z.boolean()
  })
});

export const WoundAssessmentInputSchema = z.object({
  woundId: z.string().min(1),
  location: z.string().min(1),
  stage: z.enum(['stage_1', 'stage_2', 'stage_3', 'stage_4', 'unstageable', 'deep_tissue_injury']),
  size: z.object({
    length: z.number().min(0),
    width: z.number().min(0),
    depth: z.number().min(0)
  }).optional(),
  riskFactors: WoundRiskFactorsSchema,
  infectionRisk: z.enum(['none', 'low', 'moderate', 'high', 'critical']).optional(),
  exudate: z.object({
    type: z.enum(['none', 'serous', 'sanguineous', 'seropurulent', 'purulent']),
    amount: z.enum(['none', 'light', 'moderate', 'heavy'])
  }).optional(),
  tissueViability: z.object({
    granulation: z.number().min(0).max(100),
    slough: z.number().min(0).max(100),
    necrosis: z.number().min(0).max(100)
  }).optional(),
  assessedBy: z.string().optional()
});

export const BradenFactorsSchema = z.object({
  sensoryPerception: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  moisture: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  activity: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  mobility: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  nutrition: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  frictionShear: z.union([z.literal(1), z.literal(2), z.literal(3)])
});

export const VitalSignsSchema = z.object({
  heartRate: z.number().optional(),
  systolicBP: z.number().optional(),
  diastolicBP: z.number().optional(),
  respiratoryRate: z.number().optional(),
  temperature: z.number().optional(),
  oxygenSaturation: z.number().min(0).max(100).optional(),
  bloodGlucose: z.number().optional(),
  consciousness: z.enum(['alert', 'voice', 'pain', 'unresponsive']).optional()
});

export const SafeguardingVulnerabilitySchema = z.object({
  category: z.enum([
    'physical_abuse',
    'emotional_abuse',
    'sexual_abuse',
    'neglect',
    'financial_abuse',
    'self_neglect',
    'domestic_violence',
    'modern_slavery',
    'radicalisation'
  ]),
  present: z.boolean(),
  severity: z.enum(['low', 'medium', 'high']),
  evidence: z.array(z.string()).optional(),
  reported: z.boolean().optional()
});

export const SafeguardingAssessmentInputSchema = z.object({
  concernType: z.enum([
    'physical_abuse',
    'emotional_abuse',
    'sexual_abuse',
    'neglect',
    'financial_abuse',
    'self_neglect',
    'domestic_violence',
    'modern_slavery',
    'radicalisation'
  ]),
  vulnerabilities: z.array(SafeguardingVulnerabilitySchema),
  riskIndicators: z.object({
    isolation: z.boolean().optional(),
    financialExploitation: z.boolean().optional(),
    unexplainedInjuries: z.boolean().optional(),
    caregiverStress: z.boolean().optional(),
    missedAppointments: z.boolean().optional(),
    medicationNonCompliance: z.boolean().optional(),
    changesInBehavior: z.boolean().optional(),
    poorHygiene: z.boolean().optional(),
    inadequateNutrition: z.boolean().optional(),
    housingConcerns: z.boolean().optional()
  }),
  protectiveFactors: z.array(z.string()).optional(),
  assessedBy: z.string().optional()
});

// Validation middleware factory
export const validate = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
        return;
      }
      next(error);
    }
  };
};

// Patient ID validation middleware
export const validatePatientId = (req: Request, res: Response, next: NextFunction): void => {
  const { patientId } = req.params;

  if (!patientId || typeof patientId !== 'string' || patientId.trim() === '') {
    res.status(400).json({
      success: false,
      error: 'Invalid patient ID'
    });
    return;
  }

  // Basic format validation (alphanumeric, hyphens, underscores allowed)
  const patientIdPattern = /^[a-zA-Z0-9_-]+$/;
  if (!patientIdPattern.test(patientId)) {
    res.status(400).json({
      success: false,
      error: 'Patient ID contains invalid characters'
    });
    return;
  }

  next();
};

// Admin-only middleware placeholder
export const requireAdmin = (_req: Request, res: Response, next: NextFunction): void => {
  // In production, implement proper authentication
  // For now, this is a placeholder
  next();
};

// Rate limiting for sensitive endpoints
export const sensitiveEndpointRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  // This would be integrated with express-rate-limit
  // For now, just pass through
  next();
};

// Request logging middleware
export const requestLogger = (req: Request, _res: Response, next: NextFunction): void => {
  const start = Date.now();

  _res.on('finish', () => {
    const duration = Date.now() - start;
    console.log({
      method: req.method,
      path: req.path,
      status: _res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
};
