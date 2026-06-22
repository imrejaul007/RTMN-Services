import logger from './utils/logger';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as z from 'zod';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  logger.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Zod Schemas matching DB CHECK constraints
// DB: payment_method is TEXT type (no CHECK constraint)
// DB: payment_status CHECK IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')
const PaymentMethodSchema = z.enum(['prepaid', 'net-terms', 'bnpl', 'credit', 'cod', 'upi', 'bank_transfer']);
const PaymentStatusSchema = z.enum(['pending', 'partial', 'paid', 'overdue', 'cancelled']);

type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

// Database row types (matching actual DB schema)
interface PurchaseOrderRow {
  id: string;
  order_number: string;
  merchant_id: string;
  supplier_id: string;
  status: string;
  subtotal: number;
  net_amount: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  delivery_address: Record<string, unknown>;
  expected_delivery: string;
  actual_delivery?: string;
  notes?: string;
  source: string;
  rfq_id?: string;
  created_at: string;
  updated_at: string;
}

interface CreditLineRow {
  id: string;
  merchant_id: string;
  credit_limit: number;
  utilized: number;
  tenor_days: number;
  interest_rate: number;
  status: string;
  tier: string;
  created_at: string;
  updated_at: string;
}

interface PaymentWebhookPayload {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method?: string;
        UPI?: {
          vpa?: string;
        };
        bank?: {
          ifsc?: string;
          account_number?: string;
        };
      };
    };
  };
  created_at: number;
}

/**
 * Create Supabase client with service role key
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
 * Verify Razorpay webhook signature
 * CRITICAL: Reject webhooks when secret is not configured (never bypass)
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!RAZORPAY_KEY_SECRET) {
    throw new Error('[Webhook] RAZORPAY_KEY_SECRET not configured - rejecting webhook');
  }

  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Log an event to the events table
 * Note: events table only has: id, type, source, payload, created_at
 */
async function logEvent(
  supabase: SupabaseClient,
  event: { event_type: string; payload: Record<string, unknown>; source?: string }
): Promise<void> {
  const { error } = await supabase.from('events').insert({
    type: event.event_type,
    source: event.source ?? 'payment-settlement',
    payload: event.payload,
  });

  if (error) {
    logger.error(`Failed to log event ${event.event_type}:`, error);
  }
}

/**
 * Check credit availability for a merchant
 */
export async function checkCreditAvailability(
  supabase: SupabaseClient,
  merchantId: string,
  amount: number
): Promise<{ available: boolean; creditLine?: CreditLineRow }> {
  // Get the merchant's credit line
  const { data: creditLine, error } = await supabase
    .from('credit_lines')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('status', 'active')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No credit line found
      return { available: false };
    }
    throw new Error(`Failed to fetch credit line: ${error.message}`);
  }

  const credit = creditLine as CreditLineRow;

  // Check if credit line has expired (using tenor_days to calculate expiry)
  // For simplicity, we assume credit lines don't expire unless suspended/closed

  // Calculate available credit: credit_limit - utilized
  const availableCredit = credit.credit_limit - credit.utilized;
  const isAvailable = availableCredit >= amount;

  return {
    available: isAvailable,
    creditLine: credit,
  };
}

/**
 * Settle BNPL payment - increment the credit line utilized amount
 */
