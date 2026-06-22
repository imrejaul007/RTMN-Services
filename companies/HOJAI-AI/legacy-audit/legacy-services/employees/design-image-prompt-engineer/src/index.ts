import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import { persona } from './persona';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5051;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'image-prompt-engineer', persona });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Image Prompt Engineer',
    description: 'Expert photography prompt engineer specializing in crafting detailed, evocative prompts for AI image generation',
    color: 'amber',
    emoji: '📷',
    vibe: 'Translates visual concepts into precise prompts that produce stunning AI photography.',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`Image Prompt Engineer agent running on port ${PORT}`);
});

export default app;
