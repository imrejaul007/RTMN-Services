// Accountant AI - Port 4781
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4781;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'accountant-ai', port: PORT });
});

app.post('/api/invoices/create', (req, res) => {
  const { customer, items } = req.body;
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  res.json({
    invoiceId: `inv_${Date.now()}`,
    invoiceNumber: 'INV-001',
    customer,
    items,
    subtotal: total,
    tax: total * 0.18,
    total: total * 1.18,
    status: 'draft'
  });
});

app.post('/api/expenses/categorize', (req, res) => {
  const { description, amount } = req.body;
  res.json({
    description,
    amount,
    category: 'Office Supplies',
    budgetStatus: 'within'
  });
});

app.get('/api/reports/financial', (req, res) => {
  res.json({
    revenue: 500000,
    expenses: 350000,
    profit: 150000,
    margin: '30%',
    burnRate: 11666
  });
});

app.listen(PORT, () => {
  console.log(`Accountant AI running on port ${PORT}`);
});
