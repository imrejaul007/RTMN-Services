import { v4 as uuidv4 } from 'uuid';
import { IContentSuggestion, IGenerateContentRequest, IContentGenerationResponse } from '../types';

export class ContentGenerator {
  private openaiKey: string | undefined;

  constructor(openaiKey?: string) {
    this.openaiKey = openaiKey;
  }

  async generateContent(request: IGenerateContentRequest): Promise<IContentGenerationResponse> {
    const { topic, type, targetAudience, channels, tone, length, keywords, includeSEO } = request;

    // Generate primary content suggestion
    const content = await this.generateContentSuggestion({
      topic,
      type,
      targetAudience,
      channels,
      tone,
      length,
      keywords
    });

    // Generate alternatives
    const alternatives = await this.generateAlternatives({
      topic,
      type,
      targetAudience,
      channels,
      tone
    });

    // Generate SEO suggestions if requested
    const seoSuggestions = includeSEO
      ? await this.generateSEOSuggestions(topic, keywords || [])
      : undefined;

    return {
      content,
      alternatives,
      seoSuggestions
    };
  }

  private async generateContentSuggestion(params: {
    topic: string;
    type: IContentSuggestion['type'];
    targetAudience: string[];
    channels: string[];
    tone?: string;
    length?: string;
    keywords?: string[];
  }): Promise<IContentSuggestion> {
    // Simulated AI content generation - in production, this would call OpenAI
    const contentLength = params.length === 'short' ? 100 : params.length === 'long' ? 500 : 250;

    const titleTemplates = [
      `The Ultimate Guide to ${params.topic}`,
      `${params.topic}: Everything You Need to Know`,
      `How ${params.topic} Can Transform Your Business`,
      `10 Tips for Mastering ${params.topic}`,
      `${params.topic}: A Comprehensive Overview`
    ];

    const contentTemplates = [
      `Discover the power of ${params.topic} and how it can revolutionize your approach. ` +
      `In today's competitive landscape, understanding ${params.topic} is essential for growth. ` +
      `This comprehensive guide covers everything from basics to advanced strategies.`.repeat(contentLength / 50),

      `When it comes to ${params.topic}, preparation is key. ` +
      `Our experts have compiled the most effective techniques to help you succeed. ` +
      `Whether you're just starting out or looking to level up, this content has you covered.`.repeat(contentLength / 50)
    ];

    const hashtagsByTopic = params.keywords?.map(k => `#${k.replace(/\s+/g, '')}`) || [
      '#Marketing', '#Growth', '#Business', '#Strategy', '#Innovation'
    ];

    const ctaTemplates = [
      'Learn More Today',
      'Get Started Now',
      'Download Our Free Guide',
      'Book a Consultation',
      'Start Your Free Trial'
    ];

    const estimatedReach = this.calculateEstimatedReach(params.channels, params.targetAudience);
    const engagementPrediction = this.predictEngagement(params.type, params.tone);

    return {
      id: uuidv4(),
      type: params.type,
      title: titleTemplates[Math.floor(Math.random() * titleTemplates.length)],
      description: `Engaging ${params.type} content about ${params.topic} designed for ${params.targetAudience.join(', ')}`,
      content: contentTemplates[Math.floor(Math.random() * contentTemplates.length)],
      targetSegment: params.targetAudience[0] || 'general',
      recommendedChannels: params.channels,
      hashtags: hashtagsByTopic.slice(0, 5),
      callToAction: ctaTemplates[Math.floor(Math.random() * ctaTemplates.length)],
      estimatedReach,
      engagementPrediction
    };
  }

  private async generateAlternatives(params: {
    topic: string;
    type: IContentSuggestion['type'];
    targetAudience: string[];
    channels: string[];
    tone?: string;
  }): Promise<IContentSuggestion[]> {
    const alternatives: IContentSuggestion[] = [];
    const tones = ['professional', 'casual', 'humorous', 'inspirational'];

    for (let i = 0; i < 2; i++) {
      const altTone = tones[(tones.indexOf(params.tone || 'professional') + i + 1) % tones.length];
      const alt = await this.generateContentSuggestion({
        ...params,
        tone: altTone
      });
      alt.id = uuidv4();
      alternatives.push(alt);
    }

    return alternatives;
  }

