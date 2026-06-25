/**
 * BAM Marketplace Payment Service
 *
 * Handles:
 * - Stripe checkout sessions
 * - Payment intents for one-time purchases
 * - Subscription management
 * - Webhook processing
 * - Revenue tracking
 */

import Stripe from 'stripe';
import { Listing } from '../models/Listing.js';

// Initialize Stripe (use test key in development)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
});

// Commission rates
const COMMISSION_RATES = {
  'free': 0,
  'one-time': 0.20,      // 20% for one-time purchases >= $100
  'subscription': 0.30,    // 30% for subscriptions
  'usage-based': 0.25,    // 25% for usage-based
  'quote-only': 0,        // No commission for quotes
};

// Revenue tracking (in-memory for demo, use DB in production)
const revenueTracker = {
  totalRevenue: 0,
  totalCommissions: 0,
  transactions: [],
};

/**
 * Create a Stripe checkout session for a listing
 */
export async function createCheckoutSession(tenantId, listingId, customerId, customerEmail, successUrl, cancelUrl) {
  const listing = await Listing.findOne({ tenantId, listingId });
  if (!listing) {
    throw new Error('LISTING_NOT_FOUND');
  }

  if (listing.pricingModel === 'free' || listing.price === 0) {
    throw new Error('FREE_LISTING');
  }

  // Calculate amounts (Stripe uses cents)
  const amount = Math.round(listing.price * 100);
  const commission = Math.round(amount * COMMISSION_RATES[listing.pricingModel] || 0);

  const sessionParams = {
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: (listing.currency || 'USD').toLowerCase(),
          product_data: {
            name: listing.title,
            description: listing.shortDescription || listing.description?.slice(0, 500),
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    mode: listing.pricingModel === 'subscription' ? 'subscription' : 'payment',
    success_url: successUrl || `${process.env.APP_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${process.env.APP_URL || 'http://localhost:3000'}/cancel`,
    customer_email: customerEmail,
    metadata: {
      tenantId,
      listingId,
      customerId: customerId || 'anonymous',
      pricingModel: listing.pricingModel,
      publisherId: listing.publisherId || 'hojai',
    },
    payment_intent_data: listing.pricingModel !== 'subscription' ? {
      metadata: {
        tenantId,
        listingId,
        commission,
      },
    } : undefined,
    subscription_data: listing.pricingModel === 'subscription' ? {
      metadata: {
        tenantId,
        listingId,
        commission: Math.round(amount * COMMISSION_RATES['subscription']),
      },
    } : undefined,
  };

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);

    // Track transaction
    revenueTracker.transactions.push({
      id: session.id,
      type: 'checkout_session',
      listingId,
      tenantId,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    return {
      sessionId: session.id,
      url: session.url,
      amount,
      currency: listing.currency || 'USD',
    };
  } catch (error) {
    console.error('[paymentService] Stripe error:', error.message);
    throw new Error(`STRIPE_ERROR: ${error.message}`);
  }
}

/**
 * Create a payment intent for direct payment (alternative to checkout)
 */
export async function createPaymentIntent(tenantId, listingId, customerId, paymentMethodId) {
  const listing = await Listing.findOne({ tenantId, listingId });
  if (!listing) {
    throw new Error('LISTING_NOT_FOUND');
  }

  if (listing.pricingModel === 'free' || listing.price === 0) {
    throw new Error('FREE_LISTING');
  }

  const amount = Math.round(listing.price * 100);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: (listing.currency || 'USD').toLowerCase(),
      payment_method: paymentMethodId,
      confirm: true,
      metadata: {
        tenantId,
        listingId,
        customerId: customerId || 'anonymous',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      status: paymentIntent.status,
    };
  } catch (error) {
    console.error('[paymentService] PaymentIntent error:', error.message);
    throw new Error(`STRIPE_ERROR: ${error.message}`);
  }
}

/**
 * Retrieve checkout session status
 */
