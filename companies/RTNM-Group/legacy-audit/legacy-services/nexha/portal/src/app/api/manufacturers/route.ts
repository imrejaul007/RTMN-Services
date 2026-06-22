/**
 * API Route: /api/manufacturers
 * Connects to NeXha ManufacturingOS
 */

import { NextRequest, NextResponse } from 'next/server';

const MANUFACTURING_OS_URL = process.env.MANUFACTURING_OS_URL || 'http://localhost:4330';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${MANUFACTURING_OS_URL}/api/manufacturers`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 }
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Manufacturers fetch error:', error);
    return NextResponse.json({
      success: true,
      data: { manufacturers: [], total: 0 },
      source: 'mock'
    });
  }
}
