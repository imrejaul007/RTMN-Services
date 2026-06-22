import { v4 as uuidv4 } from 'uuid';
import {
  MenuItem,
  MenuAnalysis,
  MenuRecommendation,
  MenuEngineRequest,
  MenuEngineResponse,
} from '../types';

interface MarginAnalysis {
  item: MenuItem;
  marginPercent: number;
  profitPerServing: number;
}

/**
 * Menu Engineer Service
 * Implements the classic Boston Consulting Group matrix for restaurants
 * - Stars: High margin, high popularity → Promote and protect
 * - Plowhorses: High popularity, low margin → Reprice or reformulate
 * - Puzzles: Low popularity, high margin → Increase visibility
 * - Dogs: Low margin, low popularity → Remove or revamp
 */
export class MenuEngineerService {
  private readonly TARGET_MARGIN = 0.68; // 68% gross margin (32% food cost)
  private readonly POPULARITY_THRESHOLD = 50;
  private readonly MARGIN_THRESHOLD = 0.60; // 60% margin

  /**
   * Analyze menu and provide engineering recommendations
   */
  async analyzeMenu(request: MenuEngineRequest): Promise<MenuEngineResponse> {
    const startTime = Date.now();

    // Calculate margins for all items
    const analyzedItems = this.calculateMargins(request.menuItems);

    // Categorize items into quadrants
    const analysis = this.categorizeItems(analyzedItems);

    // Generate recommendations
    const recommendations = this.generateRecommendations(analysis, request.targetFoodCostPercent);

    // Find best sellers and low performers
    const sortedByPopularity = [...analyzedItems].sort((a, b) => b.item.popularity - a.item.popularity);
    const bestSellers = sortedByPopularity.slice(0, 5).map(a => a.item);
    const lowPerformers = sortedByPopularity.slice(-5).map(a => a.item);

    // Calculate overall metrics
    const totalRevenue = request.menuItems.reduce((sum, item) => sum + (item.price * item.popularity), 0);
    const totalCost = request.menuItems.reduce((sum, item) => sum + (item.cost * item.popularity), 0);
    const currentFoodCostPercent = (totalCost / totalRevenue) * 100;
    const averageMargin = 100 - currentFoodCostPercent;

    // Generate new item suggestions
    const newItemsToAdd = this.suggestNewItems(analysis, request.menuItems);

    return {
      analysis,
      recommendations,
      averageMargin,
      currentFoodCostPercent,
      projectedFoodCostPercent: request.targetFoodCostPercent || 30,
      bestSellers,
      lowPerformers,
      newItemsToAdd,
    };
  }

  /**
   * Calculate margin for each menu item
   */
  private calculateMargins(items: MenuItem[]): MarginAnalysis[] {
    return items.map(item => {
      const marginPercent = item.cost > 0 ? ((item.price - item.cost) / item.price) * 100 : 0;
      const profitPerServing = item.price - item.cost;
      return { item, marginPercent, profitPerServing };
    });
  }

  /**
   * Categorize items into BCG matrix quadrants
   */
  private categorizeItems(analyzedItems: MarginAnalysis[]): MenuAnalysis {
    const stars: MenuItem[] = [];
    const plowhorses: MenuItem[] = [];
    const puzzles: MenuItem[] = [];
    const dogs: MenuItem[] = [];

    for (const analysis of analyzedItems) {
      const { item, marginPercent } = analysis;
      const popularity = item.popularity || 50;

      if (marginPercent >= this.MARGIN_THRESHOLD && popularity >= this.POPULARITY_THRESHOLD) {
        stars.push(item);
      } else if (marginPercent < this.MARGIN_THRESHOLD && popularity >= this.POPULARITY_THRESHOLD) {
        plowhorses.push(item);
      } else if (marginPercent >= this.MARGIN_THRESHOLD && popularity < this.POPULARITY_THRESHOLD) {
        puzzles.push(item);
      } else {
        dogs.push(item);
      }
    }

    return { stars, plowhorses, puzzles, dogs };
  }

