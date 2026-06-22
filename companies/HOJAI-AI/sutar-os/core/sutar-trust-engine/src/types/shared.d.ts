/**
 * Local type augmentations for sutar-trust-engine.
 *
 * The @rtmn/shared package ships its own type declarations
 * (auth/index.d.ts) so we don't redeclare its modules here. We only
 * augment Express.Request to carry the tenant context set by the
 * createTenantContext middleware.
 *
 * ADR-0009 Phase 1.
 */

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