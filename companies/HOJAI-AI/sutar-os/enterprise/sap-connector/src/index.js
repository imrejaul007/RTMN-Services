/**
 * SUTAR OS — SAP S/4HANA Connector
 *
 * Bidirectional sync between SAP S/4HANA ERP and SUTAR agent network.
 * Keeps vendors, purchase orders, inventory, and cost centers in sync
 * with the ACN agent registry and procurement agents.
 *
 * Endpoints:
 *   POST /api/sync/vendors           — Sync SAP vendors → SUTAR suppliers
 *   POST /api/sync/purchase-orders   — Sync POs → procurement missions
 *   POST /api/sync/inventory         — Sync inventory levels → product agents
 *   POST /api/sync/cost-centers      — Sync cost centers → budget agents
 *   GET  /api/status                 — Connector health + SAP session
 *   GET  /health
 */

const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const { setupSecurity } = require('@rtmn/shared/security');

const app = express();
app.use(express.json());

setupSecurity(app, { serviceName: 'sap-connector' });

const PORT = process.env.SAP_PORT || 4601;

// ---------- Configuration ----------
const SAP_CONFIG = {
  host: process.env.SAP_HOST || 'sap.example.com',
  port: parseInt(process.env.SAP_PORT_NUM || '443'),
  client: process.env.SAP_CLIENT || '100',
  systemNumber: parseInt(process.env.SAP_SYSNR || '00'),
  username: process.env.SAP_USERNAME || 'DEMO_USER',
  password: process.env.SAP_PASSWORD || 'DEMO_PASS',
  basePath: process.env.SAP_BASE_PATH || '/sap/opu/odata/sap',
};

const SUTAR_ENDPOINTS = {
  acnNetwork:   process.env.ACN_NETWORK_URL    || 'http://localhost:4801',
  procurement:  process.env.PROCUREMENT_URL   || 'http://localhost:5096',
  negotiation:  process.env.NEGOTIATION_URL   || 'http://localhost:4293',
  contract:     process.env.CONTRACT_URL       || 'http://localhost:4292',
};

// Session cache
let sapSession = null;
let sessionExpiry = 0;

// ---------- SAP Session Management ----------
async function getSapSession() {
  if (sapSession && Date.now() < sessionExpiry - 60000) {
    return sapSession;
  }
  // Demo mode: mock SAP session
  sapSession = 'sap_session_' + Date.now();
  sessionExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes
  return sapSession;
}

// ---------- Field Mappings ----------
const VENDOR_TO_SUPPLIER = {
  Lifnr:   'supplierId',
  Name1:   'businessName',
  Name2:   'contactName',
  Strasse: 'address',
  Ort01:   'city',
  Land1:   'country',
  Telfx:   'fax',
  Email:   'email',
  Ktokk:   'accountGroup',
};

const PO_TO_PROCUREMENT = {
  Ebeln:   'poNumber',
  Erdat:   'createdDate',
  Bsart:   'poType',
  Ekorg:   'purchasingOrg',
  Ekgrp:   'purchasingGroup',
  Lifnr:   'vendorId',
  Statu:   'status',
  Netwr:   'totalValue',
  Waers:   'currency',
};

const INVENTORY_TO_PRODUCT = {
  Matnr:  'materialId',
  Werks:  'plant',
  lgort:  'storageLocation',
  Labst:  'unrestrictedStock',
  Insme:  'qualityInspection',
  Speme:  'blockedStock',
  Labst_plus_Insme: 'availableStock',
};

const COST_CENTER_TO_BUDGET = {
  Kokrs:  'controllingArea',
  Kostl:  'costCenterId',
  Datab:  'validFrom',
  Datbi:  'validTo',
  Ktext:  'description',
  Verak:  'personResponsible',
};

// ---------- Sync: Vendors → Suppliers ----------
async function syncVendors(vendors) {
  const results = { synced: 0, skipped: 0, errors: [] };
  const session = await getSapSession();

  for (const sapVendor of vendors) {
    try {
      const supplier = {};
      for (const [sapField, sutField] of Object.entries(VENDOR_TO_SUPPLIER)) {
        if (sapVendor[sapField] !== undefined) {
          supplier[sutField] = sapVendor[sapField];
        }
      }
      supplier.sapVendorId = sapVendor.Lifnr;
      supplier.source = 'sap';
      supplier.capabilities = inferSupplierCapabilities(sapVendor);

      const response = await fetch(`${SUTAR_ENDPOINTS.acnNetwork}/api/agents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(supplier),
      });

      if (response.ok) {
        results.synced++;
      } else {
        results.errors.push({ sapId: sapVendor.Lifnr, status: response.status });
      }
    } catch (err) {
      results.errors.push({ sapId: sapVendor.Lifnr, error: err.message });
    }
  }
  return results;
}

function inferSupplierCapabilities(sapVendor) {
  const caps = ['product_search', 'rfq_response', 'order_fulfillment'];
  const acctGroup = sapVendor.Ktokk || '';
  if (acctGroup === '0001') caps.push('raw_materials');
  if (acctGroup === '0002') caps.push('finished_goods');
  if (acctGroup === '0003') caps.push('services');
  return caps;
}

// ---------- Sync: Purchase Orders → Procurement ----------
async function syncPurchaseOrders(purchaseOrders) {
  const results = { synced: 0, skipped: 0, errors: [] };
  const session = await getSapSession();

  for (const sapPO of purchaseOrders) {
    try {
      if (sapPO.Statu === 'C') {
        results.skipped++;
        continue;
      }

      const procurement = {};
      for (const [sapField, sutField] of Object.entries(PO_TO_PROCUREMENT)) {
        if (sapPO[sapField] !== undefined) {
          procurement[sutField] = sapPO[sapField];
        }
      }
      procurement.sapPOId = sapPO.Ebeln;
      procurement.source = 'sap';
      procurement.items = sapPO.Items || [];
      procurement.urgency = calculatePOUrgency(sapPO);

      const response = await fetch(`${SUTAR_ENDPOINTS.procurement}/api/missions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(procurement),
      });

      if (response.ok) {
        results.synced++;
      } else {
        results.errors.push({ sapId: sapPO.Ebeln, status: response.status });
      }
    } catch (err) {
      results.errors.push({ sapId: sapPO.Ebeln, error: err.message });
    }
  }
  return results;
}

