import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5167;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'REZ-SalesMind', version: '2.4.0' });
});

app.get('/api/copilot/next-action', (req, res) => {
  res.json({ success: true, action: 'Send WhatsApp', reason: 'High engagement' });
});

app.get('/api/leads', (req, res) => {
  res.json({ leads: [], total: 0 });
});

app.get('/api/dashboard/stats', (req, res) => {
  res.json({ totalLeads: 1247, qualified: 423, revenue: 2450000 });
});

app.listen(PORT, () => {
  console.log(`REZ SalesMind running on port ${PORT}`);
});
