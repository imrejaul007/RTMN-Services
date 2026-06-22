/**
 * HOJAI Manufacturing MES Service
 * Production planning, quality control, IoT integration
 * Reuses: NeXha pattern
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  bom: { materialId: string; quantity: number }[];
  processTime: number; // minutes per unit
  workstationId: string;
  qualityChecks: string[];
}

interface WorkOrder {
  id: string;
  orderNo: string;
  productId: string;
  productName: string;
  quantity: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'planned' | 'released' | 'in_progress' | 'completed' | 'cancelled';
  workstationId?: string;
  operatorId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  output: number;
  rejected: number;
  notes?: string;
  createdAt: string;
}

interface Workstation {
  id: string;
  name: string;
  type: string;
  status: 'available' | 'running' | 'maintenance' | 'offline';
  currentWorkOrder?: string;
  operators: string[];
  oee: number; // Overall Equipment Effectiveness
  lastMaintenance?: string;
  nextMaintenance?: string;
}

interface QualityInspection {
  id: string;
  workOrderId: string;
  type: 'incoming' | 'in_process' | 'final';
  status: 'pending' | 'passed' | 'failed';
  quantityInspected: number;
  quantityPassed: number;
  defects: { name: string; count: number }[];
  inspector: string;
  timestamp: string;
}

interface MachineData {
  machineId: string;
  timestamp: string;
  running: boolean;
  cycleTime: number;
  outputCount: number;
  temperature?: number;
  vibration?: number;
  powerConsumption?: number;
}

const products = new Map<string, Product>();
const workOrders = new Map<string, WorkOrder>();
const workstations = new Map<string, Workstation>();
const inspections = new Map<string, QualityInspection>();
const machineData = new Map<string, MachineData[]>();

// Products
router.post('/products', async (req, res) => {
  try {
    const product: Product = { ...req.body, id: uuidv4() };
    products.set(product.id, product);
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.get('/products', async (req, res) => {
  try {
    const result = Array.from(products.values());
    res.json({ products: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Workstations
router.post('/workstations', async (req, res) => {
  try {
    const ws: Workstation = { ...req.body, id: uuidv4(), status: 'available', oee: 0 };
    workstations.set(ws.id, ws);
    res.status(201).json({ success: true, workstation: ws });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create workstation' });
  }
});

router.get('/workstations', async (req, res) => {
  try {
    const { status } = req.query;
    let result = Array.from(workstations.values());
    if (status) result = result.filter(w => w.status === status);
    res.json({ workstations: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workstations' });
  }
});

router.patch('/workstations/:id/status', async (req, res) => {
  try {
    const ws = workstations.get(req.params.id);
    if (!ws) return res.status(404).json({ error: 'Workstation not found' });
    ws.status = req.body.status;
    workstations.set(ws.id, ws);
    res.json({ success: true, workstation: ws });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Work Orders
router.post('/workorders', async (req, res) => {
  try {
    const { productId, quantity, priority, scheduledStart } = req.body;

    const product = products.get(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const workOrder: WorkOrder = {
      id: uuidv4(),
      orderNo: `WO-${Date.now()}`,
      productId,
      productName: product.name,
      quantity,
      priority: priority || 'normal',
      status: 'planned',
      output: 0,
      rejected: 0,
      createdAt: new Date().toISOString(),
    };

    if (scheduledStart) {
      workOrder.scheduledStart = scheduledStart;
      workOrder.scheduledEnd = new Date(new Date(scheduledStart).getTime() + product.processTime * quantity * 60000).toISOString();
    }

    workOrders.set(workOrder.id, workOrder);
    res.status(201).json({ success: true, workOrder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create work order' });
  }
});

router.get('/workorders', async (req, res) => {
  try {
    const { status, priority } = req.query;
    let result = Array.from(workOrders.values());

    if (status) result = result.filter(w => w.status === status);
    if (priority) result = result.filter(w => w.priority === priority);

    result.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
    });

    res.json({ workOrders: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
});

router.patch('/workorders/:id/start', async (req, res) => {
  try {
    const wo = workOrders.get(req.params.id);
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    wo.status = 'in_progress';
    wo.actualStart = new Date().toISOString();

    if (req.body.workstationId) {
      wo.workstationId = req.body.workstationId;
      const ws = workstations.get(req.body.workstationId);
      if (ws) {
        ws.status = 'running';
        ws.currentWorkOrder = wo.id;
        workstations.set(ws.id, ws);
      }
    }

    if (req.body.operatorId) wo.operatorId = req.body.operatorId;

    workOrders.set(wo.id, wo);
    res.json({ success: true, workOrder: wo });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start work order' });
  }
});

router.patch('/workorders/:id/complete', async (req, res) => {
  try {
    const { output, rejected, notes } = req.body;
    const wo = workOrders.get(req.params.id);

    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    wo.status = 'completed';
    wo.actualEnd = new Date().toISOString();
    wo.output = output || wo.quantity;
    wo.rejected = rejected || 0;
    if (notes) wo.notes = notes;

    if (wo.workstationId) {
      const ws = workstations.get(wo.workstationId);
      if (ws) {
        ws.status = 'available';
        ws.currentWorkOrder = undefined;
        workstations.set(ws.id, ws);
      }
    }

    workOrders.set(wo.id, wo);
    res.json({ success: true, workOrder: wo });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete work order' });
  }
});

// Quality Inspections
router.post('/inspections', async (req, res) => {
  try {
    const inspection: QualityInspection = {
      ...req.body,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    inspections.set(inspection.id, inspection);
    res.status(201).json({ success: true, inspection });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create inspection' });
  }
});

router.get('/inspections', async (req, res) => {
  try {
    const { workOrderId, status } = req.query;
    let result = Array.from(inspections.values());

    if (workOrderId) result = result.filter(i => i.workOrderId === workOrderId);
    if (status) result = result.filter(i => i.status === status);

    res.json({ inspections: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inspections' });
  }
});

// IoT Data (simulated)
router.post('/iot/data', async (req, res) => {
  try {
    const data: MachineData = { ...req.body, timestamp: new Date().toISOString() };

    if (!machineData.has(data.machineId)) {
      machineData.set(data.machineId, []);
    }
    machineData.get(data.machineId)?.push(data);

    // Keep last 1000 readings
    const readings = machineData.get(data.machineId) || [];
    if (readings.length > 1000) readings.shift();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record IoT data' });
  }
});

router.get('/iot/:machineId/latest', async (req, res) => {
  try {
    const readings = machineData.get(req.params.machineId);
    res.json({ data: readings?.[readings.length - 1] || null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch IoT data' });
  }
});

// Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const planned = Array.from(workOrders.values()).filter(w => w.status === 'planned').length;
    const inProgress = Array.from(workOrders.values()).filter(w => w.status === 'in_progress').length;
    const completed = Array.from(workOrders.values()).filter(w => w.status === 'completed').length;

    const workstationsRunning = Array.from(workstations.values()).filter(w => w.status === 'running').length;
    const avgOEE = Array.from(workstations.values()).reduce((sum, w) => sum + w.oee, 0) / Math.max(workstations.size, 1);

    const pendingInspections = Array.from(inspections.values()).filter(i => i.status === 'pending').length;

    res.json({
      workOrders: { planned, inProgress, completed },
      workstations: { total: workstations.size, running: workstationsRunning, avgOEE: Math.round(avgOEE) },
      quality: { pendingInspections },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

export { router, products, workOrders, workstations, inspections, machineData };
