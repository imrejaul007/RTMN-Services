/**
 * Type declarations for @rtmn/shared/lib/shutdown.
 * Kept in sync with shutdown.js.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Server = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CleanupFn = () => Promise<any> | void;

export interface InstallGracefulShutdownOptions {
  hardTimeoutMs?: number;
}

export function installGracefulShutdown(
  server: Server,
  cleanup?: CleanupFn,
  options?: InstallGracefulShutdownOptions,
): void;