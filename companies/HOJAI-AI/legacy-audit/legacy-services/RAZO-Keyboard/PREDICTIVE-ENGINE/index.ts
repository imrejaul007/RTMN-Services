/**
 * RAZO PREDICTIVE ENGINE
 * Next-word prediction, autocorrect, emoji suggestions
 *
 * This is the CORE missing piece for production readiness
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

const PORT = parseInt(process.env.PORT || '4640', 10);

// ============================================
// PREDICTIVE LANGUAGE MODEL
// ============================================

// N-gram model for next-word prediction
// In production, use transformer model (T5, GPT)
// For MVP, use n-gram with smoothing

interface NGramModel {
  unigrams: Map<string, number>;
  bigrams: Map<string, Map<string, number>>;
  trigrams: Map<string, Map<string, number>>;
  contexts: Map<string, string[]>; // context → possible completions
}

// Indian English corpus (sample)
const TRAINING_CORPUS = [
  // Common phrases
  "thank you",
  "thanks for",
  "could you",
  "would you",
  "please let",
  "let me know",
  "i think",
  "i believe",
  "we should",
  "let us",
  "as per",
  "please find",
  "attaching the",
  "looking forward to",
  "do the needful",
  "kindly advise",
  "please confirm",
  "regards",
  "best regards",
  "thanks and regards",

  // Business
  "project status",
  "timeline for",
  "budget for",
  "meeting at",
  "call at",
  "report on",
  "update on",
  "details of",
  "requirement for",

  // Hinglish
  "kya haal hai",
  "sab theek hai",
  "kal milte hain",
  "food order",
  "cab book",
  "flight book",
  "hotel book",

  // Informal
  "sounds good",
  "will do",
  "got it",
  "no problem",
  "see you",
  "talk later",
];

// Build model from corpus
class PredictiveModel {
  private model: NGramModel;
  private contextHistory: string[] = [];

  constructor() {
    this.model = {
      unigrams: new Map(),
      bigrams: new Map(),
      trigrams: new Map(),
      contexts: new Map(),
    };
    this.train(TRAINING_CORPUS);
  }

  train(corpus: string[]) {
    for (const phrase of corpus) {
      const words = phrase.toLowerCase().split(' ');

      // Unigrams
      for (const word of words) {
        this.model.unigrams.set(word, (this.model.unigrams.get(word) || 0) + 1);
      }

      // Bigrams
      for (let i = 0; i < words.length - 1; i++) {
        const key = words[i];
        if (!this.model.bigrams.has(key)) {
          this.model.bigrams.set(key, new Map());
        }
        const next = this.model.bigrams.get(key)!;
        next.set(words[i + 1], (next.get(words[i + 1]) || 0) + 1);
      }

      // Trigrams
      for (let i = 0; i < words.length - 2; i++) {
        const key = `${words[i]} ${words[i + 1]}`;
        if (!this.model.trigrams.has(key)) {
          this.model.trigrams.set(key, new Map());
        }
        const next = this.model.trigrams.get(key)!;
        next.set(words[i + 2], (next.get(words[i + 2]) || 0) + 1);
      }
    }
  }

  predict(context: string, limit = 5): string[] {
    const words = context.toLowerCase().split(' ').filter(w => w.length > 0);

    if (words.length === 0) {
      // Return most common words
      return this.getTopUnigrams(limit);
    }

    // Try trigram first
    if (words.length >= 2) {
      const trigramKey = `${words[words.length - 2]} ${words[words.length - 1]}`;
      const predictions = this.model.trigrams.get(trigramKey);
      if (predictions && predictions.size > 0) {
        return this.sortAndLimit(predictions, limit);
      }
    }

    // Fall back to bigram
    const lastWord = words[words.length - 1];
    const predictions = this.model.bigrams.get(lastWord);
    if (predictions && predictions.size > 0) {
      return this.sortAndLimit(predictions, limit);
    }

    // Fall back to unigrams
    return this.getTopUnigrams(limit);
  }

  private getTopUnigrams(limit: number): string[] {
    const sorted = [...this.model.unigrams.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word);
    return sorted;
  }

  private sortAndLimit(map: Map<string, number>, limit: number): string[] {
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word);
  }

  updateWithInput(text: string) {
    // Learn from user input
    const words = text.toLowerCase().split(' ');

    for (let i = 0; i < words.length - 1; i++) {
      if (!this.model.bigrams.has(words[i])) {
        this.model.bigrams.set(words[i], new Map());
      }
      const next = this.model.bigrams.get(words[i])!;
      next.set(words[i + 1], (next.get(words[i + 1]) || 0) + 0.5);
    }
  }
}

const predictiveModel = new PredictiveModel();

// ============================================
// AUTOCORRECT ENGINE
// ============================================

// Common spelling mistakes for Indian English
const COMMON_MISSPELLINGS: Record<string, string> = {
  // Common mistakes
  "recieve": "receive",
  "definately": "definitely",
  "occured": "occurred",
  "seperate": "separate",
  "untill": "until",
  "thier": "their",
  "wierd": "weird",
  "alot": "a lot",
  "goverment": "government",
  "persue": "pursue",

  // Indian English
  "faltu": "useless",
  "baccha": "child",
  "log": "people",
  "padhna": "study",
  "ghum": "rest",
  "sick": "ill",
  "prepone": "advance",

  // Common typos
  "teh": "the",
  "adn": "and",
  "taht": "that",
  "wht": "what",
  "hw": "how",
  "ur": "your",
  "txt": "text",
  "pls": "please",
  "thx": "thanks",
  "wud": "would",
  "cud": "could",
  "shud": "should",
  "cnt": "can't",
  "dnt": "don't",
  "wont": "won't",
  "didnt": "didn't",
  "doesnt": "doesn't",
  "im": "I'm",
  "dont": "don't",
  "cant": "can't",
  "wont": "won't",
  "isnt": "isn't",
  "arent": "aren't",
  "wasnt": "wasn't",
  "werent": "weren't",
  "hasnt": "hasn't",
  "havent": "haven't",
  "hadnt": "hadn't",
};

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function suggestCorrections(word: string, dictionary: string[], maxDistance = 2): string[] {
  const suggestions: { word: string; distance: number }[] = [];

  for (const dictWord of dictionary) {
    const distance = levenshtein(word.toLowerCase(), dictWord.toLowerCase());
    if (distance <= maxDistance && distance > 0) {
      suggestions.push({ word: dictWord, distance });
    }
  }

  return suggestions
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
    .map(s => s.word);
}

function autocorrect(text: string): { corrected: string; changes: Array<{ original: string; corrected: string; reason: string }> } {
  const words = text.split(' ');
  const changes: Array<{ original: string; corrected: string; reason: string }> = [];
  const correctedWords: string[] = [];

  for (const word of words) {
    const lowerWord = word.toLowerCase();

    // Check direct misspellings
    if (COMMON_MISSPELLINGS[lowerWord]) {
      changes.push({
        original: word,
        corrected: COMMON_MISSPELLINGS[lowerWord],
        reason: 'common_misspelling'
      });
      correctedWords.push(COMMON_MISSPELLINGS[lowerWord]);
    }
    // Check dictionary for fuzzy match
    else if (word.length > 3) {
      const suggestions = suggestCorrections(word, [...COMMON_MISSPELLINGS.values()], 2);
      if (suggestions.length > 0) {
        changes.push({
          original: word,
          corrected: suggestions[0],
          reason: 'fuzzy_match'
        });
        correctedWords.push(suggestions[0]);
      } else {
        correctedWords.push(word);
      }
    } else {
      correctedWords.push(word);
    }
  }

  return {
    corrected: correctedWords.join(' '),
    changes
  };
}

// ============================================
// EMOJI SUGGESTIONS
// ============================================

const EMOJI_CONTEXT: Record<string, string[]> = {
  // Emotions
  "happy": ["😊", "😃", "🎉", "🙌"],
  "sad": ["😢", "😔", "😞", "💔"],
  "angry": ["😠", "😤", "💢"],
  "love": ["❤️", "💕", "😍", "🥰"],
  "laugh": ["😂", "🤣", "😄"],
  "wow": ["😮", "🤯", "😲"],
  "cool": ["😎", "👍", "✨"],
  "ok": ["👌", "✅", "👍"],
  "thinking": ["🤔", "💭", "🧐"],

  // Actions
  "working": ["💼", "📊", "📈"],
  "meeting": ["📅", "👥", "💬"],
  "phone": ["📱", "📞", "☎️"],
  "food": ["🍕", "🍔", "🍜", "🍽️"],
  "travel": ["✈️", "🚗", "🏨", "🗺️"],
  "money": ["💰", "💵", "💳", "💸"],
  "health": ["🏥", "💊", "🩺", "❤️"],
  "time": ["⏰", "⏱️", "📅", "🕐"],
  "idea": ["💡", "✨", "🧠"],
  "celebrate": ["🎉", "🥳", "🎊", "🎂"],

  // Business
  "deal": ["🤝", "💰", "✅"],
  "report": ["📊", "📄", "📑"],
  "email": ["📧", "✉️", "📬"],
  "call": ["📞", "☎️", "📲"],
  "chat": ["💬", "💭", "🗨️"],
  "team": ["👥", "👨‍💼", "👩‍💼"],
  "goal": ["🎯", "🏆", "⭐"],
  "success": ["🏆", "🎉", "✨", "💪"],

  // Hinglish
  "acha": ["👍", "✅", "😊"],
  "theek": ["👌", "✅", "👍"],
  "sahi": ["✅", "👍", "🎯"],
  "bahut": ["🔥", "💯", "✨"],
  "bhai": ["🤝", "👍", "👊"],
};

// Get emoji suggestions based on context
function suggestEmoji(text: string): string[] {
  const lowerText = text.toLowerCase();
  const suggestions: string[] = [];

  for (const [keyword, emojis] of Object.entries(EMOJI_CONTEXT)) {
    if (lowerText.includes(keyword)) {
      suggestions.push(...emojis);
    }
  }

  // Return unique emojis, limited to 5
  return [...new Set(suggestions)].slice(0, 5);
}

// ============================================
// SMART COMPLETIONS
// ============================================

const SMART_COMPLETIONS: Record<string, string[]> = {
  "thank": ["you", "you so much", "you for your time", "you very much"],
  "thanks": ["a lot", "for your help", "for understanding", "and regards"],
  "please": ["let me know", "find attached", "confirm your availability", "advise"],
  "i": ["think we should", "believe this is", "will get back to you", "am writing to"],
  "we": ["should proceed with", "need to discuss", "can arrange", "will send the"],
  "let": ["me know your thoughts", "us schedule a call", "me know if you need", "us take this forward"],
  "as": ["per our discussion", "per your request", "per the guidelines", "per the schedule"],
  "looking": ["forward to hearing from you", "forward to working together", "forward to your response"],
  "could": ["you please", "we schedule", "you let me know", "you send the"],
  "would": ["you like to", "you mind if", "it be possible to", "you be available for"],
  "do": ["the needful", "you have any questions", "you need anything else", "you agree"],
  "kindly": ["advise", "confirm", "let us know", "do the needful"],
};

// Get smart sentence completions
function getCompletions(partial: string): string[] {
  const lower = partial.toLowerCase().trim();

  // Check word completions
  for (const [key, completions] of Object.entries(SMART_COMPLETIONS)) {
    if (lower.endsWith(key)) {
      return completions;
    }
  }

  // Use predictive model
  return predictiveModel.predict(partial, 5);
}

// ============================================
// API ENDPOINTS
// ============================================

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'razo-predictive-engine',
    version: '1.0.0',
    features: ['predictions', 'autocorrect', 'emoji', 'completions']
  });
});

// Next-word predictions
app.post('/predict', (req, res) => {
  const { context, limit = 5 } = req.body;

  const predictions = predictiveModel.predict(context || '', limit);

  res.json({
    predictions,
    context
  });
});

// Autocorrect
app.post('/autocorrect', (req, res) => {
  const { text } = req.body;

  const result = autocorrect(text);

  res.json(result);
});

// Emoji suggestions
app.post('/emoji', (req, res) => {
  const { text } = req.body;

  const emojis = suggestEmoji(text);

  res.json({ emojis, context: text });
});

// Smart completions
app.post('/complete', (req, res) => {
  const { partial } = req.body;

  const completions = getCompletions(partial);

  res.json({
    completions,
    partial
  });
});

// Full suggestion (combined)
app.post('/suggest', (req, res) => {
  const { text, userId } = req.body;

  // Get all suggestions
  const predictions = predictiveModel.predict(text, 3);
  const autocorrectResult = autocorrect(text);
  const emojis = suggestEmoji(text);
  const completions = getCompletions(text);

  // Learn from user input (background)
  predictiveModel.updateWithInput(text);

  res.json({
    predictions,
    autocorrect: autocorrectResult,
    emojis,
    completions,
    context: text
  });
});

// Train on user data
app.post('/train', (req, res) => {
  const { phrases } = req.body;

  if (Array.isArray(phrases)) {
    predictiveModel.train(phrases);
  }

  res.json({ trained: true });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🎯 RAZO Predictive Engine (4640)                   ║
║                                                       ║
║   Features:                                          ║
║   • Next-word prediction                             ║
║   • Autocorrect (Indian English)                     ║
║   • Emoji suggestions                                ║
║   • Smart completions                                ║
║   • Context-aware suggestions                        ║
║                                                       ║
║   Port: ${PORT}                                           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;