import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4888;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Relationship graph
const relationships = new Map();
const interactionHistory = [];

// Add relationship
function addRelationship(fromCorpId, toCorpId, type, metadata = {}) {
  const key = `${fromCorpId}:${toCorpId}`;
  const rel = {
    fromCorpId,
    toCorpId,
    type,
    strength: metadata.strength || 50,
    createdAt: new Date().toISOString(),
    metadata
  };
  relationships.set(key, rel);
  return rel;
}

// Get relationships for entity
function getRelationships(corpId) {
  const result = [];
  for (const [key, rel] of relationships) {
    if (rel.fromCorpId === corpId || rel.toCorpId === corpId) {
      result.push(rel);
    }
  }
  return result;
}

// Record interaction
function recordInteraction(fromCorpId, toCorpId, metadata = {}) {
  const interaction = {
    id: `int-${Date.now()}`,
    fromCorpId,
    toCorpId,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  interactionHistory.push(interaction);
  return interaction;
}

app.post('/relationships', (req, res) => {
  const { fromCorpId, toCorpId, type, metadata } = req.body;
  if (!fromCorpId || !toCorpId || !type) {
    return res.status(400).json({ error: 'fromCorpId, toCorpId, type required' });
  }
  const rel = addRelationship(fromCorpId, toCorpId, type, metadata);
  res.json({ success: true, relationship: rel });
});

app.get('/relationships/:corpId', (req, res) => {
  const { corpId } = req.params;
  const { type } = req.query;
  let rels = getRelationships(corpId);
  if (type) rels = rels.filter(r => r.type === type);
  res.json({ corpId, relationships: rels });
});

app.post('/interactions', (req, res) => {
  const { fromCorpId, toCorpId, metadata } = req.body;
  const interaction = recordInteraction(fromCorpId, toCorpId, metadata);
  res.json({ success: true, interaction });
});

app.get('/interactions/:corpId', (req, res) => {
  const { corpId } = req.params;
  const interactions = interactionHistory.filter(
    i => i.fromCorpId === corpId || i.toCorpId === corpId
  );
  res.json({ corpId, interactions });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'voice-relationship-graph', port: PORT });
});

app.listen(PORT, () => console.log(`Voice Relationship Graph running on port ${PORT}`));
export default app;
