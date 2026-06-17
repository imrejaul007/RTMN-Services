import OpenAI from 'openai';
import winston from 'winston';
import type { LLMMessage, AgentSuggestion } from '../types.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

// Voice-optimized system prompt
const VOICE_SYSTEM_PROMPT = `You are a professional voice AI assistant for customer service calls.

Guidelines:
- Keep responses concise and natural for voice (30-60 words max)
- Use conversational language, avoid jargon
- Confirm understanding before taking actions
- Ask clarifying questions when needed
- Be empathetic and professional
- Never share sensitive information aloud
- Handle common queries efficiently

Available actions:
- Look up customer information
- Create support tickets
- Transfer to human agent
- Schedule appointments
- Provide account information
- Process basic requests
`;

export class LLMService {
  private client: OpenAI | null = null;
  private voiceModel: string;
  private conversationHistory: Map<string, LLMMessage[]> = new Map();

  constructor() {
    this.voiceModel = process.env.VOICE_MODEL || 'gpt-4o-audio-preview';
    this.initializeClient();
  }

  private initializeClient(): void {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.warn('OpenAI API key not configured - LLM service will not work');
      return;
    }

    this.client = new OpenAI({ apiKey });
    logger.info('LLM Service initialized', { model: this.voiceModel });
  }

  async generateResponse(
    sessionId: string,
    userMessage: string,
    context: {
      customerId?: string;
      customerName?: string;
      previousContext?: string;
      language?: string;
    } = {}
  ): Promise<string> {
    if (!this.client) {
      throw new Error('LLM client not initialized - missing API key');
    }

    // Initialize conversation history if needed
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, []);
    }

    const history = this.conversationHistory.get(sessionId)!;

    // Build messages array
    const systemMessage: LLMMessage = {
      role: 'system',
      content: VOICE_SYSTEM_PROMPT + (
        context.customerId
          ? `\n\nCustomer Context: ${context.customerName || 'Customer'} (ID: ${context.customerId})`
          : ''
      ) + (
        context.previousContext
          ? `\n\nPrevious Context: ${context.previousContext}`
          : ''
      ) + (
        context.language && context.language !== 'en-US'
          ? `\n\nLanguage: Respond in ${context.language}`
          : ''
      ),
    };

    const messages: LLMMessage[] = [
      systemMessage,
      ...history.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: userMessage },
    ];

    try {
      // Use standard chat completions for text
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: messages as any,
        max_tokens: 300,
        temperature: 0.7,
      });

      const assistantMessage = response.choices[0]?.message?.content || '';

      // Add to history
      history.push({ role: 'user', content: userMessage });
      history.push({ role: 'assistant', content: assistantMessage });

      logger.debug('LLM response generated', {
        sessionId,
        responseLength: assistantMessage.length,
      });

      return assistantMessage;
    } catch (error) {
      logger.error('LLM response generation failed', { error, sessionId });
      throw error;
    }
  }

  async getAgentSuggestions(
    transcript: Array<{ role: 'user' | 'assistant'; text: string }>,
    currentContext: Record<string, any> = {}
  ): Promise<AgentSuggestion[]> {
    if (!this.client) {
      return [];
    }

    try {
      const prompt = `Based on this call transcript, suggest 2-3 actions or responses for the agent:

Transcript:
${transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n')}

Context: ${JSON.stringify(currentContext)}

Respond with JSON array of suggestions with type, content, confidence (0-1), and reason.`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || '';

      // Try to parse JSON response
      try {
        const suggestions = JSON.parse(content);
        return Array.isArray(suggestions) ? suggestions : [];
      } catch {
        // If not valid JSON, return as single suggestion
        return [{
          type: 'information',
          content: content,
          confidence: 0.5,
          reason: 'General response suggestion',
        }];
      }
    } catch (error) {
      logger.error('Agent suggestions generation failed', { error });
      return [];
    }
  }

  async summarizeConversation(
    transcript: Array<{ role: 'user' | 'assistant'; text: string }>
  ): Promise<{ summary: string; category: string; sentiment: 'positive' | 'neutral' | 'negative' }> {
    if (!this.client) {
      return {
        summary: 'Summary unavailable (LLM not configured)',
        category: 'general',
        sentiment: 'neutral',
      };
    }

    try {
      const prompt = `Summarize this voice call conversation concisely:

${transcript.map(t => `${t.role}: ${t.text}`).join('\n')}

Respond with JSON containing: summary (2-3 sentences), category (e.g., billing, support, sales, complaint), sentiment (positive/neutral/negative).`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || '{}';

      try {
        return JSON.parse(content);
      } catch {
        return {
          summary: 'Unable to parse summary',
          category: 'general',
          sentiment: 'neutral',
        };
      }
    } catch (error) {
      logger.error('Conversation summarization failed', { error });
      return {
        summary: 'Summary unavailable due to error',
        category: 'general',
        sentiment: 'neutral',
      };
    }
  }

  clearHistory(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }

  isAvailable(): boolean {
    return this.client !== null;
  }
}

export const llmService = new LLMService();
