import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import logger from '@/lib/logger';
import { rateLimitMiddleware, getRateLimitHeaders, getRateLimitRecord } from '@/middleware/rateLimit';

/**
 * Authentication API Routes
 *
 * POST /api/auth/sso - REZ SSO login/register
 * GET /api/auth/me - Get current merchant session
 */

// =============================================================================
// Environment Validation
// =============================================================================

interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  supabaseAnonKey: string;
  rezAuthServiceUrl: string;
  rezInternalKey: string;
}

function getEnvironment(): EnvironmentConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const rezAuthServiceUrl = process.env.REZ_AUTH_SERVICE_URL;
  const rezInternalKey = process.env.REZ_INTERNAL_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
  }
  if (!rezAuthServiceUrl) {
    throw new Error('REZ_AUTH_SERVICE_URL is not set');
  }
  if (!rezInternalKey) {
    throw new Error('REZ_INTERNAL_KEY is not set');
  }

  return {
    supabaseUrl,
    supabaseServiceKey,
    supabaseAnonKey,
    rezAuthServiceUrl,
    rezInternalKey,
  };
}

// =============================================================================
// Types
// =============================================================================

/**
 * REZ Auth Service response when validating a token
 */
interface RezAuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  merchantId?: string;
  createdAt: string;
  updatedAt: string;
}

interface RezAuthValidationResponse {
  valid: boolean;
  user?: RezAuthUser;
  error?: string;
}

/**
 * Merchant record as stored in our database
 */
interface MerchantRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  type: 'restaurant' | 'hotel' | 'catering' | 'other';
  rez_merchant_id: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

/**
 * API response types
 */
