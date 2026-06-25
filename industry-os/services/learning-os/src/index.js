/**
 * Learning OS - Training, Certifications, and Skill Development
 * Port: 4760
 *
 * Provides:
 * - Course management
 * - Learning paths
 * - Enrollments & progress tracking
 * - Certifications
 * - Skill assessments
 * - Training schedules
 * - Analytics & reporting
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4760;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// In-memory stores
const courses = new Map();
const learningPaths = new Map();
const enrollments = new Map();
const certifications = new Map();
const assessments = new Map();
const trainingSchedules = new Map();
const users = new Map();
const progress = new Map();
const certificates = new Map();

// Seed sample data
function seedData() {
  // Sample courses
  const sampleCourses = [
    {
      id: 'course-ai-fundamentals',
      title: 'AI Fundamentals for Business',
      description: 'Learn the basics of AI and how to apply it in your organization',
      category: 'AI',
      level: 'beginner',
      duration: 480, // minutes
      modules: 8,
      skills: ['ai-basics', 'machine-learning', 'prompt-engineering'],
      instructor: 'HOJAI Academy',
      price: 0,
      certification: 'AI Fundamentals Certificate',
      createdAt: new Date().toISOString()
    },
    {
      id: 'course-sutar-commerce',
      title: 'SUTAR OS Mastery',
      description: 'Master autonomous commerce with SUTAR OS',
      category: 'Commerce',
      level: 'intermediate',
      duration: 720,
      modules: 12,
      skills: ['sutar-os', 'autonomous-commerce', 'agent-negotiation'],
      instructor: 'SUTAR Academy',
      price: 499,
      certification: 'SUTAR OS Certified Professional',
      createdAt: new Date().toISOString()
    },
    {
      id: 'course-nexha-setup',
      title: 'Building Your Nexha',
      description: 'Step-by-step guide to setting up and operating a Nexha',
      category: 'Platform',
      level: 'intermediate',
      duration: 540,
      modules: 10,
      skills: ['nexha-setup', 'capability-registry', 'federation'],
      instructor: 'Nexha Academy',
      price: 999,
      certification: 'Nexha Business Operator',
      createdAt: new Date().toISOString()
    },
    {
      id: 'course-data-analytics',
      title: 'Data Analytics with TwinOS',
      description: 'Use digital twins for business intelligence and analytics',
      category: 'Analytics',
      level: 'advanced',
      duration: 900,
      modules: 15,
      skills: ['data-analytics', 'twinos', 'business-intelligence'],
      instructor: 'TwinOS Academy',
      price: 1499,
      certification: 'TwinOS Analytics Specialist',
      createdAt: new Date().toISOString()
    }
  ];

  sampleCourses.forEach(course => courses.set(course.id, course));

  // Sample learning paths
  const samplePaths = [
    {
      id: 'path-ai-entrepreneur',
      title: 'AI Entrepreneur',
      description: 'Complete path from AI basics to running an AI-powered business',
      level: 'beginner',
      courses: ['course-ai-fundamentals', 'course-sutar-commerce', 'course-nexha-setup'],
      estimatedDuration: 1740, // minutes
      skills: ['ai-basics', 'autonomous-commerce', 'business-operations'],
      certification: 'AI Entrepreneur Certificate',
      createdAt: new Date().toISOString()
    },
    {
      id: 'path-data-leader',
      title: 'Data-Driven Leader',
      description: 'Master data analytics and digital twins for business decision making',
      level: 'intermediate',
      courses: ['course-ai-fundamentals', 'course-data-analytics'],
      estimatedDuration: 1380,
      skills: ['ai-basics', 'data-analytics', 'business-intelligence'],
      certification: 'Data-Driven Leader Certificate',
      createdAt: new Date().toISOString()
    }
  ];

  samplePaths.forEach(path => learningPaths.set(path.id, path));

  // Sample certifications
  const sampleCerts = [
    {
      id: 'cert-ai-fundamentals',
      name: 'AI Fundamentals Certificate',
      issuer: 'HOJAI Academy',
      validity: 365 * 2, // 2 years
      skills: ['ai-basics', 'machine-learning', 'prompt-engineering'],
      requirements: ['Complete course-ai-fundamentals', 'Pass final exam (70%)'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'cert-sutar-pro',
      name: 'SUTAR OS Certified Professional',
      issuer: 'SUTAR Academy',
      validity: 365,
      skills: ['sutar-os', 'autonomous-commerce', 'agent-negotiation'],
      requirements: ['Complete course-sutar-commerce', 'Pass final exam (80%)', 'Complete practical project'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'cert-nexha-operator',
      name: 'Nexha Business Operator',
      issuer: 'Nexha Academy',
      validity: 365,
      skills: ['nexha-setup', 'capability-registry', 'federation', 'business-operations'],
      requirements: ['Complete course-nexha-setup', 'Pass final exam (80%)', 'Deploy working Nexha'],
      createdAt: new Date().toISOString()
    }
  ];

  sampleCerts.forEach(cert => certifications.set(cert.id, cert));

  console.log(`[LearningOS] Seeded: ${courses.size} courses, ${learningPaths.size} paths, ${certifications.size} certifications`);
}

seedData();

// ==================== COURSES ====================

/**
 * GET /courses - List all courses
 * GET /courses/:id - Get course details
 * POST /courses - Create new course
 * PUT /courses/:id - Update course
 * DELETE /courses/:id - Delete course
 */

