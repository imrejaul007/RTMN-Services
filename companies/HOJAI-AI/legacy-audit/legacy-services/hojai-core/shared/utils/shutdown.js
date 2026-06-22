"use strict";
/**
 * Hojai Core - Graceful Shutdown Manager
 * Version: 1.0.0 | Date: June 12, 2026
 * Purpose: Handle SIGTERM/SIGINT for graceful service shutdown
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initGracefulShutdown = initGracefulShutdown;
exports.isShuttingDown = isShuttingDown;
exports.getShutdownState = getShutdownState;
exports.shouldAcceptConnections = shouldAcceptConnections;
exports.createServerWithShutdown = createServerWithShutdown;
exports.shutdownMiddleware = shutdownMiddleware;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_js_1 = require("./logger.js");
const logger = (0, logger_js_1.createLogger)('shutdown');
// ============================================
// SHUTDOWN STATE
// ============================================
let state = {
    isShuttingDown: false
};
let options = {
    requestTimeout: 5000,
    serviceName: 'service'
};
// ============================================
// SHUTDOWN MANAGER
// ============================================
/**
 * Initialize graceful shutdown handlers
 */
function initGracefulShutdown(opts) {
    options = { ...options, ...opts };
    // SIGTERM - Kubernetes sends this when terminating a pod
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    // SIGINT - Ctrl+C sends this in development
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        logger.error('uncaught_exception', { error: error.message, stack: error.stack });
        gracefulShutdown('uncaughtException');
    });
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
        logger.error('unhandled_rejection', { reason: String(reason) });
        gracefulShutdown('unhandledRejection');
    });
    logger.info('shutdown_handlers_registered', {
        service: options.serviceName,
        requestTimeout: options.requestTimeout
    });
}
/**
 * Perform graceful shutdown
 */
async function gracefulShutdown(signal) {
    // Prevent double shutdown
    if (state.isShuttingDown) {
        logger.warn('shutdown_already_in_progress', { signal });
        return;
    }
    state.isShuttingDown = true;
    state.shutdownInitiatedAt = Date.now();
    logger.info('graceful_shutdown_initiated', {
        signal,
        service: options.serviceName,
        timestamp: new Date().toISOString()
    });
    try {
        // Step 1: Stop accepting new connections
        if (options.server) {
            await closeServer();
        }
        // Step 2: Give time for in-flight requests to complete
        await drainInFlightRequests();
        // Step 3: Close database connections
        await closeDatabases();
        // Step 4: Close Redis connection
        await closeRedis();
        // Step 5: Run custom cleanup functions
        await runCustomCleanup();
        state.shutdownCompletedAt = Date.now();
        logger.info('graceful_shutdown_completed', {
            service: options.serviceName,
            duration: state.shutdownCompletedAt - state.shutdownInitiatedAt,
            timestamp: new Date().toISOString()
        });
        process.exit(0);
    }
    catch (error) {
        logger.error('graceful_shutdown_failed', {
            error: error instanceof Error ? error.message : String(error),
            service: options.serviceName
        });
        process.exit(1);
    }
}
/**
 * Close HTTP server
 */
async function closeServer() {
    if (!options.server)
        return;
    return new Promise((resolve, reject) => {
        logger.info('closing_http_server', { service: options.serviceName });
        options.server.close((err) => {
            if (err) {
                logger.error('http_server_close_error', { error: err.message });
                // Don't reject - continue with shutdown
                resolve();
            }
            else {
                logger.info('http_server_closed', { service: options.serviceName });
                resolve();
            }
        });
    });
}
/**
 * Drain in-flight requests
 */
async function drainInFlightRequests() {
    if (!options.requestTimeout)
        return;
    logger.info('draining_in_flight_requests', {
        timeout: options.requestTimeout,
        service: options.serviceName
    });
    await new Promise(resolve => setTimeout(resolve, options.requestTimeout));
    logger.info('in_flight_requests_drained', { service: options.serviceName });
}
/**
 * Close database connections
 */
async function closeDatabases() {
    // Close mongoose connection
    if (options.mongooseConnection) {
        try {
            logger.info('closing_mongodb_connection', { service: options.serviceName });
            await options.mongooseConnection.close();
            logger.info('mongodb_connection_closed', { service: options.serviceName });
        }
        catch (error) {
            logger.error('mongodb_close_error', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    // Also try default mongoose connection
    if (mongoose_1.default.connection.readyState !== 0) {
        try {
            await mongoose_1.default.connection.close();
            logger.info('mongodb_default_connection_closed', { service: options.serviceName });
        }
        catch (error) {
            // Ignore if already closed
        }
    }
}
/**
 * Close Redis connection
 */
async function closeRedis() {
    if (!options.redisClient)
        return;
    try {
        logger.info('closing_redis_connection', { service: options.serviceName });
        await options.redisClient.quit();
        logger.info('redis_connection_closed', { service: options.serviceName });
    }
    catch (error) {
        logger.error('redis_close_error', {
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
/**
 * Run custom cleanup functions
 */
async function runCustomCleanup() {
    if (!options.cleanup || options.cleanup.length === 0)
        return;
    logger.info('running_custom_cleanup', {
        count: options.cleanup.length,
        service: options.serviceName
    });
    for (const cleanupFn of options.cleanup) {
        try {
            await cleanupFn();
        }
        catch (error) {
            logger.error('custom_cleanup_error', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    logger.info('custom_cleanup_completed', { service: options.serviceName });
}
// ============================================
// STATE HELPERS
// ============================================
/**
 * Check if shutdown is in progress
 */
function isShuttingDown() {
    return state.isShuttingDown;
}
/**
 * Get shutdown state
 */
function getShutdownState() {
    return { ...state };
}
/**
 * Check if server should accept new connections
 */
function shouldAcceptConnections() {
    return !state.isShuttingDown;
}
// ============================================
// HTTP SERVER INTEGRATION
// ============================================
/**
 * Create HTTP server with shutdown integration
 */
function createServerWithShutdown(app, port, opts) {
    const server = app.listen(port, () => {
        logger.info('server_started', {
            port,
            service: opts?.serviceName || 'service'
        });
    });
    initGracefulShutdown({
        ...opts,
        server
    });
    return server;
}
// ============================================
// EXPRESS MIDDLEWARE
// ============================================
/**
 * Express middleware to reject requests during shutdown
 */
function shutdownMiddleware() {
    return (req, res, next) => {
        if (state.isShuttingDown) {
            res.status(503).json({
                success: false,
                error: {
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'Service is shutting down'
                }
            });
            return;
        }
        next();
    };
}
// ============================================
// EXPORTS
// ============================================
exports.default = {
    initGracefulShutdown,
    isShuttingDown,
    getShutdownState,
    shouldAcceptConnections,
    createServerWithShutdown,
    shutdownMiddleware
};
//# sourceMappingURL=shutdown.js.map