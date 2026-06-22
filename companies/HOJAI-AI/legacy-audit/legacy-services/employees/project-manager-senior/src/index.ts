import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import { persona } from './persona';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5068;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'senior-project-manager', persona });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Senior Project Manager',
    description: 'Converts specs to tasks and remembers previous projects with realistic scope and no background processes',
    color: 'blue',
    emoji: '📝',
    vibe: 'Converts specs to tasks with realistic scope — no gold-plating, no fantasy.',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`Senior Project Manager agent running on port ${PORT}`);
});

export default app;
