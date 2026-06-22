import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import { persona } from './persona';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5064;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'jira-workflow-steward', persona });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Jira Workflow Steward',
    description: 'Expert delivery operations specialist who enforces Jira-linked Git workflows, traceable commits, and release-safe branch strategy',
    color: 'orange',
    emoji: '📋',
    vibe: 'Enforces traceable commits, structured PRs, and release-safe branch strategy.',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`Jira Workflow Steward agent running on port ${PORT}`);
});

export default app;
