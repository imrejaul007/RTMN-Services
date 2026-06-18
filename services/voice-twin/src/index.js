const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 4876;

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage
const voices = new Map();
const profiles = new Map();
const recordings = new Map();
const sessions = new Map();

// Initialize with sample voices
const sampleVoices = [
  { id: 'voice-1', name: 'Emma', gender: 'female', language: 'en-US', style: 'professional', pitch: 1.0, speed: 1.0, provider: 'standard' },
  { id: 'voice-2', name: 'James', gender: 'male', language: 'en-US', style: 'professional', pitch: 0.95, speed: 1.0, provider: 'standard' },
  { id: 'voice-3', name: 'Sofia', gender: 'female', language: 'es-ES', style: 'friendly', pitch: 1.1, speed: 1.0, provider: 'standard' },
  { id: 'voice-4', name: 'Hans', gender: 'male', language: 'de-DE', style: 'professional', pitch: 0.9, speed: 0.95, provider: 'standard' },
  { id: 'voice-5', name: 'Luna', gender: 'female', language: 'en-US', style: 'casual', pitch: 1.05, speed: 1.1, provider: 'neural' }
];

sampleVoices.forEach(v => voices.set(v.id, v));

// Sample profiles
const sampleProfiles = [
  { id: 'profile-1', userId: 'user-1', name: 'John Smith', preferredVoice: 'voice-2', language: 'en-US', greeting: 'Hello, how can I help you today?' },
  { id: 'profile-2', userId: 'user-2', name: 'Maria Garcia', preferredVoice: 'voice-3', language: 'es-ES', greeting: 'Hola, como puedo ayudarle hoy?' }
];

sampleProfiles.forEach(p => profiles.set(p.id, p));

// ==================== VOICES API ====================

// Get all voices
app.get('/api/voices', (req, res) => {
  const { gender, language, style, provider } = req.query;
  
  let result = Array.from(voices.values());
  
  if (gender) result = result.filter(v => v.gender === gender);
  if (language) result = result.filter(v => v.language === language);
  if (style) result = result.filter(v => v.style === style);
  if (provider) result = result.filter(v => v.provider === provider);
  
  res.json({ voices: result, total: result.length });
});

// Get voice
app.get('/api/voices/:id', (req, res) => {
  const voice = voices.get(req.params.id);
  
  if (!voice) {
    return res.status(404).json({ error: 'Voice not found' });
  }
  
  res.json(voice);
});

// Create voice
app.post('/api/voices', (req, res) => {
  const { name, gender, language, style, pitch, speed } = req.body;
  
  if (!name || !gender || !language) {
    return res.status(400).json({ error: 'Name, gender, and language are required' });
  }
  
  const voice = {
    id: `voice-${uuidv4().slice(0, 8)}`,
    name,
    gender,
    language,
    style: style || 'neutral',
    pitch: pitch || 1.0,
    speed: speed || 1.0,
    provider: 'custom',
    createdAt: new Date().toISOString()
  };
  
  voices.set(voice.id, voice);
  
  res.status(201).json(voice);
});

// ==================== TEXT-TO-SPEECH API ====================

// Synthesize speech
app.post('/api/tts', (req, res) => {
  const { text, voiceId, language, speed, pitch, format } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }
  
  const voice = voiceId ? voices.get(voiceId) : voices.values().next().value;
  
  const audio = {
    id: `audio-${uuidv4().slice(0, 8)}`,
    text,
    voiceId: voice?.id,
    voiceName: voice?.name,
    language: language || voice?.language || 'en-US',
    speed: speed || voice?.speed || 1.0,
    pitch: pitch || voice?.pitch || 1.0,
    format: format || 'mp3',
    duration: Math.round(text.length * 0.05 * 10) / 10,
    audioUrl: `/api/audio/${uuidv4().slice(0, 8)}.mp3`,
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    audio
  });
});

// ==================== SPEECH-TO-TEXT API ====================

// Transcribe audio
app.post('/api/stt', (req, res) => {
  const { audioUrl, language, model } = req.body;
  
  if (!audioUrl) {
    return res.status(400).json({ error: 'Audio URL is required' });
  }
  
  // Simulate transcription
  const transcription = {
    id: `trn-${uuidv4().slice(0, 8)}`,
    audioUrl,
    text: 'This is a simulated transcription of the audio content.',
    language: language || 'en-US',
    confidence: (Math.random() * 0.2 + 0.8).toFixed(2),
    words: Math.round(Math.random() * 100 + 50),
    duration: Math.round(Math.random() * 60 + 10),
    model: model || 'standard',
    createdAt: new Date().toISOString()
  };
  
  res.json(transcription);
});

// ==================== PROFILES API ====================

// Get all profiles
app.get('/api/profiles', (req, res) => {
  const { userId } = req.query;
  
  let result = Array.from(profiles.values());
  
  if (userId) result = result.filter(p => p.userId === userId);
  
  res.json({ profiles: result, total: result.length });
});

// Get profile
app.get('/api/profiles/:id', (req, res) => {
  const profile = profiles.get(req.params.id);
  
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  
  res.json(profile);
});

