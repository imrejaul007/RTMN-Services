const express = require('express');
const router = express.Router();

// Skill categories and definitions
const skillCategories = {
  technical: {
    name: 'Technical Skills',
    description: 'Software, programming, and technical competencies',
    skills: [
      { id: 'python', name: 'Python Programming', level: 'Beginner', duration: '8 weeks', topics: ['Syntax', 'Functions', 'OOP', 'Libraries', 'Projects'] },
      { id: 'javascript', name: 'JavaScript', level: 'Beginner', duration: '6 weeks', topics: ['ES6+', 'Async/Await', 'DOM', 'Node.js', 'Frameworks'] },
      { id: 'data-sql', name: 'SQL & Databases', level: 'Intermediate', duration: '4 weeks', topics: ['Queries', 'Joins', 'Indexing', 'Optimization', 'NoSQL'] },
      { id: 'cloud-aws', name: 'Cloud Computing (AWS)', level: 'Intermediate', duration: '6 weeks', topics: ['EC2', 'S3', 'Lambda', 'Networking', 'Security'] },
      { id: 'data-analysis', name: 'Data Analysis', level: 'Intermediate', duration: '8 weeks', topics: ['Pandas', 'Visualization', 'Statistics', 'EDA', 'Reporting'] },
      { id: 'machine-learning', name: 'Machine Learning', level: 'Advanced', duration: '12 weeks', topics: ['Supervised', 'Unsupervised', 'Neural Nets', 'MLOps', 'Projects'] },
      { id: 'cybersecurity', name: 'Cybersecurity Basics', level: 'Beginner', duration: '6 weeks', topics: ['Threats', 'Encryption', 'Auth', 'Network Security', 'Compliance'] },
      { id: 'devops', name: 'DevOps Fundamentals', level: 'Intermediate', duration: '8 weeks', topics: ['CI/CD', 'Docker', 'Kubernetes', 'Monitoring', 'IaC'] },
      { id: 'mobile-dev', name: 'Mobile Development', level: 'Intermediate', duration: '10 weeks', topics: ['React Native', 'Flutter', 'iOS', 'Android', 'Publishing'] },
      { id: 'web-dev', name: 'Full-Stack Web Dev', level: 'Intermediate', duration: '12 weeks', topics: ['Frontend', 'Backend', 'APIs', 'Databases', 'Deployment'] }
    ]
  },
  communication: {
    name: 'Communication Skills',
    description: 'Verbal, written, and interpersonal communication',
    skills: [
      { id: 'public-speaking', name: 'Public Speaking', level: 'All', duration: '4 weeks', topics: ['Structure', 'Body Language', 'Voice', 'Handling Q&A', 'Presentations'] },
      { id: 'writing', name: 'Business Writing', level: 'All', duration: '4 weeks', topics: ['Clarity', 'Persuasion', 'Emails', 'Reports', 'Tone'] },
      { id: 'storytelling', name: 'Storytelling for Business', level: 'All', duration: '3 weeks', topics: ['Narrative Arc', 'Characters', 'Conflict', 'Resolution', 'Data Stories'] },
      { id: 'active-listening', name: 'Active Listening', level: 'All', duration: '2 weeks', topics: ['Attention', 'Reflection', 'Clarification', 'Empathy', 'Feedback'] },
      { id: 'conflict-resolution', name: 'Conflict Resolution', level: 'Intermediate', duration: '3 weeks', topics: ['Identifying Conflict', 'Interest-Based', 'Mediation', 'De-escalation', 'Win-Win'] },
      { id: 'cross-cultural', name: 'Cross-Cultural Communication', level: 'All', duration: '3 weeks', topics: ['Cultural Awareness', 'Etiquette', 'Virtual Teams', 'Building Rapport', 'Remote'] }
    ]
  },
  leadership: {
    name: 'Leadership & Management',
    description: 'Leading teams and managing people',
    skills: [
      { id: 'delegation', name: 'Effective Delegation', level: 'Intermediate', duration: '2 weeks', topics: ['What to Delegate', 'To Whom', 'Micromanagement', 'Follow-up', 'Trust'] },
      { id: 'coaching', name: 'Coaching & Mentoring', level: 'Intermediate', duration: '4 weeks', topics: ['GROW Model', 'Feedback', 'Development', 'Career', 'Peer Coaching'] },
      { id: 'team-building', name: 'Team Building', level: 'All', duration: '3 weeks', topics: ['Trust', 'Communication', 'Psychological Safety', 'Collaboration', 'Remote Teams'] },
      { id: 'change-mgmt', name: 'Change Management', level: 'Advanced', duration: '4 weeks', topics: ['Kotter\'s 8 Steps', 'Resistance', 'Communication', 'Sustaining', 'Culture'] },
      { id: 'strategic-thinking', name: 'Strategic Thinking', level: 'Advanced', duration: '4 weeks', topics: ['Systems Thinking', 'Long-term', 'Trade-offs', 'Vision', 'Execution'] }
    ]
  },
  productivity: {
    name: 'Productivity & Time Management',
    description: 'Work smarter, not harder',
    skills: [
      { id: 'time-blocking', name: 'Time Blocking', level: 'All', duration: '1 week', topics: ['Calendar', 'Priorities', 'Deep Work', 'Energy Management', 'Routines'] },
      { id: 'task-mgmt', name: 'Task Management', level: 'All', duration: '2 weeks', topics: ['GTD', 'Prioritization', 'Eisenhower', 'Tracking', 'Automation'] },
      { id: 'focus', name: 'Deep Work & Focus', level: 'All', duration: '2 weeks', topics: ['Distractions', 'Flow State', 'Batching', 'Digital Minimalism', 'Environment'] },
      { id: 'meetings', name: 'Meeting Management', level: 'All', duration: '1 week', topics: ['Purpose', 'Agenda', 'Time Boxing', 'Outcomes', 'No-Meeting Days'] },
      { id: 'email', name: 'Email Management', level: 'All', duration: '1 week', topics: ['Inbox Zero', 'Templates', 'Filters', 'Scheduling', 'Delegation'] },
      { id: 'delegation', name: 'Delegation Skills', level: 'Intermediate', duration: '2 weeks', topics: ['What to Delegate', 'How to Delegate', 'Accountability', 'Trust Building', 'Follow-up'] }
    ]
  },
  life: {
    name: 'Life Skills',
    description: 'Personal development and life management',
    skills: [
      { id: 'financial-literacy', name: 'Financial Literacy', level: 'All', duration: '4 weeks', topics: ['Budgeting', 'Saving', 'Investing', 'Debt', 'Taxes'] },
      { id: 'negotiation', name: 'Negotiation', level: 'All', duration: '3 weeks', topics: ['Preparation', 'BATNA', 'Value Creation', 'Psychology', 'Ethics'] },
      { id: 'decision-making', name: 'Decision Making', level: 'All', duration: '3 weeks', topics: ['Frameworks', 'Biases', 'Intuition', 'Data', 'Reversibility'] },
      { id: 'critical-thinking', name: 'Critical Thinking', level: 'All', duration: '4 weeks', topics: ['Logic', 'Fallacies', 'Evidence', 'Alternatives', 'Metacognition'] },
      { id: 'problem-solving', name: 'Problem Solving', level: 'All', duration: '3 weeks', topics: ['Define', 'Analyze', 'Ideate', 'Decide', 'Implement'] },
      { id: 'creativity', name: 'Creativity & Innovation', level: 'All', duration: '3 weeks', topics: ['Brainstorming', 'Constraints', 'Lateral Thinking', 'Improvisation', 'Ideas to Action'] },
      { id: 'networking', name: 'Networking', level: 'All', duration: '2 weeks', topics: ['Building Relationships', 'LinkedIn', 'Events', 'Value Exchange', 'Maintenance'] },
      { id: 'personal-brand', name: 'Personal Branding', level: 'All', duration: '3 weeks', topics: ['Identity', 'Online Presence', 'Content', 'Visibility', 'Authenticity'] }
    ]
  }
};

