/**
 * Template Compiler CLI + API
 * Port: 4500
 */
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { compileTemplate } from './compiler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4500;
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

app.use(cors(), express.json());

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'template-compiler', version: '1.0.0' }));

app.get('/api/v1', (_, res) => res.json({
  service: 'Template Compiler',
  version: '1.0.0',
  templates: ['marketplace', 'b2b', 'company', 'hotel', 'restaurant', 'logistics', 'mobility', 'healthcare', 'education', 'finance', 'crm', 'erp', 'pos'],
  endpoints: {
    'POST /api/v1/compile': 'Compile a template',
    'GET /api/v1/templates': 'List templates',
    'GET /api/v1/templates/:id': 'Get template details'
  }
}));

// Compile a template
app.post('/api/v1/compile', requireInternal, (req, res) => {
  const { name, template, outputDir } = req.body;

  if (!name || !template) {
    return res.status(400).json({ error: 'name and template required' });
  }

  try {
    const result = compileTemplate({ name, template, outputDir });
    res.status(201).json({
      success: true,
      ...result,
      message: `Template ${name} compiled successfully!`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List templates
app.get('/api/v1/templates', (_, res) => {
  const templates = [
    { id: 'mobility', name: 'Mobility OS', agents: 13, flows: 5 },
    { id: 'healthcare', name: 'Healthcare OS', agents: 6, flows: 5 },
    { id: 'education', name: 'Education OS', agents: 6, flows: 5 },
    { id: 'finance', name: 'Fintech OS', agents: 7, flows: 5 },
    { id: 'marketplace', name: 'Marketplace', agents: 8, flows: 4 },
    { id: 'restaurant', name: 'Restaurant OS', agents: 6, flows: 4 },
    { id: 'hotel', name: 'Hotel OS', agents: 7, flows: 5 },
    { id: 'logistics', name: 'Logistics OS', agents: 8, flows: 4 },
    { id: 'b2b', name: 'B2B Platform', agents: 9, flows: 5 },
    { id: 'crm', name: 'CRM', agents: 6, flows: 3 },
    { id: 'erp', name: 'ERP', agents: 8, flows: 5 },
    { id: 'company', name: 'Company OS', agents: 10, flows: 5 },
    { id: 'pos', name: 'POS', agents: 4, flows: 3 }
  ];
  res.json({ success: true, count: templates.length, templates });
});

app.listen(PORT, () => console.log(`
╔══════════════════════════════════════════════════════╗
║  Template Compiler — PORT ${PORT}                     ║
║  Compile templates into running apps              ║
╠══════════════════════════════════════════════════════╣
║  POST /api/v1/compile  — Compile template       ║
║  GET  /api/v1/templates — List all templates   ║
╚══════════════════════════════════════════════════════╝
`));
export default app;
