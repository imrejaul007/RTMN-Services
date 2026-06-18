/**
 * HOJAI AuditOS
 * Port: 5305
 * Financial audits, compliance checks
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import winston from 'winston';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

const PORT = process.env.PORT || 5305;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/audit';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'error.log' })]
});

mongoose.connect(MONGO_URI).then(() => logger.info('MongoDB Connected')).catch(e => logger.error(e));

// Audit Schema
const AuditSchema = new mongoose.Schema({
  auditId: String,
  companyId: String,
  type: { type: String, enum: ['expense', 'procurement', 'compliance', 'financial', 'custom'], default: 'financial' },
  period: { start: Date, end: Date },
  status: { type: String, enum: ['scheduled', 'in_progress', 'completed', 'flagged'], default: 'scheduled' },
  findings: [{
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    category: String,
    description: String,
    amount: Number,
    resolved: { type: Boolean, default: false }
  }],
  summary: String,
  auditor: String
}, { timestamps: true });

const Audit = mongoose.model('Audit', AuditSchema);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'audit-os', port: PORT });
});

// Create audit
app.post('/api/audits', async (req, res) => {
  try {
    const auditId = 'AUD-' + Date.now();
    const audit = new Audit({ auditId, ...req.body });
    await audit.save();
    res.status(201).json({ success: true, data: audit });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// List audits
app.get('/api/audits', async (req, res) => {
  try {
    const query = {};
    if (req.query.companyId) query.companyId = req.query.companyId;
    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;
    const audits = await Audit.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: audits });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Get audit
app.get('/api/audits/:id', async (req, res) => {
  try {
    const audit = await Audit.findOne({ auditId: req.params.id });
    res.json({ success: true, data: audit });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Update audit
app.patch('/api/audits/:id', async (req, res) => {
  try {
    const audit = await Audit.findOneAndUpdate({ auditId: req.params.id }, req.body, { new: true });
    res.json({ success: true, data: audit });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const { companyId } = req.query;
    const query = companyId ? { companyId } : {};
    const total = await Audit.countDocuments(query);
    const flagged = await Audit.countDocuments({ ...query, status: 'flagged' });
    const findings = await Audit.aggregate([
      { $match: query },
      { $unwind: '$findings' },
      { $group: { _id: '$findings.severity', count: { $sum: 1 } } }
    ]);
    res.json({ success: true, data: { total, flagged, findings } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.listen(PORT, () => logger.info('HOJAI AuditOS running on port ' + PORT));

export default app;