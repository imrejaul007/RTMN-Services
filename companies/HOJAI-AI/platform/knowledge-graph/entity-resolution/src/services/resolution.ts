/**
 * Entity Resolution Service
 * Core business logic for entity matching and canonical management
 */

import {
  Entity,
  ResolveRequest,
  ResolveResult,
  BatchResolveRequest,
  BatchResolveResult,
  LinkRequest,
  LinkResult,
  CandidateEntity,
  MatchDetails,
  BlockingStrategy,
  ReviewQueueItem,
  EntityType,
} from '../types';
import { DatabaseService, getDatabaseService } from './database';
import {
  calculateSimilarityScore,
  calculateMatchConfidence,
  buildMatchDetails,
  scoreCandidates,
  requiresReview,
  generateMergeRecommendation,
  DEFAULT_CONFIG,
  ResolutionConfig,
} from '../algorithms/scoring';
import {
  generateBlockingKeys,
  generateBlockingKey,
  getAdaptiveBlockingStrategies,
  tokenSetBlocking,
  phoneticBlocking,
} from '../algorithms/blocking';
import { logger } from '../utils/logger';

export class EntityResolutionService {
  private db: DatabaseService;
  private config: ResolutionConfig;

  constructor(db?: DatabaseService, config?: ResolutionConfig) {
    this.db = db || getDatabaseService();
    this.config = config || DEFAULT_CONFIG;
  }

  /**
   * Resolve a single entity - find existing match or create new
   */
  async resolve(request: ResolveRequest): Promise<ResolveResult> {
    const { name, type, attributes, sourceId, confidenceThreshold, blockingStrategy } = request;

    logger.info('Resolving entity', { name, type, sourceId });

    // Determine blocking strategies to use
    const strategies = blockingStrategy
      ? [blockingStrategy]
      : type
        ? getAdaptiveBlockingStrategies(type)
        : this.config.blockingStrategies;

    // Generate blocking keys
    const blockingKeys: string[] = [];
    for (const strategy of strategies) {
      if (strategy !== 'none') {
        const key = generateBlockingKey(name, strategy, '');
        if (key) blockingKeys.push(key.key);
      }
    }

    // Find candidates using blocking
    const candidateSet = new Map<string, { entity: Entity; blockingKey: string }>();

    for (const key of blockingKeys) {
      const candidates = await this.db.findCandidatesByBlockingKey(
        strategies.filter((s) => s !== 'none'),
        key
      );

      for (const entity of candidates) {
        if (!candidateSet.has(entity.id)) {
          candidateSet.set(entity.id, { entity, blockingKey: key });
        }
      }
    }

    // If no blocking matches, try vector similarity
    if (candidateSet.size === 0) {
      logger.debug('No blocking matches, trying vector similarity');
      // Note: Would need embedding generation here
    }

    // Score all candidates
    const scoredCandidates = scoreCandidates(
      { name, attributes },
      Array.from(candidateSet.values()).map((c) => ({
        id: c.entity.id,
        name: c.entity.primaryName,
        attributes: c.entity.attributes as Record<string, string>,
      })),
      this.config
    );

    // Build candidate entities with details
    const candidateEntities: CandidateEntity[] = [];
    for (const scored of scoredCandidates.slice(0, this.config.maxCandidates)) {
      const candidateData = candidateSet.get(scored.id);
      if (!candidateData) continue;

      const entity = candidateData.entity;
      const matchDetails = buildMatchDetails(name, entity.primaryName, this.config);
      matchDetails.blockingKey = candidateData.blockingKey;

      candidateEntities.push({
        entityId: entity.id,
        canonicalId: entity.canonicalId,
        primaryName: entity.primaryName,
        similarityScore: scored.score,
        matchDetails,
      });
    }

    // Determine best match
    const threshold = confidenceThreshold || this.config.reviewThreshold;
    const bestMatch = candidateEntities[0];

    if (!bestMatch || bestMatch.similarityScore < threshold) {
      // Create new entity
      const newEntity = await this.createNewEntity(name, type, attributes, sourceId);

      return {
        resolved: false,
        confidence: 1.0,
        matchType: 'uncertain',
        candidateEntities: candidateEntities.slice(0, 5),
        newEntity: {
          id: newEntity.id,
          canonicalId: newEntity.canonicalId,
          type: newEntity.type,
          primaryName: newEntity.primaryName,
        },
      };
    }

    // Check if review is needed
    const { confidence, level } = calculateMatchConfidence(bestMatch.similarityScore, null);

    if (requiresReview(confidence, threshold)) {
      // Add to review queue
      await this.addToReviewQueue({
        type: 'merge_candidate',
        priority: confidence < 0.5 ? 'high' : 'medium',
        entityIds: [bestMatch.entityId, 'NEW'],
        confidence,
        reason: `Potential match for "${name}" with score ${(confidence * 100).toFixed(1)}%`,
        suggestedAction: generateMergeRecommendation(confidence, bestMatch.matchDetails).reason,
      });

      return {
        resolved: false,
        entityId: bestMatch.entityId,
        canonicalId: bestMatch.canonicalId,
        confidence,
        matchType: level,
        candidateEntities: candidateEntities.slice(0, 5),
      };
    }

    // Return resolved match
    return {
      resolved: true,
      entityId: bestMatch.entityId,
      canonicalId: bestMatch.canonicalId,
      confidence,
      matchType: level,
      candidateEntities: candidateEntities.slice(0, 5),
    };
  }