// Create profile
app.post('/api/profiles', (req, res) => {
  const { userId, name, preferredVoice, language, greeting } = req.body;
  
  if (!userId || !name) {
    return res.status(400).json({ error: 'User ID and name are required' });
  }
  
  const profile = {
    id: `profile-${uuidv4().slice(0, 8)}`,
    userId,
    name,
    preferredVoice: preferredVoice || 'voice-1',
    language: language || 'en-US',
    greeting: greeting || 'Hello, how can I help you?',
    settings: {
      volume: 0.8,
      speed: 1.0,
      interruptions: true
    },
    createdAt: new Date().toISOString()
  };
  
  profiles.set(profile.id, profile);
  
  res.status(201).json(profile);
});

// Update profile
app.put('/api/profiles/:id', (req, res) => {
  const profile = profiles.get(req.params.id);
  
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  
  const fields = ['name', 'preferredVoice', 'language', 'greeting'];
  fields.forEach(field => {
    if (req.body[field] !== undefined) profile[field] = req.body[field];
  });
  
  if (req.body.settings) profile.settings = { ...profile.settings, ...req.body.settings };
  
  res.json(profile);
});

// ==================== SESSIONS API ====================

// Start voice session
app.post('/api/sessions/start', (req, res) => {
  const { userId, profileId, channel } = req.body;
  
  const profile = profileId ? profiles.get(profileId) : null;
  
  const session = {
    id: `sess-${uuidv4().slice(0, 8)}`,
    userId: userId || 'anonymous',
    profileId: profile?.id,
    profileName: profile?.name,
    channel: channel || 'web',
    voiceId: profile?.preferredVoice || 'voice-1',
    status: 'active',
    startTime: new Date().toISOString(),
    endTime: null,
    interactions: 0,
    duration: 0,
    transcripts: [],
    responses: []
  };
  
  sessions.set(session.id, session);
  
  res.status(201).json(session);
});

// Update session
app.put('/api/sessions/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  if (req.body.transcript) {
    session.transcripts.push(req.body.transcript);
  }
  
  if (req.body.response) {
    session.responses.push(req.body.response);
  }
  
  session.interactions++;
  
  res.json(session);
});

// End session
app.post('/api/sessions/:id/end', (req, res) => {
  const session = sessions.get(req.params.id);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  session.status = 'ended';
  session.endTime = new Date().toISOString();
  session.duration = Math.round((new Date(session.endTime) - new Date(session.startTime)) / 1000);
  
  res.json(session);
});

// Get session
app.get('/api/sessions/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json(session);
});

// Get sessions
app.get('/api/sessions', (req, res) => {
  const { userId, status } = req.query;
  
  let result = Array.from(sessions.values());
  
  if (userId) result = result.filter(s => s.userId === userId);
  if (status) result = result.filter(s => s.status === status);
  
  result.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  
  res.json({ sessions: result, total: result.length });
});

// ==================== RECORDINGS API ====================

// Save recording
app.post('/api/recordings', (req, res) => {
  const { sessionId, audioUrl, duration, transcription } = req.body;
  
  const recording = {
    id: `rec-${uuidv4().slice(0, 8)}`,
    sessionId,
    audioUrl: audioUrl || `/api/recordings/${uuidv4().slice(0, 8)}.mp3`,
    duration: duration || 0,
    transcription: transcription || '',
    format: 'mp3',
    createdAt: new Date().toISOString()
  };
  
  recordings.set(recording.id, recording);
  
  res.status(201).json(recording);
});

// Get recordings
app.get('/api/recordings', (req, res) => {
  const { sessionId } = req.query;
  
  let result = Array.from(recordings.values());
  
  if (sessionId) result = result.filter(r => r.sessionId === sessionId);
  
  res.json({ recordings: result, total: result.length });
});

// ==================== STATISTICS API ====================

app.get('/api/statistics', (req, res) => {
  const allSessions = Array.from(sessions.values());
  const activeSessions = allSessions.filter(s => s.status === 'active');
  const completedSessions = allSessions.filter(s => s.status === 'ended');
  
  const stats = {
    totalSessions: allSessions.length,
    activeSessions: activeSessions.length,
    completedSessions: completedSessions.length,
    totalInteractions: allSessions.reduce((sum, s) => sum + s.interactions, 0),
    avgDuration: 0,
    totalRecordings: recordings.size,
    totalVoices: voices.size,
    totalProfiles: profiles.size,
    byChannel: {},
    topVoices: []
  };
  
  // Average duration
  if (completedSessions.length > 0) {
    stats.avgDuration = Math.round(completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length);
  }
  
  // By channel
  allSessions.forEach(s => {
    stats.byChannel[s.channel] = (stats.byChannel[s.channel] || 0) + 1;
  });
  
  res.json(stats);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'voice-twin',
    port: PORT,
    voices: voices.size,
    profiles: profiles.size,
    sessions: sessions.size
  });
});

app.listen(PORT, () => {
  console.log('🎙️ Voice Twin Service running on port ' + PORT);
  console.log('   Voices: ' + voices.size);
  console.log('   Profiles: ' + profiles.size);
});
