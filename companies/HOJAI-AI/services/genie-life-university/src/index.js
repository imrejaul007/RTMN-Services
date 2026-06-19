const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const curriculumRoutes = require('./routes/curriculum');
const coursesRoutes = require('./routes/courses');
const lessonsRoutes = require('./routes/lessons');
const progressRoutes = require('./routes/progress');
const instructorsRoutes = require('./routes/instructors');
const certificationRoutes = require('./routes/certification');

const app = express();
const PORT = process.env.PORT || 4727;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
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

app.listen(PORT, () => {
  console.log(`🎓 Genie Life University Engine running on port ${PORT}`);
});

module.exports = app;