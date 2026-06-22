import { logger } from '../../shared/logger';
import { z } from 'zod';
import type {
  RezAuthUser,
  SSOCallbackResult,
  TokenExchangeResponse,
  ValidateTokenResponse,
} from './types';

// Environment variable names
const REZ_AUTH_SERVICE_URL = process.env.REZ_AUTH_SERVICE_URL || 'http://localhost:4000';
const REZ_API_GATEWAY_URL = process.env.REZ_API_GATEWAY_URL || 'http://localhost:4000';
const REZ_INTERNAL_KEY = process.env.REZ_INTERNAL_KEY || '';

// Zod schemas for response validation
const RezAuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['merchant', 'supplier', 'admin']),
  merchantId: z.string().optional(),
  supplierId: z.string().optional(),
  businessName: z.string().optional(),
});

const TokenExchangeResponseSchema = z.object({
  access_token: z.string(),
  user: RezAuthUserSchema,
});

const ValidateTokenResponseSchema = z.object({
  valid: z.boolean(),
  user: RezAuthUserSchema.optional(),
  error: z.string().optional(),
});

// Custom error class for REZ Auth errors
export class RezAuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'RezAuthError';
  }
}

// Network error handler
function handleNetworkError(error: unknown): never {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    throw new RezAuthError(
      'Network error: Unable to connect to REZ Auth Service. Please check your connection.',
      'NETWORK_ERROR'
    );
  }
  throw error;
}

// HTTP error handler
async function handleHttpError(response: Response): Promise<never> {
  let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;

  try {
    const errorBody: any = await response.json();
    if (errorBody.message) {
      errorMessage = errorBody.message;
    }
    if (errorBody.error) {
      errorMessage = errorBody.error;
    }
  } catch {
    // Response might not be JSON, use status text
  }

  let code = 'UNKNOWN_ERROR';
  let statusCode = response.status;

  switch (response.status) {
    case 400:
      code = 'BAD_REQUEST';
      break;
    case 401:
      code = 'UNAUTHORIZED';
      errorMessage = 'Invalid or expired token. Please log in again.';
      break;
    case 403:
      code = 'FORBIDDEN';
      errorMessage = 'Access denied. You do not have permission to perform this action.';
      break;
    case 404:
      code = 'NOT_FOUND';
      break;
    case 422:
      code = 'VALIDATION_ERROR';
      break;
    case 429:
      code = 'RATE_LIMITED';
      errorMessage = 'Too many requests. Please try again later.';
      break;
    case 500:
    case 502:
    case 503:
      code = 'SERVER_ERROR';
      errorMessage = 'REZ Auth Service is temporarily unavailable. Please try again later.';
      break;
  }

  throw new RezAuthError(errorMessage, code, statusCode);
}

// Get common headers for internal service calls
function getInternalHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (REZ_INTERNAL_KEY) {
    headers['x-internal-token'] = REZ_INTERNAL_KEY;
  }

  return headers;
}

/**
 * Validate an SSO token with the REZ Auth Service
 * @param token - The Bearer token to validate
 * @returns The authenticated user if token is valid
 * @throws RezAuthError if token is invalid, expired, or service is unavailable
 */
export async function validateSSOToken(token: string): Promise<RezAuthUser> {
  if (!token || token.trim() === '') {
    throw new RezAuthError('Token is required', 'MISSING_TOKEN');
  }

  // Remove 'Bearer ' prefix if present
  const cleanToken = token.startsWith('Bearer ')
    ? token.slice(7)
    : token;

  try {
    const response = await fetch(`${REZ_AUTH_SERVICE_URL}/oauth/userinfo`, {
      method: 'GET',
      headers: getInternalHeaders(cleanToken),
    });

    if (!response.ok) {
      await handleHttpError(response);
    }

    const data = await response.json();
    const validated = ValidateTokenResponseSchema.safeParse(data);

    if (!validated.success) {
      throw new RezAuthError(
        'Invalid response from REZ Auth Service',
        'INVALID_RESPONSE'
      );
    }

    if (!validated.data.valid) {
      throw new RezAuthError(
        validated.data.error || 'Token validation failed',
        'INVALID_TOKEN'
      );
    }

    if (!validated.data.user) {
      throw new RezAuthError(
        'No user data returned from token validation',
        'INVALID_TOKEN'
      );
    }

    const userResult = RezAuthUserSchema.safeParse(validated.data.user);
    if (!userResult.success) {
      throw new RezAuthError(
        'Invalid user data in token validation response',
        'INVALID_USER_DATA'
      );
    }

    return userResult.data;
  } catch (error) {
    if (error instanceof RezAuthError) {
      throw error;
    }
    handleNetworkError(error);
  }
}

