/**
 * Ambient type declarations for the @rtmn/shared package.
 * The shared package is plain JS (no .d.ts) so we declare the modules
 * we use here.
 */

declare module '@rtmn/shared/auth' {
  import type { RequestHandler } from 'express';
  export const requireAuth: RequestHandler;
}

declare module '@rtmn/shared/event-bus' {
  export class EventBus {
    constructor(options: { serviceName: string; [k: string]: unknown });
    connect(): Promise<void>;
    publishAsync(type: string, payload: Record<string, unknown>, opts?: { tenantId?: string | null }): void;
    publish(type: string, payload: Record<string, unknown>, opts?: { tenantId?: string | null }): Promise<unknown>;
    subscribe(patterns: string[], handler: (event: Record<string, unknown>) => Promise<void> | void): Promise<unknown>;
    quit(): Promise<void>;
  }
}

declare module '@rtmn/shared/lib/shutdown' {
  import type { Server } from 'http';
  export function installGracefulShutdown(
    server: Server,
    cleanup?: () => Promise<void>,
    options?: { hardTimeoutMs?: number; serviceName?: string }
  ): void;
}