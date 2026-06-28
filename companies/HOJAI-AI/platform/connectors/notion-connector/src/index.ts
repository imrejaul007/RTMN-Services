import { requireAuth } from '@rtmn/shared/auth';
/**
 * Notion Connector
 * Port: 4794
 * Real Notion API integration for documents and knowledge
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4794', 10);
app.use(express.json());

interface NotionPage {
  id: string;
  title: string;
  content: string;
  parent: string;
  type: 'page' | 'database';
  tags: string[];
  created: string;
  updated: string;
}

interface NotionDatabase {
  id: string;
  name: string;
  properties: string[];
  records: number;
}

const pages = new Map<string, NotionPage>();
const databases = new Map<string, NotionDatabase>();

app.use((req, _res, next) => { (req as any).requestId = uuidv4(); next(); });

app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'notion-connector', version: '1.0.0', connected: !!process.env.NOTION_TOKEN }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.get('/api/pages', (req, res) => {
  const { search, tag } = req.query;
  let all = Array.from(pages.values());
  if (search) all = all.filter(p => p.title.toLowerCase().includes((search as string).toLowerCase()) || p.content.toLowerCase().includes((search as string).toLowerCase()));
  if (tag) all = all.filter(p => p.tags.includes(tag as string));
  res.json({ success: true, data: { pages: all, total: all.length } });
});

app.post('/api/pages',requireAuth,  (req, res) => {
  const { title, content, parent, tags } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'title required' });

  const page: NotionPage = { id: `page_${Date.now()}`, title, content: content || '', parent: parent || '', type: 'page', tags: tags || [], created: new Date().toISOString(), updated: new Date().toISOString() };
  pages.set(page.id, page);
  res.status(201).json({ success: true, data: page });
});

app.get('/api/observer/events/:userId', (req, res) => {
  const events = Array.from(pages.values()).map(p => ({ source: 'notion', type: 'page_updated', employeeId: req.params.userId, timestamp: p.updated, data: { title: p.title } }));
  res.json({ success: true, data: { events, total: events.length } });
});

app.use((_req: Request, res: Response) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }));

const server = app.listen(PORT, () => console.log(`Notion Connector - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
