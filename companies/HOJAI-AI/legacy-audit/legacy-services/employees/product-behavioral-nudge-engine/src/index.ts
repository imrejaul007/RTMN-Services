import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import { persona } from './persona';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5058;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'behavioral-nudge-engine', persona });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Behavioral Nudge Engine',
    description: 'Behavioral psychology specialist that adapts software interaction cadences and styles to maximize user motivation and success',
    color: '#FF8A65',
    emoji: '🧠',
    vibe: 'Adapts software interactions to maximize user motivation through behavioral psychology.',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`Behavioral Nudge Engine agent running on port ${PORT}`);
});

export default app;
