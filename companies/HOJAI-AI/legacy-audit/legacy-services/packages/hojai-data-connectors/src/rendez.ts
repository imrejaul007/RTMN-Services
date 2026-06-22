/**
 * Rendez → Hojai AI Relationships Connector
 * Privacy Tier 3 (Sensitive) - Explicit consent required
 */
import axios from 'axios';

export interface RelationshipSignal {
  userId: string;
  connectionType: 'friend' | 'match' | 'blocked';
  sharedInterests?: string[];
  engagement?: number;
}

export async function emitRelationshipSignals(data: RelationshipSignal): Promise<void> {
  await axios.post(`${process.env.HOJAi_API_URL}/signals/relationships`, {
    userId: data.userId,
    connectionType: data.connectionType,
    sharedInterests: data.sharedInterests,
    engagement: data.engagement,
    privacyTier: 3
  });
}
