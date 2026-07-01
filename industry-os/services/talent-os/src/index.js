/**
 * Talent OS - AI-Powered Talent Acquisition & Management Platform
 * Port: 5282
 *
 * Intelligent Talent Management: Sourcing, screening, matching,
 * onboarding, career development, and workforce planning.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5282;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Shared auth middleware
const { authMiddleware } = require('./shared/auth-middleware');
app.use('/api', authMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// In-memory storage
const storage = {
  candidates: new Map(),
  jobs: new Map(),
  applications: new Map(),
  interviews: new Map(),
  offers: new Map(),
  hirings: new Map(),
  skills: new Map(),
  assessments: new Map(),
  pipelines: new Map()
};

// Unique ID generator
const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ============================================
// AI AGENTS
// ============================================

// AI Agent: Candidate Sourcing Agent
const sourcingAgent = {
  findCandidates: (jobId, criteria) => {
    const job = storage.jobs.get(jobId);
    if (!job) return null;

    // Simulated candidate search
    const candidates = Array.from(storage.candidates.values())
      .filter(c => matchCandidateToJob(c, job))
      .slice(0, 20);

    return {
      jobId,
      totalFound: candidates.length,
      topCandidates: candidates.map(c => ({
        candidateId: c.id,
        name: c.name,
        matchScore: calculateMatchScore(c, job),
        experience: c.experience,
        skills: c.skills,
        availability: c.availability
      })),
      sourcingChannels: ['linkedin', 'indeed', 'referrals', 'job_boards'],
      recommendedOutreach: generateOutreach(candidates)
    };
  },

  passiveSearch: (criteria) => {
    return {
      query: criteria,
      results: generatePassiveResults(criteria),
      estimatedResponseRate: 15 + Math.random() * 10,
      recommendedApproach: 'personalized_inmail'
    };
  },

  optimizePosting: (jobId) => {
    const job = storage.jobs.get(jobId);
    if (!job) return null;

    return {
      jobId,
      currentViews: Math.floor(Math.random() * 500) + 100,
      currentApplications: Math.floor(Math.random() * 20) + 5,
      conversionRate: 3 + Math.random() * 3,
      recommendations: [
        'Add more specific skills requirements',
        'Include salary range for 30% more applications',
        'Highlight remote work options',
        'Add video job preview'
      ],
      optimalPostingTime: 'Tuesday-Wednesday 9AM-11AM',
      keywords: generateKeywords(job)
    };
  }
};

// AI Agent: Screening & Assessment Agent
const screeningAgent = {
  screenResume: (resumeText, jobId) => {
    const job = storage.jobs.get(jobId);
    if (!job) return null;

    const analysis = analyzeResume(resumeText, job);

    return {
      resumeScore: analysis.score,
      breakdown: analysis.breakdown,
      matchedSkills: analysis.matchedSkills,
      missingSkills: analysis.missingSkills,
      redFlags: analysis.redFlags,
      recommendation: getScreeningRecommendation(analysis.score),
      interviewQuestions: generateInterviewQuestions(analysis)
    };
  },

  conductAssessment: (candidateId, assessmentType) => {
    const assessment = {
      id: generateId('assess'),
      candidateId,
      type: assessmentType,
      questions: generateAssessmentQuestions(assessmentType),
      timeLimit: getAssessmentTime(assessmentType),
      scoringCriteria: getScoringCriteria(assessmentType),
      createdAt: new Date().toISOString()
    };

    storage.assessments.set(assessment.id, assessment);
    return assessment;
  },

  scoreAssessment: (assessmentId, answers) => {
    const assessment = storage.assessments.get(assessmentId);
    if (!assessment) return null;

    const score = calculateAssessmentScore(assessment, answers);

    return {
      assessmentId,
      score,
      percentile: calculatePercentile(score, assessment.type),
      strengths: score.strengths,
      areasForDevelopment: score.weaknesses,
      recommendation: getAssessmentRecommendation(score)
    };
  }
};

// AI Agent: Interview Intelligence Agent
const interviewAgent = {
  scheduleInterview: (candidateId, jobId, interviewType, interviewerId) => {
    const candidate = storage.candidates.get(candidateId);
    const job = storage.jobs.get(jobId);

    const interview = {
      id: generateId('interview'),
      candidateId,
      jobId,
      type: interviewType,
      interviewerId,
      scheduledTime: findAvailableSlot(interviewType),
      duration: getInterviewDuration(interviewType),
      location: interviewType === 'remote' ? 'video_call' : 'office',
      questions: generateInterviewQuestions(interviewType, job),
      criteria: getInterviewCriteria(interviewType),
      status: 'scheduled',
      feedback: null,
      createdAt: new Date().toISOString()
    };

    storage.interviews.set(interview.id, interview);
    return interview;
  },

  analyzeFit: (candidateId, jobId) => {
    const candidate = storage.candidates.get(candidateId);
    const job = storage.jobs.get(jobId);

    if (!candidate || !job) return null;

    const fitAnalysis = {
      overallFit: calculateOverallFit(candidate, job),
      skillMatch: calculateSkillMatch(candidate.skills, job.requiredSkills),
      cultureFit: calculateCultureFit(candidate, job),
      growthPotential: calculateGrowthPotential(candidate, job),
      compensationFit: calculateCompensationFit(candidate, job),
      riskFactors: identifyRiskFactors(candidate),
      strengths: identifyStrengths(candidate, job),
      recommendation: generateFitRecommendation(candidate, job)
    };

    return fitAnalysis;
  },

  generateFeedback: (interviewId, feedback) => {
    const interview = storage.interviews.get(interviewId);
    if (!interview) return null;

    interview.feedback = {
      overallScore: feedback.overallScore || 3,
      criteriaScores: feedback.criteriaScores || {},
      strengths: feedback.strengths || [],
      concerns: feedback.concerns || [],
      notes: feedback.notes || '',
      recommendation: feedback.recommendation || 'hold',
      submittedAt: new Date().toISOString()
    };
    interview.status = 'completed';

    storage.interviews.set(interviewId, interview);
    return interview;
  }
};

// AI Agent: Matching & Recommendation Agent
const matchingAgent = {
  matchJobsToCandidates: (candidateId) => {
    const candidate = storage.candidates.get(candidateId);
    if (!candidate) return null;

    const jobs = Array.from(storage.jobs.values())
      .filter(j => j.status === 'open')
      .map(job => ({
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        matchScore: calculateMatchScore(candidate, job),
        skillMatch: calculateSkillMatch(candidate.skills, job.requiredSkills),
        locationFit: candidate.preferredLocation === job.location ? 100 : 50,
        salaryFit: calculateSalaryFit(candidate, job),
        cultureFit: calculateCultureFit(candidate, job)
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    return {
      candidateId,
      matchedJobs: jobs.slice(0, 10),
      recommendations: generateJobRecommendations(jobs)
    };
  },

  matchCandidatesToJobs: (jobId) => {
    const job = storage.jobs.get(jobId);
    if (!job) return null;

    const candidates = Array.from(storage.candidates.values())
      .filter(c => c.status === 'active')
      .map(c => ({
        candidateId: c.id,
        name: c.name,
        currentTitle: c.currentTitle,
        matchScore: calculateMatchScore(c, job),
        experience: c.experience,
        keyStrengths: c.skills.slice(0, 3),
        availability: c.availability,
        source: c.source
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    return {
      jobId,
      topCandidates: candidates.slice(0, 20),
      pipelineSummary: getPipelineSummary(candidates)
    };
  },

  recommendSalary: (candidateId, jobId) => {
    const candidate = storage.candidates.get(candidateId);
    const job = storage.jobs.get(jobId);

    if (!candidate || !job) return null;

    const baseSalary = job.salaryRange?.min || 50000;
    const candidateExpectation = candidate.salaryExpectation || baseSalary;
    const marketRate = calculateMarketRate(job);

    return {
      jobId,
      candidateId,
      baseSalary: Math.round(baseSalary),
      candidateExpectation: candidateExpectation,
      marketRate,
      recommendedSalary: Math.round((baseSalary + candidateExpectation + marketRate) / 3),
      negotiatingRange: {
        min: Math.round(baseSalary * 0.9),
        mid: Math.round((baseSalary + marketRate) / 2),
        max: Math.round(marketRate * 1.1)
      },
      factors: ['experience', 'skills', 'market_conditions', 'urgency']
    };
  }
};

// ============================================
// ROUTES
// ============================================

// Health Check
app.get('/health', (req, res) => {
  res.json({
    service: 'Talent OS',
    status: 'healthy',
    port: PORT,
    version: '1.0.0',
    capabilities: ['sourcing', 'screening', 'interviewing', 'matching', 'onboarding'],
    agents: 4
  });
});

// ---- Candidates ----

app.post('/api/candidates', (req, res) => {
  const { name, email, phone, currentTitle, experience, skills, education, salaryExpectation, preferredLocation, availability, source } = req.body;

  const candidate = {
    id: generateId('cand'),
    name,
    email,
    phone,
    currentTitle,
    experience: experience || [],
    skills: skills || [],
    education: education || [],
    salaryExpectation,
    preferredLocation,
    availability: availability || 'immediate',
    source: source || 'direct',
    status: 'active',
    applications: [],
    createdAt: new Date().toISOString()
  };

  storage.candidates.set(candidate.id, candidate);
  res.status(201).json(candidate);
});

app.get('/api/candidates', (req, res) => {
  const { status, skills, experience } = req.query;
  let candidates = Array.from(storage.candidates.values());

  if (status) candidates = candidates.filter(c => c.status === status);
  if (skills) candidates = candidates.filter(c =>
    skills.split(',').some(s => c.skills.includes(s.trim()))
  );

  res.json({ candidates, count: candidates.length });
});

app.get('/api/candidates/:id', (req, res) => {
  const candidate = storage.candidates.get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  res.json(candidate);
});

// ---- Jobs ----

app.post('/api/jobs', (req, res) => {
  const { title, department, location, type, salaryRange, requiredSkills, preferredSkills, description, requirements, experienceLevel } = req.body;

  const job = {
    id: generateId('job'),
    title,
    department,
    location,
    type: type || 'full_time',
    salaryRange,
    requiredSkills: requiredSkills || [],
    preferredSkills: preferredSkills || [],
    description,
    requirements: requirements || [],
    experienceLevel: experienceLevel || 'mid',
    status: 'open',
    applications: [],
    hiredCount: 0,
    createdAt: new Date().toISOString()
  };

  storage.jobs.set(job.id, job);
  res.status(201).json(job);
});

app.get('/api/jobs', (req, res) => {
  const { status, department, location } = req.query;
  let jobs = Array.from(storage.jobs.values());

  if (status) jobs = jobs.filter(j => j.status === status);
  if (department) jobs = jobs.filter(j => j.department === department);
  if (location) jobs = jobs.filter(j => j.location === location);

  res.json({ jobs, count: jobs.length });
});

app.get('/api/jobs/:id', (req, res) => {
  const job = storage.jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// ---- Applications ----

app.post('/api/applications', (req, res) => {
  const { candidateId, jobId, coverLetter, resume } = req.body;

  const application = {
    id: generateId('app'),
    candidateId,
    jobId,
    coverLetter,
    resume,
    status: 'new',
    stage: 'applied',
    source: 'direct',
    appliedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  storage.applications.set(application.id, application);

  // Update candidate
  const candidate = storage.candidates.get(candidateId);
  if (candidate) candidate.applications.push(application.id);

  // Update job
  const job = storage.jobs.get(jobId);
  if (job) job.applications.push(application.id);

  res.status(201).json(application);
});

app.get('/api/applications', (req, res) => {
  const { candidateId, jobId, stage, status } = req.query;
  let applications = Array.from(storage.applications.values());

  if (candidateId) applications = applications.filter(a => a.candidateId === candidateId);
  if (jobId) applications = applications.filter(a => a.jobId === jobId);
  if (stage) applications = applications.filter(a => a.stage === stage);
  if (status) applications = applications.filter(a => a.status === status);

  res.json({ applications, count: applications.length });
});

app.patch('/api/applications/:id', (req, res) => {
  const application = storage.applications.get(req.params.id);
  if (!application) return res.status(404).json({ error: 'Application not found' });

  application.stage = req.body.stage || application.stage;
  application.status = req.body.status || application.status;
  application.updatedAt = new Date().toISOString();

  storage.applications.set(req.params.id, application);
  res.json(application);
});

// ---- Sourcing ----

app.post('/api/sourcing/:jobId/find', (req, res) => {
  const { criteria } = req.body;
  const results = sourcingAgent.findCandidates(req.params.jobId, criteria);
  res.json(results);
});

app.post('/api/sourcing/passive', (req, res) => {
  const { criteria } = req.body;
  const results = sourcingAgent.passiveSearch(criteria);
  res.json(results);
});

app.post('/api/sourcing/:jobId/optimize', (req, res) => {
  const optimization = sourcingAgent.optimizePosting(req.params.jobId);
  res.json(optimization);
});

// ---- Screening ----

app.post('/api/screening/:jobId/resume', (req, res) => {
  const { resumeText } = req.body;
  const results = screeningAgent.screenResume(resumeText, req.params.jobId);
  res.json(results);
});

app.post('/api/assessments', (req, res) => {
  const { candidateId, type } = req.body;
  const assessment = screeningAgent.conductAssessment(candidateId, type);
  res.status(201).json(assessment);
});

app.post('/api/assessments/:id/score', (req, res) => {
  const { answers } = req.body;
  const results = screeningAgent.scoreAssessment(req.params.id, answers);
  res.json(results);
});

// ---- Interviews ----

app.post('/api/interviews', (req, res) => {
  const { candidateId, jobId, type, interviewerId } = req.body;
  const interview = interviewAgent.scheduleInterview(candidateId, jobId, type, interviewerId);
  res.status(201).json(interview);
});

app.get('/api/interviews', (req, res) => {
  const { candidateId, jobId, status } = req.query;
  let interviews = Array.from(storage.interviews.values());

  if (candidateId) interviews = interviews.filter(i => i.candidateId === candidateId);
  if (jobId) interviews = interviews.filter(i => i.jobId === jobId);
  if (status) interviews = interviews.filter(i => i.status === status);

  res.json({ interviews, count: interviews.length });
});

app.post('/api/interviews/:id/feedback', (req, res) => {
  const results = interviewAgent.generateFeedback(req.params.id, req.body);
  if (!results) return res.status(404).json({ error: 'Interview not found' });
  res.json(results);
});

app.get('/api/fit/:candidateId/:jobId', (req, res) => {
  const analysis = interviewAgent.analyzeFit(req.params.candidateId, req.params.jobId);
  res.json(analysis);
});

// ---- Matching ----

app.get('/api/matching/candidate/:candidateId/jobs', (req, res) => {
  const results = matchingAgent.matchJobsToCandidates(req.params.candidateId);
  res.json(results);
});

app.get('/api/matching/job/:jobId/candidates', (req, res) => {
  const results = matchingAgent.matchCandidatesToJobs(req.params.jobId);
  res.json(results);
});

app.get('/api/matching/:candidateId/:jobId/salary', (req, res) => {
  const recommendation = matchingAgent.recommendSalary(req.params.candidateId, req.params.jobId);
  res.json(recommendation);
});

// ---- Offers ----

app.post('/api/offers', (req, res) => {
  const { candidateId, jobId, salary, benefits, startDate } = req.body;

  const offer = {
    id: generateId('offer'),
    candidateId,
    jobId,
    salary,
    benefits: benefits || [],
    startDate,
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };

  storage.offers.set(offer.id, offer);
  res.status(201).json(offer);
});

app.patch('/api/offers/:id', (req, res) => {
  const offer = storage.offers.get(req.params.id);
  if (!offer) return res.status(404).json({ error: 'Offer not found' });

  offer.status = req.body.status || offer.status;
  storage.offers.set(req.params.id, offer);
  res.json(offer);
});

// ---- Hiring ----

app.post('/api/hirings', (req, res) => {
  const { candidateId, jobId, offerId, startDate } = req.body;

  const hiring = {
    id: generateId('hire'),
    candidateId,
    jobId,
    offerId,
    startDate,
    status: 'onboarding',
    onboardingTasks: [],
    createdAt: new Date().toISOString()
  };

  storage.hirings.set(hiring.id, hiring);
  res.status(201).json(hiring);
});

app.get('/api/hirings/:candidateId', (req, res) => {
  const hiring = Array.from(storage.hirings.values()).find(h => h.candidateId === req.params.candidateId);
  res.json(hiring || null);
});

// ---- Analytics ----

app.get('/api/analytics/pipeline', (req, res) => {
  const { jobId } = req.query;
  const applications = Array.from(storage.applications.values()).filter(a => !jobId || a.jobId === jobId);

  const pipeline = {
    applied: applications.length,
    screening: applications.filter(a => ['screening', 'phone_screen'].includes(a.stage)).length,
    interviewing: applications.filter(a => a.stage === 'interview').length,
    offered: applications.filter(a => a.stage === 'offer').length,
    hired: applications.filter(a => a.stage === 'hired').length,
    conversionRates: {
      appliedToScreening: calculateRate(applications, 'screening'),
      screeningToInterview: calculateRate(applications, 'interview'),
      interviewToOffer: calculateRate(applications, 'offer'),
      offerToHire: calculateRate(applications, 'hired')
    }
  };

  res.json(pipeline);
});

app.get('/api/analytics/time-to-hire', (req, res) => {
  const hirings = Array.from(storage.hirings.values());
  const applications = Array.from(storage.applications.values());

  res.json({
    averageTimeToHire: 28 + Math.floor(Math.random() * 15),
    byDepartment: {
      engineering: 35,
      sales: 22,
      marketing: 25,
      operations: 30
    },
    trend: 'improving'
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function matchCandidateToJob(candidate, job) {
  const matchedSkills = candidate.skills.filter(s => job.requiredSkills.includes(s));
  return matchedSkills.length >= job.requiredSkills.length * 0.5;
}

function calculateMatchScore(candidate, job) {
  const skillMatch = (candidate.skills.filter(s => job.requiredSkills.includes(s)).length / job.requiredSkills.length) * 50;
  const experienceMatch = Math.min(30, candidate.experience.reduce((a, e) => a + e.years, 0));
  const cultureMatch = 20;
  return Math.round(skillMatch + experienceMatch + cultureMatch);
}

function generateOutreach(candidates) {
  return candidates.slice(0, 5).map(c => ({
    candidateId: c.id,
    message: `Hi ${c.name}, we have an opportunity that matches your ${c.skills[0]} expertise...`
  }));
}

function generatePassiveResults(criteria) {
  return Array(10).fill(null).map((_, i) => ({
    name: `Candidate ${i + 1}`,
    title: criteria.title || 'Senior Engineer',
    company: ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple'][i % 5],
    matchScore: 60 + Math.floor(Math.random() * 30)
  }));
}

function generateKeywords(job) {
  return [job.title, ...job.requiredSkills.slice(0, 3)].map(k => k.toLowerCase());
}

function analyzeResume(resumeText, job) {
  const score = 50 + Math.floor(Math.random() * 40);
  return {
    score,
    breakdown: { skills: 70, experience: 65, education: 80 },
    matchedSkills: job.requiredSkills.slice(0, 3),
    missingSkills: job.requiredSkills.slice(3),
    redFlags: Math.random() > 0.7 ? ['Gap in employment'] : []
  };
}

function getScreeningRecommendation(score) {
  if (score >= 80) return 'strong_advance';
  if (score >= 60) return 'advance';
  if (score >= 40) return 'hold';
  return 'reject';
}

function generateInterviewQuestions(analysis) {
  return [
    'Tell me about your experience with ' + analysis.matchedSkills[0],
    'How would you handle ' + analysis.missingSkills[0] + ' gaps?',
    'Describe a challenging project you led'
  ];
}

function generateAssessmentQuestions(type) {
  return Array(10).fill(null).map((_, i) => ({
    id: i,
    question: `Sample question ${i + 1}`,
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: Math.floor(Math.random() * 4)
  }));
}

function getAssessmentTime(type) {
  const times = { technical: 90, cognitive: 45, personality: 30 };
  return times[type] || 60;
}

function getScoringCriteria(type) {
  return { passingScore: 70, weight: 1.0 };
}

function calculateAssessmentScore(assessment, answers) {
  const correct = answers.filter((a, i) => a === assessment.questions[i].correctAnswer).length;
  const score = (correct / assessment.questions.length) * 100;
  return {
    score: Math.round(score),
    strengths: ['Problem solving', 'Technical knowledge'],
    weaknesses: ['Time management']
  };
}

function calculatePercentile(score, type) {
  return Math.min(99, Math.max(1, Math.round(score + Math.random() * 20 - 10)));
}

function getAssessmentRecommendation(score) {
  if (score >= 85) return 'strong_hire';
  if (score >= 70) return 'hire';
  if (score >= 50) return 'hold';
  return 'reject';
}

function findAvailableSlot(interviewType) {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * 7) + 1);
  date.setHours(9 + Math.floor(Math.random() * 6));
  return date.toISOString();
}

function getInterviewDuration(type) {
  const durations = { phone: 30, video: 45, onsite: 60, panel: 90 };
  return durations[type] || 60;
}

function calculateOverallFit(candidate, job) {
  return 70 + Math.floor(Math.random() * 20);
}

function calculateSkillMatch(candidateSkills, jobSkills) {
  const matched = candidateSkills.filter(s => jobSkills.includes(s)).length;
  return Math.round((matched / jobSkills.length) * 100);
}

function calculateCultureFit(candidate, job) {
  return 60 + Math.floor(Math.random() * 30);
}

function calculateGrowthPotential(candidate, job) {
  return 50 + Math.floor(Math.random() * 40);
}

function calculateCompensationFit(candidate, job) {
  if (!job.salaryRange || !candidate.salaryExpectation) return 70;
  const mid = (job.salaryRange.min + job.salaryRange.max) / 2;
  return candidate.salaryExpectation <= mid ? 90 : 60;
}

function identifyRiskFactors(candidate) {
  return candidate.experience.length < 2 ? ['Limited experience'] : [];
}

function identifyStrengths(candidate, job) {
  return candidate.skills.filter(s => job.requiredSkills.includes(s)).slice(0, 3);
}

function generateFitRecommendation(candidate, job) {
  return calculateOverallFit(candidate, job) >= 75 ? 'recommend' : 'caution';
}

function generateJobRecommendations(jobs) {
  return ['Focus on top 3 matches', 'Apply to at least 5 jobs'];
}

function getPipelineSummary(candidates) {
  return {
    total: candidates.length,
    excellent: candidates.filter(c => c.matchScore >= 80).length,
    good: candidates.filter(c => c.matchScore >= 60 && c.matchScore < 80).length,
    needsWork: candidates.filter(c => c.matchScore < 60).length
  };
}

function calculateMarketRate(job) {
  return job.salaryRange?.min || 60000;
}

function calculateRate(applications, stage) {
  const total = applications.length;
  const inStage = applications.filter(a => a.stage === stage).length;
  return total > 0 ? Math.round((inStage / total) * 100) : 0;
}

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`👥 Talent OS running on port ${PORT}`);
  console.log('Capabilities:');
  console.log('  - Candidate Sourcing Agent');
  console.log('  - Screening & Assessment Agent');
  console.log('  - Interview Intelligence Agent');
  console.log('  - Matching & Recommendation Agent');
});

module.exports = app;
