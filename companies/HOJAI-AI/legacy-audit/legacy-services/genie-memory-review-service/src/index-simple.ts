/**
 * GENIE Memory Review Service - Simplified
 * Port: 4710
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4710', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

interface MemoryReview {
  id: string;
  userId: string;
  memoryId: string;
  scheduledDate: Date;
  status: 'pending' | 'completed' | 'skipped';
  notes?: string;
}

interface MemoryPattern {
  id: string;
  userId: string;
  type: string;
  pattern: string;
  confidence: number;
}

const reviews = new Map<string, MemoryReview[]>();
const patterns = new Map<string, MemoryPattern[]>();

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'genie-memory-review', version: '1.0.0', uptime: process.uptime() });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

app.get('/metrics', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send('service_up 1\n');
});

// Schedule review
app.post('/api/reviews', (req: Request, res: Response) => {
  const { userId, memoryId, scheduledDate } = req.body;

  const review: MemoryReview = {
    id: uuidv4(),
    userId,
    memoryId,
    scheduledDate: new Date(scheduledDate),
    status: 'pending',
  };

  const userReviews = reviews.get(userId) || [];
  userReviews.push(review);
  reviews.set(userId, userReviews);

  res.status(201).json({ success: true, review });
});

// Get pending reviews
app.get('/api/reviews/:userId/pending', (req: Request, res: Response) => {
  const userReviews = (reviews.get(req.params.userId) || [])
    .filter(r => r.status === 'pending');
  res.json({ count: userReviews.length, reviews: userReviews });
});

// Complete review
app.post('/api/reviews/:id/complete', (req: Request, res: Response) => {
  const { notes } = req.body;

  for (const [userId, userReviews] of reviews.entries()) {
    const review = userReviews.find(r => r.id === req.params.id);
    if (review) {
      review.status = 'completed';
      review.notes = notes;
      res.json({ success: true, review });
      return;
    }
  }
  res.status(404).json({ error: 'Review not found' });
});

// Get patterns
app.get('/api/patterns/:userId', (req: Request, res: Response) => {
  const userPatterns = patterns.get(req.params.userId) || [];
  res.json({ count: userPatterns.length, patterns: userPatterns });
});

// Add pattern
app.post('/api/patterns', (req: Request, res: Response) => {
  const { userId, type, pattern, confidence } = req.body;

  const p: MemoryPattern = {
    id: uuidv4(),
    userId,
    type,
    pattern,
    confidence: confidence || 0.5,
  };

  const userPatterns = patterns.get(userId) || [];
  userPatterns.push(p);
  patterns.set(userId, userPatterns);

  res.status(201).json({ success: true, pattern: p });
});

app.listen(PORT, () => {
  console.log(`\n🧠 GENIE Memory Review Service (${PORT})\n`);
});

export default app;