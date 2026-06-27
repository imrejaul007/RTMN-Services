/**
 * Shared mock state for monitoring tests.
 * Both the vi.mock factory and the test code import from here,
 * ensuring the same Map instances are used.
 */
export const SHARED = {
  services:       new Map<string, any>(),
  metrics:        new Map<string, any[]>(),
  'alert-rules':  new Map<string, any>(),
  'active-alerts': new Map<string, any>(),
};