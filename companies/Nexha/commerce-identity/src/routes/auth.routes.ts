import { Router, Request, Response } from 'express';
import { verifyPassword, issueLoginToken, issueGuestToken, setPassword } from '../services/auth.service';
import { GuestSupplierService } from '../services/guest-supplier.service';
import { requireAuth, AuthedRequest } from '../middleware/auth.middleware';
import { asyncHandler, HttpError } from '../middleware/error.middleware';

const router = Router();

// POST /api/auth/login — email + password login
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
      throw new HttpError(401, 'Invalid credentials');
    }

    // Determine role from the identity
    const role = corpId.startsWith('SUP') ? 'supplier' : corpId.startsWith('BUY') ? 'buyer' : 'admin';
    const result = await issueLoginToken(corpId, role as 'supplier' | 'buyer' | 'admin');
    if (!result.success) {
      throw new HttpError(500, result.error || 'Token issuance failed');
    }
    res.json({ success: true, data: { token: result.token, expiresAt: result.expiresAt, corpId } });
  })
);

// POST /api/auth/password — set a password for a corpId
router.post(
  '/password',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { password } = req.body as { password: string };
    if (!password || password.length < 8) {
      throw new HttpError(400, 'Password must be at least 8 characters');
    }
    await setPassword(req.corpId!, password);
    res.json({ success: true, message: 'Password set successfully' });
  })
);

// POST /api/auth/guest-token — exchange OTP verification for a short-lived guest JWT
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

    res.json({
      success: true,
      data: {
        token: tokenResult.token,
        expiresAt: tokenResult.expiresAt,
        guestId,
        status: result.guest?.status,
      },
    });
  })
);

// GET /api/auth/me — verify a token and return identity info
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

export { router as authRouter };
