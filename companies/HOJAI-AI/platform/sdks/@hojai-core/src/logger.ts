/**
 * HOJAI Logger
 */

import { Config } from './config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
  correlationId?: string;
}

export class Logger {
  private config: Config;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  constructor(config: Config) {
    this.config = config;
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
      correlationId: process.env.CORRELATION_ID,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    const prefix = `[${level.toUpperCase()}]`;
    const time = new Date(entry.timestamp).toISOString();

    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${time} ${message}`, data || '');
        break;
      case 'info':
        console.info(`${prefix} ${time} ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`${prefix} ${time} ${message}`, data || '');
        break;
      case 'error':
        console.error(`${prefix} ${time} ${message}`, data || '');
        break;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const msgLevel = levels.indexOf(level);
    return msgLevel >= configLevel;
  }

  getLogs(filter?: { level?: LogLevel; since?: number }): LogEntry[] {
    let filtered = this.logs;

    if (filter?.level) {
      filtered = filtered.filter(l => l.level === filter.level);
    }

    if (filter?.since) {
      filtered = filtered.filter(l => l.timestamp >= filter.since);
    }

    return filtered;
  }

  clear(): void {
    this.logs = [];
  }
}
