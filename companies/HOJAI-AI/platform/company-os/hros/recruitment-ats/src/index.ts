/**
 * HROS - Recruitment ATS Platform
 *
 * Applicant Tracking System
 * Inspired by: Greenhouse + Lever + Freshteam
 *
 * Modules:
 * - Job Postings
 * - Candidate Management
 * - Interview Scheduling
 * - Offer Management
 * - Onboarding Pipeline
 * - Analytics & Reports
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TYPES
// ============================================================

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'intern';

  // Details
  description: string;
  requirements: string[];
  responsibilities: string[];
  qualifications: string[];

  // Compensation
  salary?: { min: number; max: number; currency: string };
  equity?: string;
  benefits: string[];

  // Pipeline
  pipeline: PipelineStage[];
  hiringManager: string;
  recruiter: string;

  // Settings
  status: 'draft' | 'open' | 'on_hold' | 'closed';
  source: 'careers_page' | 'linkedin' | 'referral' | 'agency' | 'naukri' | 'indeed';

  // Stats
  candidates: number;
  hired: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineStage {
  id: string;
  name: string;
  type: 'screening' | 'interview' | 'assessment' | 'offer' | 'hired' | 'rejected';
  order: number;
  daysLimit?: number;
  requiresApproval?: boolean;
}

export interface Candidate {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone?: string;

  // Profile
  linkedIn?: string;
  portfolio?: string;
  resume?: string;
  currentCompany?: string;
  currentTitle?: string;
  experience?: string;
  location?: string;

  // Application
  source: 'apply' | 'referral' | 'sourced' | 'agency';
  referredBy?: string;

  // Stage
  currentStageId: string;
  stageHistory: StageHistory[];

  // Ratings
  ratings: { interviewer: string; rating: number; feedback?: string }[];

  // Scorecard
  overallScore?: number;

  // Status
  status: 'active' | 'hired' | 'rejected' | 'withdrawn';

  // Notes
  notes: Note[];

  createdAt: Date;
  updatedAt: Date;
}

export interface StageHistory {
  stageId: string;
  stageName: string;
  enteredAt: Date;
  exitedAt?: Date;
  outcome?: 'moved_forward' | 'rejected' | 'withdrawn';
  feedback?: string;
}

export interface Note {
  id: string;
  author: string;
  content: string;
  isPrivate: boolean;
  createdAt: Date;
}

export interface Interview {
  id: string;
  candidateId: string;
  jobId: string;
  stageId: string;

  // Interviewers
  interviewers: Interviewer[];
  type: 'phone' | 'video' | 'onsite' | 'technical' | 'panel';

  // Timing
  scheduledAt: Date;
  duration: number;  // minutes
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';

  // Feedback
  feedback?: InterviewFeedback[];

  // Score
  recommendation?: 'strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no';
  overallFeedback?: string;

  createdAt: Date;
}

export interface Interviewer {
  id: string;
  name: string;
  email: string;
  role: 'hiring_manager' | 'recruiter' | 'team_member' | 'technical';
}

export interface InterviewFeedback {
  interviewerId: string;
  interviewerName: string;
  scores: { category: string; score: number; maxScore: number }[];
  strengths: string[];
  concerns: string[];
  recommendation: 'strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no';
  notes?: string;
  submittedAt?: Date;
}

export interface Offer {
  id: string;
  candidateId: string;
  jobId: string;

  // Compensation
  salary: number;
  currency: string;
  equity?: { type: string; shares?: number; vesting: string };
  signingBonus?: number;
  startDate: Date;

  // Benefits
  benefits: string[];

  // Status
  status: 'draft' | 'pending_approval' | 'sent' | 'accepted' | 'declined' | 'expired';
  expiresAt?: Date;
  respondedAt?: Date;

  createdAt: Date;
}

export interface Referral {
  id: string;
  candidateId: string;
  referrerEmployeeId: string;
  referrerName: string;
  bonus: number;
  status: 'pending' | 'paid' | 'cancelled';
  paidAt?: Date;
}

// ============================================================
// STORAGE
// ============================================================

const jobs = new Map<string, Job>();
const candidates = new Map<string, Candidate>();
const interviews = new Map<string, Interview>();
const offers = new Map<string, Offer>();
const referrals = new Map<string, Referral>();

// Default pipeline stages
const DEFAULT_PIPELINE: PipelineStage[] = [
  { id: 'applied', name: 'Applied', type: 'screening', order: 1, daysLimit: 3 },
  { id: 'screening', name: 'Screening Call', type: 'screening', order: 2, daysLimit: 7 },
  { id: 'technical', name: 'Technical Interview', type: 'interview', order: 3, daysLimit: 14 },
  { id: 'culture', name: 'Culture Fit', type: 'interview', order: 4, daysLimit: 7 },
  { id: 'final', name: 'Final Round', type: 'interview', order: 5, daysLimit: 7 },
  { id: 'offer', name: 'Offer', type: 'offer', order: 6, daysLimit: 14 },
  { id: 'hired', name: 'Hired', type: 'hired', order: 7 },
];

// ============================================================
// ROUTES - JOBS
// ============================================================

router.post('/jobs', async (req, res) => {
  try {
    const job: Job = {
      id: crypto.randomUUID(),
      ...req.body,
      pipeline: req.body.pipeline || DEFAULT_PIPELINE,
      candidates: 0,
      hired: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jobs.set(job.id, job);
    res.status(201).json({ success: true, job });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const { status, department, location, type } = req.query;
    let result = Array.from(jobs.values());

    if (status) result = result.filter(j => j.status === status);
    if (department) result = result.filter(j => j.department === department);
    if (location) result = result.filter(j => j.location === location);
    if (type) result = result.filter(j => j.type === type);

    res.json({ success: true, jobs: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/jobs/:id', async (req, res) => {
  try {
    const job = jobs.get(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // Get candidates
    const jobCandidates = Array.from(candidates.values())
      .filter(c => c.jobId === req.params.id);

    res.json({ success: true, job, candidates: jobCandidates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/jobs/:id', async (req, res) => {
  try {
    const job = jobs.get(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    Object.assign(job, req.body, { updatedAt: new Date() });
    jobs.set(req.params.id, job);

    res.json({ success: true, job });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - CANDIDATES
// ============================================================

router.post('/candidates', async (req, res) => {
  try {
    const { jobId } = req.body;
    const job = jobs.get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const candidate: Candidate = {
      id: crypto.randomUUID(),
      ...req.body,
      currentStageId: job.pipeline[0]?.id || 'applied',
      stageHistory: [{
        stageId: job.pipeline[0]?.id || 'applied',
        stageName: job.pipeline[0]?.name || 'Applied',
        enteredAt: new Date(),
      }],
      ratings: [],
      notes: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    candidates.set(candidate.id, candidate);

    // Update job count
    job.candidates++;
    jobs.set(jobId, job);

    res.status(201).json({ success: true, candidate });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/candidates/:id', async (req, res) => {
  try {
    const candidate = candidates.get(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    const job = jobs.get(candidate.jobId);
    const candidateInterviews = Array.from(interviews.values())
      .filter(i => i.candidateId === req.params.id);

    res.json({ success: true, candidate, job, interviews: candidateInterviews });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/candidates/:id/move', async (req, res) => {
  try {
    const { stageId, feedback } = req.body;
    const candidate = candidates.get(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    const job = jobs.get(candidate.jobId);
    const newStage = job?.pipeline.find(s => s.id === stageId);

    if (!newStage) {
      return res.status(404).json({ success: false, error: 'Stage not found' });
    }

    // Update stage history
    const currentHistory = candidate.stageHistory.find(h => !h.exitedAt);
    if (currentHistory) {
      currentHistory.exitedAt = new Date();
      currentHistory.outcome = stageId === 'rejected' ? 'rejected' : 'moved_forward';
    }

    candidate.stageHistory.push({
      stageId,
      stageName: newStage.name,
      enteredAt: new Date(),
      feedback,
    });

    candidate.currentStageId = stageId;
    candidate.updatedAt = new Date();

    if (stageId === 'hired') {
      candidate.status = 'hired';
      if (job) {
        job.hired++;
        jobs.set(job.id, job);
      }
    } else if (stageId === 'rejected') {
      candidate.status = 'rejected';
    }

    candidates.set(req.params.id, candidate);

    res.json({ success: true, candidate });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/candidates/:id/notes', async (req, res) => {
  try {
    const { author, content, isPrivate } = req.body;
    const candidate = candidates.get(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    const note: Note = {
      id: crypto.randomUUID(),
      author,
      content,
      isPrivate: isPrivate || false,
      createdAt: new Date(),
    };

    candidate.notes.push(note);
    candidate.updatedAt = new Date();
    candidates.set(req.params.id, candidate);

    res.status(201).json({ success: true, note });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/candidates/:id/rate', async (req, res) => {
  try {
    const { interviewer, rating, feedback } = req.body;
    const candidate = candidates.get(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    candidate.ratings.push({ interviewer, rating, feedback });
    candidate.overallScore = calculateOverallScore(candidate.ratings);
    candidate.updatedAt = new Date();

    candidates.set(req.params.id, candidate);

    res.json({ success: true, candidate });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - INTERVIEWS
// ============================================================

router.post('/interviews', async (req, res) => {
  try {
    const { candidateId, jobId, interviewers, type, scheduledAt, duration } = req.body;

    const interview: Interview = {
      id: crypto.randomUUID(),
      candidateId,
      jobId,
      stageId: (candidates.get(candidateId))?.currentStageId || 'interview',
      interviewers,
      type,
      scheduledAt: new Date(scheduledAt),
      duration: duration || 60,
      status: 'scheduled',
      createdAt: new Date(),
    };

    interviews.set(interview.id, interview);

    res.status(201).json({ success: true, interview });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/interviews/:id/feedback', async (req, res) => {
  try {
    const interview = interviews.get(req.params.id);
    if (!interview) {
      return res.status(404).json({ success: false, error: 'Interview not found' });
    }

    const feedback: InterviewFeedback = {
      ...req.body,
      submittedAt: new Date(),
    };

    interview.feedback = interview.feedback || [];
    interview.feedback.push(feedback);

    // Calculate recommendation
    const recommendations = interview.feedback.map(f => f.recommendation);
    interview.recommendation = calculateRecommendation(recommendations);

    interviews.set(req.params.id, interview);

    res.json({ success: true, interview });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/interviews', async (req, res) => {
  try {
    const { date, interviewerId, status } = req.query;
    let result = Array.from(interviews.values());

    if (date) {
      const dateStr = date as string;
      result = result.filter(i =>
        i.scheduledAt.toISOString().split('T')[0] === dateStr
      );
    }

    if (interviewerId) {
      result = result.filter(i =>
        i.interviewers.some(inter => inter.id === interviewerId)
      );
    }

    if (status) result = result.filter(i => i.status === status);

    res.json({ success: true, interviews: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - OFFERS
// ============================================================

router.post('/offers', async (req, res) => {
  try {
    const { candidateId, jobId, salary, currency, equity, signingBonus, startDate } = req.body;

    const candidate = candidates.get(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    const offer: Offer = {
      id: crypto.randomUUID(),
      candidateId,
      jobId,
      salary,
      currency: currency || 'INR',
      equity,
      signingBonus,
      startDate: new Date(startDate),
      benefits: req.body.benefits || [],
      status: 'draft',
      createdAt: new Date(),
    };

    offers.set(offer.id, offer);

    // Move candidate to offer stage
    candidate.currentStageId = 'offer';
    candidate.updatedAt = new Date();
    candidates.set(candidateId, candidate);

    res.status(201).json({ success: true, offer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/offers/:id/send', async (req, res) => {
  try {
    const offer = offers.get(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }

    offer.status = 'sent';
    offer.expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    offers.set(req.params.id, offer);

    res.json({ success: true, offer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/offers/:id/respond', async (req, res) => {
  try {
    const { accepted } = req.body;
    const offer = offers.get(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }

    offer.status = accepted ? 'accepted' : 'declined';
    offer.respondedAt = new Date();

    if (accepted) {
      // Move candidate to hired
      const candidate = candidates.get(offer.candidateId);
      if (candidate) {
        candidate.status = 'hired';
        candidate.currentStageId = 'hired';
        candidate.stageHistory.push({
          stageId: 'hired',
          stageName: 'Hired',
          enteredAt: new Date(),
          outcome: 'moved_forward',
        });
        candidates.set(candidate.id, candidate);

        // Update job
        const job = jobs.get(candidate.jobId);
        if (job) {
          job.hired++;
          jobs.set(job.id, job);
        }
      }
    }

    offers.set(req.params.id, offer);

    res.json({ success: true, offer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - REFERRALS
// ============================================================

router.post('/referrals', async (req, res) => {
  try {
    const { candidateId, referrerEmployeeId, referrerName, bonus } = req.body;

    const referral: Referral = {
      id: crypto.randomUUID(),
      candidateId,
      referrerEmployeeId,
      referrerName,
      bonus: bonus || 50000,
      status: 'pending',
    };

    referrals.set(referral.id, referral);

    res.status(201).json({ success: true, referral });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - ANALYTICS
// ============================================================

router.get('/analytics/hiring-funnel', async (req, res) => {
  try {
    const { jobId, startDate, endDate } = req.query;

    const funnel = Array.from(jobs.values()).map(job => {
      const jobCandidates = Array.from(candidates.values())
        .filter(c => c.jobId === job.id);

      const stages = job.pipeline.map(stage => ({
        stageId: stage.id,
        stageName: stage.name,
        count: jobCandidates.filter(c => c.currentStageId === stage.id).length,
      }));

      return {
        jobId: job.id,
        jobTitle: job.title,
        department: job.department,
        totalCandidates: jobCandidates.length,
        stages,
        hired: job.hired,
      };
    });

    res.json({ success: true, funnel });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/analytics/time-to-hire', async (req, res) => {
  try {
    const hiredCandidates = Array.from(candidates.values())
      .filter(c => c.status === 'hired');

    const timeToHire = hiredCandidates.map(c => {
      const firstStage = c.stageHistory[0];
      const hiredStage = c.stageHistory.find(s => s.stageId === 'hired');
      if (firstStage && hiredStage) {
        const days = Math.ceil(
          (hiredStage.enteredAt.getTime() - firstStage.enteredAt.getTime()) /
          (1000 * 60 * 60 * 24)
        );
        return days;
      }
      return 0;
    });

    const avgDays = timeToHire.length > 0
      ? timeToHire.reduce((a, b) => a + b, 0) / timeToHire.length
      : 0;

    res.json({
      success: true,
      metrics: {
        totalHired: hiredCandidates.length,
        avgDaysToHire: Math.round(avgDays),
        byDepartment: {},
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPERS
// ============================================================

function calculateOverallScore(ratings: { rating: number }[]): number {
  if (ratings.length === 0) return 0;
  return ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
}

function calculateRecommendation(
  recommendations: ('strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no')[]
): 'strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no' {
  const scoreMap: Record<string, number> = {
    'strong_yes': 5,
    'yes': 4,
    'neutral': 3,
    'no': 2,
    'strong_no': 1,
  };

  const avgScore = recommendations.reduce((sum, r) => sum + scoreMap[r], 0) / recommendations.length;

  if (avgScore >= 4.5) return 'strong_yes';
  if (avgScore >= 3.5) return 'yes';
  if (avgScore >= 2.5) return 'neutral';
  if (avgScore >= 1.5) return 'no';
  return 'strong_no';
}

export default router;
