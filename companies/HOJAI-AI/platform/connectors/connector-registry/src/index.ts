/**
 * Freshworks Connector
 * Port: 4801
 * Freshworks CRM (Freshsales) integration
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4801', 10);
app.use(express.json());

interface FreshLead { id: string; first_name: string; last_name: string; email: string; phone?: string; company_id?: string; lead_status: string; }
interface FreshContact { id: string; first_name: string; last_name: string; email: string; phone?: string; mobile_number?: string; }
interface FreshAccount { id: string; name: string; website?: string; industry?: string; phone?: string; }
interface FreshDeal { id: string; name: string; amount: number; stage: string; probability: number; closing_date?: string; owner_id?: string; }

const leads = new Map<string, FreshLead>();
const contacts = new Map<string, FreshContact>();
const accounts = new Map<string, FreshAccount>();
const deals = new Map<string, FreshDeal>();

app.use((req, _res, next) => { (req as any).requestId = uuidv4(); next(); });

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'freshworks-connector', connected: !!process.env.FRESHSALES_API_KEY }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.get('/api/leads', (_r, res) => res.json({ success: true, data: { leads: Array.from(leads.values()), total: leads.size } }));
app.post('/api/leads', (req, res) => {
  const { email, first_name, last_name, lead_status } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'email required' });
  const lead: FreshLead = { id: `lead_${Date.now()}`, email, first_name: first_name || '', last_name: last_name || '', lead_status: lead_status || 'New' };
  leads.set(lead.id, lead);
  res.status(201).json({ success: true, data: lead });
});

app.get('/api/contacts', (_r, res) => res.json({ success: true, data: { contacts: Array.from(contacts.values()), total: contacts.size } }));
app.post('/api/contacts', (req, res) => {
  const { email, first_name, last_name } = req.body;
  const contact: FreshContact = { id: `contact_${Date.now()}`, email: email || '', first_name: first_name || '', last_name: last_name || '' };
  contacts.set(contact.id, contact);
  res.status(201).json({ success: true, data: contact });
});

app.get('/api/accounts', (_r, res) => res.json({ success: true, data: { accounts: Array.from(accounts.values()), total: accounts.size } }));
app.post('/api/accounts', (req, res) => {
  const { name, website, industry } = req.body;
  const account: FreshAccount = { id: `acc_${Date.now()}`, name: name || '', website, industry };
  accounts.set(account.id, account);
  res.status(201).json({ success: true, data: account });
});

app.get('/api/deals', (_r, res) => res.json({ success: true, data: { deals: Array.from(deals.values()), total: deals.size } }));
app.post('/api/deals', (req, res) => {
  const { name, amount, stage } = req.body;
  const deal: FreshDeal = { id: `deal_${Date.now()}`, name: name || '', amount: amount || 0, stage: stage || 'Open', probability: 50 };
  deals.set(deal.id, deal);
  res.status(201).json({ success: true, data: deal });
});

app.get('/api/observer/events/:userId', (_r, res) => res.json({ success: true, data: { events: [], total: 0 } }));

const server = app.listen(PORT, () => console.log(`Freshworks Connector - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
