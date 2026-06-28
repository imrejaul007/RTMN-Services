/**
 * Payment Gateway - Payment processing
 * Port 4690
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4690;
app.use(express.json());

const payments = new Map();

app.post('/api/payments/create', (req, res) => {
  const { amount, currency, customerId, method } = req.body;
  const payment = { id: uuidv4(), amount, currency: currency || 'USD', customerId, method, status: 'pending', createdAt: new Date().toISOString() };
  payments.set(payment.id, payment);
  res.json(payment);
});

app.post('/api/payments/:id/confirm', (req, res) => {
  const payment = payments.get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Not found' });
  payment.status = 'completed';
  payment.completedAt = new Date().toISOString();
  res.json(payment);
});

app.get('/api/payments/:id', (req, res) => {
  const payment = payments.get(req.params.id);
  payment ? res.json(payment) : res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => console.log(`Payment Gateway running on port ${PORT}`));
export default app;