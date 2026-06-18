/**
 * HOJAI TreasuryOS
 * Port: 5295
 * Cash management, bank accounts, forecasting
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

const PORT = process.env.PORT || 5295;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/treasury';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'error.log' })]
});

mongoose.connect(MONGO_URI).then(() => logger.info('MongoDB Connected')).catch(e => logger.error(e));

// Bank Account Schema
const BankAccountSchema = new mongoose.Schema({
  accountId: String,
  companyId: String,
  bankName: String,
  accountNumber: String,
  accountType: { type: String, enum: ['current', 'savings'], default: 'current' },
  currency: { type: String, default: 'INR' },
  balance: { type: Number, default: 0 },
  isPrimary: { type: Boolean, default: false }
}, { timestamps: true });

// Transaction Schema
const TransactionSchema = new mongoose.Schema({
  transactionId: String,
  companyId: String,
  accountId: String,
  type: { type: String, enum: ['credit', 'debit'], required: true },
  category: String,
  amount: Number,
  description: String
}, { timestamps: true });

const BankAccount = mongoose.model('BankAccount', BankAccountSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'treasury-os', port: PORT });
});

// Bank Accounts
app.post('/api/accounts', async (req, res) => {
  try {
    const accountId = 'BANK-' + Date.now();
    const account = new BankAccount({ accountId, ...req.body });
    await account.save();
    res.status(201).json({ success: true, data: account });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/accounts', async (req, res) => {
  try {
    const query = {};
    if (req.query.companyId) query.companyId = req.query.companyId;
    const accounts = await BankAccount.find(query);
    res.json({ success: true, data: accounts });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Transactions
app.post('/api/transactions', async (req, res) => {
  try {
    const transactionId = 'TXN-' + Date.now();
    const txn = new Transaction({ transactionId, ...req.body });
    await txn.save();
    res.status(201).json({ success: true, data: txn });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const query = {};
    if (req.query.companyId) query.companyId = req.query.companyId;
    if (req.query.accountId) query.accountId = req.query.accountId;
    const transactions = await Transaction.find(query).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: transactions });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Cash Position
app.get('/api/cash-position', async (req, res) => {
  try {
    const query = {};
    if (req.query.companyId) query.companyId = req.query.companyId;
    const accounts = await BankAccount.find(query);
    const totalCash = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    res.json({ success: true, data: { totalCash, accounts } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Forecast
app.get('/api/forecast', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const avgInflow = await Transaction.aggregate([
      { $match: { type: 'credit' } },
      { $group: { _id: null, avg: { $avg: '$amount' } } }
    ]);
    const avgOutflow = await Transaction.aggregate([
      { $match: { type: 'debit' } },
      { $group: { _id: null, avg: { $avg: '$amount' } } }
    ]);
    res.json({ success: true, data: { avgDailyInflow: avgInflow[0]?.avg || 0, avgDailyOutflow: avgOutflow[0]?.avg || 0, forecastDays: days } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.listen(PORT, () => logger.info('HOJAI TreasuryOS running on port ' + PORT));

export default app;