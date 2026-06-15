/**
 * Auth Service
 *
 * Issues and verifies real JWTs for the commerce-identity service.
 * Acts as a lightweight auth server — in production the full auth flow
 * (login, password, SSO, OAuth) lives in rez-auth-service (4002).
 *
 * This service:
 *   - Issues JWTs for supplier/buyer login (email + password)
 *   - Issues short-lived OTP tokens for guest verification
 *   - Verifies incoming JWTs from the auth middleware
 *   - Manages simple password hashes per corpId
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Supplier } from '../models/supplier.model';
import { Buyer } from '../models/buyer.model';
import { logger } from '../config/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_ISSUER = process.env.JWT_ISSUER || 'nexha-commerce-identity';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'nexha-portal';
const BCRYPT_ROUNDS = 12;

// --- Types ---

export interface JwtPayload {
  sub: string;          // corpId
  role: 'supplier' | 'buyer' | 'admin' | 'system' | 'guest';
  guestId?: string;    // present for guest JWTs
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  expiresAt?: string;
  error?: string;
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
  // Store the hash on the identity document in metadata
  const entity = (await Supplier.findOne({ corpId })) || (await Buyer.findOne({ corpId }));
  if (!entity) throw new Error(`Identity not found: ${corpId}`);
  (entity.metadata = entity.metadata || {})['passwordHash'] = hash;
  await entity.save();
  logger.info('Password set for corpId', { corpId });
}

/**
 * Verify a password against a stored hash.
 */
export async function verifyPassword(corpId: string, password: string): Promise<boolean> {
  const entity = (await Supplier.findOne({ corpId })) || (await Buyer.findOne({ corpId }));
  if (!entity || !entity.metadata) return false;
  const hash = (entity.metadata as Record<string, unknown>)['passwordHash'] as string | undefined;
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

// --- JWT issuance ---

/**
 * Issue a JWT for a supplier or buyer after email+password login.
 */
export async function issueLoginToken(
  corpId: string,
  role: 'supplier' | 'buyer' | 'admin'
): Promise<LoginResult> {
  const entity = await Supplier.findOne({ corpId }) || await Buyer.findOne({ corpId });
  if (!entity) return { success: false, error: 'Identity not found' };

  const expiresAt = new Date(Date.now() + ms(JWT_EXPIRES_IN));
  const payload: JwtPayload = {
    sub: corpId,
    role,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  logger.info('JWT issued', { corpId, role, expiresAt });
  return { success: true, token, expiresAt: expiresAt.toISOString() };
}

/**
 * Issue a short-lived JWT for a guest after OTP verification.
 * This JWT is used for the guest's session until conversion.
 */
export async function issueGuestToken(guestId: string, phone: string): Promise<LoginResult> {
  // Guests are unverified — short TTL
  const expiresIn = '1h';
  const payload: JwtPayload = {
    sub: guestId,
    role: 'guest',
    guestId,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn });
  const expiresAt = new Date(Date.now() + ms(expiresIn));
  logger.info('Guest JWT issued', { guestId, phone });
  return { success: true, token, expiresAt: expiresAt.toISOString() };
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
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
    if (e.name === 'JsonWebTokenError') return { valid: false, reason: `Invalid token: ${e.message}` };
    return { valid: false, reason: 'Verification failed' };
  }
}

// --- Helper ---

function ms(str: string): number {
  const match = str.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d
  const n = Number(match[1]);
  const u = match[2];
  return n * { d: 86400000, h: 3600000, m: 60000, s: 1000 }[u];
}
