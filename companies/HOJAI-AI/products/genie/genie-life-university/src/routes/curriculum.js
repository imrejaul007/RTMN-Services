const express = require('express');
const router = express.Router();

// In-memory curriculum storage
const userCurricula = new Map();
const curriculumTemplates = new Map();

// Expose stores on the router so seedData can find them without altering routes.
router._stores = { userCurricula, curriculumTemplates };

// Learning paths
const learningPaths = [
  {
    id: 'leadership-mastery',
    name: 'Leadership Mastery',
    description: 'Complete leadership development from beginner to executive',
    duration: '6 months',
    difficulty: 'intermediate',
    courses: ['leadership-fundamentals', 'team-management', 'strategic-leadership', 'executivePresence'],
    skills: ['Communication', 'Decision Making', 'Team Building', 'Strategic Thinking'],
    careerTracks: ['Manager', 'Director', 'VP', 'C-Suite']
  },
  {
    id: 'entrepreneur-track',
    name: 'Entrepreneur Track',
    description: 'From idea to successful business launch',
    duration: '8 months',
    difficulty: 'advanced',
    courses: ['ideation', 'business-model', 'fundraising', 'scaling'],
    skills: ['Business Strategy', 'Finance', 'Marketing', 'Operations'],
    careerTracks: ['Founder', 'Co-Founder', 'Startup Executive']
  },
  {
    id: 'career-accelerator',
    name: 'Career Accelerator',
    description: 'Fast-track your professional growth',
    duration: '3 months',
    difficulty: 'beginner',
    courses: ['professional-skills', 'networking', 'personal-brand', 'career-strategy'],
    skills: ['Presentation', 'Networking', 'Personal Branding', 'Time Management'],
    careerTracks: ['Individual Contributor', 'Team Lead', 'Manager']
  },
  {
    id: 'technical-expert',
    name: 'Technical Expert',
    description: 'Master technical skills for the digital age',
    duration: '12 months',
    difficulty: 'intermediate',
    courses: ['python-mastery', 'data-science', 'ai-fundamentals', 'cloud-computing'],
    skills: ['Programming', 'Data Analysis', 'AI/ML', 'Cloud Architecture'],
    careerTracks: ['Developer', 'Senior Developer', 'Architect', 'CTO']
  },
  {
    id: 'creative-mastery',
    name: 'Creative Mastery',
    description: 'Unleash your creative potential',
    duration: '4 months',
    difficulty: 'beginner',
    courses: ['creativity-basics', 'design-thinking', 'storytelling', 'visual-communication'],
    skills: ['Creativity', 'Design', 'Storytelling', 'Visual Thinking'],
    careerTracks: ['Designer', 'Creative Director', 'Content Creator']
  }
];

// Create personalized curriculum
router.post('/', (req, res) => {
  const { userId, pathId, goals, currentLevel, timeCommitment } = req.body;

  if (!userId || !pathId) {
    return res.status(400).json({
      success: false,
      error: 'userId and pathId are required'
    });
  }

  const path = learningPaths.find(p => p.id === pathId);
  if (!path) {
    return res.status(404).json({
      success: false,
      error: 'Learning path not found',
      available: learningPaths.map(p => p.id)
    });
  }

  // Generate personalized curriculum
  const curriculum = {
    id: `curriculum-${Date.now()}`,
    userId,
    pathId,
    pathName: path.name,
    description: path.description,
    duration: path.duration,
    difficulty: path.difficulty,
    courses: path.courses.map((courseId, index) => ({
      courseId,
      order: index + 1,
      status: index === 0 ? 'current' : 'locked',
      estimatedDuration: getCourseDuration(courseId),
      prerequisites: index > 0 ? [path.courses[index - 1]] : []
    })),
    skills: path.skills,
    milestones: generateMilestones(path),
    goals: goals || [],
    currentLevel: currentLevel || 'beginner',
    timeCommitment: timeCommitment || '5 hours/week',
    progress: 0,
    startedAt: new Date().toISOString(),
    completedAt: null
  };

  if (!userCurricula.has(userId)) {
    userCurricula.set(userId, []);
  }
  userCurricula.get(userId).push(curriculum);

  res.json({
    success: true,
    message: 'Curriculum created',
    data: {
      curriculum,
      nextCourse: curriculum.courses.find(c => c.status === 'current')
    }
  });
});

// Get user's curricula
router.get('/:userId', (req, res) => {
  const { userId } = req.params;

  const curricula = userCurricula.get(userId) || [];

  res.json({
    success: true,
    data: {
      curricula,
      count: curricula.length,
      active: curricula.filter(c => !c.completedAt).length,
      completed: curricula.filter(c => c.completedAt).length
    }
  });
});

// Get specific curriculum
router.get('/:userId/:curriculumId', (req, res) => {
  const { userId, curriculumId } = req.params;

  const curricula = userCurricula.get(userId) || [];
  const curriculum = curricula.find(c => c.id === curriculumId);

  if (!curriculum) {
    return res.status(404).json({
      success: false,
      error: 'Curriculum not found'
    });
  }

  res.json({
    success: true,
    data: curriculum
  });
});

// Update curriculum
router.put('/:curriculumId', (req, res) => {
  const { curriculumId } = req.params;
  const { goals, timeCommitment, currentLevel } = req.body;

  let curriculum = null;
  for (const userCurriculums of userCurricula.values()) {
    const found = userCurriculums.find(c => c.id === curriculumId);
    if (found) {
      curriculum = found;
      break;
    }
  }

  if (!curriculum) {
    return res.status(404).json({
      success: false,
      error: 'Curriculum not found'
    });
  }

  if (goals !== undefined) curriculum.goals = goals;
  if (timeCommitment !== undefined) curriculum.timeCommitment = timeCommitment;
  if (currentLevel !== undefined) curriculum.currentLevel = currentLevel;

  res.json({
    success: true,
    message: 'Curriculum updated',
    data: curriculum
  });
});

