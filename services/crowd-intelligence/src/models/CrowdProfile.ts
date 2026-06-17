export interface CrowdProfile {
  id: string;
  locationId: string;
  zoneId: string;
  density: number; // 0.0 - 1.0
  timestamp: Date;
  attributes: CrowdAttributes;
  activityLevel: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: Date;
}

export interface CrowdAttributes {
  ageDistribution?: {
    children: number;
    adults: number;
    seniors: number;
  };
  genderDistribution?: {
    male: number;
    female: number;
    other: number;
  };
 停留时间?: number; // Dwell time in seconds
  movementSpeed?: number; // 0.0 - 1.0 (stationary to fast)
  densityHistory?: number[];
  alertLevel?: 'normal' | 'elevated' | 'high' | 'critical';
}

export interface CrowdPattern {
  id: string;
  type: PatternType;
  locationId: string;
  startTime: Date;
  endTime?: Date;
  confidence: number; // 0.0 - 1.0
  metrics: PatternMetrics;
  detectedAt: Date;
}

export type PatternType =
  | 'rush_hour'
  | 'quiet_period'
  | 'gradual_increase'
  | 'sudden_spike'
  | 'gradual_decrease'
  | 'periodic'
  | 'weekend_surge'
  | 'event_burst';

export interface PatternMetrics {
  averageDensity: number;
  peakDensity: number;
  duration: number; // minutes
  frequency?: number; // occurrences per hour
  growthRate?: number; // density change per minute
}

export interface TrendData {
  timestamp: Date;
  direction: 'up' | 'down' | 'stable';
  velocity: number; // rate of change
  confidence: number;
  predicted?: {
    value: number;
    timestamp: Date;
  };
}

export interface AnomalyAlert {
  id: string;
  type: 'density' | 'movement' | 'pattern' | 'outbreak';
  severity: 'low' | 'medium' | 'high' | 'critical';
  locationId: string;
  zoneId?: string;
  message: string;
  details: {
    observed: number;
    expected: number;
    deviation: number;
  };
  timestamp: Date;
  acknowledged: boolean;
}

export interface OutbreakEvent {
  id: string;
  type: 'sudden_surge' | 'persistent_increase' | 'concentration' | 'dispersal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  locationId: string;
  affectedZones: string[];
  metrics: {
    currentDensity: number;
    baselineDensity: number;
    increaseRate: number; // percent per minute
    duration: number; // minutes
  };
  message: string;
  timestamp: Date;
  resolvedAt?: Date;
}

export interface CrowdInsight {
  id: string;
  category: 'safety' | 'efficiency' | 'experience' | 'operational';
  title: string;
  description: string;
  metrics: Record<string, number>;
  recommendations: string[];
  confidence: number;
  timestamp: Date;
}