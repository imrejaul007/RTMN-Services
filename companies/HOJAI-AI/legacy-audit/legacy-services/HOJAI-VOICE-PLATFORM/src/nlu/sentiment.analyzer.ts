// ============================================================================
// HOJAI VOICE PLATFORM - Sentiment Analyzer
// ============================================================================

import axios, { AxiosInstance } from 'axios';
import { openaiConfig } from '../config';
import { SentimentScore, SupportedLanguage } from '../types';

/**
 * Sentiment analysis result with scores
 */
interface SentimentAnalysis {
  label: 'positive' | 'negative' | 'neutral';
  score: number; // -1 to 1
  confidence: number;
  keywords: string[];
  intensity: 'low' | 'medium' | 'high';
}

/**
 * Sentiment word lists for different languages
 */
const SENTIMENT_WORDS: Record<string, {
  positive: string[];
  negative: string[];
  intensifiers: string[];
  negators: string[];
}> = {
  'en-IN': {
    positive: [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome',
      'love', 'like', 'happy', 'pleased', 'satisfied', 'delighted', 'perfect',
      'best', 'better', 'helpful', 'thanks', 'thank', 'appreciate', 'grateful',
      'beautiful', 'nice', 'brilliant', 'outstanding', 'superb', 'terrific',
      'namaste', 'dhanyavaad', 'shukriya', 'thankyou', 'thank you'
    ],
    negative: [
      'bad', 'terrible', 'awful', 'horrible', 'poor', 'worst', 'hate', 'dislike',
      'angry', 'frustrated', 'annoyed', 'disappointed', 'upset', 'unhappy',
      'problem', 'issue', 'trouble', 'difficult', 'hard', 'impossible',
      'slow', 'rude', 'worst', 'broken', 'failed', 'wrong', 'error',
      'not good', 'not happy', 'complaint', 'refund', 'cancel', 'waste'
    ],
    intensifiers: [
      'very', 'really', 'extremely', 'absolutely', 'completely', 'totally',
      'so', 'quite', 'incredibly', 'amazingly', 'particularly', 'especially'
    ],
    negators: [
      'not', 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere',
      "don't", "doesn't", "didn't", "won't", "wouldn't", "couldn't",
      "shouldn't", "can't", "cannot", "wasn't", "aren't", "isn't"
    ],
  },
  'hi-IN': {
    positive: [
      'accha', 'bahut accha', 'shandaar', 'badhiya', 'maja aaya', 'khush',
      'prasann', 'santosh', 'dhanyavaad', 'shukriya', ' bahut', 'theek',
      'sahi', 'thik hai', 'haan', 'haanji', 'bilkul', 'zaroor'
    ],
    negative: [
      'bura', 'bahut bura', 'kharab', 'gussa', 'nalaj', 'urosh',
      'niraasha', 'dukhi', 'samasya', 'problem', 'ruko', 'cancel',
      'band', 'khatam', 'kahan', 'nahin', 'nahi', 'kuch nahi hua'
    ],
    intensifiers: [
      'bahut', 'zyada', 'sara', 'kafi', 'bilkul', 'ekdum'
    ],
    negators: [
      'nahin', 'nahi', 'na', 'kuch', 'bhi', 'matlab'
    ],
  },
  'ta-IN': {
    positive: ['nanri', 'nandri', 'valam', 'nalla', 'sukhi', 'magizhchi'],
    negative: ['pariharam', 'samasya', 'thall', 'pudi', 'pogum'],
    intensifiers: ['miga', 'adhigam', 'katti'],
    negators: ['illa', 'alaga'],
  },
  'te-IN': {
    positive: ['ledu', 'kaalam', 'chala baga', 'tappa', 'istam'],
    negative: ['ledu', 'kastam', 'tappu', 'chesukovali'],
    intensifiers: ['chala', 'ekkuva', 'miku'],
    negators: ['ledu', 'kaadu'],
  },
};

/**
 * Emoticon sentiment patterns
 */
const EMOTICON_PATTERNS = {
  positive: [':)', ':-)', ':D', ':-D', ':P', ';)'],
  negative: [':(', ':-(', ":'", ':/'],
};

/**
 * Exclamation patterns indicating intensity
 */
const INTENSITY_PATTERNS = {
  low: /[.]$/,
  medium: /[!]{1}$/,
  high: /[!]{3,}|[!?]{2,}$/,
};

