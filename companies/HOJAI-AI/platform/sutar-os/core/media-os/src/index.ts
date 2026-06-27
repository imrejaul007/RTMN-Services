/**
 * Media OS - Media Asset Management
 * Port: 4881
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4881;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

interface Media { id: string; name: string; type: 'image' | 'video' | 'audio' | 'document'; url: string; size: number; mimeType: string; tags: string[]; metadata: Record<string, string>; uploadedAt: string; transcoding?: { status: string; progress?: number; formats?: string[] }; }
interface CdnCache { url: string; invalidatedAt: string; }

const media = new Map<string, Media>();
const cdnCache: CdnCache[] = [];

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'media-os', uptime: Math.floor((Date.now() - START_TIME) / 1000), assets: media.size }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.get('/api', (req, res) => {
  let result = Array.from(media.values());
  if (req.query.type) result = result.filter(m => m.type === req.query.type);
  if (req.query.tag) result = result.filter(m => m.tags.includes(req.query.tag as string));
  res.json({ total: result.length, media: result });
});

app.get('/api/:id', (req, res) => {
  const m = media.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Media not found' });
  res.json(m);
});

app.post('/api/upload', (req, res) => {
  const { name, type, url, size, mimeType, tags, metadata } = req.body;
  if (!name || !type || !url) return res.status(400).json({ error: 'name, type, url required' });
  const id = uuidv4();
  const m: Media = { id, name, type, url, size: size || 0, mimeType: mimeType || 'application/octet-stream', tags: tags || [], metadata: metadata || {}, uploadedAt: new Date().toISOString() };
  media.set(id, m);
  res.status(201).json(m);
});

app.delete('/api/:id', (req, res) => {
  if (!media.has(req.params.id)) return res.status(404).json({ error: 'Media not found' });
  media.delete(req.params.id);
  res.json({ success: true });
});

app.post('/api/transcode/:id', (req, res) => {
  const m = media.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Media not found' });
  m.transcoding = { status: 'processing', progress: 0, formats: [] };
  res.json({ jobId: uuidv4(), status: 'processing' });
});

app.get('/api/transcode/:id', (req, res) => {
  const m = media.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Media not found' });
  res.json({ status: m.transcoding?.status || 'not_started' });
});

app.post('/api/cdn/purge', (req, res) => {
  const { urls } = req.body;
  if (!urls) return res.status(400).json({ error: 'urls required' });
  const purged = (urls as string[]).map(url => {
    cdnCache.push({ url, invalidatedAt: new Date().toISOString() });
    return url;
  });
  res.json({ success: true, purged: purged.length });
});

app.get('/api/cdn/status', (req, res) => {
  res.json({ cached: cdnCache.length, lastInvalidated: cdnCache[cdnCache.length - 1]?.invalidatedAt });
});

app.listen(PORT, () => console.log(`[media-os] listening on :${PORT}`));
export default app;