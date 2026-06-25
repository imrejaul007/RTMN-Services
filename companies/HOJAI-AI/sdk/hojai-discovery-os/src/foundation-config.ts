/**
 * DiscoveryOS SDK - shared config.
 */
export interface HojaiConfig {
  apiKey?: string;
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
  logger?: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => void;
}
export const DEFAULT_CONFIG: Required<Omit<HojaiConfig, 'apiKey' | 'fetchImpl' | 'logger'>> = {
  baseUrl: 'https://api.hojai.ai', timeout: 10000, maxRetries: 3
};
export function resolveConfig(input: HojaiConfig): Required<Omit<HojaiConfig, 'apiKey' | 'fetchImpl' | 'logger'>> & Pick<HojaiConfig, 'apiKey' | 'fetchImpl' | 'logger'> {
  return { ...DEFAULT_CONFIG, ...input };
}
