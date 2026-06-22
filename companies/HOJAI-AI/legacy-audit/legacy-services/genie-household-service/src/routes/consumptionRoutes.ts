/**
 * GENIE Household Service - Consumption Routes
 * FreshMart 7AM Story: "Genie notices Karim's household is low on milk, eggs, vegetables"
 *
 * Routes for household inventory tracking and reorder suggestions
 */

import { Router, Request, Response } from 'express';
import {
  HouseholdInventoryItem,
  ConsumptionLog,
  ReorderSuggestion,
  ConsumptionPattern
} from '../models/consumption.model';

const router = Router();

// ============================================================================
// Inventory Routes
// ============================================================================

/**
 * GET /api/consumption/inventory/:householdId
 * Get household inventory items
 */
router.get('/inventory/:householdId', async (req: Request, res: Response) => {
  try {
    const { householdId } = req.params;
    const { status, category, userId } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string;

    const filter: Record<string, unknown> = { household_id: householdId, tenant_id: tenantId };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (userId) filter.user_id = userId;

    const items = await HouseholdInventoryItem.find(filter).sort({ status: 1, days_until_empty: 1 });

    res.json({
      success: true,
      householdId,
      items,
      summary: {
        total: items.length,
        wellStocked: items.filter(i => i.status === 'well_stocked').length,
        runningLow: items.filter(i => i.status === 'running_low').length,
        critical: items.filter(i => i.status === 'critical').length,
        outOfStock: items.filter(i => i.status === 'out_of_stock').length
      }
    });
  } catch (error) {
    console.error('Error getting inventory:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/consumption/inventory
 * Add item to household inventory
 */
router.post('/inventory', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const item = new HouseholdInventoryItem({ ...req.body, tenant_id: tenantId });
    await item.save();

    res.json({
      success: true,
      message: 'Item added to inventory',
      item
    });
  } catch (error) {
    console.error('Error adding inventory item:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PATCH /api/consumption/inventory/:itemId
 * Update inventory item (e.g., after consumption)
 */
router.patch('/inventory/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    const item = await HouseholdInventoryItem.findOneAndUpdate(
      { _id: itemId, tenant_id: tenantId },
      req.body,
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({ success: true, item });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * DELETE /api/consumption/inventory/:itemId
 * Remove item from inventory
 */
router.delete('/inventory/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    await HouseholdInventoryItem.findOneAndDelete({ _id: itemId, tenant_id: tenantId });

    res.json({ success: true, message: 'Item removed from inventory' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// Low Stock / Reorder Routes
// ============================================================================

/**
 * GET /api/consumption/low-stock/:householdId
 * Get items that need reordering
 * FreshMart 7AM Story: "Milk running low, Eggs running low, Vegetables almost finished"
 */
router.get('/low-stock/:householdId', async (req: Request, res: Response) => {
  try {
    const { householdId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    const lowStockItems = await HouseholdInventoryItem.find({
      household_id: householdId,
      tenant_id: tenantId,
      status: { $in: ['running_low', 'critical', 'out_of_stock'] }
    }).sort({ status: 1, days_until_empty: 1 });

    // Generate suggestions for each item
    const suggestions = lowStockItems.map(item => ({
      sku: item.sku,
      name: item.name,
      status: item.status,
      current_quantity: item.current_quantity,
      days_until_empty: item.days_until_empty,
      message: item.status === 'out_of_stock'
        ? `${item.name} is out of stock. Shall I reorder?`
        : `${item.name} running low (${item.days_until_empty} days left). Shall I reorder?`,
      action: 'reorder'
    }));

    res.json({
      success: true,
      householdId,
      lowStockItems,
      suggestions,
      summary: {
        totalLowStock: lowStockItems.length,
        critical: lowStockItems.filter(i => i.status === 'critical').length,
        outOfStock: lowStockItems.filter(i => i.status === 'out_of_stock').length
      }
    });
  } catch (error) {
    console.error('Error getting low stock:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/consumption/suggestions/generate
 * Generate reorder suggestions for a household
 * Called by genie-briefing-service at 7AM
 */
router.post('/suggestions/generate', async (req: Request, res: Response) => {
  try {
    const { householdId, userId } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string;

    // Get low stock items
    const lowStockItems = await HouseholdInventoryItem.find({
      household_id: householdId,
      tenant_id: tenantId,
      status: { $in: ['running_low', 'critical', 'out_of_stock'] }
    });

    // Create suggestions
    const suggestions = [];
    for (const item of lowStockItems) {
      const existing = await ReorderSuggestion.findOne({
        household_id: householdId,
        sku: item.sku,
        status: 'pending',
        tenant_id: tenantId
      });

      if (!existing) {
        const suggestion = new ReorderSuggestion({
          household_id: householdId,
          user_id: userId,
          sku: item.sku,
          name: item.name,
          category: item.category,
          current_quantity: item.current_quantity,
          days_until_empty: item.days_until_empty,
          suggested_quantity: item.reorder_quantity,
          preferred_store: item.preferred_store,
          message: item.status === 'out_of_stock'
            ? `${item.name} is out of stock. Shall I reorder ${item.reorder_quantity} ${item.unit}?`
            : `${item.name} running low (${item.days_until_empty} days left). Shall I reorder?`,
          tenant_id: tenantId
        });
        await suggestion.save();
        suggestions.push(suggestion);
      }
    }

    res.json({
      success: true,
      message: `Generated ${suggestions.length} reorder suggestions`,
      suggestions
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/consumption/suggestions/:userId
 * Get pending reorder suggestions for user
 */
router.get('/suggestions/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    const suggestions = await ReorderSuggestion.find({
      user_id: userId,
      tenant_id: tenantId,
      status: 'pending'
    }).sort({ days_until_empty: 1 });

    res.json({
      success: true,
      userId,
      suggestions,
      briefing: generateBriefingMessage(suggestions)
    });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/consumption/suggestions/:suggestionId/approve
 * Approve reorder suggestion
 * FreshMart: User clicks "YES" on "Shall I reorder?"
 */
router.post('/suggestions/:suggestionId/approve', async (req: Request, res: Response) => {
  try {
    const { suggestionId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    const suggestion = await ReorderSuggestion.findOneAndUpdate(
      { _id: suggestionId, tenant_id: tenantId },
      { status: 'ordered', action_taken: 'reordered', action_at: new Date() },
      { new: true }
    );

    if (!suggestion) {
      return res.status(404).json({ success: false, error: 'Suggestion not found' });
    }

    // TODO: Trigger order via REZ-Mart or grocery service

    res.json({
      success: true,
      message: 'Reorder approved',
      suggestion
    });
  } catch (error) {
    console.error('Error approving suggestion:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/consumption/suggestions/:suggestionId/dismiss
 * Dismiss reorder suggestion
 */
router.post('/suggestions/:suggestionId/dismiss', async (req: Request, res: Response) => {
  try {
    const { suggestionId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    await ReorderSuggestion.findOneAndUpdate(
      { _id: suggestionId, tenant_id: tenantId },
      { status: 'dismissed', action_taken: 'dismissed', action_at: new Date() }
    );

    res.json({ success: true, message: 'Suggestion dismissed' });
  } catch (error) {
    console.error('Error dismissing suggestion:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// Consumption Log Routes
// ============================================================================

/**
 * POST /api/consumption/log
 * Log consumption event (e.g., after eating/drinking)
 */
router.post('/log', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const log = new ConsumptionLog({ ...req.body, tenant_id: tenantId });
    await log.save();

    // Update inventory item
    const item = await HouseholdInventoryItem.findOne({
      household_id: req.body.household_id,
      sku: req.body.sku,
      tenant_id: tenantId
    });

    if (item) {
      item.current_quantity = Math.max(0, item.current_quantity - req.body.quantity_consumed);
      item.last_consumed = new Date();
      await item.save();
    }

    res.json({ success: true, log });
  } catch (error) {
    console.error('Error logging consumption:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/consumption/log/:householdId
 * Get consumption history
 */
router.get('/log/:householdId', async (req: Request, res: Response) => {
  try {
    const { householdId } = req.params;
    const { sku, startDate, endDate, limit = 50 } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string;

    const filter: Record<string, unknown> = { household_id: householdId, tenant_id: tenantId };
    if (sku) filter.sku = sku;
    if (startDate || endDate) {
      filter.created_at = {};
      if (startDate) (filter.created_at as Record<string, Date>).$gte = new Date(startDate as string);
      if (endDate) (filter.created_at as Record<string, Date>).$lte = new Date(endDate as string);
    }

    const logs = await ConsumptionLog.find(filter)
      .sort({ created_at: -1 })
      .limit(parseInt(limit as string));

    res.json({ success: true, householdId, logs });
  } catch (error) {
    console.error('Error getting consumption log:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

function generateBriefingMessage(suggestions: any[]): string {
  if (suggestions.length === 0) {
    return 'All stocked up! No reorder needed today.';
  }

  const items = suggestions.map(s => `${s.name}${s.status === 'out_of_stock' ? ' (out of stock)' : ''}`);
  if (items.length === 1) {
    return `${items[0]}. Shall I reorder?`;
  }

  const last = items.pop();
  return `${items.join(', ')} and ${last} need reordering. Shall I reorder?`;
}

export default router;