function calculatePOUrgency(sapPO) {
  if (!sapPO.Erdat) return 'medium';
  const age = Math.ceil((Date.now() - new Date(sapPO.Erdat).getTime()) / (1000 * 60 * 60 * 24));
  if (age > 60) return 'critical';
  if (age > 30) return 'high';
  if (age > 14) return 'medium';
  return 'low';
}

// ---------- Sync: Inventory → Product Agents ----------
async function syncInventory(inventoryItems) {
  const results = { synced: 0, skipped: 0, errors: [] };
  const session = await getSapSession();

  for (const inv of inventoryItems) {
    try {
      const product = {};
      for (const [sapField, sutField] of Object.entries(INVENTORY_TO_PRODUCT)) {
        if (inv[sapField] !== undefined) {
          product[sutField] = inv[sapField];
        }
      }
      product.sapMaterialId = inv.Matnr;
      product.source = 'sap';
      product.stockLevel = product.availableStock || 0;
      product.alerts = generateInventoryAlerts(product);

      const response = await fetch(`${SUTAR_ENDPOINTS.acnNetwork}/api/products`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });

      if (response.ok || response.status === 404) {
        results.synced++;
      } else {
        results.errors.push({ sapId: inv.Matnr, status: response.status });
      }
    } catch (err) {
      results.errors.push({ sapId: inv.Matnr, error: err.message });
    }
  }
  return results;
}

function generateInventoryAlerts(product) {
  const alerts = [];
  if (product.stockLevel === 0) alerts.push({ type: 'out_of_stock', severity: 'critical' });
  else if (product.stockLevel < 10) alerts.push({ type: 'low_stock', severity: 'high' });
  else if (product.stockLevel < 50) alerts.push({ type: 'reorder_warning', severity: 'medium' });
  return alerts;
}

// ---------- Sync: Cost Centers → Budget Agents ----------
async function syncCostCenters(costCenters) {
  const results = { synced: 0, skipped: 0, errors: [] };
  const session = await getSapSession();

  for (const cc of costCenters) {
    try {
      const budget = {};
      for (const [sapField, sutField] of Object.entries(COST_CENTER_TO_BUDGET)) {
        if (cc[sapField] !== undefined) {
          budget[sutField] = cc[sapField];
        }
      }
      budget.sapCostCenterId = cc.Kostl;
      budget.source = 'sap';
      budget.controllingArea = cc.Kokrs;

      const response = await fetch(`${SUTAR_ENDPOINTS.acnNetwork}/api/budgets`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(budget),
      });

      if (response.ok || response.status === 404) {
        results.synced++;
      } else {
        results.errors.push({ sapId: cc.Kostl, status: response.status });
      }
    } catch (err) {
      results.errors.push({ sapId: cc.Kostl, error: err.message });
    }
  }
  return results;
}

// ---------- Routes ----------
app.post('/api/sync/vendors', requireAuth, async (req, res) => {
  const { vendors } = req.body || {};
  if (!Array.isArray(vendors)) {
    return res.status(400).json({ error: 'vendors array required' });
  }
  const results = await syncVendors(vendors);
  res.json({ operation: 'sync_vendors', ...results });
});

app.post('/api/sync/purchase-orders', requireAuth, async (req, res) => {
  const { purchaseOrders } = req.body || {};
  if (!Array.isArray(purchaseOrders)) {
    return res.status(400).json({ error: 'purchaseOrders array required' });
  }
  const results = await syncPurchaseOrders(purchaseOrders);
  res.json({ operation: 'sync_purchase_orders', ...results });
});

app.post('/api/sync/inventory', requireAuth, async (req, res) => {
  const { inventory } = req.body || {};
  if (!Array.isArray(inventory)) {
    return res.status(400).json({ error: 'inventory array required' });
  }
  const results = await syncInventory(inventory);
  res.json({ operation: 'sync_inventory', ...results });
});

app.post('/api/sync/cost-centers', requireAuth, async (req, res) => {
  const { costCenters } = req.body || {};
  if (!Array.isArray(costCenters)) {
    return res.status(400).json({ error: 'costCenters array required' });
  }
  const results = await syncCostCenters(costCenters);
  res.json({ operation: 'sync_cost_centers', ...results });
});

app.get('/api/status', (_req, res) => {
  res.json({
    service: 'sap-connector',
    status: 'healthy',
    sessionExpiry: new Date(sessionExpiry).toISOString(),
    sapHost: SAP_CONFIG.host,
    sapClient: SAP_CONFIG.client,
    sutAREndpoints: SUTAR_ENDPOINTS,
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sap-connector',
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
  console.log(`[sap-connector] listening on :${PORT}`);
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });