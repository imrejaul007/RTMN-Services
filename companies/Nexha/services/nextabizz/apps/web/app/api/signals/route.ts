import { logger } from '../../shared/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

/**
 * GET /api/signals
 * Fetch AI-generated signals and recommendations for a merchant.
 *
 * Query Parameters:
 *   - merchantId (required): The merchant's unique identifier
 *   - type (optional): Filter by signal type (restock, price_alert, trend, recommendation)
 *   - limit (optional): Maximum number of signals to return (default: 50)
 *   - unreadOnly (optional): If true, only return unread signals (default: false)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get('merchantId');
  const type = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  if (!merchantId) {
    return NextResponse.json(
      { error: 'merchantId is required' },
      { status: 400 }
    );
  }

  try {
    const supabase = getServerClient();

    let query = supabase
      .from('merchant_signals')
      .select(`
        *,
        products (id, name, sku, unit_price)
      `)
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq('signal_type', type);
    }

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Supabase error fetching signals:', error);
      return NextResponse.json(
        { error: `Failed to fetch signals: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      count: data?.length || 0
    });
  } catch (err) {
    logger.error('Unexpected error in signals API:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/signals
 * Create a new signal (typically called by AI/ML services).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getServerClient();

    // Validate required fields
    const { merchant_id, signal_type, title, message, priority, metadata } = body;

    if (!merchant_id || !signal_type || !title || !message) {
      return NextResponse.json(
        { error: 'merchant_id, signal_type, title, and message are required' },
        { status: 400 }
      );
    }

    // Validate signal type
    const validTypes = ['restock', 'price_alert', 'trend', 'recommendation', 'alert'];
    if (!validTypes.includes(signal_type)) {
      return NextResponse.json(
        { error: `signal_type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create the signal
    const { data: signal, error } = await supabase
      .from('merchant_signals')
      .insert({
        merchant_id,
        signal_type,
        title,
        message,
        priority: priority || 'medium',
        metadata: metadata || null,
        is_read: false
      })
      .select(`
        *,
        products (id, name, sku, unit_price)
      `)
      .single();

    if (error) {
      logger.error('Supabase error creating signal:', error);
      return NextResponse.json(
        { error: `Failed to create signal: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: signal
    }, { status: 201 });

  } catch (err) {
    logger.error('Unexpected error in signals POST:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/signals
 * Mark signals as read.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getServerClient();

    const { signal_ids, merchant_id, mark_all_read } = body;

    if (!merchant_id) {
      return NextResponse.json(
        { error: 'merchant_id is required' },
        { status: 400 }
      );
    }

    if (!mark_all_read && (!signal_ids || !Array.isArray(signal_ids) || signal_ids.length === 0)) {
      return NextResponse.json(
        { error: 'signal_ids array is required when mark_all_read is false' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('merchant_signals')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('merchant_id', merchant_id);

    if (mark_all_read) {
      query = query.eq('is_read', false);
    } else {
      query = query.in('id', signal_ids);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Supabase error updating signals:', error);
      return NextResponse.json(
        { error: `Failed to update signals: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: data?.length || 0
    });

  } catch (err) {
    logger.error('Unexpected error in signals PATCH:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
