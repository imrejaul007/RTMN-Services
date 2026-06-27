/**
 * Education Services
 * Port: 4740
 * LMS, Courses, Assessments, Certificates
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
app.use(express.json());
const PORT = process.env.PORT || 4740;

const courses = new Map();
const enrollments = new Map();
const assessments = new Map();
const certificates = new Map();

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'education-services' }));

// Courses
app.get('/api/courses', (req, res) => {
  const { category, level } = req.query;
  let results = Array.from(courses.values());
  if (category) results = results.filter(c => c.category === category);
  if (level) results = results.filter(c => c.level === level);
  res.json({ success: true, count: results.length, courses: results });
});

app.get('/api/courses/:id', (req, res) => {
  const course = courses.get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json({ success: true, course });
});

app.post('/api/courses', requireInternal, (req, res) => {
  const course = { id: uuidv4(), ...req.body, students: 0, rating: 0, createdAt: new Date().toISOString() };
  courses.set(course.id, course);
  res.status(201).json({ success: true, course });
});

// Enrollments
app.post('/api/enroll', requireInternal, (req, res) => {
  const { courseId, userId } = req.body;
  const enrollment = { id: uuidv4(), courseId, userId, progress: 0, status: 'active', enrolledAt: new Date().toISOString() };
  enrollments.set(enrollment.id, enrollment);
  res.status(201).json({ success: true, enrollment });
});

app.get('/api/enrollments', (req, res) => {
  const { userId } = req.query;
  let results = Array.from(enrollments.values());
  if (userId) results = results.filter(e => e.userId === userId);
  res.json({ success: true, count: results.length, enrollments: results });
});

// Assessments
app.post('/api/assessments/submit', requireInternal, (req, res) => {
  const { enrollmentId, answers } = req.body;
  const score = Math.floor(Math.random() * 30) + 70; // Mock grading
  const assessment = { id: uuidv4(), enrollmentId, answers, score, submittedAt: new Date().toISOString() };
  assessments.set(assessment.id, assessment);
  res.status(201).json({ success: true, assessment, passed: score >= 70 });
});

// Certificates
app.post('/api/certificates/generate', requireInternal, (req, res) => {
  const { enrollmentId, courseName, userName } = req.body;
  const cert = { id: uuidv4(), enrollmentId, courseName, userName, issuedAt: new Date().toISOString() };
  certificates.set(cert.id, cert);
  res.status(201).json({ success: true, certificate: cert });
});

app.listen(PORT, () => console.log(`\n🎓 Education Services — PORT ${PORT}\n`));
export default app;
