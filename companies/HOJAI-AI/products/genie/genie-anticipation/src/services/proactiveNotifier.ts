/**
 * Proactive Notifier — Send prediction notifications
 * Spec Part 36: Anticipation Engine
 */

import axios from 'axios';
import { Prediction } from '../types/prediction.js';

const RAZO_URL = process.env.RAZO_URL || 'http://localhost:4299';

export async function notifyPrediction(prediction: Prediction): Promise<{ sent: boolean; channel?: string }> {
  try {
    // Use RAZO to send notification
    const response = await axios.post(
      `${RAZO_URL}/api/notify`,
      {
        userId: prediction.userId,
        message: `${prediction.title}\n\n${prediction.suggestion}`,
        urgency: prediction.urgency,
        source: 'genie-anticipation',
        category: prediction.type,
      },
      { timeout: 10000 }
    );

    return { sent: true, channel: response.data?.channel || 'auto' };
  } catch (error) {
    console.warn('[proactive-notifier] Notification failed:', error);
    return { sent: false };
  }
}

export async function notifyAll(predictions: Prediction[]): Promise<Array<{ id: string; sent: boolean }>> {
  const results: Array<{ id: string; sent: boolean }> = [];

  for (const pred of predictions) {
    if (pred.dismissed || pred.actedOn) continue;
    if (pred.urgency === 'low') continue; // Skip low urgency

    const result = await notifyPrediction(pred);
    results.push({ id: pred.id, sent: result.sent });
  }

  return results;
}