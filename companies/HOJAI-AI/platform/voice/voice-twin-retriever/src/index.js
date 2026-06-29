import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4886;

app.use(helmet());
app.use(cors());
app.use(express.json());

const twinCache = new Map();
const voiceToTwin = new Map();

function retrieveTwin(corpId, twinType = 'user') {
  const key = `${corpId}:${twinType}`;
  if (twinCache.has(key)) {
    return twinCache.get(key);
  }
  const twin = {
    corpId,
    twinType,
    twinId: `${twinType}_${corpId}`,
    name: 'User',
    role: 'Member',
    preferences: {},
    loadedAt: new Date().toISOString()
  };
  twinCache.set(key, twin);
  return twin;
}

function cacheTwinForVoice(voiceFingerprint, twin) {
  voiceToTwin.set(voiceFingerprint, {
    twin,
    cachedAt: new Date().toISOString()
  });
}

function getCachedTwin(voiceFingerprint) {
  return voiceToTwin.get(voiceFingerprint);
}

app.post('/retrieve', (req, res) => {
  const { voiceFingerprint, corpId, twinType } = req.body;
  if (!corpId && !voiceFingerprint) {
    return res.status(400).json({ error: 'voiceFingerprint or corpId required' });
  }
  let resolvedCorpId = corpId;
  if (!resolvedCorpId && voiceFingerprint) {
    resolvedCorpId = `corp_${voiceFingerprint.substring(0, 8)}`;
  }
  const twin = retrieveTwin(resolvedCorpId, twinType || 'user');
  if (voiceFingerprint) {
    cacheTwinForVoice(voiceFingerprint, twin);
  }
  res.json({ twin });
});

app.get('/twin/:corpId', (req, res) => {
  const { corpId } = req.params;
  const { type } = req.query;
  const twin = retrieveTwin(corpId, type);
  res.json({ twin });
});

app.get('/voice/:fingerprint/twin', (req, res) => {
  const { fingerprint } = req.params;
  const cached = getCachedTwin(fingerprint);
  if (!cached) {
    return res.status(404).json({ error: 'No twin cached for this voice' });
  }
  res.json({ twin: cached.twin, cachedAt: cached.cachedAt });
});

app.delete('/cache', (req, res) => {
  const { voiceFingerprint, corpId } = req.query;
  if (voiceFingerprint) {
    voiceToTwin.delete(voiceFingerprint);
  }
  if (corpId) {
    for (const [key] of twinCache) {
      if (key.startsWith(`${corpId}:`)) {
        twinCache.delete(key);
      }
    }
  }
  res.json({ success: true });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'voice-twin-retriever', port: PORT, cachedTwins: twinCache.size });
});

app.listen(PORT, () => console.log(`Voice Twin Retriever running on port ${PORT}`));
export default app;
