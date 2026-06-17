import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

// Mock market intelligence data
const marketIntelData: Record<string, any> = {
  restaurant: {
    industry: 'Restaurant',
    size: '$950B global',
    growth_rate: 5.2,
    trends: [
      'Ghost kitchens reshaping delivery economics',
      'Plant-based menu expansion accelerating',
      'AI-powered demand forecasting adoption'
    ],
    key_players: ['McDonald\'s', 'Starbucks', 'Chipotle', 'Domino\'s'],
    opportunities: [
      'POS integration for delivery aggregators',
      'Inventory optimization tools',
      'Customer loyalty platforms'
    ],
    challenges: [
      'Labor shortage impact on service',
      'Food cost inflation',
      'Regulatory compliance'
    ],
    benchmarks: {
      average_ticket: '$28',
      table_turnover: '3.2x daily',
      labor_cost_pct: 32,
      food_cost_pct: 28
    }
  },
  healthcare: {
    industry: 'Healthcare',
    size: '$2.8T global',
    growth_rate: 7.9,
    trends: [
      'Telehealth becoming standard care option',
      'AI diagnostics improving accuracy',
      'Value-based care models expanding'
    ],
    key_players: ['UnitedHealth', 'CVS Health', 'HCA Healthcare', 'Cigna'],
    opportunities: [
      'Patient engagement platforms',
      'Revenue cycle management',
      'Interoperability solutions'
    ],
    challenges: [
      'HIPAA compliance burden',
      'Staffing shortages',
      'Insurance complexity'
    ],
    benchmarks: {
      avg_patient_satisfaction: 72,
      claim_processing_time: '14 days',
      telehealth_adoption: 45,
      emr_adoption: 85
    }
  },
  retail: {
    industry: 'Retail',
    size: '$6.5T global',
    growth_rate: 4.1,
    trends: [
      'Omnichannel fulfillment expectations',
      'Social commerce growth',
      'Sustainability driving purchase decisions'
    ],
    key_players: ['Walmart', 'Amazon', 'Target', 'Costco'],
    opportunities: [
      'Inventory visibility solutions',
      'Customer data platforms',
      'Last-mile delivery optimization'
    ],
    challenges: [
      'E-commerce margin pressure',
      'Supply chain disruptions',
      'Customer acquisition costs'
    ],
    benchmarks: {
      avg_conversion_rate: 3.4,
      cart_abandonment: 65,
      return_rate: 15,
      customer_acquisition_cost: '$45'
    }
  },
  hotel: {
    industry: 'Hotel & Hospitality',
    size: '$850B global',
    growth_rate: 12.5,
    trends: [
      'Bleisure travel combining business and leisure',
      'Contactless technology becoming expected',
      'Wellness amenities driving bookings'
    ],
    key_players: ['Marriott', 'Hilton', 'Hyatt', 'Airbnb'],
    opportunities: [
      'Guest experience platforms',
      'Revenue management optimization',
      'Housekeeping automation'
    ],
    challenges: [
      'Staffing to pre-pandemic levels',
      'Meeting corporate ESG goals',
      'Direct booking competition'
    ],
    benchmarks: {
      avg_daily_rate: '$145',
      occupancy_rate: 66,
      revpar: '$95',
      length_of_stay: '2.3 nights'
    }
  },
  fitness: {
    industry: 'Fitness & Wellness',
    size: '$96B US',
    growth_rate: 8.3,
    trends: [
      'Hybrid gym-home workout models',
      'Wearable integration becoming standard',
      'Corporate wellness programs expanding'
    ],
    key_players: ['Planet Fitness', 'LA Fitness', 'Equinox', 'Peloton'],
    opportunities: [
      'Member retention platforms',
      'Class scheduling optimization',
      'Personal training tools'
    ],
    challenges: [
      'High member churn rates',
      'Competition from home workouts',
      'Real estate costs'
    ],
    benchmarks: {
      membership_penetration: 22,
      monthly_churn: 4.5,
      avg_class_size: 12,
      digital_subscribers: 35
    }
  }
};

// GET /market-intel - Get market intelligence
router.get('/', (req: Request, res: Response) => {
  const { industry } = req.query;

  if (!industry || typeof industry !== 'string') {
    // Return all industries
    res.json({
      success: true,
      data: {
        markets: marketIntelData,
        total: Object.keys(marketIntelData).length
      }
    });
    return;
  }

  const industryKey = industry.toLowerCase();
  const market = marketIntelData[industryKey];

  if (!market) {
    // Generate generic market intel
    const generatedMarket = {
      industry: industryKey,
      size: 'Market data not available',
      growth_rate: 0,
      trends: [],
      key_players: [],
      opportunities: [],
      challenges: [],
      benchmarks: null
    };

    res.json({
      success: true,
      data: generatedMarket,
      note: 'Limited market data available for this industry'
    });
    return;
  }

  res.json({
    success: true,
    data: market
  });
});

export default router;