  private async generateSEOSuggestions(topic: string, existingKeywords: string[]): Promise<{
    keywords: string[];
    metaDescription: string;
    headlines: string[];
  }> {
    // Simulated SEO suggestions
    const baseKeywords = [topic, ...existingKeywords];
    const additionalKeywords = [
      `${topic} tips`,
      `${topic} guide`,
      `best ${topic}`,
      `${topic} strategies`,
      `${topic} 2024`,
      `how to ${topic.toLowerCase()}`,
      `${topic} for beginners`
    ];

    const headlines = [
      `The Complete ${topic} Handbook`,
      `${topic}: Expert Strategies That Work`,
      `Why ${topic} Matters for Your Success`,
      `Mastering ${topic} in 2024`,
      `The Ultimate ${topic} Resource`
    ];

    return {
      keywords: [...new Set([...baseKeywords, ...additionalKeywords])].slice(0, 10),
      metaDescription: `Discover everything you need to know about ${topic}. Expert insights, proven strategies, and actionable tips to help you succeed.`,
      headlines
    };
  }

  private calculateEstimatedReach(channels: string[], audience: string[]): number {
    const channelMultipliers: Record<string, number> = {
      'facebook': 50000,
      'instagram': 45000,
      'twitter': 30000,
      'linkedin': 25000,
      'email': 10000,
      'google_ads': 40000,
      'content': 20000
    };

    let baseReach = 0;
    channels.forEach(channel => {
      baseReach += channelMultipliers[channel.toLowerCase()] || 10000;
    });

    const audienceMultiplier = Math.min(audience.length * 0.2, 2);
    return Math.round(baseReach * (1 + audienceMultiplier));
  }

  private predictEngagement(type: string, tone?: string): number {
    const baseEngagement: Record<string, number> = {
      'social': 8.5,
      'video': 9.2,
      'blog': 5.5,
      'email': 4.2,
      'ad': 2.8,
      'landing_page': 6.0
    };

    const toneMultiplier: Record<string, number> = {
      'humorous': 1.3,
      'inspirational': 1.2,
      'casual': 1.1,
      'educational': 1.0,
      'professional': 0.9
    };

    const base = baseEngagement[type] || 5.0;
    const multiplier = toneMultiplier[tone || 'professional'] || 1.0;

    return Math.round((base * multiplier + (Math.random() - 0.5)) * 10) / 10;
  }

  async generateEmailSequence(topic: string, audience: string): Promise<string[]> {
    const subjects = [
      `Start with ${topic}`,
      `The secrets of ${topic} revealed`,
      `Your ${topic} journey continues`,
      `Don't miss these ${topic} insights`,
      `Last chance: ${topic} masterclass`,
      `Thank you for exploring ${topic}`
    ];

    return subjects.map((subject, i) =>
      `Email ${i + 1}: ${subject}\n\n` +
      `Hi there,\n\n` +
      `In this email, we'll explore ${topic} and how it relates to ${audience}.\n\n` +
      `[Email body content for step ${i + 1}]\n\n` +
      `Best regards`
    );
  }

  async generateSocialCaptions(topic: string, platform: string): Promise<string[]> {
    const templates = [
      `✨ Ready to transform your ${topic}? Here's what you need to know...\n\n#${topic.replace(/\s+/g, '')} #Growth #Marketing`,
      `The ${topic} mistake most people make (and how to avoid it)\n\n👇 Drop a 🙋 if you want more tips!\n\n#${topic.replace(/\s+/g, '')} #Tips #Business`,
      `Hot take: ${topic} is the future of success.\n\nAgree or disagree? Let us know in the comments 👇\n\n#${topic.replace(/\s+/g, '')} #Innovation #Strategy`
    ];

    return templates;
  }
}

export const contentGenerator = new ContentGenerator(process.env.OPENAI_API_KEY);
