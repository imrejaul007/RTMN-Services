/**
 * RisaCare → Hojai AI Health Connector
 * Privacy Tier 3 (Sensitive)
 * Explicit consent required
 */
import axios from 'axios';

export interface HealthData {
  userId: string;
  healthScore: number;
  metrics: {
    steps: number;
    sleep: number;
    heartRate: number;
    stress: number;
  };
  consent: boolean;
}

export async function emitHealthSignals(data: HealthData): Promise<void> {
  if (!data.consent) return;

  await axios.post(`${process.env.HOJAi_API_URL}/signals/health`, {
    userId: data.userId,
    source: 'risacare',
    data: data.metrics,
    privacyTier: 3
  });
}
