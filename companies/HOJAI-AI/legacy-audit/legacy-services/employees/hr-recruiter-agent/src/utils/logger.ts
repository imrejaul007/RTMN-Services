/**
 * HR Recruiter Agent - Logger Utility
 * Structured logging with timestamps and levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  service: string;
  message: string;
  context?: Record<string, unknown>;
}

class Logger {
  private level: LogLevel;
  private service: string;

  constructor(service: string = 'hr-recruiter-agent', level: LogLevel = LogLevel.INFO) {
    this.service = service;
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatEntry(level: string, message: string, context?: Record<string, unknown>): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      context,
    };

    return JSON.stringify(entry);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatEntry('DEBUG', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatEntry('INFO', message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatEntry('WARN', message, context));
    }
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = error ? {
        ...context,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      } : context;

      console.error(this.formatEntry('ERROR', message, errorContext));
    }
  }

  // Specific logging methods for HR operations
  candidateCreated(candidateId: string, source: string): void {
    this.info('Candidate created', { candidateId, source });
  }

  candidateStatusChanged(candidateId: string, from: string, to: string): void {
    this.info('Candidate status changed', { candidateId, from, to });
  }

  interviewScheduled(interviewId: string, candidateId: string, scheduledAt: string): void {
    this.info('Interview scheduled', { interviewId, candidateId, scheduledAt });
  }

  interviewCompleted(interviewId: string, candidateId: string, overallScore: number): void {
    this.info('Interview completed', { interviewId, candidateId, overallScore });
  }

  onboardingStarted(onboardingId: string, candidateId: string, startDate: string): void {
    this.info('Onboarding started', { onboardingId, candidateId, startDate });
  }

  onboardingCompleted(onboardingId: string, candidateId: string, duration: number): void {
    this.info('Onboarding completed', { onboardingId, candidateId, duration });
  }

  screeningCompleted(candidateId: string, resumeId: string, score: number, recommendation: string): void {
    this.info('Screening completed', { candidateId, resumeId, score, recommendation });
  }

  matchingCompleted(jobId: string, candidateCount: number, avgScore: number): void {
    this.info('Matching completed', { jobId, candidateCount, avgScore });
  }
}

export const logger = new Logger();

export default Logger;
