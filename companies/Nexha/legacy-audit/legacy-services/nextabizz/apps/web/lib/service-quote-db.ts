import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  ServiceQuote,
  MaterialLineItem,
  QuoteComparison,
  QuoteComparisonItem,
  ServiceQuoteStatus,
} from '@nextabizz/shared-types';
import { SERVICE_QUOTE_STATUS_TRANSITIONS } from '@nextabizz/shared-types';

// Database client singleton
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdmin;
}

// UUID validation
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// Generate quote number
export function generateQuoteNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().replace(/-/g, '').substring(0, 4).toUpperCase();
  return `SQ-${timestamp}-${random}`;
}

// Generate service order number
export function generateServiceOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().replace(/-/g, '').substring(0, 4).toUpperCase();
  return `SO-${timestamp}-${random}`;
}

// Check if status transition is valid
export function isValidStatusTransition(
  currentStatus: ServiceQuoteStatus,
  newStatus: ServiceQuoteStatus
): boolean {
  const allowedTransitions = SERVICE_QUOTE_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions?.includes(newStatus) ?? false;
}

// Create service quote with materials
export async function createServiceQuote(
  quoteData: Omit<ServiceQuote, 'id' | 'quoteNumber' | 'createdAt' | 'updatedAt'>,
  materials?: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    isOptional?: boolean;
    brand?: string;
    supplier?: string;
    deliveryDate?: string;
  }>
): Promise<{ quote: ServiceQuote; materials: MaterialLineItem[] }> {
  const supabase = getSupabaseAdmin();
  const quoteId = crypto.randomUUID();
  const quoteNumber = generateQuoteNumber();
  const now = new Date().toISOString();

  // Insert quote
  const quoteRecord = {
    id: quoteId,
    quote_number: quoteNumber,
    service_rfq_id: quoteData.serviceRfqId,
    vendor_id: quoteData.vendorId,
    merchant_id: quoteData.merchantId,
    status: quoteData.status,
    proposed_start_date: quoteData.proposedStartDate?.toISOString() || null,
    proposed_end_date: quoteData.proposedEndDate?.toISOString() || null,
    estimated_duration_days: quoteData.estimatedDurationDays || null,
    estimated_hours: quoteData.estimatedHours || null,
    labor_cost: quoteData.laborCost || null,
    material_cost: quoteData.materialCost || null,
    equipment_cost: quoteData.equipmentCost || null,
    total_price: quoteData.totalPrice,
    currency: quoteData.currency || 'INR',
    payment_terms: quoteData.paymentTerms || null,
    valid_until: quoteData.validUntil?.toISOString() || null,
    warranty_info: quoteData.warrantyInfo || null,
    notes: quoteData.notes || null,
    internal_notes: quoteData.internalNotes || null,
    submitted_at: quoteData.submittedAt?.toISOString() || null,
    created_at: now,
    updated_at: now,
  };

  const { data: insertedQuote, error: quoteError } = await supabase
    .from('service_quotes')
    .insert(quoteRecord)
    .select()
    .single();

  if (quoteError) {
    throw new Error(`Failed to create quote: ${quoteError.message}`);
  }

  // Insert materials if provided
  const insertedMaterials: MaterialLineItem[] = [];
  if (materials && materials.length > 0) {
    const materialRecords = materials.map((m, index) => ({
      id: crypto.randomUUID(),
      quote_id: quoteId,
      description: m.description,
      quantity: m.quantity,
      unit: m.unit,
      unit_price: m.unitPrice,
      total_price: m.quantity * m.unitPrice,
      is_optional: m.isOptional || false,
      brand: m.brand || null,
      supplier: m.supplier || null,
      delivery_date: m.deliveryDate || null,
      created_at: now,
    }));

    const { data: insertedMats, error: matError } = await supabase
      .from('quote_materials')
      .insert(materialRecords)
      .select();

    if (matError) {
      throw new Error(`Failed to create materials: ${matError.message}`);
    }

    insertedMaterials.push(
      ...(insertedMats || []).map((m) => ({
        id: m.id,
        quoteId: m.quote_id,
        description: m.description,
        quantity: m.quantity,
        unit: m.unit,
        unitPrice: m.unit_price,
        totalPrice: m.total_price,
        isOptional: m.is_optional,
        brand: m.brand,
        supplier: m.supplier,
        deliveryDate: m.delivery_date ? new Date(m.delivery_date) : undefined,
        createdAt: new Date(m.created_at),
      }))
    );
  }

  // Transform to entity format
  const quote: ServiceQuote = {
    id: insertedQuote.id,
    quoteNumber: insertedQuote.quote_number,
    serviceRfqId: insertedQuote.service_rfq_id,
    vendorId: insertedQuote.vendor_id,
    merchantId: insertedQuote.merchant_id,
    status: insertedQuote.status,
    proposedStartDate: insertedQuote.proposed_start_date ? new Date(insertedQuote.proposed_start_date) : undefined,
    proposedEndDate: insertedQuote.proposed_end_date ? new Date(insertedQuote.proposed_end_date) : undefined,
    estimatedDurationDays: insertedQuote.estimated_duration_days,
    estimatedHours: insertedQuote.estimated_hours,
    laborCost: insertedQuote.labor_cost,
    materialCost: insertedQuote.material_cost,
    equipmentCost: insertedQuote.equipment_cost,
    totalPrice: insertedQuote.total_price,
    currency: insertedQuote.currency,
    paymentTerms: insertedQuote.payment_terms,
    validUntil: insertedQuote.valid_until ? new Date(insertedQuote.valid_until) : undefined,
    warrantyInfo: insertedQuote.warranty_info,
    notes: insertedQuote.notes,
    internalNotes: insertedQuote.internal_notes,
    submittedAt: insertedQuote.submitted_at ? new Date(insertedQuote.submitted_at) : undefined,
    createdAt: new Date(insertedQuote.created_at),
    updatedAt: new Date(insertedQuote.updated_at),
  };

  return { quote, materials: insertedMaterials };
}

