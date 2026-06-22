import { merchantService } from '../services/merchantService.js';
import { Request, Response, NextFunction } from 'express';

/**
 * API Key authentication middleware
 */
export async function verifyApiKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      hint: 'Include X-API-Key header'
    });
  }

  try {
    const merchant = await merchantService.validateApiKey(apiKey);

    if (!merchant) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Attach merchant info to request
    (req as any).tenantId = merchant.tenantId;
    (req as any).merchantId = (merchant as any)._id || merchant.id;
    (req as any).merchant = merchant;

    next();
  } catch (error) {
    console.error('[API Auth] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

/**
 * Tenant ID extraction middleware (for internal services)
 */
export async function extractTenantId(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: 'Tenant ID required',
      hint: 'Include X-Tenant-ID header'
    });
  }

  (req as any).tenantId = tenantId;
  next();
}
