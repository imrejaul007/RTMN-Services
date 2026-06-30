/**
 * HOJAI Foundation SDK Configuration (shared with @hojai/foundation)
 */
export const DEFAULT_CONFIG = {
    baseUrl: 'https://api.hojai.ai',
    timeout: 10000,
    maxRetries: 3
};
export function resolveConfig(input) {
    return { ...DEFAULT_CONFIG, ...input };
}
//# sourceMappingURL=foundation-config.js.map