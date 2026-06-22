import logger from './utils/logger';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  logger.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Zod Schemas matching DB CHECK constraints
// DB: severity CHECK IN ('low', 'medium', 'high', 'critical')
const InventorySignalSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
// DB: signal_type CHECK IN ('low_stock', 'out_of_stock', 'expiring', 'overstock', 'movement')
const InventorySignalTypeSchema = z.enum(['low_stock', 'out_of_stock', 'expiring', 'overstock', 'movement']);
// DB: status CHECK IN ('pending', 'matched', 'po_created', 'dismissed')
const ReorderSignalStatusSchema = z.enum(['pending', 'matched', 'po_created', 'dismissed']);
// DB: urgency CHECK IN ('low', 'medium', 'high', 'urgent')
const UrgencySchema = z.enum(['low', 'medium', 'high', 'urgent']);

// REZ Merchant webhook configuration
const REZ_MERCHANT_WEBHOOK_URL = process.env.REZ_MERCHANT_WEBHOOK_URL || 'https://rez-merchant-service.onrender.com/internal/nextabizz/reorder-signal';
const REZ_MERCHANT_WEBHOOK_SECRET = process.env.REZ_MERCHANT_WEBHOOK_SECRET;
const WEBHOOK_TIMEOUT_MS = 10000;

type InventorySignalSeverity = z.infer<typeof InventorySignalSeveritySchema>;
type InventorySignalType = z.infer<typeof InventorySignalTypeSchema>;
type ReorderSignalStatus = z.infer<typeof ReorderSignalStatusSchema>;
type Urgency = z.infer<typeof UrgencySchema>;

