import { logger } from '../../shared/logger';
import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForTokens,
  getRezUserInfo,
} from '@/lib/rezOAuth';
import { MerchantSession } from '@/lib/supabase';

const REZ_CLIENT_SECRET = process.env.REZ_OAUTH_CLIENT_SECRET || '';
const MERCHANT_SERVICE_URL = process.env.REZ_MERCHANT_SERVICE_URL || 'http://localhost:4005';
const INTERNAL_KEY = process.env.REZ_INTERNAL_KEY || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * GET /api/auth/callback
 *
 * OAuth2 callback handler for NextaBiZ.
 *
 * Flow:
 * 1. REZ Auth Service redirects here with ?code=xxx&state=yyy
 * 2. Exchange code for access + refresh tokens at /oauth/token
 * 3. Fetch user profile via /oauth/userinfo
 * 4. Look up linked merchant account via merchant service internal API
 * 5. Store merchant session in localStorage
 * 6. Redirect to /signals (authenticated dashboard)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    const redirectUrl = new URL('/(auth)/login', request.url);
    redirectUrl.searchParams.set('oauth_error', error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  let redirectTo = '/signals';
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      redirectTo = decoded.redirectTo || '/signals';
    } catch {
      // Invalid state — use default
    }
  }

  try {
    const tokens = await exchangeCodeForTokens(code, REZ_CLIENT_SECRET);
    const userInfo = await getRezUserInfo(tokens.access_token);

    let merchantId = userInfo.sub;
    let businessName = userInfo.name || 'My Business';

    // Look up linked merchant account
    if (MERCHANT_SERVICE_URL && INTERNAL_KEY) {
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 5000);
        const lookupRes = await fetch(
          `${MERCHANT_SERVICE_URL}/api/internal/merchants/by-rez-user/${encodeURIComponent(userInfo.sub)}`,
          {
            headers: { 'x-internal-token': INTERNAL_KEY },
            signal: ac.signal,
          },
        );
        clearTimeout(timer);

        if (lookupRes.ok) {
          const lookupData = await lookupRes.json() as { success: boolean; data?: { merchantId: string; businessName: string; isActive: boolean } };
          if (lookupData.success && lookupData.data) {
            merchantId = lookupData.data.merchantId;
            businessName = lookupData.data.businessName;
          }
        }
      } catch (err) {
        // Non-fatal: fall back to user sub as merchantId
        logger.warn('[oauth-callback] Merchant lookup failed, using sub as merchantId', err);
      }
    }

    const session: MerchantSession = {
      id: userInfo.sub,
      merchantId,
      businessName,
      email: userInfo.email || userInfo.phone + '@rez.money',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };

    const sessionData = Buffer.from(JSON.stringify(session)).toString('base64');
    const hydrationUrl = new URL('/(auth)/session-hydrate', request.url);
    hydrationUrl.searchParams.set('session', sessionData);
    hydrationUrl.searchParams.set('redirectTo', redirectTo);
    return NextResponse.redirect(hydrationUrl);
  } catch (err) {
    logger.error('[oauth-callback] Error:', err);
    const errorUrl = new URL('/(auth)/login', request.url);
    errorUrl.searchParams.set('oauth_error', 'callback_error');
    return NextResponse.redirect(errorUrl);
  }
}
