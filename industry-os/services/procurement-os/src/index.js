/**
 * Procurement OS - Enterprise Procurement Management Platform
 *
 * Complete procurement lifecycle management:
 * - Supplier Management
 * - Purchase Requisitions
 * - Purchase Orders
 * - Contracts & Agreements
 * - Inventory Management
 * - Budget & Cost Control
 * - Approval Workflows
 * - Analytics & Reporting
 *
 * Plus AI Procurement Agents for automation
 *
 * Port: 5096
 * Part of: RTMN Industry OS Ecosystem
 * Version: 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PROCUREMENT_OS_PORT || 5096;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Shared auth middleware
const { authMiddleware } = require('./shared/auth-middleware');
app.use('/api', authMiddleware);

// ============================================================
// DATA STORES - Complete Procurement Platform
// ============================================================

const dataStores = {
  // ===== SUPPLIER MANAGEMENT =====
  suppliers: new Map(),
  supplierCategories: new Map(),
  supplierRatings: new Map(),
  supplierContracts: new Map(),

  // ===== PURCHASE REQUISITIONS =====
  requisitions: new Map(),
  requisitionItems: new Map(),

  // ===== PURCHASE ORDERS =====
  purchaseOrders: new Map(),
  purchaseOrderItems: new Map(),
  orderTracking: new Map(),

  // ===== CONTRACTS =====
  contracts: new Map(),
  contractAmendments: new Map(),
  contractRenewals: new Map(),

  // ===== INVENTORY =====
  inventory: new Map(),
  warehouses: new Map(),
  stockMovements: new Map(),

  // ===== BUDGET & COST =====
  budgets: new Map(),
  costCenters: new Map(),
  spendAnalytics: new Map(),

  // ===== APPROVAL WORKFLOWS =====
  approvals: new Map(),
  approvalTemplates: new Map(),
  approvalHistories: new Map(),

  // ===== CATEGORIES =====
  categories: new Map(),

  // ===== RFQ & BIDDING =====
  rfqs: new Map(),
  bids: new Map(),

  // ===== AI PROCUREMENT AGENTS =====
  aiAgents: new Map(),

  // ===== INTEGRATIONS =====
  integrations: new Map(),

  // ===== USERS & ORGS =====
  users: new Map(),
  departments: new Map(),
};

// ============================================================
// AUTHENTICATION
// ============================================================
const sessions = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function requireAuth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authorization required' });
  }
  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Invalid session' });
  }
  req.user = session;
  next();
}

// ============================================================
// SAMPLE DATA INITIALIZATION
// ============================================================

function initSampleData() {
  // ===== SUPPLIERS =====
  const suppliers = [
    { id: 'SUP001', name: 'TechParts Global', category: 'IT Hardware', contact: 'sales@techparts.com', phone: '+91-9876543210', rating: 4.5, status: 'active', totalOrders: 156, totalSpend: 12500000, location: 'Bangalore', verified: true },
    { id: 'SUP002', name: 'Office Supplies Co', category: 'Office', contact: 'orders@officesupplies.com', phone: '+91-9876543211', rating: 4.2, status: 'active', totalOrders: 234, totalSpend: 3450000, location: 'Mumbai', verified: true },
    { id: 'SUP003', name: 'Industrial Equipment Ltd', category: 'Industrial', contact: 'procurement@indequip.com', phone: '+91-9876543212', rating: 4.7, status: 'active', totalOrders: 89, totalSpend: 8900000, location: 'Pune', verified: true },
    { id: 'SUP004', name: 'Cloud Services Pro', category: 'IT Services', contact: 'enterprise@cloudservices.com', phone: '+91-9876543213', rating: 4.8, status: 'active', totalOrders: 45, totalSpend: 15600000, location: 'Hyderabad', verified: true },
    { id: 'SUP005', name: 'Raw Materials Inc', category: 'Raw Materials', contact: 'sales@rawmats.com', phone: '+91-9876543214', rating: 4.0, status: 'active', totalOrders: 178, totalSpend: 4500000, location: 'Chennai', verified: false },
    { id: 'SUP006', name: 'Logistics Partners', category: 'Logistics', contact: 'ops@logiparts.com', phone: '+91-9876543215', rating: 4.3, status: 'active', totalOrders: 312, totalSpend: 2100000, location: 'Delhi', verified: true },
  ];
  suppliers.forEach(s => dataStores.suppliers.set(s.id, s));

  // ===== SUPPLIER CATEGORIES =====
  const supplierCategories = [
    { id: 'CAT001', name: 'IT Hardware', suppliers: 15, totalSpend: 25000000 },
    { id: 'CAT002', name: 'IT Services', suppliers: 8, totalSpend: 45000000 },
    { id: 'CAT003', name: 'Office Supplies', suppliers: 12, totalSpend: 5000000 },
    { id: 'CAT004', name: 'Industrial Equipment', suppliers: 10, totalSpend: 30000000 },
    { id: 'CAT005', name: 'Raw Materials', suppliers: 20, totalSpend: 15000000 },
    { id: 'CAT006', name: 'Logistics', suppliers: 6, totalSpend: 8000000 },
  ];
  supplierCategories.forEach(c => dataStores.supplierCategories.set(c.id, c));

  // ===== REQUISITIONS =====
  const requisitions = [
    { id: 'REQ001', title: 'Q3 Laptop Refresh', requestedBy: 'U001', department: 'Engineering', status: 'pending_approval', priority: 'high', estimatedCost: 2500000, approvalRequired: 500000, currentApprover: 'MGR001', items: 15, createdAt: '2026-06-10' },
    { id: 'REQ002', title: 'Office Furniture', requestedBy: 'U002', department: 'HR', status: 'approved', priority: 'medium', estimatedCost: 450000, approvedBy: 'MGR002', approvedAt: '2026-06-08', items: 8, createdAt: '2026-06-05' },
    { id: 'REQ003', title: 'Server Infrastructure', requestedBy: 'U001', department: 'IT', status: 'pending_approval', priority: 'high', estimatedCost: 8500000, approvalRequired: 5000000, currentApprover: 'MGR003', items: 5, createdAt: '2026-06-12' },
    { id: 'REQ004', title: 'Marketing Materials', requestedBy: 'U003', department: 'Marketing', status: 'draft', priority: 'low', estimatedCost: 150000, items: 3, createdAt: '2026-06-14' },
    { id: 'REQ005', title: 'Raw Materials Q3', requestedBy: 'U004', department: 'Manufacturing', status: 'approved', priority: 'medium', estimatedCost: 1200000, approvedBy: 'MGR001', approvedAt: '2026-06-11', items: 25, createdAt: '2026-06-09' },
  ];
  requisitions.forEach(r => dataStores.requisitions.set(r.id, r));

  // ===== PURCHASE ORDERS =====
  const purchaseOrders = [
    { id: 'PO001', supplierId: 'SUP001', requisitionId: 'REQ002', title: 'Office Furniture Order', status: 'confirmed', totalAmount: 420000, paidAmount: 0, pendingAmount: 420000, deliveryDate: '2026-06-25', deliveryStatus: 'in_transit', items: 8, paymentTerms: 'net-30', createdBy: 'U002', createdAt: '2026-06-08' },
    { id: 'PO002', supplierId: 'SUP003', requisitionId: 'REQ005', title: 'Raw Materials Q3', status: 'delivered', totalAmount: 1150000, paidAmount: 1150000, pendingAmount: 0, deliveryDate: '2026-06-15', deliveryStatus: 'delivered', items: 25, paymentTerms: 'net-45', createdBy: 'U004', createdAt: '2026-06-10' },
    { id: 'PO003', supplierId: 'SUP004', requisitionId: 'REQ003', title: 'Cloud Services Annual', status: 'confirmed', totalAmount: 4500000, paidAmount: 0, pendingAmount: 4500000, deliveryDate: '2026-07-01', deliveryStatus: 'processing', items: 3, paymentTerms: 'net-60', createdBy: 'U001', createdAt: '2026-06-13' },
    { id: 'PO004', supplierId: 'SUP002', title: 'Office Supplies Monthly', status: 'draft', totalAmount: 85000, paidAmount: 0, pendingAmount: 85000, deliveryDate: '2026-06-30', deliveryStatus: 'pending', items: 15, paymentTerms: 'net-30', createdBy: 'U002', createdAt: '2026-06-15' },
    { id: 'PO005', supplierId: 'SUP001', requisitionId: 'REQ001', title: 'Laptops Q3', status: 'pending_approval', totalAmount: 2400000, paidAmount: 0, pendingAmount: 2400000, deliveryDate: '2026-07-15', deliveryStatus: 'pending', items: 15, paymentTerms: 'net-30', createdBy: 'U001', createdAt: '2026-06-14' },
  ];
  purchaseOrders.forEach(po => dataStores.purchaseOrders.set(po.id, po));

  // ===== CONTRACTS =====
  const contracts = [
    { id: 'CTR001', supplierId: 'SUP004', title: 'Cloud Services Agreement 2026', type: 'service', status: 'active', startDate: '2026-01-01', endDate: '2026-12-31', totalValue: 15000000, spent: 7500000, paymentTerms: 'monthly', renewsAutomatically: true, createdAt: '2025-12-15' },
    { id: 'CTR002', supplierId: 'SUP003', title: 'Industrial Equipment Maintenance', type: 'maintenance', status: 'active', startDate: '2026-04-01', endDate: '2027-03-31', totalValue: 5000000, spent: 1500000, paymentTerms: 'quarterly', renewsAutomatically: false, createdAt: '2026-03-20' },
    { id: 'CTR003', supplierId: 'SUP001', title: 'IT Hardware Supply Agreement', type: 'supply', status: 'active', startDate: '2026-01-01', endDate: '2026-12-31', totalValue: 20000000, spent: 9500000, paymentTerms: 'per_order', renewsAutomatically: true, createdAt: '2025-12-01' },
    { id: 'CTR004', supplierId: 'SUP006', title: 'Logistics Services Contract', type: 'service', status: 'pending_renewal', startDate: '2025-07-01', endDate: '2026-06-30', totalValue: 3600000, spent: 3450000, paymentTerms: 'monthly', renewsAutomatically: true, createdAt: '2025-06-15' },
    { id: 'CTR005', supplierId: 'SUP002', title: 'Office Supplies Master Agreement', type: 'supply', status: 'active', startDate: '2026-01-01', endDate: '2026-12-31', totalValue: 6000000, spent: 2800000, paymentTerms: 'monthly', renewsAutomatically: true, createdAt: '2025-12-20' },
  ];
  contracts.forEach(c => dataStores.contracts.set(c.id, c));

  // ===== INVENTORY =====
  const inventory = [
    { id: 'INV001', sku: 'LAPTOP-001', name: 'Business Laptop 15"', category: 'IT Hardware', warehouseId: 'WH001', quantity: 45, reorderLevel: 20, reorderQuantity: 30, unitCost: 85000, totalValue: 3825000, supplierId: 'SUP001' },
    { id: 'INV002', sku: 'MONITOR-001', name: '27" 4K Monitor', category: 'IT Hardware', warehouseId: 'WH001', quantity: 78, reorderLevel: 30, reorderQuantity: 50, unitCost: 45000, totalValue: 3510000, supplierId: 'SUP001' },
    { id: 'INV003', sku: 'DESK-001', name: 'Standing Desk', category: 'Furniture', warehouseId: 'WH002', quantity: 25, reorderLevel: 10, reorderQuantity: 15, unitCost: 35000, totalValue: 875000, supplierId: 'SUP002' },
    { id: 'INV004', sku: 'CHAIR-001', name: 'Ergonomic Chair', category: 'Furniture', warehouseId: 'WH002', quantity: 56, reorderLevel: 25, reorderQuantity: 30, unitCost: 18000, totalValue: 1008000, supplierId: 'SUP002' },
    { id: 'INV005', sku: 'RAW-STL-001', name: 'Steel Sheets', category: 'Raw Materials', warehouseId: 'WH003', quantity: 500, reorderLevel: 200, reorderQuantity: 300, unitCost: 2500, totalValue: 1250000, supplierId: 'SUP005' },
  ];
  inventory.forEach(i => dataStores.inventory.set(i.id, i));

  // ===== WAREHOUSES =====
  const warehouses = [
    { id: 'WH001', name: 'Main IT Warehouse', location: 'Bangalore', capacity: 10000, utilized: 6500, type: 'it_equipment' },
    { id: 'WH002', name: 'Furniture Warehouse', location: 'Mumbai', capacity: 5000, utilized: 3200, type: 'furniture' },
    { id: 'WH003', name: 'Raw Materials Storage', location: 'Pune', capacity: 20000, utilized: 8500, type: 'raw_materials' },
  ];
  warehouses.forEach(w => dataStores.warehouses.set(w.id, w));

  // ===== BUDGETS =====
  const budgets = [
    { id: 'BUD001', department: 'Engineering', period: 'Q2-2026', allocated: 15000000, spent: 8500000, committed: 3500000, available: 3000000, status: 'active' },
    { id: 'BUD002', department: 'IT', period: 'Q2-2026', allocated: 20000000, spent: 12000000, committed: 5000000, available: 3000000, status: 'active' },
    { id: 'BUD003', department: 'Marketing', period: 'Q2-2026', allocated: 8000000, spent: 4500000, committed: 2000000, available: 1500000, status: 'active' },
    { id: 'BUD004', department: 'HR', period: 'Q2-2026', allocated: 5000000, spent: 3200000, committed: 800000, available: 1000000, status: 'active' },
    { id: 'BUD005', department: 'Manufacturing', period: 'Q2-2026', allocated: 25000000, spent: 15000000, committed: 6000000, available: 4000000, status: 'active' },
  ];
  budgets.forEach(b => dataStores.budgets.set(b.id, b));

  // ===== COST CENTERS =====
  const costCenters = [
    { id: 'CC001', name: 'Engineering', code: 'ENG', managerId: 'MGR001', totalSpend: 8500000, budget: 15000000 },
    { id: 'CC002', name: 'IT Operations', code: 'IT', managerId: 'MGR002', totalSpend: 12000000, budget: 20000000 },
    { id: 'CC003', name: 'Marketing', code: 'MKT', managerId: 'MGR003', totalSpend: 4500000, budget: 8000000 },
    { id: 'CC004', name: 'Human Resources', code: 'HR', managerId: 'MGR004', totalSpend: 3200000, budget: 5000000 },
    { id: 'CC005', name: 'Manufacturing', code: 'MFG', managerId: 'MGR005', totalSpend: 15000000, budget: 25000000 },
  ];
  costCenters.forEach(c => dataStores.costCenters.set(c.id, c));

  // ===== SPEND ANALYTICS =====
  const spendAnalytics = [
    { id: 'SP001', category: 'IT Hardware', totalSpend: 25000000, yoyGrowth: 15, avgOrderValue: 125000, orderCount: 200, savings: 2500000 },
    { id: 'SP002', category: 'IT Services', totalSpend: 45000000, yoyGrowth: 25, avgOrderValue: 500000, orderCount: 90, savings: 4500000 },
    { id: 'SP003', category: 'Office Supplies', totalSpend: 5000000, yoyGrowth: 5, avgOrderValue: 25000, orderCount: 200, savings: 300000 },
    { id: 'SP004', category: 'Industrial', totalSpend: 30000000, yoyGrowth: 12, avgOrderValue: 300000, orderCount: 100, savings: 3000000 },
    { id: 'SP005', category: 'Raw Materials', totalSpend: 15000000, yoyGrowth: 8, avgOrderValue: 75000, orderCount: 200, savings: 1200000 },
  ];
  spendAnalytics.forEach(s => dataStores.spendAnalytics.set(s.id, s));

  // ===== CATEGORIES =====
  const categories = [
    { id: 'CAT001', name: 'IT Hardware', parentId: null, level: 1, itemCount: 245 },
    { id: 'CAT002', name: 'IT Software', parentId: null, level: 1, itemCount: 156 },
    { id: 'CAT003', name: 'Office Supplies', parentId: null, level: 1, itemCount: 890 },
    { id: 'CAT004', name: 'Industrial Equipment', parentId: null, level: 1, itemCount: 178 },
    { id: 'CAT005', name: 'Raw Materials', parentId: null, level: 1, itemCount: 456 },
    { id: 'CAT006', name: 'Logistics', parentId: null, level: 1, itemCount: 67 },
    { id: 'CAT007', name: 'Professional Services', parentId: null, level: 1, itemCount: 134 },
    { id: 'CAT008', name: 'Marketing', parentId: null, level: 1, itemCount: 345 },
  ];
  categories.forEach(c => dataStores.categories.set(c.id, c));

  // ===== RFQS =====
  const rfqs = [
    { id: 'RFQ001', title: 'Annual Laptop Supply', category: 'IT Hardware', status: 'open', bidsDue: '2026-06-30', budget: 5000000, responders: 3, createdBy: 'U001', createdAt: '2026-06-01' },
    { id: 'RFQ002', title: 'Warehouse Expansion', category: 'Industrial', status: 'evaluation', bidsDue: '2026-06-25', budget: 15000000, responders: 5, createdBy: 'U004', createdAt: '2026-05-15' },
    { id: 'RFQ003', title: 'Marketing Materials 2026', category: 'Marketing', status: 'closed', bidsDue: '2026-05-30', budget: 2000000, responders: 4, awardedTo: 'SUP002', createdBy: 'U003', createdAt: '2026-05-01' },
  ];
  rfqs.forEach(r => dataStores.rfqs.set(r.id, r));

  // ===== APPROVAL TEMPLATES =====
  const approvalTemplates = [
    { id: 'APR001', name: 'Standard Purchase', thresholds: [{ amount: 50000, approvers: ['MGR001'] }, { amount: 200000, approvers: ['MGR001', 'MGR002'] }, { amount: 500000, approvers: ['MGR001', 'MGR002', 'DIR001'] }], status: 'active' },
    { id: 'APR002', name: 'Emergency Purchase', thresholds: [{ amount: 100000, approvers: ['MGR001'] }, { amount: 500000, approvers: ['MGR001', 'DIR001'] }], status: 'active' },
    { id: 'APR003', name: 'Capital Expenditure', thresholds: [{ amount: 1000000, approvers: ['MGR001', 'MGR002', 'CFO'] }, { amount: 5000000, approvers: ['MGR001', 'MGR002', 'CFO', 'CEO'] }], status: 'active' },
  ];
  approvalTemplates.forEach(a => dataStores.approvalTemplates.set(a.id, a));

  // ===== DEPARTMENTS =====
  const departments = [
    { id: 'DEPT001', name: 'Engineering', code: 'ENG', headId: 'MGR001', budget: 15000000, spent: 8500000 },
    { id: 'DEPT002', name: 'IT', code: 'IT', headId: 'MGR002', budget: 20000000, spent: 12000000 },
    { id: 'DEPT003', name: 'Marketing', code: 'MKT', headId: 'MGR003', budget: 8000000, spent: 4500000 },
    { id: 'DEPT004', name: 'Human Resources', code: 'HR', headId: 'MGR004', budget: 5000000, spent: 3200000 },
    { id: 'DEPT005', name: 'Manufacturing', code: 'MFG', headId: 'MGR005', budget: 25000000, spent: 15000000 },
    { id: 'DEPT006', name: 'Finance', code: 'FIN', headId: 'MGR006', budget: 3000000, spent: 1500000 },
    { id: 'DEPT007', name: 'Operations', code: 'OPS', headId: 'MGR007', budget: 10000000, spent: 6500000 },
  ];
  departments.forEach(d => dataStores.departments.set(d.id, d));

  // ===== AI PROCUREMENT AGENTS =====
  const aiAgents = [
    { id: 'PAG001', name: 'Supplier Discovery Agent', type: 'supplier', status: 'active', tasks: 234, accuracy: 91.5 },
    { id: 'PAG002', name: 'Price Optimization Agent', type: 'pricing', status: 'active', tasks: 567, accuracy: 88.2 },
    { id: 'PAG003', name: 'Contract Intelligence Agent', type: 'contract', status: 'active', tasks: 123, accuracy: 93.1 },
    { id: 'PAG004', name: 'Risk Assessment Agent', type: 'risk', status: 'active', tasks: 345, accuracy: 86.7 },
    { id: 'PAG005', name: 'Spend Analytics Agent', type: 'analytics', status: 'active', tasks: 456, accuracy: 89.4 },
    { id: 'PAG006', name: 'Approval Routing Agent', type: 'workflow', status: 'active', tasks: 789, accuracy: 95.2 },
    { id: 'PAG007', name: 'Inventory Prediction Agent', type: 'inventory', status: 'active', tasks: 234, accuracy: 87.8 },
    { id: 'PAG008', name: 'Supplier Performance Agent', type: 'performance', status: 'active', tasks: 156, accuracy: 90.3 },
    { id: 'PAG009', name: 'Demand Forecasting Agent', type: 'forecast', status: 'active', tasks: 189, accuracy: 85.6 },
    { id: 'PAG010', name: 'Compliance Checker Agent', type: 'compliance', status: 'active', tasks: 456, accuracy: 94.5 },
  ];
  aiAgents.forEach(a => dataStores.aiAgents.set(a.id, a));

  // ===== INTEGRATIONS =====
  const integrations = [
    { id: 'INT001', name: 'ERP System', type: 'erp', status: 'connected' },
    { id: 'INT002', name: 'Finance System', type: 'finance', status: 'connected' },
    { id: 'INT003', name: 'Inventory System', type: 'inventory', status: 'connected' },
    { id: 'INT004', name: 'Supplier Portal', type: 'portal', status: 'connected' },
    { id: 'INT005', name: 'e-Invoicing', type: 'invoicing', status: 'connected' },
  ];
  integrations.forEach(i => dataStores.integrations.set(i.id, i));

  console.log(`[Procurement OS] Initialized: ${suppliers.length} suppliers, ${requisitions.length} requisitions, ${purchaseOrders.length} POs, ${contracts.length} contracts, ${aiAgents.length} AI agents`);
}

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', (req, res) => {
  const totalSpend = Array.from(dataStores.purchaseOrders.values()).reduce((sum, po) => sum + po.totalAmount, 0);
  const pendingApprovals = Array.from(dataStores.requisitions.values()).filter(r => r.status === 'pending_approval').length;

  res.json({
    status: 'healthy',
    service: 'Procurement OS',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    modules: {
      suppliers: { total: dataStores.suppliers.size, active: Array.from(dataStores.suppliers.values()).filter(s => s.status === 'active').length },
      requisitions: { total: dataStores.requisitions.size, pending: pendingApprovals },
      purchaseOrders: { total: dataStores.purchaseOrders.size, totalValue: totalSpend },
      contracts: { total: dataStores.contracts.size, active: Array.from(dataStores.contracts.values()).filter(c => c.status === 'active').length },
      inventory: { total: dataStores.inventory.size, totalValue: Array.from(dataStores.inventory.values()).reduce((sum, i) => sum + i.totalValue, 0) },
      budgets: { total: dataStores.budgets.size },
      spendAnalytics: { categories: dataStores.spendAnalytics.size },
      rfqs: { total: dataStores.rfqs.size, open: Array.from(dataStores.rfqs.values()).filter(r => r.status === 'open').length },
      aiAgents: { total: dataStores.aiAgents.size, active: Array.from(dataStores.aiAgents.values()).filter(a => a.status === 'active').length },
    },
    integrations: Array.from(dataStores.integrations.values()),
  });
});

app.get('/status', (req, res) => {
  const totalSpend = Array.from(dataStores.purchaseOrders.values()).reduce((sum, po) => sum + po.totalAmount, 0);
  const totalBudget = Array.from(dataStores.budgets.values()).reduce((sum, b) => sum + b.allocated, 0);
  const totalSpent = Array.from(dataStores.budgets.values()).reduce((sum, b) => sum + b.spent, 0);

  res.json({
    overview: {
      suppliers: dataStores.suppliers.size,
      requisitions: dataStores.requisitions.size,
      purchaseOrders: dataStores.purchaseOrders.size,
      contracts: dataStores.contracts.size,
      inventory: dataStores.inventory.size,
      rfqs: dataStores.rfqs.size,
      aiAgents: dataStores.aiAgents.size,
    },
    financial: {
      totalSpend,
      totalBudget,
      budgetUtilization: totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0,
      totalSavings: Array.from(dataStores.spendAnalytics.values()).reduce((sum, s) => sum + s.savings, 0),
    },
    pending: {
      requisitions: Array.from(dataStores.requisitions.values()).filter(r => r.status === 'pending_approval').length,
      purchaseOrders: Array.from(dataStores.purchaseOrders.values()).filter(po => po.status === 'pending_approval').length,
      contracts: Array.from(dataStores.contracts.values()).filter(c => c.status === 'pending_renewal').length,
    },
  });
});

// ============================================================
// AUTH ENDPOINTS
// ============================================================

app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  const token = generateToken();
  sessions.set(token, { userId: `user-${Date.now()}`, email, role: 'admin' });
  res.json({ success: true, token, expiresIn: 86400 });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  sessions.delete(req.headers['authorization']?.replace('Bearer ', ''));
  res.json({ success: true });
});

// ============================================================
// SUPPLIER MANAGEMENT
// ============================================================

app.get('/api/suppliers', (req, res) => {
  const { category, status, search } = req.query;
  let suppliers = Array.from(dataStores.suppliers.values());

  if (category) suppliers = suppliers.filter(s => s.category === category);
  if (status) suppliers = suppliers.filter(s => s.status === status);
  if (search) suppliers = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  res.json({ success: true, count: suppliers.length, suppliers });
});

app.get('/api/suppliers/:id', (req, res) => {
  const supplier = dataStores.suppliers.get(req.params.id);
  if (!supplier) return res.status(404).json({ success: false, error: 'Supplier not found' });
  res.json({ success: true, supplier });
});

app.post('/api/suppliers', requireAuth, (req, res) => {
  const { name, category, contact, phone, location } = req.body;
  const supplier = {
    id: `SUP${String(dataStores.suppliers.size + 1).padStart(3, '0')}`,
    name,
    category,
    contact,
    phone,
    rating: 0,
    status: 'pending_verification',
    totalOrders: 0,
    totalSpend: 0,
    location,
    verified: false,
    createdAt: new Date().toISOString(),
  };
  dataStores.suppliers.set(supplier.id, supplier);
  res.status(201).json({ success: true, supplier });
});

app.get('/api/suppliers/:id/rate', (req, res) => {
  const supplier = dataStores.suppliers.get(req.params.id);
  if (!supplier) return res.status(404).json({ success: false, error: 'Supplier not found' });

  res.json({
    success: true,
    supplierId: supplier.id,
    rating: supplier.rating,
    totalOrders: supplier.totalOrders,
    totalSpend: supplier.totalSpend,
    deliveryPerformance: 95.5,
    qualityScore: 92.3,
    responseTime: '4 hours',
  });
});

// ============================================================
// PURCHASE REQUISITIONS
// ============================================================

app.get('/api/requisitions', (req, res) => {
  const { status, department, priority } = req.query;
  let requisitions = Array.from(dataStores.requisitions.values());

  if (status) requisitions = requisitions.filter(r => r.status === status);
  if (department) requisitions = requisitions.filter(r => r.department === department);
  if (priority) requisitions = requisitions.filter(r => r.priority === priority);

  res.json({ success: true, count: requisitions.length, requisitions });
});

app.get('/api/requisitions/:id', (req, res) => {
  const requisition = dataStores.requisitions.get(req.params.id);
  if (!requisition) return res.status(404).json({ success: false, error: 'Requisition not found' });
  res.json({ success: true, requisition });
});

app.post('/api/requisitions', requireAuth, (req, res) => {
  const { title, department, priority, estimatedCost, items } = req.body;
  const requisition = {
    id: `REQ${String(dataStores.requisitions.size + 1).padStart(3, '0')}`,
    title,
    requestedBy: req.user.userId,
    department,
    priority: priority || 'medium',
    status: estimatedCost > 50000 ? 'pending_approval' : 'approved',
    estimatedCost: parseInt(estimatedCost) || 0,
    approvalRequired: estimatedCost > 50000,
    currentApprover: estimatedCost > 50000 ? 'MGR001' : null,
    items: items?.length || 0,
    createdAt: new Date().toISOString(),
  };
  dataStores.requisitions.set(requisition.id, requisition);
  res.status(201).json({ success: true, requisition });
});

app.put('/api/requisitions/:id/approve', requireAuth, (req, res) => {
  const requisition = dataStores.requisitions.get(req.params.id);
  if (!requisition) return res.status(404).json({ success: false, error: 'Requisition not found' });

  requisition.status = 'approved';
  requisition.approvedBy = req.user.userId;
  requisition.approvedAt = new Date().toISOString();
  dataStores.requisitions.set(requisition.id, requisition);

  res.json({ success: true, requisition });
});

app.put('/api/requisitions/:id/reject', requireAuth, (req, res) => {
  const requisition = dataStores.requisitions.get(req.params.id);
  if (!requisition) return res.status(404).json({ success: false, error: 'Requisition not found' });

  requisition.status = 'rejected';
  requisition.rejectedBy = req.user.userId;
  requisition.rejectedAt = new Date().toISOString();
  requisition.rejectionReason = req.body.reason;
  dataStores.requisitions.set(requisition.id, requisition);

  res.json({ success: true, requisition });
});

// ============================================================
// PURCHASE ORDERS
// ============================================================

app.get('/api/purchase-orders', (req, res) => {
  const { status, supplierId } = req.query;
  let orders = Array.from(dataStores.purchaseOrders.values());

  if (status) orders = orders.filter(o => o.status === status);
  if (supplierId) orders = orders.filter(o => o.supplierId === supplierId);

  res.json({ success: true, count: orders.length, orders });
});

app.get('/api/purchase-orders/:id', (req, res) => {
  const order = dataStores.purchaseOrders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Purchase order not found' });

  const supplier = dataStores.suppliers.get(order.supplierId);
  res.json({ success: true, order, supplier });
});

app.post('/api/purchase-orders', requireAuth, (req, res) => {
  const { supplierId, title, items, deliveryDate, paymentTerms } = req.body;

  const order = {
    id: `PO${String(dataStores.purchaseOrders.size + 1).padStart(3, '0')}`,
    supplierId,
    title,
    status: 'draft',
    totalAmount: items?.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0) || 0,
    paidAmount: 0,
    pendingAmount: items?.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0) || 0,
    deliveryDate,
    deliveryStatus: 'pending',
    items: items?.length || 0,
    paymentTerms: paymentTerms || 'net-30',
    createdBy: req.user.userId,
    createdAt: new Date().toISOString(),
  };

  // Auto-approve small orders
  if (order.totalAmount <= 50000) {
    order.status = 'confirmed';
  }

  dataStores.purchaseOrders.set(order.id, order);
  res.status(201).json({ success: true, order });
});

app.put('/api/purchase-orders/:id/confirm', requireAuth, (req, res) => {
  const order = dataStores.purchaseOrders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Purchase order not found' });

  order.status = 'confirmed';
  dataStores.purchaseOrders.set(order.id, order);

  res.json({ success: true, order });
});

app.put('/api/purchase-orders/:id/status', requireAuth, (req, res) => {
  const order = dataStores.purchaseOrders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Purchase order not found' });

  const { status, deliveryStatus } = req.body;
  if (status) order.status = status;
  if (deliveryStatus) order.deliveryStatus = deliveryStatus;
  dataStores.purchaseOrders.set(order.id, order);

  res.json({ success: true, order });
});

// ============================================================
// CONTRACTS
// ============================================================

app.get('/api/contracts', (req, res) => {
  const { status, supplierId, type } = req.query;
  let contracts = Array.from(dataStores.contracts.values());

  if (status) contracts = contracts.filter(c => c.status === status);
  if (supplierId) contracts = contracts.filter(c => c.supplierId === supplierId);
  if (type) contracts = contracts.filter(c => c.type === type);

  res.json({ success: true, count: contracts.length, contracts });
});

app.get('/api/contracts/:id', (req, res) => {
  const contract = dataStores.contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });

  const supplier = dataStores.suppliers.get(contract.supplierId);
  res.json({ success: true, contract, supplier });
});

app.post('/api/contracts', requireAuth, (req, res) => {
  const { supplierId, title, type, startDate, endDate, totalValue, paymentTerms, renewsAutomatically } = req.body;

  const contract = {
    id: `CTR${String(dataStores.contracts.size + 1).padStart(3, '0')}`,
    supplierId,
    title,
    type,
    status: 'draft',
    startDate,
    endDate,
    totalValue: parseInt(totalValue) || 0,
    spent: 0,
    paymentTerms: paymentTerms || 'net-30',
    renewsAutomatically: renewsAutomatically || false,
    documents: [],
    amendments: [],
    createdAt: new Date().toISOString(),
  };

  dataStores.contracts.set(contract.id, contract);
  res.status(201).json({ success: true, contract });
});

app.put('/api/contracts/:id/activate', requireAuth, (req, res) => {
  const contract = dataStores.contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });

  contract.status = 'active';
  dataStores.contracts.set(contract.id, contract);

  res.json({ success: true, contract });
});

app.get('/api/contracts/expiring', (req, res) => {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringContracts = Array.from(dataStores.contracts.values()).filter(c => {
    const endDate = new Date(c.endDate);
    return c.status === 'active' && endDate <= thirtyDaysFromNow;
  });

  res.json({ success: true, count: expiringContracts.length, contracts: expiringContracts });
});

// ============================================================
// INVENTORY MANAGEMENT
// ============================================================

app.get('/api/inventory', (req, res) => {
  const { category, warehouseId, lowStock } = req.query;
  let inventory = Array.from(dataStores.inventory.values());

  if (category) inventory = inventory.filter(i => i.category === category);
  if (warehouseId) inventory = inventory.filter(i => i.warehouseId === warehouseId);
  if (lowStock === 'true') inventory = inventory.filter(i => i.quantity <= i.reorderLevel);

  res.json({ success: true, count: inventory.length, inventory });
});

app.get('/api/inventory/:id', (req, res) => {
  const item = dataStores.inventory.get(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Inventory item not found' });
  res.json({ success: true, item });
});

app.get('/api/inventory/low-stock', (req, res) => {
  const lowStockItems = Array.from(dataStores.inventory.values()).filter(i => i.quantity <= i.reorderLevel);
  res.json({ success: true, count: lowStockItems.length, items: lowStockItems });
});

app.put('/api/inventory/:id/adjust', requireAuth, (req, res) => {
  const item = dataStores.inventory.get(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Inventory item not found' });

  const { quantity, reason } = req.body;
  const adjustment = {
    previousQuantity: item.quantity,
    newQuantity: item.quantity + parseInt(quantity),
    reason,
    adjustedBy: req.user.userId,
    adjustedAt: new Date().toISOString(),
  };

  item.quantity += parseInt(quantity);
  item.totalValue = item.quantity * item.unitCost;
  item.lastAdjustment = adjustment;

  dataStores.inventory.set(item.id, item);
  res.json({ success: true, item, adjustment });
});

// ============================================================
// WAREHOUSES
// ============================================================

app.get('/api/warehouses', (req, res) => {
  const warehouses = Array.from(dataStores.warehouses.values());
  res.json({ success: true, count: warehouses.length, warehouses });
});

app.get('/api/warehouses/:id', (req, res) => {
  const warehouse = dataStores.warehouses.get(req.params.id);
  if (!warehouse) return res.status(404).json({ success: false, error: 'Warehouse not found' });

  const inventory = Array.from(dataStores.inventory.values()).filter(i => i.warehouseId === warehouse.id);

  res.json({ success: true, warehouse, inventory });
});

// ============================================================
// BUDGETS & COST CENTERS
// ============================================================

app.get('/api/budgets', (req, res) => {
  const { department, period, status } = req.query;
  let budgets = Array.from(dataStores.budgets.values());

  if (department) budgets = budgets.filter(b => b.department === department);
  if (period) budgets = budgets.filter(b => b.period === period);
  if (status) budgets = budgets.filter(b => b.status === status);

  res.json({ success: true, count: budgets.length, budgets });
});

app.get('/api/budgets/:id', (req, res) => {
  const budget = dataStores.budgets.get(req.params.id);
  if (!budget) return res.status(404).json({ success: false, error: 'Budget not found' });

  res.json({ success: true, budget });
});

app.get('/api/cost-centers', (req, res) => {
  const costCenters = Array.from(dataStores.costCenters.values());
  res.json({ success: true, count: costCenters.length, costCenters });
});

app.get('/api/spend-analytics', (req, res) => {
  const analytics = Array.from(dataStores.spendAnalytics.values());

  const totalSpend = analytics.reduce((sum, a) => sum + a.totalSpend, 0);
  const totalSavings = analytics.reduce((sum, a) => sum + a.savings, 0);

  res.json({
    success: true,
    summary: {
      totalSpend,
      totalSavings,
      savingsRate: totalSpend > 0 ? ((totalSavings / totalSpend) * 100).toFixed(1) : 0,
    },
    categories: analytics,
  });
});

// ============================================================
// CATEGORIES
// ============================================================

app.get('/api/categories', (req, res) => {
  const categories = Array.from(dataStores.categories.values());
  res.json({ success: true, count: categories.length, categories });
});

app.post('/api/categories', requireAuth, (req, res) => {
  const { name, parentId } = req.body;
  const category = {
    id: `CAT${String(dataStores.categories.size + 1).padStart(3, '0')}`,
    name,
    parentId: parentId || null,
    level: parentId ? 2 : 1,
    itemCount: 0,
    createdAt: new Date().toISOString(),
  };
  dataStores.categories.set(category.id, category);
  res.status(201).json({ success: true, category });
});

// ============================================================
// RFQ & BIDDING
// ============================================================

app.get('/api/rfqs', (req, res) => {
  const { status, category } = req.query;
  let rfqs = Array.from(dataStores.rfqs.values());

  if (status) rfqs = rfqs.filter(r => r.status === status);
  if (category) rfqs = rfqs.filter(r => r.category === category);

  res.json({ success: true, count: rfqs.length, rfqs });
});

app.get('/api/rfqs/:id', (req, res) => {
  const rfq = dataStores.rfqs.get(req.params.id);
  if (!rfq) return res.status(404).json({ success: false, error: 'RFQ not found' });
  res.json({ success: true, rfq });
});

app.post('/api/rfqs', requireAuth, (req, res) => {
  const { title, category, description, budget, bidsDue, requirements } = req.body;

  const rfq = {
    id: `RFQ${String(dataStores.rfqs.size + 1).padStart(3, '0')}`,
    title,
    category,
    description,
    status: 'draft',
    budget: parseInt(budget) || 0,
    bidsDue,
    requirements: requirements || [],
    responders: 0,
    bids: [],
    awardedTo: null,
    createdBy: req.user.userId,
    createdAt: new Date().toISOString(),
  };

  dataStores.rfqs.set(rfq.id, rfq);
  res.status(201).json({ success: true, rfq });
});

app.put('/api/rfqs/:id/publish', requireAuth, (req, res) => {
  const rfq = dataStores.rfqs.get(req.params.id);
  if (!rfq) return res.status(404).json({ success: false, error: 'RFQ not found' });

  rfq.status = 'open';
  dataStores.rfqs.set(rfq.id, rfq);

  res.json({ success: true, rfq });
});

// ============================================================
// APPROVAL TEMPLATES
// ============================================================

app.get('/api/approval-templates', (req, res) => {
  const templates = Array.from(dataStores.approvalTemplates.values());
  res.json({ success: true, count: templates.length, templates });
});

app.get('/api/approval-templates/:id/route', (req, res) => {
  const template = dataStores.approvalTemplates.get(req.params.id);
  if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

  const { amount } = req.query;
  const approvers = template.thresholds
    .filter(t => amount >= t.amount)
    .sort((a, b) => b.amount - a.amount)[0]?.approvers || [];

  res.json({ success: true, templateId: template.id, approvers, amount: parseInt(amount) });
});

// ============================================================
// DEPARTMENTS
// ============================================================

app.get('/api/departments', (req, res) => {
  const departments = Array.from(dataStores.departments.values());
  res.json({ success: true, count: departments.length, departments });
});

app.get('/api/departments/:id', (req, res) => {
  const department = dataStores.departments.get(req.params.id);
  if (!department) return res.status(404).json({ success: false, error: 'Department not found' });

  const budgets = Array.from(dataStores.budgets.values()).filter(b => b.department === department.name);
  const requisitions = Array.from(dataStores.requisitions.values()).filter(r => r.department === department.name);

  res.json({ success: true, department, budgets, requisitions });
});

// ============================================================
// AI PROCUREMENT AGENTS
// ============================================================

app.get('/api/ai-agents', (req, res) => {
  const agents = Array.from(dataStores.aiAgents.values());
  res.json({ success: true, count: agents.length, agents });
});

app.post('/api/ai-agents/:id/analyze', requireAuth, (req, res) => {
  const agent = dataStores.aiAgents.get(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  const { data, type } = req.body;
  const result = {
    id: `RES${Date.now()}`,
    agentId: agent.id,
    agentName: agent.name,
    analysisType: type,
    result: `AI analysis of ${type || 'data'} completed`,
    confidence: (Math.random() * 0.3 + 0.7).toFixed(2),
    generatedAt: new Date().toISOString(),
  };

  res.json({ success: true, result });
});

app.post('/api/ai-agents/supplier-match', requireAuth, (req, res) => {
  const { requirements, budget } = req.body;

  // AI-powered supplier matching
  const matchedSuppliers = Array.from(dataStores.suppliers.values())
    .filter(s => s.status === 'active')
    .slice(0, 5)
    .map(s => ({
      supplierId: s.id,
      name: s.name,
      rating: s.rating,
      matchScore: Math.floor(Math.random() * 20 + 80),
      estimatedCost: Math.floor(budget * 0.9),
      deliveryTime: `${Math.floor(Math.random() * 5 + 2)} weeks`,
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  res.json({
    success: true,
    matches: matchedSuppliers,
    totalMatches: matchedSuppliers.length,
  });
});

app.post('/api/ai-agents/price-analysis', requireAuth, (req, res) => {
  const { category, historicalPrices } = req.body;

  const analysis = {
    category,
    averagePrice: Math.floor(Math.random() * 50000 + 20000),
    marketTrend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)],
    recommendedPrice: Math.floor(Math.random() * 30000 + 15000),
    savingsPotential: Math.floor(Math.random() * 5000 + 1000),
    confidence: (Math.random() * 0.2 + 0.8).toFixed(2),
  };

  res.json({ success: true, analysis });
});

// ============================================================
// ANALYTICS & REPORTING
// ============================================================

app.get('/api/analytics/overview', (req, res) => {
  const suppliers = Array.from(dataStores.suppliers.values());
  const purchaseOrders = Array.from(dataStores.purchaseOrders.values());
  const contracts = Array.from(dataStores.contracts.values());

  res.json({
    success: true,
    overview: {
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter(s => s.status === 'active').length,
      totalPurchaseOrders: purchaseOrders.length,
      totalContractValue: contracts.reduce((sum, c) => sum + c.totalValue, 0),
      totalSpend: purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0),
    },
  });
});

app.get('/api/analytics/spend-by-category', (req, res) => {
  const spendByCategory = Array.from(dataStores.spendAnalytics.values());
  const totalSpend = spendByCategory.reduce((sum, s) => sum + s.totalSpend, 0);

  const breakdown = spendByCategory.map(s => ({
    category: s.category,
    spend: s.totalSpend,
    percentage: totalSpend > 0 ? ((s.totalSpend / totalSpend) * 100).toFixed(1) : 0,
    yoyGrowth: s.yoyGrowth,
    savings: s.savings,
  }));

  res.json({ success: true, totalSpend, breakdown });
});

app.get('/api/analytics/supplier-performance', (req, res) => {
  const suppliers = Array.from(dataStores.suppliers.values());

  const performance = suppliers.map(s => ({
    supplierId: s.id,
    name: s.name,
    rating: s.rating,
    totalOrders: s.totalOrders,
    totalSpend: s.totalSpend,
    avgOrderValue: s.totalOrders > 0 ? s.totalSpend / s.totalOrders : 0,
    onTimeDelivery: 95 + Math.random() * 5,
    qualityScore: 90 + Math.random() * 10,
  }));

  res.json({ success: true, performance });
});

// ============================================================
// INTEGRATIONS
// ============================================================

app.get('/api/integrations', (req, res) => {
  const integrations = Array.from(dataStores.integrations.values());
  res.json({ success: true, count: integrations.length, integrations });
});

app.post('/api/integrations/:id/sync', requireAuth, (req, res) => {
  const integration = dataStores.integrations.get(req.params.id);
  if (!integration) return res.status(404).json({ success: false, error: 'Integration not found' });

  res.json({ success: true, message: `Syncing with ${integration.name}`, status: 'syncing' });
});

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
  console.error('[Procurement OS Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// START
// ============================================================

initSampleData();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                  PROCUREMENT OS v1.0.0                                      ║
║            Enterprise Procurement Management Platform                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                                   ║
║  Status: Running                                                              ║
║                                                                             ║
║  ══════════════════════════════════════════════════════════════════════════   ║
║  CORE MODULES                                                               ║
║  ══════════════════════════════════════════════════════════════════════════   ║
║                                                                             ║
║  🏢 Supplier Management     │  📋 Requisitions       │  📦 Purchase Orders    ║
║  • Supplier Database         │  • Request Creation    │  • PO Management        ║
║  • Performance Rating        │  • Approval Workflows  │  • Order Tracking        ║
║  • Category Management       │  • Budget Checking    │  • Delivery Status       ║
║                                                                             ║
║  📜 Contract Management     │  📊 Budget & Cost     │  📦 Inventory           ║
║  • Contract Lifecycle        │  • Cost Centers       │  • Stock Management      ║
║  • Renewal Tracking         │  • Spend Analytics    │  • Warehouse Mgmt       ║
║  • Amendment Handling        │  • Budget Alerts      │  • Low Stock Alerts      ║
║                                                                             ║
║  📝 RFQ & Bidding           │  ✅ Approvals          │  📈 Analytics           ║
║  • Request for Quotes        │  • Workflow Templates │  • Spend Analysis       ║
║  • Supplier Bidding         │  • Multi-level       │  • Supplier Performance  ║
║  • Award Management          │  • Auto-routing      │  • Trend Reports        ║
║                                                                             ║
║  ══════════════════════════════════════════════════════════════════════════   ║
║  🤖 AI PROCUREMENT AGENTS (10)                                              ║
║  ══════════════════════════════════════════════════════════════════════════   ║
║  • Supplier Discovery    • Price Optimization    • Contract Intelligence     ║
║  • Risk Assessment       • Spend Analytics       • Approval Routing         ║
║  • Inventory Prediction   • Supplier Performance  • Demand Forecasting        ║
║  • Compliance Checker                                                       ║
║                                                                             ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