app.get('/api/courses', (req, res) => {
  const { category, level, search } = req.query;
  let result = Array.from(courses.values());

  if (category) {
    result = result.filter(c => c.category.toLowerCase() === category.toLowerCase());
  }
  if (level) {
    result = result.filter(c => c.level.toLowerCase() === level.toLowerCase());
  }
  if (search) {
    const term = search.toLowerCase();
    result = result.filter(c =>
      c.title.toLowerCase().includes(term) ||
      c.description.toLowerCase().includes(term)
    );
  }

  res.json({
    success: true,
    count: result.length,
    data: result
  });
});

app.get('/api/courses/:id', (req, res) => {
  const course = courses.get(req.params.id);
  if (!course) {
    return res.status(404).json({ success: false, error: 'Course not found' });
  }

  // Get enrollment count and rating
  const enrollmentCount = Array.from(enrollments.values())
    .filter(e => e.courseId === course.id).length;

  res.json({
    success: true,
    data: {
      ...course,
      enrollmentCount,
      rating: 4.5 // Placeholder
    }
  });
});

app.post('/api/courses', (req, res) => {
  const { title, description, category, level, duration, modules, skills, instructor, price, certification } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ success: false, error: 'title, description, and category are required' });
  }

  const course = {
    id: `course-${uuidv4()}`,
    title,
    description,
    category,
    level: level || 'beginner',
    duration: duration || 0,
    modules: modules || 1,
    skills: skills || [],
    instructor: instructor || 'HOJAI Academy',
    price: price || 0,
    certification: certification || null,
    createdAt: new Date().toISOString()
  };

  courses.set(course.id, course);

  res.status(201).json({
    success: true,
    data: course
  });
});

app.put('/api/courses/:id', (req, res) => {
  const course = courses.get(req.params.id);
  if (!course) {
    return res.status(404).json({ success: false, error: 'Course not found' });
  }

  const updated = { ...course, ...req.body, id: course.id, updatedAt: new Date().toISOString() };
  courses.set(course.id, updated);

  res.json({ success: true, data: updated });
});

app.delete('/api/courses/:id', (req, res) => {
  if (!courses.has(req.params.id)) {
    return res.status(404).json({ success: false, error: 'Course not found' });
  }
  courses.delete(req.params.id);
  res.json({ success: true, message: 'Course deleted' });
});

// ==================== LEARNING PATHS ====================

/**
 * GET /paths - List all learning paths
 * GET /paths/:id - Get path details
 * POST /paths - Create learning path
 * PUT /paths/:id - Update path
 */

app.get('/api/paths', (req, res) => {
  const { level } = req.query;
  let result = Array.from(learningPaths.values());

  if (level) {
    result = result.filter(p => p.level.toLowerCase() === level.toLowerCase());
  }

  res.json({
    success: true,
    count: result.length,
    data: result
  });
});

app.get('/api/paths/:id', (req, res) => {
  const path = learningPaths.get(req.params.id);
  if (!path) {
    return res.status(404).json({ success: false, error: 'Learning path not found' });
  }

  // Expand course details
  const courseDetails = path.courses.map(cid => courses.get(cid)).filter(Boolean);

  res.json({
    success: true,
    data: {
      ...path,
      courseDetails
    }
  });
});

