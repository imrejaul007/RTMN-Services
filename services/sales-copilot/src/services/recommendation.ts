import { v4 as uuidv4 } from 'uuid';
import { Recommendation, RecommendationType, RecommendationStatus, IRecommendation } from '../types';
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
);

interface GetRecommendationsParams {
  leadId: string;
  type?: RecommendationType;
  limit?: number;
  status?: string;
}

interface CreateRecommendationParams {
  leadId: string;
  type: RecommendationType;
  priority: number;
  title: string;
  description: string;
  action: string;
  reasoning?: string;
}

// Demo recommendations based on lead stage
const STAGE_RECOMMENDATIONS: Record<string, { type: RecommendationType; title: string; action: string; reasoning: string }[]> = {
  new: [
    {
      type: RecommendationType.EMAIL_TEMPLATE,
      title: 'Send Introduction Email',
      action: 'Send introductory email with value proposition',
      reasoning: 'First impression is critical for new leads'
    },
    {
      type: RecommendationType.TIMING_SUGGESTION,
      title: 'Best Time to Contact',
      action: 'Contact between 9-11 AM on Tuesday or Wednesday',
      reasoning: 'These times have highest response rates for cold outreach'
    }
  ],
  contacted: [
    {
      type: RecommendationType.NEXT_BEST_ACTION,
      title: 'Schedule Discovery Call',
      action: 'Send calendar invite for 30-minute discovery call',
      reasoning: 'Engaged leads should be moved to qualification stage'
    },
    {
      type: RecommendationType.TALKING_POINTS,
      title: 'Discovery Questions',
      action: 'Prepare 5 discovery questions about pain points',
      reasoning: 'Understand their challenges before proposing solutions'
    }
  ],
  qualified: [
    {
      type: RecommendationType.NEXT_BEST_ACTION,
      title: 'Send Product Demo',
      action: 'Schedule product demonstration tailored to their needs',
      reasoning: 'Qualified leads want to see the solution in action'
    },
    {
      type: RecommendationType.COMPETITIVE_INSIGHT,
      title: 'Competitive Positioning',
      action: 'Prepare comparison against their likely alternatives',
      reasoning: 'Address competitive concerns proactively'
    }
  ],
  proposal: [
    {
      type: RecommendationType.PRICING_SUGGESTION,
      title: 'Optimize Pricing',
      action: 'Consider offering annual discount for faster decision',
      reasoning: 'Proposal stage deals often stall on pricing'
    },
    {
      type: RecommendationType.NEXT_BEST_ACTION,
      title: 'Add Stakeholders',
      action: 'Request introduction to decision makers',
      reasoning: 'Multi-threaded deals close faster'
    }
  ],
  negotiation: [
    {
      type: RecommendationType.NEXT_BEST_ACTION,
      title: 'Prepare Counter-Arguments',
      action: 'Anticipate objections and prepare responses',
      reasoning: 'Negotiation stage requires quick, confident responses'
    },
    {
      type: RecommendationType.TIMING_SUGGESTION,
      title: 'Set Close Deadline',
      action: 'Suggest a specific close date to create urgency',
      reasoning: 'Deals without deadlines often drift'
    }
  ]
};

export async function getRecommendations(params: GetRecommendationsParams): Promise<IRecommendation[]> {
  const { leadId, type, limit, status } = params;

  logger.info(`Getting recommendations for lead: ${leadId}`);

  try {
    // Try to get from database
    const RecommendationModel = await import('../models/Recommendation');
    let query: any = { leadId };

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    } else {
      query.status = RecommendationStatus.PENDING;
    }

    let recommendations = await RecommendationModel.Recommendation.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit || 10);

    // If no recommendations in DB, generate demo recommendations
    if (recommendations.length === 0) {
      recommendations = generateDemoRecommendations(leadId);
    }

    return recommendations;
  } catch (error) {
    // If DB fails, return demo recommendations
    logger.warn('Database unavailable, returning demo recommendations');
    return generateDemoRecommendations(leadId);
  }
}

export async function createRecommendation(params: CreateRecommendationParams): Promise<IRecommendation> {
  const { leadId, type, priority, title, description, action, reasoning } = params;

  logger.info(`Creating recommendation for lead: ${leadId}`, { type, title });

  try {
    const RecommendationModel = await import('../models/Recommendation');

    const recommendation = new RecommendationModel.Recommendation({
      leadId,
      type,
      priority,
      title,
      description,
      action,
      reasoning,
      status: RecommendationStatus.PENDING
    });

    await recommendation.save();

    return recommendation;
  } catch (error) {
    logger.error('Failed to save recommendation to database');
    throw new Error('Failed to create recommendation');
  }
}

function generateDemoRecommendations(leadId: string): IRecommendation[] {
  const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation'];
  const randomStage = stages[Math.floor(Math.random() * stages.length)];
  const stageRecommendations = STAGE_RECOMMENDATIONS[randomStage] || STAGE_RECOMMENDATIONS.new;

  return stageRecommendations.map((rec, index) => ({
    _id: uuidv4(),
    leadId,
    type: rec.type,
    priority: 10 - index,
    title: rec.title,
    description: rec.reasoning,
    action: rec.action,
    reasoning: rec.reasoning,
    confidence: 0.8 - (index * 0.1),
    status: RecommendationStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    isNew: true
  } as any));
}

export async function getNextBestAction(leadId: string): Promise<IRecommendation | null> {
  const recommendations = await getRecommendations({
    leadId,
    type: RecommendationType.NEXT_BEST_ACTION,
    limit: 1
  });

  return recommendations[0] || null;
}

export async function getCompetitiveInsights(leadId: string): Promise<IRecommendation[]> {
  return getRecommendations({
    leadId,
    type: RecommendationType.COMPETITIVE_INSIGHT
  });
}

export async function acceptRecommendation(recommendationId: string): Promise<void> {
  try {
    const RecommendationModel = await import('../models/Recommendation');
    const recommendation = await RecommendationModel.Recommendation.findById(recommendationId);

    if (recommendation) {
      await recommendation.accept();
    }
  } catch (error) {
    logger.error('Failed to accept recommendation');
    throw new Error('Failed to accept recommendation');
  }
}

export async function completeRecommendation(recommendationId: string): Promise<void> {
  try {
    const RecommendationModel = await import('../models/Recommendation');
    const recommendation = await RecommendationModel.Recommendation.findById(recommendationId);

    if (recommendation) {
      await recommendation.complete();
    }
  } catch (error) {
    logger.error('Failed to complete recommendation');
    throw new Error('Failed to complete recommendation');
  }
}
