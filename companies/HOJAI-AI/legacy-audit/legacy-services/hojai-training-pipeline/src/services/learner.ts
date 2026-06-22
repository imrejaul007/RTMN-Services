/**
 * HOJAI Training Pipeline - Learner Service
 * Core learning engine that learns from conversations, actions, corrections, and feedback
 * Implements the continuous loop: Capture -> Analyze -> Learn -> Improve -> Deploy
 */

import { v4 as uuidv4 } from 'uuid';
import {
  LearningSource,
  LearningType,
  LearningStage,
  LearningStatus,
  LearnedPattern,
  LearningPayload,
  QueryLearning,
  LearningInsights,
  TrainingBatch,
  BatchStatistics
} from '../types/index.js';
import {
  LearnedPattern as LearnedPatternModel,
  LearningEvent,
  TrainingBatch as TrainingBatchModel,
  ILearnedPattern
} from '../models/learning.js';
import { logger } from '../utils/logger.js';

/**
 * Confidence thresholds for learning progression
 */
const CONFIDENCE_THRESHOLDS = {
  LOW: 0.3,
  MEDIUM: 0.6,
  HIGH: 0.85,
  ARCHIVE: 0.15 // Archive if confidence drops below this
};

/**
 * Frequency thresholds for stage transitions
 */
const FREQUENCY_THRESHOLDS = {
  SHORT_TO_MEDIUM: 3,
  MEDIUM_TO_LONG: 10,
  LONG_TO_MODEL: 50
};

/**
 * Learner Service - Core learning engine
 */
export class Learner {
  /**
   * Capture learning from any source
   */
  async capture(payload: LearningPayload): Promise<{ patternId: string; status: LearningStatus }> {
    const startTime = Date.now();

    try {
      // Validate payload
      const validated = this.validatePayload(payload);

      // Create learning event for audit
      const eventId = uuidv4();
      await LearningEvent.create({
        eventId,
        tenantId: validated.tenantId,
        userId: validated.userId,
        source: validated.source,
        sourceId: validated.sourceId,
        type: validated.type,
        rawContent: validated.content
      });

      // Determine initial stage
      const stage = this.determineInitialStage(validated);

      // Create pattern
      const patternId = uuidv4();
      const now = new Date().toISOString();

      // Set expiration for short-term patterns
      const expiresAt = stage === LearningStage.SHORT_TERM
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        : undefined;

      await LearnedPatternModel.create({
        patternId,
        tenantId: validated.tenantId,
        userId: validated.userId,
        source: validated.source,
        type: validated.type,
        stage,
        status: LearningStatus.CAPTURED,
        content: validated.content,
        confidence: validated.confidence,
        frequency: 1,
        metadata: {
          capturedFrom: validated.source,
          capturedAt: now
        },
        expiresAt
      });

      // Trigger async analysis
      this.analyzeAndLearn(patternId).catch((err) => {
        logger.error('Async analysis failed', { patternId, error: err.message });
      });

      const latencyMs = Date.now() - startTime;
      logger.info('Learning captured', {
        patternId,
        source: validated.source,
        type: validated.type,
        stage,
        latencyMs
      });

      return { patternId, status: LearningStatus.CAPTURED };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Learning capture failed', { error: message, payload });
      throw new Error(`Failed to capture learning: ${message}`);
    }
  }

