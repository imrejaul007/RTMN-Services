import {
  DeteriorationSignal,
  IDeteriorationSignal,
  IVitalSigns,
  IDeteriorationIndicator,
  RiskLevel,
  DeteriorationType
} from '../models/risk';
import { logger } from '../utils/logger';
import { alertService } from './alertService';

interface NEWSParameters {
  respiratoryRate?: number;
  oxygenSaturation?: number;
  supplementalOxygen?: boolean;
  temperature?: number;
  systolicBP?: number;
  heartRate?: number;
  consciousness?: 'alert' | 'voice' | 'pain' | 'unresponsive';
}

interface NEWSResult {
  score: number;
  riskLevel: RiskLevel;
  components: {
    parameter: string;
    value: number | string;
    score: number;
  }[];
  recommendation: string;
}

interface DeteriorationDetectionResult {
  patientId: string;
  detected: boolean;
  type?: DeteriorationType;
  score: number;
  riskLevel: RiskLevel;
  indicators: IDeteriorationIndicator[];
  vitals: IVitalSigns;
  recommendations: string[];
}

export class DeteriorationService {
  private readonly CRITICAL_THRESHOLDS = {
    heartRate: { min: 40, max: 130, criticalMin: 30, criticalMax: 150 },
    respiratoryRate: { min: 8, max: 24, criticalMin: 5, criticalMax: 35 },
    systolicBP: { min: 90, max: 220, criticalMin: 70, criticalMax: 250 },
    diastolicBP: { min: 60, max: 120 },
    temperature: { min: 35.0, max: 38.0, criticalMin: 32, criticalMax: 40 },
    oxygenSaturation: { min: 94, criticalMin: 90 },
    bloodGlucose: { min: 4.0, max: 10.0, criticalMin: 2.5, criticalMax: 16.5 }
  };

  /**
   * Monitor vitals for a patient and detect deterioration
   */
  async monitorVitals(patientId: string, vitals: IVitalSigns): Promise<DeteriorationDetectionResult> {
    logger.info(`Monitoring vitals for patient ${patientId}`);

    // Calculate NEWS score
    const newsResult = this.calculateNEWS({
      respiratoryRate: vitals.respiratoryRate,
      oxygenSaturation: vitals.oxygenSaturation,
      temperature: vitals.temperature,
      systolicBP: vitals.systolicBP,
      heartRate: vitals.heartRate,
      consciousness: vitals.consciousness
    });

    // Detect deterioration signals
    const indicators = this.generateIndicators(vitals);
    const hasDeterioration = indicators.some(i => i.severity !== 'normal');

    // Determine deterioration type
    let type: DeteriorationType | undefined;
    if (hasDeterioration) {
      type = this.classifyDeteriorationType(indicators, vitals);
    }

    // Generate recommendations
    const recommendations = this.generateDeteriorationRecommendations(newsResult, indicators, type);

    // Create signal if deterioration detected
    if (hasDeterioration) {
      await this.createDeteriorationSignal(patientId, type!, newsResult.score, indicators, vitals, newsResult.riskLevel);

      // Send alert if high risk
      if (newsResult.riskLevel === RiskLevel.HIGH || newsResult.riskLevel === RiskLevel.VERY_HIGH) {
        await alertService.sendRiskAlert(patientId, 'deterioration', newsResult.riskLevel, {
          type,
          score: newsResult.score,
          indicators: indicators.map(i => ({
            parameter: i.type,
            severity: i.severity,
            value: i.value
          })),
          recommendations
        });
      }
    }

    return {
      patientId,
      detected: hasDeterioration,
      type,
      score: newsResult.score,
      riskLevel: newsResult.riskLevel,
      indicators,
      vitals,
      recommendations
    };
  }

