const express = require('express');
const router = express.Router();

// Personalized curriculum storage
const userCurricula = new Map();

// Master curriculum templates
const curriculumTemplates = {
  'career-launch': {
    id: 'career-launch',
    name: 'Career Launch Accelerator',
    description: 'Everything you need to launch a successful career',
    duration: '6 months',
    phases: [
      { week: '1-2', title: 'Self-Assessment', courses: ['public-speaking', 'writing', 'time-blocking'] },
      { week: '3-6', title: 'Technical Foundations', courses: ['python', 'data-sql', 'web-dev'] },
      { week: '7-10', title: 'Professional Skills', courses: ['networking', 'negotiation', 'leadership'] },
      { week: '11-16', title: 'Industry Specialization', courses: ['data-analysis', 'cloud-aws'] },
      { week: '17-20', title: 'Job Search & Interviewing', courses: ['personal-brand', 'problem-solving'] },
      { week: '21-24', title: 'Career Foundations', courses: ['team-building', 'effective-delegation'] }
    ],
    milestones: [
      { week: 6, name: 'Foundation Complete', requirement: '3 courses' },
      { week: 12, name: 'Technical Proficient', requirement: '5 courses' },
      { week: 18, name: 'Job Ready', requirement: '8 courses' },
      { week: 24, name: 'Career Accelerated', requirement: 'All courses' }
    ]
  },
  'leadership-track': {
    id: 'leadership-track',
    name: 'Future Leaders Program',
    description: 'Develop leadership skills for management roles',
    duration: '4 months',
    phases: [
      { week: '1-4', title: 'Self-Leadership', courses: ['time-blocking', 'focus', 'critical-thinking'] },
      { week: '5-8', title: 'Team Leadership', courses: ['delegation', 'team-building', 'coaching'] },
      { week: '9-12', title: 'Strategic Leadership', courses: ['strategic-thinking', 'change-mgmt', 'decision-making'] },
      { week: '13-16', title: 'Executive Presence', courses: ['public-speaking', 'storytelling', 'conflict-resolution'] }
    ],
    milestones: [
      { week: 4, name: 'Self-Aware Leader', requirement: '3 courses' },
      { week: 8, name: 'Team Leader', requirement: '6 courses' },
      { week: 12, name: 'Department Head', requirement: '9 courses' },
      { week: 16, name: 'Executive Ready', requirement: 'All courses' }
    ]
  },
  'entrepreneur': {
    id: 'entrepreneur',
    name: 'Startup Founder Blueprint',
    description: 'Build and launch your own business',
    duration: '8 months',
    phases: [
      { week: '1-4', title: 'Founder Mindset', courses: ['problem-solving', 'critical-thinking', 'creativity'] },
      { week: '5-10', title: 'Business Fundamentals', courses: ['financial-literacy', 'negotiation', 'marketing'] },
      { week: '11-16', title: 'Product Development', courses: ['python', 'web-dev', 'mobile-dev'] },
      { week: '17-22', title: 'Growth & Scale', courses: ['data-analysis', 'cloud-aws', 'marketing'] },
      { week: '23-28', title: 'Fundraising & Leadership', courses: ['public-speaking', 'negotiation', 'team-building'] },
      { week: '29-32', title: 'Launch & Iterate', courses: ['devops', 'customer-relations', 'operations'] }
    ],
    milestones: [
      { week: 8, name: 'Validated Idea', requirement: '5 courses' },
      { week: 16, name: 'MVP Ready', requirement: '10 courses' },
      { week: 24, name: 'Growing', requirement: '15 courses' },
      { week: 32, name: 'Launched', requirement: 'All courses' }
    ]
  },
  'technical-expert': {
    id: 'technical-expert',
    name: '10x Developer Path',
    description: 'Become a world-class software engineer',
    duration: '12 months',
    phases: [
      { week: '1-4', title: 'Programming Mastery', courses: ['python', 'javascript'] },
      { week: '5-8', title: 'Data & Backend', courses: ['data-sql', 'data-analysis'] },
      { week: '9-12', title: 'Cloud & DevOps', courses: ['cloud-aws', 'devops'] },
      { week: '13-18', title: 'Advanced Topics', courses: ['machine-learning', 'cybersecurity'] },
      { week: '19-24', title: 'Full Stack', courses: ['web-dev', 'mobile-dev'] },
      { week: '25-30', title: 'Architecture', courses: ['system-design', 'architectural-patterns'] },
      { week: '31-36', title: 'Leadership in Tech', courses: ['coaching', 'strategic-thinking'] },
      { week: '37-40', title: 'Open Source & Community', courses: ['public-speaking', 'storytelling'] },
      { week: '41-48', title: 'Specialization', courses: ['machine-learning', 'devops', 'web-dev'] }
    ],
    milestones: [
      { week: 12, name: 'Junior Developer', requirement: '6 courses' },
      { week: 24, name: 'Mid-Level Engineer', requirement: '12 courses' },
      { week: 36, name: 'Senior Engineer', requirement: '18 courses' },
      { week: 48, name: 'Tech Lead / Architect', requirement: 'All courses' }
    ]
  },
  'side-hustle': {
    id: 'side-hustle',
    name: 'Side Hustle to Business',
    description: 'Build income outside your 9-5',
    duration: '3 months',
    phases: [
      { week: '1-2', title: 'Idea Validation', courses: ['problem-solving', 'financial-literacy'] },
      { week: '3-5', title: 'Skill Building', courses: ['web-dev', 'marketing', 'writing'] },
      { week: '6-8', title: 'Launch', courses: ['personal-brand', 'negotiation'] },
      { week: '9-12', title: 'Scale', courses: ['time-blocking', 'focus', 'team-building'] }
    ],
    milestones: [
      { week: 4, name: 'First Customer', requirement: '3 courses' },
      { week: 8, name: 'Proof of Concept', requirement: '5 courses' },
      { week: 12, name: 'Profitable Side Hustle', requirement: 'All courses' }
    ]
  }
};

