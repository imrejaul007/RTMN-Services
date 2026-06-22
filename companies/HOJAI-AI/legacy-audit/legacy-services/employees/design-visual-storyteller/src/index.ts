import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import { persona } from './persona';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5056;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'visual-storyteller', persona });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Visual Storyteller',
    description: 'Expert visual communication specialist focused on creating compelling visual narratives, multimedia content, and brand storytelling',
    color: 'purple',
    emoji: '🎬',
    vibe: 'Transforms complex information into visual narratives that move people.',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`Visual Storyteller agent running on port ${PORT}`);
});

export default app;
