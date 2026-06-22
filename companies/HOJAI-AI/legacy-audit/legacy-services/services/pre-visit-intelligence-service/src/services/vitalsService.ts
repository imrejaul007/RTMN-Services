import {
  IVital,
  VitalType,
  VitalRecord,
  IVitalRecordDocument
} from '../models/preVisit';
import { logger } from '../utils/logger';

// ============================================================================
// VITAL REFERENCE RANGES
// ============================================================================

const VITAL_REFERENCE_RANGES: Record<VitalType, {
  normal: { min: number; max: number };
  elevated: { min: number; max: number };
  high: { min: number; max: number };
  critical: { min: number; max: number };
  unit: string;
  displayName: string;
}> = {
  [VitalType.BLOOD_PRESSURE]: {
    normal: { min: 90, max: 120 }, // Systolic
    elevated: { min: 120, max: 130 },
    high: { min: 130, max: 180 },
    critical: { min: 180, max: Infinity },
    unit: 'mmHg',
    displayName: 'Blood Pressure (Systolic)'
  },
  [VitalType.HEART_RATE]: {
    normal: { min: 60, max: 100 },
    elevated: { min: 100, max: 120 },
    high: { min: 120, max: 150 },
    critical: { min: 150, max: Infinity },
    unit: 'bpm',
    displayName: 'Heart Rate'
  },
  [VitalType.TEMPERATURE]: {
    normal: { min: 97.0, max: 99.0 },
    elevated: { min: 99.0, max: 100.4 },
    high: { min: 100.4, max: 103.0 },
    critical: { min: 103.0, max: Infinity },
    unit: '°F',
    displayName: 'Temperature'
  },
  [VitalType.RESPIRATORY_RATE]: {
    normal: { min: 12, max: 20 },
    elevated: { min: 20, max: 24 },
    high: { min: 24, max: 30 },
    critical: { min: 30, max: Infinity },
    unit: 'breaths/min',
    displayName: 'Respiratory Rate'
  },
  [VitalType.OXYGEN_SATURATION]: {
    normal: { min: 95, max: 100 },
    elevated: { min: 90, max: 95 },
    high: { min: 85, max: 90 },
    critical: { min: 0, max: 85 },
    unit: '%',
    displayName: 'Oxygen Saturation'
  },
  [VitalType.WEIGHT]: {
    normal: { min: 0, max: Infinity }, // Weight varies, tracked relative to baseline
    elevated: { min: 0, max: Infinity },
    high: { min: 0, max: Infinity },
    critical: { min: 0, max: Infinity },
    unit: 'lbs',
    displayName: 'Weight'
  },
  [VitalType.HEIGHT]: {
    normal: { min: 0, max: Infinity },
    elevated: { min: 0, max: Infinity },
    high: { min: 0, max: Infinity },
    critical: { min: 0, max: Infinity },
    unit: 'in',
    displayName: 'Height'
  },
  [VitalType.BMI]: {
    normal: { min: 18.5, max: 24.9 },
    elevated: { min: 25, max: 29.9 },
    high: { min: 30, max: 39.9 },
    critical: { min: 40, max: Infinity },
    unit: 'kg/m²',
    displayName: 'BMI'
  },
  [VitalType.BLOOD_GLUCOSE]: {
    normal: { min: 70, max: 100 }, // Fasting
    elevated: { min: 100, max: 126 },
    high: { min: 126, max: 200 },
    critical: { min: 200, max: Infinity },
    unit: 'mg/dL',
    displayName: 'Blood Glucose (Fasting)'
  },
  [VitalType.CHOLESTEROL]: {
    normal: { min: 0, max: 200 },
    elevated: { min: 200, max: 240 },
    high: { min: 240, max: Infinity },
    critical: { min: Infinity, max: Infinity }, // Very high is concerning
    unit: 'mg/dL',
    displayName: 'Total Cholesterol'
  }
};

// ============================================================================
// CONCERN THRESHOLDS
// ============================================================================

