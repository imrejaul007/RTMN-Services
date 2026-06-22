import logger from './utils/logger';

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Scoring configuration constants
 */
const SCORING_CONFIG = {
  // Lead time constants
  DEFAULT_LEAD_TIME_DAYS: 14,
  LEAD_TIME_NORMALIZATION_RANGE: 20,
  LEAD_TIME_BASELINE: 14,

  // Score weights (must sum to 1.0)
  WEIGHTS: {
    onTimeDelivery: 0.25,
    quality: 0.25,
    priceConsistency: 0.2,
    responseRate: 0.15,
    leadTime: 0.15,
  },

  // Score ranges
  SCORE_SCALE_MAX: 5,
  MAX_CREDIT_BOOST: 0.3,

  // Decimal precision
  RATE_DECIMAL_PLACES: 4,
  SCORE_DECIMAL_PLACES: 2,
  LEAD_TIME_DECIMAL_PLACES: 2,
} as const;

/**
 * Input data for calculating supplier scores
 */
export interface ScoreInputs {
  totalOrders: number;
  onTimeDeliveries: number;       // PO.status='delivered' AND actual_delivery <= expected_delivery
  lateDeliveries: number;
  partialDeliveries: number;      // status='partial'
  rejectedOrders: number;        // status='cancelled'
  avgLeadTime: number;           // avg of (actual_delivery - created_at) in days
  rfqResponses: number;          // count of rfq_responses
  totalRFQs: number;             // count of rfqs that expired or were awarded
  priceChanges: number;           // count of PO items where unit_price != original quoted price
}

/**
 * Output supplier score record
 * Column names match DB schema
 */
export interface SupplierScore {
  id: string;
  supplier_id: string;
  overall_score: number;           // DB: DECIMAL(3, 2) 0-5
  on_time_delivery_rate: number;   // DB: DECIMAL(5, 4) 0-1
  quality_rejection_rate: number;  // DB: DECIMAL(5, 4) 0-1
  price_consistency: number;       // DB: DECIMAL(5, 4) 0-1
  response_rate: number;           // DB: DECIMAL(5, 4) 0-1
  avg_lead_time_days: number;      // DB: DECIMAL(5, 2) 0+
  credit_boost: number;           // DB: DECIMAL(3, 2) 0-10
  period: string;                  // DB: CHECK IN ('weekly', 'monthly', 'quarterly')
  period_start: string;
  period_end: string;
  calculated_at: string;
}

/**
 * Database row types (matching actual DB schema)
 */
interface PurchaseOrderRow {
  id: string;
  supplier_id: string;
  status: string; // DB CHECK: ('draft', 'sent', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'closed')
  created_at: string;
  expected_delivery: string;
  actual_delivery?: string;
}

interface PurchaseOrderItemRow {
  id: string;
  po_id: string;
  supplier_product_id?: string;
  name: string;
  sku?: string;
  qty: number;
  unit: string;
  unit_price: number;
  total: number;
  received_qty: number;
  created_at: string;
}

interface RFQRow {
  id: string;
  rfq_number: string;
  merchant_id: string;
  title: string;
  description?: string;
  category?: string;
  quantity: number;
  unit: string;
  target_price?: number;
  delivery_deadline?: string;
  status: string; // DB CHECK: ('open', 'closed', 'awarded', 'cancelled', 'expired')
  awarded_to?: string;
  linked_po_id?: string;
  created_at: string;
  expires_at?: string;
  updated_at: string;
}

interface RFQResponseRow {
  id: string;
  rfq_id: string;
  supplier_id: string;
  unit_price: number;
  total_price: number;
  lead_time_days?: number;
  notes?: string;
  submitted_at: string;
}

interface SupplierScoreRow {
  id: string;
  supplier_id: string;
  overall_score: number;
  on_time_delivery_rate: number;
  quality_rejection_rate: number;
  price_consistency: number;
  response_rate: number;
  avg_lead_time_days: number;
  credit_boost: number;
  period: string;
  period_start: string;
  period_end: string;
  calculated_at: string;
}

