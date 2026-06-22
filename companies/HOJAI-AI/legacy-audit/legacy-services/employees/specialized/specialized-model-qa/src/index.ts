/**
 * Model QA Agent
 * Port: 5196
 *
 * Role: Model QA
 */

import express, { Request, Response } from 'express';
import { persona } from './persona';
import { chatRouter } from './routes/chat';
import { AgentConfig, ChatRequest, ChatResponse, HealthResponse } from './types';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 5196;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// Agent configuration
export const config: AgentConfig = {
  name: persona.name,
  port: PORT,
  category: 'general'
};

// Session store (in production, use Redis or similar)
const sessions = new Map<string, { messages: any[], createdAt: Date }>();

// Chat endpoint
app.use('/api/chat', chatRouter);

// Get agent info
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    name: persona.name,
    title: persona.title,
    emoji: persona.emoji,
    persona: persona.identity,
    capabilities: [
      'chat',
      'analysis',
      'recommendations'
    ]
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'healthy',
    service: persona.name,
    port: PORT,
    uptime: process.uptime()
  };
  res.json(response);
});

// Metrics endpoint
app.get('/api/metrics', (req: Request, res: Response) => {
  res.json({
    sessions: sessions.size,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.listen(PORT, () => {
  console.log(`🤖 ${persona.title} running on port ${PORT}`);
  console.log(`Role: Model QA`);
});

export default app;
