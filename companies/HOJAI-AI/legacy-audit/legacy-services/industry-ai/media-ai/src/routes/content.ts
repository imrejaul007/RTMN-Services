import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
const content = new Map();

router.get('/', (req, res) => {
  const { type, status, creatorId } = req.query;
  let list = Array.from(content.values());
  if (type) list = list.filter(c => c.type === type);
  if (status) list = list.filter(c => c.status === status);
  if (creatorId) list = list.filter(c => c.creatorId === creatorId);
  res.json({ success: true, content: list });
});

router.get('/:id', (req, res) => {
  const item = content.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Content not found' });
  res.json({ success: true, content: item });
});

router.post('/', (req, res) => {
  const { title, type, creatorId, description, tags } = req.body;
  if (!title || !type) return res.status(400).json({ error: 'Missing required fields' });

  const item = {
    contentId: uuidv4(), title, type, creatorId, description, tags: tags || [],
    status: 'draft', views: 0, engagement: 0, recommendationScore: 0,
    createdAt: new Date().toISOString(), publishedAt: null
  };
  content.set(item.contentId, item);
  res.status(201).json({ success: true, content: item });
});

router.patch('/:id', (req, res) => {
  const item = content.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Content not found' });
  Object.assign(item, req.body);
  res.json({ success: true, content: item });
});

router.post('/:id/publish', (req, res) => {
  const item = content.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Content not found' });
  item.status = 'published';
  item.publishedAt = new Date().toISOString();
  res.json({ success: true, content: item });
});

router.post('/:id/recommend', (req, res) => {
  const item = content.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Content not found' });

  const score = Math.round(50 + Math.random() * 50);
  item.recommendationScore = score;
  res.json({ success: true, content: item, score });
});

export default router;
