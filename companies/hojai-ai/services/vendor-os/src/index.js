/**
 * HOJAI VendorOS
 * Port: 5265
 * Vendor profiles, scoring, risk assessment
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

const PORT = process.env.PORT || 5265;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vendor';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'error.log' })]
});

mongoose.connect(MONGO_URI).then(() => logger.info('MongoDB Connected')).catch(e => logger.error(e));

// Vendor Schema
const VendorSchema = new mongoose.Schema({
  vendorId: String,
  companyId: String,
  name: String,
  email: String,
  phone: String,
  category: String,
  gstin: String,
  pan: String,
  address: String,
  bankDetails: mongoose.Schema.Types.Mixed,
  trustScore: { type: Number, default: 50 },
  riskScore: { type: Number, default: 50 },
  paymentTerms: { type: String, default: 'NET30' },
  creditLimit: Number,
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Vendor = mongoose.model('Vendor', VendorSchema);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'vendor-os', port: PORT });
});

// Create vendor
app.post('/api/vendors', async (req, res) => {
  try {
    const vendorId = 'VD-' + Date.now();
    const vendor = new Vendor({ vendorId, ...req.body });
    await vendor.save();
    res.status(201).json({ success: true, data: vendor });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// List vendors
app.get('/api/vendors', async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.query.companyId) query.companyId = req.query.companyId;
    if (req.query.category) query.category = req.query.category;
    const vendors = await Vendor.find(query).sort({ trustScore: -1 });
    res.json({ success: true, data: vendors });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Get vendor
app.get('/api/vendors/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ vendorId: req.params.id });
    res.json({ success: true, data: vendor });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Update scores
app.patch('/api/vendors/:id/score', async (req, res) => {
  try {
    const vendor = await Vendor.findOneAndUpdate({ vendorId: req.params.id }, req.body, { new: true });
    res.json({ success: true, data: vendor });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.query.companyId) query.companyId = req.query.companyId;
    const total = await Vendor.countDocuments(query);
    const highRisk = await Vendor.countDocuments({ ...query, riskScore: { $gt: 70 } });
    const avgScore = await Vendor.aggregate([
      { $match: query },
      { $group: { _id: null, avg: { $avg: '$trustScore' } } }
    ]);
    res.json({ success: true, data: { total, highRisk, avgTrustScore: avgScore[0]?.avg || 0 } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.listen(PORT, () => logger.info('HOJAI VendorOS running on port ' + PORT));

export default app;