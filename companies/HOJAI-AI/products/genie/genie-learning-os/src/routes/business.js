const express = require('express');
const router = express.Router();

// In-memory MBA curriculum data
const mbaCurriculum = {
  foundations: {
    id: 'foundations',
    name: 'MBA Foundations',
    description: 'Essential business fundamentals',
    courses: [
      { id: 'econ-101', name: 'Economics 101', credits: 3, duration: '4 weeks', topics: ['Microeconomics', 'Macroeconomics', 'Supply & Demand', 'Market Structures'] },
      { id: 'accounting-101', name: 'Accounting Essentials', credits: 3, duration: '4 weeks', topics: ['Financial Statements', 'Balance Sheets', 'Income Statements', 'Cash Flow'] },
      { id: 'stats-101', name: 'Business Statistics', credits: 3, duration: '4 weeks', topics: ['Descriptive Stats', 'Probability', 'Hypothesis Testing', 'Regression'] },
      { id: 'finance-101', name: 'Finance Fundamentals', credits: 3, duration: '4 weeks', topics: ['Time Value of Money', 'NPV', 'IRR', 'Risk & Return'] },
      { id: 'marketing-101', name: 'Marketing Basics', credits: 3, duration: '4 weeks', topics: ['4Ps', 'Customer Segments', 'Value Proposition', 'Channels'] }
    ]
  },
  leadership: {
    id: 'leadership',
    name: 'Leadership & Management',
    description: 'Develop leadership and management skills',
    courses: [
      { id: 'org-behavior', name: 'Organizational Behavior', credits: 3, duration: '4 weeks', topics: ['Individual Behavior', 'Team Dynamics', 'Leadership Styles', 'Culture'] },
      { id: 'strategy-101', name: 'Business Strategy', credits: 3, duration: '5 weeks', topics: ['SWOT Analysis', 'Porter\'s Forces', 'Competitive Advantage', 'Blue Ocean'] },
      { id: 'operations-101', name: 'Operations Management', credits: 3, duration: '4 weeks', topics: ['Process Design', 'Supply Chain', 'Quality Management', 'Lean'] },
      { id: 'hr-management', name: 'HR Management', credits: 3, duration: '4 weeks', topics: ['Talent Acquisition', 'Performance Mgmt', 'Compensation', 'Development'] },
      { id: 'negotiation', name: 'Negotiation & Influence', credits: 2, duration: '3 weeks', topics: ['BATNA', 'Interest-Based', 'Win-Win', 'Tactics'] }
    ]
  },
  specialization: {
    id: 'specialization',
    name: 'Specializations',
    description: 'Deep dive into specific domains',
    tracks: {
      marketing: [
        { id: 'digital-mkt', name: 'Digital Marketing', topics: ['SEO', 'SEM', 'Social Media', 'Content Marketing', 'Analytics'] },
        { id: 'brand-mgmt', name: 'Brand Management', topics: ['Brand Equity', 'Positioning', 'Brand Architecture', 'Campaigns'] },
        { id: 'crm', name: 'Customer Relationship Mgmt', topics: ['Customer Segments', 'Journey Mapping', 'Retention', 'CLV'] }
      ],
      finance: [
        { id: 'corp-finance', name: 'Corporate Finance', topics: ['Capital Budgeting', 'WACC', 'Valuation', 'M&A'] },
        { id: 'investment-banking', name: 'Investment Banking', topics: ['LBO', 'IPO', 'Financial Modeling', 'Due Diligence'] },
        { id: 'fintech', name: 'FinTech', topics: ['Payments', 'Lending', 'Blockchain', 'RegTech'] }
      ],
      operations: [
        { id: 'supply-chain', name: 'Supply Chain Management', topics: ['Sourcing', 'Logistics', 'Inventory', 'Optimization'] },
        { id: 'process-excellence', name: 'Process Excellence', topics: ['Lean Six Sigma', 'Kaizen', 'BPM', 'Automation'] },
        { id: 'project-mgmt', name: 'Project Management', topics: ['Agile', 'Scrum', 'Risk Management', 'Stakeholders'] }
      ],
      entrepreneurship: [
        { id: 'venture-creation', name: 'Venture Creation', topics: ['Ideation', 'Business Models', 'Pitching', 'Funding'] },
        { id: 'scaling', name: 'Scaling Startups', topics: ['Product-Market Fit', 'Growth Hacking', 'Unit Economics', 'Expansion'] },
        { id: 'innovation', name: 'Innovation Management', topics: ['Design Thinking', 'Disruption', 'R&D', 'IP Strategy'] }
      ]
    }
  },
  capstone: {
    id: 'capstone',
    name: 'Capstone Projects',
    description: 'Apply your learning to real business challenges',
    projects: [
      { id: 'biz-plan', name: 'Complete Business Plan', duration: '8 weeks', deliverables: ['Executive Summary', 'Market Analysis', 'Financial Projections', 'Go-to-Market Strategy'] },
      { id: 'consulting-project', name: 'Strategic Consulting Project', duration: '6 weeks', deliverables: ['Problem Statement', 'Analysis Framework', 'Recommendations', 'Implementation Plan'] },
      { id: 'startup-launch', name: 'Startup Launch Simulation', duration: '10 weeks', deliverables: ['MVP Spec', 'Pitch Deck', 'Financial Model', 'Launch Plan'] }
    ]
  }
};

