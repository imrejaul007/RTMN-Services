/**
 * Healthcare Intelligence Service
 * Port: 4751
 *
 * AI-powered predictions for healthcare industry:
 * - Appointment no-show prediction
 * - Treatment adherence prediction
 * - Patient risk analysis
 * - Appointment recommendations
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requestId: string;
  timestamp: string;
}

interface NoShowRequest {
  patientId: string;
  appointmentData: {
    appointmentId: string;
    scheduledDate: string;
    appointmentType: 'consultation' | 'procedure' | 'followup' | 'emergency';
    duration: number;
    department: string;
  };
  patientHistory: {
    previousNoShows: number;
    totalAppointments: number;
    avgCancellationNotice: number;
    lastVisitDate: string;
  };
  contextualFactors?: {
    distance: number;
    weatherCondition: 'clear' | 'rainy' | 'stormy';
    dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  };
}

interface NoShowResult {
  noShowProbability: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: Array<{ factor: string; contribution: number }>;
  recommendations: string[];
}

interface AdherenceRequest {
  patientId: string;
  treatmentData: {
    treatmentType: 'medication' | 'therapy' | 'lifestyle' | 'post_surgical';
    duration: number;
    complexity: 'simple' | 'moderate' | 'complex';
    frequency: 'daily' | 'weekly' | 'monthly';
  };
  patientProfile: {
    age: number;
    chronicConditions: number;
    previousAdherence?: number;
    healthLiteracy: 'low' | 'medium' | 'high';
    supportSystem: 'none' | 'family' | 'caregiver';
  };
  medicationDetails?: {
    pillBurden: number;
    sideEffects: number;
    costConcern: boolean;
  };
}

interface AdherenceResult {
  adherenceProbability: number;
  confidence: number;
  riskFactors: string[];
  interventions: Array<{
    type: string;
    description: string;
    expectedImpact: number;
  }>;
  followUpDays: number;
}

interface PatientRiskRequest {
  patientId: string;
  clinicalData: {
    age: number;
    bmi: number;
    bloodPressure: { systolic: number; diastolic: number };
    conditions: string[];
    recentDiagnoses: string[];
    labResults?: Record<string, number>;
  };
  behavioralData: {
    appointmentAttendance: number;
    medicationRefills: number;
    lifestyleScore: number;
  };
  socialData?: {
    incomeLevel: 'low' | 'middle' | 'high';
    insuranceStatus: 'none' | 'basic' | 'comprehensive';
    distanceToFacility: number;
  };
}

interface PatientRiskResult {
  riskScore: number;
  riskCategory: 'low' | 'moderate' | 'high' | 'critical';
  riskFactors: Array<{ factor: string; impact: number; category: string }>;
  proactiveActions: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    estimatedImpact: number;
  }>;
  predictedHealthDecline: {
    probability: number;
    timeframe: string;
    conditions: string[];
  };
}

interface AppointmentRecommendation {
  patientId: string;
  currentAppointment?: {
    scheduledDate: string;
    appointmentType: string;
  };
  recommendations: Array<{
    type: 'reschedule' | 'add' | 'reminder' | 'priority';
    reason: string;
    suggestedAction: string;
    urgency: 'low' | 'medium' | 'high';
  }>;
  optimalSlots: Array<{
    date: string;
    time: string;
    predictedAttendance: number;
  }>;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const noShowSchema = z.object({
  patientId: z.string().min(1),
  appointmentData: z.object({
    appointmentId: z.string().min(1),
    scheduledDate: z.string(),
    appointmentType: z.enum(['consultation', 'procedure', 'followup', 'emergency']),
    duration: z.number().int().positive(),
    department: z.string().min(1),
  }),
  patientHistory: z.object({
    previousNoShows: z.number().int().min(0),
    totalAppointments: z.number().int().positive(),
    avgCancellationNotice: z.number().min(0),
    lastVisitDate: z.string(),
  }),
  contextualFactors: z
    .object({
      distance: z.number().min(0),
      weatherCondition: z.enum(['clear', 'rainy', 'stormy']),
      dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
    })
    .optional(),
});

const adherenceSchema = z.object({
  patientId: z.string().min(1),
  treatmentData: z.object({
    treatmentType: z.enum(['medication', 'therapy', 'lifestyle', 'post_surgical']),
    duration: z.number().int().positive(),
    complexity: z.enum(['simple', 'moderate', 'complex']),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
  }),
  patientProfile: z.object({
    age: z.number().int().min(0).max(120),
    chronicConditions: z.number().int().min(0),
    previousAdherence: z.number().min(0).max(1).optional(),
    healthLiteracy: z.enum(['low', 'medium', 'high']),
    supportSystem: z.enum(['none', 'family', 'caregiver']),
  }),
  medicationDetails: z
    .object({
      pillBurden: z.number().int().min(0),
      sideEffects: z.number().int().min(0),
      costConcern: z.boolean(),
    })
    .optional(),
});

const patientRiskSchema = z.object({
  patientId: z.string().min(1),
  clinicalData: z.object({
    age: z.number().int().min(0).max(120),
    bmi: z.number().min(10).max(60),
    bloodPressure: z.object({
      systolic: z.number().int().min(60).max(250),
      diastolic: z.number().int().min(40).max(150),
    }),
    conditions: z.array(z.string()),
    recentDiagnoses: z.array(z.string()),
    labResults: z.record(z.string(), z.number()).optional(),
  }),
  behavioralData: z.object({
    appointmentAttendance: z.number().min(0).max(1),
    medicationRefills: z.number().int().min(0),
    lifestyleScore: z.number().min(0).max(100),
  }),
  socialData: z
    .object({
      incomeLevel: z.enum(['low', 'middle', 'high']),
      insuranceStatus: z.enum(['none', 'basic', 'comprehensive']),
      distanceToFacility: z.number().min(0),
    })
    .optional(),
});

// =============================================================================
// MOCK PREDICTION ENGINES
// =============================================================================

/**
 * Mock no-show prediction
 * In production, this would call ML models from HOJAI Feature Store
 */
