/**
 * BuzzLocal Payment Service
 * Local payments, offers, cashback
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4280;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'buzzlocal-payment-service' });
});

// Create payment
app.post('/api/payments', (req, res) => {
  const { userId, amount, type, merchantId } = req.body;
  res.json({
    success: true,
    data: { id: `pay-${Date.now()}`, userId, amount, type, status: 'pending' }
  });
});

// Claim offer
app.post('/api/offers/claim', (req, res) => {
  const { userId, offerId } = req.body;
  res.json({
    success: true,
    data: { id: `claim-${Date.now()}`, userId, offerId, claimed: true }
  });
});

app.listen(PORT, () => {
  console.log(`💳 BuzzLocal Payment Service - Port ${PORT}`);
});

export default app;
