import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import { persona } from './persona';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5067;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'studio-producer', persona });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Studio Producer',
    description: 'Senior strategic leader specializing in high-level creative and technical project orchestration and multi-project portfolio management',
    color: 'gold',
    emoji: '🎬',
    vibe: 'Aligns creative vision with business objectives across complex initiatives.',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`Studio Producer agent running on port ${PORT}`);
});

export default app;
