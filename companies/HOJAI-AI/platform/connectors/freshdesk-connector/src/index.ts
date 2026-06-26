/**
 * Freshdesk Connector
 * Port: 4802
 * Freshdesk customer support integration
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4802', 10);
app.use(express.json());

interface Ticket { id: string; subject: string; description: string; status: number; priority: number; type?: string; tags: string[]; requester_id: string; assignee_id?: string; created_at: string; updated_at: string; }
interface Contact { id: string; name: string; email: string; phone?: string; company_id?: string; }
interface Company { id: string; name: string; domain?: string; }

const tickets = new Map<string, Ticket>();
const contacts = new Map<string, Contact>();
const companies = new Map<string, Company>();

app.use((req, _res, next) => { (req as any).requestId = uuidv4(); next(); });

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'freshdesk-connector', connected: !!process.env.FRESHDESK_API_KEY }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.get('/api/tickets', (req, res) => {
  const { status, priority } = req.query;
  let all = Array.from(tickets.values());
  if (status) all = all.filter(t => t.status === Number(status));
  if (priority) all = all.filter(t => t.priority === Number(priority));
  res.json({ success: true, data: { tickets: all, total: all.length } });
});

app.post('/api/tickets', (req, res) => {
  const { subject, description, priority = 1, type, requester_id } = req.body;
  if (!subject) return res.status(400).json({ success: false, error: 'subject required' });
  const ticket: Ticket = {
    id: `ticket_${Date.now()}`,
    subject,
    description: description || '',
    status: 2,
    priority,
    type,
    tags: [],
    requester_id: requester_id || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  tickets.set(ticket.id, ticket);
  res.status(201).json({ success: true, data: ticket });
});

app.get('/api/contacts', (_r, res) => res.json({ success: true, data: { contacts: Array.from(contacts.values()), total: contacts.size } }));
app.post('/api/contacts', (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email) return res.status(400).json({ success: false, error: 'name and email required' });
  const contact: Contact = { id: `contact_${Date.now()}`, name, email, phone };
  contacts.set(contact.id, contact);
  res.status(201).json({ success: true, data: contact });
});

app.get('/api/companies', (_r, res) => res.json({ success: true, data: { companies: Array.from(companies.values()), total: companies.size } }));
app.post('/api/companies', (req, res) => {
  const { name, domain } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  const company: Company = { id: `company_${Date.now()}`, name, domain };
  companies.set(company.id, company);
  res.status(201).json({ success: true, data: company });
});

app.get('/api/observer/events/:userId', (req, res) => {
  const events = Array.from(tickets.values())
    .filter(t => t.requester_id === req.params.userId || t.assignee_id === req.params.userId)
    .map(t => ({ source: 'freshdesk', type: 'ticket_updated', employeeId: req.params.userId, timestamp: t.updated_at, data: { id: t.id, subject: t.subject, status: t.status } }));
  res.json({ success: true, data: { events, total: events.length } });
});

const server = app.listen(PORT, () => console.log(`Freshdesk Connector - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
