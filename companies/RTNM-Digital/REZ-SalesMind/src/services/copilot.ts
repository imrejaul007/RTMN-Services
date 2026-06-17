/**
 * REZ SalesMind - Sales Copilot Service
 * AI-powered sales assistant with HOJAI AI and Claude integration
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface LeadContext {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  phone?: string;
  industry?: string;
  companySize?: string;
  revenue?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  lastContact?: Date;
  stage: string;
  score?: number;
  notes?: string;
  previousInteractions?: Interaction[];
}

export interface Interaction {
  type: 'email' | 'call' | 'meeting' | 'demo' | 'proposal';
  date: Date;
  summary: string;
  outcome?: string;
}

export interface SalesScenario {
  type: 'cold_outreach' | 'follow_up' | 'demo' | 'proposal' | 'negotiation' | 'objection_handling';
  lead?: LeadContext;
  context?: string;
}

export interface CallPreparation {
  talkingPoints: string[];
  questions: string[];
  objections: string[];
  keyMessages: string[];
  competitorInfo?: string;
  companyInfo?: string;
  recentNews?: string[];
}

export interface ObjectionResponse {
  objection: string;
  response: string;
  rebuttals: string[];
  empathyStatement: string;
}

export interface SalesReport {
  period: 'day' | 'week' | 'month' | 'quarter';
  startDate: Date;
  endDate: Date;
  metrics: {
    callsMade: number;
    callsCompleted: number;
    emailsSent: number;
    emailsOpened: number;
    meetingsScheduled: number;
    meetingsCompleted: number;
    proposalsSent: number;
    dealsClosed: number;
    revenue: number;
    conversionRate: number;
    avgDealSize: number;
    avgSalesCycle: number;
  };
  topPerformers?: any[];
  pipelineSummary?: any;
  trends?: any;
}

export interface CoachFeedback {
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  trainingModules?: string[];
  score: number;
}

export interface DealPrediction {
  dealId: string;
  probability: number;
  riskFactors: string[];
  recommendedActions: string[];
  estimatedCloseDate?: Date;
  confidence: number;
}

export interface PricingRecommendation {
  product: string;
  recommendedPrice: number;
  originalPrice: number;
  discount: number;
  customerSegment: string;
  rationale: string;
  alternatives?: { name: string; price: number }[];
}

export interface CompetitiveAnalysis {
  competitor: string;
  strengths: string[];
  weaknesses: string[];
  comparison: {
    feature: string;
    theirs: string;
    ours: string;
  }[];
  recommendedTalkTrack: string;
}

// Mock data store
const conversationHistory = new Map<string, any[]>();

// Sales Copilot Service
export class SalesCopilot {
  private hojaiUrl: string;
  private claudeApiKey: string;

  constructor() {
    this.hojaiUrl = process.env.HOJAI_API_URL || 'http://localhost:4500';
    this.claudeApiKey = process.env.CLAUDE_API_KEY || '';
  }

  /**
   * Get next best action for a lead based on context
   */
  async suggestNextBestAction(leadId: string, context?: any): Promise<{ action: string; reason: string; priority: number; channel: string }> {
    console.log(`[Copilot] Analyzing next best action for lead ${leadId}`);

    // Mock implementation with intelligent routing
    const actions = [
      {
        action: 'Send personalized email',
        reason: 'Lead has high engagement score but no recent contact',
        priority: 9,
        channel: 'email',
      },
      {
        action: 'Schedule follow-up call',
        reason: 'Demo completed 3 days ago, decision maker needs pricing',
        priority: 8,
        channel: 'call',
      },
      {
        action: 'Send case study',
        reason: 'Lead is in consideration stage, needs social proof',
        priority: 7,
        channel: 'email',
      },
      {
        action: 'Connect on LinkedIn',
        reason: 'Engaged with company content, warm lead',
        priority: 6,
        channel: 'linkedin',
      },
      {
        action: 'Send WhatsApp message',
        reason: 'Quick touchpoint to maintain relationship',
        priority: 5,
        channel: 'whatsapp',
      },
    ];

    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Select action based on lead context
    return actions[Math.floor(Math.random() * actions.length)];
  }

  /**
   * Generate sales script for specific scenario
   */
  async generateSalesScript(leadId: string, scenario: SalesScenario): Promise<{
    script: string;
    talkingPoints: string[];
    questions: string[];
    closingTechniques: string[];
  }> {
    console.log(`[Copilot] Generating sales script for ${scenario.type}`);

    const scripts: Record<string, any> = {
      cold_outreach: {
        script: `Hi {{name}},

I noticed {{company}} is expanding into new markets, and I wanted to share how we've helped similar companies increase their revenue by an average of 40%.

We work with {{industry}} companies to streamline their sales process and close deals faster. Would you be open to a quick 15-minute call this week?

Best regards`,
        talkingPoints: [
          'Research the prospect\'s company recent news',
          'Identify their pain points from LinkedIn activity',
          'Prepare 2-3 relevant case studies',
        ],
        questions: [
          'What challenges are you facing in your current sales process?',
          'How are you currently handling lead follow-up?',
          'What would a successful solution look like for you?',
        ],
        closingTechniques: [
          'Assumptive close: "I\'ll send you a calendar invite for Thursday at 10 AM."',
          'Value close: "Given the ROI we\'ve delivered, when would be the right time to start?"',
          'Question close: "If we could help you close 30% more deals, would that be worth a conversation?"',
        ],
      },
      follow_up: {
        script: `Hi {{name}},

Just following up on my previous message about {{topic}}.

I wanted to make sure it didn\'t get buried in your inbox. We\'ve helped companies like {{company}} achieve significant improvements in their sales metrics.

Would you have 15 minutes this week to chat?

Best regards`,
        talkingPoints: [
          'Reference the previous interaction',
          'Provide new value (case study, data point)',
          'Create urgency without being pushy',
        ],
        questions: [
          'Is now a good time to chat?',
          'What questions do you have about our solution?',
          'Is there anything holding you back?',
        ],
        closingTechniques: [
          'Soft close: "Would it help to see how it works in practice?"',
          'Urgency close: "We have a special offer ending next week."',
        ],
      },
      demo: {
        script: `Hi {{name}},

Excited to show you how we can help {{company}}!

Here\'s what we\'ll cover:
1. Quick overview of the platform
2. Live demo tailored to your use case
3. Implementation timeline
4. Pricing options

Please come prepared with your top 3 questions.

Looking forward to it!`,
        talkingPoints: [
          'Customize demo to their specific industry',
          'Show ROI calculation relevant to their company size',
          'Address role-specific concerns',
        ],
        questions: [
          'Who else should be involved in this decision?',
          'What does success look like for your team?',
          'What\'s your timeline for making a decision?',
        ],
        closingTechniques: [
          'Demo-to-proposal close: "Based on what you\'ve seen, would you like us to prepare a proposal?"',
          'Pilot close: "Would a 30-day pilot help you evaluate the solution?"',
        ],
      },
      proposal: {
        script: `Hi {{name}},

Attached is the proposal we discussed. Here\'s a quick summary:

- Investment: {{price}}
- Timeline: {{duration}}
- Key deliverables: {{features}}

This includes everything we discussed and is valid for 30 days.

Please review and let me know if you have any questions. I\'m available to walk through it together if that would help.

Best regards`,
        talkingPoints: [
          'Summarize key value propositions',
          'Review pricing and payment terms',
          'Outline next steps',
        ],
        questions: [
          'Does this address all your requirements?',
          'What\'s the approval process like?',
          'When can we expect a decision?',
        ],
        closingTechniques: [
          'Proposal close: "If everything looks good, we can get started next week."',
          'Assumptive close: "I\'ll prepare the contract for signature."',
        ],
      },
      negotiation: {
        script: `I understand budget is a concern. Let me share some options:

1. Extended payment terms
2. Reduced scope with core features
3. Annual discount for multi-year commitment

What matters most to {{company}} right now - upfront savings or long-term value?`,
        talkingPoints: [
          'Understand their constraints',
          'Present alternatives',
          'Focus on value, not price',
        ],
        questions: [
          'What\'s your budget range?',
          'What would make this an easy yes?',
          'Is there flexibility in timeline?',
        ],
        closingTechniques: [
          'Value trade-off: "If we can guarantee X results, would the investment make sense?"',
          'Concession close: "I can offer X if you can commit to Y."',
        ],
      },
      objection_handling: {
        script: `I hear your concern about {{objection}}. Let me address that:

{{response}}

Many of our customers had the same hesitation initially, and here\'s what they found...

Does that help address your concern?`,
        talkingPoints: [
          'Acknowledge the objection fully',
          'Provide evidence/references',
          'Pivot to value',
        ],
        questions: [
          'Is there anything else holding you back?',
          'What would help you feel more confident?',
        ],
        closingTechniques: [
          'Feel-Felt-Found: "I understand how you feel. Other clients felt the same way, and they found..."',
          'Isolate the objection: "If we could solve this concern, would you be ready to move forward?"',
        ],
      },
    };

    const template = scripts[scenario.type] || scripts.cold_outreach;

    // Replace placeholders
    const lead = scenario.lead || {
      name: 'there',
      company: 'your company',
      industry: 'your industry',
    };

    return {
      script: template.script
        .replace(/\{\{name\}\}/g, lead.name)
        .replace(/\{\{company\}\}/g, lead.company)
        .replace(/\{\{industry\}\}/g, lead.industry || 'similar companies'),
      talkingPoints: template.talkingPoints,
      questions: template.questions,
      closingTechniques: template.closingTechniques,
    };
  }

  /**
   * Prepare for a sales call
   */
  async prepareForCall(leadId: string): Promise<CallPreparation> {
    console.log(`[Copilot] Preparing call briefing for lead ${leadId}`);

    // Mock preparation data
    return {
      talkingPoints: [
        'Understand their current sales process',
        'Identify key decision makers',
        'Discuss timeline and budget',
        'Cover feature requirements',
        'Address any concerns from previous interactions',
      ],
      questions: [
        'What are your top 3 priorities for the next quarter?',
        'How do you currently measure sales success?',
        'Who else is involved in this decision?',
        'What\'s your timeline for implementation?',
        'What would make this project a success?',
      ],
      objections: [
        'We don\'t have budget for this right now',
        'We\'re already working with a competitor',
        'We need to see more ROI data',
        'The timing isn\'t right',
        'We need to get buy-in from leadership',
      ],
      keyMessages: [
        'Our customers see 40% faster sales cycles on average',
        'We integrate with your existing tools seamlessly',
        'Implementation typically takes 2-4 weeks',
        'We offer dedicated support and training',
      ],
      competitorInfo: 'Primary competitor is CompetitorX. They excel in enterprise but lack our agile approach and pricing flexibility.',
      companyInfo: 'Lead is a mid-market company in growth phase. Recent funding round. Looking to scale operations.',
      recentNews: [
        'Lead\'s company just announced expansion to European markets',
        'Recently hired new VP of Sales',
        'Featured in TechCrunch last month',
      ],
    };
  }

  /**
   * Analyze call transcript
   */
  async analyzeCallTranscript(transcript: string): Promise<{
    summary: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    keyTopics: string[];
    actionItems: string[];
    dealHealth: number;
    nextSteps: string[];
    coachingNotes: string[];
  }> {
    console.log(`[Copilot] Analyzing call transcript (${transcript.length} chars)`);

    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      summary: 'The call was productive. Lead showed strong interest in the enterprise tier. Main concerns are pricing and integration complexity. Decision maker is the VP of Sales who was engaged throughout the call.',
      sentiment: 'positive',
      keyTopics: ['Pricing', 'Integration', 'Timeline', 'Enterprise Features', 'Support'],
      actionItems: [
        'Send detailed pricing breakdown',
        'Schedule technical deep-dive with IT',
        'Follow up with case studies from similar companies',
        'Prepare ROI calculator',
      ],
      dealHealth: 75,
      nextSteps: [
        'Send proposal by end of week',
        'Schedule demo with technical team',
        'Connect with references',
      ],
      coachingNotes: [
        'Good job building rapport at the start',
        'Consider asking more discovery questions before jumping to features',
        'Addressed the pricing objection well with ROI framing',
        'Could improve on handling the integration concern',
      ],
    };
  }

  /**
   * Suggest objection response
   */
  async suggestObjectionResponse(objection: string, product?: string): Promise<ObjectionResponse> {
    console.log(`[Copilot] Generating response for objection: ${objection}`);

    const objectionResponses: Record<string, ObjectionResponse> = {
      'price': {
        objection: 'Your price is too high',
        response: 'I understand price is important. Let me share that our customers typically see a 300% ROI within the first year. We also offer flexible payment options and volume discounts. Would it help if I showed you the ROI calculator we use with similar companies?',
        rebuttals: [
          'What would make the investment worthwhile for your company?',
          'If we could guarantee the results, would price still be the barrier?',
          'Have you compared the total cost of your current solution?',
        ],
        empathyStatement: 'I completely understand - every company wants to make sure they\'re getting the best value for their investment.',
      },
      'budget': {
        objection: 'We don\'t have budget for this',
        response: 'I hear you. Budget constraints are common. Let me ask - if budget weren\'t a concern, would this solution solve your problem? Sometimes we can find creative solutions like spreading payments or starting with a pilot program.',
        rebuttals: [
          'Is there budget allocated for next quarter we could plan for?',
          'What if we started with a smaller scope?',
          'Would a monthly payment option help?',
        ],
        empathyStatement: 'Budget planning is challenging, and I appreciate you being upfront about it.',
      },
      'competitor': {
        objection: 'We\'re already evaluating your competitor',
        response: 'That\'s great - it means you\'re serious about solving this problem. I\'d love to show you what makes us different. Would it be helpful to see a side-by-side comparison?',
        rebuttals: [
          'What\'s most important to you in the evaluation?',
          'What would the competitor need to do to win your business?',
          'Can we schedule a demo to show you something they can\'t?',
        ],
        empathyStatement: 'It\'s smart to evaluate all options before making a decision.',
      },
      'timing': {
        objection: 'The timing isn\'t right',
        response: 'I understand timing is important. Can you help me understand what would need to change for the timing to be right? Sometimes things that seem far away have a way of becoming urgent quickly.',
        rebuttals: [
          'What milestones would need to be hit first?',
          'What\'s the cost of waiting?',
          'Can we start planning for when you are ready?',
        ],
        empathyStatement: 'I respect that you want to make decisions at the right time.',
      },
      'stakeholder': {
        objection: 'I need to get buy-in from leadership',
        response: 'That makes sense for an initiative like this. What would help you make the case to leadership? I can prepare a business case document or executive summary that you could share.',
        rebuttals: [
          'What information would help you make the case?',
          'Can I join a call to answer leadership\'s questions directly?',
          'Would case studies from similar companies help?',
        ],
        empathyStatement: 'Building consensus is important, and I\'m glad you\'re thinking about that.',
      },
    };

    // Find closest matching objection
    const lowerObjection = objection.toLowerCase();
    for (const [key, response] of Object.entries(objectionResponses)) {
      if (lowerObjection.includes(key)) {
        return response;
      }
    }

    // Default response
    return {
      objection,
      response: 'I appreciate you sharing that concern. Let me address it directly...',
      rebuttals: [
        'Can you tell me more about that?',
        'What would help address that concern?',
      ],
      empathyStatement: 'Thank you for being open about your concerns.',
    };
  }

  /**
   * Generate sales report
   */
  async generateSalesReport(period: 'day' | 'week' | 'month' | 'quarter'): Promise<SalesReport> {
    console.log(`[Copilot] Generating ${period} sales report`);

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
    }

    const metrics = {
      callsMade: Math.floor(Math.random() * 50) + 30,
      callsCompleted: Math.floor(Math.random() * 30) + 20,
      emailsSent: Math.floor(Math.random() * 200) + 100,
      emailsOpened: Math.floor(Math.random() * 150) + 80,
      meetingsScheduled: Math.floor(Math.random() * 15) + 8,
      meetingsCompleted: Math.floor(Math.random() * 12) + 6,
      proposalsSent: Math.floor(Math.random() * 8) + 3,
      dealsClosed: Math.floor(Math.random() * 5) + 1,
      revenue: Math.floor(Math.random() * 150000) + 50000,
      conversionRate: Math.random() * 15 + 15,
      avgDealSize: Math.floor(Math.random() * 20000) + 15000,
      avgSalesCycle: Math.floor(Math.random() * 30) + 15,
    };

    return {
      period,
      startDate,
      endDate: new Date(),
      metrics,
      topPerformers: [
        { name: 'Sales Rep 1', deals: 8, revenue: 125000 },
        { name: 'Sales Rep 2', deals: 6, revenue: 95000 },
        { name: 'Sales Rep 3', deals: 5, revenue: 82000 },
      ],
      pipelineSummary: {
        leads: 150,
        qualified: 80,
        proposals: 25,
        negotiations: 10,
        closedWon: 8,
        closedLost: 5,
      },
      trends: {
        emailOpenRate: 32.5,
        responseRate: 18.2,
        meetingConversion: 45,
        closeRate: 28.5,
      },
    };
  }

  /**
   * Coach salesperson based on performance
   */
  async coachSalesperson(performance: any): Promise<CoachFeedback> {
    console.log(`[Copilot] Generating coaching feedback`);

    const score = Math.floor(Math.random() * 30) + 70;

    return {
      strengths: [
        'Strong discovery skills - consistently uncovers customer needs',
        'Excellent at building rapport and trust',
        'Good at handling objections',
        'Maintains accurate CRM records',
        'Effective follow-up communication',
      ],
      areasForImprovement: [
        'Could improve on closing techniques',
        'Sometimes spends too much time on non-decision makers',
        'Could benefit from more competitive intelligence',
        'Email templates could be more personalized',
      ],
      recommendations: [
        'Practice the assumptive close technique',
        'Use LinkedIn to identify all stakeholders before calls',
        'Review competitor battle cards before each call',
        'Use the AI script generator for more personalized emails',
      ],
      trainingModules: [
        'Advanced Closing Techniques',
        'Multi-threading for Enterprise Sales',
        'Competitive Selling',
      ],
      score,
    };
  }

  /**
   * Predict deal outcome
   */
  async predictDealOutcome(dealId: string): Promise<DealPrediction> {
    console.log(`[Copilot] Predicting outcome for deal ${dealId}`);

    const probability = Math.floor(Math.random() * 60) + 20;

    return {
      dealId,
      probability,
      riskFactors: [
        probability < 40 ? 'Budget concerns identified' : null,
        probability < 50 ? 'No clear decision timeline' : null,
        probability < 60 ? 'Multiple stakeholders involved' : null,
        'Competitor actively in discussions',
        'Technical evaluation still pending',
      ].filter(Boolean) as string[],
      recommendedActions: [
        'Schedule executive sponsor call',
        'Send ROI case study',
        'Request clear timeline from buyer',
        'Offer pilot or proof of concept',
        'Connect with technical team',
      ],
      estimatedCloseDate: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000),
      confidence: 0.75,
    };
  }

  /**
   * Recommend pricing for customer segment
   */
  async recommendPricing(product: string, customerSegment: string): Promise<PricingRecommendation> {
    console.log(`[Copilot] Recommending pricing for ${product} - ${customerSegment}`);

    const segmentPricing: Record<string, { base: number; discount: number }> = {
      'startup': { base: 10000, discount: 30 },
      'smb': { base: 25000, discount: 20 },
      'mid-market': { base: 50000, discount: 15 },
      'enterprise': { base: 100000, discount: 10 },
    };

    const segment = segmentPricing[customerSegment.toLowerCase()] || segmentPricing.smb;

    return {
      product,
      recommendedPrice: segment.base * (1 - segment.discount / 100),
      originalPrice: segment.base,
      discount: segment.discount,
      customerSegment,
      rationale: `Based on ${customerSegment} market analysis, recommend offering ${segment.discount}% discount to stay competitive while maintaining margin. Comparable deals in this segment typically close at this price point.`,
      alternatives: [
        { name: 'Basic Package', price: segment.base * 0.6 },
        { name: 'Premium Package', price: segment.base * 1.3 },
      ],
    };
  }

  /**
   * Generate competitive analysis
   */
  async generateCompetitiveAnalysis(competitor: string): Promise<CompetitiveAnalysis> {
    console.log(`[Copilot] Analyzing competitor: ${competitor}`);

    const analyses: Record<string, CompetitiveAnalysis> = {
      'competitorx': {
        competitor: 'CompetitorX',
        strengths: [
          'Established brand recognition',
          'Large enterprise customer base',
          'Comprehensive feature set',
          'Strong partner ecosystem',
        ],
        weaknesses: [
          'Complex implementation (6+ months)',
          'High total cost of ownership',
          'Slow to innovate',
          'Inflexible contract terms',
        ],
        comparison: [
          { feature: 'Implementation', theirs: '6 months average', ours: '4-6 weeks' },
          { feature: 'Pricing', theirs: 'Enterprise-only, high', ours: 'Flexible, all segments' },
          { feature: 'Support', theirs: 'Tiered, extra cost', ours: '24/7 included' },
          { feature: 'Customization', theirs: 'Limited', ours: 'Highly customizable' },
        ],
        recommendedTalkTrack: 'CompetitorX is great for large enterprises with dedicated IT teams and long implementation timelines. We\'re built for companies that need to move fast and see results quickly. Our customers typically achieve ROI 3x faster than with traditional enterprise solutions.',
      },
    };

    return analyses[competitor.toLowerCase()] || {
      competitor,
      strengths: ['Strong market presence', 'Established customer base'],
      weaknesses: ['May lack recent innovation', 'Generic positioning'],
      comparison: [],
      recommendedTalkTrack: `Position against ${competitor} by emphasizing your unique differentiators and faster time to value.`,
    };
  }

  /**
   * Get copilot dashboard data
   */
  async getDashboard(): Promise<{
    todayActivity: any;
    pipelineHealth: any;
    aiSuggestions: any[];
    teamPerformance?: any;
  }> {
    console.log(`[Copilot] Generating dashboard data`);

    return {
      todayActivity: {
        callsCompleted: 5,
        emailsSent: 23,
        meetings: 2,
        dealsClosed: 1,
        revenue: 15000,
      },
      pipelineHealth: {
        totalValue: 1250000,
        dealsCount: 45,
        avgDealSize: 27778,
        weightedValue: 875000,
        atRiskDeals: 5,
      },
      aiSuggestions: [
        { type: 'follow_up', priority: 'high', message: 'John Smith hasn\'t responded in 5 days - consider a different channel', leadId: 'lead_001' },
        { type: 'upsell', priority: 'medium', message: 'Acme Corp is ready for enterprise tier - schedule executive call', leadId: 'lead_002' },
        { type: 'retention', priority: 'medium', message: 'XYZ Inc renewal in 30 days - proactive outreach recommended', leadId: 'lead_003' },
        { type: 'competitor', priority: 'low', message: 'Intel from LinkedIn - Target Co evaluating competitors', leadId: 'lead_004' },
      ],
      teamPerformance: {
        totalReps: 8,
        activeDeals: 156,
        avgQuotaAttainment: 78,
        topPerformer: { name: 'Sarah Johnson', attainment: 112 },
      },
    };
  }
}

export const salesCopilot = new SalesCopilot();
export default salesCopilot;