export async function settleBNPLPayment(
  supabase: SupabaseClient,
  poId: string,
  amount: number
): Promise<void> {
  // Get the purchase order to find the merchant
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .select('merchant_id')
    .eq('id', poId)
    .single();

  if (poError) {
    throw new Error(`Failed to fetch purchase order: ${poError.message}`);
  }

  if (!po) {
    throw new Error(`Purchase order ${poId} not found`);
  }

  const merchantId = (po as { merchant_id: string }).merchant_id;

  // Get the credit line
  const { data: creditLine, error: clError } = await supabase
    .from('credit_lines')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('status', 'active')
    .single();

  if (clError) {
    throw new Error(`Failed to fetch credit line: ${clError.message}`);
  }

  if (!creditLine) {
    throw new Error(`No active credit line found for merchant ${merchantId}`);
  }

  const credit = creditLine as CreditLineRow;
  const newUtilized = credit.utilized + amount;
  const availableCredit = credit.credit_limit - credit.utilized;

  // CRITICAL: Validate credit limit before allowing settlement
  if (newUtilized > credit.credit_limit) {
    logger.error('[Credit] Limit exceeded', {
      merchantId,
      currentUtilized: credit.utilized,
      requestedAmount: amount,
      creditLimit: credit.credit_limit,
      excess: newUtilized - credit.credit_limit
    });
    throw new Error(`Credit limit exceeded. Available: ₹${availableCredit.toFixed(2)}, Requested: ₹${amount.toFixed(2)}`);
  }

  // Update credit line - note: no 'available' column in DB
  const { error: updateError } = await supabase
    .from('credit_lines')
    .update({
      utilized: newUtilized,
    })
    .eq('id', credit.id);

  if (updateError) {
    throw new Error(`Failed to update credit line: ${updateError.message}`);
  }

  // Update purchase order payment status
  const { error: poUpdateError } = await supabase
    .from('purchase_orders')
    .update({
      payment_status: 'paid',
    })
    .eq('id', poId);

  if (poUpdateError) {
    throw new Error(`Failed to update purchase order: ${poUpdateError.message}`);
  }

  logger.info(`BNPL payment settled for PO ${poId}: amount=${amount}, new utilized=${newUtilized}`);

  await logEvent(supabase, {
    event_type: 'payment.bnpl.settled',
    source: 'payment-settlement',
    payload: {
      po_id: poId,
      merchant_id: merchantId,
      credit_line_id: credit.id,
      amount,
      new_utilized: newUtilized,
    },
  });
}

/**
 * Initiate payment for a purchase order
 */
