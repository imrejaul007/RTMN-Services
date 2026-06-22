import mongoose, { Document, Schema, Model } from 'mongoose';

// ============================================
// ENUMS AND TYPE DEFINITIONS
// ============================================

export enum RiskLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export enum DeteriorationType {
  RESPIRATORY = 'respiratory',
  CARDIOVASCULAR = 'cardiovascular',
  NEUROLOGICAL = 'neurological',
  METABOLIC = 'metabolic',
  SEPSIS = 'sepsis',
  WOUND = 'wound',
  FALL = 'fall'
}

export enum SafeguardingConcernType {
  PHYSICAL_ABUSE = 'physical_abuse',
  EMOTIONAL_ABUSE = 'emotional_abuse',
  SEXUAL_ABUSE = 'sexual_abuse',
  NEGLECT = 'neglect',
  FINANCIAL_ABUSE = 'financial_abuse',
  SELF_NEGLECT = 'self_neglect',
  DOMESTIC_VIOLENCE = 'domestic_violence',
  MODERN_SLAVERY = 'modern_slavery',
  RADICALISATION = 'radicalisation'
}

export enum WoundStage {
  STAGE_1 = 'stage_1',
  STAGE_2 = 'stage_2',
  STAGE_3 = 'stage_3',
  STAGE_4 = 'stage_4',
  UNSTAGEABLE = 'unstageable',
  DEEP_TISSUE = 'deep_tissue_injury'
}

// ============================================
// FALL RISK SCHEMAS
// ============================================

export interface IFallRiskFactors {
  vision: {
    impaired: boolean;
    severity: 'mild' | 'moderate' | 'severe';
    lastEyeExam?: Date;
  };
  balance: {
    impaired: boolean;
    gait: 'normal' | 'steady' | 'unsteady' | 'abnormal';
    assistiveDevice?: string;
  };
  strength: {
    lowerExtremity: 'normal' | 'mild_weakness' | 'moderate_weakness' | 'severe_weakness';
    fatigueLevel: 'none' | 'mild' | 'moderate' | 'severe';
  };
  medications: {
    highRiskMedications: string[];
    totalMedications: number;
    sedatives: boolean;
    antihypertensives: boolean;
    analgesics: boolean;
  };
  history: {
    previousFalls: number;
    recentFallWithin30Days: boolean;
    fearOfFalling: boolean;
    hipFracture: boolean;
  };
  environment: {
    homeHazards: string[];
    poorLighting: boolean;
    stairs: boolean;
    bathroomsafety: boolean;
    rugsCarpet: boolean;
  };
  additionalFactors?: {
    ageOver65: boolean;
    cognitiveImpairment: boolean;
    alcoholUse: boolean;
    orthostaticHypotension: boolean;
    incontinence: boolean;
    footwear: 'appropriate' | 'inappropriate';
  };
}

export interface IFallRiskAssessment extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: string;
  score: number;
  riskLevel: RiskLevel;
  factors: IFallRiskFactors;
  mobility: {
    ambulationStatus: 'independent' | 'supervision' | 'limited' | 'dependent';
    distance: number;
    assistanceRequired: boolean;
  };
  medications: {
    anticoagulants: boolean;
    psychotropics: boolean;
    polypharmacy: boolean;
  };
  history: {
    fallsInPastYear: number;
    injuriousFalls: number;
    lastFallDate?: Date;
  };
  recommendations: string[];
  assessedBy?: string;
  assessmentDate: Date;
  nextAssessmentDue: Date;
  alertSent: boolean;
  carePlanId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FallRiskFactorsSchema = new Schema({
  vision: {
    impaired: { type: Boolean, required: true },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
    lastEyeExam: { type: Date }
  },
  balance: {
    impaired: { type: Boolean, required: true },
    gait: { type: String, enum: ['normal', 'steady', 'unsteady', 'abnormal'] },
    assistiveDevice: { type: String }
  },
  strength: {
    lowerExtremity: {
      type: String,
      enum: ['normal', 'mild_weakness', 'moderate_weakness', 'severe_weakness']
    },
    fatigueLevel: { type: String, enum: ['none', 'mild', 'moderate', 'severe'] }
  },
  medications: {
    highRiskMedications: [{ type: String }],
    totalMedications: { type: Number, default: 0 },
    sedatives: { type: Boolean, default: false },
    antihypertensives: { type: Boolean, default: false },
    analgesics: { type: Boolean, default: false }
  },
  history: {
    previousFalls: { type: Number, default: 0 },
    recentFallWithin30Days: { type: Boolean, default: false },
    fearOfFalling: { type: Boolean, default: false },
    hipFracture: { type: Boolean, default: false }
  },
  environment: {
    homeHazards: [{ type: String }],
    poorLighting: { type: Boolean, default: false },
    stairs: { type: Boolean, default: false },
    bathroomsafety: { type: Boolean, default: false },
    rugsCarpet: { type: Boolean, default: false }
  },
  additionalFactors: {
    ageOver65: { type: Boolean, default: false },
    cognitiveImpairment: { type: Boolean, default: false },
    alcoholUse: { type: Boolean, default: false },
    orthostaticHypotension: { type: Boolean, default: false },
    incontinence: { type: Boolean, default: false },
    footwear: { type: String, enum: ['appropriate', 'inappropriate'] }
  }
}, { _id: false });

