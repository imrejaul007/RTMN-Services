import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const vectorStore = new Map();

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { id, vector, metadata } = req.body;
    if (!id || !vector) return res.status(400).json({ error: 'id and vector required' });
    const key = `vector:${req.orgId}:${req.clientId}:${req.userId}:${id}`;
    vectorStore.set(key, { vector, metadata: metadata || {} });
    res.status(201).json({ id, stored: true });
  } catch (error) { logger.error('Error storing vector:', error); res.status(500).json({ error: 'Failed to store vector' }); }
});

router.post('/search', async (req: AuthRequest, res: Response) => {
  try {
    const { queryVector, limit = 10, threshold = 0.7 } = req.body;
    if (!queryVector) return res.status(400).json({ error: 'queryVector required' });
    const results: { id: string; similarity: number; metadata: any }[] = [];
    const prefix = `vector:${req.orgId}:${req.clientId}:${req.userId}:`;
    for (const [key, data] of vectorStore.entries()) {
      if (!key.startsWith(prefix)) continue;
      const id = key.replace(prefix, '');
      const similarity = cosineSimilarity(queryVector, data.vector);
      if (similarity >= threshold) results.push({ id, similarity, metadata: data.metadata });
    }
    results.sort((a, b) => b.similarity - a.similarity);
    res.json({ results: results.slice(0, limit) });
  } catch (error) { logger.error('Error searching vectors:', error); res.status(500).json({ error: 'Failed to search vectors' }); }
});

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) { dotProduct += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i]; }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export default router;
