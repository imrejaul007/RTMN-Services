/**
 * HROS AI Workforce Registry
 *
 * Registry of all AI workers for Human Resources OS
 *
 * Workers:
 * 1. Chief People Officer AI
 * 2. HRBP Agent
 * 3. Recruiter Agent
 * 4. Payroll Agent
 * 5. Learning Coach AI
 * 6. Career Coach AI
 * 7. Performance Coach AI
 * 8. Compensation Advisor AI
 * 9. Wellness AI
 * 10. Compliance AI
 * 11. Skills Agent AI
 * 12. Onboarding Agent
 * 13. Retention AI
 * 14. Culture AI
 * 15. Workforce Planner AI
 */

import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

// ============================================================
// AI WORKER TYPES
// ============================================================

export interface AIWorker {
  id: string;
  name: string;
  type: string;
  level: 'junior' | 'mid' | 'senior' | 'principal' | 'executive';
  department: 'hr';
  specialization: string[];
  capabilities: string[];
  status: 'active' | 'training' | 'inactive';
  tasks: {
    completed: number;
    avgResponseTime: number; // seconds
    satisfaction: number; // 0-100
  };
  lastActive: Date;
  createdAt: Date;
}

export interface WorkerRequest {
  type: string;
  topic: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context: Record<string, any>;
}

export interface WorkerResponse {
  workerId: string;
  workerName: string;
  response: {
    analysis: string;
    recommendations: string[];
    actions: string[];
  };
  confidence: number;
  escalation?: {
    required: boolean;
    reason?: string;
    escalateTo?: string;
  };
  timestamp: Date;
}

// ============================================================
// WORKER REGISTRY
// ============================================================

const workers = new Map<string, AIWorker>();