const FallRiskAssessmentSchema = new Schema<IFallRiskAssessment>({
  patientId: { type: String, required: true, index: true },
  score: { type: Number, required: true, min: 0, max: 100 },
  riskLevel: { type: String, enum: Object.values(RiskLevel), required: true },
  factors: { type: FallRiskFactorsSchema, required: true },
  mobility: {
    ambulationStatus: {
      type: String,
      enum: ['independent', 'supervision', 'limited', 'dependent'],
      required: true
    },
    distance: { type: Number, default: 0 },
    assistanceRequired: { type: Boolean, default: false }
  },
  medications: {
    anticoagulants: { type: Boolean, default: false },
    psychotropics: { type: Boolean, default: false },
    polypharmacy: { type: Boolean, default: false }
  },
  history: {
    fallsInPastYear: { type: Number, default: 0 },
    injuriousFalls: { type: Number, default: 0 },
    lastFallDate: { type: Date }
  },
  recommendations: [{ type: String }],
  assessedBy: { type: String },
  assessmentDate: { type: Date, default: Date.now },
  nextAssessmentDue: { type: Date, required: true },
  alertSent: { type: Boolean, default: false },
  carePlanId: { type: String }
}, {
  timestamps: true,
  collection: 'fall_risk_assessments'
});

// ============================================
// WOUND RISK SCHEMAS
// ============================================

export interface IWoundRiskFactors {
  nutrition: {
    status: 'good' | 'moderate' | 'poor';
    albumin?: number;
    bmi: number;
    hydrationStatus: 'adequate' | 'mildly_dehydrated' | 'dehydrated';
  };
  mobility: {
    level: 'full' | 'limited' | 'immobile';
    repositioningFrequency?: number;
    abilityToShift: boolean;
  };
  continence: {
    urinary: 'continent' | 'occasionally_incontinent' | 'incontinent';
    fecal: 'continent' | 'occasionally_incontinent' | 'incontinent';
    combined: 'dry' | 'moist_intermittently' | 'moist_constantly';
  };
  age: number;
  comorbidities: {
    diabetes: boolean;
    vascularDisease: boolean;
    anemia: boolean;
    neuropathy: boolean;
    respiratoryDisease: boolean;
    renalDisease: boolean;
    cancer: boolean;
  };
  sensory: {
    sensoryLoss: boolean;
    painLevel: number;
    numbness: boolean;
  };
}

export interface IWoundAssessment extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: string;
  woundId: string;
  location: string;
  stage: WoundStage;
  size?: {
    length: number;
    width: number;
    depth: number;
    area?: number;
  };
  riskFactors: IWoundRiskFactors;
  infectionRisk: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  exudate: {
    type: 'none' | 'serous' | 'sanguineous' | 'seropurulent' | 'purulent';
    amount: 'none' | 'light' | 'moderate' | 'heavy';
  };
  tissueViability: {
    granulation: number;
    slough: number;
    necrosis: number;
  };
  surroundingSkin: {
    temperature: 'normal' | 'warm' | 'hot' | 'cool';
    color: string;
    edema: 'none' | 'mild' | 'moderate' | 'severe';
    integrity: 'intact' | 'macerated' | 'denuded';
  };
  pain: {
    level: number;
    constant: boolean;
    throbbing: boolean;
  };
  odor: boolean;
  assessmentScore: number;
  recommendations: string[];
  photos?: string[];
  assessedBy?: string;
  assessmentDate: Date;
  nextAssessmentDue: Date;
  alertSent: boolean;
  deteriorationDetected: boolean;
  deteriorationTrend?: 'improving' | 'stable' | 'worsening';
  createdAt: Date;
  updatedAt: Date;
}

const WoundRiskFactorsSchema = new Schema({
  nutrition: {
    status: { type: String, enum: ['good', 'moderate', 'poor'], required: true },
    albumin: { type: Number },
    bmi: { type: Number, required: true },
    hydrationStatus: { type: String, enum: ['adequate', 'mildly_dehydrated', 'dehydrated'] }
  },
  mobility: {
    level: { type: String, enum: ['full', 'limited', 'immobile'], required: true },
    repositioningFrequency: { type: Number },
    abilityToShift: { type: Boolean, default: true }
  },
  continence: {
    urinary: { type: String, enum: ['continent', 'occasionally_incontinent', 'incontinent'] },
    fecal: { type: String, enum: ['continent', 'occasionally_incontinent', 'incontinent'] },
    combined: { type: String, enum: ['dry', 'moist_intermittently', 'moist_constantly'] }
  },
  age: { type: Number, required: true },
  comorbidities: {
    diabetes: { type: Boolean, default: false },
    vascularDisease: { type: Boolean, default: false },
    anemia: { type: Boolean, default: false },
    neuropathy: { type: Boolean, default: false },
    respiratoryDisease: { type: Boolean, default: false },
    renalDisease: { type: Boolean, default: false },
    cancer: { type: Boolean, default: false }
  },
  sensory: {
    sensoryLoss: { type: Boolean, default: false },
    painLevel: { type: Number, default: 0 },
    numbness: { type: Boolean, default: false }
  }
}, { _id: false });

const WoundAssessmentSchema = new Schema<IWoundAssessment>({
  patientId: { type: String, required: true, index: true },
  woundId: { type: String, required: true, index: true },
  location: { type: String, required: true },
  stage: { type: String, enum: Object.values(WoundStage), required: true },
  size: {
    length: { type: Number },
    width: { type: Number },
    depth: { type: Number },
    area: { type: Number }
  },
  riskFactors: { type: WoundRiskFactorsSchema, required: true },
  infectionRisk: {
    type: String,
    enum: ['none', 'low', 'moderate', 'high', 'critical'],
    default: 'none'
  },
  exudate: {
    type: { type: String, enum: ['none', 'serous', 'sanguineous', 'seropurulent', 'purulent'] },
    amount: { type: String, enum: ['none', 'light', 'moderate', 'heavy'] }
  },
  tissueViability: {
    granulation: { type: Number, default: 0, min: 0, max: 100 },
    slough: { type: Number, default: 0, min: 0, max: 100 },
    necrosis: { type: Number, default: 0, min: 0, max: 100 }
  },
  surroundingSkin: {
    temperature: { type: String, enum: ['normal', 'warm', 'hot', 'cool'] },
    color: { type: String },
    edema: { type: String, enum: ['none', 'mild', 'moderate', 'severe'] },
    integrity: { type: String, enum: ['intact', 'macerated', 'denuded'] }
  },
  pain: {
    level: { type: Number, default: 0, min: 0, max: 10 },
    constant: { type: Boolean, default: false },
    throbbing: { type: Boolean, default: false }
  },
  odor: { type: Boolean, default: false },
  assessmentScore: { type: Number, required: true },
  recommendations: [{ type: String }],
  photos: [{ type: String }],
  assessedBy: { type: String },
  assessmentDate: { type: Date, default: Date.now },
  nextAssessmentDue: { type: Date, required: true },
  alertSent: { type: Boolean, default: false },
  deteriorationDetected: { type: Boolean, default: false },
  deteriorationTrend: { type: String, enum: ['improving', 'stable', 'worsening'] }
}, {
  timestamps: true,
  collection: 'wound_assessments'
});

// ============================================
// PRESSURE ULCER RISK SCHEMA
// ============================================

