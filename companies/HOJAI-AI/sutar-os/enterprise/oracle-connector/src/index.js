/**
 * SUTAR OS — Oracle Cloud ERP Connector
 *
 * Bidirectional sync between Oracle Cloud ERP and SUTAR agent network.
 * Keeps suppliers, purchase orders, invoices, and budgets in sync
 * with the ACN agent registry and procurement/finance agents.
 *
 * Endpoints:
 *   POST /api/sync/suppliers       — Sync Oracle suppliers → SUTAR suppliers
 *   POST /api/sync/purchase-orders — Sync Oracle POs → procurement missions
 *   POST /api/sync/invoices        — Sync invoices → payment agents
 *   POST /api/sync/budgets         — Sync budgets → financial agents
 *   GET  /api/status               — Connector health + Oracle session
 *   GET  /health
 */

const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const { setupSecurity } = require('@rtmn/shared/security');

const app = express();
app.use(express.json());

setupSecurity(app, { serviceName: 'oracle-connector' });

const PORT = process.env.ORACLE_PORT || 4603;

// ---------- Configuration ----------
const ORACLE_CONFIG = {
  host:         process.env.ORACLE_HOST       || 'oracle.example.com',
  restBasePath: process.env.ORACLE_REST_PATH  || '/fscmRestApi',
  soapBasePath: process.env.ORACLE_SOAP_PATH  || '/fscmService',
  username:     process.env.ORACLE_USERNAME   || 'DEMO_USER',
  password:     process.env.ORACLE_PASSWORD   || 'DEMO_PASS',
  erpCloudId:   process.env.ORACLE_ERP_ID     || 'DEMO_ERP',
};

const SUTAR_ENDPOINTS = {
  acnNetwork:   process.env.ACN_NETWORK_URL  || 'http://localhost:4801',
  procurement:  process.env.PROCUREMENT_URL  || 'http://localhost:5096',
  negotiation:  process.env.NEGOTIATION_URL  || 'http://localhost:4293',
  contract:     process.env.CONTRACT_URL      || 'http://localhost:4292',
};

// Session cache
let sessionId = null;
let sessionExpiry = 0;

// ---------- Oracle Session Management ----------
async function getOracleSession() {
  if (sessionId && Date.now() < sessionExpiry - 60000) {
    return sessionId;
  }
  sessionId = 'oracle_session_' + Date.now();
  sessionExpiry = Date.now() + 60 * 60 * 1000;
  return sessionId;
}

// ---------- Field Mappings ----------
const SUPPLIER_TO_SUPPLIER = {
  PartyId:       'supplierId',
  PartyName:     'businessName',
  EmailAddress:  'email',
  Phone:         'phone',
  Address1:      'address',
  City:          'city',
  Country:       'country',
  SupplierType:  'supplierType',
  Status:        'status',
};

const ORACLE_PO_TO_PROCUREMENT = {
  PoHeaderId:    'poId',
  DisplayName:   'poName',
  CreationDate:  'createdDate',
  ApprovalStatus: 'approvalStatus',
  Amount:        'totalAmount',
  CurrencyCode:  'currency',
  SupplierId:    'supplierId',
  SupplierName:  'supplierName',
};

const INVOICE_TO_PAYMENT = {
  InvoiceId:     'invoiceId',
  SupplierId:    'supplierId',
  InvoiceNum:    'invoiceNumber',
  InvoiceAmount: 'amount',
  InvoiceDate:   'invoiceDate',
  DueDate:       'dueDate',
  Status:        'status',
  CurrencyCode:  'currency',
};

const BUDGET_TO_FINANCE = {
  BudgetCode:    'budgetCode',
  BudgetName:    'budgetName',
  BudgetType:    'budgetType',
  LedgerId:      'ledgerId',
  PeriodName:    'periodName',
  BudgetAmount:  'budgetAmount',
  EncumbranceAmount: 'encumbranceAmount',
  AvailableAmount: 'availableAmount',
  StartDate:     'startDate',
  EndDate:       'endDate',
  Status:        'status',
};

