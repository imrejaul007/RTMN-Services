/**
 * Fintech Services
 * Port: 4750
 * Banking, Payments, Trading, Loans, Insurance
 */
import express from 'express';
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
app.use(express.json());
const PORT = process.env.PORT || 4750;

const accounts = new Map();
const transactions = new Map();
const cards = new Map();

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'fintech-services' }));

// Account
app.post('/api/accounts', requireInternal, (req, res) => {
  const { userId, type, balance } = req.body;
  const account = { id: uuidv4(), userId, type: type || 'savings', balance: balance || 0, status: 'active' };
  accounts.set(account.id, account);
  res.status(201).json({ success: true, account });
});

app.get('/api/accounts/:id', (req, res) => {
  const account = accounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json({ success: true, account });
});

// Transactions
app.post('/api/transactions', requireInternal, (req, res) => {
  const { fromAccount, toAccount, amount, type, description } = req.body;
  const from = accounts.get(fromAccount);
  if (!from) return res.status(404).json({ error: 'From account not found' });
  if (from.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

  from.balance -= amount;
  accounts.set(from.id, from);

  const to = accounts.get(toAccount);
  if (to) { to.balance += amount; accounts.set(to.id, to); }

  const tx = { id: uuidv4(), fromAccount, toAccount, amount, type, description, status: 'completed' };
  transactions.set(tx.id, tx);
  res.status(201).json({ success: true, transaction: tx });
});

// Cards
app.post('/api/cards', requireInternal, (req, res) => {
  const { accountId, type } = req.body;
  const card = { id: uuidv4(), accountId, type, last4: Math.floor(1000 + Math.random() * 9000), status: 'active' };
  cards.set(card.id, card);
  res.status(201).json({ success: true, card });
});

// UPI
app.post('/api/upi/transfer', requireInternal, (req, res) => {
  const { fromVpa, toVpa, amount } = req.body;
  res.json({ success: true, utr: `UPI${Date.now()}`, status: 'success' });
});

// Loans
app.post('/api/loans/apply', requireInternal, (req, res) => {
  const { userId, amount, tenure, type } = req.body;
  const emi = Math.round(amount / tenure);
  res.status(201).json({ success: true, loanId: uuidv4(), emi, status: 'pending' });
});

// Trading
app.get('/api/market/quotes', (req, res) => {
  res.json({ success: true, quotes: [
    { symbol: 'RELIANCE', price: 2850, change: 2.5 },
    { symbol: 'TCS', price: 3850, change: -0.8 },
    { symbol: 'INFOSYS', price: 1450, change: 1.2 }
  ]});
});

app.post('/api/trading/order', requireInternal, (req, res) => {
  const { symbol, quantity, type, price } = req.body;
  res.status(201).json({ success: true, orderId: uuidv4(), status: 'executed', symbol, quantity, price });
});

app.listen(PORT, () => console.log(`\n💰 Fintech Services — PORT ${PORT}\n`));
export default app;
