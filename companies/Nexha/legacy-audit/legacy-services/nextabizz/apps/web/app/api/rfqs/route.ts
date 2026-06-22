import { logger } from '../../shared/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

/**
 * GET /api/rfqs
 * Fetch Request for Quotes for a merchant.
 *
 * Query Parameters:
 *   - merchantId (required): The merchant's unique identifier
 *   - limit (optional): Maximum number of RFQs to return (default: 50)
 *   - status (optional): Filter by RFQ status
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get('merchantId');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const status = searchParams.get('status');

  if (!merchantId) {
    return NextResponse.json(
      { error: 'merchantId is required' },
      { status: 400 }
    );
  }

  try {
    const supabase = getServerClient();

    let query = supabase
      .from('rfqs')
      .select(`
        *,
        rfq_items (*),
        suppliers (business_name, rating)
      `)
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Supabase error fetching RFQs:', error);
      return NextResponse.json(
        { error: `Failed to fetch RFQs: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      count: data?.length || 0
    });
  } catch (err) {
    logger.error('Unexpected error in RFQs API:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rfqs
 * Create a new Request for Quote.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getServerClient();

    // Validate required fields
    const { merchant_id, supplier_id, items, notes } = body;

    if (!merchant_id || !supplier_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'merchant_id, supplier_id, and items array are required' },
        { status: 400 }
      );
    }

    // Validate each item has required fields
    for (const item of items) {
      if (!item.product_id || !item.quantity) {
        return NextResponse.json(
          { error: 'Each item must have product_id and quantity' },
          { status: 400 }
        );
      }
    }

    // Create the RFQ
    const { data: rfq, error: rfqError } = await supabase
      .from('rfqs')
      .insert({
        merchant_id,
        supplier_id,
        status: 'pending',
        notes: notes || null
      })
      .select()
      .single();

    if (rfqError) {
      logger.error('Supabase error creating RFQ:', rfqError);
      return NextResponse.json(
        { error: `Failed to create RFQ: ${rfqError.message}` },
        { status: 500 }
      );
    }

    // Insert the RFQ items
    const rfqItems = items.map((item: { product_id: string; quantity: number; specifications?: string }) => ({
      rfq_id: rfq.id,
      product_id: item.product_id,
      quantity: item.quantity,
      specifications: item.specifications || null
    }));

    const { error: itemsError } = await supabase
      .from('rfq_items')
      .insert(rfqItems);

    if (itemsError) {
      // Rollback: delete the created RFQ
      await supabase.from('rfqs').delete().eq('id', rfq.id);
      logger.error('Supabase error inserting RFQ items:', itemsError);
      return NextResponse.json(
        { error: `Failed to create RFQ items: ${itemsError.message}` },
        { status: 500 }
      );
    }

    // Fetch the complete RFQ with relations
    const { data: completeRfq } = await supabase
      .from('rfqs')
      .select(`
        *,
        rfq_items (*),
        suppliers (business_name, rating)
      `)
      .eq('id', rfq.id)
      .single();

    return NextResponse.json({
      success: true,
      data: completeRfq
    }, { status: 201 });

  } catch (err) {
    logger.error('Unexpected error in RFQs POST:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
