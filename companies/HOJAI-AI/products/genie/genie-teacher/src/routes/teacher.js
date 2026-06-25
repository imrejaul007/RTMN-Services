/**
 * Teacher Routes — courses / lessons / enrollments / progress
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const VALID_CATEGORIES = ['language', 'business', 'skill', 'wellness', 'creative', 'finance'];
const VALID_LEVELS = ['beginner', 'intermediate', 'advanced'];

module.exports = function({ coursesStore, lessonsStore, enrollmentsStore, progressStore }) {
  const router = express.Router();

  // === COURSES ===
  router.get('/courses', (req, res) => {
    let list = Array.from(coursesStore.entries()).map(([k, v]) => ({ id: k, ...v }));
    if (req.query.category) list = list.filter(c => c.category === req.query.category);
    if (req.query.level) list = list.filter(c => c.level === req.query.level);
    res.json({ success: true, total: list.length, courses: list });
  });

  router.get('/courses/:courseId', (req, res) => {
    const c = coursesStore.get(req.params.courseId);
    if (!c) return res.status(404).json({ success: false, error: 'Course not found' });
    const lessons = Array.from(lessonsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(l => l.courseId === req.params.courseId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json({ success: true, data: { ...c, lessons } });
  });

  router.post('/courses', (req, res) => {
    const { title, category, level = 'beginner', duration, description, tags = [] } = req.body || {};
    if (!title || title.trim().length < 3) return res.status(400).json({ success: false, error: 'title required (min 3 chars)' });
    if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ success: false, error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    if (!VALID_LEVELS.includes(level)) return res.status(400).json({ success: false, error: `level must be one of: ${VALID_LEVELS.join(', ')}` });
    const id = `cr-${uuidv4().slice(0, 8)}`;
    const c = { id, title: title.trim(), category, level, duration, description, tags, lessonsCount: 0, createdAt: new Date().toISOString() };
    coursesStore.set(id, c);
    res.status(201).json({ success: true, data: c });
  });

  // === LESSONS ===
  router.get('/courses/:courseId/lessons', (req, res) => {
    const lessons = Array.from(lessonsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(l => l.courseId === req.params.courseId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json({ success: true, total: lessons.length, lessons });
  });

  router.get('/lessons/:lessonId', (req, res) => {
    const l = lessonsStore.get(req.params.lessonId);
    if (!l) return res.status(404).json({ success: false, error: 'Lesson not found' });
    res.json({ success: true, data: l });
  });

  router.post('/lessons/:lessonId/complete/:userId', (req, res) => {
    const l = lessonsStore.get(req.params.lessonId);
    if (!l) return res.status(404).json({ success: false, error: 'Lesson not found' });
    const score = Math.max(0, Math.min(100, parseInt(req.query.score ?? req.body?.score ?? '0', 10)));
    const id = `pr-${uuidv4().slice(0, 8)}`;
    const p = { id, userId: req.params.userId, lessonId: req.params.lessonId, courseId: l.courseId, score, completedAt: new Date().toISOString() };
    progressStore.set(id, p);
    res.status(201).json({ success: true, data: p });
  });

  // === ENROLLMENTS ===
  router.post('/courses/:courseId/enroll/:userId', (req, res) => {
    const c = coursesStore.get(req.params.courseId);
    if (!c) return res.status(404).json({ success: false, error: 'Course not found' });
    // Idempotent: if already enrolled, return existing
    const existing = Array.from(enrollmentsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .find(e => e.userId === req.params.userId && e.courseId === req.params.courseId);
    if (existing) return res.json({ success: true, data: existing, alreadyEnrolled: true });
    const id = `en-${uuidv4().slice(0, 8)}`;
    const e = { id, userId: req.params.userId, courseId: req.params.courseId, enrolledAt: new Date().toISOString() };
    enrollmentsStore.set(id, e);
    res.status(201).json({ success: true, data: e });
  });

  router.get('/courses/:courseId/enroll/:userId', (req, res) => {
    const e = Array.from(enrollmentsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .find(e => e.userId === req.params.userId && e.courseId === req.params.courseId);
    res.json({ success: true, enrolled: !!e, enrollment: e || null });
  });

  // === USER LEARNING DASHBOARD ===
  router.get('/users/:userId/learning', (req, res) => {
    const enrollments = Array.from(enrollmentsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(e => e.userId === req.params.userId);
    const progress = Array.from(progressStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(p => p.userId === req.params.userId);

    const courses = enrollments.map(e => {
      const c = coursesStore.get(e.courseId);
      const lessons = Array.from(lessonsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
        .filter(l => l.courseId === e.courseId);
      const completedLessonIds = progress.filter(p => p.courseId === e.courseId).map(p => p.lessonId);
      return {
        ...e,
        course: c,
        lessonsTotal: lessons.length,
        lessonsCompleted: completedLessonIds.length,
        averageScore: progress.filter(p => p.courseId === e.courseId).reduce((a, p) => a + (p.score || 0), 0) / Math.max(1, progress.filter(p => p.courseId === e.courseId).length),
        progressPercent: lessons.length > 0 ? Math.round((completedLessonIds.length / lessons.length) * 100) : 0,
      };
    });

    res.json({ success: true, total: courses.length, courses });
  });

  return router;
};