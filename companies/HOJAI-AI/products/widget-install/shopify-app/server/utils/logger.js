/**
 * Logger Utility
 * Structured logging with levels, timestamps, and context
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LOG_LEVELS.info;

function formatMessage(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const contextStr = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';

  return {
    timestamp,
    level,
    message,
    ...context,
    // Also include a readable string for console output
    _string: `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  };
}

function log(level, message, context = {}) {
  if (LOG_LEVELS[level] > currentLevel) {
    return;
  }

  const formatted = formatMessage(level, message, context);

  // Console output with colors
  const colors = {
    error: '\x1b[31m', // red
    warn: '\x1b[33m',  // yellow
    info: '\x1b[36m',  // cyan
    debug: '\x1b[90m'  // gray
  };

  const color = colors[level] || '';
  const reset = '\x1b[0m';

  console.log(`${color}${formatted._string}${reset}`);

  // In production, you would send logs to a logging service
  // like CloudWatch, Datadog, or a custom log aggregator
  if (process.env.NODE_ENV === 'production') {
    // Send to log aggregation service
    sendToLogService(formatted).catch(() => {
      // Silently fail - don't break the app
    });
  }

  return formatted;
}

async function sendToLogService(logEntry) {
  // Placeholder for log aggregation service integration
  // In production, this would send to CloudWatch, Datadog, etc.
  if (process.env.LOG_WEBHOOK_URL) {
    try {
      const response = await fetch(process.env.LOG_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
  return false;
}

export const logger = {
  error: (message, context) => log('error', message, context),
  warn: (message, context) => log('warn', message, context),
  info: (message, context) => log('info', message, context),
  debug: (message, context) => log('debug', message, context)
};

export default logger;