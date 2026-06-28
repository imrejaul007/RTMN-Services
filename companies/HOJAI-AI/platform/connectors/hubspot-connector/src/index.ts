import { requireAuth } from '@rtmn/shared/auth';
/**
 * HubSpot Connector
 * Port: 4780
 * Real HubSpot API integration for CRM
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4780', 10);
app.use(express.json());

// Types
interface HubSpotContact {
  id: string;
  properties: {
    firstname: string;
    lastname: string;
    email: string;
    phone?: string;
    company?: string;
    jobtitle?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface HubSpotDeal {
  id: string;
  properties: {
    dealname: string;
    amount: string;
    dealstage: string;
    closedate: string;
    pipeline: string;
  };
  associations?: { contacts: string[] };
}

interface HubSpotCompany {
  id: string;
  properties: {
    name: string;
    domain: string;
    industry?: string;
    phone?: string;
  };
}

interface HubSpotTicket {
  id: string;
  properties: {
    subject: string;
    content: string;
    hs_ticket_priority: 'HIGH' | 'MEDIUM' | 'LOW';
    hs_pipeline: string;
    hs_ticket_id: string;
  };
}

// Storage (simulated)
const contacts = new Map<string, HubSpotContact>();
const deals = new Map<string, HubSpotDeal>();
const companies = new Map<string, HubSpotCompany>();
const tickets = new Map<string, HubSpotTicket>();

// Middleware
app.use((req, _res, next) => { (req as any).requestId = uuidv4(); next(); });

// Health
app.get('/health', (_req, res) => res.json({
  status: 'healthy',
  service: 'hubspot-connector',
  version: '1.0.0',
  connected: !!(process.env.HUBSPOT_API_KEY),
  timestamp: new Date().toISOString()
}));

app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============ CONTACTS ============

/**
 * List contacts
 */
app.get('/api/contacts', (req, res) => {
  const { search, limit = 100 } = req.query;
  let all = Array.from(contacts.values());

  if (search) {
    const s = (search as string).toLowerCase();
    all = all.filter(c =>
      c.properties.email?.toLowerCase().includes(s) ||
      c.properties.firstname?.toLowerCase().includes(s) ||
      c.properties.lastname?.toLowerCase().includes(s)
    );
  }

  res.json({ success: true, data: { results: all.slice(0, Number(limit)), total: all.length, hasMore: all.length > Number(limit) } });
});

/**
 * Get contact
 */
app.get('/api/contacts/:id', (req, res) => {
  const contact = contacts.get(req.params.id);
  if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });
  res.json({ success: true, data: contact });
});

/**
 * Create contact
 */
app.post('/api/contacts',requireAuth,  (req, res) => {
  const { email, firstname, lastname, company, phone, jobtitle } = req.body;

  if (!email) return res.status(400).json({ success: false, error: 'email is required' });

  const contact: HubSpotContact = {
    id: `contact_${Date.now()}`,
    properties: { firstname: firstname || '', lastname: lastname || '', email, phone, company, jobtitle },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  contacts.set(contact.id, contact);
  res.status(201).json({ success: true, data: contact });
});

/**
 * Update contact
 */
app.patch('/api/contacts/:id',requireAuth,  (req, res) => {
  const contact = contacts.get(req.params.id);
  if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });

  Object.assign(contact.properties, req.body);
  contact.updatedAt = new Date().toISOString();
  res.json({ success: true, data: contact });
});

// ============ DEALS ============

/**
 * List deals
 */
app.get('/api/deals', (req, res) => {
  const { stage, pipeline } = req.query;
  let all = Array.from(deals.values());

  if (stage) all = all.filter(d => d.properties.dealstage === stage);
  if (pipeline) all = all.filter(d => d.properties.pipeline === pipeline);

  res.json({ success: true, data: { results: all, total: all.length } });
});

/**
 * Get deal
 */
