/**
 * Exhibition Payment Service
 * Port 5048
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

dotenv.config();

const PORT = process.env.PORT || 5048;
const SERVICE_NAME = 'exhibition-payment-service';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })],
});

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

interface Payment {
  id: string;
  type: 'ticket' | 'exhibitor_fee' | 'sponsor_fee';
  entity_id: string;
  exhibition_id: string;
  payer_id: string;
  amount: number;
  currency: string;
  method: 'upi' | 'card' | 'netbanking' | 'wallet';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  gateway_txn_id?: string;
  utr?: string;
  created_at: string;
  completed_at?: string;
}

interface EscrowHold {
  id: string;
  exhibition_id: string;
  exhibitor_id: string;
  amount: number;
  currency: string;
  status: 'held' | 'released' | 'refunded';
  held_at: string;
  released_at?: string;
}

const payments = new Map<string, Payment>();
const escrowHolds = new Map<string, EscrowHold>();

app.get('/health', (_req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
app.get('/health/live', (_req, res) => res.json({ status: 'alive' });
app.get('/health/ready', (_req, res) => res.json({ status: 'ready' });

app.post('/api/payments/intent', (req, res) => {
  const { type, exhibition_id, payer_id, amount, currency = 'INR' } = req.body;
  if (!type || !exhibition_id || !payer_id || !amount) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  const payment: Payment = {
    id: `PAY-${uuidv4().substring(0, 8).toUpperCase()}`,
    type, exhibition_id, payer_id, amount, currency, method: 'upi',
    status: 'pending', created_at: new Date().toISOString(),
  };

  payments.set(payment.id, payment);

  res.status(201).json({
    success: true,
    data: {
      payment_id: payment.id,
      amount,
      currency,
      razorpay: { key: 'rzp_test', order_id: `order_${uuidv4()}`, amount: amount * 100 },
    },
  });
});

app.post('/api/payments/:id/confirm', (req, res) => {
  const payment = payments.get(req.params.id);
  if (!payment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } });

  payment.status = 'completed';
  payment.completed_at = new Date().toISOString();
  payments.set(payment.id, payment);

  if (payment.type === 'exhibitor_fee') {
    const hold: EscrowHold = {
      id: `ESC-${uuidv4().substring(0, 8).toUpperCase()}`,
      exhibition_id: payment.exhibition_id, exhibitor_id: payment.entity_id,
      amount: payment.amount, currency: payment.currency,
      status: 'held', held_at: new Date().toISOString(),
    };
    escrowHolds.set(hold.id, hold);
  }

  logger.info('Payment confirmed', { payment_id: payment.id });
  res.json({ success: true, data: payment });
});

app.get('/api/payments/:id', (req, res) => {
  const payment = payments.get(req.params.id);
  if (!payment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } });
  res.json({ success: true, data: payment });
});

app.get('/api/payments', (req, res) => {
  const { exhibition_id, payer_id, status } = req.query;
  let results = Array.from(payments.values());
  if (exhibition_id) results = results.filter(p => p.exhibition_id === exhibition_id);
  if (payer_id) results = results.filter(p => p.payer_id === payer_id);
  if (status) results = results.filter(p => p.status === status);
  res.json({ success: true, data: { payments: results, total: results.length } });
});

app.get('/api/escrow/:exhibitorId', (req, res) => {
  const holds = Array.from(escrowHolds.values()).filter(h => h.exhibitor_id === req.params.exhibitorId);
  const totalHeld = holds.filter(h => h.status === 'held').reduce((sum, h) => sum + h.amount, 0);
  res.json({ success: true, data: { holds, total_held: totalHeld } });
});

app.get('/api/stats/:exhibitionId', (req, res) => {
  const exhibitorPayments = Array.from(payments.values()).filter(p => p.exhibition_id === req.params.exhibitionId && p.status === 'completed');
  const ticketRevenue = exhibitorPayments.filter(p => p.type === 'ticket').reduce((sum, p) => sum + p.amount, 0);
  const exhibitorRevenue = exhibitorPayments.filter(p => p.type === 'exhibitor_fee').reduce((sum, p) => sum + p.amount, 0);
  res.json({
    success: true,
    data: { total_transactions: exhibitorPayments.length, revenue: { tickets: ticketRevenue, exhibitor_fees: exhibitorRevenue, total: ticketRevenue + exhibitorRevenue } },
  });
});

app.listen(PORT, () => logger.info(`Payment Service started on port ${PORT}`);;
export default app;
