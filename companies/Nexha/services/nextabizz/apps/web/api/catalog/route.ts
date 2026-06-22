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
    products: [],
    message: 'Catalog API endpoint',
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

    // Validate required fields for product creation
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 });
    }

    logger.info('Create product:', { ...body, name: body.name }); // Log sanitized data

    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Create product error:', errorMessage);
    return NextResponse.json({ success: false, error: 'Failed to create product' }, { status: 500 });
  }
}