// Initialize default workers
function initializeWorkers() {
  const defaultWorkers: Omit<AIWorker, 'lastActive' | 'createdAt'>[] = [
    {
      id: 'cpo-ai',
      name: 'Chief People Officer AI',
      type: 'executive',
      level: 'executive',
      department: 'hr',
      specialization: ['strategy', 'leadership', 'culture'],
      capabilities: [
        'Talent Strategy',
        'Culture Building',
        'HR Policy',
        'Executive Advisory',
        'Workforce Planning',
        'Employee Experience',
        'DEI',
        'Change Management',
      ],
      status: 'active',
      tasks: { completed: 0, avgResponseTime: 0, satisfaction: 95 },
    },
    {
      id: 'hrbp-agent',
      name: 'HR Business Partner Agent',
      type: 'hrbp',
      level: 'senior',
      department: 'hr',
      specialization: ['employee-relations', 'performance', 'development'],
      capabilities: [
        '1:1 Coaching',
        'Conflict Resolution',
        'Performance Management',
        'Career Development',
        'Policy Guidance',
        'Employee Wellness',
        'Grievance Handling',
      ],
      status: 'active',
      tasks: { completed: 0, avgResponseTime: 0, satisfaction: 92 },
    },
    {
      id: 'recruiter-agent',
      name: 'Recruiter AI',
      type: 'recruiter',
      level: 'mid',
      department: 'hr',
      specialization: ['sourcing', 'screening', 'interviewing'],
      capabilities: [
        'Resume Screening',
        'Candidate Sourcing',
        'Interview Scheduling',
        'Background Checks',
        'Offer Negotiation',
        'Onboarding Coordination',
      ],
      status: 'active',
      tasks: { completed: 0, avgResponseTime: 0, satisfaction: 88 },
    },
    {
      id: 'payroll-ai',
      name: 'Payroll AI',
      type: 'payroll',
      level: 'mid',
      department: 'hr',
      specialization: ['processing', 'compliance', 'reporting'],
      capabilities: [
        'Salary Processing',
        'Tax Calculations',
        'Reimbursements',
        'Statutory Compliance',
        'Payslip Generation',
        'Bank Transfers',
      ],
      status: 'active',
      tasks: { completed: 0, avgResponseTime: 0, satisfaction: 96 },
    },
    {
      id: 'learning-coach-ai',
      name: 'Learning Coach AI',
      type: 'learning',
      level: 'senior',
      department: 'hr',
      specialization: ['lms', 'certifications', 'career'],
      capabilities: [
        'Course Recommendations',
        'Learning Paths',
        'Skill Gap Analysis',
        'Certification Tracking',
        'Training Scheduling',
        'Progress Monitoring',
      ],
      status: 'active',
      tasks: { completed: 0, avgResponseTime: 0, satisfaction: 91 },
    },
    {
      id: 'career-coach-ai',
      name: 'Career Coach AI',
      type: 'career',
      level: 'senior',
      department: 'hr',
      specialization: ['growth', 'mobility', 'succession'],
      capabilities: [
        'Career Pathing',
        'Promotion Guidance',
        'Internal Mobility',
        'Succession Planning',
        'Leadership Development',
        'Mentorship Matching',
      ],
      status: 'active',
      tasks: { completed: 0, avgResponseTime: 0, satisfaction: 89 },
    },
    {
      id: 'performance-coach-ai',
      name: 'Performance Coach AI',
      type: 'performance',
      level: 'senior',
      department: 'hr',
      specialization: ['reviews', 'goals', 'calibration'],
      capabilities: [
        'Performance Reviews',
        'Goal Setting',
        'OKR Tracking',
        'Calibration Support',
        'Feedback Coaching',
        'PIP Management',
      ],
      status: 'active',
      tasks: { completed: 0, avgResponseTime: 0, satisfaction: 90 },
    },
    {
      id: 'compensation-advisor-ai',
      name: 'Compensation Advisor AI',
      type: 'compensation',
      level: 'principal',
      department: 'hr',
      specialization: ['salaries', 'benefits', 'equity'],
      capabilities: [
        'Salary Benchmarking',
        'Band Analysis',
        'Equity Planning',
        'Benefits Optimization',
        'Promotion Packages',
        'Retention Bonuses',
      ],
      status: 'active',
      tasks: { completed: 0, avgResponseTime: 0, satisfaction: 94 },
    },
    {
      id: 'wellness-ai',
      name: 'Wellness AI',
      type: 'wellness',
      level: 'mid',
      department: 'hr',
      specialization: ['mental-health', 'engagement', 'burnout'],
      capabilities: [
        'Wellness Checks',
        'Burnout Detection',
        'Stress Analysis',
        'EAP Referrals',
        'Work-Life Balance',
        'Engagement Surveys',
      ],
      status: 'active',
      tasks: { completed: 0, avgResponseTime: 0, satisfaction: 93 },
    },
    {
      id: 'compliance-ai',
      name: 'HR Compliance AI',
      type: 'compliance',
      level: 'principal',
      department: 'hr',
      specialization: ['labor-law', 'audit', 'policy'],
      capabilities: [
        'Policy Review',
        'Labor Law Updates',
        'Compliance Audits',
        'Documentation',
        'Risk Assessment',
        'Training Requirements',
      ],
      status: 'active',
      tasks: { completed: 0, avgResponseTime: 0, satisfaction: 97 },
    },
    {
      id: 'skills-agent-ai',
      name: 'Skills Agent AI',
      type: 'skills',
      level: 'mid',
      department: 'hr',
      specialization: ['skills-graph', 'assessments', 'matching'],
      capabilities: [
        'Skill Assessment',
        'Team Capability Mapping',
        'Skill Gap Analysis',
        'Role Matching',
        'Learning Recommendations',
        'Certification Tracking',
      ],
      status: 'active',
      tasks: { completed: 0, avgResponseTime: 0, satisfaction: 90 },
    },
    {
      id: 'onboarding-ai',
      name: 'Onboarding AI',
      type: 'onboarding',
      level: 'mid',
      department: 'hr',
      specialization: ['setup', 'training', 'integration'],
      capabilities: [
        'Day 1 Setup',
        'IT Account Creation',
        'Training Schedules',
        'Buddy Assignment',
        '30-60-90 Day Plans',
        'Progress Tracking',
      ],
      status: 'active',
      tasks: { completed: 0, avgResponseTime: 0, satisfaction: 91 },
    },
    {
      id: 'retention-ai',
      name: 'Retention AI',
      type: 'retention',
      level: 'senior',
      department: 'hr',
      specialization: ['turnover', 'engagement', 'exit-prevention'],
      capabilities: [
        'Flight Risk Analysis',
        'Stay Interviews',
        'Counter-Offer Guidance',
        'Exit Analysis',
        'Retention Packages',
        'Career Pathing',
      ],
      status: 'active',
      tasks: { completed: 0, avgResponseTime: 0, satisfaction: 88 },
    },
    {
      id: 'culture-ai',
      name: 'Culture AI',
      type: 'culture',
      level: 'senior',
      department: 'hr',
      specialization: ['values', 'recognition', ' rituals'],
      capabilities: [
        'Culture Assessment',
        'Values Alignment',
        'Recognition Programs',
        'Team Rituals',
        'Communication Patterns',
        'Belonging Initiatives',
      ],
      status: 'active',
      tasks: { completed: 0, avgResponseTime: 0, satisfaction: 92 },
    },
    {
      id: 'workforce-planner-ai',
      name: 'Workforce Planner AI',
      type: 'workforce-planning',
      level: 'principal',
      department: 'hr',
      specialization: ['forecasting', 'capacity', 'modeling'],
      capabilities: [
        'Headcount Planning',
        'Capacity Modeling',
        'Scenario Analysis',
        'Budget Forecasting',
        'Hiring Pipelines',
        'Productivity Analysis',
      ],
      status: 'active',
      tasks: { completed: 0, avgResponseTime: 0, satisfaction: 94 },
    },
  ];

  defaultWorkers.forEach(worker => {
    workers.set(worker.id, {
      ...worker,
      lastActive: new Date(),
      createdAt: new Date(),
    });
  });

  console.log(`✅ Initialized ${workers.size} HROS AI workers`);
}

