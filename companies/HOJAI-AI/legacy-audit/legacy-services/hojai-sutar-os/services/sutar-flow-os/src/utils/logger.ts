/**
 * SUTAR Flow OS - Logger Utility
 */

export function createLogger(service: string) {
  return {
    info: (event: string, data?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: 'info',
        service: `sutar-flow-os:${service}`,
        event,
        ...data,
        timestamp: new Date().toISOString()
      }));
    },
    error: (event: string, data?: Record<string, unknown>) => {
      console.error(JSON.stringify({
        level: 'error',
        service: `sutar-flow-os:${service}`,
        event,
        ...data,
        timestamp: new Date().toISOString()
      }));
    },
    warn: (event: string, data?: Record<string, unknown>) => {
      console.warn(JSON.stringify({
        level: 'warn',
        service: `sutar-flow-os:${service}`,
        event,
        ...data,
        timestamp: new Date().toISOString()
      }));
    },
    debug: (event: string, data?: Record<string, unknown>) => {
      if (process.env.LOG_LEVEL === 'debug') {
        console.log(JSON.stringify({
          level: 'debug',
          service: `sutar-flow-os:${service}`,
          event,
          ...data,
          timestamp: new Date().toISOString()
        }));
      }
    }
  };
}

export default createLogger;
