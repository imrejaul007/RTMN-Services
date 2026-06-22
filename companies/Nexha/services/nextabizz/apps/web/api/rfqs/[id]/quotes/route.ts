import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimitMiddleware, getRateLimitHeaders, getRateLimitRecord } from '@/middleware/rateLimit';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase configuration');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ============================================================================
// POST /api/rfqs/[id]/quotes — Submit a quote
// ============================================================================

const SubmitQuoteSchema = z.object({
  supplier_id: z.string().uuid(),
  unit_price: z.number().positive(),
  total_price: z.number().positive(),
  lead_time_days: z.number().int().positive().optional(),
  notes: z.string().optional(),
  valid_days: z.number().int().positive().default(7),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) return rateLimitResult;

  const { id: rfqId } = await params;

  try {
    const body = await request.json();
    const parsed = SubmitQuoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      }, { status: 400 });
    }

    const data = parsed.data;
    const supabase = createSupabaseClient();

    // Verify RFQ exists and is open
    const { data: rfq } = await supabase
      .from('rfqs')
      .select('id, status, title, merchant_id')
      .eq('id', rfqId)
      .single();

    if (!rfq) {
      return NextResponse.json({ success: false, error: 'RFQ not found' }, { status: 404 });
    }
    if (rfq.status !== 'open') {
      return NextResponse.json({ success: false, error: 'RFQ is not open for quotes' }, { status: 400 });
    }

    // Check if supplier already submitted a quote
    const { data: existing } = await supabase
      .from('rfq_responses')
      .select('id')
      .eq('rfq_id', rfqId)
      .eq('supplier_id', data.supplier_id)
      .single();

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'You have already submitted a quote for this RFQ',
      }, { status: 409 });
    }

    // Calculate valid until date
    const validUntil = new Date(Date.now() + data.valid_days * 24 * 60 * 60 * 1000).toISOString();

    // Insert quote
    const { data: quote, error: insertError } = await supabase
      .from('rfq_responses')
      .insert({
        rfq_id: rfqId,
        supplier_id: data.supplier_id,
        unit_price: data.unit_price,
        total_price: data.total_price,
        lead_time_days: data.lead_time_days || null,
        notes: data.notes || null,
        submitted_at: new Date().toISOString(),
        valid_until: validUntil,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Failed to submit quote:', insertError);
      return NextResponse.json({ success: false, error: 'Failed to submit quote' }, { status: 500 });
    }

    logger.info(`Quote submitted for RFQ ${rfqId} by supplier ${data.supplier_id}`);

    return NextResponse.json({
      success: true,
      quote,
      message: 'Quote submitted successfully',
    }, { status: 201 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`POST /api/rfqs/${rfqId}/quotes error:`, errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// ============================================================================
// GET /api/rfqs/[id]/quotes — List quotes for an RFQ
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) return rateLimitResult;

  const { id: rfqId } = await params;

  try {
    const supabase = createSupabaseClient();

    const { data: quotes, error } = await supabase
      .from('rfq_responses')
      .select('*')
      .eq('rfq_id', rfqId)
      .order('total_price', { ascending: true });

    if (error) {
      logger.error('Failed to fetch quotes:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch quotes' }, { status: 500 });
    }

    return NextResponse.json({ success: true, quotes: quotes || [] });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`GET /api/rfqs/${rfqId}/quotes error:`, errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