export interface IBradenFactors {
  sensoryPerception: 1 | 2 | 3 | 4; // 1=Completely limited, 4=No impairment
  moisture: 1 | 2 | 3 | 4; // 1=Constantly moist, 4=Rarely moist
  activity: 1 | 2 | 3 | 4; // 1=Bedfast, 4=Walks frequently
  mobility: 1 | 2 | 3 | 4; // 1=Completely immobile, 4=No limitations
  nutrition: 1 | 2 | 3 | 4; // 1=Very poor, 4=Excellent
  frictionShear: 1 | 2 | 3; // 1=Problem, 3=No apparent problem
}

export interface IPressureUlcerRisk extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: string;
  bradenScore: number;
  riskLevel: RiskLevel;
  factors: IBradenFactors;
  riskZones: string[];
  recommendations: string[];
  repositioningSchedule?: string;
  supportSurface?: string;
  skinInspectionFrequency?: string;
  assessedBy?: string;
  assessmentDate: Date;
  nextAssessmentDue: Date;
  alertSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BradenFactorsSchema = new Schema({
  sensoryPerception: { type: Number, enum: [1, 2, 3, 4], required: true },
  moisture: { type: Number, enum: [1, 2, 3, 4], required: true },
  activity: { type: Number, enum: [1, 2, 3, 4], required: true },
  mobility: { type: Number, enum: [1, 2, 3, 4], required: true },
  nutrition: { type: Number, enum: [1, 2, 3, 4], required: true },
  frictionShear: { type: Number, enum: [1, 2, 3], required: true }
}, { _id: false });

const PressureUlcerRiskSchema = new Schema<IPressureUlcerRisk>({
  patientId: { type: String, required: true, index: true },
  bradenScore: { type: Number, required: true, min: 6, max: 23 },
  riskLevel: { type: String, enum: Object.values(RiskLevel), required: true },
  factors: { type: BradenFactorsSchema, required: true },
  riskZones: [{ type: String }],
  recommendations: [{ type: String }],
  repositioningSchedule: { type: String },
  supportSurface: { type: String },
  skinInspectionFrequency: { type: String },
  assessedBy: { type: String },
  assessmentDate: { type: Date, default: Date.now },
  nextAssessmentDue: { type: Date, required: true },
  alertSent: { type: Boolean, default: false }
}, {
  timestamps: true,
  collection: 'pressure_ulcer_risks'
});

// ============================================
// DETERIORATION SIGNAL SCHEMA
// ============================================

export interface IVitalSigns {
  heartRate?: number;
  systolicBP?: number;
  diastolicBP?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  bloodGlucose?: number;
  consciousness?: 'alert' | 'voice' | 'pain' | 'unresponsive';
}

export interface IDeteriorationIndicator {
  type: string;
  value: number;
  threshold: number;
  deviation: number;
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical';
}

export interface IDeteriorationSignal extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: string;
  type: DeteriorationType;
  score: number;
  indicators: IDeteriorationIndicator[];
  vitals: IVitalSigns;
  riskLevel: RiskLevel;
  alertSent: boolean;
  alertSentAt?: Date;
  alertRecipient?: string;
  escalationLevel?: number;
  responseRequired: boolean;
  respondedBy?: string;
  respondedAt?: Date;
  notes?: string;
  detectedAt: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeteriorationSignalSchema = new Schema<IDeteriorationSignal>({
  patientId: { type: String, required: true, index: true },
  type: { type: String, enum: Object.values(DeteriorationType), required: true },
  score: { type: Number, required: true },
  indicators: [{
    type: { type: String, required: true },
    value: { type: Number, required: true },
    threshold: { type: Number, required: true },
    deviation: { type: Number, required: true },
    severity: { type: String, enum: ['normal', 'mild', 'moderate', 'severe', 'critical'] }
  }],
  vitals: {
    heartRate: { type: Number },
    systolicBP: { type: Number },
    diastolicBP: { type: Number },
    respiratoryRate: { type: Number },
    temperature: { type: Number },
    oxygenSaturation: { type: Number },
    bloodGlucose: { type: Number },
    consciousness: { type: String, enum: ['alert', 'voice', 'pain', 'unresponsive'] }
  },
  riskLevel: { type: String, enum: Object.values(RiskLevel), required: true },
  alertSent: { type: Boolean, default: false },
  alertSentAt: { type: Date },
  alertRecipient: { type: String },
  escalationLevel: { type: Number },
  responseRequired: { type: Boolean, default: true },
  respondedBy: { type: String },
  respondedAt: { type: Date },
  notes: { type: String },
  detectedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
}, {
  timestamps: true,
  collection: 'deterioration_signals'
});