export async function getCheckoutSession(sessionId) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return {
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      amount: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_email,
      metadata: session.metadata,
    };
  } catch (error) {
    console.error('[paymentService] Session retrieval error:', error.message);
    throw new Error(`STRIPE_ERROR: ${error.message}`);
  }
}

/**
 * Process Stripe webhook
 */
export async function handleWebhook(payload, sig) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('[paymentService] No webhook secret configured, skipping verification');
    return { verified: false };
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (error) {
    console.error('[paymentService] Webhook verification failed:', error.message);
    throw new Error(`WEBHOOK_VERIFICATION_FAILED`);
  }

  // Process events
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePaid(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handleInvoiceFailed(event.data.object);
      break;
    default:
      console.log(`[paymentService] Unhandled event type: ${event.type}`);
  }

  return { verified: true, eventType: event.type };
}

// Event handlers
async function handleCheckoutCompleted(session) {
  const { tenantId, listingId, customerId, pricingModel } = session.metadata || {};

  // Update transaction
  const tx = revenueTracker.transactions.find(t => t.id === session.id);
  if (tx) {
    tx.status = 'completed';
    tx.completedAt = new Date().toISOString();
    revenueTracker.totalRevenue += session.amount_total || 0;
    revenueTracker.totalCommissions += Math.round((session.amount_total || 0) * (COMMISSION_RATES[pricingModel] || 0));
  }

  // Update listing install count
  if (tenantId && listingId) {
    await Listing.updateOne(
      { tenantId, listingId },
      { $inc: { installs: 1 } }
    );
  }

  console.log(`[paymentService] Checkout completed: ${session.id}, listing: ${listingId}`);
}

async function handlePaymentSucceeded(paymentIntent) {
  console.log(`[paymentService] Payment succeeded: ${paymentIntent.id}`);
}

async function handlePaymentFailed(paymentIntent) {
  console.log(`[paymentService] Payment failed: ${paymentIntent.id}`);
}

async function handleSubscriptionCreated(subscription) {
  console.log(`[paymentService] Subscription created: ${subscription.id}`);
}

async function handleSubscriptionUpdated(subscription) {
  console.log(`[paymentService] Subscription updated: ${subscription.id}`);
}

async function handleSubscriptionDeleted(subscription) {
  console.log(`[paymentService] Subscription deleted: ${subscription.id}`);
}

async function handleInvoicePaid(invoice) {
  console.log(`[paymentService] Invoice paid: ${invoice.id}`);
}

async function handleInvoiceFailed(invoice) {
  console.log(`[paymentService] Invoice failed: ${invoice.id}`);
}

/**
 * Get publisher revenue summary
 */
export async function getPublisherRevenue(tenantId, publisherId) {
  const transactions = revenueTracker.transactions.filter(
    t => t.tenantId === tenantId && t.status === 'completed'
  );

  const totalSales = transactions.length;
  const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalCommission = Math.round(totalRevenue * 0.25); // Average commission

  return {
    publisherId,
    totalSales,
    grossRevenue: totalRevenue,
    commission: totalCommission,
    netRevenue: totalRevenue - totalCommission,
    currency: 'INR',
  };
}

/**
 * Get platform revenue stats
 */
export function getPlatformStats() {
  return {
    totalRevenue: revenueTracker.totalRevenue,
    totalCommissions: revenueTracker.totalCommissions,
    transactionCount: revenueTracker.transactions.length,
    completedCount: revenueTracker.transactions.filter(t => t.status === 'completed').length,
  };
}

/**
 * Create customer portal session for managing subscriptions
 */
export async function createCustomerPortal(customerId, returnUrl) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || process.env.APP_URL || 'http://localhost:3000',
    });
    return { url: session.url };
  } catch (error) {
    console.error('[paymentService] Portal error:', error.message);
    throw new Error(`STRIPE_ERROR: ${error.message}`);
  }
}
