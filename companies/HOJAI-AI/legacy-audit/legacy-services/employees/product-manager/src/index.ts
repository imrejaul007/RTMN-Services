import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import { persona } from './persona';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5060;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'product-manager', persona });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Product Manager',
    description: 'Holistic product leader who owns the full product lifecycle from discovery to strategy to roadmap to go-to-market',
    color: 'blue',
    emoji: '🧭',
    vibe: 'Ships the right thing, not just the next thing — outcome-obsessed, user-grounded, and diplomatically ruthless about focus.',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`Product Manager agent running on port ${PORT}`);
});

export default app;