// Database row types (matching actual Supabase schema columns)
interface InventorySignalRow {
  id: string;
  merchant_id: string;
  source: string;
  source_product_id: string;
  source_merchant_id: string;
  product_name: string;
  sku?: string;
  current_stock: number;
  threshold: number;
  unit: string;
  category?: string;
  severity: InventorySignalSeverity;
  signal_type: InventorySignalType;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ReorderSignalRow {
  id: string;
  merchant_id: string;
  inventory_signal_id?: string;
  suggested_qty?: number;
  urgency: Urgency;
  status: ReorderSignalStatus;
  match_confidence?: number;
  created_at: string;
  updated_at: string;
}

interface SupplierProductRow {
  id: string;
  supplier_id: string;
  category_id?: string;
  name: string;
  sku?: string;
  description?: string;
  unit: string;
  moq: number;
  price: number;
  bulk_pricing?: { min_qty: number; price: number }[];
  images?: string[];
  is_active: boolean;
  delivery_days?: number;
  created_at: string;
  updated_at: string;
}

interface SupplierRow {
  id: string;
  business_name: string;
  gst_number?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  categories: string[];
  rating: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Calculate suggested reorder quantity using par-level approach
 * Target: threshold * 2 (par level), then subtract current stock
 */
export function calculateSuggestedQty(signal: InventorySignalRow): number {
  const parLevel = signal.threshold * 2;
  const suggestedQty = parLevel - signal.current_stock;
  return Math.max(suggestedQty, 0);
}

/**
 * Determine urgency level based on signal severity and stock levels
 */
export function determineUrgency(signal: InventorySignalRow): Urgency {
  switch (signal.severity) {
    case 'critical':
      // If stock is less than 50% of threshold, it's urgent
      if (signal.current_stock < signal.threshold * 0.5) {
        return 'urgent';
      }
      return 'high';
    case 'high':
      return 'high';
    case 'low':
    case 'medium':
    default:
      return 'medium';
  }
}

/**
 * Score a product-supplier match based on multiple factors
 * Higher score = better match
 */
export function scoreProductMatch(
  product: SupplierProductRow,
  supplier: SupplierRow
): number {
  // Price score: normalize to 0-1, lower price = higher score
  // Assuming max reasonable price is 10000
  const priceScore = Math.max(0, 1 - (product.price / 10000));

  // Supplier rating score: 0-5 scale, higher is better
  const ratingScore = (supplier.rating ?? 3) / 5;

  // Delivery score: assume max delivery days is 30, lower is better
  const deliveryDays = product.delivery_days ?? 14;
  const deliveryScore = Math.max(0, 1 - (deliveryDays / 30));

  // Availability bonus
  const availabilityScore = product.is_active ? 0.2 : 0;

  // Weighted combination
  return (priceScore * 0.4) + (ratingScore * 0.35) + (deliveryScore * 0.2) + (availabilityScore * 0.05);
}

interface ScoredProduct extends SupplierProductRow {
  matchScore: number;
}

/**
 * Match a reorder signal to suitable supplier products using fuzzy matching
 */
export async function matchToProducts(
  supabase: SupabaseClient,
  _signal: ReorderSignalRow,
  productName: string,
  supplierIds?: string[]
): Promise<ScoredProduct[]> {
  // Search for products matching the signal's product name
  // Using ilike for case-insensitive partial matching
  const searchTerm = `%${productName.toLowerCase()}%`;

  let query = supabase
    .from('supplier_products')
    .select('*, suppliers:supplier_id(id, business_name, rating, is_active)')
    .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
    .eq('is_active', true)
    .limit(20);

  if (supplierIds && supplierIds.length > 0) {
    query = query.in('supplier_id', supplierIds);
  }

  const { data: products, error } = await query;

  if (error) {
    logger.error('Error fetching supplier products:', error);
    throw new Error(`Failed to fetch supplier products: ${error.message}`);
  }

  if (!products || products.length === 0) {
    logger.info(`No supplier products found matching: ${productName}`);
    return [];
  }

  // Score each product and sort by score
  const scoredProducts = products
    .map((product) => ({
      ...product,
      matchScore: scoreProductMatch(product, (product as { suppliers?: SupplierRow }).suppliers as SupplierRow),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  // Take top 3 matches
  return scoredProducts.slice(0, 3);
}

/**
 * Log an event to the events table
 * Note: events table only has: id, type, source, payload, created_at
 */
export async function logEvent(
  supabase: SupabaseClient,
  event: { event_type: string; payload: Record<string, unknown>; source?: string }
): Promise<void> {
  const { error } = await supabase
    .from('events')
    .insert({
      type: event.event_type,
      source: event.source ?? 'reorder-engine',
      payload: event.payload,
    });

  if (error) {
    logger.error(Failed to log event ${event.event_type}:`, error);
    // Don't throw - logging failure shouldn't break the main flow
  }
}

/**
 * Send reorder signal notification to REZ Merchant
 */
async function notifyRezMerchant(params: {
  merchantId: string;
  signalId: string;
  reorderSignalId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  suggestedQty: number;
  urgency: Urgency;
  severity: InventorySignalSeverity;
  unit: string;
  category?: string;
  matchedSuppliers?: number;
  matchConfidence?: number;
}): Promise<boolean> {
  if (!REZ_MERCHANT_WEBHOOK_SECRET) {
    logger.warn('[REZ-Merchant] WEBHOOK_SECRET not configured, skipping notification');
    return false;
  }

  try {
    const timestamp = new Date().toISOString();
    const payload = {
      event: params.matchedSuppliers && params.matchedSuppliers > 0
        ? 'reorder.signal.matched'
        : 'reorder.signal.created',
      merchantId: params.merchantId,
      signalId: params.reorderSignalId,
      productName: params.productName,
      currentStock: params.currentStock,
      threshold: params.threshold,
      suggestedQty: params.suggestedQty,
      urgency: params.urgency,
      severity: params.severity,
      unit: params.unit,
      category: params.category,
      timestamp,
      matchedSuppliers: params.matchedSuppliers,
      matchConfidence: params.matchConfidence,
    };

    const payloadString = JSON.stringify(payload);
    const crypto = await import('crypto');
    const signature = crypto
      .createHmac('sha256', REZ_MERCHANT_WEBHOOK_SECRET)
      .update(`${timestamp}.${payloadString}`)
      .digest('hex');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    const response = await fetch(REZ_MERCHANT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': REZ_MERCHANT_WEBHOOK_SECRET,
        'X-Webhook-Signature': signature,
        'X-Webhook-Source': 'nextabizz',
        'X-Webhook-Event': payload.event,
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      logger.error([REZ-Merchant] Webhook failed with status ${response.status}:`, errorBody);
      return false;
    }

    const result = await response.json().catch(() => ({})) as { notificationId?: string };
    logger.info([REZ-Merchant] Notification sent successfully:`, {
      merchantId: params.merchantId,
      notificationId: result.notificationId,
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error([REZ-Merchant] Error sending webhook:`, errorMessage);
    return false;
  }
}

/**
 * Process all pending inventory signals and generate reorder signals
 */
export async function processPendingSignals(
  supabase: SupabaseClient
): Promise<{ created: number; matched: number }> {
  let created = 0;
  let matched = 0;

  // Step 1: Query all pending inventory signals with low_stock type
  // Map incoming signal types to our processing types
  const { data: signals, error: signalsError } = await supabase
    .from('inventory_signals')
    .select('*')
    .in('signal_type', ['low_stock', 'out_of_stock'])
    .in('severity', ['low', 'medium', 'high', 'critical']);

  if (signalsError) {
    logger.error('Error fetching inventory signals:', signalsError);
    throw new Error(`Failed to fetch inventory signals: ${signalsError.message}`);
  }

  if (!signals || signals.length === 0) {
    logger.info('No pending inventory signals to process');
    return { created: 0, matched: 0 };
  }

  logger.info(`Processing ${signals.length} pending inventory signals...`);

  // Step 2: For each signal, create a reorder signal
  for (const signal of signals) {
    try {
      const inventorySignal = signal as InventorySignalRow;

      // Check if a reorder signal already exists for this inventory signal
      const { data: existingSignals } = await supabase
        .from('reorder_signals')
        .select('id')
        .eq('inventory_signal_id', inventorySignal.id)
        .eq('status', 'pending')
        .limit(1);

      if (existingSignals && existingSignals.length > 0) {
        logger.info(`Reorder signal already exists for signal ${inventorySignal.id}, skipping`);
        continue;
      }

      // Calculate suggested quantity and urgency
      const suggestedQty = calculateSuggestedQty(inventorySignal);
      const urgency = determineUrgency(inventorySignal);

      // Insert the reorder signal
      // DB columns: merchant_id, inventory_signal_id, suggested_qty, urgency, status
      const reorderSignalData = {
        merchant_id: inventorySignal.merchant_id,
        inventory_signal_id: inventorySignal.id,
        suggested_qty: suggestedQty,
        urgency,
        status: 'pending' as const,
      };

      const { data: insertResult, error: insertError } = await supabase
        .from('reorder_signals')
        .insert(reorderSignalData)
        .select('id')
        .single();

      if (insertError) {
        logger.error(Failed to insert reorder signal for signal ${inventorySignal.id}:`, insertError);
        continue;
      }

      const reorderSignalId = insertResult?.id;
      created++;
      logger.info(`Created reorder signal ${reorderSignalId} for product ${inventorySignal.product_name} (qty: ${suggestedQty}, urgency: ${urgency})`);

      // Notify REZ Merchant about the reorder signal
      await notifyRezMerchant({
        merchantId: inventorySignal.merchant_id,
        signalId: inventorySignal.id,
        reorderSignalId: reorderSignalId!,
        productName: inventorySignal.product_name,
        currentStock: inventorySignal.current_stock,
        threshold: inventorySignal.threshold,
        suggestedQty,
        urgency,
        severity: inventorySignal.severity,
        unit: inventorySignal.unit,
        category: inventorySignal.category,
      });

      // Log the event
      await logEvent(supabase, {
        event_type: 'reorder.signal.created',
        source: 'reorder-engine',
        payload: {
          signal_id: reorderSignalId,
          inventory_signal_id: inventorySignal.id,
          product_name: inventorySignal.product_name,
          suggested_qty: suggestedQty,
          urgency,
          current_stock: inventorySignal.current_stock,
          threshold: inventorySignal.threshold,
        },
      });

      // Step 3: Match to supplier products
      const matchedProducts = await matchToProducts(
        supabase,
        { id: reorderSignalId!, merchant_id: inventorySignal.merchant_id, urgency, status: 'pending' } as ReorderSignalRow,
        inventorySignal.product_name
      );

      if (matchedProducts.length > 0) {
        const avgConfidence = matchedProducts.reduce((sum, p) => sum + p.matchScore, 0) / matchedProducts.length;

        // Update the reorder signal with matches
        const { error: updateError } = await supabase
          .from('reorder_signals')
          .update({
            status: 'matched',
            match_confidence: avgConfidence,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reorderSignalId);

        if (!updateError) {
          matched++;
          logger.info(`Matched reorder signal ${reorderSignalId} to ${matchedProducts.length} suppliers`);

          // Log the match event
          await logEvent(supabase, {
            event_type: 'reorder.signal.matched',
            source: 'reorder-engine',
            payload: {
              signal_id: reorderSignalId,
              inventory_signal_id: inventorySignal.id,
              matched_supplier_count: matchedProducts.length,
              match_confidence: avgConfidence,
            },
          });

          // Notify REZ Merchant about the matched signal with supplier info
          await notifyRezMerchant({
            merchantId: inventorySignal.merchant_id,
            signalId: inventorySignal.id,
            reorderSignalId: reorderSignalId!,
            productName: inventorySignal.product_name,
            currentStock: inventorySignal.current_stock,
            threshold: inventorySignal.threshold,
            suggestedQty,
            urgency,
            severity: inventorySignal.severity,
            unit: inventorySignal.unit,
            category: inventorySignal.category,
            matchedSuppliers: matchedProducts.length,
            matchConfidence: avgConfidence,
          });
        }
      }

    } catch (err) {
      logger.error(Error processing signal ${signal.id}:`, err);
      // Continue processing other signals
    }
  }

  logger.info(`Processing complete: ${created} reorder signals created, ${matched} matched`);
  return { created, matched };
}

/**
 * Initialize the Supabase client
 */
function createSupabaseClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Main entry point for the reorder engine
 */
async function main(): Promise<void> {
  logger.info('Starting Reorder Engine...');
  logger.info(`Timestamp: ${new Date().toISOString()}`);

  const supabase = createSupabaseClient();

  try {
    const result = await processPendingSignals(supabase);
    logger.info(`\nReorder Engine completed successfully:`);
    logger.info(`  - Signals created: ${result.created}`);
    logger.info(`  - Signals matched: ${result.matched}`);
  } catch (error) {
    logger.error('Reorder Engine failed:', error);
    process.exit(1);
  }

  logger.info('Reorder Engine exiting...');
}

// Run if executed directly
if (require.main === module) {
  main().catch((err) => {
    logger.error('Unhandled error:', err);
    process.exit(1);
  });
}

// Export for use as a module
export { createSupabaseClient, main };
