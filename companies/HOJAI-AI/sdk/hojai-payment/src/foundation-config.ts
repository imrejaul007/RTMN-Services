/**
 * HOJAI Payment SDK — shared config.
 *
 * Same HojaiConfig shape used across all @hojai/* SDKs (foundation, sutar,
 * nexha, etc.). Lets users plug in apiKey, baseUrl, timeout, maxRetries,
 * fetchImpl (for testing), and logger.
 */

export interface HojaiConfig {
  /** API key (issued by HOJAI Cloud / RABTUL) */
  apiKey?: string;
  /** Base URL for the payment hub. Defaults to https://api.hojai.ai */
  baseUrl: string;
  /** Request timeout in ms (default: 10000) */
  timeout?: number;
  /** Max retries on transient failure (default: 3) */
  maxRetries?: number;
  /** Custom fetch implementation (for testing/proxies) */
  fetchImpl?: typeof fetch;
  /** Optional logger */
  logger?: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => void;
}

export const DEFAULT_CONFIG: Required<Omit<HojaiConfig, 'apiKey' | 'fetchImpl' | 'logger'>> = {
  baseUrl: 'https://api.hojai.ai',
  timeout: 10000,
  maxRetries: 3
};

export function resolveConfig(input: HojaiConfig): Required<Omit<HojaiConfig, 'apiKey' | 'fetchImpl' | 'logger'>> & Pick<HojaiConfig, 'apiKey' | 'fetchImpl' | 'logger'> {
  return { ...DEFAULT_CONFIG, ...input };
}