app.post('/api/paths', (req, res) => {
  const { title, description, level, courses: courseIds, estimatedDuration, skills, certification } = req.body;

  if (!title || !courseIds || !Array.isArray(courseIds)) {
    return res.status(400).json({ success: false, error: 'title and courses array are required' });
  }

  const path = {
    id: `path-${uuidv4()}`,
    title,
    description: description || '',
    level: level || 'beginner',
    courses: courseIds,
    estimatedDuration: estimatedDuration || 0,
    skills: skills || [],
    certification: certification || null,
    createdAt: new Date().toISOString()
  };

  learningPaths.set(path.id, path);

  res.status(201).json({ success: true, data: path });
});

// ==================== ENROLLMENTS ====================

/**
 * POST /enroll - Enroll in course
 * GET /enrollments/:userId - Get user enrollments
 * DELETE /enrollments/:id - Cancel enrollment
 */

app.post('/api/enroll', (req, res) => {
  const { userId, courseId, pathId } = req.body;

  if (!userId || (!courseId && !pathId)) {
    return res.status(400).json({ success: false, error: 'userId and (courseId or pathId) are required' });
  }

  const enrollment = {
    id: `enroll-${uuidv4()}`,
    userId,
    courseId: courseId || null,
    pathId: pathId || null,
    status: 'active',
    enrolledAt: new Date().toISOString(),
    completedAt: null,
    progress: 0
  };

  enrollments.set(enrollment.id, enrollment);

  // Initialize progress tracking
  if (courseId) {
    progress.set(`${userId}:${courseId}`, {
      userId,
      courseId,
      completedModules: [],
      lastAccessedAt: new Date().toISOString(),
      timeSpent: 0
    });
  }

  res.status(201).json({ success: true, data: enrollment });
});

app.get('/api/enrollments/:userId', (req, res) => {
  const userEnrollments = Array.from(enrollments.values())
    .filter(e => e.userId === req.params.userId);

  const enriched = userEnrollments.map(e => {
    if (e.courseId) {
      return { ...e, course: courses.get(e.courseId) };
    }
    if (e.pathId) {
      return { ...e, path: learningPaths.get(e.pathId) };
    }
    return e;
  });

  res.json({ success: true, count: enriched.length, data: enriched });
});

// ==================== PROGRESS ====================

/**
 * POST /progress - Update progress
 * GET /progress/:userId/:courseId - Get progress
 */

app.post('/api/progress', (req, res) => {
  const { userId, courseId, moduleId, completed, timeSpent } = req.body;

  if (!userId || !courseId) {
    return res.status(400).json({ success: false, error: 'userId and courseId are required' });
  }

  const key = `${userId}:${courseId}`;
  let prog = progress.get(key) || {
    userId,
    courseId,
    completedModules: [],
    lastAccessedAt: new Date().toISOString(),
    timeSpent: 0
  };

  if (moduleId && completed) {
    if (!prog.completedModules.includes(moduleId)) {
      prog.completedModules.push(moduleId);
    }
  }

  if (timeSpent) {
    prog.timeSpent += timeSpent;
  }

  prog.lastAccessedAt = new Date().toISOString();

  // Calculate percentage
  const course = courses.get(courseId);
  if (course && course.modules > 0) {
    prog.percentage = Math.round((prog.completedModules.length / course.modules) * 100);

    // Check for completion
    if (prog.percentage >= 100) {
      prog.completed = true;
      prog.completedAt = new Date().toISOString();
    }
  }

  progress.set(key, prog);

  res.json({ success: true, data: prog });
});

app.get('/api/progress/:userId/:courseId', (req, res) => {
  const key = `${req.params.userId}:${req.params.courseId}`;
  const prog = progress.get(key);

  if (!prog) {
    return res.json({ success: true, data: { userId: req.params.userId, courseId: req.params.courseId, percentage: 0 } });
  }

  res.json({ success: true, data: prog });
});

// ==================== CERTIFICATIONS ====================

/**
 * GET /certifications - List all certifications
 * GET /certifications/:id - Get certification details
 * POST /certifications/:userId/issue - Issue certification
 * GET /certificates/:userId - Get user certificates
 */

app.get('/api/certifications', (req, res) => {
  res.json({
    success: true,
    count: certifications.size,
    data: Array.from(certifications.values())
  });
});

app.get('/api/certifications/:id', (req, res) => {
  const cert = certifications.get(req.params.id);
  if (!cert) {
    return res.status(404).json({ success: false, error: 'Certification not found' });
  }
  res.json({ success: true, data: cert });
});

