import {
  FoodCostRequest,
  FoodCostResponse,
  FoodCostAnalysis,
  Ingredient,
  DishRecipe,
} from '../types';

interface VendorAnalysis {
  vendor: string;
  spend: number;
  savings: number;
  quality: 'poor' | 'average' | 'good' | 'excellent';
  items: string[];
}

interface WasteAnalysis {
  category: string;
  amount: number;
  cost: number;
  percentOfTotal: number;
}

/**
 * Food Cost Analyzer Service
 * Comprehensive food cost optimization including vendor analysis, waste reduction, and recipe optimization
 */
export class CostAnalyzerService {
  private readonly IDEAL_FOOD_COST = {
    quickService: 0.25,    // 25%
    casualDining: 0.30,    // 30%
    fineDining: 0.35,      // 35%
    delivery: 0.28,        // 28%
  };

  /**
   * Analyze food costs and provide optimization recommendations
   */
  async analyze(request: FoodCostRequest): Promise<FoodCostResponse> {
    // Calculate overall food cost percentage
    const overallFoodCostPercent = (request.monthlyFoodSpend / request.monthlyRevenue) * 100;

    // Generate vendor analysis
    const vendorAnalysis = this.analyzeVendors(request.vendors || [], request.ingredients || []);

    // Generate waste analysis
    const wasteAnalysis = this.analyzeWaste(request.recipes || []);

    // Generate recipe analysis
    const recipes = this.analyzeRecipes(request.recipes || [], request.ingredients || []);

    // Calculate potential savings
    const monthlyPotentialSavings = this.calculateSavings(
      overallFoodCostPercent,
      request.targetFoodCostPercent,
      request.monthlyFoodSpend
    );

    const analysis: FoodCostAnalysis = {
      overallFoodCostPercent,
      targetFoodCostPercent: request.targetFoodCostPercent,
      monthlyFoodSpend: request.monthlyFoodSpend,
      monthlyPotentialSavings,
      vendorAnalysis,
      wasteAnalysis,
      recipes,
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      overallFoodCostPercent,
      request.targetFoodCostPercent,
      request.monthlyFoodSpend,
      vendorAnalysis,
      wasteAnalysis,
      recipes
    );

    // Calculate cost reduction targets
    const costReduction = this.calculateCostReduction(
      overallFoodCostPercent,
      request.targetFoodCostPercent,
      request.monthlyFoodSpend,
      monthlyPotentialSavings
    );

    return {
      analysis,
      recommendations,
      costReduction,
    };
  }

  /**
   * Analyze vendor performance
   */
  private analyzeVendors(
    vendors: { name: string; spend: number; leadTimeDays: number }[],
    ingredients: Ingredient[]
  ): VendorAnalysis[] {
    const vendorSpend: Map<string, { spend: number; items: string[] }> = new Map();

    // Calculate spend per vendor based on ingredients
    for (const vendor of vendors) {
      vendorSpend.set(vendor.name, { spend: vendor.spend, items: [] });
    }

    // Assign ingredients to vendors
    for (const ingredient of ingredients) {
      const existing = vendorSpend.get(ingredient.supplier);
      if (existing) {
        existing.items.push(ingredient.name);
      }
    }

    return Array.from(vendorSpend.entries()).map(([vendor, data]) => {
      const quality = this.assessVendorQuality(data.spend, data.items.length);
      const savings = this.calculateVendorSavings(data.spend, quality);

      return {
        vendor,
        spend: data.spend,
        savings,
        quality,
        items: data.items,
      };
    }).sort((a, b) => b.spend - a.spend);
  }

  /**
   * Assess vendor quality score
   */
  private assessVendorQuality(
    spend: number,
    itemCount: number
  ): 'poor' | 'average' | 'good' | 'excellent' {
    const efficiency = itemCount / (spend / 10000);

    if (efficiency > 0.8 && itemCount > 10) return 'excellent';
    if (efficiency > 0.5 && itemCount > 5) return 'good';
    if (efficiency > 0.3) return 'average';
    return 'poor';
  }

  /**
   * Calculate potential savings from vendor optimization
   */
  private calculateVendorSavings(
    spend: number,
    quality: string
  ): number {
    const savingsPercentages = {
      poor: 0.15,      // 15% savings by switching
      average: 0.08,    // 8% savings by negotiating
      good: 0.03,      // 3% savings from optimization
      excellent: 0.01,  // 1% savings from efficiency
    };

    return spend * (savingsPercentages[quality as keyof typeof savingsPercentages] || 0);
  }