function predictNoShow(data: NoShowRequest): NoShowResult {
  const { patientHistory, appointmentData, contextualFactors } = data;

  // Calculate base no-show probability from history
  const historyScore = patientHistory.previousNoShows / patientHistory.totalAppointments;

  // Appointment type factor
  const typeFactor: Record<string, number> = {
    emergency: -0.3, // Less likely to no-show
    followup: 0.1, // Moderate
    consultation: 0.2,
    procedure: -0.1,
  };

  // Day of week factor
  const dayFactor: Record<string, number> = {
    monday: 0.1,
    tuesday: 0,
    wednesday: -0.05,
    thursday: 0,
    friday: 0.15,
    saturday: 0.25,
    sunday: 0.3,
  };

  // Weather factor
  const weatherFactor: Record<string, number> = {
    clear: 0,
    rainy: 0.15,
    stormy: 0.3,
  };

  let baseProbability = 0.2 + historyScore * 0.3;
  baseProbability += typeFactor[appointmentData.appointmentType] || 0;

  if (contextualFactors) {
    baseProbability += dayFactor[contextualFactors.dayOfWeek] || 0;
    baseProbability += weatherFactor[contextualFactors.weatherCondition] || 0;
    baseProbability += Math.min(contextualFactors.distance / 100, 0.2);
  }

  const noShowProbability = Math.min(0.95, Math.max(0.05, baseProbability));

  // Determine risk level
  let riskLevel: NoShowResult['riskLevel'] = 'low';
  if (noShowProbability > 0.7) riskLevel = 'high';
  else if (noShowProbability > 0.4) riskLevel = 'medium';

  // Contributing factors
  const factors: NoShowResult['factors'] = [];
  if (patientHistory.previousNoShows > 0) {
    factors.push({
      factor: 'Previous no-shows',
      contribution: Math.round(historyScore * 100),
    });
  }
  if (contextualFactors?.distance && contextualFactors.distance > 20) {
    factors.push({ factor: 'Long travel distance', contribution: 15 });
  }
  if (contextualFactors?.weatherCondition === 'stormy') {
    factors.push({ factor: 'Severe weather', contribution: 20 });
  }
  if (appointmentData.appointmentType === 'consultation') {
    factors.push({ factor: 'Consultation appointment', contribution: 10 });
  }

  // Recommendations
  const recommendations: string[] = [];
  if (noShowProbability > 0.5) {
    recommendations.push('Send SMS reminder 24 hours before');
    recommendations.push('Offer telemedicine alternative');
  }
  if (contextualFactors?.dayOfWeek === 'saturday') {
    recommendations.push('Consider rescheduling to weekday');
  }
  if (patientHistory.previousNoShows > 2) {
    recommendations.push('Require confirmation call before appointment');
    recommendations.push('Consider home visit for high-risk patients');
  }

  return {
    noShowProbability: Math.round(noShowProbability * 100) / 100,
    confidence: 0.7 + Math.random() * 0.2,
    riskLevel,
    factors,
    recommendations,
  };
}