app.post('/api/certifications/:userId/issue', (req, res) => {
  const { certificationId, issuedAt, expiresAt } = req.body;

  const certDef = certifications.get(certificationId);
  if (!certDef) {
    return res.status(404).json({ success: false, error: 'Certification type not found' });
  }

  const certificate = {
    id: `cert-${uuidv4()}`,
    userId: req.params.userId,
    certificationId,
    certificationName: certDef.name,
    issuer: certDef.issuer,
    issuedAt: issuedAt || new Date().toISOString(),
    expiresAt: expiresAt || new Date(Date.now() + certDef.validity * 24 * 60 * 60 * 1000).toISOString(),
    status: 'valid',
    verificationCode: uuidv4().split('-')[0].toUpperCase()
  };

  certificates.set(certificate.id, certificate);

  res.status(201).json({ success: true, data: certificate });
});

app.get('/api/certificates/:userId', (req, res) => {
  const userCerts = Array.from(certificates.values())
    .filter(c => c.userId === req.params.userId);

  res.json({ success: true, count: userCerts.length, data: userCerts });
});

app.get('/api/certificates/verify/:code', (req, res) => {
  const cert = Array.from(certificates.values())
    .find(c => c.verificationCode === req.params.code);

  if (!cert) {
    return res.status(404).json({ success: false, error: 'Certificate not found' });
  }

  res.json({
    success: true,
    data: {
      valid: cert.status === 'valid' && new Date(cert.expiresAt) > new Date(),
      certificate: cert
    }
  });
});

// ==================== ASSESSMENTS ====================

/**
 * POST /assessments - Create assessment
 * GET /assessments/:courseId - Get course assessments
 * POST /assessments/:id/submit - Submit assessment
 */

app.post('/api/assessments', (req, res) => {
  const { courseId, title, questions, passingScore, timeLimit } = req.body;

  if (!courseId || !title || !questions) {
    return res.status(400).json({ success: false, error: 'courseId, title, and questions are required' });
  }

  const assessment = {
    id: `assess-${uuidv4()}`,
    courseId,
    title,
    questions,
    passingScore: passingScore || 70,
    timeLimit: timeLimit || 60, // minutes
    createdAt: new Date().toISOString()
  };

  assessments.set(assessment.id, assessment);

  res.status(201).json({ success: true, data: assessment });
});

app.get('/api/assessments/:courseId', (req, res) => {
  const courseAssessments = Array.from(assessments.values())
    .filter(a => a.courseId === req.params.courseId);

  res.json({ success: true, count: courseAssessments.length, data: courseAssessments });
});

app.post('/api/assessments/:id/submit', (req, res) => {
  const { userId, answers } = req.body;
  const assessment = assessments.get(req.params.id);

  if (!assessment) {
    return res.status(404).json({ success: false, error: 'Assessment not found' });
  }

  // Calculate score (simplified)
  let correct = 0;
  assessment.questions.forEach((q, i) => {
    if (answers[i] === q.correctAnswer) correct++;
  });

  const score = Math.round((correct / assessment.questions.length) * 100);
  const passed = score >= assessment.passingScore;

  const result = {
    assessmentId: assessment.id,
    userId,
    score,
    passed,
    correct,
    total: assessment.questions.length,
    submittedAt: new Date().toISOString()
  };

  res.json({ success: true, data: result });
});

// ==================== TRAINING SCHEDULES ====================

/**
 * GET /schedules - List schedules
 * POST /schedules - Create schedule
 * GET /schedules/:userId - Get user schedules
 */

app.get('/api/schedules', (req, res) => {
  const { upcoming } = req.query;
  let result = Array.from(trainingSchedules.values());

  if (upcoming === 'true') {
    result = result.filter(s => new Date(s.startDate) > new Date());
  }

  res.json({ success: true, count: result.length, data: result });
});

app.post('/api/schedules', (req, res) => {
  const { courseId, instructorId, startDate, endDate, capacity, location, type } = req.body;

  if (!courseId || !startDate) {
    return res.status(400).json({ success: false, error: 'courseId and startDate are required' });
  }

  const schedule = {
    id: `schedule-${uuidv4()}`,
    courseId,
    course: courses.get(courseId),
    instructorId: instructorId || null,
    startDate,
    endDate: endDate || null,
    capacity: capacity || 30,
    enrolled: 0,
    location: location || 'online',
    type: type || 'self-paced', // self-paced, live, cohort
    createdAt: new Date().toISOString()
  };

  trainingSchedules.set(schedule.id, schedule);

  res.status(201).json({ success: true, data: schedule });
});