// Get service quote by ID with materials
export async function getServiceQuoteById(quoteId: string): Promise<{
  quote: ServiceQuote | null;
  materials: MaterialLineItem[];
}> {
  const supabase = getSupabaseAdmin();

  const { data: quote, error } = await supabase
    .from('service_quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { quote: null, materials: [] };
    }
    throw new Error(`Failed to fetch quote: ${error.message}`);
  }

  const { data: materials } = await supabase
    .from('quote_materials')
    .select('*')
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: true });

  const quoteEntity: ServiceQuote = {
    id: quote.id,
    quoteNumber: quote.quote_number,
    serviceRfqId: quote.service_rfq_id,
    vendorId: quote.vendor_id,
    merchantId: quote.merchant_id,
    status: quote.status,
    proposedStartDate: quote.proposed_start_date ? new Date(quote.proposed_start_date) : undefined,
    proposedEndDate: quote.proposed_end_date ? new Date(quote.proposed_end_date) : undefined,
    estimatedDurationDays: quote.estimated_duration_days,
    estimatedHours: quote.estimated_hours,
    laborCost: quote.labor_cost,
    materialCost: quote.material_cost,
    equipmentCost: quote.equipment_cost,
    totalPrice: quote.total_price,
    currency: quote.currency,
    paymentTerms: quote.payment_terms,
    validUntil: quote.valid_until ? new Date(quote.valid_until) : undefined,
    warrantyInfo: quote.warranty_info,
    notes: quote.notes,
    internalNotes: quote.internal_notes,
    submittedAt: quote.submitted_at ? new Date(quote.submitted_at) : undefined,
    acceptedAt: quote.accepted_at ? new Date(quote.accepted_at) : undefined,
    rejectedAt: quote.rejected_at ? new Date(quote.rejected_at) : undefined,
    acceptedBy: quote.accepted_by,
    rejectedBy: quote.rejected_by,
    linkedServiceOrderId: quote.linked_service_order_id,
    createdAt: new Date(quote.created_at),
    updatedAt: new Date(quote.updated_at),
  };

  const materialsEntities: MaterialLineItem[] = (materials || []).map((m) => ({
    id: m.id,
    quoteId: m.quote_id,
    description: m.description,
    quantity: m.quantity,
    unit: m.unit,
    unitPrice: m.unit_price,
    totalPrice: m.total_price,
    isOptional: m.is_optional,
    brand: m.brand,
    supplier: m.supplier,
    deliveryDate: m.delivery_date ? new Date(m.delivery_date) : undefined,
    createdAt: new Date(m.created_at),
  }));

  return { quote: quoteEntity, materials: materialsEntities };
}

