/**
 * Hojai Core - Configuration Schema & Validation
 * Version: 1.0.0 | Date: June 12, 2026
 * Purpose: Zod-based environment variable validation
 */
import { z } from 'zod';
/**
 * Service configuration schema
 * Validates all environment variables for Hojai Core services
 */
export declare const serviceConfigSchema: z.ZodObject<{
    MONGODB_URI: z.ZodString;
    JWT_SECRET: z.ZodString;
    PORT: z.ZodDefault<z.ZodNumber>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    CORS_ORIGINS: z.ZodDefault<z.ZodString>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    SERVICE_NAME: z.ZodDefault<z.ZodString>;
    SERVICE_VERSION: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    MONGODB_URI: string;
    JWT_SECRET: string;
    PORT: number;
    NODE_ENV: "development" | "production" | "test";
    LOG_LEVEL: "error" | "info" | "warn" | "debug";
    CORS_ORIGINS: string;
    SERVICE_NAME: string;
    SERVICE_VERSION: string;
    REDIS_URL?: string | undefined;
}, {
    MONGODB_URI: string;
    JWT_SECRET: string;
    PORT?: number | undefined;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    LOG_LEVEL?: "error" | "info" | "warn" | "debug" | undefined;
    CORS_ORIGINS?: string | undefined;
    REDIS_URL?: string | undefined;
    SERVICE_NAME?: string | undefined;
    SERVICE_VERSION?: string | undefined;
}>;
/**
 * HOJAI Core specific schema
 */
export declare const hojaiCoreSchema: z.ZodObject<{
    MONGODB_URI: z.ZodString;
    JWT_SECRET: z.ZodString;
    PORT: z.ZodDefault<z.ZodNumber>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    CORS_ORIGINS: z.ZodDefault<z.ZodString>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    SERVICE_NAME: z.ZodDefault<z.ZodString>;
    SERVICE_VERSION: z.ZodDefault<z.ZodString>;
} & {
    HOJAI_GATEWAY: z.ZodDefault<z.ZodString>;
    HOJAI_GOVERNANCE: z.ZodDefault<z.ZodString>;
    HOJAI_EVENT: z.ZodDefault<z.ZodString>;
    HOJAI_MEMORY: z.ZodDefault<z.ZodString>;
    HOJAI_INTELLIGENCE: z.ZodDefault<z.ZodString>;
    HOJAI_AGENTS: z.ZodDefault<z.ZodString>;
    HOJAI_WORKFLOWS: z.ZodDefault<z.ZodString>;
    HOJAI_COMMUNICATIONS: z.ZodDefault<z.ZodString>;
    HOJAI_HYPERLOCAL: z.ZodDefault<z.ZodString>;
    HOJAI_DATA: z.ZodDefault<z.ZodString>;
    HOJAI_IDENTITY: z.ZodDefault<z.ZodString>;
    HOJAI_ANALYTICS: z.ZodDefault<z.ZodString>;
    RABTUL_AUTH: z.ZodDefault<z.ZodString>;
    RABTUL_PAYMENT: z.ZodDefault<z.ZodString>;
    RABTUL_WALLET: z.ZodDefault<z.ZodString>;
    RABTUL_NOTIFICATION: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    MONGODB_URI: string;
    JWT_SECRET: string;
    PORT: number;
    NODE_ENV: "development" | "production" | "test";
    LOG_LEVEL: "error" | "info" | "warn" | "debug";
    CORS_ORIGINS: string;
    SERVICE_NAME: string;
    SERVICE_VERSION: string;
    HOJAI_GATEWAY: string;
    HOJAI_GOVERNANCE: string;
    HOJAI_EVENT: string;
    HOJAI_MEMORY: string;
    HOJAI_INTELLIGENCE: string;
    HOJAI_AGENTS: string;
    HOJAI_WORKFLOWS: string;
    HOJAI_COMMUNICATIONS: string;
    HOJAI_HYPERLOCAL: string;
    HOJAI_DATA: string;
    HOJAI_IDENTITY: string;
    HOJAI_ANALYTICS: string;
    RABTUL_AUTH: string;
    RABTUL_PAYMENT: string;
    RABTUL_WALLET: string;
    RABTUL_NOTIFICATION: string;
    REDIS_URL?: string | undefined;
}, {
    MONGODB_URI: string;
    JWT_SECRET: string;
    PORT?: number | undefined;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    LOG_LEVEL?: "error" | "info" | "warn" | "debug" | undefined;
    CORS_ORIGINS?: string | undefined;
    REDIS_URL?: string | undefined;
    SERVICE_NAME?: string | undefined;
    SERVICE_VERSION?: string | undefined;
    HOJAI_GATEWAY?: string | undefined;
    HOJAI_GOVERNANCE?: string | undefined;
    HOJAI_EVENT?: string | undefined;
    HOJAI_MEMORY?: string | undefined;
    HOJAI_INTELLIGENCE?: string | undefined;
    HOJAI_AGENTS?: string | undefined;
    HOJAI_WORKFLOWS?: string | undefined;
    HOJAI_COMMUNICATIONS?: string | undefined;
    HOJAI_HYPERLOCAL?: string | undefined;
    HOJAI_DATA?: string | undefined;
    HOJAI_IDENTITY?: string | undefined;
    HOJAI_ANALYTICS?: string | undefined;
    RABTUL_AUTH?: string | undefined;
    RABTUL_PAYMENT?: string | undefined;
    RABTUL_WALLET?: string | undefined;
    RABTUL_NOTIFICATION?: string | undefined;
}>;
/**
 * HOJAI Intelligence specific schema
 */