  /**
   * Analyze waste patterns
   */
  private analyzeWaste(
    recipes: { dishId: string; dishName: string; ingredients: { name: string; quantity: number }[]; sellingPrice: number }[]
  ): WasteAnalysis[] {
    // Estimate waste based on typical restaurant operations
    const wasteCategories = [
      { category: 'Preparation Waste', percent: 8 },      // Trimming, cutting losses
      { category: 'Cooking Loss', percent: 5 },           // Water evaporation, shrinkage
      { category: 'Portion Control', percent: 12 },        // Inconsistent portions
      { category: 'Plate Waste', percent: 6 },             // Uneaten food
      { category: 'Spoilage', percent: 4 },               // Expired ingredients
      { category: 'Buffer/Overproduction', percent: 10 }, // Safety stock waste
    ];

    return wasteCategories.map(w => ({
      category: w.category,
      amount: 0, // Would need actual data
      cost: 0,   // Would need actual data
      percentOfTotal: w.percent,
    }));
  }

  /**
   * Analyze individual recipe costs
   */
  private analyzeRecipes(
    recipes: { dishId: string; dishName: string; ingredients: { name: string; quantity: number; unit: string }[]; sellingPrice: number }[],
    ingredients: Ingredient[]
  ): DishRecipe[] {
    const ingredientMap = new Map(ingredients.map(i => [i.name.toLowerCase(), i]));

    return recipes.map(recipe => {
      let totalCost = 0;
      const analyzedIngredients: { name: string; quantity: number; cost: number }[] = [];

      for (const ing of recipe.ingredients) {
        const ingredientData = ingredientMap.get(ing.name.toLowerCase());
        const cost = ingredientData ? ingredientData.costPerUnit * ing.quantity : 0;

        analyzedIngredients.push({
          name: ing.name,
          quantity: ing.quantity,
          cost,
        });

        totalCost += cost;
      }

      const foodCostPercent = recipe.sellingPrice > 0 ? (totalCost / recipe.sellingPrice) * 100 : 0;

      return {
        dishId: recipe.dishId,
        dishName: recipe.dishName,
        ingredients: analyzedIngredients,
        totalCost,
        sellingPrice: recipe.sellingPrice,
        foodCostPercent,
        yieldPercent: 85, // Assume 85% yield
      };
    });
  }

  /**
   * Calculate potential monthly savings
   */
  private calculateSavings(
    currentCost: number,
    targetCost: number,
    monthlySpend: number
  ): number {
    const costGap = currentCost - targetCost;
    return monthlySpend * (costGap / currentCost);
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    currentCost: number,
    targetCost: number,
    monthlySpend: number,
    vendorAnalysis: VendorAnalysis[],
    wasteAnalysis: WasteAnalysis[],
    recipes: DishRecipe[]
  ): FoodCostResponse['recommendations'] {
    const recommendations: FoodCostResponse['recommendations'] = [];

    // High-cost recipe recommendations
    const highCostRecipes = recipes.filter(r => r.foodCostPercent > 35);
    for (const recipe of highCostRecipes) {
      recommendations.push({
        category: 'recipe',
        action: `Review ${recipe.dishName} recipe`,
        item: recipe.dishName,
        savings: recipe.totalCost * 0.15,
        implementation: `Target ${(recipe.foodCostPercent - 10).toFixed(0)}% food cost by substituting premium ingredients with cost-effective alternatives or reducing portions slightly.`,
      });
    }

    // Vendor recommendations
    const poorVendors = vendorAnalysis.filter(v => v.quality === 'poor');
    for (const vendor of poorVendors) {
      recommendations.push({
        category: 'vendor',
        action: `Review ${vendor.vendor} contract`,
        item: vendor.vendor,
        savings: vendor.savings,
        implementation: `Consider switching or renegotiating terms. Current quality: ${vendor.quality}`,
      });
    }

    // Waste reduction recommendations
    const highWasteCategories = wasteAnalysis.filter(w => w.percentOfTotal > 8);
    for (const waste of highWasteCategories) {
      recommendations.push({
        category: 'waste',
        action: `Reduce ${waste.category}`,
        savings: 0, // Would calculate from actual data
        implementation: `Implement portion control training, better inventory management, or preparation process optimization.`,
      });
    }

    // Pricing recommendations
    if (currentCost > targetCost + 5) {
      recommendations.push({
        category: 'pricing',
        action: 'Consider menu price adjustment',
        savings: currentCost * 0.05,
        implementation: `Food cost is ${currentCost.toFixed(1)}% vs target ${targetCost}%. A 3-5% price increase would offset the gap without significantly impacting demand.`,
      });
    }

    // Inventory recommendations
    recommendations.push({
      category: 'inventory',
      action: 'Implement FIFO system',
      savings: monthlySpend * 0.02,
      implementation: 'First In First Out inventory rotation reduces spoilage by up to 40%.',
    });

    return recommendations.filter(r => r.savings > 0);
  }

