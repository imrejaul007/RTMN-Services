/**
 * Creator Payout Service - Port: 4757
 * Revenue split and payments
 */

import express from 'express';
const app = express();
const PORT = parseInt(process.env.PORT || '4757', 10);
app.use(express.json());

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'creator-payout' }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.get('/api/earnings/:creatorId', (req, res) => {
  res.json({ success: true, data: { creatorId: req.params.creatorId, balance: 0, pending: 0, total: 0 } });
});

app.get('/api/payouts/:creatorId', (req, res) => {
  res.json({ success: true, data: { payouts: [], total: 0 } });
});

const server = app.listen(PORT, () => console.log(`Creator Payout - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
