import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4993;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Knowledge graph for verification
const knowledgeGraph = new Map();

// Add fact to knowledge graph
function addFact(subject, predicate, object, source, reliability = 0.8) {
  const key = `${subject}|${predicate}`;
  const facts = knowledgeGraph.get(key) || [];
  facts.push({
    object,
    source,
    reliability,
    timestamp: new Date().toISOString()
  });
  knowledgeGraph.set(key, facts);
}

// Check fact against knowledge graph
function verifyFact(statement) {
  const results = {
    statement,
    verified: false,
    confidence: 0,
    supportingFacts: [],
    contradictingFacts: [],
    sources: [],
    verdict: 'unknown'
  };

  // Parse statement
  const parsed = parseStatement(statement);
  if (!parsed) return results;

  // Look up facts
  const key = `${parsed.subject}|${parsed.predicate}`;
  const facts = knowledgeGraph.get(key) || [];

  if (facts.length === 0) {
    results.verdict = 'unverified';
    results.confidence = 0.2;
    return results;
  }

  // Aggregate facts
  for (const fact of facts) {
    if (fact.object === parsed.object) {
      results.supportingFacts.push(fact);
      results.sources.push(fact.source);
    } else if (isContradiction(fact.object, parsed.object)) {
      results.contradictingFacts.push(fact);
    }
  }

  // Calculate confidence
  const supportingCount = results.supportingFacts.length;
  const contradictingCount = results.contradictingFacts.length;
  const totalCount = supportingCount + contradictingCount;

  if (totalCount > 0) {
    results.confidence = supportingCount / totalCount;
    results.verified = results.confidence >= 0.7;
  } else {
    // Use reliability of sources
    const avgReliability = facts.reduce((sum, f) => sum + f.reliability, 0) / facts.length;
    results.confidence = avgReliability;
  }

  // Determine verdict
  if (results.confidence >= 0.8) {
    results.verdict = results.contradictingFacts.length > 0 ? 'disputed' : 'verified';
  } else if (results.confidence >= 0.5) {
    results.verdict = 'partial';
  } else {
    results.verdict = 'unverified';
  }

  return results;
}

function parseStatement(statement) {
  // Simple parsing: "X is Y", "X has Y", "X equals Y"
  const patterns = [
    /^([^.!?]+)\s+is\s+(.+)$/i,
    /^([^.!?]+)\s+has\s+(.+)$/i,
    /^([^.!?]+)\s+equals\s+(.+)$/i
  ];

  for (const pattern of patterns) {
    const match = statement.match(pattern);
    if (match) {
      return {
        subject: match[1].trim(),
        predicate: pattern.source.match(/\s+(\w+)\s+/)?.[1] || 'related_to',
        object: match[2].trim()
      };
    }
  }

  return null;
}

function isContradiction(obj1, obj2) {
  // Simple contradiction detection
  if (obj1 === obj2) return false;

  const obj1Lower = obj1.toLowerCase();
  const obj2Lower = obj2.toLowerCase();

  // Direct opposites
  const opposites = [
    ['true', 'false'], ['yes', 'no'], ['hot', 'cold'],
    ['big', 'small'], ['tall', 'short'], ['fast', 'slow']
  ];

  for (const [a, b] of opposites) {
    if ((obj1Lower.includes(a) && obj2Lower.includes(b)) ||
        (obj1Lower.includes(b) && obj2Lower.includes(a))) {
      return true;
    }
  }

  return false;
}

// POST /fact - Add fact to knowledge graph
app.post('/fact', (req, res) => {
  const { subject, predicate, object, source, reliability } = req.body;

  if (!subject || !predicate || !object) {
    return res.status(400).json({ error: 'subject, predicate, and object are required' });
  }

  addFact(subject, predicate, object, source || 'unknown', reliability || 0.8);

  res.json({ success: true });
});

// POST /verify - Verify statement
app.post('/verify', (req, res) => {
  const { statement, source } = req.body;

  if (!statement) {
    return res.status(400).json({ error: 'Statement is required' });
  }

  // Add statement itself as a potential fact
  if (source) {
    const parsed = parseStatement(statement);
    if (parsed) {
      addFact(parsed.subject, parsed.predicate, parsed.object, source, 0.9);
    }
  }

  const result = verifyFact(statement);

  res.json(result);
});

// POST /verify/batch - Batch verify
app.post('/verify/batch', (req, res) => {
  const { statements } = req.body;

  if (!statements || !Array.isArray(statements)) {
    return res.status(400).json({ error: 'Statements array is required' });
  }

  const results = statements.map(s => verifyFact(s));

  res.json({
    results,
    summary: {
      verified: results.filter(r => r.verified).length,
      disputed: results.filter(r => r.verdict === 'disputed').length,
      unverified: results.filter(r => r.verdict === 'unverified').length
    }
  });
});

// GET /graph - Query knowledge graph
app.get('/graph', (req, res) => {
  const { subject, predicate } = req.query;

  if (subject && predicate) {
    const key = `${subject}|${predicate}`;
    const facts = knowledgeGraph.get(key) || [];
    return res.json({ facts });
  }

  const facts = [];
  for (const [key, value] of knowledgeGraph) {
    const [subject, predicate] = key.split('|');
    facts.push({ subject, predicate, facts: value });
  }

  res.json({ graph: facts, count: facts.length });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'verification-engine', port: PORT, facts: knowledgeGraph.size });
});

app.listen(PORT, () => {
  console.log(`Verification Engine running on port ${PORT}`);
});

export default app;
