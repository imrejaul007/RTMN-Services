/**
 * Oracle ERP Cloud Connector
 * Port: 4797
 * Oracle ERP integration
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4797', 10);
app.use(express.json());

interface OracleSupplier { id: string; SUPPLIER_NUMBER: string; SUPPLIER_NAME: string; EMAIL: string; SITE: string; STATUS: string; }
interface OracleInvoice { id: string; INVOICE_NUM: string; SUPPLIER: string; INVOICE_AMOUNT: number; CURRENCY_CODE: string; INVOICE_DATE: string; STATUS: 'APPROVED' | 'PAID' | 'CANCELLED'; }
interface OraclePurchaseRequisition { id: string; REQUISITION_NUMBER: string; REQUESTER: string; ITEM_COUNT: number; APPROVAL_STATUS: string; }

const suppliers = new Map<string, OracleSupplier>();
const invoices = new Map<string, OracleInvoice>();
const requisitions = new Map<string, OraclePurchaseRequisition>();

app.use((req, _res, next) => { (req as any).requestId = uuidv4(); next(); });

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'oracle-connector', connected: !!process.env.ORACLE_CLIENT_ID }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.get('/api/suppliers', (req, res) => {
  const { search } = req.query;
  let all = Array.from(suppliers.values());
  if (search) all = all.filter(s => s.SUPPLIER_NAME.toLowerCase().includes((search as string).toLowerCase()));
  res.json({ success: true, data: { suppliers: all, total: all.length } });
});

app.post('/api/suppliers', (req, res) => {
  const { SUPPLIER_NUMBER, SUPPLIER_NAME, EMAIL, SITE } = req.body;
  if (!SUPPLIER_NUMBER) return res.status(400).json({ success: false, error: 'SUPPLIER_NUMBER required' });
  const supplier: OracleSupplier = { id: `sup_${Date.now()}`, SUPPLIER_NUMBER, SUPPLIER_NAME: SUPPLIER_NAME || '', EMAIL: EMAIL || '', SITE: SITE || '', STATUS: 'ACTIVE' };
  suppliers.set(supplier.id, supplier);
  res.status(201).json({ success: true, data: supplier });
});

app.get('/api/invoices', (req, res) => {
  const { status, supplier } = req.query;
  let all = Array.from(invoices.values());
  if (status) all = all.filter(i => i.STATUS === status);
  if (supplier) all = all.filter(i => i.SUPPLIER === supplier);
  res.json({ success: true, data: { invoices: all, total: all.length } });
});

app.post('/api/invoices', (req, res) => {
  const { INVOICE_NUM, SUPPLIER, INVOICE_AMOUNT, CURRENCY_CODE } = req.body;
  if (!INVOICE_NUM) return res.status(400).json({ success: false, error: 'INVOICE_NUM required' });
  const invoice: OracleInvoice = { id: `inv_${Date.now()}`, INVOICE_NUM, SUPPLIER: SUPPLIER || '', INVOICE_AMOUNT: INVOICE_AMOUNT || 0, CURRENCY_CODE: CURRENCY_CODE || 'USD', INVOICE_DATE: new Date().toISOString(), STATUS: 'APPROVED' };
  invoices.set(invoice.id, invoice);
  res.status(201).json({ success: true, data: invoice });
});

app.get('/api/requisitions', (_req, res) => res.json({ success: true, data: { requisitions: Array.from(requisitions.values()), total: requisitions.size } }));

const server = app.listen(PORT, () => console.log(`Oracle Connector - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
