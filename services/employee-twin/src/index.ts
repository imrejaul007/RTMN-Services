import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import employeesRouter from './routes/employees';
import skillsRouter from './routes/skills';
import scheduleRouter from './routes/schedule';
import trainingRouter from './routes/training';
import performanceRouter from './routes/performance';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4891;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-twin';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4891'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'employee-twin',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/employees', employeesRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/training', trainingRouter);
app.use('/api/performance', performanceRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Database connection and server start
const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`Employee Twin service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

startServer();

export default app;
