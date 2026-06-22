"use strict";
/**
 * Hojai Core - Configuration Schema & Validation
 * Version: 1.0.0 | Date: June 12, 2026
 * Purpose: Zod-based environment variable validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationError = exports.sharedSchema = exports.eventBusSchema = exports.intelligenceSchema = exports.hojaiCoreSchema = exports.serviceConfigSchema = void 0;
exports.validateConfig = validateConfig;
exports.validateServiceConfig = validateServiceConfig;
exports.validateHojaiCoreConfig = validateHojaiCoreConfig;
exports.validateIntelligenceConfig = validateIntelligenceConfig;
exports.validateEventBusConfig = validateEventBusConfig;
exports.validateSharedConfig = validateSharedConfig;
exports.getConfig = getConfig;
exports.clearConfigCache = clearConfigCache;
exports.getCorsOrigins = getCorsOrigins;
exports.isCorsOriginAllowed = isCorsOriginAllowed;
const zod_1 = require("zod");
// ============================================
// SCHEMAS
// ============================================
/**
 * Service configuration schema
 * Validates all environment variables for Hojai Core services
 */
exports.serviceConfigSchema = zod_1.z.object({
    // Required
    MONGODB_URI: zod_1.z.string().url({
        message: 'MONGODB_URI must be a valid MongoDB connection string'
    }),
    // JWT Configuration
    JWT_SECRET: zod_1.z.string().min(32, {
        message: 'JWT_SECRET must be at least 32 characters for security'
    }),
    // Optional with defaults
    PORT: zod_1.z.coerce.number().int().min(1).max(65535).default(3000),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    // CORS - comma-separated list of origins
    // Empty string = no CORS (recommended for production)
    CORS_ORIGINS: zod_1.z.string().default(''),
    // Redis (optional)
    REDIS_URL: zod_1.z.string().url().optional(),
    // Service registry
    SERVICE_NAME: zod_1.z.string().default('hojai-service'),
    SERVICE_VERSION: zod_1.z.string().default('1.0.0'),
});
/**
 * HOJAI Core specific schema
 */
exports.hojaiCoreSchema = exports.serviceConfigSchema.extend({
    // HOJAI Core services
    HOJAI_GATEWAY: zod_1.z.string().url().default('http://localhost:4500'),
    HOJAI_GOVERNANCE: zod_1.z.string().url().default('http://localhost:4501'),
    HOJAI_EVENT: zod_1.z.string().url().default('http://localhost:4510'),
    HOJAI_MEMORY: zod_1.z.string().url().default('http://localhost:4520'),
    HOJAI_INTELLIGENCE: zod_1.z.string().url().default('http://localhost:4530'),
    HOJAI_AGENTS: zod_1.z.string().url().default('http://localhost:4550'),
    HOJAI_WORKFLOWS: zod_1.z.string().url().default('http://localhost:4560'),
    HOJAI_COMMUNICATIONS: zod_1.z.string().url().default('http://localhost:4570'),
    HOJAI_HYPERLOCAL: zod_1.z.string().url().default('http://localhost:4580'),
    HOJAI_DATA: zod_1.z.string().url().default('http://localhost:4590'),
    HOJAI_IDENTITY: zod_1.z.string().url().default('http://localhost:4600'),
    HOJAI_ANALYTICS: zod_1.z.string().url().default('http://localhost:4610'),
    // RABTUL Services
    RABTUL_AUTH: zod_1.z.string().url().default('http://localhost:4002'),
    RABTUL_PAYMENT: zod_1.z.string().url().default('http://localhost:4001'),
    RABTUL_WALLET: zod_1.z.string().url().default('http://localhost:4004'),
    RABTUL_NOTIFICATION: zod_1.z.string().url().default('http://localhost:4005'),
});
/**
 * HOJAI Intelligence specific schema
 */
exports.intelligenceSchema = exports.hojaiCoreSchema.extend({
    // ML Configuration
    ML_MODEL_PATH: zod_1.z.string().optional(),
    ML_BATCH_SIZE: zod_1.z.coerce.number().int().min(1).max(1000).default(32),
    ML_MAX_CONCURRENT_PREDICTIONS: zod_1.z.coerce.number().int().min(1).max(100).default(10),
});
/**
 * HOJAI Event Bus specific schema
 */
exports.eventBusSchema = exports.hojaiCoreSchema.extend({
    // Event Bus Configuration
    EVENT_RETENTION_DAYS: zod_1.z.coerce.number().int().min(1).max(365).default(30),
    EVENT_MAX_BATCH_SIZE: zod_1.z.coerce.number().int().min(1).max(1000).default(100),
    EVENT_SUBSCRIBER_TIMEOUT_MS: zod_1.z.coerce.number().int().min(100).max(60000).default(5000),
});
/**
 * HOJAI Shared specific schema
 */