// Update service quote
export async function updateServiceQuote(
  quoteId: string,
  updateData: Partial<ServiceQuote>,
  materials?: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    isOptional?: boolean;
    brand?: string;
    supplier?: string;
    deliveryDate?: string;
  }>
): Promise<{ quote: ServiceQuote; materials: MaterialLineItem[] }> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Build update record
  const updateRecord: Record<string, unknown> = {
    updated_at: now,
  };

  if (updateData.status !== undefined) updateRecord.status = updateData.status;
  if (updateData.proposedStartDate !== undefined) {
    updateRecord.proposed_start_date = updateData.proposedStartDate?.toISOString() || null;
  }
  if (updateData.proposedEndDate !== undefined) {
    updateRecord.proposed_end_date = updateData.proposedEndDate?.toISOString() || null;
  }
  if (updateData.estimatedDurationDays !== undefined) {
    updateRecord.estimated_duration_days = updateData.estimatedDurationDays;
  }
  if (updateData.estimatedHours !== undefined) {
    updateRecord.estimated_hours = updateData.estimatedHours;
  }
  if (updateData.laborCost !== undefined) {
    updateRecord.labor_cost = updateData.laborCost;
  }
  if (updateData.materialCost !== undefined) {
    updateRecord.material_cost = updateData.materialCost;
  }
  if (updateData.equipmentCost !== undefined) {
    updateRecord.equipment_cost = updateData.equipmentCost;
  }
  if (updateData.totalPrice !== undefined) {
    updateRecord.total_price = updateData.totalPrice;
  }
  if (updateData.currency !== undefined) {
    updateRecord.currency = updateData.currency;
  }
  if (updateData.paymentTerms !== undefined) {
    updateRecord.payment_terms = updateData.paymentTerms;
  }
  if (updateData.validUntil !== undefined) {
    updateRecord.valid_until = updateData.validUntil?.toISOString() || null;
  }
  if (updateData.warrantyInfo !== undefined) {
    updateRecord.warranty_info = updateData.warrantyInfo;
  }
  if (updateData.notes !== undefined) {
    updateRecord.notes = updateData.notes;
  }
  if (updateData.internalNotes !== undefined) {
    updateRecord.internal_notes = updateData.internalNotes;
  }
  if (updateData.submittedAt !== undefined) {
    updateRecord.submitted_at = updateData.submittedAt?.toISOString() || null;
  }
  if (updateData.acceptedAt !== undefined) {
    updateRecord.accepted_at = updateData.acceptedAt?.toISOString() || null;
  }
  if (updateData.rejectedAt !== undefined) {
    updateRecord.rejected_at = updateData.rejectedAt?.toISOString() || null;
  }
  if (updateData.acceptedBy !== undefined) {
    updateRecord.accepted_by = updateData.acceptedBy;
  }
  if (updateData.rejectedBy !== undefined) {
    updateRecord.rejected_by = updateData.rejectedBy;
  }
  if (updateData.linkedServiceOrderId !== undefined) {
    updateRecord.linked_service_order_id = updateData.linkedServiceOrderId;
  }

  const { data: updatedQuote, error } = await supabase
    .from('service_quotes')
    .update(updateRecord)
    .eq('id', quoteId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update quote: ${error.message}`);
  }

  // Update materials if provided
  let materialsEntities: MaterialLineItem[] = [];

  if (materials !== undefined) {
    // Delete existing materials
    await supabase.from('quote_materials').delete().eq('quote_id', quoteId);

    // Insert new materials
    if (materials.length > 0) {
      const materialRecords = materials.map((m) => ({
        id: crypto.randomUUID(),
        quote_id: quoteId,
        description: m.description,
        quantity: m.quantity,
        unit: m.unit,
        unit_price: m.unitPrice,
        total_price: m.quantity * m.unitPrice,
        is_optional: m.isOptional || false,
        brand: m.brand || null,
        supplier: m.supplier || null,
        delivery_date: m.deliveryDate || null,
        created_at: now,
      }));

      const { data: insertedMats } = await supabase
        .from('quote_materials')
        .insert(materialRecords)
        .select();

      materialsEntities = (insertedMats || []).map((m) => ({
        id: m.id,
        quoteId: m.quote_id,
        description: m.description,
        quantity: m.quantity,
        unit: m.unit,
        unitPrice: m.unit_price,
        totalPrice: m.total_price,
        isOptional: m.is_optional,
        brand: m.brand,
        supplier: m.supplier,
        deliveryDate: m.delivery_date ? new Date(m.delivery_date) : undefined,
        createdAt: new Date(m.created_at),
      }));
    }
  } else {
    // Fetch existing materials if not updating
    const { data: existingMats } = await supabase
      .from('quote_materials')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: true });

    materialsEntities = (existingMats || []).map((m) => ({
      id: m.id,
      quoteId: m.quote_id,
      description: m.description,
      quantity: m.quantity,
      unit: m.unit,
      unitPrice: m.unit_price,
      totalPrice: m.total_price,
      isOptional: m.is_optional,
      brand: m.brand,
      supplier: m.supplier,
      deliveryDate: m.delivery_date ? new Date(m.delivery_date) : undefined,
      createdAt: new Date(m.created_at),
    }));
  }

  const quoteEntity: ServiceQuote = {
    id: updatedQuote.id,
    quoteNumber: updatedQuote.quote_number,
    serviceRfqId: updatedQuote.service_rfq_id,
    vendorId: updatedQuote.vendor_id,
    merchantId: updatedQuote.merchant_id,
    status: updatedQuote.status,
    proposedStartDate: updatedQuote.proposed_start_date ? new Date(updatedQuote.proposed_start_date) : undefined,
    proposedEndDate: updatedQuote.proposed_end_date ? new Date(updatedQuote.proposed_end_date) : undefined,
    estimatedDurationDays: updatedQuote.estimated_duration_days,
    estimatedHours: updatedQuote.estimated_hours,
    laborCost: updatedQuote.labor_cost,
    materialCost: updatedQuote.material_cost,
    equipmentCost: updatedQuote.equipment_cost,
    totalPrice: updatedQuote.total_price,
    currency: updatedQuote.currency,
    paymentTerms: updatedQuote.payment_terms,
    validUntil: updatedQuote.valid_until ? new Date(updatedQuote.valid_until) : undefined,
    warrantyInfo: updatedQuote.warranty_info,
    notes: updatedQuote.notes,
    internalNotes: updatedQuote.internal_notes,
    submittedAt: updatedQuote.submitted_at ? new Date(updatedQuote.submitted_at) : undefined,
    acceptedAt: updatedQuote.accepted_at ? new Date(updatedQuote.accepted_at) : undefined,
    rejectedAt: updatedQuote.rejected_at ? new Date(updatedQuote.rejected_at) : undefined,
    acceptedBy: updatedQuote.accepted_by,
    rejectedBy: updatedQuote.rejected_by,
    linkedServiceOrderId: updatedQuote.linked_service_order_id,
    createdAt: new Date(updatedQuote.created_at),
    updatedAt: new Date(updatedQuote.updated_at),
  };

  return { quote: quoteEntity, materials: materialsEntities };
}

// Delete service quote
export async function deleteServiceQuote(quoteId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  // Delete materials first
  await supabase.from('quote_materials').delete().eq('quote_id', quoteId);

  // Delete quote
  const { error } = await supabase.from('service_quotes').delete().eq('id', quoteId);

  if (error) {
    throw new Error(`Failed to delete quote: ${error.message}`);
  }

  return true;
}

// List service quotes with pagination
export async function listServiceQuotes(params: {
  page: number;
  limit: number;
  merchantId?: string;
  vendorId?: string;
  serviceRfqId?: string;
  status?: ServiceQuoteStatus;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  quotes: ServiceQuote[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('service_quotes')
    .select('*', { count: 'exact' });

  // Apply filters
  if (params.merchantId) {
    query = query.eq('merchant_id', params.merchantId);
  }
  if (params.vendorId) {
    query = query.eq('vendor_id', params.vendorId);
  }
  if (params.serviceRfqId) {
    query = query.eq('service_rfq_id', params.serviceRfqId);
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.startDate) {
    query = query.gte('created_at', params.startDate);
  }
  if (params.endDate) {
    query = query.lte('created_at', params.endDate);
  }

  // Apply sorting
  const sortColumn = params.sortBy || 'created_at';
  query = query.order(sortColumn, { ascending: params.sortOrder === 'asc' });

  // Apply pagination
  const from = (params.page - 1) * params.limit;
  const to = from + params.limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list quotes: ${error.message}`);
  }

  const quotes: ServiceQuote[] = (data || []).map((q) => ({
    id: q.id,
    quoteNumber: q.quote_number,
    serviceRfqId: q.service_rfq_id,
    vendorId: q.vendor_id,
    merchantId: q.merchant_id,
    status: q.status,
    proposedStartDate: q.proposed_start_date ? new Date(q.proposed_start_date) : undefined,
    proposedEndDate: q.proposed_end_date ? new Date(q.proposed_end_date) : undefined,
    estimatedDurationDays: q.estimated_duration_days,
    estimatedHours: q.estimated_hours,
    laborCost: q.labor_cost,
    materialCost: q.material_cost,
    equipmentCost: q.equipment_cost,
    totalPrice: q.total_price,
    currency: q.currency,
    paymentTerms: q.payment_terms,
    validUntil: q.valid_until ? new Date(q.valid_until) : undefined,
    warrantyInfo: q.warranty_info,
    notes: q.notes,
    internalNotes: q.internal_notes,
    submittedAt: q.submitted_at ? new Date(q.submitted_at) : undefined,
    acceptedAt: q.accepted_at ? new Date(q.accepted_at) : undefined,
    rejectedAt: q.rejected_at ? new Date(q.rejected_at) : undefined,
    acceptedBy: q.accepted_by,
    rejectedBy: q.rejected_by,
    linkedServiceOrderId: q.linked_service_order_id,
    createdAt: new Date(q.created_at),
    updatedAt: new Date(q.updated_at),
  }));

  const total = count || 0;
  const totalPages = Math.ceil(total / params.limit);

  return {
    quotes,
    total,
    page: params.page,
    limit: params.limit,
    totalPages,
  };
}

