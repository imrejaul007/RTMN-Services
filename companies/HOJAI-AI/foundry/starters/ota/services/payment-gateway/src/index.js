/**
 * Payment Gateway Service
 * Port: 4702
 * Supports: Razorpay (India), Stripe (Global)
 */
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(cors(), express.json());
const PORT = process.env.PORT || 4702;

// Payment providers
const PROVIDERS = {
  razorpay: { name: 'Razorpay', region: 'India', currencies: ['INR'], methods: ['upi', 'card', 'netbanking', 'wallet'] },
  stripe: { name: 'Stripe', region: 'Global', currencies: ['USD', 'EUR', 'GBP', 'INR'], methods: ['card', 'upi', 'bank_transfer'] }
};

// Transactions store
const transactions = new Map();

// ── Routes ─────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'payment-gateway' }));

// List providers
app.get('/api/providers', (_, res) => {
  res.json({ success: true, providers: PROVIDERS });
});

// Create payment order
app.post('/api/order', requireInternal, async (req, res) => {
  const { amount, currency, provider, method, bookingId, description, customer } = req.body;

  if (!amount || !provider) {
    return res.status(400).json({ error: 'amount and provider required' });
  }

  const providerConfig = PROVIDERS[provider];
  if (!providerConfig) {
    return res.status(400).json({ error: `Unknown provider: ${provider}` });
  }

  // Create order
  const orderId = `${provider.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

  const order = {
    id: orderId,
    amount,
    currency: currency || 'INR',
    provider,
    method,
    bookingId,
    description: description || 'OTA Booking Payment',
    customer: customer || {},
    status: 'created',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 mins
  };

  transactions.set(orderId, order);

  res.status(201).json({
    success: true,
    order: {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      provider: order.provider,
      status: order.status,
      expiresAt: order.expiresAt
    }
  });
});

// Verify payment
app.post('/api/verify', requireInternal, async (req, res) => {
  const { orderId, paymentId, signature } = req.body;

  const order = transactions.get(orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Simulate verification
  const isValid = signature === 'valid_signature' || Math.random() > 0.1; // 90% success rate

  if (isValid) {
    order.status = 'captured';
    order.paymentId = paymentId || `PAY_${Date.now()}`;
    order.capturedAt = new Date().toISOString();
  } else {
    order.status = 'failed';
    order.failedAt = new Date().toISOString();
  }

  transactions.set(orderId, order);

  res.json({
    success: isValid,
    order: {
      id: order.id,
      status: order.status,
      paymentId: order.paymentId
    }
  });
});

// Get transaction
app.get('/api/transaction/:id', (req, res) => {
  const transaction = transactions.get(req.params.id);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json({ success: true, transaction });
});

// Refund
app.post('/api/refund', requireInternal, async (req, res) => {
  const { transactionId, amount, reason } = req.body;

  const transaction = transactions.get(transactionId);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  if (transaction.status !== 'captured') {
    return res.status(400).json({ error: 'Transaction not captured' });
  }

  const refundAmount = amount || transaction.amount;
  const refundId = `REF_${Date.now()}`;

  const refund = {
    id: refundId,
    transactionId,
    amount: refundAmount,
    status: 'processed',
    reason: reason || 'Customer request',
    processedAt: new Date().toISOString(),
    expectedDays: transaction.provider === 'razorpay' ? '5-7' : '7-10'
  };

  res.status(201).json({ success: true, refund });
});

// Webhook endpoint
app.post('/api/webhook/:provider', requireInternal, async (req, res) => {
  const { provider } = req.params;
  const payload = req.body;

  // Log webhook
  console.log(`Webhook from ${provider}:`, JSON.stringify(payload));

  // Handle events
  const events = {
    razorpay: {
      'payment.captured': handlePaymentCaptured,
      'payment.failed': handlePaymentFailed,
      'refund.processed': handleRefundProcessed
    },
    stripe: {
      'payment_intent.succeeded': handlePaymentCaptured,
      'payment_intent.payment_failed': handlePaymentFailed,
      'charge.refunded': handleRefundProcessed
    }
  };

  const eventType = payload.event || payload.type;
  const handler = events[provider]?.[eventType];

  if (handler) {
    await handler(payload);
  }

  res.json({ received: true });
});

// ── Webhook Handlers ─────────────────────────────────────────────

async function handlePaymentCaptured(payload) {
  console.log('Payment captured:', payload.id);
  // Update booking status
}

async function handlePaymentFailed(payload) {
  console.log('Payment failed:', payload.id);
  // Notify customer
}

async function handleRefundProcessed(payload) {
  console.log('Refund processed:', payload.id);
  // Update booking, send confirmation
}

// ── UPI Specific ─────────────────────────────────────────────────

app.post('/api/upi/qr', requireInternal, async (req, res) => {
  const { amount, upiId, description } = req.body;

  // Generate QR code URL
  const qrUrl = `upi://pay?pa=${upiId}&pn=OTA&am=${amount}&cu=INR&tn=${encodeURIComponent(description || 'OTA Payment')}`;

  res.json({
    success: true,
    qr: {
      url: qrUrl,
      amount,
      upiId,
      expiresIn: '30 minutes'
    }
  });
});

app.listen(PORT, () => console.log(`
╔══════════════════════════════════════════╗
║  Payment Gateway — PORT ${PORT}         ║
║  Razorpay • Stripe                   ║
╠══════════════════════════════════════════╣
║  POST /api/order  — Create payment  ║
║  POST /api/verify — Verify payment ║
║  POST /api/refund — Process refund ║
║  GET  /api/transaction/:id         ║
╚══════════════════════════════════════════╝
`));

export default app;
