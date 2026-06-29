import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4990;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Score confidence based on model, retrieval, and reasoning signals
function scoreConfidence({ modelSignals, retrievalSignals, reasoningSignals }) {
  const scores = {};

  // Model confidence (0-1)
  scores.model = modelSignals?.confidence || 0.5;
  scores.retrieval = retrievalSignals?.score || 0.5;
  scores.reasoning = reasoningSignals?.coherence || 0.5;

  // Weighted combination
  scores.overall = (
    scores.model * 0.4 +
    scores.retrieval * 0.35 +
    scores.reasoning * 0.25
  );

  // Confidence level
  if (scores.overall >= 0.8) {
    scores.level = 'high';
  } else if (scores.overall >= 0.5) {
    scores.level = 'medium';
  } else {
    scores.level = 'low';
  }

  return scores;
}

// POST /score - Score confidence
app.post('/score', (req, res) => {
  const { modelSignals, retrievalSignals, reasoningSignals, answer, context } = req.body;

  if (!answer) {
    return res.status(400).json({ error: 'Answer is required' });
  }

  const scores = scoreConfidence({ modelSignals, retrievalSignals, reasoningSignals });

  res.json({
    answer,
    scores,
    requiresVerification: scores.level === 'low',
    timestamp: new Date().toISOString()
  });
});

// POST /score/batch - Batch score
app.post('/score/batch', (req, res) => {
  const { answers } = req.body;

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Answers array is required' });
  }

  const results = answers.map(answer => ({
    answer,
    scores: scoreConfidence(answer),
    requiresVerification: scoreConfidence(answer).level === 'low'
  }));

  res.json({ results, count: results.length });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'confidence-scorer', port: PORT });
});

app.listen(PORT, () => {
  console.log(`Confidence Scorer running on port ${PORT}`);
});

export default app;
