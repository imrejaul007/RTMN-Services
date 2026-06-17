import { IAsset } from '../models/Asset';
import { IMaintenance } from '../models/Maintenance';
import { IIoTStatus } from '../models/IoTStatus';

/**
 * Health Score Calculator
 * Calculates overall health score (0-100) for an asset based on:
 * - Uptime percentage
 * - MTBF (Mean Time Between Failures)
 * - MTTR (Mean Time To Repair)
 * - Recent maintenance trends
 * - IoT sensor data (if available)
 */
export interface HealthScoreResult {
  overallScore: number;         // 0-100
  uptimeScore: number;           // 0-100
  reliabilityScore: number;      // 0-100
  maintenanceScore: number;      // 0-100
  iotScore?: number;             // 0-100 (if IoT enabled)
  factors: {
    uptimePercentage: number;
    mtbf: number;
    mttr: number;
    failureRate: number;
    recentMaintenanceTrend: 'improving' | 'stable' | 'declining';
    alertCount: number;
  };
  recommendations: string[];
  calculatedAt: Date;
}

/**
 * Calculate health score for an asset
 */
export async function calculateHealthScore(
  asset: IAsset,
  recentMaintenances: IMaintenance[] = [],
  iotStatus?: IIoTStatus | null
): Promise<HealthScoreResult> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Calculate uptime percentage
  const metrics = asset.metrics || { totalUptime: 0, totalDowntime: 0, mtbf: 0, mttr: 0, totalFailures: 0 };
  const totalTime = metrics.totalUptime + metrics.totalDowntime;
  const uptimePercentage = totalTime > 0 ? (metrics.totalUptime / totalTime) * 100 : 100;
  const uptimeScore = Math.min(100, Math.max(0, uptimePercentage));

  // Calculate reliability score based on MTBF and MTTR
  // Higher MTBF and lower MTTR = better reliability
  const mtbf = metrics.mtbf || 720; // Default 30 days in hours
  const mttr = metrics.mttr || 4;   // Default 4 hours
  const mtbfScore = Math.min(100, (mtbf / 1000) * 100); // Target MTBF of 1000 hours
  const mttrScore = mttr > 0 ? Math.max(0, 100 - (mttr * 5)) : 100; // Penalize high MTTR
  const reliabilityScore = (mtbfScore * 0.7 + mttrScore * 0.3);

  // Calculate maintenance score
  // Recent maintenance trend
  const recentMaints = recentMaintenances.filter(m => m.completedDate && new Date(m.completedDate) >= ninetyDaysAgo);
  const lastThirtyMaints = recentMaints.filter(m => m.completedDate && new Date(m.completedDate) >= thirtyDaysAgo);
  const previousSixtyMaints = recentMaints.filter(
    m => m.completedDate &&
    new Date(m.completedDate) >= ninetyDaysAgo &&
    new Date(m.completedDate) < thirtyDaysAgo
  );

  // Compare failure rates between recent and older periods
  let maintenanceTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (previousSixtyMaints.length > 0 && lastThirtyMaints.length > 0) {
    const recentFailureRate = lastThirtyMaints.filter(m => m.maintenanceType === 'corrective' || m.maintenanceType === 'emergency').length / 30;
    const olderFailureRate = previousSixtyMaints.filter(m => m.maintenanceType === 'corrective' || m.maintenanceType === 'emergency').length / 60;
    if (recentFailureRate < olderFailureRate * 0.8) maintenanceTrend = 'improving';
    else if (recentFailureRate > olderFailureRate * 1.2) maintenanceTrend = 'declining';
  }

  // Base maintenance score from trend
  let maintenanceScore = 70; // Default score
  if (maintenanceTrend === 'improving') maintenanceScore = 90;
  else if (maintenanceTrend === 'declining') maintenanceScore = 50;

  // Adjust for preventive vs corrective maintenance ratio
  const preventiveCount = recentMaints.filter(m => m.maintenanceType === 'preventive').length;
  const correctiveCount = recentMaints.filter(m => m.maintenanceType === 'corrective' || m.maintenanceType === 'emergency').length;
  if (preventiveCount > 0) {
    const preventiveRatio = preventiveCount / (preventiveCount + correctiveCount);
    maintenanceScore = maintenanceScore * 0.6 + preventiveRatio * 40;
  }

  // Calculate IoT score if available
  let iotScore: number | undefined;
  if (asset.iotEnabled && iotStatus) {
    iotScore = calculateIoTScore(iotStatus);
  }

  // Calculate overall score
  let overallScore: number;
  if (iotScore !== undefined) {
    // Weight: 35% uptime, 25% reliability, 20% maintenance, 20% IoT
    overallScore = uptimeScore * 0.35 + reliabilityScore * 0.25 + maintenanceScore * 0.20 + iotScore * 0.20;
  } else {
    // Weight without IoT: 40% uptime, 30% reliability, 30% maintenance
    overallScore = uptimeScore * 0.40 + reliabilityScore * 0.30 + maintenanceScore * 0.30;
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (uptimePercentage < 95) {
    recommendations.push('Consider investigating root causes of downtime to improve uptime');
  }
  if (mttr > 8) {
    recommendations.push('MTTR is high. Review spare parts inventory and technician availability');
  }
  if (correctiveCount > preventiveCount) {
    recommendations.push('High corrective maintenance rate. Consider implementing preventive maintenance schedule');
  }
  if (iotScore !== undefined && iotScore < 70) {
    recommendations.push('IoT metrics show anomalies. Check sensor readings and equipment condition');
  }
  if (asset.status === 'maintenance') {
    recommendations.push('Asset is currently under maintenance');
  }

  // Determine overall status
  if (overallScore < 30) {
    recommendations.push('CRITICAL: Asset requires immediate attention. Consider replacement planning');
  } else if (overallScore < 50) {
    recommendations.push('Asset health is poor. Prioritize maintenance and monitoring');
  }

  return {
    overallScore: Math.round(overallScore * 100) / 100,
    uptimeScore: Math.round(uptimeScore * 100) / 100,
    reliabilityScore: Math.round(reliabilityScore * 100) / 100,
    maintenanceScore: Math.round(maintenanceScore * 100) / 100,
    iotScore: iotScore !== undefined ? Math.round(iotScore * 100) / 100 : undefined,
    factors: {
      uptimePercentage: Math.round(uptimePercentage * 100) / 100,
      mtbf: Math.round(mtbf * 100) / 100,
      mttr: Math.round(mttr * 100) / 100,
      failureRate: metrics.totalFailures / Math.max(1, totalTime / 720), // Failures per 30-day period
      recentMaintenanceTrend: maintenanceTrend,
      alertCount: iotStatus?.alerts?.level !== 'none' ? 1 : 0,
    },
    recommendations,
    calculatedAt: now,
  };
}