// ---------- Sync: Suppliers ----------
async function syncSuppliers(suppliers) {
  const results = { synced: 0, skipped: 0, errors: [] };
  const session = await getOracleSession();

  for (const ocSupplier of suppliers) {
    try {
      const supplier = {};
      for (const [ocField, sutField] of Object.entries(SUPPLIER_TO_SUPPLIER)) {
        if (ocSupplier[ocField] !== undefined) {
          supplier[sutField] = ocSupplier[ocField];
        }
      }
      supplier.oraclePartyId = ocSupplier.PartyId;
      supplier.source = 'oracle';
      supplier.capabilities = inferSupplierCapabilities(ocSupplier);

      const response = await fetch(`${SUTAR_ENDPOINTS.acnNetwork}/api/agents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(supplier),
      });

      if (response.ok) {
        results.synced++;
      } else {
        results.errors.push({ oracleId: ocSupplier.PartyId, status: response.status });
      }
    } catch (err) {
      results.errors.push({ oracleId: ocSupplier.PartyId, error: err.message });
    }
  }
  return results;
}

function inferSupplierCapabilities(ocSupplier) {
  const caps = ['product_search', 'rfq_response', 'order_fulfillment', 'invoice_submission'];
  const stype = ocSupplier.SupplierType || '';
  if (stype === 'GOODS') caps.push('goods_supply', 'logistics');
  if (stype === 'SERVICES') caps.push('service_delivery', 'consulting');
  return caps;
}

// ---------- Sync: Purchase Orders ----------
async function syncPurchaseOrders(purchaseOrders) {
  const results = { synced: 0, skipped: 0, errors: [] };
  const session = await getOracleSession();

  for (const ocPO of purchaseOrders) {
    try {
      if (ocPO.ApprovalStatus === 'CANCELLED') {
        results.skipped++;
        continue;
      }

      const procurement = {};
      for (const [ocField, sutField] of Object.entries(ORACLE_PO_TO_PROCUREMENT)) {
        if (ocPO[ocField] !== undefined) {
          procurement[sutField] = ocPO[ocField];
        }
      }
      procurement.oraclePOId = ocPO.PoHeaderId;
      procurement.source = 'oracle';
      procurement.urgency = calculatePOUrgency(ocPO);

      const response = await fetch(`${SUTAR_ENDPOINTS.procurement}/api/missions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(procurement),
      });

      if (response.ok) {
        results.synced++;
      } else {
        results.errors.push({ oracleId: ocPO.PoHeaderId, status: response.status });
      }
    } catch (err) {
      results.errors.push({ oracleId: ocPO.PoHeaderId, error: err.message });
    }
  }
  return results;
}

function calculatePOUrgency(ocPO) {
  if (!ocPO.CreationDate) return 'medium';
  const age = Math.ceil((Date.now() - new Date(ocPO.CreationDate).getTime()) / (1000 * 60 * 60 * 24));
  if (age > 45) return 'critical';
  if (age > 20) return 'high';
  if (age > 7) return 'medium';
  return 'low';
}