export declare const intelligenceSchema: z.ZodObject<{
    MONGODB_URI: z.ZodString;
    JWT_SECRET: z.ZodString;
    PORT: z.ZodDefault<z.ZodNumber>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    CORS_ORIGINS: z.ZodDefault<z.ZodString>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    SERVICE_NAME: z.ZodDefault<z.ZodString>;
    SERVICE_VERSION: z.ZodDefault<z.ZodString>;
} & {
    HOJAI_GATEWAY: z.ZodDefault<z.ZodString>;
    HOJAI_GOVERNANCE: z.ZodDefault<z.ZodString>;
    HOJAI_EVENT: z.ZodDefault<z.ZodString>;
    HOJAI_MEMORY: z.ZodDefault<z.ZodString>;
    HOJAI_INTELLIGENCE: z.ZodDefault<z.ZodString>;
    HOJAI_AGENTS: z.ZodDefault<z.ZodString>;
    HOJAI_WORKFLOWS: z.ZodDefault<z.ZodString>;
    HOJAI_COMMUNICATIONS: z.ZodDefault<z.ZodString>;
    HOJAI_HYPERLOCAL: z.ZodDefault<z.ZodString>;
    HOJAI_DATA: z.ZodDefault<z.ZodString>;
    HOJAI_IDENTITY: z.ZodDefault<z.ZodString>;
    HOJAI_ANALYTICS: z.ZodDefault<z.ZodString>;
    RABTUL_AUTH: z.ZodDefault<z.ZodString>;
    RABTUL_PAYMENT: z.ZodDefault<z.ZodString>;
    RABTUL_WALLET: z.ZodDefault<z.ZodString>;
    RABTUL_NOTIFICATION: z.ZodDefault<z.ZodString>;
} & {
    ML_MODEL_PATH: z.ZodOptional<z.ZodString>;
    ML_BATCH_SIZE: z.ZodDefault<z.ZodNumber>;
    ML_MAX_CONCURRENT_PREDICTIONS: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    MONGODB_URI: string;
    JWT_SECRET: string;
    PORT: number;
    NODE_ENV: "development" | "production" | "test";
    LOG_LEVEL: "error" | "info" | "warn" | "debug";
    CORS_ORIGINS: string;
    SERVICE_NAME: string;
    SERVICE_VERSION: string;
    HOJAI_GATEWAY: string;
    HOJAI_GOVERNANCE: string;
    HOJAI_EVENT: string;
    HOJAI_MEMORY: string;
    HOJAI_INTELLIGENCE: string;
    HOJAI_AGENTS: string;
    HOJAI_WORKFLOWS: string;
    HOJAI_COMMUNICATIONS: string;
    HOJAI_HYPERLOCAL: string;
    HOJAI_DATA: string;
    HOJAI_IDENTITY: string;
    HOJAI_ANALYTICS: string;
    RABTUL_AUTH: string;
    RABTUL_PAYMENT: string;
    RABTUL_WALLET: string;
    RABTUL_NOTIFICATION: string;
    ML_BATCH_SIZE: number;
    ML_MAX_CONCURRENT_PREDICTIONS: number;
    REDIS_URL?: string | undefined;
    ML_MODEL_PATH?: string | undefined;
}, {
    MONGODB_URI: string;
    JWT_SECRET: string;
    PORT?: number | undefined;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    LOG_LEVEL?: "error" | "info" | "warn" | "debug" | undefined;
    CORS_ORIGINS?: string | undefined;
    REDIS_URL?: string | undefined;
    SERVICE_NAME?: string | undefined;
    SERVICE_VERSION?: string | undefined;
    HOJAI_GATEWAY?: string | undefined;
    HOJAI_GOVERNANCE?: string | undefined;
    HOJAI_EVENT?: string | undefined;
    HOJAI_MEMORY?: string | undefined;
    HOJAI_INTELLIGENCE?: string | undefined;
    HOJAI_AGENTS?: string | undefined;
    HOJAI_WORKFLOWS?: string | undefined;
    HOJAI_COMMUNICATIONS?: string | undefined;
    HOJAI_HYPERLOCAL?: string | undefined;
    HOJAI_DATA?: string | undefined;
    HOJAI_IDENTITY?: string | undefined;
    HOJAI_ANALYTICS?: string | undefined;
    RABTUL_AUTH?: string | undefined;
    RABTUL_PAYMENT?: string | undefined;
    RABTUL_WALLET?: string | undefined;
    RABTUL_NOTIFICATION?: string | undefined;
    ML_MODEL_PATH?: string | undefined;
    ML_BATCH_SIZE?: number | undefined;
    ML_MAX_CONCURRENT_PREDICTIONS?: number | undefined;
}>;
/**
 * HOJAI Event Bus specific schema
 */