  /**
   * Batch resolve multiple entities
   */
  async resolveBatch(request: BatchResolveRequest): Promise<BatchResolveResult> {
    const { entities, mode = 'both', confidenceThreshold } = request;

    const results: ResolveResult[] = [];
    const summary = {
      total: entities.length,
      resolved: 0,
      new: 0,
      ambiguous: 0,
    };

    for (const entity of entities) {
      const result = await this.resolve({
        ...entity,
        confidenceThreshold,
      });

      results.push(result);

      if (result.resolved) {
        summary.resolved++;
      } else if (result.newEntity) {
        summary.new++;
      } else {
        summary.ambiguous++;
      }
    }

    return { results, summary };
  }

  /**
   * Link two existing entities
   */
  async link(request: LinkRequest): Promise<LinkResult> {
    const { sourceEntityId, targetEntityId, relationshipType, confidence, sourceId } = request;

    logger.info('Linking entities', { sourceEntityId, targetEntityId, relationshipType });

    // Verify both entities exist
    const [sourceEntity, targetEntity] = await Promise.all([
      this.db.getEntityById(sourceEntityId),
      this.db.getEntityById(targetEntityId),
    ]);

    if (!sourceEntity || !targetEntity) {
      throw new Error('One or both entities not found');
    }

    // Calculate link confidence if not provided
    const linkConfidence =
      confidence ||
      calculateSimilarityScore(sourceEntity.primaryName, targetEntity.primaryName, this.config).score;

    // Check if entities should be merged instead
    if (linkConfidence >= 0.9) {
      const recommendation = generateMergeRecommendation(
        linkConfidence,
        buildMatchDetails(sourceEntity.primaryName, targetEntity.primaryName, this.config)
      );

      if (recommendation.action === 'merge') {
        await this.addToReviewQueue({
          type: 'merge_candidate',
          priority: 'high',
          entityIds: [sourceEntityId, targetEntityId],
          confidence: linkConfidence,
          reason: `High similarity (${(linkConfidence * 100).toFixed(1)}%) suggests merge`,
          suggestedAction: recommendation.reason,
        });

        return {
          linked: false,
          confidence: linkConfidence,
          requiresReview: true,
        };
      }
    }

    // Create the link
    const link = await this.db.createLink({
      sourceEntityId,
      targetEntityId,
      relationshipType,
      confidence: linkConfidence,
      sourceId: sourceId || 'system',
    });

    // Update entity's linked entities
    await this.db.updateEntity(sourceEntityId, {
      linkedEntities: [
        ...sourceEntity.linkedEntities,
        {
          linkId: link.linkId,
          sourceEntityId,
          targetEntityId,
          relationshipType,
          confidence: linkConfidence,
          sourceId: sourceId || 'system',
          createdAt: new Date(),
        },
      ],
    });

    const requiresManualReview = requiresReview(linkConfidence, this.config.reviewThreshold);

    if (requiresManualReview) {
      await this.addToReviewQueue({
        type: 'link_candidate',
        priority: linkConfidence < 0.5 ? 'high' : 'medium',
        entityIds: [sourceEntityId, targetEntityId],
        confidence: linkConfidence,
        reason: `Manual verification needed for link between "${sourceEntity.primaryName}" and "${targetEntity.primaryName}"`,
        suggestedAction: 'Verify relationship accuracy',
      });
    }

    return {
      linked: true,
      linkId: link.linkId,
      confidence: linkConfidence,
      requiresReview: requiresManualReview,
    };
  }

