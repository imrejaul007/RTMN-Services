// phone-ai (4869) - AI-powered phone call management.
// Agents (voice personas) → Numbers → Calls → Routing → IVR → Transcripts → Recordings → Analytics
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const SERVICE = 'phone-ai';
const PORT = parseInt(process.env.PORT || '4869', 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const ok = (data) => ({ ok: true, ...data });
const fail = (msg, code = 400) => ({ ok: false, error: msg });

// Stores
const agents = new Map();      // agentId -> { id, name, persona, voice, language, status, created }
const numbers = new Map();     // numberId -> { id, e164, country, agent_id, status, capabilities[] }
const calls = new Map();       // callId -> { id, from, to, direction, status, agent_id, duration_s, recording_url, transcript_id, created }
const ivrs = new Map();        // ivrId -> { id, name, number_id, menu[] }
const transcripts = new Map(); // transcriptId -> { id, call_id, turns[], language, confidence }
const recordings = new Map();  // recordingId -> { id, call_id, url, duration_s, size_bytes, format }
const analytics = new Map();   // day -> { day, total_calls, total_minutes, avg_duration_s, by_agent{}, by_status{} }

// Seed
(function seed() {
  const seedAgents = [
    { name: 'support-receptionist', persona: 'friendly customer support rep', voice: 'alloy', language: 'en-US' },
    { name: 'sales-outbound', persona: 'energetic SDR making outbound calls', voice: 'echo', language: 'en-US' },
    { name: 'appointment-setter', persona: 'professional scheduler', voice: 'nova', language: 'en-GB' }
  ];
  seedAgents.forEach(a => {
    const id = uuid();
    agents.set(id, { id, ...a, status: 'active', created: new Date().toISOString() });
  });

  const seedNumbers = [
    { e164: '+14155551001', country: 'US', agent_id: [...agents.keys()][0], capabilities: ['inbound', 'outbound', 'sms'] },
    { e164: '+14155551002', country: 'US', agent_id: [...agents.keys()][1], capabilities: ['outbound'] },
    { e164: '+442075550100', country: 'GB', agent_id: [...agents.keys()][2], capabilities: ['inbound', 'sms'] }
  ];
  seedNumbers.forEach(n => {
    const id = uuid();
    numbers.set(id, { id, ...n, status: 'active' });
  });

  const seedIvr = {
    name: 'main-menu',
    number_id: [...numbers.keys()][0],
    menu: [
      { key: '1', label: 'Sales', action: 'transfer', target: 'sales-outbound' },
      { key: '2', label: 'Support', action: 'transfer', target: 'support-receptionist' },
      { key: '0', label: 'Operator', action: 'transfer', target: 'human' }
    ]
  };
  const ivrId = uuid();
  ivrs.set(ivrId, { id: ivrId, ...seedIvr });

  // Today analytics
  const today = new Date().toISOString().slice(0, 10);
  analytics.set(today, { day: today, total_calls: 0, total_minutes: 0, avg_duration_s: 0, by_agent: {}, by_status: {} });
})();

function updateAnalytics(call) {
  const day = (call.ended || call.created).slice(0, 10);
  if (!analytics.has(day)) {
    analytics.set(day, { day, total_calls: 0, total_minutes: 0, avg_duration_s: 0, by_agent: {}, by_status: {} });
  }
  const a = analytics.get(day);
  a.total_calls++;
  a.total_minutes += (call.duration_s || 0) / 60;
  a.avg_duration_s = (a.total_minutes * 60) / a.total_calls;
  a.by_agent[call.agent_id || 'unassigned'] = (a.by_agent[call.agent_id || 'unassigned'] || 0) + 1;
  a.by_status[call.status] = (a.by_status[call.status] || 0) + 1;
}

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE,
  port: PORT,
  endpoints: ['/api/agents', '/api/numbers', '/api/calls', '/api/ivrs', '/api/transcripts', '/api/recordings', '/api/analytics']
})));

// Agents
app.get('/api/agents', (_req, res) => res.json(ok({ agents: [...agents.values()] })));
app.post('/api/agents', (req, res) => {
  const { name, persona, voice = 'alloy', language = 'en-US' } = req.body || {};
  if (!name || !persona) return res.status(400).json(fail('name + persona required'));
  const id = uuid();
  const a = { id, name, persona, voice, language, status: 'active', created: new Date().toISOString() };
  agents.set(id, a);
  res.status(201).json(ok({ agent: a }));
});
app.get('/api/agents/:id', (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json(fail('agent not found'));
  res.json(ok({ agent: a }));
});
app.patch('/api/agents/:id', (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json(fail('agent not found'));
  const allowed = ['name', 'persona', 'voice', 'language', 'status'];
  allowed.forEach(k => { if (req.body[k] !== undefined) a[k] = req.body[k]; });
  agents.set(a.id, a);
  res.json(ok({ agent: a }));
});

// Numbers
app.get('/api/numbers', (_req, res) => res.json(ok({ numbers: [...numbers.values()] })));
app.post('/api/numbers', (req, res) => {
  const { e164, country = 'US', agent_id, capabilities = [] } = req.body || {};
  if (!e164) return res.status(400).json(fail('e164 required'));
  if (agent_id && !agents.has(agent_id)) return res.status(400).json(fail('agent_id invalid'));
  const id = uuid();
  const n = { id, e164, country, agent_id: agent_id || null, capabilities, status: 'active' };
  numbers.set(id, n);
  res.status(201).json(ok({ number: n }));
});

