/**
 * Treatment Advisor Agent
 *
 * AI Agent that suggests service bundles and upsells based on:
 * - Customer profile (hair type, skin type, conditions)
 * - Current service selection
 * - Service history
 * - Seasonal trends
 * - Upsell patterns
 */

import express, { Request, Response } from 'express';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
const PORT = parseInt(process.env.TREATMENT_ADVISOR_PORT || '4813', 10);

app.use(express.json());

// Service catalog with bundle information
const SERVICE_CATALOG: Record<string, {
  name: string;
  duration: number;
  basePrice: number;
  category: string;
  compatible: string[];
  addons: { serviceId: string; discount: number; reason: string }[];
}> = {
  'haircut': {
    name: 'Haircut',
    duration: 45,
    basePrice: 500,
    category: 'hair',
    compatible: ['deep-conditioning', 'blowout', 'scalp-treatment'],
    addons: [
      { serviceId: 'deep-conditioning', discount: 10, reason: 'Keep your hair healthy between cuts' },
      { serviceId: 'blowout', discount: 15, reason: 'Perfect finish for your new cut' }
    ]
  },
  'hair-color': {
    name: 'Hair Color',
    duration: 120,
    basePrice: 2500,
    category: 'color',
    compatible: ['deep-conditioning', 'scalp-treatment', 'keratin'],
    addons: [
      { serviceId: 'deep-conditioning', discount: 15, reason: 'Protect your color with extra moisture' },
      { serviceId: 'scalp-treatment', discount: 10, reason: 'Healthy scalp for better color uptake' }
    ]
  },
  'balayage': {
    name: 'Balayage',
    duration: 180,
    basePrice: 5000,
    category: 'color',
    compatible: ['toner', 'deep-conditioning', 'scalp-treatment'],
    addons: [
      { serviceId: 'toner', discount: 20, reason: 'Maintain your balayage vibrancy' },
      { serviceId: 'scalp-treatment', discount: 15, reason: 'Keep your scalp healthy between sessions' }
    ]
  },
  'keratin': {
    name: 'Keratin Treatment',
    duration: 90,
    basePrice: 3000,
    category: 'treatment',
    compatible: ['hair-spa', 'deep-conditioning', 'blowout'],
    addons: [
      { serviceId: 'hair-spa', discount: 10, reason: 'Extend your keratin results' },
      { serviceId: 'blowout', discount: 15, reason: 'Perfect smooth finish' }
    ]
  },
  'hair-spa': {
    name: 'Hair Spa',
    duration: 60,
    basePrice: 800,
    category: 'treatment',
    compatible: ['haircut', 'scalp-treatment', 'deep-conditioning'],
    addons: [
      { serviceId: 'scalp-treatment', discount: 20, reason: 'Complete spa experience' },
      { serviceId: 'deep-conditioning', discount: 15, reason: 'Deep nourishment for your hair' }
    ]
  },
  'scalp-treatment': {
    name: 'Scalp Treatment',
    duration: 45,
    basePrice: 600,
    category: 'treatment',
    compatible: ['hair-spa', 'hair-color', 'deep-conditioning'],
    addons: [
      { serviceId: 'hair-spa', discount: 10, reason: 'Complete scalp and hair treatment' }
    ]
  },
  'deep-conditioning': {
    name: 'Deep Conditioning',
    duration: 30,
    basePrice: 400,
    category: 'treatment',
    compatible: ['haircut', 'hair-color', 'blowout'],
    addons: [
      { serviceId: 'blowout', discount: 20, reason: 'Show off your conditioned hair' }
    ]
  },
  'facial': {
    name: 'Facial',
    duration: 60,
    basePrice: 1000,
    category: 'skincare',
    compatible: ['eyebrow', 'lip', 'cleanup'],
    addons: [
      { serviceId: 'eyebrow', discount: 15, reason: 'Complete your look' },
      { serviceId: 'cleanup', discount: 10, reason: 'Full face grooming' }
    ]
  },
  'manicure': {
    name: 'Manicure',
    duration: 45,
    basePrice: 350,
    category: 'nails',
    compatible: ['pedicure', 'hand-massage', 'nail-art'],
    addons: [
      { serviceId: 'pedicure', discount: 15, reason: 'Complete hand and foot care' },
      { serviceId: 'hand-massage', discount: 20, reason: 'Relaxing hand massage included' }
    ]
  },
  'pedicure': {
    name: 'Pedicure',
    duration: 60,
    basePrice: 450,
    category: 'nails',
    compatible: ['manicure', 'foot-massage', 'gel'],
    addons: [
      { serviceId: 'manicure', discount: 15, reason: 'Full nail care package' },
      { serviceId: 'foot-massage', discount: 20, reason: 'Relaxing foot massage included' }
    ]
  },
  'bridal-makeup': {
    name: 'Bridal Makeup',
    duration: 120,
    basePrice: 5000,
    category: 'makeup',
    compatible: ['facial', 'hair-styling', 'eyebrow'],
    addons: [
      { serviceId: 'facial', discount: 20, reason: 'Prep your skin for the big day' },
      { serviceId: 'hair-styling', discount: 25, reason: 'Complete bridal look' }
    ]
  },
  'party-makeup': {
    name: 'Party Makeup',
    duration: 60,
    basePrice: 2000,
    category: 'makeup',
    compatible: ['eyebrow', 'cleanup', 'hair-styling'],
    addons: [
      { serviceId: 'hair-styling', discount: 20, reason: 'Complete party look' }
    ]
  }
};

