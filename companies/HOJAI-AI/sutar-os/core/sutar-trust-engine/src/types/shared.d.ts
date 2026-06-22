/**
 * Ambient type declarations for the @rtmn/shared package.
 * The shared package is plain JS (no .d.ts) so we declare the modules
 * we use here.
 */

declare module '@rtmn/shared/auth' {
  import type { RequestHandler } from 'express';
  export const requireAuth: RequestHandler;
}

declare module '@rtmn/shared/lib/shutdown' {
  import type { Server } from 'http';
  export function installGracefulShutdown(server: Server): void;
}
