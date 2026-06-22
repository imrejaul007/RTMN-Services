/**
 * Type declarations for @rtmn/shared/auth.
 * Lets TypeScript consumers (SUTAR services, Industry OS) see the named
 * exports of auth/index.js (ESM) and auth/index.cjs (CJS) without the
 * shared lib having to ship TypeScript source.
 *
 * Keep this file in sync with index.js / index.cjs.
 *
 * Express types are referenced as `any` so the shared lib doesn't need to
 * pull in @types/express as a devDependency. Consumers will get full
 * type-checking from their own @types/express install.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (req: any, res: any, next?: any) => any;

export interface SimpleAuthPayload {
  userId?: string;
  businessId?: string;
  industry?: string;
  role?: string;
  [k: string]: unknown;
}

export interface CreateAuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
}

export function createAuthMiddleware(options?: CreateAuthMiddlewareOptions): AnyHandler;
export const requireAuth: AnyHandler;
export function createToken(payload: Record<string, unknown>, expiresIn?: number): string;
export function verifyToken(token: string): { valid: boolean; payload?: any; error?: string };
export function generateApiKey(industry: string, businessId: string): string;

export interface IndustryAuthInstance {
  industry: string;
  allowedRoles: string[];
  registerBusiness(data: any): Promise<any>;
  login(email: string, password: string): Promise<any>;
  verifyToken: typeof verifyToken;
  createCustomerToken(customerId: string, businessId: string): string;
  middleware: AnyHandler;
}

export interface CreateIndustryAuthOptions {
  defaultRole?: string;
  allowedRoles?: string[];
}

export function createIndustryAuth(industry: string, config?: CreateIndustryAuthOptions): IndustryAuthInstance;
export const auth: Record<string, IndustryAuthInstance>;

export interface CreateCorpIdAuthMiddlewareOptions {
  corpidUrl?: string;
  publicPaths?: string[];
  publicPathPatterns?: RegExp[];
  cacheTtlMs?: number;
  timeoutMs?: number;
  requireAuthEnv?: string;
}

export interface CorpIdAuthMiddleware extends AnyHandler {
  verifyToken(token: string): Promise<any | null>;
  extractToken(req: any): string | null;
  isAuthRequired(): boolean;
  isPublic(req: any): boolean;
  clearCache(): void;
  cacheSize(): number;
}

export function createCorpIdAuthMiddleware(
  options?: CreateCorpIdAuthMiddlewareOptions,
): CorpIdAuthMiddleware;

export function setRequireAuth(on: boolean, envName?: string): void;
export function getRequireAuth(envName?: string): boolean;

// ----------------------------------------------------------------------------
// Tenant context (ADR-0009 Phase 1 multi-tenancy)
// ----------------------------------------------------------------------------

export interface TenantInfo {
  companyId: string;
  source: string;
}

export interface CreateTenantContextOptions {
  publicPaths?: string[];
  publicPathPatterns?: RegExp[];
  requireTenantEnv?: string;
  allowHeaderFallbackEnv?: string;
}

export interface TenantContextMiddleware extends AnyHandler {
  resolveFromAuth(req: any): TenantInfo | null;
  resolveFromHeader(req: any): TenantInfo | null;
  isTenantRequired(): boolean;
  isHeaderFallback(): boolean;
}

export function createTenantContext(
  options?: CreateTenantContextOptions,
): TenantContextMiddleware;

export function getTenant(req: any): TenantInfo | undefined;
export function requireTenant(req: any, res: any, next: any): void;
