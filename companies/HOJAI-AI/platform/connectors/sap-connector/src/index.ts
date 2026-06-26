/**
 * SAP Connector
 * Port: 4796
 * SAP ERP integration for enterprise resource planning
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4796', 10);
app.use(express.json());

// Types
interface SAPMaterial {
  id: string;
  MATERIAL_ID: string;
  DESCRIPTION: string;
  UNIT: string;
  PRICE: number;
  CURRENCY: string;
  PLANT: string;
  STOCK: number;
}

interface SAPVendor {
  id: string;
  VENDOR_ID: string;
  NAME: string;
  CITY: string;
  COUNTRY: string;
  PAYMENT_TERMS: string;
}

interface SAPPurchaseOrder {
  id: string;
  PO_NUMBER: string;
  VENDOR: string;
  DATE: string;
  DELIVERY_DATE: string;
  STATUS: 'open' | 'released' | 'completed' | 'cancelled';
  ITEMS: { MATERIAL: string; QUANTITY: number; PRICE: number }[];
  TOTAL: number;
}

interface SAPInvoice {
  id: string;
  INVOICE_NUMBER: string;
  VENDOR: string;
  AMOUNT: number;
  CURRENCY: string;
  DATE: string;
  STATUS: 'open' | 'paid' | 'blocked';
}

const materials = new Map<string, SAPMaterial>();
const vendors = new Map<string, SAPVendor>();
const purchaseOrders = new Map<string, SAPPurchaseOrder>();
const invoices = new Map<string, SAPInvoice>();

app.use((req, _res, next) => { (req as any).requestId = uuidv4(); next(); });

app.get('/health', (_r, res) => res.json({
  status: 'healthy',
  service: 'sap-connector',
  connected: !!(process.env.SAP_HOST && process.env.SAP_CLIENT),
  timestamp: new Date().toISOString()
}));

app.get('/ready', (_r, res) => res.json({ ready: true }));

// Materials
app.get('/api/materials', (req, res) => {
  const { plant, search } = req.query;
  let all = Array.from(materials.values());
  if (plant) all = all.filter(m => m.PLANT === plant);
  if (search) all = all.filter(m => m.DESCRIPTION.toLowerCase().includes((search as string).toLowerCase()));
  res.json({ success: true, data: { materials: all, total: all.length } });
});

app.post('/api/materials', (req, res) => {
  const { MATERIAL_ID, DESCRIPTION, UNIT, PRICE, CURRENCY, PLANT } = req.body;
  if (!MATERIAL_ID) return res.status(400).json({ success: false, error: 'MATERIAL_ID required' });
  const material: SAPMaterial = {
    id: `mat_${Date.now()}`,
    MATERIAL_ID,
    DESCRIPTION: DESCRIPTION || '',
    UNIT: UNIT || 'EA',
    PRICE: PRICE || 0,
    CURRENCY: CURRENCY || 'USD',
    PLANT: PLANT || 'PLANT1',
    STOCK: 0
  };
  materials.set(material.id, material);
  res.status(201).json({ success: true, data: material });
});

// Vendors
app.get('/api/vendors', (req, res) => {
  const { search } = req.query;
  let all = Array.from(vendors.values());
  if (search) all = all.filter(v => v.NAME.toLowerCase().includes((search as string).toLowerCase()));
  res.json({ success: true, data: { vendors: all, total: all.length } });
});

app.post('/api/vendors', (req, res) => {
  const { VENDOR_ID, NAME, CITY, COUNTRY, PAYMENT_TERMS } = req.body;
  if (!VENDOR_ID || !NAME) return res.status(400).json({ success: false, error: 'VENDOR_ID and NAME required' });
  const vendor: SAPVendor = { id: `vend_${Date.now()}`, VENDOR_ID, NAME, CITY: CITY || '', COUNTRY: COUNTRY || '', PAYMENT_TERMS: PAYMENT_TERMS || 'NET30' };
  vendors.set(vendor.id, vendor);
  res.status(201).json({ success: true, data: vendor });
});

// Purchase Orders
app.get('/api/purchase-orders', (req, res) => {
  const { status, vendor } = req.query;
  let all = Array.from(purchaseOrders.values());
  if (status) all = all.filter(po => po.STATUS === status);
  if (vendor) all = all.filter(po => po.VENDOR === vendor);
  res.json({ success: true, data: { purchaseOrders: all, total: all.length } });
});

app.post('/api/purchase-orders', (req, res) => {
  const { PO_NUMBER, VENDOR, DATE, DELIVERY_DATE, ITEMS } = req.body;
  if (!PO_NUMBER || !VENDOR) return res.status(400).json({ success: false, error: 'PO_NUMBER and VENDOR required' });
  const total = (ITEMS || []).reduce((sum: number, item: any) => sum + (item.PRICE || 0) * (item.QUANTITY || 0), 0);
  const po: SAPPurchaseOrder = {
    id: `po_${Date.now()}`,
    PO_NUMBER,
    VENDOR,
    DATE: DATE || new Date().toISOString(),
    DELIVERY_DATE: DELIVERY_DATE || '',
    STATUS: 'open',
    ITEMS: ITEMS || [],
    TOTAL: total
  };
  purchaseOrders.set(po.id, po);
  res.status(201).json({ success: true, data: po });
});

// Invoices
app.get('/api/invoices', (req, res) => {
  const { status, vendor } = req.query;
  let all = Array.from(invoices.values());
  if (status) all = all.filter(i => i.STATUS === status);
  if (vendor) all = all.filter(i => i.VENDOR === vendor);
  res.json({ success: true, data: { invoices: all, total: all.length } });
});

app.post('/api/invoices', (req, res) => {
  const { INVOICE_NUMBER, VENDOR, AMOUNT, CURRENCY, DATE } = req.body;
  if (!INVOICE_NUMBER || !VENDOR) return res.status(400).json({ success: false, error: 'INVOICE_NUMBER and VENDOR required' });
  const invoice: SAPInvoice = {
    id: `inv_${Date.now()}`,
    INVOICE_NUMBER,
    VENDOR,
    AMOUNT: AMOUNT || 0,
    CURRENCY: CURRENCY || 'USD',
    DATE: DATE || new Date().toISOString(),
    STATUS: 'open'
  };
  invoices.set(invoice.id, invoice);
  res.status(201).json({ success: true, data: invoice });
});

// Observer events
app.get('/api/observer/events/:userId', (_req, res) => {
  const events = [];
  // Map SAP activities to observer events
  purchaseOrders.forEach((po) => {
    events.push({ source: 'sap', type: 'purchase_order', employeeId: _req.params.userId, timestamp: po.DATE, data: { po: po.PO_NUMBER, vendor: po.VENDOR } });
  });
  res.json({ success: true, data: { events, total: events.length } });
});

const server = app.listen(PORT, () => console.log(`SAP Connector - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
