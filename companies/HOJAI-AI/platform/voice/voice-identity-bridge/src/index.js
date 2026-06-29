import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4885;

app.use(helmet());
app.use(cors());
app.use(express.json());

const voiceToCorpId = new Map();
const corpIdToVoice = new Map();

function registerVoiceLink(voiceFingerprint, corpId, metadata = {}) {
  const entry = {
    voiceFingerprint,
    corpId,
    linkedAt: new Date().toISOString(),
    verificationLevel: metadata.verificationLevel || 'basic',
    trustScore: metadata.trustScore || 50,
    metadata
  };
  voiceToCorpId.set(voiceFingerprint, entry);
  const existing = corpIdToVoice.get(corpId) || [];
  existing.push(entry);
  corpIdToVoice.set(corpId, existing);
  return entry;
}

function lookupCorpId(voiceFingerprint) {
  return voiceToCorpId.get(voiceFingerprint);
}

function getVoicesForCorpId(corpId) {
  return corpIdToVoice.get(corpId) || [];
}

function updateTrust(voiceFingerprint, delta) {
  const entry = voiceToCorpId.get(voiceFingerprint);
  if (!entry) return null;
  const newScore = entry.trustScore + delta;
  entry.trustScore = Math.max(0, Math.min(100, newScore));
  return entry;
}

app.post('/register', (req, res) => {
  const { voiceFingerprint, corpId, verificationLevel, trustScore, metadata } = req.body;
  if (!voiceFingerprint || !corpId) {
    return res.status(400).json({ error: 'voiceFingerprint and corpId required' });
  }
  const entry = registerVoiceLink(voiceFingerprint, corpId, { verificationLevel, trustScore, ...metadata });
  res.json({ success: true, entry });
});

app.post('/lookup', (req, res) => {
  const { voiceFingerprint } = req.body;
  if (!voiceFingerprint) {
    return res.status(400).json({ error: 'voiceFingerprint required' });
  }
  const entry = lookupCorpId(voiceFingerprint);
  if (!entry) {
    return res.json({ found: false, corpId: null, trustScore: 0 });
  }
  res.json({ found: true, corpId: entry.corpId, trustScore: entry.trustScore, verificationLevel: entry.verificationLevel, linkedAt: entry.linkedAt });
});

app.get('/corp/:corpId/voices', (req, res) => {
  const { corpId } = req.params;
  const voices = getVoicesForCorpId(corpId);
  res.json({ corpId, voices, count: voices.length });
});

app.put('/trust', (req, res) => {
  const { voiceFingerprint, delta } = req.body;
  if (!voiceFingerprint || delta === undefined) {
    return res.status(400).json({ error: 'voiceFingerprint and delta required' });
  }
  const entry = updateTrust(voiceFingerprint, delta);
  if (!entry) {
    return res.status(404).json({ error: 'Voice fingerprint not registered' });
  }
  res.json({ success: true, trustScore: entry.trustScore });
});

app.delete('/unregister', (req, res) => {
  const { voiceFingerprint, corpId } = req.body;
  if (voiceFingerprint) voiceToCorpId.delete(voiceFingerprint);
  if (corpId) corpIdToVoice.delete(corpId);
  res.json({ success: true });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'voice-identity-bridge', port: PORT, registeredVoices: voiceToCorpId.size, registeredCorpIds: corpIdToVoice.size });
});

app.listen(PORT, () => console.log('Voice Identity Bridge running on port ' + PORT));
export default app;
