/**
 * NeXha ManufacturingOS - Core Service
 */

import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface BOM {
  id: string;
  productId: string;
  productName: string;
  version: string;
  components: Array<{
    componentId: string;
    componentName: string;
    quantity: number;
    unit: string;
    wastagePercent?: number;
  }>;
  instructions?: string;
  createdAt: Date;
}

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  productId: string;
  productName: string;
  quantity: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledStart?: Date;
  scheduledEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  outputBatchId?: string;
  notes?: string;
  createdAt: Date;
}

export interface Batch {
  id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  quantity: number;
  producedAt: Date;
  expiresAt?: Date;
  status: 'produced' | 'quality_check' | 'approved' | 'rejected' | 'released';
  qualityChecks: Array<{
    check: string;
    result: 'pass' | 'fail';
    notes?: string;
  }>;
}

export interface MaterialRequirement {
  id: string;
  productId: string;
  productName: string;
  required: number;
  available: number;
  shortage: number;
  status: 'sufficient' | 'low' | 'critical';
  suppliers?: Array<{ supplierId: string; name: string; leadTime: string }>;
}

const store = {
  boms: new Map<string, BOM>(),
  productionOrders: new Map<string, ProductionOrder>(),
  batches: new Map<string, Batch>(),
};

// ============================================================================
// BOM Service
// ============================================================================

export class BOMService {
  async createBOM(input: {
    productId: string;
    productName: string;
    components: BOM['components'];
    instructions?: string;
  }): Promise<BOM> {
    const bom: BOM = {
      id: randomUUID(),
      ...input,
      version: '1.0',
      createdAt: new Date(),
    };
    store.boms.set(bom.id, bom);
    return bom;
  }

  async getBOM(id: string): Promise<BOM | null> {
    return store.boms.get(id) || null;
  }

  async getBOMByProduct(productId: string): Promise<BOM | null> {
    return Array.from(store.boms.values()).find(b => b.productId === productId) || null;
  }
}

// ============================================================================
// Production Service
// ============================================================================

export class ProductionService {
  async createOrder(input: {
    productId: string;
    productName: string;
    quantity: number;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    scheduledStart?: Date;
    notes?: string;
  }): Promise<ProductionOrder> {
    const order: ProductionOrder = {
      id: randomUUID(),
      orderNumber: `PRD-${Date.now().toString(36).toUpperCase()}`,
      productId: input.productId,
      productName: input.productName,
      quantity: input.quantity,
      status: 'planned',
      priority: input.priority || 'medium',
      scheduledStart: input.scheduledStart,
      notes: input.notes,
      createdAt: new Date(),
    };
    store.productionOrders.set(order.id, order);
    return order;
  }

  async startProduction(id: string): Promise<ProductionOrder | null> {
    const order = store.productionOrders.get(id);
    if (!order) return null;
    order.status = 'in_progress';
    order.actualStart = new Date();
    store.productionOrders.set(id, order);
    return order;
  }

  async completeProduction(id: string, outputQuantity: number): Promise<Batch | null> {
    const order = store.productionOrders.get(id);
    if (!order) return null;

    const batch: Batch = {
      id: randomUUID(),
      batchNumber: `BAT-${Date.now().toString(36).toUpperCase()}`,
      productId: order.productId,
      productName: order.productName,
      quantity: outputQuantity,
      producedAt: new Date(),
      status: 'produced',
      qualityChecks: [],
    };

    order.status = 'completed';
    order.actualEnd = new Date();
    order.outputBatchId = batch.id;

    store.batches.set(batch.id, batch);
    store.productionOrders.set(id, order);
    return batch;
  }

  async getOrders(filters?: { status?: ProductionOrder['status'] }): Promise<ProductionOrder[]> {
    let results = Array.from(store.productionOrders.values());
    if (filters?.status) {
      results = results.filter(o => o.status === filters.status);
    }
    return results;
  }
}

// ============================================================================
// Quality Service
// ============================================================================

export class QualityService {
  async addQualityCheck(batchId: string, check: string, result: 'pass' | 'fail', notes?: string): Promise<Batch | null> {
    const batch = store.batches.get(batchId);
    if (!batch) return null;

    batch.qualityChecks.push({ check, result, notes });
    batch.status = 'quality_check';
    store.batches.set(batchId, batch);
    return batch;
  }

  async approveBatch(batchId: string): Promise<Batch | null> {
    const batch = store.batches.get(batchId);
    if (!batch) return null;

    const failedChecks = batch.qualityChecks.filter(c => c.result === 'fail');
    if (failedChecks.length > 0) {
      batch.status = 'rejected';
    } else {
      batch.status = 'approved';
    }
    store.batches.set(batchId, batch);
    return batch;
  }

  async releaseBatch(batchId: string): Promise<Batch | null> {
    const batch = store.batches.get(batchId);
    if (!batch) return null;
    batch.status = 'released';
    store.batches.set(batchId, batch);
    return batch;
  }
}

// ============================================================================
// MRP Service (Material Requirements Planning)
// ============================================================================

export class MRPService {
  async calculateRequirements(productId: string, quantity: number): Promise<MaterialRequirement[]> {
    const bom = await new BOMService().getBOMByProduct(productId);
    if (!bom) return [];

    return bom.components.map(comp => ({
      id: randomUUID(),
      productId: comp.componentId,
      productName: comp.componentName,
      required: comp.quantity * quantity,
      available: 0, // Would come from inventory
      shortage: comp.quantity * quantity,
      status: 'low' as const,
    }));
  }
}

export const bomService = new BOMService();
export const productionService = new ProductionService();
export const qualityService = new QualityService();
export const mrpService = new MRPService();
