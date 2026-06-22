// ============================================================================
// SUTAR Identity OS - Logger Utility
// ============================================================================

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL as LogLevel] ?? LOG_LEVELS.info;

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, context: string, message: string, data?: unknown): string {
  const timestamp = formatTimestamp();
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}${dataStr}`;
}

export const logger = {
  debug(context: string, message: string, data?: unknown): void {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.debug(formatMessage("debug", context, message, data));
    }
  },

  info(context: string, message: string, data?: unknown): void {
    if (currentLevel <= LOG_LEVELS.info) {
      console.info(formatMessage("info", context, message, data));
    }
  },

  warn(context: string, message: string, data?: unknown): void {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(formatMessage("warn", context, message, data));
    }
  },

  error(context: string, message: string, data?: unknown): void {
    if (currentLevel <= LOG_LEVELS.error) {
      console.error(formatMessage("error", context, message, data));
    }
  },
};

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