// Package deals
const PACKAGES: Record<string, {
  name: string;
  services: string[];
  originalPrice: number;
  packagePrice: number;
  savings: number;
  description: string;
}> = {
  'bride-prep': {
    name: 'Bride Prep Package',
    services: ['facial', 'hair-spa', 'manicure', 'pedicure'],
    originalPrice: 3050,
    packagePrice: 2500,
    savings: 550,
    description: 'Complete pre-wedding pampering'
  },
  'monsoon-care': {
    name: 'Monsoon Hair Care',
    services: ['scalp-treatment', 'hair-spa', 'deep-conditioning'],
    originalPrice: 1800,
    packagePrice: 1500,
    savings: 300,
    description: 'Protect your hair in monsoon season'
  },
  'color-care': {
    name: 'Color Care Package',
    services: ['hair-color', 'deep-conditioning', 'scalp-treatment'],
    originalPrice: 3500,
    packagePrice: 2800,
    savings: 700,
    description: 'Maintain your color vibrancy'
  },
  'relaxation': {
    name: 'Relaxation Package',
    services: ['hair-spa', 'facial', 'foot-massage'],
    originalPrice: 2300,
    packagePrice: 1900,
    savings: 400,
    description: 'Ultimate relaxation experience'
  },
  'quick-groom': {
    name: 'Quick Groom Package',
    services: ['haircut', 'manicure', 'eyebrow'],
    originalPrice: 1000,
    packagePrice: 850,
    savings: 150,
    description: 'Express grooming package'
  }
};

// Types
interface BundleSuggestion {
  type: 'addon' | 'package';
  serviceId?: string;
  packageId?: string;
  name: string;
  originalPrice: number;
  discountedPrice: number;
  discount: number;
  reason: string;
  estimatedDuration: number;
  conversionProbability: number;
}

interface TreatmentAdvice {
  customerId: string;
  currentServices: string[];
  suggestions: BundleSuggestion[];
  packages: {
    packageId: string;
    name: string;
    services: string[];
    originalPrice: number;
    packagePrice: number;
    savings: number;
    reason: string;
  }[];
  totalUpsellPotential: number;
  bestOffer: BundleSuggestion | null;
}

// In-memory customer profiles (would connect to GlamAI Beauty Memory)
const customerProfiles = new Map<string, {
  hairType?: string;
  skinType?: string;
  scalpCondition?: string;
  allergies?: string[];
  preferredServices?: string[];
  visitFrequency?: number;
}>();

// API Endpoints

/**
 * Get bundle suggestions for a customer
 * POST /api/suggestions/bundles
 */
