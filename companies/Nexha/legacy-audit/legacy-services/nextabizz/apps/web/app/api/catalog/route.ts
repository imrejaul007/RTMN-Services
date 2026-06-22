import { logger } from '../../shared/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

/**
 * GET /api/catalog
 * Fetch product catalog with filtering and search.
 *
 * Query Parameters:
 *   - merchantId (optional): Filter products available to a specific merchant
 *   - category (optional): Filter by category
 *   - search (optional): Search in product name and description
 *   - supplierId (optional): Filter by supplier
 *   - limit (optional): Maximum number of products to return (default: 50)
 *   - offset (optional): Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get('merchantId');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const supplierId = searchParams.get('supplierId');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const supabase = getServerClient();

    let query = supabase
      .from('products')
      .select(`
        *,
        suppliers (id, business_name, rating),
        categories (name)
      `, { count: 'exact' })
      .range(offset, offset + limit - 1);

    if (merchantId) {
      // Products available to this merchant (via supplier contracts)
      query = query
        .select(`
          *,
          suppliers!inner(id, business_name, rating),
          categories (name)
        `, { count: 'exact' })
        .eq('suppliers.merchant_contracts.merchant_id', merchantId);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    query = query.order('name');

    const { data, error, count } = await query;

    if (error) {
      logger.error('Supabase error fetching catalog:', error);
      return NextResponse.json(
        { error: `Failed to fetch catalog: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      count,
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    });
  } catch (err) {
    logger.error('Unexpected error in catalog API:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/catalog
 * Add a product to the catalog (admin/supplier only).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getServerClient();

    // Validate required fields
    const { supplier_id, name, description, category, unit, unit_price, sku, min_order_quantity } = body;

    if (!supplier_id || !name || !unit || !unit_price) {
      return NextResponse.json(
        { error: 'supplier_id, name, unit, and unit_price are required' },
        { status: 400 }
      );
    }

    // Check for duplicate SKU
    if (sku) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('sku', sku)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'A product with this SKU already exists' },
          { status: 409 }
        );
      }
    }

    // Create the product
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        supplier_id,
        name,
        description: description || null,
        category: category || 'general',
        unit,
        unit_price,
        sku: sku || null,
        min_order_quantity: min_order_quantity || 1,
        is_active: true
      })
      .select(`
        *,
        suppliers (id, business_name, rating),
        categories (name)
      `)
      .single();

    if (error) {
      logger.error('Supabase error creating product:', error);
      return NextResponse.json(
        { error: `Failed to create product: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product
    }, { status: 201 });

  } catch (err) {
    logger.error('Unexpected error in catalog POST:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
