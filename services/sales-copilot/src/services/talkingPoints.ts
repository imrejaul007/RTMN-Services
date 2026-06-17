import { v4 as uuidv4 } from 'uuid';
import { TalkingPoint } from '../types';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

interface TalkingPointsParams {
  leadId: string;
  context?: string;
  industry?: string;
  recentNotes?: string;
}

// Demo talking points templates by category
const talkingPointTemplates: Record<string, { title: string; content: string; category: string }[]> = {
  general: [
    {
      category: 'Discovery',
      title: 'Understand Business Challenges',
      content: 'Ask about their current pain points and how they are addressing them today.'
    },
    {
      category: 'Value Proposition',
      title: 'Highlight Key Benefits',
      content: 'Emphasize ROI, time savings, and efficiency improvements.'
    },
    {
      category: 'Social Proof',
      title: 'Share Success Stories',
      content: 'Mention similar companies in their industry who have achieved results.'
    }
  ],
  technology: [
    {
      category: 'Technical',
      title: 'Integration Capabilities',
      content: 'Discuss API capabilities, security features, and scalability options.'
    },
    {
      category: 'Technical',
      title: 'Technical Requirements',
      content: 'Understand their current tech stack and infrastructure.'
    },
    {
      category: 'Discovery',
      title: 'Digital Transformation Goals',
      content: 'Ask about their数字化转型 roadmap and timeline.'
    }
  ],
  healthcare: [
    {
      category: 'Compliance',
      title: 'HIPAA Considerations',
      content: 'Address compliance requirements and data security measures.'
    },
    {
      category: 'Discovery',
      title: 'Patient Experience',
      content: 'Understand how they measure patient satisfaction and outcomes.'
    },
    {
      category: 'Value',
      title: 'Operational Efficiency',
      content: 'Discuss potential for reducing administrative burden.'
    }
  ],
  finance: [
    {
      category: 'Security',
      title: 'Financial Regulations',
      content: 'Address compliance with financial regulations and audit requirements.'
    },
    {
      category: 'Discovery',
      title: 'Reporting Needs',
      content: 'Understand their current reporting and analytics capabilities.'
    },
    {
      category: 'ROI',
      title: 'Cost Savings',
      content: 'Quantify potential savings in time and resources.'
    }
  ],
  retail: [
    {
      category: 'Customer Experience',
      title: 'Omnichannel Strategy',
      content: 'Discuss unified customer experience across channels.'
    },
    {
      category: 'Operations',
      title: 'Inventory Management',
      content: 'Address inventory tracking and supply chain efficiency.'
    },
    {
      category: 'Sales',
      title: 'Upselling Opportunities',
      content: 'Show how to increase average order value.'
    }
  ]
};

export async function generateTalkingPoints(params: TalkingPointsParams): Promise<TalkingPoint[]> {
  const { leadId, context, industry, recentNotes } = params;

  logger.info(`Generating talking points for lead: ${leadId}`, { industry, context });

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 300));

  // Get industry-specific templates or use general
  const templates = talkingPointTemplates[industry?.toLowerCase() || 'general'] || talkingPointTemplates.general;

  // Generate talking points with unique IDs
  const talkingPoints: TalkingPoint[] = templates.map((template, index) => ({
    id: uuidv4(),
    category: template.category,
    title: template.title,
    content: template.content,
    relevance: generateRelevanceScore(index, recentNotes),
    objections: generateObjections(template.category),
    successIndicators: generateSuccessIndicators(template.category)
  }));

  // Sort by relevance
  talkingPoints.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

  // Add context-specific talking point if context is provided
  if (context) {
    talkingPoints.unshift({
      id: uuidv4(),
      category: 'Context',
      title: 'Address Specific Context',
      content: `Based on recent interaction: ${context}`,
      relevance: 1.0,
      objections: ['This is too specific', 'That was a one-time issue'],
      successIndicators: ['Prospect acknowledges the point', 'Shows understanding']
    });
  }

  logger.info(`Generated ${talkingPoints.length} talking points for lead: ${leadId}`);

  return talkingPoints;
}

function generateRelevanceScore(index: number, recentNotes?: string): number {
  // Base score based on position
  const baseScore = 1 - (index * 0.15);

  // Boost if there are recent notes
  const noteBoost = recentNotes ? 0.1 : 0;

  return Math.min(1, Math.max(0.3, baseScore + noteBoost));
}

function generateObjections(category: string): string[] {
  const objections: Record<string, string[]> = {
    Discovery: [
      "We don't have time for this",
      "We're already working with a competitor"
    ],
    'Value Proposition': [
      "Your solution is too expensive",
      "We need to see ROI first"
    ],
    'Social Proof': [
      "Our situation is different",
      "Those examples don't apply to us"
    ],
    Technical: [
      "This won't integrate with our systems",
      "Our IT team has concerns"
    ],
    Compliance: [
      "We need to review compliance requirements",
      "Our legal team needs to approve this"
    ],
    ROI: [
      "Prove the ROI with our specific numbers",
      "How long until we see results?"
    ],
    Context: [
      "That was just one interaction",
      "We've moved past that issue"
    ]
  };

  return objections[category] || ["We'll think about it", "Come back later"];
}

function generateSuccessIndicators(category: string): string[] {
  const indicators: Record<string, string[]> = {
    Discovery: [
      "Prospect shares specific pain points",
      "Asks clarifying questions"
    ],
    'Value Proposition': [
      "Prospect shows interest",
      "Asks about pricing or implementation"
    ],
    'Social Proof': [
      "Prospect wants to connect with references",
      "Shows curiosity about similar companies"
    ],
    Technical: [
      "Technical questions are answered positively",
      "IT team shows interest"
    ],
    Compliance: [
      "Prospect confirms compliance needs",
      "Legal review scheduled"
    ],
    ROI: [
      "Budget discussion initiated",
      "ROI calculation requested"
    ],
    Context: [
      "Prospect acknowledges the point",
      "Shares additional context"
    ]
  };

  return indicators[category] || ["Prospect engages positively", "Shows understanding"];
}