/**
 * Mock treatment adherence prediction
 */
function predictAdherence(data: AdherenceRequest): AdherenceResult {
  const { treatmentData, patientProfile, medicationDetails } = data;

  // Base adherence by complexity
  const complexityAdherence: Record<string, number> = {
    simple: 0.85,
    moderate: 0.7,
    complex: 0.5,
  };

  let adherenceProbability = complexityAdherence[treatmentData.complexity] || 0.7;

  // Adjust for health literacy
  const literacyFactor: Record<string, number> = {
    low: -0.2,
    medium: 0,
    high: 0.1,
  };
  adherenceProbability += literacyFactor[patientProfile.healthLiteracy] || 0;

  // Support system factor
  const supportFactor: Record<string, number> = {
    none: -0.15,
    family: 0.1,
    caregiver: 0.15,
  };
  adherenceProbability += supportFactor[patientProfile.supportSystem] || 0;

  // Previous adherence (if available)
  if (patientProfile.previousAdherence !== undefined) {
    adherenceProbability = adherenceProbability * 0.5 + patientProfile.previousAdherence * 0.5;
  }

  // Medication-specific factors
  if (medicationDetails) {
    adherenceProbability -= medicationDetails.pillBurden * 0.02;
    adherenceProbability -= medicationDetails.sideEffects * 0.05;
    if (medicationDetails.costConcern) adherenceProbability -= 0.1;
  }

  // Age factor
  if (patientProfile.age > 65) adherenceProbability += 0.05;

  // Chronic conditions
  adherenceProbability -= patientProfile.chronicConditions * 0.03;

  adherenceProbability = Math.min(0.98, Math.max(0.1, adherenceProbability));

  // Risk factors
  const riskFactors: string[] = [];
  if (medicationDetails?.pillBurden > 5) riskFactors.push('High pill burden');
  if (medicationDetails?.costConcern) riskFactors.push('Cost concerns');
  if (patientProfile.supportSystem === 'none') riskFactors.push('No support system');
  if (treatmentData.complexity === 'complex') riskFactors.push('Complex treatment regimen');
  if (patientProfile.chronicConditions > 3) riskFactors.push('Multiple chronic conditions');

  // Interventions
  const interventions: AdherenceResult['interventions'] = [];
  if (adherenceProbability < 0.7) {
    interventions.push({
      type: 'reminder',
      description: 'Daily medication reminders via SMS/app',
      expectedImpact: 0.15,
    });
  }
  if (patientProfile.supportSystem === 'none') {
    interventions.push({
      type: 'support',
      description: 'Connect patient with support group',
      expectedImpact: 0.2,
    });
  }
  if (medicationDetails?.costConcern) {
    interventions.push({
      type: 'assistance',
      description: 'Connect with patient assistance programs',
      expectedImpact: 0.25,
    });
  }
  if (medicationDetails?.sideEffects > 2) {
    interventions.push({
      type: 'review',
      description: 'Review medication with physician for alternatives',
      expectedImpact: 0.1,
    });
  }

  // Follow-up days based on risk
  const followUpDays = adherenceProbability < 0.6 ? 7 : adherenceProbability < 0.8 ? 14 : 30;

  return {
    adherenceProbability: Math.round(adherenceProbability * 100) / 100,
    confidence: 0.65 + Math.random() * 0.25,
    riskFactors,
    interventions,
    followUpDays,
  };
}

/**
 * Mock patient risk analysis
 */
