/**
 * BuzzLocal Community Service
 * Community posts, discussions, neighbors
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4260;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'buzzlocal-community-service' });
});

// Get community posts
app.get('/api/posts', (_req, res) => {
  res.json({
    success: true,
    data: { posts: [], total: 0 }
  });
});

// Create post
app.post('/api/posts', (req, res) => {
  const { userId, content, type } = req.body;
  res.json({
    success: true,
    data: { id: `post-${Date.now()}`, userId, content, type }
  });
});

app.listen(PORT, () => {
  console.log(`👥 BuzzLocal Community Service - Port ${PORT}`);
});

export default app;