/**
 * Calculate IoT-specific health score
 */
function calculateIoTScore(iotStatus: IIoTStatus): number {
  let score = 100;

  // Deduct for alerts
  if (iotStatus.alerts?.level === 'critical') score -= 40;
  else if (iotStatus.alerts?.level === 'warning') score -= 20;
  else if (iotStatus.alerts?.level === 'info') score -= 5;

  // Deduct for offline time
  if (iotStatus.connectionStatus === 'offline') score -= 30;
  else if (iotStatus.connectionStatus === 'degraded') score -= 15;

  // Deduct for low signal strength
  if (iotStatus.signalStrength !== undefined && iotStatus.signalStrength < -80) {
    score -= 10;
  }

  // Deduct for component health issues
  if (iotStatus.health?.componentHealth) {
    for (const component of iotStatus.health.componentHealth) {
      if (component.health < 70) score -= 5;
      if (component.health < 50) score -= 10;
    }
  }

  // Deduct for threshold violations
  if (iotStatus.metrics) {
    if (iotStatus.thresholds) {
      if (iotStatus.thresholds.temperature) {
        if (iotStatus.metrics.temperature > iotStatus.thresholds.temperature.max) score -= 10;
        if (iotStatus.metrics.temperature < iotStatus.thresholds.temperature.min) score -= 10;
      }
      if (iotStatus.thresholds.humidity) {
        if (iotStatus.metrics.humidity > iotStatus.thresholds.humidity.max) score -= 10;
        if (iotStatus.metrics.humidity < iotStatus.thresholds.humidity.min) score -= 10;
      }
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate MTBF (Mean Time Between Failures)
 * @param failures Array of failure timestamps
 * @param operatingHours Total operating hours
 */
export function calculateMTBF(failureTimestamps: Date[], operatingHours: number): number {
  if (failureTimestamps.length <= 1) {
    return operatingHours;
  }
  // Sort failures by date
  const sorted = [...failureTimestamps].sort((a, b) => a.getTime() - b.getTime());
  // Calculate time between failures
  let totalTimeBetweenFailures = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalTimeBetweenFailures += sorted[i].getTime() - sorted[i - 1].getTime();
  }
  // Convert to hours and divide by number of intervals
  const avgTimeBetweenFailures = totalTimeBetweenFailures / (sorted.length - 1);
  return avgTimeBetweenFailures / (1000 * 60 * 60); // Convert to hours
}

/**
 * Calculate MTTR (Mean Time To Repair)
 * @param repairDurations Array of repair durations in milliseconds
 */
export function calculateMTTR(repairDurations: number[]): number {
  if (repairDurations.length === 0) return 0;
  const totalDuration = repairDurations.reduce((sum, d) => sum + d, 0);
  return totalDuration / repairDurations.length / (1000 * 60 * 60); // Convert to hours
}

/**
 * Get health status label based on score
 */
export function getHealthStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 50) return 'fair';
  if (score >= 25) return 'poor';
  return 'critical';
}
