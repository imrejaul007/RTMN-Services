import { logger } from '../../shared/logger';
/**
 * Idempotency helper for webhook handlers
 *
 * Uses Supabase as a distributed cache to prevent duplicate webhook processing.
 * Each webhook request with an x-idempotency-key header is checked against
 * the database before processing, and the result is cached for 24 hours.
 */

import { createClient } from '@supabase/supabase-js';

const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours

export interface IdempotencyResult {
  cached: boolean;
  result?: unknown;
}

interface IdempotencyCacheRow {
  result: unknown;
  processed_at: string;
}

/**
 * Check if a webhook with this idempotency key was already processed.
 * Returns the cached result if found.
 */
export async function checkIdempotency(
  idempotencyKey: string,
  supabase: any
): Promise<IdempotencyResult | null> {
  const { data, error } = await supabase
    .from('idempotency_cache')
    .select('result, processed_at')
    .eq('key', idempotencyKey)
    .single();

  if (error || !data) {
    return null; // Not found, proceed with processing
  }

  // Check if cache entry has expired
  const processedAt = new Date(data.processed_at);
  const now = new Date();
  const secondsSinceProcessing = (now.getTime() - processedAt.getTime()) / 1000;

  if (secondsSinceProcessing > IDEMPOTENCY_TTL_SECONDS) {
    // Cache expired, allow reprocessing
    await supabase
      .from('idempotency_cache')
      .delete()
      .eq('key', idempotencyKey);
    return null;
  }

  return {
    cached: true,
    result: data.result,
  };
}

/**
 * Store the result of webhook processing for future idempotency checks.
 */
export async function storeIdempotencyResult(
  idempotencyKey: string,
  result: unknown,
  supabase: any
): Promise<void> {
  const { error } = await supabase
    .from('idempotency_cache')
    .upsert({
      key: idempotencyKey,
      result: typeof result === 'object' ? JSON.parse(JSON.stringify(result)) : result,
      processed_at: new Date().toISOString(),
    }, {
      onConflict: 'key',
    });

  if (error) {
    logger.error('[Idempotency] Failed to store result:', error);
    // Don't throw - we don't want to fail the webhook just because caching failed
  }
}

/**
 * Remove idempotency key after successful processing (optional cleanup).
 * Usually not needed since we rely on TTL expiration.
 */
export async function clearIdempotencyKey(
  idempotencyKey: string,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  await supabase
    .from('idempotency_cache')
    .delete()
    .eq('key', idempotencyKey);
}
