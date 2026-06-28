/**
 * Zoho Connector
 * Port: 4784
 * Zoho CRM integration
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4784', 10);
app.use(express.json());

interface ZohoLead { id: string; First_Name: string; Last_Name: string; Email: string; Company: string; Status: string; }
interface ZohoDeal { id: string; Deal_Name: string; Amount: string; Stage: string; Closing_Date: string; }
interface ZohoTask { id: string; Subject: string; Status: string; Due_Date: string; Priority: string; }

const leads = new Map<string, ZohoLead>();
const deals = new Map<string, ZohoDeal>();
const tasks = new Map<string, ZohoTask>();

app.use((req, _res, next) => { (req as any).requestId = uuidv4(); next(); });

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'zoho-connector', connected: !!process.env.ZOHO_CLIENT_ID }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.get('/api/leads', (_r, res) => res.json({ success: true, data: { leads: Array.from(leads.values()) } }));
app.post('/api/leads',requireAuth,  (req, res) => {
  const { First_Name, Last_Name, Email, Company } = req.body;
  if (!Email) return res.status(400).json({ success: false, error: 'Email required' });
  const lead: ZohoLead = { id: `lead_${Date.now()}`, First_Name: First_Name || '', Last_Name: Last_Name || '', Email, Company: Company || '', Status: 'Not Contacted' };
  leads.set(lead.id, lead);
  res.status(201).json({ success: true, data: lead });
});

app.get('/api/deals', (_r, res) => res.json({ success: true, data: { deals: Array.from(deals.values()) } }));
app.post('/api/deals',requireAuth,  (req, res) => {
  const { Deal_Name, Amount, Stage } = req.body;
  if (!Deal_Name) return res.status(400).json({ success: false, error: 'Deal_Name required' });
  const deal: ZohoDeal = { id: `deal_${Date.now()}`, Deal_Name, Amount: Amount || '0', Stage: Stage || 'Planning', Closing_Date: '' };
  deals.set(deal.id, deal);
  res.status(201).json({ success: true, data: deal });
});

app.get('/api/tasks', (_r, res) => res.json({ success: true, data: { tasks: Array.from(tasks.values()) } }));

const server = app.listen(PORT, () => console.log(`Zoho Connector - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
