/**
 * HOJAI Beauty Advisor AI Employee
 * Recommends services, tracks preferences, suggests treatments
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  skinType?: string;
  hairType?: string;
  concerns: string[];
  preferences: string[];
  allergies: string[];
  lastServices: string[];
  visitFrequency: number; // days between visits
}

interface Recommendation {
  id: string;
  customerId: string;
  recommendations: ServiceRecommendation[];
  reasoning: string[];
  urgency: 'now' | 'this_week' | 'this_month';
  estimatedPrice: number;
  createdAt: string;
}

interface ServiceRecommendation {
  serviceName: string;
  reason: string;
  priority: number;
  category: string;
}

const recommendations = new Map<string, Recommendation>();

// Generate recommendations
router.post('/recommend', async (req, res) => {
  try {
    const { customer, services } = req.body;

    if (!customer) {
      return res.status(400).json({ error: 'Customer profile required' });
    }

    const recs = generateRecommendations(customer, services || []);
    const recommendation: Recommendation = {
      id: uuidv4(),
      customerId: customer.id,
      recommendations: recs,
      reasoning: generateReasoning(customer, recs),
      urgency: determineUrgency(customer),
      estimatedPrice: recs.reduce((sum, r) => {
        const service = services?.find((s: any) => s.name === r.serviceName);
        return sum + (service?.price || 500);
      }, 0),
      createdAt: new Date().toISOString(),
    };

    recommendations.set(customer.id, recommendation);

    res.json({ recommendation });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Get recommendations
router.get('/recommendations/:customerId', async (req, res) => {
  try {
    const rec = recommendations.get(req.params.customerId);
    res.json({ recommendation: rec || null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Get next service suggestion
router.get('/next/:customerId', async (req, res) => {
  try {
    const rec = recommendations.get(req.params.customerId);
    if (!rec || rec.recommendations.length === 0) {
      return res.json({ suggestion: null });
    }

    const top = rec.recommendations[0];
    res.json({
      suggestion: {
        service: top.serviceName,
        reason: top.reason,
        urgency: rec.urgency,
        estimatedPrice: rec.estimatedPrice,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get suggestion' });
  }
});

// Helper functions
function generateRecommendations(customer: CustomerProfile, services: any[]): ServiceRecommendation[] {
  const recs: ServiceRecommendation[] = [];

  // Based on concerns
  if (customer.concerns.includes('acne') || customer.concerns.includes('dull skin')) {
    recs.push({
      serviceName: 'Facial',
      reason: 'Your skin needs deep cleansing to address ' + (customer.concerns.includes('acne') ? 'acne' : 'dullness'),
      priority: 1,
      category: 'Skin',
    });
  }

  if (customer.concerns.includes('hair fall') || customer.concerns.includes('dry hair')) {
    recs.push({
      serviceName: 'Hair Treatment',
      reason: 'Your hair needs conditioning to address ' + (customer.concerns.includes('hair fall') ? 'hair fall' : 'dryness'),
      priority: 1,
      category: 'Hair',
    });
  }

  // Based on last services
  const lastService = customer.lastServices[0];
  if (lastService === 'Haircut' && !customer.lastServices.includes('Hair Treatment')) {
    recs.push({
      serviceName: 'Hair Treatment',
      reason: 'You had a haircut 4+ weeks ago - time for a treatment to maintain hair health',
      priority: 2,
      category: 'Hair',
    });
  }

  if (lastService === 'Facial' && !customer.lastServices.includes('Clean-up')) {
    recs.push({
      serviceName: 'Clean-up',
      reason: 'Regular clean-ups help maintain facial results between facials',
      priority: 3,
      category: 'Skin',
    });
  }

  // Based on visit frequency
  if (customer.visitFrequency > 45) {
    recs.push({
      serviceName: 'Full Body Massage',
      reason: 'It\'s been a while! Treat yourself to some relaxation',
      priority: 1,
      category: 'Spa',
    });
  }

  // Seasonal recommendations
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) { // March-May
    recs.push({
      serviceName: 'Facial',
      reason: 'Summer is coming - prep your skin with a fresh facial',
      priority: 2,
      category: 'Skin',
    });
  }

  // Sort by priority
  recs.sort((a, b) => a.priority - b.priority);

  return recs.slice(0, 4);
}

function generateReasoning(customer: CustomerProfile, recs: ServiceRecommendation[]): string[] {
  const reasons: string[] = [];

  if (recs.length > 0) {
    reasons.push(`Based on your ${customer.concerns.length > 0 ? 'concerns about ' + customer.concerns.join(', ') : 'beauty goals'}`);
  }

  if (customer.visitFrequency > 30) {
    reasons.push('Your last visit was over a month ago - regular visits maintain results');
  }

  return reasons;
}

function determineUrgency(customer: CustomerProfile): 'now' | 'this_week' | 'this_month' {
  if (customer.concerns.includes('acne') || customer.concerns.includes('hair fall')) {
    return 'now';
  }
  if (customer.visitFrequency > 60) {
    return 'this_week';
  }
  return 'this_month';
}

export { router, recommendations };
export type { CustomerProfile, Recommendation, ServiceRecommendation };
