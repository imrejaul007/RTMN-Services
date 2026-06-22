import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { slaService } from './services';

const app = express();
const PORT = process.env.PORT || 4920;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hojai-sla-monitor', version: '1.0.0' });
});

// SLAs
app.post('/api/slas', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const sla = await slaService.createSLA({ tenantId, ...req.body });
    res.status(201).json({ success: true, data: sla });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/slas', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const slas = await slaService.getSLAs(tenantId);
    res.json({ success: true, data: slas });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Violations
app.post('/api/check', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const result = await slaService.checkCompliance({ tenantId, ...req.body });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/violations', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const violations = await slaService.getViolations(tenantId, req.query as any);
    res.json({ success: true, data: violations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/violations/:id/acknowledge', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const agentId = req.headers['x-agent-id'] as string;
    const violation = await slaService.acknowledgeViolation(req.params.id, tenantId, agentId);
    res.json({ success: true, data: violation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stats
app.get('/api/stats', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const stats = await slaService.getStats(tenantId, req.query.slaId as string);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function start() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai_sla';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    app.listen(PORT, () => {
      console.log(`\n╔═══════════════════════════╗\n║   HOJAI SLA MONITOR (${PORT})\n╚═══════════════════════════╝\n`);
    });
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

start();
export default app;
