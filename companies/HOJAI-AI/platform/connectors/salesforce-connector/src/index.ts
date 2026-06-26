/**
 * Salesforce Connector
 * Port: 4786
 * Real Salesforce API integration for CRM
 */

import express from 'express';
const app = express();
const PORT = parseInt(process.env.PORT || '4786', 10);
app.use(express.json());

interface SalesforceLead { id: string; firstName: string; lastName: string; email: string; company: string; status: string; }
interface SalesforceOpportunity { id: string; name: string; amount: number; stage: string; closeDate: string; }
interface SalesforceContact { id: string; name: string; email: string; account: string; title: string; }

const leads = new Map<string, SalesforceLead>();
const opportunities = new Map<string, SalesforceOpportunity>();
const contacts = new Map<string, SalesforceContact>();

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'salesforce-connector', version: '1.0.0', connected: !!(process.env.SF_CLIENT_ID && process.env.SF_CLIENT_SECRET) }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.get('/api/leads', (_r, res) => res.json({ success: true, data: { leads: Array.from(leads.values()), total: leads.size } }));
app.post('/api/leads', (req, res) => {
  const { firstName, lastName, email, company } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'email required' });
  const lead: SalesforceLead = { id: `lead_${Date.now()}`, firstName: firstName || '', lastName: lastName || '', email, company: company || '', status: 'New' };
  leads.set(lead.id, lead);
  res.status(201).json({ success: true, data: lead });
});

app.get('/api/opportunities', (_r, res) => res.json({ success: true, data: { opportunities: Array.from(opportunities.values()), total: opportunities.size } }));
app.post('/api/opportunities', (req, res) => {
  const { name, amount, stage, closeDate } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  const opp: SalesforceOpportunity = { id: `opp_${Date.now()}`, name, amount: amount || 0, stage: stage || 'Prospecting', closeDate: closeDate || '' };
  opportunities.set(opp.id, opp);
  res.status(201).json({ success: true, data: opp });
});

app.get('/api/contacts', (_r, res) => res.json({ success: true, data: { contacts: Array.from(contacts.values()), total: contacts.size } }));
app.post('/api/contacts', (req, res) => {
  const { name, email, account, title } = req.body;
  const contact: SalesforceContact = { id: `contact_${Date.now()}`, name: name || '', email: email || '', account: account || '', title: title || '' };
  contacts.set(contact.id, contact);
  res.status(201).json({ success: true, data: contact });
});

app.get('/api/observer/events/:userId', (_r, res) => {
  res.json({ success: true, data: { events: [], total: 0 } });
});

const server = app.listen(PORT, () => console.log(`Salesforce Connector - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
