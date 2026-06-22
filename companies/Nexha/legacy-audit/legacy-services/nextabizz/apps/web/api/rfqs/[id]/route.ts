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
// GET /api/rfqs/[id] — Get RFQ details with quotes
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await params;

  try {
    const supabase = createSupabaseClient();

    // Fetch RFQ
    const { data: rfq, error: rfqError } = await supabase
      .from('rfqs')
      .select('*')
      .eq('id', id)
      .single();

    if (rfqError || !rfq) {
      return NextResponse.json({ success: false, error: 'RFQ not found' }, { status: 404 });
    }

    // Fetch supplier responses/quotes
    const { data: quotes } = await supabase
      .from('rfq_responses')
      .select('*')
      .eq('rfq_id', id)
      .order('submitted_at', { ascending: false });

    // Fetch invitations
    const { data: invitations } = await supabase
      .from('rfq_invitations')
      .select('*, supplier:suppliers(business_name)')
      .eq('rfq_id', id);

    // Fetch supplier details for quotes
    const supplierIds = (quotes || []).map(q => q.supplier_id);
    let suppliers: Record<string, { business_name: string }> = {};
    if (supplierIds.length > 0) {
      const { data: supData } = await supabase
        .from('suppliers')
        .select('id, business_name')
        .in('id', supplierIds);
      suppliers = (supData || []).reduce((acc: Record<string, { business_name: string }>, s) => {
        acc[s.id] = s;
        return acc;
      }, {});
    }

    // Enrich quotes with supplier names
    const enrichedQuotes = (quotes || []).map(q => ({
      ...q,
      supplier_name: suppliers[q.supplier_id]?.business_name || 'Unknown',
    }));

    return NextResponse.json({
      success: true,
      rfq,
      quotes: enrichedQuotes,
      invitations: invitations || [],
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`GET /api/rfqs/${id} error:`, errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// ============================================================================
// PATCH /api/rfqs/[id] — Update RFQ status
// ============================================================================

const UpdateRFQSchema = z.object({
  status: z.enum(['open', 'closed', 'awarded', 'cancelled', 'expired']).optional(),
  awarded_to: z.string().uuid().optional(),
  linked_po_id: z.string().uuid().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = UpdateRFQSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 400 });
    }

    const supabase = createSupabaseClient();

    const { data: rfq, error } = await supabase
      .from('rfqs')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single();

    if (error || !rfq) {
      return NextResponse.json({ success: false, error: 'Failed to update RFQ' }, { status: 500 });
    }

    // If awarded, update winning quote
    if (parsed.data.awarded_to) {
      await supabase
        .from('rfq_responses')
        .update({ status: 'awarded' })
        .eq('rfq_id', id)
        .eq('supplier_id', parsed.data.awarded_to);

      // Reject other quotes
      await supabase
        .from('rfq_responses')
        .update({ status: 'rejected' })
        .eq('rfq_id', id)
        .neq('supplier_id', parsed.data.awarded_to);
    }

    return NextResponse.json({ success: true, rfq });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`PATCH /api/rfqs/${id} error:`, errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