// User skill progress
const userSkills = new Map();

// Get all skill categories
router.get('/categories', (req, res) => {
  const categories = Object.entries(skillCategories).map(([id, cat]) => ({
    id,
    name: cat.name,
    description: cat.description,
    skillCount: cat.skills.length
  }));

  res.json({
    success: true,
    data: categories
  });
});

// Get skills in a category
router.get('/category/:categoryId', (req, res) => {
  const { categoryId } = req.params;
  const category = skillCategories[categoryId];

  if (!category) {
    return res.status(404).json({
      success: false,
      error: 'Category not found',
      availableCategories: Object.keys(skillCategories)
    });
  }

  res.json({
    success: true,
    data: {
      ...category,
      skills: category.skills.map(s => ({
        id: s.id,
        name: s.name,
        level: s.level,
        duration: s.duration
      }))
    }
  });
});

// Get skill details with full curriculum
router.get('/:skillId', (req, res) => {
  const { skillId } = req.params;

  let skill = null;
  let categoryId = null;

  for (const [catId, category] of Object.entries(skillCategories)) {
    const found = category.skills.find(s => s.id === skillId);
    if (found) {
      skill = found;
      categoryId = catId;
      break;
    }
  }

  if (!skill) {
    return res.status(404).json({
      success: false,
      error: 'Skill not found',
      availableSkills: Object.values(skillCategories).flatMap(c => c.skills.map(s => s.id))
    });
  }

  res.json({
    success: true,
    data: {
      ...skill,
      category: skillCategories[categoryId].name,
      curriculum: skill.topics.map((topic, i) => ({
        lesson: i + 1,
        topic,
        estimatedTime: '2-3 hours',
        exercises: [`Exercise 1 for ${topic}`, `Exercise 2 for ${topic}`, `Real-world project`]
      }))
    }
  });
});

