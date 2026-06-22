import { v4 as uuidv4 } from 'uuid';

interface SalesOpportunity {
  id: string;
  type: 'upsell' | 'cross_sell' | 'bundle' | 'promotion';
  trigger: string;
  customerSegment: string;
  offer: string;
  expectedValue: number;
  conversionLikelihood: number;
}

interface SalesCampaign {
  id: string;
  name: string;
  type: 'limited_time' | 'repeat_customer' | 'high_value' | 'reactivation';
  targetCustomers: number;
  offer: string;
  expectedRevenue: number;
  roi: number;
}

/**
 * Restaurant Sales Agent
 * Composed by Restaurant Growth Consultant
 * Handles upselling, cross-selling, and sales campaigns
 */
export class SalesAgent {
  /**
   * Generate upselling recommendations for a customer order
   */
  async generateUpsellSuggestions(
    currentOrder: { items: string[]; total: number; customerId?: string },
    menuItems: { id: string; name: string; price: number; category: string; margin: number }[]
  ): Promise<{ itemId: string; name: string; price: number; reason: string; expectedLift: number }[]> {
    const suggestions: { itemId: string; name: string; price: number; reason: string; expectedLift: number }[] = [];

    // Find complementary items based on current order
    const orderedCategories = currentOrder.items.map(item =>
      menuItems.find(m => m.name.toLowerCase().includes(item.toLowerCase()))?.category || 'unknown'
    );

    // Suggest high-margin complementary items
    const complementaryItems = menuItems
      .filter(item => !currentOrder.items.includes(item.name))
      .filter(item => {
        // Check if complementary to ordered items
        return item.category !== 'unknown' && !orderedCategories.includes(item.category);
      })
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 3);

    for (const item of complementaryItems) {
      suggestions.push({
        itemId: item.id,
        name: item.name,
        price: item.price,
        reason: `Complements your order perfectly - ${item.category}`,
        expectedLift: item.margin * 0.15, // 15% margin lift per suggestion
      });
    }

    // Suggest upgrades
    const upgrades = this.findUpgrades(currentOrder.items, menuItems);
    suggestions.push(...upgrades.slice(0, 2));

