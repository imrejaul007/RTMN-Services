import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import { persona } from './persona';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5059;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'feedback-synthesizer', persona });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Feedback Synthesizer',
    description: 'Expert in collecting, analyzing, and synthesizing user feedback from multiple channels to extract actionable product insights',
    color: 'blue',
    emoji: '🔍',
    vibe: 'Distills a thousand user voices into the five things you need to build next.',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`Feedback Synthesizer agent running on port ${PORT}`);
});

export default app;
