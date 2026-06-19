const express = require('express');
const router = express.Router();

// Instructors database
const instructors = [
  {
    id: 'sarah-chen',
    name: 'Dr. Sarah Chen',
    title: 'Leadership Expert',
    bio: 'Former VP at Google with 20+ years of experience in leadership development and organizational psychology.',
    expertise: ['Leadership', 'Team Building', 'Organizational Psychology'],
    courses: ['leadership-fundamentals', 'team-management'],
    rating: 4.9,
    students: 25000,
    credentials: ['PhD Stanford', 'Former VP Google', 'Bestselling Author'],
    image: 'https://instructors.genie/sarah-chen.jpg'
  },
  {
    id: 'michael-torres',
    name: 'Michael Torres',
    title: 'Career Development Coach',
    bio: 'Executive coach who has helped 500+ executives accelerate their careers. Featured in Forbes and HBR.',
    expertise: ['Career Strategy', 'Personal Branding', 'Executive Coaching'],
    courses: ['professional-skills', 'career-strategy'],
    rating: 4.8,
    students: 18000,
    credentials: ['MBA Harvard', 'ICF Certified Coach', 'Forbes Contributor'],
    image: 'https://instructors.genie/michael-torres.jpg'
  },
  {
    id: 'aisha-patel',
    name: 'Dr. Aisha Patel',
    title: 'Data Science Pioneer',
    bio: 'Leading AI researcher and former lead at DeepMind. Passionate about democratizing data science education.',
    expertise: ['Data Science', 'Machine Learning', 'AI'],
    courses: ['data-science', 'ai-fundamentals'],
    rating: 4.9,
    students: 35000,
    credentials: ['PhD MIT', 'Ex-DeepMind', '50+ Publications'],
    image: 'https://instructors.genie/aisha-patel.jpg'
  },
  {
    id: 'james-morrison',
    name: 'James Morrison',
    title: 'Strategy Consultant',
    bio: 'Former McKinsey partner with expertise in business strategy and corporate transformation.',
    expertise: ['Business Strategy', 'Consulting', 'Corporate Transformation'],
    courses: ['business-strategy', 'business-model'],
    rating: 4.7,
    students: 12000,
    credentials: ['MBA Wharton', 'Ex-McKinsey Partner', 'Board Advisor'],
    image: 'https://instructors.genie/james-morrison.jpg'
  },
  {
    id: 'wei-zhang',
    name: 'Dr. Wei Zhang',
    title: 'AI Innovation Leader',
    bio: 'Tech executive and AI researcher. Head of AI at a Fortune 100 company. Making AI accessible to everyone.',
    expertise: ['AI/ML', 'Innovation', 'Product Strategy'],
    courses: ['ai-fundamentals', 'python-mastery'],
    rating: 4.8,
    students: 28000,
    credentials: ['PhD Stanford', 'Head of AI at TechCorp', 'AI Pioneer Award'],
    image: 'https://instructors.genie/wei-zhang.jpg'
  }
];

// Get all instructors
router.get('/', (req, res) => {
  const { category, search } = req.query;

  let results = [...instructors];

  if (category) {
    results = results.filter(i => i.expertise.some(e => e.toLowerCase().includes(category.toLowerCase())));
  }

  if (search) {
    const query = search.toLowerCase();
    results = results.filter(i =>
      i.name.toLowerCase().includes(query) ||
      i.expertise.some(e => e.toLowerCase().includes(query)) ||
      i.title.toLowerCase().includes(query)
    );
  }

  res.json({
    success: true,
    data: {
      instructors: results,
      count: results.length
    }
  });
});

// Get instructor details
router.get('/:instructorId', (req, res) => {
  const { instructorId } = req.params;

  const instructor = instructors.find(i => i.id === instructorId);

  if (!instructor) {
    return res.status(404).json({
      success: false,
      error: 'Instructor not found',
      available: instructors.map(i => i.id)
    });
  }

  res.json({
    success: true,
    data: instructor
  });
});

// Get instructor courses
router.get('/:instructorId/courses', (req, res) => {
  const { instructorId } = req.params;

  const instructor = instructors.find(i => i.id === instructorId);

  if (!instructor) {
    return res.status(404).json({
      success: false,
      error: 'Instructor not found'
    });
  }

  // Return courses by this instructor (mock data)
  const courses = instructor.courses.map(courseId => ({
    id: courseId,
    title: `Course on ${courseId}`,
    students: Math.floor(Math.random() * 10000) + 1000,
    rating: 4.5 + Math.random() * 0.5
  }));

  res.json({
    success: true,
    data: {
      instructor: { id: instructor.id, name: instructor.name },
      courses
    }
  });
});

// Get featured instructors
router.get('/featured/all', (req, res) => {
  const featured = instructors
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  res.json({
    success: true,
    data: featured
  });
});

module.exports = router;