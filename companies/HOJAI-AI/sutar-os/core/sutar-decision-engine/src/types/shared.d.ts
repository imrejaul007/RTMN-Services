/**
 * Local type augmentations for sutar-decision-engine.
 *
 * The @rtmn/shared package ships its own type declarations
 * (auth/index.d.ts) so we don't need to declare its modules here. We only
 * augment Express.Request to carry the tenant context set by the
 * createTenantContext middleware.
 *
 * ADR-0009 Phase 1.
 */

// Marker export makes this file a module, which is required for the global
// namespace augmentation below to be valid.
export {};

declare global {
  namespace Express {
    interface Request {
      tenant?: {
        companyId: string;
        source: string;
      };
    }
  }
}