  /**
   * Calculate NEWS (National Early Warning Score) - Modified for clinical use
   * Score range: 0-20, higher = more critical
   */
  calculateNEWS(params: NEWSParameters): NEWSResult {
    const components: NEWSResult['components'] = [];
    let totalScore = 0;

    // Respiratory Rate
    if (params.respiratoryRate !== undefined) {
      let rrScore = 0;
      let value = params.respiratoryRate;

      if (value <= 8) rrScore = 3;
      else if (value <= 11) rrScore = 1;
      else if (value <= 20) rrScore = 0;
      else if (value <= 24) rrScore = 2;
      else if (value >= 25) rrScore = 3;

      components.push({ parameter: 'respiratoryRate', value, score: rrScore });
      totalScore += rrScore;
    }

    // Oxygen Saturation
    if (params.oxygenSaturation !== undefined) {
      let spo2Score = 0;
      const spo2 = params.oxygenSaturation;

      if (spo2 <= 91) spo2Score = 3;
      else if (spo2 <= 93) spo2Score = 2;
      else if (spo2 <= 95) spo2Score = 1;
      else spo2Score = 0;

      // Bonus point for supplemental oxygen
      if (params.supplementalOxygen && spo2Score >= 2) {
        spo2Score += 1;
      }

      components.push({ parameter: 'oxygenSaturation', value: spo2, score: spo2Score });
      totalScore += spo2Score;
    }

    // Temperature
    if (params.temperature !== undefined) {
      let tempScore = 0;
      const temp = params.temperature;

      if (temp <= 32.0) tempScore = 3;
      else if (temp <= 34.9) tempScore = 1;
      else if (temp <= 36.0) tempScore = 1;
      else if (temp <= 38.0) tempScore = 0;
      else if (temp <= 39.9) tempScore = 1;
      else tempScore = 2;

      components.push({ parameter: 'temperature', value: temp, score: tempScore });
      totalScore += tempScore;
    }

    // Systolic BP
    if (params.systolicBP !== undefined) {
      let bpScore = 0;
      const sbp = params.systolicBP;

      if (sbp <= 70) bpScore = 3;
      else if (sbp <= 80) bpScore = 2;
      else if (sbp <= 90) bpScore = 1;
      else if (sbp <= 110) bpScore = 0;
      else if (sbp <= 219) bpScore = 0;
      else bpScore = 3;

      components.push({ parameter: 'systolicBP', value: sbp, score: bpScore });
      totalScore += bpScore;
    }

    // Heart Rate
    if (params.heartRate !== undefined) {
      let hrScore = 0;
      const hr = params.heartRate;

      if (hr <= 40) hrScore = 3;
      else if (hr <= 50) hrScore = 1;
      else if (hr <= 90) hrScore = 0;
      else if (hr <= 110) hrScore = 1;
      else if (hr <= 130) hrScore = 2;
      else hrScore = 3;

      components.push({ parameter: 'heartRate', value: hr, score: hrScore });
      totalScore += hrScore;
    }

    // Consciousness (AVPU scale - mapped to NEWS2)
    if (params.consciousness !== undefined) {
      let consScore = 0;

      switch (params.consciousness) {
        case 'unresponsive':
          consScore = 3;
          break;
        case 'pain':
          consScore = 3;
          break;
        case 'voice':
          consScore = 1;
          break;
        case 'alert':
          consScore = 0;
          break;
      }

      components.push({ parameter: 'consciousness', value: params.consciousness, score: consScore });
      totalScore += consScore;
    }

    // Determine risk level
    const riskLevel = this.determineNEWSRiskLevel(totalScore);
    const recommendation = this.getNEWSRecommendation(totalScore, riskLevel);

    return {
      score: totalScore,
      riskLevel,
      components,
      recommendation
    };
  }

  /**
   * Determine NEWS risk level
   */
  private determineNEWSRiskLevel(score: number): RiskLevel {
    if (score <= 2) return RiskLevel.LOW;
    if (score <= 4) return RiskLevel.MODERATE;
    if (score <= 6) return RiskLevel.HIGH;
    return RiskLevel.VERY_HIGH;
  }

