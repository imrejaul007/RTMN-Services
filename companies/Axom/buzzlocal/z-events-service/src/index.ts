/**
 * Z-Events Service - Main Entry
 * Event discovery, ticketing, and management
 */

import express from 'express';
import cors from 'cors';
import eventRoutes from './routes/eventRoutes';
import ticketRoutes from './routes/ticketRoutes';
import reviewRoutes from './routes/reviewRoutes';

const app = express();
const PORT = process.env.PORT || 4008;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'z-events-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/organizers', require('./routes/organizerRoutes'));

// Start server
app.listen(PORT, () => {
  console.log(`
🎫 Z-Events Service Started
━━━━━━━━━━━━━━━━━━━━━━━━━━
Port: ${PORT}
Health: http://localhost:${PORT}/health
Events: http://localhost:${PORT}/api/events
━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

export default app;
