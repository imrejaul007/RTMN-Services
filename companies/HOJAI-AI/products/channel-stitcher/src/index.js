/**
 * Channel Stitcher
 * Port: 5452
 * Identity resolution across all channels - stitch anonymous + known customers
 * Reuses: CorpID (4702), Customer Twin (4895), MemoryOS (4703)
 */
const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const axios = require('axios');
const app = express();
const PORT = process.env.CHANNEL_STITCHER_PORT || 5452;

// Service URLs
const CORP_ID = process.env.CORPID_URL || 'http://localhost:4702';
const CUSTOMER_TWIN = process.env.CUSTOMER_TWIN_URL || 'http://localhost:4895';
const MEMORY_OS = process.env.MEMORY_OS_URL || 'http://localhost:4703';
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

// In-memory identity graph (use graph DB in production)
const identityGraph = new Map();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'channel-stitcher', identities: identityGraph.size, port: PORT });
});

// POST /api/identity/resolve - Resolve identity across channels
app.post('/api/identity/resolve',requireAuth,  async (req, res) => {
  try {
    const { channel, identifier, visitorId, email, phone, name, attributes } = req.body;
    if (!channel || !identifier) {
      return res.status(400).json({ success: false, error: 'channel and identifier are required' });
    }

    // Find existing or create new
    let identity = await findExistingIdentity(channel, identifier, email, phone);
    if (!identity) {
      identity = createIdentity(channel, identifier, email, phone, name, attributes);
    } else {
      identity = updateIdentity(identity, channel, identifier, attributes);
    }

    // Link visitor ID if provided
    if (visitorId && !identity.visitorIds?.includes(visitorId)) {
      identity.visitorIds = identity.visitorIds || [];
      identity.visitorIds.push(visitorId);
    }

    identity.updatedAt = new Date().toISOString();
    identityGraph.set(identity.id, identity);

    // Sync to Customer Twin
    await syncToCustomerTwin(identity);

    res.json({ success: true, data: identity });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/identity/profile/:id - Get unified profile
app.get('/api/identity/profile/:id', async (req, res) => {
  try {
    const identity = identityGraph.get(req.params.id);
    if (!identity) return res.status(404).json({ success: false, error: 'Identity not found' });

    // Enrich with Customer Twin data
    let twinData = null;
    try {
      const twinRes = await axios.get(`${CUSTOMER_TWIN}/api/twin/${req.params.id}`, {
        headers: { Authorization: `Bearer ${HOJAI_API_KEY}` },
        timeout: 3000
      });
      twinData = twinRes.data?.data || twinRes.data;
    } catch (e) { /* twin not available */ }

    res.json({ success: true, data: { ...identity, twin: twinData } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/identity/merge - Merge two identities
app.post('/api/identity/merge',requireAuth,  async (req, res) => {
  try {
    const { sourceId, targetId } = req.body;
    if (!sourceId || !targetId) {
      return res.status(400).json({ success: false, error: 'sourceId and targetId are required' });
    }

    const source = identityGraph.get(sourceId);
    const target = identityGraph.get(targetId);
    if (!source || !target) {
      return res.status(404).json({ success: false, error: 'Identity not found' });
    }

    // Merge
    const merged = {
      ...target,
      channels: [...new Set([...target.channels, ...source.channels])],
      identifiers: [...target.identifiers, ...source.identifiers].filter((v, i, a) =>
        a.findIndex(t => t.channel === v.channel && t.value === v.value) === i),
      visitorIds: [...new Set([...(target.visitorIds || []), ...(source.visitorIds || [])])],
      attributes: { ...source.attributes, ...target.attributes },
      mergedAt: new Date().toISOString(),
      mergedFrom: [sourceId]
    };

    identityGraph.delete(sourceId);
    identityGraph.set(targetId, merged);
    await syncToCustomerTwin(merged);

    res.json({ success: true, data: merged });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/identity/link - Link new channel to existing identity
app.post('/api/identity/link',requireAuth,  async (req, res) => {
  try {
    const { identityId, channel, identifier, attributes } = req.body;
    const identity = identityGraph.get(identityId);
    if (!identity) return res.status(404).json({ success: false, error: 'Identity not found' });

    if (!identity.channels.includes(channel)) identity.channels.push(channel);
    if (!identity.identifiers.some(i => i.channel === channel)) {
      identity.identifiers.push({ channel, value: identifier });
    }
    if (attributes) identity.attributes = { ...identity.attributes, ...attributes };
    identity.updatedAt = new Date().toISOString();
    identityGraph.set(identityId, identity);
    await syncToCustomerTwin(identity);

    res.json({ success: true, data: identity });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/identity/lookup - Lookup by any identifier
app.get('/api/identity/lookup', async (req, res) => {
  try {
    const { email, phone, visitorId } = req.query;
    for (const [, identity] of identityGraph) {
      if (email && identity.attributes?.email === email) return res.json({ success: true, data: identity });
      if (phone && identity.attributes?.phone === phone) return res.json({ success: true, data: identity });
      if (visitorId && identity.visitorIds?.includes(visitorId)) return res.json({ success: true, data: identity });
    }
    res.status(404).json({ success: false, error: 'Identity not found' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function createIdentity(channel, identifier, email, phone, name, attributes) {
  const id = `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return {
    id, channels: [channel],
    identifiers: [{ channel, value: identifier }],
    attributes: { email: email || null, phone: phone || null, name: name || null, ...attributes },
    visitorIds: [], tags: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
}

function updateIdentity(identity, channel, identifier, attributes) {
  if (!identity.channels.includes(channel)) identity.channels.push(channel);
  if (!identity.identifiers.some(i => i.channel === channel)) {
    identity.identifiers.push({ channel, value: identifier });
  }
  if (attributes) identity.attributes = { ...identity.attributes, ...attributes };
  return identity;
}

async function findExistingIdentity(channel, identifier, email, phone) {
  for (const [, identity] of identityGraph) {
    if (identity.identifiers?.some(i => i.channel === channel && i.value === identifier)) return identity;
    if (email && identity.attributes?.email === email) return identity;
    if (phone && identity.attributes?.phone === phone) return identity;
  }
  // Try CorpID
  if (email) {
    try {
      const corpRes = await axios.get(`${CORP_ID}/api/identity/lookup`, {
        params: { email },
        headers: { Authorization: `Bearer ${HOJAI_API_KEY}` },
        timeout: 3000
      });
      if (corpRes.data?.id && identityGraph.has(corpRes.data.id)) {
        return identityGraph.get(corpRes.data.id);
      }
    } catch (e) { /* ignore */ }
  }
  return null;
}

async function syncToCustomerTwin(identity) {
  try {
    await axios.post(`${CUSTOMER_TWIN}/api/twin/${identity.id}`, {
      identity: identity.id, channels: identity.channels,
      attributes: identity.attributes, lastSeen: new Date().toISOString()
    }, { headers: { Authorization: `Bearer ${HOJAI_API_KEY}` }, timeout: 5000 });
  } catch (e) {
    console.warn('Failed to sync to Customer Twin:', e.message);
  }
}
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => {
  console.log(`Channel Stitcher running on port ${PORT}`);
});

module.exports = app;
