/**
 * Reply Drafting Service
 * LLM-based customer reply generation
 */

const OpenAI = require('openai');

class ReplyDraftingService {
  constructor(config) {
    this.openai = new OpenAI({ apiKey: config.openaiKey });
    this.kbServiceUrl = config.kbServiceUrl;
  }

  // Generate reply for ticket
  async generateReply({ ticket, customer, tone = 'friendly', knowledgeBase = [] }) {
    // 1. Search KB for relevant articles
    let kbArticles = [];
    if (this.kbServiceUrl && ticket.subject) {
      try {
        const axios = require('axios');
        const response = await axios.post(`${this.kbServiceUrl}/search`, {
          query: `${ticket.subject} ${ticket.description}`,
          limit: 3,
        });
        kbArticles = response.data.articles || [];
      } catch {
        // Skip if KB unavailable
      }
    }

    // 2. Build context
    const context = this.buildContext(ticket, customer, kbArticles);

    // 3. Generate reply
    const prompt = this.buildPrompt(ticket, customer, context, tone);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        temperature: 0.5,
        max_tokens: 1000,
      });

      const reply = completion.choices[0].message.content;

      return {
        success: true,
        draft: {
          subject: this.generateSubject(ticket, ticket.subject),
          body: reply,
          tone,
          confidence: this.calculateConfidence(kbArticles),
          kbArticles: kbArticles.map(a => ({ id: a.id, title: a.title })),
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  buildContext(ticket, customer, kbArticles) {
    return {
      customer_name: customer?.name || 'Customer',
      customer_history: customer?.history || 'New customer',
      ticket_priority: ticket.priority || 'normal',
      kb_articles: kbArticles,
    };
  }

  buildPrompt(ticket, customer, context, tone) {
    const toneGuide = {
      friendly: 'warm, conversational, helpful',
      professional: 'polished, formal, business-appropriate',
      empathetic: 'understanding, caring, concerned about their problem',
      technical: 'precise, specific, includes details',
    };

    return {
      system: `You are a customer support agent. Write a ${tone} reply (${toneGuide[tone]}).

Company: HOJAI
Customer: ${context.customer_name}
Ticket priority: ${context.customer_priority}
Customer history: ${context.customer_history}

Use these KB articles if relevant:
${context.kb_articles.map(a => `- ${a.title}: ${a.content || ''}`).join('\n')}

Format:
- Start with greeting
- Acknowledge issue
- Provide solution
- Next steps

Keep it concise.`,

      user: `Subject: ${ticket.subject}

Issue: ${ticket.description}

Please draft a reply that:
1. Acknowledges the issue
2. Provides a clear solution
3. Sets expectations for next steps`,
    };
  }

  generateSubject(originalSubject, hint) {
    return `Re: ${originalSubject}`;
  }

  calculateConfidence(kbArticles) {
    // Higher confidence if we have matching KB articles
    if (kbArticles.length >= 3) return 0.95;
    if (kbArticles.length === 2) return 0.85;
    if (kbArticles.length === 1) return 0.7;
    return 0.4;
  }

  // Refine reply with feedback
  async refineReply({ originalDraft, feedback }) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a customer support agent. Refine the reply based on feedback.',
          },
          {
            role: 'user',
            content: `Original: ${originalDraft}\n\nFeedback: ${feedback}\n\nRefined:`,
          },
        ],
        temperature: 0.5,
      });

      return {
        success: true,
        draft: completion.choices[0].message.content,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = ReplyDraftingService;