// Get user's skill profile
router.get('/profile/:userId', (req, res) => {
  const { userId } = req.params;
  const profile = userSkills.get(userId) || {
    userId,
    skills: [],
    inProgress: [],
    completed: [],
    recommendations: []
  };

  res.json({
    success: true,
    data: profile
  });
});

// Start learning a skill
router.post('/learn/:skillId/:userId', (req, res) => {
  const { skillId, userId } = req.params;
  const { currentLesson = 0 } = req.body;

  let skill = null;
  for (const category of Object.values(skillCategories)) {
    const found = category.skills.find(s => s.id === skillId);
    if (found) {
      skill = found;
      break;
    }
  }

  if (!skill) {
    return res.status(404).json({
      success: false,
      error: 'Skill not found'
    });
  }

  const profile = userSkills.get(userId) || {
    userId,
    skills: [],
    inProgress: [],
    completed: [],
    recommendations: []
  };

  // Add to in-progress if not already there
  if (!profile.inProgress.find(s => s.skillId === skillId)) {
    profile.inProgress.push({
      skillId,
      name: skill.name,
      startedAt: new Date().toISOString(),
      currentLesson,
      totalLessons: skill.topics.length
    });
  } else {
    // Update current lesson
    const inProgress = profile.inProgress.find(s => s.skillId === skillId);
    inProgress.currentLesson = currentLesson;
  }

  userSkills.set(userId, profile);

  res.json({
    success: true,
    message: `Started learning: ${skill.name}`,
    data: {
      skill: {
        id: skill.id,
        name: skill.name,
        topics: skill.topics,
        currentLesson,
        progress: Math.round((currentLesson / skill.topics.length) * 100)
      }
    }
  });
});

