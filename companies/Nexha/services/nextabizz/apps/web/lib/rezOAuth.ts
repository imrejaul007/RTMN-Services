/**
 * REZ OAuth2 client for NextaBiZ partner integration.
 *
 * Flow:
 * 1. buildAuthorizeUrl() → redirect user to REZ Auth Service
 * 2. Exchange code for tokens at /oauth/token
 * 3. Get user info via /oauth/userinfo
 */

const REZ_AUTH_URL =
  process.env.NEXT_PUBLIC_REZ_AUTH_URL ||
  process.env.REZ_AUTH_SERVICE_URL ||
  'https://rez-auth-service.onrender.com';

export const REZ_CLIENT_ID =
  process.env.NEXT_PUBLIC_NEXTABIZZ_CLIENT_ID || 'nextabizz';

/** Must match PARTNER_NEXTABIZZ_REDIRECT_URI in REZ Auth Service. */
export const REDIRECT_URI =
  process.env.NEXT_PUBLIC_NEXTABIZZ_REDIRECT_URI ||
  (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') + '/api/auth/callback';

const SCOPES = ['profile', 'merchant'];

/**
 * Build the REZ Auth Service authorization URL.
 * Redirect the user here to initiate the OAuth2 flow.
 */
export function buildAuthorizeUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: REZ_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
  });

  if (state) {
    params.set('state', state);
  }

  return `${REZ_AUTH_URL}/oauth/authorize?${params.toString()}`;
}

/** OAuth2 token response from /oauth/token */
export interface RezTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

/** User info from /oauth/userinfo */
export interface RezUserInfo {
  sub: string;
  phone: string;
  name: string;
  email?: string;
  profileImage?: string;
  scope: string[];
}

/** Exchange authorization code for tokens. */
export async function exchangeCodeForTokens(
  code: string,
  clientSecret: string,
): Promise<RezTokenResponse> {
  const res = await fetch(`${REZ_AUTH_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: REZ_CLIENT_ID,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `Token exchange failed (${res.status}): ${body.error_description || body.error || 'Unknown error'}`,
    );
  }

  return res.json() as Promise<RezTokenResponse>;
}

/** Fetch user info from REZ Auth Service using the access token. */
export async function getRezUserInfo(accessToken: string): Promise<RezUserInfo> {
  const res = await fetch(`${REZ_AUTH_URL}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `Userinfo failed (${res.status}): ${body.error || 'Unknown error'}`,
    );
  }

  return res.json() as Promise<RezUserInfo>;
}

/** Refresh an access token. */
export async function refreshAccessToken(
  refreshToken: string,
  clientSecret: string,
): Promise<RezTokenResponse> {
  const res = await fetch(`${REZ_AUTH_URL}/oauth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: REZ_CLIENT_ID,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `Token refresh failed (${res.status}): ${body.error || 'Unknown error'}`,
    );
  }

  return res.json() as Promise<RezTokenResponse>;
}
