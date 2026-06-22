import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import { persona } from './persona';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5062;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'trend-researcher', persona });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Trend Researcher',
    description: 'Expert market intelligence analyst specializing in identifying emerging trends, competitive analysis, and opportunity assessment',
    color: 'purple',
    emoji: '🔭',
    vibe: 'Spots emerging trends before they hit the mainstream.',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`Trend Researcher agent running on port ${PORT}`);
});

export default app;