interface SupplierRow {
  id: string;
  business_name: string;
  is_active: boolean;
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Collect all scoring inputs for a supplier within a time period
 */
async function collectScoreInputs(
  supabase: SupabaseClient,
  supplierId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<ScoreInputs> {
  const startStr = periodStart.toISOString();
  const endStr = periodEnd.toISOString();

  // Fetch all purchase orders for this supplier in the period
  const { data: purchaseOrders, error: poError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('supplier_id', supplierId)
    .gte('created_at', startStr)
    .lte('created_at', endStr);

  if (poError) {
    throw new Error(`Failed to fetch purchase orders: ${poError.message}`);
  }

  const orders = (purchaseOrders || []) as PurchaseOrderRow[];

  // Count orders by status
  // DB status values: 'draft', 'sent', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'closed'
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const partialOrders = orders.filter((o) => o.status === 'partial');
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

  // Calculate on-time deliveries
  let onTimeDeliveries = 0;
  let lateDeliveries = 0;
  let totalLeadTimeDays = 0;
  let leadTimeCount = 0;

  for (const order of deliveredOrders) {
    if (order.actual_delivery && order.expected_delivery) {
      const actualDate = new Date(order.actual_delivery);
      const expectedDate = new Date(order.expected_delivery);

      if (actualDate <= expectedDate) {
        onTimeDeliveries++;
      } else {
        lateDeliveries++;
      }

      // Calculate lead time in days
      const createdDate = new Date(order.created_at);
      const leadTimeMs = actualDate.getTime() - createdDate.getTime();
      totalLeadTimeDays += leadTimeMs / (1000 * 60 * 60 * 24);
      leadTimeCount++;
    }
  }

  const avgLeadTime = leadTimeCount > 0 ? totalLeadTimeDays / leadTimeCount : SCORING_CONFIG.DEFAULT_LEAD_TIME_DAYS;

  // Fetch RFQ responses for this supplier
  const { data: rfqResponses, error: rfqResponseError } = await supabase
    .from('rfq_responses')
    .select('rfq_id')
    .eq('supplier_id', supplierId)
    .gte('submitted_at', startStr)
    .lte('submitted_at', endStr);

  if (rfqResponseError) {
    throw new Error(`Failed to fetch RFQ responses: ${rfqResponseError.message}`);
  }

  const rfqResponsesList = (rfqResponses || []) as { rfq_id: string }[];
  const rfqResponsesCount = rfqResponsesList.length;

  // Fetch total RFQs that expired or were awarded (status: 'expired', 'awarded', or 'closed')
  const { data: rfqs, error: rfqError } = await supabase
    .from('rfqs')
    .select('id')
    .in('status', ['expired', 'awarded', 'closed'])
    .gte('expires_at', startStr)
    .lte('expires_at', endStr);

  if (rfqError) {
    throw new Error(`Failed to fetch RFQs: ${rfqError.message}`);
  }

  const rfqsList = (rfqs || []) as RFQRow[];
  const totalRFQs = rfqsList.length;

  // For price consistency, we'd need original quoted prices from rfq_responses
  // For now, set to 1 (perfect consistency) as a placeholder
  const priceChanges = 0;

  return {
    totalOrders,
    onTimeDeliveries,
    lateDeliveries,
    partialDeliveries: partialOrders.length,
    rejectedOrders: cancelledOrders.length,
    avgLeadTime,
    rfqResponses: rfqResponsesCount,
    totalRFQs,
    priceChanges,
  };
}

/**
 * Calculate supplier score from inputs
 */
function calculateScore(inputs: ScoreInputs): Omit<SupplierScore, 'id' | 'supplier_id' | 'period' | 'period_start' | 'period_end' | 'calculated_at'> {
  const { WEIGHTS, SCORE_SCALE_MAX, MAX_CREDIT_BOOST, RATE_DECIMAL_PLACES, LEAD_TIME_DECIMAL_PLACES, DEFAULT_LEAD_TIME_DAYS, LEAD_TIME_NORMALIZATION_RANGE } = SCORING_CONFIG;

  // Calculate component rates
  const onTimeRate = inputs.totalOrders > 0 ? inputs.onTimeDeliveries / inputs.totalOrders : 0;
  const qualityRate = inputs.totalOrders > 0 ? 1 - (inputs.rejectedOrders / inputs.totalOrders) : 1;
  const priceConsistency = inputs.totalOrders > 0 ? 1 - (inputs.priceChanges / inputs.totalOrders) : 1;
  const responseRate = inputs.totalRFQs > 0 ? inputs.rfqResponses / inputs.totalRFQs : 0;

  // Lead time score: normalized to 0-1, baseline days = 0.5 baseline
  // Better if <baseline days, worse if >baseline days
  const avgLeadTimeScore = clamp(1 - (inputs.avgLeadTime - DEFAULT_LEAD_TIME_DAYS) / LEAD_TIME_NORMALIZATION_RANGE, 0, 1);

  // Weighted overall score (0-SCORE_SCALE_MAX scale)
  const weightedScore =
    onTimeRate * WEIGHTS.onTimeDelivery +
    qualityRate * WEIGHTS.quality +
    priceConsistency * WEIGHTS.priceConsistency +
    responseRate * WEIGHTS.responseRate +
    avgLeadTimeScore * WEIGHTS.leadTime;

  const overallScore = Math.round(weightedScore * SCORE_SCALE_MAX * 100) / 100; // Scale to 0-5, round to 2 decimals

  // Credit boost: 0-MAX_CREDIT_BOOST based on overall score
  const creditBoost = Math.round(clamp(overallScore / SCORE_SCALE_MAX * MAX_CREDIT_BOOST, 0, MAX_CREDIT_BOOST) * 100) / 100;

  const rateMultiplier = Math.pow(10, RATE_DECIMAL_PLACES);
  const leadTimeMultiplier = Math.pow(10, LEAD_TIME_DECIMAL_PLACES);

  return {
    overall_score: overallScore,
    on_time_delivery_rate: Math.round(onTimeRate * rateMultiplier) / rateMultiplier,
    quality_rejection_rate: Math.round(qualityRate * rateMultiplier) / rateMultiplier,
    price_consistency: Math.round(priceConsistency * rateMultiplier) / rateMultiplier,
    response_rate: Math.round(responseRate * rateMultiplier) / rateMultiplier,
    avg_lead_time_days: Math.round(inputs.avgLeadTime * leadTimeMultiplier) / leadTimeMultiplier,
    credit_boost: creditBoost,
  };
}

/**
 * Calculate supplier score for a specific period and store in DB
 */
export async function calculateSupplierScore(
  supplierId: string,
  period: 'weekly' | 'monthly' | 'quarterly',
  periodStart: Date,
  periodEnd: Date,
  supabase: SupabaseClient
): Promise<SupplierScore> {
  // Collect inputs
  const inputs = await collectScoreInputs(supabase, supplierId, periodStart, periodEnd);

  // Calculate scores
  const scores = calculateScore(inputs);

  // Create score record with column names matching DB
  const scoreRecord: SupplierScore = {
    id: crypto.randomUUID(),
    supplier_id: supplierId,
    ...scores,
    period,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    calculated_at: new Date().toISOString(),
  };

  // Upsert into supplier_scores table
  // DB columns: id, supplier_id, period, period_start, period_end,
  //            on_time_delivery_rate, quality_rejection_rate, price_consistency,
  //            avg_lead_time_days, response_rate, overall_score, credit_boost, calculated_at
  const { error: upsertError } = await supabase
    .from('supplier_scores')
    .upsert(
      {
        supplier_id: supplierId,
        period,
        period_start: scoreRecord.period_start,
        period_end: scoreRecord.period_end,
        on_time_delivery_rate: scoreRecord.on_time_delivery_rate,
        quality_rejection_rate: scoreRecord.quality_rejection_rate,
        price_consistency: scoreRecord.price_consistency,
        avg_lead_time_days: scoreRecord.avg_lead_time_days,
        response_rate: scoreRecord.response_rate,
        overall_score: scoreRecord.overall_score,
        credit_boost: scoreRecord.credit_boost,
        calculated_at: scoreRecord.calculated_at,
      },
      {
        onConflict: 'supplier_id,period,period_start',
      }
    );

  if (upsertError) {
    throw new Error(`Failed to upsert supplier score: ${upsertError.message}`);
  }

  logger.info(
    `Calculated score for supplier ${supplierId}: overall=${scoreRecord.overall_score.toFixed(2)}/5, ` +
    `on_time=${(scoreRecord.on_time_delivery_rate * 100).toFixed(0)}%, quality=${(scoreRecord.quality_rejection_rate * 100).toFixed(0)}%, ` +
    `lead_time=${scoreRecord.avg_lead_time_days.toFixed(1)} days`
  );

  return scoreRecord;
}

/**
 * Run monthly scoring for all active suppliers
 */
export async function runMonthlyScoring(
  supabase: SupabaseClient
): Promise<{ scored: number }> {
  // Calculate period: previous month
  const now = new Date();
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
  const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1); // First day of previous month

  logger.info(`Running monthly scoring for period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

  // Fetch all active suppliers
  // DB: suppliers table has business_name, is_active columns
  const { data: suppliers, error: suppliersError } = await supabase
    .from('suppliers')
    .select('id, business_name')
    .eq('is_active', true);

  if (suppliersError) {
    throw new Error(`Failed to fetch suppliers: ${suppliersError.message}`);
  }

  if (!suppliers || suppliers.length === 0) {
    logger.info('No active suppliers found');
    return { scored: 0 };
  }

  logger.info(`Found ${suppliers.length} active suppliers`);

  let scored = 0;
  const errors: string[] = [];

  for (const supplier of suppliers as SupplierRow[]) {
    try {
      await calculateSupplierScore(
        supplier.id,
        'monthly',
        periodStart,
        periodEnd,
        supabase
      );
      scored++;

      // Log event to events table (not event_logs)
      // DB: events table only has id, type, source, payload, created_at
      await supabase.from('events').insert({
        type: 'supplier.scored',
        source: 'scoring-engine',
        payload: {
          supplier_id: supplier.id,
          supplier_name: supplier.business_name,
          period: 'monthly',
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
        },
      });
    } catch (err) {
      const errorMsg = `Failed to score supplier ${supplier.id} (${supplier.business_name}): ${(err as Error).message}`;
      logger.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  if (errors.length > 0) {
    logger.warn(`Scoring completed with ${errors.length} errors:`);
    errors.forEach((e) => logger.warn(`  - ${e}`));
  }

  logger.info(`Monthly scoring complete: ${scored}/${suppliers.length} suppliers scored`);
  return { scored };
}
