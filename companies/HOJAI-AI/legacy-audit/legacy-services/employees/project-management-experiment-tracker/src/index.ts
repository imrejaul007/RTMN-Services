import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import { persona } from './persona';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5063;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'experiment-tracker', persona });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Experiment Tracker',
    description: 'Expert project manager specializing in experiment design, execution tracking, and data-driven decision making',
    color: 'purple',
    emoji: '🧪',
    vibe: 'Designs experiments, tracks results, and lets the data decide.',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`Experiment Tracker agent running on port ${PORT}`);
});

export default app;
