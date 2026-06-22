/**
 * Grocery Briefing Service
 * FreshMart 8AM Story: "Good Morning Ramesh. Revenue Yesterday: ₹3.4 Lakhs"
 */

const { GroceryBriefing } = require('../models/briefing.model');

class GroceryBriefingService {

  /**
   * Generate morning briefing for store owner
   * FreshMart 8AM: "Good Morning Ramesh. Revenue Yesterday: ₹3.4 Lakhs"
   */
  async generateBriefing(ownerId, storeId, date = new Date()) {
    const briefing_id = `BRIEF-${date.toISOString().split('T')[0].replace(/-/g, '')}-${storeId}`;

    // In production, fetch data from various services
    const financial = await this.getFinancialMetrics(storeId, date);
    const customers = await this.getCustomerMetrics(storeId, date);
    const inventory = await this.getInventoryMetrics(storeId, date);
    const delivery = await this.getDeliveryMetrics(storeId, date);

    // Generate insights
    const insights = this.generateInsights(financial, customers, inventory, delivery);

    // Generate recommendations
    const recommendations = this.generateRecommendations(inventory, customers, financial);

    // Generate text
    const generated_text = this.generateBriefingText(ownerId, financial, customers, inventory);

    const briefing = new GroceryBriefing({
      briefing_id,
      owner_id: ownerId,
      store_id: storeId,
      date,
      financial,
      customers,
      inventory,
      delivery,
      insights,
      recommendations,
      generated_text,
      status: 'ready'
    });

    await briefing.save();
    return briefing;
  }

  /**
   * Get financial metrics from RIDZA/analytics
   */
  async getFinancialMetrics(storeId, date) {
    // In production, call analytics service
    // Simulated data
    return {
      revenue: {
        yesterday: 340000, // ₹3.4 Lakhs
        today_target: 350000,
        week_to_date: 2400000,
        month_to_date: 10200000,
        trend: 'up'
      },
      orders: {
        yesterday: 245,
        today: 23,
        average: 230
      },
      average_order_value: {
        yesterday: 1388,
        trend: 'up'
      },
      margin: {
        gross: 28.5,
        net: 12.3
      }
    };
  }

  /**
   * Get customer metrics
   */
  async getCustomerMetrics(storeId, date) {
    return {
      total: 158,
      new: 12,
      returning: 146,
      satisfaction_score: {
        value: 4.8,
        trend: 'up'
      },
      complaints: 2,
      ratings: {
        average: 4.6,
        count: 892
      }
    };
  }

  /**
   * Get inventory metrics
   */
  async getInventoryMetrics(storeId, date) {
    return {
      health_percentage: 94,
      low_stock_items: 8,
      out_of_stock: 2,
      expiring_soon: 5,
      waste_value: 2500,
      reorder_needed: 12
    };
  }

  /**
   * Get delivery metrics
   */
  async getDeliveryMetrics(storeId, date) {
    return {
      orders: 87,
      on_time_rate: 96.5,
      average_time: 28,
      failed_deliveries: 2
    };
  }