app.get('/api/schedules/:userId', (req, res) => {
  const userSchedules = Array.from(trainingSchedules.values())
    .filter(s => s.instructorId === req.params.userId);

  res.json({ success: true, count: userSchedules.length, data: userSchedules });
});

// ==================== ANALYTICS ====================

/**
 * GET /analytics/org/:orgId - Organization learning analytics
 * GET /analytics/course/:courseId - Course analytics
 */

app.get('/api/analytics/org/:orgId', (req, res) => {
  // Simplified analytics
  const orgEnrollments = Array.from(enrollments.values())
    .filter(e => e.userId.startsWith(req.params.orgId));

  const completed = orgEnrollments.filter(e => e.status === 'completed').length;
  const inProgress = orgEnrollments.filter(e => e.status === 'active').length;

  res.json({
    success: true,
    data: {
      totalEnrollments: orgEnrollments.length,
      completed,
      inProgress,
      completionRate: orgEnrollments.length > 0 ? Math.round((completed / orgEnrollments.length) * 100) : 0,
      popularCourses: Array.from(courses.values())
        .sort((a, b) => {
          const aEnroll = Array.from(enrollments.values()).filter(e => e.courseId === a.id).length;
          const bEnroll = Array.from(enrollments.values()).filter(e => e.courseId === b.id).length;
          return bEnroll - aEnroll;
        })
        .slice(0, 5)
        .map(c => ({ id: c.id, title: c.title, enrollments: 0 }))
    }
  });
});

app.get('/api/analytics/course/:courseId', (req, res) => {
  const courseEnrollments = Array.from(enrollments.values())
    .filter(e => e.courseId === req.params.courseId);

  const completed = courseEnrollments.filter(e => e.completedAt).length;
  const inProgress = courseEnrollments.filter(e => e.status === 'active').length;
  const avgProgress = courseEnrollments.length > 0
    ? Math.round(courseEnrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / courseEnrollments.length)
    : 0;

  res.json({
    success: true,
    data: {
      courseId: req.params.courseId,
      totalEnrollments: courseEnrollments.length,
      completed,
      inProgress,
      completionRate: courseEnrollments.length > 0 ? Math.round((completed / courseEnrollments.length) * 100) : 0,
      averageProgress: avgProgress
    }
  });
});

// ==================== SKILLS ====================

/**
 * GET /skills - Get all skills
 * GET /skills/:userId - Get user skill profile
 */

app.get('/api/skills', (req, res) => {
  const allSkills = new Set();
  Array.from(courses.values()).forEach(c => {
    (c.skills || []).forEach(s => allSkills.add(s));
  });

  res.json({
    success: true,
    count: allSkills.size,
    data: Array.from(allSkills)
  });
});

app.get('/api/skills/:userId', (req, res) => {
  // Get skills from completed courses
  const userEnrollments = Array.from(enrollments.values())
    .filter(e => e.userId === req.params.userId && e.completedAt);

  const skills = {};
  userEnrollments.forEach(e => {
    const course = courses.get(e.courseId);
    if (course) {
      (course.skills || []).forEach(skill => {
        skills[skill] = (skills[skill] || 0) + 1;
      });
    }
  });

  res.json({
    success: true,
    data: {
      userId: req.params.userId,
      skills,
      totalSkills: Object.keys(skills).length
    }
  });
});

// ==================== HEALTH ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'learning-os',
    port: PORT,
    stats: {
      courses: courses.size,
      learningPaths: learningPaths.size,
      enrollments: enrollments.size,
      certifications: certifications.size,
      certificates: certificates.size
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Learning OS',
    version: '1.0.0',
    port: PORT,
    endpoints: [
      'GET /api/courses',
      'GET /api/courses/:id',
      'POST /api/courses',
      'GET /api/paths',
      'POST /api/enroll',
      'POST /api/progress',
      'GET /api/certifications',
      'POST /api/certifications/:userId/issue',
      'GET /api/certificates/:userId',
      'GET /api/certificates/verify/:code',
      'GET /api/analytics/org/:orgId',
      'GET /api/skills'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[LearningOS] Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[LearningOS] Running on port ${PORT}`);
  console.log(`[LearningOS] ${courses.size} courses, ${learningPaths.size} paths, ${certifications.size} certifications available`);
});

module.exports = app;
