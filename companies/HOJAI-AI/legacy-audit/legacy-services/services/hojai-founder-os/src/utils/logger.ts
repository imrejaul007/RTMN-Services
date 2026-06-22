/**
 * HOJAI FounderOS - Logger Utility
 */

export function createLogger(service: string) {
  return {
    info: (event: string, data?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: 'info',
        service: `founder-os:${service}`,
        event,
        ...data,
        timestamp: new Date().toISOString()
      }));
    },
    error: (event: string, data?: Record<string, unknown>) => {
      console.error(JSON.stringify({
        level: 'error',
        service: `founder-os:${service}`,
        event,
        ...data,
        ...(data?.error && typeof data.error === 'object' ? { error: JSON.stringify(data.error) } : {}),
        timestamp: new Date().toISOString()
      }));
    },
    warn: (event: string, data?: Record<string, unknown>) => {
      console.warn(JSON.stringify({
        level: 'warn',
        service: `founder-os:${service}`,
        event,
        ...data,
        timestamp: new Date().toISOString()
      }));
    }
  };
}

export default createLogger;
