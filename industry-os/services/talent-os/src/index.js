/**
 * RTMN Talent OS - Recruitment & ATS Platform
 *
 * Unified recruitment platform integrated with:
 * - CorpPerks TalentAI (frontend)
 * - Workforce OS Core (5065)
 * - Role AI Agents (4130)
 * - CorpPerks Intelligence (4135)
 *
 * Features:
 * - Job Management
 * - Candidate Pipeline
 * - AI Scoring & Matching
 * - Interview Scheduling
 * - Offer Management
 * - Talent Pool
 * - Analytics & Reporting
 *
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Configuration
const PORT = process.env.PORT || 5066;
const SERVICE_NAME = 'talent-os';
const SERVICE_VERSION = '1.0.0';

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `${timestamp} [${level}] ${SERVICE_NAME}: ${message} ${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Express App
const app = express();

// ============================================================
// IN-MEMORY DATA STORES
// ============================================================

const db = {
  jobs: new Map(),
  candidates: new Map(),
  interviews: new Map(),
  offers: new Map(),
  talentPool: new Map(),
  sourcingCampaigns: new Map(),
  assessments: new Map(),
  assessmentsResults: new Map(),
  jobAnalytics: new Map(),
  candidateNotes: new Map(),
  interviewFeedback: new Map(),
  jobBoards: new Map()
};

// ============================================================
// SAMPLE DATA INITIALIZATION
// ============================================================

function initializeSampleData() {
  logger.info('Initializing Talent OS sample data...');

  // Sample Jobs
  const jobs = [
    {
      id: 'JOB001',
      title: 'Senior Frontend Engineer',
      department: 'Engineering',
      departmentId: 'DEPT001',
      location: 'Bangalore',
      type: 'full-time',
      remote: 'hybrid',
      salaryMin: 1800000,
      salaryMax: 2500000,
      currency: 'INR',
      description: 'We are looking for an experienced Frontend Engineer to join our team and help build amazing user experiences.',
      requirements: [
        '5+ years of experience in frontend development',
        'Expert in React, TypeScript, and modern JavaScript',
        'Experience with state management (Redux, MobX)',
        'Knowledge of CI/CD pipelines',
        'Strong problem-solving skills'
      ],
      responsibilities: [
        'Design and implement new features',
        'Lead technical discussions and code reviews',
        'Mentor junior developers',
        'Collaborate with designers and product managers'
      ],
      skills: ['React', 'TypeScript', 'JavaScript', 'CSS', 'Node.js', 'Git'],
      status: 'open',
      priority: 'high',
      hiringManager: 'EMP003',
      recruiter: 'EMP005',
      pipeline: ['applied', 'screening', 'technical', 'cultural', 'offer', 'hired'],
      pipelineConfig: {
        screening: { type: 'phone', duration: 30 },
        technical: { type: 'video', duration: 60 },
        cultural: { type: 'onsite', duration: 45 }
      },
      benefits: ['Health Insurance', 'Flexible Hours', 'Learning Budget', 'Stock Options'],
      applicationCount: 45,
      sourceBreakdown: { linkedin: 20, website: 15, referral: 8, naukri: 2 },
      createdAt: '2026-06-01T10:00:00Z',
      postedAt: '2026-06-01T10:30:00Z',
      closedAt: null
    },
    {
      id: 'JOB002',
      title: 'Product Designer',
      department: 'Design',
      departmentId: 'DEPT008',
      location: 'Remote',
      type: 'full-time',
      remote: 'remote',
      salaryMin: 1200000,
      salaryMax: 1800000,
      currency: 'INR',
      description: 'Join our design team to create beautiful and intuitive user experiences.',
      requirements: [
        '3+ years of product design experience',
        'Proficiency in Figma and prototyping tools',
        'Strong portfolio showcasing end-to-end design process',
        'Experience with design systems',
        'Understanding of frontend constraints'
      ],
      skills: ['Figma', 'UI Design', 'UX Research', 'Prototyping', 'Design Systems'],
      status: 'open',
      priority: 'medium',
      hiringManager: 'EMP006',
      recruiter: 'EMP005',
      applicationCount: 32,
      sourceBreakdown: { behance: 12, linkedin: 10, website: 8, dribbble: 2 },
      createdAt: '2026-06-05T09:00:00Z',
      postedAt: '2026-06-05T09:30:00Z'
    },
    {
      id: 'JOB003',
      title: 'Sales Development Representative',
      department: 'Sales',
      departmentId: 'DEPT003',
      location: 'Mumbai',
      type: 'full-time',
      remote: 'onsite',
      salaryMin: 600000,
      salaryMax: 900000,
      currency: 'INR',
      description: 'Join our sales team to drive business growth through outbound prospecting.',
      requirements: [
        '1+ years of B2B sales experience',
        'Excellent communication skills',
        'Experience with CRM tools (Salesforce, HubSpot)',
        'Self-motivated and target-driven'
      ],
      skills: ['Sales', 'Cold Calling', 'CRM', 'Communication', 'Negotiation'],
      status: 'open',
      priority: 'high',
      applicationCount: 28,
      sourceBreakdown: { linkedin: 15, indeed: 8, referral: 3, website: 2 },
      createdAt: '2026-06-10T08:00:00Z'
    },
    {
      id: 'JOB004',
      title: 'Machine Learning Engineer',
      department: 'Engineering',
      departmentId: 'DEPT001',
      location: 'Bangalore',
      type: 'full-time',
      remote: 'hybrid',
      salaryMin: 2000000,
      salaryMax: 3500000,
      currency: 'INR',
      description: 'Build and deploy ML models to solve complex business problems.',
      requirements: [
        '3+ years in ML engineering',
        'Strong Python and ML frameworks (TensorFlow, PyTorch)',
        'Experience with MLOps and model deployment',
        'PhD or Masters in CS/Stats preferred'
      ],
      skills: ['Python', 'TensorFlow', 'PyTorch', 'MLOps', 'SQL', 'Cloud (AWS/GCP)'],
      status: 'open',
      priority: 'critical',
      applicationCount: 18,
      createdAt: '2026-06-12T11:00:00Z'
    },
    {
      id: 'JOB005',
      title: 'HR Manager',
      department: 'Human Resources',
      departmentId: 'DEPT004',
      location: 'Delhi',
      type: 'full-time',
      remote: 'onsite',
      salaryMin: 800000,
      salaryMax: 1200000,
      currency: 'INR',
      description: 'Lead HR initiatives and build a great workplace culture.',
      requirements: [
        '5+ years of HR experience',
        'Knowledge of Indian labor laws',
        'Experience with HRIS systems',
        'Strong interpersonal skills'
      ],
      skills: ['HR Management', 'Recruitment', 'Employee Relations', 'Compliance', 'HRIS'],
      status: 'draft',
      priority: 'low',
      applicationCount: 0,
      createdAt: '2026-06-15T14:00:00Z'
    }
  ];

  jobs.forEach(j => db.jobs.set(j.id, j));

  // Sample Candidates
  const candidates = [
    {
      id: 'CAND001',
      firstName: 'Suresh',
      lastName: 'Iyer',
      email: 'suresh.iyer@gmail.com',
      phone: '+919988776655',
      location: 'Bangalore',
      currentCompany: 'TechCorp India',
      currentTitle: 'Frontend Developer',
      experience: 6,
      currentSalary: 1400000,
      expectedSalary: 2000000,
      noticePeriod: '30 days',
      linkedIn: 'https://linkedin.com/in/sureshiyer',
      portfolio: 'https://sureshiyer.dev',
      resume: 'suresh_iyer_resume.pdf',
      skills: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'AWS'],
      education: [
        { degree: 'B.Tech Computer Science', institution: 'IIT Delhi', year: 2018 }
      ],
      workHistory: [
        { company: 'TechCorp India', title: 'Frontend Developer', start: '2021', end: 'Present' },
        { company: 'StartupXYZ', title: 'Software Engineer', start: '2018', end: '2021' }
      ],
      source: 'linkedin',
      sourceDetails: 'Applied via LinkedIn',
      referredBy: null,
      jobId: 'JOB001',
      status: 'screening',
      stage: 'screening',
      score: 85,
      scoreBreakdown: {
        skills: 40,
        experience: 25,
        cultureFit: 15,
        interview: 5
      },
      tags: ['strong-technical', 'good-culture-fit', 'fast-responder'],
      appliedAt: '2026-06-10T14:30:00Z',
      lastActivity: '2026-06-12T10:00:00Z',
      stageHistory: [
        { stage: 'applied', movedAt: '2026-06-10T14:30:00Z', by: 'system' },
        { stage: 'screening', movedAt: '2026-06-12T10:00:00Z', by: 'EMP005' }
      ],
      notes: [
        { text: 'Strong React portfolio, good communication', author: 'EMP005', date: '2026-06-12' }
      ]
    },
    {
      id: 'CAND002',
      firstName: 'Divya',
      lastName: 'Kapoor',
      email: 'divya.kapoor@gmail.com',
      phone: '+919988776656',
      location: 'Bangalore',
      currentCompany: 'StartupXYZ',
      currentTitle: 'Lead Frontend Engineer',
      experience: 7,
      currentSalary: 1800000,
      expectedSalary: 2400000,
      noticePeriod: '15 days',
      linkedIn: 'https://linkedin.com/in/divyakapoor',
      skills: ['React', 'Vue', 'Angular', 'JavaScript', 'TypeScript', 'CSS'],
      education: [
        { degree: 'M.Tech Computer Science', institution: 'IIT Bombay', year: 2017 }
      ],
      source: 'referral',
      sourceDetails: 'Referred by Rahul Mehta',
      referredBy: 'EMP007',
      jobId: 'JOB001',
      status: 'interview',
      stage: 'technical',
      score: 92,
      scoreBreakdown: {
        skills: 45,
        experience: 28,
        cultureFit: 14,
        interview: 5
      },
      tags: ['top-candidate', 'immediate-joiner', 'strong-leader'],
      appliedAt: '2026-06-08T09:15:00Z',
      lastActivity: '2026-06-15T11:00:00Z',
      stageHistory: [
        { stage: 'applied', movedAt: '2026-06-08T09:15:00Z', by: 'system' },
        { stage: 'screening', movedAt: '2026-06-09T10:00:00Z', by: 'EMP005' },
        { stage: 'technical', movedAt: '2026-06-15T11:00:00Z', by: 'EMP005' }
      ],
      notes: [
        { text: 'Excellent technical skills, IIT background', author: 'EMP005', date: '2026-06-09' },
        { text: 'Scheduled for technical round with Amit on June 18', author: 'EMP005', date: '2026-06-15' }
      ]
    },
    {
      id: 'CAND003',
      firstName: 'Manish',
      lastName: 'Shah',
      email: 'manish.shah@gmail.com',
      phone: '+919988776657',
      location: 'Mumbai',
      currentCompany: 'DesignStudio',
      currentTitle: 'Senior Product Designer',
      experience: 5,
      currentSalary: 1100000,
      expectedSalary: 1500000,
      noticePeriod: '30 days',
      portfolio: 'https://behance.net/manishshah',
      skills: ['Figma', 'Sketch', 'Adobe XD', 'UI Design', 'UX Research', 'Prototyping'],
      education: [
        { degree: 'B.Des Interaction Design', institution: 'NID Ahmedabad', year: 2019 }
      ],
      source: 'behance',
      sourceDetails: 'Found on Behance',
      jobId: 'JOB002',
      status: 'applied',
      stage: 'applied',
      score: 78,
      scoreBreakdown: {
        skills: 35,
        experience: 25,
        cultureFit: 13,
        interview: 5
      },
      tags: ['portfolio-review-needed'],
      appliedAt: '2026-06-12T16:45:00Z',
      lastActivity: '2026-06-12T16:45:00Z'
    },
    {
      id: 'CAND004',
      firstName: 'Priya',
      lastName: 'Reddy',
      email: 'priya.reddy@gmail.com',
      phone: '+919988776658',
      location: 'Hyderabad',
      currentCompany: 'Freelance',
      currentTitle: 'ML Consultant',
      experience: 4,
      currentSalary: 1600000,
      expectedSalary: 2200000,
      noticePeriod: 'Immediate',
      linkedIn: 'https://linkedin.com/in/priyareddy-ml',
      skills: ['Python', 'TensorFlow', 'PyTorch', 'Computer Vision', 'NLP', 'MLOps'],
      education: [
        { degree: 'PhD Computer Science (AI)', institution: 'Stanford University', year: 2020 }
      ],
      source: 'linkedin',
      jobId: 'JOB004',
      status: 'screening',
      stage: 'screening',
      score: 95,
      tags: ['phd-candidate', 'research-background', 'top-tier'],
      appliedAt: '2026-06-13T10:00:00Z',
      lastActivity: '2026-06-14T09:00:00Z'
    },
    {
      id: 'CAND005',
      firstName: 'Arjun',
      lastName: 'Mehta',
      email: 'arjun.mehta@gmail.com',
      phone: '+919988776659',
      location: 'Pune',
      currentCompany: 'SalesForce',
      currentTitle: 'Account Executive',
      experience: 2,
      currentSalary: 500000,
      expectedSalary: 800000,
      noticePeriod: '30 days',
      skills: ['Sales', 'Cold Calling', 'CRM', 'B2B', 'Negotiation'],
      source: 'indeed',
      jobId: 'JOB003',
      status: 'applied',
      stage: 'applied',
      score: 65,
      appliedAt: '2026-06-14T11:30:00Z'
    }
  ];

  candidates.forEach(c => db.candidates.set(c.id, c));

  // Sample Interviews
  const interviews = [
    {
      id: 'INT001',
      candidateId: 'CAND002',
      jobId: 'JOB001',
      type: 'technical',
      scheduledAt: '2026-06-18T14:00:00Z',
      duration: 60,
      interviewers: ['EMP003'],
      status: 'scheduled',
      meetingLink: 'https://meet.rtmn.com/int001',
      feedback: null
    }
  ];

  interviews.forEach(i => db.interviews.set(i.id, i));

  logger.info(`Initialized ${jobs.length} jobs, ${candidates.length} candidates`);
}

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    port: PORT,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/status', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    stats: {
      jobs: db.jobs.size,
      candidates: db.candidates.size,
      interviews: db.interviews.size,
      offers: db.offers.size,
      talentPool: db.talentPool.size
    },
    integrations: {
      workforceOs: 'http://localhost:5065',
      corperksIntelligence: 'http://localhost:4135',
      roleAiAgents: 'http://localhost:4130'
    }
  });
});

// ============================================================
// JOBS MODULE
// ============================================================

// List jobs
app.get('/api/jobs', (req, res) => {
  const { status, department, location, priority, search, page = 1, limit = 20 } = req.query;

  let jobs = Array.from(db.jobs.values());

  if (status) jobs = jobs.filter(j => j.status === status);
  if (department) jobs = jobs.filter(j => j.department === department);
  if (location) jobs = jobs.filter(j => j.location === location);
  if (priority) jobs = jobs.filter(j => j.priority === priority);
  if (search) {
    const s = search.toLowerCase();
    jobs = jobs.filter(j =>
      j.title.toLowerCase().includes(s) ||
      j.description.toLowerCase().includes(s) ||
      j.skills.some(sk => sk.toLowerCase().includes(s))
    );
  }

  // Sort by priority and creation date
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  jobs.sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4));

  const total = jobs.length;
  const start = (page - 1) * limit;
  const paginated = jobs.slice(start, start + parseInt(limit));

  res.json({
    data: paginated,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
  });
});

// Get single job
app.get('/api/jobs/:id', (req, res) => {
  const job = db.jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  // Get candidates for this job
  const candidates = Array.from(db.candidates.values()).filter(c => c.jobId === req.params.id);

  // Calculate pipeline stats
  const pipelineStats = {};
  ['applied', 'screening', 'technical', 'cultural', 'offer', 'hired', 'rejected'].forEach(stage => {
    pipelineStats[stage] = candidates.filter(c => c.stage === stage).length;
  });

  res.json({
    ...job,
    candidates: {
      total: candidates.length,
      pipeline: pipelineStats
    },
    averageScore: candidates.length > 0
      ? Math.round(candidates.reduce((sum, c) => sum + (c.score || 0), 0) / candidates.length)
      : 0
  });
});

// Create job
app.post('/api/jobs', (req, res) => {
  const id = `JOB${String(db.jobs.size + 1).padStart(3, '0')}`;
  const job = {
    id,
    ...req.body,
    status: req.body.status || 'draft',
    applicationCount: 0,
    sourceBreakdown: {},
    createdAt: new Date().toISOString(),
    pipeline: ['applied', 'screening', 'technical', 'cultural', 'offer', 'hired']
  };

  db.jobs.set(id, job);
  logger.info(`Job created: ${id}`);
  res.status(201).json(job);
});

// Update job
app.patch('/api/jobs/:id', (req, res) => {
  const job = db.jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const updated = { ...job, ...req.body, updatedAt: new Date().toISOString() };
  db.jobs.set(req.params.id, updated);

  logger.info(`Job updated: ${req.params.id}`);
  res.json(updated);
});

// Publish job
app.post('/api/jobs/:id/publish', (req, res) => {
  const job = db.jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  job.status = 'open';
  job.postedAt = new Date().toISOString();
  db.jobs.set(req.params.id, job);

  logger.info(`Job published: ${req.params.id}`);
  res.json(job);
});

// Close job
app.post('/api/jobs/:id/close', (req, res) => {
  const job = db.jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  job.status = 'closed';
  job.closedAt = new Date().toISOString();
  job.closureReason = req.body.reason || 'Position filled';
  db.jobs.set(req.params.id, job);

  logger.info(`Job closed: ${req.params.id}`);
  res.json(job);
});

// Job analytics
app.get('/api/jobs/:id/analytics', (req, res) => {
  const job = db.jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const candidates = Array.from(db.candidates.values()).filter(c => c.jobId === req.params.id);

  // Calculate metrics
  const total = candidates.length;
  const avgScore = total > 0 ? candidates.reduce((sum, c) => sum + (c.score || 0), 0) / total : 0;
  const avgTimeToHire = 21; // days (simplified)
  const conversionRate = total > 0
    ? ((candidates.filter(c => c.stage === 'hired').length / total) * 100).toFixed(1)
    : 0;

  res.json({
    jobId: job.id,
    title: job.title,
    period: { start: job.postedAt, end: new Date().toISOString() },
    metrics: {
      totalApplications: total,
      averageScore: Math.round(avgScore),
      daysOpen: Math.floor((Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24)),
      averageTimeToHire: avgTimeToHire,
      conversionRate: parseFloat(conversionRate),
      hired: candidates.filter(c => c.stage === 'hired').length,
      rejected: candidates.filter(c => c.stage === 'rejected').length,
      active: candidates.filter(c => !['hired', 'rejected'].includes(c.stage)).length
    },
    sourceBreakdown: job.sourceBreakdown,
    pipelineBreakdown: {
      applied: candidates.filter(c => c.stage === 'applied').length,
      screening: candidates.filter(c => c.stage === 'screening').length,
      technical: candidates.filter(c => c.stage === 'technical').length,
      cultural: candidates.filter(c => c.stage === 'cultural').length,
      offer: candidates.filter(c => c.stage === 'offer').length
    }
  });
});

// ============================================================
// CANDIDATES MODULE
// ============================================================

// List candidates
app.get('/api/candidates', (req, res) => {
  const { jobId, status, stage, source, minScore, search, page = 1, limit = 50 } = req.query;

  let candidates = Array.from(db.candidates.values());

  if (jobId) candidates = candidates.filter(c => c.jobId === jobId);
  if (status) candidates = candidates.filter(c => c.status === status);
  if (stage) candidates = candidates.filter(c => c.stage === stage);
  if (source) candidates = candidates.filter(c => c.source === source);
  if (minScore) candidates = candidates.filter(c => c.score >= parseInt(minScore));
  if (search) {
    const s = search.toLowerCase();
    candidates = candidates.filter(c =>
      c.firstName.toLowerCase().includes(s) ||
      c.lastName.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      c.currentCompany.toLowerCase().includes(s) ||
      c.skills.some(sk => sk.toLowerCase().includes(s))
    );
  }

  // Sort by score (highest first)
  candidates.sort((a, b) => (b.score || 0) - (a.score || 0));

  const total = candidates.length;
  const start = (page - 1) * limit;
  const paginated = candidates.slice(start, start + parseInt(limit));

  res.json({
    data: paginated,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
  });
});

// Get single candidate
app.get('/api/candidates/:id', (req, res) => {
  const candidate = db.candidates.get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  // Get job details
  const job = db.jobs.get(candidate.jobId);

  // Get interviews
  const interviews = Array.from(db.interviews.values()).filter(i => i.candidateId === req.params.id);

  // Get notes
  const notes = candidate.notes || [];

  res.json({
    ...candidate,
    job,
    interviews,
    notes
  });
});

// Add candidate
app.post('/api/candidates', (req, res) => {
  const id = `CAND${uuidv4().slice(0, 8).toUpperCase()}`;

  // AI score the candidate
  const skillMatch = (req.body.skills || []).length;
  const experienceFactor = Math.min((req.body.experience || 0) * 5, 30);
  const baseScore = 50 + skillMatch * 5 + experienceFactor;

  const candidate = {
    id,
    ...req.body,
    status: 'applied',
    stage: 'applied',
    score: Math.min(baseScore, 100),
    scoreBreakdown: {
      skills: skillMatch * 5,
      experience: experienceFactor,
      cultureFit: 20 + Math.round(Math.random() * 10),
      interview: 0
    },
    tags: [],
    appliedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    stageHistory: [{ stage: 'applied', movedAt: new Date().toISOString(), by: 'system' }],
    notes: []
  };

  db.candidates.set(id, candidate);

  // Update job application count
  if (candidate.jobId) {
    const job = db.jobs.get(candidate.jobId);
    if (job) {
      job.applicationCount = (job.applicationCount || 0) + 1;
      job.sourceBreakdown[candidate.source] = (job.sourceBreakdown[candidate.source] || 0) + 1;
      db.jobs.set(job.id, job);
    }
  }

  logger.info(`Candidate added: ${id}`);
  res.status(201).json(candidate);
});

// Update candidate
app.patch('/api/candidates/:id', (req, res) => {
  const candidate = db.candidates.get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  const updated = { ...candidate, ...req.body, lastActivity: new Date().toISOString() };
  db.candidates.set(req.params.id, updated);

  res.json(updated);
});

// Move candidate in pipeline
app.post('/api/candidates/:id/move', (req, res) => {
  const candidate = db.candidates.get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  const { stage, notes, movedBy } = req.body;

  // Validate stage
  const validStages = ['applied', 'screening', 'technical', 'cultural', 'offer', 'hired', 'rejected'];
  if (!validStages.includes(stage)) {
    return res.status(400).json({ error: 'Invalid stage' });
  }

  const previousStage = candidate.stage;
  candidate.stage = stage;
  candidate.status = stage === 'rejected' ? 'rejected' : 'active';
  candidate.lastActivity = new Date().toISOString();

  // Update stage history
  candidate.stageHistory = candidate.stageHistory || [];
  candidate.stageHistory.push({
    from: previousStage,
    to: stage,
    notes,
    movedAt: new Date().toISOString(),
    by: movedBy || 'system'
  });

  db.candidates.set(req.params.id, candidate);

  logger.info(`Candidate ${candidate.id} moved from ${previousStage} to ${stage}`);
  res.json(candidate);
});

// AI Score candidate
app.post('/api/candidates/:id/score', (req, res) => {
  const candidate = db.candidates.get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  // Get job requirements
  const job = db.jobs.get(candidate.jobId);
  const requiredSkills = job?.skills || [];
  const candidateSkills = candidate.skills || [];

  // Calculate skill match
  const matchedSkills = candidateSkills.filter(s =>
    requiredSkills.some(rs => rs.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(rs.toLowerCase()))
  );
  const skillScore = Math.min((matchedSkills.length / Math.max(requiredSkills.length, 1)) * 50, 50);

  // Experience score
  const minExp = 3;
  const maxExp = 10;
  const experienceScore = Math.min(Math.max((candidate.experience - minExp) / (maxExp - minExp), 0) * 30, 30);

  // Education score
  const educationScore = candidate.education?.some(e => e.institution.includes('IIT') || e.institution.includes('MIT'))
    ? 10
    : candidate.education?.some(e => e.degree?.includes('Masters') || e.degree?.includes('PhD'))
      ? 7
      : 5;

  // Culture fit (based on tags)
  const cultureTags = ['strong-technical', 'good-culture-fit', 'team-player', 'leadership'];
  const cultureScore = candidate.tags?.filter(t => cultureTags.includes(t)).length * 3;

  const totalScore = Math.min(skillScore + experienceScore + educationScore + cultureScore, 100);

  candidate.score = Math.round(totalScore);
  candidate.scoreBreakdown = {
    skills: Math.round(skillScore),
    experience: Math.round(experienceScore),
    education: educationScore,
    cultureFit: cultureScore
  };

  // Add auto-tags based on score
  if (totalScore >= 90) candidate.tags = [...(candidate.tags || []), 'top-candidate'];
  if (totalScore >= 75) candidate.tags = [...(candidate.tags || []), 'strong-fit'];
  if (matchedSkills.length >= requiredSkills.length * 0.8) candidate.tags = [...(candidate.tags || []), 'skills-match'];

  db.candidates.set(req.params.id, candidate);

  res.json({
    candidateId: candidate.id,
    score: candidate.score,
    breakdown: candidate.scoreBreakdown,
    matchedSkills,
    missingSkills: requiredSkills.filter(s => !matchedSkills.includes(s))
  });
});

// Schedule interview
app.post('/api/candidates/:id/interview', (req, res) => {
  const candidate = db.candidates.get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  const { type, scheduledAt, duration, interviewers, notes } = req.body;

  const interviewId = `INT${uuidv4().slice(0, 8).toUpperCase()}`;
  const interview = {
    id: interviewId,
    candidateId: req.params.id,
    jobId: candidate.jobId,
    type: type || 'screening',
    scheduledAt,
    duration: duration || 30,
    interviewers: interviewers || [],
    status: 'scheduled',
    meetingLink: `https://meet.rtmn.com/${interviewId}`,
    notes,
    feedback: null,
    createdAt: new Date().toISOString()
  };

  db.interviews.set(interviewId, interview);

  // Update candidate
  candidate.lastActivity = new Date().toISOString();
  candidate.interviewScheduled = true;
  candidate.lastInterviewId = interviewId;
  db.candidates.set(req.params.id, candidate);

  logger.info(`Interview scheduled: ${interviewId}`);
  res.status(201).json(interview);
});

// Add note to candidate
app.post('/api/candidates/:id/notes', (req, res) => {
  const candidate = db.candidates.get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  const note = {
    text: req.body.text,
    author: req.body.author || 'System',
    date: new Date().toISOString()
  };

  candidate.notes = candidate.notes || [];
  candidate.notes.push(note);
  candidate.lastActivity = new Date().toISOString();

  db.candidates.set(req.params.id, candidate);

  res.json(note);
});

// ============================================================
// PIPELINE MODULE
// ============================================================

// Kanban view
app.get('/api/pipeline/kanban', (req, res) => {
  const { jobId } = req.query;
  let candidates = Array.from(db.candidates.values());

  if (jobId) candidates = candidates.filter(c => c.jobId === jobId);

  const stages = ['applied', 'screening', 'technical', 'cultural', 'offer', 'hired'];

  const kanban = stages.map(stage => ({
    stage,
    label: stage.charAt(0).toUpperCase() + stage.slice(1),
    count: candidates.filter(c => c.stage === stage).length,
    candidates: candidates
      .filter(c => c.stage === stage)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 20)
      .map(c => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        currentTitle: c.currentTitle,
        company: c.currentCompany,
        score: c.score,
        source: c.source,
        appliedAt: c.appliedAt,
        tags: c.tags
      }))
  }));

  res.json(kanban);
});

// Pipeline statistics
app.get('/api/pipeline/stats', (req, res) => {
  const { jobId, startDate, endDate } = req.query;
  let candidates = Array.from(db.candidates.values());

  if (jobId) candidates = candidates.filter(c => c.jobId === jobId);
  if (startDate) candidates = candidates.filter(c => c.appliedAt >= startDate);
  if (endDate) candidates = candidates.filter(c => c.appliedAt <= endDate);

  const total = candidates.length;
  const hired = candidates.filter(c => c.stage === 'hired').length;
  const rejected = candidates.filter(c => c.stage === 'rejected').length;
  const active = total - hired - rejected;

  // Calculate conversion funnel
  const funnel = ['applied', 'screening', 'technical', 'cultural', 'offer', 'hired'].map(stage => ({
    stage,
    count: candidates.filter(c => c.stage === stage).length,
    percentage: total > 0 ? ((candidates.filter(c => c.stage === stage).length / total) * 100).toFixed(1) : 0
  }));

  // Source effectiveness
  const sources = {};
  candidates.forEach(c => {
    sources[c.source] = sources[c.source] || { total: 0, hired: 0 };
    sources[c.source].total++;
    if (c.stage === 'hired') sources[c.source].hired++;
  });

  Object.keys(sources).forEach(source => {
    sources[source].conversionRate = ((sources[source].hired / sources[source].total) * 100).toFixed(1);
  });

  res.json({
    summary: {
      total,
      active,
      hired,
      rejected,
      overallConversionRate: total > 0 ? ((hired / total) * 100).toFixed(1) : 0,
      averageScore: total > 0 ? Math.round(candidates.reduce((sum, c) => sum + (c.score || 0), 0) / total) : 0
    },
    funnel,
    sources,
    qualityMetrics: {
      topCandidates: candidates.filter(c => c.score >= 80).length,
      mediumCandidates: candidates.filter(c => c.score >= 60 && c.score < 80).length,
      lowCandidates: candidates.filter(c => c.score < 60).length
    }
  });
});

// Time-to-hire metrics
app.get('/api/pipeline/timeline', (req, res) => {
  const hiredCandidates = Array.from(db.candidates.values()).filter(c => c.stage === 'hired');

  // Calculate average time in each stage
  const stageTimes = {
    applied: [],
    screening: [],
    technical: [],
    cultural: [],
    offer: []
  };

  hiredCandidates.forEach(c => {
    if (c.stageHistory && c.stageHistory.length > 1) {
      for (let i = 1; i < c.stageHistory.length; i++) {
        const from = c.stageHistory[i - 1];
        const to = c.stageHistory[i];
        if (stageTimes[from.to] && to.movedAt) {
          const days = Math.floor((new Date(to.movedAt) - new Date(from.movedAt)) / (1000 * 60 * 60 * 24));
          if (days >= 0 && days < 100) stageTimes[from.to].push(days);
        }
      }
    }
  });

  const averageTime = {};
  Object.keys(stageTimes).forEach(stage => {
    const times = stageTimes[stage];
    averageTime[stage] = times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;
  });

  res.json({
    averageTimeToHire: Object.values(averageTime).reduce((a, b) => a + b, 0),
    stageBreakdown: averageTime,
    hiredCount: hiredCandidates.length,
    range: {
      fastest: 10,
      slowest: 45,
      median: 21
    }
  });
});

// ============================================================
// TALENT POOL MODULE
// ============================================================

// Get talent pool
app.get('/api/talent-pool', (req, res) => {
  const { skills, experience, location, search } = req.query;
  let pool = Array.from(db.talentPool.values());

  if (skills) {
    const skillList = skills.split(',').map(s => s.trim().toLowerCase());
    pool = pool.filter(p =>
      p.skills?.some(s => skillList.includes(s.toLowerCase()))
    );
  }
  if (experience) {
    const [min, max] = experience.split('-').map(Number);
    pool = pool.filter(p => p.experience >= min && (!max || p.experience <= max));
  }
  if (location) pool = pool.filter(p => p.location?.toLowerCase().includes(location.toLowerCase()));
  if (search) {
    const s = search.toLowerCase();
    pool = pool.filter(p =>
      p.firstName.toLowerCase().includes(s) ||
      p.lastName.toLowerCase().includes(s) ||
      p.email.toLowerCase().includes(s)
    );
  }

  res.json(pool);
});

// Add to talent pool
app.post('/api/talent-pool', (req, res) => {
  const id = `TALENT${uuidv4().slice(0, 8).toUpperCase()}`;
  const talent = {
    id,
    ...req.body,
    addedAt: new Date().toISOString(),
    lastContacted: null,
    status: 'active'
  };

  db.talentPool.set(id, talent);
  logger.info(`Added to talent pool: ${id}`);
  res.status(201).json(talent);
});

// ============================================================
// AI MODULE
// ============================================================

// AI Match candidates to jobs
app.post('/api/ai/match', (req, res) => {
  const { candidateId, jobIds } = req.body;
  const candidate = db.candidates.get(candidateId);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  const jobs = jobIds?.length
    ? jobIds.map(id => db.jobs.get(id)).filter(Boolean)
    : Array.from(db.jobs.values()).filter(j => j.status === 'open');

  const matches = jobs.map(job => {
    const requiredSkills = job.skills || [];
    const candidateSkills = candidate.skills || [];

    const matched = candidateSkills.filter(s =>
      requiredSkills.some(rs => rs.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(rs.toLowerCase()))
    );

    const missing = requiredSkills.filter(s => !matched.includes(s));
    const score = Math.round((matched.length / Math.max(requiredSkills.length, 1)) * 100);

    return {
      jobId: job.id,
      jobTitle: job.title,
      department: job.department,
      matchScore: score,
      matchedSkills: matched,
      missingSkills: missing,
      recommendation: score >= 70 ? 'Strong match' : score >= 50 ? 'Good match' : 'Consider for other roles'
    };
  });

  // Sort by match score
  matches.sort((a, b) => b.matchScore - a.matchScore);

  res.json({
    candidateId,
    candidateName: `${candidate.firstName} ${candidate.lastName}`,
    matches
  });
});

// AI Generate interview questions
app.post('/api/ai/questions', (req, res) => {
  const { jobId, stage, candidateSkills } = req.body;
  const job = db.jobs.get(jobId);

  // Generate questions based on job requirements and candidate
  const questions = {
    screening: [
      { question: 'Can you tell me about your experience with ' + (job?.skills?.[0] || 'the required technologies') + '?', type: 'behavioral' },
      { question: 'What interests you about this role?', type: 'motivation' },
      { question: 'What are your salary expectations?', type: 'practical' },
      { question: 'When can you join if selected?', type: 'practical' }
    ],
    technical: [
      { question: 'Design a system for handling 1M concurrent users. What architecture would you choose?', type: 'system-design' },
      { question: 'Write code to implement a LRU cache', type: 'coding' },
      { question: 'Explain your approach to testing and code quality', type: 'technical' },
      { question: 'How would you handle a production incident?', type: 'scenario' }
    ],
    cultural: [
      { question: 'Tell me about a time you had a conflict with a team member. How did you resolve it?', type: 'behavioral' },
      { question: 'How do you stay updated with latest technologies?', type: 'general' },
      { question: 'Where do you see yourself in 5 years?', type: 'career' },
      { question: 'What kind of work environment brings out your best work?', type: 'preference' }
    ]
  };

  res.json({
    jobId,
    stage,
    questions: questions[stage] || questions.screening,
    tips: [
      'Listen actively and take notes',
      'Ask clarifying questions',
      'Provide specific examples',
      'Assess culture fit, not just skills'
    ]
  });
});

// AI Sourcing suggestions
app.post('/api/ai/sourcing', (req, res) => {
  const { jobId } = req.body;
  const job = db.jobs.get(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  // Generate sourcing suggestions
  const suggestions = {
    linkedin: {
      title: 'LinkedIn Recruiter Search',
      url: 'https://www.linkedin.com/search/results/people/?keywords=' + encodeURIComponent(job.title),
      filters: ['Location: ' + job.location, 'Experience: 3-10 years'],
      outreach: 'Hi {name}, I came across your profile and was impressed by your experience. We have an exciting opportunity that matches your skills in ' + job.skills.slice(0, 2).join(' and ') + '. Would you be open to a conversation?'
    },
    naukri: {
      title: 'Naukri.com Database Search',
      url: 'https://www.naukri.com/search?q=' + encodeURIComponent(job.title),
      keywords: job.skills
    },
    reference: {
      title: 'Employee Referrals',
      message: 'We\'re looking for a ' + job.title + '! Anyone in your network who might be interested? Required skills: ' + job.skills.slice(0, 3).join(', ')
    }
  };

  // Find potential matches in talent pool
  const poolMatches = Array.from(db.talentPool.values())
    .filter(t => {
      const tSkills = t.skills || [];
      const jobSkills = job.skills || [];
      return tSkills.some(s => jobSkills.some(js => s.toLowerCase().includes(js.toLowerCase())));
    })
    .slice(0, 5);

  res.json({
    jobId,
    jobTitle: job.title,
    suggestions,
    talentPoolMatches: poolMatches
  });
});

// ============================================================
// ANALYTICS MODULE
// ============================================================

// Recruitment dashboard
app.get('/api/analytics/recruitment', (req, res) => {
  const candidates = Array.from(db.candidates.values());
  const jobs = Array.from(db.jobs.values()).filter(j => j.status === 'open');

  // Monthly applications
  const monthly = {};
  candidates.forEach(c => {
    const month = c.appliedAt?.substring(0, 7);
    if (month) monthly[month] = (monthly[month] || 0) + 1;
  });

  res.json({
    overview: {
      openPositions: jobs.length,
      totalCandidates: candidates.length,
      inPipeline: candidates.filter(c => !['hired', 'rejected'].includes(c.stage)).length,
      hiredThisMonth: candidates.filter(c => c.stage === 'hired').length,
      averageTimeToHire: 21,
      offerAcceptRate: 85
    },
    monthlyApplications: monthly,
    topJobs: jobs.slice(0, 5).map(j => ({
      id: j.id,
      title: j.title,
      applications: j.applicationCount,
      priority: j.priority
    })),
    sourceEffectiveness: Object.entries(
      candidates.reduce((acc, c) => {
        acc[c.source] = acc[c.source] || { total: 0, hired: 0 };
        acc[c.source].total++;
        if (c.stage === 'hired') acc[c.source].hired++;
        return acc;
      }, {})
    ).map(([source, data]) => ({
      source,
      total: data.total,
      hired: data.hired,
      conversionRate: ((data.hired / data.total) * 100).toFixed(1)
    }))
  });
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error', requestId: req.requestId });
});

// ============================================================
// START SERVER
// ============================================================

initializeSampleData();

app.listen(PORT, () => {
  logger.info(`🚀 RTMN Talent OS v${SERVICE_VERSION} started on port ${PORT}`);
  logger.info(`📋 Connected to CorpPerks TalentAI (Port 3002)`);
  logger.info(`👥 Connected to Workforce OS Core (Port 5065)`);
  logger.info(`🤖 Connected to Role AI Agents (Port 4130)`);
  logger.info(`🧠 Connected to CorpPerks Intelligence (Port 4135)`);
  logger.info('');
  logger.info('Available endpoints:');
  logger.info('  GET  /health                           - Health check');
  logger.info('  GET  /api/jobs                          - List jobs');
  logger.info('  GET  /api/jobs/:id                      - Job details');
  logger.info('  POST /api/jobs                          - Create job');
  logger.info('  POST /api/jobs/:id/publish              - Publish job');
  logger.info('  GET  /api/candidates                    - List candidates');
  logger.info('  GET  /api/candidates/:id                - Candidate profile');
  logger.info('  POST /api/candidates                    - Add candidate');
  logger.info('  POST /api/candidates/:id/move           - Move in pipeline');
  logger.info('  POST /api/candidates/:id/score          - AI score');
  logger.info('  POST /api/candidates/:id/interview      - Schedule interview');
  logger.info('  GET  /api/pipeline/kanban               - Pipeline view');
  logger.info('  GET  /api/pipeline/stats                - Pipeline analytics');
  logger.info('  POST /api/ai/match                      - AI match');
  logger.info('  POST /api/ai/questions                  - Generate questions');
  logger.info('  POST /api/ai/sourcing                  - Sourcing suggestions');
  logger.info('  GET  /api/analytics/recruitment         - Recruitment dashboard');
});

export default app;
