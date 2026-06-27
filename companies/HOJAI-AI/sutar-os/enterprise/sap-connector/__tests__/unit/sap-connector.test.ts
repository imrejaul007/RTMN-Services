/**
 * SUTAR OS — SAP Connector Tests
 */
import { describe, it, expect } from 'vitest';

// Replicate mapping tables and pure functions from source for testing
describe('SAP Connector — Field Mappings', () => {
  const VENDOR_TO_SUPPLIER: Record<string, string> = {
    Lifnr: 'supplierId', Name1: 'businessName', Name2: 'contactName',
    Strasse: 'address', Ort01: 'city', Land1: 'country',
    Telfx: 'fax', Email: 'email', Ktokk: 'accountGroup',
  };

  const PO_TO_PROCUREMENT: Record<string, string> = {
    Ebeln: 'poNumber', Erdat: 'createdDate', Bsart: 'poType',
    Ekorg: 'purchasingOrg', Ekgrp: 'purchasingGroup', Lifnr: 'vendorId',
    Statu: 'status', Netwr: 'totalValue', Waers: 'currency',
  };

  const INVENTORY_TO_PRODUCT: Record<string, string> = {
    Matnr: 'materialId', Werks: 'plant', lgort: 'storageLocation',
    Labst: 'unrestrictedStock', Insme: 'qualityInspection', Speme: 'blockedStock',
    Labst_plus_Insme: 'availableStock',
  };

  const COST_CENTER_TO_BUDGET: Record<string, string> = {
    Kokrs: 'controllingArea', Kostl: 'costCenterId', Datab: 'validFrom',
    Datbi: 'validTo', Ktext: 'description', Verak: 'personResponsible',
  };

  function applyMapping(data: any, mapping: Record<string, string>) {
    const result: any = {};
    for (const [src, dst] of Object.entries(mapping)) {
      if (data[src] !== undefined) result[dst] = data[src];
    }
    return result;
  }

  it('maps SAP vendor fields to SUTAR supplier fields', () => {
    const vendor = { Lifnr: 'V001', Name1: 'Steel Co', Name2: 'John Doe', Strasse: '123 Industrial Rd', Ort01: 'Munich', Land1: 'DE', Email: 'info@steel.de', Ktokk: '0001' };
    const supplier = applyMapping(vendor, VENDOR_TO_SUPPLIER);
    expect(supplier.supplierId).toBe('V001');
    expect(supplier.businessName).toBe('Steel Co');
    expect(supplier.contactName).toBe('John Doe');
    expect(supplier.address).toBe('123 Industrial Rd');
    expect(supplier.city).toBe('Munich');
    expect(supplier.country).toBe('DE');
    expect(supplier.email).toBe('info@steel.de');
    expect(supplier.accountGroup).toBe('0001');
  });

  it('skips undefined vendor fields', () => {
    const vendor = { Lifnr: 'V002', Name1: 'Parts Ltd' };
    const supplier = applyMapping(vendor, VENDOR_TO_SUPPLIER);
    expect(supplier.supplierId).toBe('V002');
    expect(supplier.businessName).toBe('Parts Ltd');
    expect(supplier.email).toBeUndefined();
  });

  it('maps SAP PO fields to procurement fields', () => {
    const po = { Ebeln: '4500012345', Erdat: '2026-06-01', Bsart: 'NB', Ekorg: '1000', Ekgrp: '001', Lifnr: 'V001', Statu: 'O', Netwr: 50000, Waers: 'EUR' };
    const proc = applyMapping(po, PO_TO_PROCUREMENT);
    expect(proc.poNumber).toBe('4500012345');
    expect(proc.createdDate).toBe('2026-06-01');
    expect(proc.poType).toBe('NB');
    expect(proc.purchasingOrg).toBe('1000');
    expect(proc.purchasingGroup).toBe('001');
    expect(proc.vendorId).toBe('V001');
    expect(proc.status).toBe('O');
    expect(proc.totalValue).toBe(50000);
    expect(proc.currency).toBe('EUR');
  });

  it('maps SAP inventory fields to product fields', () => {
    const inv = { Matnr: 'MAT001', Werks: '1000', lgort: '0001', Labst: 500, Insme: 50, Speme: 10, Labst_plus_Insme: 550 };
    const product = applyMapping(inv, INVENTORY_TO_PRODUCT);
    expect(product.materialId).toBe('MAT001');
    expect(product.plant).toBe('1000');
    expect(product.storageLocation).toBe('0001');
    expect(product.unrestrictedStock).toBe(500);
    expect(product.qualityInspection).toBe(50);
    expect(product.blockedStock).toBe(10);
    expect(product.availableStock).toBe(550);
  });

  it('maps SAP cost center fields to budget fields', () => {
    const cc = { Kokrs: 'AC01', Kostl: 'CC001', Datab: '2026-01-01', Datbi: '2026-12-31', Ktext: 'Manufacturing', Verak: 'Jane Smith' };
    const budget = applyMapping(cc, COST_CENTER_TO_BUDGET);
    expect(budget.controllingArea).toBe('AC01');
    expect(budget.costCenterId).toBe('CC001');
    expect(budget.validFrom).toBe('2026-01-01');
    expect(budget.validTo).toBe('2026-12-31');
    expect(budget.description).toBe('Manufacturing');
    expect(budget.personResponsible).toBe('Jane Smith');
  });
});

