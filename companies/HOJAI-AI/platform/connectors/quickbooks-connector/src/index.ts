/**
 * QuickBooks/Tally Connector
 * Port: 4783
 * Accounting software integration
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4783', 10);
app.use(express.json());

// Types
interface Invoice {
  id: string;
  customer: string;
  amount: number;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  line_items: { description: string; quantity: number; rate: number }[];
}

interface Expense {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  category: string;
  status: 'pending' | 'approved' | 'paid';
}

interface Account {
  id: string;
  name: string;
  type: 'bank' | 'credit_card' | 'expense' | 'income' | 'asset' | 'liability';
  balance: number;
}

const invoices = new Map<string, Invoice>();
const expenses = new Map<string, Expense>();
const accounts = new Map<string, Account>();

app.use((req, _res, next) => { (req as any).requestId = uuidv4(); next(); });

app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'quickbooks-connector', connected: !!process.env.QUICKBOOKS_CLIENT_ID }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

// Invoices
app.get('/api/invoices', (req, res) => {
  const { status, customer } = req.query;
  let all = Array.from(invoices.values());
  if (status) all = all.filter(i => i.status === status);
  if (customer) all = all.filter(i => i.customer.includes(customer as string));
  res.json({ success: true, data: { invoices: all, total: all.length } });
});

app.post('/api/invoices', (req, res) => {
  const { customer, amount, due_date, line_items } = req.body;
  if (!customer || !amount) return res.status(400).json({ success: false, error: 'customer and amount required' });
  const invoice: Invoice = { id: `inv_${Date.now()}`, customer, amount, due_date: due_date || '', status: 'draft', line_items: line_items || [] };
  invoices.set(invoice.id, invoice);
  res.status(201).json({ success: true, data: invoice });
});

// Expenses
app.get('/api/expenses', (req, res) => {
  const { status, vendor } = req.query;
  let all = Array.from(expenses.values());
  if (status) all = all.filter(e => e.status === status);
  if (vendor) all = all.filter(e => e.vendor.includes(vendor as string));
  res.json({ success: true, data: { expenses: all, total: all.length } });
});

app.post('/api/expenses', (req, res) => {
  const { vendor, amount, date, category } = req.body;
  if (!vendor || !amount) return res.status(400).json({ success: false, error: 'vendor and amount required' });
  const expense: Expense = { id: `exp_${Date.now()}`, vendor, amount, date: date || new Date().toISOString(), category: category || 'general', status: 'pending' };
  expenses.set(expense.id, expense);
  res.status(201).json({ success: true, data: expense });
});

// Accounts
app.get('/api/accounts', (_req, res) => res.json({ success: true, data: { accounts: Array.from(accounts.values()), total: accounts.size } }));

// Observer
app.get('/api/observer/events/:userId', (_req, res) => {
  res.json({ success: true, data: { events: [], total: 0 } });
});

const server = app.listen(PORT, () => console.log(`QuickBooks Connector - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
