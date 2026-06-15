// RTMN Billing Service - Stripe Integration
// Port: 4005
import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
});

const app = express();
const PORT = process.env.PORT || 4005;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Webhook needs raw body - must be before json middleware for this route
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send('Webhook Error');
  }

  // Handle events
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
      break;
  }

  res.json({ received: true });
});

// === PRICING PLANS ===
const PLANS = {
  free: {
    id: 'price_free',
    name: 'Free',
    price: 0,
    brands: 1,
    reviewsPerMonth: 100,
    sentimentAnalysis: 'basic' as const,
    webhooks: 0,
    support: 'community' as const,
  },
  starter: {
    id: 'price_starter_monthly',
    name: 'Starter',
    price: 99,
    priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
    brands: 5,
    reviewsPerMonth: 5000,
    sentimentAnalysis: 'afinn' as const,
    webhooks: 1,
    support: 'email' as const,
  },
  professional: {
    id: 'price_professional_monthly',
    name: 'Professional',
    price: 299,
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional',
    brands: 25,
    reviewsPerMonth: 50000,
    sentimentAnalysis: 'ai' as const,
    webhooks: 5,
    support: 'priority' as const,
  },
  enterprise: {
    id: 'price_enterprise',
    name: 'Enterprise',
    price: null, // Custom
    brands: -1, // Unlimited
    reviewsPerMonth: -1, // Unlimited
    sentimentAnalysis: 'ai' as const,
    webhooks: -1,
    support: 'dedicated' as const,
  },
};

// === ROUTES ===

// Get all plans
app.get('/api/v1/plans', (req, res) => {
  res.json({ data: Object.values(PLANS) });
});

// Create checkout session
app.post('/api/v1/checkout', async (req, res) => {
  const { planId, customerEmail, successUrl, cancelUrl, customerId } = req.body;

  const plan = Object.values(PLANS).find(p => p.id === planId);
  if (!plan) {
    return res.status(400).json({ error: { code: 'INVALID_PLAN', message: 'Plan not found' } });
  }

  try {
    let customer: Stripe.Customer | undefined;

    if (customerId) {
      customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    } else if (customerEmail) {
      customer = await stripe.customers.create({
        email: customerEmail,
        metadata: { planId },
      });
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      success_url: successUrl || `${process.env.DASHBOARD_URL}/success`,
      cancel_url: cancelUrl || `${process.env.DASHBOARD_URL}/pricing`,
      metadata: { planId },
    };

    if (customer) {
      sessionParams.customer = customer.id;
    } else {
      sessionParams.customer_email = customerEmail;
    }

    if (plan.priceId) {
      sessionParams.line_items = [{ price: plan.priceId, quantity: 1 }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ data: { sessionId: session.id, url: session.url } });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: { code: 'CHECKOUT_ERROR', message: error.message } });
  }
});

// Create customer portal session
app.post('/api/v1/portal', async (req, res) => {
  const { customerId, returnUrl } = req.body;

  if (!customerId) {
    return res.status(400).json({ error: { code: 'MISSING_CUSTOMER', message: 'Customer ID required' } });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || process.env.DASHBOARD_URL,
    });
    res.json({ data: { url: session.url } });
  } catch (error: any) {
    console.error('Portal error:', error);
    res.status(500).json({ error: { code: 'PORTAL_ERROR', message: error.message } });
  }
});

// Get subscription status
app.get('/api/v1/subscription/:customerId', async (req, res) => {
  const { customerId } = req.params;

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 1,
      expand: ['data.default_payment_method'],
    });

    if (subscriptions.data.length === 0) {
      return res.json({ data: { plan: 'free', status: 'active' } });
    }

    const subscription = subscriptions.data[0];
    const planId = subscription.metadata?.planId || 'starter';
    const plan = Object.values(PLANS).find(p => p.id === planId) || PLANS.starter;

    res.json({
      data: {
        subscriptionId: subscription.id,
        plan: planId,
        planName: plan.name,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        paymentMethod: subscription.default_payment_method,
      },
    });
  } catch (error: any) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: { code: 'SUBSCRIPTION_ERROR', message: error.message } });
  }
});

// Cancel subscription
app.post('/api/v1/subscription/:customerId/cancel', async (req, res) => {
  const { customerId } = req.params;
  const { immediately = false } = req.body;

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return res.status(404).json({ error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription found' } });
    }

    const subscription = subscriptions.data[0];
    const updated = immediately
      ? await stripe.subscriptions.cancel(subscription.id)
      : await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });

    res.json({
      data: {
        subscriptionId: updated.id,
        status: updated.status,
        cancelAtPeriodEnd: updated.cancel_at_period_end,
      },
    });
  } catch (error: any) {
    console.error('Cancel error:', error);
    res.status(500).json({ error: { code: 'CANCEL_ERROR', message: error.message } });
  }
});

