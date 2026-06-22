/**
 * Hojai Core - Configuration Schema & Validation
 * Version: 1.0.0 | Date: June 12, 2026
 * Purpose: Zod-based environment variable validation
 */

import { z } from 'zod';

// ============================================
// SCHEMAS
// ============================================

/**
 * Service configuration schema
 * Validates all environment variables for Hojai Core services
 */
export const serviceConfigSchema = z.object({
  // Required
  MONGODB_URI: z.string().url({
    message: 'MONGODB_URI must be a valid MongoDB connection string'
  }),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, {
    message: 'JWT_SECRET must be at least 32 characters for security'
  }),

  // Optional with defaults
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // CORS - comma-separated list of origins
  // Empty string = no CORS (recommended for production)
  CORS_ORIGINS: z.string().default(''),

  // Redis (optional)
  REDIS_URL: z.string().url().optional(),

  // Service registry
  SERVICE_NAME: z.string().default('hojai-service'),
  SERVICE_VERSION: z.string().default('1.0.0'),
});

/**
 * HOJAI Core specific schema
 */
export const hojaiCoreSchema = serviceConfigSchema.extend({
  // HOJAI Core services
  HOJAI_GATEWAY: z.string().url().default('http://localhost:4500'),
  HOJAI_GOVERNANCE: z.string().url().default('http://localhost:4501'),
  HOJAI_EVENT: z.string().url().default('http://localhost:4510'),
  HOJAI_MEMORY: z.string().url().default('http://localhost:4520'),
  HOJAI_INTELLIGENCE: z.string().url().default('http://localhost:4530'),
  HOJAI_AGENTS: z.string().url().default('http://localhost:4550'),
  HOJAI_WORKFLOWS: z.string().url().default('http://localhost:4560'),
  HOJAI_COMMUNICATIONS: z.string().url().default('http://localhost:4570'),
  HOJAI_HYPERLOCAL: z.string().url().default('http://localhost:4580'),
  HOJAI_DATA: z.string().url().default('http://localhost:4590'),
  HOJAI_IDENTITY: z.string().url().default('http://localhost:4600'),
  HOJAI_ANALYTICS: z.string().url().default('http://localhost:4610'),

  // RABTUL Services
  RABTUL_AUTH: z.string().url().default('http://localhost:4002'),
  RABTUL_PAYMENT: z.string().url().default('http://localhost:4001'),
  RABTUL_WALLET: z.string().url().default('http://localhost:4004'),
  RABTUL_NOTIFICATION: z.string().url().default('http://localhost:4005'),
});

/**
 * HOJAI Intelligence specific schema
 */
export const intelligenceSchema = hojaiCoreSchema.extend({
  // ML Configuration
  ML_MODEL_PATH: z.string().optional(),
  ML_BATCH_SIZE: z.coerce.number().int().min(1).max(1000).default(32),
  ML_MAX_CONCURRENT_PREDICTIONS: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * HOJAI Event Bus specific schema
 */
export const eventBusSchema = hojaiCoreSchema.extend({
  // Event Bus Configuration
  EVENT_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  EVENT_MAX_BATCH_SIZE: z.coerce.number().int().min(1).max(1000).default(100),
  EVENT_SUBSCRIBER_TIMEOUT_MS: z.coerce.number().int().min(100).max(60000).default(5000),
});

/**
 * HOJAI Shared specific schema
 */
export const sharedSchema = serviceConfigSchema.extend({
  // Shared service configuration
  SHARED_TENANT_QUOTA_FREE: z.coerce.number().int().min(1).default(1000),
  SHARED_TENANT_QUOTA_STARTER: z.coerce.number().int().min(1).default(10000),
  SHARED_TENANT_QUOTA_PRO: z.coerce.number().int().min(1).default(100000),
  SHARED_TENANT_QUOTA_ENTERPRISE: z.coerce.number().int().min(1).default(-1), // Unlimited
});

// ============================================
// TYPES
// ============================================

export type ServiceConfig = z.infer<typeof serviceConfigSchema>;
export type HojaiCoreConfig = z.infer<typeof hojaiCoreSchema>;
export type IntelligenceConfig = z.infer<typeof intelligenceSchema>;
export type EventBusConfig = z.infer<typeof eventBusSchema>;
export type SharedConfig = z.infer<typeof sharedSchema>;

// ============================================
// VALIDATION
// ============================================

/**
 * Validate configuration and return parsed values
 * Throws if required config is missing or invalid
 */
export function validateConfig<T extends z.ZodType>(
  schema: T,
  env: Record<string, string | undefined> = process.env
): z.infer<T> {
  const result = schema.safeParse(env);

  if (!result.success) {
    const errors = result.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));

    const errorMessage = errors
      .map(e => `  - ${e.field}: ${e.message}`)
      .join('\n');

    throw new ConfigurationError(
      `Configuration validation failed:\n${errorMessage}`
    );
  }

  return result.data;
}

/**
 * Validate service configuration
 */
export function validateServiceConfig(): ServiceConfig {
  return validateConfig(serviceConfigSchema);
}

/**
 * Validate HOJAI Core configuration
 */
export function validateHojaiCoreConfig(): HojaiCoreConfig {
  return validateConfig(hojaiCoreSchema);
}

/**
 * Validate Intelligence configuration
 */
export function validateIntelligenceConfig(): IntelligenceConfig {
  return validateConfig(intelligenceSchema);
}

/**
 * Validate Event Bus configuration
 */
export function validateEventBusConfig(): EventBusConfig {
  return validateConfig(eventBusSchema);
}

/**
 * Validate Shared configuration
 */
export function validateSharedConfig(): SharedConfig {
  return validateConfig(sharedSchema);
}

// ============================================
// CONFIGURATION ERROR
// ============================================

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// ============================================
// CONFIG CACHE
// ============================================

let cachedConfig: ServiceConfig | null = null;

/**
 * Get validated configuration (cached)
 */
export function getConfig(): ServiceConfig {
  if (!cachedConfig) {
    cachedConfig = validateServiceConfig();
  }
  return cachedConfig;
}

/**
 * Clear configuration cache (for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

// ============================================
// CORS HELPERS
// ============================================

/**
 * Parse CORS_ORIGINS environment variable
 * Returns array of allowed origins
 */
export function getCorsOrigins(): string[] {
  const origins = process.env.CORS_ORIGINS || '';

  if (!origins) {
    // No CORS configured
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        'WARNING: No CORS_ORIGINS configured in production. ' +
        'Requests from browsers will be blocked.'
      );
    }
    return [];
  }

  return origins.split(',').map(o => o.trim()).filter(Boolean);
}

/**
 * Validate CORS origin against allowed list
 */
export function isCorsOriginAllowed(origin: string | null): boolean {
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

export default {
  // Schemas
  serviceConfigSchema,
  hojaiCoreSchema,
  intelligenceSchema,
  eventBusSchema,
  sharedSchema,

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