// ---------- Sync: Invoices → Payment Agents ----------
async function syncInvoices(invoices) {
  const results = { synced: 0, skipped: 0, errors: [] };
  const session = await getOracleSession();

  for (const ocInvoice of invoices) {
    try {
      if (ocInvoice.Status === 'CANCELLED' || ocInvoice.Status === 'PAID') {
        results.skipped++;
        continue;
      }

      const payment = {};
      for (const [ocField, sutField] of Object.entries(INVOICE_TO_PAYMENT)) {
        if (ocInvoice[ocField] !== undefined) {
          payment[sutField] = ocInvoice[ocField];
        }
      }
      payment.oracleInvoiceId = ocInvoice.InvoiceId;
      payment.source = 'oracle';
      payment.daysUntilDue = calculateDaysUntilDue(ocInvoice);
      payment.paymentPriority = determinePaymentPriority(payment);

      const response = await fetch(`${SUTAR_ENDPOINTS.acnNetwork}/api/payments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payment),
      });

      if (response.ok) {
        results.synced++;
      } else {
        results.errors.push({ oracleId: ocInvoice.InvoiceId, status: response.status });
      }
    } catch (err) {
      results.errors.push({ oracleId: ocInvoice.InvoiceId, error: err.message });
    }
  }
  return results;
}

function calculateDaysUntilDue(ocInvoice) {
  if (!ocInvoice.DueDate) return 30;
  return Math.ceil((new Date(ocInvoice.DueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function determinePaymentPriority(payment) {
  if (payment.daysUntilDue <= 3) return 'urgent';
  if (payment.daysUntilDue <= 7) return 'high';
  return 'normal';
}

// ---------- Sync: Budgets ----------
async function syncBudgets(budgets) {
  const results = { synced: 0, skipped: 0, errors: [] };
  const session = await getOracleSession();

  for (const ocBudget of budgets) {
    try {
      const finance = {};
      for (const [ocField, sutField] of Object.entries(BUDGET_TO_FINANCE)) {
        if (ocBudget[ocField] !== undefined) {
          finance[sutField] = ocBudget[ocField];
        }
      }
      finance.oracleBudgetCode = ocBudget.BudgetCode;
      finance.source = 'oracle';
      finance.utilizationPercent = calculateBudgetUtilization(ocBudget);

      const response = await fetch(`${SUTAR_ENDPOINTS.acnNetwork}/api/budgets`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(finance),
      });

      if (response.ok || response.status === 404) {
        results.synced++;
      } else {
        results.errors.push({ oracleId: ocBudget.BudgetCode, status: response.status });
      }
    } catch (err) {
      results.errors.push({ oracleId: ocBudget.BudgetCode, error: err.message });
    }
  }
  return results;
}

function calculateBudgetUtilization(ocBudget) {
  if (!ocBudget.BudgetAmount || ocBudget.BudgetAmount === 0) return 0;
  const utilized = (ocBudget.BudgetAmount - (ocBudget.AvailableAmount || 0));
  return Math.round((utilized / ocBudget.BudgetAmount) * 100);
}

// ---------- Routes ----------
app.post('/api/sync/suppliers', requireAuth, async (req, res) => {
  const { suppliers } = req.body || {};
  if (!Array.isArray(suppliers)) {
    return res.status(400).json({ error: 'suppliers array required' });
  }
  const results = await syncSuppliers(suppliers);
  res.json({ operation: 'sync_suppliers', ...results });
});

app.post('/api/sync/purchase-orders', requireAuth, async (req, res) => {
  const { purchaseOrders } = req.body || {};
  if (!Array.isArray(purchaseOrders)) {
    return res.status(400).json({ error: 'purchaseOrders array required' });
  }
  const results = await syncPurchaseOrders(purchaseOrders);
  res.json({ operation: 'sync_purchase_orders', ...results });
});

app.post('/api/sync/invoices', requireAuth, async (req, res) => {
  const { invoices } = req.body || {};
  if (!Array.isArray(invoices)) {
    return res.status(400).json({ error: 'invoices array required' });
  }
  const results = await syncInvoices(invoices);
  res.json({ operation: 'sync_invoices', ...results });
});

app.post('/api/sync/budgets', requireAuth, async (req, res) => {
  const { budgets } = req.body || {};
  if (!Array.isArray(budgets)) {
    return res.status(400).json({ error: 'budgets array required' });
  }
  const results = await syncBudgets(budgets);
  res.json({ operation: 'sync_budgets', ...results });
});

app.get('/api/status', (_req, res) => {
  res.json({
    service: 'oracle-connector',
    status: 'healthy',
    sessionExpiry: new Date(sessionExpiry).toISOString(),
    oracleHost: ORACLE_CONFIG.host,
    oracleErpId: ORACLE_CONFIG.erpCloudId,
    sutAREndpoints: SUTAR_ENDPOINTS,
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'oracle-connector',
    port: PORT,
    layer: 'Enterprise Integration',
    timestamp: new Date().toISOString(),
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[oracle-connector] listening on :${PORT}`);
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });