/**
 * Cosmic OS → Hojai AI Astrology Connector
 * Privacy Tier 1
 */
import axios from 'axios';

export interface CosmicSignal {
  userId: string;
  chart: {
    sunSign: string;
    moonSign: string;
    ascendant: string;
  };
  predictions?: {
    love: number;
    career: number;
    health: number;
    finance: number;
  };
}

export async function emitCosmicSignals(data: CosmicSignal): Promise<void> {
  await axios.post(`${process.env.HOJAi_API_URL}/signals/cosmic`, {
    userId: data.userId,
    sunSign: data.chart.sunSign,
    moonSign: data.chart.moonSign,
    ascendant: data.chart.ascendant,
    predictions: data.predictions
  });
}
