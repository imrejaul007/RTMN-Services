/**
 * Cross-App Intent Bridging Service
 * Detects cross-app intent patterns and enables upsell/cross-sell opportunities
 */

import { Intent } from '../models/Intent.js';
import { DormantIntent } from '../models/DormantIntent.js';

export interface IntentBridge {
  sourceIntent: string; // e.g., "hotel_mumbai"
  targetIntent: string; // e.g., "restaurant_mumbai"
  bridgeType: 'location' | 'category' | 'sequential' | 'complementary';
  confidence: number;
  suggestedAction: string;
}

// Known bridge patterns between app types
const BRIDGE_PATTERNS = [
  // Hotel → Restaurant (same city)
  { sourceCategory: 'TRAVEL', sourcePattern: /hotel_(.+)/, targetCategory: 'DINING', targetPattern: (city: string) => `restaurant_${city}`, type: 'location' as const },
  // Flight → Hotel (same destination)
  { sourceCategory: 'TRAVEL', sourcePattern: /flight_(.+)/, targetCategory: 'TRAVEL', targetPattern: (city: string) => `hotel_${city}`, type: 'complementary' as const },
  // Restaurant → Delivery (same area)
  { sourceCategory: 'DINING', sourcePattern: /restaurant_(.+)/, targetCategory: 'RETAIL', targetPattern: (area: string) => `delivery_${area}`, type: 'complementary' as const },
  // Generic location bridge
  { sourceCategory: 'TRAVEL', sourcePattern: /(.+)_travel/, targetCategory: 'DINING', targetPattern: (city: string) => `restaurant_${city}`, type: 'location' as const },
];

export class CrossAppBridgingService {
  /**
   * Find potential cross-app bridges for a user's new intent.
   * Returns suggestions for upsell/cross-sell.
   */
  async findBridges(userId: string, newIntentKey: string, category: string): Promise<IntentBridge[]> {
    const bridges: IntentBridge[] = [];

    for (const pattern of BRIDGE_PATTERNS) {
      const match = newIntentKey.match(pattern.sourcePattern);
      if (!match) continue;

      const extractedKey = match[1];
      const targetPattern = pattern.targetPattern(extractedKey);

      // Find existing intents that match the target pattern — limit to prevent unbounded query
      const targetIntents = await Intent.find({
        userId,
        category: pattern.targetCategory,
        status: { $in: ['ACTIVE', 'DORMANT'] },
        intentKey: { $regex: `^${targetPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' },
      }).limit(20);

      for (const target of targetIntents) {
        // Check if the target already bridges to source
        const existingBridge = (target.metadata as Record<string, unknown>)?.bridgedFrom === newIntentKey;
        if (existingBridge) continue;

        bridges.push({
          sourceIntent: newIntentKey,
          targetIntent: target.intentKey,
          bridgeType: pattern.type,
          confidence: target.status === 'ACTIVE' ? 0.7 : 0.5, // Higher if intent is still active
          suggestedAction: target.status === 'DORMANT'
            ? `Revive with complementary offer: ${pattern.type === 'location' ? 'nearby' : pattern.type}`
            : `Upsell: user interested in ${pattern.targetCategory.toLowerCase()} related to their ${category.toLowerCase()} intent`,
        });
      }
    }

    return bridges;
  }

  /**
   * Link two intents as cross-app bridges.
   * Called when a bridge is accepted by the nudge system.
   */
  async createBridge(userId: string, sourceIntentKey: string, targetIntentKey: string, bridgeType: string): Promise<void> {
    // Update the target intent with the bridge metadata
    await Intent.findOneAndUpdate(
      { userId, intentKey: targetIntentKey },
      { $set: { 'metadata.bridgedFrom': sourceIntentKey, 'metadata.bridgeType': bridgeType } }
    );

    // If target is dormant, trigger a revival with the bridge context
    const dormant = await DormantIntent.findOne({ userId, intentKey: targetIntentKey, status: 'active' });
    if (dormant) {
      const { dormantIntentService } = await import('./DormantIntentService.js');

      await dormantIntentService.triggerRevival(dormant._id.toString(), 'offer_match');

      // Send a nudge with the bridge context
      const message = `Since you searched for ${sourceIntentKey.replace(/_/g, ' ')}, you might also like options matching your interest in ${targetIntentKey.replace(/_/g, ' ')}`;

      await dormantIntentService.createNudge(
        dormant._id.toString(),
        userId,
        'push',
        message
      );
    }
  }

  /**
   * Get sequential journey insights — did user book hotel THEN restaurant?
   */
  async detectSequentialJourney(userId: string): Promise<{journeys: string[], insights: string[]}> {
    const intents = await Intent.find({ userId })
      .sort({ lastSeenAt: -1 })
      .limit(20)
      .lean();

    const journeys: string[] = [];
    const insights: string[] = [];

    // Detect hotel → dining sequence within 7 days
    for (let i = 0; i < intents.length - 1; i++) {
      const current = intents[i];
      const prev = intents[i + 1];

      if (prev.category === 'TRAVEL' && current.category === 'DINING') {
        const hoursBetween = (new Date(current.lastSeenAt).getTime() - new Date(prev.lastSeenAt).getTime()) / (1000 * 60 * 60);
        if (hoursBetween < 168) { // within 7 days
          journeys.push(`hotel_booking → dining_search (${Math.round(hoursBetween)}h gap)`);
          insights.push('High-value travel user who dines out — prime upsell window');
        }
      }
    }

    return { journeys, insights };
  }
}

export const crossAppBridgingService = new CrossAppBridgingService();
