import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import { persona } from './persona';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5054;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'ux-architect', persona });
});

app.get('/', (req, res) => {
  res.json({
    name: 'UX Architect',
    description: 'Technical architecture and UX specialist who provides developers with solid foundations, CSS systems, and clear implementation guidance',
    color: 'purple',
    emoji: '📐',
    vibe: 'Gives developers solid foundations, CSS systems, and clear implementation paths.',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`UX Architect agent running on port ${PORT}`);
});

export default app;
