/**
 * Simple logger for nextabizz
 * In production, consider using a proper logging service (Datadog, LogRocket, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

function formatLog(entry: LogEntry): string {
  const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}`;
}

function createLogger(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  const formatted = formatLog(entry);

  switch (level) {
    case 'debug':
      if (process.env.NODE_ENV !== 'production') {
        logger.debug(formatted);
      }
      break;
    case 'info':
      logger.info(formatted);
      break;
    case 'warn':
      logger.warn(formatted);
      break;
    case 'error':
      logger.error(formatted);
      break;
  }
}

const logger = {
  debug: (message: string, context?: Record<string, unknown>) => createLogger('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => createLogger('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => createLogger('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => createLogger('error', message, context),
};

export default logger;
