import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4760;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Emotion categories
const EMOTIONS = {
  happy: 'joy',
  sad: 'sorrow',
  angry: 'frustration',
  fearful: 'anxiety',
  surprised: 'startle',
  disgusted: 'aversion',
  neutral: 'calm'
};

// Emotion dimensions
const DIMENSIONS = ['valence', 'arousal', 'dominance'];

// Extract prosodic features from audio metadata
function extractProsodicFeatures(audioData) {
  // In production, this would use audio analysis libraries
  // For now, simulate feature extraction
  return {
    pitch: audioData.pitch || Math.random() * 100,
    energy: audioData.energy || Math.random() * 100,
    speechRate: audioData.speechRate || 150 + Math.random() * 50,
    pauseFrequency: audioData.pauseFrequency || Math.random() * 10,
    jitter: audioData.jitter || Math.random() * 5,
    shimmer: audioData.shimmer || Math.random() * 5
  };
}

// Classify emotion from features
function classifyEmotion(features) {
  const scores = {};

  // Rule-based emotion classification with priority ordering
  // Check anger FIRST (high energy + fast speech is most distinctive for anger)
  if (features.energy > 80 && features.speechRate > 190) {
    scores.angry = 0.9 + Math.random() * 0.1;
  }

  // High pitch + fast speech + pauses = anxiety
  if (features.pitch > 80 && features.speechRate > 180 && features.pauseFrequency > 5) {
    scores.fearful = 0.75 + Math.random() * 0.2;
    scores.anxious = 0.7 + Math.random() * 0.2;
  }

  // Low energy + slow speech = sadness
  if (features.energy < 40 && features.speechRate < 130) {
    scores.sad = 0.7 + Math.random() * 0.2;
  }

  // High energy + positive pitch = excitement (only if not angry)
  // Anger takes priority - excited/happy is lower arousal than angry
  if (features.energy > 70 && features.pitch > 70 && !scores.angry) {
    scores.happy = 0.8 + Math.random() * 0.2;
    scores.excited = 0.7 + Math.random() * 0.2;
  }

  // Normal features = neutral
  scores.neutral = 0.5 + Math.random() * 0.3;

  // Calculate dimensions
  const valence = (scores.happy || 0) - (scores.sad || 0) + (scores.angry || 0) * -0.5;
  const arousal = features.energy / 100;
  const dominance = (scores.angry || 0) * 0.8 - (scores.fearful || 0) * 0.5;

  return {
    emotions: normalizeScores(scores),
    dimensions: {
      valence: Math.max(0, Math.min(1, (valence + 1) / 2)),
      arousal: Math.max(0, Math.min(1, arousal)),
      dominance: Math.max(0, Math.min(1, (dominance + 1) / 2))
    }
  };
}

function normalizeScores(scores) {
  const max = Math.max(...Object.values(scores));
  const normalized = {};

  for (const [emotion, score] of Object.entries(scores)) {
    normalized[emotion] = Math.round((score / max) * 100) / 100;
  }

  return normalized;
}

// POST /analyze - Analyze audio for emotions
app.post('/analyze', (req, res) => {
  const { audioData, transcription, context } = req.body;

  if (!audioData && !transcription) {
    return res.status(400).json({ error: 'audioData or transcription required' });
  }

  const features = extractProsodicFeatures(audioData || {});
  const result = classifyEmotion(features);

  // Primary emotion
  const primaryEmotion = Object.entries(result.emotions)
    .sort((a, b) => b[1] - a[1])[0];

  res.json({
    primary: { emotion: primaryEmotion[0], confidence: primaryEmotion[1] },
    emotions: result.emotions,
    dimensions: result.dimensions,
    features,
    context: context || 'general',
    timestamp: new Date().toISOString()
  });
});

// POST /analyze/stream - Analyze streaming audio
app.post('/analyze/stream', (req, res) => {
  const { segments } = req.body;

  if (!segments || !Array.isArray(segments)) {
    return res.status(400).json({ error: 'Segments array required' });
  }

  const results = segments.map((segment, i) => {
    const features = extractProsodicFeatures(segment.audioData || {});
    const emotion = classifyEmotion(features);
    const primary = Object.entries(emotion.emotions)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      segment: i,
      start: segment.start,
      end: segment.end,
      primary: { emotion: primary[0], confidence: primary[1] },
      emotions: emotion.emotions,
      dimensions: emotion.dimensions
    };
  });

  // Calculate emotional trajectory
  const trajectory = calculateTrajectory(results);

  res.json({
    segments: results,
    trajectory,
    summary: {
      dominant: getMostCommon(results.map(r => r.primary.emotion)),
      avgArousal: results.reduce((sum, r) => sum + r.dimensions.arousal, 0) / results.length,
      avgValence: results.reduce((sum, r) => sum + r.dimensions.valence, 0) / results.length
    }
  });
});

function calculateTrajectory(segments) {
  const emotions = segments.map(s => s.primary.emotion);
  const transitions = [];

  for (let i = 1; i < emotions.length; i++) {
    if (emotions[i] !== emotions[i-1]) {
      transitions.push({
        from: emotions[i-1],
        to: emotions[i],
        at: segments[i].start
      });
    }
  }

  return transitions;
}

function getMostCommon(arr) {
  const counts = {};
  for (const item of arr) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// GET /emotions - List available emotions
app.get('/emotions', (req, res) => {
  res.json({
    categories: EMOTIONS,
    dimensions: DIMENSIONS
  });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'voice-emotion-detection', port: PORT });
});

app.listen(PORT, () => {
  console.log(`Voice Emotion Detection running on port ${PORT}`);
});

export default app;