  /**
   * Get entity by ID
   */
  async getEntity(id: string): Promise<Entity | null> {
    return this.db.getEntityById(id);
  }

  /**
   * Get entity by canonical ID (includes all merged entities)
   */
  async getEntityByCanonicalId(canonicalId: string): Promise<Entity[]> {
    return this.db.getEntityByCanonicalId(canonicalId);
  }

  /**
   * Merge multiple entities into one
   */
  async mergeEntities(
    sourceIds: string[],
    targetId: string,
    userId: string,
    reason: string
  ): Promise<Entity> {
    logger.info('Merging entities', { sourceIds, targetId, userId });

    // Verify target exists
    const target = await this.db.getEntityById(targetId);
    if (!target) {
      throw new Error('Target entity not found');
    }

    // Verify all sources exist
    for (const sourceId of sourceIds) {
      const source = await this.db.getEntityById(sourceId);
      if (!source) {
        throw new Error(`Source entity ${sourceId} not found`);
      }
    }

    // Perform merge
    const mergedEntity = await this.db.mergeEntities(sourceIds, targetId, userId, reason);

    if (!mergedEntity) {
      throw new Error('Merge operation failed');
    }

    // Add aliases from merged entities
    for (const sourceId of sourceIds) {
      const source = await this.db.getEntityById(sourceId);
      if (source) {
        await this.db.createAlias({
          canonicalId: targetId,
          alias: source.primaryName,
          type: 'fuzzy',
          confidence: 0.9,
        });
      }
    }

    return mergedEntity;
  }

