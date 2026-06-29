import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4762;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Emotion to response mapping
const EMPATHY_RESPONSES = {
  frustrated: [
    "I completely understand your frustration. Let me help you resolve this.",
    "I can see this has been challenging for you. I'm here to help.",
    "I appreciate your patience. Let's work through this together."
  ],
  angry: [
    "I can hear that you're upset, and I want to help make this right.",
    "I'm truly sorry you're experiencing this. Let me prioritize your concern.",
    "Your satisfaction is important to us. Let me address this immediately."
  ],
  sad: [
    "I'm sorry to hear you're going through this. How can I help?",
    "I want to make things better for you. Please let me know what you need.",
    "I appreciate you sharing this with me. Let's find a solution."
  ],
  anxious: [
    "I understand this can be worrying. Let me reassure you that we'll get through this.",
    "Please don't worry - I'm here to help clarify everything.",
    "I know this might feel overwhelming. Let's take it step by step."
  ],
  happy: [
    "That's wonderful to hear! I'm so glad we could help.",
    "Thank you for sharing that positive experience!",
    "It's great to hear you're happy! Is there anything else I can do for you?"
  ],
  confused: [
    "Let me explain this more clearly for you.",
    "I understand this can be confusing. Let me break it down.",
    "No question is too basic! Let me help clarify."
  ]
};

// Tone modifiers for different contexts
const TONE_MODIFIERS = {
  formal: "Please accept my sincere apologies for any inconvenience caused.",
  casual: "Hey, no worries - I've got you covered!",
  professional: "I appreciate your patience as we address this matter."
};

// Generate empathetic response
function generateResponse(emotion, context = {}) {
  const { tone = 'professional', severity = 'medium' } = context;
  const responses = EMPATHY_RESPONSES[emotion] || EMPATHY_RESPONSES.confused;
  const response = responses[Math.floor(Math.random() * responses.length)];

  let final = response;

  // Add acknowledgment based on severity
  if (severity === 'high') {
    final = `I want to make sure I fully understand your concern. ${response}`;
  }

  // Modify tone
  if (tone === 'formal') {
    final = `I acknowledge your situation. ${response}`;
  }

  return final;
}

// Suggest response based on conversation context
function suggestResponses(emotion, options = {}) {
  const { count = 3, includeAlternatives = true } = options;
  const baseResponses = EMPATHY_RESPONSES[emotion] || [];

  const suggestions = baseResponses.slice(0, count).map((response, i) => ({
    id: `suggestion-${i}`,
    text: response,
    confidence: 0.9 - (i * 0.1),
    type: 'empathetic'
  }));

  if (includeAlternatives) {
    // Add action-based suggestions
    suggestions.push({
      id: 'action-1',
      text: 'Would you like me to escalate this to a specialist?',
      confidence: 0.85,
      type: 'action'
    });

    suggestions.push({
      id: 'action-2',
      text: 'Let me gather more information to help you better.',
      confidence: 0.8,
      type: 'clarification'
    });
  }

  return suggestions;
}

// POST /suggest - Generate empathetic response suggestions
app.post('/suggest', (req, res) => {
  const { emotion, context, options } = req.body;

  if (!emotion) {
    return res.status(400).json({ error: 'Emotion is required' });
  }

  const suggestions = suggestResponses(emotion.toLowerCase(), options);
  const generated = generateResponse(emotion.toLowerCase(), context);

  res.json({
    emotion,
    suggestions,
    generated,
    timestamp: new Date().toISOString()
  });
});

// POST /respond - Generate single response
app.post('/respond', (req, res) => {
  const { emotion, context } = req.body;

  if (!emotion) {
    return res.status(400).json({ error: 'Emotion is required' });
  }

  const response = generateResponse(emotion.toLowerCase(), context);

  res.json({
    emotion,
    response,
    timestamp: new Date().toISOString()
  });
});

// GET /responses/:emotion - Get all responses for emotion
app.get('/responses/:emotion', (req, res) => {
  const { emotion } = req.params;
  const responses = EMPATHY_RESPONSES[emotion.toLowerCase()] || [];

  res.json({
    emotion: emotion.toLowerCase(),
    responses,
    count: responses.length
  });
});

// GET /emotions - List all supported emotions
app.get('/emotions', (req, res) => {
  res.json({
    emotions: Object.keys(EMPATHY_RESPONSES),
    tones: Object.keys(TONE_MODIFIERS)
  });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'empathy-response-engine', port: PORT });
});

app.listen(PORT, () => {
  console.log(`Empathy Response Engine running on port ${PORT}`);
});

export default app;
