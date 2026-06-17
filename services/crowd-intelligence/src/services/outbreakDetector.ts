import { v4 as uuidv4 } from 'uuid';
import { CrowdProfile, OutbreakEvent } from '../models/CrowdProfile';

export interface OutbreakDetectionResult {
  isOutbreak: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  type: OutbreakEvent['type'];
  affectedZones: string[];
  increaseRate: number;
}

export interface OutbreakThreshold {
  density: number;
  rate: number; // percent per minute
  duration: number; // minutes
  zoneConcentration: number; // 0-1
}

export class OutbreakDetector {
  private outbreakThreshold: number;
  private windowMs: number;
  private cooldownMs: number;
  private logger: any;
  private recentOutbreaks: OutbreakEvent[] = [];
  private baselineProfiles: Map<string, number[]> = new Map();

  constructor(logger: any) {
    this.outbreakThreshold = parseFloat(process.env.OUTBREAK_THRESHOLD || '3.0');
    this.windowMs = parseInt(process.env.OUTBREAK_WINDOW_MS || '300000'); // 5 minutes
    this.cooldownMs = parseInt(process.env.ALERT_COOLDOWN_MS || '600000'); // 10 minutes
    this.logger = logger;
  }

  /**
   * Check if current crowd profile indicates an outbreak
   */
  checkOutbreak(
    profile: CrowdProfile,
    allProfiles: CrowdProfile[]
  ): OutbreakDetectionResult {
    // Check cooldown period
    if (this.isInCooldown()) {
      return {
        isOutbreak: false,
        severity: 'low',
        message: 'Recent outbreak alert, in cooldown period',
        type: 'sudden_surge',
        affectedZones: [],
        increaseRate: 0
      };
    }

    // Get historical baseline for this location
    const baseline = this.getBaseline(profile.locationId, allProfiles);
    if (baseline.length < 5) {
      return {
        isOutbreak: false,
        severity: 'low',
        message: 'Insufficient baseline data for outbreak detection',
        type: 'sudden_surge',
        affectedZones: [],
        increaseRate: 0
      };
    }

    // Calculate baseline statistics
    const baselineMean = this.calculateMean(baseline);
    const baselineStdDev = this.calculateStdDev(baseline, baselineMean);

    // Check for sudden surge
    const surgeResult = this.detectSuddenSurge(profile, baselineMean, baselineStdDev);
    if (surgeResult.detected) {
      return this.createOutbreakResult(
        'sudden_surge',
        surgeResult.severity,
        surgeResult.message,
        [profile.zoneId],
        surgeResult.rate
      );
    }

    // Check for persistent increase
    const recentProfiles = allProfiles
      .filter(p => p.locationId === profile.locationId)
      .filter(p => Date.now() - p.timestamp.getTime() < this.windowMs);

    const persistentResult = this.detectPersistentIncrease(recentProfiles, baselineMean);
    if (persistentResult.detected) {
      return this.createOutbreakResult(
        'persistent_increase',
        persistentResult.severity,
        persistentResult.message,
        persistentResult.affectedZones,
        persistentResult.rate
      );
    }

    // Check for zone concentration
    const concentrationResult = this.detectConcentration(allProfiles, profile.locationId);
    if (concentrationResult.detected) {
      return this.createOutbreakResult(
        'concentration',
        concentrationResult.severity,
        concentrationResult.message,
        concentrationResult.affectedZones,
        concentrationResult.rate
      );
    }

    // Check for rapid dispersal (also a type of outbreak)
    const dispersalResult = this.detectDispersal(recentProfiles, baselineMean);
    if (dispersalResult.detected) {
      return this.createOutbreakResult(
        'dispersal',
        dispersalResult.severity,
        dispersalResult.message,
        [],
        dispersalResult.rate
      );
    }

    // Update baseline with current profile
    this.updateBaseline(profile.locationId, profile.density);

    return {
      isOutbreak: false,
      severity: 'low',
      message: 'No outbreak patterns detected',
      type: 'sudden_surge',
      affectedZones: [],
      increaseRate: 0
    };
  }

  /**
   * Get all active outbreaks
   */
  getActiveOutbreaks(): OutbreakEvent[] {
    return this.recentOutbreaks.filter(o => !o.resolvedAt);
  }

  /**
   * Resolve an outbreak
   */
  resolveOutbreak(outbreakId: string): boolean {
    const outbreak = this.recentOutbreaks.find(o => o.id === outbreakId);
    if (outbreak) {
      outbreak.resolvedAt = new Date();
      this.logger?.info(`Outbreak resolved: ${outbreakId}`);
      return true;
    }
    return false;
  }

  /**
   * Get outbreak statistics
   */
  getStatistics(hours: number = 24): {
    total: number;
    active: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    averageDuration: number;
    mostAffectedZones: string[];
  } {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const relevantOutbreaks = this.recentOutbreaks.filter(
      o => o.timestamp.getTime() > cutoff
    );

    const active = relevantOutbreaks.filter(o => !o.resolvedAt);
    const resolved = relevantOutbreaks.filter(o => o.resolvedAt);

    const durations = resolved
      .filter(o => o.resolvedAt)
      .map(o => (o.resolvedAt!.getTime() - o.timestamp.getTime()) / 60000);

    const zoneCounts = new Map<string, number>();
    for (const outbreak of relevantOutbreaks) {
      for (const zone of outbreak.affectedZones) {
        zoneCounts.set(zone, (zoneCounts.get(zone) || 0) + 1);
      }
    }

    return {
      total: relevantOutbreaks.length,
      active: active.length,
      byType: this.countByField(relevantOutbreaks, 'type'),
      bySeverity: this.countByField(relevantOutbreaks, 'severity'),
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      mostAffectedZones: Array.from(zoneCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([zone]) => zone)
    };
  }

  // Private helper methods

  private isInCooldown(): boolean {
    if (this.recentOutbreaks.length === 0) return false;

    const lastOutbreak = this.recentOutbreaks[this.recentOutbreaks.length - 1];
    return Date.now() - lastOutbreak.timestamp.getTime() < this.cooldownMs;
  }

  private getBaseline(locationId: string, allProfiles: CrowdProfile[]): number[] {
    // Get profiles from the past hour as baseline
    const hourAgo = Date.now() - 60 * 60 * 1000;
    return allProfiles
      .filter(p => p.locationId === locationId && p.timestamp.getTime() < hourAgo)
      .slice(-50) // Keep last 50 for baseline
      .map(p => p.density);
  }

  private updateBaseline(locationId: string, density: number): void {
    const current = this.baselineProfiles.get(locationId) || [];
    current.push(density);
    // Keep only last 100 values
    if (current.length > 100) {
      current.shift();
    }
    this.baselineProfiles.set(locationId, current);
  }

  private detectSuddenSurge(
    profile: CrowdProfile,
    baselineMean: number,
    baselineStdDev: number
  ): { detected: boolean; severity: 'low' | 'medium' | 'high' | 'critical'; message: string; rate: number } {
    if (baselineStdDev === 0) {
      // No variance in baseline, check absolute threshold
      if (profile.density > baselineMean * 2) {
        return {
          detected: true,
          severity: 'high',
          message: `Sudden surge detected: density ${(profile.density * 100).toFixed(0)}% vs baseline ${(baselineMean * 100).toFixed(0)}%`,
          rate: (profile.density - baselineMean) / baselineMean * 100
        };
      }
      return { detected: false, severity: 'low', message: '', rate: 0 };
    }

    const zScore = (profile.density - baselineMean) / baselineStdDev;

    if (zScore > this.outbreakThreshold) {
      let severity: 'low' | 'medium' | 'high' | 'critical';
      if (zScore > 5) severity = 'critical';
      else if (zScore > 4) severity = 'high';
      else if (zScore > 3) severity = 'medium';
      else severity = 'low';

      return {
        detected: true,
        severity,
        message: `Sudden surge detected: ${zScore.toFixed(1)} std deviations above baseline`,
        rate: (profile.density - baselineMean) / baselineMean * 100
      };
    }

    return { detected: false, severity: 'low', message: '', rate: 0 };
  }

