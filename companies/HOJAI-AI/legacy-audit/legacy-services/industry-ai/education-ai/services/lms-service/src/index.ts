/**
 * HOJAI Education LMS Service
 * Courses, enrollments, assessments
 * Reuses: hojai-rag pattern
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  modules: Module[];
  instructor: string;
  price: number;
  enrollmentCount: number;
  rating: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  quiz?: Quiz;
}

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  duration?: number;
  content?: string;
  videoUrl?: string;
  resources?: string[];
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  passingScore: number;
  timeLimit?: number;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  points: number;
}

interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  enrolledAt: string;
  progress: number;
  completedLessons: string[];
  lastAccessed?: string;
  certificateIssued: boolean;
  status: 'active' | 'completed' | 'dropped';
}

interface Assessment {
  id: string;
  enrollmentId: string;
  quizId: string;
  score: number;
  totalScore: number;
  passed: boolean;
  completedAt: string;
  answers: { questionId: string; selectedAnswer: number; correct: boolean }[];
}

const courses = new Map<string, Course>();
const enrollments = new Map<string, Enrollment>();
const assessments = new Map<string, Assessment>();

// Course CRUD
router.post('/courses', async (req, res) => {
  try {
    const course: Course = {
      ...req.body,
      id: uuidv4(),
      enrollmentCount: 0,
      rating: 0,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    courses.set(course.id, course);
    res.status(201).json({ success: true, course });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create course' });
  }
});

router.get('/courses', async (req, res) => {
  try {
    const { category, level, status } = req.query;
    let result = Array.from(courses.values()).filter(c => c.status === 'published');

    if (category) result = result.filter(c => c.category === category);
    if (level) result = result.filter(c => c.level === level);
    if (status) result = result.filter(c => c.status === status);

    res.json({ courses: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

router.get('/courses/:id', async (req, res) => {
  try {
    const course = courses.get(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json({ course });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Enrollment
router.post('/enrollments', async (req, res) => {
  try {
    const { studentId, studentName, courseId } = req.body;

    const course = courses.get(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const enrollment: Enrollment = {
      id: uuidv4(),
      studentId,
      studentName,
      courseId,
      courseTitle: course.title,
      enrolledAt: new Date().toISOString(),
      progress: 0,
      completedLessons: [],
      certificateIssued: false,
      status: 'active',
    };

    enrollments.set(enrollment.id, enrollment);
    course.enrollmentCount++;
    courses.set(course.id, course);

    res.status(201).json({ success: true, enrollment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

router.get('/enrollments', async (req, res) => {
  try {
    const { studentId, courseId } = req.query;
    let result = Array.from(enrollments.values());

    if (studentId) result = result.filter(e => e.studentId === studentId);
    if (courseId) result = result.filter(e => e.courseId === courseId);

    res.json({ enrollments: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Track lesson progress
router.post('/enrollments/:id/progress', async (req, res) => {
  try {
    const { lessonId } = req.body;
    const enrollment = enrollments.get(req.params.id);
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    if (!enrollment.completedLessons.includes(lessonId)) {
      enrollment.completedLessons.push(lessonId);
    }

    const course = courses.get(enrollment.courseId);
    if (course) {
      const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
      enrollment.progress = Math.round((enrollment.completedLessons.length / totalLessons) * 100);
    }

    enrollment.lastAccessed = new Date().toISOString();

    if (enrollment.progress >= 100) {
      enrollment.status = 'completed';
      enrollment.certificateIssued = true;
    }

    enrollments.set(enrollment.id, enrollment);

    res.json({ success: true, enrollment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Assessments
router.post('/assessments', async (req, res) => {
  try {
    const { enrollmentId, quizId, answers } = req.body;

    const enrollment = enrollments.get(enrollmentId);
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    const course = courses.get(enrollment.courseId);
    const quiz = course?.modules.flatMap(m => m.quiz ? [m.quiz] : []).find(q => q.id === quizId);

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    let score = 0;
    let totalScore = 0;
    const gradedAnswers: Assessment['answers'] = [];

    quiz.questions.forEach((q, i) => {
      totalScore += q.points;
      const selectedAnswer = answers[i];
      const correct = selectedAnswer === q.correctAnswer;
      if (correct) score += q.points;

      gradedAnswers.push({ questionId: q.id, selectedAnswer, correct });
    });

    const assessment: Assessment = {
      id: uuidv4(),
      enrollmentId,
      quizId,
      score,
      totalScore,
      passed: (score / totalScore) >= (quiz.passingScore / 100),
      completedAt: new Date().toISOString(),
      answers: gradedAnswers,
    };

    assessments.set(assessment.id, assessment);

    res.status(201).json({ success: true, assessment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

router.get('/assessments', async (req, res) => {
  try {
    const { enrollmentId } = req.query;
    let result = Array.from(assessments.values());

    if (enrollmentId) result = result.filter(a => a.enrollmentId === enrollmentId);

    res.json({ assessments: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// Student dashboard
router.get('/student/:studentId/dashboard', async (req, res) => {
  try {
    const studentEnrollments = Array.from(enrollments.values()).filter(e => e.studentId === req.params.studentId);
    const completed = studentEnrollments.filter(e => e.status === 'completed').length;
    const inProgress = studentEnrollments.filter(e => e.status === 'active').length;

    res.json({
      totalCourses: studentEnrollments.length,
      completed,
      inProgress,
      enrollments: studentEnrollments,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

export { router, courses, enrollments, assessments };