// Get quote comparison for a service RFQ
export async function getQuoteComparison(serviceRfqId: string): Promise<QuoteComparison> {
  const supabase = getSupabaseAdmin();

  // Get RFQ details
  const { data: rfq, error: rfqError } = await supabase
    .from('service_rfqs')
    .select('*')
    .eq('id', serviceRfqId)
    .single();

  if (rfqError) {
    throw new Error(`Failed to fetch RFQ: ${rfqError.message}`);
  }

  // Get merchant name
  const { data: merchant } = await supabase
    .from('merchants')
    .select('business_name')
    .eq('id', rfq.merchant_id)
    .single();

  // Get all submitted quotes for this RFQ
  const { data: quotes, error: quotesError } = await supabase
    .from('service_quotes')
    .select('*')
    .eq('service_rfq_id', serviceRfqId)
    .in('status', ['submitted', 'under_review', 'accepted', 'rejected'])
    .order('total_price', { ascending: true });

  if (quotesError) {
    throw new Error(`Failed to fetch quotes: ${quotesError.message}`);
  }

  // Get vendor names
  const vendorIds = [...new Set((quotes || []).map((q) => q.vendor_id))];
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, business_name')
    .in('id', vendorIds);

  const vendorMap = new Map(vendors?.map((v) => [v.id, v.business_name]) || []);

  // Get materials for all quotes
  const quoteIds = (quotes || []).map((q) => q.id);
  const { data: allMaterials } = await supabase
    .from('quote_materials')
    .select('*')
    .in('quote_id', quoteIds)
    .order('created_at', { ascending: true });

  const materialsByQuote = new Map<string, MaterialLineItem[]>();
  (allMaterials || []).forEach((m) => {
    const material: MaterialLineItem = {
      id: m.id,
      quoteId: m.quote_id,
      description: m.description,
      quantity: m.quantity,
      unit: m.unit,
      unitPrice: m.unit_price,
      totalPrice: m.total_price,
      isOptional: m.is_optional,
      brand: m.brand,
      supplier: m.supplier,
      deliveryDate: m.delivery_date ? new Date(m.delivery_date) : undefined,
      createdAt: new Date(m.created_at),
    };
    if (!materialsByQuote.has(m.quote_id)) {
      materialsByQuote.set(m.quote_id, []);
    }
    materialsByQuote.get(m.quote_id)!.push(material);
  });

  const quoteItems: QuoteComparisonItem[] = (quotes || []).map((q) => ({
    quoteId: q.id,
    quoteNumber: q.quote_number,
    vendorId: q.vendor_id,
    vendorName: vendorMap.get(q.vendor_id) || 'Unknown Vendor',
    status: q.status,
    totalPrice: q.total_price,
    currency: q.currency,
    proposedStartDate: q.proposed_start_date ? new Date(q.proposed_start_date) : undefined,
    proposedEndDate: q.proposed_end_date ? new Date(q.proposed_end_date) : undefined,
    estimatedDurationDays: q.estimated_duration_days,
    laborCost: q.labor_cost,
    materialCost: q.material_cost,
    equipmentCost: q.equipment_cost,
    warrantyInfo: q.warranty_info,
    validUntil: q.valid_until ? new Date(q.valid_until) : undefined,
    submittedAt: q.submitted_at ? new Date(q.submitted_at) : undefined,
    materialsCount: materialsByQuote.get(q.id)?.length || 0,
    materials: materialsByQuote.get(q.id) || [],
    paymentTerms: q.payment_terms,
    notes: q.notes,
  }));

  // Calculate comparison highlights
  const lowestPriceQuote = quoteItems.length > 0
    ? quoteItems.reduce((min, q) => (q.totalPrice < min.totalPrice ? q : min))
    : null;

  const fastestDeliveryQuote = quoteItems.length > 0
    ? quoteItems
        .filter((q) => q.estimatedDurationDays !== undefined)
        .reduce((min, q) =>
          q.estimatedDurationDays! < min.estimatedDurationDays! ? q : min
        )
    : null;

  // Calculate best value (simple algorithm: ratio of price to duration)
  let bestValueQuote = null;
  if (quoteItems.length > 0) {
    const quotesWithRatio = quoteItems.filter(
      (q) => q.estimatedDurationDays !== undefined && q.totalPrice > 0
    );
    if (quotesWithRatio.length > 0) {
      bestValueQuote = quotesWithRatio.reduce((best, q) => {
        const qRatio = q.totalPrice / (q.estimatedDurationDays || 1);
        const bestRatio = best.totalPrice / (best.estimatedDurationDays || 1);
        return qRatio < bestRatio ? q : best;
      });
    }
  }

  const comparison: QuoteComparison = {
    serviceRfqId,
    rfqTitle: rfq.title,
    merchantId: rfq.merchant_id,
    merchantName: merchant?.business_name || 'Unknown Merchant',
    quotes: quoteItems,
    comparisonDate: new Date(),
    lowestPrice: lowestPriceQuote
      ? { quoteId: lowestPriceQuote.quoteId, amount: lowestPriceQuote.totalPrice }
      : undefined,
    fastestDelivery: fastestDeliveryQuote
      ? { quoteId: fastestDeliveryQuote.quoteId, days: fastestDeliveryQuote.estimatedDurationDays! }
      : undefined,
    bestValue: bestValueQuote
      ? {
          quoteId: bestValueQuote.quoteId,
          reason: `Best price-to-duration ratio at ${bestValueQuote.currency} ${(bestValueQuote.totalPrice / (bestValueQuote.estimatedDurationDays || 1)).toFixed(2)}/day`,
        }
      : undefined,
  };

  return comparison;
}

