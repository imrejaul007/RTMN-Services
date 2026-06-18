/**
 * Marketing OS Logger
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  http: 2
};

const currentLevel = process.env.LOG_LEVEL || 'info';

function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] <= LOG_LEVELS[currentLevel]) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      service: 'Marketing OS',
      message,
      ...meta
    };
    console.log(JSON.stringify(logEntry));
  }
}

module.exports = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),
  http: (message, meta) => log('http', message, meta)
};
