import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import { persona } from './persona';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5065;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'project-shepherd', persona });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Project Shepherd',
    description: 'Expert project manager specializing in cross-functional project coordination, timeline management, and stakeholder alignment',
    color: 'blue',
    emoji: '🐑',
    vibe: 'Herds cross-functional chaos into on-time, on-scope delivery.',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`Project Shepherd agent running on port ${PORT}`);
});

export default app;
