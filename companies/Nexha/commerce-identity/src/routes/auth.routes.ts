import { Router, Request, Response } from 'express';
import {
  verifyPassword,
  issueLoginToken,
  issueGuestToken,
  setPassword,
  resolveRole,
} from '../services/auth.service';
import { GuestSupplierService } from '../services/guest-supplier.service';
import { requireAuth, AuthedRequest } from '../middleware/auth.middleware';
import { asyncHandler, HttpError } from '../middleware/error.middleware';
import { logger } from '../config/logger';

const router = Router();

/**
 * Set the JWT as an httpOnly cookie. Phase 5 / S-4 fix: previous version
 * returned the token in the response body and the portal stored it in
 * localStorage (XSS-vulnerable). Now the cookie is the authoritative store
 * and the response body also includes the token for non-browser callers.
 *
 * The token is also still accepted via Authorization: Bearer header so
 * server-to-server callers can keep using that pattern.
 */
function setAuthCookie(res: Response, token: string, expiresAtIso: string): void {
  const expires = new Date(expiresAtIso);
  res.cookie('nexha_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires,
    path: '/',
  });
}

/**
 * POST /api/auth/register
 *
 * Public one-shot registration: verifies a corpId exists, sets the initial
 * password, and returns a login JWT.
 *
 * Replaces the previous broken flow where /api/corpid/issue was public
 * but /api/suppliers required strict auth (B-REG-4 in NEXHA-DEEP-AUDIT.md).
 *
 * Flow:
 *   1. Public client calls POST /api/corpid/issue → gets a corpId
 *   2. Public client calls POST /api/suppliers with that corpId → identity created
 *   3. Public client calls POST /api/auth/register with corpId + password → JWT
 *
 * In production this endpoint is also reachable from internal services that
 * mint corpIds on behalf of users. It is *not* an open signup endpoint —
 * /api/corpid/issue is the only public identity-minting endpoint.
 */
router.post(
  '/register',
  requireAuth('public'),
  asyncHandler(async (req: Request, res: Response) => {
    const { corpId, password, type } = req.body as {
      corpId: string;
      password: string;
      type: 'supplier' | 'buyer';
    };
    if (!corpId || !password || !type) {
      throw new HttpError(400, 'corpId, password, and type are required');
    }
    if (password.length < 8) {
      throw new HttpError(400, 'Password must be at least 8 characters');
    }
    const role = await resolveRole(corpId);
    if (!role) {
      throw new HttpError(404, 'Identity not found — must be created first via /api/corpid/issue');
    }
    if (role !== type) {
      throw new HttpError(400, `corpId is registered as ${role}, not ${type}`);
    }
    await setPassword(corpId, password);
    const result = await issueLoginToken(corpId, role);
    if (!result.success || !result.token || !result.expiresAt) {
      throw new HttpError(500, result.error || 'Token issuance failed');
    }
    setAuthCookie(res, result.token, result.expiresAt);
    res.status(201).json({
      success: true,
      data: { token: result.token, expiresAt: result.expiresAt, corpId, role: result.role },
    });
  })
);

/**
 * POST /api/auth/login
 *
 * CorpId + password login. Returns a JWT.
 * Role is derived from the persisted entity (resolveRole) — the request
 * body never influences the role.
 */
router.post(
  '/login',
  requireAuth('public'),
  asyncHandler(async (req: Request, res: Response) => {
    const { corpId, password } = req.body as { corpId: string; password: string };
    if (!corpId || !password) {
      throw new HttpError(400, 'corpId and password are required');
    }

    const valid = await verifyPassword(corpId, password);
    if (!valid) {
      // Same error message regardless of cause (no such corpId vs wrong password)
      // to prevent user enumeration.
      throw new HttpError(401, 'Invalid credentials');
    }

    const result = await issueLoginToken(corpId);
    if (!result.success || !result.token || !result.expiresAt) {
      throw new HttpError(500, result.error || 'Token issuance failed');
    }
    setAuthCookie(res, result.token, result.expiresAt);
    res.json({
      success: true,
      data: { token: result.token, expiresAt: result.expiresAt, corpId, role: result.role },
    });
  })
);

/**
 * POST /api/auth/password
 *
 * Change the password for an already-authenticated user.
 * Requires strict auth — caller must have a valid JWT.
 */
router.post(
  '/password',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { password } = req.body as { password: string };
    if (!password || password.length < 8) {
      throw new HttpError(400, 'Password must be at least 8 characters');
    }
    if (!req.corpId) {
      throw new HttpError(401, 'No corpId in token');
    }
    await setPassword(req.corpId, password);
    logger.info('Password changed', { corpId: req.corpId });
    res.json({ success: true, message: 'Password set successfully' });
  })
);

/**
 * POST /api/auth/guest-token
 *
 * Exchange OTP verification for a short-lived guest JWT.
 */
router.post(
  '/guest-token',
  requireAuth('public'),
  asyncHandler(async (req: Request, res: Response) => {
    const { guestId, code } = req.body as { guestId: string; code: string };
    if (!guestId || !code) {
      throw new HttpError(400, 'guestId and code are required');
    }

    const result = await GuestSupplierService.verifyOtp(guestId, code);
    if (!result.success) {
      throw new HttpError(400, result.message);
    }

    const tokenResult = await issueGuestToken(guestId, result.guest?.whatsapp || '');
    if (!tokenResult.success) {
      throw new HttpError(500, tokenResult.error || 'Token issuance failed');
    }

    if (tokenResult.token && tokenResult.expiresAt) {
      setAuthCookie(res, tokenResult.token, tokenResult.expiresAt);
    }
    res.json({
      success: true,
      data: {
        token: tokenResult.token,
        expiresAt: tokenResult.expiresAt,
        guestId,
        role: tokenResult.role,
        status: result.guest?.status,
      },
    });
  })
);

/**
 * GET /api/auth/me
 * Return identity info from the current JWT.
 */
router.get(
  '/me',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    res.json({
      success: true,
      data: {
        corpId: req.corpId,
        role: req.role,
        guestId: req.guestId,
        authMethod: req.authMethod,
      },
    });
  })
);

/**
 * POST /api/auth/logout
 * Clear the auth cookie. Token is also discarded client-side.
 */
router.post(
  '/logout',
  (_req: Request, res: Response) => {
    res.clearCookie('nexha_token', { path: '/' });
    res.json({ success: true });
  }
);

export { router as authRouter };