  /**
   * Process learning from conversations
   */
  async learnFromConversation(
    conversationId: string,
    messages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
      metadata?: Record<string, unknown>;
    }>,
    options?: { tenantId?: string; userId?: string }
  ): Promise<{ patternsLearned: number; intents: string[] }> {
    const patternsLearned: string[] = [];
    const intents: string[] = [];

    try {
      // Extract Q&A pairs from messages
      for (let i = 0; i < messages.length - 1; i++) {
        const current = messages[i];
        const next = messages[i + 1];

        if (current.role === 'user' && next.role === 'assistant') {
          // Learn response pattern
          const patternId = await this.learnResponsePattern(
            current.content,
            next.content,
            conversationId,
            options?.tenantId,
            options?.userId
          );
          if (patternId) patternsLearned.push(patternId);
        }
      }

      // Extract intents from user messages
      for (const msg of messages) {
        if (msg.role === 'user') {
          const intent = this.extractIntent(msg.content);
          if (intent) {
            const patternId = await this.learnIntent(
              intent,
              msg.content,
              conversationId,
              options?.tenantId,
              options?.userId
            );
            if (patternId) {
              intents.push(intent);
              patternsLearned.push(patternId);
            }
          }
        }
      }

      // Extract context from follow-up patterns
      const contextPatterns = this.extractFollowupContext(messages);
      for (const ctx of contextPatterns) {
        const patternId = await this.learnContext(
          ctx.context,
          ctx.followup,
          conversationId,
          options?.tenantId,
          options?.userId
        );
        if (patternId) patternsLearned.push(patternId);
      }

      logger.info('Conversation learning complete', {
        conversationId,
        patternsLearned: patternsLearned.length,
        intents: intents.length
      });

      return { patternsLearned: patternsLearned.length, intents };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Conversation learning failed', { conversationId, error: message });
      throw error;
    }
  }

  /**
   * Process learning from user actions
   */
  async learnFromAction(
    action: {
      type: 'click' | 'view' | 'search' | 'purchase' | 'cancel' | 'error';
      entityType?: string;
      entityId?: string;
      properties?: Record<string, unknown>;
    },
    options?: { tenantId?: string; userId?: string }
  ): Promise<{ patternId: string; type: LearningType }> {
    const learningType = this.actionToLearningType(action.type);
    const confidence = this.actionToConfidence(action.type);

    const payload: LearningPayload = {
      source: LearningSource.SIGNAL,
      sourceId: uuidv4(),
      type: learningType,
      content: {
        action: action.type,
        entityType: action.entityType,
        entityId: action.entityId,
        properties: action.properties
      },
      confidence,
      tenantId: options?.tenantId,
      userId: options?.userId
    };

    const result = await this.capture(payload);
    return { patternId: result.patternId, type: learningType };
  }

  /**
   * Process learning from corrections
   */
  async learnFromCorrection(
    original: string,
    corrected: string,
    reason?: string,
    options?: { tenantId?: string; userId?: string; context?: Record<string, unknown> }
  ): Promise<{ patternId: string; improvement: number }> {
    // Calculate improvement score
    const improvement = this.calculateImprovement(original, corrected);

    const payload: LearningPayload = {
      source: LearningSource.CORRECTION,
      sourceId: uuidv4(),
      type: LearningType.QUALITY,
      content: {
        wrong: original,
        correct: corrected,
        reason,
        context: options?.context,
        improvement
      },
      confidence: Math.min(0.95, 0.5 + improvement * 0.3),
      tenantId: options?.tenantId,
      userId: options?.userId
    };

    const result = await this.capture(payload);

    // Decay confidence of similar wrong patterns
    await this.decaySimilarWrongPatterns(original, options?.tenantId, options?.userId);

    return { patternId: result.patternId, improvement };
  }

  /**
   * Process learning from feedback
   */
  async learnFromFeedback(
    feedback: {
      type: 'positive' | 'negative' | 'rating' | 'correction';
      score?: number;
      content?: string;
      itemType?: string;
      itemId?: string;
    },
    options?: { tenantId?: string; userId?: string }
  ): Promise<{ patternId: string; newConfidence: number }> {
    const source = feedback.type === 'correction' ? LearningSource.CORRECTION : LearningSource.FEEDBACK;
    const type = feedback.type === 'positive' ? LearningType.SUCCESS :
                 feedback.type === 'negative' ? LearningType.FAILURE :
                 LearningType.QUALITY;

    const confidence = feedback.score ? feedback.score / 5 : 0.5;

    const payload: LearningPayload = {
      source,
      sourceId: uuidv4(),
      type,
      content: {
        feedbackType: feedback.type,
        score: feedback.score,
        content: feedback.content,
        itemType: feedback.itemType,
        itemId: feedback.itemId
      },
      confidence,
      tenantId: options?.tenantId,
      userId: options?.userId
    };

    const result = await this.capture(payload);

    // If high-quality feedback, boost related patterns
    if (feedback.score && feedback.score >= 4) {
      await this.boostRelatedPatterns(
        feedback.itemType,
        feedback.itemId,
        options?.tenantId,
        options?.userId
      );
    }

    return { patternId: result.patternId, newConfidence: confidence };
  }

  /**
   * Get learned patterns based on query
   */
  async getPatterns(query: QueryLearning): Promise<{
    patterns: LearnedPattern[];
    total: number;
    hasMore: boolean;
  }> {
    const filter: Record<string, unknown> = {};

    if (query.tenantId) filter.tenantId = query.tenantId;
    if (query.userId) filter.userId = query.userId;
    if (query.type) filter.type = query.type;
    if (query.source) filter.source = query.source;
    if (query.stage) filter.stage = query.stage;
    if (query.status) filter.status = query.status;

    const limit = query.limit || 100;
    const offset = query.offset || 0;

    const [patterns, total] = await Promise.all([
      LearnedPatternModel
        .find(filter)
        .sort({ lastUpdated: -1, confidence: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      LearnedPatternModel.countDocuments(filter)
    ]);

    return {
      patterns: patterns.map(this.mapToLearnedPattern),
      total,
      hasMore: offset + patterns.length < total
    };
  }

  /**
   * Get learning insights for a tenant/user
   */
  async getInsights(options?: { tenantId?: string; userId?: string }): Promise<LearningInsights> {
    const filter: Record<string, unknown> = {};
    if (options?.tenantId) filter.tenantId = options.tenantId;
    if (options?.userId) filter.userId = options.userId;

    const [patterns, recentPatterns] = await Promise.all([
      LearnedPatternModel.find(filter).lean(),
      LearnedPatternModel
        .find(filter)
        .sort({ lastUpdated: -1 })
        .limit(20)
        .lean()
    ]);

    // Calculate statistics
    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let highConfidenceCount = 0;
    let totalConfidence = 0;

    for (const p of patterns) {
      byType[p.type] = (byType[p.type] || 0) + 1;
      bySource[p.source] = (bySource[p.source] || 0) + 1;
      if (p.confidence >= CONFIDENCE_THRESHOLDS.HIGH) highConfidenceCount++;
      totalConfidence += p.confidence;
    }

    // Find top patterns by frequency and confidence
    const topPatterns = patterns
      .sort((a, b) => (b.confidence * b.frequency) - (a.confidence * a.frequency))
      .slice(0, 10)
      .map(this.mapToLearnedPattern);

    const accuracy = patterns.length > 0 ? totalConfidence / patterns.length : 0;
    const improvementRate = patterns.length > 10
      ? patterns.filter((p) => p.confidence > 0.7).length / patterns.length
      : 0;

    return {
      totalPatterns: patterns.length,
      byType: byType as Record<LearningType, number>,
      bySource: bySource as Record<LearningSource, number>,
      topPatterns,
      recentLearning: recentPatterns.map(this.mapToLearnedPattern),
      accuracy,
      improvementRate
    };
  }

  /**
   * Run training batch process
   */
  async runTrainingBatch(options?: {
    tenantId?: string;
    batchSize?: number;
    minConfidence?: number;
  }): Promise<TrainingBatch> {
    const batchId = uuidv4();
    const startTime = new Date();

    try {
      // Create batch record
      await TrainingBatchModel.create({
        batchId,
        tenantId: options?.tenantId,
        status: 'processing',
        startedAt: startTime
      });

      // Find patterns to process
      const filter: Record<string, unknown> = { status: LearningStatus.LEARNED };
      if (options?.tenantId) filter.tenantId = options.tenantId;

      const patterns = await LearnedPatternModel
        .find(filter)
        .limit(options?.batchSize || 1000)
        .lean();

      const statistics: BatchStatistics = {
        totalPatterns: patterns.length,
        byType: {},
        bySource: {},
        highConfidenceCount: 0,
        archivedCount: 0
      };

      // Process each pattern
      for (const pattern of patterns) {
        // Update stage based on frequency
        if (pattern.frequency >= FREQUENCY_THRESHOLDS.LONG_TO_MODEL) {
          pattern.stage = LearningStage.MODEL;
          pattern.status = LearningStatus.DEPLOYED;
        } else if (pattern.frequency >= FREQUENCY_THRESHOLDS.MEDIUM_TO_LONG) {
          pattern.stage = LearningStage.LONG_TERM;
        }

        // Track statistics
        statistics.byType[pattern.type] = (statistics.byType[pattern.type] || 0) + 1;
        statistics.bySource[pattern.source] = (statistics.bySource[pattern.source] || 0) + 1;

        if (pattern.confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
          statistics.highConfidenceCount++;
        }

        // Archive low-confidence patterns
        if (pattern.confidence < CONFIDENCE_THRESHOLDS.ARCHIVE) {
          pattern.status = LearningStatus.ARCHIVED;
          statistics.archivedCount++;
        }

        await pattern.save();
      }

      const endTime = new Date();

      // Update batch with results
      await TrainingBatchModel.findOneAndUpdate(
        { batchId },
        {
          patterns: patterns.map((p) => p.patternId),
          statistics,
          status: 'completed',
          completedAt: endTime
        }
      );

      logger.info('Training batch completed', {
        batchId,
        patternsProcessed: patterns.length,
        archivedCount: statistics.archivedCount,
        durationMs: endTime.getTime() - startTime.getTime()
      });

      return {
        batchId,
        patterns: patterns.map(this.mapToLearnedPattern),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        statistics
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      await TrainingBatchModel.findOneAndUpdate(
        { batchId },
        { status: 'failed', error: message }
      );

      logger.error('Training batch failed', { batchId, error: message });
      throw error;
    }
  }

  /**
   * Archive old patterns
   */
  async archiveOldPatterns(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await LearnedPatternModel.updateMany(
      {
        stage: LearningStage.SHORT_TERM,
        status: { $ne: LearningStatus.ARCHIVED },
        lastUpdated: { $lt: cutoffDate }
      },
      {
        $set: { status: LearningStatus.ARCHIVED }
      }
    );

    logger.info('Archived old patterns', {
      count: result.modifiedCount,
      olderThanDays
    });

    return result.modifiedCount;
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private validatePayload(payload: LearningPayload): LearningPayload {
    if (!payload.source) throw new Error('Source is required');
    if (!payload.sourceId) throw new Error('Source ID is required');
    if (!payload.type) throw new Error('Type is required');
    if (!payload.content) throw new Error('Content is required');

    return {
      ...payload,
      confidence: payload.confidence ?? 0.5,
      timestamp: payload.timestamp || new Date().toISOString()
    };
  }

  private determineInitialStage(payload: LearningPayload): LearningStage {
    // High-value signals go to long-term immediately
    if (payload.source === LearningSource.CORRECTION || payload.source === LearningSource.CONVERSION) {
      return LearningStage.LONG_TERM;
    }

    // Default to short-term, will be promoted based on frequency
    return LearningStage.SHORT_TERM;
  }

  private async analyzeAndLearn(patternId: string): Promise<void> {
    const pattern = await LearnedPatternModel.findOne({ patternId });
    if (!pattern) return;

    // Update status to processing
    pattern.status = LearningStatus.PROCESSING;
    await pattern.save();

    // Perform analysis
    const newConfidence = this.calculateNewConfidence(pattern);
    pattern.confidence = newConfidence;
    pattern.status = LearningStatus.LEARNED;
    pattern.lastUpdated = new Date();

    // Check for stage promotion
    if (pattern.frequency >= FREQUENCY_THRESHOLDS.SHORT_TO_MEDIUM) {
      pattern.stage = LearningStage.LONG_TERM;
    }

    await pattern.save();
  }

  private calculateNewConfidence(pattern: ILearnedPattern): number {
    let confidence = pattern.confidence;

    // Boost based on frequency
    confidence += Math.log(pattern.frequency + 1) * 0.05;

    // Boost based on source quality
    const sourceBoost: Record<string, number> = {
      [LearningSource.CORRECTION]: 0.15,
      [LearningSource.FEEDBACK]: 0.1,
      [LearningSource.CONVERSION]: 0.2,
      [LearningSource.CHAT]: 0.05,
      [LearningSource.SIGNAL]: 0.02,
      [LearningSource.EVENT]: 0.03
    };

    confidence += sourceBoost[pattern.source] || 0;

    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, confidence));
  }

  private async learnResponsePattern(
    input: string,
    output: string,
    conversationId: string,
    tenantId?: string,
    userId?: string
  ): Promise<string | null> {
    // Check for existing similar pattern
    const existing = await LearnedPatternModel.findOne({
      tenantId,
      userId,
      source: LearningSource.CHAT,
      type: LearningType.RESPONSE_PATTERN,
      'content.input': { $regex: this.escapeRegex(input), $options: 'i' }
    });

    if (existing) {
      // Update existing pattern
      existing.frequency += 1;
      existing.content = { input, output, conversationId };
      existing.lastUpdated = new Date();
      existing.status = LearningStatus.LEARNED;
      await existing.save();
      return existing.patternId;
    }

    // Create new pattern
    const pattern = await LearnedPatternModel.create({
      patternId: uuidv4(),
      tenantId,
      userId,
      source: LearningSource.CHAT,
      type: LearningType.RESPONSE_PATTERN,
      stage: LearningStage.SHORT_TERM,
      status: LearningStatus.LEARNED,
      content: { input, output, conversationId },
      confidence: 0.5,
      frequency: 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    return pattern.patternId;
  }

  private extractIntent(content: string): string | null {
    const intentPatterns = [
      { pattern: /^(buy|purchase|order|get)\s+/i, intent: 'purchase' },
      { pattern: /^(find|search|look for|show)\s+/i, intent: 'search' },
      { pattern: /^(help|how|what|can you)/i, intent: 'help' },
      { pattern: /^(cancel|stop|remove|delete)\s+/i, intent: 'cancel' },
      { pattern: /^(info|details|tell me about|more)/i, intent: 'info' }
    ];

    for (const { pattern, intent } of intentPatterns) {
      if (pattern.test(content)) return intent;
    }

    return null;
  }

  private async learnIntent(
    intent: string,
    originalText: string,
    conversationId: string,
    tenantId?: string,
    userId?: string
  ): Promise<string | null> {
    const pattern = await LearnedPatternModel.create({
      patternId: uuidv4(),
      tenantId,
      userId,
      source: LearningSource.CHAT,
      type: LearningType.INTENT,
      stage: LearningStage.SHORT_TERM,
      status: LearningStatus.LEARNED,
      content: { intent, originalText, conversationId },
      confidence: 0.6,
      frequency: 1
    });

    return pattern.patternId;
  }

  private extractFollowupContext(messages: Array<{
    role: string;
    content: string;
  }>): Array<{ context: string; followup: string }> {
    const contexts: Array<{ context: string; followup: string }> = [];

    for (let i = 0; i < messages.length - 1; i++) {
      const current = messages[i];
      const next = messages[i + 1];

      if (current.role === 'user' && next.role === 'user') {
        // This is a follow-up
        contexts.push({
          context: current.content,
          followup: next.content
        });
      }
    }

    return contexts;
  }

  private async learnContext(
    context: string,
    followup: string,
    conversationId: string,
    tenantId?: string,
    userId?: string
  ): Promise<string | null> {
    const pattern = await LearnedPatternModel.create({
      patternId: uuidv4(),
      tenantId,
      userId,
      source: LearningSource.CHAT,
      type: LearningType.CONTEXT,
      stage: LearningStage.SHORT_TERM,
      status: LearningStatus.LEARNED,
      content: { context, followup, conversationId },
      confidence: 0.5,
      frequency: 1
    });

    return pattern.patternId;
  }

  private actionToLearningType(action: string): LearningType {
    const map: Record<string, LearningType> = {
      click: LearningType.PREFERENCE,
      view: LearningType.INTEREST,
      search: LearningType.NEED,
      purchase: LearningType.SUCCESS,
      cancel: LearningType.FAILURE,
      error: LearningType.FAILURE
    };
    return map[action] || LearningType.PREFERENCE;
  }

  private actionToConfidence(action: string): number {
    const map: Record<string, number> = {
      purchase: 0.9,
      error: 0.85,
      cancel: 0.75,
      search: 0.6,
      click: 0.5,
      view: 0.4
    };
    return map[action] || 0.5;
  }

  private calculateImprovement(original: string, corrected: string): number {
    // Simple heuristic: improvement based on length difference and content difference
    const lengthDiff = Math.abs(corrected.length - original.length) / Math.max(original.length, corrected.length);
    const wordDiff = Math.abs(corrected.split(' ').length - original.split(' ').length) / Math.max(original.split(' ').length, 1);

    return Math.min(1, (lengthDiff + wordDiff) / 2 + 0.5);
  }

  private async decaySimilarWrongPatterns(
    wrongContent: string,
    tenantId?: string,
    userId?: string
  ): Promise<void> {
    const filter: Record<string, unknown> = {
      tenantId,
      userId,
      source: LearningSource.CORRECTION,
      type: LearningType.FAILURE
    };

    const patterns = await LearnedPatternModel.find(filter);

    for (const pattern of patterns) {
      const content = pattern.content as Record<string, unknown>;
      if (content.wrong && typeof content.wrong === 'string') {
        // Simple similarity check
        const similarity = this.calculateSimilarity(wrongContent, content.wrong);
        if (similarity > 0.7) {
          pattern.confidence *= 0.8; // Decay confidence
          if (pattern.confidence < CONFIDENCE_THRESHOLDS.ARCHIVE) {
            pattern.status = LearningStatus.ARCHIVED;
          }
          await pattern.save();
        }
      }
    }
  }

  private calculateSimilarity(a: string, b: string): number {
    const aWords = new Set(a.toLowerCase().split(/\s+/));
    const bWords = new Set(b.toLowerCase().split(/\s+/));

    const intersection = new Set([...aWords].filter((x) => bWords.has(x)));
    const union = new Set([...aWords, ...bWords]);

    return intersection.size / union.size;
  }

  private async boostRelatedPatterns(
    itemType?: string,
    itemId?: string,
    tenantId?: string,
    userId?: string
  ): Promise<void> {
    if (!itemType || !itemId) return;

    const patterns = await LearnedPatternModel.find({
      tenantId,
      userId,
      'content.itemType': itemType,
      'content.itemId': itemId
    });

    for (const pattern of patterns) {
      pattern.confidence = Math.min(1, pattern.confidence + 0.1);
      pattern.frequency += 1;
      await pattern.save();
    }
  }

  private mapToLearnedPattern(doc: Record<string, unknown>): LearnedPattern {
    return {
      id: doc.patternId as string,
      tenantId: doc.tenantId as string | undefined,
      userId: doc.userId as string | undefined,
      source: doc.source as LearningSource,
      type: doc.type as LearningType,
      stage: doc.stage as LearningStage,
      status: doc.status as LearningStatus,
      content: doc.content as Record<string, unknown>,
      confidence: doc.confidence as number,
      frequency: doc.frequency as number,
      lastUpdated: doc.lastUpdated as string,
      createdAt: doc.createdAt as string,
      expiresAt: doc.expiresAt as string | undefined,
      metadata: doc.metadata as Record<string, unknown> | undefined
    };
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Singleton instance
export const learner = new Learner();
