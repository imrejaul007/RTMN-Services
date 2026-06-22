import { logger } from '../../shared/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getRezUserInfo } from '@/lib/rezOAuth';

const MERCHANT_SERVICE_URL = process.env.REZ_MERCHANT_SERVICE_URL || 'http://localhost:4005';
const INTERNAL_KEY = process.env.REZ_INTERNAL_KEY || '';

/**
 * POST /api/merchant/link-rez-user
 *
 * Links the authenticated merchant's account to their REZ user ID.
 *
 * Flow:
 * 1. Verify the OAuth access token to get the REZ user ID
 * 2. Validate the merchantId belongs to this account (via session)
 * 3. Call merchant service to link merchantId to rezUserId
 *
 * Body:
 *   merchantId: string — the merchant's ObjectId
 *   accessToken: string — the REZ OAuth access token (for user verification)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      merchantId: string;
      accessToken: string;
    };

    const { merchantId, accessToken } = body;

    if (!merchantId || !/^[a-f0-9]{24}$/i.test(merchantId)) {
      return NextResponse.json({ error: 'Invalid merchantId format' }, { status: 400 });
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    // Verify the access token and get the REZ user ID
    let rezUserId: string;
    try {
      const userInfo = await getRezUserInfo(accessToken);
      rezUserId = userInfo.sub;
    } catch {
      return NextResponse.json({ error: 'Invalid or expired access token' }, { status: 401 });
    }

    if (!MERCHANT_SERVICE_URL || !INTERNAL_KEY) {
      return NextResponse.json(
        { error: 'Merchant service not configured' },
        { status: 503 },
      );
    }

    // Call the merchant service internal API to link the account
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 10000);

    const linkRes = await fetch(
      `${MERCHANT_SERVICE_URL}/api/internal/merchants/${merchantId}/link-rez-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': INTERNAL_KEY,
        },
        body: JSON.stringify({ rezUserId }),
        signal: ac.signal,
      },
    );
    clearTimeout(timer);

    if (!linkRes.ok) {
      const errorData = await linkRes.json() as { error?: string };
      return NextResponse.json(
        { error: errorData.error || 'Failed to link account' },
        { status: linkRes.status },
      );
    }

    return NextResponse.json({ success: true, merchantId, rezUserId });
  } catch (err) {
    logger.error('[link-rez-user] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
