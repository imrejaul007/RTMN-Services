/**
 * Internal utilities for HOJAI Foundation SDK
 */
// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------
export class HojaiApiError extends Error {
    code;
    statusCode;
    constructor(code, message, statusCode) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'HojaiApiError';
    }
}
export class HojaiAuthError extends Error {
    constructor(message) {
        super(message);
        this.name = 'HojaiAuthError';
    }
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Build a full URL from a base and path */
export function buildUrl(base, path) {
    return new URL(path, base).toString();
}
/** Exponential backoff with 30s cap */
export function backoff(attempt, base = 300) {
    return Math.min(base * Math.pow(2, attempt), 30_000);
}
/** Sleep utility */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export async function request(config, method, path, body, options = {}) {
    const fetchImpl = config.fetchImpl ?? globalThis.fetch;
    const timeout = options.timeout ?? config.timeout ?? 10_000;
    const maxRetries = config.maxRetries ?? 3;
    const url = buildUrl(config.baseUrl ?? 'http://localhost:4399', path);
    const log = config.logger ?? (() => { });
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    if (config.authState.accessToken) {
        headers['Authorization'] = `Bearer ${config.authState.accessToken}`;
    }
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
            log('debug', `${method} ${url}`, { attempt, body });
            const res = await fetchImpl(url, {
                method,
                headers,
                body: body !== undefined ? JSON.stringify(body) : undefined,
                signal: controller.signal
            });
            clearTimeout(timer);
            // 401 → auth error (caller should call login() / refresh)
            if (res.status === 401) {
                throw new HojaiAuthError(`Authentication required (401). Call hojai.login() first.`);
            }
            // 5xx → retry
            if (res.status >= 500 && attempt < maxRetries) {
                await sleep(backoff(attempt));
                continue;
            }
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const json = await res.json();
                // RTMN error envelope: { success: false, error: { code, message } }
                if (json && typeof json === 'object' && !json.success && json.error) {
                    const err = json.error;
                    throw new HojaiApiError(err.code ?? 'UNKNOWN_ERROR', err.message ?? `HTTP ${res.status}`, res.status);
                }
                // Unwrap data/twin/policy wrappers when present
                if (json && typeof json === 'object') {
                    if ('data' in json)
                        return json.data;
                    if ('twin' in json)
                        return json.twin;
                    if ('user' in json)
                        return json.user;
                }
                return json;
            }
            return (await res.text());
        }
        catch (err) {
            clearTimeout(timer);
            if (err instanceof HojaiApiError || err instanceof HojaiAuthError)
                throw err;
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < maxRetries) {
                await sleep(backoff(attempt));
                continue;
            }
        }
    }
    throw lastError ?? new Error('Request failed after retries');
}