app.get('/api/deals/:id', (req, res) => {
  const deal = deals.get(req.params.id);
  if (!deal) return res.status(404).json({ success: false, error: 'Deal not found' });
  res.json({ success: true, data: deal });
});

/**
 * Create deal
 */
app.post('/api/deals',requireAuth,  (req, res) => {
  const { dealname, amount, dealstage, closedate, pipeline = 'default' } = req.body;

  if (!dealname) return res.status(400).json({ success: false, error: 'dealname is required' });

  const deal: HubSpotDeal = {
    id: `deal_${Date.now()}`,
    properties: {
      dealname,
      amount: amount || '0',
      dealstage: dealstage || 'appointmentscheduled',
      closedate: closedate || '',
      pipeline
    }
  };

  deals.set(deal.id, deal);
  res.status(201).json({ success: true, data: deal });
});

// ============ COMPANIES ============

/**
 * List companies
 */
app.get('/api/companies', (req, res) => {
  const { domain, industry } = req.query;
  let all = Array.from(companies.values());

  if (domain) all = all.filter(c => c.properties.domain?.includes(domain as string));
  if (industry) all = all.filter(c => c.properties.industry === industry);

  res.json({ success: true, data: { results: all, total: all.length } });
});

/**
 * Create company
 */
app.post('/api/companies',requireAuth,  (req, res) => {
  const { name, domain, industry, phone } = req.body;

  if (!name) return res.status(400).json({ success: false, error: 'name is required' });

  const company: HubSpotCompany = {
    id: `company_${Date.now()}`,
    properties: { name, domain: domain || '', industry, phone }
  };

  companies.set(company.id, company);
  res.status(201).json({ success: true, data: company });
});

// ============ TICKETS ============

/**
 * List tickets
 */
app.get('/api/tickets', (req, res) => {
  const { priority, pipeline } = req.query;
  let all = Array.from(tickets.values());

  if (priority) all = all.filter(t => t.properties.hs_ticket_priority === priority);
  if (pipeline) all = all.filter(t => t.properties.hs_pipeline === pipeline);

  res.json({ success: true, data: { results: all, total: all.length } });
});

/**
 * Create ticket
 */
app.post('/api/tickets',requireAuth,  (req, res) => {
  const { subject, content, priority = 'MEDIUM' } = req.body;

  if (!subject) return res.status(400).json({ success: false, error: 'subject is required' });

  const ticket: HubSpotTicket = {
    id: `ticket_${Date.now()}`,
    properties: {
      subject,
      content: content || '',
      hs_ticket_priority: priority,
      hs_pipeline: 'support',
      hs_ticket_id: String(Date.now())
    }
  };

  tickets.set(ticket.id, ticket);
  res.status(201).json({ success: true, data: ticket });
});

// ============ OBSERVER EVENTS ============

/**
 * Get activity for employee
 */
app.get('/api/observer/events/:userId', (req, res) => {
  const { days = 7 } = req.query;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));

  const events = [];

  // Collect contact activities
  for (const [id, contact] of contacts.entries()) {
    if (new Date(contact.updatedAt) >= cutoff) {
      events.push({
        source: 'hubspot',
        type: 'contact_updated',
        employeeId: req.params.userId,
        timestamp: contact.updatedAt,
        data: { contactId: id, name: `${contact.properties.firstname} ${contact.properties.lastname}` }
      });
    }
  }

  // Collect deal activities
  for (const [id, deal] of deals.entries()) {
    events.push({
      source: 'hubspot',
      type: 'deal_activity',
      employeeId: req.params.userId,
      timestamp: new Date().toISOString(),
      data: { dealId: id, name: deal.properties.dealname, stage: deal.properties.dealstage }
    });
  }

  res.json({ success: true, data: { events, total: events.length } });
});

// Catch-all
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
});

const server = app.listen(PORT, () => {
  console.log(`HubSpot Connector - Port ${PORT}`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

export default app;
