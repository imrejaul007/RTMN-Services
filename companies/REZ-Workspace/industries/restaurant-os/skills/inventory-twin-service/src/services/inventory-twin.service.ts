import { v4 as uuidv4 } from 'uuid';
import { InventoryTwin } from '../models/inventory-twin.model';
import {
  CreateInventoryTwinRequest,
  CreateInventoryTwinResponse,
  GetInventoryTwinResponse,
  AddInventoryItemRequest,
  AdjustStockRequest,
  LogWasteRequest,
  CreatePurchaseOrderRequest,
  GetInventoryAnalyticsResponse,
  ItemCategory,
  UrgencyLevel
} from '../schemas/inventory-twin.schema';
import { logger } from '../utils/logger';
import { messageBroker } from '../utils/message-broker';
import { procurementClient, ProcurementRfqItem } from '../utils/procurement-client';
import { sutartAgentIdClient } from '../utils/sutar-client';
import { memoryOsClient } from '../utils/memory-client';

export class InventoryTwinService {
  async createInventoryTwin(request: CreateInventoryTwinRequest): Promise<CreateInventoryTwinResponse> {
    const inventoryId = uuidv4();
    const twinId = `twin.restaurant.inventory.${inventoryId}`;

    logger.info('Creating Inventory Twin', { inventoryId, restaurantId: request.restaurantId });

    const existingTwin = await InventoryTwin.findByInventoryId(inventoryId);
    if (existingTwin) {
      throw new Error(`Inventory Twin already exists for inventoryId: ${inventoryId}`);
    }

    const items = request.items?.map(item => ({
      itemId: uuidv4(),
      name: item.name,
      category: item.category,
      currentStock: item.currentStock,
      unit: item.unit,
      reorderPoint: item.reorderPoint,
      reorderQuantity: item.reorderQuantity || 50,
      costPerUnit: item.costPerUnit || 0,
      expiryDate: item.expiryDate,
      location: item.location || 'main',
      suppliers: [],
      consumptionRate: 0,
      daysUntilStockout: 999
    })) || [];

    const inventoryTwin = new InventoryTwin({
      twinId,
      inventoryId,
      restaurantId: request.restaurantId,
      items,
      wasteLog: [],
      totalValue: items.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0)
    });

    inventoryTwin.checkReorderPoints();
    inventoryTwin.checkExpiryAlerts();

    await inventoryTwin.save();

    await messageBroker.publish('restaurant.inventory.created', {
      twinId,
      inventoryId,
      restaurantId: request.restaurantId,
      twinOsEntityId: twinId,
      timestamp: new Date().toISOString()
    });

    logger.info('Inventory Twin created successfully', { twinId, inventoryId });

