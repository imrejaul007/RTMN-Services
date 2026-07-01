/**
 * Founder Mode - Strategic Communications for Founders
 *
 * Consumer Label: 📢 Share Update
 * Advanced Label: 👨‍💼 Founder Mode
 *
 * Helps founders communicate with:
 * - Investors (fundraising updates, metrics)
 * - Team (OKRs, milestones, pivots)
 * - Media (press releases, interviews)
 * - Customers (launches, features)
 * - Advisors (board updates, challenges)
 */

const axios = require('axios');

class FounderMode {
  constructor(logger, config = {}) {
    this.logger = logger;
    this.config = {
      // Service URLs
      genieGateway: config.genieGateway || process.env.GENIE_GATEWAY_URL || 'http://localhost:4701',
      corpid: config.corpid || process.env.CORPID_URL || 'http://localhost:4702',
      memoryOS: config.memoryOS || process.env.MEMORY_OS_URL || 'http://localhost:4703',
      twinOS: config.twinOS || process.env.TWIN_OS_URL || 'http://localhost:4705',

      // Founder Mode specific
      maxLength: config.maxLength || 280,
      ...config
    };

    this.stats = {
      totalRequests: 0,
      byAudience: { investor: 0, team: 0, media: 0, customer: 0, advisor: 0 },
      generatedContent: 0
    };
  }

  /**
   * Get founder mode UI configuration
   */
  getUIConfig() {
    return {
      id: 'founder_mode',
      consumer: {
        icon: '📢',
        label: 'Share Update',
        tagline: 'For investors, team, public'
      },
      advanced: {
        icon: '👨‍💼',
        label: 'Founder Mode',
        tagline: 'Strategic communications'
      },
      audiences: [
        { id: 'investor', icon: '💼', label: 'Investors', examples: ['fundraising', 'metrics update', 'board deck'] },
        { id: 'team', icon: '👥', label: 'Team', examples: ['all-hands', 'OKRs', 'milestone'] },
        { id: 'media', icon: '📰', label: 'Media', examples: ['press release', 'interview', 'story'] },
        { id: 'customer', icon: '🎯', label: 'Customers', examples: ['launch', 'feature', 'update'] },
        { id: 'advisor', icon: '🤝', label: 'Advisors', examples: ['board update', 'challenge', 'pivot'] }
      ],
      toneOptions: [
        { id: 'confident', icon: '💪', label: 'Confident', description: 'Bold, assertive' },
        { id: 'humble', icon: '🌱', label: 'Humble', description: 'Grounded, learning' },
        { id: 'urgent', icon: '⚡', label: 'Urgent', description: 'Action needed' },
        { id: 'celebratory', icon: '🎉', label: 'Celebratory', description: 'Wins, milestones' },
        { id: 'transparent', icon: '🔍', label: 'Transparent', description: 'Honest, vulnerable' }
      ]
    };
  }