export async function initiatePayment(
  supabase: SupabaseClient,
  poId: string
): Promise<{ success: boolean; paymentUrl?: string; error?: string }> {
  // Fetch the purchase order
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', poId)
    .single();

  if (poError) {
    return { success: false, error: `Failed to fetch purchase order: ${poError.message}` };
  }

  if (!po) {
    return { success: false, error: `Purchase order ${poId} not found` };
  }

  const purchaseOrder = po as PurchaseOrderRow;

  try {
    switch (purchaseOrder.payment_method) {
      case 'net-terms': {
        // NET_TERMS: Payment is pending until due date
        // Get tenor_days from credit line
        const { data: creditLine } = await supabase
          .from('credit_lines')
          .select('tenor_days')
          .eq('merchant_id', purchaseOrder.merchant_id)
          .eq('status', 'active')
          .single();

        const tenorDays = creditLine ? (creditLine as CreditLineRow).tenor_days : 30;

        logger.info(`NET_TERMS payment initiated for PO ${poId}`);

        await logEvent(supabase, {
          event_type: 'payment.net_terms.initiated',
          source: 'payment-settlement',
          payload: {
            po_id: poId,
            merchant_id: purchaseOrder.merchant_id,
            net_amount: purchaseOrder.net_amount,
            tenor_days: tenorDays,
          },
        });

        return { success: true };
      }

      case 'bnpl': {
        // BNPL: Check credit availability
        const { available, creditLine } = await checkCreditAvailability(
          supabase,
          purchaseOrder.merchant_id,
          purchaseOrder.net_amount
        );

        if (!available || !creditLine) {
          return {
            success: false,
            error: 'Insufficient credit line or no active credit line found',
          };
        }

        // Settle the BNPL payment
        await settleBNPLPayment(supabase, poId, purchaseOrder.net_amount);

        return { success: true };
      }

      case 'prepaid':
      case 'upi':
      case 'bank_transfer':
      case 'cod': {
        // For prepaid/UPI/bank_transfer/cod: Payment is pending until received
        // In production, this would integrate with actual payment gateway (Razorpay, etc.)
        logger.info(`${purchaseOrder.payment_method.toUpperCase()} payment initiated for PO ${poId}`);

        // Update PO status to indicate payment is being processed
        await supabase
          .from('purchase_orders')
          .update({
            payment_status: 'pending',
          })
          .eq('id', poId);

        await logEvent(supabase, {
          event_type: 'payment.initiated',
          source: 'payment-settlement',
          payload: {
            po_id: poId,
            merchant_id: purchaseOrder.merchant_id,
            payment_method: purchaseOrder.payment_method,
            amount: purchaseOrder.net_amount,
          },
        });

        return { success: true };
      }

      case 'credit': {
        // Credit: Similar to BNPL, uses credit line
        const { available, creditLine } = await checkCreditAvailability(
          supabase,
          purchaseOrder.merchant_id,
          purchaseOrder.net_amount
        );

        if (!available || !creditLine) {
          return {
            success: false,
            error: 'Insufficient credit line or no active credit line found',
          };
        }

        await settleBNPLPayment(supabase, poId, purchaseOrder.net_amount);
        return { success: true };
      }

      default:
        return { success: false, error: `Unknown payment method: ${purchaseOrder.payment_method}` };
    }
  } catch (err) {
    const error = err as Error;
    logger.error(`Payment initiation failed for PO ${poId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle payment webhook from Razorpay/UPI
 * CRITICAL: Webhooks MUST have a valid signature - reject unsigned requests
 */
export async function handlePaymentWebhook(
  supabase: SupabaseClient,
  payload: PaymentWebhookPayload,
  signature?: string
): Promise<void> {
  // CRITICAL: Reject webhooks without signature - unsigned requests are dangerous
  if (!signature) {
    logger.error('[Webhook] Rejected unsigned webhook request');
    throw new Error('Webhook signature required');
  }

  // Verify webhook signature - throws if secret not configured
  const payloadStr = JSON.stringify(payload);
  verifyWebhookSignature(payloadStr, signature);

  const paymentEntity = payload.payload.payment.entity;
  const razorpayPaymentId = paymentEntity.id;
  const razorpayOrderId = paymentEntity.order_id;
  const paymentStatus = paymentEntity.status;

  logger.info(`Processing webhook: event=${payload.event}, payment_id=${razorpayPaymentId}, status=${paymentStatus}`);

  // Find the purchase order by order number (stored as order_number)
  // Note: In production, you'd store razorpay_order_id in the PO
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('order_number', razorpayOrderId)
    .single();

  if (poError && poError.code !== 'PGRST116') {
    logger.warn(`Purchase order not found for razorpay order ${razorpayOrderId}`);
    return;
  }

  if (po) {
    await processPaymentStatusUpdate(supabase, po as PurchaseOrderRow, paymentStatus, razorpayPaymentId);
  }
}

/**
 * Process payment status update based on payment gateway status
 */
async function processPaymentStatusUpdate(
  supabase: SupabaseClient,
  purchaseOrder: PurchaseOrderRow,
  gatewayStatus: string,
  razorpayPaymentId: string
): Promise<void> {
  let newStatus: PaymentStatus;
  let eventType: string;

  switch (gatewayStatus) {
    case 'captured':
    case 'authorized':
      newStatus = 'paid';
      eventType = 'payment.completed';
      break;
    case 'failed':
      newStatus = 'cancelled';
      eventType = 'payment.failed';
      break;
    case 'refunded':
      newStatus = 'partial';
      eventType = 'payment.refunded';
      break;
    case 'pending':
    default:
      newStatus = 'pending';
      eventType = 'payment.processing';
  }

  // Update purchase order
  const { error: updateError } = await supabase
    .from('purchase_orders')
    .update({
      payment_status: newStatus,
    })
    .eq('id', purchaseOrder.id);

  if (updateError) {
    throw new Error(`Failed to update purchase order: ${updateError.message}`);
  }

  await logEvent(supabase, {
    event_type: eventType,
    source: 'payment-settlement',
    payload: {
      po_id: purchaseOrder.id,
      merchant_id: purchaseOrder.merchant_id,
      razorpay_payment_id: razorpayPaymentId,
      gateway_status: gatewayStatus,
      new_payment_status: newStatus,
    },
  });

  logger.info(`Payment status updated for PO ${purchaseOrder.id}: ${newStatus}`);
}

/**
 * Check for overdue payments and update their status
 */
export async function checkOverduePayments(
  supabase: SupabaseClient
): Promise<{ overduePOs: PurchaseOrderRow[] }> {
  const now = new Date();

  // Find purchase orders that are past expected_delivery and still pending
  // Note: tenor_days is on credit_lines, not purchase_orders
  const { data: overdueOrders, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .in('payment_method', ['net-terms', 'credit', 'bnpl'])
    .eq('payment_status', 'pending')
    .eq('status', 'delivered'); // Only orders that have been delivered

  if (error) {
    throw new Error(`Failed to fetch overdue orders: ${error.message}`);
  }

  const orders = (overdueOrders || []) as PurchaseOrderRow[];
  const overduePOs: PurchaseOrderRow[] = [];

  for (const order of orders) {
    const expectedDelivery = new Date(order.expected_delivery);

    // Consider overdue if past expected delivery date
    if (now > expectedDelivery) {
      overduePOs.push(order);

      // Update status to overdue
      await supabase
        .from('purchase_orders')
        .update({
          payment_status: 'overdue',
        })
        .eq('id', order.id);

      const daysOverdue = Math.floor((now.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24));

      await logEvent(supabase, {
        event_type: 'payment.overdue.detected',
        source: 'payment-settlement',
        payload: {
          po_id: order.id,
          merchant_id: order.merchant_id,
          expected_delivery: expectedDelivery.toISOString(),
          days_overdue: daysOverdue,
        },
      });

      logger.info(`Payment overdue for PO ${order.id}: due ${expectedDelivery.toISOString()}, ${daysOverdue} days overdue`);
    }
  }

  logger.info(`Found ${overduePOs.length} overdue payments`);
  return { overduePOs };
}

/**
 * Send payment reminder for upcoming due dates
 */
async function sendPaymentReminders(supabase: SupabaseClient): Promise<void> {
  const now = new Date();
  const reminderWindow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

  // Find purchase orders with pending payments due within 3 days
  const { data: upcomingOrders, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .in('payment_method', ['net-terms', 'credit', 'bnpl'])
    .eq('payment_status', 'pending')
    .eq('status', 'delivered');

  if (error) {
    throw new Error(`Failed to fetch upcoming orders: ${error.message}`);
  }

  const orders = (upcomingOrders || []) as PurchaseOrderRow[];

  for (const order of orders) {
    const expectedDelivery = new Date(order.expected_delivery);
    const daysUntilDue = Math.ceil((expectedDelivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 3 && daysUntilDue > 0) {
      // Send reminder
      await logEvent(supabase, {
        event_type: 'payment.reminder.sent',
        source: 'payment-settlement',
        payload: {
          po_id: order.id,
          merchant_id: order.merchant_id,
          expected_delivery: expectedDelivery.toISOString(),
          days_until_due: daysUntilDue,
        },
      });

      logger.info(`Payment reminder sent for PO ${order.id}: due in ${daysUntilDue} days`);
    }
  }
}

/**
 * Main entry point for payment settlement service
 */
async function main(): Promise<void> {
  logger.info('Starting Payment Settlement Service...');
  logger.info(`Timestamp: ${new Date().toISOString()}`);

  const supabase = createSupabaseClient();

  try {
    // Check for overdue payments
    const overdueResult = await checkOverduePayments(supabase);
    logger.info(`\nOverdue payments: ${overdueResult.overduePOs.length}`);

    // Send reminders for upcoming due dates
    await sendPaymentReminders(supabase);

  } catch (error) {
    logger.error('Payment Settlement Service failed:', error);
    process.exit(1);
  }

  logger.info('Payment Settlement Service exiting...');
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
