/**
 * Auth Service
 *
 * Issues and verifies real JWTs for the commerce-identity service.
 *
 * This service:
 *   - Issues JWTs for supplier/buyer login (email + password)
 *   - Issues short-lived OTP tokens for guest verification
 *   - Verifies incoming JWTs from the auth middleware
 *   - Manages password hashes per corpId
 *
 * Role determination:
 *   Roles are derived from the persisted entity type (Supplier vs Buyer),
 *   NOT from string prefixes of the corpId. The previous version was
 *   vulnerable to role escalation (see B-AUTH-2 in NEXHA-DEEP-AUDIT.md).
 *
 * Security:
 *   - JWT_SECRET is required in production (fail-fast on startup)
 *   - bcrypt cost factor 12
 *   - timing-safe comparison used everywhere for secret comparison
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Supplier } from '../models/supplier.model';
import { Buyer } from '../models/buyer.model';
import { logger } from '../config/logger';

const IS_PRODUCTION = (process.env.NODE_ENV || 'development') === 'production';

// Fail-fast if JWT_SECRET is missing or is the dev placeholder in production.
// This closes B-AUTH-6 (silent fallback to known secret).
function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const DEV_PLACEHOLDER = 'dev-secret-change-me-in-production-please';
  if (!secret || secret === DEV_PLACEHOLDER) {
    if (IS_PRODUCTION) {
      throw new Error(
        'JWT_SECRET is missing or set to the dev placeholder. Refusing to start in production. ' +
          'Generate one with: openssl rand -hex 32'
      );
    }
    // Dev only — log a loud warning, do not throw (keeps `npm run dev` frictionless).
    logger.warn(
      'JWT_SECRET is unset or set to the dev placeholder. Tokens issued will be forgeable. ' +
        'This is OK for local dev only.'
    );
    return secret || DEV_PLACEHOLDER;
  }
  return secret;
}

const JWT_SECRET = resolveJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_ISSUER = process.env.JWT_ISSUER || 'nexha-commerce-identity';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'nexha-portal';
const BCRYPT_ROUNDS = 12;

// --- Types ---

export type Role = 'supplier' | 'buyer' | 'admin' | 'system' | 'guest';

export interface JwtPayload {
  sub: string; // corpId (or guestId for guests)
  role: Role;
  guestId?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  expiresAt?: string;
  role?: Role;
  error?: string;
}

// --- Role resolution (closes B-AUTH-2) ---

/**
 * Look up an identity in the database and return its role.
 *
 * Replaces the previous prefix-based role detection that was vulnerable
 * to role escalation (any corpId not starting with SUP/BUY was treated as admin).
 */
export async function resolveRole(corpId: string): Promise<Role | null> {
  if (!corpId) return null;
  if (await Supplier.exists({ corpId })) return 'supplier';
  if (await Buyer.exists({ corpId })) return 'buyer';
  return null;
}

// --- Password management ---

/**
 * Hash and store a password for a corpId. Called once during onboarding
 * or when the supplier/buyer sets their login credentials.
 */
export async function setPassword(corpId: string, password: string): Promise<void> {
  if (!corpId || !password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  // Locate the entity. We write the hash into metadata.passwordHash because
  // we don't want to add a new top-level field to the Supplier/Buyer schemas
  // (those schemas are documented as stable). metadata is a Mixed field
  // by design; we treat the password hash as opaque bytes.
  const entity =
    (await Supplier.findOneAndUpdate(
      { corpId },
      { $set: { 'metadata.passwordHash': hash, lastActiveAt: new Date() } },
      { new: true }
    )) ||
    (await Buyer.findOneAndUpdate(
      { corpId },
      { $set: { 'metadata.passwordHash': hash, lastActiveAt: new Date() } },
      { new: true }
    ));
  if (!entity) throw new Error(`Identity not found: ${corpId}`);
  logger.info('Password set', { corpId });
}

/**
 * Verify a password against a stored hash. Uses bcrypt.compare (constant-time).
 */
export async function verifyPassword(corpId: string, password: string): Promise<boolean> {
  if (!corpId || !password) return false;
  const entity =
    (await Supplier.findOne({ corpId }, { 'metadata.passwordHash': 1 })) ||
    (await Buyer.findOne({ corpId }, { 'metadata.passwordHash': 1 }));
  if (!entity || !entity.metadata) return false;
  const hash = (entity.metadata as Record<string, unknown>)['passwordHash'] as string | undefined;
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

// --- JWT issuance ---

/**
 * Issue a JWT for a supplier or buyer after email+password login.
 * Role is derived from the persisted entity (see resolveRole), NOT from
 * the request — caller cannot influence the role.
 */
export async function issueLoginToken(
  corpId: string,
  requestedRole?: Role
): Promise<LoginResult> {
  const role = await resolveRole(corpId);
  if (!role) return { success: false, error: 'Identity not found' };

  // Admin role is only granted via admin promotion (not via login).
  // If requestedRole is 'admin' but the resolved role isn't admin, ignore the request.
  const finalRole: Role =
    role === 'admin' ? 'admin' : (requestedRole === 'admin' ? role : role);

  const expiresAt = new Date(Date.now() + ms(JWT_EXPIRES_IN));
  const payload: JwtPayload = {
    sub: corpId,
    role: finalRole,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
  logger.info('JWT issued', { corpId, role: finalRole, expiresAt });
  return { success: true, token, expiresAt: expiresAt.toISOString(), role: finalRole };
}

/**
 * Issue a short-lived JWT for a guest after OTP verification.
 */
export async function issueGuestToken(guestId: string, _phone: string): Promise<LoginResult> {
  const expiresIn = '1h';
  const payload: JwtPayload = {
    sub: guestId,
    role: 'guest',
    guestId,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
  const expiresAt = new Date(Date.now() + ms(expiresIn));
  logger.info('Guest JWT issued', { guestId });
  return { success: true, token, expiresAt: expiresAt.toISOString(), role: 'guest' };
}

/**
 * Issue a system-level token for service-to-service calls.
 */
export function issueSystemToken(serviceName: string): string {
  const payload: JwtPayload = {
    sub: serviceName,
    role: 'system',
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' as jwt.SignOptions['expiresIn'] });
}

// --- JWT verification ---

export type VerifyResult =
  | { valid: true; payload: JwtPayload }
  | { valid: false; reason: string };

/**
 * Verify a JWT and return its payload. Used by the auth middleware.
 */
export function verifyToken(token: string): VerifyResult {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtPayload;
    return { valid: true, payload };
  } catch (err) {
    const e = err as Error & { name?: string; message?: string };
    if (e.name === 'TokenExpiredError') return { valid: false, reason: 'Token expired' };
    if (e.name === 'JsonWebTokenError') {
      return { valid: false, reason: `Invalid token: ${e.message}` };
    }
    return { valid: false, reason: 'Verification failed' };
  }
}

// --- Helper ---

function ms(str: string): number {
  const match = str.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const u = match[2] as 'd' | 'h' | 'm' | 's';
  const table: Record<string, number> = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  return n * table[u];
}
