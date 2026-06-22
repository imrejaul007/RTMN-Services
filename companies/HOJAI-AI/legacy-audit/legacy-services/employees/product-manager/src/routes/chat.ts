import { Router, Request, Response } from 'express';
import { persona } from '../persona';
import type { ChatRequest, ChatResponse } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, history = [], metadata = {} } = req.body as ChatRequest;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const deliverableType = metadata.deliverable || 'prd';

    const response: ChatResponse = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: `Product Manager (Alex) response for: ${message}`,
      prd: {
        status: 'Draft',
        author: 'Alex (PM)',
        lastUpdated: new Date().toISOString(),
        version: '1.0',
        stakeholders: ['Eng Lead', 'Design Lead', 'Marketing'],
        problemStatement: 'Users struggle with [specific pain point] which impacts [business metric]',
        evidence: {
          userResearch: '5+ user interviews revealing consistent theme',
          behavioralData: 'X% drop-off at this funnel step',
          supportSignal: 'Y tickets/month on this topic',
          competitiveSignal: 'Competitor feature addressing this need'
        },
        goals: [
          {
            goal: 'Improve activation',
            metric: '% users completing setup',
            baseline: '42%',
            target: '65%',
            measurementWindow: '60 days post-launch'
          }
        ],
        nonGoals: [
          'We are not redesigning the onboarding flow (separate initiative, Q4)',
          'We are not supporting mobile in v1 (analytics show <8% mobile usage)'
        ],
        personas: [
          {
            name: 'Primary User',
            context: 'Mid-market ops manager, 200-employee company, uses product daily',
            stories: [
              {
                asA: 'ops manager',
                iWant: 'to complete setup quickly',
                soThat: 'I can start using the product immediately',
                acceptanceCriteria: ['Setup completes in under 5 minutes', 'Progress is saved']
              }
            ]
          }
        ],
        solutionOverview: 'A streamlined setup flow that reduces time-to-value...',
        keyDecisions: [
          {
            decision: 'Decision 1',
            approach: 'Chose approach A over approach B because...',
            tradeOff: 'What we give up'
          }
        ],
        technicalConsiderations: {
          dependencies: [
            { system: 'API', reason: 'Backend support needed', owner: 'Backend Lead', timelineRisk: 'Low' }
          ],
          knownRisks: [
            { risk: 'Third-party API rate limits', likelihood: 'Medium', impact: 'High', mitigation: 'Implement request queuing' }
          ],
          openQuestions: [
            { question: 'Open question', owner: 'TBD', deadline: 'TBD' }
          ]
        },
        launchPlan: [
          { phase: 'Internal alpha', date: 'TBD', audience: 'Team + 5 design partners', successGate: 'No P0 bugs' },
          { phase: 'Closed beta', date: 'TBD', audience: '50 opted-in customers', successGate: '<5% error rate' },
          { phase: 'GA rollout', date: 'TBD', audience: '20% → 100% over 2 weeks', successGate: 'Metrics on target' }
        ],
        rollbackCriteria: 'If error rate exceeds X%, revert flag and page on-call',
        appendix: ['User research notes', 'Competitive analysis', 'Design mocks link']
      },
      roadmap: {
        team: 'Product Team',
        period: 'Q2 2026',
        northStarMetric: {
          metric: 'Monthly Active Users',
          current: '10K',
          target: '15K'
        },
        supportingMetrics: [
          { metric: 'Activation rate', current: '42%', target: '65%', trend: 'up' },
          { metric: 'Retention D30', current: '58%', target: '68%', trend: 'up' },
          { metric: 'NPS', current: '35', target: '45', trend: 'up' }
        ],
        now: [
          {
            initiative: 'Feature A',
            problem: 'Users struggle with X',
            successMetric: 'X metric improvement',
            owner: 'Engineering Lead',
            status: 'In Dev',
            eta: 'Week 4'
          }
        ],
        next: [
          {
            initiative: 'Feature B',
            hypothesis: 'If we build X, users will Y',
            successMetric: 'Z metric improvement',
            owner: 'TBD',
            confidence: 'Medium',
            blocker: 'Needs design spike'
          }
        ],
        later: [
          {
            initiative: 'Feature C',
            hypothesis: 'Strategic bet on market shift',
            blocker: 'Signal needed: usage threshold'
          }
        ],
        notBuilding: [
          {
            request: 'Request X',
            source: 'Sales',
            reason: 'Low validated demand',
            revisitCondition: 'If NPS drops below 30'
          }
        ]
      },
      opportunity: {
        submittedBy: 'Alex (PM)',
        date: new Date().toISOString(),
        decisionNeededBy: '2 weeks',
        whyNow: 'Market signal, user behavior shift, or competitive pressure...',
        userEvidence: {
          interviews: ['Key theme from X/Y sessions', 'Another key theme'],
          behavioralData: ['Metric showing problem', 'Funnel drop-off'],
          supportSignal: ['X tickets/month', 'NPS detractor comments']
        },
        businessCase: {
          revenueImpact: 'Estimated ARR lift...',
          costImpact: 'Support cost reduction...',
          strategicFit: 'Connection to OKRs...',
          marketSizing: 'TAM/SAM context...'
        },
        riceScore: {
          reach: 1000,
          impact: 0.5,
          confidence: 0.75,
          effort: 3,
          score: 125
        },
        options: [
          { name: 'Build full feature', pros: 'Complete solution', cons: 'High effort', effort: 'L' },
          { name: 'MVP / scoped version', pros: 'Faster to ship', cons: 'Limited scope', effort: 'M' },
          { name: 'Buy / integrate partner', pros: 'Low effort', cons: 'Dependency', effort: 'S' },
          { name: 'Defer 2 quarters', pros: 'Free up capacity', cons: 'Opportunity cost', effort: '-' }
        ],
        recommendation: {
          decision: 'Build',
          rationale: 'Strong user evidence with reasonable effort...',
          nextStep: 'Schedule design sprint',
          owner: 'Alex'
        }
      },
      agent: 'product-manager',
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
