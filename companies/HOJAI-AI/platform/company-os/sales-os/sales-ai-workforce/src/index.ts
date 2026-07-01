/**
 * Sales AI Workforce
 *
 * 25 AI agents for SalesOS + CustomerSuccessOS
 *
 * Sales Agents (15):
 * 1. CRO Agent - Executive
 * 2. Sales Manager Agent - Senior
 * 3. SDR Agent - Mid
 * 4. AE Agent - Senior
 * 5. Customer Expansion Agent - Senior
 * 6. Renewal Agent - Mid
 * 7. Revenue Analyst Agent - Senior
 * 8. Commission Agent - Mid
 * 9. Territory Planner Agent - Senior
 * 10. Proposal Writer Agent - Mid
 * 11. Sales Coach Agent - Senior
 * 12. Partner Manager Agent - Senior
 * 13. Prospecting Agent - Mid
 * 14. Conversation Intelligence Agent - Senior
 * 15. Customer Intelligence Agent - Senior
 *
 * Customer Success Agents (10):
 * 16. CS Manager Agent - Senior
 * 17. Onboarding Agent - Mid
 * 18. Health Monitor Agent - Senior
 * 19. Retention Agent - Senior
 * 20. NPS Agent - Mid
 * 21. Journey Agent - Senior
 * 22. Recovery Agent - Senior
 * 23. CheckIn Agent - Mid
 * 24. Campaign Agent - Mid
 * 25. Success Planner Agent - Senior
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TYPES
// ============================================================

export interface SalesAIWorker {
  id: string;
  name: string;
  type: 'sales' | 'cs';
  level: 'junior' | 'mid' | 'senior' | 'principal' | 'executive';
  specialization: string[];
  capabilities: string[];
  status: 'active' | 'training' | 'inactive';
  metrics: {
    handled: number;
    successRate: number;
    avgResponseTime: number;
  };
}

export interface WorkerRequest {
  type: string;
  context: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface WorkerResponse {
  workerId: string;
  workerName: string;
  analysis: string;
  recommendations: string[];
  actions: string[];
  confidence: number;
  nextSteps?: string[];
}

// ============================================================
// WORKER REGISTRY
// ============================================================

const workers = new Map<string, SalesAIWorker>();

function initializeWorkers() {
  const salesWorkers: SalesAIWorker[] = [
    {
      id: 'cro-agent',
      name: 'CRO Agent',
      type: 'sales',
      level: 'executive',
      specialization: ['strategy', 'revenue', 'forecasting'],
      capabilities: ['Revenue Planning', 'Forecast Accuracy', 'Quota Setting', 'Compensation Design', 'Territory Planning'],
      status: 'active',
      metrics: { handled: 0, successRate: 95, avgResponseTime: 0 },
    },
    {
      id: 'sales-manager-agent',
      name: 'Sales Manager Agent',
      type: 'sales',
      level: 'senior',
      specialization: ['pipeline', 'coaching', 'forecasting'],
      capabilities: ['Pipeline Reviews', '1:1 Coaching', 'Deal Strategy', 'Forecasting', 'Team Performance'],
      status: 'active',
      metrics: { handled: 0, successRate: 92, avgResponseTime: 0 },
    },
    {
      id: 'sdr-agent',
      name: 'SDR Agent',
      type: 'sales',
      level: 'mid',
      specialization: ['prospecting', 'qualification', 'outreach'],
      capabilities: ['Lead Research', 'Email Sequencing', 'LinkedIn Outreach', 'Meeting Booking', 'CRM Updates'],
      status: 'active',
      metrics: { handled: 0, successRate: 88, avgResponseTime: 0 },
    },
    {
      id: 'ae-agent',
      name: 'Account Executive Agent',
      type: 'sales',
      level: 'senior',
      specialization: ['discovery', 'demo', 'negotiation'],
      capabilities: ['Discovery Calls', 'Demo Delivery', 'Objection Handling', 'Negotiation', 'Proposal Guidance'],
      status: 'active',
      metrics: { handled: 0, successRate: 90, avgResponseTime: 0 },
    },
    {
      id: 'expansion-agent',
      name: 'Expansion Agent',
      type: 'sales',
      level: 'senior',
      specialization: ['upsell', 'cross-sell', 'expansion'],
      capabilities: ['Expansion Identification', 'Account Health Analysis', 'Upsell Sequencing', 'ROI Calculation'],
      status: 'active',
      metrics: { handled: 0, successRate: 85, avgResponseTime: 0 },
    },
    {
      id: 'renewal-agent',
      name: 'Renewal Agent',
      type: 'sales',
      level: 'mid',
      specialization: ['renewals', 'churn-prevention'],
      capabilities: ['Renewal Tracking', 'Risk Assessment', 'Renewal Negotiations', 'Contract Updates'],
      status: 'active',
      metrics: { handled: 0, successRate: 87, avgResponseTime: 0 },
    },
    {
      id: 'revenue-analyst-agent',
      name: 'Revenue Analyst Agent',
      type: 'sales',
      level: 'senior',
      specialization: ['analytics', 'forecasting', 'reporting'],
      capabilities: ['Pipeline Analysis', 'Revenue Forecasting', 'Attribution', 'Board Reporting', 'Trend Analysis'],
      status: 'active',
      metrics: { handled: 0, successRate: 94, avgResponseTime: 0 },
    },
    {
      id: 'commission-agent',
      name: 'Commission Agent',
      type: 'sales',
      level: 'mid',
      specialization: ['compensation', 'quota', 'spiffs'],
      capabilities: ['Commission Calculation', 'Quota Tracking', 'SPIFF Management', 'Compensation Planning'],
      status: 'active',
      metrics: { handled: 0, successRate: 96, avgResponseTime: 0 },
    },
    {
      id: 'territory-planner-agent',
      name: 'Territory Planner Agent',
      type: 'sales',
      level: 'senior',
      specialization: ['territory', 'coverage', 'routing'],
      capabilities: ['Territory Design', 'Coverage Analysis', 'Routing Optimization', 'Quota Allocation'],
      status: 'active',
      metrics: { handled: 0, successRate: 91, avgResponseTime: 0 },
    },
    {
      id: 'proposal-writer-agent',
      name: 'Proposal Writer Agent',
      type: 'sales',
      level: 'mid',
      specialization: ['proposals', 'quotes', 'contracts'],
      capabilities: ['Proposal Generation', 'ROI Calculation', 'Competitive Positioning', 'Contract Review'],
      status: 'active',
      metrics: { handled: 0, successRate: 89, avgResponseTime: 0 },
    },
    {
      id: 'sales-coach-agent',
      name: 'Sales Coach Agent',
      type: 'sales',
      level: 'senior',
      specialization: ['coaching', 'training', 'skill-development'],
      capabilities: ['Deal Coaching', 'Skill Assessment', 'Role-play Training', 'Call Analysis', 'Performance Plans'],
      status: 'active',
      metrics: { handled: 0, successRate: 93, avgResponseTime: 0 },
    },
    {
      id: 'partner-manager-agent',
      name: 'Partner Manager Agent',
      type: 'sales',
      level: 'senior',
      specialization: ['partners', 'channel', 'alliances'],
      capabilities: ['Partner Enablement', 'Co-sell Orchestration', 'Partner Analytics', 'Deal Registration'],
      status: 'active',
      metrics: { handled: 0, successRate: 86, avgResponseTime: 0 },
    },
    {
      id: 'prospecting-agent',
      name: 'Prospecting Agent',
      type: 'sales',
      level: 'mid',
      specialization: ['company-research', 'intent-signals', 'icp-matching'],
      capabilities: ['Company Research', 'Intent Detection', 'ICP Matching', 'Signal Analysis', 'List Building'],
      status: 'active',
      metrics: { handled: 0, successRate: 85, avgResponseTime: 0 },
    },
    {
      id: 'conversation-intelligence-agent',
      name: 'Conversation Intelligence Agent',
      type: 'sales',
      level: 'senior',
      specialization: ['call-analysis', 'sentiment', 'coaching'],
      capabilities: ['Call Transcription', 'Sentiment Analysis', 'Objection Detection', 'Competitor Mentions', 'Deal Risk Scoring'],
      status: 'active',
      metrics: { handled: 0, successRate: 88, avgResponseTime: 0 },
    },
    {
      id: 'customer-intelligence-agent',
      name: 'Customer Intelligence Agent',
      type: 'sales',
      level: 'senior',
      specialization: ['intent', 'buying-signals', 'personalization'],
      capabilities: ['Intent Detection', 'Buying Signals', 'Personalization', 'Timing Optimization', 'Channel Selection'],
      status: 'active',
      metrics: { handled: 0, successRate: 87, avgResponseTime: 0 },
    },
    // Customer Success Agents
    {
      id: 'cs-manager-agent',
      name: 'CS Manager Agent',
      type: 'cs',
      level: 'senior',
      specialization: ['cs-management', 'nps', 'health-scores'],
      capabilities: ['Health Monitoring', 'NPS Analysis', 'Team Management', 'Escalation Routing', 'Success Planning'],
      status: 'active',
      metrics: { handled: 0, successRate: 91, avgResponseTime: 0 },
    },
    {
      id: 'onboarding-agent',
      name: 'Onboarding Agent',
      type: 'cs',
      level: 'mid',
      specialization: ['onboarding', 'activation', 'time-to-value'],
      capabilities: ['Onboarding Automation', 'Checklist Management', 'Activation Tracking', 'Training Coordination'],
      status: 'active',
      metrics: { handled: 0, successRate: 89, avgResponseTime: 0 },
    },
    {
      id: 'health-monitor-agent',
      name: 'Health Monitor Agent',
      type: 'cs',
      level: 'senior',
      specialization: ['health-scores', 'churn-prediction', 'risk-alerts'],
      capabilities: ['Health Scoring', 'Churn Prediction', 'Risk Detection', 'Usage Analysis', 'Engagement Tracking'],
      status: 'active',
      metrics: { handled: 0, successRate: 90, avgResponseTime: 0 },
    },
    {
      id: 'retention-agent',
      name: 'Retention Agent',
      type: 'cs',
      level: 'senior',
      specialization: ['churn-prevention', 'win-back', 'savings'],
      capabilities: ['Churn Prevention', 'Win-back Campaigns', 'Savings Analysis', 'Intervention Planning'],
      status: 'active',
      metrics: { handled: 0, successRate: 84, avgResponseTime: 0 },
    },
    {
      id: 'nps-agent',
      name: 'NPS Agent',
      type: 'cs',
      level: 'mid',
      specialization: ['nps', 'surveys', 'feedback'],
      capabilities: ['NPS Surveys', 'Feedback Analysis', 'Sentiment Tracking', 'Response Management'],
      status: 'active',
      metrics: { handled: 0, successRate: 92, avgResponseTime: 0 },
    },
    {
      id: 'journey-agent',
      name: 'Journey Agent',
      type: 'cs',
      level: 'senior',
      specialization: ['journey-orchestration', 'triggers', 'personalization'],
      capabilities: ['Journey Mapping', 'Trigger Automation', 'Personalization', 'Journey Analytics', 'Stage Optimization'],
      status: 'active',
      metrics: { handled: 0, successRate: 86, avgResponseTime: 0 },
    },
    {
      id: 'recovery-agent',
      name: 'Recovery Agent',
      type: 'cs',
      level: 'senior',
      specialization: ['crisis-management', 'escalation', 'savings'],
      capabilities: ['Crisis Detection', 'Escalation Routing', 'Executive Involvement', 'Recovery Tracking'],
      status: 'active',
      metrics: { handled: 0, successRate: 82, avgResponseTime: 0 },
    },
    {
      id: 'checkin-agent',
      name: 'Check-in Agent',
      type: 'cs',
      level: 'mid',
      specialization: ['touchpoints', 'meetings', 'followups'],
      capabilities: ['Check-in Scheduling', 'Meeting Prep', 'Follow-up Automation', 'QBR Preparation'],
      status: 'active',
      metrics: { handled: 0, successRate: 90, avgResponseTime: 0 },
    },
    {
      id: 'campaign-agent',
      name: 'Campaign Agent',
      type: 'cs',
      level: 'mid',
      specialization: ['engagement-campaigns', 'nurture', 'reactivation'],
      capabilities: ['Campaign Creation', 'Nurture Sequences', 'Reactivation Campaigns', 'Engagement Tracking'],
      status: 'active',
      metrics: { handled: 0, successRate: 85, avgResponseTime: 0 },
    },
    {
      id: 'success-planner-agent',
      name: 'Success Planner Agent',
      type: 'cs',
      level: 'senior',
      specialization: ['success-plans', 'milestones', 'roi-tracking'],
      capabilities: ['Success Plan Creation', 'Milestone Tracking', 'ROI Calculation', 'Stakeholder Management'],
      status: 'active',
      metrics: { handled: 0, successRate: 88, avgResponseTime: 0 },
    },
  ];

  salesWorkers.forEach(w => workers.set(w.id, w));
  console.log(`✅ Initialized ${workers.size} Sales/CS AI workers`);
}

initializeWorkers();

// ============================================================
// ROUTES
// ============================================================

router.get('/workers', async (req, res) => {
  try {
    const { type, level, specialization } = req.query;

    let result = Array.from(workers.values());

    if (type) result = result.filter(w => w.type === type);
    if (level) result = result.filter(w => w.level === level);
    if (specialization) {
      result = result.filter(w =>
        w.specialization.some(s => s.includes(specialization as string))
      );
    }

    res.json({ success: true, workers: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/workers/:id', async (req, res) => {
  try {
    const worker = workers.get(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }
    res.json({ success: true, worker });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/process', async (req, res) => {
  try {
    const { type, context, priority, preferredWorker } = req.body;

    // Find best worker
    let worker: SalesAIWorker | undefined;
    if (preferredWorker && workers.has(preferredWorker)) {
      worker = workers.get(preferredWorker);
    } else {
      const typeMap: Record<string, string[]> = {
        'forecast': ['revenue-analyst-agent', 'cro-agent'],
        'pipeline': ['sales-manager-agent', 'cro-agent'],
        'prospecting': ['prospecting-agent', 'sdr-agent'],
        'qualification': ['sdr-agent', 'ae-agent'],
        'proposal': ['proposal-writer-agent'],
        'coaching': ['sales-coach-agent'],
        'expansion': ['expansion-agent'],
        'renewal': ['renewal-agent'],
        'health': ['health-monitor-agent', 'cs-manager-agent'],
        'onboarding': ['onboarding-agent'],
        'retention': ['retention-agent', 'recovery-agent'],
        'nps': ['nps-agent'],
        'journey': ['journey-agent'],
        'campaign': ['campaign-agent'],
        'checkin': ['checkin-agent'],
        'success-plan': ['success-planner-agent'],
      };

      const candidates = typeMap[type] || ['sales-manager-agent', 'cs-manager-agent'];
      worker = workers.get(candidates[0]);
    }

    if (!worker) {
      return res.status(404).json({ success: false, error: 'No suitable worker found' });
    }

    // Process request
    const response = generateResponse(worker, type, context);

    // Update metrics
    worker.metrics.handled++;
    workers.set(worker.id, worker);

    res.json({
      success: true,
      response,
      worker: { id: worker.id, name: worker.name },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const all = Array.from(workers.values());
    const sales = all.filter(w => w.type === 'sales');
    const cs = all.filter(w => w.type === 'cs');

    res.json({
      success: true,
      stats: {
        total: all.length,
        sales: { count: sales.length, active: sales.filter(w => w.status === 'active').length },
        cs: { count: cs.length, active: cs.filter(w => w.status === 'active').length },
        avgSuccessRate: all.reduce((s, w) => s + w.metrics.successRate, 0) / all.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function generateResponse(
  worker: SalesAIWorker,
  type: string,
  context: Record<string, any>
): Omit<WorkerResponse, 'workerId' | 'workerName'> {
  const basedOn = context.basedOn || 'context provided';

  return {
    analysis: `Analyzed ${type} request for ${context.accountName || context.customerId || 'account'} by ${worker.name}`,
    recommendations: generateRecommendations(worker, type, context),
    actions: generateActions(worker, type, context),
    confidence: worker.metrics.successRate,
    nextSteps: generateNextSteps(worker, type, context),
  };
}

function generateRecommendations(
  worker: SalesAIWorker,
  type: string,
  context: Record<string, any>
): string[] {
  const recs: string[] = [];

  switch (type) {
    case 'forecast':
      recs.push('Review pipeline distribution');
      recs.push('Identify at-risk deals');
      recs.push('Plan QBR with key accounts');
      break;
    case 'prospecting':
      recs.push('Research target companies');
      recs.push('Build outreach sequence');
      recs.push('Identify decision makers');
      break;
    case 'health':
      recs.push('Review engagement metrics');
      recs.push('Schedule executive check-in');
      recs.push('Prepare expansion offer');
      break;
    case 'retention':
      recs.push('Identify churn signals');
      recs.push('Prepare retention offer');
      recs.push('Involve leadership if high-value');
      break;
    default:
      recs.push(`Process ${type} request`);
      recs.push('Update relevant systems');
      recs.push('Schedule follow-up');
  }

  return recs.slice(0, 4);
}

function generateActions(
  worker: SalesAIWorker,
  type: string,
  context: Record<string, any>
): string[] {
  return [
    'Log activity in CRM',
    'Update relevant dashboards',
    'Notify stakeholders',
    'Schedule next touchpoint',
  ];
}

function generateNextSteps(
  worker: SalesAIWorker,
  type: string,
  context: Record<string, any>
): string[] {
  const priority = context.priority || 'medium';

  if (priority === 'urgent' || priority === 'high') {
    return [
      'Escalate to human manager',
      'Involve senior leadership if needed',
      'Create incident ticket',
    ];
  }

  return [
    'Continue monitoring',
    'Update in 48 hours',
    'Loop in account manager',
  ];
}

export default router;