    return suggestions;
  }

  /**
   * Find potential upgrades for current items
   */
  private findUpgrades(
    currentItems: string[],
    menuItems: { id: string; name: string; price: number; category: string; margin: number }[]
  ): { itemId: string; name: string; price: number; reason: string; expectedLift: number }[] {
    const upgrades: { itemId: string; name: string; price: number; reason: string; expectedLift: number }[] = [];

    for (const currentItem of currentItems) {
      // Find same-category items with higher price
      const currentMenuItem = menuItems.find(m =>
        m.name.toLowerCase().includes(currentItem.toLowerCase())
      );

      if (currentMenuItem) {
        const higherPriced = menuItems
          .filter(m => m.category === currentMenuItem.category && m.price > currentMenuItem.price)
          .sort((a, b) => a.price - b.price)
          .slice(0, 1);

        for (const upgrade of higherPriced) {
          upgrades.push({
            itemId: upgrade.id,
            name: upgrade.name,
            price: upgrade.price,
            reason: `Upgrade from ${currentItem} - premium experience`,
            expectedLift: (upgrade.price - currentMenuItem.price) * upgrade.margin,
          });
        }
      }
    }

    return upgrades;
  }

  /**
   * Generate bundle opportunities
   */
  async generateBundleOpportunities(
    menuItems: { id: string; name: string; price: number; category: string; margin: number }[],
    targetMargin: number = 0.65
  ): Promise<{ name: string; items: string[]; originalPrice: number; bundlePrice: number; margin: number; savings: number }[]> {
    const bundles: { name: string; items: string[]; originalPrice: number; bundlePrice: number; margin: number; savings: number }[] = [];

    // Group items by category
    const categories = [...new Set(menuItems.map(m => m.category))];

    for (const category of categories) {
      const categoryItems = menuItems.filter(m => m.category === category);

      if (categoryItems.length >= 2) {
        // Create pairs/trios
        for (let i = 0; i < categoryItems.length - 1; i++) {
          for (let j = i + 1; j < Math.min(i + 3, categoryItems.length); j++) {
            const items = [categoryItems[i], categoryItems[j]];
            const originalPrice = items.reduce((sum, item) => sum + item.price, 0);
            const bundlePrice = Math.round(originalPrice * 0.85); // 15% bundle discount
            const avgMargin = items.reduce((sum, item) => sum + item.margin, 0) / items.length;

            if (avgMargin >= targetMargin) {
              bundles.push({
                name: `${category} Combo`,
                items: items.map(i => i.name),
                originalPrice,
                bundlePrice,
                margin: avgMargin - 0.15, // Reduce margin by bundle discount
                savings: originalPrice - bundlePrice,
              });
            }
          }
        }
      }
    }

    return bundles.sort((a, b) => b.margin - a.margin).slice(0, 5);
  }

  /**
   * Identify sales opportunities
   */
  async identifyOpportunities(
    customers: {
      id: string;
      avgOrderValue: number;
      visitFrequency: number;
      lastVisit: string;
      preferences: string[];
    }[],
    menuItems: { id: string; name: string; price: number; category: string }[]
  ): Promise<SalesOpportunity[]> {
    const opportunities: SalesOpportunity[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const customer of customers) {
      const lastVisitDate = new Date(customer.lastVisit);

      // High-value customer not visited recently - reactivation
      if (customer.avgOrderValue > 1000 && lastVisitDate < thirtyDaysAgo) {
        opportunities.push({
          id: uuidv4(),
          type: 'promotion',
          trigger: 'High-value customer, inactive 30+ days',
          customerSegment: 'high_value_lapsed',
          offer: '20% off + free beverage on return',
          expectedValue: customer.avgOrderValue * 1.2,
          conversionLikelihood: 0.25,
        });
      }

      // Regular customer - upsell opportunity
      if (customer.visitFrequency > 4 && customer.avgOrderValue < 500) {
        opportunities.push({
          id: uuidv4(),
          type: 'upsell',
          trigger: 'Frequent visitor, low basket size',
          customerSegment: 'frequent_low_value',
          offer: 'Try our premium items - free tasting',
          expectedValue: customer.avgOrderValue * 0.3,
          conversionLikelihood: 0.4,
        });
      }

      // Cross-sell based on preferences
      if (customer.preferences.length > 0) {
        const relatedCategory = this.findRelatedCategory(customer.preferences[0], menuItems);
        if (relatedCategory) {
          opportunities.push({
            id: uuidv4(),
            type: 'cross_sell',
            trigger: `Customer prefers ${customer.preferences[0]}`,
            customerSegment: 'preference_based',
            offer: `Discover our ${relatedCategory} collection`,
            expectedValue: 200,
            conversionLikelihood: 0.35,
          });
        }
      }
    }

    return opportunities.sort((a, b) => b.expectedValue * b.conversionLikelihood - a.expectedValue * a.conversionLikelihood);
  }

  /**
   * Find related category for cross-selling
   */
  private findRelatedCategory(
    preference: string,
    menuItems: { id: string; name: string; price: number; category: string }[]
  ): string | null {
    const preferenceItem = menuItems.find(m =>
      m.name.toLowerCase().includes(preference.toLowerCase()) ||
      preference.toLowerCase().includes(m.name.toLowerCase())
    );

    if (preferenceItem) {
      // Find different category
      const differentCategory = menuItems.find(m => m.category !== preferenceItem.category);
      return differentCategory?.category || null;
    }

    return null;
  }

  /**
   * Create sales campaigns
   */
  async createCampaigns(
    opportunities: SalesOpportunity[],
    targetRevenue: number
  ): Promise<SalesCampaign[]> {
    const campaigns: SalesCampaign[] = [];

    // Group by type
    const byType = opportunities.reduce((acc, opp) => {
      acc[opp.type] = acc[opp.type] || [];
      acc[opp.type].push(opp);
      return acc;
    }, {} as Record<string, SalesOpportunity[]>);

    // Limited time offer
    if (byType.promotion?.length) {
      const highValueOpps = byType.promotion.filter(o => o.conversionLikelihood > 0.2);
      campaigns.push({
        id: uuidv4(),
        name: 'Limited Time Return Offer',
        type: 'limited_time',
        targetCustomers: highValueOpps.length,
        offer: '20% off + free drink',
        expectedRevenue: highValueOpps.reduce((sum, o) => sum + o.expectedValue * o.conversionLikelihood, 0),
        roi: 2.5,
      });
    }

    // Repeat customer campaign
    if (byType.upsell?.length) {
      campaigns.push({
        id: uuidv4(),
        name: 'Upgrade Experience Campaign',
        type: 'repeat_customer',
        targetCustomers: byType.upsell.length,
        offer: 'Premium tasting menu at regular price',
        expectedRevenue: byType.upsell.reduce((sum, o) => sum + o.expectedValue * o.conversionLikelihood, 0),
        roi: 3.0,
      });
    }

    // High-value customer campaign
    const highValueOpps = opportunities.filter(o =>
      o.customerSegment === 'high_value_lapsed' ||
      o.customerSegment === 'preference_based'
    );
    if (highValueOpps.length > 0) {
      campaigns.push({
        id: uuidv4(),
        name: 'VIP Experience Campaign',
        type: 'high_value',
        targetCustomers: highValueOpps.length,
        offer: 'Exclusive chef\'s table access',
        expectedRevenue: highValueOpps.reduce((sum, o) => sum + o.expectedValue * o.conversionLikelihood, 0),
        roi: 4.0,
      });
    }

    // Reactivation campaign
    const lapsedOpps = opportunities.filter(o => o.customerSegment === 'high_value_lapsed');
    if (lapsedOpps.length > 0) {
      campaigns.push({
        id: uuidv4(),
        name: 'We Miss You Campaign',
        type: 'reactivation',
        targetCustomers: lapsedOpps.length,
        offer: 'Personalized comeback offer',
        expectedRevenue: lapsedOpps.reduce((sum, o) => sum + o.expectedValue * o.conversionLikelihood * 0.5, 0),
        roi: 2.0,
      });
    }

    return campaigns.sort((a, b) => b.roi - a.roi);
  }

  /**
   * Calculate campaign ROI
   */
  calculateCampaignROI(
    campaign: SalesCampaign,
    costPerCustomer: number = 50
  ): { totalCost: number; expectedRevenue: number; roi: number; payback: number } {
    const totalCost = campaign.targetCustomers * costPerCustomer;

    return {
      totalCost,
      expectedRevenue: campaign.expectedRevenue,
      roi: campaign.roi,
      payback: totalCost / campaign.expectedRevenue,
    };
  }
}

export const salesAgent = new SalesAgent();
