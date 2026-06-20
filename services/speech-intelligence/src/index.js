// speech-intelligence (4870) - ASR/TTS pipelines, voice profiles, language detection,
// sentiment, diarization, pronunciation, custom vocabularies, batch transcription.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const SERVICE = 'speech-intelligence';
const PORT = parseInt(process.env.PORT || '4870', 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('tiny'));

const ok = (data) => ({ ok: true, ...data });
const fail = (msg) => ({ ok: false, error: msg });

// Stores
const voiceProfiles = new Map(); // vpId -> { id, name, language, gender, age_range, sample_url, embedding[], created }
const transcriptions = new Map(); // trId -> { id, audio_url, language, text, words[], confidence, segments[], created }
const ttsJobs = new Map();       // ttsId -> { id, text, voice_profile_id, format, audio_url, duration_s, status }
const sentimentJobs = new Map(); // sid -> { id, text, sentiment, scores{}, language, created }
const diarizations = new Map();   // diarId -> { id, transcription_id, speakers[] }
const customVocab = new Map();   // vocabId -> { id, name, language, phrases[], boost }
const batches = new Map();       // batchId -> { id, items[], status, results[], created, completed }

// Seed
(function seed() {
  [
    { name: 'alloy-female', language: 'en-US', gender: 'female', age_range: '25-35' },
    { name: 'echo-male', language: 'en-US', gender: 'male', age_range: '30-40' },
    { name: 'nova-female', language: 'en-GB', gender: 'female', age_range: '25-30' }
  ].forEach(v => {
    const id = uuid();
    voiceProfiles.set(id, { id, ...v, sample_url: `/samples/${id}.wav`, embedding: Array.from({ length: 8 }, () => Math.random().toFixed(4)),
      created: new Date().toISOString() });
  });
})();

// --- Helpers (mock speech recognition) ---
function mockASR(audioUrl, language, customPhrases = []) {
  // Synthesize a fake transcript influenced by URL hash + language
  const phrases = {
    'en-US': ['Hello, this is a test recording.', 'The meeting will start at 3pm.', 'Please review the report by Friday.'],
    'en-GB': ['Good morning, how may I help you?', 'I will send the details shortly.', 'Cheers, speak soon.'],
    'es-ES': ['Hola, esto es una prueba de voz.', 'La reunión comienza a las tres.', 'Gracias por su atención.'],
    'hi-IN': ['नमस्ते, यह एक परीक्षण रिकॉर्डिंग है।', 'बैठक तीन बजे शुरू होगी।', 'कृपया रिपोर्ट की समीक्षा करें।']
  };
  const pool = phrases[language] || phrases['en-US'];
  const idx = audioUrl.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % pool.length;
  let text = pool[idx];
  // Boost custom phrases by appending them
  if (customPhrases.length) text += ' ' + customPhrases.join(', ');
  // Synthesize word-level with mock confidence
  const words = text.split(/\s+/).map(w => ({ word: w, start: Math.random() * 30, end: Math.random() * 30 + 30, confidence: 0.85 + Math.random() * 0.15 }));
  // Compute overall confidence as average of word confidences
  const confidence = +(words.reduce((s, w) => s + w.confidence, 0) / Math.max(words.length, 1)).toFixed(4);
  return { text, words, confidence };
}

function mockSentiment(text, language) {
  const positive = ['great', 'love', 'excellent', 'happy', 'thank', 'amazing', 'wonderful', 'perfect', 'good'];
  const negative = ['bad', 'hate', 'terrible', 'sad', 'angry', 'awful', 'horrible', 'poor', 'wrong'];
  const lower = text.toLowerCase();
  let p = positive.reduce((s, w) => s + (lower.includes(w) ? 1 : 0), 0);
  let n = negative.reduce((s, w) => s + (lower.includes(w) ? 1 : 0), 0);
  const total = Math.max(p + n, 1);
  const scores = { positive: +(p / total).toFixed(3), neutral: +(((total - p - n) / total)).toFixed(3), negative: +(n / total).toFixed(3) };
  let sentiment = 'neutral';
  if (p > n) sentiment = 'positive';
  else if (n > p) sentiment = 'negative';
  return { sentiment, scores, language };
}

function detectLanguage(text) {
  if (/[ऀ-ॿ]/.test(text)) return 'hi-IN'; // Devanagari
  if (/[一-鿿]/.test(text)) return 'zh-CN';
  if (/[぀-ゟ゠-ヿ]/.test(text)) return 'ja-JP';
  if (/[가-힯]/.test(text)) return 'ko-KR';
  if (/[éèêëàâçôûùî]/.test(text)) return 'fr-FR';
  if (/[ñáéíóúü¿¡]/.test(text)) return 'es-ES';
  if (/[äöüß]/.test(text)) return 'de-DE';
  return 'en-US';
}

// --- Routes ---
app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE,
  port: PORT,
  endpoints: ['/api/voice-profiles', '/api/transcriptions', '/api/tts', '/api/sentiment',
              '/api/diarizations', '/api/vocabularies', '/api/batches']
})));