// Calls
app.get('/api/calls', (req, res) => {
  let list = [...calls.values()];
  if (req.query.status) list = list.filter(c => c.status === req.query.status);
  if (req.query.agent_id) list = list.filter(c => c.agent_id === req.query.agent_id);
  res.json(ok({ calls: list }));
});
app.post('/api/calls', (req, res) => {
  const { from, to, direction = 'inbound', agent_id } = req.body || {};
  if (!from || !to) return res.status(400).json(fail('from + to required'));
  const id = uuid();
  const c = { id, from, to, direction, agent_id: agent_id || null, status: 'ringing',
    duration_s: 0, recording_url: null, transcript_id: null, created: new Date().toISOString() };
  calls.set(id, c);
  res.status(201).json(ok({ call: c }));
});
app.get('/api/calls/:id', (req, res) => {
  const c = calls.get(req.params.id);
  if (!c) return res.status(404).json(fail('call not found'));
  res.json(ok({ call: c }));
});
app.patch('/api/calls/:id', (req, res) => {
  const c = calls.get(req.params.id);
  if (!c) return res.status(404).json(fail('call not found'));
  const allowed = ['status', 'duration_s', 'recording_url', 'transcript_id'];
  allowed.forEach(k => { if (req.body[k] !== undefined) c[k] = req.body[k]; });
  if (c.status === 'completed' && !c.ended) c.ended = new Date().toISOString();
  calls.set(c.id, c);
  updateAnalytics(c);
  res.json(ok({ call: c }));
});

// Routing: pick agent for inbound call based on number/IVR menu
app.post('/api/calls/:id/route', (req, res) => {
  const c = calls.get(req.params.id);
  if (!c) return res.status(404).json(fail('call not found'));
  const { ivr_id, menu_key } = req.body || {};
  let targetAgentId = null;
  if (ivr_id && ivrs.has(ivr_id)) {
    const ivr = ivrs.get(ivr_id);
    const choice = ivr.menu.find(m => m.key === menu_key);
    if (choice) {
      if (choice.target === 'human') {
        c.routed_to = 'human-queue';
      } else {
        const agent = [...agents.values()].find(a => a.name === choice.target);
        if (agent) { targetAgentId = agent.id; c.agent_id = agent.id; c.routed_to = agent.name; }
      }
    }
  } else {
    // Default: route to the number's agent
    const num = [...numbers.values()].find(n => n.e164 === c.to);
    if (num && num.agent_id) { targetAgentId = num.agent_id; c.agent_id = num.agent_id; c.routed_to = num.e164; }
  }
  if (targetAgentId) c.status = 'in-progress';
  calls.set(c.id, c);
  res.json(ok({ call: c, routed_to: c.routed_to }));
});

// IVRs
app.get('/api/ivrs', (_req, res) => res.json(ok({ ivrs: [...ivrs.values()] })));
app.post('/api/ivrs', (req, res) => {
  const { name, number_id, menu } = req.body || {};
  if (!name || !Array.isArray(menu) || menu.length === 0) return res.status(400).json(fail('name + menu[] required'));
  const id = uuid();
  const iv = { id, name, number_id: number_id || null, menu };
  ivrs.set(id, iv);
  res.status(201).json(ok({ ivr: iv }));
});

// Transcripts
app.get('/api/transcripts', (_req, res) => res.json(ok({ transcripts: [...transcripts.values()] })));
app.get('/api/transcripts/:id', (req, res) => {
  const t = transcripts.get(req.params.id);
  if (!t) return res.status(404).json(fail('transcript not found'));
  res.json(ok({ transcript: t }));
});
app.post('/api/transcripts', (req, res) => {
  const { call_id, turns, language = 'en-US', confidence = 0.95 } = req.body || {};
  if (!call_id || !Array.isArray(turns)) return res.status(400).json(fail('call_id + turns[] required'));
  const id = uuid();
  const t = { id, call_id, turns, language, confidence };
  transcripts.set(id, t);
  // Attach to call
  const c = calls.get(call_id);
  if (c) { c.transcript_id = id; calls.set(c.id, c); }
  res.status(201).json(ok({ transcript: t }));
});

// Recordings
app.get('/api/recordings', (_req, res) => res.json(ok({ recordings: [...recordings.values()] })));
app.post('/api/recordings', (req, res) => {
  const { call_id, url, duration_s = 0, format = 'wav' } = req.body || {};
  if (!call_id || !url) return res.status(400).json(fail('call_id + url required'));
  const id = uuid();
  const size_bytes = Math.round(duration_s * 16000 * 2); // 16kHz mono PCM
  const r = { id, call_id, url, duration_s, size_bytes, format };
  recordings.set(id, r);
  const c = calls.get(call_id);
  if (c) { c.recording_url = url; calls.set(c.id, c); }
  res.status(201).json(ok({ recording: r }));
});

// Analytics
app.get('/api/analytics', (req, res) => {
  const days = parseInt(req.query.days || '7', 10);
  const list = [...analytics.values()].sort((a, b) => b.day.localeCompare(a.day)).slice(0, days);
  res.json(ok({ analytics: list, total_days: list.length }));
});
app.get('/api/analytics/today', (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const a = analytics.get(today) || { day: today, total_calls: 0, total_minutes: 0, avg_duration_s: 0, by_agent: {}, by_status: {} };
  res.json(ok({ analytics: a }));
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
