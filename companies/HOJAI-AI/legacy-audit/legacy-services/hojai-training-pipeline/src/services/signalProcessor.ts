/**
 * HOJAI Training Pipeline - Signal Processor
 * Process signals from various sources: clicks, views, searches, actions, conversions, errors
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SignalEvent,
  SignalEventSchema,
  LearningSource,
  LearningType,
  LearningStage,
  LearningStatus,
  LearnedPattern,
  ChatMessage,
  Correction,
  Feedback,
  LearningPayload
} from '../types/index.js';
import { LearnedPattern as LearnedPatternModel, LearningEvent } from '../models/learning.js';
import { logger } from '../utils/logger.js';

/**
 * Signal Processor - Process user signals and extract learning patterns
 */
export class SignalProcessor {
  private readonly highValueSignals = new Set(['conversion', 'error', 'purchase', 'signup']);
  private readonly signalToLearningType: Record<string, LearningType> = {
    click: LearningType.PREFERENCE,
    view: LearningType.INTEREST,
    search: LearningType.NEED,
    action: LearningType.RESPONSE_PATTERN,
    conversion: LearningType.SUCCESS,
    error: LearningType.FAILURE
  };

  /**
   * Process a raw signal event
   */
  async processSignal(signal: unknown): Promise<{ success: boolean; patternId?: string; error?: string }> {
    try {
      // Validate signal
      const validatedSignal = SignalEventSchema.parse(signal);
      const signalEvent = validatedSignal as SignalEvent;

      // Create learning event for audit
      const eventId = uuidv4();
      await LearningEvent.create({
        eventId,
        tenantId: signalEvent.tenantId,
        userId: signalEvent.userId,
        source: LearningSource.SIGNAL,
        sourceId: signalEvent.signalId,
        type: this.signalToLearningType[signalEvent.type] || LearningType.PREFERENCE,
        rawContent: signalEvent as unknown as Record<string, unknown>
      });

      // Extract pattern from signal
      const pattern = await this.extractPatternFromSignal(signalEvent);

      if (pattern) {
        // Save or update pattern
        await this.upsertPattern(pattern);

        logger.info('Signal processed', {
          signalId: signalEvent.signalId,
          type: signalEvent.type,
          patternId: pattern.id
        });

        return { success: true, patternId: pattern.id };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Signal processing failed', { error: message, signal });
      return { success: false, error: message };
    }
  }

  /**
   * Process multiple signals in batch
   */
  async processBatch(
    signals: unknown[]
  ): Promise<{ processed: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;

    for (const signal of signals) {
      const result = await this.processSignal(signal);
      if (result.success) {
        processed++;
      } else {
        failed++;
        if (result.error) {
          errors.push(result.error);
        }
      }
    }

    logger.info('Batch signal processing complete', { processed, failed, total: signals.length });

    return { processed, failed, errors };
  }

  /**
   * Extract learning pattern from signal event
   */
  private async extractPatternFromSignal(
    signal: SignalEvent
  ): Promise<LearnedPattern | null> {
    // Determine stage based on signal value
    const stage = this.highValueSignals.has(signal.type)
      ? LearningStage.LONG_TERM
      : LearningStage.SHORT_TERM;

    // Build pattern content from signal
    const content: Record<string, unknown> = {
      entityType: signal.entityType,
      entityId: signal.entityId,
      properties: signal.properties,
      lastSignal: signal.timestamp
    };

    // For search signals, extract intent
    if (signal.type === 'search' && signal.properties?.query) {
      content.intent = signal.properties.query;
      content.intentType = LearningType.INTENT;
    }

    // For conversion signals, mark as success pattern
    if (signal.type === 'conversion') {
      content.conversionType = signal.properties?.type || 'unknown';
      content.conversionValue = signal.properties?.value;
    }

    // Calculate initial confidence based on signal type
    const baseConfidence = this.getBaseConfidence(signal.type);

    return {
      id: uuidv4(),
      tenantId: signal.tenantId,
      userId: signal.userId,
      source: LearningSource.SIGNAL,
      type: this.signalToLearningType[signal.type] || LearningType.PREFERENCE,
      stage,
      status: LearningStatus.CAPTURED,
      content,
      confidence: baseConfidence,
      frequency: 1,
      lastUpdated: signal.timestamp,
      createdAt: signal.timestamp
    };
  }

  /**
   * Get base confidence score based on signal type
   */
  private getBaseConfidence(type: string): number {
    const confidenceMap: Record<string, number> = {
      conversion: 0.9,
      error: 0.85,
      purchase: 0.95,
      signup: 0.9,
      action: 0.7,
      click: 0.5,
      view: 0.4,
      search: 0.6
    };
    return confidenceMap[type] || 0.5;
  }

  /**
   * Upsert pattern (update if exists, create if not)
   */
  private async upsertPattern(pattern: LearnedPattern): Promise<void> {
    const existing = await LearnedPatternModel.findOne({
      tenantId: pattern.tenantId,
      userId: pattern.userId,
      source: pattern.source,
      type: pattern.type,
      stage: pattern.stage
    });

    if (existing) {
      // Update existing pattern
      existing.frequency += 1;
      existing.confidence = Math.min(0.99, existing.confidence + 0.05);
      existing.content = { ...existing.content, ...pattern.content };
      existing.lastUpdated = new Date();
      existing.status = LearningStatus.LEARNED;

      // Move to long-term if high frequency
      if (existing.frequency >= 5) {
        existing.stage = LearningStage.LONG_TERM;
      }

      await existing.save();
    } else {
      // Create new pattern
      await LearnedPatternModel.create({
        patternId: pattern.id,
        tenantId: pattern.tenantId,
        userId: pattern.userId,
        source: pattern.source,
        type: pattern.type,
        stage: pattern.stage,
        status: pattern.status,
        content: pattern.content,
        confidence: pattern.confidence,
        frequency: pattern.frequency,
        metadata: pattern.metadata
      });
    }
  }

  /**
   * Process conversation for learning
   */
  async processConversation(
    conversationId: string,
    messages: ChatMessage[],
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; patternsCreated: number; error?: string }> {
    try {
      if (messages.length < 2) {
        return { success: true, patternsCreated: 0 };
      }

      let patternsCreated = 0;

      // Learn response patterns from conversation
      for (let i = 0; i < messages.length - 1; i++) {
        const userMsg = messages[i];
        const assistantMsg = messages[i + 1];

        if (userMsg.role === 'user' && assistantMsg.role === 'assistant') {
          // Create response pattern
          const pattern: LearnedPattern = {
            id: uuidv4(),
            tenantId: userMsg.tenantId,
            userId: userMsg.userId,
            source: LearningSource.CHAT,
            type: LearningType.RESPONSE_PATTERN,
            stage: LearningStage.SHORT_TERM,
            status: LearningStatus.CAPTURED,
            content: {
              input: userMsg.content,
              output: assistantMsg.content,
              conversationId,
              messageIndex: i
            },
            confidence: 0.5,
            frequency: 1,
            lastUpdated: new Date().toISOString(),
            createdAt: new Date().toISOString()
          };

          await LearnedPatternModel.create({
            patternId: pattern.id,
            tenantId: pattern.tenantId,
            userId: pattern.userId,
            source: pattern.source,
            type: pattern.type,
            stage: pattern.stage,
            status: pattern.status,
            content: pattern.content,
            confidence: pattern.confidence,
            frequency: pattern.frequency
          });

          patternsCreated++;
        }
      }

      // Learn intent patterns
      const intents = this.extractIntents(messages);
      for (const intent of intents) {
        await LearnedPatternModel.create({
          patternId: uuidv4(),
          tenantId: intent.tenantId,
          userId: intent.userId,
          source: LearningSource.CHAT,
          type: LearningType.INTENT,
          stage: LearningStage.SHORT_TERM,
          status: LearningStatus.CAPTURED,
          content: intent.content,
          confidence: intent.confidence,
          frequency: 1
        });
        patternsCreated++;
      }

      // Learn context patterns
      const contexts = this.extractContexts(messages);
      for (const context of contexts) {
        await LearnedPatternModel.create({
          patternId: uuidv4(),
          tenantId: context.tenantId,
          userId: context.userId,
          source: LearningSource.CHAT,
          type: LearningType.CONTEXT,
          stage: LearningStage.SHORT_TERM,
          status: LearningStatus.CAPTURED,
          content: context.content,
          confidence: context.confidence,
          frequency: 1
        });
        patternsCreated++;
      }

      logger.info('Conversation processed', { conversationId, patternsCreated, messageCount: messages.length });

      return { success: true, patternsCreated };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Conversation processing failed', { error: message, conversationId });
      return { success: false, patternsCreated: 0, error: message };
    }
  }

  /**
   * Process correction for learning
   */
  async processCorrection(
    correction: Correction
  ): Promise<{ success: boolean; patternId?: string; error?: string }> {
    try {
      const eventId = uuidv4();

      // Create learning event
      await LearningEvent.create({
        eventId,
        source: LearningSource.CORRECTION,
        sourceId: correction.correctionId,
        type: LearningType.QUALITY,
        rawContent: correction as unknown as Record<string, unknown>
      });

      // Create failure pattern from correction
      const pattern = await LearnedPatternModel.create({
        patternId: uuidv4(),
        tenantId: correction.tenantId,
        userId: correction.userId,
        source: LearningSource.CORRECTION,
        type: LearningType.FAILURE,
        stage: LearningStage.LONG_TERM,
        status: LearningStatus.LEARNED,
        content: {
          wrongResponse: correction.originalContent,
          correctResponse: correction.correctedContent,
          reason: correction.reason,
          context: correction.context
        },
        confidence: 0.8,
        frequency: 1,
        metadata: {
          correctionId: correction.correctionId
        }
      });

      logger.info('Correction processed', {
        correctionId: correction.correctionId,
        patternId: pattern.patternId
      });

      return { success: true, patternId: pattern.patternId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Correction processing failed', { error: message });
      return { success: false, error: message };
    }
  }

  /**
   * Process feedback for learning
   */
  async processFeedback(
    feedback: Feedback
  ): Promise<{ success: boolean; patternId?: string; error?: string }> {
    try {
      const eventId = uuidv4();

      // Create learning event
      await LearningEvent.create({
        eventId,
        source: LearningSource.FEEDBACK,
        sourceId: feedback.feedbackId,
        type: feedback.type === 'positive' ? LearningType.SUCCESS : LearningType.FAILURE,
        rawContent: feedback as unknown as Record<string, unknown>
      });

      // Determine learning type based on feedback
      const learningType = feedback.type === 'positive'
        ? LearningType.SUCCESS
        : feedback.type === 'negative'
          ? LearningType.FAILURE
          : LearningType.QUALITY;

      // Calculate confidence from score
      const confidence = feedback.score ? feedback.score / 5 : 0.5;

      // Create pattern from feedback
      const pattern = await LearnedPatternModel.create({
        patternId: uuidv4(),
        tenantId: feedback.tenantId,
        userId: feedback.userId,
        source: LearningSource.FEEDBACK,
        type: learningType,
        stage: LearningStage.LONG_TERM,
        status: LearningStatus.LEARNED,
        content: {
          feedbackType: feedback.type,
          score: feedback.score,
          content: feedback.content,
          itemType: feedback.itemType,
          itemId: feedback.itemId
        },
        confidence,
        frequency: 1,
        metadata: {
          feedbackId: feedback.feedbackId
        }
      });

      logger.info('Feedback processed', {
        feedbackId: feedback.feedbackId,
        type: feedback.type,
        patternId: pattern.patternId
      });

      return { success: true, patternId: pattern.patternId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Feedback processing failed', { error: message });
      return { success: false, error: message };
    }
  }

  /**
   * Extract intents from messages
   */
  private extractIntents(messages: ChatMessage[]): Array<{
    tenantId?: string;
    userId?: string;
    content: Record<string, unknown>;
    confidence: number;
  }> {
    const intents: Array<{
      tenantId?: string;
      userId?: string;
      content: Record<string, unknown>;
      confidence: number;
    }> = [];

    // Simple keyword-based intent detection
    const intentKeywords: Record<string, string[]> = {
      purchase: ['buy', 'purchase', 'order', 'get', 'want'],
      search: ['find', 'search', 'look for', 'show me'],
      help: ['help', 'how', 'what', 'can you', '?'],
      cancel: ['cancel', 'stop', 'remove', 'delete'],
      info: ['info', 'details', 'tell me about', 'more']
    };

    for (const msg of messages) {
      if (msg.role !== 'user') continue;

      const lowerContent = msg.content.toLowerCase();

      for (const [intent, keywords] of Object.entries(intentKeywords)) {
        if (keywords.some((kw) => lowerContent.includes(kw))) {
          intents.push({
            tenantId: msg.tenantId,
            userId: msg.userId,
            content: {
              intent,
              originalText: msg.content,
              conversationId: msg.conversationId
            },
            confidence: 0.7
          });
          break;
        }
      }
    }

    return intents;
  }

  /**
   * Extract context from messages
   */
  private extractContexts(messages: ChatMessage[]): Array<{
    tenantId?: string;
    userId?: string;
    content: Record<string, unknown>;
    confidence: number;
  }> {
    const contexts: Array<{
      tenantId?: string;
      userId?: string;
      content: Record<string, unknown>;
      confidence: number;
    }> = [];

    // Track topic transitions
    let currentTopic = '';
    const topicKeywords = ['about', 'regarding', 'concerning', 'topic', 'on'];

    for (const msg of messages) {
      const lowerContent = msg.content.toLowerCase();

      // Detect topic mentions
      for (const kw of topicKeywords) {
        if (lowerContent.includes(kw)) {
          const parts = lowerContent.split(kw);
          if (parts.length > 1) {
            currentTopic = parts[1].trim().split(/[.,!?]/)[0];
            if (currentTopic.length > 2) {
              contexts.push({
                tenantId: msg.tenantId,
                userId: msg.userId,
                content: {
                  topic: currentTopic,
                  contextType: 'topic',
                  conversationId: msg.conversationId
                },
                confidence: 0.6
              });
            }
          }
          break;
        }
      }
    }

    return contexts;
  }
}

// Singleton instance
export const signalProcessor = new SignalProcessor();