  private detectPersistentIncrease(
    profiles: CrowdProfile[],
    baselineMean: number
  ): { detected: boolean; severity: 'low' | 'medium' | 'high' | 'critical'; message: string; affectedZones: string[]; rate: number } {
    if (profiles.length < 3) {
      return { detected: false, severity: 'low', message: '', affectedZones: [], rate: 0 };
    }

    // Check if density has been consistently above baseline
    const aboveBaseline = profiles.filter(p => p.density > baselineMean * 1.5);
    const percentageAbove = aboveBaseline.length / profiles.length;

    if (percentageAbove > 0.7) {
      // Calculate rate of increase
      const firstHalf = profiles.slice(0, Math.floor(profiles.length / 2));
      const secondHalf = profiles.slice(Math.floor(profiles.length / 2));

      const firstMean = this.calculateMean(firstHalf.map(p => p.density));
      const secondMean = this.calculateMean(secondHalf.map(p => p.density));

      const ratePerMinute = firstHalf.length > 0
        ? (secondMean - firstMean) / (firstHalf.length * 5) * 100
        : 0;

      const zones = [...new Set(aboveBaseline.map(p => p.zoneId))];

      return {
        detected: true,
        severity: ratePerMinute > 10 ? 'critical' : ratePerMinute > 5 ? 'high' : ratePerMinute > 2 ? 'medium' : 'low',
        message: `Persistent increase detected: ${(percentageAbove * 100).toFixed(0)}% of recent readings above threshold`,
        affectedZones: zones,
        rate: ratePerMinute
      };
    }

    return { detected: false, severity: 'low', message: '', affectedZones: [], rate: 0 };
  }

  private detectConcentration(
    allProfiles: CrowdProfile[],
    locationId: string
  ): { detected: boolean; severity: 'low' | 'medium' | 'high' | 'critical'; message: string; affectedZones: string[]; rate: number } {
    const locationProfiles = allProfiles.filter(p => p.locationId === locationId);

    if (locationProfiles.length < 5) {
      return { detected: false, severity: 'low', message: '', affectedZones: [], rate: 0 };
    }

    // Group by zone
    const zoneStats = new Map<string, { count: number; avgDensity: number }>();

    for (const profile of locationProfiles.slice(-20)) {
      const current = zoneStats.get(profile.zoneId) || { count: 0, avgDensity: 0 };
      const newCount = current.count + 1;
      const newAvg = (current.avgDensity * current.count + profile.density) / newCount;
      zoneStats.set(profile.zoneId, { count: newCount, avgDensity: newAvg });
    }

    // Check for concentration
    const maxDensity = Math.max(...Array.from(zoneStats.values()).map(s => s.avgDensity));
    const avgDensity = this.calculateMean(Array.from(zoneStats.values()).map(s => s.avgDensity));

    if (maxDensity > avgDensity * 2 && maxDensity > 0.7) {
      const concentratedZones = Array.from(zoneStats.entries())
        .filter(([, stats]) => stats.avgDensity > avgDensity * 1.5)
        .map(([zone]) => zone);

      return {
        detected: true,
        severity: maxDensity > 0.9 ? 'critical' : maxDensity > 0.8 ? 'high' : maxDensity > 0.7 ? 'medium' : 'low',
        message: `Zone concentration detected: ${concentratedZones.join(', ')} have abnormally high density`,
        affectedZones: concentratedZones,
        rate: (maxDensity - avgDensity) / avgDensity * 100
      };
    }

    return { detected: false, severity: 'low', message: '', affectedZones: [], rate: 0 };
  }

  private detectDispersal(
    profiles: CrowdProfile[],
    baselineMean: number
  ): { detected: boolean; severity: 'low' | 'medium' | 'high' | 'critical'; message: string; rate: number } {
    if (profiles.length < 3) {
      return { detected: false, severity: 'low', message: '', rate: 0 };
    }

    // Check for rapid decrease
    const densities = profiles.map(p => p.density);
    const recentMean = this.calculateMean(densities);

    if (recentMean < baselineMean * 0.3) {
      const decreaseRate = ((baselineMean - recentMean) / baselineMean) * 100;

      return {
        detected: true,
        severity: decreaseRate > 80 ? 'high' : decreaseRate > 50 ? 'medium' : 'low',
        message: `Rapid dispersal detected: density dropped from ${(baselineMean * 100).toFixed(0)}% to ${(recentMean * 100).toFixed(0)}%`,
        rate: -decreaseRate
      };
    }

    return { detected: false, severity: 'low', message: '', rate: 0 };
  }

  private createOutbreakResult(
    type: OutbreakEvent['type'],
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    affectedZones: string[],
    increaseRate: number
  ): OutbreakDetectionResult {
    this.logger?.info(`Outbreak detected: ${type} - ${message}`);

    return {
      isOutbreak: true,
      severity,
      message,
      type,
      affectedZones,
      increaseRate
    };
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private calculateStdDev(values: number[], mean: number): number {
    if (values.length < 2) return 0;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private countByField(items: any[], field: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = item[field];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}