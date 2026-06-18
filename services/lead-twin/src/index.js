import express from 'express';
import cors from 'cors';
import leadsRouter from './routes/leads.js';
import activitiesRouter from './routes/activities.js';

const app = express();
const PORT = process.env.PORT || 4894;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'lead-twin', port: PORT });
});

// Routes
app.use('/leads', leadsRouter);
app.use('/activities', activitiesRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Lead Twin Service running on port ${PORT}`);
});

export default app;
