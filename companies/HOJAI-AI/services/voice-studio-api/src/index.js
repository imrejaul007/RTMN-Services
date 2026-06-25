/**
 * HOJAI Voice Studio API
 * Port: 4430
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {
  createAgent, getAgent, updateAgent, deleteAgent, listAgents,
  createConversation, getConversation, addTranscriptEntry, endConversation,
  listConversations, getStats,
  AgentStatus, STTProviders, TTSProviders, VoiceStyles
} from './store.js';

const PORT = process.env.PORT || 4430;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// ── Health ─────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'voice-studio-api', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', service: 'voice-studio-api', timestamp: new Date().toISOString() });
});

// ── API ─────────────────────────────────────────────────────────────────────

app.get('/api/v1', (req, res) => {
  res.json({
    service: 'HOJAI Voice Studio API',
    version: '1.0.0',
    description: 'Voice agent management and conversation handling',
    endpoints: {
      agents: {
        'GET /api/v1/agents': 'List agents',
        'GET /api/v1/agents/:id': 'Get agent',
        'POST /api/v1/agents': 'Create agent',
        'PATCH /api/v1/agents/:id': 'Update agent',
        'DELETE /api/v1/agents/:id': 'Delete agent',
        'POST /api/v1/agents/:id/activate': 'Activate agent',
        'POST /api/v1/agents/:id/pause': 'Pause agent'
      },
      conversations: {
        'POST /api/v1/conversations': 'Start conversation',
        'GET /api/v1/conversations/:id': 'Get conversation',
        'POST /api/v1/conversations/:id/transcript': 'Add transcript entry',
        'POST /api/v1/conversations/:id/end': 'End conversation'
      },
      stats: {
        'GET /api/v1/stats': 'Get statistics'
      }
    },
    providers: {
      stt: Object.values(STTProviders),
      tts: Object.values(TTSProviders),
      styles: Object.values(VoiceStyles)
    }
  });
});

// ── Agents ────────────────────────────────────────────────────────────────

app.get('/api/v1/agents', (req, res) => {
  try {
    const { status, search } = req.query;
    const agents = listAgents({ status, search });
    res.json({ success: true, count: agents.length, agents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/agents/:id', (req, res) => {
  try {
    const agent = getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ success: true, agent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/agents', (req, res) => {
  try {
    const agent = createAgent(req.body);
    res.status(201).json({ success: true, agent });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/v1/agents/:id', (req, res) => {
  try {
    const agent = updateAgent(req.params.id, req.body);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ success: true, agent });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/v1/agents/:id', (req, res) => {
  try {
    const deleted = deleteAgent(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ success: true, message: 'Agent deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/agents/:id/activate', (req, res) => {
  try {
    const agent = updateAgent(req.params.id, { status: AgentStatus.ACTIVE });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ success: true, agent });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/v1/agents/:id/pause', (req, res) => {
  try {
    const agent = updateAgent(req.params.id, { status: AgentStatus.PAUSED });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ success: true, agent });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── Conversations ───────────────────────────────────────────────────────

app.post('/api/v1/conversations', (req, res) => {
  try {
    const { agentId, phone, metadata } = req.body;
    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }
    const conversation = createConversation({ agentId, phone, metadata });
    res.status(201).json({ success: true, conversation });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/v1/conversations', (req, res) => {
  try {
    const { agentId, status, limit } = req.query;
    const conversations = listConversations({
      agentId,
      status,
      limit: limit ? parseInt(limit) : 50
    });
    res.json({ success: true, count: conversations.length, conversations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/conversations/:id', (req, res) => {
  try {
    const conversation = getConversation(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/conversations/:id/transcript', (req, res) => {
  try {
    const { speaker, text, type } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }
    const conversation = addTranscriptEntry(req.params.id, { speaker, text, type: type || 'speech' });
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/v1/conversations/:id/end', (req, res) => {
  try {
    const { status, duration } = req.body;
    const conversation = endConversation(req.params.id, { status, duration });
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── Stats ─────────────────────────────────────────────────────────────────

app.get('/api/v1/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Root ───────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    name: 'HOJAI Voice Studio',
    tagline: 'Build voice agents in minutes',
    description: 'Create AI voice agents for receptionist, sales, concierge, and more',
    version: '1.0.0',
    port: PORT,
    providers: {
      stt: Object.values(STTProviders),
      tts: Object.values(TTSProviders)
    }
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start
app.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     🎙️  HOJAI VOICE STUDIO — PORT ${PORT}                            ║
║                                                                  ║
║     Build voice agents in minutes                                ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║     Endpoints:                                                 ║
║       GET  /              — Service info                       ║
║       GET  /health        — Health check                       ║
║       GET  /api/v1        — API documentation                  ║
║                                                                  ║
║       GET  /api/v1/agents       — List agents                ║
║       POST /api/v1/agents       — Create agent                ║
║       GET  /api/v1/agents/:id  — Get agent                   ║
║       PATCH /api/v1/agents/:id — Update agent                ║
║       POST /api/v1/agents/:id/activate — Activate            ║
║       POST /api/v1/agents/:id/pause — Pause                  ║
║                                                                  ║
║       POST /api/v1/conversations — Start conversation          ║
║       GET  /api/v1/stats      — Statistics                    ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
