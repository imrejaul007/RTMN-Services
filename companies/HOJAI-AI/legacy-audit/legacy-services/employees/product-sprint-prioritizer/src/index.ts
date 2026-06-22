import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import { persona } from './persona';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5061;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'sprint-prioritizer', persona });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Sprint Prioritizer',
    description: 'Expert product manager specializing in agile sprint planning, feature prioritization, and resource allocation',
    color: 'green',
    emoji: '🎯',
    vibe: 'Maximizes sprint value through data-driven prioritization and ruthless focus.',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`Sprint Prioritizer agent running on port ${PORT}`);
});

export default app;
