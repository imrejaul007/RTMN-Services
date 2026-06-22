import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 4910;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hojai-skills-routing', version: '1.0.0' });
});

app.use('/api', routes);

async function start() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai_skills_routing';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    app.listen(PORT, () => {
      console.log(`\n╔══════════════════════════════════════╗
║    HOJAI SKILLS ROUTING (${PORT})
╚══════════════════════════════════════╝\n`);
    });
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

start();
export default app;
