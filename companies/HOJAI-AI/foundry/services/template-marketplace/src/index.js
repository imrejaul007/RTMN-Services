/**
 * Template Marketplace - Community template exchange
 * Port 4620
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4620;
app.use(express.json());

const templates = new Map();

app.get('/api/templates', (req, res) => {
  const { category, search } = req.query;
  let list = Array.from(templates.values());
  if (category) list = list.filter(t => t.category === category);
  if (search) list = list.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  res.json({ templates: list, count: list.length });
});

app.post('/api/templates', (req, res) => {
  const { name, description, category, files, author } = req.body;
  const template = { id: uuidv4(), name, description, category, files, author, downloads: 0, rating: 0, createdAt: new Date().toISOString() };
  templates.set(template.id, template);
  res.json(template);
});

app.get('/api/templates/:id', (req, res) => {
  const template = templates.get(req.params.id);
  template ? res.json(template) : res.status(404).json({ error: 'Not found' });
});

app.post('/api/templates/:id/download', (req, res) => {
  const template = templates.get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Not found' });
  template.downloads++;
  res.json({ downloadUrl: `/api/templates/${template.id}/files`, downloads: template.downloads });
});

app.listen(PORT, () => console.log(`Template Marketplace running on port ${PORT}`));
export default app;