export declare const eventBusSchema: z.ZodObject<{
    MONGODB_URI: z.ZodString;
    JWT_SECRET: z.ZodString;
    PORT: z.ZodDefault<z.ZodNumber>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    CORS_ORIGINS: z.ZodDefault<z.ZodString>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    SERVICE_NAME: z.ZodDefault<z.ZodString>;
    SERVICE_VERSION: z.ZodDefault<z.ZodString>;
} & {
    HOJAI_GATEWAY: z.ZodDefault<z.ZodString>;
    HOJAI_GOVERNANCE: z.ZodDefault<z.ZodString>;
    HOJAI_EVENT: z.ZodDefault<z.ZodString>;
    HOJAI_MEMORY: z.ZodDefault<z.ZodString>;
    HOJAI_INTELLIGENCE: z.ZodDefault<z.ZodString>;
    HOJAI_AGENTS: z.ZodDefault<z.ZodString>;
    HOJAI_WORKFLOWS: z.ZodDefault<z.ZodString>;
    HOJAI_COMMUNICATIONS: z.ZodDefault<z.ZodString>;
    HOJAI_HYPERLOCAL: z.ZodDefault<z.ZodString>;
    HOJAI_DATA: z.ZodDefault<z.ZodString>;
    HOJAI_IDENTITY: z.ZodDefault<z.ZodString>;
    HOJAI_ANALYTICS: z.ZodDefault<z.ZodString>;
    RABTUL_AUTH: z.ZodDefault<z.ZodString>;
    RABTUL_PAYMENT: z.ZodDefault<z.ZodString>;
    RABTUL_WALLET: z.ZodDefault<z.ZodString>;
    RABTUL_NOTIFICATION: z.ZodDefault<z.ZodString>;
} & {
    EVENT_RETENTION_DAYS: z.ZodDefault<z.ZodNumber>;
    EVENT_MAX_BATCH_SIZE: z.ZodDefault<z.ZodNumber>;
    EVENT_SUBSCRIBER_TIMEOUT_MS: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    MONGODB_URI: string;
    JWT_SECRET: string;
    PORT: number;
    NODE_ENV: "development" | "production" | "test";
    LOG_LEVEL: "error" | "info" | "warn" | "debug";
    CORS_ORIGINS: string;
    SERVICE_NAME: string;
    SERVICE_VERSION: string;
    HOJAI_GATEWAY: string;
    HOJAI_GOVERNANCE: string;
    HOJAI_EVENT: string;
    HOJAI_MEMORY: string;
    HOJAI_INTELLIGENCE: string;
    HOJAI_AGENTS: string;
    HOJAI_WORKFLOWS: string;
    HOJAI_COMMUNICATIONS: string;
    HOJAI_HYPERLOCAL: string;
    HOJAI_DATA: string;
    HOJAI_IDENTITY: string;
    HOJAI_ANALYTICS: string;
    RABTUL_AUTH: string;
    RABTUL_PAYMENT: string;
    RABTUL_WALLET: string;
    RABTUL_NOTIFICATION: string;
    EVENT_RETENTION_DAYS: number;
    EVENT_MAX_BATCH_SIZE: number;
    EVENT_SUBSCRIBER_TIMEOUT_MS: number;
    REDIS_URL?: string | undefined;
}, {
    MONGODB_URI: string;
    JWT_SECRET: string;
    PORT?: number | undefined;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    LOG_LEVEL?: "error" | "info" | "warn" | "debug" | undefined;
    CORS_ORIGINS?: string | undefined;
    REDIS_URL?: string | undefined;
    SERVICE_NAME?: string | undefined;
    SERVICE_VERSION?: string | undefined;
    HOJAI_GATEWAY?: string | undefined;
    HOJAI_GOVERNANCE?: string | undefined;
    HOJAI_EVENT?: string | undefined;
    HOJAI_MEMORY?: string | undefined;
    HOJAI_INTELLIGENCE?: string | undefined;
    HOJAI_AGENTS?: string | undefined;
    HOJAI_WORKFLOWS?: string | undefined;
    HOJAI_COMMUNICATIONS?: string | undefined;
    HOJAI_HYPERLOCAL?: string | undefined;
    HOJAI_DATA?: string | undefined;
    HOJAI_IDENTITY?: string | undefined;
    HOJAI_ANALYTICS?: string | undefined;
    RABTUL_AUTH?: string | undefined;
    RABTUL_PAYMENT?: string | undefined;
    RABTUL_WALLET?: string | undefined;
    RABTUL_NOTIFICATION?: string | undefined;
    EVENT_RETENTION_DAYS?: number | undefined;
    EVENT_MAX_BATCH_SIZE?: number | undefined;
    EVENT_SUBSCRIBER_TIMEOUT_MS?: number | undefined;
}>;
/**
 * HOJAI Shared specific schema
 */
