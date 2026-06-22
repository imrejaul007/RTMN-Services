import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import { persona } from './persona';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5055;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'ux-researcher', persona });
});

app.get('/', (req, res) => {
  res.json({
    name: 'UX Researcher',
    description: 'Expert user experience researcher specializing in user behavior analysis, usability testing, and data-driven design insights',
    color: 'green',
    emoji: '🔬',
    vibe: 'Validates design decisions with real user data, not assumptions.',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`UX Researcher agent running on port ${PORT}`);
});

export default app;
