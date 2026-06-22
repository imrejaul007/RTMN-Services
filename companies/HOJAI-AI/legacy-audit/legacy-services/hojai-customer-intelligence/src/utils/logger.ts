/**
 * HOJAI Customer Intelligence - Logger Utility
 */

export function createLogger(service: string) {
  return {
    info: (event: string, data?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: 'info',
        service: `customer-intelligence:${service}`,
        event,
        ...data,
        timestamp: new Date().toISOString()
      }));
    },
    error: (event: string, data?: Record<string, unknown>) => {
      console.error(JSON.stringify({
        level: 'error',
        service: `customer-intelligence:${service}`,
        event,
        ...data,
        timestamp: new Date().toISOString()
      }));
    },
    warn: (event: string, data?: Record<string, unknown>) => {
      console.warn(JSON.stringify({
        level: 'warn',
        service: `customer-intelligence:${service}`,
        event,
        ...data,
        timestamp: new Date().toISOString()
      }));
    }
  };
}

export default createLogger;
