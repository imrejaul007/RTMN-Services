import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4764;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Journey store
const journeys = new Map();
const emotions = ['happy', 'sad', 'angry', 'frustrated', 'anxious', 'neutral', 'excited', 'confused'];

// Analyze emotional journey
function analyzeJourney(emotionSequence) {
  if (!emotionSequence || emotionSequence.length === 0) {
    return { journey: [], analysis: null };
  }

  const analysis = {
    startEmotion: emotionSequence[0].emotion,
    endEmotion: emotionSequence[emotionSequence.length - 1].emotion,
    transitions: countTransitions(emotionSequence),
    peaks: findPeaks(emotionSequence),
    valleys: findValleys(emotionSequence),
    volatility: calculateVolatility(emotionSequence),
    overallTrajectory: calculateTrajectory(emotionSequence)
  };

  return { journey: emotionSequence, analysis };
}

function countTransitions(sequence) {
  let transitions = 0;
  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i].emotion !== sequence[i-1].emotion) {
      transitions++;
    }
  }
  return transitions;
}

function findPeaks(sequence) {
  const peaks = [];
  for (let i = 1; i < sequence.length - 1; i++) {
    const prev = sequence[i-1].intensity || 0.5;
    const curr = sequence[i].intensity || 0.5;
    const next = sequence[i+1].intensity || 0.5;
    if (curr > prev && curr > next) {
      peaks.push({ emotion: sequence[i].emotion, intensity: curr, position: i });
    }
  }
  return peaks;
}

function findValleys(sequence) {
  const valleys = [];
  for (let i = 1; i < sequence.length - 1; i++) {
    const prev = sequence[i-1].intensity || 0.5;
    const curr = sequence[i].intensity || 0.5;
    const next = sequence[i+1].intensity || 0.5;
    if (curr < prev && curr < next) {
      valleys.push({ emotion: sequence[i].emotion, intensity: curr, position: i });
    }
  }
  return valleys;
}

function calculateVolatility(sequence) {
  if (sequence.length < 2) return 0;
  let changes = 0;
  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i].emotion !== sequence[i-1].emotion) changes++;
  }
  return changes / (sequence.length - 1);
}

function calculateTrajectory(sequence) {
  const start = sequence[0].intensity || 0.5;
  const end = sequence[sequence.length - 1].intensity || 0.5;

  if (end > start + 0.2) return 'improving';
  if (end < start - 0.2) return 'declining';
  return 'stable';
}

// Calculate CSAT from emotion
function predictCSAT(emotionSequence) {
  const avgIntensity = emotionSequence.reduce((sum, e) => sum + (e.intensity || 0.5), 0) / emotionSequence.length;
  const positiveEmotions = ['happy', 'excited'].filter(e =>
    emotionSequence.some(s => s.emotion === e)
  ).length;
  const negativeEmotions = ['angry', 'frustrated', 'sad'].filter(e =>
    emotionSequence.some(s => s.emotion === e)
  ).length;

  let csat = avgIntensity * 10;
  csat += positiveEmotions * 5;
  csat -= negativeEmotions * 10;

  return Math.max(1, Math.min(10, Math.round(csat)));
}

// POST /journey/create - Create emotional journey
app.post('/journey/create', (req, res) => {
  const { conversationId, participantId, metadata } = req.body;

  const journey = {
    id: `journey-${Date.now()}`,
    conversationId,
    participantId,
    emotions: [],
    startTime: new Date().toISOString(),
    metadata: metadata || {}
  };

  journeys.set(journey.id, journey);

  res.json({ success: true, journey });
});

// POST /journey/:id/emotion - Add emotion to journey
app.post('/journey/:id/emotion', (req, res) => {
  const { id } = req.params;
  const { emotion, intensity, context } = req.body;

  const journey = journeys.get(id);
  if (!journey) {
    return res.status(404).json({ error: 'Journey not found' });
  }

  journey.emotions.push({
    emotion,
    intensity: intensity || 0.5,
    context: context || {},
    timestamp: new Date().toISOString()
  });

  res.json({ success: true });
});

// POST /journey/:id/analyze - Analyze journey
app.post('/journey/:id/analyze', (req, res) => {
  const { id } = req.params;

  const journey = journeys.get(id);
  if (!journey) {
    return res.status(404).json({ error: 'Journey not found' });
  }

  const result = analyzeJourney(journey.emotions);
  result.csat = predictCSAT(journey.emotions);
  result.duration = Date.now() - new Date(journey.startTime).getTime();

  res.json(result);
});

// GET /journey/:id - Get journey details
app.get('/journey/:id', (req, res) => {
  const { id } = req.params;
  const journey = journeys.get(id);

  if (!journey) {
    return res.status(404).json({ error: 'Journey not found' });
  }

  const result = analyzeJourney(journey.emotions);

  res.json({ journey, analysis: result.analysis });
});

// POST /journey/:id/compare - Compare journeys
app.post('/journey/:id/compare', (req, res) => {
  const { id } = req.params;
  const { otherJourneyId } = req.body;

  const journey1 = journeys.get(id);
  const journey2 = journeys.get(otherJourneyId);

  if (!journey1 || !journey2) {
    return res.status(404).json({ error: 'Journey not found' });
  }

  const analysis1 = analyzeJourney(journey1.emotions);
  const analysis2 = analyzeJourney(journey2.emotions);

  const comparison = {
    duration1: journey1.emotions.length,
    duration2: journey2.emotions.length,
    volatility1: analysis1.analysis?.volatility || 0,
    volatility2: analysis2.analysis?.volatility || 0,
    trajectory1: analysis1.analysis?.overallTrajectory || 'unknown',
    trajectory2: analysis2.analysis?.overallTrajectory || 'unknown',
    csat1: predictCSAT(journey1.emotions),
    csat2: predictCSAT(journey2.emotions)
  };

  res.json({ comparison });
});

// GET /journeys - List all journeys
app.get('/journeys', (req, res) => {
  const { participantId } = req.query;

  let result = Array.from(journeys.values());
  if (participantId) {
    result = result.filter(j => j.participantId === participantId);
  }

  res.json({ journeys: result, count: result.length });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'emotional-journey', port: PORT, journeys: journeys.size });
});

app.listen(PORT, () => {
  console.log(`Emotional Journey running on port ${PORT}`);
});

export default app;
