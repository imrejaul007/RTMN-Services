import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

// Initialize OpenAI client
export function initializeOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('OpenAI API key not configured');
    return null;
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

// Get OpenAI client
export function getOpenAI(): OpenAI | null {
  if (!openaiClient) {
    return initializeOpenAI();
  }
  return openaiClient;
}

// Sentiment result interface
export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  intent?: string;
  keyPhrases?: string[];
}

// Analyze sentiment of text using OpenAI
export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  const client = getOpenAI();

  if (!client) {
    // Fallback to basic keyword-based analysis
    return analyzeSentimentBasic(text);
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a customer service sentiment analyzer. Analyze the following transcript and provide:
1. Overall sentiment: positive, neutral, or negative
2. Confidence score (0-1)
3. Primary intent (e.g., complaint, inquiry, praise, cancellation request, billing question)
4. Key phrases that indicate sentiment

Respond in JSON format:
{
  "sentiment": "positive|neutral|negative",
  "confidence": 0.0-1.0,
  "intent": "primary intent category",
  "keyPhrases": ["phrase1", "phrase2", "phrase3"]
}`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const result = JSON.parse(content);
      return {
        sentiment: result.sentiment || 'neutral',
        confidence: result.confidence || 0.5,
        intent: result.intent,
        keyPhrases: result.keyPhrases || []
      };
    }

    return analyzeSentimentBasic(text);
  } catch (error) {
    console.error('Error analyzing sentiment with OpenAI:', error);
    return analyzeSentimentBasic(text);
  }
}

// Basic keyword-based sentiment analysis (fallback)
function analyzeSentimentBasic(text: string): SentimentResult {
  const lowerText = text.toLowerCase();

  const positiveWords = [
    'thank', 'thanks', 'great', 'excellent', 'amazing', 'wonderful', 'good',
    'helpful', 'appreciate', 'love', 'best', 'perfect', 'awesome', 'fantastic',
    'satisfied', 'happy', 'pleased', 'delighted', 'impressed', 'recommend'
  ];

  const negativeWords = [
    'angry', 'frustrated', 'terrible', 'awful', 'horrible', 'worst', 'bad',
    'disappointed', 'upset', 'annoyed', 'hate', 'never', 'complaint', 'problem',
    'issue', 'broken', 'fail', 'refund', 'cancel', 'lawsuit', 'unacceptable',
    'ridiculous', 'outrageous', 'furious', 'speak to manager'
  ];

  const inquiryWords = [
    'what', 'how', 'when', 'where', 'why', 'can i', 'could you', 'would you',
    'is there', 'do you', 'question', 'wondering', 'curious', 'information'
  ];

  const praiseWords = [
    'great job', 'well done', 'excellent service', 'thank you so much',
    'really appreciate', 'amazing help', 'brilliant', 'outstanding'
  ];

  const complaintWords = [
    'problem', 'issue', 'not working', 'broken', 'failed', 'wrong',
    'mistake', 'error', 'bad experience', 'disappointed', 'unhappy'
  ];

  const billingWords = [
    'charge', 'bill', 'payment', 'invoice', 'cost', 'price', 'fee',
    'subscription', 'refund', 'credit', 'debit', 'account'
  ];

  const cancellationWords = [
    'cancel', 'cancellation', 'end', 'stop', 'unsubscribe', 'close account',
    'terminate', 'no longer', 'remove'
  ];

  let positiveCount = 0;
  let negativeCount = 0;
  let inquiryCount = 0;

  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });

  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });

  inquiryWords.forEach(word => {
    if (lowerText.includes(word)) inquiryCount++;
  });

  let intent = 'general inquiry';
  if (complaintWords.some(w => lowerText.includes(w))) {
    intent = 'complaint';
  } else if (billingWords.some(w => lowerText.includes(w))) {
    intent = 'billing question';
  } else if (cancellationWords.some(w => lowerText.includes(w))) {
    intent = 'cancellation request';
  } else if (praiseWords.some(w => lowerText.includes(w))) {
    intent = 'praise';
  } else if (inquiryCount > 2) {
    intent = 'inquiry';
  }

  // Calculate sentiment
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  let confidence = 0.5;

  if (negativeCount > positiveCount && negativeCount > 0) {
    sentiment = 'negative';
    confidence = Math.min(0.5 + (negativeCount - positiveCount) * 0.1, 0.95);
  } else if (positiveCount > negativeCount && positiveCount > 0) {
    sentiment = 'positive';
    confidence = Math.min(0.5 + (positiveCount - negativeCount) * 0.1, 0.95);
  }

  // Extract key phrases
  const keyPhrases: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

  sentences.slice(0, 3).forEach(sentence => {
    const trimmed = sentence.trim();
    if (trimmed.length <= 100) {
      keyPhrases.push(trimmed);
    } else {
      keyPhrases.push(trimmed.substring(0, 100) + '...');
    }
  });

  return {
    sentiment,
    confidence,
    intent,
    keyPhrases
  };
}

// Analyze sentiment from multiple transcripts
export async function analyzeBatchSentiment(
  transcripts: { id: string; text: string }[]
): Promise<{ id: string; result: SentimentResult }[]> {
  const results = [];

  for (const { id, text } of transcripts) {
    const result = await analyzeSentiment(text);
    results.push({ id, result });
  }

  return results;
}

// Get sentiment trends
export function aggregateSentiment(
  results: SentimentResult[]
): { sentiment: string; count: number; percentage: number }[] {
  const counts: Record<string, number> = {
    positive: 0,
    neutral: 0,
    negative: 0
  };

  results.forEach(r => {
    counts[r.sentiment]++;
  });

  const total = results.length || 1;

  return Object.entries(counts).map(([sentiment, count]) => ({
    sentiment,
    count,
    percentage: ((count / total) * 100).toFixed(2) + '%'
  }));
}

export default {
  initializeOpenAI,
  getOpenAI,
  analyzeSentiment,
  analyzeBatchSentiment,
  aggregateSentiment
};
