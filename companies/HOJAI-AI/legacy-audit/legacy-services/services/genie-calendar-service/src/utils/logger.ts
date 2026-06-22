type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export function createLogger(serviceName: string) {
  const format = (level: LogLevel, message: string, data?: Record<string, unknown>) =>
    JSON.stringify({ timestamp: new Date().toISOString(), level, service: serviceName, message, ...(data && { data }) });
  return {
    debug: (m, d?) => console.debug(format('debug', m, d)),
    info: (m, d?) => console.info(format('info', m, d)),
    warn: (m, d?) => console.warn(format('warn', m, d)),
    error: (m, d?) => console.error(format('error', m, d)),
  };
}