// User progress tracking
const userProgress = new Map();

// Get all curriculum overview
router.get('/curriculum', (req, res) => {
  res.json({
    success: true,
    data: {
      overview: 'Comprehensive MBA curriculum covering foundations to specialization',
      tracks: [
        { id: 'foundations', name: 'MBA Foundations', courses: 5, credits: 15 },
        { id: 'leadership', name: 'Leadership & Management', courses: 5, credits: 14 },
        { id: 'specialization', name: 'Specializations', tracks: 4, courses: 9 },
        { id: 'capstone', name: 'Capstone Projects', projects: 3 }
      ],
      totalCredits: 29,
      estimatedDuration: '12-18 months'
    }
  });
});

// Get specific track curriculum
router.get('/curriculum/:trackId', (req, res) => {
  const { trackId } = req.params;
  const track = mbaCurriculum[trackId];

  if (!track) {
    return res.status(404).json({
      success: false,
      error: 'Track not found',
      availableTracks: Object.keys(mbaCurriculum)
    });
  }

  res.json({
    success: true,
    data: track
  });
});

// Get user's MBA progress
router.get('/progress/:userId', (req, res) => {
  const { userId } = req.params;
  const progress = userProgress.get(userId) || {
    enrolledTracks: [],
    completedCourses: [],
    currentCourse: null,
    creditsEarned: 0,
    specialization: null,
    startedAt: null
  };

  res.json({
    success: true,
    data: {
      ...progress,
      progressPercent: Math.round((progress.creditsEarned / 29) * 100)
    }
  });
});

// Enroll in MBA program
router.post('/enroll/:userId', (req, res) => {
  const { userId } = req.params;
  const { specialization } = req.body;

  const progress = userProgress.get(userId) || {
    enrolledTracks: ['foundations', 'leadership'],
    completedCourses: [],
    currentCourse: null,
    creditsEarned: 0,
    specialization: specialization || null,
    startedAt: new Date().toISOString()
  };

  if (specialization) {
    progress.specialization = specialization;
    progress.enrolledTracks.push('specialization');
  }

  userProgress.set(userId, progress);

  res.json({
    success: true,
    message: 'Enrolled in MBA program',
    data: {
      tracks: progress.enrolledTracks,
      specialization: progress.specialization,
      nextRecommended: 'Start with Economics 101'
    }
  });
});