  /**
   * Get recommendation based on NEWS score
   */
  private getNEWSRecommendation(score: number, riskLevel: RiskLevel): string {
    if (riskLevel === RiskLevel.LOW) {
      return 'Continue routine monitoring';
    }
    if (riskLevel === RiskLevel.MODERATE) {
      return 'Inform registered nurse, consider increasing monitoring frequency';
    }
    if (riskLevel === RiskLevel.HIGH) {
      return 'Urgent clinical review by senior nurse or medical team within 30 minutes';
    }
    return 'Emergency resuscitation team / emergency clinical review immediately';
  }

  /**
   * Detect deterioration for a patient
   */
  async detectDeterioration(patientId: string): Promise<IDeteriorationSignal | null> {
    // Get latest deterioration signals for the patient
    const latestSignal = await DeteriorationSignal.findOne({ patientId })
      .sort({ detectedAt: -1 })
      .lean();

    return latestSignal;
  }

  /**
   * Get deterioration history for a patient
   */
  async getDeteriorationHistory(
    patientId: string,
    type?: DeteriorationType,
    limit = 20
  ): Promise<IDeteriorationSignal[]> {
    const query: Record<string, unknown> = { patientId };
    if (type) {
      query.type = type;
    }

    return DeteriorationSignal.find(query)
      .sort({ detectedAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get unresolved deterioration signals
   */
  async getUnresolvedSignals(patientId?: string): Promise<IDeteriorationSignal[]> {
    const query: Record<string, unknown> = { resolvedAt: null };
    if (patientId) {
      query.patientId = patientId;
    }

    return DeteriorationSignal.find(query)
      .sort({ detectedAt: -1 })
      .lean();
  }

  /**
   * Acknowledge a deterioration signal
   */
  async acknowledgeSignal(signalId: string, acknowledgedBy: string): Promise<void> {
    await DeteriorationSignal.findByIdAndUpdate(signalId, {
      acknowledgedBy,
      acknowledgedAt: new Date()
    });

    logger.info(`Deterioration signal ${signalId} acknowledged by ${acknowledgedBy}`);
  }

  /**
   * Resolve a deterioration signal
   */
  async resolveSignal(signalId: string, respondedBy: string, notes?: string): Promise<void> {
    await DeteriorationSignal.findByIdAndUpdate(signalId, {
      resolvedAt: new Date(),
      respondedBy,
      respondedAt: new Date(),
      notes
    });

    logger.info(`Deterioration signal ${signalId} resolved by ${respondedBy}`);
  }

  /**
   * Alert care team for deterioration
   */
  async alertCareTeam(patientId: string, alert: {
    type: DeteriorationType;
    score: number;
    riskLevel: RiskLevel;
    vitals: IVitalSigns;
  }): Promise<void> {
    const recommendations = this.generateDeteriorationRecommendations(
      { score: alert.score, riskLevel: alert.riskLevel, components: [], recommendation: '' },
      [],
      alert.type
    );

    await alertService.sendRiskAlert(patientId, 'deterioration', alert.riskLevel, {
      type: alert.type,
      score: alert.score,
      vitals: alert.vitals,
      recommendations
    });

    logger.warn(`Deterioration alert sent for patient ${patientId}. Type: ${alert.type}, Score: ${alert.score}`);
  }

  /**
   * Generate deterioration indicators from vitals
   */
  private generateIndicators(vitals: IVitalSigns): IDeteriorationIndicator[] {
    const indicators: IDeteriorationIndicator[] = [];

    // Heart Rate
    if (vitals.heartRate !== undefined) {
      const hr = vitals.heartRate;
      const thresholds = this.CRITICAL_THRESHOLDS.heartRate;

      let severity: IDeteriorationIndicator['severity'] = 'normal';
      let deviation = 0;

      if (hr < thresholds.criticalMin || hr > thresholds.criticalMax) {
        severity = 'critical';
        deviation = hr < thresholds.criticalMin
          ? thresholds.criticalMin - hr
          : hr - thresholds.criticalMax;
      } else if (hr < thresholds.min || hr > thresholds.max) {
        severity = 'moderate';
        deviation = hr < thresholds.min
          ? thresholds.min - hr
          : hr - thresholds.max;
      } else if (hr < thresholds.min + 10 || hr > thresholds.max - 10) {
        severity = 'mild';
        deviation = hr < thresholds.min + 10
          ? (thresholds.min + 10) - hr
          : hr - (thresholds.max - 10);
      }

      indicators.push({
        type: 'heartRate',
        value: hr,
        threshold: thresholds.max,
        deviation,
        severity
      });
    }

    // Respiratory Rate
    if (vitals.respiratoryRate !== undefined) {
      const rr = vitals.respiratoryRate;
      const thresholds = this.CRITICAL_THRESHOLDS.respiratoryRate;

      let severity: IDeteriorationIndicator['severity'] = 'normal';
      let deviation = 0;

      if (rr < thresholds.criticalMin || rr > thresholds.criticalMax) {
        severity = 'critical';
        deviation = rr < thresholds.criticalMin
          ? thresholds.criticalMin - rr
          : rr - thresholds.criticalMax;
      } else if (rr < thresholds.min || rr > thresholds.max) {
        severity = 'moderate';
        deviation = rr < thresholds.min
          ? thresholds.min - rr
          : rr - thresholds.max;
      }

      indicators.push({
        type: 'respiratoryRate',
        value: rr,
        threshold: thresholds.max,
        deviation,
        severity
      });
    }

    // Blood Pressure
    if (vitals.systolicBP !== undefined) {
      const sbp = vitals.systolicBP;
      const thresholds = this.CRITICAL_THRESHOLDS.systolicBP;

      let severity: IDeteriorationIndicator['severity'] = 'normal';
      let deviation = 0;

      if (sbp < thresholds.criticalMin || sbp > thresholds.criticalMax) {
        severity = 'critical';
        deviation = sbp < thresholds.criticalMin
          ? thresholds.criticalMin - sbp
          : sbp - thresholds.criticalMax;
      } else if (sbp < thresholds.min || sbp > thresholds.max) {
        severity = 'moderate';
        deviation = sbp < thresholds.min
          ? thresholds.min - sbp
          : sbp - thresholds.max;
      }

      indicators.push({
        type: 'systolicBP',
        value: sbp,
        threshold: thresholds.max,
        deviation,
        severity
      });
    }

    // Temperature
    if (vitals.temperature !== undefined) {
      const temp = vitals.temperature;
      const thresholds = this.CRITICAL_THRESHOLDS.temperature;

      let severity: IDeteriorationIndicator['severity'] = 'normal';
      let deviation = 0;

      if (temp < thresholds.criticalMin || temp > thresholds.criticalMax) {
        severity = 'critical';
        deviation = temp < thresholds.criticalMin
          ? thresholds.criticalMin - temp
          : temp - thresholds.criticalMax;
      } else if (temp < thresholds.min || temp > thresholds.max) {
        severity = 'moderate';
        deviation = temp < thresholds.min
          ? thresholds.min - temp
          : temp - thresholds.max;
      }

      indicators.push({
        type: 'temperature',
        value: temp,
        threshold: thresholds.max,
        deviation,
        severity
      });
    }

    // Oxygen Saturation
    if (vitals.oxygenSaturation !== undefined) {
      const spo2 = vitals.oxygenSaturation;
      const thresholds = this.CRITICAL_THRESHOLDS.oxygenSaturation;

      let severity: IDeteriorationIndicator['severity'] = 'normal';
      let deviation = 0;

      if (spo2 < thresholds.criticalMin) {
        severity = 'critical';
        deviation = thresholds.criticalMin - spo2;
      } else if (spo2 < thresholds.min) {
        severity = 'moderate';
        deviation = thresholds.min - spo2;
      } else if (spo2 < thresholds.min + 2) {
        severity = 'mild';
        deviation = (thresholds.min + 2) - spo2;
      }

      indicators.push({
        type: 'oxygenSaturation',
        value: spo2,
        threshold: thresholds.min,
        deviation,
        severity
      });
    }

    return indicators;
  }

  /**
   * Classify the type of deterioration
   */
  private classifyDeteriorationType(
    indicators: IDeteriorationIndicator[],
    vitals: IVitalSigns
  ): DeteriorationType {
    // Check for sepsis indicators
    const tempAbnormal = indicators.find(i => i.type === 'temperature' && i.severity !== 'normal');
    const rrAbnormal = indicators.find(i => i.type === 'respiratoryRate' && i.severity !== 'normal');
    const hrAbnormal = indicators.find(i => i.type === 'heartRate' && i.severity !== 'normal');

    if (tempAbnormal && (rrAbnormal || hrAbnormal)) {
      return DeteriorationType.SEPSIS;
    }

    // Check for respiratory deterioration
    const spo2Abnormal = indicators.find(i => i.type === 'oxygenSaturation' && i.severity !== 'normal');
    if (spo2Abnormal || (rrAbnormal && rrAbnormal.severity === 'critical')) {
      return DeteriorationType.RESPIRATORY;
    }

    // Check for cardiovascular
    const bpAbnormal = indicators.find(i => i.type === 'systolicBP' && i.severity !== 'normal');
    if (bpAbnormal && bpAbnormal.severity === 'critical') {
      return DeteriorationType.CARDIOVASCULAR;
    }

    // Check for neurological (via consciousness if available)
    if (vitals.consciousness === 'pain' || vitals.consciousness === 'unresponsive') {
      return DeteriorationType.NEUROLOGICAL;
    }

    // Check for metabolic
    if (vitals.bloodGlucose !== undefined) {
      const glucose = vitals.bloodGlucose;
      const thresholds = this.CRITICAL_THRESHOLDS.bloodGlucose;
      if (glucose < thresholds.criticalMin || glucose > thresholds.criticalMax) {
        return DeteriorationType.METABOLIC;
      }
    }

    // Default to cardiovascular if heart rate is abnormal
    if (hrAbnormal && hrAbnormal.severity !== 'normal') {
      return DeteriorationType.CARDIOVASCULAR;
    }

    return DeteriorationType.RESPIRATORY;
  }

  /**
   * Generate recommendations based on deterioration
   */
  private generateDeteriorationRecommendations(
    newsResult: { score: number; riskLevel: RiskLevel },
    indicators: IDeteriorationIndicator[],
    type?: DeteriorationType
  ): string[] {
    const recommendations: string[] = [];

    // NEWS-based recommendations
    if (newsResult.riskLevel === RiskLevel.VERY_HIGH) {
      recommendations.push('URGENT: Immediate clinical review required');
      recommendations.push('Consider ICU/HDU escalation');
      recommendations.push('Establish ICU goals of care if appropriate');
    } else if (newsResult.riskLevel === RiskLevel.HIGH) {
      recommendations.push('Urgent clinical review within 30 minutes');
      recommendations.push('Increase monitoring frequency to every 15 minutes');
      recommendations.push('Prepare for potential escalation');
    } else if (newsResult.riskLevel === RiskLevel.MODERATE) {
      recommendations.push('Inform senior nurse, increase monitoring frequency');
      recommendations.push('Consider medical review within 1 hour');
    }

    // Type-specific recommendations
    if (type) {
      switch (type) {
        case DeteriorationType.SEPSIS:
          recommendations.push('Check lactate and complete blood count');
          recommendations.push('Consider blood cultures before antibiotics');
          recommendations.push('Initiate sepsis protocol if suspected');
          break;

        case DeteriorationType.RESPIRATORY:
          recommendations.push('Assess airway patency');
          recommendations.push('Consider supplemental oxygen therapy');
          recommendations.push('Check for signs of respiratory distress');
          break;

        case DeteriorationType.CARDIOVASCULAR:
          recommendations.push('Obtain 12-lead ECG');
          recommendations.push('Assess for chest pain or palpitations');
          recommendations.push('Consider cardiac enzymes');
          break;

        case DeteriorationType.NEUROLOGICAL:
          recommendations.push('Perform full neurological assessment');
          recommendations.push('Check pupils and Glasgow Coma Scale');
          recommendations.push('Consider CT head if acute change');
          break;

        case DeteriorationType.METABOLIC:
          recommendations.push('Check blood glucose and electrolytes');
          recommendations.push('Review diabetic medications');
          break;
      }
    }

    // Indicator-specific recommendations
    indicators.forEach(indicator => {
      if (indicator.severity === 'critical') {
        switch (indicator.type) {
          case 'heartRate':
            if (indicator.value < 40) {
              recommendations.push('CRITICAL: Severe bradycardia - assess for pacemaker');
            } else {
              recommendations.push('CRITICAL: Severe tachycardia - evaluate for arrhythmia');
            }
            break;
          case 'oxygenSaturation':
            recommendations.push('CRITICAL: Severe hypoxemia - administer oxygen immediately');
            break;
          case 'systolicBP':
            recommendations.push('CRITICAL: Hemodynamic instability - assess perfusion');
            break;
        }
      }
    });

    return [...new Set(recommendations)];
  }

  /**
   * Create a deterioration signal record
   */
  private async createDeteriorationSignal(
    patientId: string,
    type: DeteriorationType,
    score: number,
    indicators: IDeteriorationIndicator[],
    vitals: IVitalSigns,
    riskLevel: RiskLevel
  ): Promise<IDeteriorationSignal> {
    const signal = new DeteriorationSignal({
      patientId,
      type,
      score,
      indicators,
      vitals,
      riskLevel,
      alertSent: false,
      responseRequired: true,
      detectedAt: new Date()
    });

    await signal.save();
    return signal;
  }

  /**
   * Get deterioration trends for a patient
   */
  async getDeteriorationTrend(patientId: string, days = 7): Promise<{
    date: Date;
    score: number;
    type: DeteriorationType;
  }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const signals = await DeteriorationSignal.find({
      patientId,
      detectedAt: { $gte: startDate }
    })
      .select('detectedAt score type')
      .sort({ detectedAt: 1 })
      .lean();

    return signals.map(s => ({
      date: s.detectedAt,
      score: s.score,
      type: s.type
    }));
  }

  /**
   * Get patients with active deterioration alerts
   */
  async getActiveDeteriorationAlerts(): Promise<IDeteriorationSignal[]> {
    return DeteriorationSignal.find({
      alertSent: true,
      resolvedAt: null,
      responseRequired: true
    })
      .sort({ detectedAt: -1 })
      .limit(50)
      .lean();
  }

  /**
   * Mark signal as alerted
   */
  async markSignalAlerted(signalId: string, recipient: string): Promise<void> {
    await DeteriorationSignal.findByIdAndUpdate(signalId, {
      alertSent: true,
      alertSentAt: new Date(),
      alertRecipient: recipient
    });
  }

  /**
   * Escalate alert if not acknowledged
   */
  async escalateAlert(signalId: string): Promise<void> {
    const signal = await DeteriorationSignal.findById(signalId);
    if (!signal) return;

    await DeteriorationSignal.findByIdAndUpdate(signalId, {
      escalationLevel: (signal.escalationLevel || 0) + 1
    });

    logger.warn(`Deterioration signal ${signalId} escalated to level ${signal.escalationLevel! + 1}`);
  }
}

export const deteriorationService = new DeteriorationService();
