/**
 * HOJAI Foundation SDK Configuration
 *
 * All services are routed through the RTMN Hub (default: http://localhost:4399).
 * The Hub proxies to individual backend services — no need to configure each one.
 */
export const DEFAULT_CONFIG = {
    baseUrl: 'http://localhost:4399',
    timeout: 10000,
    maxRetries: 3
};
export function resolveConfig(input) {
    return {
        ...DEFAULT_CONFIG,
        ...input,
        fetchImpl: input.fetchImpl ?? globalThis.fetch,
        logger: input.logger ?? (() => { })
    };
}