const CONCERN_THRESHOLDS = {
  bloodPressureChange: 20, // mmHg change from baseline
  heartRateChange: 20, // bpm change from baseline
  weightChangePercent: 5, // 5% change
  temperatureHigh: 100.4, // Fever threshold
  oxygenSaturationLow: 92, // Hypoxia threshold
  glucoseHigh: 200, // Hyperglycemia
  glucoseLow: 70 // Hypoglycemia
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class VitalsService {
  /**
   * Log vitals for a patient
   */
  async logVitals(
    patientId: string,
    vitals: IVital[]
  ): Promise<IVitalRecordDocument> {
    logger.info('Logging vitals', { patientId, vitalCount: vitals.length });

    try {
      // Get or create vital record
      let vitalRecord = await VitalRecord.findOne({ patientId });

      if (!vitalRecord) {
        vitalRecord = new VitalRecord({
          patientId,
          vitals: [],
          concerns: [],
          lastUpdated: new Date()
        });
      }

      // Add new vitals
      for (const vital of vitals) {
        vital.recordedAt = new Date(vital.recordedAt);
        vitalRecord.vitals.push(vital);
      }

      // Check for concerns
      const newConcerns = this.detectConcerns(vitalRecord.vitals, vitalRecord.baseline);
      for (const concern of newConcerns) {
        // Avoid duplicate concerns
        const existingConcern = vitalRecord.concerns.find(
          c => c.type === concern.type &&
               new Date(c.detectedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000 // Within 24 hours
        );
        if (!existingConcern) {
          vitalRecord.concerns.push(concern);
        }
      }

      // Keep only last 100 vitals per type to prevent unbounded growth
      const vitalTypeMap = new Map<VitalType, IVital[]>();
      for (const vital of vitalRecord.vitals) {
        const type = vital.type as VitalType;
        if (!vitalTypeMap.has(type)) {
          vitalTypeMap.set(type, []);
        }
        vitalTypeMap.get(type)!.push(vital);
      }

      const prunedVitals: IVital[] = [];
      for (const [, vitalsList] of vitalTypeMap) {
        // Keep last 100 of each type
        const sorted = vitalsList.sort(
          (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
        );
        prunedVitals.push(...sorted.slice(0, 100));
      }

      vitalRecord.vitals = prunedVitals;
      vitalRecord.lastUpdated = new Date();

      await vitalRecord.save();

      logger.info('Vitals logged successfully', {
        patientId,
        vitalCount: vitals.length,
        newConcerns: newConcerns.length
      });

      return vitalRecord;
    } catch (error) {
      logger.error('Error logging vitals', { error, patientId });
      throw error;
    }
  }

  /**
   * Get recent vitals for a patient
   */
  async getRecentVitals(
    patientId: string,
    days: number = 30,
    vitalTypes?: VitalType[]
  ): Promise<{
    vitals: IVital[];
    byType: Record<VitalType, IVital[]>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const vitalRecord = await VitalRecord.findOne({ patientId });

    if (!vitalRecord) {
      return { vitals: [], byType: {} as Record<VitalType, IVital[]> };
    }

    // Filter by date and optionally by type
    let vitals = vitalRecord.vitals.filter(v =>
      new Date(v.recordedAt) >= startDate
    );

    if (vitalTypes && vitalTypes.length > 0) {
      vitals = vitals.filter(v =>
        vitalTypes.includes(v.type as VitalType)
      );
    }

    // Sort by date
    vitals.sort((a, b) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );

    // Group by type
    const byType: Record<string, IVital[]> = {};
    for (const vital of vitals) {
      if (!byType[vital.type]) {
        byType[vital.type] = [];
      }
      byType[vital.type].push(vital);
    }

    return { vitals, byType: byType as Record<VitalType, IVital[]> };
  }

  /**
   * Compare current vitals to baseline
   */
  async compareToBaseline(
    patientId: string,
    currentVitals?: IVital[]
  ): Promise<{
    comparisons: {
      type: VitalType;
      current: IVital | null;
      baseline: IVital | null;
      change: number | null;
      changePercent: number | null;
      status: 'improved' | 'stable' | 'worsened' | 'unknown';
      concern: boolean;
      message: string;
    }[];
    overallStatus: 'improved' | 'stable' | 'worsened';
    summary: string;
  }> {
    logger.info('Comparing vitals to baseline', { patientId });

    try {
      const vitalRecord = await VitalRecord.findOne({ patientId });

      if (!vitalRecord) {
        return {
          comparisons: [],
          overallStatus: 'unknown',
          summary: 'No baseline data available.'
        };
      }

      // Get current vitals (most recent) if not provided
      const current = currentVitals || await this.getMostRecentVitals(vitalRecord.vitals);

      // Establish baseline if not set
      const baseline = vitalRecord.baseline || this.establishBaseline(vitalRecord.vitals);

      const comparisons: {
        type: VitalType;
        current: IVital | null;
        baseline: IVital | null;
        change: number | null;
        changePercent: number | null;
        status: 'improved' | 'stable' | 'worsened' | 'unknown';
        concern: boolean;
        message: string;
      }[] = [];

      for (const vitalType of Object.values(VitalType)) {
        const currentVital = current.find(v => v.type === vitalType);
        const baselineVital = baseline.find(b => b.type === vitalType);

        if (!currentVital && !baselineVital) continue;

        const comparison = this.compareVital(
          vitalType,
          currentVital,
          baselineVital
        );
        comparisons.push(comparison);
      }

      // Determine overall status
      const concerningChanges = comparisons.filter(c => c.concern);
      let overallStatus: 'improved' | 'stable' | 'worsened' = 'stable';

      if (concerningChanges.length > 0) {
        const worsened = concerningChanges.filter(c => c.status === 'worsened').length;
        const improved = concerningChanges.filter(c => c.status === 'improved').length;

        if (worsened > improved) {
          overallStatus = 'worsened';
        } else if (improved > worsened) {
          overallStatus = 'improved';
        }
      }

      // Generate summary
      const summary = this.generateComparisonSummary(comparisons, overallStatus);

      return { comparisons, overallStatus, summary };
    } catch (error) {
      logger.error('Error comparing vitals to baseline', { error, patientId });
      throw error;
    }
  }

  /**
   * Prepare vitals summary for doctor
   */
  async prepareVitalsSummary(patientId: string): Promise<{
    recent: IVital[];
    comparedToBaseline: {
      type: VitalType;
      current: string | number;
      baseline: string | number;
      change: number;
      concern: boolean;
    }[];
    summary: string;
    concerns: {
      type: VitalType;
      value: string | number;
      message: string;
      severity: 'warning' | 'urgent' | 'critical';
    }[];
  }> {
    logger.info('Preparing vitals summary', { patientId });

    try {
      const { vitals } = await this.getRecentVitals(patientId, 30);

      if (vitals.length === 0) {
        return {
          recent: [],
          comparedToBaseline: [],
          summary: 'No recent vitals recorded.',
          concerns: []
        };
      }

      // Get most recent of each type
      const recent = this.getMostRecentVitals(vitals);

      // Compare to baseline
      const comparison = await this.compareToBaseline(patientId, recent);

      // Get concerns
      const vitalRecord = await VitalRecord.findOne({ patientId });
      const concerns = (vitalRecord?.concerns || [])
        .filter(c => !c.acknowledged)
        .map(c => ({
          type: c.type as VitalType,
          value: c.value,
          message: c.message,
          severity: c.concernLevel === 'critical' ? 'critical' as const :
                    c.concernLevel === 'high' ? 'urgent' as const : 'warning' as const
        }));

      // Format comparison for output
      const comparedToBaseline = comparison.comparisons
        .filter(c => c.change !== null && c.baseline)
        .map(c => ({
          type: c.type,
          current: c.current?.value || '',
          baseline: c.baseline?.value || '',
          change: c.change || 0,
          concern: c.concern
        }));

      // Generate summary text
      const summary = comparison.summary;

      return {
        recent,
        comparedToBaseline,
        summary,
        concerns
      };
    } catch (error) {
      logger.error('Error preparing vitals summary', { error, patientId });
      throw error;
    }
  }

  /**
   * Detect vitals concerns
   */
  async detectVitalsConcerns(patientId: string): Promise<{
    hasConcerns: boolean;
    concerns: {
      type: VitalType;
      value: string | number;
      concernLevel: 'normal' | 'elevated' | 'high' | 'critical';
      message: string;
      detectedAt: Date;
    }[];
  }> {
    logger.info('Detecting vitals concerns', { patientId });

    try {
      const vitalRecord = await VitalRecord.findOne({ patientId });

      if (!vitalRecord) {
        return { hasConcerns: false, concerns: [] };
      }

      const recentVitals = this.getMostRecentVitals(vitalRecord.vitals);
      const concerns = this.detectConcerns(recentVitals, vitalRecord.baseline);

      // Filter out already acknowledged concerns
      const unacknowledgedConcerns = concerns.filter(c => {
        const existing = vitalRecord.concerns.find(
          ec => ec.type === c.type &&
               !ec.acknowledged &&
               new Date(ec.detectedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
        );
        return !existing;
      });

      logger.info('Vitals concerns detected', {
        patientId,
        concernCount: unacknowledgedConcerns.length
      });

      return {
        hasConcerns: unacknowledgedConcerns.length > 0,
        concerns: unacknowledgedConcerns
      };
    } catch (error) {
      logger.error('Error detecting vitals concerns', { error, patientId });
      throw error;
    }
  }

  /**
   * Acknowledge a concern
   */
  async acknowledgeConcern(patientId: string, vitalType: VitalType): Promise<void> {
    const vitalRecord = await VitalRecord.findOne({ patientId });

    if (!vitalRecord) {
      throw new Error('Vital record not found');
    }

    const concern = vitalRecord.concerns.find(
      c => c.type === vitalType && !c.acknowledged
    );

    if (concern) {
      concern.acknowledged = true;
      await vitalRecord.save();
      logger.info('Vitals concern acknowledged', { patientId, vitalType });
    }
  }

  /**
   * Set baseline for vitals
   */
  async setBaseline(
    patientId: string,
    baselineVitals: { type: VitalType; value: string | number; source: string }[]
  ): Promise<IVitalRecordDocument> {
    const vitalRecord = await VitalRecord.findOne({ patientId });

    if (!vitalRecord) {
      throw new Error('Vital record not found');
    }

    vitalRecord.baseline = baselineVitals.map(v => ({
      type: v.type,
      value: v.value,
      establishedAt: new Date(),
      source: v.source
    }));

    await vitalRecord.save();

    logger.info('Baseline vitals set', { patientId, vitalCount: baselineVitals.length });

    return vitalRecord;
  }

  /**
   * Get vital trends over time
   */
  async getVitalsTrends(
    patientId: string,
    vitalType: VitalType,
    days: number = 90
  ): Promise<{
    type: VitalType;
    data: { date: Date; value: number }[];
    average: number;
    min: number;
    max: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    referenceRange: {
      normal: { min: number; max: number };
      elevated: { min: number; max: number };
    };
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const vitalRecord = await VitalRecord.findOne({ patientId });

    if (!vitalRecord) {
      throw new Error('Vital record not found');
    }

    // Filter and parse vitals
    const typeVitals = vitalRecord.vitals
      .filter(v => v.type === vitalType && new Date(v.recordedAt) >= startDate)
      .map(v => ({
        date: new Date(v.recordedAt),
        value: typeof v.value === 'number' ? v.value : parseFloat(v.value as string)
      }))
      .filter(v => !isNaN(v.value))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (typeVitals.length === 0) {
      const reference = VITAL_REFERENCE_RANGES[vitalType];
      return {
        type: vitalType,
        data: [],
        average: 0,
        min: 0,
        max: 0,
        trend: 'stable',
        referenceRange: {
          normal: reference.normal,
          elevated: reference.elevated
        }
      };
    }

    // Calculate statistics
    const values = typeVitals.map(v => v.value);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate trend
    const trend = this.calculateTrend(values);

    const reference = VITAL_REFERENCE_RANGES[vitalType];

    return {
      type: vitalType,
      data: typeVitals,
      average,
      min,
      max,
      trend,
      referenceRange: {
        normal: reference.normal,
        elevated: reference.elevated
      }
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Detect concerns from vitals
   */
  private detectConcerns(
    vitals: IVital[],
    baseline?: { type: VitalType; value: string | number }[]
  ): IVitalRecordDocument['concerns'] {
    const concerns: IVitalRecordDocument['concerns'] = [];
    const referenceRanges = VITAL_REFERENCE_RANGES;

    for (const vital of vitals) {
      const type = vital.type as VitalType;
      const reference = referenceRanges[type];
      const value = typeof vital.value === 'number' ? vital.value : parseFloat(vital.value as string);

      if (isNaN(value) || !reference) continue;

      // Check against reference ranges
      let concernLevel: 'normal' | 'elevated' | 'high' | 'critical' = 'normal';
      let message = '';

      if (type === VitalType.OXYGEN_SATURATION) {
        // Lower is worse for oxygen
        if (value < reference.critical.min) {
          concernLevel = 'critical';
          message = `Critical: Oxygen saturation at ${value}% requires immediate attention`;
        } else if (value < reference.high.min) {
          concernLevel = 'high';
          message = `Warning: Low oxygen saturation at ${value}%`;
        } else if (value < reference.elevated.min) {
          concernLevel = 'elevated';
          message = `Notice: Oxygen saturation slightly low at ${value}%`;
        }
      } else {
        // Higher is worse for most vitals
        if (value >= reference.critical.min) {
          concernLevel = 'critical';
          message = `Critical: ${reference.displayName} at ${value} ${reference.unit} requires immediate attention`;
        } else if (value >= reference.high.min) {
          concernLevel = 'high';
          message = `Warning: ${reference.displayName} elevated at ${value} ${reference.unit}`;
        } else if (value >= reference.elevated.min) {
          concernLevel = 'elevated';
          message = `Notice: ${reference.displayName} slightly elevated at ${value} ${reference.unit}`;
        }
      }

      // Also check against baseline if available
      if (baseline && concernLevel === 'normal') {
        const baselineVital = baseline.find(b => b.type === type);
        if (baselineVital) {
          const baselineValue = typeof baselineVital.value === 'number'
            ? baselineVital.value
            : parseFloat(baselineVital.value as string);

          if (!isNaN(baselineValue)) {
            const changeThreshold = this.getChangeThreshold(type);
            const change = Math.abs(value - baselineValue);

            if (change > changeThreshold) {
              concernLevel = 'elevated';
              message = `${reference.displayName} has changed significantly from baseline (${baselineValue} → ${value})`;
            }
          }
        }
      }

      if (concernLevel !== 'normal') {
        concerns.push({
          type,
          value: vital.value,
          concernLevel,
          message,
          detectedAt: new Date(),
          acknowledged: false
        });
      }
    }

    return concerns;
  }

  /**
   * Get change threshold for a vital type
   */
  private getChangeThreshold(type: VitalType): number {
    const thresholds: Record<VitalType, number> = {
      [VitalType.BLOOD_PRESSURE]: 20,
      [VitalType.HEART_RATE]: 20,
      [VitalType.TEMPERATURE]: 2,
      [VitalType.RESPIRATORY_RATE]: 4,
      [VitalType.OXYGEN_SATURATION]: 5,
      [VitalType.WEIGHT]: 5, // percentage
      [VitalType.HEIGHT]: 1,
      [VitalType.BMI]: 2,
      [VitalType.BLOOD_GLUCOSE]: 30,
      [VitalType.CHOLESTEROL]: 30
    };
    return thresholds[type] || 10;
  }

  /**
   * Compare a single vital to baseline
   */
  private compareVital(
    type: VitalType,
    current: IVital | undefined,
    baseline: { type: VitalType; value: string | number } | undefined
  ): {
    type: VitalType;
    current: IVital | null;
    baseline: IVital | null;
    change: number | null;
    changePercent: number | null;
    status: 'improved' | 'stable' | 'worsened' | 'unknown';
    concern: boolean;
    message: string;
  } {
    const reference = VITAL_REFERENCE_RANGES[type];

    if (!current) {
      return {
        type,
        current: null,
        baseline: baseline ? { type: baseline.type, value: baseline.value, unit: reference?.unit || '', recordedAt: new Date() } : null,
        change: null,
        changePercent: null,
        status: 'unknown',
        concern: false,
        message: 'No current reading available'
      };
    }

    const currentValue = typeof current.value === 'number' ? current.value : parseFloat(current.value as string);

    if (!baseline) {
      return {
        type,
        current,
        baseline: null,
        change: null,
        changePercent: null,
        status: 'unknown',
        concern: false,
        message: 'No baseline established'
      };
    }

    const baselineValue = typeof baseline.value === 'number' ? baseline.value : parseFloat(baseline.value as string);

    if (isNaN(currentValue) || isNaN(baselineValue)) {
      return {
        type,
        current,
        baseline: { type: baseline.type, value: baseline.value, unit: reference?.unit || '', recordedAt: new Date() },
        change: null,
        changePercent: null,
        status: 'unknown',
        concern: false,
        message: 'Unable to compare values'
      };
    }

    const change = currentValue - baselineValue;
    const changePercent = baselineValue !== 0 ? (change / baselineValue) * 100 : 0;

    // Determine status and concern based on vital type
    let status: 'improved' | 'stable' | 'worsened' = 'stable';
    let concern = false;
    let message = '';

    const changeThreshold = this.getChangeThreshold(type);

    // For oxygen, lower is worse
    if (type === VitalType.OXYGEN_SATURATION) {
      if (change < -changeThreshold) {
        status = 'worsened';
        concern = true;
        message = `Oxygen saturation decreased by ${Math.abs(change)}% from baseline`;
      } else if (change > changeThreshold) {
        status = 'improved';
        message = `Oxygen saturation improved by ${change}% from baseline`;
      } else {
        message = `Oxygen saturation stable`;
      }
    } else {
      // For most vitals, higher is worse
      if (change > changeThreshold) {
        status = 'worsened';
        concern = true;
        message = `${reference?.displayName || type} increased by ${change.toFixed(1)} from baseline`;
      } else if (change < -changeThreshold) {
        status = 'improved';
        message = `${reference?.displayName || type} decreased by ${Math.abs(change).toFixed(1)} from baseline`;
      } else {
        message = `${reference?.displayName || type} stable`;
      }
    }

    return {
      type,
      current,
      baseline: { type: baseline.type, value: baseline.value, unit: reference?.unit || '', recordedAt: new Date() },
      change,
      changePercent,
      status,
      concern,
      message
    };
  }

  /**
   * Get most recent vital of each type
   */
  private getMostRecentVitals(vitals: IVital[]): IVital[] {
    const byType = new Map<string, IVital>();

    for (const vital of vitals) {
      const existing = byType.get(vital.type);
      if (!existing || new Date(vital.recordedAt) > new Date(existing.recordedAt)) {
        byType.set(vital.type, vital);
      }
    }

    return Array.from(byType.values());
  }

  /**
   * Establish baseline from historical vitals
   */
  private establishBaseline(vitals: IVital[]): { type: VitalType; value: string | number; establishedAt: Date; source: string }[] {
    const byType = new Map<VitalType, number[]>();

    for (const vital of vitals) {
      const type = vital.type as VitalType;
      const value = typeof vital.value === 'number' ? vital.value : parseFloat(vital.value as string);

      if (!isNaN(value)) {
        if (!byType.has(type)) {
          byType.set(type, []);
        }
        byType.get(type)!.push(value);
      }
    }

    const baseline: { type: VitalType; value: string | number; establishedAt: Date; source: string }[] = [];

    for (const [type, values] of byType) {
      // Use average of all readings as baseline
      const average = values.reduce((a, b) => a + b, 0) / values.length;

      baseline.push({
        type,
        value: Math.round(average * 10) / 10,
        establishedAt: new Date(),
        source: 'historical_average'
      });
    }

    return baseline;
  }

  /**
   * Calculate trend from values
   */
  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    // Use simple linear regression
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;

    // Determine trend based on slope relative to mean
    const threshold = Math.abs(yMean) * 0.02; // 2% of mean

    if (slope > threshold) return 'increasing';
    if (slope < -threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * Generate comparison summary
   */
  private generateComparisonSummary(
    comparisons: {
      type: VitalType;
      status: 'improved' | 'stable' | 'worsened' | 'unknown';
      concern: boolean;
      message: string;
    }[],
    overallStatus: 'improved' | 'stable' | 'worsened'
  ): string {
    const parts: string[] = [];

    // Overall status
    switch (overallStatus) {
      case 'improved':
        parts.push('Your vitals have improved overall');
        break;
      case 'worsened':
        parts.push('Some of your vitals have changed from baseline');
        break;
      default:
        parts.push('Your vitals are generally stable');
    }

    // Specific changes
    const concerning = comparisons.filter(c => c.concern);
    if (concerning.length > 0) {
      const messages = concerning.map(c => c.message);
      parts.push('Notable changes: ' + messages.join('; '));
    }

    return parts.join('. ') + '.';
  }

  /**
   * Get full vital record
   */
  async getVitalRecord(patientId: string): Promise<IVitalRecordDocument | null> {
    return VitalRecord.findOne({ patientId });
  }

  /**
   * Clear old vitals (maintenance)
   */
  async clearOldVitals(patientId: string, olderThanDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const vitalRecord = await VitalRecord.findOne({ patientId });

    if (!vitalRecord) return 0;

    const originalCount = vitalRecord.vitals.length;

    vitalRecord.vitals = vitalRecord.vitals.filter(v =>
      new Date(v.recordedAt) >= cutoffDate
    );

    await vitalRecord.save();

    const removedCount = originalCount - vitalRecord.vitals.length;

    logger.info('Old vitals cleared', { patientId, removedCount });

    return removedCount;
  }
}

// Export singleton instance
export const vitalsService = new VitalsService();
