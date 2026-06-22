/**
 * VibeScoringService - Spontaa-inspired
 * Derives user vibe profiles and detects micro-moments from behavior patterns
 */

import { VibeProfile } from '../models/VibeProfile.js';
import { MicroMoment } from '../models/MicroMoment.js';
import { Intent } from '../models/Intent.js';
import type { IIntent } from '../models/Intent.js';
import type { IMicroMoment } from '../models/MicroMoment.js';
import type { IVibeProfile } from '../models/VibeProfile.js';

export class VibeScoringService {
  /**
   * Analyze user behavior to determine their vibe profile.
   * Called after each intent capture to update the vibe score.
   */
  async updateVibeProfile(userId: string): Promise<void> {
    const intents = await Intent.find({ userId, status: 'ACTIVE' })
      .sort({ lastSeenAt: -1 })
      .limit(50);

    if (intents.length < 3) return; // Need minimum signals

    // Calculate spontaneity: fast signal velocity = spontaneous
    const now = Date.now();
    const signalVelocities: number[] = [];
    let lastSignalTime = now;

    for (const intent of intents) {
      for (const signal of (intent.signals || []).slice(-10)) {
        const signalTime = new Date(signal.capturedAt).getTime();
        if (lastSignalTime - signalTime < 3 * 60 * 60 * 1000) { // within 3 hours
          signalVelocities.push(lastSignalTime - signalTime);
        }
        lastSignalTime = signalTime;
      }
    }

    const avgVelocity = signalVelocities.length > 0
      ? signalVelocities.reduce((a, b) => a + b, 0) / signalVelocities.length
      : 3 * 60 * 60 * 1000;

    // Fast velocity (< 2 hours between signals) = spontaneous
    const spontaneityScore = Math.max(0, Math.min(1, 1 - (avgVelocity / (6 * 60 * 60 * 1000))));

    // Calculate spending profile from confidence distribution
    const avgConfidence = intents.reduce((sum, i) => sum + i.confidence, 0) / intents.length;
    let spendingProfile: 'budget' | 'moderate' | 'premium' | 'luxury' = 'moderate';
    if (avgConfidence > 0.8) spendingProfile = 'luxury';
    else if (avgConfidence > 0.6) spendingProfile = 'premium';
    else if (avgConfidence < 0.3) spendingProfile = 'budget';

    // Primary vibe determination
    let primaryVibe: string = 'planned';
    if (spontaneityScore > 0.7) primaryVibe = 'spontaneous';
    else if (spontaneityScore > 0.5) primaryVibe = 'adventurous';
    else if (avgConfidence > 0.7) primaryVibe = 'quality';
    else if (avgConfidence < 0.4) primaryVibe = 'budget';

    // Confidence in vibe assessment
    const confidence = Math.min(0.9, 0.2 + (intents.length * 0.02));

    await VibeProfile.findOneAndUpdate(
      { userId },
      {
        userId,
        primaryVibe: primaryVibe as IVibeProfile['primaryVibe'],
        secondaryVibe: spendingProfile,
        intensity: spontaneityScore,
        confidence,
        travelSpontaneity: intents.some(i => i.category === 'TRAVEL') ? spontaneityScore : 0.5,
        diningSpontaneity: intents.some(i => i.category === 'DINING') ? spontaneityScore : 0.5,
        spendingProfile,
        derivedFromSignals: intents.slice(0, 10).map(i => i.intentKey),
        lastUpdated: new Date(),
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Detect the current micro-moment based on session behavior.
   * Called after each intent capture.
   */
  async detectMicroMoment(userId: string, intentKey: string, eventType: string): Promise<IMicroMoment | null> {
    const sessionId = `${userId}_${new Date().toISOString().slice(0, 13)}`; // hourly session

    // Count recent events for this intent
    const recentMoments = await MicroMoment.find({ userId, intentKey })
      .sort({ triggeredAt: -1 })
      .limit(5);

    const recentEvents = await Intent.findOne({ userId, intentKey })
      .select('signals lastSeenAt category appType')
      .lean();

    if (!recentEvents || !recentEvents.signals) return null;

    const signals = recentEvents.signals.slice(-20);
    const nowMs = Date.now();

    // Determine moment type based on pattern
    let momentType: IMicroMoment['momentType'] = 'browsing';
    let urgency: IMicroMoment['urgency'] = 'low';
    const signalsList: string[] = [];

    if (eventType === 'cart_add' || eventType === 'hold') {
      const timeSinceFirstSignal = nowMs - new Date(signals[0]?.capturedAt || nowMs).getTime();
      if (timeSinceFirstSignal < 10 * 60 * 1000) { // < 10 minutes
        momentType = 'need_now';
        urgency = 'high';
        signalsList.push('rapid_conversion_intent');
      } else {
        momentType = 'ready_to_buy';
        urgency = 'medium';
        signalsList.push('cart_add_detected');
      }
    } else if (eventType === 'search' && signals.length === 1) {
      momentType = 'just_checking';
      urgency = 'low';
      signalsList.push('single_search_event');
    } else if (eventType === 'view' && signals.length > 3) {
      // Multiple views = comparison mode
      momentType = 'let_compare';
      urgency = 'medium';
      signalsList.push('multi_view_pattern');
    } else if (eventType === 'abandoned') {
      momentType = 'returning'; // they'll come back
      urgency = 'medium';
      signalsList.push('abandonment_detected');
    } else if (recentMoments.length > 0 && nowMs - new Date(recentMoments[0].triggeredAt).getTime() > 24 * 60 * 60 * 1000) {
      momentType = 'returning';
      urgency = 'low';
      signalsList.push('return_after_24h');
    }

    const moment = await MicroMoment.create({
      userId,
      sessionId,
      momentType,
      intentKey,
      category: (recentEvents as any).category,
      appType: (recentEvents as any).appType,
      triggeredAt: new Date(),
      signals: signalsList,
      outcome: 'pending',
      urgency,
      metadata: { eventType, signalCount: signals.length },
    });

    return moment;
  }

  /**
   * Get vibe profile for a user
   */
  async getVibeProfile(userId: string): Promise<IVibeProfile | null> {
    return VibeProfile.findOne({ userId });
  }

  /**
   * Get recent micro moments for a user
   */
  async getRecentMicroMoments(userId: string, limit: number = 5): Promise<IMicroMoment[]> {
    return MicroMoment.find({ userId })
      .sort({ triggeredAt: -1 })
      .limit(limit);
  }
}

export const vibeScoringService = new VibeScoringService();