// Voice Profiles
app.get('/api/voice-profiles', (_req, res) => res.json(ok({ voice_profiles: [...voiceProfiles.values()] })));
app.post('/api/voice-profiles', (req, res) => {
  const { name, language = 'en-US', gender = 'neutral', age_range = 'unknown', sample_url } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  const v = { id, name, language, gender, age_range, sample_url: sample_url || null,
    embedding: Array.from({ length: 8 }, () => +(Math.random()).toFixed(4)),
    created: new Date().toISOString() };
  voiceProfiles.set(id, v);
  res.status(201).json(ok({ voice_profile: v }));
});

// Transcriptions (ASR)
app.get('/api/transcriptions', (req, res) => {
  let list = [...transcriptions.values()];
  if (req.query.language) list = list.filter(t => t.language === req.query.language);
  res.json(ok({ transcriptions: list }));
});
app.post('/api/transcriptions', (req, res) => {
  const { audio_url, language, vocabulary_id } = req.body || {};
  if (!audio_url) return res.status(400).json(fail('audio_url required'));
  const lang = language || 'en-US';
  let customPhrases = [];
  if (vocabulary_id && customVocab.has(vocabulary_id)) {
    customPhrases = customVocab.get(vocabulary_id).phrases;
  }
  const asr = mockASR(audio_url, lang, customPhrases);
  const id = uuid();
  const t = { id, audio_url, language: lang, text: asr.text, words: asr.words,
    confidence: asr.confidence, segments: [{ start: 0, end: 60, text: asr.text }],
    created: new Date().toISOString() };
  transcriptions.set(id, t);
  res.status(201).json(ok({ transcription: t }));
});

// TTS
app.get('/api/tts', (_req, res) => res.json(ok({ tts_jobs: [...ttsJobs.values()] })));
app.post('/api/tts', (req, res) => {
  const { text, voice_profile_id, format = 'mp3', speed = 1.0 } = req.body || {};
  if (!text) return res.status(400).json(fail('text required'));
  if (voice_profile_id && !voiceProfiles.has(voice_profile_id)) return res.status(400).json(fail('voice_profile_id invalid'));
  const id = uuid();
  const wordCount = text.split(/\s+/).length;
  const duration_s = +(wordCount / 2.5 / speed).toFixed(2); // ~150 wpm
  const j = { id, text, voice_profile_id: voice_profile_id || null, format, speed,
    audio_url: `/audio/${id}.${format}`, duration_s, status: 'completed' };
  ttsJobs.set(id, j);
  res.status(201).json(ok({ tts_job: j }));
});

// Sentiment
app.get('/api/sentiment', (_req, res) => res.json(ok({ sentiment_jobs: [...sentimentJobs.values()] })));
app.post('/api/sentiment', (req, res) => {
  const { text, language } = req.body || {};
  if (!text) return res.status(400).json(fail('text required'));
  const lang = language || detectLanguage(text);
  const s = mockSentiment(text, lang);
  const id = uuid();
  const j = { id, text, ...s, created: new Date().toISOString() };
  sentimentJobs.set(id, j);
  res.status(201).json(ok({ sentiment_job: j }));
});

// Language detection (no store)
app.post('/api/detect-language', (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json(fail('text required'));
  res.json(ok({ text, detected_language: detectLanguage(text) }));
});

// Diarization
app.get('/api/diarizations', (_req, res) => res.json(ok({ diarizations: [...diarizations.values()] })));
app.post('/api/diarizations', (req, res) => {
  const { transcription_id, num_speakers } = req.body || {};
  if (!transcription_id || !transcriptions.has(transcription_id)) return res.status(400).json(fail('valid transcription_id required'));
  const t = transcriptions.get(transcription_id);
  // Split words into num_speakers groups (round-robin)
  const n = Math.max(2, num_speakers || 2);
  const speakers = Array.from({ length: n }, (_, i) => ({ id: `spk_${i + 1}`, label: `Speaker ${i + 1}`, word_count: 0 }));
  t.words.forEach((w, i) => { speakers[i % n].word_count++; });
  const id = uuid();
  const d = { id, transcription_id, speakers, segments: t.words.map((w, i) => ({ ...w, speaker: speakers[i % n].id })) };
  diarizations.set(id, d);
  res.status(201).json(ok({ diarization: d }));
});

// Custom Vocabularies
app.get('/api/vocabularies', (_req, res) => res.json(ok({ vocabularies: [...customVocab.values()] })));
app.post('/api/vocabularies', (req, res) => {
  const { name, language = 'en-US', phrases = [], boost = 2.0 } = req.body || {};
  if (!name || !Array.isArray(phrases)) return res.status(400).json(fail('name + phrases[] required'));
  const id = uuid();
  const v = { id, name, language, phrases, boost };
  customVocab.set(id, v);
  res.status(201).json(ok({ vocabulary: v }));
});

// Batches
app.get('/api/batches', (_req, res) => res.json(ok({ batches: [...batches.values()] })));
app.post('/api/batches', (req, res) => {
  const { items, language } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json(fail('items[] required'));
  const id = uuid();
  const results = items.map((item, i) => {
    const lang = language || detectLanguage(item.text || '');
    const s = mockSentiment(item.text || '', lang);
    return { index: i, ...s, language: lang };
  });
  const b = { id, items: items.length, status: 'completed', results, created: new Date().toISOString(), completed: new Date().toISOString() };
  batches.set(id, b);
  res.status(201).json(ok({ batch: b }));
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