// Create personalized curriculum
router.post('/create', (req, res) => {
  const { userId, template, customization } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required'
    });
  }

  if (!template || !curriculumTemplates[template]) {
    return res.status(400).json({
      success: false,
      error: 'Invalid template',
      availableTemplates: Object.keys(curriculumTemplates)
    });
  }

  const templateData = curriculumTemplates[template];
  const curriculum = {
    id: `curriculum-${userId}-${Date.now()}`,
    userId,
    template: templateData.name,
    createdAt: new Date().toISOString(),
    phases: templateData.phases.map(phase => ({
      ...phase,
      status: 'locked',
      startedAt: null,
      completedAt: null
    })),
    milestones: templateData.milestones.map(m => ({
      ...m,
      achieved: false,
      achievedAt: null
    })),
    progress: 0,
    coursesCompleted: [],
    coursesInProgress: [],
    totalCourses: templateData.phases.flatMap(p => p.courses).length,
    customizations: customization || {}
  };

  // Unlock first phase
  if (curriculum.phases.length > 0) {
    curriculum.phases[0].status = 'active';
  }

  userCurricula.set(userId, curriculum);

  res.json({
    success: true,
    message: `Created personalized curriculum: ${templateData.name}`,
    data: {
      id: curriculum.id,
      template: curriculum.template,
      duration: templateData.duration,
      phases: curriculum.phases.length,
      totalCourses: curriculum.totalCourses,
      firstPhase: curriculum.phases[0],
      milestones: curriculum.milestones
    }
  });
});

// Get user's curriculum
router.get('/:userId', (req, res) => {
  const { userId } = req.params;

  const curriculum = userCurricula.get(userId);
  if (!curriculum) {
    return res.status(404).json({
      success: false,
      error: 'No curriculum found',
      message: 'Create a curriculum using POST /curriculum/create'
    });
  }

  res.json({
    success: true,
    data: curriculum
  });
});

// Get available templates
router.get('/templates/all', (req, res) => {
  const templates = Object.entries(curriculumTemplates).map(([id, t]) => ({
    id,
    name: t.name,
    description: t.description,
    duration: t.duration,
    phases: t.phases.length,
    totalCourses: t.phases.flatMap(p => p.courses).length
  }));

  res.json({
    success: true,
    data: templates
  });
});

