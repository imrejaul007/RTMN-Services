/**
 * NeXha Trade Finance - Main Entry Point
 * Port: 4340
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  creditService,
  bnplService,
  loanService,
  invoiceService,
} from './services/trade-finance.service.js';

dotenv.config();
const app = express();
const PORT = parseInt(process.env.PORT || '4340', 10);

app.use(helmet(), cors(), express.json());

app.get('/health', (_req, res) => {
  res.json({ service: 'nexha-trade-finance', status: 'healthy', timestamp: new Date().toISOString() });
});

// ============================================================================
// Credit Lines
// ============================================================================

app.post('/api/credits/apply', async (req, res) => {
  try {
    const credit = await creditService.applyForCredit(req.body);
    res.status(201).json({ success: true, data: credit });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/credits/:id', async (req, res) => {
  try {
    const credit = await creditService.getCreditLine(req.params.id);
    if (!credit) return res.status(404).json({ success: false, error: 'Credit line not found' });
    res.json({ success: true, data: credit });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/credits/business/:businessId', async (req, res) => {
  try {
    const credit = await creditService.getCreditLineByBusiness(req.params.businessId);
    if (!credit) return res.status(404).json({ success: false, error: 'Credit line not found' });
    res.json({ success: true, data: credit });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/credits/:id/approve', async (req, res) => {
  try {
    const credit = await creditService.approveCredit(req.params.id);
    if (!credit) return res.status(404).json({ success: false, error: 'Credit line not found' });
    res.json({ success: true, data: credit });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/credits/:id/use', async (req, res) => {
  try {
    const credit = await creditService.useCredit(req.params.id, req.body.amount);
    if (!credit) return res.status(400).json({ success: false, error: 'Insufficient credit or credit not found' });
    res.json({ success: true, data: credit });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// BNPL
// ============================================================================

app.post('/api/bnpl/create', async (req, res) => {
  try {
    const txn = await bnplService.createTransaction(req.body);
    res.status(201).json({ success: true, data: txn });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/bnpl/:id/pay', async (req, res) => {
  try {
    const txn = await bnplService.makePayment(
      req.params.id,
      req.body.amount,
      req.body.method,
      req.body.reference
    );
    if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });
    res.json({ success: true, data: txn });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/bnpl/:id', async (req, res) => {
  try {
    const txn = await bnplService.getTransaction(req.params.id);
    if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });
    res.json({ success: true, data: txn });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/bnpl/overdue', async (_req, res) => {
  try {
    const overdue = await bnplService.getOverdueTransactions();
    res.json({ success: true, data: overdue });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// Loans
// ============================================================================

app.post('/api/loans/apply', async (req, res) => {
  try {
    const loan = loanService.applyForLoan(req.body);
    res.status(201).json({ success: true, data: loan });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/loans/:id/approve', async (req, res) => {
  try {
    const loan = await loanService.approveLoan(req.params.id);
    if (!loan) return res.status(404).json({ success: false, error: 'Loan not found' });
    res.json({ success: true, data: loan });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/loans/:id/pay', async (req, res) => {
  try {
    const loan = await loanService.makeEMIPayment(req.params.id, req.body.amount);
    if (!loan) return res.status(400).json({ success: false, error: 'Loan not found or not disbursed' });
    res.json({ success: true, data: loan });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// Invoice Financing
// ============================================================================

app.post('/api/invoices/finance', async (req, res) => {
  try {
    const invoice = invoiceService.financeInvoice(req.body);
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/invoices/:id/disburse', async (req, res) => {
  try {
    const invoice = await invoiceService.disburseInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/invoices/:id/mark-paid', async (req, res) => {
  try {
    const invoice = await invoiceService.markInvoicePaid(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// Start
// ============================================================================

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(JSON.stringify({ type: 'error', error: err.message, requestId: (req as any).requestId }));
  res.status(500).json({ success: false, error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message, timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(\nNeXha Trade Finance - Port ${PORT}\n`);
});

export default app;
