import { logger } from '../../shared/logger';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimitMiddleware, getRateLimitHeaders, getRateLimitRecord } from '@/middleware/rateLimit';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  const record = getRateLimitRecord(request);
  const headers = record ? getRateLimitHeaders(record) : {};

  return NextResponse.json({
    merchants: [],
    message: 'Merchants API endpoint',
  }, { headers });
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const body = await request.json();

    // Basic input validation
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    // Validate required fields for merchant creation
    if (!body.businessName || typeof body.businessName !== 'string' || body.businessName.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Business name is required' }, { status: 400 });
    }

    logger.info('Create merchant:', { ...body, businessName: body.businessName }); // Log sanitized data

    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Create merchant error:', errorMessage);
    return NextResponse.json({ success: false, error: 'Failed to create merchant' }, { status: 500 });
  }
}
