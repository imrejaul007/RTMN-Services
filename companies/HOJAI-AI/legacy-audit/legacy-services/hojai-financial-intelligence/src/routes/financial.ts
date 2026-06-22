/**
 * HOJAI Financial Intelligence - Financial Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { financialService } from '../services/financialService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const router = Router();
router.use(tenantMiddleware());

const TransactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  category: z.enum(['revenue', 'cogs', 'marketing', 'salaries', 'rent', 'utilities', 'software', 'travel', 'other']),
  amount: z.number().positive(),
  description: z.string().optional(),
  reference: z.string().optional(),
  transactionDate: z.string().transform(s => new Date(s))
});

const InvoiceSchema = z.object({
  customerId: z.string().optional(),
  invoiceNumber: z.string(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).default('draft'),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    total: z.number().positive()
  })),
  subtotal: z.number(),
  tax: z.number().default(0),
  total: z.number(),
  dueDate: z.string().transform(s => new Date(s))
});

const BudgetSchema = z.object({
  name: z.string(),
  category: z.enum(['revenue', 'cogs', 'marketing', 'salaries', 'rent', 'utilities', 'software', 'travel', 'other']),
  allocated: z.number().positive(),
  period: z.enum(['monthly', 'quarterly', 'yearly']),
  startDate: z.string().transform(s => new Date(s)),
  endDate: z.string().transform(s => new Date(s))
});

/**
 * GET /api/financial/dashboard
 */
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const dashboard = await financialService.getDashboard(tenantId);
    res.json(createResponse({ dashboard }, { tenantId }));
  } catch (error) { next(error); }
});

/**
 * POST /api/transactions
 */
router.post('/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const validation = TransactionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues }));
    }
    const transaction = await financialService.createTransaction(tenantId, validation.data);
    res.json(createResponse({ transaction }, { tenantId }));
  } catch (error) { next(error); }
});

/**
 * GET /api/transactions
 */
router.get('/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { type, category, startDate, endDate } = req.query;
    const transactions = await financialService.getTransactions(tenantId, {
      type: type as string,
      category: category as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });
    res.json(createResponse({ transactions }, { tenantId }));
  } catch (error) { next(error); }
});

/**
 * POST /api/invoices
 */
router.post('/invoices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const validation = InvoiceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues }));
    }
    const invoice = await financialService.createInvoice(tenantId, validation.data);
    res.json(createResponse({ invoice }, { tenantId }));
  } catch (error) { next(error); }
});

/**
 * GET /api/invoices
 */
router.get('/invoices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { status } = req.query;
    const invoices = await financialService.getInvoices(tenantId, { status: status as string });
    res.json(createResponse({ invoices }, { tenantId }));
  } catch (error) { next(error); }
});

/**
 * PATCH /api/invoices/:invoiceId/status
 */
router.patch('/invoices/:invoiceId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { invoiceId } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Status required'));
    const invoice = await financialService.updateInvoiceStatus(tenantId, invoiceId, status);
    if (!invoice) return res.status(404).json(createErrorResponse('NOT_FOUND', 'Invoice not found'));
    res.json(createResponse({ invoice }, { tenantId }));
  } catch (error) { next(error); }
});

/**
 * POST /api/budgets
 */
router.post('/budgets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const validation = BudgetSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues }));
    }
    const budget = await financialService.createBudget(tenantId, { ...validation.data, spent: 0, remaining: validation.data.allocated });
    res.json(createResponse({ budget }, { tenantId }));
  } catch (error) { next(error); }
});

/**
 * GET /api/budgets
 */
router.get('/budgets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const budgets = await financialService.getBudgets(tenantId);
    res.json(createResponse({ budgets }, { tenantId }));
  } catch (error) { next(error); }
});

/**
 * GET /api/metrics
 */
router.get('/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const period = (req.query.period as string) || 'month';
    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === 'week') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (period === 'day') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === 'quarter') startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const metrics = await financialService.getMetrics(tenantId, period, startDate, now);
    res.json(createResponse({ metrics }, { tenantId }));
  } catch (error) { next(error); }
});

export default router;
