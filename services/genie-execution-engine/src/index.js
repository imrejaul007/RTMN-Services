const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const taskRoutes = require('./routes/tasks');
const automationRoutes = require('./routes/automation');
const workflowRoutes = require('./routes/workflows');
const calendarRoutes = require('./routes/calendar');
const reminderRoutes = require('./routes/reminders');
const executionRoutes = require('./routes/execution');

const app = express();
const PORT = process.env.PORT || 4726;

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
app.use('/tasks', taskRoutes);
app.use('/automation', automationRoutes);
app.use('/workflows', workflowRoutes);
app.use('/calendar', calendarRoutes);
app.use('/reminders', reminderRoutes);
app.use('/execution', executionRoutes);

// Health check
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

app.listen(PORT, () => {
  console.log(`⚡ Genie Execution Engine running on port ${PORT}`);
});

module.exports = app;