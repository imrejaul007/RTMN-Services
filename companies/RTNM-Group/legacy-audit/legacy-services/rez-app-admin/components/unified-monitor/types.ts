export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export type SlaStatus = 'ok' | 'warning' | 'breach' | 'unknown' | 'degraded';

export interface SlaMetric {
  status: SlaStatus;
  reason?: string;
  ageMinutes?: number;
  waiting?: number;
  failed?: number;
  threshold?: number;
  merchantCount?: number;
}

export interface SlaData {
  overallStatus: SlaStatus;
  metrics: {
    customerSnapshot: SlaMetric;
    merchantEventQueue: SlaMetric;
    dailyStats: SlaMetric;
    broadcastQueue: SlaMetric;
  };
  generatedAt: string;
}

export interface BusinessMetrics {
  summary: {
    totalBookings: number;
    totalOrders: number;
    paymentSuccess: number;
    paymentFailure: number;
    coinsEarned: number;
    coinsRedeemed: number;
    newUsers: number;
    bbpsCompleted: number;
  };
  health: {
    paymentSuccessRate: string;
    coinsEarnedVsRedeemedRatio: string;
  };
}

export interface MerchantStatusSummary {
  totalOnline: number;
  totalIdle: number;
  totalOffline: number;
  totalActiveSessions: number;
  totalPendingOrders: number;
}

export interface AggregatorStats {
  platforms: Array<{
    name: string;
    todayOrders: number;
    acceptanceRate: number;
    avgPrepTime: number;
  }>;
  stuckOrders: Array<{
    id: string;
    platform: string;
    merchantName: string;
    minutesStuck: number;
  }>;
}

export interface BbpsHealth {
  billers: Array<{ name: string; status: 'healthy' | 'degraded' | 'down'; successRate: number }>;
}

export interface JobData {
  name: string;
  schedule: string;
  category: string;
  lastRun: string | null;
  consecutiveFailures: number;
  status: 'healthy' | 'warning' | 'failing' | 'unknown';
}

export interface AllData {
  health: import('../../services/api/system').SystemHealthData | null;
  stats: import('../../services/api/dashboard').DashboardStats | null;
  economics: import('../../services/api/economics').EconomicsOverview | null;
  sla: SlaData | null;
  businessMetrics: BusinessMetrics | null;
  merchantStatus: MerchantStatusSummary | null;
  aggregator: AggregatorStats | null;
  bbps: BbpsHealth | null;
  jobs: JobData[];
  reconciliation: import('../../services/api/system').ReconciliationResult | null;
  fetchedAt: Date;
}