// Update subscription
app.post('/api/v1/subscription/:customerId/update', async (req, res) => {
  const { customerId } = req.params;
  const { newPlanId } = req.body;

  const newPlan = Object.values(PLANS).find(p => p.id === newPlanId);
  if (!newPlan || !newPlan.priceId) {
    return res.status(400).json({ error: { code: 'INVALID_PLAN', message: 'Invalid plan' } });
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return res.status(404).json({ error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription' } });
    }

    const subscription = subscriptions.data[0];
    const updated = await stripe.subscriptions.update(subscription.id, {
      items: [{ id: subscription.items.data[0].id, price: newPlan.priceId }],
      metadata: { planId: newPlanId },
      proration_behavior: 'create_prorations',
    });

    res.json({
      data: {
        subscriptionId: updated.id,
        plan: newPlanId,
        status: updated.status,
      },
    });
  } catch (error: any) {
    console.error('Update error:', error);
    res.status(500).json({ error: { code: 'UPDATE_ERROR', message: error.message } });
  }
});

// Create usage record (for metered billing)
app.post('/api/v1/usage/:subscriptionItemId', async (req, res) => {
  const { subscriptionItemId } = req.params;
  const { quantity, timestamp } = req.body;

  try {
    const record = await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      action: 'increment',
    });
    res.json({ data: record });
  } catch (error: any) {
    console.error('Usage error:', error);
    res.status(500).json({ error: { code: 'USAGE_ERROR', message: error.message } });
  }
});

// Get invoices
app.get('/api/v1/invoices/:customerId', async (req, res) => {
  const { customerId } = req.params;
  const { limit = 10 } = req.query;

  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: Number(limit),
    });
    res.json({ data: invoices.data });
  } catch (error: any) {
    console.error('Invoices error:', error);
    res.status(500).json({ error: { code: 'INVOICES_ERROR', message: error.message } });
  }
});

// Get customer
app.get('/api/v1/customer/:customerId', async (req, res) => {
  const { customerId } = req.params;

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    }
    res.json({ data: customer });
  } catch (error: any) {
    console.error('Customer error:', error);
    res.status(500).json({ error: { code: 'CUSTOMER_ERROR', message: error.message } });
  }
});

// Create customer
app.post('/api/v1/customer', async (req, res) => {
  const { email, name, metadata } = req.body;

  if (!email) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email is required' } });
  }

  try {
    const customer = await stripe.customers.create({
      email,
      name: name || '',
      metadata: metadata || {},
    });
    res.json({ data: customer });
  } catch (error: any) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: { code: 'CREATE_ERROR', message: error.message } });
  }
});

// Update customer
app.patch('/api/v1/customer/:customerId', async (req, res) => {
  const { customerId } = req.params;
  const { email, name, metadata } = req.body;

  try {
    const customer = await stripe.customers.update(customerId, {
      email,
      name,
      metadata,
    });
    res.json({ data: customer });
  } catch (error: any) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: { code: 'UPDATE_ERROR', message: error.message } });
  }
});

// Get payment methods
app.get('/api/v1/payment-methods/:customerId', async (req, res) => {
  const { customerId } = req.params;

  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    res.json({ data: paymentMethods.data });
  } catch (error: any) {
    console.error('Payment methods error:', error);
    res.status(500).json({ error: { code: 'PAYMENT_METHODS_ERROR', message: error.message } });
  }
});

// Attach payment method
app.post('/api/v1/payment-methods/:customerId/attach', async (req, res) => {
  const { customerId } = req.params;
  const { paymentMethodId } = req.body;

  if (!paymentMethodId) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Payment method ID required' } });
  }

  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    res.json({ data: paymentMethod });
  } catch (error: any) {
    console.error('Attach payment method error:', error);
    res.status(500).json({ error: { code: 'ATTACH_ERROR', message: error.message } });
  }
});

// Detach payment method
app.post('/api/v1/payment-methods/:paymentMethodId/detach', async (req, res) => {
  const { paymentMethodId } = req.params;

  try {
    const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
    res.json({ data: paymentMethod });
  } catch (error: any) {
    console.error('Detach payment method error:', error);
    res.status(500).json({ error: { code: 'DETACH_ERROR', message: error.message } });
  }
});

// === EVENT HANDLERS ===

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const planId = subscription.metadata?.planId || 'starter';

  console.log(`Subscription ${subscription.status} for customer ${customerId}, plan: ${planId}`);

  // TODO: Update customer record in database
  // await db.customers.update(customerId, { plan: planId, subscriptionId: subscription.id });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`Payment succeeded for customer ${invoice.customer}`);

  // TODO: Record payment, send receipt
  // await db.payments.create({ customerId: invoice.customer, amount: invoice.amount_paid });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`Payment failed for customer ${invoice.customer}`);

  // TODO: Notify customer, pause service
  // await emailService.sendPaymentFailed(invoice.customerEmail);
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  console.log(`Checkout completed for customer ${session.customer}`);

  // TODO: Create account, send welcome email
  // await createAccount(session.customerEmail, session.metadata?.planId);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'billing', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Billing service running on port ${PORT}`);
});

export default app;
