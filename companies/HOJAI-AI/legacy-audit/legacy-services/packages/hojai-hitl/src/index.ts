import express from 'express';
import mongoose from 'mongoose';
import { hitlService } from './services/hitlService.js';
import { ReviewType } from './types/index.js';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4517;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-hitl';

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'hojai-hitl' }));

// Check if review needed
app.post('/api/hitl/check', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const result = await hitlService.shouldReview({ tenantId, ...req.body });
  res.json({ success: true, data: result });
});

// Create review
app.post('/api/reviews', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const review = await hitlService.createReview({ tenantId, ...req.body });
  res.status(201).json({ success: true, data: review });
});

// Get pending reviews
app.get('/api/reviews/pending', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const reviews = await hitlService.getPendingReviews(tenantId, {
    assignedTo: req.query.assignedTo as string,
    priority: req.query.priority as any
  });
  res.json({ success: true, data: reviews });
});

// Decide on review
app.post('/api/reviews/:id/decide', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const review = await hitlService.decide({ reviewId: req.params.id, tenantId, ...req.body });
  res.json({ success: true, data: review });
});

// Check escalation
app.post('/api/escalation/check', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const result = await hitlService.checkEscalation({ tenantId, ...req.body });
  res.json({ success: true, data: result });
});

// Stats
app.get('/api/stats', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const stats = await hitlService.getStats(tenantId);
  res.json({ success: true, data: stats });
});

async function start() {
  await mongoose.connect(MONGODB_URI);
  app.listen(PORT, () => console.log(`[Hojai HITL] Running on port ${PORT}`));
}

start().catch(console.error);
export default app;