/**
 * Exchange an OAuth authorization code for an access token
 * @param code - The authorization code from OAuth callback
 * @returns Token exchange response with access_token and user
 * @throws RezAuthError if exchange fails
 */
export async function exchangeCodeForToken(code: string): Promise<TokenExchangeResponse> {
  if (!code || code.trim() === '') {
    throw new RezAuthError('Authorization code is required', 'MISSING_CODE');
  }

  try {
    const response = await fetch(`${REZ_AUTH_SERVICE_URL}/oauth/token`, {
      method: 'POST',
      headers: getInternalHeaders(),
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      await handleHttpError(response);
    }

    const data = await response.json();
    const validated = TokenExchangeResponseSchema.safeParse(data);

    if (!validated.success) {
      throw new RezAuthError(
        'Invalid response from token exchange endpoint',
        'INVALID_RESPONSE'
      );
    }

    return validated.data;
  } catch (error) {
    if (error instanceof RezAuthError) {
      throw error;
    }
    handleNetworkError(error);
  }
}

/**
 * Get full merchant profile from REZ API Gateway
 * @param token - The access token
 * @returns Merchant profile data
 * @throws RezAuthError if profile fetch fails
 */
export async function getMerchantProfile(token: string): Promise<unknown> {
  if (!token || token.trim() === '') {
    throw new RezAuthError('Access token is required', 'MISSING_TOKEN');
  }

  try {
    const response = await fetch(`${REZ_API_GATEWAY_URL}/merchants/me`, {
      method: 'GET',
      headers: getInternalHeaders(token),
    });

    if (!response.ok) {
      await handleHttpError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof RezAuthError) {
      throw error;
    }
    handleNetworkError(error);
  }
}

/**
 * Get full supplier profile from REZ API Gateway
 * @param token - The access token
 * @returns Supplier profile data
 * @throws RezAuthError if profile fetch fails
 */
export async function getSupplierProfile(token: string): Promise<unknown> {
  if (!token || token.trim() === '') {
    throw new RezAuthError('Access token is required', 'MISSING_TOKEN');
  }

  try {
    const response = await fetch(`${REZ_API_GATEWAY_URL}/suppliers/me`, {
      method: 'GET',
      headers: getInternalHeaders(token),
    });

    if (!response.ok) {
      await handleHttpError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof RezAuthError) {
      throw error;
    }
    handleNetworkError(error);
  }
}

/**
 * Full SSO login flow for web applications
 * @param authorizationCode - The authorization code from OAuth callback
 * @returns SSOCallbackResult with user data and token on success
 */
export async function ssoLogin(authorizationCode: string): Promise<SSOCallbackResult> {
  try {
    // Step 1: Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(authorizationCode);

    // Step 2: Validate the token
    const user = await validateSSOToken(tokenResponse.access_token);

    // Step 3: Fetch full profile based on role
    let profile: unknown = {};
    try {
      if (user.role === 'merchant' && user.merchantId) {
        profile = await getMerchantProfile(tokenResponse.access_token);
      } else if (user.role === 'supplier' && user.supplierId) {
        profile = await getSupplierProfile(tokenResponse.access_token);
      }
    } catch (profileError) {
      // Profile fetch is non-critical, log but continue
      logger.warn('Failed to fetch profile:', profileError);
    }

    return {
      success: true,
      user: {
        ...user,
        ...(profile as Partial<RezAuthUser>),
      },
      token: tokenResponse.access_token,
    };
  } catch (error) {
    if (error instanceof RezAuthError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: `SSO login failed: ${error.message}`,
      };
    }

    return {
      success: false,
      error: 'An unexpected error occurred during SSO login',
    };
  }
}

/**
 * Check if a token is expired based on its exp claim
 * @param token - The JWT token to check
 * @returns true if expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ')
      ? token.slice(7)
      : token;

    const payload = JSON.parse(atob(cleanToken.split('.')[1]));
    const exp = payload.exp;

    if (!exp) {
      return false;
    }

    return Date.now() >= exp * 1000;
  } catch {
    // If we can't parse the token, assume it's not expired
    // The server will validate properly
    return false;
  }
}

/**
 * Get the expiration time of a token
 * @param token - The JWT token
 * @returns Date object representing token expiration, or null if not parseable
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const cleanToken = token.startsWith('Bearer ')
      ? token.slice(7)
      : token;

    const payload = JSON.parse(atob(cleanToken.split('.')[1]));
    const exp = payload.exp;

    if (!exp) {
      return null;
    }

    return new Date(exp * 1000);
  } catch {
    return null;
  }
}

// Re-export types for consumers
export type {
  RezAuthUser,
  SSOCallbackResult,
  TokenExchangeResponse,
  ValidateTokenResponse,
} from './types';
