import logger from './utils/logger';

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  validateRezMerchantPayload,
  handleRezMerchantInventorySignal,
  type WebhookHandlerContext,
} from '@nextabizz/webhook-sdk';
import { rateLimitMiddleware } from '@/middleware/rateLimit';

/**
 * ReZ Merchant Webhook Handler
 *
 * POST /api/webhooks/rez-merchant
 *
 * Receives inventory signal webhooks from ReZ Merchant when stock drops below threshold.
 * Validates the HMAC signature, parses and validates the payload, then processes the signal.
 */

const WEBHOOK_SOURCE = 'rez-merchant' as const;

/**
 * Extracts headers from the request as a plain object
 */
function extractHeaders(request: NextRequest): Record<string, string | string[] | undefined> {
  const headers: Record<string, string | string[] | undefined> = {};

  // Extract relevant webhook headers
  const signatureHeader = request.headers.get('x-webhook-signature');
  const timestampHeader = request.headers.get('x-webhook-timestamp');

  headers['x-webhook-signature'] = signatureHeader ?? undefined;
  headers['x-webhook-timestamp'] = timestampHeader ?? undefined;

  return headers;
}

/**
 * Validates that required environment variables are set
 */
function validateEnvironment(): { valid: boolean; error?: string } {
  const secret = process.env.WEBHOOK_SECRET_REZ_MERCHANT;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    return {
      valid: false,
      error: 'WEBHOOK_SECRET_REZ_MERCHANT environment variable is not set',
    };
  }

  if (!supabaseUrl) {
    return {
      valid: false,
      error: 'NEXT_PUBLIC_SUPABASE_URL environment variable is not set',
    };
  }

  if (!supabaseServiceKey) {
    return {
      valid: false,
      error: 'SUPABASE_SERVICE_ROLE_KEY environment variable is not set',
    };
  }

  return { valid: true };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    // Validate environment variables
    const envValidation = validateEnvironment();
    if (!envValidation.valid) {
      logger.error([${WEBHOOK_SOURCE}] Environment validation failed:`, envValidation.error);
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get raw body for signature verification
    const rawBody = await request.text();

    if (!rawBody) {
      return NextResponse.json(
        { success: false, error: 'Request body is empty' },
        { status: 400 }
      );
    }

    // Extract headers
    const headers = extractHeaders(request);

    // Verify HMAC signature
    try {
      const isValid = verifyWebhookSignature(rawBody, headers, {
        secret: process.env.WEBHOOK_SECRET_REZ_MERCHANT!,
        signatureHeader: 'x-webhook-signature',
        timestampHeader: 'x-webhook-timestamp',
        toleranceSeconds: 300,
      });

      if (!isValid) {
        logger.warn(`[${WEBHOOK_SOURCE}] Invalid webhook signature`);
        return NextResponse.json(
          { success: false, error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    } catch (signatureError) {
      const errorMessage =
        signatureError instanceof Error ? signatureError.message : 'Signature verification failed';

      // Don't log timing-related errors to avoid information leakage
      if (errorMessage.includes('expired') || errorMessage.includes('replay')) {
        logger.warn(`[${WEBHOOK_SOURCE}] Webhook timestamp error:`, errorMessage);
      } else {
        logger.error([${WEBHOOK_SOURCE}] Signature verification error:`, errorMessage);
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 401 }
      );
    }

    // Parse JSON payload
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate payload with Zod
    let validatedPayload: ReturnType<typeof validateRezMerchantPayload>;
    try {
      validatedPayload = validateRezMerchantPayload(payload);
    } catch (validationError) {
      const errorMessage =
        validationError instanceof Error ? validationError.message : 'Payload validation failed';

      logger.warn(`[${WEBHOOK_SOURCE}] Payload validation failed:`, errorMessage);
      return NextResponse.json(
        {
          success: false,
          error: 'Payload validation failed',
          details: validationError instanceof Error ? validationError.message : undefined,
        },
        { status: 400 }
      );
    }

    // Verify event type matches expected
    if (validatedPayload.event !== 'inventory.signal.received') {
      logger.warn(`[${WEBHOOK_SOURCE}] Unexpected event type:`, validatedPayload.event);
      return NextResponse.json(
        { success: false, error: `Unexpected event type: ${validatedPayload.event}` },
        { status: 400 }
      );
    }

    // Set up handler context
    const handlerContext: WebhookHandlerContext = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    };

    // Process the webhook
    const result = await handleRezMerchantInventorySignal(validatedPayload, handlerContext);

    const processingTime = Date.now() - startTime;

    if (result.success) {
      logger.info(
        `[${WEBHOOK_SOURCE}] Successfully processed webhook:`,
        {
          signalId: result.signalId,
          eventId: result.eventId,
          merchantId: validatedPayload.merchantId,
          productId: validatedPayload.productId,
          severity: validatedPayload.severity,
          processingTimeMs: processingTime,
        }
      );

      return NextResponse.json(
        {
          success: true,
          signalId: result.signalId,
          eventId: result.eventId,
        },
        { status: 200 }
      );
    } else {
      logger.error([${WEBHOOK_SOURCE}] Handler returned error:`, result.error);

      return NextResponse.json(
        {
          success: false,
          error: 'Webhook processing failed',
          details: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const processingTime = Date.now() - startTime;

    logger.error([${WEBHOOK_SOURCE}] Unexpected error:`, {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
    });

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Return 405 for other HTTP methods
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PATCH(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
