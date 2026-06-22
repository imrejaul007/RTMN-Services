/**
 * API Route: /api/distributors
 * Connects to NeXha DistributionOS
 */

import { NextRequest, NextResponse } from 'next/server';

const DISTRIBUTION_OS_URL = process.env.DISTRIBUTION_OS_URL || 'http://localhost:4300';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'active';

  try {
    const response = await fetch(`${DISTRIBUTION_OS_URL}/api/distributors?status=${status}`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 }
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Distributors fetch error:', error);
    return NextResponse.json({
      success: true,
      data: { distributors: [], total: 0 },
      source: 'mock'
    });
  }
}