export declare const sharedSchema: z.ZodObject<{
    MONGODB_URI: z.ZodString;
    JWT_SECRET: z.ZodString;
    PORT: z.ZodDefault<z.ZodNumber>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    CORS_ORIGINS: z.ZodDefault<z.ZodString>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    SERVICE_NAME: z.ZodDefault<z.ZodString>;
    SERVICE_VERSION: z.ZodDefault<z.ZodString>;
} & {
    SHARED_TENANT_QUOTA_FREE: z.ZodDefault<z.ZodNumber>;
    SHARED_TENANT_QUOTA_STARTER: z.ZodDefault<z.ZodNumber>;
    SHARED_TENANT_QUOTA_PRO: z.ZodDefault<z.ZodNumber>;
    SHARED_TENANT_QUOTA_ENTERPRISE: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    MONGODB_URI: string;
    JWT_SECRET: string;
    PORT: number;
    NODE_ENV: "development" | "production" | "test";
    LOG_LEVEL: "error" | "info" | "warn" | "debug";
    CORS_ORIGINS: string;
    SERVICE_NAME: string;
    SERVICE_VERSION: string;
    SHARED_TENANT_QUOTA_FREE: number;
    SHARED_TENANT_QUOTA_STARTER: number;
    SHARED_TENANT_QUOTA_PRO: number;
    SHARED_TENANT_QUOTA_ENTERPRISE: number;
    REDIS_URL?: string | undefined;
}, {
    MONGODB_URI: string;
    JWT_SECRET: string;
    PORT?: number | undefined;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    LOG_LEVEL?: "error" | "info" | "warn" | "debug" | undefined;
    CORS_ORIGINS?: string | undefined;
    REDIS_URL?: string | undefined;
    SERVICE_NAME?: string | undefined;
    SERVICE_VERSION?: string | undefined;
    SHARED_TENANT_QUOTA_FREE?: number | undefined;
    SHARED_TENANT_QUOTA_STARTER?: number | undefined;
    SHARED_TENANT_QUOTA_PRO?: number | undefined;
    SHARED_TENANT_QUOTA_ENTERPRISE?: number | undefined;
}>;
export type ServiceConfig = z.infer<typeof serviceConfigSchema>;
export type HojaiCoreConfig = z.infer<typeof hojaiCoreSchema>;
export type IntelligenceConfig = z.infer<typeof intelligenceSchema>;
export type EventBusConfig = z.infer<typeof eventBusSchema>;
export type SharedConfig = z.infer<typeof sharedSchema>;
/**
 * Validate configuration and return parsed values
 * Throws if required config is missing or invalid
 */
export declare function validateConfig<T extends z.ZodType>(schema: T, env?: Record<string, string | undefined>): z.infer<T>;
/**
 * Validate service configuration
 */
export declare function validateServiceConfig(): ServiceConfig;
/**
 * Validate HOJAI Core configuration
 */
export declare function validateHojaiCoreConfig(): HojaiCoreConfig;
/**
 * Validate Intelligence configuration
 */
export declare function validateIntelligenceConfig(): IntelligenceConfig;
/**
 * Validate Event Bus configuration
 */
export declare function validateEventBusConfig(): EventBusConfig;
/**
 * Validate Shared configuration
 */
export declare function validateSharedConfig(): SharedConfig;
export declare class ConfigurationError extends Error {
    constructor(message: string);
}
/**
 * Get validated configuration (cached)
 */
export declare function getConfig(): ServiceConfig;
/**
 * Clear configuration cache (for testing)
 */
