// Type declarations for @rtmn/shared (a JavaScript-only library)

declare module '@rtmn/shared/lib/logger' {
  import winston from 'winston';
  export function createLogger(serviceName: string): winston.Logger;
}

declare module '@rtmn/shared/lib/database' {
  export function connectMongo(uri: string): Promise<unknown>;
  export function connectPostgres(uri: string): Promise<unknown>;
}

declare module '@rtmn/shared/lib/persistent-store' {
  export function createPersistentStore(options: { name: string; dataDir?: string }): unknown;
}

declare module '@rtmn/shared/lib/errors' {
  export class AppError extends Error {
    constructor(message: string, statusCode?: number);
    statusCode: number;
  }
  export class NotFoundError extends AppError {
    constructor(resource?: string);
  }
  export class ValidationError extends AppError {
    constructor(message: string);
  }
}

declare module '@rtmn/shared/auth' {
  export function requireAuth(req: unknown, res: unknown, next: unknown): void;
  export function requireRole(role: string): unknown;
}

declare module '@rtmn/shared' {
  export const logger: unknown;
}