  /**
   * Generate insights from metrics
   */
  generateInsights(financial, customers, inventory, delivery) {
    const insights = [];

    // Revenue insight
    if (financial.revenue.trend === 'up') {
      insights.push({
        type: 'positive',
        category: 'financial',
        title: 'Revenue Up 📈',
        description: 'Revenue increased from yesterday',
        metric: 'Revenue',
        value: `₹${(financial.revenue.yesterday / 100000).toFixed(1)}L`
      });
    }

    // Customer satisfaction
    if (customers.satisfaction_score.value >= 4.5) {
      insights.push({
        type: 'positive',
        category: 'customers',
        title: 'Happy Customers 😊',
        description: 'Customer satisfaction above target',
        metric: 'Satisfaction',
        value: customers.satisfaction_score.value.toString()
      });
    }

    // Inventory alert
    if (inventory.out_of_stock > 0) {
      insights.push({
        type: 'alert',
        category: 'inventory',
        title: 'Stock Alert ⚠️',
        description: `${inventory.out_of_stock} items out of stock`,
        metric: 'Out of Stock',
        value: inventory.out_of_stock.toString()
      });
    }

    // Delivery insight
    if (delivery.on_time_rate >= 95) {
      insights.push({
        type: 'positive',
        category: 'delivery',
        title: 'Fast Delivery 🚀',
        description: 'Delivery on-time rate above target',
        metric: 'On-Time',
        value: `${delivery.on_time_rate}%`
      });
    }

    // Expiring items opportunity
    if (inventory.expiring_soon > 0) {
      insights.push({
        type: 'opportunity',
        category: 'inventory',
        title: 'Quick Sale Opportunity 💰',
        description: `${inventory.expiring_soon} items expiring soon`,
        metric: 'Expiring',
        value: inventory.expiring_soon.toString()
      });
    }

    return insights;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(inventory, customers, financial) {
    const recommendations = [];

    // Inventory reorder
    if (inventory.reorder_needed > 5) {
      recommendations.push({
        priority: 'high',
        category: 'inventory',
        title: 'Reorder Stock',
        description: `${inventory.reorder_needed} items need reordering`,
        action: 'View reorder list',
        estimated_impact: 'Prevent stockouts'
      });
    }

    // Expired items
    if (inventory.expiring_soon > 0) {
      recommendations.push({
        priority: 'high',
        category: 'inventory',
        title: 'Launch Quick Sale',
        description: 'Run markdown campaign for expiring items',
        action: 'Start quick sale',
        estimated_impact: `Save ₹${inventory.waste_value}`
      });
    }

    // Customer feedback
    if (customers.complaints > 3) {
      recommendations.push({
        priority: 'medium',
        category: 'customers',
        title: 'Review Customer Feedback',
        description: 'Complaints increased this week',
        action: 'View complaints',
        estimated_impact: 'Improve satisfaction'
      });
    }

    // Revenue opportunity
    if (financial.average_order_value.trend === 'down') {
      recommendations.push({
        priority: 'medium',
        category: 'financial',
        title: 'Increase Basket Size',
        description: 'Average order value decreased',
        action: 'Review promotions',
        estimated_impact: 'Increase revenue'
      });
    }

    return recommendations;
  }

  /**
   * Generate briefing text
   */
  generateBriefingText(ownerId, financial, customers, inventory) {
    const name = 'Ramesh'; // In production, fetch from user profile

    let text = `Good Morning ${name}.\n\n`;

    // Revenue
    text += `Revenue Yesterday: ₹${(financial.revenue.yesterday / 100000).toFixed(1)} Lakhs\n`;

    // Top category
    text += `Top Category: Dairy\n`;

    // Customer satisfaction
    text += `Customer Satisfaction: ${customers.satisfaction_score.value}\n`;

    // Inventory health
    text += `Inventory Health: ${inventory.health_percentage}%\n`;

    // Delivery demand
    text += `Delivery Demand: Increasing\n`;

    // Recommendations
    if (financial.revenue.trend === 'up') {
      text += `\n✅ Revenue is trending up!\n`;
    }

    if (inventory.expiring_soon > 0) {
      text += `\n⚠️ ${inventory.expiring_soon} items expiring soon - Quick Sale recommended\n`;
    }

    text += `\nRecommended Actions: ${financial.revenue.yesterday > 300000 ? '4' : '2'}\n`;

    return text;
  }

  /**
   * Get briefing for owner
   */
  async getBriefing(ownerId, date) {
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    return GroceryBriefing.findOne({
      owner_id: ownerId,
      date: queryDate
    });
  }

  /**
   * Get briefing history
   */
  async getBriefingHistory(ownerId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    return GroceryBriefing.find({
      owner_id: ownerId,
      date: { $gte: startDate }
    }).sort({ date: -1 });
  }

  /**
   * Mark briefing as delivered
   */
  async markDelivered(briefingId) {
    return GroceryBriefing.findOneAndUpdate(
      { briefing_id: briefingId },
      { status: 'delivered', delivered_at: new Date() },
      { new: true }
    );
  }

  /**
   * Mark briefing as read
   */
  async markRead(briefingId) {
    return GroceryBriefing.findOneAndUpdate(
      { briefing_id: briefingId },
      { status: 'read', read_at: new Date() },
      { new: true }
    );
  }
}

module.exports = new GroceryBriefingService();