function analyzePatientRisk(data: PatientRiskRequest): PatientRiskResult {
  const { clinicalData, behavioralData, socialData } = data;

  let riskScore = 0;

  // Clinical factors
  if (clinicalData.age > 70) riskScore += 15;
  else if (clinicalData.age > 50) riskScore += 8;

  if (clinicalData.bmi > 35) riskScore += 15;
  else if (clinicalData.bmi > 30) riskScore += 10;
  else if (clinicalData.bmi > 25) riskScore += 5;

  if (clinicalData.bloodPressure.systolic > 160) riskScore += 15;
  else if (clinicalData.bloodPressure.systolic > 140) riskScore += 8;

  // Conditions
  const highRiskConditions = ['diabetes', 'heart disease', 'cancer', 'copd', 'ckd'];
  clinicalData.conditions.forEach((condition) => {
    if (highRiskConditions.includes(condition.toLowerCase())) riskScore += 10;
    else riskScore += 3;
  });

  // Behavioral factors
  riskScore += (1 - behavioralData.appointmentAttendance) * 20;
  if (behavioralData.medicationRefills < 3) riskScore += 10;
  if (behavioralData.lifestyleScore < 40) riskScore += 15;
  else if (behavioralData.lifestyleScore < 60) riskScore += 8;

  // Social factors
  if (socialData) {
    if (socialData.incomeLevel === 'low') riskScore += 10;
    if (socialData.insuranceStatus === 'none') riskScore += 15;
    else if (socialData.insuranceStatus === 'basic') riskScore += 5;
    if (socialData.distanceToFacility > 30) riskScore += 8;
  }

  riskScore = Math.min(100, Math.max(0, riskScore));

  // Risk category
  let riskCategory: PatientRiskResult['riskCategory'] = 'low';
  if (riskScore > 60) riskCategory = 'critical';
  else if (riskScore > 40) riskCategory = 'high';
  else if (riskScore > 20) riskCategory = 'moderate';

  // Risk factors detail
  const riskFactors: PatientRiskResult['riskFactors'] = [];
  if (clinicalData.age > 70) riskFactors.push({ factor: 'Advanced age', impact: 15, category: 'clinical' });
  if (clinicalData.bmi > 30) riskFactors.push({ factor: 'Obesity', impact: 10, category: 'clinical' });
  if (clinicalData.bloodPressure.systolic > 140) riskFactors.push({ factor: 'Hypertension', impact: 8, category: 'clinical' });
  if (clinicalData.conditions.length > 3) riskFactors.push({ factor: 'Multiple conditions', impact: 12, category: 'clinical' });
  if (behavioralData.appointmentAttendance < 0.8) riskFactors.push({ factor: 'Poor attendance', impact: 15, category: 'behavioral' });
  if (behavioralData.lifestyleScore < 50) riskFactors.push({ factor: 'Poor lifestyle', impact: 10, category: 'behavioral' });
  if (socialData?.insuranceStatus === 'none') riskFactors.push({ factor: 'No insurance', impact: 15, category: 'social' });
  if (socialData?.incomeLevel === 'low') riskFactors.push({ factor: 'Low income', impact: 10, category: 'social' });

  // Proactive actions
  const proactiveActions: PatientRiskResult['proactiveActions'] = [];
  if (riskCategory === 'critical' || riskCategory === 'high') {
    proactiveActions.push({
      action: 'Schedule care coordinator call',
      priority: 'high',
      estimatedImpact: 0.2,
    });
    proactiveActions.push({
      action: 'Review medication management',
      priority: 'high',
      estimatedImpact: 0.15,
    });
  }
  if (clinicalData.bloodPressure.systolic > 140) {
    proactiveActions.push({
      action: 'Schedule BP follow-up within 2 weeks',
      priority: 'medium',
      estimatedImpact: 0.1,
    });
  }
  if (behavioralData.appointmentAttendance < 0.8) {
    proactiveActions.push({
      action: 'Implement reminder system',
      priority: 'medium',
      estimatedImpact: 0.15,
    });
  }
  proactiveActions.push({
    action: 'Annual wellness visit',
    priority: 'low',
    estimatedImpact: 0.05,
  });

  // Predicted health decline
  const predictedHealthDecline = {
    probability: riskScore > 40 ? 0.4 + Math.random() * 0.3 : Math.random() * 0.2,
    timeframe: riskScore > 50 ? '6 months' : '12 months',
    conditions: riskScore > 40 ? ['hospitalization', 'complications'] : [],
  };

  return {
    riskScore: Math.round(riskScore),
    riskCategory,
    riskFactors,
    proactiveActions,
    predictedHealthDecline,
  };
}

/**
 * Mock appointment recommendations
 */
