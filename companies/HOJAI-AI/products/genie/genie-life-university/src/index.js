import { requireAuth } from '@rtmn/shared/auth';
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');

const curriculumRoutes = require('./routes/curriculum');
const coursesRoutes = require('./routes/courses');
const lessonsRoutes = require('./routes/lessons');
const progressRoutes = require('./routes/progress');
const instructorsRoutes = require('./routes/instructors');
const certificationRoutes = require('./routes/certification');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4727;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());


app.use(requireAuth);// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/curriculum', curriculumRoutes);
app.use('/courses', coursesRoutes);
app.use('/lessons', lessonsRoutes);
app.use('/progress', progressRoutes);
app.use('/instructors', instructorsRoutes);
app.use('/certification', certificationRoutes);

// Health check
app.get('/health', (req, res) => { res.json({ status: 'healthy', service: 'Genie', port: PORT }); });
app.get('/', (req, res) => {
  res.json({
    service: 'Genie Life University Engine',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    capabilities: [
      '/curriculum - Personalized learning paths',
      '/courses - Course catalog and enrollment',
      '/lessons - Lesson content and quizzes',
      '/progress - Learning progress tracking',
      '/instructors - Expert instructors',
      '/certification - Certificates and achievements'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`🎓 Genie Life University Engine running on port ${PORT}`);
});
installGracefulShutdown(server);

module.exports = app;