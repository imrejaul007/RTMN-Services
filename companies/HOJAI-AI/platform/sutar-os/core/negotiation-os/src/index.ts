/**
 * Negotiation OS - Templates and Playbooks
 * Port: 4869
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4869;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

interface Template { id: string; name: string; type: string; steps: { order: number; name: string; script: string; fallback: string }[]; createdAt: string; }
interface Negotiation { id: string; templateId: string; parties: { name: string; email: string; role: string }[]; status: string; currentStep: number; history: { step: number; action: string; timestamp: string }[]; }
const templates = new Map<string, Template>();
const negotiations = new Map<string, Negotiation>();

// Seed templates
templates.set('saas', { id: 'saas', name: 'SaaS Contract Negotiation', type: 'vendor', steps: [{ order: 1, name: 'Intro', script: 'Thank you for your interest. Let us discuss your requirements.', fallback: 'We can schedule a follow-up call.' }, { order: 2, name: 'Requirements', script: 'What are your specific needs?', fallback: 'We have standard packages available.' }, { order: 3, name: 'Pricing', script: 'Our pricing starts at $X. What is your budget?', fallback: 'We can discuss flexible options.' }, { order: 4, name: 'Terms', script: 'Let us finalize the contract terms.', fallback: 'Standard terms apply.' }], createdAt: new Date().toISOString() });
templates.set('partnership', { id: 'partnership', name: 'Partnership Agreement', type: 'partnership', steps: [{ order: 1, name: 'Proposal', script: 'We propose a strategic partnership.', fallback: 'We can explore other options.' }, { order: 2, name: 'Terms', script: 'Here are our proposed terms.', fallback: 'We are open to negotiation.' }], createdAt: new Date().toISOString() });

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'negotiation-os', uptime: Math.floor((Date.now() - START_TIME) / 1000), templates: templates.size }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.get('/api/templates', (req, res) => { const result = Array.from(templates.values()); if (req.query.type) return res.json({ templates: result.filter(t => t.type === req.query.type) }); res.json({ templates: result }); });
app.get('/api/templates/:id', (req, res) => { const t = templates.get(req.params.id); if (!t) return res.status(404).json({ error: 'Not found' }); res.json(t); });
app.post('/api/templates', (req, res) => { const { name, type, steps } = req.body; const id = uuidv4(); templates.set(id, { id, name, type, steps: steps || [], createdAt: new Date().toISOString() }); res.status(201).json(templates.get(id)); });
app.get('/api/negotiations', (req, res) => { const result = Array.from(negotiations.values()); if (req.query.status) return res.json({ negotiations: result.filter(n => n.status === req.query.status) }); res.json({ negotiations: result }); });
app.get('/api/negotiations/:id', (req, res) => { const n = negotiations.get(req.params.id); if (!n) return res.status(404).json({ error: 'Not found' }); res.json(n); });
app.post('/api/negotiate', (req, res) => { const { templateId, parties } = req.body; const t = templates.get(templateId); if (!t) return res.status(404).json({ error: 'Template not found' }); const id = uuidv4(); const neg: Negotiation = { id, templateId, parties: parties || [], status: 'active', currentStep: 1, history: [] }; negotiations.set(id, neg); res.status(201).json(neg); });
app.post('/api/negotiations/:id/advance', (req, res) => { const n = negotiations.get(req.params.id); if (!n) return res.status(404).json({ error: 'Not found' }); const { action } = req.body; n.currentStep++; n.history.push({ step: n.currentStep, action: action || 'advance', timestamp: new Date().toISOString() }); if (n.currentStep > 10) n.status = 'complete'; res.json(n); });
app.post('/api/negotiations/:id/complete', (req, res) => { const n = negotiations.get(req.params.id); if (!n) return res.status(404).json({ error: 'Not found' }); n.status = 'complete'; res.json(n); });
app.listen(PORT, () => console.log(`[negotiation-os] listening on :${PORT}`));
export default app;