export declare function clearConfigCache(): void;
/**
 * Parse CORS_ORIGINS environment variable
 * Returns array of allowed origins
 */
export declare function getCorsOrigins(): string[];
/**
 * Validate CORS origin against allowed list
 */
export declare function isCorsOriginAllowed(origin: string | null): boolean;
declare const _default: {
    serviceConfigSchema: z.ZodObject<{
        MONGODB_URI: z.ZodString;
        JWT_SECRET: z.ZodString;
        PORT: z.ZodDefault<z.ZodNumber>;
        NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
        LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
        CORS_ORIGINS: z.ZodDefault<z.ZodString>;
        REDIS_URL: z.ZodOptional<z.ZodString>;
        SERVICE_NAME: z.ZodDefault<z.ZodString>;
        SERVICE_VERSION: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        MONGODB_URI: string;
        JWT_SECRET: string;
        PORT: number;
        NODE_ENV: "development" | "production" | "test";
        LOG_LEVEL: "error" | "info" | "warn" | "debug";
        CORS_ORIGINS: string;
        SERVICE_NAME: string;
        SERVICE_VERSION: string;
        REDIS_URL?: string | undefined;
    }, {
        MONGODB_URI: string;
        JWT_SECRET: string;
        PORT?: number | undefined;
        NODE_ENV?: "development" | "production" | "test" | undefined;
        LOG_LEVEL?: "error" | "info" | "warn" | "debug" | undefined;
        CORS_ORIGINS?: string | undefined;
        REDIS_URL?: string | undefined;
        SERVICE_NAME?: string | undefined;
        SERVICE_VERSION?: string | undefined;
    }>;
    hojaiCoreSchema: z.ZodObject<{
        MONGODB_URI: z.ZodString;
        JWT_SECRET: z.ZodString;
        PORT: z.ZodDefault<z.ZodNumber>;
        NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
        LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
        CORS_ORIGINS: z.ZodDefault<z.ZodString>;
        REDIS_URL: z.ZodOptional<z.ZodString>;
        SERVICE_NAME: z.ZodDefault<z.ZodString>;
        SERVICE_VERSION: z.ZodDefault<z.ZodString>;
    } & {
        HOJAI_GATEWAY: z.ZodDefault<z.ZodString>;
        HOJAI_GOVERNANCE: z.ZodDefault<z.ZodString>;
        HOJAI_EVENT: z.ZodDefault<z.ZodString>;
        HOJAI_MEMORY: z.ZodDefault<z.ZodString>;
        HOJAI_INTELLIGENCE: z.ZodDefault<z.ZodString>;
        HOJAI_AGENTS: z.ZodDefault<z.ZodString>;
        HOJAI_WORKFLOWS: z.ZodDefault<z.ZodString>;
        HOJAI_COMMUNICATIONS: z.ZodDefault<z.ZodString>;
        HOJAI_HYPERLOCAL: z.ZodDefault<z.ZodString>;
        HOJAI_DATA: z.ZodDefault<z.ZodString>;
        HOJAI_IDENTITY: z.ZodDefault<z.ZodString>;
        HOJAI_ANALYTICS: z.ZodDefault<z.ZodString>;
        RABTUL_AUTH: z.ZodDefault<z.ZodString>;
        RABTUL_PAYMENT: z.ZodDefault<z.ZodString>;
        RABTUL_WALLET: z.ZodDefault<z.ZodString>;
        RABTUL_NOTIFICATION: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        MONGODB_URI: string;
        JWT_SECRET: string;
        PORT: number;
        NODE_ENV: "development" | "production" | "test";
        LOG_LEVEL: "error" | "info" | "warn" | "debug";
        CORS_ORIGINS: string;
        SERVICE_NAME: string;
        SERVICE_VERSION: string;
        HOJAI_GATEWAY: string;
        HOJAI_GOVERNANCE: string;
        HOJAI_EVENT: string;
        HOJAI_MEMORY: string;
        HOJAI_INTELLIGENCE: string;
        HOJAI_AGENTS: string;
        HOJAI_WORKFLOWS: string;
        HOJAI_COMMUNICATIONS: string;
        HOJAI_HYPERLOCAL: string;
        HOJAI_DATA: string;
        HOJAI_IDENTITY: string;
        HOJAI_ANALYTICS: string;
        RABTUL_AUTH: string;
        RABTUL_PAYMENT: string;
        RABTUL_WALLET: string;
        RABTUL_NOTIFICATION: string;
        REDIS_URL?: string | undefined;
    }, {
        MONGODB_URI: string;
        JWT_SECRET: string;
        PORT?: number | undefined;
        NODE_ENV?: "development" | "production" | "test" | undefined;
        LOG_LEVEL?: "error" | "info" | "warn" | "debug" | undefined;
        CORS_ORIGINS?: string | undefined;
        REDIS_URL?: string | undefined;
        SERVICE_NAME?: string | undefined;
        SERVICE_VERSION?: string | undefined;
        HOJAI_GATEWAY?: string | undefined;
        HOJAI_GOVERNANCE?: string | undefined;
        HOJAI_EVENT?: string | undefined;
        HOJAI_MEMORY?: string | undefined;
        HOJAI_INTELLIGENCE?: string | undefined;
        HOJAI_AGENTS?: string | undefined;
        HOJAI_WORKFLOWS?: string | undefined;
        HOJAI_COMMUNICATIONS?: string | undefined;
        HOJAI_HYPERLOCAL?: string | undefined;
        HOJAI_DATA?: string | undefined;
        HOJAI_IDENTITY?: string | undefined;
        HOJAI_ANALYTICS?: string | undefined;
        RABTUL_AUTH?: string | undefined;
        RABTUL_PAYMENT?: string | undefined;
        RABTUL_WALLET?: string | undefined;
        RABTUL_NOTIFICATION?: string | undefined;
    }>;
    intelligenceSchema: z.ZodObject<{
        MONGODB_URI: z.ZodString;
        JWT_SECRET: z.ZodString;
        PORT: z.ZodDefault<z.ZodNumber>;
        NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
        LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
        CORS_ORIGINS: z.ZodDefault<z.ZodString>;
        REDIS_URL: z.ZodOptional<z.ZodString>;
        SERVICE_NAME: z.ZodDefault<z.ZodString>;
        SERVICE_VERSION: z.ZodDefault<z.ZodString>;
    } & {
        HOJAI_GATEWAY: z.ZodDefault<z.ZodString>;
        HOJAI_GOVERNANCE: z.ZodDefault<z.ZodString>;
        HOJAI_EVENT: z.ZodDefault<z.ZodString>;
        HOJAI_MEMORY: z.ZodDefault<z.ZodString>;
        HOJAI_INTELLIGENCE: z.ZodDefault<z.ZodString>;
        HOJAI_AGENTS: z.ZodDefault<z.ZodString>;
        HOJAI_WORKFLOWS: z.ZodDefault<z.ZodString>;
        HOJAI_COMMUNICATIONS: z.ZodDefault<z.ZodString>;
        HOJAI_HYPERLOCAL: z.ZodDefault<z.ZodString>;
        HOJAI_DATA: z.ZodDefault<z.ZodString>;
        HOJAI_IDENTITY: z.ZodDefault<z.ZodString>;
        HOJAI_ANALYTICS: z.ZodDefault<z.ZodString>;
        RABTUL_AUTH: z.ZodDefault<z.ZodString>;
        RABTUL_PAYMENT: z.ZodDefault<z.ZodString>;
        RABTUL_WALLET: z.ZodDefault<z.ZodString>;
        RABTUL_NOTIFICATION: z.ZodDefault<z.ZodString>;
    } & {
        ML_MODEL_PATH: z.ZodOptional<z.ZodString>;
        ML_BATCH_SIZE: z.ZodDefault<z.ZodNumber>;
        ML_MAX_CONCURRENT_PREDICTIONS: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        MONGODB_URI: string;
        JWT_SECRET: string;
        PORT: number;
        NODE_ENV: "development" | "production" | "test";
        LOG_LEVEL: "error" | "info" | "warn" | "debug";
        CORS_ORIGINS: string;
        SERVICE_NAME: string;
        SERVICE_VERSION: string;
        HOJAI_GATEWAY: string;
        HOJAI_GOVERNANCE: string;
        HOJAI_EVENT: string;
        HOJAI_MEMORY: string;
        HOJAI_INTELLIGENCE: string;
        HOJAI_AGENTS: string;
        HOJAI_WORKFLOWS: string;
        HOJAI_COMMUNICATIONS: string;
        HOJAI_HYPERLOCAL: string;
        HOJAI_DATA: string;
        HOJAI_IDENTITY: string;
        HOJAI_ANALYTICS: string;
        RABTUL_AUTH: string;
        RABTUL_PAYMENT: string;
        RABTUL_WALLET: string;
        RABTUL_NOTIFICATION: string;
        ML_BATCH_SIZE: number;
        ML_MAX_CONCURRENT_PREDICTIONS: number;
        REDIS_URL?: string | undefined;
        ML_MODEL_PATH?: string | undefined;
    }, {
        MONGODB_URI: string;
        JWT_SECRET: string;
        PORT?: number | undefined;
        NODE_ENV?: "development" | "production" | "test" | undefined;
        LOG_LEVEL?: "error" | "info" | "warn" | "debug" | undefined;
        CORS_ORIGINS?: string | undefined;
        REDIS_URL?: string | undefined;
        SERVICE_NAME?: string | undefined;
        SERVICE_VERSION?: string | undefined;
        HOJAI_GATEWAY?: string | undefined;
        HOJAI_GOVERNANCE?: string | undefined;
        HOJAI_EVENT?: string | undefined;
        HOJAI_MEMORY?: string | undefined;
        HOJAI_INTELLIGENCE?: string | undefined;
        HOJAI_AGENTS?: string | undefined;
        HOJAI_WORKFLOWS?: string | undefined;
        HOJAI_COMMUNICATIONS?: string | undefined;
        HOJAI_HYPERLOCAL?: string | undefined;
        HOJAI_DATA?: string | undefined;
        HOJAI_IDENTITY?: string | undefined;
        HOJAI_ANALYTICS?: string | undefined;
        RABTUL_AUTH?: string | undefined;
        RABTUL_PAYMENT?: string | undefined;
        RABTUL_WALLET?: string | undefined;
        RABTUL_NOTIFICATION?: string | undefined;
        ML_MODEL_PATH?: string | undefined;
        ML_BATCH_SIZE?: number | undefined;
        ML_MAX_CONCURRENT_PREDICTIONS?: number | undefined;
    }>;
    eventBusSchema: z.ZodObject<{
        MONGODB_URI: z.ZodString;
        JWT_SECRET: z.ZodString;
        PORT: z.ZodDefault<z.ZodNumber>;
        NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
        LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
        CORS_ORIGINS: z.ZodDefault<z.ZodString>;
        REDIS_URL: z.ZodOptional<z.ZodString>;
        SERVICE_NAME: z.ZodDefault<z.ZodString>;
        SERVICE_VERSION: z.ZodDefault<z.ZodString>;
    } & {
        HOJAI_GATEWAY: z.ZodDefault<z.ZodString>;
        HOJAI_GOVERNANCE: z.ZodDefault<z.ZodString>;
        HOJAI_EVENT: z.ZodDefault<z.ZodString>;
        HOJAI_MEMORY: z.ZodDefault<z.ZodString>;
        HOJAI_INTELLIGENCE: z.ZodDefault<z.ZodString>;
        HOJAI_AGENTS: z.ZodDefault<z.ZodString>;
        HOJAI_WORKFLOWS: z.ZodDefault<z.ZodString>;
        HOJAI_COMMUNICATIONS: z.ZodDefault<z.ZodString>;
        HOJAI_HYPERLOCAL: z.ZodDefault<z.ZodString>;
        HOJAI_DATA: z.ZodDefault<z.ZodString>;
        HOJAI_IDENTITY: z.ZodDefault<z.ZodString>;
        HOJAI_ANALYTICS: z.ZodDefault<z.ZodString>;
        RABTUL_AUTH: z.ZodDefault<z.ZodString>;
        RABTUL_PAYMENT: z.ZodDefault<z.ZodString>;
        RABTUL_WALLET: z.ZodDefault<z.ZodString>;
        RABTUL_NOTIFICATION: z.ZodDefault<z.ZodString>;
    } & {
        EVENT_RETENTION_DAYS: z.ZodDefault<z.ZodNumber>;
        EVENT_MAX_BATCH_SIZE: z.ZodDefault<z.ZodNumber>;
        EVENT_SUBSCRIBER_TIMEOUT_MS: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        MONGODB_URI: string;
        JWT_SECRET: string;
        PORT: number;
        NODE_ENV: "development" | "production" | "test";
        LOG_LEVEL: "error" | "info" | "warn" | "debug";
        CORS_ORIGINS: string;
        SERVICE_NAME: string;
        SERVICE_VERSION: string;
        HOJAI_GATEWAY: string;
        HOJAI_GOVERNANCE: string;
        HOJAI_EVENT: string;
        HOJAI_MEMORY: string;
        HOJAI_INTELLIGENCE: string;
        HOJAI_AGENTS: string;
        HOJAI_WORKFLOWS: string;
        HOJAI_COMMUNICATIONS: string;
        HOJAI_HYPERLOCAL: string;
        HOJAI_DATA: string;
        HOJAI_IDENTITY: string;
        HOJAI_ANALYTICS: string;
        RABTUL_AUTH: string;
        RABTUL_PAYMENT: string;
        RABTUL_WALLET: string;
        RABTUL_NOTIFICATION: string;
        EVENT_RETENTION_DAYS: number;
        EVENT_MAX_BATCH_SIZE: number;
        EVENT_SUBSCRIBER_TIMEOUT_MS: number;
        REDIS_URL?: string | undefined;
    }, {
        MONGODB_URI: string;
        JWT_SECRET: string;
        PORT?: number | undefined;
        NODE_ENV?: "development" | "production" | "test" | undefined;
        LOG_LEVEL?: "error" | "info" | "warn" | "debug" | undefined;
        CORS_ORIGINS?: string | undefined;
        REDIS_URL?: string | undefined;
        SERVICE_NAME?: string | undefined;
        SERVICE_VERSION?: string | undefined;
        HOJAI_GATEWAY?: string | undefined;
        HOJAI_GOVERNANCE?: string | undefined;
        HOJAI_EVENT?: string | undefined;
        HOJAI_MEMORY?: string | undefined;
        HOJAI_INTELLIGENCE?: string | undefined;
        HOJAI_AGENTS?: string | undefined;
        HOJAI_WORKFLOWS?: string | undefined;
        HOJAI_COMMUNICATIONS?: string | undefined;
        HOJAI_HYPERLOCAL?: string | undefined;
        HOJAI_DATA?: string | undefined;
        HOJAI_IDENTITY?: string | undefined;
        HOJAI_ANALYTICS?: string | undefined;
        RABTUL_AUTH?: string | undefined;
        RABTUL_PAYMENT?: string | undefined;
        RABTUL_WALLET?: string | undefined;
        RABTUL_NOTIFICATION?: string | undefined;
        EVENT_RETENTION_DAYS?: number | undefined;
        EVENT_MAX_BATCH_SIZE?: number | undefined;
        EVENT_SUBSCRIBER_TIMEOUT_MS?: number | undefined;
    }>;
    sharedSchema: z.ZodObject<{
        MONGODB_URI: z.ZodString;
        JWT_SECRET: z.ZodString;
        PORT: z.ZodDefault<z.ZodNumber>;
        NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
        LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
        CORS_ORIGINS: z.ZodDefault<z.ZodString>;
        REDIS_URL: z.ZodOptional<z.ZodString>;
        SERVICE_NAME: z.ZodDefault<z.ZodString>;
        SERVICE_VERSION: z.ZodDefault<z.ZodString>;
    } & {
        SHARED_TENANT_QUOTA_FREE: z.ZodDefault<z.ZodNumber>;
        SHARED_TENANT_QUOTA_STARTER: z.ZodDefault<z.ZodNumber>;
        SHARED_TENANT_QUOTA_PRO: z.ZodDefault<z.ZodNumber>;
        SHARED_TENANT_QUOTA_ENTERPRISE: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        MONGODB_URI: string;
        JWT_SECRET: string;
        PORT: number;
        NODE_ENV: "development" | "production" | "test";
        LOG_LEVEL: "error" | "info" | "warn" | "debug";
        CORS_ORIGINS: string;
        SERVICE_NAME: string;
        SERVICE_VERSION: string;
        SHARED_TENANT_QUOTA_FREE: number;
        SHARED_TENANT_QUOTA_STARTER: number;
        SHARED_TENANT_QUOTA_PRO: number;
        SHARED_TENANT_QUOTA_ENTERPRISE: number;
        REDIS_URL?: string | undefined;
    }, {
        MONGODB_URI: string;
        JWT_SECRET: string;
        PORT?: number | undefined;
        NODE_ENV?: "development" | "production" | "test" | undefined;
        LOG_LEVEL?: "error" | "info" | "warn" | "debug" | undefined;
        CORS_ORIGINS?: string | undefined;
        REDIS_URL?: string | undefined;
        SERVICE_NAME?: string | undefined;
        SERVICE_VERSION?: string | undefined;
        SHARED_TENANT_QUOTA_FREE?: number | undefined;
        SHARED_TENANT_QUOTA_STARTER?: number | undefined;
        SHARED_TENANT_QUOTA_PRO?: number | undefined;
        SHARED_TENANT_QUOTA_ENTERPRISE?: number | undefined;
    }>;
    validateConfig: typeof validateConfig;
    validateServiceConfig: typeof validateServiceConfig;
    validateHojaiCoreConfig: typeof validateHojaiCoreConfig;
    validateIntelligenceConfig: typeof validateIntelligenceConfig;
    validateEventBusConfig: typeof validateEventBusConfig;
    validateSharedConfig: typeof validateSharedConfig;
    getConfig: typeof getConfig;
    clearConfigCache: typeof clearConfigCache;
    getCorsOrigins: typeof getCorsOrigins;
    isCorsOriginAllowed: typeof isCorsOriginAllowed;
    ConfigurationError: typeof ConfigurationError;
};
export default _default;
