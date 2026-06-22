/**
 * HOJAI Agent Streaming
 * Real-time token streaming
 * Port: 4601
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4601;

app.use(express.json({ limit: "10kb" }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ============================================
// TYPES
// ============================================

interface StreamSession {
  id: string;
  agentId: string;
  input: Record<string, unknown>;
  tokens: StreamToken[];
  status: 'running' | 'completed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  totalTokens: number;
  totalLatency: number;
}

interface StreamToken {
  id: string;
  content: string;
  type: 'text' | 'tool_call' | 'tool_result' | 'error' | 'thought';
  timestamp: number;
}

interface Agent {
  id: string;
  name: string;
  prompt: string;
  tools: Tool[];
  streaming: boolean;
  model: string;
}

interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

// ============================================
// ENDPOINTS
// ============================================

app.get('/health', (_, res) => res.json({
  service: 'hojai-agent-streaming',
  status: 'healthy',
  port: PORT,
  tagline: 'Real-time token streaming'
}));

// Start streaming session
app.post('/api/stream/start', (req, res) => {
  const { agentId, input } = req.body;

  const session: StreamSession = {
    id: uuidv4().slice(0, 8),
    agentId,
    input,
    tokens: [],
    status: 'running',
    startedAt: new Date(),
    totalTokens: 0,
    totalLatency: 0
  };

  // Start streaming in background
  streamTokens(session);

  res.status(201).json({
    success: true,
    data: {
      sessionId: session.id,
      status: 'running'
    }
  });
});

// Simulate token streaming
async function streamTokens(session: StreamSession) {
  const responses = [
    { type: 'thought', content: 'Analyzing customer query...' },
    { type: 'text', content: 'Hello! I can help you with your order.' },
    { type: 'thought', content: 'Looking up order status...' },
    { type: 'tool_call', content: 'Calling tool: getOrderStatus' },
    { type: 'tool_result', content: 'Order #12345 is being prepared.' },
    { type: 'text', content: ' Your order is being prepared and will be ready in 30 minutes.' },
    { type: 'text', content: ' Is there anything else I can help you with?' }
  ];

  for (let i = 0; i < responses.length && session.status === 'running'; i++) {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    const token: StreamToken = {
      id: uuidv4().slice(0, 8),
      content: responses[i].content,
      type: responses[i].type as StreamToken['type'],
      timestamp: Date.now()
    };

    session.tokens.push(token);
    session.totalTokens++;
  }

  session.status = 'completed';
  session.completedAt = new Date();
  session.totalLatency = Date.now() - session.startedAt.getTime();
}

// Get streaming session
app.get('/api/stream/:sessionId', (req, res) => {
  // In production, this would be SSE or WebSocket
  res.json({
    success: true,
    data: {
      sessionId: req.params.sessionId,
      status: 'completed',
      tokens: [],
      message: 'Use SSE endpoint for real-time streaming'
    }
  });
});

// SSE endpoint for real-time streaming
app.get('/api/stream/:sessionId/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sessionId = req.params.sessionId;

  // Send initial event
  res.write(`event: connected\ndata: ${JSON.stringify({ sessionId })}\n\n`);

  // Simulate streaming events
  const messages = [
    'Thinking...',
    'Looking up information...',
    'Found your order.',
    'Your order is confirmed.',
    'Expected delivery: 30 minutes.'
  ];

  let index = 0;
  const interval = setInterval(() => {
    if (index < messages.length) {
      res.write(`event: token\ndata: ${JSON.stringify({ content: messages[index], type: 'text' })}\n\n`);
      index++;
    } else {
      res.write(`event: done\ndata: ${JSON.stringify({ sessionId, complete: true })}\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 300);
});

// Cancel streaming
app.post('/api/stream/:sessionId/cancel', (req, res) => {
  res.json({ success: true, message: 'Stream cancelled' });
});

// Get session tokens
app.get('/api/stream/:sessionId/tokens', (req, res) => {
  res.json({
    success: true,
    data: {
      sessionId: req.params.sessionId,
      tokens: [],
      complete: true
    }
  });
});

// Agent configuration
app.post('/api/agents', (req, res) => {
  const { name, prompt, tools, model } = req.body;

  const agent: Agent = {
    id: uuidv4().slice(0, 8),
    name,
    prompt,
    tools: tools || [],
    streaming: true,
    model: model || 'gpt-4'
  };

  res.status(201).json({ success: true, data: agent });
});

app.get('/api/agents', (_, res) => {
  res.json({ success: true, data: [] });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   HOJAI AGENT STREAMING                      ║
║   Real-time token streaming                 ║
║   Port: ${PORT}                               ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;
