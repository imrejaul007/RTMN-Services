/**
 * B2B Services
 * Port: 4772
 * RFQ, Quotations, Contracts, Procurement
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4772;

const rfqs = new Map();
const quotes = new Map();
const contracts = new Map();
const suppliers = new Map();

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'b2b-services' }));

// RFQs
app.post('/api/rfqs', (req, res) => {
  const rfq = { id: uuidv4(), ...req.body, status: 'open', createdAt: new Date().toISOString() };
  rfqs.set(rfq.id, rfq);
  res.status(201).json({ success: true, rfq });
});
app.get('/api/rfqs', (req, res) => res.json({ success: true, rfqs: Array.from(rfqs.values()) }));
app.get('/api/rfqs/:id', (req, res) => {
  const rfq = rfqs.get(req.params.id);
  if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
  res.json({ success: true, rfq });
});

// Quotations
app.post('/api/quotes', (req, res) => {
  const quote = { id: uuidv4(), ...req.body, status: 'submitted', createdAt: new Date().toISOString() };
  quotes.set(quote.id, quote);
  res.status(201).json({ success: true, quote });
});
app.get('/api/quotes', (req, res) => res.json({ success: true, quotes: Array.from(quotes.values()) }));

// Contracts
app.post('/api/contracts', (req, res) => {
  const contract = { id: uuidv4(), ...req.body, status: 'active', createdAt: new Date().toISOString() };
  contracts.set(contract.id, contract);
  res.status(201).json({ success: true, contract });
});
app.get('/api/contracts', (req, res) => res.json({ success: true, contracts: Array.from(contracts.values()) }));

// Suppliers
app.post('/api/suppliers', (req, res) => {
  const supplier = { id: uuidv4(), ...req.body, status: 'approved', rating: 4.5 };
  suppliers.set(supplier.id, supplier);
  res.status(201).json({ success: true, supplier });
});
app.get('/api/suppliers', (req, res) => res.json({ success: true, suppliers: Array.from(suppliers.values()) }));

app.listen(PORT, () => console.log(`\n🤝 B2B Services — PORT ${PORT}\n`));
export default app;