// Accept quote and create service order
export async function acceptQuoteAndCreateServiceOrder(
  quoteId: string,
  acceptedBy: string,
  notes?: string
): Promise<{ quote: ServiceQuote; serviceOrderId: string }> {
  const supabase = getSupabaseAdmin();
  const now = new Date();

  // Get the quote
  const { quote: existingQuote, materials } = await getServiceQuoteById(quoteId);

  if (!existingQuote) {
    throw new Error('Quote not found');
  }

  // Validate status transition
  if (!isValidStatusTransition(existingQuote.status, 'accepted')) {
    throw new Error(`Cannot accept quote with status: ${existingQuote.status}`);
  }

  // Create service order
  const serviceOrderId = crypto.randomUUID();
  const orderNumber = generateServiceOrderNumber();

  const serviceOrderRecord = {
    id: serviceOrderId,
    order_number: orderNumber,
    merchant_id: existingQuote.merchantId,
    service_rfq_id: existingQuote.serviceRfqId,
    quote_id: quoteId,
    vendor_id: existingQuote.vendorId,
    status: 'pending',
    total: existingQuote.totalPrice,
    currency: existingQuote.currency,
    payment_status: 'pending',
    warranty_info: existingQuote.warrantyInfo,
    notes: notes || existingQuote.notes,
    scheduled_start: existingQuote.proposedStartDate?.toISOString() || null,
    scheduled_end: existingQuote.proposedEndDate?.toISOString() || null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const { error: orderError } = await supabase
    .from('service_orders')
    .insert(serviceOrderRecord);

  if (orderError) {
    throw new Error(`Failed to create service order: ${orderError.message}`);
  }

  // Create service order items from quote materials
  if (materials.length > 0) {
    const orderItems = materials.map((m) => ({
      id: crypto.randomUUID(),
      service_order_id: serviceOrderId,
      service_name: m.description,
      quantity: m.quantity,
      unit: m.unit,
      unit_price: m.unitPrice,
      total: m.totalPrice,
      created_at: now.toISOString(),
    }));

    await supabase.from('service_order_items').insert(orderItems);
  }

  // Update quote status to accepted
  const updateResult = await updateServiceQuote(quoteId, {
    status: 'accepted',
    acceptedAt: now,
    acceptedBy,
    linkedServiceOrderId: serviceOrderId,
  });

  // Reject other quotes for this RFQ
  await supabase
    .from('service_quotes')
    .update({
      status: 'rejected',
      rejected_at: now.toISOString(),
      rejected_by: null, // System rejection
      updated_at: now.toISOString(),
    })
    .eq('service_rfq_id', existingQuote.serviceRfqId)
    .eq('status', 'submitted')
    .neq('id', quoteId);

  return { quote: updateResult.quote, serviceOrderId };
}