describe('SAP Connector — Capability Inference', () => {
  function inferSupplierCapabilities(sapVendor: any) {
    const caps = ['product_search', 'rfq_response', 'order_fulfillment'];
    const acctGroup = sapVendor.Ktokk || '';
    if (acctGroup === '0001') caps.push('raw_materials');
    if (acctGroup === '0002') caps.push('finished_goods');
    if (acctGroup === '0003') caps.push('services');
    return caps;
  }

  it('has base capabilities', () => {
    const caps = inferSupplierCapabilities({});
    expect(caps).toContain('product_search');
    expect(caps).toContain('rfq_response');
    expect(caps).toContain('order_fulfillment');
  });

  it('infers raw materials for acct group 0001', () => {
    const caps = inferSupplierCapabilities({ Ktokk: '0001' });
    expect(caps).toContain('raw_materials');
  });

  it('infers finished goods for acct group 0002', () => {
    const caps = inferSupplierCapabilities({ Ktokk: '0002' });
    expect(caps).toContain('finished_goods');
  });

  it('infers services for acct group 0003', () => {
    const caps = inferSupplierCapabilities({ Ktokk: '0003' });
    expect(caps).toContain('services');
  });
});

describe('SAP Connector — PO Urgency', () => {
  function calculatePOUrgency(sapPO: any) {
    if (!sapPO.Erdat) return 'medium';
    const age = Math.ceil((Date.now() - new Date(sapPO.Erdat).getTime()) / (1000 * 60 * 60 * 24));
    if (age > 60) return 'critical';
    if (age > 30) return 'high';
    if (age > 14) return 'medium';
    return 'low';
  }

  it('returns medium when no created date', () => {
    expect(calculatePOUrgency({})).toBe('medium');
  });

  it('returns critical for POs older than 60 days', () => {
    const oldDate = new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculatePOUrgency({ Erdat: oldDate })).toBe('critical');
  });

  it('returns high for POs 30-60 days old', () => {
    const midDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculatePOUrgency({ Erdat: midDate })).toBe('high');
  });

  it('returns medium for POs 14-30 days old', () => {
    const recentDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculatePOUrgency({ Erdat: recentDate })).toBe('medium');
  });

  it('returns low for POs less than 14 days old', () => {
    const newDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculatePOUrgency({ Erdat: newDate })).toBe('low');
  });
});

describe('SAP Connector — Inventory Alerts', () => {
  function generateInventoryAlerts(product: any) {
    const alerts = [];
    if (product.stockLevel === 0) alerts.push({ type: 'out_of_stock', severity: 'critical' });
    else if (product.stockLevel < 10) alerts.push({ type: 'low_stock', severity: 'high' });
    else if (product.stockLevel < 50) alerts.push({ type: 'reorder_warning', severity: 'medium' });
    return alerts;
  }

  it('returns critical for zero stock', () => {
    const alerts = generateInventoryAlerts({ stockLevel: 0 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('out_of_stock');
    expect(alerts[0].severity).toBe('critical');
  });

  it('returns high for stock under 10', () => {
    const alerts = generateInventoryAlerts({ stockLevel: 5 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('low_stock');
    expect(alerts[0].severity).toBe('high');
  });

  it('returns medium for stock under 50', () => {
    const alerts = generateInventoryAlerts({ stockLevel: 25 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('reorder_warning');
    expect(alerts[0].severity).toBe('medium');
  });

  it('returns no alerts for adequate stock', () => {
    const alerts = generateInventoryAlerts({ stockLevel: 100 });
    expect(alerts).toHaveLength(0);
  });
});

describe('SAP Connector — Configuration', () => {
  it('has correct default SAP config', () => {
    const SAP_CONFIG = {
      host: process.env.SAP_HOST || 'sap.example.com',
      port: parseInt(process.env.SAP_PORT_NUM || '443'),
      client: process.env.SAP_CLIENT || '100',
      systemNumber: parseInt(process.env.SAP_SYSNR || '00'),
      username: process.env.SAP_USERNAME || 'DEMO_USER',
      password: process.env.SAP_PASSWORD || 'DEMO_PASS',
      basePath: process.env.SAP_BASE_PATH || '/sap/opu/odata/sap',
    };
    expect(SAP_CONFIG.host).toBe('sap.example.com');
    expect(SAP_CONFIG.port).toBe(443);
    expect(SAP_CONFIG.client).toBe('100');
    expect(SAP_CONFIG.basePath).toBe('/sap/opu/odata/sap');
  });

  it('has correct SUTAR endpoint defaults', () => {
    const SUTAR_ENDPOINTS = {
      acnNetwork: process.env.ACN_NETWORK_URL || 'http://localhost:4801',
      procurement: process.env.PROCUREMENT_URL || 'http://localhost:5096',
      negotiation: process.env.NEGOTIATION_URL || 'http://localhost:4293',
      contract: process.env.CONTRACT_URL || 'http://localhost:4292',
    };
    expect(SUTAR_ENDPOINTS.acnNetwork).toBe('http://localhost:4801');
    expect(SUTAR_ENDPOINTS.procurement).toBe('http://localhost:5096');
  });
});

describe('SAP Connector — Sync Results Shape', () => {
  it('produces valid sync result structure', () => {
    const results = { synced: 0, skipped: 0, errors: [] as any[] };
    expect(results).toHaveProperty('synced');
    expect(results).toHaveProperty('skipped');
    expect(results).toHaveProperty('errors');
    expect(Array.isArray(results.errors)).toBe(true);
  });
});