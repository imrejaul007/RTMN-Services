import { logger } from '../../shared/logger';
/**
 * API Route: /api/franchises
 * Connects to NeXha FranchiseOS
 */

import { NextRequest, NextResponse } from 'next/server';

const FRANCHISE_OS_URL = process.env.FRANCHISE_OS_URL || 'http://localhost:4310';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${FRANCHISE_OS_URL}/api/franchises`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 }
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[API] Franchises fetch error:', error);
    return NextResponse.json({
      success: true,
      data: { franchises: [], total: 0 },
      source: 'mock'
    });
  }
}