  /**
   * Calculate cost reduction breakdown by timeframe
   */
  private calculateCostReduction(
    currentCost: number,
    targetCost: number,
    monthlySpend: number,
    totalSavings: number
  ): { immediate: number; shortTerm: number; longTerm: number } {
    // Immediate: 0-30 days (quick wins)
    const immediate = totalSavings * 0.2;

    // Short-term: 30-90 days (process changes)
    const shortTerm = totalSavings * 0.35;

    // Long-term: 90+ days (strategic changes)
    const longTerm = totalSavings * 0.45;

    return { immediate, shortTerm, longTerm };
  }

  /**
   * Calculate optimal order quantities
   */
  async calculateOptimalOrder(
    ingredients: Ingredient[],
    dailyUsage: Map<string, number>,
    leadTimeDays: number
  ): Promise<Map<string, { orderQty: number; reorderPoint: number; daysOfStock: number }>> {
    const orders = new Map<string, { orderQty: number; reorderPoint: number; daysOfStock: number }>();

    for (const ingredient of ingredients) {
      const usage = dailyUsage.get(ingredient.name.toLowerCase()) || ingredient.reorderPoint;
      const safetyStock = usage * 2; // 2 days safety stock

      // Calculate reorder point
      const reorderPoint = usage * leadTimeDays + safetyStock;

      // Calculate optimal order quantity (EOQ approximation)
      const orderQty = usage * 7; // 7 days of stock

      orders.set(ingredient.name, {
        orderQty,
        reorderPoint,
        daysOfStock: orderQty / usage,
      });
    }

    return orders;
  }

  /**
   * Generate purchasing report
   */
  async generatePurchasingReport(
    request: FoodCostRequest,
    analysis: FoodCostAnalysis
  ): Promise<string> {
    const report = `
# FOOD COST ANALYSIS REPORT
Generated: ${new Date().toISOString()}
Restaurant ID: ${request.restaurantId}

## COST OVERVIEW
- Monthly Revenue: ₹${request.monthlyRevenue.toLocaleString()}
- Monthly Food Spend: ₹${request.monthlyFoodSpend.toLocaleString()}
- Current Food Cost: ${analysis.overallFoodCostPercent.toFixed(1)}%
- Target Food Cost: ${analysis.targetFoodCostPercent}%
- Potential Monthly Savings: ₹${analysis.monthlyPotentialSavings.toLocaleString()}

## COST REDUCTION TIMELINE
- Immediate (0-30 days): ₹${Math.round(analysis.monthlyPotentialSavings * 0.2).toLocaleString()}
- Short-term (30-90 days): ₹${Math.round(analysis.monthlyPotentialSavings * 0.35).toLocaleString()}
- Long-term (90+ days): ₹${Math.round(analysis.monthlyPotentialSavings * 0.45).toLocaleString()}

## VENDOR ANALYSIS
${analysis.vendorAnalysis.map(v => `
### ${v.vendor}
- Monthly Spend: ₹${v.spend.toLocaleString()}
- Potential Savings: ₹${v.savings.toLocaleString()}
- Quality Rating: ${v.quality.toUpperCase()}
- Items Supplied: ${v.items.slice(0, 5).join(', ')}${v.items.length > 5 ? '...' : ''}
`).join('\n')}

## HIGH-COST RECIPES
${analysis.recipes.filter(r => r.foodCostPercent > 30).map(r => `
### ${r.dishName}
- Selling Price: ₹${r.sellingPrice}
- Food Cost: ₹${r.totalCost.toFixed(2)}
- Food Cost %: ${r.foodCostPercent.toFixed(1)}%
`).join('\n')}

## TOP RECOMMENDATIONS
${(await this.analyze(request)).recommendations.slice(0, 5).map((r, i) => `${i + 1}. [${r.category.toUpperCase()}] ${r.action} - ₹${r.savings.toLocaleString()}/month`).join('\n')}
`.trim();

    return report;
  }
}

export const costAnalyzerService = new CostAnalyzerService();
