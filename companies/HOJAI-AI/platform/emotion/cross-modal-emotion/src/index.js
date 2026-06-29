import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4766;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Analyze text emotion
function analyzeText(text) {
  const positive = ['happy', 'joy', 'great', 'excellent', 'love', 'wonderful', 'amazing', 'good', 'fantastic'];
  const negative = ['sad', 'angry', 'frustrated', 'terrible', 'hate', 'awful', 'bad', 'horrible'];

  const words = text.toLowerCase().split(/\s+/);
  let score = 0;

  for (const word of words) {
    if (positive.includes(word)) score += 0.2;
    if (negative.includes(word)) score -= 0.2;
  }

  score = Math.max(-1, Math.min(1, score));

  return {
    emotion: score > 0.3 ? 'positive' : score < -0.3 ? 'negative' : 'neutral',
    intensity: Math.abs(score),
    score
  };
}

// Analyze voice emotion
function analyzeVoice(voiceFeatures) {
  const { pitch, energy, speechRate } = voiceFeatures;

  if (energy > 80 && speechRate > 180) {
    return { emotion: 'excited', intensity: 0.9 };
  }
  if (energy > 70 && pitch > 70) {
    return { emotion: 'happy', intensity: 0.8 };
  }
  if (energy < 40 && speechRate < 130) {
    return { emotion: 'sad', intensity: 0.7 };
  }
  if (energy > 80) {
    return { emotion: 'angry', intensity: 0.85 };
  }
  return { emotion: 'neutral', intensity: 0.5 };
}

// Combine modalities
function fuseEmotions(textEmotion, voiceEmotion) {
  const weights = { text: 0.4, voice: 0.6 };

  const emotionScores = {
    positive: textEmotion.emotion === 'positive' ? weights.text : 0,
    negative: textEmotion.emotion === 'negative' ? weights.text : 0,
    neutral: textEmotion.emotion === 'neutral' ? weights.text : 0,
    excited: voiceEmotion.emotion === 'excited' ? weights.voice : 0,
    happy: voiceEmotion.emotion === 'happy' ? weights.voice : 0,
    sad: voiceEmotion.emotion === 'sad' ? weights.voice : 0,
    angry: voiceEmotion.emotion === 'angry' ? weights.voice : 0,
  };

  const dominant = Object.entries(emotionScores).sort((a, b) => b[1] - a[1])[0];

  return {
    primaryEmotion: dominant[0],
    confidence: dominant[1],
    textEmotion,
    voiceEmotion,
    fused: true
  };
}

app.post('/analyze/text', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });
  const result = analyzeText(text);
  res.json({ text, ...result });
});

app.post('/analyze/voice', (req, res) => {
  const { pitch, energy, speechRate } = req.body;
  const result = analyzeVoice({ pitch, energy, speechRate });
  res.json({ voiceFeatures: { pitch, energy, speechRate }, ...result });
});

app.post('/analyze/fused', (req, res) => {
  const { text, voiceFeatures } = req.body;
  if (!text && !voiceFeatures) {
    return res.status(400).json({ error: 'text or voiceFeatures required' });
  }

  const textEmotion = text ? analyzeText(text) : { emotion: 'unknown', intensity: 0 };
  const voiceEmotion = voiceFeatures ? analyzeVoice(voiceFeatures) : { emotion: 'unknown', intensity: 0 };

  const result = fuseEmotions(textEmotion, voiceEmotion);
  res.json({ result });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cross-modal-emotion', port: PORT });
});

app.listen(PORT, () => console.log(`Cross-Modal Emotion running on port ${PORT}`));
export default app;