  /**
   * Split an entity into multiple entities
   */
  async splitEntity(entityId: string, newEntityNames: string[], userId: string): Promise<Entity[]> {
    logger.info('Splitting entity', { entityId, newEntityNames, userId });

    const original = await this.db.getEntityById(entityId);
    if (!original) {
      throw new Error('Entity not found');
    }

    // Create new entity IDs
    const newEntityIds = newEntityNames.map(
      () => `ent_split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );

    // Perform split
    return this.db.splitEntity(entityId, newEntityIds, userId);
  }

  /**
   * Get review queue
   */
  async getReviewQueue(
    limit?: number,
    offset?: number,
    status?: string,
    priority?: string
  ): Promise<{ items: ReviewQueueItem[]; total: number }> {
    return this.db.getReviewQueue(limit, offset, status, priority);
  }

  /**
   * Process a review queue item
   */
  async processReview(
    reviewId: string,
    action: 'approved' | 'rejected',
    userId: string,
    notes?: string
  ): Promise<ReviewQueueItem> {
    const item = await this.db.processReviewItem(reviewId, action, userId, notes);
    if (!item) {
      throw new Error('Review item not found');
    }

    // If approved, perform the suggested action
    if (action === 'approved' && item.suggestedAction) {
      // Process based on type
      if (item.type === 'merge_candidate' && item.entityIds.length >= 2) {
        const [targetId, ...sourceIds] = item.entityIds.filter((id) => id !== 'NEW');
        if (targetId && sourceIds.length > 0) {
          await this.mergeEntities(
            sourceIds,
            targetId,
            userId,
            `Approved from review queue: ${item.reason}`
          );
        }
      }
    }

    return item;
  }

  /**
   * Update entity
   */
  async updateEntity(id: string, updates: Partial<Entity>): Promise<Entity | null> {
    return this.db.updateEntity(id, updates);
  }

  /**
   * Add alias to entity
   */
  async addAlias(canonicalId: string, alias: string, type: string, confidence: number): Promise<void> {
    await this.db.createAlias({
      canonicalId,
      alias,
      type: type as EntityAlias['type'],
      confidence,
    });
  }

  /**
   * Get entity aliases
   */
  async getAliases(canonicalId: string): Promise<import('../types').EntityAlias[]> {
    return this.db.getAliasesByCanonicalId(canonicalId);
  }

  /**
   * Get entity links
   */
  async getLinks(entityId: string): Promise<import('../types').EntityLink[]> {
    return this.db.getLinksByEntityId(entityId);
  }

  /**
   * Register a new data source
   */
  async registerSource(source: import('../types').EntitySource): Promise<void> {
    await this.db.createSource(source);
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<import('../types').ResolutionStats> {
    const stats = await this.db.getStatistics();
    const sourcesResult = await this.db.query<{ source_id: string; count: string }>(
      `SELECT source_id, COUNT(*) as count
       FROM entity_sources
       GROUP BY source_id
       ORDER BY count DESC
       LIMIT 10`
    );

    return {
      ...stats,
      topSources: sourcesResult.rows.map((r) => ({
        sourceId: r.source_id,
        count: parseInt(r.count, 10),
      })),
    };
  }

  /**
   * Create a new entity
   */
  private async createNewEntity(
    name: string,
    type: EntityType | undefined,
    attributes: Record<string, string> | undefined,
    sourceId: string | undefined
  ): Promise<Entity> {
    // Determine entity type
    const entityType = type || 'custom';

    // Get source reliability
    const reliabilityWeight = sourceId ? await this.db.getReliabilityWeight(sourceId) : 0.7;

    // Create entity
    const entity = await this.db.createEntity({
      type: entityType,
      primaryName: name,
      attributes: (attributes as Record<string, import('../types').EntityAttribute>) || {},
      aliases: [],
      sources: sourceId ? [sourceId] : [],
      status: 'active',
      confidence: reliabilityWeight,
      reviewStatus: 'approved',
      linkedEntities: [],
      metadata: {},
    });

    // Create blocking keys
    const strategies = type
      ? getAdaptiveBlockingStrategies(type)
      : this.config.blockingStrategies;

    for (const strategy of strategies) {
      if (strategy !== 'none') {
        const key = generateBlockingKey(name, strategy, entity.id);
        if (key) {
          await this.db.createBlockingKey(entity.id, strategy, key.key);
        }
      }
    }

    // Create aliases for common variations
    await this.createCommonAliases(entity.id, name);

    return entity;
  }

  /**
   * Create common aliases for an entity name
   */
  private async createCommonAliases(entityId: string, name: string): Promise<void> {
    // Create phonetic aliases
    const tokens = name.split(/\s+/).filter((t) => t.length > 2);

    for (const token of tokens.slice(0, 3)) {
      // Add lowercase version
      await this.db.createAlias({
        canonicalId: entityId,
        alias: token.toLowerCase(),
        type: 'language_variant',
        confidence: 0.95,
      });

      // Add common abbreviations
      if (token.length > 4) {
        await this.db.createAlias({
          canonicalId: entityId,
          alias: token.substring(0, 3) + '.',
          type: 'abbreviation',
          confidence: 0.6,
        });
      }
    }
  }

  /**
   * Add item to review queue
   */
  private async addToReviewQueue(item: Omit<ReviewQueueItem, 'id' | 'createdAt'>): Promise<void> {
    try {
      await this.db.addToReviewQueue(item);
    } catch (error) {
      logger.error('Failed to add to review queue', { error, item });
    }
  }
}

// Type for alias import
type EntityAlias = import('../types').EntityAlias;