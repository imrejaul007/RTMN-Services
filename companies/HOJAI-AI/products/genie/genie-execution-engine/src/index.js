import { requireAuth } from '@rtmn/shared/auth';
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');

const taskRoutes = require('./routes/tasks');
const automationRoutes = require('./routes/automation');
const workflowRoutes = require('./routes/workflows');
const calendarRoutes = require('./routes/calendar');
const reminderRoutes = require('./routes/reminders');
const executionRoutes = require('./routes/execution');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4726;

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
app.use('/tasks', taskRoutes);
app.use('/automation', automationRoutes);
app.use('/workflows', workflowRoutes);
app.use('/calendar', calendarRoutes);
app.use('/reminders', reminderRoutes);
app.use('/execution', executionRoutes);

// Health check
app.get('/health', (req, res) => { res.json({ status: 'healthy', service: 'Genie', port: PORT }); });
app.get('/', (req, res) => {
  res.json({
    service: 'Genie Execution Engine',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    capabilities: [
      '/tasks - Task management and tracking',
      '/automation - Automated workflows and routines',
      '/workflows - Complex workflow orchestration',
      '/calendar - Calendar and scheduling',
      '/reminders - Smart reminders and notifications',
      '/execution - Action execution and tracking'
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
  console.log(`⚡ Genie Execution Engine running on port ${PORT}`);
});
installGracefulShutdown(server);

module.exports = app;