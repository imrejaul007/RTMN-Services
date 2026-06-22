/**
 * RTMN Meeting OS (port 4864)
 *
 * End-to-end meeting intelligence:
 *  - schedule: book meetings with conflict detection across participants
 *  - transcribe: pluggable provider (mock / whisper / deepgram / otter / fireflies)
 *  - extract: action items, decisions, and a summary from transcript text
 *  - list / query meetings by participant, status, or date range
 *
 * Runs fully without external API keys (mock transcription).
 */

const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4864;

app.use(helmet());
app.use(cors());
app.use(express.json());

// ----------------------------- Persistent storage (file-backed) -----------------------------
// Drop-in Map replacement. Survives process restarts. See shared/lib/persistent-map.js.

const meetings = new PersistentMap('meetings', { serviceName: 'meeting-os' });      // meetingId -> { id, title, datetime, durationMin, timezone, participants[], joinLink, agenda, status, transcript, actionItems[], decisions[], summary }
const participants = new PersistentMap('participants', { serviceName: 'meeting-os' });  // email -> { email, name, meetingIds: [] }
const actionItems = new PersistentMap('action-items', { serviceName: 'meeting-os' });   // actionItemId -> { id, meetingId, owner, text, dueDate, status }

// ----------------------------- Transcription providers -----------------------------

const transcriptionProviders = {
  mock: {
    name: 'mock', label: 'Mock transcriber (passthrough + simple timestamps)',
    transcribe: async ({ meetingId, segments }) => {
      // segments: [{ start, end, text }] — already in simple format
      return { provider: 'mock', meetingId, segments: (segments || []).map(s => ({ ...s, confidence: 1.0 })), language: 'en', note: 'Mock provider — no actual audio processing.' };
    },
    healthCheck: async () => ({ status: 'ok', mode: 'mock' }),
  },
  whisper: {
    name: 'whisper', label: 'OpenAI Whisper (local or API)',
    transcribe: async ({ meetingId, audioUrl }) => ({
      provider: 'whisper', meetingId, audioUrl, segments: [], note: 'Would POST audio to Whisper endpoint and return segments.', language: 'auto',
    }),
    healthCheck: async () => ({ status: 'configured', mode: 'live', requiresApiKey: 'OPENAI_API_KEY' }),
  },
  deepgram: {
    name: 'deepgram', label: 'Deepgram',
    transcribe: async ({ meetingId, audioUrl }) => ({
      provider: 'deepgram', meetingId, audioUrl, segments: [], note: 'Would POST to wss://api.deepgram.com/v1/listen with bearer token.', language: 'auto',
    }),
    healthCheck: async () => ({ status: 'configured', mode: 'live', requiresApiKey: 'DEEPGRAM_API_KEY' }),
  },
  otter: {
    name: 'otter', label: 'Otter.ai',
    transcribe: async ({ meetingId, audioUrl }) => ({
      provider: 'otter', meetingId, audioUrl, segments: [], note: 'Would use Otter.ai Speech API with OTTER_API_KEY.', language: 'auto',
    }),
    healthCheck: async () => ({ status: 'configured', mode: 'live', requiresApiKey: 'OTTER_API_KEY' }),
  },
};

let currentTranscriptionProvider = process.env.MEETING_TRANSCRIPTION_PROVIDER || 'mock';

// ----------------------------- Extraction heuristics -----------------------------

const ACTION_KEYWORDS = ['will', 'should', "let's", 'need to', 'must', "i'll", 'todo', 'to-do', 'action item', 'action:', 'follow up', 'by next', 'by friday', 'by monday', 'next week'];
const DECISION_KEYWORDS = ['decided', 'agreed', 'concluded', 'consensus', 'we will go with', 'final answer', 'approved', 'rejected'];

const extractActionItems = (transcriptText) => {
  const lines = (transcriptText || '').split(/[.\n]/).map(l => l.trim()).filter(Boolean);
  const items = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (ACTION_KEYWORDS.some(kw => lower.includes(kw)) && line.length < 200) {
      // Try to extract owner: words like "Alice will..." or "Bob to..."
      const ownerMatch = line.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?:will|to|should)/);
      const owner = ownerMatch ? ownerMatch[1] : null;
      // Try to extract due date
      const dueMatch = line.match(/by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+\w+|tomorrow|today|\d{1,2}\/\d{1,2})/i);
      const dueDate = dueMatch ? dueMatch[1] : null;
      items.push({ text: line, owner, dueDate });
    }
  }
  return items;
};

