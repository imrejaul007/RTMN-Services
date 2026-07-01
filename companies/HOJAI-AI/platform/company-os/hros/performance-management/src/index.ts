/**
 * HROS - Performance Management Platform
 *
 * Complete performance management system
 * Inspired by: Lattice + Reflektive + 15Five
 *
 * Modules:
 * - Performance Reviews
 * - Goal Management (OKRs)
 * - Feedback & Recognition
 * - 360 Reviews
 * - Calibration
 * - Development Plans
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TYPES
// ============================================================

export interface ReviewCycle {
  id: string;
  name: string;           // 'H1 2026 Review'
  type: 'annual' | 'half_yearly' | 'quarterly' | 'probation' | 'project';

  // Timeline
  selfReviewStart: Date;
  selfReviewEnd: Date;
  managerReviewStart: Date;
  managerReviewEnd: Date;
  calibrationDate?: Date;
  completionDate?: Date;

  // Settings
  ratingScale: { min: number; max: number; labels: string[] };
  requiresGoalAchievement: boolean;
  requiresCalibration: boolean;

  // Status
  status: 'draft' | 'self_review' | 'manager_review' | 'calibration' | 'completed';

  // Stats
  totalEmployees: number;
  completedSelfReview: number;
  completedManagerReview: number;

  createdAt: Date;
}

export interface PerformanceReview {
  id: string;
  cycleId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  managerId: string;
  managerName: string;

  // Goals Achievement
  goals: GoalAchievement[];

  // Competencies
  competencies: CompetencyRating[];

  // Overall
  selfRating?: number;
  managerRating?: number;
  finalRating?: number;

  // Status
  selfReviewStatus: 'not_started' | 'draft' | 'submitted';
  managerReviewStatus: 'not_started' | 'draft' | 'submitted';

  // Comments
  selfComments?: string;
  managerComments?: string;
  employeeAcknowledgment?: boolean;

  submittedAt?: Date;
  managerSubmittedAt?: Date;

  createdAt: Date;
}

export interface GoalAchievement {
  goalId: string;
  goalTitle: string;
  description: string;
  weight: number;

  // Self assessment
  selfAchievement: number;    // 0-100
  selfComments?: string;

  // Manager assessment
  managerAchievement?: number;
  managerComments?: string;

  // Final
  finalAchievement?: number;
  rating?: number;
}

export interface CompetencyRating {
  competencyId: string;
  competencyName: string;
  description: string;

  // Self rating
  selfRating?: number;

  // Manager rating
  managerRating?: number;

  // Evidence
  evidence: string[];
  examples: string[];
}

export interface Goal {
  id: string;
  employeeId: string;
  cycleId: string;

  title: string;
  description: string;
  category: 'individual' | 'team' | 'company';

  // Metrics
  metric?: string;
  startValue?: number;
  targetValue: number;
  currentValue?: number;

  // Timeline
  startDate: Date;
  dueDate: Date;

  // Status
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;      // 0-100

  // Alignment
  alignedTo?: string;    // Company/Team goal ID
  parentGoalId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface Feedback {
  id: string;
  fromEmployeeId: string;
  fromEmployeeName: string;
  toEmployeeId: string;
  toEmployeeName: string;

  // Feedback type
  type: 'recognition' | 'constructive' | 'development' | 'general';

  // Content
  category: string;
  subject: string;
  message: string;

  // Privacy
  isPublic: boolean;

  // Status
  status: 'draft' | 'sent' | 'acknowledged';

  createdAt: Date;
}

export interface Recognition {
  id: string;
  fromEmployeeId: string;
  fromEmployeeName: string;
  toEmployeeId: string;
  toEmployeeName: string;

  // Award
  type: 'kudos' | 'star_performer' | 'innovation' | 'teamwork' | 'leadership';
  badge?: string;
  points?: number;

  // Reason
  reason: string;

  // Public
  isPublic: boolean;

  // Reactions
  reactions: { employeeId: string; type: string }[];

  createdAt: Date;
}

export interface CalibrationSession {
  id: string;
  cycleId: string;
  name: string;

  // Participants
  facilitator: string;
  managers: string[];

  // Department
  department: string;

  // Timeline
  scheduledAt: Date;
  completedAt?: Date;

  // Rating distribution
  forcedDistribution?: {
    rating1: number;
    rating2: number;
    rating3: number;
    rating4: number;
    rating5: number;
  };

  // Calibrated employees
  calibrations: Calibration[];

  status: 'scheduled' | 'in_progress' | 'completed';

  createdAt: Date;
}

export interface Calibration {
  employeeId: string;
  employeeName: string;
  managerName: string;

  currentRating: number;
  proposedRating: number;
  finalRating?: number;

  rationale: string;
  evidence: string[];

  adjustmentReason?: string;

  status: 'pending' | 'calibrated' | 'approved';
}

export interface DevelopmentPlan {
  id: string;
  employeeId: string;
  employeeName: string;
  managerId: string;

  // Focus areas
  focusAreas: {
    area: string;
    currentLevel: number;
    targetLevel: number;
    priority: 'high' | 'medium' | 'low';
  }[];

  // Actions
  actions: {
    type: 'training' | 'mentorship' | 'project' | 'course' | 'coaching';
    title: string;
    description: string;
    dueDate: Date;
    status: 'planned' | 'in_progress' | 'completed';
    completionDate?: Date;
  }[];

  // Support
  supportNeeded: string;
  managerCommitment: string;

  status: 'draft' | 'active' | 'completed';

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// STORAGE
// ============================================================

const reviewCycles = new Map<string, ReviewCycle>();
const reviews = new Map<string, PerformanceReview>();
const goals = new Map<string, Goal>();
const feedbacks = new Map<string, Feedback>();
const recognitions = new Map<string, Recognition>();
const calibrations = new Map<string, CalibrationSession>();
const developmentPlans = new Map<string, DevelopmentPlan>();

// ============================================================
// ROUTES - REVIEW CYCLES
// ============================================================

router.post('/cycles', async (req, res) => {
  try {
    const cycle: ReviewCycle = {
      id: crypto.randomUUID(),
      ...req.body,
      status: 'draft',
      totalEmployees: 0,
      completedSelfReview: 0,
      completedManagerReview: 0,
      createdAt: new Date(),
    };

    reviewCycles.set(cycle.id, cycle);
    res.status(201).json({ success: true, cycle });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/cycles', async (req, res) => {
  try {
    const { status, type } = req.query;
    let result = Array.from(reviewCycles.values());

    if (status) result = result.filter(c => c.status === status);
    if (type) result = result.filter(c => c.type === type);

    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json({ success: true, cycles: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/cycles/:id/launch', async (req, res) => {
  try {
    const cycle = reviewCycles.get(req.params.id);
    if (!cycle) {
      return res.status(404).json({ success: false, error: 'Cycle not found' });
    }

    cycle.status = 'self_review';
    reviewCycles.set(req.params.id, cycle);

    res.json({ success: true, cycle });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - REVIEWS
// ============================================================

router.post('/reviews', async (req, res) => {
  try {
    const { cycleId, employeeId, employeeName, managerId, goals, competencies } = req.body;

    const cycle = reviewCycles.get(cycleId);
    if (!cycle) {
      return res.status(404).json({ success: false, error: 'Cycle not found' });
    }

    const review: PerformanceReview = {
      id: crypto.randomUUID(),
      cycleId,
      employeeId,
      employeeName,
      department: req.body.department,
      managerId,
      managerName: req.body.managerName,
      goals: goals || [],
      competencies: competencies || [],
      selfReviewStatus: 'not_started',
      managerReviewStatus: 'not_started',
      createdAt: new Date(),
    };

    reviews.set(review.id, review);

    cycle.totalEmployees++;
    reviewCycles.set(cycleId, cycle);

    res.status(201).json({ success: true, review });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reviews/:employeeId', async (req, res) => {
  try {
    const { cycleId, status } = req.query;
    let result = Array.from(reviews.values())
      .filter(r => r.employeeId === req.params.employeeId);

    if (cycleId) result = result.filter(r => r.cycleId === cycleId);
    if (status === 'self') result = result.filter(r => r.selfReviewStatus !== 'not_started');
    if (status === 'manager') result = result.filter(r => r.managerReviewStatus !== 'not_started');

    res.json({ success: true, reviews: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/reviews/:id/self-review', async (req, res) => {
  try {
    const review = reviews.get(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    const { goals, competencies, selfRating, selfComments } = req.body;

    if (goals) review.goals = goals;
    if (competencies) review.competencies = competencies;
    if (selfRating) review.selfRating = selfRating;
    if (selfComments) review.selfComments = selfComments;

    review.selfReviewStatus = 'submitted';
    review.submittedAt = new Date();

    reviews.set(req.params.id, review);

    // Update cycle stats
    const cycle = reviewCycles.get(review.cycleId);
    if (cycle) {
      cycle.completedSelfReview++;
      reviewCycles.set(cycle.id, cycle);
    }

    res.json({ success: true, review });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/reviews/:id/manager-review', async (req, res) => {
  try {
    const review = reviews.get(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    const { goals, competencies, managerRating, managerComments } = req.body;

    if (goals) {
      goals.forEach((g: GoalAchievement) => {
        const existing = review.goals.find(e => e.goalId === g.goalId);
        if (existing) {
          existing.managerAchievement = g.managerAchievement;
          existing.managerComments = g.managerComments;
        }
      });
    }

    if (competencies) {
      competencies.forEach((c: CompetencyRating) => {
        const existing = review.competencies.find(e => e.competencyId === c.competencyId);
        if (existing) {
          existing.managerRating = c.managerRating;
          existing.evidence = c.evidence;
        }
      });
    }

    if (managerRating) {
      review.managerRating = managerRating;
      review.finalRating = calculateFinalRating(review);
    }

    if (managerComments) review.managerComments = managerComments;

    review.managerReviewStatus = 'submitted';
    review.managerSubmittedAt = new Date();

    reviews.set(req.params.id, review);

    // Update cycle stats
    const cycle = reviewCycles.get(review.cycleId);
    if (cycle) {
      cycle.completedManagerReview++;
      reviewCycles.set(cycle.id, cycle);
    }

    res.json({ success: true, review });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - GOALS
// ============================================================

router.post('/goals', async (req, res) => {
  try {
    const goal: Goal = {
      id: crypto.randomUUID(),
      ...req.body,
      status: 'not_started',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    goals.set(goal.id, goal);
    res.status(201).json({ success: true, goal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/goals/:employeeId', async (req, res) => {
  try {
    const { cycleId, status } = req.query;
    let result = Array.from(goals.values())
      .filter(g => g.employeeId === req.params.employeeId);

    if (cycleId) result = result.filter(g => g.cycleId === cycleId);
    if (status) result = result.filter(g => g.status === status);

    res.json({ success: true, goals: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/goals/:id', async (req, res) => {
  try {
    const goal = goals.get(req.params.id);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    const { currentValue, progress, status } = req.body;

    if (currentValue !== undefined) goal.currentValue = currentValue;
    if (progress !== undefined) goal.progress = progress;
    if (status) goal.status = status;

    goal.updatedAt = new Date();

    goals.set(req.params.id, goal);
    res.json({ success: true, goal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - FEEDBACK
// ============================================================

router.post('/feedback', async (req, res) => {
  try {
    const feedback: Feedback = {
      id: crypto.randomUUID(),
      ...req.body,
      status: 'sent',
      createdAt: new Date(),
    };

    feedbacks.set(feedback.id, feedback);
    res.status(201).json({ success: true, feedback });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/feedback/:employeeId', async (req, res) => {
  try {
    const { type, direction } = req.query;
    let result: Feedback[] = [];

    if (direction === 'given') {
      result = Array.from(feedbacks.values())
        .filter(f => f.fromEmployeeId === req.params.employeeId);
    } else {
      result = Array.from(feedbacks.values())
        .filter(f => f.toEmployeeId === req.params.employeeId);
    }

    if (type) result = result.filter(f => f.type === type);

    res.json({ success: true, feedback: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - RECOGNITION
// ============================================================

router.post('/recognition', async (req, res) => {
  try {
    const recognition: Recognition = {
      id: crypto.randomUUID(),
      ...req.body,
      isPublic: req.body.isPublic !== false,
      reactions: [],
      createdAt: new Date(),
    };

    recognitions.set(recognition.id, recognition);
    res.status(201).json({ success: true, recognition });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/recognition/leaderboard', async (req, res) => {
  try {
    const { period } = req.query;
    const allRecognitions = Array.from(recognitions.values());

    // Count by employee
    const counts = new Map<string, { name: string; count: number; points: number }>();

    allRecognitions.forEach(r => {
      const existing = counts.get(r.toEmployeeId) || {
        name: r.toEmployeeName,
        count: 0,
        points: 0,
      };
      existing.count++;
      existing.points += r.points || 10;
      counts.set(r.toEmployeeId, existing);
    });

    const leaderboard = Array.from(counts.entries())
      .map(([id, data]) => ({ employeeId: id, ...data }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 20);

    res.json({ success: true, leaderboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - CALIBRATION
// ============================================================

router.post('/calibrations', async (req, res) => {
  try {
    const session: CalibrationSession = {
      id: crypto.randomUUID(),
      ...req.body,
      calibrations: req.body.calibrations || [],
      status: 'scheduled',
      createdAt: new Date(),
    };

    calibrations.set(session.id, session);
    res.status(201).json({ success: true, session });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/calibrations/:id/calibrate', async (req, res) => {
  try {
    const { employeeId, proposedRating, rationale } = req.body;
    const session = calibrations.get(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const calibration = session.calibrations.find(c => c.employeeId === employeeId);
    if (calibration) {
      calibration.proposedRating = proposedRating;
      calibration.rationale = rationale;
      calibration.status = 'calibrated';
    }

    calibrations.set(req.params.id, session);
    res.json({ success: true, session });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - DEVELOPMENT PLANS
// ============================================================

router.post('/development-plans', async (req, res) => {
  try {
    const plan: DevelopmentPlan = {
      id: crypto.randomUUID(),
      ...req.body,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    developmentPlans.set(plan.id, plan);
    res.status(201).json({ success: true, plan });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/development-plans/:employeeId', async (req, res) => {
  try {
    const result = Array.from(developmentPlans.values())
      .filter(p => p.employeeId === req.params.employeeId);

    res.json({ success: true, plans: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - ANALYTICS
// ============================================================

router.get('/analytics/cycle/:cycleId', async (req, res) => {
  try {
    const cycle = reviewCycles.get(req.params.cycleId);
    if (!cycle) {
      return res.status(404).json({ success: false, error: 'Cycle not found' });
    }

    const cycleReviews = Array.from(reviews.values())
      .filter(r => r.cycleId === req.params.cycleId);

    const analytics = {
      cycle,
      completion: {
        selfReview: {
          completed: cycle.completedSelfReview,
          total: cycle.totalEmployees,
          percentage: cycle.totalEmployees > 0
            ? Math.round(cycle.completedSelfReview / cycle.totalEmployees * 100)
            : 0,
        },
        managerReview: {
          completed: cycle.completedManagerReview,
          total: cycle.totalEmployees,
          percentage: cycle.totalEmployees > 0
            ? Math.round(cycle.completedManagerReview / cycle.totalEmployees * 100)
            : 0,
        },
      },
      ratings: calculateRatingDistribution(cycleReviews),
      goalAchievement: calculateGoalAchievement(cycleReviews),
    };

    res.json({ success: true, analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPERS
// ============================================================

function calculateFinalRating(review: PerformanceReview): number {
  // Weighted average of goals and competencies
  let goalScore = 0;
  let totalWeight = 0;

  review.goals.forEach(g => {
    const achievement = g.managerAchievement || g.selfAchievement;
    goalScore += achievement * g.weight;
    totalWeight += g.weight;
  });

  const goalContribution = totalWeight > 0 ? goalScore / totalWeight : 0;

  // Simple average of competencies
  const compRatings = review.competencies
    .filter(c => c.managerRating)
    .map(c => c.managerRating!);
  const compContribution = compRatings.length > 0
    ? compRatings.reduce((a, b) => a + b, 0) / compRatings.length
    : 0;

  return Math.round((goalContribution * 0.6 + compContribution * 0.4) * 10) / 10;
}

function calculateRatingDistribution(reviews: PerformanceReview[]): Record<number, number> {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  reviews.forEach(r => {
    if (r.finalRating) {
      const rounded = Math.round(r.finalRating);
      distribution[rounded] = (distribution[rounded] || 0) + 1;
    }
  });

  return distribution;
}

function calculateGoalAchievement(reviews: PerformanceReview[]): {
  avgAchievement: number;
  byStatus: Record<string, number>;
} {
  let totalAchievement = 0;
  let totalGoals = 0;
  const byStatus: Record<string, number> = {};

  reviews.forEach(r => {
    r.goals.forEach(g => {
      const achievement = g.finalAchievement || g.managerAchievement || 0;
      totalAchievement += achievement;
      totalGoals++;

      const status = achievement >= 100 ? 'exceeded'
        : achievement >= 80 ? 'met'
        : achievement >= 50 ? 'partial'
        : 'not_met';

      byStatus[status] = (byStatus[status] || 0) + 1;
    });
  });

  return {
    avgAchievement: totalGoals > 0 ? Math.round(totalAchievement / totalGoals) : 0,
    byStatus,
  };
}

export default router;
