/**
 * HOJAI Foundation SDK Configuration
 *
 * All services are routed through the RTMN Hub (default: http://localhost:4399).
 * The Hub proxies to individual backend services — no need to configure each one.
 */

export interface HojaiConfig {
  /**
   * Base URL for the RTMN Hub (default: http://localhost:4399).
   * The Hub routes /api/identity/* → CorpID (4702),
   * /api/memory/* → MemoryOS (4703), etc.
   */
  baseUrl?: string;
  /**
   * Request timeout in ms (default: 10000)
   */
  timeout?: number;
  /**
   * Max retries on transient failure (default: 3)
   */
  maxRetries?: number;
  /**
   * Custom fetch implementation (for testing / Node <18)
   */
  fetchImpl?: typeof fetch;
  /**
   * Optional logger (default: no-op)
   */
  logger?: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => void;
}

export const DEFAULT_CONFIG: Required<Omit<HojaiConfig, 'fetchImpl' | 'logger'>> = {
  baseUrl: 'http://localhost:4399',
  timeout: 10000,
  maxRetries: 3
};

export function resolveConfig(input: HojaiConfig): Required<Omit<HojaiConfig, 'fetchImpl' | 'logger'>> & Pick<Required<HojaiConfig>, 'fetchImpl' | 'logger'> {
  return {
    ...DEFAULT_CONFIG,
    ...input,
    fetchImpl: input.fetchImpl ?? globalThis.fetch,
    logger: input.logger ?? (() => {})
  };
}