interface SSOSuccessResponse {
  success: true;
  user: {
    id: string;
    email: string;
    name: string;
    phone?: string;
    address?: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    expiresAt: number;
  };
  merchant: {
    id: string;
    name: string;
    type: string;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}

// =============================================================================
// Validation Schemas
// =============================================================================

const SSORequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const MerchantUpsertSchema = z.object({
  rez_merchant_id: z.string(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  type: z.enum(['restaurant', 'hotel', 'catering', 'other']),
  source: z.string(),
});

// =============================================================================
// Supabase Client Factory
// =============================================================================

function createServiceClient(config: EnvironmentConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// =============================================================================
// REZ Auth Service Client
// =============================================================================

async function validateRezToken(
  token: string,
  config: EnvironmentConfig
): Promise<RezAuthValidationResponse> {
  try {
    const response = await fetch(`${config.rezAuthServiceUrl}/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': config.rezInternalKey,
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('REZ Auth Service error:', response.status, errorText);
      return {
        valid: false,
        error: `REZ Auth Service returned status ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      valid: data.valid === true,
      user: data.user,
      error: data.error,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to validate REZ token:', message);
    return {
      valid: false,
      error: `Failed to reach REZ Auth Service: ${message}`,
    };
  }
}

// =============================================================================
// Merchant Operations
// =============================================================================

async function findMerchantByRezId(
  supabase: SupabaseClient,
  rezMerchantId: string
): Promise<MerchantRecord | null> {
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('rez_merchant_id', rezMerchantId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is fine
    logger.error('Error finding merchant:', error);
  }

  return data || null;
}

async function createMerchant(
  supabase: SupabaseClient,
  merchantData: z.infer<typeof MerchantUpsertSchema>
): Promise<MerchantRecord> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('merchants')
    .insert({
      name: merchantData.name,
      email: merchantData.email,
      phone: merchantData.phone,
      address: merchantData.address,
      type: merchantData.type,
      rez_merchant_id: merchantData.rez_merchant_id,
      source: merchantData.source,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error) {
    logger.error('Error creating merchant:', error);
    throw new Error(`Failed to create merchant: ${error.message}`);
  }

  return data;
}

async function updateMerchant(
  supabase: SupabaseClient,
  merchantId: string,
  merchantData: Partial<z.infer<typeof MerchantUpsertSchema>>
): Promise<MerchantRecord> {
  const { data, error } = await supabase
    .from('merchants')
    .update({
      ...merchantData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', merchantId)
    .select('*')
    .single();

  if (error) {
    logger.error('Error updating merchant:', error);
    throw new Error(`Failed to update merchant: ${error.message}`);
  }

  return data;
}

// =============================================================================
// Supabase Auth Session Creation
// =============================================================================

interface SessionResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

async function createMerchantSession(
  _supabase: SupabaseClient,
  merchant: MerchantRecord,
  _config: EnvironmentConfig
): Promise<SessionResult> {
  // Generate a signed JWT for the merchant session
  // In production, use @supabase/ssr or a proper JWT library with signing
  const expiresIn = 3600; // 1 hour
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  // Create refresh token record in database
  const refreshToken = crypto.randomUUID();
  const accessTokenPayload = {
    sub: merchant.id,
    merchant_id: merchant.id,
    email: merchant.email,
    type: 'merchant_access',
    iat: Math.floor(Date.now() / 1000),
    exp: expiresAt,
  };

  // Sign with HMAC-SHA256 using a secret from env
  // SECURITY FIX: Removed hardcoded fallback — fail fast if JWT_SECRET is not set.
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('[ENV] JWT_SECRET environment variable is required. Cannot sign tokens without it.');
  }
  const signature = crypto.createHmac('sha256', secret)
    .update(JSON.stringify(accessTokenPayload))
    .digest('hex');

  const accessToken = Buffer.from(JSON.stringify({
    ...accessTokenPayload,
    sig: signature,
  })).toString('base64url');

  return {
    accessToken,
    refreshToken,
    expiresIn,
    expiresAt,
  };
}

// =============================================================================
// API Handlers
// =============================================================================

/**
 * POST /api/auth/sso
 *
 * Handles REZ SSO login/register flow:
 * 1. Validate the SSO token from the Authorization header
 * 2. Call REZ Auth Service to validate token and get merchant profile
 * 3. Check if merchant exists in our DB by rez_merchant_id
 * 4. If not, create merchant record (source: 'rez-merchant')
 * 5. Create Supabase auth session for the merchant
 * 6. Return session + merchant profile
 */
export async function POST(request: NextRequest): Promise<NextResponse<SSOSuccessResponse | ErrorResponse>> {
  const startTime = Date.now();

  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult as NextResponse<SSOSuccessResponse | ErrorResponse>;
  }

  try {
    // Get environment
    let config: EnvironmentConfig;
    try {
      config = getEnvironment();
    } catch (envError) {
      logger.error('Environment validation failed:', envError);
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid Authorization header', code: 'MISSING_TOKEN' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Empty token provided', code: 'EMPTY_TOKEN' },
        { status: 401 }
      );
    }

    // Validate token with REZ Auth Service
    const validationResult = await validateRezToken(token, config);

    if (!validationResult.valid || !validationResult.user) {
      logger.warn('REZ token validation failed:', validationResult.error);
      return NextResponse.json(
        { success: false, error: validationResult.error || 'Invalid token', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    const rezUser = validationResult.user;

    // Create Supabase client
    const supabase = createServiceClient(config);

    // Check if merchant exists
    const existingMerchant = await findMerchantByRezId(supabase, rezUser.id);

    let merchant: MerchantRecord;

    if (existingMerchant) {
      // Update existing merchant if needed
      merchant = await updateMerchant(supabase, existingMerchant.id, {
        name: rezUser.name,
        email: rezUser.email,
        phone: rezUser.phone || null,
        address: rezUser.address || null,
      });
      logger.info('Updated existing merchant:', merchant.id);
    } else {
      // Create new merchant
      const merchantData = MerchantUpsertSchema.parse({
        rez_merchant_id: rezUser.id,
        name: rezUser.name,
        email: rezUser.email,
        phone: rezUser.phone || null,
        address: rezUser.address || null,
        type: 'restaurant', // Default type, can be updated later
        source: 'rez-merchant',
      });

      merchant = await createMerchant(supabase, merchantData);
      logger.info('Created new merchant:', merchant.id);
    }

    // Create session for the merchant
    const session = await createMerchantSession(supabase, merchant, config);

    const processingTime = Date.now() - startTime;
    logger.info(SSO login completed in ${processingTime}ms for merchant:`, merchant.id);

    const record = getRateLimitRecord(request);
    const headers = record ? getRateLimitHeaders(record) : {};

    return NextResponse.json(
      {
        success: true,
        user: {
          id: merchant.id,
          email: merchant.email || rezUser.email,
          name: merchant.name,
          phone: merchant.phone || undefined,
          address: merchant.address || undefined,
        },
        session,
        merchant: {
          id: merchant.id,
          name: merchant.name,
          type: merchant.type,
        },
      },
      { status: 200, headers }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('SSO endpoint error:', {
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/me
 *
 * Returns the current merchant session based on the Authorization header.
 */
export async function GET(request: NextRequest): Promise<NextResponse<SSOSuccessResponse | ErrorResponse>> {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult as NextResponse<SSOSuccessResponse | ErrorResponse>;
  }

  try {
    // Get environment
    let config: EnvironmentConfig;
    try {
      config = getEnvironment();
    } catch (envError) {
      logger.error('Environment validation failed:', envError);
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid Authorization header', code: 'MISSING_TOKEN' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Empty token provided', code: 'EMPTY_TOKEN' },
        { status: 401 }
      );
    }

    // Create Supabase client
    const supabase = createServiceClient(config);

    // Try to validate the token with Supabase
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      // Try to decode our custom token format
      try {
        const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));

        if (payload.type !== 'merchant_access' || !payload.merchant_id) {
          return NextResponse.json(
            { success: false, error: 'Invalid token format', code: 'INVALID_TOKEN' },
            { status: 401 }
          );
        }

        // SECURITY FIX (NEXTABIZZ-JWT-001): Verify HMAC signature before accepting token
        // Previously, tokens were accepted without signature verification, allowing forgery attacks
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          logger.error('[AUTH] JWT_SECRET not configured - rejecting request');
          return NextResponse.json(
            { success: false, error: 'Server configuration error', code: 'CONFIG_ERROR' },
            { status: 500 }
          );
        }

        // Extract signature from token
        const tokenSig = payload.sig;
        if (!tokenSig) {
          return NextResponse.json(
            { success: false, error: 'Token missing signature', code: 'INVALID_TOKEN' },
            { status: 401 }
          );
        }

        // Recreate signature from payload and verify
        const { sig: _sig, ...payloadWithoutSig } = payload;
        const expectedSig = crypto.createHmac('sha256', secret)
          .update(JSON.stringify(payloadWithoutSig))
          .digest('hex');

        // Timing-safe comparison to prevent timing attacks
        if (!crypto.timingSafeEqual(Buffer.from(tokenSig), Buffer.from(expectedSig))) {
          logger.warn('[AUTH] Invalid token signature', { merchantId: payload.merchant_id });
          return NextResponse.json(
            { success: false, error: 'Invalid token signature', code: 'INVALID_TOKEN' },
            { status: 401 }
          );
        }

        // Check token expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          return NextResponse.json(
            { success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' },
            { status: 401 }
          );
        }

        // Fetch merchant by ID
        const { data: merchant, error: merchantError } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', payload.merchant_id)
          .single();

        if (merchantError || !merchant) {
          return NextResponse.json(
            { success: false, error: 'Merchant not found', code: 'MERCHANT_NOT_FOUND' },
            { status: 401 }
          );
        }

        return NextResponse.json(
          {
            success: true,
            user: {
              id: merchant.id,
              email: merchant.email || '',
              name: merchant.name,
              phone: merchant.phone || undefined,
              address: merchant.address || undefined,
            },
            session: {
              accessToken: token,
              refreshToken: '', // Not provided in this response
              expiresIn: payload.exp - Math.floor(Date.now() / 1000),
              expiresAt: payload.exp,
            },
            merchant: {
              id: merchant.id,
              name: merchant.name,
              type: merchant.type,
            },
          },
          { status: 200 }
        );
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid token', code: 'INVALID_TOKEN' },
          { status: 401 }
        );
      }
    }

    // Fetch merchant by auth user ID
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json(
        { success: false, error: 'Merchant profile not found', code: 'MERCHANT_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: merchant.id,
          email: merchant.email || '',
          name: merchant.name,
          phone: merchant.phone || undefined,
          address: merchant.address || undefined,
        },
        session: {
          accessToken: token,
          refreshToken: '', // Not provided in this response
          expiresIn: 3600,
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
        },
        merchant: {
          id: merchant.id,
          name: merchant.name,
          type: merchant.type,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('GET /me endpoint error:', message);

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