// Complete course in curriculum
router.post('/:curriculumId/complete/:courseId', (req, res) => {
  const { curriculumId, courseId } = req.params;

  let curriculum = null;
  for (const userCurriculums of userCurricula.values()) {
    const found = userCurriculums.find(c => c.id === curriculumId);
    if (found) {
      curriculum = found;
      break;
    }
  }

  if (!curriculum) {
    return res.status(404).json({
      success: false,
      error: 'Curriculum not found'
    });
  }

  const course = curriculum.courses.find(c => c.courseId === courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      error: 'Course not found in curriculum'
    });
  }

  course.status = 'completed';
  course.completedAt = new Date().toISOString();

  // Unlock next course
  const currentIndex = curriculum.courses.findIndex(c => c.courseId === courseId);
  const nextCourse = curriculum.courses[currentIndex + 1];
  if (nextCourse) {
    nextCourse.status = 'current';
  }

  // Update progress
  const completedCount = curriculum.courses.filter(c => c.status === 'completed').length;
  curriculum.progress = Math.round((completedCount / curriculum.courses.length) * 100);

  // Check if curriculum completed
  if (completedCount === curriculum.courses.length) {
    curriculum.completedAt = new Date().toISOString();
  }

  res.json({
    success: true,
    message: curriculum.completedAt ? 'Curriculum completed! 🎓' : 'Course completed!',
    data: {
      curriculum,
      completedCourse: course,
      nextCourse: nextCourse || null,
      progress: curriculum.progress
    }
  });
});

// Get learning paths
router.get('/paths/all', (req, res) => {
  res.json({
    success: true,
    data: learningPaths.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      duration: p.duration,
      difficulty: p.difficulty,
      courseCount: p.courses.length,
      skills: p.skills
    }))
  });
});

// Get specific learning path
router.get('/paths/:pathId', (req, res) => {
  const { pathId } = req.params;

  const path = learningPaths.find(p => p.id === pathId);
  if (!path) {
    return res.status(404).json({
      success: false,
      error: 'Learning path not found',
      available: learningPaths.map(p => p.id)
    });
  }

  res.json({
    success: true,
    data: path
  });
});

// Get recommended curricula
router.post('/recommendations', (req, res) => {
  const { interests, careerGoals, currentSkills, timeCommitment } = req.body;

  // Simple recommendation logic
  const recommendations = learningPaths
    .map(path => ({
      ...path,
      matchScore: calculateMatchScore(path, { interests, careerGoals, currentSkills })
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);

  res.json({
    success: true,
    data: {
      recommendations,
      basedOn: { interests, careerGoals, currentSkills, timeCommitment }
    }
  });
});

// Helper functions
function getCourseDuration(courseId) {
  const durations = {
    'leadership-fundamentals': '4 weeks',
    'team-management': '6 weeks',
    'strategic-leadership': '8 weeks',
    'executivePresence': '4 weeks',
    'ideation': '3 weeks',
    'business-model': '5 weeks',
    'fundraising': '6 weeks',
    'scaling': '8 weeks',
    'professional-skills': '4 weeks',
    'networking': '3 weeks',
    'personal-brand': '3 weeks',
    'career-strategy': '4 weeks',
    'python-mastery': '8 weeks',
    'data-science': '10 weeks',
    'ai-fundamentals': '6 weeks',
    'cloud-computing': '8 weeks',
    'creativity-basics': '3 weeks',
    'design-thinking': '4 weeks',
    'storytelling': '3 weeks',
    'visual-communication': '4 weeks'
  };
  return durations[courseId] || '4 weeks';
}

function generateMilestones(path) {
  const milestones = [];
  const percentStep = 100 / (path.courses.length + 1);

  path.courses.forEach((courseId, index) => {
    milestones.push({
      id: `milestone-${index}`,
      name: `Complete ${courseId.replace(/-/g, ' ')}`,
      type: 'course',
      targetProgress: Math.round((index + 1) * percentStep),
      achieved: false
    });
  });

  milestones.push({
    id: 'milestone-final',
    name: `Complete ${path.name}`,
    type: 'curriculum',
    targetProgress: 100,
    achieved: false
  });

  return milestones;
}

function calculateMatchScore(path, { interests, careerGoals, currentSkills }) {
  let score = 50; // Base score

  // Match career goals
  if (careerGoals && careerGoals.length > 0) {
    const careerMatch = path.careerTracks.some(track =>
      careerGoals.some(goal => goal.toLowerCase().includes(track.toLowerCase()))
    );
    if (careerMatch) score += 30;
  }

  // Match skills
  if (currentSkills && currentSkills.length > 0) {
    const skillMatch = path.skills.filter(skill =>
      currentSkills.some(cs => cs.toLowerCase().includes(skill.toLowerCase()))
    ).length;
    score += skillMatch * 5;
  }

  // Match interests
  if (interests && interests.length > 0) {
    const interestMatch = interests.some(interest =>
      path.description.toLowerCase().includes(interest.toLowerCase()) ||
      path.name.toLowerCase().includes(interest.toLowerCase())
    );
    if (interestMatch) score += 15;
  }

  return Math.min(100, score);
}

module.exports = router;