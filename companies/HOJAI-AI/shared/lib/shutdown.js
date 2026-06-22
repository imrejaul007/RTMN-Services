/**
 * RTMN Shared Graceful Shutdown Module
 *
 * Handles SIGTERM and SIGINT properly so containers don't get killed mid-request.
 *
 * Usage:
 *   import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
 *   const server = app.listen(PORT, ...);
 *   installGracefulShutdown(server, async () => {
 *     await mongoose.disconnect();
 *     await closeMyDatabase();
 *   });
 *
 * Behavior:
 *   - On SIGTERM (Kubernetes pod termination): stop accepting new connections,
 *     drain in-flight requests, run cleanup, exit 0.
 *   - On SIGINT (Ctrl-C in dev): same as SIGTERM.
 *   - Hard timeout after 30s in case cleanup hangs — exit 1.
 */

import { logger } from './logger.js';

const DEFAULT_HARD_TIMEOUT_MS = 30_000;

/**
 * Install SIGTERM/SIGINT handlers on a Node http.Server.
 *
 * @param {import('http').Server} server - The HTTP server returned by app.listen()
 * @param {() => Promise<void>} [cleanup] - Optional async cleanup function
 * @param {object} [options]
 * @param {number} [options.hardTimeoutMs=30000] - Force-exit after this many ms
 * @param {string} [options.serviceName] - Service name for logs
 */
export function installGracefulShutdown(server, cleanup = async () => {}, options = {}) {
  const { hardTimeoutMs = DEFAULT_HARD_TIMEOUT_MS, serviceName = process.env.SERVICE_NAME || 'service' } = options;

  let shuttingDown = false;

  const handler = async (signal) => {
    if (shuttingDown) {
      logger.warn({ service: serviceName, signal }, 'Shutdown already in progress; ignoring signal');
      return;
    }
    shuttingDown = true;

    logger.info({ service: serviceName, signal }, 'Shutdown signal received; draining...');

    // Hard timeout — if cleanup takes too long, exit 1
    const hardTimeout = setTimeout(() => {
      logger.error(
        { service: serviceName, hardTimeoutMs },
        'Cleanup took too long; forcing exit'
      );
      process.exit(1);
    }, hardTimeoutMs);
    hardTimeout.unref();

    try {
      // Stop accepting new connections
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });

      // Run service-specific cleanup
      await cleanup();

      logger.info({ service: serviceName }, 'Shutdown complete; exiting');
      // Give winston a moment to flush
      setTimeout(() => process.exit(0), 100).unref();
    } catch (err) {
      logger.error({ service: serviceName, err: err.message, stack: err.stack }, 'Error during shutdown');
      setTimeout(() => process.exit(1), 100).unref();
    }
  };

  process.on('SIGTERM', () => handler('SIGTERM'));
  process.on('SIGINT', () => handler('SIGINT'));

  // Uncaught exceptions — log and exit so Kubernetes can restart us cleanly
  process.on('uncaughtException', (err) => {
    if (typeof logger.fatal === 'function') {
      logger.fatal({ service: serviceName, err: err.message, stack: err.stack }, 'Uncaught exception');
    } else {
      // Older loggers don't have .fatal — fall back to error
      logger.error({ service: serviceName, err: err.message, stack: err.stack, fatal: true }, 'Uncaught exception');
    }
    setTimeout(() => process.exit(1), 100).unref();
  });

  process.on('unhandledRejection', (reason) => {
    logger.error(
      { service: serviceName, reason: reason?.message || String(reason) },
      'Unhandled promise rejection'
    );
    // Don't exit on unhandledRejection — that's too aggressive. Just log.
  });

  logger.info({ service: serviceName }, 'Graceful shutdown handlers installed');
}

export default { installGracefulShutdown };
