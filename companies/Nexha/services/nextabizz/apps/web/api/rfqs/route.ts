import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimitMiddleware, getRateLimitHeaders, getRateLimitRecord } from '@/middleware/rateLimit';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// ============================================================================
// Database Client
// ============================================================================

function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ============================================================================
// Zod Schemas
// ============================================================================

const CreateRFQSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  quantity: z.number().int().positive(),
  unit: z.string().min(1).default('units'),
  target_price: z.number().positive().optional(),
  delivery_deadline: z.string().datetime().optional(),
  supplier_ids: z.array(z.string().uuid()).optional(),
  merchant_id: z.string().uuid(),
});

const SubmitQuoteSchema = z.object({
  rfq_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  unit_price: z.number().positive(),
  total_price: z.number().positive(),
  lead_time_days: z.number().int().positive().optional(),
  notes: z.string().optional(),
  valid_days: z.number().int().positive().default(7),
});

// ============================================================================
// GET /api/rfqs — List RFQs
// ============================================================================

export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) return rateLimitResult;

  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get('merchant_id');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const supabase = createSupabaseClient();

    let query = supabase
      .from('rfqs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: rfqs, error } = await query;

    if (error) {
      logger.error('Failed to fetch RFQs:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch RFQs' }, { status: 500 });
    }

    // Get quote counts for each RFQ
    const rfqIds = (rfqs || []).map(r => r.id);
    let quoteCounts: Record<string, number> = {};

    if (rfqIds.length > 0) {
      const { data: quotes } = await supabase
        .from('rfq_responses')
        .select('rfq_id')
        .in('rfq_id', rfqIds);

      quoteCounts = (quotes || []).reduce((acc: Record<string, number>, q) => {
        acc[q.rfq_id] = (acc[q.rfq_id] || 0) + 1;
        return acc;
      }, {});
    }

    const enriched = (rfqs || []).map(rfq => ({
      ...rfq,
      quote_count: quoteCounts[rfq.id] || 0,
    }));

    return NextResponse.json({
      rfqs: enriched,
      count: enriched.length,
    }, {
      headers: getRateLimitHeaders(getRateLimitRecord(request)!),
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('GET /api/rfqs error:', errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// ============================================================================
// POST /api/rfqs — Create RFQ
// ============================================================================

export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();

    // Validate input
    const parsed = CreateRFQSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      }, { status: 400 });
    }

    const data = parsed.data;
    const supabase = createSupabaseClient();

    // Generate RFQ number
    const rfqNumber = `RFQ-${Date.now().toString(36).toUpperCase()}`;

    // Calculate expiration (default: 7 days)
    const expiresAt = data.delivery_deadline
      ? new Date(data.delivery_deadline).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Insert RFQ into database
    const { data: rfq, error: insertError } = await supabase
      .from('rfqs')
      .insert({
        rfq_number: rfqNumber,
        merchant_id: data.merchant_id,
        title: data.title,
        description: data.description || null,
        category: data.category || null,
        quantity: data.quantity,
        unit: data.unit,
        target_price: data.target_price || null,
        delivery_deadline: data.delivery_deadline || null,
        status: 'open',
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Failed to create RFQ:', insertError);
      return NextResponse.json({ success: false, error: 'Failed to create RFQ' }, { status: 500 });
    }

    // If supplier_ids provided, create invitations
    if (data.supplier_ids && data.supplier_ids.length > 0) {
      const invitations = data.supplier_ids.map(supplierId => ({
        rfq_id: rfq.id,
        supplier_id: supplierId,
        status: 'pending',
        invited_at: new Date().toISOString(),
      }));

      const { error: inviteError } = await supabase
        .from('rfq_invitations')
        .insert(invitations);

      if (inviteError) {
        logger.warn('Failed to create invitations:', inviteError);
      }
    }

    logger.info(`RFQ created: ${rfqNumber} by merchant ${data.merchant_id}`);

    return NextResponse.json({
      success: true,
      rfq,
      message: 'RFQ created successfully',
    }, { status: 201 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('POST /api/rfqs error:', errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