    return {
      twinId,
      inventoryId,
      twinOsEntityId: twinId,
      createdAt: inventoryTwin.createdAt.toISOString()
    };
  }

  async getInventoryTwin(inventoryId: string): Promise<GetInventoryTwinResponse> {
    logger.info('Fetching Inventory Twin', { inventoryId });

    const inventoryTwin = await InventoryTwin.findByInventoryId(inventoryId);
    if (!inventoryTwin) {
      throw new Error(`Inventory Twin not found for inventoryId: ${inventoryId}`);
    }

    return inventoryTwin.toJSON() as GetInventoryTwinResponse;
  }

  async addItem(inventoryId: string, request: AddInventoryItemRequest): Promise<void> {
    logger.info('Adding item to Inventory Twin', { inventoryId, itemName: request.name });

    const inventoryTwin = await InventoryTwin.findByInventoryId(inventoryId);
    if (!inventoryTwin) {
      throw new Error(`Inventory Twin not found for inventoryId: ${inventoryId}`);
    }

    const newItem = {
      itemId: uuidv4(),
      name: request.name,
      category: request.category,
      currentStock: request.currentStock,
      unit: request.unit,
      reorderPoint: request.reorderPoint,
      reorderQuantity: request.reorderQuantity || 50,
      costPerUnit: request.costPerUnit || 0,
      expiryDate: request.expiryDate,
      location: request.location || 'main',
      suppliers: request.suppliers || [],
      consumptionRate: 0,
      daysUntilStockout: 999
    };

    inventoryTwin.items.push(newItem);
    inventoryTwin.calculateTotalValue();
    inventoryTwin.checkReorderPoints();
    inventoryTwin.checkExpiryAlerts();

    await inventoryTwin.save();

    await messageBroker.publish('restaurant.inventory.item.added', {
      twinId: inventoryTwin.twinId,
      inventoryId,
      item: newItem,
      timestamp: new Date().toISOString()
    });
  }

  async adjustStock(inventoryId: string, request: AdjustStockRequest): Promise<void> {
    logger.info('Adjusting stock', { inventoryId, itemId: request.itemId, quantity: request.quantity });

    const inventoryTwin = await InventoryTwin.findByInventoryId(inventoryId);
    if (!inventoryTwin) {
      throw new Error(`Inventory Twin not found for inventoryId: ${inventoryId}`);
    }

    const item = inventoryTwin.items.find(i => i.itemId === request.itemId);
    if (!item) {
      throw new Error(`Item not found: ${request.itemId}`);
    }

    if (request.isAddition) {
      item.currentStock += request.quantity;
    } else {
      item.currentStock = Math.max(0, item.currentStock - request.quantity);
    }

    // Calculate days until stockout
    if (item.consumptionRate > 0) {
      item.daysUntilStockout = Math.floor(item.currentStock / item.consumptionRate);
    }

    inventoryTwin.calculateTotalValue();
    inventoryTwin.checkReorderPoints();
    inventoryTwin.checkExpiryAlerts();

    await inventoryTwin.save();

    await messageBroker.publish('restaurant.inventory.stock.adjusted', {
      twinId: inventoryTwin.twinId,
      inventoryId,
      itemId: request.itemId,
      newStock: item.currentStock,
      reason: request.reason,
      timestamp: new Date().toISOString()
    });
  }

  async deductForOrder(inventoryId: string, orderId: string, items: { menuItemId: string; name: string; quantity: number }[]): Promise<void> {
    logger.info('Deducting inventory for order', { inventoryId, orderId });

    const inventoryTwin = await InventoryTwin.findByInventoryId(inventoryId);
    if (!inventoryTwin) {
      throw new Error(`Inventory Twin not found for inventoryId: ${inventoryId}`);
    }

    // In a real implementation, this would look up the recipe/BOM for each item
    // and deduct the ingredients accordingly
    for (const orderItem of items) {
      // This is a simplified version - real implementation would use BOM
      logger.debug('Processing order item', { menuItemId: orderItem.menuItemId, quantity: orderItem.quantity });
    }

    await inventoryTwin.save();
  }

  async logWaste(inventoryId: string, request: LogWasteRequest): Promise<void> {
    logger.info('Logging waste', { inventoryId, itemId: request.itemId, quantity: request.quantity });

    const inventoryTwin = await InventoryTwin.findByInventoryId(inventoryId);
    if (!inventoryTwin) {
      throw new Error(`Inventory Twin not found for inventoryId: ${inventoryId}`);
    }

    const item = inventoryTwin.items.find(i => i.itemId === request.itemId);
    if (!item) {
      throw new Error(`Item not found: ${request.itemId}`);
    }

    const wasteEntry = {
      date: new Date().toISOString(),
      itemId: request.itemId,
      itemName: item.name,
      quantity: request.quantity,
      reason: request.reason,
      estimatedCost: request.quantity * item.costPerUnit
    };

    inventoryTwin.wasteLog.push(wasteEntry);
    item.currentStock = Math.max(0, item.currentStock - request.quantity);

    inventoryTwin.calculateTotalValue();
    inventoryTwin.checkReorderPoints();

    await inventoryTwin.save();

    await messageBroker.publish('restaurant.inventory.waste.logged', {
      twinId: inventoryTwin.twinId,
      inventoryId,
      waste: wasteEntry,
      timestamp: new Date().toISOString()
    });
  }

  async createPurchaseOrder(inventoryId: string, request: CreatePurchaseOrderRequest): Promise<{
    purchaseOrderId: string;
    items: { itemId: string; name: string; quantity: number; supplier: string; estimatedCost: number }[];
    totalCost: number;
    rfqId?: string;
    procurementStatus: 'dispatched' | 'queued_locally' | 'no_restaurant_corp';
    sutartAgent?: { agentId: string; registered: boolean; error?: string };
  }> {
    logger.info('Creating purchase order', { inventoryId, itemCount: request.items.length });

    const inventoryTwin = await InventoryTwin.findByInventoryId(inventoryId);
    if (!inventoryTwin) {
      throw new Error(`Inventory Twin not found for inventoryId: ${inventoryId}`);
    }

    const purchaseOrderId = uuidv4();
    const orderItems: { itemId: string; name: string; quantity: number; supplier: string; estimatedCost: number; category?: string; unit?: string }[] = [];
    let totalCost = 0;
    const rfqItems: ProcurementRfqItem[] = [];

    for (const orderItem of request.items) {
      const item = inventoryTwin.items.find(i => i.itemId === orderItem.itemId);
      if (!item) continue;

      const supplier = orderItem.supplierId
        ? item.suppliers.find(s => s.supplierId === orderItem.supplierId)
        : item.suppliers[0];

      const cost = (supplier?.costPerUnit || item.costPerUnit) * orderItem.quantity;
      totalCost += cost;

      orderItems.push({
        itemId: item.itemId,
        name: item.name,
        quantity: orderItem.quantity,
        supplier: supplier?.name || 'Default',
        estimatedCost: cost,
        category: item.category,
        unit: item.unit,
      });

      rfqItems.push({
        itemId: item.itemId,
        name: item.name,
        quantity: orderItem.quantity,
        unit: item.unit,
        preferredSupplierId: supplier?.supplierId,
        category: item.category,
      });
    }

    // Phase 7 of NEXHA-AUDIT-V2 + v3: this is the "AI" in "Restaurant AI
    // needs 500kg rice". The flow is:
    //   1. Register a SUTAR agent for this reorder (the AI's identity)
    //   2. The agent dispatches an RFQ to procurement-os
    //   3. The agent tracks the outcome (memory, reputation, learning)
    //
    // Both steps are fail-open: if SUTAR is down, we still dispatch
    // to procurement. If procurement is down, we still record the PO
    // locally. The vision is that the AI is resilient.

    const buyerCorpId = inventoryTwin.restaurantId;
    const expectedAgentId = `agent-restaurant-${inventoryTwin.restaurantId}-reorder`;

    let rfqId: string | undefined;
    let procurementStatus: 'dispatched' | 'queued_locally' | 'no_restaurant_corp' = 'no_restaurant_corp';
    let sutartAgent: { agentId: string; registered: boolean; error?: string } | undefined;

    // Step 1: register the SUTAR agent that handles this reorder.
    const agentResult = await sutartAgentIdClient.registerReorderAgent({
      restaurantId: inventoryTwin.restaurantId,
      agentId: expectedAgentId,
      name: `${inventoryTwin.restaurantId} Reorder Agent`,
    });

    sutartAgent = {
      agentId: expectedAgentId,
      registered: agentResult.ok,
      error: agentResult.ok ? undefined : agentResult.error,
    };

    if (rfqItems.length > 0 && buyerCorpId) {
      const urgency: 'low' | 'normal' | 'high' | 'critical' =
        inventoryTwin.reorderAlerts.some((a) => a.urgency === 'CRITICAL')
          ? 'critical'
          : inventoryTwin.reorderAlerts.some((a) => a.urgency === 'HIGH')
            ? 'high'
            : 'normal';

      // Step 2: dispatch RFQ via the agent (via procurement-os).
      const result = await procurementClient.createRfqFromReorder({
        buyerCorpId,
        restaurantId: inventoryTwin.restaurantId,
        twinId: inventoryTwin.twinId,
        source: agentResult.ok ? `sutart-agent:${expectedAgentId}` : 'inventory-twin',
        title: `Reorder for ${inventoryTwin.restaurantId}`,
        description: `Auto-generated by ${sutartAgent?.agentId ?? 'inventory-twin'} (${inventoryTwin.reorderAlerts.length} alerts)`,
        urgency,
        items: rfqItems,
      });

      rfqId = result.rfq?.rfqId;
      procurementStatus = result.queuedLocally ? 'queued_locally' : 'dispatched';

      await messageBroker.publish(
        result.queuedLocally
          ? 'restaurant.inventory.purchaseorder.queued_locally'
          : 'restaurant.inventory.purchaseorder.dispatched_to_procurement',
        {
          twinId: inventoryTwin.twinId,
          inventoryId,
          purchaseOrderId,
          rfqId,
          sutartAgent,
          items: orderItems,
          totalCost,
          timestamp: new Date().toISOString(),
          error: result.error,
        }
      );
    } else {
      await messageBroker.publish('restaurant.inventory.purchaseorder.created', {
        twinId: inventoryTwin.twinId,
        inventoryId,
        purchaseOrderId,
        sutartAgent,
        items: orderItems,
        totalCost,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info('Purchase order created', {
      inventoryId,
      purchaseOrderId,
      rfqId,
      sutartAgentId: sutartAgent?.agentId,
      sutartAgentRegistered: sutartAgent?.registered,
      procurementStatus,
      totalCost,
    });

    // Phase 7 of NEXHA-AUDIT-V3 (Tier 1, item 3): write a memory record
    // so the restaurant's MemoryOS twin captures this reorder. Future
    // SUTAR agents can search past reorders before negotiating
    // (e.g. "this supplier always delivers 2 days late, factor that into ETA").
    const urgency =
      inventoryTwin.reorderAlerts.some((a) => a.urgency === 'CRITICAL')
        ? 'critical'
        : inventoryTwin.reorderAlerts.some((a) => a.urgency === 'HIGH')
          ? 'high'
          : 'normal';

    const memoryResult = await memoryOsClient.writeMemory({
      twinId: `restaurant.${inventoryTwin.restaurantId}`,
      type: 'episodic',
      importance: urgency === 'critical' ? 'Critical' : urgency === 'high' ? 'High' : 'Medium',
      content: `Reorder triggered for ${inventoryTwin.restaurantId}: ${orderItems.length} items, total ₹${totalCost.toFixed(2)}, urgency=${urgency}, dispatchStatus=${procurementStatus}`,
      tags: ['reorder', 'inventory-twin', `urgency:${urgency}`, procurementStatus],
      metadata: {
        purchaseOrderId,
        rfqId,
        sutartAgentId: sutartAgent?.agentId,
        sutartAgentRegistered: sutartAgent?.registered,
        itemCount: orderItems.length,
        totalCost,
        items: orderItems.map((i) => ({ itemId: i.itemId, quantity: i.quantity, supplier: i.supplier })),
        timestamp: new Date().toISOString(),
      },
    });

    if (memoryResult.ok) {
      logger.info('Memory recorded for reorder', {
        memoryId: memoryResult.memoryId,
        purchaseOrderId,
        twinId: `restaurant.${inventoryTwin.restaurantId}`,
      });
    } else {
      logger.warn('Memory write skipped/failed (continuing)', {
        error: memoryResult.error,
        skipped: memoryResult.skipped,
        purchaseOrderId,
      });
    }

    return {
      purchaseOrderId,
      items: orderItems,
      totalCost,
      rfqId,
      procurementStatus,
      sutartAgent,
    };
  }

  async getInventoryAnalytics(inventoryId: string): Promise<GetInventoryAnalyticsResponse> {
    logger.info('Getting inventory analytics', { inventoryId });

    const inventoryTwin = await InventoryTwin.findByInventoryId(inventoryId);
    if (!inventoryTwin) {
      throw new Error(`Inventory Twin not found for inventoryId: ${inventoryId}`);
    }

    const totalItems = inventoryTwin.items.length;
    const lowStockCount = inventoryTwin.reorderAlerts.length;
    const expiringCount = inventoryTwin.expiringAlerts.length;

    // Calculate waste this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const wasteThisMonth = inventoryTwin.wasteLog
      .filter(w => new Date(w.date) >= startOfMonth)
      .reduce((sum, w) => sum + w.estimatedCost, 0);

    // Top consumed items
    const topConsumedItems = inventoryTwin.items
      .filter(i => i.consumptionRate > 0)
      .sort((a, b) => b.consumptionRate - a.consumptionRate)
      .slice(0, 10)
      .map(i => ({
        itemId: i.itemId,
        name: i.name,
        consumption: i.consumptionRate
      }));

    return {
      totalItems,
      totalValue: inventoryTwin.totalValue,
      lowStockCount,
      expiringCount,
      wasteThisMonth,
      avgFoodCostPercentage: 0, // Would be calculated from sales data
      topConsumedItems
    };
  }

  async deleteInventoryTwin(inventoryId: string): Promise<void> {
    logger.info('Deleting Inventory Twin', { inventoryId });

    const result = await InventoryTwin.deleteOne({ inventoryId });
    if (result.deletedCount === 0) {
      throw new Error(`Inventory Twin not found for inventoryId: ${inventoryId}`);
    }

    await messageBroker.publish('restaurant.inventory.deleted', {
      inventoryId,
      timestamp: new Date().toISOString()
    });
  }
}

export const inventoryTwinService = new InventoryTwinService();