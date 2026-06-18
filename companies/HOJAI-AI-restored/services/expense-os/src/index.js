/**
 * HOJAI ExpenseOS
 * Port: 5250
 * Multi-channel expense capture with AI extraction
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

const PORT = process.env.PORT || 5250;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/expense';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'error.log' })]
});

mongoose.connect(MONGO_URI).then(() => logger.info('MongoDB Connected')).catch(e => logger.error(e));

// Expense Schema
const ExpenseSchema = new mongoose.Schema({
  expenseId: String,
  companyId: String,
  employeeId: String,
  amount: Number,
  currency: { type: String, default: 'INR' },
  category: String,
  vendor: String,
  description: String,
  receiptUrl: String,
  date: Date,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: String,
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const Expense = mongoose.model('Expense', ExpenseSchema);

// Categories
const CATEGORIES = [
  'Travel', 'Meals', 'Office Supplies', 'Software', 'Marketing',
  'Equipment', 'Utilities', 'Rent', 'Salaries', 'Training', 'Other'
];

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'expense-os', port: PORT });
});

// Create expense
app.post('/api/expenses', async (req, res) => {
  try {
    const expenseId = 'EXP-' + Date.now();
    const expense = new Expense({ expenseId, ...req.body, date: new Date() });
    await expense.save();
    res.status(201).json({ success: true, data: expense });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// List expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const query = {};
    if (req.query.companyId) query.companyId = req.query.companyId;
    if (req.query.status) query.status = req.query.status;
    if (req.query.category) query.category = req.query.category;
    const expenses = await Expense.find(query).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: expenses });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Get expense
app.get('/api/expenses/:id', async (req, res) => {
  try {
    const expense = await Expense.findOne({ expenseId: req.params.id });
    res.json({ success: true, data: expense });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Approve/Reject expense
app.patch('/api/expenses/:id/status', async (req, res) => {
  try {
    const { status, approvedBy } = req.body;
    const expense = await Expense.findOneAndUpdate({ expenseId: req.params.id }, { status, approvedBy }, { new: true });
    res.json({ success: true, data: expense });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Categories
app.get('/api/categories', (req, res) => {
  res.json({ success: true, data: CATEGORIES });
});

// Analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const { companyId } = req.query;
    const query = companyId ? { companyId } : {};
    const total = await Expense.countDocuments(query);
    const pending = await Expense.countDocuments({ ...query, status: 'pending' });
    const approved = await Expense.countDocuments({ ...query, status: 'approved' });
    const totalAmount = await Expense.aggregate([
      { $match: { ...query, status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    res.json({ success: true, data: { total, pending, approved, totalAmount: totalAmount[0]?.total || 0 } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.listen(PORT, () => logger.info('HOJAI ExpenseOS running on port ' + PORT));

export default app;