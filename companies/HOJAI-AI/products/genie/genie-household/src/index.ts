/**
 * Household OS API — Express server
 * Spec Part 9: HouseholdOS
 * Port: 4749
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { HouseholdManager } from './services/householdManager.js';

const PORT = parseInt(process.env.PORT || '4749', 10);
const SERVICE_NAME = 'genie-household';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: SERVICE_NAME });
});

// === Members ===
const MemberSchema = z.object({
  householdId: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  relationship: z.enum(['self', 'spouse', 'child', 'parent', 'sibling', 'other']),
  birthdate: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
});

app.post('/api/household/members', async (req, res, next) => {
  try {
    const data = MemberSchema.parse(req.body);
    const member = await HouseholdManager.addMember(data.householdId, {
      userId: data.userId,
      name: data.name,
      relationship: data.relationship,
      birthdate: data.birthdate ? new Date(data.birthdate) : undefined,
      allergies: data.allergies,
      medications: data.medications,
    });
    res.json({ success: true, data: member, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/household/:householdId/members', async (req, res, next) => {
  try {
    const members = await HouseholdManager.getMembers(req.params.householdId);
    res.json({ success: true, data: members, meta: { count: members.length, timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

// === Groceries ===
const GrocerySchema = z.object({
  householdId: z.string().min(1),
  item: z.string().min(1),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  addedBy: z.string().min(1),
  category: z.enum(['produce', 'dairy', 'meat', 'pantry', 'frozen', 'other']).optional(),
});

app.post('/api/household/grocery', async (req, res, next) => {
  try {
    const data = GrocerySchema.parse(req.body);
    const item = await HouseholdManager.addGrocery(data.householdId, {
      item: data.item,
      quantity: data.quantity,
      unit: data.unit,
      addedBy: data.addedBy,
      category: data.category,
    });
    res.json({ success: true, data: item, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/household/:householdId/grocery', async (req, res, next) => {
  try {
    const includePurchased = req.query.includePurchased === 'true';
    const items = await HouseholdManager.getGroceries(req.params.householdId, includePurchased);
    res.json({ success: true, data: items, meta: { count: items.length, timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/household/grocery/:itemId/purchased', async (req, res, next) => {
  try {
    await HouseholdManager.markPurchased(req.body.householdId, req.params.itemId);
    res.json({ success: true, data: { purchased: true } });
  } catch (error) {
    next(error);
  }
});

// === Bills ===
const BillSchema = z.object({
  householdId: z.string().min(1),
  name: z.string().min(1),
  amount: z.number().min(0),
  dueDate: z.string().min(1),
  category: z.enum(['utility', 'rent', 'internet', 'insurance', 'subscription', 'other']),
  recurring: z.boolean().optional(),
  autopay: z.boolean().optional(),
});

app.post('/api/household/bills', async (req, res, next) => {
  try {
    const data = BillSchema.parse(req.body);
    const bill = await HouseholdManager.addBill(data.householdId, {
      name: data.name,
      amount: data.amount,
      dueDate: new Date(data.dueDate),
      category: data.category,
      recurring: data.recurring || false,
      autopay: data.autopay || false,
    });
    res.json({ success: true, data: bill, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/household/:householdId/bills', async (req, res, next) => {
  try {
    const includePaid = req.query.includePaid === 'true';
    const bills = await HouseholdManager.getBills(req.params.householdId, includePaid);
    res.json({ success: true, data: bills, meta: { count: bills.length, timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/household/:householdId/bills/upcoming', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const bills = await HouseholdManager.getUpcomingBills(req.params.householdId, days);
    res.json({ success: true, data: bills, meta: { days, timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

// === Medicines ===
const MedicineSchema = z.object({
  householdId: z.string().min(1),
  memberId: z.string().min(1),
  memberName: z.string().min(1),
  name: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  remaining: z.number().min(0),
  expiresAt: z.string().optional(),
  prescribedBy: z.string().optional(),
  notes: z.string().optional(),
});

app.post('/api/household/medicines', async (req, res, next) => {
  try {
    const data = MedicineSchema.parse(req.body);
    const medicine = await HouseholdManager.addMedicine(data.householdId, {
      memberId: data.memberId,
      memberName: data.memberName,
      name: data.name,
      dosage: data.dosage,
      frequency: data.frequency,
      remaining: data.remaining,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      prescribedBy: data.prescribedBy,
      notes: data.notes,
    });
    res.json({ success: true, data: medicine, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/household/:householdId/medicines', async (req, res, next) => {
  try {
    const medicines = await HouseholdManager.getMedicines(req.params.householdId);
    res.json({ success: true, data: medicines, meta: { count: medicines.length, timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/household/:householdId/medicines/expiring', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const medicines = await HouseholdManager.getExpiringMedicines(req.params.householdId, days);
    res.json({ success: true, data: medicines, meta: { days, timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/household/:householdId/medicines/low-stock', async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 5;
    const medicines = await HouseholdManager.getLowStockMedicines(req.params.householdId, threshold);
    res.json({ success: true, data: medicines, meta: { threshold, timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

// === Dashboard ===
app.get('/api/household/:householdId/dashboard', async (req, res, next) => {
  try {
    const householdId = req.params.householdId;
    const [groceries, upcomingBills, expiringMeds, lowStockMeds, members, tasks] = await Promise.all([
      HouseholdManager.getGroceries(householdId, false),
      HouseholdManager.getUpcomingBills(householdId, 30),
      HouseholdManager.getExpiringMedicines(householdId, 7),
      HouseholdManager.getLowStockMedicines(householdId, 5),
      HouseholdManager.getMembers(householdId),
      HouseholdManager.getTasks(householdId, false),
    ]);

    res.json({
      success: true,
      data: {
        members: members.length,
        groceriesNeeded: groceries.length,
        upcomingBills,
        expiringMedicines: expiringMeds,
        lowStockMedicines: lowStockMeds,
        tasks,
      },
      meta: { householdId, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[${SERVICE_NAME}] Error:`, err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL', message: err.message },
  });
});

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║      ${SERVICE_NAME.toUpperCase()} v1.0.0                ║
║      Household OS — Milk running low, bills due         ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                       ║
║  Status:      RUNNING                                       ║
║  Features:                                                 ║
║    ✓ Members management                                   ║
║    ✓ Grocery lists (multi-user)                         ║
║    ✓ Bills tracking with upcoming alerts                 ║
║    ✓ Medicine tracking with expiry alerts               ║
║    ✓ Household task management                            ║
║    ✓ Dashboard with all alerts                            ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log(`[${SERVICE_NAME}] SIGTERM received`);
  server.close(() => process.exit(0));
});

export default app;