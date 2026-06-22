type LogLevel = 'debug' | 'info' | 'warn' | 'error';
class Logger {
  private serviceName: string;
  private minLevel: LogLevel;
  private readonly levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
  constructor(serviceName: string, minLevel: LogLevel = 'info') { this.serviceName = serviceName; this.minLevel = minLevel; }
  private output(level: LogLevel, action: string, data?: Record<string, unknown>): void {
    if (this.levels[level] < this.levels[this.minLevel]) return;
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${this.serviceName}]`;
    const msg = Object.entries({ action, ...data }).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ');
    level === 'error' ? console.error(prefix, msg) : level === 'warn' ? console.warn(prefix, msg) : console.log(prefix, msg);
  }
  debug(action: string, data?: Record<string, unknown>) { this.output('debug', action, data); }
  info(action: string, data?: Record<string, unknown>) { this.output('info', action, data); }
  warn(action: string, data?: Record<string, unknown>) { this.output('warn', action, data); }
  error(action: string, data?: Record<string, unknown>) { this.output('error', action, data); }
}
export function createLogger(serviceName: string): Logger { return new Logger(serviceName); }