  /**
   * Generate content for a specific audience
   */
  async generateContent({ text, audience, tone, context = {}, userId }) {
    this.stats.totalRequests++;
    this.stats.byAudience[audience] = (this.stats.byAudience[audience] || 0) + 1;

    this.logger.info('Generating founder content', { audience, tone, text: text?.substring(0, 50) });

    try {
      // Get user context from MemoryOS
      const userContext = await this._getUserContext(userId);

      // Get company context from TwinOS
      const companyContext = await this._getCompanyContext(userId);

      // Build the content generation prompt
      const prompt = this._buildPrompt({ text, audience, tone, context, userContext, companyContext });

      // Call Genie for AI-generated content
      const result = await this._callGenie(prompt, { audience, tone });

      this.stats.generatedContent++;

      return {
        success: true,
        content: result.content,
        options: result.options,
        metadata: {
          audience,
          tone,
          length: result.content.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate founder content', { error: error.message });
      return {
        success: false,
        error: error.message,
        fallback: this._generateFallback({ text, audience, tone })
      };
    }
  }

  /**
   * Get audience-specific templates
   */
  getTemplates(audience) {
    const templates = {
      investor: [
        {
          id: 'metrics_update',
          label: '📊 Metrics Update',
          prompt: 'Share key metrics from this week/month',
          placeholders: ['Revenue', 'Users', 'Burn rate', 'Runway']
        },
        {
          id: 'fundraising_update',
          label: '💰 Fundraising Update',
          prompt: 'Update on fundraising progress',
          placeholders: ['Stage', 'Amount sought', 'Use of funds']
        },
        {
          id: 'board_deck',
          label: '📈 Board Deck',
          prompt: 'Summary for board meeting',
          placeholders: ['Highlights', 'Challenges', 'Ask']
        },
        {
          id: 'milestone',
          label: '🎯 Milestone Announcement',
          prompt: 'Announce achieved milestone',
          placeholders: ['Milestone', 'Impact', 'Next steps']
        }
      ],
      team: [
        {
          id: 'all_hands',
          label: '🎤 All-Hands Update',
          prompt: 'Weekly/monthly team update',
          placeholders: ['Wins', 'Challenges', 'Focus areas']
        },
        {
          id: 'okr_update',
          label: '🎯 OKR Update',
          prompt: 'Quarterly OKR progress',
          placeholders: ['Objective', 'Key results', 'Status']
        },
        {
          id: 'milestone',
          label: '🚀 Milestone',
          prompt: 'Team milestone achievement',
          placeholders: ['Milestone', 'Team members', 'Impact']
        },
        {
          id: 'pivot',
          label: '🔄 Strategic Pivot',
          prompt: 'Announce strategic change',
          placeholders: ['What changed', 'Why', 'Team impact']
        }
      ],
      media: [
        {
          id: 'press_release',
          label: '📰 Press Release',
          prompt: 'Official announcement',
          placeholders: ['What', 'Why', 'Impact', 'Quote']
        },
        {
          id: 'interview_brief',
          label: '🎤 Interview Brief',
          prompt: 'Key messages for interview',
          placeholders: ['Topic', 'Key points', 'Angles to avoid']
        },
        {
          id: 'story_tip',
          label: '📨 Story Tip',
          prompt: 'Pitch a story to journalist',
          placeholders: ['Story angle', 'Why now', 'Exclusive']
        }
      ],
      customer: [
        {
          id: 'feature_launch',
          label: '✨ Feature Launch',
          prompt: 'Announce new feature',
          placeholders: ['Feature', 'Benefits', 'How to use']
        },
        {
          id: 'update',
          label: '🔔 Customer Update',
          prompt: 'Product/company update',
          placeholders: ['What changed', 'Why it matters', 'CTA']
        },
        {
          id: 'apology',
          label: '🙏 Apology',
          prompt: 'Address customer concern',
          placeholders: ['What went wrong', 'What we\'re doing', 'How to make it right']
        }
      ],
      advisor: [
        {
          id: 'board_update',
          label: '📊 Board Update',
          prompt: 'Monthly board update',
          placeholders: ['Highlights', 'Challenges', 'Request']
        },
        {
          id: 'challenge',
          label: '🤔 Strategic Challenge',
          prompt: 'Ask for advice on challenge',
          placeholders: ['Challenge', 'Options considered', 'What you need']
        },
        {
          id: 'pivot_proposal',
          label: '🔄 Pivot Proposal',
          prompt: 'Propose strategic pivot',
          placeholders: ['Current state', 'Proposed change', 'Risks']
        }
      ]
    };

    return templates[audience] || templates.investor;
  }

  /**
   * Get milestone types for tracking
   */
  getMilestoneTypes() {
    return [
      { id: 'product', icon: '🚀', label: 'Product', examples: ['Launch', 'Feature', 'MVP'] },
      { id: 'revenue', icon: '💰', label: 'Revenue', examples: ['First dollar', 'ARR milestone', 'New contract'] },
      { id: 'user', icon: '👥', label: 'Users', examples: ['First user', '1K users', 'Churn improvement'] },
      { id: 'funding', icon: '💼', label: 'Funding', examples: ['Pre-seed', 'Seed', 'Series A'] },
      { id: 'team', icon: '👨‍👩‍👧', label: 'Team', examples: ['First hire', '10 employees', 'Key hire'] },
      { id: 'partner', icon: '🤝', label: 'Partner', examples: ['First partner', 'Strategic deal', 'Distribution'] }
    ];
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.stats,
      totalGenerated: this.stats.generatedContent
    };
  }

  // ── Private Methods ───────────────────────────────────────────────────

  async _getUserContext(userId) {
    try {
      // Try MemoryOS
      const response = await axios.get(`${this.config.memoryOS}/api/memory/${userId}`, {
        timeout: 2000
      });
      return response.data;
    } catch (error) {
      this.logger.warn('Could not fetch user context from MemoryOS', { error: error.message });
      return null;
    }
  }

  async _getCompanyContext(userId) {
    try {
      // Try TwinOS
      const response = await axios.get(`${this.config.twinOS}/api/twins/company/${userId}`, {
        timeout: 2000
      });
      return response.data;
    } catch (error) {
      this.logger.warn('Could not fetch company context from TwinOS', { error: error.message });
      return null;
    }
  }

  _buildPrompt({ text, audience, tone, context, userContext, companyContext }) {
    const audienceDescriptions = {
      investor: 'sophisticated investors who care about traction, metrics, and ROI',
      team: 'team members who need clarity, motivation, and direction',
      media: 'journalists who need a clear story with newsworthiness',
      customer: 'customers who care about value and benefits',
      advisor: 'experienced advisors who need context and specifics'
    };

    const toneDescriptions = {
      confident: 'confident and assertive, showing leadership and conviction',
      humble: 'humble and grounded, acknowledging challenges and learning',
      urgent: 'urgent and action-oriented, creating immediate response',
      celebratory: 'joyful and positive, celebrating achievements',
      transparent: 'honest and vulnerable, building trust through openness'
    };

    return `
You are a communications expert for a startup founder.

Generate content for ${audienceDescriptions[audience]}.
Use a ${toneDescriptions[tone]} tone.

${text ? `Context/Topic: ${text}` : ''}

${userContext ? `Founder Background: ${JSON.stringify(userContext)}` : ''}
${companyContext ? `Company Context: ${JSON.stringify(companyContext)}` : ''}

Requirements:
- Keep it under ${this.config.maxLength} characters for social media, or clearly indicate if it's for longer format
- Make it authentic and in the founder's voice
- Include specific metrics or details where possible
- End with a clear call-to-action or next step
`;
  }

  async _callGenie(prompt, { audience, tone }) {
    try {
      // Call Genie Gateway
      const response = await axios.post(
        `${this.config.genieGateway}/api/genie/generate`,
        {
          prompt,
          context: {
            mode: 'founder',
            audience,
            tone
          }
        },
        { timeout: 5000 }
      );

      return {
        content: response.data.content || response.data.text,
        options: []
      };
    } catch (error) {
      this.logger.warn('Genie call failed, using fallback', { error: error.message });
      return this._generateFallback({ audience, tone });
    }
  }

  _generateFallback({ audience, tone }) {
    // Fallback templates when Genie is unavailable
    const fallbacks = {
      investor: {
        content: 'Excited to share our progress! Key metrics looking strong 📈. More details coming in our next update.',
        options: ['Add metrics', 'Shorten', 'Make more formal']
      },
      team: {
        content: 'Team, great progress this week! Let\'s keep the momentum going 🚀',
        options: ['Add specifics', 'Make motivational', 'Add next week focus']
      },
      media: {
        content: '[STORY ANGLE] - We have an interesting story to share about [TOPIC]. Would love to chat!',
        options: ['Make it punchier', 'Add quotes', 'Include data']
      },
      customer: {
        content: 'We heard your feedback and we\'re working on it! More exciting updates coming soon 🎉',
        options: ['Be more specific', 'Add thank you', 'Include feature preview']
      },
      advisor: {
        content: 'Wanted to share an update on [CHALLENGE]. Would appreciate your thoughts on [SPECIFIC QUESTION].',
        options: ['Make more concise', 'Add context', 'Soften request']
      }
    };

    return fallbacks[audience] || fallbacks.investor;
  }
}

module.exports = FounderMode;
