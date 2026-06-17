import axios from 'axios';
import NodeCache from 'node-cache';
import type { AIRequest, AIResponse } from '../types/index.js';
import logger from '../utils/logger.js';

// Simple rate limiter implementation
const rateLimits = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const record = rateLimits.get(key);

  if (!record || now > record.resetTime) {
    rateLimits.set(key, { count: 1, resetTime: now + windowMs });
    return;
  }

  if (record.count >= limit) {
    throw new Error('Rate limit exceeded');
  }

  record.count++;
}

// Cache for responses
const responseCache = new NodeCache({ stdTTL: 300 }); // 5 minutes

class AIIntegrationService {
  private claudeApiKey: string | undefined;
  private openaiApiKey: string | undefined;
  private anthropicEndpoint = 'https://api.anthropic.com/v1/messages';
  private openaiEndpoint = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    this.claudeApiKey = process.env.ANTHROPIC_API_KEY;
    this.openaiApiKey = process.env.OPENAI_API_KEY;
  }

  // Generate cache key
  private getCacheKey(prompt: string, model: string): string {
    return `${model}:${Buffer.from(prompt).toString('base64').slice(0, 100)}`;
  }

  // Claude API call
  async callClaude(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      checkRateLimit('claude', 50, 60000);
    } catch {
      throw new Error('Claude rate limit exceeded. Please wait and try again.');
    }

    const cacheKey = this.getCacheKey(request.prompt, 'claude');
    const cached = responseCache.get<AIResponse>(cacheKey);
    if (cached) {
      logger.info('Returning cached Claude response');
      return cached;
    }

    if (!this.claudeApiKey) {
      // Mock response for demo
      const mockResponse = this.generateMockClaudeResponse(request);
      const response: AIResponse = {
        model: 'claude-sonnet-4-20250514',
        text: mockResponse,
        latency: Date.now() - startTime
      };
      responseCache.set(cacheKey, response);
      return response;
    }

    try {
      const response = await axios.post(
        this.anthropicEndpoint,
        {
          model: 'claude-sonnet-4-20250514',
          max_tokens: request.maxTokens || 1024,
          messages: [
            { role: 'user', content: request.prompt }
          ],
          system: request.system
        },
        {
          headers: {
            'x-api-key': this.claudeApiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          timeout: 30000
        }
      );

      const responseText = response.data.content[0].text;
      const result: AIResponse = {
        model: 'claude-sonnet-4-20250514',
        text: responseText,
        usage: {
          promptTokens: response.data.usage?.input_tokens || 0,
          completionTokens: response.data.usage?.output_tokens || 0,
          totalTokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0)
        },
        latency: Date.now() - startTime
      };

      responseCache.set(cacheKey, result);
      return result;
    } catch (error: any) {
      logger.error('Claude API error:', error.message);
      throw new Error(`Claude API failed: ${error.message}`);
    }
  }

  // OpenAI GPT-4 API call
  async callOpenAI(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      checkRateLimit('openai', 60, 60000);
    } catch {
      throw new Error('OpenAI rate limit exceeded. Please wait and try again.');
    }

    const cacheKey = this.getCacheKey(request.prompt, 'gpt4');
    const cached = responseCache.get<AIResponse>(cacheKey);
    if (cached) {
      logger.info('Returning cached OpenAI response');
      return cached;
    }

    if (!this.openaiApiKey) {
      // Mock response for demo
      const mockResponse = this.generateMockOpenAIResponse(request);
      const response: AIResponse = {
        model: 'gpt-4o',
        text: mockResponse,
        latency: Date.now() - startTime
      };
      responseCache.set(cacheKey, response);
      return response;
    }

    try {
      const response = await axios.post(
        this.openaiEndpoint,
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: request.system || 'You are a helpful AI assistant.' },
            { role: 'user', content: request.prompt }
          ],
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 1024
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'content-type': 'application/json'
          },
          timeout: 30000
        }
      );

      const result: AIResponse = {
        model: 'gpt-4o',
        text: response.data.choices[0].message.content,
        usage: {
          promptTokens: response.data.usage?.prompt_tokens || 0,
          completionTokens: response.data.usage?.completion_tokens || 0,
          totalTokens: response.data.usage?.total_tokens || 0
        },
        latency: Date.now() - startTime
      };

      responseCache.set(cacheKey, result);
      return result;
    } catch (error: any) {
      logger.error('OpenAI API error:', error.message);
      throw new Error(`OpenAI API failed: ${error.message}`);
    }
  }

  // AI Model Router
  async routeRequest(request: AIRequest): Promise<AIResponse> {
    if (request.model === 'claude') {
      return this.callClaude(request);
    } else if (request.model === 'gpt4') {
      return this.callOpenAI(request);
    } else {
      // Auto-select based on availability and fallback
      try {
        return await this.callClaude(request);
      } catch (error) {
        logger.warn('Claude failed, falling back to OpenAI');
        return this.callOpenAI(request);
      }
    }
  }

  // Mock response generators
  private generateMockClaudeResponse(request: AIRequest): string {
    if (request.prompt.toLowerCase().includes('email')) {
      return this.generateEmailTemplate();
    }
    if (request.prompt.toLowerCase().includes('sentiment')) {
      return JSON.stringify({ sentiment: 'positive', score: 0.85 });
    }
    if (request.prompt.toLowerCase().includes('summarize')) {
      return 'This is a concise summary of the provided content, highlighting the key points and actionable insights.';
    }
    return 'This is a mock AI response for demonstration purposes. In production, this would be generated by Claude Sonnet 4.';
  }

  private generateMockOpenAIResponse(request: AIRequest): string {
    if (request.prompt.toLowerCase().includes('email')) {
      return this.generateEmailTemplate();
    }
    if (request.prompt.toLowerCase().includes('sentiment')) {
      return JSON.stringify({ sentiment: 'positive', score: 0.82 });
    }
    if (request.prompt.toLowerCase().includes('summarize')) {
      return 'Summary: Key findings from the conversation include interest in AI automation, need for CRM integration, and timeline for decision by end of quarter.';
    }
    return 'This is a mock AI response for demonstration purposes. In production, this would be generated by GPT-4o.';
  }

  private generateEmailTemplate(): string {
    return `Subject: Quick Question About Your Sales Process

Hi [Name],

I noticed [Company] has been growing rapidly, and I wanted to reach out about how REZ SalesMind could help streamline your sales operations.

Our AI-powered platform can help your team:
- Automate 80% of prospecting tasks
- Generate personalized emails at scale
- Analyze conversations for buying signals
- Sync seamlessly with HubSpot

Would you have 15 minutes this week for a quick demo?

Best regards,
[Your Name]
REZ SalesMind`;
  }

  // Prompt Templates for Sales Tasks
  generateEmailPrompt(lead: any, context: any): string {
    return `Generate a personalized sales email for the following prospect:

Name: ${lead.name}
Company: ${lead.company || 'Unknown'}
Title: ${lead.title || 'Unknown'}
Industry: ${lead.industry || 'General'}

Context: ${context || 'Following up on recent conversation about AI sales automation'}

The email should:
1. Be personalized and conversational
2. Be under 150 words
3. Include a clear call-to-action
4. Highlight relevant value propositions

Generate the email now.`;
  }

  generateSentimentAnalysisPrompt(text: string): string {
    return `Analyze the sentiment of this sales conversation transcript and provide:
1. Overall sentiment (positive, neutral, negative)
2. Sentiment score (0-1)
3. Key emotions detected
4. Buying signals
5. Objections raised

Transcript:
${text}

Respond in JSON format.`;
  }

  generateSummarizationPrompt(text: string): string {
    return `Summarize this sales call transcription, extracting:
1. Main topics discussed
2. Customer needs and pain points
3. Objections raised
4. Next steps agreed upon
5. Key quotes

Transcript:
${text}

Provide a structured summary.`;
  }

  // Clear cache
  clearCache(): void {
    responseCache.flushAll();
    logger.info('AI response cache cleared');
  }
}

export const aiIntegration = new AIIntegrationService();
export default aiIntegration;
