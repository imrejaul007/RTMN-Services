/**
 * Signal Ingestion Service
 *
 * Handles signal ingestion, deduplication, and enrichment.
 */

import { v4 as uuidv4 } from 'uuid';
import { IntentSignalModel, IIntentSignal } from '../models/index.js';
import { cacheGet, cacheSet, cacheDelete } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { signalsIngested, signalsDeduplicated } from './metrics.js';

// ============================================================================
// TYPES
// ============================================================================

export interface SignalInput {
  source: string;
  sourceService: string;
  userId: string;
  eventType: string;
  category: string;
  intentKey: string;
  intentQuery?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export interface IngestResult {
  success: boolean;
  signalId?: string;
  duplicate?: boolean;
  error?: string;
}

export interface BatchIngestResult {
  success: boolean;
  processed: number;
  duplicates: number;
  failed: number;
  signalIds: string[];
  errors: Array<{ index: number; error: string }>;
}

export interface SignalStats {
  total: number;
  bySource: Array<{ _id: string; count: number }>;
  byEventType: Array<{ _id: string; count: number }>;
  byCategory: Array<{ _id: string; count: number }>;
}

// ============================================================================
// DEDUP WINDOW (in seconds)
// ============================================================================

const DEDUP_WINDOW_SECONDS = 60;

// ============================================================================
// SIGNAL INGESTION SERVICE
// ============================================================================

class SignalIngestionService {
  /**
   * Ingest a single signal
   */
  async ingestSignal(input: SignalInput): Promise<IngestResult> {
    try {
      // Generate signal ID
      const signalId = uuidv4();

      // Check for duplicate (same user + event + category within time window)
      const dedupKey = `${input.userId}:${input.eventType}:${input.category}:${input.intentKey}`;
      const cached = await cacheGet(`dedup:${dedupKey}`);

      if (cached) {
        signalsDeduplicated.inc();
        return {
          success: true,
          signalId: cached,
          duplicate: true,
        };
      }

      // Create signal document
      const signal = new IntentSignalModel({
        signalId,
        source: input.source.toLowerCase(),
        sourceService: input.sourceService,
        userId: input.userId,
        eventType: input.eventType,
        category: input.category.toUpperCase(),
        intentKey: input.intentKey,
        intentQuery: input.intentQuery,
        confidence: this.calculateConfidence(input),
        enriched: false,
        timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
        metadata: input.metadata,
      });

      await signal.save();

      // Set dedup cache
      await cacheSet(`dedup:${dedupKey}`, signalId, DEDUP_WINDOW_SECONDS);

      // Record metrics
      signalsIngested.inc({
        source: input.source,
        event_type: input.eventType,
        status: 'success',
      });

      // Optionally enrich signal (async)
      this.enrichSignal(signal).catch((err) => {
        logger.warn('Signal enrichment failed', { signalId, error: err.message });
      });

      return {
        success: true,
        signalId,
      };
    } catch (error) {
      logger.error('Signal ingestion failed', { error, input });
      signalsIngested.inc({
        source: input.source,
        event_type: input.eventType,
        status: 'error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Batch ingest multiple signals
   */
  async batchIngest(inputs: SignalInput[]): Promise<BatchIngestResult> {
    const result: BatchIngestResult = {
      success: true,
      processed: 0,
      duplicates: 0,
      failed: 0,
      signalIds: [],
      errors: [],
    };

    for (let i = 0; i < inputs.length; i++) {
      const ingestResult = await this.ingestSignal(inputs[i]);

      if (ingestResult.duplicate) {
        result.duplicates++;
        result.signalIds.push(ingestResult.signalId!);
      } else if (ingestResult.success) {
        result.processed++;
        result.signalIds.push(ingestResult.signalId!);
      } else {
        result.failed++;
        result.errors.push({
          index: i,
          error: ingestResult.error || 'Unknown error',
        });
      }
    }

    result.success = result.failed === 0;

    logger.info('Batch ingestion completed', {
      total: inputs.length,
      processed: result.processed,
      duplicates: result.duplicates,
      failed: result.failed,
    });

    return result;
  }

  /**
   * Get user signals
   */
  async getUserSignals(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<IIntentSignal[]> {
    return IntentSignalModel.find({ userId })
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
  }

  /**
   * Get signal by ID
   */
  async getSignalById(signalId: string): Promise<IIntentSignal | null> {
    return IntentSignalModel.findOne({ signalId }).lean();
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<SignalStats> {
    return IntentSignalModel.getStats();
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Calculate signal confidence based on event type
   */
  private calculateConfidence(input: SignalInput): number {
    // Base confidence by event type
    const eventConfidences: Record<string, number> = {
      fulfilled: 0.95,
      checkout_start: 0.85,
      cart_add: 0.75,
      wishlist: 0.6,
      view: 0.4,
      search: 0.3,
    };

    let confidence = eventConfidences[input.eventType] || 0.5;

    // Boost for enriched data
    if (input.intentQuery) {
      confidence += 0.1;
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Enrich signal with additional data
   */
  private async enrichSignal(signal: IIntentSignal): Promise<void> {
    // This would call HOJAI AI gateway for enrichment
    // For now, just mark as enriched
    await IntentSignalModel.updateOne(
      { signalId: signal.signalId },
      { enriched: true }
    );
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const signalIngestionService = new SignalIngestionService();