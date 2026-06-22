/**
 * Hojai Core - Graceful Shutdown Manager
 * Version: 1.0.0 | Date: June 12, 2026
 * Purpose: Handle SIGTERM/SIGINT for graceful service shutdown
 */
import { Server } from 'http';
import mongoose from 'mongoose';
export interface ShutdownOptions {
    /** HTTP server to close */
    server?: Server;
    /** MongoDB connection to close */
    mongooseConnection?: typeof mongoose.connection;
    /** Redis client to close */
    redisClient?: {
        quit: () => Promise<void>;
    };
    /** Custom cleanup functions */
    cleanup?: (() => Promise<void>)[];
    /** Timeout for in-flight requests (ms) */
    requestTimeout?: number;
    /** Service name for logging */
    serviceName?: string;
}
export interface ShutdownState {
    isShuttingDown: boolean;
    shutdownInitiatedAt?: number;
    shutdownCompletedAt?: number;
}
/**
 * Initialize graceful shutdown handlers
 */
export declare function initGracefulShutdown(opts: ShutdownOptions): void;
/**
 * Check if shutdown is in progress
 */
export declare function isShuttingDown(): boolean;
/**
 * Get shutdown state
 */
export declare function getShutdownState(): ShutdownState;
/**
 * Check if server should accept new connections
 */
export declare function shouldAcceptConnections(): boolean;
/**
 * Create HTTP server with shutdown integration
 */
export declare function createServerWithShutdown(app: any, port: number, opts?: Omit<ShutdownOptions, 'server'>): Server;
/**
 * Express middleware to reject requests during shutdown
 */
export declare function shutdownMiddleware(): (req: any, res: any, next: any) => void;
declare const _default: {
    initGracefulShutdown: typeof initGracefulShutdown;
    isShuttingDown: typeof isShuttingDown;
    getShutdownState: typeof getShutdownState;
    shouldAcceptConnections: typeof shouldAcceptConnections;
    createServerWithShutdown: typeof createServerWithShutdown;
    shutdownMiddleware: typeof shutdownMiddleware;
};
export default _default;