initializeWorkers();

// ============================================================
// ROUTES
// ============================================================

/**
 * List all AI workers
 */
router.get('/workers', async (req, res) => {
  try {
    const { specialization, level, status } = req.query;

    let result = Array.from(workers.values());

    if (specialization) {
      result = result.filter(w =>
        w.specialization.includes(specialization as string)
      );
    }

    if (level) {
      result = result.filter(w => w.level === level);
    }

    if (status) {
      result = result.filter(w => w.status === status);
    }

    res.json({
      success: true,
      workers: result,
      count: result.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get worker by ID
 */
router.get('/workers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const worker = workers.get(id);

    if (!worker) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    res.json({ success: true, worker });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Process request with appropriate worker
 */
router.post('/process', async (req, res) => {
  try {
    const { type, topic, priority, context, preferredWorker } = req.body;

    if (!type || !topic) {
      return res.status(400).json({
        success: false,
        error: 'type and topic are required',
      });
    }

    // Find best worker for this request
    const worker = findBestWorker(type, topic, preferredWorker);

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'No suitable worker found',
      });
    }

    // Process with worker (simulated)
    const startTime = Date.now();
    const response = await processWithWorker(worker, { type, topic, priority, context });
    const processingTime = (Date.now() - startTime) / 1000;

    // Update worker stats
    worker.tasks.completed++;
    worker.tasks.avgResponseTime = (
      (worker.tasks.avgResponseTime * (worker.tasks.completed - 1) + processingTime
    ) / worker.tasks.completed;
    worker.lastActive = new Date();

    workers.set(worker.id, worker);

    res.json({
      success: true,
      response,
      worker: { id: worker.id, name: worker.name },
      processingTime,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get worker performance metrics
 */
router.get('/workers/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    const worker = workers.get(id);

    if (!worker) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    res.json({
      success: true,
      metrics: {
        tasks: worker.tasks,
        status: worker.status,
        lastActive: worker.lastActive,
        capabilities: worker.capabilities,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Assign employee to HRBP
 */
router.post('/workers/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeIds } = req.body;

    const worker = workers.get(id);
    if (!worker) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    // For HRBP agents, track assigned employees
    if (worker.type === 'hrbp') {
      // In real implementation, store employee assignments
      console.log(`Assigned ${employeeIds?.length || 0} employees to ${worker.name}`);
    }

    res.json({
      success: true,
      message: `Employee assignments updated for ${worker.name}`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function findBestWorker(
  type: string,
  topic: string,
  preferredWorker?: string
): AIWorker | undefined {
  // If preferred worker specified, use that
  if (preferredWorker && workers.has(preferredWorker)) {
    return workers.get(preferredWorker);
  }

  // Map request type to best worker
  const typeMapping: Record<string, string[]> = {
    'consultation': ['hrbp-agent', 'cpo-ai'],
    'recruitment': ['recruiter-agent'],
    'payroll': ['payroll-ai'],
    'learning': ['learning-coach-ai'],
    'career': ['career-coach-ai'],
    'performance': ['performance-coach-ai'],
    'compensation': ['compensation-advisor-ai'],
    'wellness': ['wellness-ai'],
    'compliance': ['compliance-ai'],
    'skills': ['skills-agent-ai'],
    'onboarding': ['onboarding-ai'],
    'retention': ['retention-ai'],
    'culture': ['culture-ai'],
    'planning': ['workforce-planner-ai'],
    'strategy': ['cpo-ai', 'workforce-planner-ai'],
    'executive': ['cpo-ai'],
  };

  const possibleWorkers = typeMapping[type] || ['hrbp-agent'];

  // Find first active worker
  for (const workerId of possibleWorkers) {
    const worker = workers.get(workerId);
    if (worker && worker.status === 'active') {
      return worker;
    }
  }

  // Fallback to HRBP
  return workers.get('hrbp-agent');
}

async function processWithWorker(
  worker: AIWorker,
  request: WorkerRequest
): Promise<WorkerResponse['response']> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

  // Generate response based on worker type
  const topic = request.topic.toLowerCase();

  // Generic response structure
  const baseResponse = {
    analysis: `Analyzed ${request.type} request for: ${request.topic}`,
    recommendations: generateRecommendations(worker, request),
    actions: generateActions(worker, request),
  };

  // Worker-specific enhancements
  switch (worker.type) {
    case 'hrbp':
      return {
        ...baseResponse,
        analysis: baseResponse.analysis + ' | HRBP consultation provided.',
      };

    case 'recruiter':
      return {
        analysis: `Candidate/sourcing analysis for: ${topic}`,
        recommendations: [
          'Review candidate profiles',
          'Schedule initial screening',
          'Prepare interview questions',
        ],
        actions: [
          'Send intro email',
          'Update candidate tracker',
          'Notify hiring manager',
        ],
      };

    case 'payroll':
      return {
        analysis: `Payroll processing for: ${topic}`,
        recommendations: [
          'Verify employee details',
          'Check statutory compliance',
          'Update records',
        ],
        actions: [
          'Process payment',
          'Generate payslip',
          'Update accounting',
        ],
      };

    case 'learning':
      return {
        analysis: `Learning path analysis for: ${topic}`,
        recommendations: [
          'Identify skill gaps',
          'Recommend courses',
          'Create learning plan',
        ],
        actions: [
          'Enroll in training',
          'Schedule sessions',
          'Track progress',
        ],
      };

    case 'performance':
      return {
        analysis: `Performance review for: ${topic}`,
        recommendations: [
          'Review goals',
          'Gather feedback',
          'Assess competencies',
        ],
        actions: [
          'Update ratings',
          'Schedule 1:1',
          'Document feedback',
        ],
      };

    case 'wellness':
      return {
        analysis: `Wellness check: ${topic}`,
        recommendations: [
          'Schedule wellness check',
          'Offer EAP if needed',
          'Monitor engagement',
        ],
        actions: [
          'Send wellness survey',
          'Review workload',
          'Follow up in 2 weeks',
        ],
      };

    default:
      return baseResponse;
  }
}

function generateRecommendations(
  worker: AIWorker,
  request: WorkerRequest
): string[] {
  const priority = request.priority || 'medium';
  const base: string[] = [];

  if (priority === 'urgent' || priority === 'high') {
    base.push('Schedule meeting within 24 hours');
    base.push('Notify relevant stakeholders');
  }

  // Add capabilities-based recommendations
  const caps = worker.capabilities.slice(0, 3);
  return [...base, ...caps.map(c => `Consider ${c} support`)];
}

function generateActions(
  worker: AIWorker,
  request: WorkerRequest
): string[] {
  return [
    `Log ${request.type} request`,
    `Update ${worker.name} case file`,
    `Schedule follow-up in 1 week`,
  ];
}

export default router;
