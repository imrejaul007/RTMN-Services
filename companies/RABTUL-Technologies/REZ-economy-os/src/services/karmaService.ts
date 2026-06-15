import { v4 as uuidv4 } from 'uuid';
import { KarmaRecord, KarmaEvent, KarmaTier } from '../types';
import { karmaStore } from '../models/Karma';
import { config } from '../config';
import { eventBus, ECONOMY_TOPICS } from '../utils/eventBus';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';

const KARMA_SOURCES: Record<string, number> = config.karma.karmaSources;

const TIER_ORDER: KarmaTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

function determineTier(totalKarma: number): KarmaTier {
  const thresholds = config.karma.tierThresholds;
  if (totalKarma >= thresholds.diamond) return 'diamond';
  if (totalKarma >= thresholds.platinum) return 'platinum';
  if (totalKarma >= thresholds.gold) return 'gold';
  if (totalKarma >= thresholds.silver) return 'silver';
  return 'bronze';
}

function calculateTierProgress(totalKarma: number): { tier: KarmaTier; progress: number; nextTier: KarmaTier | null } {
  const tier = determineTier(totalKarma);
  const idx = TIER_ORDER.indexOf(tier);
  const nextTier = idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
  if (!nextTier) return { tier, progress: 1, nextTier: null };

  const thresholds = config.karma.tierThresholds;
  const currentThreshold = thresholds[tier];
  const nextThreshold = thresholds[nextTier];
  const progress = (totalKarma - currentThreshold) / (nextThreshold - currentThreshold);

  return { tier, progress: Math.max(0, Math.min(1, progress)), nextTier };
}

export const karmaService = {
  /**
   * Initialize a karma record for a new agent.
   */
  initialize(agentId: string): KarmaRecord {
    if (karmaStore.exists(agentId)) {
      return karmaStore.get(agentId)!;
    }
    const now = new Date().toISOString();
    const record: KarmaRecord = {
      id: `karma_${uuidv4()}`,
      agentId,
      totalKarma: 0,
      lifetimeKarma: 0,
      tier: 'bronze',
      tierProgress: 0,
      sources: {},
      lastUpdated: now,
      history: [],
      createdAt: now,
    };
    karmaStore.upsert(agentId, record);
    logger.info(`Karma initialized for agent ${agentId}`);
    return record;
  },

  /**
   * Get a karma record by agentId. Initializes if not found.
   */
  get(agentId: string): KarmaRecord {
    return karmaStore.get(agentId) || this.initialize(agentId);
  },

  /**
   * Award or penalize karma for a specific source.
   * Positive points increase, negative points decrease.
   * lifetimeKarma never decreases.
   */
  async award(
    agentId: string,
    source: string,
    points?: number,
    options: { reason?: string; referenceId?: string; customPoints?: number } = {}
  ): Promise<{ record: KarmaRecord; event: KarmaEvent; tierChanged: boolean; oldTier: KarmaTier; newTier: KarmaTier }> {
    const record = this.get(agentId);
    const oldTier = record.tier;

    // Determine points: explicit > custom > source default
    let actualPoints = options.customPoints !== undefined ? options.customPoints : points;
    if (actualPoints === undefined) {
      actualPoints = KARMA_SOURCES[source];
    }
    if (actualPoints === undefined) {
      actualPoints = 0;
    }

    const now = new Date().toISOString();
    const event: KarmaEvent = {
      id: `kevent_${uuidv4()}`,
      agentId,
      source,
      points: actualPoints,
      reason: options.reason || `Karma ${actualPoints >= 0 ? 'awarded' : 'penalized'} for ${source}`,
      referenceId: options.referenceId,
      timestamp: now,
    };

    const newTotal = Math.max(0, record.totalKarma + actualPoints);
    const newLifetime = record.lifetimeKarma + Math.max(0, actualPoints);
    const tierInfo = calculateTierProgress(newTotal);
    const newSources = { ...record.sources };
    newSources[source] = (newSources[source] || 0) + actualPoints;

    const updated: KarmaRecord = {
      ...record,
      totalKarma: newTotal,
      lifetimeKarma: newLifetime,
      tier: tierInfo.tier,
      tierProgress: tierInfo.progress,
      sources: newSources,
      lastUpdated: now,
      history: [event, ...record.history].slice(0, 100),
    };

    karmaStore.upsert(agentId, updated);
    karmaStore.addEvent(agentId, event);

    const tierChanged = oldTier !== updated.tier;

    // Publish events
    if (actualPoints >= 0) {
      await eventBus.publish(ECONOMY_TOPICS.KARMA_AWARDED, {
        agentId,
        source,
        points: actualPoints,
        totalKarma: newTotal,
        tier: updated.tier,
        reason: event.reason,
        referenceId: options.referenceId,
      });
    } else {
      await eventBus.publish(ECONOMY_TOPICS.KARMA_PENALIZED, {
        agentId,
        source,
        points: actualPoints,
        totalKarma: newTotal,
        tier: updated.tier,
        reason: event.reason,
        referenceId: options.referenceId,
      });
    }

    if (tierChanged) {
      await eventBus.publish(ECONOMY_TOPICS.KARMA_TIER_CHANGED, {
        agentId,
        oldTier,
        newTier: updated.tier,
        totalKarma: newTotal,
        trigger: source,
      });
    }

    logger.info(
      `Karma ${actualPoints >= 0 ? 'awarded' : 'penalized'}: ${agentId} ${actualPoints} for ${source} (total: ${newTotal}, tier: ${updated.tier})`
    );

    return { record: updated, event, tierChanged, oldTier, newTier: updated.tier };
  },

  /**
   * Get karma history for an agent.
   */
  getHistory(agentId: string, limit: number = 50): KarmaEvent[] {
    return karmaStore.getEvents(agentId, limit);
  },

  /**
   * List all karma records.
   */
  list(): KarmaRecord[] {
    return karmaStore.list();
  },

  /**
   * List by tier.
   */
  listByTier(tier: KarmaTier): KarmaRecord[] {
    return karmaStore.listByTier(tier);
  },

  /**
   * Top N agents by karma.
   */
  top(n: number = 10): KarmaRecord[] {
    return karmaStore.topKarma(n);
  },

  /**
   * Get statistics.
   */
  stats(): {
    total: number;
    byTier: Record<KarmaTier, number>;
    averageKarma: number;
    topAgent: { agentId: string; karma: number; tier: KarmaTier } | null;
  } {
    const all = this.list();
    const byTier: Record<KarmaTier, number> = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
    };
    for (const r of all) byTier[r.tier]++;
    const averageKarma = all.length === 0 ? 0 : Math.round(all.reduce((s, r) => s + r.totalKarma, 0) / all.length);
    const top = all.sort((a, b) => b.totalKarma - a.totalKarma)[0];
    return {
      total: all.length,
      byTier,
      averageKarma,
      topAgent: top ? { agentId: top.agentId, karma: top.totalKarma, tier: top.tier } : null,
    };
  },

  /**
   * Award karma for an event (helper for event bus subscriptions).
   */
  async awardForEvent(source: string, agentId: string, reason?: string, referenceId?: string): Promise<void> {
    await this.award(agentId, source, undefined, { reason, referenceId });
  },
};
