declare module '@rtmn/shared/auth' {
  import type { RequestHandler } from 'express';
  export const requireAuth: RequestHandler;
}

declare module '@rtmn/shared/lib/shutdown' {
  import type { Server } from 'http';
  export function installGracefulShutdown(
    server: Server,
    cleanup?: () => Promise<void>,
    options?: { hardTimeoutMs?: number; serviceName?: string }
  ): void;
}