// Complete a lesson
router.post('/lesson/:skillId/:lessonIndex/:userId', (req, res) => {
  const { skillId, lessonIndex, userId } = req.params;

  let skill = null;
  for (const category of Object.values(skillCategories)) {
    const found = category.skills.find(s => s.id === skillId);
    if (found) {
      skill = found;
      break;
    }
  }

  if (!skill) {
    return res.status(404).json({
      success: false,
      error: 'Skill not found'
    });
  }

  const profile = userSkills.get(userId);
  if (!profile) {
    return res.status(400).json({
      success: false,
      error: 'User not enrolled in any skills'
    });
  }

  const inProgress = profile.inProgress.find(s => s.skillId === skillId);
  if (!inProgress) {
    return res.status(400).json({
      success: false,
      error: 'Skill not in progress'
    });
  }

  const lessonNum = parseInt(lessonIndex);
  if (inProgress.currentLesson < lessonNum) {
    return res.status(400).json({
      success: false,
      error: 'Must complete lessons in order'
    });
  }

  inProgress.currentLesson = lessonNum + 1;

  // Check if completed
  if (inProgress.currentLesson >= skill.topics.length) {
    profile.inProgress = profile.inProgress.filter(s => s.skillId !== skillId);
    profile.completed.push({
      skillId,
      name: skill.name,
      completedAt: new Date().toISOString(),
      level: skill.level
    });
  }

  userSkills.set(userId, profile);

  res.json({
    success: true,
    data: {
      completedLesson: lessonNum + 1,
      totalLessons: skill.topics.length,
      skillComplete: inProgress.currentLesson >= skill.topics.length,
      nextTopic: skill.topics[lessonNum + 1] || null
    }
  });
});

// Get skill recommendations
router.get('/recommendations/:userId', (req, res) => {
  const { userId } = req.params;
  const { goals, industry, experience } = req.query;

  // Generate recommendations based on goals/industry
  const recommendations = [];

  if (goals?.includes('career')) {
    recommendations.push({
      category: 'Technical',
      skills: skillCategories.technical.skills.slice(0, 2)
    });
  }

  if (goals?.includes('leadership')) {
    recommendations.push({
      category: 'Leadership',
      skills: skillCategories.leadership.skills.slice(0, 2)
    });
  }

  if (industry === 'tech') {
    recommendations.push({
      category: 'Tech Stack',
      skills: [
        skillCategories.technical.skills.find(s => s.id === 'python'),
        skillCategories.technical.skills.find(s => s.id === 'cloud-aws'),
        skillCategories.technical.skills.find(s => s.id === 'devops')
      ].filter(Boolean)
    });
  }

  // Add communication as universal recommendation
  recommendations.push({
    category: 'Universal',
    skills: skillCategories.communication.skills.slice(0, 2),
    reason: 'Essential for all careers'
  });

  res.json({
    success: true,
    data: {
      recommendations: recommendations.filter(r => r.skills.length > 0),
      personalizedFor: { goals, industry, experience }
    }
  });
});

// Practice exercises for a skill
router.get('/practice/:skillId/:lessonIndex', (req, res) => {
  const { skillId, lessonIndex } = req.params;

  let skill = null;
  for (const category of Object.values(skillCategories)) {
    const found = category.skills.find(s => s.id === skillId);
    if (found) {
      skill = found;
      break;
    }
  }

  if (!skill) {
    return res.status(404).json({
      success: false,
      error: 'Skill not found'
    });
  }

  const topic = skill.topics[parseInt(lessonIndex)];
  if (!topic) {
    return res.status(404).json({
      success: false,
      error: 'Lesson not found'
    });
  }

  // Generate practice exercises based on topic
  const exercises = [
    {
      id: `${skillId}-${lessonIndex}-1`,
      type: 'quiz',
      title: `Test Your ${topic} Knowledge`,
      questions: [
        { q: `What is the first step in ${topic}?`, options: ['A', 'B', 'C', 'D'], correct: 0 },
        { q: `Which approach is best for ${topic}?`, options: ['X', 'Y', 'Z', 'W'], correct: 1 }
      ],
      timeLimit: '10 minutes'
    },
    {
      id: `${skillId}-${lessonIndex}-2`,
      type: 'scenario',
      title: `${topic} in Practice`,
      scenario: `You encounter a situation where ${topic.toLowerCase()} is critical...`,
      tasks: [
        `Identify the key ${topic} principle to apply`,
        `Outline your approach using ${topic} framework`,
        `Predict the outcome of your approach`
      ],
      submissionRequired: true
    },
    {
      id: `${skillId}-${lessonIndex}-3`,
      type: 'reflection',
      title: `Reflect on ${topic}`,
      prompts: [
        'How does this relate to your current work?',
        'What challenges might you face applying this?',
        'How will you measure success?'
      ]
    }
  ];

  res.json({
    success: true,
    data: {
      skill: skill.name,
      topic,
      exercises
    }
  });
});

module.exports = router;