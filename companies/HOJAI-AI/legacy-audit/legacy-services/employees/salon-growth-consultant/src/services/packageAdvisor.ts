import {
  Service,
  Client,
  BeautyPackage,
  PackageAnalysis,
  PackageConsultRequest,
  PackageConsultResponse,
} from '../types';

/**
 * Package Advisor Service
 * Creates and optimizes beauty service packages
 */
export class PackageAdvisorService {
  /**
   * Generate package recommendations
   */
  async recommend(request: PackageConsultRequest): Promise<PackageConsultResponse> {
    const { services, clients, currentPackages } = request;

    // Analyze existing packages
    const analysis = this.analyzePackages(services, clients, currentPackages);

    // Generate recommendations
    const recommendations = this.generateRecommendations(analysis, services, clients);

    // Create new package suggestions
    const newPackages = this.createNewPackages(services, clients, analysis);

    // Generate seasonal bundles
    const seasonalBundles = this.generateSeasonalBundles(services);

    // Create upsell paths
    const upsellPaths = this.createUpsellPaths(analysis);

    return {
      analysis,
      recommendations,
      newPackages,
      seasonalBundles,
      upsellPaths,
    };
  }

  /**
   * Analyze current packages
   */
  private analyzePackages(
    services: Service[],
    clients: Client[],
    currentPackages?: BeautyPackage[]
  ): PackageAnalysis {
    // If no packages exist, analyze service combinations
    if (!currentPackages || currentPackages.length === 0) {
      return this.analyzeServiceCombinations(services);
    }

    // Calculate package metrics
    const totalRevenue = currentPackages.reduce(
      (sum, pkg) => sum + (pkg.projectedSales || 0) * pkg.packagePrice,
      0
    );
    const avgMargin =
      currentPackages.reduce((sum, pkg) => sum + pkg.margin, 0) / currentPackages.length;

    // Category breakdown
    const categoryMap = new Map<string, number>();
    for (const pkg of currentPackages) {
      const current = categoryMap.get(pkg.category) || 0;
      categoryMap.set(pkg.category, current + (pkg.projectedSales || 0) * pkg.packagePrice);
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, revenue]) => ({
      category,
      revenue,
      percent: (revenue / totalRevenue) * 100 || 0,
    }));

    return {
      currentPackages,
      packageRevenue: totalRevenue,
      packageMargin: avgMargin,
      conversionRate: 8, // Estimated conversion rate
      avgPackageValue:
        currentPackages.reduce((sum, pkg) => sum + pkg.packagePrice, 0) /
        currentPackages.length,
      categoryBreakdown,
      seasonalPatterns: this.analyzeSeasonalPatterns(currentPackages),
    };
  }

  /**
   * Analyze potential service combinations
   */
  private analyzeServiceCombinations(services: Service[]): PackageAnalysis {
    // Group services by category
    const byCategory = new Map<string, Service[]>();
    for (const service of services) {
      const current = byCategory.get(service.category) || [];
      current.push(service);
      byCategory.set(service.category, current);
    }

    // Generate potential packages
    const currentPackages: BeautyPackage[] = [];

    // Hair combo
    const hairServices = byCategory.get('hair') || [];
    if (hairServices.length >= 2) {
      const sortedHair = hairServices.sort((a, b) => b.popularity - a.popularity);
      currentPackages.push({
        id: 'pkg_hair_combo',
        name: 'Hair Transformation Package',
        description: 'Complete hair care with cut, treatment, and styling',
        services: sortedHair.slice(0, 3).map(s => ({
          serviceId: s.id,
          name: s.name,
          originalPrice: s.price,
          discountedPrice: Math.round(s.price * 0.85),
        })),
        totalOriginalPrice: sortedHair.slice(0, 3).reduce((sum, s) => sum + s.price, 0),
        packagePrice: Math.round(
          sortedHair.slice(0, 3).reduce((sum, s) => sum + s.price, 0) * 0.85
        ),
        discountPercent: 15,
        margin: 55,
        validity: 30,
        targetSegment: 'regular',
        category: 'regular',
      });
    }

    // Bridal package (if makeup service exists)
    const makeupServices = byCategory.get('makeup') || [];
    const skinServices = byCategory.get('skin') || [];
    if (makeupServices.length > 0 || skinServices.length > 0) {
      currentPackages.push({
        id: 'pkg_bridal',
        name: 'Bridal Bliss Package',
        description: 'Complete bridal makeover with pre-wedding treatments',
        services: [
          ...makeupServices.slice(0, 1).map(s => ({
            serviceId: s.id,
            name: s.name,
            originalPrice: s.price,
            discountedPrice: Math.round(s.price * 0.8),
          })),
          ...skinServices.slice(0, 2).map(s => ({
            serviceId: s.id,
            name: s.name,
            originalPrice: s.price,
            discountedPrice: Math.round(s.price * 0.8),
          })),
        ],
        totalOriginalPrice:
          makeupServices.slice(0, 1).reduce((sum, s) => sum + s.price, 0) +
          skinServices.slice(0, 2).reduce((sum, s) => sum + s.price, 0),
        packagePrice: Math.round(
          (makeupServices.slice(0, 1).reduce((sum, s) => sum + s.price, 0) +
            skinServices.slice(0, 2).reduce((sum, s) => sum + s.price, 0)) *
            0.8
        ),
        discountPercent: 20,
        margin: 45,
        validity: 90,
        targetSegment: 'bridal',
        category: 'bridal',
      });
    }

    return {
      currentPackages,
      packageRevenue: 0,
      packageMargin: 50,
      conversionRate: 5,
      avgPackageValue: 2000,
      categoryBreakdown: [],
      seasonalPatterns: [],
    };
  }

  /**
   * Analyze seasonal patterns
   */
  private analyzeSeasonalPatterns(packages: BeautyPackage[]): {
    season: string;
    topPackage: string;
    sales: number;
  }[] {
    const patterns = [
      { season: 'Summer', topPackage: 'Hair Protection Package', sales: 150 },
      { season: 'Wedding Season', topPackage: 'Bridal Package', sales: 200 },
      { season: 'Festive', topPackage: 'Glow Package', sales: 180 },
      { season: 'Winter', topPackage: 'Hydration Package', sales: 120 },
    ];

    return patterns;
  }

  /**
   * Generate package recommendations
   */
  private generateRecommendations(
    analysis: PackageAnalysis,
    services: Service[],
    clients: Client[]
  ): PackageConsultResponse['recommendations'] {
    const recommendations: PackageConsultResponse['recommendations'] = [];

    // Low conversion rate recommendation
    if (analysis.conversionRate < 10) {
      recommendations.push({
        action: 'modify',
        description: 'Lower package prices by 5% to improve conversion',
        expectedImpact: 15,
        priority: 'high',
      });
    }

    // No packages recommendation
    if (analysis.currentPackages.length === 0) {
      recommendations.push({
        action: 'create',
        category: 'regular',
        description: 'Create a signature combo package with 15-20% discount',
        expectedImpact: 20,
        priority: 'high',
      });
    }

    // High margin recommendation
    if (analysis.packageMargin < 50) {
      recommendations.push({
        action: 'modify',
        description: 'Adjust package pricing to maintain minimum 50% margin',
        expectedImpact: 10,
        priority: 'medium',
      });
    }

    // Seasonal gaps
    const hasSeasonalPackages = analysis.currentPackages.some(p => p.category === 'seasonal');
    if (!hasSeasonalPackages) {
      recommendations.push({
        action: 'create',
        category: 'seasonal',
        description: 'Launch seasonal packages for festivals and special occasions',
        expectedImpact: 25,
        priority: 'medium',
      });
    }

    // New client packages
    const hasNewClientPackages = analysis.currentPackages.some(
      p => p.targetSegment === 'new_client'
    );
    if (!hasNewClientPackages) {
      recommendations.push({
        action: 'create',
        category: 'new_client',
        description: 'Create introductory package for first-time visitors',
        expectedImpact: 30,
        priority: 'high',
      });
    }

    return recommendations;
  }

  /**
   * Create new package suggestions
   */
  private createNewPackages(
    services: Service[],
    clients: Client[],
    analysis: PackageAnalysis
  ): BeautyPackage[] {
    const newPackages: BeautyPackage[] = [];
    const avgServiceValue =
      services.reduce((sum, s) => sum + s.price, 0) / services.length || 500;

    // Get service categories
    const categories = [...new Set(services.map(s => s.category))];

    // New Client Package
    if (categories.includes('hair')) {
      const hairServices = services.filter(s => s.category === 'hair');
      const popularHair = hairServices.sort((a, b) => b.popularity - a.popularity)[0];
      if (popularHair) {
        newPackages.push({
          id: `pkg_new_client_${Date.now()}`,
          name: 'First Visit Glow',
          description: 'Perfect introduction package for new clients',
          services: [
            {
              serviceId: popularHair.id,
              name: popularHair.name,
              originalPrice: popularHair.price,
              discountedPrice: Math.round(popularHair.price * 0.7),
            },
          ],
          totalOriginalPrice: popularHair.price,
          packagePrice: Math.round(popularHair.price * 0.7),
          discountPercent: 30,
          margin: 60,
          validity: 14,
          targetSegment: 'new_client',
          category: 'regular',
          popularity: 85,
        });
      }
    }

    // Regular Maintenance Package
    newPackages.push({
      id: `pkg_maintenance_${Date.now()}`,
      name: 'Monthly Glow Maintenance',
      description: 'Keep looking your best with monthly visits',
      services: services
        .slice(0, 3)
        .map(s => ({
          serviceId: s.id,
          name: s.name,
          originalPrice: s.price,
          discountedPrice: Math.round(s.price * 0.8),
        })),
      totalOriginalPrice: services.slice(0, 3).reduce((sum, s) => sum + s.price, 0),
      packagePrice: Math.round(
        services.slice(0, 3).reduce((sum, s) => sum + s.price, 0) * 0.8
      ),
      discountPercent: 20,
      margin: 55,
      validity: 30,
      targetSegment: 'regular',
      category: 'regular',
      projectedSales: 50,
    });

    // Party Ready Package
    if (categories.includes('makeup') || categories.includes('hair')) {
      newPackages.push({
        id: `pkg_party_${Date.now()}`,
        name: 'Party Ready',
        description: 'Get glam for your special occasions',
        services: services
          .filter(s => ['makeup', 'hair', 'skin'].includes(s.category))
          .slice(0, 2)
          .map(s => ({
            serviceId: s.id,
            name: s.name,
            originalPrice: s.price,
            discountedPrice: Math.round(s.price * 0.75),
          })),
        totalOriginalPrice: services
          .filter(s => ['makeup', 'hair', 'skin'].includes(s.category))
          .slice(0, 2)
          .reduce((sum, s) => sum + s.price, 0),
        packagePrice: Math.round(
          services
            .filter(s => ['makeup', 'hair', 'skin'].includes(s.category))
            .slice(0, 2)
            .reduce((sum, s) => sum + s.price, 0) * 0.75
        ),
        discountPercent: 25,
        margin: 50,
        validity: 60,
        targetSegment: 'premium',
        category: 'party',
        projectedSales: 30,
      });
    }

    return newPackages;
  }

  /**
   * Generate seasonal bundles
   */
  private generateSeasonalBundles(
    services: Service[]
  ): PackageConsultResponse['seasonalBundles'] {
    const bundles: PackageConsultResponse['seasonalBundles'] = [];

    // Summer Protection Package
    const skinServices = services.filter(s => s.category === 'skin');
    if (skinServices.length > 0) {
      bundles.push({
        season: 'Summer',
        occasion: 'Beat the Heat',
        package: {
          id: `pkg_summer_${Date.now()}`,
          name: 'Summer Refresh',
          description: 'Stay cool and protected this summer',
          services: skinServices.slice(0, 2).map(s => ({
            serviceId: s.id,
            name: s.name,
            originalPrice: s.price,
            discountedPrice: Math.round(s.price * 0.8),
          })),
          totalOriginalPrice: skinServices.slice(0, 2).reduce((sum, s) => sum + s.price, 0),
          packagePrice: Math.round(
            skinServices.slice(0, 2).reduce((sum, s) => sum + s.price, 0) * 0.8
          ),
          discountPercent: 20,
          margin: 55,
          validity: 60,
          targetSegment: 'regular',
          category: 'seasonal',
        },
        marketingPush: 'Launch 1 month before summer with social media campaign',
      });
    }

    // Festive Glow Package
    const hairServices = services.filter(s => s.category === 'hair');
    if (hairServices.length > 0) {
      bundles.push({
        season: 'Festive Season',
        occasion: 'Diwali, Holi, Christmas',
        package: {
          id: `pkg_festive_${Date.now()}`,
          name: 'Festive Glow Special',
          description: 'Look your best this festive season',
          services: hairServices.slice(0, 2).map(s => ({
            serviceId: s.id,
            name: s.name,
            originalPrice: s.price,
            discountedPrice: Math.round(s.price * 0.75),
          })),
          totalOriginalPrice: hairServices.slice(0, 2).reduce((sum, s) => sum + s.price, 0),
          packagePrice: Math.round(
            hairServices.slice(0, 2).reduce((sum, s) => sum + s.price, 0) * 0.75
          ),
          discountPercent: 25,
          margin: 52,
          validity: 45,
          targetSegment: 'premium',
          category: 'seasonal',
        },
        marketingPush: 'Feature in festive marketing with early bird discount',
      });
    }

    // Pre-Bridal Package
    const spaServices = services.filter(s => s.category === 'spa');
    if (spaServices.length > 0) {
      bundles.push({
        season: 'Wedding Season',
        occasion: 'Pre-Bridal Preparation',
        package: {
          id: `pkg_prebridal_${Date.now()}`,
          name: 'Pre-Bridal Glow',
          description: 'Start your bridal journey 2 months before the wedding',
          services: spaServices.slice(0, 4).map(s => ({
            serviceId: s.id,
            name: s.name,
            originalPrice: s.price,
            discountedPrice: Math.round(s.price * 0.7),
          })),
          totalOriginalPrice: spaServices.slice(0, 4).reduce((sum, s) => sum + s.price, 0),
          packagePrice: Math.round(
            spaServices.slice(0, 4).reduce((sum, s) => sum + s.price, 0) * 0.7
          ),
          discountPercent: 30,
          margin: 48,
          validity: 60,
          targetSegment: 'bridal',
          category: 'bridal',
        },
        marketingPush: 'Partner with wedding planners and bridal magazines',
      });
    }

    return bundles;
  }

  /**
   * Create upsell paths between packages
   */
  private createUpsellPaths(
    analysis: PackageAnalysis
  ): PackageConsultResponse['upsellPaths'] {
    const upsellPaths: PackageConsultResponse['upsellPaths'] = [];

    // Define common upsell paths
    const paths = [
      {
        fromPackage: 'First Visit Glow',
        toPackage: 'Monthly Glow Maintenance',
        trigger: 'After second visit or 14-day package expiry',
        expectedConversion: 35,
      },
      {
        fromPackage: 'Party Ready',
        toPackage: 'Bridal Bliss Package',
        trigger: 'After 3 party packages or engagement event',
        expectedConversion: 25,
      },
      {
        fromPackage: 'Monthly Glow Maintenance',
        toPackage: 'Premium Spa Retreat',
        trigger: 'After 6 months membership',
        expectedConversion: 20,
      },
    ];

    // Filter paths that exist in current packages
    const packageNames = analysis.currentPackages.map(p => p.name);
    for (const path of paths) {
      if (
        packageNames.some(n => n.includes(path.fromPackage)) ||
        analysis.currentPackages.length === 0
      ) {
        upsellPaths.push(path);
      }
    }

    return upsellPaths;
  }
}

export const packageAdvisorService = new PackageAdvisorService();