app.post('/api/suggestions/bundles', (req: Request, res: Response) => {
  try {
    const { customerId, currentServices, hairType, skinType, scalpCondition } = req.body;

    const suggestions: BundleSuggestion[] = [];
    const packages: TreatmentAdvice['packages'] = [];

    // Store customer profile
    if (customerId) {
      const existing = customerProfiles.get(customerId) || {};
      customerProfiles.set(customerId, {
        ...existing,
        hairType: hairType || existing.hairType,
        skinType: skinType || existing.skinType,
        scalpCondition: scalpCondition || existing.scalpCondition
      });
    }

    // Generate addon suggestions for each current service
    for (const serviceId of currentServices) {
      const service = SERVICE_CATALOG[serviceId];
      if (!service) continue;

      for (const addon of service.addons) {
        const addonService = SERVICE_CATALOG[addon.serviceId];
        if (!addonService) continue;

        const originalPrice = addonService.basePrice;
        const discountedPrice = Math.round(originalPrice * (1 - addon.discount / 100));

        suggestions.push({
          type: 'addon',
          serviceId: addon.serviceId,
          name: addonService.name,
          originalPrice,
          discountedPrice,
          discount: addon.discount,
          reason: addon.reason,
          estimatedDuration: addonService.duration,
          conversionProbability: 0.7 + (addon.discount > 15 ? 0.15 : 0)
        });
      }
    }

    // Add relevant packages based on customer profile
    const profile = customerId ? customerProfiles.get(customerId) : null;

    // Seasonal package suggestions
    const month = new Date().getMonth();
    if (month >= 8 && month <= 11) {
      // Wedding season
      const bridalPackage = PACKAGES['bride-prep'];
      packages.push({
        packageId: 'bride-prep',
        name: bridalPackage.name,
        services: bridalPackage.services,
        originalPrice: bridalPackage.originalPrice,
        packagePrice: bridalPackage.packagePrice,
        savings: bridalPackage.savings,
        reason: 'Perfect for wedding season preparation'
      });
    }

    if (month >= 5 && month <= 7) {
      // Monsoon
      const monsoonPackage = PACKAGES['monsoon-care'];
      packages.push({
        packageId: 'monsoon-care',
        name: monsoonPackage.name,
        services: monsoonPackage.services,
        originalPrice: monsoonPackage.originalPrice,
        packagePrice: monsoonPackage.packagePrice,
        savings: monsoonPackage.savings,
        reason: 'Protect your hair this monsoon season'
      });
    }

    // Hair type based packages
    if (profile?.hairType === 'curly' || profile?.hairType === 'coily') {
      const keratinPackage = PACKAGES['relaxation'];
      packages.push({
        packageId: 'relaxation',
        name: keratinPackage.name,
        services: keratinPackage.services,
        originalPrice: keratinPackage.originalPrice,
        packagePrice: keratinPackage.packagePrice,
        savings: keratinPackage.savings,
        reason: 'Manage and embrace your natural curls'
      });
    }

    // Calculate total upsell potential
    const totalUpsellPotential = suggestions.reduce((sum, s) => sum + s.discountedPrice, 0) +
      packages.reduce((sum, p) => sum + p.savings, 0);

    // Find best offer (highest conversion probability with good discount)
    const bestOffer = suggestions.length > 0
      ? suggestions.sort((a, b) => b.conversionProbability - a.conversionProbability)[0]
      : null;

    const advice: TreatmentAdvice = {
      customerId,
      currentServices,
      suggestions,
      packages,
      totalUpsellPotential,
      bestOffer
    };

    logger.info(`Generated treatment advice for customer ${customerId}: ${suggestions.length} suggestions, ${packages.length} packages`);

    res.json({ success: true, data: advice });
  } catch (error) {
    logger.error('Error generating treatment advice:', error);
    res.status(500).json({ success: false, error: 'Failed to generate suggestions' });
  }
});

/**
 * Get package details
 * GET /api/packages/:packageId
 */
app.get('/api/packages/:packageId', (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;
    const pkg = PACKAGES[packageId];

    if (!pkg) {
      res.status(404).json({ success: false, error: 'Package not found' });
      return;
    }

    res.json({ success: true, data: pkg });
  } catch (error) {
    logger.error('Error getting package:', error);
    res.status(500).json({ success: false, error: 'Failed to get package' });
  }
});

/**
 * Get all packages
 * GET /api/packages
 */
app.get('/api/packages', (req: Request, res: Response) => {
  try {
    const packages = Object.entries(PACKAGES).map(([id, pkg]) => ({
      packageId: id,
      ...pkg
    }));

    res.json({ success: true, data: packages });
  } catch (error) {
    logger.error('Error getting packages:', error);
    res.status(500).json({ success: false, error: 'Failed to get packages' });
  }
});

/**
 * Get service catalog
 * GET /api/services
 */
app.get('/api/services', (req: Request, res: Response) => {
  try {
    const services = Object.entries(SERVICE_CATALOG).map(([id, svc]) => ({
      serviceId: id,
      ...svc
    }));

    res.json({ success: true, data: services });
  } catch (error) {
    logger.error('Error getting services:', error);
    res.status(500).json({ success: false, error: 'Failed to get services' });
  }
});

/**
 * Health check
 * GET /health
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'treatment-advisor',
    version: '1.0.0',
    customersTracked: customerProfiles.size
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Treatment Advisor Agent running on port ${PORT}`);
});

export { app };
