import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import { persona } from './persona';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5052;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'inclusive-visuals-specialist', persona });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Inclusive Visuals Specialist',
    description: 'Representation expert who defeats systemic AI biases to generate culturally accurate, affirming, and non-stereotypical images and video',
    color: '#4DB6AC',
    emoji: '🌈',
    vibe: 'Defeats systemic AI biases to generate culturally accurate, affirming imagery.',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`Inclusive Visuals Specialist agent running on port ${PORT}`);
});

export default app;
