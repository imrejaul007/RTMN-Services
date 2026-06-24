export interface HojaiConfig {
  apiKey?: string;
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
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

export function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
export function backoff(attempt: number, base: number = 300): number { return Math.min(base * Math.pow(2, attempt), 30000); }

export function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) { for (const v of value) usp.append(key, String(v)); }
    else { usp.set(key, String(value)); }
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export async function request<T = unknown>(
  config: HojaiConfig,
  method: string,
  path: string,
  body?: unknown,
  options: { timeout?: number; maxRetries?: number; headers?: Record<string, string> } = {}
): Promise<T> {
  const fetchImpl = config.fetchImpl || globalThis.fetch;
  const timeout = options.timeout ?? config.timeout ?? 10000;
  const maxRetries = options.maxRetries ?? config.maxRetries ?? 3;
  const url = new URL(path, config.baseUrl).toString();

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetchImpl(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          ...options.headers
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) {
        if (res.status >= 500 && attempt < maxRetries) { await sleep(backoff(attempt)); continue; }
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) return (await res.json()) as T;
      return (await res.text()) as unknown as T;
    } catch (err) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) { await sleep(backoff(attempt)); continue; }
    }
  }
  throw lastError || new Error('Request failed');
}
