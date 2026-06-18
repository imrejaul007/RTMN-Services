const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const healthRoutes = require('./routes/health');
const sleepRoutes = require('./routes/sleep');
const nutritionRoutes = require('./routes/nutrition');
const mentalRoutes = require('./routes/mental');
const fitnessRoutes = require('./routes/fitness');
const insightsRoutes = require('./routes/insights');

const app = express();
const PORT = process.env.PORT || 4723;

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
app.use('/health', healthRoutes);
app.use('/sleep', sleepRoutes);
app.use('/nutrition', nutritionRoutes);
app.use('/mental', mentalRoutes);
app.use('/fitness', fitnessRoutes);
app.use('/insights', insightsRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'Genie Wellness OS',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    endpoints: [
      '/health - Body metrics and vitals',
      '/sleep - Sleep tracking and analysis',
      '/nutrition - Diet and hydration',
      '/mental - Mental wellness and mindfulness',
      '/fitness - Exercise and activity tracking',
      '/insights - AI wellness insights and recommendations'
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
  console.log(`🧘 Genie Wellness OS running on port ${PORT}`);
});

module.exports = app;