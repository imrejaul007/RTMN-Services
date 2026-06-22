import { NextRequest, NextResponse } from 'next/server';

const MERCHANT_SERVICE_URL = process.env.REZ_MERCHANT_SERVICE_URL || 'http://localhost:4005';
const INTERNAL_KEY = process.env.REZ_INTERNAL_KEY || '';

/**
 * GET /api/merchant/check-link-status?userId=xxx
 *
 * Checks whether a REZ user is linked to a merchant account.
 * Runs server-side to keep REZ_INTERNAL_KEY off the client.
 *
 * Query params:
 *   userId: string — the REZ user ID (from OAuth2 sub claim)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId || userId.length < 1 || userId.length > 64) {
    return NextResponse.json({ linked: false, error: 'Invalid userId' }, { status: 400 });
  }

  if (!MERCHANT_SERVICE_URL || !INTERNAL_KEY) {
    return NextResponse.json(
      { linked: false, merchantId: null, businessName: null },
      { status: 200 }, // Don't fail — just return not-linked
    );
  }

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 5000);

    const res = await fetch(
      `${MERCHANT_SERVICE_URL}/api/internal/merchants/by-rez-user/${encodeURIComponent(userId)}`,
      {
        headers: { 'x-internal-token': INTERNAL_KEY },
        signal: ac.signal,
      },
    );
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json() as {
        success: boolean;
        data?: { merchantId: string; businessName: string; isActive: boolean };
      };
      return NextResponse.json({
        linked: data.success && !!data.data,
        merchantId: data.data?.merchantId || null,
        businessName: data.data?.businessName || null,
        isActive: data.data?.isActive ?? true,
      });
    }

    // 404 = not linked
    return NextResponse.json({ linked: false, merchantId: null, businessName: null });
  } catch {
    return NextResponse.json(
      { linked: false, merchantId: null, businessName: null },
      { status: 200 }, // Non-fatal — return not-linked
    );
  }
}
