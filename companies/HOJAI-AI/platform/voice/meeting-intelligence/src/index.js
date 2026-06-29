import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4890;

app.use(helmet());
app.use(cors());
app.use(express.json());

const meetings = new Map();

// Transcribe meeting (simulated)
function transcribe(audioData) {
  return {
    text: 'Meeting transcript...',
    duration: audioData.duration || 3600,
    speakers: ['Speaker 1', 'Speaker 2']
  };
}

// Summarize transcript
function summarize(transcript) {
  const sentences = transcript.split('. ');
  const summary = sentences.slice(0, 3).join('. ');
  return {
    summary,
    keyPoints: [
      'Discussed Q4 revenue targets',
      'Action items assigned to team',
      'Follow-up meeting scheduled'
    ],
    decisions: ['Budget approved for Q4', 'New hiring plan approved']
  };
}

// Extract action items
function extractActions(transcript) {
  const actions = [];
  const patterns = [
    /([A-Z][a-z]+)\s+will\s+([^.]+)/g,
    /([A-Z][a-z]+)\s+should\s+([^.]+)/g,
    /([A-Z][a-z]+)\s+needs?\s+to\s+([^.]+)/g,
    /action:\s*([^.]+)/gi,
    /todo:\s*([^.]+)/gi,
    /remind me to\s+([^.]+)/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      actions.push({
        assignee: match[1] || 'Team',
        action: match[2] || match[1],
        status: 'pending'
      });
    }
  }

  return actions;
}

// Link to memory
function linkToMemory(meetingId, summary) {
  return {
    memoryId: `mem_${meetingId}`,
    namespace: 'meetings',
    linkedAt: new Date().toISOString()
  };
}

// POST /transcribe - Transcribe meeting
app.post('/transcribe', (req, res) => {
  const { audioData, meetingId } = req.body;

  const id = meetingId || `meeting_${Date.now()}`;
  const transcript = transcribe(audioData || {});

  meetings.set(id, { id, transcript, createdAt: new Date().toISOString() });

  res.json({ meetingId: id, transcript });
});

// POST /summarize - Summarize meeting
app.post('/summarize', (req, res) => {
  const { meetingId, transcript } = req.body;

  const meeting = meetings.get(meetingId);
  const text = meeting?.transcript || transcript;

  if (!text) {
    return res.status(400).json({ error: 'meetingId or transcript required' });
  }

  const summary = summarize(text);

  res.json({ meetingId, summary });
});

// POST /actions - Extract action items
app.post('/actions', (req, res) => {
  const { meetingId, transcript } = req.body;

  const meeting = meetings.get(meetingId);
  const text = meeting?.transcript || transcript;

  if (!text) {
    return res.status(400).json({ error: 'meetingId or transcript required' });
  }

  const actions = extractActions(text);

  res.json({ meetingId, actions, count: actions.length });
});

// POST /analyze - Full meeting analysis
app.post('/analyze', (req, res) => {
  const { meetingId, audioData, transcript } = req.body;

  const meeting = meetings.get(meetingId);
  const text = meeting?.transcript || transcript;

  const analysis = {
    transcript: text || 'No transcript',
    summary: text ? summarize(text) : null,
    actions: text ? extractActions(text) : [],
    memory: text ? linkToMemory(meetingId, text) : null
  };

  res.json({ meetingId, analysis });
});

// GET /meetings - List meetings
app.get('/meetings', (req, res) => {
  const list = Array.from(meetings.values());
  res.json({ meetings: list, count: list.length });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'meeting-intelligence', port: PORT });
});

app.listen(PORT, () => console.log(`Meeting Intelligence running on port ${PORT}`));
export default app;
