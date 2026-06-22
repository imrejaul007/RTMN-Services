/**
 * Proposal Agent - Expert Employee
 * Port: 4772
 */

const express = require('express');
const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = 4772;

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'proposal-agent', port: PORT });
});

// Generate Proposal
app.post('/api/proposals/generate', (req, res) => {
  const { customerName, requirements, value } = req.body;
  res.json({
    proposalId: `prop_${Date.now()}`,
    customer: customerName,
    sections: [
      { title: 'Executive Summary', content: `We offer ${requirements} for ${value}.` },
      { title: 'Solution', content: 'Our approach delivers results.' },
      { title: 'Pricing', content: `₹${value.toLocaleString()}` },
      { title: 'Timeline', content: '4-6 weeks delivery' },
      { title: 'Terms', content: '50% advance, 50% on completion' }
    ],
    validUntil: '2026-06-15',
    estimatedValue: value
  });
});

// Generate Quote
app.post('/api/proposals/quote', (req, res) => {
  const { items, discount } = req.body;
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = subtotal * (discount || 0) / 100;
  const total = subtotal - discountAmount;
  res.json({
    quoteId: `qt_${Date.now()}`,
    items,
    subtotal,
    discount: discountAmount,
    total,
    validDays: 15
  });
});

app.listen(PORT, () => {
  console.log(`Proposal Agent running on port ${PORT}`);
});