exports.sharedSchema = exports.serviceConfigSchema.extend({
    // Shared service configuration
    SHARED_TENANT_QUOTA_FREE: zod_1.z.coerce.number().int().min(1).default(1000),
    SHARED_TENANT_QUOTA_STARTER: zod_1.z.coerce.number().int().min(1).default(10000),
    SHARED_TENANT_QUOTA_PRO: zod_1.z.coerce.number().int().min(1).default(100000),
    SHARED_TENANT_QUOTA_ENTERPRISE: zod_1.z.coerce.number().int().min(1).default(-1), // Unlimited
});
// ============================================
// VALIDATION
// ============================================
/**
 * Validate configuration and return parsed values
 * Throws if required config is missing or invalid
 */
function validateConfig(schema, env = process.env) {
    const result = schema.safeParse(env);
    if (!result.success) {
        const errors = result.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
        }));
        const errorMessage = errors
            .map(e => `  - ${e.field}: ${e.message}`)
            .join('\n');
        throw new ConfigurationError(`Configuration validation failed:\n${errorMessage}`);
    }
    return result.data;
}
/**
 * Validate service configuration
 */
function validateServiceConfig() {
    return validateConfig(exports.serviceConfigSchema);
}
/**
 * Validate HOJAI Core configuration
 */
function validateHojaiCoreConfig() {
    return validateConfig(exports.hojaiCoreSchema);
}
/**
 * Validate Intelligence configuration
 */
function validateIntelligenceConfig() {
    return validateConfig(exports.intelligenceSchema);
}
/**
 * Validate Event Bus configuration
 */
function validateEventBusConfig() {
    return validateConfig(exports.eventBusSchema);
}
/**
 * Validate Shared configuration
 */
function validateSharedConfig() {
    return validateConfig(exports.sharedSchema);
}
// ============================================
// CONFIGURATION ERROR
// ============================================
class ConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConfigurationError';
    }
}
exports.ConfigurationError = ConfigurationError;
// ============================================
// CONFIG CACHE
// ============================================
let cachedConfig = null;
/**
 * Get validated configuration (cached)
 */
function getConfig() {
    if (!cachedConfig) {
        cachedConfig = validateServiceConfig();
    }
    return cachedConfig;
}
/**
 * Clear configuration cache (for testing)
 */
function clearConfigCache() {
    cachedConfig = null;
}
// ============================================
// CORS HELPERS
// ============================================
/**
 * Parse CORS_ORIGINS environment variable
 * Returns array of allowed origins
 */
function getCorsOrigins() {
    const origins = process.env.CORS_ORIGINS || '';
    if (!origins) {
        // No CORS configured
        if (process.env.NODE_ENV === 'production') {
            console.warn('WARNING: No CORS_ORIGINS configured in production. ' +
                'Requests from browsers will be blocked.');
        }
        return [];
    }
    return origins.split(',').map(o => o.trim()).filter(Boolean);
}
/**
 * Validate CORS origin against allowed list
 */
function isCorsOriginAllowed(origin) {
    const allowed = getCorsOrigins();
    // No CORS configured = block all cross-origin requests
    if (allowed.length === 0) {
        return false;
    }
    // Allow all (not recommended for production)
    if (allowed.includes('*')) {
        return true;
    }
    // Check exact match
    if (allowed.includes(origin || '')) {
        return true;
    }
    // Check wildcard subdomain
    for (const pattern of allowed) {
        if (pattern.startsWith('*.')) {
            const domain = pattern.slice(2);
            if (origin?.endsWith(domain)) {
                return true;
            }
        }
    }
    return false;
}
// ============================================
// EXPORTS
// ============================================
exports.default = {
    // Schemas
    serviceConfigSchema: exports.serviceConfigSchema,
    hojaiCoreSchema: exports.hojaiCoreSchema,
    intelligenceSchema: exports.intelligenceSchema,
    eventBusSchema: exports.eventBusSchema,
    sharedSchema: exports.sharedSchema,
    // Validation functions
    validateConfig,
    validateServiceConfig,
    validateHojaiCoreConfig,
    validateIntelligenceConfig,
    validateEventBusConfig,
    validateSharedConfig,
    // Helpers
    getConfig,
    clearConfigCache,
    getCorsOrigins,
    isCorsOriginAllowed,
    // Error class
    ConfigurationError
};
//# sourceMappingURL=index.js.map