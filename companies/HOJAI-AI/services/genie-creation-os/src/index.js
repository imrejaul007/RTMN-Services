const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const contentRoutes = require('./routes/content');
const imageRoutes = require('./routes/image');
const videoRoutes = require('./routes/video');
const documentRoutes = require('./routes/document');
const audioRoutes = require('./routes/audio');
const templatesRoutes = require('./routes/templates');

const app = express();
const PORT = process.env.PORT || 4725;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/content', contentRoutes);
app.use('/image', imageRoutes);
app.use('/video', videoRoutes);
app.use('/document', documentRoutes);
app.use('/audio', audioRoutes);
app.use('/templates', templatesRoutes);

// Health check
app.get('/health', (req, res) => { res.json({ status: 'healthy', service: 'Genie', port: PORT }); });
app.get('/', (req, res) => {
  res.json({
    service: 'Genie Creation OS',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    capabilities: [
      '/content - General content generation',
      '/image - AI image generation',
      '/video - Video creation and editing',
      '/document - Document creation (PDF, presentations)',
      '/audio - Text-to-speech, music',
      '/templates - Content templates'
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
  console.log(`🎨 Genie Creation OS running on port ${PORT}`);
});

module.exports = app;