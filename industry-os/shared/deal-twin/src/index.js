import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rtmn-twin-secret';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected');
    } catch (err) {
      console.log('MongoDB connection failed, using in-memory store');
    }
  }
};

// In-memory store fallback
const store = new Map();

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'twin', timestamp: new Date().toISOString() });
});

app.get('/api/twin/:id', (req, res) => {
  const twin = store.get(req.params.id) || { id: req.params.id, status: 'active' };
  res.json(twin);
});

app.post('/api/twin', (req, res) => {
  const { id, ...data } = req.body;
  store.set(id, { id, ...data, updatedAt: new Date().toISOString() });
  res.json({ success: true, twin: store.get(id) });
});

app.listen(PORT, () => {
  console.log(`Twin service running on port ${PORT}`);
  connectDB();
});

export default app;
