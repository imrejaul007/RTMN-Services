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

// Summary interface
export interface CallSummary {
  summary: string;
  actionItems?: string[];
  customerSentiment?: string;
  keyPoints?: string[];
  followUp?: string;
}

// Generate AI summary from transcript
export async function generateSummary(
  transcript: string,
  direction: 'inbound' | 'outbound' = 'inbound',
  language: string = 'en'
): Promise<string> {
  const client = getOpenAI();

  if (!client) {
    return generateBasicSummary(transcript);
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a professional call center summarizer. Create a concise summary of the following phone call transcript.

For the summary, include:
1. Main reason for the call (1 sentence)
2. Key points discussed (3-5 bullets)
3. Action items or next steps (if any)
4. Customer sentiment

Keep the summary professional and under 300 words. Use ${language === 'hi' ? 'English with Hindi accents accepted' : 'English'} language.`
        },
        {
          role: 'user',
          content: `Call Direction: ${direction.toUpperCase()}\n\nTranscript:\n${transcript}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const summary = response.choices[0]?.message?.content;
    return summary || generateBasicSummary(transcript);
  } catch (error) {
    console.error('Error generating summary with OpenAI:', error);
    return generateBasicSummary(transcript);
  }
}

// Generate detailed summary
export async function generateDetailedSummary(
  transcript: string,
  direction: 'inbound' | 'outbound',
  metadata?: {
    callerName?: string;
    agentName?: string;
    callDuration?: number;
    customerId?: string;
  }
): Promise<CallSummary> {
  const client = getOpenAI();

  if (!client) {
    const basic = generateBasicSummary(transcript);
    return {
      summary: basic,
      actionItems: [],
      keyPoints: []
    };
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a professional call center analyst. Analyze this call transcript and provide a detailed summary.

Return a JSON object with:
{
  "summary": "Main reason for call (1-2 sentences)",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "actionItems": ["action item 1", "action item 2"],
  "customerSentiment": "positive/neutral/negative",
  "followUp": "Recommended follow-up (if needed)"
}

Keep it concise and professional.`
        },
        {
          role: 'user',
          content: `Call Details:
- Direction: ${direction}
${metadata?.callerName ? `- Caller: ${metadata.callerName}` : ''}
${metadata?.agentName ? `- Agent: ${metadata.agentName}` : ''}
${metadata?.callDuration ? `- Duration: ${Math.floor(metadata.callDuration / 60)} minutes` : ''}
${metadata?.customerId ? `- Customer ID: ${metadata.customerId}` : ''}

Transcript:
${transcript}`
        }
      ],
      temperature: 0.3,
      max_tokens: 600
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      try {
        return JSON.parse(content);
      } catch {
        return {
          summary: content,
          actionItems: [],
          keyPoints: []
        };
      }
    }

    const basic = generateBasicSummary(transcript);
    return {
      summary: basic,
      actionItems: [],
      keyPoints: []
    };
  } catch (error) {
    console.error('Error generating detailed summary:', error);
    const basic = generateBasicSummary(transcript);
    return {
      summary: basic,
      actionItems: [],
      keyPoints: []
    };
  }
}

// Basic rule-based summary (fallback)
function generateBasicSummary(transcript: string): string {
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);

  if (sentences.length === 0) {
    return 'No transcript available.';
  }

  // Get first and last meaningful sentences
  const first = sentences[0]?.trim() || '';
  const last = sentences[sentences.length - 1]?.trim() || '';

  // Extract key topics mentioned
  const topics: string[] = [];
  const lowerText = transcript.toLowerCase();

  const topicKeywords = [
    { topic: 'billing', keywords: ['bill', 'payment', 'charge', 'invoice', 'fee', 'cost'] },
    { topic: 'technical support', keywords: ['not working', 'error', 'bug', 'crash', 'issue', 'broken'] },
    { topic: 'account', keywords: ['account', 'login', 'password', 'access', 'profile'] },
    { topic: 'cancellation', keywords: ['cancel', 'stop service', 'end subscription'] },
    { topic: 'refund', keywords: ['refund', 'money back', 'return'] },
    { topic: 'product inquiry', keywords: ['product', 'feature', 'how to', 'information'] }
  ];

  topicKeywords.forEach(({ topic, keywords }) => {
    if (keywords.some(k => lowerText.includes(k))) {
      topics.push(topic);
    }
  });

  // Build summary
  let summary = `Call regarding: ${topics.length > 0 ? topics.join(', ') : 'general inquiry'}. `;

  if (first) {
    summary += `Customer started with: "${first.substring(0, 150)}${first.length > 150 ? '...' : ''}" `;
  }

  summary += `Call duration: approximately ${Math.ceil(sentences.length / 2)} exchange cycles.`;

  return summary;
}

// Generate summary in different languages
export async function generateSummaryLocalized(
  transcript: string,
  direction: 'inbound' | 'outbound',
  language: string = 'en'
): Promise<string> {
  const client = getOpenAI();

  if (!client) {
    return generateBasicSummary(transcript);
  }

  const languagePrompts: Record<string, string> = {
    en: 'in English',
    es: 'in Spanish',
    fr: 'in French',
    de: 'in German',
    hi: 'in Hindi',
    pt: 'in Portuguese'
  };

  const langPrompt = languagePrompts[language] || 'in English';

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Summarize this call transcript ${langPrompt}. Keep it concise (under 200 words).`
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      temperature: 0.3,
      max_tokens: 400
    });

    return response.choices[0]?.message?.content || generateBasicSummary(transcript);
  } catch (error) {
    console.error('Error generating localized summary:', error);
    return generateBasicSummary(transcript);
  }
}

// Batch generate summaries
export async function batchGenerateSummaries(
  calls: { callId: string; transcript: string; direction: 'inbound' | 'outbound' }[]
): Promise<{ callId: string; summary: string }[]> {
  const results = [];

  for (const { callId, transcript, direction } of calls) {
    const summary = await generateSummary(transcript, direction);
    results.push({ callId, summary });
  }

  return results;
}

export default {
  initializeOpenAI,
  getOpenAI,
  generateSummary,
  generateDetailedSummary,
  generateSummaryLocalized,
  batchGenerateSummaries
};