// Start a course
router.post('/course/:courseId/start/:userId', (req, res) => {
  const { courseId, userId } = req.params;

  let course = null;
  for (const track of Object.values(mbaCurriculum)) {
    if (track.courses) {
      course = track.courses.find(c => c.id === courseId);
      if (course) break;
    }
  }

  if (!course) {
    return res.status(404).json({
      success: false,
      error: 'Course not found'
    });
  }

  const progress = userProgress.get(userId) || {
    enrolledTracks: [],
    completedCourses: [],
    currentCourse: null,
    creditsEarned: 0,
    startedAt: new Date().toISOString()
  };

  progress.currentCourse = {
    ...course,
    startedAt: new Date().toISOString(),
    completedLessons: 0,
    totalLessons: course.topics.length
  };

  userProgress.set(userId, progress);

  res.json({
    success: true,
    message: `Started course: ${course.name}`,
    data: {
      course: progress.currentCourse,
      topics: course.topics
    }
  });
});

// Complete a lesson in current course
router.post('/course/:courseId/lesson/:lessonIndex/complete/:userId', (req, res) => {
  const { courseId, lessonIndex, userId } = req.params;

  const progress = userProgress.get(userId);
  if (!progress || !progress.currentCourse || progress.currentCourse.id !== courseId) {
    return res.status(400).json({
      success: false,
      error: 'No active course found'
    });
  }

  const lessonNum = parseInt(lessonIndex);
  if (progress.currentCourse.completedLessons < lessonNum) {
    return res.status(400).json({
      success: false,
      error: 'Must complete lessons in order'
    });
  }

  progress.currentCourse.completedLessons = lessonNum + 1;

  // Check if course is complete
  if (progress.currentCourse.completedLessons >= progress.currentCourse.totalLessons) {
    progress.completedCourses.push(courseId);
    progress.creditsEarned += progress.currentCourse.credits;
    progress.currentCourse = null;
  }

  userProgress.set(userId, progress);

  res.json({
    success: true,
    data: {
      completedLessons: lessonNum + 1,
      totalLessons: progress.currentCourse?.totalLessons || 0,
      courseComplete: !progress.currentCourse,
      creditsEarned: progress.creditsEarned,
      progressPercent: Math.round((progress.creditsEarned / 29) * 100)
    }
  });
});

// Get business case study
router.get('/case-study/:caseId', (req, res) => {
  const { caseId } = req.params;

  const caseStudies = {
    'netflix-pivot': {
      id: 'netflix-pivot',
      company: 'Netflix',
      title: 'The Pivot from DVD to Streaming',
      difficulty: 'Intermediate',
      duration: '45 minutes',
      sections: {
        situation: 'Netflix started as a DVD-by-mail service in 1997. By 2007, streaming was becoming viable.',
        challenge: 'How do you transition from a successful DVD business to streaming while keeping shareholders happy?',
        analysis: ['Moat Analysis', 'First-Mover vs Fast Follower', 'Unit Economics Evolution'],
        decision: 'Launch streaming alongside DVD, eventually sunset DVD entirely',
        outcome: 'Netflix grew from 12M to 230M+ subscribers globally'
      },
      discussionQuestions: [
        'What was Netflix\'s competitive advantage in 2007?',
        'Why did Blockbuster fail while Netflix succeeded?',
        'What risks did Netflix take with the pivot?'
      ]
    },
    'amazon-aws': {
      id: 'amazon-aws',
      company: 'Amazon',
      title: 'AWS: From Internal Tool to $100B Business',
      difficulty: 'Advanced',
      duration: '60 minutes',
      sections: {
        situation: 'Amazon built internal infrastructure to handle peak loads during holiday seasons.',
        challenge: 'How to monetize excess capacity while competing with established cloud providers?',
        analysis: ['Platform Business Model', 'Winner-Take-All Dynamics', 'Ecosystem Lock-in'],
        decision: 'Offer cloud services to external customers with pay-per-use pricing',
        outcome: 'AWS became Amazon\'s most profitable segment, pioneering cloud computing'
      },
      discussionQuestions: [
        'Why did Amazon succeed where others failed in cloud?',
        'What made the pricing model revolutionary?',
        'How does AWS create strategic moats for Amazon?'
      ]
    },
    'airbnb-brand': {
      id: 'airbnb-brand',
      company: 'Airbnb',
      title: 'Building Trust in the Sharing Economy',
      difficulty: 'Beginner',
      duration: '30 minutes',
      sections: {
        situation: 'Airbnb needed to convince strangers to trust each other with their homes.',
        challenge: 'How do you create trust between hosts and guests without meeting first?',
        analysis: ['Trust Mechanisms', 'Network Effects', 'Reputation Systems'],
        decision: 'Build a comprehensive trust infrastructure: reviews, identity verification, guarantees',
        outcome: 'Airbnb became a $100B+ company enabling millions of micro-entrepreneurs'
      },
      discussionQuestions: [
        'What trust signals are most important?',
        'How do you bootstrap a reputation system?',
        'What happens when trust is broken?'
      ]
    }
  };

  const caseStudy = caseStudies[caseId];
  if (!caseStudy) {
    return res.status(404).json({
      success: false,
      error: 'Case study not found',
      availableCases: Object.keys(caseStudies)
    });
  }

  res.json({
    success: true,
    data: caseStudy
  });
});

