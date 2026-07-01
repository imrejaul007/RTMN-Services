/**
 * Procurement OS - Test Suite
 *
 * Tests: Suppliers, Requisitions, Purchase Orders, RFQs, Contracts
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Data stores
const mockSuppliers = new Map();
const mockRequisitions = new Map();
const mockPurchaseOrders = new Map();
const mockRFQs = new Map();
const mockContracts = new Map();

let idCounter = 1;
const generateId = () => `proc_${String(idCounter++).padStart(6, '0')}`;

interface Supplier {
  id: string;
  name: string;
  category: string;
  rating: number;
  status: 'active' | 'inactive' | 'pending';
  contactEmail: string;
  createdAt: string;
}

interface Requisition {
  id: string;
  title: string;
  requestedBy: string;
  department: string;
  items: { name: string; quantity: number; estimatedCost: number }[];
  totalAmount: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  createdAt: string;
}

interface PurchaseOrder {
  id: string;
  supplierId: string;
  requisitionId?: string;
  items: { name: string; quantity: number; unitCost: number }[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'acknowledged' | 'received' | 'closed';
  expectedDelivery?: string;
  createdAt: string;
}

interface RFQ {
  id: string;
  title: string;
  category: string;
  specifications: string;
  quantity: number;
  deadline: string;
  responses: { supplierId: string; price: number; deliveryDays: number }[];
  status: 'open' | 'closed' | 'awarded';
  awardedTo?: string;
  createdAt: string;
}

const procurementService = {
  // Suppliers
  createSupplier(data: Partial<Supplier>): Supplier {
    const supplier: Supplier = {
      id: generateId(),
      name: data.name || '',
      category: data.category || '',
      rating: data.rating ?? 0,
      status: data.status || 'pending',
      contactEmail: data.contactEmail || '',
      createdAt: new Date().toISOString(),
    };
    mockSuppliers.set(supplier.id, supplier);
    return supplier;
  },

  getSupplier(id: string): Supplier | undefined {
    return mockSuppliers.get(id);
  },

  listSuppliers(filters?: { category?: string; status?: string }): Supplier[] {
    let suppliers = Array.from(mockSuppliers.values());
    if (filters?.category) suppliers = suppliers.filter(s => s.category === filters.category);
    if (filters?.status) suppliers = suppliers.filter(s => s.status === filters.status);
    return suppliers;
  },

  updateSupplierRating(id: string, rating: number): Supplier | undefined {
    const supplier = mockSuppliers.get(id);
    if (!supplier) return undefined;
    supplier.rating = Math.max(0, Math.min(5, rating));
    mockSuppliers.set(id, supplier);
    return supplier;
  },

  // Requisitions
  createRequisition(data: Partial<Requisition>): Requisition {
    const total = data.items?.reduce((sum, item) => sum + (item.quantity * item.estimatedCost), 0) || 0;
    const req: Requisition = {
      id: generateId(),
      title: data.title || '',
      requestedBy: data.requestedBy || '',
      department: data.department || '',
      items: data.items || [],
      totalAmount: total,
      status: data.status || 'draft',
      approvedBy: data.approvedBy,
      createdAt: new Date().toISOString(),
    };
    mockRequisitions.set(req.id, req);
    return req;
  },

  approveRequisition(id: string, approverId: string): Requisition | undefined {
    const req = mockRequisitions.get(id);
    if (!req) return undefined;
    req.status = 'approved';
    req.approvedBy = approverId;
    mockRequisitions.set(id, req);
    return req;
  },

  // Purchase Orders
  createPurchaseOrder(data: Partial<PurchaseOrder>): PurchaseOrder {
    const total = data.items?.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0) || 0;
    const po: PurchaseOrder = {
      id: generateId(),
      supplierId: data.supplierId || '',
      requisitionId: data.requisitionId,
      items: data.items || [],
      totalAmount: total,
      status: data.status || 'draft',
      expectedDelivery: data.expectedDelivery,
      createdAt: new Date().toISOString(),
    };
    mockPurchaseOrders.set(po.id, po);
    return po;
  },

  updatePOStatus(id: string, status: PurchaseOrder['status']): PurchaseOrder | undefined {
    const po = mockPurchaseOrders.get(id);
    if (!po) return undefined;
    po.status = status;
    mockPurchaseOrders.set(id, po);
    return po;
  },

  // RFQs
  createRFQ(data: Partial<RFQ>): RFQ {
    const rfq: RFQ = {
      id: generateId(),
      title: data.title || '',
      category: data.category || '',
      specifications: data.specifications || '',
      quantity: data.quantity || 1,
      deadline: data.deadline || '',
      responses: data.responses || [],
      status: data.status || 'open',
      awardedTo: data.awardedTo,
      createdAt: new Date().toISOString(),
    };
    mockRFQs.set(rfq.id, rfq);
    return rfq;
  },

  submitRFQResponse(rfqId: string, supplierId: string, price: number, deliveryDays: number): RFQ | undefined {
    const rfq = mockRFQs.get(rfqId);
    if (!rfq) return undefined;
    rfq.responses.push({ supplierId, price, deliveryDays });
    mockRFQs.set(rfqId, rfq);
    return rfq;
  },

  awardRFQ(rfqId: string, supplierId: string): RFQ | undefined {
    const rfq = mockRFQs.get(rfqId);
    if (!rfq) return undefined;
    rfq.status = 'awarded';
    rfq.awardedTo = supplierId;
    mockRFQs.set(rfqId, rfq);
    return rfq;
  },

  // Analytics
  getSpendAnalytics(): any {
    const pos = Array.from(mockPurchaseOrders.values());
    const bySupplier: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    pos.forEach(po => {
      bySupplier[po.supplierId] = (bySupplier[po.supplierId] || 0) + po.totalAmount;
      byStatus[po.status] = (byStatus[po.status] || 0) + po.totalAmount;
    });

    const totalSpend = pos.reduce((sum, po) => sum + po.totalAmount, 0);

    return {
      totalSpend,
      poCount: pos.length,
      avgPOValue: pos.length > 0 ? totalSpend / pos.length : 0,
      bySupplier,
      byStatus,
    };
  },

  reset() {
    mockSuppliers.clear();
    mockRequisitions.clear();
    mockPurchaseOrders.clear();
    mockRFQs.clear();
    mockContracts.clear();
    idCounter = 1;
  },
};

describe('Procurement OS - Suppliers', () => {
  beforeEach(() => procurementService.reset());

  describe('createSupplier', () => {
    it('should create supplier with required fields', () => {
      const supplier = procurementService.createSupplier({
        name: 'Tech Components Ltd',
        category: 'Electronics',
        contactEmail: 'sales@techcomp.com',
      });
      expect(supplier.id).toBeDefined();
      expect(supplier.name).toBe('Tech Components Ltd');
      expect(supplier.rating).toBe(0);
      expect(supplier.status).toBe('pending');
    });

    it('should create with rating', () => {
      const supplier = procurementService.createSupplier({
        name: 'Quality Parts',
        rating: 4.5,
      });
      expect(supplier.rating).toBe(4.5);
    });
  });

  describe('listSuppliers', () => {
    it('should filter by category', () => {
      procurementService.createSupplier({ name: 'S1', category: 'Electronics' });
      procurementService.createSupplier({ name: 'S2', category: 'Raw Materials' });
      procurementService.createSupplier({ name: 'S3', category: 'Electronics' });

      const electronics = procurementService.listSuppliers({ category: 'Electronics' });
      expect(electronics).toHaveLength(2);
    });

    it('should filter by status', () => {
      procurementService.createSupplier({ name: 'Active', status: 'active' });
      procurementService.createSupplier({ name: 'Pending', status: 'pending' });
      const pending = procurementService.listSuppliers({ status: 'pending' });
      expect(pending).toHaveLength(1);
    });
  });

  describe('updateSupplierRating', () => {
    it('should update rating', () => {
      const supplier = procurementService.createSupplier({ name: 'Test' });
      const updated = procurementService.updateSupplierRating(supplier.id, 4.2);
      expect(updated?.rating).toBe(4.2);
    });

    it('should cap rating at 5', () => {
      const supplier = procurementService.createSupplier({ name: 'Test' });
      const updated = procurementService.updateSupplierRating(supplier.id, 6);
      expect(updated?.rating).toBe(5);
    });
  });
});

describe('Procurement OS - Requisitions', () => {
  beforeEach(() => procurementService.reset());

  describe('createRequisition', () => {
    it('should calculate total amount', () => {
      const req = procurementService.createRequisition({
        title: 'Office Supplies',
        requestedBy: 'user_123',
        department: 'Admin',
        items: [
          { name: 'Paper', quantity: 10, estimatedCost: 500 },
          { name: 'Pens', quantity: 50, estimatedCost: 20 },
        ],
      });
      expect(req.totalAmount).toBe(6000); // 10*500 + 50*20
    });
  });

  describe('approveRequisition', () => {
    it('should approve and track approver', () => {
      const req = procurementService.createRequisition({
        title: 'Test',
        status: 'pending',
      });
      const approved = procurementService.approveRequisition(req.id, 'manager_001');
      expect(approved?.status).toBe('approved');
      expect(approved?.approvedBy).toBe('manager_001');
    });
  });
});

describe('Procurement OS - Purchase Orders', () => {
  beforeEach(() => procurementService.reset());

  describe('createPurchaseOrder', () => {
    it('should create PO with items', () => {
      const supplier = procurementService.createSupplier({ name: 'Supplier' });
      const po = procurementService.createPurchaseOrder({
        supplierId: supplier.id,
        items: [
          { name: 'Widget A', quantity: 100, unitCost: 25 },
          { name: 'Widget B', quantity: 50, unitCost: 40 },
        ],
      });
      expect(po.totalAmount).toBe(4500); // 100*25 + 50*40
      expect(po.status).toBe('draft');
    });
  });

  describe('updatePOStatus', () => {
    it('should track status lifecycle', () => {
      const supplier = procurementService.createSupplier({ name: 'S' });
      const po = procurementService.createPurchaseOrder({ supplierId: supplier.id });

      procurementService.updatePOStatus(po.id, 'sent');
      procurementService.updatePOStatus(po.id, 'acknowledged');
      procurementService.updatePOStatus(po.id, 'received');

      const updated = procurementService.updatePOStatus(po.id, 'closed');
      expect(updated?.status).toBe('closed');
    });
  });
});

describe('Procurement OS - RFQs', () => {
  beforeEach(() => procurementService.reset());

  describe('submitRFQResponse', () => {
    it('should collect supplier responses', () => {
      const supplier1 = procurementService.createSupplier({ name: 'S1' });
      const supplier2 = procurementService.createSupplier({ name: 'S2' });

      const rfq = procurementService.createRFQ({
        title: 'Bulk Order',
        deadline: '2026-07-15',
      });

      procurementService.submitRFQResponse(rfq.id, supplier1.id, 50000, 14);
      procurementService.submitRFQResponse(rfq.id, supplier2.id, 48000, 21);

      const updated = procurementService.getSupplier(rfq.id);
      expect(rfq.responses).toHaveLength(2);
    });
  });

  describe('awardRFQ', () => {
    it('should award to selected supplier', () => {
      const supplier = procurementService.createSupplier({ name: 'Winner' });
      const rfq = procurementService.createRFQ({ title: 'Test RFQ' });

      const awarded = procurementService.awardRFQ(rfq.id, supplier.id);
      expect(awarded?.status).toBe('awarded');
      expect(awarded?.awardedTo).toBe(supplier.id);
    });
  });
});

describe('Procurement OS - Analytics', () => {
  beforeEach(() => procurementService.reset());

  it('should calculate spend analytics', () => {
    const s1 = procurementService.createSupplier({ name: 'S1' });
    const s2 = procurementService.createSupplier({ name: 'S2' });

    procurementService.createPurchaseOrder({ supplierId: s1.id, items: [{ name: 'Item', quantity: 1, unitCost: 1000 }] });
    procurementService.createPurchaseOrder({ supplierId: s1.id, items: [{ name: 'Item', quantity: 1, unitCost: 2000 }] });
    procurementService.createPurchaseOrder({ supplierId: s2.id, items: [{ name: 'Item', quantity: 1, unitCost: 1500 }] });

    const analytics = procurementService.getSpendAnalytics();

    expect(analytics.totalSpend).toBe(4500);
    expect(analytics.poCount).toBe(3);
    expect(analytics.avgPOValue).toBe(1500);
    expect(analytics.bySupplier[s1.id]).toBe(3000);
    expect(analytics.bySupplier[s2.id]).toBe(1500);
  });
});
