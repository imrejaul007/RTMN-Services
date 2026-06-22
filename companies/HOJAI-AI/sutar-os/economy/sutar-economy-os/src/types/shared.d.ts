// Type augmentations for the economy OS.
//
// The full @rtmn/shared/auth and @rtmn/shared/lib/shutdown types now live
// in the shared package itself (companies/HOJAI-AI/shared/auth/index.d.ts
// + shared/lib/shutdown.d.ts). This file only adds ambient augmentations
// to Express.Request for the tenant context, which is project-wide.
//
// `export {}` is required so the global namespace augmentation works.

export {};

declare global {
  namespace Express {
    interface Request {
      tenant?: { companyId: string; source: string };
    }
  }
}