export class SentimentAnalyzer {
  private client: AxiosInstance | null = null;
  private model: string;
  private useOpenAI: boolean;

  constructor() {
    this.model = openaiConfig.model;
    this.useOpenAI = !!openaiConfig.apiKey;

    if (this.useOpenAI) {
      this.client = axios.create({
        baseURL: 'https://api.openai.com/v1',
        headers: {
          'Authorization': `Bearer ${openaiConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
    }
  }

  /**
   * Analyze sentiment of text
   */
  async analyze(text: string, language: SupportedLanguage = 'en-IN'): Promise<SentimentScore> {
    // First try rule-based analysis for speed
    const ruleBased = this.ruleBasedAnalysis(text, language);

    // If confidence is high enough, return immediately
    if (ruleBased.confidence > 0.85) {
      return this.toSentimentScore(ruleBased);
    }

    // For lower confidence or important cases, use OpenAI
    if (this.useOpenAI) {
      try {
        const openaiResult = await this.openaiAnalysis(text, language);
        return openaiResult;
      } catch (error) {
        console.warn('OpenAI sentiment analysis failed, using rule-based:', error);
      }
    }

    return this.toSentimentScore(ruleBased);
  }

  /**
   * Batch analyze sentiment for multiple texts
   */
  async analyzeBatch(texts: string[], language: SupportedLanguage = 'en-IN'): Promise<SentimentScore[]> {
    const results: SentimentScore[] = [];

    for (const text of texts) {
      const result = await this.analyze(text, language);
      results.push(result);
    }

    return results;
  }

  /**
   * Rule-based sentiment analysis
   */
  private ruleBasedAnalysis(text: string, language: SupportedLanguage): SentimentAnalysis {
    const normalizedText = text.toLowerCase().trim();
    const words = normalizedText.split(/\s+/);

    const sentimentLexicon = SENTIMENT_WORDS[language] || SENTIMENT_WORDS['en-IN'];

    let positiveScore = 0;
    let negativeScore = 0;
    let intensifierCount = 0;
    let negatorCount = 0;
    const keywords: string[] = [];

    // Check emoticons
    for (const emoticon of EMOTICON_PATTERNS.positive) {
      if (normalizedText.includes(emoticon)) {
        positiveScore += 0.5;
        keywords.push(emoticon);
      }
    }
    for (const emoticon of EMOTICON_PATTERNS.negative) {
      if (normalizedText.includes(emoticon)) {
        negativeScore += 0.5;
        keywords.push(emoticon);
      }
    }

    // Word-level analysis
    let negateNext = false;
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^\w]/g, '');

      // Check negators
      if (sentimentLexicon.negators.some(n => word.includes(n) || normalizedText.includes(n))) {
        negatorCount++;
        negateNext = true;
        continue;
      }

      // Check intensifiers
      if (sentimentLexicon.intensifiers.some(int => word.includes(int) || normalizedText.includes(int))) {
        intensifierCount++;
        continue;
      }

      // Check positive words
      if (sentimentLexicon.positive.some(p => normalizedText.includes(p))) {
        const multiplier = this.getMultiplier(intensifierCount, negatorCount);
        if (negateNext) {
          negativeScore += 0.5 * multiplier;
        } else {
          positiveScore += 0.5 * multiplier;
        }
        keywords.push(...sentimentLexicon.positive.filter(p => normalizedText.includes(p)));
        negateNext = false;
        intensifierCount = 0;
        negatorCount = 0;
      }

      // Check negative words
      if (sentimentLexicon.negative.some(n => normalizedText.includes(n))) {
        const multiplier = this.getMultiplier(intensifierCount, negatorCount);
        if (negateNext) {
          positiveScore += 0.5 * multiplier;
        } else {
          negativeScore += 0.5 * multiplier;
        }
        keywords.push(...sentimentLexicon.negative.filter(n => normalizedText.includes(n)));
        negateNext = false;
        intensifierCount = 0;
        negatorCount = 0;
      }
    }

    // Calculate final score
    const totalScore = positiveScore + negativeScore;
    let score = 0;
    let label: 'positive' | 'negative' | 'neutral';

    if (totalScore === 0) {
      label = 'neutral';
      score = 0;
    } else if (positiveScore > negativeScore) {
      label = 'positive';
      score = positiveScore / (positiveScore + negativeScore);
    } else {
      label = 'negative';
      score = -negativeScore / (positiveScore + negativeScore);
    }

    // Calculate confidence
    const confidence = Math.min(totalScore / 2, 1);

    // Determine intensity
    let intensity: 'low' | 'medium' | 'high' = 'low';
    if (normalizedText.match(INTENSITY_PATTERNS.high)) {
      intensity = 'high';
    } else if (normalizedText.match(INTENSITY_PATTERNS.medium)) {
      intensity = 'medium';
    }

    return {
      label,
      score,
      confidence,
      keywords: [...new Set(keywords)],
      intensity,
    };
  }

  /**
   * OpenAI-based sentiment analysis
   */
  private async openaiAnalysis(text: string, language: SupportedLanguage): Promise<SentimentScore> {
    const languageInstruction = this.getLanguageInstruction(language);

    const prompt = `${languageInstruction}

Analyze the sentiment of the following text and respond with a JSON object:
{
  "label": "positive" | "negative" | "neutral",
  "score": -1.0 to 1.0 (negative = very negative, positive = very positive),
  "confidence": 0.0 to 1.0
}

Text: "${text}"

Respond only with the JSON object.`;

    const response = await this.client!.post('/chat/completions', {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a sentiment analysis assistant. Analyze the text and provide sentiment scores.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 100,
    });

    const content = response.data.choices[0]?.message?.content || '{}';

    try {
      const result = JSON.parse(content);
      return {
        label: result.label || 'neutral',
        score: Math.max(-1, Math.min(1, result.score || 0)),
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      };
    } catch {
      // Fallback to rule-based if JSON parsing fails
      const ruleBased = this.ruleBasedAnalysis(text, language);
      return this.toSentimentScore(ruleBased);
    }
  }

  /**
   * Get multiplier based on intensifiers and negators
   */
  private getMultiplier(intensifierCount: number, negatorCount: number): number {
    let multiplier = 1;

    if (intensifierCount > 0) {
      multiplier += intensifierCount * 0.3;
    }

    if (negatorCount > 0) {
      multiplier *= 0.5; // Negators flip the sentiment
    }

    return Math.min(multiplier, 2); // Cap at 2x
  }

  /**
   * Get language-specific instruction
   */
  private getLanguageInstruction(language: SupportedLanguage): string {
    const instructions: Record<string, string> = {
      'hi-IN': 'The text is in Hindi.',
      'ta-IN': 'The text is in Tamil.',
      'te-IN': 'The text is in Telugu.',
      'bn-IN': 'The text is in Bengali.',
      'kn-IN': 'The text is in Kannada.',
      'ml-IN': 'The text is in Malayalam.',
      'mr-IN': 'The text is in Marathi.',
      'gu-IN': 'The text is in Gujarati.',
      'pa-IN': 'The text is in Punjabi.',
      'en-IN': 'The text is in English (India).',
    };

    return instructions[language] || instructions['en-IN'];
  }

  /**
   * Convert internal analysis to SentimentScore
   */
  private toSentimentScore(analysis: SentimentAnalysis): SentimentScore {
    return {
      label: analysis.label,
      score: analysis.score,
      confidence: analysis.confidence,
    };
  }

  /**
   * Detect sentiment shift in a conversation
   */
  async detectSentimentShift(
    previousSentiments: SentimentScore[],
    currentSentiment: SentimentScore
  ): Promise<{ hasShift: boolean; shiftMagnitude: number; direction: 'improving' | 'declining' | 'stable' }> {
    if (previousSentiments.length < 2) {
      return { hasShift: false, shiftMagnitude: 0, direction: 'stable' };
    }

    const recentAvg = previousSentiments.slice(-3).reduce((sum, s) => sum + s.score, 0) / Math.min(3, previousSentiments.length);
    const shiftMagnitude = Math.abs(currentSentiment.score - recentAvg);

    const threshold = 0.3; // 30% shift threshold

    if (shiftMagnitude < threshold) {
      return { hasShift: false, shiftMagnitude, direction: 'stable' };
    }

    return {
      hasShift: true,
      shiftMagnitude,
      direction: currentSentiment.score > recentAvg ? 'improving' : 'declining',
    };
  }
}

// Singleton instance
let sentimentAnalyzerInstance: SentimentAnalyzer | null = null;

export function getSentimentAnalyzer(): SentimentAnalyzer {
  if (!sentimentAnalyzerInstance) {
    sentimentAnalyzerInstance = new SentimentAnalyzer();
  }
  return sentimentAnalyzerInstance;
}

export default SentimentAnalyzer;
