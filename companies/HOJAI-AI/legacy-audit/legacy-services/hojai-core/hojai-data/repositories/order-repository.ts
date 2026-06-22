/**
 * Hojai Data Platform - Order Repository
 * Version: 1.0 | Date: May 29, 2026
 */

import { Db } from 'mongodb';
import { BaseRepository } from './base-repository';
import { Order, OrderStatus } from '../entities';

/**
 * Order Repository
 */
export class OrderRepository extends BaseRepository<Order> {
  constructor(db: Db, tenant_id: string) {
    super(db, 'orders', tenant_id);
  }

  /**
   * Find by order number
   */
  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return this.collection.findOne({ order_number: orderNumber } as any);
  }

  /**
   * Find by customer
   */
  async findByCustomer(customerId: string): Promise<Order[]> {
    return this.collection
      .find({ customer_id: customerId } as any)
      .sort({ created_at: -1 })
      .toArray();
  }

  /**
   * Find by status
   */
  async findByStatus(status: OrderStatus): Promise<Order[]> {
    return this.collection
      .find({ status } as any)
      .sort({ created_at: -1 })
      .toArray();
  }

  /**
   * Find recent orders
   */
  async findRecent(limit = 50): Promise<Order[]> {
    return this.collection
      .find({ status: { $ne: 'cancelled' } } as any)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Update order status
   */
  async updateStatus(
    orderId: string,
    status: OrderStatus,
    changedBy: string,
    reason?: string
  ): Promise<void> {
    const history = {
      status,
      changed_at: new Date().toISOString(),
      changed_by: changedBy,
      reason
    };

    await this.collection.updateOne(
      { id: orderId, tenant_id: this.tenant_id } as any,
      {
        $set: { status, updated_at: new Date().toISOString() },
        $push: { status_history: history }
      }
    );
  }

  /**
   * Get orders by date range
   */
  async findByDateRange(startDate: string, endDate: string): Promise<Order[]> {
    return this.collection
      .find({
        created_at: {
          $gte: startDate,
          $lte: endDate
        }
      } as any)
      .toArray();
  }

  /**
   * Calculate revenue metrics
   */
  async calculateRevenue(startDate?: string, endDate?: string): Promise<{
    totalRevenue: number;
    orderCount: number;
    avgOrderValue: number;
  }> {
    const match: any = {
      status: { $in: ['completed', 'delivered'] }
    };

    if (startDate && endDate) {
      match.created_at = { $gte: startDate, $lte: endDate };
    }

    const result = await this.collection.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$total' }
        }
      }
    ]).toArray();

    if (result.length === 0) {
      return { totalRevenue: 0, orderCount: 0, avgOrderValue: 0 };
    }

    return {
      totalRevenue: result[0].totalRevenue || 0,
      orderCount: result[0].orderCount || 0,
      avgOrderValue: result[0].avgOrderValue || 0
    };
  }
}