// Get all case studies
router.get('/case-studies', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'netflix-pivot', title: 'Netflix: The Pivot', difficulty: 'Intermediate', duration: '45 min' },
      { id: 'amazon-aws', title: 'AWS: Internal to External', difficulty: 'Advanced', duration: '60 min' },
      { id: 'airbnb-brand', title: 'Airbnb: Building Trust', difficulty: 'Beginner', duration: '30 min' }
    ]
  });
});

// Business simulation
router.post('/simulate/:scenarioId/:userId', (req, res) => {
  const { scenarioId, userId } = req.params;
  const { decisions } = req.body;

  const scenarios = {
    'startup-launch': {
      id: 'startup-launch',
      name: 'Launch Your Startup',
      phases: [
        { name: 'Ideation', decisions: ['Problem Selection', 'Target Market', 'Initial Feature Set'] },
        { name: 'Building', decisions: ['Build vs Buy', 'Tech Stack', 'Team Size'] },
        { name: 'Launch', decisions: ['Pricing', 'Go-to-Market', 'Customer Acquisition'] },
        { name: 'Scale', decisions: ['Expand Markets', 'Hire or Automate', 'Raise Funding'] }
      ]
    },
    'turnaround': {
      id: 'turnaround',
      name: 'Corporate Turnaround',
      phases: [
        { name: 'Diagnosis', decisions: ['Cost Analysis', 'Market Position', 'Leadership Assessment'] },
        { name: 'Restructuring', decisions: ['Layoffs', 'Asset Sales', 'Debt Restructuring'] },
        { name: 'Strategy', decisions: ['Core Business', 'New Markets', 'Innovation'] },
        { name: 'Execution', decisions: ['Change Management', 'Culture Shift', 'Stakeholder Communication'] }
      ]
    }
  };

  const scenario = scenarios[scenarioId];
  if (!scenario) {
    return res.status(404).json({
      success: false,
      error: 'Scenario not found',
      availableScenarios: Object.keys(scenarios)
    });
  }

  // Calculate outcomes based on decisions
  const score = decisions ?
    Math.min(100, Math.max(0, 50 + decisions.reduce((sum, d, i) => sum + (d.quality || 70) * (1 - i * 0.1), 0) / decisions.length)) :
    70;

  const outcomes = {
    revenue: Math.round(score * 100000),
    customers: Math.round(score * 10),
    runway: Math.round(score * 3),
    teamHealth: Math.round(score)
  };

  res.json({
    success: true,
    data: {
      scenario: scenario.name,
      decisionsMade: decisions?.length || 0,
      score,
      outcomes,
      feedback: score > 80 ? 'Excellent strategic decisions!' :
                score > 60 ? 'Good decisions with room for improvement' :
                'Consider alternative approaches'
    }
  });
});

module.exports = router;