// ============================================
// SAFEGUARDING RISK SCHEMA
// ============================================

export interface ISafeguardingVulnerability {
  category: SafeguardingConcernType;
  present: boolean;
  severity: 'low' | 'medium' | 'high';
  evidence?: string[];
  reported?: boolean;
  reportDate?: Date;
}

export interface ISafeguardingRisk extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: string;
  concernType: SafeguardingConcernType;
  riskLevel: RiskLevel;
  vulnerabilities: ISafeguardingVulnerability[];
  riskIndicators: {
    isolation: boolean;
    financialExploitation: boolean;
    unexplainedInjuries: boolean;
    caregiverStress: boolean;
    missedAppointments: boolean;
    medicationNonCompliance: boolean;
    changesInBehavior: boolean;
    poorHygiene: boolean;
    inadequateNutrition: boolean;
    housingConcerns: boolean;
  };
  protectiveFactors: string[];
  immediateActions: string[];
  referrals: {
    type: string;
    agency: string;
    date: Date;
    outcome?: string;
  }[];
  flaggedForReview: boolean;
  reviewDate?: Date;
  reviewedBy?: string;
  alertSent: boolean;
  alertSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SafeguardingVulnerabilitySchema = new Schema({
  category: { type: String, enum: Object.values(SafeguardingConcernType), required: true },
  present: { type: Boolean, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'] },
  evidence: [{ type: String }],
  reported: { type: Boolean, default: false },
  reportDate: { type: Date }
}, { _id: false });

const SafeguardingRiskSchema = new Schema<ISafeguardingRisk>({
  patientId: { type: String, required: true, index: true },
  concernType: { type: String, enum: Object.values(SafeguardingConcernType), required: true },
  riskLevel: { type: String, enum: Object.values(RiskLevel), required: true },
  vulnerabilities: [{ type: SafeguardingVulnerabilitySchema }],
  riskIndicators: {
    isolation: { type: Boolean, default: false },
    financialExploitation: { type: Boolean, default: false },
    unexplainedInjuries: { type: Boolean, default: false },
    caregiverStress: { type: Boolean, default: false },
    missedAppointments: { type: Boolean, default: false },
    medicationNonCompliance: { type: Boolean, default: false },
    changesInBehavior: { type: Boolean, default: false },
    poorHygiene: { type: Boolean, default: false },
    inadequateNutrition: { type: Boolean, default: false },
    housingConcerns: { type: Boolean, default: false }
  },
  protectiveFactors: [{ type: String }],
  immediateActions: [{ type: String }],
  referrals: [{
    type: { type: String },
    agency: { type: String },
    date: { type: Date },
    outcome: { type: String }
  }],
  flaggedForReview: { type: Boolean, default: false },
  reviewDate: { type: Date },
  reviewedBy: { type: String },
  alertSent: { type: Boolean, default: false },
  alertSentAt: { type: Date }
}, {
  timestamps: true,
  collection: 'safeguarding_risks'
});

// ============================================
// RISK ALERT SCHEMA
// ============================================

export enum AlertPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

export enum AlertStatus {
  PENDING = 'pending',
  SENT = 'sent',
  ACKNOWLEDGED = 'acknowledged',
  RESPONDED = 'responded',
  RESOLVED = 'resolved',
  EXPIRED = 'expired'
}

export interface IRiskAlert extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: string;
  riskType: 'fall' | 'wound' | 'deterioration' | 'safeguarding';
  riskLevel: RiskLevel;
  priority: AlertPriority;
  status: AlertStatus;
  title: string;
  message: string;
  recommendations: string[];
  recipients: string[];
  sentAt?: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  response?: string;
  respondedBy?: string;
  respondedAt?: Date;
  escalationCount: number;
  lastEscalationAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const RiskAlertSchema = new Schema<IRiskAlert>({
  patientId: { type: String, required: true, index: true },
  riskType: { type: String, enum: ['fall', 'wound', 'deterioration', 'safeguarding'], required: true },
  riskLevel: { type: String, enum: Object.values(RiskLevel), required: true },
  priority: { type: String, enum: Object.values(AlertPriority), required: true },
  status: { type: String, enum: Object.values(AlertStatus), default: AlertStatus.PENDING },
  title: { type: String, required: true },
  message: { type: String, required: true },
  recommendations: [{ type: String }],
  recipients: [{ type: String }],
  sentAt: { type: Date },
  acknowledgedBy: { type: String },
  acknowledgedAt: { type: Date },
  response: { type: String },
  respondedBy: { type: String },
  respondedAt: { type: Date },
  escalationCount: { type: Number, default: 0 },
  lastEscalationAt: { type: Date },
  expiresAt: { type: Date },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'risk_alerts'
});

// ============================================
// RISK CARE PLAN SCHEMA
// ============================================

export interface IRiskCarePlan extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: string;
  riskType: 'fall' | 'wound' | 'deterioration' | 'safeguarding';
  riskLevel: RiskLevel;
  goals: {
    shortTerm: string[];
    longTerm: string[];
  };
  interventions: {
    description: string;
    frequency: string;
    responsible: string;
    startDate: Date;
    endDate?: Date;
    completed: boolean;
  }[];
  monitoringPlan: {
    frequency: string;
    indicators: string[];
    nextReview: Date;
  };
  reviewHistory: {
    date: Date;
    reviewedBy: string;
    changes: string;
    outcome: string;
  }[];
  status: 'active' | 'completed' | 'suspended' | 'discharged';
  createdAt: Date;
  updatedAt: Date;
}