// Get specific template
router.get('/templates/:templateId', (req, res) => {
  const { templateId } = req.params;
  const template = curriculumTemplates[templateId];

  if (!template) {
    return res.status(404).json({
      success: false,
      error: 'Template not found',
      availableTemplates: Object.keys(curriculumTemplates)
    });
  }

  res.json({
    success: true,
    data: template
  });
});

// Complete a course in curriculum
router.post('/:userId/complete/:courseId', (req, res) => {
  const { userId, courseId } = req.params;

  const curriculum = userCurricula.get(userId);
  if (!curriculum) {
    return res.status(404).json({
      success: false,
      error: 'No curriculum found'
    });
  }

  // Add to completed
  if (!curriculum.coursesCompleted.includes(courseId)) {
    curriculum.coursesCompleted.push(courseId);
    curriculum.coursesInProgress = curriculum.coursesInProgress.filter(c => c !== courseId);
  }

  // Update progress
  curriculum.progress = Math.round((curriculum.coursesCompleted.length / curriculum.totalCourses) * 100);

  // Check milestones
  curriculum.milestones.forEach(m => {
    const coursesNeeded = parseInt(m.requirement);
    if (!m.achieved && curriculum.coursesCompleted.length >= coursesNeeded) {
      m.achieved = true;
      m.achievedAt = new Date().toISOString();
    }
  });

  // Unlock next phase if applicable
  const currentPhaseIndex = curriculum.phases.findIndex(p => p.status === 'active');
  const currentPhase = curriculum.phases[currentPhaseIndex];
  if (currentPhase && currentPhase.courses.every(c => curriculum.coursesCompleted.includes(c))) {
    currentPhase.status = 'completed';
    currentPhase.completedAt = new Date().toISOString();

    const nextPhase = curriculum.phases[currentPhaseIndex + 1];
    if (nextPhase) {
      nextPhase.status = 'active';
      nextPhase.startedAt = new Date().toISOString();
    }
  }

  userCurricula.set(userId, curriculum);

  res.json({
    success: true,
    message: `Completed course: ${courseId}`,
    data: {
      coursesCompleted: curriculum.coursesCompleted.length,
      totalCourses: curriculum.totalCourses,
      progress: curriculum.progress,
      currentPhase: curriculum.phases.find(p => p.status === 'active'),
      milestonesAchieved: curriculum.milestones.filter(m => m.achieved).length,
      nextMilestone: curriculum.milestones.find(m => !m.achieved)
    }
  });
});

// Start a course in curriculum
router.post('/:userId/start/:courseId', (req, res) => {
  const { userId, courseId } = req.params;

  const curriculum = userCurricula.get(userId);
  if (!curriculum) {
    return res.status(404).json({
      success: false,
      error: 'No curriculum found'
    });
  }

  // Check if phase is active
  const activePhase = curriculum.phases.find(p =>
    p.status === 'active' && p.courses.includes(courseId)
  );

  if (!activePhase) {
    return res.status(400).json({
      success: false,
      error: 'Course not available in current phase'
    });
  }

  // Add to in-progress
  if (!curriculum.coursesInProgress.includes(courseId)) {
    curriculum.coursesInProgress.push(courseId);
  }

  userCurricula.set(userId, curriculum);

  res.json({
    success: true,
    message: `Started course: ${courseId}`,
    data: {
      courseId,
      phase: activePhase.title,
      coursesInProgress: curriculum.coursesInProgress,
      recommendedNext: activePhase.courses.find(c =>
        !curriculum.coursesCompleted.includes(c) &&
        !curriculum.coursesInProgress.includes(c)
      )
    }
  });
});

