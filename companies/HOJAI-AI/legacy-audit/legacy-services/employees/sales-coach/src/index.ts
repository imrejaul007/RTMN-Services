/**
 * Sales Coach
 * Port: 4803
 *
 * Role: Train sales team, conduct role-plays, provide feedback
 * Persona: Mentor, expert salesperson, continuous learner
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4803;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// KPI Metrics
const kpiMetrics = {
  sessionsCompleted: 0,
  rolePlaysConducted: 0,
  dealsImproved: 0,
  avgImprovement: 0,
  teamWinRate: 0,
  avgDealSize: 0
};

// Types
interface SalesPerson {
  id: string;
  name: string;
  role: 'sdr' | 'ae' | 'se';
  tenure: string;
  strengths: string[];
  weaknesses: string[];
  certifications: string[];
  recentScores: {
    discovery: number;
    qualification: number;
    demo: number;
    negotiation: number;
    closing: number;
    overall: number;
  };
  recentCalls: string[];
}

interface CoachingSession {
  id: string;
  salesPersonId: string;
  type: 'discovery' | 'demo' | 'negotiation' | 'closing' | 'general';
  focusAreas: string[];
  rolePlayScenario?: string;
  score: number;
  feedback: string[];
  actionItems: string[];
  timestamp: Date;
}

interface RolePlayScenario {
  id: string;
  title: string;
  type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  persona: {
    name: string;
    company: string;
    role: string;
    personality: string;
    objections: string[];
    buyingSignals: string[];
  };
  context: {
    situation: string;
    budget: string;
    timeline: string;
    competitors: string[];
  };
  evaluationCriteria: {
    criteria: string;
    weight: number;
  }[];
}

// Sales methodology frameworks
const frameworks = {
  MEDDIC: {
    name: 'MEDDIC',
    description: 'Qualification framework for complex B2B sales',
    steps: [
      { letter: 'M', name: 'Metrics', description: 'Identify quantifiable business outcomes', weight: 20 },
      { letter: 'E', name: 'Economic Buyer', description: 'Identify the decision-maker with budget authority', weight: 20 },
      { letter: 'D', name: 'Decision Criteria', description: 'Understand their evaluation criteria', weight: 15 },
      { letter: 'D', name: 'Decision Process', description: 'Map the buying process and stakeholders', weight: 15 },
      { letter: 'I', name: 'Identify Pain', description: 'Quantify the pain and its business impact', weight: 15 },
      { letter: 'C', name: 'Champion', description: 'Find an internal advocate who will sell for you', weight: 15 }
    ]
  },
  SPIN: {
    name: 'SPIN Selling',
    description: 'Question-based selling methodology',
    steps: [
      { letter: 'S', name: 'Situation', description: 'Questions about current state', weight: 15 },
      { letter: 'P', name: 'Problem', description: 'Questions about challenges and pain points', weight: 25 },
      { letter: 'I', name: 'Implication', description: 'Questions about impact of problems', weight: 30 },
      { letter: 'N', name: 'Need-Payoff', description: 'Questions about value of solution', weight: 30 }
    ]
  },
  Challenger: {
    name: 'The Challenger Sale',
    description: 'Teach, tailor, and take control',
    steps: [
      { letter: 'T', name: 'Teach', description: 'Provide unique perspectives on their business', weight: 25 },
      { letter: 'T', name: 'Tailor', description: 'Customize message to their value drivers', weight: 25 },
      { letter: 'T', name: 'Take Control', description: 'Maintain control of the sale', weight: 50 }
    ]
  },
  Sandler: {
    name: 'Sandler Selling',
    description: 'Submarine model - qualify before proceeding',
    steps: [
      { letter: 'B', name: 'Bond & Build', description: 'Build rapport and establish trust', weight: 20 },
      { letter: 'U', name: 'Up-Front Contract', description: 'Agree on the meeting purpose upfront', weight: 20 },
      { letter: 'B', name: 'Bad News', description: 'Identify budget, authority, and timeline early', weight: 25 },
      { letter: 'M', name: 'Pivot', description: 'Redirect conversation to mutual next steps', weight: 20 },
      { letter: 'C', name: 'Close', description: 'Agree on next steps before ending', weight: 15 }
    ]
  }
};

// Generate role-play scenario
function generateScenario(type: string, difficulty: 'easy' | 'medium' | 'hard'): RolePlayScenario {
  const scenarios: Record<string, RolePlayScenario[]> = {
    discovery: [
      {
        id: 'discovery-1',
        title: 'The Busy Executive',
        type: 'discovery',
        difficulty: 'medium',
        persona: {
          name: 'Rajesh Sharma',
          company: 'TechCorp India',
          role: 'VP of Operations',
          personality: 'Time-poor, decisive, wants facts fast',
          objections: ['Too busy for long meetings', 'Already have a solution'],
          buyingSignals: ['Asking about implementation', 'Mentions timeline pressure']
        },
        context: {
          situation: 'Growing company with 500 employees, expanding to 3 new cities',
          budget: 'Has budget but needs justification',
          timeline: 'Q3 implementation required',
          competitors: ['Zoho', 'SAP']
        },
        evaluationCriteria: [
          { criteria: 'Discovery questions asked', weight: 30 },
          { criteria: 'Pain identification', weight: 25 },
          { criteria: 'Business outcome focus', weight: 25 },
          { criteria: 'Time management', weight: 20 }
        ]
      }
    ],
    demo: [
      {
        id: 'demo-1',
        title: 'The Technical Evaluator',
        type: 'demo',
        difficulty: 'hard',
        persona: {
          name: 'Priya Patel',
          company: 'DataSoft Solutions',
          role: 'CTO',
          personality: 'Technical, skeptical, asks detailed questions',
          objections: ['Integration concerns', 'Security certifications', 'Performance benchmarks'],
          buyingSignals: ['Asking about APIs', 'Requesting architecture details']
        },
        context: {
          situation: 'Enterprise deal, need to replace legacy system',
          budget: 'Significant budget but requires board approval',
          timeline: 'Decision by end of quarter',
          competitors: ['Salesforce', 'Microsoft']
        },
        evaluationCriteria: [
          { criteria: 'Technical depth', weight: 30 },
          { criteria: 'Handling objections', weight: 25 },
          { criteria: 'Demo flow', weight: 25 },
          { criteria: 'Value demonstration', weight: 20 }
        ]
      }
    ],
    negotiation: [
      {
        id: 'negotiation-1',
        title: 'The Procurement Expert',
        type: 'negotiation',
        difficulty: 'hard',
        persona: {
          name: 'Amit Kumar',
          company: 'Global Enterprises',
          role: 'Head of Procurement',
          personality: 'Negotiation expert, knows tactics, pushes for discounts',
          objections: ['Price too high', 'Need better terms', 'Will review next quarter'],
          buyingSignals: ['Discussing implementation', 'Asking about references']
        },
        context: {
          situation: 'Large deal, procurement involved late',
          budget: 'Fixed budget, needs maximum discount',
          timeline: 'End of quarter close required',
          competitors: ['Multiple vendors shortlisted']
        },
        evaluationCriteria: [
          { criteria: 'Value reinforcement', weight: 30 },
          { criteria: 'Concession strategy', weight: 25 },
          { criteria: 'Handling pressure', weight: 25 },
          { criteria: 'Win-win focus', weight: 20 }
        ]
      }
    ],
    closing: [
      {
        id: 'closing-1',
        title: 'The Hesitant Buyer',
        type: 'closing',
        difficulty: 'medium',
        persona: {
          name: 'Sunita Reddy',
          company: 'RetailMax',
          role: 'CEO',
          personality: 'Generally positive but always finds reasons to delay',
          objections: ['Need to discuss with partner', 'Want to see Q4 numbers first'],
          buyingSignals: ['Positive feedback', 'Asked about next steps multiple times']
        },
        context: {
          situation: 'Champion is CEO, sponsor exists',
          budget: 'Approved but timing is issue',
          timeline: 'Delayed decision, quarter at risk',
          competitors: ['Niche competitor']
        },
        evaluationCriteria: [
          { criteria: 'Reading buying signals', weight: 30 },
          { criteria: 'Trial closes used', weight: 25 },
          { criteria: 'Commitment techniques', weight: 25 },
          { criteria: 'Handling hesitation', weight: 20 }
        ]
      }
    ]
  };

  const pool = scenarios[type] || scenarios.discovery;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Score role-play performance
function scoreRolePlay(
  responses: Record<string, string>,
  scenario: RolePlayScenario,
  criteria: Record<string, { score: number, notes: string }>
): { score: number, breakdown: Record<string, number>, feedback: string[], grade: string } {
  const weightedScores: Record<string, number> = {};
  let totalWeight = 0;
  let totalScore = 0;

  scenario.evaluationCriteria.forEach(c => {
    const responseScore = criteria[c.criteria]?.score || 50;
    weightedScores[c.criteria] = responseScore * c.weight / 100;
    totalWeight += c.weight;
    totalScore += weightedScores[c.criteria];
  });

  const finalScore = Math.round(totalScore * 100 / totalWeight);

  const feedback: string[] = [];

  if (finalScore >= 85) {
    feedback.push('Excellent performance! You demonstrated mastery.');
  } else if (finalScore >= 70) {
    feedback.push('Good performance with some areas for improvement.');
  } else if (finalScore >= 50) {
    feedback.push('Average performance. Focus on the key areas identified.');
  } else {
    feedback.push('Needs significant improvement. Consider additional training.');
  }

  // Specific feedback based on scores
  Object.entries(criteria).forEach(([key, value]) => {
    if (value.score >= 80) {
      feedback.push(`Strength: Your ${key} skills are excellent.`);
    } else if (value.score < 60) {
      feedback.push(`Development Area: Work on your ${key}.`);
    }
    if (value.notes) {
      feedback.push(`Note: ${value.notes}`);
    }
  });

  const grade = finalScore >= 90 ? 'A+' :
                finalScore >= 80 ? 'A' :
                finalScore >= 70 ? 'B+' :
                finalScore >= 60 ? 'B' :
                finalScore >= 50 ? 'C' : 'D';

  return { score: finalScore, breakdown: weightedScores, feedback, grade };
}

// Get coaching recommendations
function getRecommendations(scores: SalesPerson['recentScores']): {
  priority: string,
  focusAreas: string[],
  exercises: string[],
  resources: string[]
} {
  const weakest = Object.entries(scores)
    .filter(([key]) => key !== 'overall')
    .sort((a, b) => a[1] - b[1])[0];

  const focusAreaMap: Record<string, { exercises: string[], resources: string[] }> = {
    discovery: {
      exercises: [
        'Practice open-ended questions',
        'Role-play first 5 minutes of call',
        'Shadow top performers on discovery calls'
      ],
      resources: ['MEDDIC Guide', 'Discovery Question Bank']
    },
    qualification: {
      exercises: [
        'BANT qualification drill',
        'Red flag identification exercise',
        'Budget conversation practice'
      ],
      resources: ['BANT Framework', 'Qualification Checklist']
    },
    demo: {
      exercises: [
        'Demo script memorization',
        'Handling technical objections',
        'Demo without slides practice'
      ],
      resources: ['Demo Playbook', 'Technical Objection Handling Guide']
    },
    negotiation: {
      exercises: [
        'Concession mapping drill',
        'Handling price objections',
        'Trade-off negotiation practice'
      ],
      resources: ['Negotiation Scripts', 'Value Anchoring Guide']
    },
    closing: {
      exercises: [
        'Trial close practice',
        'Commitment language drill',
        'Handling final objections'
      ],
      resources: ['Closing Techniques', 'Advance Commitment Guide']
    }
  };

  const area = focusAreaMap[weakest[0]] || focusAreaMap.discovery;

  return {
    priority: weakest[0],
    focusAreas: [weakest[0], weakest[1] || 'overall'],
    exercises: area.exercises,
    resources: area.resources
  };
}

// Get framework details
app.get('/api/frameworks', (req: Request, res: Response) => {
  res.json({
    frameworks,
    recommendations: {
      enterprise: 'MEDDIC or Challenger',
      smb: 'SPIN or Sandler',
      transactional: 'Basic qualification with SPIN elements',
      solution: 'Challenger with MEDDIC elements'
    }
  });
});

// Create coaching session
app.post('/api/session/create', (req: Request, res: Response) => {
  const { salesPersonId, type, focusAreas } = req.body;

  const session: CoachingSession = {
    id: `session-${Date.now()}`,
    salesPersonId,
    type,
    focusAreas,
    timestamp: new Date(),
    score: 0,
    feedback: [],
    actionItems: []
  };

  const recommendations = getRecommendations({
    discovery: 70,
    qualification: 65,
    demo: 75,
    negotiation: 60,
    closing: 70,
    overall: 68
  });

  res.json({
    session,
    preWork: {
      watch: [`${type} training video`],
      read: [`${type.charAt(0).toUpperCase() + type.slice(1)} best practices guide`],
      prepare: ['Your top 3 questions', 'Recent challenge you faced']
    },
    agenda: [
      `Review recent performance (5 min)`,
      `Role-play scenario (25 min)`,
      `Debrief and feedback (15 min)`,
      `Action plan (5 min)`
    ]
  });
});

// Conduct role-play
app.post('/api/roleplay/start', (req: Request, res: Response) => {
  const { type, difficulty, salesPersonId } = req.body;

  const scenario = generateScenario(type, difficulty);

  res.json({
    scenario,
    coachNotes: {
      objective: `Practice ${type} skills in a realistic scenario`,
      keyMoments: [
        'Opening - establish rapport',
        'Discovery - uncover needs',
        'Value - articulate benefits',
        'Close - secure commitment'
      ],
      coachingPrompts: [
        'What would you say next?',
        'How would you handle this objection?',
        'What\'s your next step?'
      ]
    }
  });
});

// Submit role-play evaluation
app.post('/api/roleplay/evaluate', (req: Request, res: Response) => {
  const { scenarioId, responses, criteria, salesPersonId } = req.body;

  const scenario = generateScenario('discovery', 'medium'); // In real app, fetch by ID
  const evaluation = scoreRolePlay(responses, scenario, criteria);

  kpiMetrics.rolePlaysConducted++;
  kpiMetrics.sessionsCompleted++;

  const improvement = evaluation.score - 70; // Assume baseline 70
  if (improvement > 0) {
    kpiMetrics.dealsImproved += Math.round(improvement / 10);
  }

  res.json({
    evaluation,
    improvement: {
      currentScore: evaluation.score,
      previousScore: 70,
      delta: evaluation.score - 70
    },
    nextSteps: [
      'Practice recommended exercises',
      'Review provided resources',
      'Schedule follow-up session',
      'Apply in real calls'
    ],
    gamification: {
      pointsEarned: evaluation.score * 10,
      badgeEarned: evaluation.score >= 80 ? 'Role-Play Master' : null,
      streakBonus: 0
    }
  });
});

// Get sales person profile
app.get('/api/salesperson/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const profile: SalesPerson = {
    id,
    name: 'Demo Sales Rep',
    role: 'ae',
    tenure: '6 months',
    strengths: ['Product knowledge', 'Relationship building'],
    weaknesses: ['Discovery questions', 'Closing'],
    certifications: ['MEDDIC Certified', 'Challenger Certified'],
    recentScores: {
      discovery: 72,
      qualification: 68,
      demo: 75,
      negotiation: 65,
      closing: 70,
      overall: 70
    },
    recentCalls: []
  };

  const recommendations = getRecommendations(profile.recentScores);

  res.json({
    profile,
    recommendations,
    developmentPlan: {
      shortTerm: recommendations.exercises.slice(0, 2),
      longTerm: ['Advanced negotiation', 'Executive presence']
    },
    recentImprovements: [
      { skill: 'Demo skills', trend: '+5 points this month' },
      { skill: 'Objection handling', trend: '+3 points this month' }
    ]
  });
});

// Training curriculum
app.get('/api/curriculum/:role', (req: Request, res: Response) => {
  const { role } = req.params;

  const curricula: Record<string, { modules: { id: string, title: string, duration: string, completed: boolean }[] }> = {
    sdr: {
      modules: [
        { id: 'sdr-1', title: 'Cold Calling Fundamentals', duration: '2 hours', completed: true },
        { id: 'sdr-2', title: 'Email Outreach Best Practices', duration: '1.5 hours', completed: true },
        { id: 'sdr-3', title: 'LinkedIn Prospecting', duration: '1 hour', completed: false },
        { id: 'sdr-4', title: 'Qualification Frameworks', duration: '2 hours', completed: false },
        { id: 'sdr-5', title: 'Setting Meetings', duration: '1 hour', completed: false }
      ]
    },
    ae: {
      modules: [
        { id: 'ae-1', title: 'Discovery Mastery', duration: '3 hours', completed: true },
        { id: 'ae-2', title: 'Demo Excellence', duration: '2 hours', completed: true },
        { id: 'ae-3', title: 'Proposal Writing', duration: '2 hours', completed: false },
        { id: 'ae-4', title: 'Negotiation Tactics', duration: '3 hours', completed: false },
        { id: 'ae-5', title: 'Closing Techniques', duration: '2 hours', completed: false },
        { id: 'ae-6', title: 'Advanced Objection Handling', duration: '2 hours', completed: false }
      ]
    },
    se: {
      modules: [
        { id: 'se-1', title: 'Technical Discovery', duration: '2 hours', completed: true },
        { id: 'se-2', title: 'Architecture Deep Dive', duration: '3 hours', completed: false },
        { id: 'se-3', title: 'Security & Compliance', duration: '2 hours', completed: false },
        { id: 'se-4', title: 'Integration Patterns', duration: '2 hours', completed: false }
      ]
    }
  };

  const curriculum = curricula[role] || curricula.ae;
  const completed = curriculum.modules.filter(m => m.completed).length;
  const total = curriculum.modules.length;

  res.json({
    curriculum,
    progress: {
      completed,
      total,
      percentage: Math.round(completed / total * 100)
    },
    nextUp: curriculum.modules.find(m => !m.completed)
  });
});

// Live call coaching tips
app.get('/api/coaching-tip/:phase', (req: Request, res: Response) => {
  const { phase } = req.params;

  const tips: Record<string, { immediate: string[], mindset: string, keyMetric: string }> = {
    opening: {
      immediate: [
        'Reference something specific about them',
        'State the purpose in first 30 seconds',
        'Get commitment to continue',
        'Use their name naturally'
      ],
      mindset: 'Be curious, not transactional',
      keyMetric: 'Engagement in first 60 seconds'
    },
    discovery: {
      immediate: [
        'Ask one question at a time',
        'Use silence effectively',
        'Take notes on their words',
        'Confirm understanding frequently'
      ],
      mindset: 'Listen to understand, not to respond',
      keyMetric: 'Customer talking time %'
    },
    demo: {
      immediate: [
        'Follow the "see-feel-change" structure',
        'Mirror their terminology',
        'Stop and confirm after each section',
        'Focus on their pain points'
      ],
      mindset: 'Show, don\'t tell',
      keyMetric: 'Demo engagement score'
    },
    proposal: {
      immediate: [
        'Recap agreed pain points',
        'Present value before price',
        'Use ROI calculator',
        'Anchor on alternatives\' cost'
      ],
      mindset: 'Price is a feature, value isn\'t',
      keyMetric: 'Value-to-price ratio'
    },
    negotiation: {
      immediate: [
        'Never give without getting',
        'Use the word "if" generously',
        'Know your BATNA',
        'Stay calm under pressure'
      ],
      mindset: 'Find win-win, not winner',
      keyMetric: 'Final margin achieved'
    },
    close: {
      immediate: [
        'Trial close throughout',
        'Address final concerns directly',
        'Use assumptive close',
        'Get specific commitment'
      ],
      mindset: 'Be confident, not pushy',
      keyMetric: 'Close rate'
    }
  };

  res.json(tips[phase] || tips.opening);
});

// Coach Dashboard / KPIs
app.get('/api/kpis', (req: Request, res: Response) => {
  res.json({
    metrics: {
      sessionsCompleted: kpiMetrics.sessionsCompleted,
      rolePlaysConducted: kpiMetrics.rolePlaysConducted,
      dealsImproved: kpiMetrics.dealsImproved,
      avgImprovement: kpiMetrics.avgImprovement || 12,
      teamWinRate: kpiMetrics.teamWinRate || 32,
      avgDealSize: kpiMetrics.avgDealSize || 250000
    },
    teamHealth: {
      strongPerformers: 3,
      needsAttention: 2,
      inCoaching: 1
    },
    recommendations: [
      'Focus on negotiation skills across team',
      'Implement peer role-play buddy system',
      'Weekly win/loss analysis sessions'
    ]
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'sales-coach',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Sales Coach running on port ${PORT}`);
  console.log('Role: Train team, role-play, provide feedback');
});

export default app;
