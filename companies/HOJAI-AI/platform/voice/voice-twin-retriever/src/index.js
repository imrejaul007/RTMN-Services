import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4886;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Twin cache
const twinCache = new Map();
const voiceToTwin = new Map();

// Retrieve twin from CorpID
function retrieveTwin(corpId, twinType = 'user') {
  const key = `${corpId}:${twinType}`;
  if (twinCache.has(key)) {
    return twinCache.get(key);
  }

  // In production, this would call TwinOS (port 4705)
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

// Cache twin for voice
function cacheTwinForVoice(voiceFingerprint, twin) {
  voiceToTwin.set(voiceFingerprint, {
    twin,
    cachedAt: new Date().toISOString()
  });
}

// Get cached twin for voice
function getCachedTwin(voiceFingerprint) {
  return voiceToTwin.get(voiceFingerprint);
}

// POST /retrieve - Retrieve twin for voice/CorpID
app.post('/retrieve', (req, res) => {
  const { voiceFingerprint, corpId, twinType } = req.body;

  if (!corpId && !voiceFingerprint) {
    return res.status(400).json({ error: 'voiceFingerprint or corpId required' });
  }

  // Lookup CorpID from voice if needed
  let resolvedCorpId = corpId;
  if (!resolvedCorpId && voiceFingerprint) {
    // In production, call voice-identity-bridge
    resolvedCorpId = `corp_${voiceFingerprint.substring(0, 8)}`;
  }

  const twin = retrieveTwin(resolvedCorpId, twinType || 'user');

  // Cache for quick access
  if (voiceFingerprint) {
    cacheTwinForVoice(voiceFingerprint, twin);
  }

  res.json({ twin });
});

// GET /twin/:corpId - Get twin by CorpID
app.get('/twin/:corpId', (req, res) => {
  const { corpId } = req.params;
  const { type } = req.query;

  const twin = retrieveTwin(corpId, type);
  res.json({ twin });
});

// GET /voice/:fingerprint/twin - Get cached twin
app.get('/voice/:fingerprint/twin', (req, res) => {
  const { fingerprint } = req.params;

  const cached = getCachedTwin(fingerprint);
  if (!cached) {
    return res.status(404).json({ error: 'No twin cached for this voice' });
  }

  res.json({ twin: cached.twin, cachedAt: cached.cachedAt });
});

// DELETE /cache - Clear twin cache
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

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'voice-twin-retriever', port: PORT, cachedTwins: twinCache.size });
});

app.listen(PORT, () => console.log(`Voice Twin Retriever running on port ${PORT}`));
export default app;
