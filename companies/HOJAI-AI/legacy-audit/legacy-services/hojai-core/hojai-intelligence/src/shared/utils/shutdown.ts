/**
 * Graceful Shutdown Utility
 */

let isShuttingDown = false;

export function initGracefulShutdown() {
  const cleanup = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(JSON.stringify({ level: 'info', event: 'graceful_shutdown_initiated', timestamp: new Date().toISOString() }));
    process.exit(0);
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.on('uncaughtException', (err) => {
    console.error(JSON.stringify({ level: 'error', event: 'uncaught_exception', error: err.message }));
    cleanup();
  });
}

export function shutdownMiddleware(req: any, res: any, next: any) {
  if (isShuttingDown) {
    res.status(503).json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Service is shutting down' } });
    return;
  }
  next();
}

export function isShuttingDownState() {
  return isShuttingDown;
}

export default { initGracefulShutdown, shutdownMiddleware, isShuttingDownState };
