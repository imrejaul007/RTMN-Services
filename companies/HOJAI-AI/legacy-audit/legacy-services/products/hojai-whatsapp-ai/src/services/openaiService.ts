import OpenAI from 'openai';
import { KnowledgeBaseItem } from './conversationService.js';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ''
    });
  }

  /**
   * Generate AI response using GPT-4
   */
  async generateResponse(params: {
    merchantPersona: string;
    knowledgeBase: KnowledgeBaseItem[];
    userMessage: string;
    conversationHistory: ConversationMessage[];
    customerName?: string;
    customerContext?: Record<string, unknown>;
  }): Promise<{
    response: string;
    intent: string;
    confidence: number;
    tokens: number;
  }> {
    const { merchantPersona, knowledgeBase, userMessage, conversationHistory, customerName, customerContext } = params;

    // Build knowledge base text
    const kbText = this.buildKnowledgeBaseText(knowledgeBase);

    // Detect intent from message
    const intent = this.detectIntent(userMessage);

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(merchantPersona, kbText, customerName);

    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      { role: 'user', content: userMessage }
    ];

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9
      });

      const response = completion.choices[0]?.message?.content || 'Sorry, I could not process that. Please try again.';
      const tokens = completion.usage?.total_tokens || 0;

      return {
        response: this.cleanResponse(response),
        intent: intent.name,
        confidence: intent.confidence,
        tokens
      };
    } catch (error) {
      console.error('[OpenAI Service] Error:', error);
      return {
        response: this.getFallbackResponse(userMessage),
        intent: 'unknown',
        confidence: 0,
        tokens: 0
      };
    }
  }

  /**
   * Build knowledge base text for the prompt
   */
  private buildKnowledgeBaseText(items: KnowledgeBaseItem[]): string {
    if (!items || items.length === 0) {
      return 'No specific information available. Answer based on general knowledge about this business type.';
    }

    return items.map(item => {
      let text = `Q: ${item.question}\nA: ${item.answer}`;
      if (item.keywords?.length) {
        text += `\nKeywords: ${item.keywords.join(', ')}`;
      }
      return text;
    }).join('\n\n');
  }

  /**
   * Build system prompt with merchant persona and rules
   */
  private buildSystemPrompt(persona: string, kbText: string, customerName?: string): string {
    const nameGreeting = customerName ? ` The customer's name is ${customerName}.` : '';

    return `You are an AI assistant for a business.${nameGreeting}

BUSINESS PERSONA:
${persona}

KNOWLEDGE BASE:
${kbText}

RULES:
1. Always answer based on the knowledge base above
2. Keep responses short and friendly (under 100 words)
3. Use emojis sparingly and appropriately
4. If you don't know something, say "Let me check and get back to you"
5. Never make up information not in the knowledge base
6. If the customer wants to order/book, ask for details (date, time, service, etc.)
7. Always confirm orders/bookings before finalizing
8. Be helpful and proactive but not pushy
9. Respond in the same language the customer uses

IMPORTANT: Only answer based on the knowledge base. Do not invent prices, services, or policies.`;
  }

  /**
   * Detect intent from user message
   */
  private detectIntent(message: string): { name: string; confidence: number } {
    const lower = message.toLowerCase();

    // Intent patterns
    const patterns = [
      { name: 'greeting', keywords: ['hi', 'hello', 'hey', 'good morning', 'good evening', 'good afternoon'], weight: 1 },
      { name: 'pricing', keywords: ['price', 'cost', 'how much', 'charges', '₹', 'rupees', 'fee'], weight: 0.95 },
      { name: 'booking', keywords: ['book', 'appointment', 'schedule', 'slot', 'reserve', 'table for'], weight: 0.9 },
      { name: 'order', keywords: ['order', 'buy', 'purchase', 'want', 'need', 'get me'], weight: 0.9 },
      { name: 'menu', keywords: ['menu', 'what do you have', 'items', 'dishes', 'food options'], weight: 0.85 },
      { name: 'hours', keywords: ['open', 'closed', 'timing', 'hours', 'when'], weight: 0.9 },
      { name: 'location', keywords: ['address', 'where', 'location', 'directions', 'near'], weight: 0.9 },
      { name: 'support', keywords: ['help', 'issue', 'problem', 'not working', 'broken', 'refund', 'cancel', 'return'], weight: 0.85 },
      { name: 'feedback', keywords: ['feedback', 'review', 'rating', 'suggestion'], weight: 0.8 },
      { name: 'thanks', keywords: ['thank', 'thanks', 'appreciate'], weight: 0.9 },
      { name: 'goodbye', keywords: ['bye', 'goodbye', 'tata', 'see you'], weight: 0.9 }
    ];

    for (const pattern of patterns) {
      if (pattern.keywords.some(kw => lower.includes(kw))) {
        return { name: pattern.name, confidence: pattern.weight };
      }
    }

    return { name: 'general', confidence: 0.5 };
  }

  /**
   * Clean and format response
   */
  private cleanResponse(response: string): string {
    // Remove any instruction leakage
    let cleaned = response.trim();

    // Ensure it doesn't end mid-sentence
    if (!cleaned.match(/[.!?]$/)) {
      cleaned += '.';
    }

    return cleaned;
  }

  /**
   * Fallback response when OpenAI fails
   */
  private getFallbackResponse(message: string): string {
    const intent = this.detectIntent(message);

    switch (intent.name) {
      case 'greeting':
        return 'Hello! Thanks for reaching out. How can I help you today? 😊';
      case 'pricing':
        return 'I apologize, I\'m having trouble accessing our pricing right now. Could you please tell me which service you\'re interested in?';
      case 'booking':
        return 'I\'d love to help you book! Could you tell me what service you\'d like and when you\'d like to come in?';
      case 'order':
        return 'I\'d be happy to help with your order! Could you tell me what you\'d like?';
      default:
        return 'Thanks for your message! I\'m here to help. Could you please share more details?';
    }
  }

  /**
   * Generate response for template messages
   */
  async generateTemplate(params: {
    template: string;
    variables: Record<string, string>;
  }): Promise<string> {
    let { template, variables } = params;

    for (const [key, value] of Object.entries(variables)) {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return template;
  }
}

export const openaiService = new OpenAIService();
