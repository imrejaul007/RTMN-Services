/**
 * HOJAI SiteOS Payment Gateway Service
 * Port: 5479
 * Handles Razorpay, UPI, and other payment integrations
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5479;
const STORAGE_PATH = process.env.STORAGE_PATH || '/tmp';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// API Key Authentication
const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  req.companyId = req.headers['x-company-id'] || 'default';
  next();
};

// In-memory payment storage (use file persistence for production)
const getPaymentsFile = (companyId) => `${STORAGE_PATH}/siteos-payments-${companyId}.json`;

const loadPayments = (companyId) => {
  const file = getPaymentsFile(companyId);
  if (existsSync(file)) {
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      return [];
    }
  }
  return [];
};

const savePayments = (companyId, payments) => {
  const file = getPaymentsFile(companyId);
  writeFileSync(file, JSON.stringify(payments, null, 2));
};

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// UPI Configuration
const UPI_ID = process.env.UPI_ID || 'hojai@upi';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'payment-gateway', port: PORT });
});

// Get available payment methods
app.get('/api/payments/methods', requireAuth, (req, res) => {
  res.json({
    methods: [
      { id: 'razorpay', name: 'Razorpay', types: ['card', 'netbanking', 'wallet', 'emi'] },
      { id: 'upi', name: 'UPI', types: ['upi'] },
      { id: 'card', name: 'Credit/Debit Card', types: ['card'] },
      { id: 'wallet', name: 'Wallet', types: ['wallet'] }
    ],
    defaultUpiId: UPI_ID
  });
});

// Initiate payment (create Razorpay order)
app.post('/api/payments/initiate', requireAuth, async (req, res) => {
  try {
    const { orderId, amount, currency = 'INR', customerId, customerEmail, customerPhone, method } = req.body;

    if (!orderId || !amount || !customerId) {
      return res.status(400).json({ error: 'orderId, amount, and customerId are required' });
    }

    const paymentId = `pay_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

    // Create payment record
    const payment = {
      paymentId,
      orderId,
      companyId: req.companyId,
      customerId,
      customerEmail,
      customerPhone,
      amount,
      currency,
      method: method || 'razorpay',
      status: 'pending',
      razorpayOrderId: null,
      razorpayPaymentId: null,
      upiQrData: null,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // If Razorpay is configured, create actual order
    if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
      try {
        const razorpayOrder = await createRazorpayOrder(paymentId, amount, currency, orderId);
        payment.razorpayOrderId = razorpayOrder.id;
        payment.metadata.razorpayReceipt = razorpayOrder.receipt;
      } catch (e) {
        console.log('Razorpay not available, using mock order');
        payment.razorpayOrderId = `order_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
      }
    } else {
      // Mock order for development
      payment.razorpayOrderId = `order_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    }

    const payments = loadPayments(req.companyId);
    payments.push(payment);
    savePayments(req.companyId, payments);

    res.json({
      success: true,
      payment: {
        id: payment.paymentId,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayKeyId: RAZORPAY_KEY_ID,
        amount,
        currency,
        status: payment.status
      }
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// Get payment status
app.get('/api/payments/:paymentId', requireAuth, (req, res) => {
  const { paymentId } = req.params;
  const payments = loadPayments(req.companyId);
  const payment = payments.find(p => p.paymentId === paymentId);

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  res.json({ payment });
});

// Update payment status (after verification)
app.put('/api/payments/:paymentId', requireAuth, (req, res) => {
  const { paymentId } = req.params;
  const { status, razorpayPaymentId, metadata } = req.body;
  const payments = loadPayments(req.companyId);
  const index = payments.findIndex(p => p.paymentId === paymentId);

  if (index === -1) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  const validStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  payments[index] = {
    ...payments[index],
    status: status || payments[index].status,
    razorpayPaymentId: razorpayPaymentId || payments[index].razorpayPaymentId,
    metadata: { ...payments[index].metadata, ...metadata },
    updatedAt: new Date().toISOString()
  };

  savePayments(req.companyId, payments);

  res.json({ success: true, payment: payments[index] });
});

// Generate UPI QR code data
app.post('/api/payments/upi-qr', requireAuth, (req, res) => {
  const { paymentId, amount, note } = req.body;

  if (!paymentId || !amount) {
    return res.status(400).json({ error: 'paymentId and amount are required' });
  }

  // UPI QR format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=CURRENCY&tn=NOTE
  const upiUrl = `upi://pay?pa=${UPI_ID}&pn=HOJAI&am=${amount}&cu=INR&tn=${encodeURIComponent(note || 'HOJAI Payment')}&tr=${paymentId}`;

  // Base64 encoded QR data for QR libraries
  const qrData = Buffer.from(upiUrl).toString('base64');

  // Update payment with UPI details
  const payments = loadPayments(req.companyId);
  const index = payments.findIndex(p => p.paymentId === paymentId);

  if (index !== -1) {
    payments[index].upiQrData = upiUrl;
    payments[index].status = 'processing';
    payments[index].updatedAt = new Date().toISOString();
    savePayments(req.companyId, payments);
  }

  res.json({
    success: true,
    upi: {
      qrData: upiUrl,
      qrDataBase64: qrData,
      upiId: UPI_ID,
      amount,
      paymentId
    }
  });
});

// Verify UPI payment (manual verification endpoint)
app.post('/api/payments/upi/verify', requireAuth, (req, res) => {
  const { paymentId, utr } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: 'paymentId is required' });
  }

  const payments = loadPayments(req.companyId);
  const payment = payments.find(p => p.paymentId === paymentId);

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  // In production, verify with UPI gateway
  // For now, mark as completed if UTR is provided
  if (utr) {
    payment.status = 'completed';
    payment.metadata = { ...payment.metadata, upiUtr: utr };
    payment.updatedAt = new Date().toISOString();
    savePayments(req.companyId, payments);

    return res.json({
      success: true,
      verified: true,
      payment: { id: payment.paymentId, status: payment.status }
    });
  }

  res.json({
    success: true,
    verified: false,
    message: 'UTR number required for verification'
  });
});

// Razorpay webhook handler
app.post('/api/payments/webhook', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Verify webhook signature
  if (webhookSecret && signature) {
    const crypto = await import('crypto');
    const expectedSignature = crypto.createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
  }

  const event = req.body.event;
  const payload = req.body.payload;

  console.log(`Webhook received: ${event}`);

  // Handle different webhook events
  switch (event) {
    case 'payment.captured':
      await handlePaymentCaptured(payload);
      break;
    case 'payment.failed':
      await handlePaymentFailed(payload);
      break;
    case 'refund.created':
      await handleRefundCreated(payload);
      break;
    default:
      console.log(`Unhandled webhook event: ${event}`);
  }

  res.json({ received: true });
});

// Helper functions
async function createRazorpayOrder(paymentId, amount, currency, receipt) {
  // This would use the actual Razorpay API
  // For now, return a mock order
  const crypto = await import('crypto');
  const orderId = `order_${crypto.randomBytes(16).toString('hex')}`;

  return {
    id: orderId,
    amount: amount * 100, // Razorpay uses paise
    currency,
    receipt,
    status: 'created'
  };
}

async function handlePaymentCaptured(payload) {
  const paymentEntity = payload.payment.entity;
  console.log(`Payment captured: ${paymentEntity.id}`);
  // Update payment status in database
}

async function handlePaymentFailed(payload) {
  const paymentEntity = payload.payment.entity;
  console.log(`Payment failed: ${paymentEntity.id}`);
  // Update payment status and notify customer
}

async function handleRefundCreated(payload) {
  const refundEntity = payload.refund.entity;
  console.log(`Refund created: ${refundEntity.id}`);
  // Update payment status and process refund
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Payment Gateway Service running on port ${PORT}`);
});

export default app;