const RiskCarePlanSchema = new Schema<IRiskCarePlan>({
  patientId: { type: String, required: true, index: true },
  riskType: { type: String, enum: ['fall', 'wound', 'deterioration', 'safeguarding'], required: true },
  riskLevel: { type: String, enum: Object.values(RiskLevel), required: true },
  goals: {
    shortTerm: [{ type: String }],
    longTerm: [{ type: String }]
  },
  interventions: [{
    description: { type: String, required: true },
    frequency: { type: String, required: true },
    responsible: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    completed: { type: Boolean, default: false }
  }],
  monitoringPlan: {
    frequency: { type: String, required: true },
    indicators: [{ type: String }],
    nextReview: { type: Date, required: true }
  },
  reviewHistory: [{
    date: { type: Date },
    reviewedBy: { type: String },
    changes: { type: String },
    outcome: { type: String }
  }],
  status: { type: String, enum: ['active', 'completed', 'suspended', 'discharged'], default: 'active' }
}, {
  timestamps: true,
  collection: 'risk_care_plans'
});

// ============================================
// EXPORT MODELS
// ============================================

export const FallRiskAssessment: Model<IFallRiskAssessment> = mongoose.model<IFallRiskAssessment>(
  'FallRiskAssessment',
  FallRiskAssessmentSchema
);

export const WoundAssessment: Model<IWoundAssessment> = mongoose.model<IWoundAssessment>(
  'WoundAssessment',
  WoundAssessmentSchema
);

export const PressureUlcerRisk: Model<IPressureUlcerRisk> = mongoose.model<IPressureUlcerRisk>(
  'PressureUlcerRisk',
  PressureUlcerRiskSchema
);

export const DeteriorationSignal: Model<IDeteriorationSignal> = mongoose.model<IDeteriorationSignal>(
  'DeteriorationSignal',
  DeteriorationSignalSchema
);

export const SafeguardingRisk: Model<ISafeguardingRisk> = mongoose.model<ISafeguardingRisk>(
  'SafeguardingRisk',
  SafeguardingRiskSchema
);

export const RiskAlert: Model<IRiskAlert> = mongoose.model<IRiskAlert>(
  'RiskAlert',
  RiskAlertSchema
);

export const RiskCarePlan: Model<IRiskCarePlan> = mongoose.model<IRiskCarePlan>(
  'RiskCarePlan',
  RiskCarePlanSchema
);

// ============================================
// INDEXES
// ============================================

// Create compound indexes for common queries
FallRiskAssessmentSchema.index({ patientId: 1, assessmentDate: -1 });
WoundAssessmentSchema.index({ patientId: 1, woundId: 1, assessmentDate: -1 });
PressureUlcerRiskSchema.index({ patientId: 1, assessmentDate: -1 });
DeteriorationSignalSchema.index({ patientId: 1, type: 1, detectedAt: -1 });
SafeguardingRiskSchema.index({ patientId: 1, riskLevel: 1 });
RiskAlertSchema.index({ patientId: 1, riskType: 1, status: 1 });
RiskCarePlanSchema.index({ patientId: 1, riskType: 1, status: 1 });