function getAppointmentRecommendations(patientId: string): AppointmentRecommendation {
  const today = new Date();

  // Generate optimal slots (mock)
  const optimalSlots = [];
  for (let i = 1; i <= 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    if (date.getDay() !== 0) {
      // Skip Sundays
      optimalSlots.push({
        date: date.toISOString().split('T')[0],
        time: `${9 + Math.floor(Math.random() * 8)}:00`,
        predictedAttendance: 0.85 + Math.random() * 0.1,
      });
    }
  }

  // Generate recommendations
  const recommendations: AppointmentRecommendation['recommendations'] = [];
  recommendations.push({
    type: 'reminder',
    reason: 'Appointment attendance optimization',
    suggestedAction: 'Send reminder 48 hours before',
    urgency: 'medium',
  });

  // Random decision for other recommendations
  if (Math.random() > 0.5) {
    recommendations.push({
      type: 'priority',
      reason: 'Follow-up due',
      suggestedAction: 'Schedule routine follow-up within 30 days',
      urgency: 'low',
    });
  }

  if (Math.random() > 0.7) {
    recommendations.push({
      type: 'reschedule',
      reason: 'Optimal slot available',
      suggestedAction: 'Reschedule to weekday morning for better attendance',
      urgency: 'medium',
    });
  }

  return {
    patientId,
    recommendations,
    optimalSlots,
  };
}

// =============================================================================
// EXPRESS SERVER
// =============================================================================

const PORT = 4751;
const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(compression());
app.use(express.json({ limit: "10kb" }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as Request & { requestId: string }).requestId = uuidv4();
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  const response: ApiResponse<{ service: string; status: string }> = {
    success: true,
    data: {
      service: 'healthcare-intelligence',
      status: 'healthy',
    },
    requestId: uuidv4(),
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

// API Health check
app.get('/api/health', (_req: Request, res: Response) => {
  const response: ApiResponse<{
    service: string;
    version: string;
    uptime: number;
    predictions: Record<string, number>;
  }> = {
    success: true,
    data: {
      service: 'healthcare-intelligence',
      version: '1.0.0',
      uptime: process.uptime(),
      predictions: {
        noShow: 0,
        adherence: 0,
        patientRisk: 0,
        appointments: 0,
      },
    },
    requestId: uuidv4(),
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * POST /api/predict/no-show
 * Predict appointment no-show probability
 */
app.post('/api/predict/no-show', (req: Request, res: Response) => {
  try {
    const validation = noShowSchema.safeParse(req.body);

    if (!validation.success) {
      const response: ApiResponse = {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
        requestId: (req as Request & { requestId: string }).requestId,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    const result = predictNoShow(validation.data);

    const response: ApiResponse<NoShowResult> = {
      success: true,
      data: result,
      requestId: (req as Request & { requestId: string }).requestId,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
      requestId: (req as Request & { requestId: string }).requestId,
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/predict/adherence
 * Predict treatment adherence
 */
app.post('/api/predict/adherence', (req: Request, res: Response) => {
  try {
    const validation = adherenceSchema.safeParse(req.body);

    if (!validation.success) {
      const response: ApiResponse = {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
        requestId: (req as Request & { requestId: string }).requestId,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    const result = predictAdherence(validation.data);

    const response: ApiResponse<AdherenceResult> = {
      success: true,
      data: result,
      requestId: (req as Request & { requestId: string }).requestId,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
      requestId: (req as Request & { requestId: string }).requestId,
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/analyze/patient-risk
 * Analyze patient risk
 */
app.post('/api/analyze/patient-risk', (req: Request, res: Response) => {
  try {
    const validation = patientRiskSchema.safeParse(req.body);

    if (!validation.success) {
      const response: ApiResponse = {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
        requestId: (req as Request & { requestId: string }).requestId,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    const result = analyzePatientRisk(validation.data);

    const response: ApiResponse<PatientRiskResult> = {
      success: true,
      data: result,
      requestId: (req as Request & { requestId: string }).requestId,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
      requestId: (req as Request & { requestId: string }).requestId,
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/appointments/recommendations
 * Get appointment recommendations for a patient
 */
app.get('/api/appointments/recommendations', (req: Request, res: Response) => {
  try {
    const patientId = req.query.patientId as string;

    if (!patientId) {
      const response: ApiResponse = {
        success: false,
        error: 'patientId query parameter is required',
        requestId: uuidv4(),
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    const result = getAppointmentRecommendations(patientId);

    const response: ApiResponse<AppointmentRecommendation> = {
      success: true,
      data: result,
      requestId: uuidv4(),
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
      requestId: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  const response: ApiResponse = {
    success: false,
    error: 'Not found',
    requestId: uuidv4(),
    timestamp: new Date().toISOString(),
  };
  res.status(404).json(response);
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  const response: ApiResponse = {
    success: false,
    error: 'Internal server error',
    requestId: uuidv4(),
    timestamp: new Date().toISOString(),
  };
  res.status(500).json(response);
});

// Start server
app.listen(PORT, () => {
  console.log(`Healthcare Intelligence Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API health: http://localhost:${PORT}/api/health`);
});

export default app;
