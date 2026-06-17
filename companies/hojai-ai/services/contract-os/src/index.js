/**
 * HOJAI ContractOS
 * Port: 5285
 * Contract lifecycle management
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

const PORT = process.env.PORT || 5285;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/contracts';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'error.log' })]
});

mongoose.connect(MONGO_URI).then(() => logger.info('MongoDB Connected')).catch(e => logger.error(e));

// Contract Schema
const ContractSchema = new mongoose.Schema({
  contractId: String,
  companyId: String,
  vendorId: String,
  vendorName: String,
  title: String,
  type: { type: String, enum: ['service', 'supply', 'lease', 'license', 'nda', 'other'], default: 'service' },
  value: Number,
  currency: { type: String, default: 'INR' },
  startDate: Date,
  endDate: Date,
  renewalDate: Date,
  autoRenew: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'active', 'expiring', 'expired', 'terminated'], default: 'draft' },
  documentUrl: String,
  terms: String
}, { timestamps: true });

const Contract = mongoose.model('Contract', ContractSchema);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'contract-os', port: PORT });
});

// Create contract
app.post('/api/contracts', async (req, res) => {
  try {
    const contractId = 'CTR-' + Date.now();
    const contract = new Contract({ contractId, ...req.body });
    await contract.save();
    res.status(201).json({ success: true, data: contract });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// List contracts
app.get('/api/contracts', async (req, res) => {
  try {
    const query = {};
    if (req.query.companyId) query.companyId = req.query.companyId;
    if (req.query.status) query.status = req.query.status;
    if (req.query.vendorId) query.vendorId = req.query.vendorId;
    const contracts = await Contract.find(query).sort({ endDate: 1 });
    res.json({ success: true, data: contracts });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Get contract
app.get('/api/contracts/:id', async (req, res) => {
  try {
    const contract = await Contract.findOne({ contractId: req.params.id });
    res.json({ success: true, data: contract });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Update contract
app.patch('/api/contracts/:id', async (req, res) => {
  try {
    const contract = await Contract.findOneAndUpdate({ contractId: req.params.id }, req.body, { new: true });
    res.json({ success: true, data: contract });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Expiring contracts
app.get('/api/contracts/expiring/soon', async (req, res) => {
  try {
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const contracts = await Contract.find({
      status: 'active',
      endDate: { $lte: thirtyDays }
    }).sort({ endDate: 1 });
    res.json({ success: true, data: contracts });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const { companyId } = req.query;
    const query = companyId ? { companyId } : {};
    const active = await Contract.countDocuments({ ...query, status: 'active' });
    const expiring = await Contract.countDocuments({ ...query, status: 'expiring' });
    const expired = await Contract.countDocuments({ ...query, status: 'expired' });
    res.json({ success: true, data: { active, expiring, expired } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.listen(PORT, () => logger.info('HOJAI ContractOS running on port ' + PORT));

export default app;