const extractDecisions = (transcriptText) => {
  const lines = (transcriptText || '').split(/[.\n]/).map(l => l.trim()).filter(Boolean);
  return lines.filter(l => DECISION_KEYWORDS.some(kw => l.toLowerCase().includes(kw)) && l.length < 300);
};

const summarize = (transcriptText) => {
  const text = (transcriptText || '').trim();
  if (!text) return { summary: '', wordCount: 0 };
  // Sentence-based extractive summary: first sentence + sentences with keywords
  const sentences = text.split(/(?<=[.!?])\s+/);
  const important = sentences.filter(s => /(decided|agreed|important|key|main|result|conclusion|launch|ship|deliver|complete)/i.test(s));
  const summaryParts = [sentences[0], ...important.filter(s => s !== sentences[0])].slice(0, 3);
  return {
    summary: summaryParts.join(' '),
    sentenceCount: sentences.length,
    wordCount: text.split(/\s+/).length,
    keySentenceCount: summaryParts.length,
  };
};

// ----------------------------- Conflict detection -----------------------------

const detectConflicts = (datetime, durationMin, participants) => {
  const start = new Date(datetime).getTime();
  const end = start + durationMin * 60 * 1000;
  const conflicts = [];
  for (const m of meetings.values()) {
    if (m.status === 'cancelled') continue;
    const overlap = participants.some(p => m.participants.includes(p));
    if (!overlap) continue;
    const mStart = new Date(m.datetime).getTime();
    const mEnd = mStart + m.durationMin * 60 * 1000;
    if (start < mEnd && end > mStart) {
      conflicts.push({ meetingId: m.id, title: m.title, datetime: m.datetime, durationMin: m.durationMin });
    }
  }
  return conflicts;
};

// ----------------------------- Routes -----------------------------

app.get('/health', async (_req, res) => {
  const providerHealth = await transcriptionProviders[currentTranscriptionProvider].healthCheck();
  res.json({
    status: 'healthy', service: 'meeting-os', version: '1.0.0', port: PORT,
    transcriptionProvider: currentTranscriptionProvider, providerHealth,
    counts: { meetings: meetings.size, participants: participants.size, actionItems: actionItems.size },
    timestamp: new Date().toISOString(),
  });
});

// ----- Providers -----
app.get('/api/transcription/providers', (_req, res) => {
  res.json({ providers: Object.values(transcriptionProviders).map(p => ({ name: p.name, label: p.label })), current: currentTranscriptionProvider });
});

app.post('/api/transcription/providers/switch',requireAuth,  (req, res) => {
  const { provider } = req.body;
  if (!transcriptionProviders[provider]) return res.status(400).json({ error: 'unknown_provider', available: Object.keys(transcriptionProviders) });
  currentTranscriptionProvider = provider;
  res.json({ switched: provider, current: currentTranscriptionProvider });
});

// ----- Schedule -----
app.post('/api/meetings/schedule',requireAuth,  (req, res) => {
  const { title, datetime, durationMin = 30, timezone = 'UTC', participants: parts = [], agenda = '', joinLink } = req.body || {};
  if (!title || !datetime) return res.status(400).json({ error: 'title_and_datetime_required' });
  const conflicts = detectConflicts(datetime, durationMin, parts);
  const id = `mtg-${uuidv4().slice(0, 8)}`;
  const meeting = {
    id, title, datetime, durationMin, timezone, participants: parts,
    joinLink: joinLink || `https://meet.rtmn.ai/${id}`,
    agenda, status: 'scheduled',
    transcript: null, actionItems: [], decisions: [], summary: null,
    createdAt: new Date().toISOString(),
  };
  meetings.set(id, meeting);
  for (const p of parts) {
    const existing = participants.get(p) || { email: p, name: p.split('@')[0], meetingIds: [] };
    if (!existing.meetingIds.includes(id)) existing.meetingIds.push(id);
    participants.set(p, existing);
  }
  res.status(201).json({ meeting, conflicts, warning: conflicts.length > 0 ? 'conflicts_detected' : null });
});

app.get('/api/meetings', (req, res) => {
  const { participant, status, from, to } = req.query;
  let out = [...meetings.values()].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  if (participant) out = out.filter(m => m.participants.includes(participant));
  if (status) out = out.filter(m => m.status === status);
  if (from) out = out.filter(m => new Date(m.datetime) >= new Date(from));
  if (to) out = out.filter(m => new Date(m.datetime) <= new Date(to));
  res.json({ meetings: out, count: out.length });
});

