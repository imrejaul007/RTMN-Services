type LogLevel = 'debug' | 'info' | 'warn' | 'error';
class Logger {
  private serviceName: string;
  private readonly levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
  constructor(serviceName: string) { this.serviceName = serviceName; }
  private output(level: LogLevel, action: string, data?: Record<string, unknown>): void {
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${this.serviceName}]`;
    const msg = Object.entries({ action, ...data }).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ');
    level === 'error' ? console.error(prefix, msg) : level === 'warn' ? console.warn(prefix, msg) : console.log(prefix, msg);
  }
  debug(a: string, d?: Record<string, unknown>) { this.output('debug', a, d); }
  info(a: string, d?: Record<string, unknown>) { this.output('info', a, d); }
  warn(a: string, d?: Record<string, unknown>) { this.output('warn', a, d); }
  error(a: string, d?: Record<string, unknown>) { this.output('error', a, d); }
}
export function createLogger(serviceName: string): Logger { return new Logger(serviceName); }
