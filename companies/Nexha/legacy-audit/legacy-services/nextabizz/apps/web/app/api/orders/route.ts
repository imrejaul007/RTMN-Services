import { logger } from '../../shared/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

/**
 * GET /api/orders
 * Fetch purchase orders for a merchant with their items and supplier details.
 *
 * Query Parameters:
 *   - merchantId (required): The merchant's unique identifier
 *   - limit (optional): Maximum number of orders to return (default: 50)
 *   - status (optional): Filter by order status
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
      .from('purchase_orders')
      .select(`
        *,
        po_items (*),
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
      logger.error('Supabase error fetching orders:', error);
      return NextResponse.json(
        { error: `Failed to fetch orders: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      count: data?.length || 0
    });
  } catch (err) {
    logger.error('Unexpected error in orders API:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Create a new purchase order.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getServerClient();

    // Validate required fields
    const { merchant_id, supplier_id, items } = body;

    if (!merchant_id || !supplier_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'merchant_id, supplier_id, and items array are required' },
        { status: 400 }
      );
    }

    // Validate each item has required fields
    for (const item of items) {
      if (!item.product_id || !item.quantity || !item.unit_price) {
        return NextResponse.json(
          { error: 'Each item must have product_id, quantity, and unit_price' },
          { status: 400 }
        );
      }
    }

    // Create the purchase order
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .insert({
        merchant_id,
        supplier_id,
        status: 'pending',
        total_amount: items.reduce(
          (sum: number, item: { quantity: number; unit_price: number }) =>
            sum + item.quantity * item.unit_price,
          0
        )
      })
      .select()
      .single();

    if (orderError) {
      logger.error('Supabase error creating order:', orderError);
      return NextResponse.json(
        { error: `Failed to create order: ${orderError.message}` },
        { status: 500 }
      );
    }

    // Insert the order items
    const poItems = items.map((item: { product_id: string; quantity: number; unit_price: number }) => ({
      po_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.quantity * item.unit_price
    }));

    const { error: itemsError } = await supabase
      .from('po_items')
      .insert(poItems);

    if (itemsError) {
      // Rollback: delete the created order
      await supabase.from('purchase_orders').delete().eq('id', order.id);
      logger.error('Supabase error inserting order items:', itemsError);
      return NextResponse.json(
        { error: `Failed to create order items: ${itemsError.message}` },
        { status: 500 }
      );
    }

    // Fetch the complete order with relations
    const { data: completeOrder } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        po_items (*),
        suppliers (business_name, rating)
      `)
      .eq('id', order.id)
      .single();

    return NextResponse.json({
      success: true,
      data: completeOrder
    }, { status: 201 });

  } catch (err) {
    logger.error('Unexpected error in orders POST:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