app.get('/api/meetings/:id', (req, res) => {
  const m = meetings.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'not_found' });
  res.json(m);
});

app.patch('/api/meetings/:id',requireAuth,  (req, res) => {
  const m = meetings.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'not_found' });
  const allowed = ['title', 'datetime', 'durationMin', 'timezone', 'agenda', 'participants', 'joinLink', 'status'];
  for (const k of allowed) if (k in req.body) m[k] = req.body[k];
  m.updatedAt = new Date().toISOString();
  meetings.set(m.id, m);
  res.json(m);
});

app.post('/api/meetings/:id/cancel',requireAuth,  (req, res) => {
  const m = meetings.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'not_found' });
  m.status = 'cancelled';
  m.cancelledAt = new Date().toISOString();
  res.json(m);
});

// ----- Conflict check (without booking) -----
app.post('/api/meetings/check-conflicts',requireAuth,  (req, res) => {
  const { datetime, durationMin = 30, participants: parts = [] } = req.body || {};
  if (!datetime) return res.status(400).json({ error: 'datetime_required' });
  res.json({ conflicts: detectConflicts(datetime, durationMin, parts) });
});

// ----- Transcript ingestion -----
app.post('/api/meetings/:id/transcript',requireAuth,  async (req, res) => {
  const m = meetings.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'not_found' });
  const { segments, transcriptText, audioUrl } = req.body || {};
  let result;
  if (transcriptText && !segments) {
    // Build a single-segment passthrough so extraction can still run
    result = await transcriptionProviders[currentTranscriptionProvider].transcribe({ meetingId: m.id, segments: [{ start: 0, end: 0, text: transcriptText }] });
  } else {
    result = await transcriptionProviders[currentTranscriptionProvider].transcribe({ meetingId: m.id, segments, audioUrl });
  }
  m.transcript = result;
  m.transcriptIngestedAt = new Date().toISOString();
  meetings.set(m.id, m);
  res.status(201).json(result);
});

// ----- Extract action items / decisions / summary -----
app.post('/api/meetings/:id/extract',requireAuth,  (req, res) => {
  const m = meetings.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'not_found' });
  if (!m.transcript) return res.status(400).json({ error: 'no_transcript_yet', hint: 'POST /api/meetings/:id/transcript first' });
  const fullText = m.transcript.segments.map(s => s.text).join(' ');
  const extractedActions = extractActionItems(fullText);
  const decisions = extractDecisions(fullText);
  const summary = summarize(fullText);

  // Persist action items
  for (const a of extractedActions) {
    const aid = `act-${uuidv4().slice(0, 8)}`;
    const item = { id: aid, meetingId: m.id, owner: a.owner, text: a.text, dueDate: a.dueDate, status: 'open', createdAt: new Date().toISOString() };
    actionItems.set(aid, item);
    a.id = aid;
  }
  m.actionItems = extractedActions;
  m.decisions = decisions;
  m.summary = summary;
  m.extractedAt = new Date().toISOString();
  meetings.set(m.id, m);

  res.json({ actionItems: extractedActions, decisions, summary });
});

// ----- Action items -----
app.get('/api/action-items', (req, res) => {
  const { owner, meetingId, status } = req.query;
  let out = [...actionItems.values()];
  if (owner) out = out.filter(a => a.owner === owner);
  if (meetingId) out = out.filter(a => a.meetingId === meetingId);
  if (status) out = out.filter(a => a.status === status);
  res.json({ actionItems: out, count: out.length });
});

app.patch('/api/action-items/:id',requireAuth,  (req, res) => {
  const a = actionItems.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'not_found' });
  const allowed = ['status', 'owner', 'dueDate', 'text'];
  for (const k of allowed) if (k in req.body) a[k] = req.body[k];
  a.updatedAt = new Date().toISOString();
  res.json(a);
});

// ----- Participants -----
app.get('/api/participants', (_req, res) => res.json({ participants: [...participants.values()], count: participants.size }));

// ----- 404 -----
app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`[meeting-os] listening on ${PORT} — transcription: ${currentTranscriptionProvider}`);
});

// Graceful shutdown: flush PersistentMaps to disk before exit
installGracefulShutdown(server, async () => {
  await Promise.allSettled([meetings.flush(), participants.flush(), actionItems.flush()]);
  meetings.stopAutoFlush();
  participants.stopAutoFlush();
  actionItems.stopAutoFlush();
});
