const express = require('express');
const router = express.Router();

// In-memory course storage
const courses = new Map();
const enrollments = new Map();

// Expose stores on the router so seedData can find them without altering routes.
router._stores = { courses, enrollments };

// Course catalog
const courseCatalog = [
  {
    id: 'leadership-fundamentals',
    title: 'Leadership Fundamentals',
    description: 'Master the core principles of effective leadership',
    instructor: 'Dr. Sarah Chen',
    duration: '4 weeks',
    difficulty: 'beginner',
    lessons: 12,
    category: 'leadership',
    skills: ['Communication', 'Team Building', 'Decision Making'],
    rating: 4.8,
    students: 15420,
    modules: [
      { title: 'Introduction to Leadership', lessons: 3 },
      { title: 'Leadership Styles', lessons: 3 },
      { title: 'Communication Skills', lessons: 3 },
      { title: 'Building Trust', lessons: 3 }
    ]
  },
  {
    id: 'professional-skills',
    title: 'Professional Skills Mastery',
    description: 'Essential skills for career success',
    instructor: 'Michael Torres',
    duration: '3 weeks',
    difficulty: 'beginner',
    lessons: 10,
    category: 'professional',
    skills: ['Presentation', 'Time Management', 'Networking'],
    rating: 4.7,
    students: 23150,
    modules: [
      { title: 'Professional Communication', lessons: 4 },
      { title: 'Time Management', lessons: 3 },
      { title: 'Presentation Skills', lessons: 3 }
    ]
  },
  {
    id: 'data-science',
    title: 'Data Science Essentials',
    description: 'Learn data science from scratch',
    instructor: 'Dr. Aisha Patel',
    duration: '10 weeks',
    difficulty: 'intermediate',
    lessons: 35,
    category: 'technical',
    skills: ['Python', 'Statistics', 'Machine Learning', 'Data Visualization'],
    rating: 4.9,
    students: 8900,
    modules: [
      { title: 'Python Fundamentals', lessons: 8 },
      { title: 'Statistics & Probability', lessons: 7 },
      { title: 'Data Analysis', lessons: 8 },
      { title: 'Machine Learning Basics', lessons: 7 },
      { title: 'Data Visualization', lessons: 5 }
    ]
  },
  {
    id: 'business-strategy',
    title: 'Business Strategy',
    description: 'Think and act strategically like an executive',
    instructor: 'James Morrison',
    duration: '6 weeks',
    difficulty: 'advanced',
    lessons: 18,
    category: 'business',
    skills: ['Strategic Thinking', 'Market Analysis', 'Competitive Strategy'],
    rating: 4.6,
    students: 5600,
    modules: [
      { title: 'Strategic Foundations', lessons: 5 },
      { title: 'Market Analysis', lessons: 5 },
      { title: 'Competitive Strategy', lessons: 5 },
      { title: 'Execution & Alignment', lessons: 3 }
    ]
  },
  {
    id: 'ai-fundamentals',
    title: 'AI Fundamentals',
    description: 'Understanding artificial intelligence for business',
    instructor: 'Dr. Wei Zhang',
    duration: '6 weeks',
    difficulty: 'intermediate',
    lessons: 20,
    category: 'technical',
    skills: ['AI/ML Concepts', 'Prompt Engineering', 'AI Applications'],
    rating: 4.8,
    students: 12300,
    modules: [
      { title: 'What is AI?', lessons: 4 },
      { title: 'Machine Learning Explained', lessons: 5 },
      { title: 'Generative AI', lessons: 5 },
      { title: 'AI in Business', lessons: 6 }
    ]
  }
];

// Browse courses
router.get('/', (req, res) => {
  const { category, difficulty, search, limit = 20 } = req.query;

  let results = [...courseCatalog];

  if (category) {
    results = results.filter(c => c.category === category);
  }

  if (difficulty) {
    results = results.filter(c => c.difficulty === difficulty);
  }

  if (search) {
    const query = search.toLowerCase();
    results = results.filter(c =>
      c.title.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query) ||
      c.skills.some(s => s.toLowerCase().includes(query))
    );
  }

  results = results.slice(0, parseInt(limit));

  // Add enrolled status if userId provided
  const { userId } = req.query;
  if (userId) {
    const enrolled = enrollments.get(userId) || [];
    results = results.map(c => ({
      ...c,
      enrolled: enrolled.includes(c.id)
    }));
  }

  res.json({
    success: true,
    data: {
      courses: results,
      count: results.length,
      categories: [...new Set(courseCatalog.map(c => c.category))]
    }
  });
});

// Get course details
router.get('/:courseId', (req, res) => {
  const { courseId } = req.params;

  const course = courseCatalog.find(c => c.id === courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      error: 'Course not found',
      available: courseCatalog.map(c => c.id)
    });
  }

  res.json({
    success: true,
    data: course
  });
});

// Enroll in course
router.post('/:courseId/enroll', (req, res) => {
  const { courseId } = req.params;
  const { userId, startImmediately = true } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required'
    });
  }

  const course = courseCatalog.find(c => c.id === courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      error: 'Course not found'
    });
  }

  if (!enrollments.has(userId)) {
    enrollments.set(userId, []);
  }

  const userEnrollments = enrollments.get(userId);
  if (!userEnrollments.includes(courseId)) {
    userEnrollments.push(courseId);
  }

  const enrollment = {
    id: `enrollment-${Date.now()}`,
    userId,
    courseId,
    courseName: course.title,
    enrolledAt: new Date().toISOString(),
    progress: 0,
    completedLessons: [],
    currentLesson: null,
    status: 'in-progress',
    certificate: null
  };

  if (!courses.has(userId)) {
    courses.set(userId, []);
  }
  courses.get(userId).push(enrollment);

  res.json({
    success: true,
    message: `Enrolled in ${course.title}`,
    data: {
      enrollment,
      course,
      firstLesson: getFirstLesson(courseId)
    }
  });
});

// Get user's enrolled courses
router.get('/enrolled/:userId', (req, res) => {
  const { userId } = req.params;

  const userEnrollments = enrollments.get(userId) || [];
  const enrolledCourses = userEnrollments.map(id => {
    const course = courseCatalog.find(c => c.id === id);
    const enrollment = (courses.get(userId) || []).find(e => e.courseId === id);
    return course ? { ...course, enrollment } : null;
  }).filter(Boolean);

  res.json({
    success: true,
    data: {
      courses: enrolledCourses,
      count: enrolledCourses.length
    }
  });
});

// Get categories
router.get('/categories/all', (req, res) => {
  const categories = [...new Set(courseCatalog.map(c => c.category))];

  const categoryDetails = categories.map(cat => ({
    id: cat,
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    courseCount: courseCatalog.filter(c => c.category === cat).length
  }));

  res.json({
    success: true,
    data: categoryDetails
  });
});

// Get featured courses
router.get('/featured/all', (req, res) => {
  const featured = courseCatalog
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  res.json({
    success: true,
    data: featured
  });
});

// Helper functions
function getFirstLesson(courseId) {
  return {
    lessonId: `${courseId}-lesson-1`,
    title: 'Introduction',
    duration: '15 min'
  };
}

module.exports = router;