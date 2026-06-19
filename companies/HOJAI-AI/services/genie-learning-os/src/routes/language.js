/**
 * Language Routes - Language Learning
 */

import express from 'express';

const router = express.Router();

const LANGUAGES = {
  english: { name: 'English', native: 'English', level: 'A1-C2' },
  hindi: { name: 'Hindi', native: 'हिंदी', level: 'A1-C2' },
  arabic: { name: 'Arabic', native: 'العربية', level: 'A1-C2' },
  japanese: { name: 'Japanese', native: '日本語', level: 'A1-C2' },
  french: { name: 'French', native: 'Français', level: 'A1-C2' },
  spanish: { name: 'Spanish', native: 'Español', level: 'A1-C2' },
  german: { name: 'German', native: 'Deutsch', level: 'A1-C2' }
};

/**
 * GET /language
 * List available languages
 */
router.get('/language', (req, res) => {
  res.json({ success: true, languages: LANGUAGES });
});

/**
 * POST /language/lesson
 * Get language lesson
 */
router.post('/language/lesson', async (req, res) => {
  const { language, level, topic } = req.body;

  const lessons = {
    basics: ['Greetings', 'Numbers', 'Colors', 'Family', 'Food'],
    intermediate: ['Travel', 'Shopping', 'Restaurant', 'Directions', 'Work'],
    advanced: ['Business', 'News', 'Culture', 'Debate', 'Literature']
  };

  const topics = level === 'beginner' ? lessons.basics : level === 'intermediate' ? lessons.intermediate : lessons.advanced;

  res.json({
    success: true,
    lesson: {
      language,
      level,
      topic: topic || topics[0],
      vocabulary: generateVocabulary(language, topic || topics[0]),
      phrases: generatePhrases(language, topic || topics[0]),
      grammar: generateGrammar(language, topic || topics[0]),
      exercise: generateExercise(language, topic || topics[0])
    }
  });
});

/**
 * POST /language/practice
 * Practice speaking
 */
router.post('/language/practice', async (req, res) => {
  const { language, scenario } = req.body;

  const scenarios = {
    restaurant: {
      prompt: 'Order food at a restaurant',
      roleplay: `You: "I'd like to order..."`,
      vocabulary: ['menu', 'order', 'bill', 'recommend', 'delicious']
    },
    travel: {
      prompt: 'Ask for directions',
      roleplay: `You: "Excuse me, where is..."`,
      vocabulary: ['station', 'hotel', 'airport', 'left', 'right', 'straight']
    },
    shopping: {
      prompt: 'Buy something at a store',
      roleplay: `You: "How much is this?"`,
      vocabulary: ['price', 'size', 'color', 'cheap', 'expensive']
    }
  };

  const scenarioData = scenarios[scenario] || scenarios.restaurant;

  res.json({
    success: true,
    practice: {
      language,
      scenario,
      ...scenarioData,
      feedback: 'Practice these phrases and we\'ll review pronunciation'
    }
  });
});

function generateVocabulary(language, topic) {
  return [
    { word: 'example', translation: 'उदाहरण', pronunciation: 'udahaaran' },
    { word: 'learn', translation: 'सीखना', pronunciation: 'seekhnaa' },
    { word: 'speak', translation: 'बोलना', pronunciation: 'bolnaa' }
  ];
}

function generatePhrases(language, topic) {
  return [
    { phrase: 'Hello', response: 'नमस्ते' },
    { phrase: 'Thank you', response: 'धन्यवाद' },
    { phrase: 'How are you?', response: 'आप कैसे हैं?' }
  ];
}

function generateGrammar(language, topic) {
  return {
    rule: 'Basic sentence structure: Subject + Verb + Object',
    examples: ['I eat food', 'She reads book', 'They play game']
  };
}

function generateExercise(language, topic) {
  return {
    type: 'fill-blank',
    instruction: 'Complete the sentence',
    sentence: 'I _____ (eat) breakfast every morning.',
    answer: 'eat'
  };
}

export default router;
