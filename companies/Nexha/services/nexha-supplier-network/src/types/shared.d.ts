/**
 * Ambient type declarations for the @rtmn/shared package.
 */

declare module '@rtmn/shared/auth' {
  import type { RequestHandler } from 'express';
  export const requireAuth: RequestHandler;
}

declare module '@rtmn/shared/lib/shutdown' {
  import type { Server } from 'http';
  export function installGracefulShutdown(server: Server): void;
}