  /**
   * Generate actionable recommendations for menu optimization
   */
  private generateRecommendations(
    analysis: MenuAnalysis,
    targetFoodCostPercent?: number
  ): MenuRecommendation[] {
    const recommendations: MenuRecommendation[] = [];

    // Stars: Protect and promote
    for (const star of analysis.stars) {
      recommendations.push({
        action: 'promote',
        itemId: star.id,
        itemName: star.name,
        reason: `Star performer with ${((star.price - star.cost) / star.price * 100).toFixed(0)}% margin and ${star.popularity}% popularity`,
        expectedImpact: 'high',
      });
    }

    // Plowhorses: Reprofile or reprice
    for (const plowhorse of analysis.plowhorses) {
      const currentMargin = ((plowhorse.price - plowhorse.cost) / plowhorse.price) * 100;
      const priceIncrease = (plowhorse.cost / (1 - (this.TARGET_MARGIN))) - plowhorse.price;
      const newPrice = plowhorse.price + priceIncrease;

      recommendations.push({
        action: 'reprice',
        itemId: plowhorse.id,
        itemName: plowhorse.name,
        currentPrice: plowhorse.price,
        recommendedPrice: Math.ceil(newPrice),
        reason: `High popularity (${plowhorse.popularity}%) but low margin (${currentMargin.toFixed(0)}%). Increase price by ₹${priceIncrease.toFixed(0)} to reach target margin.`,
        expectedImpact: 'high',
      });
    }

    // Puzzles: Increase visibility
    for (const puzzle of analysis.puzzles) {
      recommendations.push({
        action: 'promote',
        itemId: puzzle.id,
        itemName: puzzle.name,
        reason: `High margin (${((puzzle.price - puzzle.cost) / puzzle.price * 100).toFixed(0)}%) but low visibility. Consider featured placement, combo deals, or staff recommendations.`,
        expectedImpact: 'medium',
      });
    }

    // Dogs: Remove or reformulate
    for (const dog of analysis.dogs) {
      const marginPercent = ((dog.price - dog.cost) / dog.price) * 100;
      recommendations.push({
        action: dog.cost > dog.price * 0.5 ? 'remove' : 'reformulate',
        itemId: dog.id,
        itemName: dog.name,
        reason: `Low margin (${marginPercent.toFixed(0)}%) and low popularity (${dog.popularity}%). ${dog.cost > dog.price * 0.5 ? 'Consider removing or substituting.' : 'Consider recipe reformulation with cheaper ingredients.'}`,
        expectedImpact: 'medium',
      });
    }

    return recommendations.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return impactOrder[a.expectedImpact] - impactOrder[b.expectedImpact];
    });
  }

  /**
   * Suggest new menu items based on current gaps
   */
  private suggestNewItems(
    analysis: MenuAnalysis,
    existingItems: MenuItem[]
  ): { name: string; category: string; priceRange: string; reason: string }[] {
    const suggestions: { name: string; category: string; priceRange: string; reason: string }[] = [];
    const categories = [...new Set(existingItems.map(i => i.category))];

    // If lacking high-margin items in a category, suggest
    const avgPrice = existingItems.reduce((sum, i) => sum + i.price, 0) / existingItems.length;

    // Suggest high-margin fillers
    if (analysis.plowhorses.length > 3) {
      suggestions.push({
        name: 'Premium Signature Bowl',
        category: categories[0] || 'Main Course',
        priceRange: `₹${Math.round(avgPrice * 1.3)} - ₹${Math.round(avgPrice * 1.5)}`,
        reason: 'Fill high-margin gap. Signature items with premium ingredients command higher margins.',
      });
    }

    // Suggest beverages if missing
    if (!categories.includes('Beverages') && !categories.includes('Drinks')) {
      suggestions.push({
        name: 'Artisan Fresh Juice/Smoothie',
        category: 'Beverages',
        priceRange: `₹${Math.round(avgPrice * 0.4)} - ₹${Math.round(avgPrice * 0.5)}`,
        reason: 'High-margin item category. Beverages typically have 70-80% margins.',
      });
    }

    // Suggest combo/deals if few combos
    const comboItems = existingItems.filter(i => i.category.toLowerCase().includes('combo') || i.name.toLowerCase().includes('combo'));
    if (comboItems.length < 2) {
      suggestions.push({
        name: 'Value Combo Meal',
        category: 'Combos',
        priceRange: `₹${Math.round(avgPrice * 1.2)} - ₹${Math.round(avgPrice * 1.3)}`,
        reason: 'Combos drive higher order values and improve perceived value.',
      });
    }

    // Suggest dessert if missing
    if (!categories.some(c => c.toLowerCase().includes('dessert') || c.toLowerCase().includes('sweet'))) {
      suggestions.push({
        name: 'Chef\'s Dessert Special',
        category: 'Desserts',
        priceRange: `₹${Math.round(avgPrice * 0.35)} - ₹${Math.round(avgPrice * 0.45)}`,
        reason: 'Desserts typically achieve 75-85% margins and increase ticket size by 15-20%.',
      });
    }

    return suggestions.slice(0, 4);
  }

  /**
   * Generate menu engineering report
   */
  async generateReport(request: MenuEngineRequest): Promise<string> {
    const response = await this.analyzeMenu(request);

    const report = `
# MENU ENGINEERING REPORT
Generated: ${new Date().toISOString()}
Restaurant ID: ${request.restaurantId}

## EXECUTIVE SUMMARY
- Current Food Cost: ${response.currentFoodCostPercent.toFixed(1)}%
- Target Food Cost: ${response.projectedFoodCostPercent}%
- Average Menu Margin: ${response.averageMargin.toFixed(1)}%

## QUADRANT ANALYSIS

### Stars (${response.analysis.stars.length} items)
High margin + High popularity. Protect and promote.
${response.analysis.stars.map(s => `- ${s.name}: ${((s.price - s.cost) / s.price * 100).toFixed(0)}% margin`).join('\n') || 'None'}

### Plowhorses (${response.analysis.plowhorses.length} items)
High popularity + Low margin. Reprice urgently.
${response.analysis.plowhorses.map(p => `- ${p.name}: ₹${p.price} → ₹${response.recommendations.find(r => r.itemId === p.id)?.recommendedPrice || p.price} (${((p.price - p.cost) / p.price * 100).toFixed(0)}% margin)`).join('\n') || 'None'}

### Puzzles (${response.analysis.puzzles.length} items)
Low popularity + High margin. Increase visibility.
${response.analysis.puzzles.map(p => `- ${p.name}: ${((p.price - p.cost) / p.price * 100).toFixed(0)}% margin`).join('\n') || 'None'}

### Dogs (${response.analysis.dogs.length} items)
Low margin + Low popularity. Remove or reformulate.
${response.analysis.dogs.map(d => `- ${d.name}: ${((d.price - d.cost) / d.price * 100).toFixed(0)}% margin`).join('\n') || 'None'}

## TOP RECOMMENDATIONS
${response.recommendations.slice(0, 5).map((r, i) => `${i + 1}. [${r.action.toUpperCase()}] ${r.itemName}: ${r.reason}`).join('\n')}

## NEW ITEM OPPORTUNITIES
${response.newItemsToAdd.map(n => `- ${n.name} (${n.category}): ${n.priceRange} - ${n.reason}`).join('\n')}
`.trim();

    return report;
  }
}

export const menuEngineerService = new MenuEngineerService();