// Get weekly schedule
router.get('/:userId/schedule', (req, res) => {
  const { userId } = req.params;
  const { week } = req.query;

  const curriculum = userCurricula.get(userId);
  if (!curriculum) {
    return res.status(404).json({
      success: false,
      error: 'No curriculum found'
    });
  }

  const weekNum = parseInt(week) || 1;
  const phase = curriculum.phases.find(p => {
    const [start, end] = p.week.split('-').map(n => parseInt(n));
    return weekNum >= start && weekNum <= end;
  });

  if (!phase) {
    return res.json({
      success: true,
      data: {
        week: weekNum,
        message: 'No scheduled courses for this week',
        availablePhases: curriculum.phases.map(p => p.week)
      }
    });
  }

  const schedule = {
    week: weekNum,
    phase: phase.title,
    courses: phase.courses.map(courseId => ({
      id: courseId,
      status: curriculum.coursesCompleted.includes(courseId) ? 'completed' :
             curriculum.coursesInProgress.includes(courseId) ? 'in_progress' : 'available',
      recommendedTime: '5-7 hours per course'
    }))
  };

  res.json({
    success: true,
    data: schedule
  });
});

// Add custom course to curriculum
router.post('/:userId/custom', (req, res) => {
  const { userId } = req.params;
  const { name, topics, duration, phase } = req.body;

  if (!name || !topics) {
    return res.status(400).json({
      success: false,
      error: 'name and topics are required'
    });
  }

  const curriculum = userCurricula.get(userId);
  if (!curriculum) {
    return res.status(404).json({
      success: false,
      error: 'No curriculum found'
    });
  }

  const customCourse = {
    id: `custom-${Date.now()}`,
    name,
    topics,
    duration: duration || '4 weeks',
    phase: phase || 'custom',
    custom: true
  };

  // Add to the specified phase or create a new one
  if (phase && curriculum.phases.find(p => p.week === phase)) {
    const targetPhase = curriculum.phases.find(p => p.week === phase);
    targetPhase.courses.push(customCourse.id);
  } else {
    curriculum.phases.push({
      week: 'custom',
      title: 'Custom Courses',
      courses: [customCourse.id],
      status: curriculum.phases.every(p => p.status === 'completed') ? 'active' : 'locked'
    });
  }

  curriculum.totalCourses += 1;
  curriculum.customCourses = curriculum.customCourses || [];
  curriculum.customCourses.push(customCourse);

  userCurricula.set(userId, curriculum);

  res.json({
    success: true,
    message: 'Added custom course to curriculum',
    data: {
      course: customCourse,
      updatedTotalCourses: curriculum.totalCourses
    }
  });
});

// AI-powered curriculum optimization
router.post('/:userId/optimize', (req, res) => {
  const { userId } = req.params;
  const { goals, constraints, pace } = req.body;

  const curriculum = userCurricula.get(userId);
  if (!curriculum) {
    return res.status(404).json({
      success: false,
      error: 'No curriculum found'
    });
  }

  // Calculate optimal schedule
  const coursesPerWeek = pace === 'intensive' ? 3 : pace === 'moderate' ? 2 : 1;
  const totalWeeks = Math.ceil(curriculum.totalCourses / coursesPerWeek);

  const optimizations = {
    currentDuration: `${curriculum.totalCourses} courses`,
    optimizedDuration: `${totalWeeks} weeks`,
    coursesPerWeek,
    recommendations: [
      'Start with foundation courses before specialization',
      'Batch similar skills together for better retention',
      'Schedule challenging courses when you have most energy',
      'Include buffer weeks for project work and review'
    ],
    schedule: []
  };

  // Generate optimized schedule
  let week = 1;
  let courseIndex = 0;
  const allCourses = curriculum.phases.flatMap(p => p.courses);

  while (courseIndex < allCourses.length) {
    const weekCourses = allCourses.slice(courseIndex, courseIndex + coursesPerWeek);
    optimizations.schedule.push({
      week,
      courses: weekCourses,
      focus: week % 4 === 0 ? 'Review & Practice' : 'Learning'
    });
    courseIndex += coursesPerWeek;
    week++;
  }

  res.json({
    success: true,
    message: 'Curriculum optimized based on your goals',
    data: {
      original: {
        totalCourses: curriculum.totalCourses,
        phases: curriculum.phases.length
      },
      optimized: optimizations,
      personalizedAdvice: goals?.includes('quick') ?
        'Focus on high-impact skills first to see results fast' :
        'Take time to build strong foundations for long-term success'
    }
  });
});

module.exports = router;