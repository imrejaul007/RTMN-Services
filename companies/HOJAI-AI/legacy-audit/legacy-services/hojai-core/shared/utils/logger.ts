/**
 * Hojai Core - Logger Utility
 */

export function createLogger(service: string) {
  return {
    info: (event: string, data?: Record<string, unknown>) => {
      console.log(JSON.stringify({ level: 'info', service, event, ...data }));
    },
    error: (event: string, data?: Record<string, unknown>) => {
      console.error(JSON.stringify({ level: 'error', service, event, ...data }));
    },
    warn: (event: string, data?: Record<string, unknown>) => {
      console.warn(JSON.stringify({ level: 'warn', service, event, ...data }));
    },
    debug: (event: string, data?: Record<string, unknown>) => {
      if (process.env.DEBUG === 'true') {
        console.log(JSON.stringify({ level: 'debug', service, event, ...data }));
      }
    }
  };
}
